/*
 * Custom function used to generate the output of the override.css file
 */

var generateOverride = function (params) {
    let output = '';

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

    if (params.pageWidth !== '42rem') {
        output += `
        .wrapper {
               max-width: ${params.pageWidth};
        }

        .feed__image {
               max-width: calc(${params.pageWidth} + 20%);
        }

        @media all and (min-width: 56.25em) {
               .post__image--wide > img {
                     width: calc(${params.pageWidth} + 20%);
               }
        }`;
    }

    if (params.textColor !== '#17181E') {
        output += `
        body,
        blockquote::before,
        pre > code {
               color: ${params.textColor};
        }`;
    }

    if (params.headingColor !== '#17181E' || params.fontH1Transform !== 'none') {
        output += `
        h1,
        h2,
        h3,
        h4,
        h5,
        h6 {
               color: ${params.headingColor};              
               text-transform: ${params.fontH1Transform};  
        }

        .dropcap::first-letter{
               color: ${params.headingColor}; 
        }

        hr::before {
               color: ${params.headingColor};

        }`;
    }

    if (params.linkColor !== '#D73A42') {
        output += `
        a,
        .invert:hover,
        .invert:active,
        .invert:focus {
               color: ${params.linkColor};
        }`;
    }

    if (params.linkHoverColor !== '#17181E') {
        output += `
        a:hover,
        a:active,
        a:focus {
               color: ${params.linkHoverColor};
        }

        .invert {
               color: ${params.linkHoverColor};
        }`;
    }

    if (params.primaryColor !== '#D73A42') {
        output += `
        ::-moz-selection {
               background: ${params.primaryColor};
        }

        ::selection {
               background: ${params.primaryColor};
        }

        [type=text]:focus,
        [type=url]:focus,
        [type=tel]:focus,
        [type=number]:focus,
        [type=email]:focus,
        [type=search]:focus,
        textarea:focus,
        select:focus,
        select[multiple]:focus {
               border-color: ${params.primaryColor};
        }

        input[type=checkbox]:checked + label:before{
               background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 11 8'%3e%3cpolygon points='9.53 0 4.4 5.09 1.47 2.18 0 3.64 2.93 6.54 4.4 8 5.87 6.54 11 1.46 9.53 0' fill='${params.primaryColor.replace('#', '%23')}'/%3e%3c/svg%3e");
        }

        input[type=radio]:checked + label:before {
               background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3e%3ccircle cx='4' cy='4' r='4' fill='${params.primaryColor.replace('#', '%23')}'/%3e%3c/svg%3e");
        }

        code {
               color: ${params.primaryColor};

        }`;
    }

    if (params.primaryColor) {
        output += `
        .cookie-popup,
        .cookie-popup__save {
               background: ${params.primaryColor};      
        }`;
    }

    if (params.buttonBg !== '#17181E' || params.buttonColor !== '#FFFFFF') {
        output += `
        .btn,
        [type=button],
        [type=submit],
        button {
               background: ${params.buttonBg};
               border-color: ${params.buttonBg};
               color: ${params.buttonColor};
        }`;
    }
    
    
    if (params.logoColor !== '#FFFFFF') {
        output += `
        .logo {
               color: ${params.logoColor} !important;
        }`;
    }

    if(params.backgroundMenu !== '#17181E') {
        output += `
         .top.is-visible  {
               background: ${params.backgroundMenu};  
         } 

         .navbar .navbar__toggle {
               background: ${params.backgroundMenu};
        }`;
    }

    if (params.linkColorMenu !== '#FFFFFF') {
        output += `
        .navbar .navbar__menu li a,
        .navbar .navbar__menu li span[aria-haspopup="true"] {
               color: ${params.linkColorMenu};
        }

        .navbar .navbar__menu li span {
               color: ${params.linkColorMenu};
        
        }`;
    }

    if (params.linkHoverColorMenu !== 'rgba(255, 255, 255, 0.7)') {
        output += `
        .navbar .navbar__menu li a:active,
        .navbar .navbar__menu li a:focus,
        .navbar .navbar__menu li a:hover,
        .navbar .navbar__menu li span[aria-haspopup="true"]:active,
        .navbar .navbar__menu li span[aria-haspopup="true"]:focus,
        .navbar .navbar__menu li span[aria-haspopup="true"]:hover   {
               color: ${params.linkHoverColorMenu};
        }      

        .navbar .navbar__menu > li:hover > a,
        .navbar .navbar__menu > li:hover > span[aria-haspopup="true"] {
               color: ${params.linkHoverColorMenu};  
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
    
    if(params.submenuBg !== '#17181E') {
        output += `
         .navbar .navbar__submenu  {
               background: ${params.submenuBg};             
        }`;
    }
    
    if(params.submenuLinkColor !== 'rgba(255, 255, 255, 0.7)') {
        output += `
         .navbar .navbar__submenu li a,
         .navbar .navbar__submenu li span[aria-haspopup="true"] {
               color: ${params.submenuLinkColor} !important;  
         }

         .navbar .navbar__submenu li span {
               color: ${params.submenuLinkColor} !important; 
        }`;
    }
    
    if(params.submenuLinkHoverColor !== '#FFFFFF' || params.submenuLinkHoverBgMenu !== 'rgba(255, 255, 255, 0.05)') {
        output += `
         .navbar .navbar__submenu li a:active,
         .navbar .navbar__submenu li a:focus,
         .navbar .navbar__submenu li a:hover,
         .navbar .navbar__submenu li span[aria-haspopup="true"]:active,
         .navbar .navbar__submenu li span[aria-haspopup="true"]:focus,
         .navbar .navbar__submenu li span[aria-haspopup="true"]:hover {
               background: ${params.submenuLinkHoverBgMenu};     
               color: ${params.submenuLinkHoverColor} !important;    
         }

         .navbar .navbar__submenu li:hover > a,
         .navbar .navbar__submenu li:hover > span[aria-haspopup="true"] {
               color: ${params.submenuLinkHoverColor} !important;  
        }`;
    }

    if (params.heightHero !== '80vh') {
        output += `
        .hero {
              height: ${params.heightHero}        
        }`;
    }

    if (params.heroBackground !== '#17181E') {
        output += `
        .hero {
               background: ${params.heroBackground};
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

    if (params.heroHeadingColor !== '#FFFFFF') {
        output += `
        .hero__content h1 {
               color: ${params.heroHeadingColor};
        }`;
    }

    if (params.heroTextColor !== 'rgba(255, 255, 255, 0.75)') {
        output += `
        .hero__content {
               color: ${params.heroTextColor};
        }`;
    }

    if (params.heroLink !== '#FFFFFF') {
        output += `
        .hero__content a {
               color: ${params.heroLink};
        }`;
    }

    if (params.heroLinkHover !== 'rgba(255, 255, 255, 0.75)') {
        output += `
        .hero__content {
               color: ${params.heroLinkHover};
        }`;
    }

    if (params.heroBorderColor !== 'rgba(255, 255, 255, 0.3)') {
        output += `
        .post__meta--author {
               border-color: ${params.heroBorderColor};        
        }`;
    }
    
    if (params.footerBg !== '#17181E') {
        output += `
        .footer {
               background: ${params.footerBg};
        }`;
    }
    
    if (params.footerTextColor !== '#747577') {
        output += `
        .footer__copyright {
               color: ${params.footerTextColor};
        }`;
    }
    
    if (params.footerLinkColor !== '#FFFFFF') {
        output += `
        .footer a {
               color: ${params.footerLinkColor};
        }`;
    }
    
    if (params.footerLinkHoverColor !== 'rgba(255, 255, 255, 0.7)') {
        output += `
        .footer a:hover {
               color: ${params.footerLinkHoverColor};
        }`;
    }
    
    if (params.footerIconColor !== '#FFFFFF') {
        output += `
        .footer__social svg {
               fill: ${params.footerIconColor};
        }`;
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

    if(params.lazyLoad) {
        if(params.lazyLoadEffect !== 'blur') {
            output += ` 
            .lazyload,
            .lazyloading {
               opacity: 0;
            }
            .lazyloaded {
               opacity: 1;
               transition: opacity 1s cubic-bezier(0.215, 0.61, 0.355, 1); 
            }`;    	 
        }

        if (params.lazyLoadEffect === 'blur') {
            output += ` 
            .lazyload,
            .lazyloading {
               -webkit-filter: blur(5px);
               filter: blur(5px);
               transition: filter 400ms, -webkit-filter 400ms;
            }
            .lazyloaded {
               -webkit-filter: blur(0);
               filter: blur(0);
            }`;
        }
    }
    return output;
}

module.exports = generateOverride;
