import {m} from 'malevic';

import type {ViewProps} from '../../../definitions';
import {DONATE_URL, FORK_URL, GITHUB_URL, HELP_URL, UPSTREAM_LICENSE_URL, getHelpURL} from '../../../utils/links';
import {getLocalMessage} from '../../../utils/locales';

import {AppVersion} from './version';

interface AboutTabProps {
    plus?: boolean;
}

export function AboutTab(props: ViewProps & AboutTabProps): Malevic.Child {
    return <div class="settings-tab about-tab">
        <AppVersion />
        <p class="about-tab__credit">
            Based on <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">Dark Reader</a> by Alexander Shutau and Dark Reader Ltd., used under the <a href={UPSTREAM_LICENSE_URL} target="_blank" rel="noopener noreferrer">MIT License</a>.
        </p>
        <div>
            <a href={DONATE_URL} target="_blank" rel="noopener noreferrer">
                Support Dark Reader
            </a>
        </div>
        <div>
            <a href={FORK_URL} target="_blank" rel="noopener noreferrer">
                Source code
            </a>
        </div>
        <div>
            <a href={props.plus ? `${HELP_URL}/plus/` : getHelpURL()} target="_blank" rel="noopener noreferrer">{getLocalMessage('help')}</a>
        </div>
    </div>;
}
