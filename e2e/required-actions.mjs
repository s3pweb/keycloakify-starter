/* global process */
// Usage: node e2e/required-actions.mjs <actionTokenUrl> <label>
// Follows an execute-actions email link and screenshots each required-action page.
import { chromium } from "playwright-core";

const [link, label] = process.argv.slice(2);
const shots = new URL("screenshots/", import.meta.url).pathname;

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const errors = [];
page.on("console", m => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", e => errors.push("pageerror: " + e.message));

await page.goto(link);
await page.waitForLoadState("networkidle");
for (let i = 0; i < 4; i++) {
    const pageId = await page.evaluate(() => window.kcContext?.pageId);
    const text = (await page.locator("body").innerText())
        .replace(/\s+/g, " ")
        .slice(0, 140);
    console.log(
        `${pageId} | logo=${await page.locator('img[alt="B2PConnect.com"]').count()} | ${text}`
    );
    await page.screenshot({
        path: `${shots}${label}-action-${i}-${pageId}.png`,
        fullPage: true
    });
    if (pageId === "info.ftl") {
        const proceed = page.locator("#kc-info-message a");
        if (!(await proceed.count())) break;
        await proceed.first().click();
    } else if (pageId === "login-update-password.ftl") {
        await page.fill("#password-new", "password123");
        await page.fill("#password-confirm", "password123");
        await page.click('input[type="submit"], button[type="submit"]');
    } else {
        break;
    }
    await page.waitForLoadState("networkidle");
}

console.log("console errors =", JSON.stringify(errors));
await browser.close();
process.exitCode = errors.length ? 1 : 0;
