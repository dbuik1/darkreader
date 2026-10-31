import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import type {ViewProps} from '../../../definitions';
import {settingsStrings as s, strings} from '../strings';

import type {SectionProps, SectionStore} from './sections';
import {AboutSection, BackupSection, GeneralSection, ScheduleSection, ShortcutsSection, SitesSection} from './sections';

const sections: Array<{id: string; title: string; view: (props: SectionProps) => Malevic.Child}> = [
    {id: 'general', title: s.general, view: GeneralSection},
    {id: 'sites', title: s.sites, view: SitesSection},
    {id: 'schedule', title: s.schedule, view: ScheduleSection},
    {id: 'shortcuts', title: s.shortcuts, view: ShortcutsSection},
    {id: 'backup', title: s.backup, view: BackupSection},
    {id: 'about', title: s.about, view: AboutSection},
];

export function getSectionId(hash: string): string {
    const id = hash.replace(/^#/, '');
    return sections.some((section) => section.id === id) ? id : 'general';
}

type BodyProps = ViewProps & {
    sectionId: string;
    focusHeading: boolean;
};

export default function Body(props: BodyProps) {
    const context = getContext();
    const store: SectionStore & {sectionId?: string} = context.store;
    if (!context.prev) {
        Object.assign(store, {notice: null, dialog: null, siteError: null, fieldErrors: {}, focusAfterRender: null});
    }
    if (store.sectionId !== props.sectionId) {
        Object.assign(store, {sectionId: props.sectionId, notice: null, dialog: null, siteError: null, fieldErrors: {}});
    }

    const section = sections.find(({id}) => id === props.sectionId)!;
    const sectionProps: SectionProps = {
        data: props.data,
        actions: props.actions,
        store,
        refresh: () => context.refresh(),
    };

    context.onRender(() => {
        // Moving focus to the new heading tells keyboard and screen reader users the page changed.
        if (props.focusHeading) {
            document.getElementById('section-heading')?.focus();
        }
        if (store.focusAfterRender) {
            (document.querySelector(store.focusAfterRender) as HTMLElement | null)?.focus();
            store.focusAfterRender = null;
        }
    });

    return (
        <body>
            <div class="n-settings">
                <header class="n-settings__header">
                    <svg class="n-settings__mark" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
                        <path d="M15.5 3.2a9 9 0 1 0 5.3 13.9A7.5 7.5 0 0 1 15.5 3.2Z" fill="currentColor" />
                    </svg>
                    <span class="n-settings__app">{strings.appName}</span>
                </header>
                <nav class="n-nav" aria-label={s.sections}>
                    <ul class="n-nav__list">
                        {sections.map(({id, title}) => (
                            <li>
                                <a
                                    class="n-nav__link"
                                    href={`#${id}`}
                                    aria-current={id === props.sectionId ? 'page' : null}
                                >
                                    {title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
                <main class="n-section">
                    <h1 class="n-section__title" id="section-heading" tabindex="-1">{section.title}</h1>
                    <p class="n-status n-section__status" role="status">{store.notice}</p>
                    {section.view(sectionProps)}
                </main>
            </div>
        </body>
    );
}
