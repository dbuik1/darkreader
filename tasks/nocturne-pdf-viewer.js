// @ts-check
// Copies Nocturne's PDF viewer page and the pdf.js files it loads at run time into the
// Chromium MV3 build. pdf.js ships prebuilt ES modules and a worker that are loaded as is,
// so they are copied rather than passed through the extension's bundler.
import {absolutePath, getDestDir} from './paths.js';
import {PLATFORM} from './platform.js';
import * as reload from './reload.js';
import {createTask} from './task.js';
import {copyFile, getPaths} from './utils.js';

const PLATFORMS = [PLATFORM.CHROMIUM_MV3, PLATFORM.CHROMIUM_MV3_PLUS];
const PAGE_DIR = 'src/ui/nocturne/pdf-viewer';
const PDFJS_DIR = 'node_modules/pdfjs-dist';
const DEST = 'ui/pdf-viewer';

/** @type {Array<{from: string; to: string}>} */
const files = [
    {from: `${PAGE_DIR}/index.html`, to: `${DEST}/index.html`},
    {from: `${PDFJS_DIR}/build/pdf.min.mjs`, to: `${DEST}/vendor/pdf.min.mjs`},
    {from: `${PDFJS_DIR}/build/pdf.worker.min.mjs`, to: `${DEST}/vendor/pdf.worker.min.mjs`},
    {from: `${PDFJS_DIR}/web/pdf_viewer.mjs`, to: `${DEST}/vendor/pdf_viewer.mjs`},
    {from: `${PDFJS_DIR}/web/pdf_viewer.css`, to: `${DEST}/vendor/pdf_viewer.css`},
    {from: `${PDFJS_DIR}/LICENSE`, to: `${DEST}/vendor/LICENSE`},
];

const folders = ['web/images', 'wasm', 'standard_fonts', 'cmaps', 'iccs'];

async function copyAll({platforms, debug}) {
    const targets = PLATFORMS.filter((platform) => platforms[platform]);
    if (targets.length === 0) {
        return;
    }
    /** @type {Array<{from: string; to: string}>} */
    const all = [...files];
    for (const folder of folders) {
        const root = absolutePath(`${PDFJS_DIR}/${folder}`);
        for (const file of await getPaths(`${root}/**/*`)) {
            const name = folder === 'web/images' ? `images/${file.slice(root.length + 1)}` : `${folder}/${file.slice(root.length + 1)}`;
            all.push({from: file, to: `${DEST}/vendor/${name}`});
        }
    }
    await Promise.all(targets.flatMap((platform) => all.map(({from, to}) => {
        const src = from.startsWith('/') ? from : absolutePath(from);
        return copyFile(src, `${getDestDir({debug, platform})}/${to}`);
    })));
}

const task = createTask('nocturne-pdf-viewer', copyAll).addWatcher(
    [`${PAGE_DIR}/index.html`],
    async (_changedFiles, _watcher, platforms) => {
        await copyAll({platforms, debug: true});
        reload.reload({type: reload.UI});
    },
);

export default task;
