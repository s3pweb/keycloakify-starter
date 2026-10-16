/* global process */
// Usage: node e2e/required-actions.mjs <actionTokenUrl> <label>
// Follows the execute-actions (UPDATE_PASSWORD + CONFIGURE_TOTP) email link and checks the exact
// page sequence. Keycloak shows the OTP setup before the password update; the test stops there
// (no OTP code to submit), so login-update-password.ftl is not covered.
// Exits 1 on an unexpected page, a page without the logo, or console errors.
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const [link, label] = process.argv.slice(2);
const shots = fileURLToPath(new URL("screenshots/", import.meta.url));
const expectedPages = ["info.ftl", "login-config-totp.ftl"];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
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

// Clicks and waits for the next document to load (so the loop never reads the previous page),
// then for the network to settle (the React page is lazy-loaded after "load")
async function submit(action) {
    await Promise.all([page.waitForEvent("load"), action()]);
    await page.waitForLoadState("networkidle");
}

let failures = 0;
await page.goto(link, { waitUntil: "networkidle" });
for (const [i, expected] of expectedPages.entries()) {
    const pageId = await page.evaluate(() => window.kcContext?.pageId);
    // A page without the header (unexpected layout) must be reported, not crash the script
    const logo = await page.evaluate(() => {
        const header = document.getElementById("kc-header-wrapper");
        return (
            !!header &&
            getComputedStyle(header).backgroundImage.includes("logo-b2pconnect")
        );
    });
    await page.screenshot({
        path: `${shots}${label}-action-${i}-${pageId}.png`,
        fullPage: true
    });
    const ok = pageId === expected && logo;
    console.log(
        `${ok ? "ok  " : "FAIL"} page ${i}: ${pageId} (expected ${expected}) | logo=${logo}`
    );
    if (!ok) {
        failures++;
        break;
    }
    if (pageId === "info.ftl") {
        await submit(() => page.locator("#kc-info-message a").first().click());
    }
}

console.log(
    `${errors.length ? "FAIL" : "ok  "} no console / HTTP errors = ${JSON.stringify(errors)}`
);
await browser.close();
process.exitCode = failures || errors.length ? 1 : 0;
