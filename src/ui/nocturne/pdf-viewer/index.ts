// Nocturne's PDF viewer: pdf.js pages drawn dark by inverting each page canvas with hue
// kept, with photos restored to true colour on top (see page-images.ts). Printing re-renders
// every page in its original colours.
//
// Opened as ui/pdf-viewer/index.html?file=<url>.

import {pdfViewerStrings as s} from '../strings';

import {restorePageImages} from './page-images';
import {buildToolbar} from './toolbar';
import type {Toolbar} from './toolbar';

declare const chrome: any;

const ORIGINAL_MARKER = 'nocturne-original';
const PRINT_DPI = 150;
const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

const params = new URLSearchParams(location.search);
const fileURL = params.get('file') ?? '';

function originalURL(): string {
    const url = new URL(fileURL);
    url.hash = url.hash ? `${url.hash}&${ORIGINAL_MARKER}` : ORIGINAL_MARKER;
    return url.href;
}

function fileName(): string {
    try {
        const last = new URL(fileURL).pathname.split('/').filter(Boolean).pop();
        return last ? decodeURIComponent(last) : s.untitled;
    } catch {
        return s.untitled;
    }
}

// pdf.js loads from module scripts placed before this script in index.html, which run first
// and publish the library on globalThis.
function loadPDFJS() {
    const base = chrome.runtime.getURL('ui/pdf-viewer/vendor/');
    const lib = (globalThis as any).pdfjsLib;
    const viewer = (globalThis as any).pdfjsViewer;
    lib.GlobalWorkerOptions.workerSrc = `${base}pdf.worker.min.mjs`;
    return {lib, viewer, base};
}

function showMessage(main: HTMLElement, text: string, withOriginalLink: boolean) {
    const box = document.createElement('div');
    box.className = 'v-message';
    const p = document.createElement('p');
    p.textContent = text;
    box.append(p);
    if (withOriginalLink && fileURL) {
        const a = document.createElement('a');
        a.className = 'n-button n-button--primary v-message__action';
        a.href = originalURL();
        a.textContent = s.openOriginal;
        box.append(a);
    }
    main.replaceChildren(box);
    box.setAttribute('tabindex', '-1');
    box.focus();
}

function askForPassword(main: HTMLElement, wrong: boolean): Promise<string> {
    return new Promise((resolve) => {
        const form = document.createElement('form');
        form.className = 'v-message';
        const title = document.createElement('h2');
        title.textContent = s.passwordTitle;
        const label = document.createElement('label');
        label.className = 'n-field';
        const labelText = document.createElement('span');
        labelText.textContent = s.password;
        const input = document.createElement('input');
        input.type = 'password';
        input.className = 'n-field__input';
        input.autocomplete = 'off';
        label.append(labelText, input);
        if (wrong) {
            const error = document.createElement('span');
            error.className = 'n-field__error';
            error.id = 'password-error';
            error.textContent = s.wrongPassword;
            input.setAttribute('aria-invalid', 'true');
            input.setAttribute('aria-describedby', error.id);
            label.append(error);
        }
        const button = document.createElement('button');
        button.type = 'submit';
        button.className = 'n-button n-button--primary';
        button.textContent = s.openPDF;
        form.append(title, label, button);
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            main.replaceChildren();
            resolve(input.value);
        });
        main.replaceChildren(form);
        input.focus();
    });
}

async function printDocument(pdf: any, toolbar: Toolbar) {
    const holder = document.getElementById('print-pages')!;
    holder.replaceChildren();
    const urls: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        toolbar.setStatus(s.preparingPrint(i, pdf.numPages));
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({scale: PRINT_DPI / 72});
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await page.render({canvas, viewport, intent: 'print'}).promise;
        const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done));
        if (!blob) {
            continue;
        }
        const url = URL.createObjectURL(blob);
        urls.push(url);
        const img = document.createElement('img');
        img.src = url;
        img.alt = '';
        holder.append(img);
        await img.decode();
    }
    toolbar.setStatus('');
    addEventListener('afterprint', () => {
        holder.replaceChildren();
        urls.forEach((url) => URL.revokeObjectURL(url));
    }, {once: true});
    print();
}

