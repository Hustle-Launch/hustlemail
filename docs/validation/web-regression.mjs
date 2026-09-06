import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const cdp = process.argv[2];
if (!cdp) throw new Error('Provide the CDP URL of a dedicated agent-browser session.');
const browser = await chromium.connectOverCDP(cdp);
const page = browser.contexts()[0].pages()[0];
const result = { date: new Date().toISOString(), url: 'http://localhost:3000/demo', tests: [], consoleErrors: [], consoleWarnings: [], pageErrors: [], screenshots: [] };
page.on('console', message => { if (message.type() === 'error') result.consoleErrors.push(message.text()); if (message.type() === 'warning') result.consoleWarnings.push(message.text()); });
page.on('pageerror', error => result.pageErrors.push(error.message));
const directory = path.dirname(new URL(import.meta.url).pathname);
async function test(name, run) { try { await run(); result.tests.push({ name, pass: true }); console.log('PASS ' + name); } catch (error) { result.tests.push({ name, pass: false, error: String(error) }); console.log('FAIL ' + name + ': ' + error.message); } }
async function inbox() { await page.goto(result.url); await page.locator('.hm-row').first().waitFor(); }
async function waitForCount(count) { await page.waitForFunction(n => document.querySelectorAll('.hm-row').length === n, count); }
await page.setViewportSize({ width: 1440, height: 960 });
await inbox();
await page.evaluate(() => { localStorage.clear(); });
await inbox();
await test('desktop archive/undo uses focused conversation and restores it', async () => {
  await waitForCount(7);
  await page.locator('#hm-mail-list').focus();
  await page.keyboard.press('j');
  assert.equal(await page.locator('.hm-row-focused').getAttribute('data-message-id'), 'preview-1');
  await page.keyboard.press('e'); await waitForCount(6);
  assert.equal(await page.locator('[data-message-id="preview-1"]').count(), 0);
  await page.keyboard.press('z'); await waitForCount(7);
  assert.equal(await page.locator('[data-message-id="preview-1"]').count(), 1);
});
await test('search input owns letter keys and Escape restores the list', async () => {
  await page.getByRole('textbox', { name: 'Search your mail', exact: true }).fill('cjerx');
  assert.equal(await page.locator('.hm-composer').count(), 0);
  assert.equal(await page.getByRole('textbox', { name: 'Search your mail', exact: true }).inputValue(), 'cjerx');
  await page.keyboard.press('Escape'); await waitForCount(7);
});
await test('command palette and shortcut help contain keyboard actions', async () => {
  await page.locator('#hm-mail-list').focus();
  await page.keyboard.press('Control+k'); await page.locator('.hm-command-modal').waitFor();
  await page.keyboard.type('e'); assert.equal(await page.locator('.hm-row').count(), 7);
  await page.keyboard.press('Escape'); await page.locator('.hm-command-modal').waitFor({ state: 'hidden' });
  await page.locator('#hm-mail-list').focus();
  await page.keyboard.press('Shift+?'); await page.locator('.hm-shortcuts').waitFor();
  await page.keyboard.press('e'); assert.equal(await page.locator('.hm-row').count(), 7);
  await page.keyboard.press('Escape'); await page.locator('.hm-command-modal').waitFor({ state: 'hidden' });
});
const body = 'Preview regression draft: j k e r c x h z remain text.\nThis draft must survive a reload.';
await test('typed draft survives close and reload; preview cannot send', async () => {
  await page.locator('#hm-mail-list').focus(); await page.keyboard.press('c');
  await page.locator('.hm-composer').waitFor();
  await page.getByLabel('To', { exact: true }).fill('preview@example.com');
  await page.getByLabel('Subject', { exact: true }).fill('Durable preview draft');
  await page.getByRole('textbox', { name: 'Message body', exact: true }).fill(body);
  assert.equal(await page.locator('.hm-row').count(), 7);
  assert.equal(await page.getByRole('button', { name: 'Sending disabled in preview' }).isDisabled(), true);
  await page.keyboard.press('Escape'); await page.locator('.hm-composer').waitFor({ state: 'hidden' });
  await page.reload(); await page.locator('.hm-resume').waitFor(); await page.locator('.hm-resume').click();
  assert.equal(await page.getByLabel('To', { exact: true }).inputValue(), 'preview@example.com');
  assert.equal(await page.getByLabel('Subject', { exact: true }).inputValue(), 'Durable preview draft');
  assert.equal(await page.getByRole('textbox', { name: 'Message body', exact: true }).inputValue(), body);
});
await test('composer command palette closes without dismissing the draft', async () => {
  await page.getByRole('textbox', { name: 'Message body', exact: true }).focus();
  await page.keyboard.press('Control+k'); await page.locator('.hm-command-modal').waitFor();
  await page.waitForFunction(() => document.activeElement?.hasAttribute('cmdk-input'));
  await page.keyboard.press('Escape'); await page.locator('.hm-command-modal').waitFor({ state: 'hidden' });
  assert.equal(await page.locator('.hm-composer').isVisible(), true);
  assert.equal(await page.getByRole('textbox', { name: 'Message body', exact: true }).inputValue(), body);
  await page.getByRole('button', { name: 'Discard draft', exact: true }).click();
  await page.locator('.hm-composer').waitFor({ state: 'hidden' });
});
await test('light/dark preference persists across reload', async () => {
  await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
  assert.equal(await page.locator('.hm-app.hm-light').count(), 1);
  await page.reload(); await page.locator('.hm-row').first().waitFor();
  assert.equal(await page.locator('.hm-app.hm-light').count(), 1);
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
  assert.equal(await page.locator('.hm-app.hm-light').count(), 0);
});
await page.locator('.hm-toast button[aria-label="Dismiss notification"]').click({ timeout: 1000 }).catch(() => {});
await page.screenshot({ path: path.join(directory, 'web-desktop.png') }); result.screenshots.push('web-desktop.png');
await page.setViewportSize({ width: 390, height: 844 }); await inbox();
await test('mobile navigation opens and selects a folder without horizontal overflow', async () => {
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.locator('.hm-sidebar-open').waitFor();
  await page.getByRole('navigation', { name: 'Mail folders', exact: true }).getByRole('button', { name: 'Starred', exact: true }).click();
  await page.locator('.hm-sidebar-open').waitFor({ state: 'hidden' });
  assert.match(await page.locator('.hm-folder-header h1').innerText(), /Starred/);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.getByRole('navigation', { name: 'Mail folders', exact: true }).getByRole('button', { name: /^Inbox/ }).click();
  await waitForCount(7);
});
await page.screenshot({ path: path.join(directory, 'web-mobile.png') }); result.screenshots.push('web-mobile.png');
await test('mobile opens and reads a conversation within the viewport', async () => {
  await page.locator('.hm-row-main').first().click(); await page.locator('.hm-plain-body').waitFor();
  assert.match(await page.locator('.hm-plain-body').innerText(), /I’ve been thinking/);
  const bounds = await page.locator('.hm-reader').boundingBox();
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 391);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.getByRole('button', { name: 'Back to inbox (Esc)', exact: true }).click();
});
await test('mobile compose fits screen, preserves typed text and disables sending', async () => {
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.locator('.hm-compose-button').click(); await page.locator('.hm-composer').waitFor();
  await page.getByLabel('To', { exact: true }).fill('mobile-preview@example.com');
  await page.getByLabel('Subject', { exact: true }).fill('Mobile layout check');
  await page.getByRole('textbox', { name: 'Message body', exact: true }).fill('The composer stays within the mobile viewport.');
  const composer = await page.locator('.hm-composer').boundingBox(); const footer = await page.locator('.hm-composer-footer').boundingBox();
  assert.ok(composer.x === 0 && composer.y === 0 && composer.width <= 390 && composer.height <= 844);
  assert.ok(footer.y + footer.height <= 845);
  assert.equal(await page.getByRole('button', { name: 'Sending disabled in preview' }).isDisabled(), true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.screenshot({ path: path.join(directory, 'web-mobile-compose.png') }); result.screenshots.push('web-mobile-compose.png');
  await page.getByRole('button', { name: 'Save and close draft', exact: true }).click();
  await page.locator('.hm-resume').waitFor();
});
await test('visual viewport resize and offset keep composer controls inside visible bounds', async () => {
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.locator('.hm-resume').click();
  await page.locator('.hm-composer').waitFor();
  await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--hm-viewport-height'));
  try {
    await page.evaluate(() => {
      // Synthetic geometry verifies the visualViewport event path; iOS XCUITest covers the real keyboard.
      Object.defineProperty(window.visualViewport, 'height', { configurable: true, value: 430 });
      Object.defineProperty(window.visualViewport, 'offsetTop', { configurable: true, value: 15 });
      window.visualViewport.dispatchEvent(new Event('resize'));
    });
    await page.waitForFunction(() => document.querySelector('.hm-composer').getBoundingClientRect().height === 430);
    const composer = await page.locator('.hm-composer').boundingBox();
    const header = await page.locator('.hm-composer-title').boundingBox();
    const footer = await page.locator('.hm-composer-footer').boundingBox();
    assert.equal(composer.y, 15);
    assert.equal(header.y, 15);
    assert.equal(footer.y + footer.height, 445);
    assert.equal(await page.locator('#hm-to').evaluate(element => getComputedStyle(element).fontSize), '16px');
  } finally {
    await page.evaluate(() => {
      delete window.visualViewport.height;
      delete window.visualViewport.offsetTop;
      window.visualViewport.dispatchEvent(new Event('resize'));
    });
    await page.getByRole('button', { name: 'Save and close draft', exact: true }).click();
  }
});
await test('no page errors, console errors or hydration warnings', async () => {
  assert.deepEqual(result.pageErrors, []);
  assert.deepEqual(result.consoleErrors, []);
  assert.equal(result.consoleWarnings.some(message => /hydration|did not match|server rendered/i.test(message)), false);
});
await fs.writeFile(path.join(directory, 'web-regression.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ passed: result.tests.filter(test => test.pass).length, total: result.tests.length, errors: result.consoleErrors, warnings: result.consoleWarnings }, null, 2));
await browser.close();
if (result.tests.some(test => !test.pass)) process.exitCode = 1;
