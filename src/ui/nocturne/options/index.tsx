import {m} from 'malevic';
import {sync} from 'malevic/dom';
import {withState} from 'malevic/state';

import type {ExtensionData} from '../../../definitions';
import {getUILanguage} from '../../../utils/locales';
import Connector from '../../connect/connector';
import {compose} from '../../utils';
import {applyAppearance} from '../appearance';
import {settingsStrings} from '../strings';

import Body, {getSectionId} from './body';

declare const __CHROMIUM_MV3__: boolean;

const SettingsBody = compose(Body as any, withState);

let latestData: ExtensionData;
let connector: Connector;

function render(focusHeading = false) {
    const sectionId = getSectionId(location.hash);
    sync(document.body, <SettingsBody data={latestData} actions={connector} sectionId={sectionId} focusHeading={focusHeading} />);
}

async function start() {
    connector = new Connector();
    window.addEventListener('unload', () => connector.disconnect(), {passive: true});
    latestData = await connector.getData();
    render();
    connector.subscribeToChanges((data) => {
        latestData = data;
        render();
    });
    window.addEventListener('hashchange', () => render(true));
}

applyAppearance();
document.documentElement.lang = getUILanguage();
document.title = settingsStrings.pageTitle;

start();

if (__CHROMIUM_MV3__) {
    // Lets the background find an already open settings tab instead of opening a second one.
    chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
        if (message === 'getExtensionPageTabMV3_ping') {
            sendResponse('getExtensionPageTabMV3_pong');
        }
    });
}