async function start() {
    document.title = fileName();
    // pdf.js requires both the scroll container and the page holder to be <div> elements.
    const container = document.createElement('div');
    container.id = 'viewerContainer';
    container.className = 'v-pages';
    container.tabIndex = 0;
    const viewerEl = document.createElement('div');
    viewerEl.id = 'viewer';
    viewerEl.className = 'pdfViewer';
    container.append(viewerEl);
    const printHolder = document.createElement('div');
    printHolder.id = 'print-pages';
    printHolder.setAttribute('aria-hidden', 'true');
    const toolbar = buildToolbar(fileName(), originalURL);
    const stage = document.createElement('main');
    stage.className = 'v-stage';
    stage.append(container);
    document.body.append(toolbar.element, stage, printHolder);

    if (!fileURL) {
        showMessage(container, s.noFile, false);
        return;
    }
    toolbar.setStatus(s.loading);

    const {lib, viewer: viewerLib, base} = loadPDFJS();
    const eventBus = new viewerLib.EventBus();
    const linkService = new viewerLib.PDFLinkService({eventBus});
    const findController = new viewerLib.PDFFindController({eventBus, linkService});
    const pdfViewer = new viewerLib.PDFViewer({
        container,
        viewer: viewerEl,
        eventBus,
        linkService,
        findController,
        // Records where images are drawn, so photos can be shown in true colour.
        imagesRightClickMinSize: 0,
        // A detail canvas would sit above the photo overlay when zoomed in.
        enableDetailCanvas: false,
    });
    linkService.setViewer(pdfViewer);

    eventBus.on('pagerendered', ({source}: {source: Parameters<typeof restorePageImages>[0]}) => restorePageImages(source));
    eventBus.on('pagesinit', () => {
        pdfViewer.currentScaleValue = 'page-width';
        toolbar.setPageCount(pdfViewer.pagesCount);
        toolbar.setStatus('');
    });
    eventBus.on('pagechanging', ({pageNumber}: {pageNumber: number}) => toolbar.setPage(pageNumber));
    eventBus.on('scalechanging', ({presetValue, scale}: {presetValue?: string; scale: number}) => toolbar.setZoom(presetValue ?? String(scale)));
    eventBus.on('updatefindmatchescount', ({matchesCount}: {matchesCount: {current: number; total: number}}) => toolbar.setMatches(matchesCount));
    eventBus.on('updatefindcontrolstate', ({matchesCount, rawQuery}: {matchesCount: {current: number; total: number}; rawQuery: string | null}) => {
        toolbar.setMatches(rawQuery ? matchesCount : null);
    });

    const find = (query: string, findPrevious: boolean, again: boolean) => {
        eventBus.dispatch('find', {source: null, type: again ? 'again' : '', query, caseSensitive: false, entireWord: false, highlightAll: true, findPrevious, matchDiacritics: false});
    };

    let pdf: any = null;
    toolbar.on({
        page: (n) => {
            pdfViewer.currentPageNumber = Math.min(Math.max(1, n), pdfViewer.pagesCount);
        },
        zoom: (value) => {
            pdfViewer.currentScaleValue = value;
        },
        zoomStep: (direction) => {
            const current = pdfViewer.currentScale;
            const next = direction > 0 ? ZOOM_STEPS.find((z) => z > current + 0.01) : [...ZOOM_STEPS].reverse().find((z) => z < current - 0.01);
            if (next) {
                pdfViewer.currentScale = next;
            }
        },
        find,
        print: () => pdf && printDocument(pdf, toolbar),
    });

    addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            toolbar.focusFind();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
            e.preventDefault();
            toolbar.print();
        }
    });

    const task = lib.getDocument({
        url: fileURL,
        withCredentials: true,
        wasmUrl: `${base}wasm/`,
        standardFontDataUrl: `${base}standard_fonts/`,
        cMapUrl: `${base}cmaps/`,
        iccUrl: `${base}iccs/`,
        isEvalSupported: false,
        enableXfa: false,
    });
    let wrongPassword = false;
    task.onPassword = async (update: (password: string) => void) => {
        toolbar.setStatus('');
        update(await askForPassword(container, wrongPassword));
        wrongPassword = true;
        container.append(viewerEl);
        toolbar.setStatus(s.loading);
    };
    try {
        pdf = await task.promise;
    } catch {
        toolbar.setStatus('');
        showMessage(container, s.loadFailed, true);
        return;
    }
    pdfViewer.setDocument(pdf);
    linkService.setDocument(pdf, null);
    const meta = await pdf.getMetadata().catch(() => null);
    const title = meta?.info?.Title;
    if (typeof title === 'string' && title.trim() && !/^untitled$/i.test(title.trim())) {
        document.title = title.trim();
        toolbar.setTitle(title.trim());
    }
}

start();
