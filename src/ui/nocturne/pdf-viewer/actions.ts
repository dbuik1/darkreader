// Document actions that every toolbar layout shares: download, properties, present mode,
// and remembering where each document was left.

import {pdfViewerStrings as s} from '../strings';

const POSITIONS_KEY = 'nocturne-pdf-positions';
const MAX_POSITIONS = 100;

export async function downloadDocument(pdf: any, name: string): Promise<void> {
    const data: Uint8Array = await pdf.getData();
    const url = URL.createObjectURL(new Blob([data as BlobPart], {type: 'application/pdf'}));
    const a = document.createElement('a');
    a.href = url;
    a.download = /\.pdf$/i.test(name) ? name : `${name}.pdf`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${Math.round(bytes / 1024)} KB`;
    }
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// PDF dates look like D:20250314093000+01'00'.
function parsePDFDate(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }
    const m = value.match(/^(?:D:)?(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?/);
    if (!m) {
        return null;
    }
    const date = new Date(Number(m[1]), Number(m[2] ?? 1) - 1, Number(m[3] ?? 1), Number(m[4] ?? 0), Number(m[5] ?? 0));
    if (isNaN(date.getTime())) {
        return null;
    }
    return date.toLocaleString(undefined, {dateStyle: 'medium', timeStyle: m[4] ? 'short' : undefined});
}

function pageSize(view: number[]): string {
    const mm = (pt: number) => Math.round((pt / 72) * 25.4);
    const w = mm(view[2] - view[0]);
    const h = mm(view[3] - view[1]);
    const named: Array<[string, number, number]> = [['A4', 210, 297], ['A3', 297, 420], ['A5', 148, 210], ['Letter', 216, 279], ['Legal', 216, 356]];
    const match = named.find(([, a, b]) => (Math.abs(w - a) <= 2 && Math.abs(h - b) <= 2) || (Math.abs(w - b) <= 2 && Math.abs(h - a) <= 2));
    return match ? `${match[0]}, ${w} × ${h} mm` : `${w} × ${h} mm`;
}

export async function showProperties(pdf: any, fileName: string): Promise<void> {
    const [meta, page, length] = await Promise.all([
        pdf.getMetadata().catch(() => null),
        pdf.getPage(1),
        pdf.getDownloadInfo().then((d: {length: number}) => d.length).catch(() => 0),
    ]);
    const info = meta?.info ?? {};
    const text = (value: unknown) => (typeof value === 'string' && value.trim() && !/^(unspecified|untitled|anonymous|unknown)$/i.test(value.trim()) ? value.trim() : null);
    const rows: Array<[string, string | null]> = [
        [s.propFile, fileName],
        [s.propTitle, text(info.Title)],
        [s.propAuthor, text(info.Author)],
        [s.propSubject, text(info.Subject)],
        [s.propCreated, parsePDFDate(info.CreationDate)],
        [s.propModified, parsePDFDate(info.ModDate)],
        [s.propPages, String(pdf.numPages)],
        [s.propPageSize, pageSize(page.view)],
        [s.propFileSize, length ? formatBytes(length) : null],
        [s.propMadeWith, text(info.Creator) ?? text(info.Producer)],
    ];

    const dialog = document.createElement('dialog');
    dialog.className = 'v-dialog';
    dialog.setAttribute('aria-labelledby', 'properties-title');
    const title = document.createElement('h2');
    title.id = 'properties-title';
    title.textContent = s.properties;
    const list = document.createElement('dl');
    for (const [term, value] of rows) {
        if (!value) {
            continue;
        }
        const dt = document.createElement('dt');
        dt.textContent = term;
        const dd = document.createElement('dd');
        dd.textContent = value;
        list.append(dt, dd);
    }
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'n-button n-button--primary';
    close.textContent = s.close;
    close.addEventListener('click', () => dialog.close());
    dialog.append(title, list, close);
    dialog.addEventListener('close', () => dialog.remove());
    document.body.append(dialog);
    dialog.showModal();
    close.focus();
}

interface Position {
    page: number;
    zoom: string;
    at: number;
}

function readPositions(): Record<string, Position> {
    try {
        return JSON.parse(localStorage.getItem(POSITIONS_KEY) ?? '{}');
    } catch {
        return {};
    }
}

// Keyed by the document's fingerprint, so no web address is stored.
export function loadPosition(fingerprint: string): Position | null {
    return readPositions()[fingerprint] ?? null;
}

export function savePosition(fingerprint: string, page: number, zoom: string): void {
    const all = readPositions();
    all[fingerprint] = {page, zoom, at: Date.now()};
    const keys = Object.keys(all);
    if (keys.length > MAX_POSITIONS) {
        keys.sort((a, b) => all[a].at - all[b].at).slice(0, keys.length - MAX_POSITIONS).forEach((k) => delete all[k]);
    }
    try {
        localStorage.setItem(POSITIONS_KEY, JSON.stringify(all));
    } catch {
        // Storage full or blocked: the next visit opens at page 1.
    }
}
