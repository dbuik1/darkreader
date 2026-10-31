import {m} from 'malevic';
import {getContext} from 'malevic/dom';
import {withForms} from 'malevic/forms';
import {withState, useState} from 'malevic/state';

import type {ExtensionData, ExtensionActions} from '../../../definitions';
import {DONATE_URL, HOMEPAGE_URL, getHelpURL} from '../../../utils/links';
import {getLocalMessage} from '../../../utils/locales';
import {isMobile} from '../../../utils/platform';
import {TabPanel} from '../../controls';
import {compose} from '../../utils';
import NewBody from '../body';

import FilterSettings from './filter-settings';
import {Header, MoreSiteSettings, MoreToggleSettings} from './header';
import Loader from './loader';
import MoreSettings from './more-settings';
import SiteListSettings from './site-list-settings';


import {PlusBody, activate} from '@plus/popup/plus-body';

declare const __THUNDERBIRD__: boolean;
declare const __PLUS__: boolean;

interface BodyProps {
    data: ExtensionData;
    actions: ExtensionActions;
}

interface BodyState {
    activeTab: string;
    moreSiteSettingsOpen: boolean;
    moreToggleSettingsOpen: boolean;
    newToggleMenusHighlightHidden: boolean;
}

function Body(props: BodyProps & {fonts: string[]} & {installation: {date: number; version: string}}) {
    const context = getContext();
    const {state, setState} = useState<BodyState>({
        activeTab: 'Filter',
        moreSiteSettingsOpen: false,
        moreToggleSettingsOpen: false,
        newToggleMenusHighlightHidden: false,
    });

    if (!props.data.isReady) {
        return (
            <body>
                <Loader complete={false} />
            </body>
        );
    }

    const v = props.installation?.version?.split('.').map((p) => parseInt(p));
    const n = v && v.length >= 3 ? (v[0] * 1e6 + v[1] * 1e3 + v[2]) : 0;

    if (
        __PLUS__ && (
            props.data.settings.previewNewestDesign || (isMobile && n && n >= 4009093)
        )
    ) {
        return <PlusBody {...props} fonts={props.fonts} />;
    }

    if (isMobile || props.data.settings.previewNewDesign) {
        return <NewBody {...props} fonts={props.fonts} />;
    }

    function toggleMoreSiteSettings() {
        setState({moreSiteSettingsOpen: !state.moreSiteSettingsOpen, moreToggleSettingsOpen: false, newToggleMenusHighlightHidden: true});
        if (props.data.uiHighlights.includes('new-toggle-menus')) {
            props.actions.hideHighlights(['new-toggle-menus']);
        }
    }

    function toggleMoreToggleSettings() {
        setState({moreToggleSettingsOpen: !state.moreToggleSettingsOpen, moreSiteSettingsOpen: false, newToggleMenusHighlightHidden: true});
        if (props.data.uiHighlights.includes('new-toggle-menus')) {
            props.actions.hideHighlights(['new-toggle-menus']);
        }
    }

    const birthdayMessage = getLocalMessage('we_celebrate_10_years');
    let birthdayMessageSpec = <span>{birthdayMessage}</span>;
    try {
        const index10 = birthdayMessage.indexOf('10');
        const indexDot = birthdayMessage.indexOf('.', index10);
        if (index10 >= 0 && indexDot > index10) {
            const timePassed = Date.now() - (new Date(2014, 6, 7)).getTime();
            let years = Math.abs((new Date(timePassed)).getFullYear() - 1970);
            years = Math.max(10, years);
            birthdayMessageSpec = (
                <span>
                    {birthdayMessage.substring(0, index10)}
                    <a href={`${HOMEPAGE_URL}/timeline/`} target="_blank" rel="noopener noreferrer">
                        {`${years}${birthdayMessage.substring(index10 + 2, indexDot)}`}
                    </a>
                    {birthdayMessage.substring(indexDot)}
                </span>
            );
        }
    } catch (err) {
        console.error(err);
    }

    const filterTab = <FilterSettings data={props.data} actions={props.actions}>
        {__PLUS__ ? (
            props.data.uiHighlights.includes('anniversary') ? (
                <div class="ui-upgrade">
                    <i class="ui-upgrade__icon">
                    </i>
                    <span class="ui-upgrade__message">
                        Support the development and get access to the latest features
                    </span>
                    <a class="ui-upgrade__button" href={`${HOMEPAGE_URL}/plus/`} target="_blank" rel="noopener noreferrer">
                        <span class="ui-upgrade__button__text">
                            Upgrade
                        </span>
                    </a>
                </div>
            ) : (
                <div class="ui-upgrade">
                    <i class="ui-upgrade__icon">
                    </i>
                    <span class="ui-upgrade__message">
                        Activate the latest features
                    </span>
                    <a class="ui-upgrade__button" target="_blank" rel="noopener noreferrer" onclick={() => {
                        chrome.storage.local.get<Record<string, any>>({activationEmail: '', activationKey: ''}, async ({activationEmail, activationKey}) => {
                            const result = await activate(activationEmail, activationKey);
                            if (result) {
                                context.refresh();
                            } else {
                                props.actions.changeSettings({previewNewestDesign: true});
                            }
                        });
                    }}>
                        <span class="ui-upgrade__button__text">
                            Enable new design
                        </span>
                    </a>
                </div>
            )
        ) : props.data.uiHighlights.includes('anniversary') ? (
            <div class="birthday-container">
                <i class="birthday-icon">🎉</i>
                <span class="birthday-message">
                    {birthdayMessageSpec}
                </span>
                <a class="donate-link" href={DONATE_URL} target="_blank" rel="noopener noreferrer">
                    <span class="donate-link__text">{getLocalMessage('pay_for_using')}</span>
                </a>
            </div>
        ) : null}
    </FilterSettings>;

    const moreTab = <MoreSettings data={props.data} actions={props.actions} fonts={props.fonts} />;

    return (
        <body
            class={{
                'ext-disabled': !props.data.isEnabled,
                'ext-tall': __PLUS__ || props.data.uiHighlights.includes('anniversary'),
            }}
        >
            <Loader complete />

            <Header
                data={props.data}
                actions={props.actions}
                onMoreSiteSettingsClick={toggleMoreSiteSettings}
                onMoreToggleSettingsClick={toggleMoreToggleSettings}
            />

            <TabPanel
                activeTab={state.activeTab}
                onSwitchTab={(tab) => setState({activeTab: tab})}
                tabs={__THUNDERBIRD__ ? {
                    'Filter': filterTab,
                    'More': moreTab,
                } : {
                    'Filter': filterTab,
                    'Site list': (
                        <SiteListSettings data={props.data} actions={props.actions} isFocused={state.activeTab === 'Site list'} />
                    ),
                    'More': moreTab,
                }}
                tabLabels={{
                    'Filter': getLocalMessage('filter'),
                    'Site list': getLocalMessage('site_list'),
                    'More': getLocalMessage('more'),
                }}
            />

            <footer>
                <div class="footer-buttons">
                    <a class="footer-help-link" href={getHelpURL()} target="_blank" rel="noopener noreferrer">{getLocalMessage('help')}</a>
                </div>
            </footer>
            <MoreSiteSettings
                data={props.data}
                actions={props.actions}
                isExpanded={state.moreSiteSettingsOpen}
                onClose={toggleMoreSiteSettings}
            />
            <MoreToggleSettings
                data={props.data}
                actions={props.actions}
                isExpanded={state.moreToggleSettingsOpen}
                onClose={toggleMoreToggleSettings}
            />
        </body>
    );
}

export default compose(Body as any, withState, withForms);
