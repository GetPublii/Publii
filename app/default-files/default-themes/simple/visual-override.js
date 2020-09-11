/*
 * Custom function used to generate the output of the override.css file
 */

var generateOverride = function (params) {
    let output = '';
    
      if (
        params.pageMargin !== '6vw' ||
        params.pageWidth !== '42rem' || 
        params.navbarHeight !== '4.4rem' || 
        params.lineHeight !== '1.7' || 
        params.fontNormalWeight !== '400' || 
        params.fontBoldWeight !== '700' || 
        params.fontHeadignsWeight !== '700' ||
        params.fontHeadingsTransform !== 'none' ||
        params.primaryColor !== '#D73A42' || 
        params.textColor !== '#17181E' || 
        params.headingColor !== '#17181E' ||      
        params.heightHero !== '80vh' ||
        params.heroBackground !== '#17181E' ||
        params.heroHeadingColor !== '#FFFFFF' ||
        params.heroTextColor !== 'rgba(255,255,255,0.75)' ||
        params.heroLink !== '#FFFFFF' ||
        params.heroLinkHover !== 'rgba(255,255,255,0.75)' ||
        params.heroBorderColor !== 'rgba(255,255,255,0.3)') {
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
           --gray-1:             #61666C;
           --gray-2:             #747577;
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
    } 
    
    if (params.minFontSize !== '1.1' || params.maxFontSize !== '1.2') {
        output += `
        html {
          font-size: ${params.minFontSize}rem;
        }

        @media screen and (min-width: 20rem) {
          html {
               font-size: calc(${params.minFontSize}rem + (${params.maxFontSize} - ${params.minFontSize}) * ((100vw - 20rem) / 50));
            }
        }

        @media screen and (min-width: 70rem) {
          html {
               font-size: ${params.maxFontSize}rem;
            }
        }`;
    }

    if (params.primaryColor !== '#D73A42') {
        output += `
      
        input[type=checkbox]:checked + label:before{
               background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 11 8'%3e%3cpolygon points='9.53 0 4.4 5.09 1.47 2.18 0 3.64 2.93 6.54 4.4 8 5.87 6.54 11 1.46 9.53 0' fill='${params.primaryColor.replace('#', '%23')}'/%3e%3c/svg%3e");
        }

        input[type=radio]:checked + label:before {
               background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3e%3ccircle cx='4' cy='4' r='4' fill='${params.primaryColor.replace('#', '%23')}'/%3e%3c/svg%3e");
        

        }`;
    }

    if (params.submenu === 'custom') {
        output += `
        .navbar .navbar__submenu {
               width: ${params.submenuWidth}px;     
        }
        .navbar .has-submenu .has-submenu:active > .navbar__submenu,
        .navbar .has-submenu .has-submenu:focus > .navbar__submenu,
        .navbar .has-submenu .has-submenu:hover > .navbar__submenu {
               left: ${params.submenuWidth}px;  
        }
        .navbar .has-submenu .has-submenu:active > .navbar__submenu.is-right-submenu,
        .navbar .has-submenu .has-submenu:focus > .navbar__submenu.is-right-submenu,
        .navbar .has-submenu .has-submenu:hover > .navbar__submenu.is-right-submenu {
               left: -${params.submenuWidth}px; 
        }`;
    }   

    if (params.heroOverlay === 'color') {
        if (params.heroOverlayColor) {
            output += `
            .hero__image--overlay::after { 
                  background: ${params.heroOverlayColor};
           }`;
        }
    }

    if (params.heroOverlay === 'gradient') {
        if (params.heroOverlayGradientDirection !== 'bottom' || params.heroOverlayGradient) {
            output += `
           .hero__image--overlay::after {              
                  background: linear-gradient(to ${params.heroOverlayGradientDirection}, transparent 0%, ${params.heroOverlayGradient} 100%);
           }`;
        }
    }

    if (params.galleryItemGap !== '0.28333rem') {
        output += `
        .gallery {
               margin: calc(1.7rem + 1vw) -${params.galleryItemGap};
        }
        .gallery__item {
               padding: ${params.galleryItemGap};
        }
        
        .gallery__item a::after {
               bottom: ${params.galleryItemGap};
               height: calc(100% - ${params.galleryItemGap} * 2);              
               left: ${params.galleryItemGap};
               right: ${params.galleryItemGap};
               top: ${params.galleryItemGap};
               width: calc(100% - ${params.galleryItemGap} * 2);  
        }`;
    }
    
    if(params.search) {
        output += ` 
         .search-page table { 
               border: none;
               margin: 0;
         }

         .search-page table td { 
               border: none;
               padding: 0;
         }

         .gsc-above-wrapper-area-container,
         .gsc-table-result {
               display: inline-table;
               margin-top: 0;
               white-space: normal;
         }

         .cse .gsc-control-cse, .gsc-control-cse {
               padding: 0 !important;
         }

         .gsc-thumbnail-inside,
         .gsc-url-top {
               padding: 0 !important;
         }

         .gsc-control-cse, .gsc-control-cse .gsc-table-result {
               font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif !important;  
               font-size: 0.8888rem !important;
         }

         .gs-title  {       
               font-weight: bold;
               height: auto !important; 
               margin-bottom: 0.53333rem;
               text-decoration: none !important; 
         }

         .gsc-result{
               border-bottom: 1px solid #E9E9E9 !important; 
               padding: calc(1.13332rem + .5vw) 0 !important; 
 
        }`;    	 
    }	

    if(params.galleryZoom !== true) {
        output += `   
        .pswp--zoom-allowed .pswp__img {
            cursor: default !important  
        }`;    	 
    }

    if(params.lazyLoadEffect === 'fadein') {
        output += ` 
         img[loading] {
               opacity: 0;
         }

         img.is-loaded {
               opacity: 1;
               transition: opacity 1s cubic-bezier(0.215, 0.61, 0.355, 1); 
         }`;    	 
    } 
        
  
    return output;
}

module.exports = generateOverride;
