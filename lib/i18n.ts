import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import commonEn from '../public/locales/en/common.json';
import commonHi from '../public/locales/hi/common.json';

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: { common: commonEn },
            hi: { common: commonHi },
        },
        lng: 'en', // default language
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
