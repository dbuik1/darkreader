import {m} from 'malevic';
import {sync} from 'malevic/dom';
import {withState} from 'malevic/state';

import type {ExtensionData, ExtensionActions} from '../../../definitions';
import {getUILanguage} from '../../../utils/locales';
import {isFirefox} from '../../../utils/platform';
import Connector from '../../connect/connector';
import {fixNotClosingPopupOnNavigation} from '../../popup/utils/issues';
import {compose} from '../../utils';

import {strings} from '../strings';

import Body from './body';

const PopupBody = compose(Body as any, withState);

function render(data: ExtensionData, actions: ExtensionActions) {
    sync(document.body, <PopupBody data={data} actions={actions} />);
}

async function start() {
    const connector = new Connector();
    window.addEventListener('unload', () => connector.disconnect());

    const data = await connector.getData();
    render(data, connector);
    connector.subscribeToChanges((data) => render(data, connector));
}

document.documentElement.lang = getUILanguage();
document.title = strings.appName;

window.addEventListener('load', start);

if (isFirefox) {
    fixNotClosingPopupOnNavigation();
}
