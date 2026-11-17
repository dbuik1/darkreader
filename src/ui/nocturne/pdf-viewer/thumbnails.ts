// Page thumbnails, drawn only when scrolled into view. Each is inverted like the full page,
// with photos restored, so the strip matches what the reader sees.

import {pdfViewerStrings as s} from '../strings';

import {restorePageImages} from './page-images';

const THUMB_WIDTH = 96;

export interface Thumbnails {
    element: HTMLElement;
    setCurrent: (pageNumber: number) => void;
    setRotation: (rotation: number) => void;
}

export function buildThumbnails(pdf: any, onPick: (pageNumber: number) => void): Thumbnails {
    const list = document.createElement('ol');
    list.className = 'v-thumbs';
    let rotation = 0;
    let current = 1;
    const items: HTMLLIElement[] = [];
    const drawn = new Set<number>();

    const draw = async (n: number) => {
        drawn.add(n);
        const page = await pdf.getPage(n);
        const base = page.getViewport({scale: 1, rotation});
        const scale = (THUMB_WIDTH / base.width) * devicePixelRatio;
        const viewport = page.getViewport({scale, rotation});
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const task = page.render({canvas, viewport, recordImages: true});
        await task.promise;
        const frame = items[n - 1].querySelector('.v-thumb__page')!;
        frame.replaceChildren(canvas);
        // pdf.js records image positions once per page, so a page the reader has already seen
        // keeps them on the page rather than on this render.
        restorePageImages({div: frame as HTMLElement, canvas, imageCoordinates: task.imageCoordinates ?? page.imageCoordinates});
    };

    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            const n = Number((entry.target as HTMLElement).dataset.page);
            if (entry.isIntersecting && !drawn.has(n)) {
                draw(n).catch(() => drawn.delete(n));
            }
        }
    }, {root: null, rootMargin: '400px 0px'});

    for (let n = 1; n <= pdf.numPages; n++) {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'v-thumb';
        button.dataset.page = String(n);
        button.setAttribute('aria-label', s.pageNumber(n));
        const frame = document.createElement('span');
        frame.className = 'v-thumb__page';
        frame.setAttribute('aria-hidden', 'true');
        const label = document.createElement('span');
        label.className = 'v-thumb__number';
        label.setAttribute('aria-hidden', 'true');
        label.textContent = String(n);
        button.append(frame, label);
        button.addEventListener('click', () => onPick(n));
        item.append(button);
        list.append(item);
        items.push(item);
        observer.observe(button);
    }

    const setCurrent = (n: number) => {
        const old = items[current - 1]?.querySelector('button');
        old?.removeAttribute('aria-current');
        current = n;
        const button = items[n - 1]?.querySelector('button');
        if (button) {
            button.setAttribute('aria-current', 'page');
            if (list.offsetParent) {
                button.scrollIntoView({block: 'nearest'});
            }
        }
    };
    setCurrent(1);

    return {
        element: list,
        setCurrent,
        setRotation: (r) => {
            if (r === rotation) {
                return;
            }
            rotation = r;
            drawn.clear();
            items.forEach((item) => {
                item.querySelector('.v-thumb__page')!.replaceChildren();
                const button = item.querySelector('button')!;
                observer.unobserve(button);
                observer.observe(button);
            });
        },
    };
}
