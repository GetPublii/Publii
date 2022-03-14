/*
 * Custom function used to generate the output of the theme variables
 */

var generateThemeVariables = function (params) {
  let fontParams = {
    'system-ui': {
      name: 'SystemUI',
      family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"'
    },
    andadapro: {
      name: 'Andada Pro',
      family: '\'Andada Pro\', serif',
      weight: '400 840'
    },
    antonio: {
      name: 'Antonio',
      family: '\'Antonio\', sans-serif',
      weight: '100 700'
    },
    archivonarrow: {
      name: 'Archivo Narrow',
      family: '\'Archivo Narrow\', sans-serif',
      weight: '400 700'
    },
    asap: {
      name: 'Asap',
      family: '\'Asap\', sans-serif',
      weight: '400 700'
    },
    besley: {
      name: 'Besley',
      family: '\'Besley\', serif',
      weight: '400 900'
    },
    bigshouldersdisplay: {
      name: 'Big Shoulders Display',
      family: '\'Big Shoulders Display\', cursive',
      weight: '100 900'
    },
    bitter: {
      name: 'Bitter',
      family: '\'Bitter\', serif',
      weight: '100 900'
    },
    brygada1918: {
      name: 'Brygada 1918',
      family: '\'Brygada 1918\', serif',
      weight: '400 700'
    },
    cairo: {
      name: 'Cairo',
      family: '\'Cairo\', sans-serif',
      weight: '200 1000'
    },
    comfortaa: {
      name: 'Comfortaa',
      family: '\'Comfortaa\', cursive',
      weight: '300 700'
    },
    dancingscript: {
      name: 'Dancing Script',
      family: '\'Dancing Script\', cursive',
      weight: '400 700'
    },
    domine: {
      name: 'Domine',
      family: '\'Domine\', serif',
      weight: '400 700'
    },
    dosis: {
      name: 'Dosis',
      family: '\'Dosis\', sans-serif',
      weight: '200 800'
    },
    exo: {
      name: 'Exo',
      family: '\'Exo\', sans-serif',
      weight: '100 900'
    },
    faustina: {
      name: 'Faustina',
      family: '\'Faustina\', serif',
      weight: '300 800'
    },
    glory: {
      name: 'Glory',
      family: '\'Glory\', sans-serif',
      weight: '100 800'
    },
    gluten: {
      name: 'Gluten',
      family: '\'Gluten\', cursive',
      weight: '100 900'
    },
    heebo: {
      name: 'Heebo',
      family: '\'Heebo\', sans-serif',
      weight: '100 900'
    },
    jetbrainsmono: {
      name: 'JetBrains Mono',
      family: '\'JetBrains Mono\', monospace',
      weight: '100 800'
    },
    jura: {
      name: 'Jura',
      family: '\'Jura\', sans-serif',
      weight: '300 700'
    },
    karla: {
      name: 'Karla',
      family: '\'Karla\', sans-serif',
      weight: '200 800'
    },
    kreon: {
      name: 'Kreon',
      family: '\'Kreon\', serif',
      weight: '300 700'
    },
    lemonada: {
      name: 'Lemonada',
      family: '\'Lemonada\', cursive',
      weight: '300 700'
    },
    librefranklin: {
      name: 'Libre Franklin',
      family: '\'Libre Franklin\', sans-serif',
      weight: '100 900'
    },
    lora: {
      name: 'Lora',
      family: '\'Lora\', serif',
      weight: '400 700'
    },
    manuale: {
      name: 'Manuale',
      family: '\'Manuale\', serif',
      weight: '300 800'
    },
    manrope: {
      name: 'Manrope',
      family: '\'Manrope\', sans-serif',
      weight: '100 900'
    },
    merriweathersans: {
      name: 'Merriweather Sans',
      family: '\'Merriweather Sans\', sans-serif',
      weight: '300 800'
    },
    montserrat: {
      name: 'Montserrat',
      family: '\'Montserrat\', sans-serif',
      weight: '100 900'
    },
    nunito: {
      name: 'Nunito',
      family: '\'Nunito\', sans-serif',
      weight: '200 1000'
    },
    oswald: {
      name: 'Oswald',
      family: '\'Oswald\', sans-serif',
      weight: '200 700'
    },
    petrona: {
      name: 'Petrona',
      family: '\'Petrona\', serif',
      weight: '100 900'
    },
    playfairdisplay: {
      name: 'Playfair Display',
      family: '\'Playfair Display\', serif',
      weight: '400 900'
    },
    publicsans: {
      name: 'Public Sans',
      family: '\'Public Sans\', sans-serif',
      weight: '100 900'
    },
    quicksand: {
      name: 'Quicksand',
      family: '\'Quicksand\', sans-serif',
      weight: '300 700'
    },
    raleway: {
      name: 'Raleway',
      family: '\'Raleway\', sans-serif',
      weight: '100 900'
    },
    redhatmono: {
      name: 'Red Hat Mono',
      family: '\'Red Hat Mono\', monospace',
      weight: '300 700'
    },
    robotoslab: {
      name: 'Roboto Slab',
      family: '\'Roboto Slab\', serif',
      weight: '100 900'
    },
    rubik: {
      name: 'Rubik',
      family: '\'Rubik\', sans-serif',
      weight: '300 900'
    },
    ruda: {
      name: 'Ruda',
      family: '\'Ruda\', sans-serif',
      weight: '400 900'
    },
    smoochsans: {
      name: 'Smooch Sans',
      family: '\'Smooch Sans\', sans-serif',
      weight: '100 900'
    },
    sourcecodepro: {
      name: 'Source Code Pro',
      family: '\'Source Code Pro\', monospace',
      weight: '200 900'
    },
    spartan: {
      name: 'Spartan',
      family: '\'Spartan\', sans-serif',
      weight: '100 900'
    },
    urbanist: {
      name: 'Urbanist',
      family: '\'Urbanist\', sans-serif',
      weight: '100 900'
    },
    yanonekaffeesatz: {
      name: 'Yanone Kaffeesatz',
      family: '\'Yanone Kaffeesatz\', sans-serif',
      weight: '200 700'
    }
  };

  let fontBodyName = fontParams[params.fontBody]?.name;
  let fontBodyFamily = fontParams[params.fontBody]?.family;
  let fontBodyWeight = fontParams[params.fontBody]?.weight;

  let fontHeadingsName = fontParams[params.fontHeadings]?.name;
  let fontHeadingsFamily = fontParams[params.fontHeadings]?.family;
  let fontHeadingsWeight = fontParams[params.fontHeadings]?.weight;

  if (params.fontMenu === 'system-ui') {
    params.fontMenu = fontParams['system-ui'].family;
  }

  if (params.fontLogo === 'system-ui') {
    params.fontLogo = fontParams['system-ui'].family;
  }

  let output = '';

  if ((params.fontBody !== 'system-ui') && (params.fontBody !== params.fontHeadings)) {
    output += `             
      @font-face {
        font-family: '${fontBodyName}';
        src: url('../dynamic/fonts/${params.fontBody}/${params.fontBody}.woff2') format('woff2 supports variations'),
        url('../dynamic/fonts/${params.fontBody}/${params.fontBody}.woff2') format('woff2-variations');
        font-weight: ${fontBodyWeight};
        font-display: swap;
        font-style: normal;
      }
    `;
  }

  if (params.fontHeadings !== 'system-ui') {
    output += `             
      @font-face {
        font-family: '${fontHeadingsName}';
        src: url('../dynamic/fonts/${params.fontHeadings}/${params.fontHeadings}.woff2') format('woff2 supports variations'),
        url('../dynamic/fonts/${params.fontHeadings}/${params.fontHeadings}.woff2') format('woff2-variations');
        font-weight: ${fontHeadingsWeight};
        font-display: swap;
        font-style: normal;
      }
    `;
  }

  output += `    
    :root {
      --page-margin:        ${params.pageMargin};
      --entry-width:        ${params.pageWidth}; 
      --navbar-height:      4.4rem; 
      --body-font:          ${fontBodyFamily};
      --heading-font:       ${fontHeadingsFamily};
      --logo-font:          ${params.fontLogo};
      --menu-font:          ${params.fontMenu};
      --font-weight-normal: ${params.fontBodyWeight}; 
      --font-weight-bold:   ${params.fontBoldWeight}; 
      --headings-weight:    ${params.fontHeadignsWeight};
      --headings-transform: ${params.fontHeadingsTransform};
      --line-height:        ${params.lineHeight};
      --hero-height:        ${params.heightHero};
      --hero-bg:            ${params.heroBackground};
      --hero-heading-color: ${params.heroHeadingColor};
      --hero-text-color:    ${params.heroTextColor};
      --hero-link-color:    ${params.heroLink};
      --hero-link-color-hover: ${params.heroLinkHover};
      --hero-border-color:  ${params.heroBorderColor};                          
    `;

  if (params.colorScheme !== 'dark') {
    output += ` 
        --white:              #FFFFFF;
        --white-rgb:          255,255,255;
        --black:              #000000;
        --dark:               #17181E;
        --gray:               #747577;
        --light:              #E6E7EB;
        --lighter:            #F3F3F3;
        --page-bg:            #FFFFFF; 
        --section-bg:         #17181E;
        --color:              ${params.primaryColor};   
        --color-rgb:          ${params.primaryColor.replace('#', '').match(/[a-f0-9]{2,2}/gmi).map(n => parseInt(n, 16)).join(', ')};
        --text-color:         ${params.textColor}; 
        --headings-color:     ${params.headingColor};
        --link-color:         ${params.headingColor};
        --link-color-hover:   ${params.primaryColor};    
        --nav-link-color:     rgba(255,255,255,1);
        --nav-link-color-hover: rgba(255,255,255,.7);  
        --logo-color:         #FFFFFF;   
        --highlight-color:    #F6DC90;
        --highlight-color-rgb: 246,220,144;
        --info-color:         #A8D8FF;
        --info-color-rgb:     168,216,255;
        --success-color:      #A4E4B2;
        --success-color-rgb:  164,228,178;
        --warning-color:      #FFC1BF;
        --warning-color-rgb:  255,193,191;            
    `;
  }

  if (params.colorScheme === 'dark') {
    output += ` 
        --white:              #FFFFFF;
        --white-rgb:          255,255,255;
        --black:              #FFFFFF;
        --dark:               #CECBCB;
        --gray:               #9D9D9D;
        --light:              #373737;
        --lighter:            #1e1e1e;
        --page-bg:            #181818; 
        --section-bg:         #1e1e1e;
        --color:              ${params.primaryDarkColor};   
        --color-rgb:          ${params.primaryDarkColor.replace('#', '').match(/[a-f0-9]{2,2}/gmi).map(n => parseInt(n, 16)).join(', ')};
        --text-color:         ${params.textDarkColor}; 
        --headings-color:     ${params.headingDarkColor};
        --link-color:         ${params.headingDarkColor};
        --link-color-hover:   ${params.primaryDarkColor};       
        --nav-link-color:     rgba(255,255,255,1);
        --nav-link-color-hover: rgba(255,255,255,.7);  
        --logo-color:         #FFFFFF;  
        --highlight-color:    #F6DC90;
        --highlight-color-rgb: 24,24,24;
        --info-color:         #5B9ED5;
        --info-color-rgb:     24,24,24;
        --success-color:      #54A468;
        --success-color-rgb:  24,24,24;
        --warning-color:      #FB6762;
        --warning-color-rgb:  24,24,24;
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
          --white-rgb:          255,255,255;
          --black:              #FFFFFF;
          --dark:               #CECBCB;
          --gray:               #9D9D9D;
          --light:              #373737;
          --lighter:            #1e1e1e;
          --page-bg:            #181818; 
          --section-bg:         #1e1e1e;
          --color:              ${params.primaryDarkColor};   
          --color-rgb:          ${params.primaryDarkColor.replace('#', '').match(/[a-f0-9]{2,2}/gmi).map(n => parseInt(n, 16)).join(', ')};
          --text-color:         ${params.textDarkColor}; 
          --headings-color:     ${params.headingDarkColor};
          --link-color:         ${params.headingDarkColor};
          --link-color-hover:   ${params.primaryDarkColor};       
          --nav-link-color:     rgba(255,255,255,1);
          --nav-link-color-hover: rgba(255,255,255,.7);  
          --logo-color:         #FFFFFF;
          --highlight-color:    #F6DC90;
          --highlight-color-rgb: 24,24,24;
          --info-color:         #5B9ED5;
          --info-color-rgb:     24,24,24;
          --success-color:      #54A468;
          --success-color-rgb:  24,24,24;
          --warning-color:      #FB6762;
          --warning-color-rgb:  24,24,24;
        }        
      }
    `;
  }

  return output;
}

module.exports = generateThemeVariables;