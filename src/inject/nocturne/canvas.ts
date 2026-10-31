// Darkens light <canvas> elements, which the dynamic theme can't restyle because their
// content is pixels rather than CSS.
//
// Each canvas is copied into a small scratch canvas and its pixels are measured. One that is
// mostly near-white (charts, whiteboards, canvas-drawn documents) gets a CSS filter that
// inverts lightness and rotates hue back, so series colours stay distinguishable. Copying
// with drawImage never calls getContext on the page's canvas, so it can't claim a context
// type the page has yet to create.
//
// WebGL canvases read back as fully transparent once a frame has been shown, and canvases
// with cross-origin content can't be read at all. Those fall back to a size rule: content
// sized canvases are darkened, and canvases covering most of the viewport (games, maps,
// design tools with their own theme) are left alone.

import {iterateShadowHosts} from '../utils/dom';

const FILTER = 'invert(0.9) hue-rotate(180deg)';
const SAMPLE_SIZE = 48;
const MIN_SIDE = 32;
// Hysteresis keeps a canvas that hovers near the threshold from flickering between states.
const DARKEN_ABOVE = 0.5;
const RESTORE_BELOW = 0.3;
const NEAR_WHITE = 0.85;
const FULL_VIEWPORT_SHARE = 0.85;
const RECHECK_INTERVAL = 1500;
const SHADOW_RESCAN_INTERVAL = 5000;
const MAX_SAMPLES_PER_TICK = 24;

interface CanvasState {
    darkened: boolean;
    previousFilter: string;
    previousPriority: string;
}

const states = new Map<HTMLCanvasElement, CanvasState>();
const shadowCanvases = new Set<HTMLCanvasElement>();
let running = false;
let intervalId = 0;
let lastShadowScan = 0;
let scratch: CanvasRenderingContext2D | null = null;
let mutationObserver: MutationObserver | null = null;
let resizeObserver: ResizeObserver | null = null;

type Verdict = 'light' | 'dark' | 'unreadable';

function getScratch(): CanvasRenderingContext2D | null {
    if (!scratch) {
        const canvas = document.createElement('canvas');
        canvas.width = SAMPLE_SIZE;
        canvas.height = SAMPLE_SIZE;
        scratch = canvas.getContext('2d', {willReadFrequently: true});
    }
    return scratch;
}

// Returns the share of near-white pixels, with transparent pixels composited over white:
// a transparent canvas drawn for a light page shows the page through it.
function measureWhiteShare(canvas: HTMLCanvasElement): number | null {
    const ctx = getScratch();
    if (!ctx) {
        return null;
    }
    let data: Uint8ClampedArray;
    try {
        ctx.clearRect(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        ctx.drawImage(canvas, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        data = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
    } catch {
        return null;
    }
    let white = 0;
    let anyPainted = false;
    const count = SAMPLE_SIZE * SAMPLE_SIZE;
    for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3] / 255;
        if (a > 0) {
            anyPainted = true;
        }
        const lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
        if (a * lum + (1 - a) >= NEAR_WHITE) {
            white++;
        }
    }
    if (!anyPainted) {
        return null;
    }
    return white / count;
}

function isContentSized(canvas: HTMLCanvasElement): boolean {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < MIN_SIDE || rect.height < MIN_SIDE) {
        return false;
    }
    const viewport = innerWidth * innerHeight;
    return viewport === 0 || (rect.width * rect.height) / viewport < FULL_VIEWPORT_SHARE;
}

function classify(canvas: HTMLCanvasElement, current: boolean): Verdict {
    const share = measureWhiteShare(canvas);
    if (share == null) {
        return 'unreadable';
    }
    if (share >= DARKEN_ABOVE) {
        return 'light';
    }
    if (share < RESTORE_BELOW) {
        return 'dark';
    }
    return current ? 'light' : 'dark';
}

function setDarkened(canvas: HTMLCanvasElement, state: CanvasState, darken: boolean) {
    const style = canvas.style;
    if (darken) {
        if (!state.darkened) {
            state.previousFilter = style.getPropertyValue('filter');
            state.previousPriority = style.getPropertyPriority('filter');
        }
        if (style.getPropertyValue('filter') !== FILTER) {
            style.setProperty('filter', FILTER, 'important');
        }
    } else if (state.darkened) {
        if (state.previousFilter) {
            style.setProperty('filter', state.previousFilter, state.previousPriority);
        } else {
            style.removeProperty('filter');
        }
    }
    state.darkened = darken;
}

function check(canvas: HTMLCanvasElement) {
    if (!canvas.isConnected || canvas.width < MIN_SIDE || canvas.height < MIN_SIDE) {
        return;
    }
    let state = states.get(canvas);
    if (!state) {
        state = {darkened: false, previousFilter: '', previousPriority: ''};
        states.set(canvas, state);
        resizeObserver?.observe(canvas);
    }
    const verdict = classify(canvas, state.darkened);
    const darken = verdict === 'unreadable' ? isContentSized(canvas) : verdict === 'light';
    setDarkened(canvas, state, darken);
}

function isVisible(canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    return rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth && rect.width > 0;
}

function collectShadowCanvases() {
    shadowCanvases.clear();
    iterateShadowHosts(document.documentElement, (host) => {
        host.shadowRoot?.querySelectorAll('canvas').forEach((c) => shadowCanvases.add(c));
    });
}

function tick() {
    if (Date.now() - lastShadowScan > SHADOW_RESCAN_INTERVAL) {
        lastShadowScan = Date.now();
        collectShadowCanvases();
    }
    let sampled = 0;
    const visit = (canvas: HTMLCanvasElement) => {
        if (sampled >= MAX_SAMPLES_PER_TICK) {
            return;
        }
        if (states.has(canvas) && !isVisible(canvas)) {
            return;
        }
        sampled++;
        check(canvas);
    };
    Array.from(document.getElementsByTagName('canvas')).forEach(visit);
    shadowCanvases.forEach(visit);
    states.forEach((state, canvas) => {
        if (!canvas.isConnected) {
            states.delete(canvas);
            resizeObserver?.unobserve(canvas);
        }
    });
}

export function startCanvasDarkening(): void {
    if (running) {
        return;
    }
    running = true;
    resizeObserver = new ResizeObserver((entries) => entries.forEach((e) => check(e.target as HTMLCanvasElement)));
    mutationObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
            m.addedNodes.forEach((node) => {
                if (node instanceof HTMLCanvasElement) {
                    check(node);
                } else if (node instanceof Element) {
                    node.querySelectorAll('canvas').forEach(check);
                }
            });
        }
    });
    mutationObserver.observe(document, {childList: true, subtree: true});
    lastShadowScan = 0;
    tick();
    intervalId = setInterval(tick, RECHECK_INTERVAL) as unknown as number;
}

export function stopCanvasDarkening(): void {
    if (!running) {
        return;
    }
    running = false;
    clearInterval(intervalId);
    mutationObserver?.disconnect();
    resizeObserver?.disconnect();
    mutationObserver = null;
    resizeObserver = null;
    states.forEach((state, canvas) => setDarkened(canvas, state, false));
    states.clear();
    shadowCanvases.clear();
}
