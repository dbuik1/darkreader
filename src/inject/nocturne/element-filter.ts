// Sets and clears an inline CSS filter on page elements, restoring whatever inline filter the
// page had before. Elements that already have a filter from the page's own CSS or from a site
// fix are skipped, since a second filter would undo or double the first.

interface Saved {
    value: string;
    priority: string;
}

const saved = new WeakMap<HTMLElement, Saved>();

export function hasForeignFilter(element: HTMLElement): boolean {
    if (saved.has(element)) {
        return false;
    }
    const filter = getComputedStyle(element).filter;
    return Boolean(filter) && filter !== 'none';
}

export function applyFilter(element: HTMLElement, filter: string): void {
    const style = element.style;
    if (!saved.has(element)) {
        saved.set(element, {value: style.getPropertyValue('filter'), priority: style.getPropertyPriority('filter')});
    }
    if (style.getPropertyValue('filter') !== filter || style.getPropertyPriority('filter') !== 'important') {
        style.setProperty('filter', filter, 'important');
    }
}

export function clearFilter(element: HTMLElement): void {
    const previous = saved.get(element);
    if (!previous) {
        return;
    }
    saved.delete(element);
    if (previous.value) {
        element.style.setProperty('filter', previous.value, previous.priority);
    } else {
        element.style.removeProperty('filter');
    }
}

export function isFiltered(element: HTMLElement): boolean {
    return saved.has(element);
}

