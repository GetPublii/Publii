module.exports = function (themeConfig) {
  let fontBody = themeConfig.customConfig['fontBody'];
  let fontHeadings = themeConfig.customConfig['fontHeadings'];
  let fontBodyItalic = themeConfig.customConfig['fontBodyItalic'];
  let fontHeadingsItalic = themeConfig.customConfig['fontHeadingsItalic'];

  let assets = new Set();

  const fontParams = {
    'albertsans': { hasItalic: true },
    'adventpro': { hasItalic: true },
    'aleo': { hasItalic: true },
    'andadapro': { hasItalic: true },
    'antonio': { hasItalic: false },
    'archivonarrow': { hasItalic: true },
    'asap': { hasItalic: true },
    'assistant': { hasItalic: false },
    'besley': { hasItalic: true },
    'bitter': { hasItalic: true },
    'bitcount': { hasItalic: false },
    'bodonimoda': { hasItalic: true },
    'brygada1918': { hasItalic: true },
    'cabin': { hasItalic: true },
    'cairo': { hasItalic: false },
    'cinzel': { hasItalic: false },
    'comfortaa': { hasItalic: false },
    'comme': { hasItalic: false },
    'dancingscript': { hasItalic: false },
    'danfo': { hasItalic: false },
    'dmsans': { hasItalic: true },
    'domine': { hasItalic: false },
    'dosis': { hasItalic: false },
    'doto': { hasItalic: false },
    'dynapuff': { hasItalic: false },
    'exo': { hasItalic: true },
    'familjengrotesk': { hasItalic: true },
    'faustina': { hasItalic: true },
    'figtree': { hasItalic: true },
    'finlandica': { hasItalic: true },
    'frankruhllibre': { hasItalic: false },
    'fredoka': { hasItalic: false },
    'funneldisplay': { hasItalic: false },
    'gantari': { hasItalic: true },
    'geistmono': { hasItalic: false },
    'glory': { hasItalic: true },
    'gluten': { hasItalic: false },
    'googlesanscode': { hasItalic: true },
    'grenzegotisch': { hasItalic: false },
    'handjet': { hasItalic: false },
    'heebo': { hasItalic: false },
    'hostgrotesk': { hasItalic: true },
    'imbue': { hasItalic: false },
    'inclusivesans': { hasItalic: true },
    'instrumentsans': { hasItalic: true },
    'jetbrainsmono': { hasItalic: true },
    'jura': { hasItalic: false },
    'kalnia': { hasItalic: false },
    'karla': { hasItalic: true },
    'kreon': { hasItalic: false },
    'kumbhsans': { hasItalic: false },
    'labrada': { hasItalic: true },
    'leaguespartan': { hasItalic: false },
    'lemonada': { hasItalic: false },
    'lexend': { hasItalic: false },
    'lexenddeca': { hasItalic: false },
    'librefranklin': { hasItalic: true },
    'lora': { hasItalic: true },
    'manuale': { hasItalic: true },
    'manrope': { hasItalic: false },
    'mavenpro': { hasItalic: false },
    'merriweathersans': { hasItalic: true },
    'montserrat': { hasItalic: true },
    'mulish': { hasItalic: true },
    'nunito': { hasItalic: true },
    'orbitron': { hasItalic: false },
    'oswald': { hasItalic: false },
    'outfit': { hasItalic: false },
    'oxanium': { hasItalic: false },
    'parkinsans': { hasItalic: false },
    'petrona': { hasItalic: true },
    'playfairdisplay': { hasItalic: true },
    'playwriteusmodern': { hasItalic: false },
    'playwriteustrad': { hasItalic: false },
    'plusjakartasans': { hasItalic: true },
    'pontanosans': { hasItalic: false },
    'publicsans': { hasItalic: true },
    'quicksand': { hasItalic: false },
    'radiocanadabig': { hasItalic: true },
    'raleway': { hasItalic: true },
    'redhatdisplay': { hasItalic: true },
    'redhatmono': { hasItalic: true },
    'redhattext': { hasItalic: true },
    'redrose': { hasItalic: false },
    'rem': { hasItalic: true },
    'robotoflex': { hasItalic: false },
    'robotoslab': { hasItalic: false },
    'rokkitt': { hasItalic: true },
    'rubik': { hasItalic: true },
    'ruda': { hasItalic: false },
    'smoochsans': { hasItalic: false },
    'sourcecodepro': { hasItalic: true },
    'sora': { hasItalic: false },
    'spartan': { hasItalic: false },
    'sticknobills': { hasItalic: false },
    'susemono': { hasItalic: true },
    'system-ui': { hasItalic: false },
    'teachers': { hasItalic: true },
    'tektur': { hasItalic: false },
    'tourney': { hasItalic: true },
    'urbanist': { hasItalic: true },
    'varta': { hasItalic: false },
    'victormono': { hasItalic: true },
    'wixmadefortext': { hasItalic: true },
    'workbench': { hasItalic: false },
    'worksans': { hasItalic: true },
    'yanonekaffeesatz': { hasItalic: false },
    'zalandosans': { hasItalic: true },
    'zalandosansexpanded': { hasItalic: true },
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
