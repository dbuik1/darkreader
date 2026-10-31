import {exposeClosedShadowRoots} from './closed-shadow-roots';
import {watchForPDFViewerRedirect} from './pdf-redirect';

declare const __CHROMIUM_MV3__: boolean;

// Runs before the theme engine starts, so the engine's first scan already sees the fixes.
export function installNocturneFixes(): void {
    exposeClosedShadowRoots();
    if (__CHROMIUM_MV3__) {
        watchForPDFViewerRedirect();
    }
}
