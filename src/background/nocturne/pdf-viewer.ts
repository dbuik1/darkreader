// Reopens PDF tabs in Nocturne's viewer when the content script reports that a PDF is about
// to be darkened and the viewer is switched on in settings.

import UserStorage from '../user-storage';

const OPEN_PDF_VIEWER = 'nocturne-cs-bg-open-pdf-viewer';
const VIEWER_PAGE = 'ui/pdf-viewer/index.html';

interface OpenPDFViewerMessage {
    type: typeof OPEN_PDF_VIEWER;
    data: {url: string};
}

function isOpenRequest(message: any): message is OpenPDFViewerMessage {
    return message?.type === OPEN_PDF_VIEWER && typeof message.data?.url === 'string';
}

export function getPDFViewerURL(url: string): string {
    return `${chrome.runtime.getURL(VIEWER_PAGE)}?${new URLSearchParams({file: url})}`;
}

async function onMessage(message: OpenPDFViewerMessage, sender: chrome.runtime.MessageSender) {
    const tabId = sender.tab?.id;
    if (tabId == null || sender.frameId !== 0) {
        return;
    }
    let url: URL;
    try {
        url = new URL(message.data.url);
    } catch {
        return;
    }
    if (!['http:', 'https:', 'file:'].includes(url.protocol)) {
        return;
    }
    await UserStorage.loadSettings();
    if (!UserStorage.settings.openPDFsInViewer) {
        return;
    }
    chrome.tabs.update(tabId, {url: getPDFViewerURL(url.href)});
}

export function startPDFViewerRedirect(): void {
    chrome.runtime.onMessage.addListener((message, sender) => {
        if (isOpenRequest(message)) {
            onMessage(message, sender);
        }
        return false;
    });
}
