/*
 * Custom function used to generate the output of the theme variables
 */

var generateThemeVariables = function(params) {
   let output = '';

      output += ` 
         :root {
            --page-margin:        ${params.pageMargin};
            --entry-width:        ${params.pageWidth}; 
            --navbar-height:      4.4rem; 
            --line-height:        ${params.lineHeight}; 
            --font-weight-normal: ${params.fontNormalWeight}; 
            --font-weight-bold:   ${params.fontBoldWeight}; 
            --headings-weight:    ${params.fontHeadignsWeight};
            --headings-transform: ${params.fontHeadingsTransform};
            --white:              #FFFFFF;
            --white-rgb:          255,255,255;
            --black:              #000000;
            --dark:               #17181E;
            --gray:               #747577;
            --light:              #E6E7EB;
            --lighter:            #F3F3F3;
            --color:              ${params.primaryColor};   
            --color-rgb:          ${params.primaryColor.replace('#', '').match(/[a-f0-9]{2,2}/gmi).map(n => parseInt(n, 16)).join(', ')};
            --text-color:         ${params.textColor}; 
            --headings-color:     ${params.headingColor};      
            --logo-color:         #FFFFFF;
            --hero-height:        ${params.heightHero};
            --hero-bg:            ${params.heroBackground};
            --hero-heading-color: ${params.heroHeadingColor};
            --hero-text-color:    ${params.heroTextColor};
            --hero-link-color:    ${params.heroLink};
            --hero-link-color-hover: ${params.heroLinkHover};
            --hero-border-color:  ${params.heroBorderColor};   
         }
         
         @media all and (min-width: 56.25em) {
            :root {
               --navbar-height: ${params.navbarHeight};
            }
      }`;  

   return output;
}

module.exports = generateThemeVariables;