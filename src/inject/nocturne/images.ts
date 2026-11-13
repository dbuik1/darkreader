// Sorts <img> elements by their pixels and filters each kind differently, since the dynamic
// theme only recolours CSS background images:
// - light graphics (screenshots, diagrams, charts on white) are inverted with hue kept,
// - dark icons on a transparent background are inverted so they stay visible,
// - everything else is treated as a photo and dimmed slightly, never inverted.
//
// Same-origin and CORS-enabled images are read straight from the decoded <img>. Cross-origin
// images taint the scratch canvas, so their bytes are fetched again through the background
// page, which has host permissions. Results are cached by URL, and only images near the
// viewport are analysed, so long pages stay smooth to scroll.

import {bgFetch} from '../dynamic-theme/network';

import {classifyPixels} from '../../utils/nocturne/image-kind';
import type {Kind} from '../../utils/nocturne/image-kind';
import {applyFilter, clearFilter, hasForeignFilter, isFiltered} from './element-filter';

const FILTERS: Record<Exclude<Kind, 'skip'>, string> = {
    'light-graphic': 'invert(0.9) hue-rotate(180deg)',
    'dark-icon': 'invert(0.9) hue-rotate(180deg)',
    'photo': 'brightness(0.85)',
};

const SAMPLE_SIDE = 40;
const MAX_PARALLEL_FETCHES = 4;
const VIEWPORT_MARGIN = '600px';
const PRUNE_INTERVAL = 5000;

const cache = new Map<string, Promise<Kind>>();
const watched = new Set<HTMLImageElement>();
let scratch: CanvasRenderingContext2D | null = null;
let intersectionObserver: IntersectionObserver | null = null;
let mutationObserver: MutationObserver | null = null;
let running = false;
let activeFetches = 0;
let lastPrune = 0;
const fetchQueue: Array<() => void> = [];

function getScratch(): CanvasRenderingContext2D | null {
    if (!scratch) {
        const canvas = document.createElement('canvas');
        canvas.width = SAMPLE_SIDE;
        canvas.height = SAMPLE_SIDE;
        scratch = canvas.getContext('2d', {willReadFrequently: true});
    }
    return scratch;
}

function readPixels(source: CanvasImageSource, width: number, height: number): Uint8ClampedArray | null {
    const ctx = getScratch();
    if (!ctx || width === 0 || height === 0) {
        return null;
    }
    const k = Math.min(1, SAMPLE_SIDE / Math.max(width, height));
    const w = Math.max(1, Math.round(width * k));
    const h = Math.max(1, Math.round(height * k));
    try {
        ctx.clearRect(0, 0, SAMPLE_SIDE, SAMPLE_SIDE);
        ctx.drawImage(source, 0, 0, w, h);
        return ctx.getImageData(0, 0, w, h).data;
    } catch {
        // Drawing cross-origin pixels taints the scratch canvas for good, so start a new one.
        scratch = null;
        return null;
    }
}

function runFetch<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const start = () => {
            activeFetches++;
            task().then(resolve, reject).finally(() => {
                activeFetches--;
                fetchQueue.shift()?.();
            });
        };
        if (activeFetches < MAX_PARALLEL_FETCHES) {
            start();
        } else {
            fetchQueue.push(start);
        }
    });
}

async function classifyRemote(url: string): Promise<Kind> {
    const dataURL = await runFetch(() => bgFetch({url, responseType: 'data-url', origin: location.origin}));
    const image = new Image();
    image.src = dataURL;
    await image.decode();
    const data = readPixels(image, image.naturalWidth, image.naturalHeight);
    return data ? classifyPixels(data) : 'skip';
}

function classifyImage(img: HTMLImageElement): Promise<Kind> {
    const url = img.currentSrc || img.src;
    const cached = cache.get(url);
    if (cached) {
        return cached;
    }
    const local = readPixels(img, img.naturalWidth, img.naturalHeight);
    let result: Promise<Kind>;
    if (local) {
        result = Promise.resolve(classifyPixels(local));
    } else if (url.startsWith('http')) {
        result = classifyRemote(url).catch(() => 'skip' as Kind);
    } else {
        result = Promise.resolve('skip' as Kind);
    }
    cache.set(url, result);
    return result;
}

async function handle(img: HTMLImageElement) {
    if (!running || !img.isConnected) {
        return;
    }
    if (!img.complete || img.naturalWidth === 0) {
        img.addEventListener('load', () => handle(img), {once: true});
        return;
    }
    if (hasForeignFilter(img)) {
        return;
    }
    const kind = await classifyImage(img);
    if (!running || !img.isConnected) {
        return;
    }
    if (kind === 'skip') {
        clearFilter(img);
    } else {
        applyFilter(img, FILTERS[kind]);
    }
}

function watch(img: HTMLImageElement) {
    if (watched.has(img)) {
        return;
    }
    watched.add(img);
    intersectionObserver?.observe(img);
}

function onMutations(mutations: MutationRecord[]) {
    for (const m of mutations) {
        if (m.type === 'attributes') {
            const img = m.target as HTMLImageElement;
            if (watched.has(img) && isFiltered(img)) {
                clearFilter(img);
            }
            intersectionObserver?.unobserve(img);
            watched.delete(img);
            watch(img);
            continue;
        }
        m.addedNodes.forEach((node) => {
            if (node instanceof HTMLImageElement) {
                watch(node);
            } else if (node instanceof Element) {
                node.querySelectorAll('img').forEach(watch);
            }
        });
    }
    if (Date.now() - lastPrune > PRUNE_INTERVAL) {
        lastPrune = Date.now();
        watched.forEach((img) => !img.isConnected && watched.delete(img));
    }
}

export function startImageDarkening(): void {
    if (running) {
        return;
    }
    running = true;
    intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                intersectionObserver?.unobserve(entry.target);
                handle(entry.target as HTMLImageElement);
            }
        });
    }, {rootMargin: VIEWPORT_MARGIN});
    mutationObserver = new MutationObserver(onMutations);
    mutationObserver.observe(document, {childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcset']});
    document.querySelectorAll('img').forEach(watch);
}

export function stopImageDarkening(): void {
    if (!running) {
        return;
    }
    running = false;
    intersectionObserver?.disconnect();
    mutationObserver?.disconnect();
    intersectionObserver = null;
    mutationObserver = null;
    watched.forEach(clearFilter);
    watched.clear();
}
