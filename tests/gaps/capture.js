// @ts-check
import {createServer} from 'node:http';
import {mkdir, readFile, rm} from 'node:fs/promises';
import {extname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PAGES = ['canvas-2d', 'canvas-webgl', 'shadow-closed', 'images'];
const TYPES = {'.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.pdf': 'application/pdf'};

const [extensionDir, outDir] = process.argv.slice(2).map((p) => resolve(p));
const executablePath = process.env.CHROME_PATH;
if (!extensionDir || !outDir || !executablePath) {
    console.error('Usage: CHROME_PATH=<chrome binary> node tests/gaps/capture.js <unpacked extension dir> <output dir>');
    process.exit(1);
}

const server = createServer(async (req, res) => {
    const path = new URL(req.url || '/', 'http://localhost').pathname;
    const file = join(ROOT, path === '/' ? 'index.html' : path);
    if (!file.startsWith(ROOT)) {
        res.writeHead(403).end();
        return;
    }
    try {
        const body = await readFile(file);
        res.writeHead(200, {'Content-Type': TYPES[/** @type {keyof TYPES} */ (extname(file))] || 'application/octet-stream'}).end(body);
    } catch {
        res.writeHead(404).end();
    }
});
await new Promise((done) => server.listen(0, () => done(undefined)));
const address = server.address();
const port = typeof address === 'object' && address ? address.port : 0;

await mkdir(outDir, {recursive: true});
const profileDir = join(outDir, '.profile');
const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    userDataDir: profileDir,
    args: [`--disable-extensions-except=${extensionDir}`, `--load-extension=${extensionDir}`, '--no-sandbox'],
    defaultViewport: {width: 900, height: 900},
});

// The extension needs a moment after startup before it themes pages.
await new Promise((done) => setTimeout(done, 3000));
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error));
for (const name of PAGES) {
    await page.goto(`http://localhost:${port}/${name}.html`);
    await new Promise((done) => setTimeout(done, 3500));
    // Images are only analysed near the viewport, so scroll through the page before capturing it.
    await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 400) {
            scrollTo(0, y);
            await new Promise((done) => setTimeout(done, 100));
        }
        scrollTo(0, 0);
    });
    await new Promise((done) => setTimeout(done, 1000));
    const themed = await page.evaluate(() => Boolean(document.querySelector('.darkreader')));
    await page.screenshot({path: /** @type {`${string}.png`} */ (join(outDir, `${name}.png`)), fullPage: true});
    console.log(`${name}: ${themed ? 'themed' : 'NOT themed'}`);
}
await browser.close();
server.close();
await rm(profileDir, {recursive: true, force: true});
if (errors.length > 0) {
    console.error(errors);
    process.exit(1);
}
