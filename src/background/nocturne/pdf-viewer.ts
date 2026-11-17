// Reopens PDF tabs in Nocturne's viewer when the content script reports that a PDF is about
// to be darkened and the viewer is switched on in settings.

import {Extension} from '../extension';
import UserStorage from '../user-storage';

const OPEN_PDF_VIEWER = 'nocturne-cs-bg-open-pdf-viewer';
const VIEWER_PAGE = 'ui/pdf-viewer/index.html';
const DEFAULT_ON_MARKER = 'nocturnePDFViewerDefaultOn';

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

// The viewer used to be off by default, so a stored "off" usually means the old default rather
// than a choice. Turn it on once per installation; after that, switching it off sticks.
async function applyDefaultOnce(extensionReady: Promise<void>) {
    const stored = await chrome.storage.local.get(DEFAULT_ON_MARKER);
    if (stored[DEFAULT_ON_MARKER]) {
        return;
    }
    await extensionReady;
    if (!UserStorage.settings.openPDFsInViewer) {
        await Extension.changeSettings({openPDFsInViewer: true});
    }
    await chrome.storage.local.set({[DEFAULT_ON_MARKER]: true});
}

export function startPDFViewerRedirect(extensionReady: Promise<void>): void {
    applyDefaultOnce(extensionReady);
    chrome.runtime.onMessage.addListener((message, sender) => {
        if (isOpenRequest(message)) {
            onMessage(message, sender);
        }
        return false;
    });
}
