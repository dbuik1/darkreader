import {getLocalMessage} from '../../utils/locales';

const local = (key: string, fallback: string) => {
    const message = getLocalMessage(key);
    return message && message !== key ? message.replace(/\s*\n\s*/g, ' ') : fallback;
};

export const strings = {
    appName: 'Nocturne',
    darkenSite: (host: string) => `Darken ${host}`,
    darkenPDF: 'Darken PDF files',
    darkenPage: 'Darken this page',
    siteOn: 'On for this site',
    siteOff: 'Off for this site',
    siteOffOwnTheme: 'Off for this site. It has its own dark theme',
    appOff: 'Nocturne is off. Turn it on below to darken pages',
    pageProtected: 'Your browser doesn’t let extensions change this page',
    localFilesBlocked: 'To darken local files, allow access to file URLs on Nocturne’s extension details page',
    appSwitch: 'Nocturne',
    appSwitchScheduled: 'Follows your schedule. Switching it stops the schedule',
    mode: local('mode', 'Mode'),
    dark: local('dark', 'Dark'),
    light: local('light', 'Light'),
    adjustColors: 'Adjust colors',
    brightness: local('brightness', 'Brightness'),
    contrast: local('contrast', 'Contrast'),
    sepia: local('sepia', 'Sepia'),
    grayscale: local('grayscale', 'Grayscale'),
    resetColors: 'Reset colors',
    colorsReset: 'Colors reset',
    settings: 'Settings',
    help: local('help', 'Help'),
    basedOn: 'Based on Dark Reader',
    loading: 'Loading',
};
