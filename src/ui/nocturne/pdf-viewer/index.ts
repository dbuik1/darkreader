// Nocturne's PDF viewer: pdf.js pages drawn dark by inverting each page canvas with hue
// kept, with photos restored to true colour on top (see page-images.ts). Printing re-renders
// every page in its original colours.
//
// Opened as ui/pdf-viewer/index.html?file=<url>.

import {pdfViewerStrings as s} from '../strings';

import {downloadDocument, loadPosition, savePosition, showProperties} from './actions';
import {buildOutline} from './outline';
import {restorePageImages} from './page-images';
import {buildPanel} from './panel';
import {buildThumbnails} from './thumbnails';
import {buildToolbar} from './toolbar';
import type {Toolbar} from './toolbar';

declare const chrome: any;

const ORIGINAL_MARKER = 'nocturne-original';
const PRINT_DPI = 150;
const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
const PANEL_KEY = 'nocturne-pdf-panel-open';
const WIDE = '(min-width: 1000px)';
const SPREAD_NONE = 0;
const SPREAD_ODD = 1;
const SCROLL_VERTICAL = 0;
const SCROLL_PAGE = 3;

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

function readPanelPreference(): boolean {
    try {
        const saved = localStorage.getItem(PANEL_KEY);
        if (saved !== null) {
            return saved === 'true';
        }
    } catch {
        // Fall through to the default.
    }
    return matchMedia(WIDE).matches;
}

function isTyping(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    return Boolean(el && (el.isContentEditable || el.closest('input, select, textarea')));
}

