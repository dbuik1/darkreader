// Each rendered page canvas is inverted with CSS (hue kept), which darkens text, line art
// and white backgrounds. pdf.js records where it drew each image; those regions are sorted
// with the same classifier used for <img> on web pages. Photos are copied back from the
// untouched canvas pixels into an overlay above the inverted canvas, so they show in true
// colour. Light graphics, and whole-page scans of white paper, stay inverted with the page.

import {classifyPixels} from '../../../utils/nocturne/image-kind';

const SAMPLE_SIDE = 40;
const OVERLAY_CLASS = 'v-page-images';

interface PageView {
    div: HTMLElement;
    canvas: HTMLCanvasElement | null;
    imageCoordinates: ArrayLike<number> | null;
}

interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

// Coordinates come as three corners of a parallelogram per image, normalised to the canvas.
function toRects(coords: ArrayLike<number>, width: number, height: number): Rect[] {
    const rects: Rect[] = [];
    for (let i = 0; i + 5 < coords.length; i += 6) {
        const xs = [coords[i], coords[i + 2], coords[i + 4], coords[i + 2] + coords[i + 4] - coords[i]];
        const ys = [coords[i + 1], coords[i + 3], coords[i + 5], coords[i + 3] + coords[i + 5] - coords[i + 1]];
        const x0 = Math.max(0, Math.floor(Math.min(...xs) * width));
        const y0 = Math.max(0, Math.floor(Math.min(...ys) * height));
        const x1 = Math.min(width, Math.ceil(Math.max(...xs) * width));
        const y1 = Math.min(height, Math.ceil(Math.max(...ys) * height));
        if (x1 - x0 >= 2 && y1 - y0 >= 2) {
            rects.push({x: x0, y: y0, w: x1 - x0, h: y1 - y0});
        }
    }
    return rects;
}

function isPhoto(canvas: HTMLCanvasElement, rect: Rect, scratch: CanvasRenderingContext2D): boolean {
    const k = Math.min(1, SAMPLE_SIDE / Math.max(rect.w, rect.h));
    const w = Math.max(1, Math.round(rect.w * k));
    const h = Math.max(1, Math.round(rect.h * k));
    scratch.clearRect(0, 0, SAMPLE_SIDE, SAMPLE_SIDE);
    scratch.drawImage(canvas, rect.x, rect.y, rect.w, rect.h, 0, 0, w, h);
    return classifyPixels(scratch.getImageData(0, 0, w, h).data) === 'photo';
}

let scratch: CanvasRenderingContext2D | null = null;

export function restorePageImages(view: PageView): void {
    const canvas = view.canvas;
    const wrapper = canvas?.parentElement;
    if (!canvas || !wrapper) {
        return;
    }
    wrapper.querySelector(`.${OVERLAY_CLASS}`)?.remove();
    const rects = view.imageCoordinates ? toRects(view.imageCoordinates, canvas.width, canvas.height) : [];
    if (rects.length === 0) {
        return;
    }
    if (!scratch) {
        const c = document.createElement('canvas');
        c.width = SAMPLE_SIDE;
        c.height = SAMPLE_SIDE;
        scratch = c.getContext('2d', {willReadFrequently: true});
    }
    const photos = scratch ? rects.filter((rect) => isPhoto(canvas, rect, scratch!)) : [];
    if (photos.length === 0) {
        return;
    }
    const overlay = document.createElement('canvas');
    overlay.className = OVERLAY_CLASS;
    overlay.width = canvas.width;
    overlay.height = canvas.height;
    overlay.setAttribute('aria-hidden', 'true');
    const ctx = overlay.getContext('2d');
    if (!ctx) {
        return;
    }
    for (const r of photos) {
        ctx.drawImage(canvas, r.x, r.y, r.w, r.h, r.x, r.y, r.w, r.h);
    }
    canvas.after(overlay);
}
