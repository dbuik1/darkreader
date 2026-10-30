import {m} from 'malevic';

import {DEFAULT_SETTINGS} from '../../../defaults';
import type {Automation, MessageUItoBG, UserSettings, ViewProps} from '../../../definitions';
import {AutomationMode} from '../../../utils/automation';
import {DONATE_URL, FORK_URL, GITHUB_URL, UPSTREAM_LICENSE_URL, getHelpURL} from '../../../utils/links';
import {getLocalMessage} from '../../../utils/locales';
import {MessageTypeUItoBG} from '../../../utils/message';
import {isEdge, isFirefox, isMatchMediaChangeEventListenerBuggy, isMobile} from '../../../utils/platform';
import {validateSettings} from '../../../utils/validation';
import {openExtensionPage, openFile, saveFile} from '../../utils';
import type {Appearance} from '../appearance';
import {getAppearance, setAppearance} from '../appearance';
import {Choice, Dialog, Switch, TextField} from '../controls';
import {settingsStrings as s, strings} from '../strings';

declare const __CHROMIUM_MV3__: boolean;

export interface SectionStore {
    notice: string | null;
    dialog: 'remove-all' | 'import' | 'reset' | null;
    siteError: string | null;
    fieldErrors: Record<string, string | null>;
    focusAfterRender: string | null;
}

export type SectionProps = ViewProps & {
    store: SectionStore;
    refresh: () => void;
};

function notify(props: SectionProps, notice: string | null) {
    props.store.notice = notice;
    props.refresh();
}

export function GeneralSection(props: SectionProps) {
    const {settings} = props.data;
    const change = (changes: Partial<UserSettings>) => {
        props.store.notice = null;
        props.actions.changeSettings(changes);
    };

    function onContextMenusChange(checked: boolean) {
        if (!checked || isFirefox) {
            change({enableContextMenus: checked});
            return;
        }
        // The permission must be requested from a page in response to a user action.
        chrome.permissions.request({permissions: ['contextMenus']}, (granted: boolean) => {
            if (granted) {
                change({enableContextMenus: true});
            } else {
                props.refresh();
            }
        });
    }

    return (
        <div class="n-section__body">
            <Switch
                name="enabled-by-default"
                label={s.darkenEverySite}
                hint={settings.enabledByDefault ? s.darkenEverySiteOn : s.darkenEverySiteOff}
                checked={settings.enabledByDefault}
                onChange={(enabledByDefault) => change({enabledByDefault})}
            />
            <Switch
                name="detect-dark-theme"
                label={s.leaveDarkSites}
                hint={s.leaveDarkSitesHint}
                checked={settings.detectDarkTheme}
                onChange={(detectDarkTheme) => change({detectDarkTheme})}
            />
            {isFirefox ? null : (
                <Switch
                    name="pdf"
                    label={s.darkenPDF}
                    checked={settings.enableForPDF}
                    onChange={(enableForPDF) => change({enableForPDF})}
                />
            )}
            {isFirefox ? (
                <Switch
                    name="browser-theme"
                    label={s.matchBrowserTheme}
                    hint={s.matchBrowserThemeHint}
                    checked={settings.changeBrowserTheme}
                    onChange={(changeBrowserTheme) => change({changeBrowserTheme})}
                />
            ) : null}
            <Switch
                name="protected-pages"
                label={s.darkenRestricted}
                hint={s.darkenRestrictedHint}
                checked={settings.enableForProtectedPages}
                onChange={(enableForProtectedPages) => change({enableForProtectedPages})}
            />
            {isMobile ? null : (
                <Switch
                    name="context-menus"
                    label={s.contextMenu}
                    checked={settings.enableContextMenus}
                    onChange={onContextMenusChange}
                />
            )}
            <Choice<Appearance>
                legend={s.appearance}
                name="appearance"
                value={getAppearance()}
                options={[
                    {value: 'system', label: s.matchSystem},
                    {value: 'dark', label: strings.dark},
                    {value: 'light', label: strings.light},
                ]}
                onChange={(appearance) => {
                    setAppearance(appearance);
                    props.refresh();
                }}
            />
        </div>
    );
}

