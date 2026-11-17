// The document's own table of contents, as a nested list of links to pages.

import {pdfViewerStrings as s} from '../strings';

interface OutlineItem {
    title: string;
    dest: string | any[] | null;
    url: string | null;
    items: OutlineItem[];
}

export interface Outline {
    element: HTMLElement;
    isEmpty: boolean;
    setCurrent: (pageNumber: number) => void;
}

async function pageOf(pdf: any, dest: OutlineItem['dest']): Promise<number | null> {
    try {
        const explicit = typeof dest === 'string' ? await pdf.getDestination(dest) : dest;
        if (!Array.isArray(explicit)) {
            return null;
        }
        const ref = explicit[0];
        const index = typeof ref === 'object' && ref !== null ? await pdf.getPageIndex(ref) : Number(ref);
        return Number.isInteger(index) ? index + 1 : null;
    } catch {
        return null;
    }
}

export async function buildOutline(pdf: any, onPick: (pageNumber: number, dest: OutlineItem['dest']) => void): Promise<Outline> {
    const root = document.createElement('div');
    root.className = 'v-outline';
    const outline: OutlineItem[] | null = await pdf.getOutline().catch(() => null);
    const entries: Array<{link: HTMLElement; page: number}> = [];

    const buildList = async (items: OutlineItem[]): Promise<HTMLOListElement> => {
        const list = document.createElement('ol');
        for (const item of items) {
            const li = document.createElement('li');
            const page = item.dest ? await pageOf(pdf, item.dest) : null;
            let link: HTMLElement;
            if (page) {
                const button = document.createElement('button');
                button.type = 'button';
                button.addEventListener('click', () => onPick(page, item.dest));
                link = button;
                entries.push({link, page});
            } else if (item.url) {
                const a = document.createElement('a');
                a.href = item.url;
                a.target = '_blank';
                a.rel = 'noopener';
                link = a;
            } else {
                link = document.createElement('span');
            }
            link.className = 'v-outline__link';
            const title = document.createElement('span');
            title.className = 'v-outline__title';
            title.textContent = item.title;
            link.append(title);
            if (page) {
                const number = document.createElement('span');
                number.className = 'v-outline__page';
                number.textContent = String(page);
                number.setAttribute('aria-hidden', 'true');
                link.append(number);
                link.setAttribute('aria-label', `${item.title}, ${s.pageNumber(page)}`);
            }
            li.append(link);
            if (item.items?.length) {
                li.append(await buildList(item.items));
            }
            list.append(li);
        }
        return list;
    };

    if (outline?.length) {
        root.append(await buildList(outline));
    } else {
        const empty = document.createElement('p');
        empty.className = 'v-empty';
        empty.textContent = s.noOutline;
        root.append(empty);
    }

    let marked: HTMLElement | null = null;
    return {
        element: root,
        isEmpty: !outline?.length,
        setCurrent: (pageNumber) => {
            // The current section is the last heading that starts on or before this page.
            let best: HTMLElement | null = null;
            let bestPage = 0;
            for (const {link, page} of entries) {
                if (page <= pageNumber && page >= bestPage) {
                    best = link;
                    bestPage = page;
                }
            }
            if (best === marked) {
                return;
            }
            marked?.removeAttribute('aria-current');
            best?.setAttribute('aria-current', 'location');
            marked = best;
        },
    };
}