function showToast(text: string) {
    const toast = document.createElement('p');
    toast.className = 'v-toast';
    toast.setAttribute('role', 'status');
    toast.textContent = text;
    (document.fullscreenElement ?? document.body).append(toast);
    setTimeout(() => toast.remove(), 3000);
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
    toolbar.setReady(false);
    const panel = buildPanel(() => setPanel(false, true));
    const stage = document.createElement('main');
    stage.className = 'v-stage';
    // pdf.js needs its scroll container absolutely positioned, so it sits in its own box.
    const pagesHost = document.createElement('div');
    pagesHost.className = 'v-pages-host';
    pagesHost.append(container);
    stage.append(panel.element, panel.scrim, pagesHost);
    document.body.append(toolbar.element, stage, printHolder);

    function setPanel(open: boolean, returnFocus = false) {
        panel.setOpen(open);
        toolbar.setPanelOpen(open);
        if (!panel.isOverlay()) {
            try {
                localStorage.setItem(PANEL_KEY, String(open));
            } catch {
                // Remembering the panel is a convenience only.
            }
        }
        if (open && panel.isOverlay()) {
            panel.element.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus();
        } else if (!open && returnFocus) {
            toolbar.element.querySelector<HTMLElement>('[aria-controls="v-panel"]')?.focus();
        }
    }

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

    let pdf: any = null;
    let thumbnails: ReturnType<typeof buildThumbnails> | null = null;
    let outline: Awaited<ReturnType<typeof buildOutline>> | null = null;
    let fingerprint = '';
    let saveTimer = 0;
    const rememberPosition = () => {
        clearTimeout(saveTimer);
        saveTimer = window.setTimeout(() => {
            if (fingerprint && !document.fullscreenElement) {
                savePosition(fingerprint, pdfViewer.currentPageNumber, pdfViewer.currentScaleValue);
            }
        }, 500);
    };

    eventBus.on('pagerendered', ({source}: {source: Parameters<typeof restorePageImages>[0]}) => restorePageImages(source));
    eventBus.on('pagesinit', () => {
        const saved = fingerprint ? loadPosition(fingerprint) : null;
        const hash = (() => {
            try {
                return new URL(fileURL).hash.slice(1);
            } catch {
                return '';
            }
        })();
        pdfViewer.currentScaleValue = saved?.zoom ?? 'page-width';
        if (/(^|&)(page|nameddest)=/.test(hash)) {
            linkService.setHash(hash);
        } else if (saved && saved.page > 1 && saved.page <= pdfViewer.pagesCount) {
            pdfViewer.currentPageNumber = saved.page;
        }
        toolbar.setPageCount(pdfViewer.pagesCount);
        toolbar.setStatus('');
        toolbar.setReady(true);
    });
    eventBus.on('pagechanging', ({pageNumber}: {pageNumber: number}) => {
        toolbar.setPage(pageNumber);
        thumbnails?.setCurrent(pageNumber);
        outline?.setCurrent(pageNumber);
        rememberPosition();
    });
    eventBus.on('scalechanging', ({presetValue, scale}: {presetValue?: string; scale: number}) => {
        toolbar.setZoom(presetValue ?? String(scale));
        rememberPosition();
    });
    eventBus.on('rotationchanging', ({pagesRotation}: {pagesRotation: number}) => thumbnails?.setRotation(pagesRotation));
    eventBus.on('updatefindmatchescount', ({matchesCount}: {matchesCount: {current: number; total: number}}) => toolbar.setMatches(matchesCount));
    eventBus.on('updatefindcontrolstate', ({matchesCount, rawQuery}: {matchesCount: {current: number; total: number}; rawQuery: string | null}) => {
        toolbar.setMatches(rawQuery ? matchesCount : null);
    });

    const find = (query: string, findPrevious: boolean, again: boolean) => {
        eventBus.dispatch('find', {source: null, type: again ? 'again' : '', query, caseSensitive: false, entireWord: false, highlightAll: true, findPrevious, matchDiacritics: false});
    };

    const goToPage = (n: number) => {
        pdfViewer.currentPageNumber = Math.min(Math.max(1, n), pdfViewer.pagesCount);
        if (panel.isOverlay()) {
            setPanel(false);
        }
    };

    const zoomStep = (direction: 1 | -1) => {
        const current = pdfViewer.currentScale;
        const next = direction > 0 ? ZOOM_STEPS.find((z) => z > current + 0.01) : [...ZOOM_STEPS].reverse().find((z) => z < current - 0.01);
        if (next) {
            pdfViewer.currentScale = next;
        }
    };

    const rotate = () => {
        pdfViewer.pagesRotation = (pdfViewer.pagesRotation + 90) % 360;
    };

    const setOriginalColours = (on: boolean) => {
        container.classList.toggle('v-pages--original', on);
        panel.element.classList.toggle('v-panel--original', on);
        toolbar.setOriginalColours(on);
    };

    // Present: the pages fill the screen one at a time, fitted to it.
    let beforePresent: {scale: string; scroll: number; spread: number} | null = null;
    const present = async () => {
        beforePresent = {scale: pdfViewer.currentScaleValue, scroll: pdfViewer.scrollMode, spread: pdfViewer.spreadMode};
        try {
            await container.requestFullscreen();
        } catch {
            beforePresent = null;
        }
    };
    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement === container) {
            container.classList.add('v-pages--presenting');
            pdfViewer.spreadMode = SPREAD_NONE;
            pdfViewer.scrollMode = SCROLL_PAGE;
            pdfViewer.currentScaleValue = 'page-fit';
            container.focus();
            showToast(s.presenting);
        } else if (beforePresent) {
            container.classList.remove('v-pages--presenting');
            const page = pdfViewer.currentPageNumber;
            pdfViewer.scrollMode = beforePresent.scroll ?? SCROLL_VERTICAL;
            pdfViewer.spreadMode = beforePresent.spread;
            pdfViewer.currentScaleValue = beforePresent.scale;
            pdfViewer.currentPageNumber = page;
            beforePresent = null;
            rememberPosition();
        }
    });

    toolbar.on({
        page: goToPage,
        zoom: (value) => {
            pdfViewer.currentScaleValue = value;
        },
        zoomStep,
        find,
        findClosed: () => eventBus.dispatch('findbarclose', {source: null}),
        print: () => pdf && printDocument(pdf, toolbar),
        togglePanel: () => setPanel(!panel.isOpen()),
        rotate,
        twoPage: (on) => {
            pdfViewer.spreadMode = on ? SPREAD_ODD : SPREAD_NONE;
            toolbar.setTwoPage(on);
        },
        present,
        download: () => pdf && downloadDocument(pdf, fileName()),
        originalColours: setOriginalColours,
        properties: () => pdf && showProperties(pdf, fileName()),
    });

    addEventListener('keydown', (e) => {
        const mod = e.ctrlKey || e.metaKey;
        const key = e.key.toLowerCase();
        if (mod && key === 'f') {
            e.preventDefault();
            toolbar.openFind();
        } else if (mod && key === 'p') {
            e.preventDefault();
            pdf && printDocument(pdf, toolbar);
        } else if (mod && key === 's') {
            e.preventDefault();
            pdf && downloadDocument(pdf, fileName());
        } else if (mod && (key === '=' || key === '+')) {
            e.preventDefault();
            zoomStep(1);
        } else if (mod && key === '-') {
            e.preventDefault();
            zoomStep(-1);
        } else if (mod && key === '0') {
            e.preventDefault();
            pdfViewer.currentScaleValue = 'page-width';
        } else if (!mod && !e.altKey && !isTyping(e.target) && pdf) {
            if (key === 'r') {
                e.preventDefault();
                pdfViewer.pagesRotation = (pdfViewer.pagesRotation + (e.shiftKey ? 270 : 90)) % 360;
            } else if (document.fullscreenElement === container) {
                if (['arrowright', 'arrowdown', 'pagedown', ' ', 'n', 'j'].includes(key)) {
                    e.preventDefault();
                    pdfViewer.nextPage();
                } else if (['arrowleft', 'arrowup', 'pageup', 'p', 'k'].includes(key)) {
                    e.preventDefault();
                    pdfViewer.previousPage();
                } else if (key === 'home') {
                    e.preventDefault();
                    pdfViewer.currentPageNumber = 1;
                } else if (key === 'end') {
                    e.preventDefault();
                    pdfViewer.currentPageNumber = pdfViewer.pagesCount;
                }
            }
        }
    });
    container.addEventListener('click', () => {
        if (document.fullscreenElement === container) {
            pdfViewer.nextPage();
        }
    });
    matchMedia('(max-width: 720px)').addEventListener('change', () => setPanel(false));

    setPanel(readPanelPreference() && !panel.isOverlay());

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
    fingerprint = pdf.fingerprints?.[0] ?? '';
    pdfViewer.setDocument(pdf);
    linkService.setDocument(pdf, null);

    thumbnails = buildThumbnails(pdf, goToPage);
    outline = await buildOutline(pdf, async (page, dest) => {
        // Jump to the heading but keep the reader's zoom, which the PDF's own link may change.
        const explicit = typeof dest === 'string' ? await pdf.getDestination(dest).catch(() => null) : dest;
        if (Array.isArray(explicit) && explicit[1]?.name === 'XYZ') {
            pdfViewer.scrollPageIntoView({pageNumber: page, destArray: [explicit[0], explicit[1], explicit[2], explicit[3], null]});
        } else {
            pdfViewer.currentPageNumber = page;
        }
        if (panel.isOverlay()) {
            setPanel(false);
        }
    });
    panel.fill(thumbnails.element, outline.element);
    thumbnails.setCurrent(pdfViewer.currentPageNumber || 1);
    outline.setCurrent(pdfViewer.currentPageNumber || 1);

    const meta = await pdf.getMetadata().catch(() => null);
    const title = meta?.info?.Title;
    if (typeof title === 'string' && title.trim() && !/^untitled$/i.test(title.trim())) {
        document.title = title.trim();
        toolbar.setTitle(title.trim());
    }
}

start();
