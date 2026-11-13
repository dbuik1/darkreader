// Lets the theme engine style closed shadow roots the same way it styles open ones.
//
// The engine finds shadow roots by reading `element.shadowRoot`, which is null for closed
// roots. Content scripts run in an isolated world with their own copy of Element.prototype,
// so redefining the getter here changes what the engine sees without changing anything the
// page's own scripts can observe. Closed roots are read through the extension-only APIs:
// chrome.dom.openOrClosedShadowRoot in Chromium and element.openOrClosedShadowRoot in Firefox.

declare const chrome: any;

interface ElementWithClosedRoot extends Element {
    openOrClosedShadowRoot?: ShadowRoot | null;
}

let enabled = true;
let installed = false;

export function setClosedShadowRootsEnabled(value: boolean): void {
    enabled = value;
}

function getClosedRootReader(): ((element: Element) => ShadowRoot | null) | null {
    const chromeReader = typeof chrome === 'object' && chrome?.dom?.openOrClosedShadowRoot;
    if (typeof chromeReader === 'function') {
        return (element) => {
            // chrome.dom only accepts HTML elements; shadow roots can't attach to anything else.
            if (!(element instanceof HTMLElement)) {
                return null;
            }
            try {
                return chromeReader.call(chrome.dom, element) ?? null;
            } catch {
                return null;
            }
        };
    }
    if ('openOrClosedShadowRoot' in Element.prototype) {
        return (element) => (element as ElementWithClosedRoot).openOrClosedShadowRoot ?? null;
    }
    return null;
}

export function exposeClosedShadowRoots(): void {
    if (installed) {
        return;
    }
    const native = Object.getOwnPropertyDescriptor(Element.prototype, 'shadowRoot');
    const readClosedRoot = getClosedRootReader();
    if (!native?.get || !native.configurable || !readClosedRoot) {
        return;
    }
    const nativeGet = native.get;
    Object.defineProperty(Element.prototype, 'shadowRoot', {
        configurable: true,
        enumerable: native.enumerable,
        get(this: Element) {
            const open = nativeGet.call(this) as ShadowRoot | null;
            if (open || !enabled) {
                return open;
            }
            return readClosedRoot(this);
        },
    });
    installed = true;
}
