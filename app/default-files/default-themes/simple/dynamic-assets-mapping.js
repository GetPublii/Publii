module.exports = function (themeConfig) {
  let fontBody = themeConfig.customConfig['fontBody'];
  let fontHeadings = themeConfig.customConfig['fontHeadings'];
  let fontBodyItalic = themeConfig.customConfig['fontBodyItalic'];
  let fontHeadingsItalic = themeConfig.customConfig['fontHeadingsItalic'];

  let assets = new Set();

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

  const addFontAsset = (font, hasItalic) => {
    assets.add('/fonts/' + font + '/' + font + '.woff2');
    if (hasItalic && fontParams[font]?.hasItalic) {
      assets.add('/fonts/' + font + '/' + font + '-italic.woff2');
    }
  };

  if (fontBody !== 'system-ui') {
    addFontAsset(fontBody, fontBodyItalic);
  }

  if (fontHeadings !== 'system-ui' && fontHeadings !== fontBody) {
    addFontAsset(fontHeadings, fontHeadingsItalic);
  } else if (fontHeadingsItalic && !fontBodyItalic && fontParams[fontHeadings]?.hasItalic) {
    addFontAsset(fontHeadings, fontHeadingsItalic);
  }

  return Array.from(assets);
};
