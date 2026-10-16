/* global process */
// Usage: node e2e/login.mjs <baseUrl> <label>
// Login page checks on realm "myrealm": branding, language switch, bad password, successful login.
// Exits 1 if a check fails, on console errors or on HTTP >= 400.
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const [base, label] = process.argv.slice(2);
const password = process.env.KC_TEST_PASSWORD ?? "password123";
const shots = fileURLToPath(new URL("screenshots/", import.meta.url));
const realm = `${base}/realms/myrealm`;

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("console", m => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", e => errors.push("pageerror: " + e.message));
page.on(
    "response",
    r =>
        r.status() >= 400 &&
        !r.url().includes("favicon") &&
        errors.push(`HTTP ${r.status()} ${r.url()}`)
);

let failures = 0;
function check(name, value, ok) {
    console.log(`${ok ? "ok  " : "FAIL"} ${name} = ${JSON.stringify(value)}`);
    if (!ok) failures++;
}

const snap = name =>
    page.screenshot({ path: `${shots}${label}-${name}.png`, fullPage: true });

// 1. Login page (reached through the account console, which handles PKCE)
await page.goto(`${realm}/account`);
await page.waitForSelector("#username", { timeout: 20000 });
await page.waitForLoadState("networkidle"); // the logo is a CSS background image
await snap("1-login");
const logo = await page.evaluate(
    () => getComputedStyle(document.getElementById("kc-header-wrapper")).backgroundImage
);
check("login: logo", logo, logo.includes("B2PConnect.com_fondfonceai"));
// TODO: naive visibility heuristic — an empty header compresses to a tiny PNG (~0.6 KB vs ~9 KB
// with the logo); compare against a reference image if it proves flaky
const logoShot = await page.locator("#kc-header-wrapper").screenshot();
check(
    "login: logo visible (header screenshot bytes)",
    logoShot.length,
    logoShot.length > 2000
);
const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
check("login: body background", bg, bg === "rgb(49, 63, 80)");
// textContent, not innerText: the language dropdown is hidden until hovered
const hasNaN = (await page.locator("body").textContent()).includes("NaN");
check("login: no NaN in page", hasNaN, !hasNaN);
const languages = await page.locator("#language-switch1 a").allInnerTexts();
check(
    "login: languages",
    languages,
    languages.includes("English") && languages.includes("Français")
);

// 2. Wrong password -> error message
await page.fill("#username", "testuser");
await page.fill("#password", "wrong");
await page.click("#kc-login");
await page.waitForSelector(".kcAlertTitleClass, #input-error", { timeout: 15000 });
await snap("2-bad-password");
const badPasswordError = (
    await page.locator("#input-error, .kcAlertTitleClass").first().innerText()
).trim();
check("bad password: error message", badPasswordError, badPasswordError !== "");

// 3. Switch language to French (the dropdown opens on hover)
await page.hover("#kc-current-locale-link");
await Promise.all([
    page.waitForURL(/kc_locale=fr/),
    page.locator("#language-switch1 a", { hasText: "Français" }).first().click()
]);
await page.waitForSelector("#username");
await snap("3-fr");
const lang = await page.evaluate(() => document.documentElement.lang);
check("fr: html lang", lang, lang === "fr");
const loginButton = await page.locator("#kc-login").inputValue();
check("fr: login button", loginButton, loginButton === "Connexion");

// 4. Successful login -> account console
await page.fill("#username", "testuser");
await page.fill("#password", password);
await page.click("#kc-login");
await page.waitForURL(/\/account/, { timeout: 20000 });
await snap("4-logged-in");
const loggedInPath = new URL(page.url()).pathname;
check("login ok: url", loggedInPath, loggedInPath.startsWith("/realms/myrealm/account"));

check("no console / HTTP errors", errors, errors.length === 0);
await browser.close();
process.exitCode = failures ? 1 : 0;
