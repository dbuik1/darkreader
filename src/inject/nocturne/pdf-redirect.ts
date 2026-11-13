// Asks the background page to reopen a PDF in Nocturne's viewer. The request is sent only
// after the background has sent a theme for this tab, so the viewer is used exactly when the
// PDF would otherwise be darkened, and only in dark mode.

import type {MessageBGtoCS} from '../../definitions';
import {MessageTypeBGtoCS} from '../../utils/message';

export const OPEN_PDF_VIEWER = 'nocturne-cs-bg-open-pdf-viewer';
const ORIGINAL_MARKER = 'nocturne-original';
const THEME_MESSAGES: string[] = [
    MessageTypeBGtoCS.ADD_CSS_FILTER,
    MessageTypeBGtoCS.ADD_SVG_FILTER,
    MessageTypeBGtoCS.ADD_STATIC_THEME,
    MessageTypeBGtoCS.ADD_DYNAMIC_THEME,
];
const DARK_MODE = 1;

export function watchForPDFViewerRedirect(): void {
    if (window !== window.top || document.contentType !== 'application/pdf' || location.hash.includes(ORIGINAL_MARKER)) {
        return;
    }
    let sent = false;
    chrome.runtime.onMessage.addListener((message: MessageBGtoCS) => {
        const theme = message.data?.theme;
        if (sent || !THEME_MESSAGES.includes(message.type) || theme?.mode !== DARK_MODE) {
            return;
        }
        sent = true;
        chrome.runtime.sendMessage({type: OPEN_PDF_VIEWER, data: {url: location.href}});
    });
}
