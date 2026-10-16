/* global process */
// Usage: node e2e/login.mjs <baseUrl> <label>
// Login page checks on realm "myrealm": branding, language switch, bad password, successful login.
import { chromium } from "playwright-core";

const [base, label] = process.argv.slice(2);
const shots = new URL("screenshots/", import.meta.url).pathname;
const realm = `${base}/realms/myrealm`;

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("console", m => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", e => errors.push("pageerror: " + e.message));
const failed = [];
page.on(
    "response",
    r =>
        r.status() >= 400 &&
        !r.url().includes("favicon") &&
        failed.push(`${r.status()} ${r.url()}`)
);

const snap = name =>
    page.screenshot({ path: `${shots}${label}-${name}.png`, fullPage: true });

// 1. Login page (reached through the account console, which handles PKCE)
await page.goto(`${realm}/account`);
await page.waitForSelector("#username", { timeout: 20000 });
console.log("login: title =", JSON.stringify(await page.title()));
console.log(
    "login: logo =",
    await page.locator('#kc-header img[alt="B2PConnect.com"]').count()
);
console.log(
    "login: body bg =",
    await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
);
console.log(
    "login: NaN in body =",
    (await page.locator("body").innerText()).includes("NaN")
);
console.log(
    "login: languages =",
    JSON.stringify(await page.locator("#language-switch1 a").allInnerTexts())
);
await snap("1-login");

// 2. Wrong password -> error message
await page.fill("#username", "testuser");
await page.fill("#password", "wrong");
await page.click("#kc-login");
await page.waitForSelector(".kcAlertTitleClass, #input-error", { timeout: 15000 });
console.log(
    "bad pwd: error =",
    JSON.stringify(
        (
            await page.locator("#input-error, .kcAlertTitleClass").first().innerText()
        ).trim()
    )
);
await snap("2-bad-password");

// 3. Switch language to French (the dropdown opens on hover)
await page.hover("#kc-current-locale-link");
await page.locator("#language-switch1 a", { hasText: "Français" }).first().click();
await page.waitForSelector("#username");
console.log(
    "fr: login button =",
    JSON.stringify(await page.locator("#kc-login").inputValue()),
    "| html lang =",
    await page.evaluate(() => document.documentElement.lang)
);
await snap("3-fr");

// 4. Successful login -> account console
await page.fill("#username", "testuser");
await page.fill("#password", "password123");
await page.click("#kc-login");
await page.waitForURL(/\/account/, { timeout: 20000 });
console.log("login ok: url =", page.url().replace(base, ""));
await snap("4-logged-in");

console.log("console errors =", JSON.stringify(errors));
console.log("http >= 400 =", JSON.stringify(failed));
await browser.close();
process.exitCode = errors.length || failed.length ? 1 : 0;