export function SitesSection(props: SectionProps) {
    const {settings} = props.data;
    const {store} = props;
    const listKey = settings.enabledByDefault ? 'disabledFor' : 'enabledFor';
    const sites = settings[listKey];

    function save(next: string[]) {
        props.actions.changeSettings({[listKey]: next});
    }

    function addSite(value: string, input: HTMLInputElement) {
        const site = value.trim();
        if (!site) {
            store.siteError = s.enterSite;
            props.refresh();
            return;
        }
        if (sites.includes(site)) {
            store.siteError = s.alreadyListed(site);
            props.refresh();
            return;
        }
        store.siteError = null;
        store.notice = s.siteAdded(site);
        input.value = '';
        input.focus();
        save(sites.concat(site));
    }

    function removeSite(index: number) {
        const site = sites[index];
        const next = sites.slice();
        next.splice(index, 1);
        store.notice = s.siteRemoved(site);
        // Focus moves to the row that takes this one's place, or to the add field when the list empties.
        store.focusAfterRender = next.length === 0 ? '#add-site' : `#remove-site-${Math.min(index, next.length - 1)}`;
        save(next);
    }

    function goToGeneral(e: MouseEvent) {
        e.preventDefault();
        location.hash = 'general';
    }

    return (
        <div class="n-section__body">
            <p class="n-section__lead">
                {settings.enabledByDefault ? s.sitesSkipped : s.sitesDarkened}
                {' '}
                <a href="#general" onclick={goToGeneral}>{s.changeInGeneral}</a>
            </p>
            <div class="n-add-site">
                <TextField
                    id="add-site"
                    label={s.addSite}
                    hint={s.addSiteHint}
                    error={store.siteError}
                    inputmode="url"
                    onEnter={addSite}
                />
                <button
                    class="n-button n-button--primary"
                    type="button"
                    onclick={() => {
                        const input = document.getElementById('add-site') as HTMLInputElement;
                        addSite(input.value, input);
                    }}
                >
                    {s.addSiteButton}
                </button>
            </div>
            {sites.length === 0 ? (
                <p class="n-empty">{s.noSites}</p>
            ) : (
                <ul class="n-site-list" aria-label={s.sites}>
                    {sites.map((site, index) => (
                        <li class="n-site-list__item">
                            <span class="n-site-list__name">{site}</span>
                            <button
                                class="n-button n-site-list__remove"
                                id={`remove-site-${index}`}
                                type="button"
                                aria-label={s.removeSite(site)}
                                onclick={() => removeSite(index)}
                            >
                                {s.remove}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {sites.length > 1 ? (
                <div class="n-section__actions">
                    <button
                        class="n-button n-button--danger"
                        id="remove-all-sites"
                        type="button"
                        onclick={() => {
                            store.dialog = 'remove-all';
                            props.refresh();
                        }}
                    >
                        {s.removeAll}
                    </button>
                </div>
            ) : null}
            {store.dialog === 'remove-all' ? (
                <Dialog
                    title={s.removeAllTitle(sites.length)}
                    body={s.removeAllBody}
                    confirmLabel={s.removeAll}
                    cancelLabel={s.cancel}
                    danger
                    onCancel={() => {
                        store.dialog = null;
                        store.focusAfterRender = '#remove-all-sites';
                        props.refresh();
                    }}
                    onConfirm={() => {
                        store.dialog = null;
                        store.notice = s.allRemoved;
                        store.focusAfterRender = '#add-site';
                        props.actions.changeSettings({enabledFor: [], disabledFor: []});
                    }}
                />
            ) : null}
        </div>
    );
}

function padTime(time: string) {
    const [h, m] = time.split(':');
    return `${h.padStart(2, '0')}:${(m || '0').padStart(2, '0')}`;
}

const coordinateRanges = {
    latitude: {min: -90, max: 90, label: s.latitude, hint: s.latitudeHint},
    longitude: {min: -180, max: 180, label: s.longitude, hint: s.longitudeHint},
};

export function ScheduleSection(props: SectionProps) {
    const {settings} = props.data;
    const {automation, location: coordinates, time} = settings;
    const mode = automation.enabled ? automation.mode : AutomationMode.NONE;

    function setMode(next: AutomationMode) {
        props.store.notice = null;
        if (next === AutomationMode.SYSTEM && __CHROMIUM_MV3__) {
            chrome.runtime.sendMessage<MessageUItoBG>({
                type: MessageTypeUItoBG.COLOR_SCHEME_CHANGE,
                data: {isDark: matchMedia('(prefers-color-scheme: dark)').matches},
            });
        }
        props.actions.changeSettings({automation: {...automation, mode: next, enabled: Boolean(next)}});
    }

    function setBehavior(behavior: Automation['behavior']) {
        props.actions.changeSettings({automation: {...automation, behavior}});
    }

    function setCoordinate(type: 'latitude' | 'longitude', value: string) {
        const range = coordinateRanges[type];
        const text = value.replace(',', '.').replace('°', '').trim();
        if (text === '') {
            props.store.fieldErrors[type] = null;
            props.actions.changeSettings({location: {...coordinates, [type]: null}});
            return;
        }
        const num = Number(text);
        if (isNaN(num) || num < range.min || num > range.max) {
            props.store.fieldErrors[type] = s.numberOutOfRange(range.label, range.min, range.max);
            props.refresh();
            return;
        }
        props.store.fieldErrors[type] = null;
        props.actions.changeSettings({location: {...coordinates, [type]: num}});
    }

    return (
        <div class="n-section__body">
            <Choice<AutomationMode>
                legend={s.turnOnAutomatically}
                name="schedule"
                value={mode}
                vertical
                options={[
                    {value: AutomationMode.NONE, label: s.scheduleOff},
                    {value: AutomationMode.TIME, label: s.betweenTimes},
                    {value: AutomationMode.LOCATION, label: s.sunsetToSunrise},
                    {value: AutomationMode.SYSTEM, label: s.whenSystemDark},
                ]}
                onChange={setMode}
            />
            {mode === AutomationMode.TIME ? (
                <div class="n-field-row">
                    <TextField
                        id="time-from"
                        type="time"
                        label={s.from}
                        value={padTime(time.activation)}
                        onChange={(activation) => activation && props.actions.changeSettings({time: {...time, activation}})}
                    />
                    <TextField
                        id="time-to"
                        type="time"
                        label={s.to}
                        value={padTime(time.deactivation)}
                        onChange={(deactivation) => deactivation && props.actions.changeSettings({time: {...time, deactivation}})}
                    />
                </div>
            ) : null}
            {mode === AutomationMode.LOCATION ? (
                <div class="n-field-row">
                    {(['latitude', 'longitude'] as const).map((type) => (
                        <TextField
                            id={type}
                            label={coordinateRanges[type].label}
                            hint={coordinateRanges[type].hint}
                            error={props.store.fieldErrors[type]}
                            inputmode="decimal"
                            value={coordinates[type] == null ? '' : String(coordinates[type])}
                            onChange={(value) => setCoordinate(type, value)}
                        />
                    ))}
                </div>
            ) : null}
            {mode === AutomationMode.SYSTEM && isMatchMediaChangeEventListenerBuggy ? (
                <p class="n-callout">{getLocalMessage('system_dark_mode_chromium_warning').replace(/\s*\n\s*/g, ' ')}</p>
            ) : null}
            {mode === AutomationMode.NONE ? null : (
                <Choice<Automation['behavior']>
                    legend={s.whenScheduleChanges}
                    name="behavior"
                    value={automation.behavior}
                    vertical
                    options={[
                        {value: 'OnOff', label: s.turnOnAndOff},
                        {value: 'Scheme', label: s.switchMode},
                    ]}
                    onChange={setBehavior}
                />
            )}
        </div>
    );
}

const commands = [
    {name: 'toggle', label: s.toggleApp},
    {name: 'addSite', label: s.toggleSite},
];

export function ShortcutsSection(props: SectionProps) {
    const {shortcuts} = props.data;

    function openShortcutSettings() {
        chrome.tabs.create({url: isEdge ? 'edge://extensions/shortcuts' : 'chrome://extensions/shortcuts'});
    }

    async function saveShortcut(command: string) {
        const input = document.getElementById(`shortcut-${command}`) as HTMLInputElement;
        const error = await props.actions.setShortcut(command, input.value.trim());
        props.store.fieldErrors[command] = error;
        props.store.notice = error ? null : s.shortcutSaved;
        props.refresh();
    }

    return (
        <div class="n-section__body">
            <dl class="n-shortcuts">
                {commands.map(({name, label}) => (
                    <div class="n-shortcuts__row">
                        <dt>{label}</dt>
                        <dd><kbd>{shortcuts[name] || s.notSet}</kbd></dd>
                    </div>
                ))}
            </dl>
            {isFirefox ? commands.map(({name, label}) => (
                <div class="n-add-site">
                    <TextField
                        id={`shortcut-${name}`}
                        label={label}
                        hint={s.shortcutHint}
                        error={props.store.fieldErrors[name]}
                        value={shortcuts[name] || ''}
                        onEnter={() => saveShortcut(name)}
                    />
                    <button class="n-button" type="button" onclick={() => saveShortcut(name)}>{s.saveShortcut}</button>
                </div>
            )) : (
                <div class="n-action">
                    <button class="n-button" type="button" aria-describedby="shortcuts-hint" onclick={openShortcutSettings}>{s.changeShortcuts}</button>
                    <span class="n-field__hint" id="shortcuts-hint">{s.changeShortcutsHint}</span>
                </div>
            )}
        </div>
    );
}

export function BackupSection(props: SectionProps) {
    const {settings} = props.data;
    const {store} = props;

    function exportSettings() {
        saveFile('Nocturne-Settings.json', JSON.stringify(settings, null, 4));
        notify(props, s.exported);
    }

    function importSettings() {
        store.dialog = null;
        store.focusAfterRender = '#import-settings';
        props.refresh();
        openFile({extensions: ['json']}, (result: string) => {
            try {
                const {settings: imported, errors} = validateSettings(JSON.parse(result));
                if (errors.length) {
                    notify(props, s.importInvalid(errors[0]));
                    return;
                }
                props.actions.changeSettings(imported);
                notify(props, s.imported);
            } catch {
                notify(props, s.importUnreadable);
            }
        });
    }

    function syncSiteFixes(syncSitesFixes: boolean) {
        props.actions.changeSettings({syncSitesFixes});
        props.actions.loadConfig({local: !syncSitesFixes});
    }

    function closeDialog(focus: string) {
        store.dialog = null;
        store.focusAfterRender = focus;
        props.refresh();
    }

    return (
        <div class="n-section__body">
            <Switch
                name="sync-settings"
                label={s.syncSettings}
                hint={s.syncSettingsHint}
                checked={settings.syncSettings}
                onChange={(syncSettings) => props.actions.changeSettings({syncSettings})}
            />
            <Switch
                name="site-fixes"
                label={s.siteFixes}
                hint={s.siteFixesHint}
                checked={settings.syncSitesFixes}
                onChange={syncSiteFixes}
            />
            <div class="n-action">
                <button class="n-button" type="button" aria-describedby="export-hint" onclick={exportSettings}>{s.exportSettings}</button>
                <span class="n-field__hint" id="export-hint">{s.exportHint}</span>
            </div>
            <div class="n-action">
                <button
                    class="n-button"
                    id="import-settings"
                    type="button"
                    onclick={() => {
                        store.dialog = 'import';
                        props.refresh();
                    }}
                >
                    {s.importSettings}
                </button>
            </div>
            <div class="n-action">
                <button
                    class="n-button n-button--danger"
                    id="reset-settings"
                    type="button"
                    onclick={() => {
                        store.dialog = 'reset';
                        props.refresh();
                    }}
                >
                    {s.resetSettings}
                </button>
            </div>
            <div class="n-action">
                <a
                    href="../devtools/index.html"
                    aria-describedby="fix-editor-hint"
                    onclick={(e: MouseEvent) => {
                        e.preventDefault();
                        openExtensionPage('devtools');
                    }}
                >
                    {s.fixEditor}
                </a>
                <span class="n-field__hint" id="fix-editor-hint">{s.fixEditorHint}</span>
            </div>
            {store.dialog === 'import' ? (
                <Dialog
                    title={s.importTitle}
                    body={s.importBody}
                    confirmLabel={s.chooseFile}
                    cancelLabel={s.cancel}
                    onCancel={() => closeDialog('#import-settings')}
                    onConfirm={importSettings}
                />
            ) : null}
            {store.dialog === 'reset' ? (
                <Dialog
                    title={s.resetTitle}
                    body={s.resetBody}
                    confirmLabel={s.resetConfirm}
                    cancelLabel={s.cancel}
                    danger
                    onCancel={() => closeDialog('#reset-settings')}
                    onConfirm={() => {
                        store.dialog = null;
                        store.notice = s.resetDone;
                        store.focusAfterRender = '#reset-settings';
                        props.actions.changeSettings(DEFAULT_SETTINGS);
                    }}
                />
            ) : null}
        </div>
    );
}

export function AboutSection() {
    return (
        <div class="n-section__body">
            <p>{s.version(chrome.runtime.getManifest().version)}</p>
            <p>
                Based on <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">Dark Reader</a> by Alexander Shutau and Dark Reader Ltd., used under the <a href={UPSTREAM_LICENSE_URL} target="_blank" rel="noopener noreferrer">MIT License</a>.
            </p>
            <ul class="n-links">
                <li><a href={DONATE_URL} target="_blank" rel="noopener noreferrer">{s.supportDarkReader}</a></li>
                <li><a href={FORK_URL} target="_blank" rel="noopener noreferrer">{s.sourceCode}</a></li>
                <li><a href={getHelpURL()} target="_blank" rel="noopener noreferrer">{strings.help}</a></li>
            </ul>
        </div>
    );
}
