import {pdfViewerStrings as s} from '../strings';

import {icon} from './icons';
import type {IconName} from './icons';

export interface ToolbarHandlers {
    page: (pageNumber: number) => void;
    zoom: (value: string) => void;
    zoomStep: (direction: 1 | -1) => void;
    find: (query: string, findPrevious: boolean, again: boolean) => void;
    findClosed: () => void;
    print: () => void;
    togglePanel: () => void;
    rotate: () => void;
    twoPage: (on: boolean) => void;
    present: () => void;
    download: () => void;
    originalColours: (on: boolean) => void;
    properties: () => void;
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
    setPanelOpen: (open: boolean) => void;
    setTwoPage: (on: boolean) => void;
    setOriginalColours: (on: boolean) => void;
    setReady: (ready: boolean) => void;
    openFind: () => void;
    closeFind: () => void;
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

function iconButton(label: string, name: IconName, tooltip = label): HTMLButtonElement {
    const button = el('button', {type: 'button', class: 'v-icon-button', title: tooltip});
    button.setAttribute('aria-label', label);
    button.append(icon(name));
    return button;
}

interface MenuItem {
    element: HTMLElement;
    setChecked?: (on: boolean) => void;
}

function menuItem(label: string, name: IconName, shortcut: string, action: () => void, checkable = false): MenuItem {
    const item = el('button', {type: 'button', class: 'v-menu__item'});
    item.setAttribute('role', checkable ? 'menuitemcheckbox' : 'menuitem');
    item.tabIndex = -1;
    item.append(icon(name), el('span', {class: 'v-menu__label'}, [label]));
    if (shortcut) {
        item.append(el('kbd', {class: 'v-menu__key'}, [shortcut]));
        item.setAttribute('aria-keyshortcuts', shortcut.replace('Ctrl', 'Control'));
    }
    if (checkable) {
        item.setAttribute('aria-checked', 'false');
    }
    item.addEventListener('click', action);
    return {
        element: item,
        setChecked: checkable ? (on) => item.setAttribute('aria-checked', String(on)) : undefined,
    };
}

export function buildToolbar(title: string, getOriginalURL: () => string): Toolbar {
    let handlers: ToolbarHandlers | null = null;
    const call = <K extends keyof ToolbarHandlers>(key: K, ...args: Parameters<ToolbarHandlers[K]>) => {
        (handlers?.[key] as ((...a: Parameters<ToolbarHandlers[K]>) => void) | undefined)?.(...args);
    };

    const panelButton = iconButton(s.showPanel, 'panel');
    panelButton.setAttribute('aria-controls', 'v-panel');
    panelButton.setAttribute('aria-expanded', 'false');
    panelButton.addEventListener('click', () => call('togglePanel'));

    const heading = el('h1', {class: 'v-title', title}, [title]);

    const pageInput = el('input', {type: 'text', value: '1', class: 'n-field__input v-page-input', id: 'page-number'});
    pageInput.inputMode = 'numeric';
    pageInput.autocomplete = 'off';
    const pageCount = el('span', {class: 'v-muted', id: 'page-count'});
    pageInput.setAttribute('aria-describedby', 'page-count');
    const pageGroup = el('div', {class: 'v-group v-page'}, [
        el('label', {htmlFor: 'page-number', class: 'v-visually-hidden'}, [s.page]),
        pageInput,
        pageCount,
    ]);
    const commitPage = () => call('page', parseInt(pageInput.value, 10) || 1);
    pageInput.addEventListener('change', commitPage);
    pageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            commitPage();
            pageInput.select();
        }
    });
    pageInput.addEventListener('focus', () => pageInput.select());

    const zoomOut = iconButton(s.zoomOut, 'minus', `${s.zoomOut} (Ctrl+−)`);
    const zoomIn = iconButton(s.zoomIn, 'plus', `${s.zoomIn} (Ctrl++)`);
    const zoomSelect = el('select', {class: 'n-field__input v-zoom', id: 'zoom'});
    zoomSelect.setAttribute('aria-label', s.zoom);
    const customZoom = el('option', {value: '', hidden: true});
    zoomSelect.append(customZoom, ...ZOOM_OPTIONS.map(([value, label]) => el('option', {value}, [label])));
    zoomSelect.value = 'page-width';
    const zoomGroup = el('div', {class: 'v-group v-zoom-group'}, [zoomOut, zoomSelect, zoomIn]);
    zoomOut.addEventListener('click', () => call('zoomStep', -1));
    zoomIn.addEventListener('click', () => call('zoomStep', 1));
    zoomSelect.addEventListener('change', () => zoomSelect.value && call('zoom', zoomSelect.value));

    // Find opens as a box under the bar, like the browser's own find.
    const findButton = iconButton(s.find, 'search', `${s.find} (Ctrl+F)`);
    findButton.setAttribute('aria-controls', 'v-find');
    findButton.setAttribute('aria-expanded', 'false');
    const findInput = el('input', {type: 'text', class: 'v-find__input', id: 'find-input'});
    findInput.autocomplete = 'off';
    findInput.setAttribute('enterkeyhint', 'search');
    const matches = el('span', {class: 'v-muted v-find__matches', id: 'find-matches'});
    matches.setAttribute('aria-live', 'polite');
    findInput.setAttribute('aria-describedby', 'find-matches');
    const findPrev = iconButton(s.previousMatch, 'up', `${s.previousMatch} (Shift+Enter)`);
    const findNext = iconButton(s.nextMatch, 'down', `${s.nextMatch} (Enter)`);
    const findClose = iconButton(s.closeFind, 'close', `${s.closeFind} (Esc)`);
    const findBox = el('form', {class: 'v-find', id: 'v-find', role: 'search', hidden: true}, [
        el('label', {htmlFor: 'find-input', class: 'v-find__label'}, [icon('search'), el('span', {class: 'v-visually-hidden'}, [s.find])]),
        findInput,
        matches,
        findPrev,
        findNext,
        findClose,
    ]);
    let lastQuery = '';
    const runFind = (previous: boolean) => {
        const query = findInput.value;
        call('find', query, previous, query === lastQuery);
        lastQuery = query;
    };
    findBox.addEventListener('submit', (e) => {
        e.preventDefault();
        runFind(false);
    });
    findInput.addEventListener('input', () => {
        call('find', findInput.value, false, false);
        lastQuery = findInput.value;
    });
    findInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            runFind(true);
        }
    });
    findBox.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            closeFind();
            findButton.focus();
        }
    });
    findPrev.addEventListener('click', () => runFind(true));
    findNext.addEventListener('click', () => runFind(false));
    const openFind = () => {
        closeMenu(false);
        findBox.hidden = false;
        findButton.setAttribute('aria-expanded', 'true');
        findInput.focus();
        findInput.select();
    };
    const closeFind = () => {
        if (findBox.hidden) {
            return;
        }
        findBox.hidden = true;
        findButton.setAttribute('aria-expanded', 'false');
        call('findClosed');
    };
    findClose.addEventListener('click', () => {
        closeFind();
        findButton.focus();
    });
    findButton.addEventListener('click', () => (findBox.hidden ? openFind() : closeFind()));

    const printButton = iconButton(s.print, 'print', `${s.print} (Ctrl+P)`);
    printButton.classList.add('v-print-button');
    printButton.addEventListener('click', () => call('print'));

    // The More menu holds the actions used now and then.
    const moreButton = iconButton(s.more, 'more');
    moreButton.setAttribute('aria-haspopup', 'menu');
    moreButton.setAttribute('aria-expanded', 'false');
    moreButton.setAttribute('aria-controls', 'v-menu');
    const menu = el('div', {class: 'v-menu', id: 'v-menu', hidden: true});
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', s.more);
    const twoPage = menuItem(s.twoPage, 'twoPage', '', () => call('twoPage', twoPage.element.getAttribute('aria-checked') !== 'true'), true);
    const colours = menuItem(s.originalColours, 'colours', '', () => call('originalColours', colours.element.getAttribute('aria-checked') !== 'true'), true);
    const original = el('a', {class: 'v-menu__item', href: getOriginalURL()}, [icon('open'), el('span', {class: 'v-menu__label'}, [s.openOriginal])]);
    original.setAttribute('role', 'menuitem');
    original.tabIndex = -1;
    const items: HTMLElement[] = [
        menuItem(s.rotate, 'rotate', 'R', () => call('rotate')).element,
        twoPage.element,
        menuItem(s.present, 'present', '', () => call('present')).element,
        el('div', {class: 'v-menu__separator', role: 'separator'}),
        menuItem(s.download, 'download', 'Ctrl+S', () => call('download')).element,
        colours.element,
        menuItem(s.properties, 'info', '', () => call('properties')).element,
        el('div', {class: 'v-menu__separator', role: 'separator'}),
        original,
    ];
    menu.append(...items);
    const focusable = items.filter((i) => i.getAttribute('role') !== 'separator');
    const openMenu = () => {
        menu.hidden = false;
        moreButton.setAttribute('aria-expanded', 'true');
        focusable[0].focus();
    };
    function closeMenu(returnFocus: boolean) {
        if (menu.hidden) {
            return;
        }
        menu.hidden = true;
        moreButton.setAttribute('aria-expanded', 'false');
        if (returnFocus) {
            moreButton.focus();
        }
    }
    moreButton.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu(false)));
    moreButton.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            openMenu();
            if (e.key === 'ArrowUp') {
                focusable[focusable.length - 1].focus();
            }
        }
    });
    menu.addEventListener('keydown', (e) => {
        const i = focusable.indexOf(document.activeElement as HTMLElement);
        const move = (to: number) => {
            e.preventDefault();
            focusable[(to + focusable.length) % focusable.length].focus();
        };
        if (e.key === 'ArrowDown') {
            move(i + 1);
        } else if (e.key === 'ArrowUp') {
            move(i - 1);
        } else if (e.key === 'Home') {
            move(0);
        } else if (e.key === 'End') {
            move(focusable.length - 1);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeMenu(true);
        } else if (e.key === 'Tab') {
            closeMenu(false);
        }
    });
    menu.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.v-menu__item')) {
            closeMenu(false);
        }
    });
    document.addEventListener('pointerdown', (e) => {
        if (!menu.hidden && !menu.contains(e.target as Node) && !moreButton.contains(e.target as Node)) {
            closeMenu(false);
        }
    });

    const status = el('p', {class: 'n-status v-status', role: 'status'});
    const docControls = [pageGroup, zoomGroup, findButton, printButton, moreButton];

    const element = el('header', {class: 'v-bar'}, [
        el('div', {class: 'v-bar__row', role: 'toolbar', ariaLabel: s.tools}, [
            panelButton,
            heading,
            pageGroup,
            zoomGroup,
            el('span', {class: 'v-bar__spacer'}),
            findButton,
            printButton,
            el('div', {class: 'v-menu-anchor'}, [moreButton, menu]),
        ]),
        findBox,
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
            if (document.activeElement !== pageInput) {
                pageInput.value = String(n);
            }
        },
        setPageCount: (count) => {
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
        setPanelOpen: (open) => {
            panelButton.setAttribute('aria-expanded', String(open));
            panelButton.setAttribute('aria-label', open ? s.hidePanel : s.showPanel);
            panelButton.title = open ? s.hidePanel : s.showPanel;
        },
        setTwoPage: (on) => twoPage.setChecked!(on),
        setOriginalColours: (on) => colours.setChecked!(on),
        setReady: (ready) => {
            [panelButton, ...docControls].forEach((c) => c.toggleAttribute('inert', !ready));
            element.classList.toggle('v-bar--waiting', !ready);
        },
        openFind,
        closeFind,
    };
}
