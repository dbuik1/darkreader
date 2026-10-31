import {pdfViewerStrings as s} from '../strings';

export interface ToolbarHandlers {
    page: (pageNumber: number) => void;
    zoom: (value: string) => void;
    zoomStep: (direction: 1 | -1) => void;
    find: (query: string, findPrevious: boolean, again: boolean) => void;
    print: () => void;
}

export interface Toolbar {
    element: HTMLElement;
    on: (handlers: ToolbarHandlers) => void;
    setTitle: (title: string) => void;
    setPage: (pageNumber: number) => void;
    setPageCount: (count: number) => void;
    setZoom: (value: string) => void;
    setMatches: (matches: {current: number; total: number} | null) => void;
    setStatus: (text: string) => void;
    focusFind: () => void;
    print: () => void;
}

const ZOOM_OPTIONS: Array<[string, string]> = [
    ['page-width', s.fitWidth],
    ['page-fit', s.fitPage],
    ['0.5', '50%'],
    ['0.75', '75%'],
    ['1', '100%'],
    ['1.25', '125%'],
    ['1.5', '150%'],
    ['2', '200%'],
    ['3', '300%'],
];

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> & {class?: string} = {}, children: Array<Node | string> = []): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    const {class: className, ...rest} = props;
    if (className) {
        element.className = className;
    }
    Object.assign(element, rest);
    element.append(...children);
    return element;
}

function iconButton(label: string, glyph: string): HTMLButtonElement {
    const button = el('button', {type: 'button', class: 'n-button v-icon-button', title: label});
    button.setAttribute('aria-label', label);
    button.append(el('span', {ariaHidden: 'true'}, [glyph]));
    return button;
}

export function buildToolbar(title: string, getOriginalURL: () => string): Toolbar {
    let handlers: ToolbarHandlers | null = null;

    const heading = el('h1', {class: 'v-title', title}, [title]);

    const pageInput = el('input', {type: 'number', min: '1', value: '1', class: 'n-field__input v-page-input', id: 'page-number'});
    pageInput.inputMode = 'numeric';
    const pageCount = el('span', {class: 'v-muted', id: 'page-count'});
    pageInput.setAttribute('aria-describedby', 'page-count');
    const pageGroup = el('div', {class: 'v-group'}, [
        el('label', {htmlFor: 'page-number'}, [s.page]),
        pageInput,
        pageCount,
    ]);
    pageInput.addEventListener('change', () => handlers?.page(parseInt(pageInput.value, 10) || 1));

    const zoomOut = iconButton(s.zoomOut, '−');
    const zoomIn = iconButton(s.zoomIn, '+');
    const zoomSelect = el('select', {class: 'n-field__input v-zoom', id: 'zoom'});
    zoomSelect.setAttribute('aria-label', s.zoom);
    const customZoom = el('option', {value: '', hidden: true});
    zoomSelect.append(customZoom, ...ZOOM_OPTIONS.map(([value, label]) => el('option', {value}, [label])));
    zoomSelect.value = 'page-width';
    const zoomGroup = el('div', {class: 'v-group'}, [zoomOut, zoomSelect, zoomIn]);
    zoomOut.addEventListener('click', () => handlers?.zoomStep(-1));
    zoomIn.addEventListener('click', () => handlers?.zoomStep(1));
    zoomSelect.addEventListener('change', () => zoomSelect.value && handlers?.zoom(zoomSelect.value));

    const findInput = el('input', {type: 'search', class: 'n-field__input v-find', id: 'find'});
    findInput.autocomplete = 'off';
    const findPrev = iconButton(s.previousMatch, '↑');
    const findNext = iconButton(s.nextMatch, '↓');
    const matches = el('span', {class: 'v-muted v-matches', id: 'find-matches'});
    findInput.setAttribute('aria-describedby', 'find-matches');
    const findGroup = el('form', {class: 'v-group', role: 'search'}, [
        el('label', {htmlFor: 'find'}, [s.find]),
        findInput,
        findPrev,
        findNext,
        matches,
    ]);
    let lastQuery = '';
    const runFind = (previous: boolean) => {
        const query = findInput.value;
        handlers?.find(query, previous, query === lastQuery);
        lastQuery = query;
    };
    findGroup.addEventListener('submit', (e) => {
        e.preventDefault();
        runFind(false);
    });
    findInput.addEventListener('input', () => {
        lastQuery = '';
        handlers?.find(findInput.value, false, false);
        lastQuery = findInput.value;
    });
    findInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            runFind(true);
        }
    });
    findPrev.addEventListener('click', () => runFind(true));
    findNext.addEventListener('click', () => runFind(false));

    const printButton = el('button', {type: 'button', class: 'n-button'}, [s.print]);
    printButton.addEventListener('click', () => handlers?.print());
    const original = el('a', {class: 'v-link-button', href: getOriginalURL()}, [s.openOriginal]);

    const status = el('p', {class: 'n-status v-status', role: 'status'});

    const element = el('header', {class: 'v-bar'}, [
        heading,
        el('div', {class: 'v-controls', role: 'toolbar', ariaLabel: s.tools}, [pageGroup, zoomGroup, findGroup, printButton, original]),
        status,
    ]);

    return {
        element,
        on: (h) => {
            handlers = h;
        },
        setTitle: (text) => {
            heading.textContent = text;
            heading.title = text;
        },
        setPage: (n) => {
            pageInput.value = String(n);
        },
        setPageCount: (count) => {
            pageInput.max = String(count);
            pageCount.textContent = s.ofPages(count);
        },
        setZoom: (value) => {
            const known = ZOOM_OPTIONS.some(([v]) => v === value);
            if (!known) {
                const percent = Math.round(parseFloat(value) * 100);
                customZoom.value = value;
                customZoom.textContent = `${percent}%`;
            }
            zoomSelect.value = value;
        },
        setMatches: (m) => {
            if (!m || !findInput.value) {
                matches.textContent = '';
            } else {
                matches.textContent = m.total === 0 ? s.noMatches : s.matchCount(m.current, m.total);
            }
        },
        setStatus: (text) => {
            status.textContent = text;
        },
        focusFind: () => {
            findInput.focus();
            findInput.select();
        },
        print: () => handlers?.print(),
    };
}
