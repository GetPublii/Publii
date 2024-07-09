module.exports = function (themeConfig) {
    const fontParams = {
        'adventpro': { hasItalic: true },
        'aleo': { hasItalic: true },
        'andadapro': { hasItalic: true },
        'antonio': { hasItalic: false },
        'archivonarrow': { hasItalic: true },
        'asap': { hasItalic: true },
        'assistant': { hasItalic: false },
        'besley': { hasItalic: true },
        'bitter': { hasItalic: true },
        'brygada1918': { hasItalic: true },
        'cabin': { hasItalic: true },
        'cairo': { hasItalic: false },
        'comfortaa': { hasItalic: false },
        'dancingscript': { hasItalic: false },
        'dosis': { hasItalic: false },
        'domine': { hasItalic: false },
        'exo': { hasItalic: true },
        'faustina': { hasItalic: true },
        'figtree': { hasItalic: true },
        'frankruhllibre': { hasItalic: false },
        'glory': { hasItalic: true },
        'gluten': { hasItalic: false },
        'heebo': { hasItalic: false },
        'imbue': { hasItalic: false },
        'instrumentsans': { hasItalic: true },
        'jetbrainsmono': { hasItalic: true },
        'jura': { hasItalic: false },
        'karla': { hasItalic: true },
        'kreon': { hasItalic: false },
        'labrada': { hasItalic: true },
        'lemonada': { hasItalic: false },
        'lexend': { hasItalic: false },
        'librefranklin': { hasItalic: true },
        'lora': { hasItalic: true },
        'manuale': { hasItalic: true },
        'manrope': { hasItalic: false },
        'mavenpro': { hasItalic: false },
        'merriweathersans': { hasItalic: true },
        'montserrat': { hasItalic: true },
        'nunito': { hasItalic: true },
        'orbitron': { hasItalic: false },
        'oswald': { hasItalic: false },
        'petrona': { hasItalic: true },
        'playfairdisplay': { hasItalic: true },
        'plusjakartasans': { hasItalic: true },
        'publicsans': { hasItalic: true },
        'quicksand': { hasItalic: false },
        'raleway': { hasItalic: true },
        'redhatdisplay': { hasItalic: true },
        'redhatmono': { hasItalic: true },
        'robotoflex': { hasItalic: false },
        'robotoslab': { hasItalic: false },
        'rokkitt': { hasItalic: true },
        'rubik': { hasItalic: true },
        'ruda': { hasItalic: false },
        'smoochsans': { hasItalic: false },
        'sourcecodepro': { hasItalic: true },
        'spartan': { hasItalic: false },
        'system-ui': { hasItalic: false },
        'urbanist': { hasItalic: true },
        'worksans': { hasItalic: true },
        'yanonekaffeesatz': { hasItalic: false },
        'yrsa': { hasItalic: true }
    };

    let fontBody = themeConfig.customConfig.find(option => option.name === 'fontBody').value;
    let fontHeadings = themeConfig.customConfig.find(option => option.name === 'fontHeadings').value;

    let disableFontBodyItalic = themeConfig.customConfig.find(option => option.name === 'disableFontBodyItalic').value;
    let disableFontHeadingsItalic = themeConfig.customConfig.find(option => option.name === 'disableFontHeadingsItalic').value;

    return [
        {
            name: 'fontBodyItalic',
            type: 'checkbox',
            value: !disableFontBodyItalic && (fontParams[fontBody]?.hasItalic || false)
        },
        {
            name: 'fontHeadingsItalic',
            type: 'checkbox',
            value: !disableFontHeadingsItalic && (fontParams[fontHeadings]?.hasItalic || false)
        }
    ];
};
