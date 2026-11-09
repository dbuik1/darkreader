export type Appearance = 'system' | 'dark' | 'light';

// Stored per browser profile in extension localStorage, shared by the popup and settings pages.
const KEY = 'nocturne-appearance';

// The interface is dark until the person picks another appearance.
const DEFAULT_APPEARANCE: Appearance = 'dark';

export function getAppearance(): Appearance {
    try {
        const value = localStorage.getItem(KEY);
        return value === 'dark' || value === 'light' || value === 'system' ? value : DEFAULT_APPEARANCE;
    } catch {
        return DEFAULT_APPEARANCE;
    }
}

export function applyAppearance(appearance: Appearance = getAppearance()): void {
    document.documentElement.dataset.theme = appearance;
}

export function setAppearance(appearance: Appearance): void {
    try {
        localStorage.setItem(KEY, appearance);
    } catch {
        // Without storage the choice still applies until the page closes.
    }
    applyAppearance(appearance);
}
