import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import type {ExtWrapper, Theme} from '../../../definitions';
import {FilterMode} from '../../../generators/css-filter';
import {GITHUB_URL, getHelpURL} from '../../../utils/links';
import {isChromium} from '../../../utils/platform';
import {isLocalFile, isPDF} from '../../../utils/url';
import {toggleExtension} from '../../popup/components/header';
import {getSiteToggleData} from '../../popup/components/site-toggle';
import {openExtensionPage} from '../../utils';
import {Choice, Range, Switch} from '../controls';
import {strings} from '../strings';

declare const __CHROMIUM_MV3__: boolean;

const defaultColors: Partial<Theme> = {brightness: 100, contrast: 100, sepia: 0, grayscale: 0};

interface PopupStore {
    notice: string | null;
}

function getHost(url: string) {
    try {
        const host = new URL(url).hostname;
        return host.startsWith('www.') ? host.substring(4) : host;
    } catch {
        return url;
    }
}

function getBlocker(props: ExtWrapper): string | null {
    const {data} = props;
    const tab = data.activeTab;
    const isFile = isChromium && isLocalFile(tab.url);
    if (isFile && !data.isAllowedFileSchemeAccess) {
        return strings.localFilesBlocked;
    }
    const isProtected = !isFile && ((!__CHROMIUM_MV3__ && !tab.isInjected) || tab.isProtected);
    if (isProtected && !data.settings.enableForProtectedPages) {
        return strings.pageProtected;
    }
    return null;
}

function CrescentMark() {
    return (
        <svg class="n-header__mark" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
            <path d="M15.5 3.2a9 9 0 1 0 5.3 13.9A7.5 7.5 0 0 1 15.5 3.2Z" fill="currentColor" />
        </svg>
    );
}

export default function Body(props: ExtWrapper) {
    const context = getContext();
    const store: PopupStore = context.store;
    const {data, actions} = props;

    if (!data.isReady) {
        return (
            <body>
                <main class="n-popup" aria-busy="true">
                    <p class="n-status">{strings.loading}</p>
                </main>
            </body>
        );
    }

    const tab = data.activeTab;
    const pdf = isPDF(tab.url);
    const blocker = getBlocker(props);
    const {onSiteToggleClick, toggleHasEffect, isSiteEnabled} = getSiteToggleData(props);
    const siteLabel = pdf ? strings.darkenPDF : blocker ? strings.darkenPage : strings.darkenSite(getHost(tab.url));
    const ownDarkTheme = tab.isInDarkList || Boolean(tab.isDarkThemeDetected);
    const theme = data.settings.theme;

    function setNotice(notice: string | null) {
        store.notice = notice;
    }

    function getStatus() {
        if (store.notice) {
            return store.notice;
        }
        if (!data.isEnabled) {
            return strings.appOff;
        }
        if (blocker) {
            return null;
        }
        if (isSiteEnabled) {
            return strings.siteOn;
        }
        return ownDarkTheme ? strings.siteOffOwnTheme : strings.siteOff;
    }

    function onSiteChange() {
        setNotice(null);
        onSiteToggleClick();
    }

    function onAppChange(enabled: boolean) {
        setNotice(null);
        toggleExtension(props, enabled);
    }

    function setTheme(changes: Partial<Theme>) {
        setNotice(null);
        actions.setTheme(changes);
    }

    function resetColors() {
        setNotice(strings.colorsReset);
        actions.setTheme(defaultColors);
        context.refresh();
    }

    function openSettings(e: MouseEvent) {
        e.preventDefault();
        openExtensionPage('options');
    }

    const status = getStatus();

    return (
        <body>
            <header class="n-header">
                <CrescentMark />
                <h1 class="n-header__title">{strings.appName}</h1>
            </header>

            <main class="n-popup">
                <section class="n-primary">
                    {blocker ? <p class="n-callout">{blocker}</p> : null}
                    <Switch
                        name="site"
                        size="large"
                        label={siteLabel}
                        checked={isSiteEnabled && data.isEnabled}
                        disabled={Boolean(blocker) || !toggleHasEffect || !data.isEnabled}
                        onChange={onSiteChange}
                    />
                    <p class="n-status" role="status">{status}</p>
                </section>

                <section class="n-secondary">
                    <Switch
                        name="app"
                        label={strings.appSwitch}
                        hint={data.settings.automation.enabled ? strings.appSwitchScheduled : null}
                        checked={data.isEnabled}
                        onChange={onAppChange}
                    />
                    <Choice
                        legend={strings.mode}
                        name="mode"
                        value={theme.mode}
                        options={[
                            {value: FilterMode.dark, label: strings.dark},
                            {value: FilterMode.light, label: strings.light},
                        ]}
                        onChange={(mode) => setTheme({mode})}
                    />
                </section>

                <details class="n-disclosure">
                    <summary class="n-disclosure__summary">{strings.adjustColors}</summary>
                    <div class="n-disclosure__body">
                        <Range label={strings.brightness} value={theme.brightness} min={50} max={150} step={5} onChange={(brightness) => setTheme({brightness})} />
                        <Range label={strings.contrast} value={theme.contrast} min={50} max={150} step={5} onChange={(contrast) => setTheme({contrast})} />
                        <Range label={strings.sepia} value={theme.sepia} min={0} max={100} step={5} onChange={(sepia) => setTheme({sepia})} />
                        <Range label={strings.grayscale} value={theme.grayscale} min={0} max={100} step={5} onChange={(grayscale) => setTheme({grayscale})} />
                        <button class="n-button" type="button" onclick={resetColors}>{strings.resetColors}</button>
                    </div>
                </details>
            </main>

            <footer class="n-footer">
                <a class="n-footer__link" href="../options/index.html" onclick={openSettings}>{strings.settings}</a>
                <a class="n-footer__link" href={getHelpURL()} target="_blank" rel="noopener noreferrer">{strings.help}</a>
                <a class="n-footer__link n-footer__credit" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">{strings.basedOn}</a>
            </footer>
        </body>
    );
}
