/* global process */
// Usage: node e2e/required-actions.mjs <actionTokenUrl> <label>
// Follows the execute-actions (UPDATE_PASSWORD + CONFIGURE_TOTP) email link through the
// required-action pages, up to the OTP setup page. Exits 1 on an unexpected page, a page
// without the logo, or console errors.
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const [link, label] = process.argv.slice(2);
const password = process.env.KC_TEST_PASSWORD ?? "password123";
const shots = fileURLToPath(new URL("screenshots/", import.meta.url));
const expectedPages = ["info.ftl", "login-update-password.ftl", "login-config-totp.ftl"];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const errors = [];
page.on("console", m => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", e => errors.push("pageerror: " + e.message));

// Clicks and waits for the next document to load (so the loop never reads the previous page),
// then for the network to settle (the React page is lazy-loaded after "load")
async function submit(action) {
    await Promise.all([page.waitForEvent("load"), action()]);
    await page.waitForLoadState("networkidle");
}

let failures = 0;
let pageId;
await page.goto(link, { waitUntil: "networkidle" });
for (let i = 0; i < expectedPages.length; i++) {
    pageId = await page.evaluate(() => window.kcContext?.pageId);
    const logo = await page.locator('img[alt="B2PConnect.com"]').count();
    await page.screenshot({
        path: `${shots}${label}-action-${i}-${pageId}.png`,
        fullPage: true
    });
    const ok = expectedPages.includes(pageId) && logo === 1;
    console.log(`${ok ? "ok  " : "FAIL"} page ${i}: ${pageId} | logo=${logo}`);
    if (!ok) {
        failures++;
        break;
    }
    if (pageId === "login-config-totp.ftl") break;
    if (pageId === "info.ftl") {
        await submit(() => page.locator("#kc-info-message a").first().click());
    } else {
        await page.fill("#password-new", password);
        await page.fill("#password-confirm", password);
        await submit(() => page.click('input[type="submit"], button[type="submit"]'));
    }
}

if (!failures && pageId !== "login-config-totp.ftl") {
    console.log(`FAIL OTP setup page not reached (last page: ${pageId})`);
    failures++;
}
console.log(
    `${errors.length ? "FAIL" : "ok  "} no console errors = ${JSON.stringify(errors)}`
);
await browser.close();
process.exitCode = failures || errors.length ? 1 : 0;
