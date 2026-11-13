import {HOMEPAGE_URL, BLOG_URL, DEVTOOLS_DOCS_URL, GITHUB_URL, PRIVACY_URL, TWITTER_URL, UNINSTALL_URL, HELP_URL} from './links';

enum CSP {
    NONE = "'none'",
    SELF = "'self'"
}

function check() {
    const prefixed = [BLOG_URL, PRIVACY_URL, UNINSTALL_URL, HELP_URL];
    if (prefixed.some((url) => !url.startsWith(HOMEPAGE_URL))) {
        throw new Error('Some navigation URL is not within main site!');
    }
}

export function prepareCSPMV3(): chrome.runtime.ManifestV3['content_security_policy'] {
    check();

    const result: any = {};
    const policy: any = {
        extension_pages: {
            'default-src': [CSP.NONE],
            // The PDF viewer runs pdf.js, which decodes some images with WebAssembly in a worker
            // and reads local PDFs through file: and blob: URLs.
            'script-src': [CSP.SELF, "'wasm-unsafe-eval'"],
            'style-src': [CSP.SELF],
            'img-src': [
                '*',
                'data:',
                'blob:',
            ],
            'connect-src': ['*', 'file:', 'blob:'],
            'navigate-to': [
                CSP.SELF,
                `${HOMEPAGE_URL}/*`,
                DEVTOOLS_DOCS_URL,
                GITHUB_URL,
                TWITTER_URL,
            ],
            'media-src': [CSP.NONE],
            'child-src': [CSP.NONE],
            'worker-src': [CSP.SELF],
            'object-src': [CSP.NONE],
        },
    };
    for (const p in policy) {
        const outputs: string[] = [];
        for (const directive in policy[p]) {
            outputs.push(`${directive} ${policy[p][directive].join(' ')}`);
        }
        result[p] = outputs.join('; ');
    }
    return result;
}
