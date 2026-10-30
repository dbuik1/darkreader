export type Appearance = 'system' | 'dark' | 'light';

// Stored per browser profile in extension localStorage, shared by the popup and settings pages.
const KEY = 'nocturne-appearance';

export function getAppearance(): Appearance {
    try {
        const value = localStorage.getItem(KEY);
        return value === 'dark' || value === 'light' ? value : 'system';
    } catch {
        return 'system';
    }
}

export function applyAppearance(appearance: Appearance = getAppearance()): void {
    if (appearance === 'system') {
        delete document.documentElement.dataset.theme;
    } else {
        document.documentElement.dataset.theme = appearance;
    }
}

export function setAppearance(appearance: Appearance): void {
    try {
        if (appearance === 'system') {
            localStorage.removeItem(KEY);
        } else {
            localStorage.setItem(KEY, appearance);
        }
    } catch {
        // Without storage the choice still applies until the page closes.
    }
    applyAppearance(appearance);
}
