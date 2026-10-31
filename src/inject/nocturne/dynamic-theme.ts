// Wraps the dynamic theme's entry points so the fixes start and stop with it. Filter and
// static modes recolour the whole page themselves, so the fixes stay off there.

import type {DynamicThemeFix, Theme} from '../../definitions';
import {
    createOrUpdateDynamicTheme as createOrUpdateEngineTheme,
    removeDynamicTheme as removeEngineTheme,
    cleanDynamicThemeCache,
} from '../dynamic-theme';

import {startCanvasDarkening, stopCanvasDarkening} from './canvas';
import {setClosedShadowRootsEnabled} from './closed-shadow-roots';

export {cleanDynamicThemeCache};

const DARK_MODE = 1;

export function createOrUpdateDynamicTheme(theme: Theme, fixes: DynamicThemeFix[] | null, isIFrame: boolean): void {
    setClosedShadowRootsEnabled(theme.styleClosedShadowRoots !== false);
    createOrUpdateEngineTheme(theme, fixes, isIFrame);
    if (theme.mode === DARK_MODE && theme.darkenCanvas !== false) {
        startCanvasDarkening();
    } else {
        stopCanvasDarkening();
    }
}

export function removeDynamicTheme(): void {
    stopCanvasDarkening();
    removeEngineTheme();
}
