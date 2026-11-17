// The side panel: page thumbnails and the document's contents, one tab each.
// On narrow windows it opens as a sheet over the pages instead.

import {pdfViewerStrings as s} from '../strings';

const TAB_KEY = 'nocturne-pdf-panel-tab';
const NARROW = '(max-width: 720px)';

type TabName = 'pages' | 'contents';

export interface Panel {
    element: HTMLElement;
    scrim: HTMLElement;
    isOpen: () => boolean;
    isOverlay: () => boolean;
    setOpen: (open: boolean) => void;
    fill: (pages: HTMLElement, contents: HTMLElement) => void;
}

export function buildPanel(onClose: () => void): Panel {
    const element = document.createElement('nav');
    element.id = 'v-panel';
    element.className = 'v-panel';
    element.setAttribute('aria-label', `${s.pages}, ${s.contents}`);
    element.hidden = true;

    const tablist = document.createElement('div');
    tablist.className = 'v-tabs';
    tablist.setAttribute('role', 'tablist');
    const panes = new Map<TabName, HTMLElement>();
    const tabs = new Map<TabName, HTMLButtonElement>();
    for (const [name, label] of [['pages', s.pages], ['contents', s.contents]] as Array<[TabName, string]>) {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'v-tab';
        tab.id = `v-tab-${name}`;
        tab.textContent = label;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-controls', `v-pane-${name}`);
        tab.addEventListener('click', () => select(name));
        tabs.set(name, tab);
        tablist.append(tab);
        const pane = document.createElement('div');
        pane.className = 'v-pane';
        pane.id = `v-pane-${name}`;
        pane.setAttribute('role', 'tabpanel');
        pane.setAttribute('aria-labelledby', tab.id);
        panes.set(name, pane);
    }
    tablist.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            const next: TabName = tabs.get('pages') === document.activeElement ? 'contents' : 'pages';
            select(next);
            tabs.get(next)!.focus();
        }
    });
    element.append(tablist, ...panes.values());

    function select(name: TabName) {
        for (const [key, tab] of tabs) {
            const on = key === name;
            tab.setAttribute('aria-selected', String(on));
            tab.tabIndex = on ? 0 : -1;
            panes.get(key)!.hidden = !on;
        }
        try {
            localStorage.setItem(TAB_KEY, name);
        } catch {
            // Remembering the tab is a convenience only.
        }
    }
    let saved: string | null = null;
    try {
        saved = localStorage.getItem(TAB_KEY);
    } catch {
        saved = null;
    }
    select(saved === 'contents' ? 'contents' : 'pages');

    const scrim = document.createElement('div');
    scrim.className = 'v-scrim';
    scrim.hidden = true;
    scrim.addEventListener('click', onClose);
    element.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && matchMedia(NARROW).matches) {
            e.preventDefault();
            onClose();
        }
    });

    return {
        element,
        scrim,
        isOpen: () => !element.hidden,
        isOverlay: () => matchMedia(NARROW).matches,
        setOpen: (open) => {
            element.hidden = !open;
            scrim.hidden = !open || !matchMedia(NARROW).matches;
        },
        fill: (pages, contents) => {
            panes.get('pages')!.replaceChildren(pages);
            panes.get('contents')!.replaceChildren(contents);
        },
    };
}
