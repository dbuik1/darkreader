import {exposeClosedShadowRoots} from './closed-shadow-roots';

// Runs before the theme engine starts, so the engine's first scan already sees the fixes.
export function installNocturneFixes(): void {
    exposeClosedShadowRoots();
}
