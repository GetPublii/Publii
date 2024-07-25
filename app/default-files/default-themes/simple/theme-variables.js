/*
 * Custom function used to generate the output of the theme variables
 */

var generateThemeVariables = function (params) {
  let fontParams = {
    'system-ui': {
      name: 'SystemUI',
      family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
      hasItalic: false
    },
    'adventpro': {
      name: 'Advent Pro',
      family: '\'Advent Pro\', sans-serif',
      weight: '100 900',
      hasItalic: true
    },
    'aleo': {
      name: 'Aleo',
      family: '\'Aleo\', serif',
      weight: '100 900',
      hasItalic: true
    },
    'andadapro': {
      name: 'Andada Pro',
      family: '\'Andada Pro\', serif',
      weight: '400 840',
      hasItalic: true
    },
    'antonio': {
      name: 'Antonio',
      family: '\'Antonio\', sans-serif',
      weight: '100 700',
      hasItalic: false
    },
    'archivonarrow': {
      name: 'Archivo Narrow',
      family: '\'Archivo Narrow\', sans-serif',
      weight: '400 700',
      hasItalic: true
    },
    'asap': {
      name: 'Asap',
      family: '\'Asap\', sans-serif',
      weight: '400 700',
      hasItalic: true
    },
    'assistant': {
      name: 'Assistant',
      family: '\'Assistant\', sans-serif',
      weight: '200 800',
      hasItalic: false
    },
    'besley': {
      name: 'Besley',
      family: '\'Besley\', serif',
      weight: '400 900',
      hasItalic: true
    },
    'bitter': {
      name: 'Bitter',
      family: '\'Bitter\', serif',
      weight: '100 900',
      hasItalic: true
    },
    'brygada1918': {
      name: 'Brygada 1918',
      family: '\'Brygada 1918\', serif',
      weight: '400 700',
      hasItalic: true
    },
    'cabin': {
      name: 'Cabin',
      family: '\'Cabin\', sans-serif',
      weight: '400 700',
      hasItalic: true
    },
    'cairo': {
      name: 'Cairo',
      family: '\'Cairo\', sans-serif',
      weight: '200 1000',
      hasItalic: false
    },
    'comfortaa': {
      name: 'Comfortaa',
      family: '\'Comfortaa\', cursive',
      weight: '300 700',
      hasItalic: false
    },
    'dancingscript': {
      name: 'Dancing Script',
      family: '\'Dancing Script\', cursive',
      weight: '400 700',
      hasItalic: false
    },
    'dosis': {
      name: 'Dosis',
      family: '\'Dosis\', sans-serif',
      weight: '200 800',
      hasItalic: false
    },
    'domine': {
      name: 'Domine',
      family: '\'Domine\', serif',
      weight: '400 700',
      hasItalic: false
    },
    'exo': {
      name: 'Exo',
      family: '\'Exo\', sans-serif',
      weight: '100 900',
      hasItalic: true
    },
    'faustina': {
      name: 'Faustina',
      family: '\'Faustina\', serif',
      weight: '300 800',
      hasItalic: true
    },
    'figtree': {
      name: 'Figtree',
      family: '\'Figtree\', sans-serif',
      weight: '300 900',
      hasItalic: true
    },
    'frankruhllibre': {
      name: 'Frank Ruhl Libre',
      family: '\'Frank Ruhl Libre\', serif',
      weight: '300 900',
      hasItalic: false
    },
    'glory': {
      name: 'Glory',
      family: '\'Glory\', sans-serif',
      weight: '100 800',
      hasItalic: true
    },
    'gluten': {
      name: 'Gluten',
      family: '\'Gluten\', cursive',
      weight: '100 900',
      hasItalic: false
    },
    'heebo': {
      name: 'Heebo',
      family: '\'Heebo\', sans-serif',
      weight: '100 900',
      hasItalic: false
    },
    'imbue': {
      name: 'Imbue',
      family: '\'Imbue\', serif',
      weight: '100 900',
      hasItalic: false
    },
    'instrumentsans': {
      name: 'Instrument Sans',
      family: '\'Instrument Sans\', serif',
      weight: '400 700',
      hasItalic: true
    },
    'jetbrainsmono': {
      name: 'JetBrains Mono',
      family: '\'JetBrains Mono\', monospace',
      weight: '100 800',
      hasItalic: true
    },
    'jura': {
      name: 'Jura',
      family: '\'Jura\', sans-serif',
      weight: '300 700',
      hasItalic: false
    },
    'karla': {
      name: 'Karla',
      family: '\'Karla\', sans-serif',
      weight: '200 800',
      hasItalic: true
    },
    'kreon': {
      name: 'Kreon',
      family: '\'Kreon\', serif',
      weight: '300 700',
      hasItalic: false
    },
    'labrada': {
      name: 'Labrada',
      family: '\'Labrada\', serif',
      weight: '100 900',
      hasItalic: true
    },
    'lemonada': {
      name: 'Lemonada',
      family: '\'Lemonada\', cursive',
      weight: '300 700',
      hasItalic: false
    },
    'lexend': {
      name: 'Lexend',
      family: '\'Lexend\', sans-serif',
      weight: '100 900',
      hasItalic: false
    },
    'librefranklin': {
      name: 'Libre Franklin',
      family: '\'Libre Franklin\', sans-serif',
      weight: '100 900',
      hasItalic: true
    },
    'lora': {
      name: 'Lora',
      family: '\'Lora\', serif',
      weight: '400 700',
      hasItalic: true
    },
    'manuale': {
      name: 'Manuale',
      family: '\'Manuale\', serif',
      weight: '300 800',
      hasItalic: true
    },
    'manrope': {
      name: 'Manrope',
      family: '\'Manrope\', sans-serif',
      weight: '100 900',
      hasItalic: false
    },
    'mavenpro': {
      name: 'Maven Pro',
      family: '\'Maven Pro\', sans-serif',
      weight: '400 900',
      hasItalic: false
    },
    'merriweathersans': {
      name: 'Merriweather Sans',
      family: '\'Merriweather Sans\', sans-serif',
      weight: '300 800',
      hasItalic: true
    },
    'montserrat': {
      name: 'Montserrat',
      family: '\'Montserrat\', sans-serif',
      weight: '100 900',
      hasItalic: true
    },
    'nunito': {
      name: 'Nunito',
      family: '\'Nunito\', sans-serif',
      weight: '200 1000',
      hasItalic: true
    },
    'orbitron': {
      name: 'Orbitron',
      family: '\'Orbitron\', sans-serif',
      weight: '400 900',
      hasItalic: false
    },
    'oswald': {
      name: 'Oswald',
      family: '\'Oswald\', sans-serif',
      weight: '200 700',
      hasItalic: false
    },
    'petrona': {
      name: 'Petrona',
      family: '\'Petrona\', serif',
      weight: '100 900',
      hasItalic: true
    },
    'playfairdisplay': {
      name: 'Playfair Display',
      family: '\'Playfair Display\', serif',
      weight: '400 900',
      hasItalic: true
    },
    'plusjakartasans': {
      name: 'Plus Jakarta Sans',
      family: '\'Plus Jakarta Sans\', sans-serif',
      weight: '200 800',
      hasItalic: true
    },
    'publicsans': {
      name: 'Public Sans',
      family: '\'Public Sans\', sans-serif',
      weight: '100 900',
      hasItalic: true
    },
    'quicksand': {
      name: 'Quicksand',
      family: '\'Quicksand\', sans-serif',
      weight: '300 700',
      hasItalic: false
    },
    'raleway': {
      name: 'Raleway',
      family: '\'Raleway\', sans-serif',
      weight: '100 900',
      hasItalic: true
    },
    'redhatdisplay': {
      name: 'Red Hat Display',
      family: '\'Red Hat Display\', sans-serif',
      weight: '300 900',
      hasItalic: true
    },
    'redhatmono': {
      name: 'Red Hat Mono',
      family: '\'Red Hat Mono\', monospace',
      weight: '300 700',
      hasItalic: true
    },
    'robotoflex': {
      name: 'Roboto Flex',
      family: '\'Roboto Flex\', sans-serif',
      weight: '100 900',
      hasItalic: false
    },
    'robotoslab': {
      name: 'Roboto Slab',
      family: '\'Roboto Slab\', serif',
      weight: '100 900',
      hasItalic: false
    },
    'rokkitt': {
      name: 'Rokkitt',
      family: '\'Rokkitt\', serif',
      weight: '100 900',
      hasItalic: true
    },
    'rubik': {
      name: 'Rubik',
      family: '\'Rubik\', sans-serif',
      weight: '300 900',
      hasItalic: true
    },
    'ruda': {
      name: 'Ruda',
      family: '\'Ruda\', sans-serif',
      weight: '400 900',
      hasItalic: false
    },
    'smoochsans': {
      name: 'Smooch Sans',
      family: '\'Smooch Sans\', sans-serif',
      weight: '100 900',
      hasItalic: false
    },
    'sourcecodepro': {
      name: 'Source Code Pro',
      family: '\'Source Code Pro\', monospace',
      weight: '200 900',
      hasItalic: true
    },
    'spartan': {
      name: 'Spartan',
      family: '\'Spartan\', sans-serif',
      weight: '100 900',
      hasItalic: false
    },
    'urbanist': {
      name: 'Urbanist',
      family: '\'Urbanist\', sans-serif',
      weight: '100 900',
      hasItalic: true
    },
    'worksans': {
      name: 'Work Sans',
      family: '\'Work Sans\', sans-serif',
      weight: '100 900',
      hasItalic: true
    },
    'yanonekaffeesatz': {
      name: 'Yanone Kaffeesatz',
      family: '\'Yanone Kaffeesatz\', sans-serif',
      weight: '200 700',
      hasItalic: false
    },
    'yrsa': {
      name: 'Yrsa',
      family: '\'Yrsa\', serif',
      weight: '300 700',
      hasItalic: true
    }
  };

  let fontBodyName = fontParams[params.fontBody]?.name;
  let fontBodyFamily = fontParams[params.fontBody]?.family;
  let fontBodyWeight = fontParams[params.fontBody]?.weight;
  let fontBodyHasItalic = fontParams[params.fontBody]?.hasItalic;

  let fontHeadingsName = fontParams[params.fontHeadings]?.name;
  let fontHeadingsFamily = fontParams[params.fontHeadings]?.family;
  let fontHeadingsWeight = fontParams[params.fontHeadings]?.weight;
  let fontHeadingsHasItalic = fontParams[params.fontHeadings]?.hasItalic;

  let output = '';
  let loadedFonts = new Set();

  const addFontFace = (key, name, weight, hasItalic) => {
    if (!loadedFonts.has(name)) {
      output += `             
        @font-face {
          font-family: '${name}';
          src: url('../dynamic/fonts/${key}/${key}.woff2') format('woff2');
          font-weight: ${weight};
          font-display: swap;
          font-style: normal;
        }
      `;
      loadedFonts.add(name);
    }
    if (hasItalic && !loadedFonts.has(`${name}-italic`)) {
      output += `             
        @font-face {
          font-family: '${name}';
          src: url('../dynamic/fonts/${key}/${key}-italic.woff2') format('woff2');
          font-weight: ${weight}; 
          font-display: swap;
          font-style: italic;
        }
      `;
      loadedFonts.add(`${name}-italic`);
    }
  };

  if (params.fontBody !== 'system-ui') {
    addFontFace(params.fontBody, fontBodyName, fontBodyWeight, params.fontBodyItalic && fontBodyHasItalic);
  }

  if (params.fontHeadings !== 'system-ui') {
    addFontFace(params.fontHeadings, fontHeadingsName, fontHeadingsWeight, params.fontHeadingsItalic && fontHeadingsHasItalic);
  }

  if (params.fontMenu === 'system-ui') {
    params.fontMenu = fontParams['system-ui'].family;
  }

  if (params.fontLogo === 'system-ui') {
    params.fontLogo = fontParams['system-ui'].family;
  }

  // Fluid base font-size
  const minScreen = 20; // rem
  const maxScreen = 90; // rem
  const screenRange = maxScreen - minScreen;
  const minFontSize = params.minFontSize;
  const maxFontSize = params.maxFontSize;
  const fontSizeRange = maxFontSize - minFontSize;
  const fontSizeValue = `clamp(${minFontSize}rem, ${minFontSize}rem + (${fontSizeRange} * ((100vw - ${minScreen}rem) / ${screenRange})), ${maxFontSize}rem)`;


  output += `    
    :root {
      --page-margin:        ${params.pageMargin};
      --page-width:         ${params.pageWidth};
      --entry-width:        ${params.entryWidth}; 
      --navbar-height:      4.4rem; 
      --border-radius:      ${params.borderRadius}px;
      --baseline:           ${params.baseline};
      --gallery-gap:        ${params.galleryItemGap}; 
      --body-font:          ${fontBodyFamily};
      --heading-font:       ${fontHeadingsFamily};
      --logo-font:          ${params.fontLogo};
      --menu-font:          ${params.fontMenu};
      --font-size:          ${fontSizeValue};
      --font-weight-normal: ${params.fontBodyWeight}; 
      --font-weight-bold:   ${params.fontBoldWeight}; 
      --line-height:        ${params.lineHeight};
      --letter-spacing:     ${params.letterSpacing}em;  
      --headings-weight:    ${params.fontHeadignsWeight};
      --headings-transform: ${params.fontHeadingsTransform};
      --headings-style:     ${params.fontHeadingsStyle};
      --headings-letter-spacing: ${params.fontHeadingsletterSpacing}em;
      --headings-line-height: ${params.fontHeadingsLineHeight};
      --hero-height:        ${params.heightHero};
      --feed-image-size:    ${params.feedFeaturedImageSize}rem;
                          
    `;

  if (params.colorScheme !== 'dark') {
    output += ` 
        --white:              #FFFFFF;
        --black:              #17181E;
        --helper:             #FFFFFF;
        --dark:               #17181E;
        --gray:               #57585a;
        --light:              #CACBCF;
        --lighter:            #F3F3F3;
        --page-bg:            #FFFFFF; 
        --color:              ${params.primaryColor};   
        --text-color:         #17181E;
        --headings-color:     #17181E;
        --link-color:         #17181E;
        --link-color-hover:   ${params.primaryColor};    
        --nav-link-color:     #17181E;
        --nav-link-color-hover: #17181E;  
        --logo-color:         #17181E;   
        --highlight-color:    #FFC700;
        --info-color:         #67B1F3;
        --success-color:      #00A563;
        --warning-color:      #EE4E4E;
    `;
  }

  if (params.colorScheme === 'dark') {
    output += ` 
        --white:              #FFFFFF;
        --black:              #1e1e1e;
        --helper:             #1e1e1e;
        --dark:               #CECBCB;
        --gray:               #9D9D9D;
        --light:              #373737;
        --lighter:            #1e1e1e;
        --page-bg:            #181818; 
        --color:              ${params.primaryDarkColor};   
        --text-color:         #BFBFBF;
        --headings-color:     #EEEDED;
        --link-color:         #EEEDED;
        --link-color-hover:   ${params.primaryDarkColor};    
        --nav-link-color:     rgba(255,255,255,1);
        --nav-link-color-hover: rgba(255,255,255,.7);  
        --logo-color:         #FFFFFF;   
        --highlight-color:    #F6DC90;
        --info-color:         #5B9ED5;
        --success-color:      #54A468;
        --warning-color:      #FB6762;
    `;
  }

  output += `
  }`;

  output += ` 
      @media all and (min-width: 56.25em) {
        :root {
          --navbar-height: ${params.navbarHeight};
        }
      } 
  `;

  if (params.colorScheme === 'auto') {
    output += ` 
      @media (prefers-color-scheme: dark) {
        :root {                
          --white:              #FFFFFF;
          --black:              #1e1e1e;
          --helper:             #1e1e1e;
          --dark:               #CECBCB;
          --gray:               #9D9D9D;
          --light:              #373737;
          --lighter:            #1e1e1e;
          --page-bg:            #181818; 
          --color:              ${params.primaryDarkColor};   
          --text-color:         #BFBFBF;
          --headings-color:     #EEEDED;
          --link-color:         #EEEDED;
          --link-color-hover:   ${params.primaryDarkColor};    
          --nav-link-color:     rgba(255,255,255,1);
          --nav-link-color-hover: rgba(255,255,255,.7);  
          --logo-color:         #FFFFFF;   
          --highlight-color:    #F6DC90;
          --info-color:         #5B9ED5;
          --success-color:      #54A468;
          --warning-color:      #FB6762;
        }        
      }
    `;
  }

  return output;
}

module.exports = generateThemeVariables;