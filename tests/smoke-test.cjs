const { chromium } = require('playwright');
const path = require('path');

const BASE_URL = process.env.TEST_URL || 'http://127.0.0.1:4173/';

async function main() {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const consoleErrors = [];
    const failedRequests = [];

    page.on('console', message => {
        if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('requestfailed', request => {
        failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.click('#continue-without-photo-button');
    await page.waitForSelector('#form-view', { state: 'visible' });

    await page.selectOption('#programme', 'Kids');
    const kidsLevels = await page.locator('#level option').allTextContents();
    assertSequence(kidsLevels, ['Pre 4', 'Foundation', 'Beginner'], 'Kids levels');

    await page.selectOption('#programme', 'Youth');
    const youthLevels = await page.locator('#level option').allTextContents();
    assertSequence(youthLevels, ['Foundation', 'Beginner'], 'Youth levels');

    await page.selectOption('#programme', 'Adults');
    await page.selectOption('#language', 'PTE');
    const examLevels = await page.locator('#level option').allTextContents();
    assertSequence(examLevels, ['Eligible PTE', 'Ineligible PTE'], 'PTE levels');

    await page.fill('#name', 'PDF Test Candidate');
    await page.fill('#mobileNumber', '01000000000');
    await page.selectOption('#level', 'Eligible PTE');
    const downloadPromise = page.waitForEvent('download');
    await page.click('#download-pdf-button');
    const download = await downloadPromise;
    if (!download.suggestedFilename().endsWith('.pdf')) {
        throw new Error(`Expected a PDF download, received ${download.suggestedFilename()}`);
    }
    await page.waitForFunction(() => {
        const status = document.getElementById('status-message');
        return status && status.textContent.includes('PDF downloaded');
    });

    await page.screenshot({ path: path.join('artifacts', 'desktop-form.png'), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join('artifacts', 'mobile-form.png'), fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

    if (overflow) throw new Error('Mobile layout has horizontal overflow');
    if (consoleErrors.length) throw new Error(`Console errors:\n${consoleErrors.join('\n')}`);
    if (failedRequests.length) throw new Error(`Failed requests:\n${failedRequests.join('\n')}`);

    console.log('Smoke test passed: assets, routing controls, level ordering, and responsive layout.');
    await browser.close();
}

function assertSequence(values, expected, label) {
    const compact = values.map(value => value.trim()).filter(Boolean);
    let cursor = -1;
    for (const item of expected) {
        const next = compact.indexOf(item, cursor + 1);
        if (next < 0) throw new Error(`${label}: missing or misplaced "${item}" in ${JSON.stringify(compact)}`);
        cursor = next;
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
