const franc = require( 'franc-min' );
const _ = require( 'lodash' );
const languageList = {
    'en-US': 'eng',
    'id-ID': 'ind',
    'ms-MY': 'zlm',
    'ca-ES': 'cat',
    'cs-CZ': 'ces',
    'da-DK': 'dan',
    'de-DE': 'deu',
    'et-EE': 'est',
    'es-ES': 'spa',
    'fr-FR': 'fra',
    'hr-HR': 'hrv',
    'it-IT': 'ita',
    'hu-HU': 'hun',
    'nl-HU': 'nld',
    'no-NO': 'nno',
    'pl-PL': 'pol',
    'pt-BR': 'por',
    'ro-RO': 'ron',
    'sl-SI': 'slv',
    'sv-SE': 'swe',
    'vi-VN': 'vie',
    'tr-TR': 'tur',
    'yo-NG': 'yor',
    'el-GR': 'ell',
    'bg-BG': 'bul',
    'ru-RU': 'rus',
    'uk-UA': 'ukr',
    'he-IL': 'heb',
    'ar-SA': 'arb',
    'ne-NP': 'nep',
    'hi-IN': 'hin',
    'bn-IN': 'ben',
    'ta-IN': 'tam',
    'lo-LA': 'lao',
    'th-TH': 'tha',
    'ko-KR': 'kor',
    'ja-JP': 'jpn',
    'zh-CN': 'cmn'
};

module.exports = (body) => {
    const text = `${body.replace(/(?:!?\[(.*?)\]\((.*?)\))|(<\/?[^>]+(>|$))/g, '')}\n`;
    let existLanguages = franc.all(text, { only: Object.values(languageList) });
    existLanguages = existLanguages.map((item) => ({
        language: findCorrectLanguageFormat(item[0]),
        rate: item[1],
    }));

    return existLanguages[0].language;
};

const findCorrectLanguageFormat = (lang3Format) => _.chain(languageList).invert().get(lang3Format, 'en-US').value();
