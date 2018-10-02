/*
 * Custom function used to generate the output of the override.css file
 */

var generateOverride = function (params) {
    let output = '';

    if(params.minFontSize !== '1.1' || params.maxFontSize !== '1.3') {
        output += `
        html {
          font-size: ${params.minFontSize}rem;
        }

        @media screen and (min-width: 20rem) {
          html {
               font-size: calc(${params.minFontSize}rem + (${params.maxFontSize} - ${params.minFontSize}) * ((100vw - 20rem) / 220));
          }
        }

        @media screen and (min-width: 240rem) {
          html {
               font-size: ${params.maxFontSize}rem;
            }
        }`;
    }
	 if(params.textColor !== '#2c2e35') {
        output += `
        body {
               color: ${params.textColor};
        }`;
    }

    if(params.headingColor !== '#2c2e35') {
        output += `
        h1,
        h2,
        h3,
        h4,
        h5,
        h6 {
               color: ${params.headingColor};
        }
        .box--gray > .box__title {
               color: ${params.headingColor};
        }`;
    }

    if(params.linkColor !== '#2c2e35') {
        output += `
        a {
               color: ${params.linkColor};
        }`;
    } 
	
    if(params.linkHoverColor !== '#448aff') {
        output += `
        a:hover,
        a:active,
        a:focus {
               color: ${params.linkHoverColor};
        }
        .post__entry a,
        .post__entry a:hover,
        .post__entry a:active,
        .post__entry a:focus {
               color: ${params.linkHoverColor};
        }
        .post__nav__link:hover h5 {
               color: ${params.linkHoverColor};
        }
        .footer__nav-item > a:hover,
        .footer__nav-item > a:active,
        .footer__nav-item > a:focus {
               color: ${params.linkHoverColor}; 
        }`;
    }
	
	if(params.primaryColor !== '#448aff') {
        output += `
        .topbar {
               background: ${params.primaryColor};
        }
        .btn,
        [type=button],
        [type=submit],
        button {
               background: ${params.primaryColor};
               border-color: ${params.primaryColor};
        }   
        [type=text]:focus,
        [type=url]:focus,
        [type=tel]:focus,
        [type=number]:focus,
        [type=email]:focus,
        [type=search]:focus,
        textarea:focus,
        select:focus {
               -webkit-box-shadow: inset 0 0 2px ${params.primaryColor};
               box-shadow: inset 0 0 2px ${params.primaryColor};
        }
        input[type=checkbox]:checked + label:before{  
               background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 11 8'%3e%3cpolygon points='9.53 0 4.4 5.09 1.47 2.18 0 3.64 2.93 6.54 4.4 8 5.87 6.54 11 1.46 9.53 0' fill='${params.primaryColor.replace('#', '%23')}'/%3e%3c/svg%3e");
         }
        input[type=radio]:checked + label:before {
               background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3e%3ccircle cx='4' cy='4' r='4' fill='${params.primaryColor.replace('#', '%23')}'/%3e%3c/svg%3e"); 
        }
        select[multiple]:focus {
               border-color: ${params.primaryColor};  
        }
        .u-comment-count {
               background: ${params.primaryColor};
        } 
        .u-comment-count:after {
               border-color: ${params.primaryColor} transparent transparent transparent;
        }
        .post__bio { 
               border-color: ${params.primaryColor}; 
        }`;
    }
    
    if(params.primaryColor) {
        output += `
        .cookie-popup,
        .cookie-popup__save {
               background: ${params.primaryColor};      
        }`;    	 
    }

    if(params.mainWidth !== '46rem' || params.sidebarWidth !== '17rem') {
        output += `
        .topbar__inner {
               max-width: calc(${params.mainWidth} + ${params.sidebarWidth} + 3.85714rem + 1vw);
        }
        @media all and (min-width: 56.25em) {
           .content {
               grid-template-columns: 1fr minmax(auto, ${params.mainWidth}) calc(${params.sidebarWidth} + 1.28571rem + 0.5vw) 1fr;
           }
        }`;
    }

    if(params.submenu === 'custom') {
        output += `
        @media all and (min-width: 56.25em) {
           .navbar__submenu  {
               width: ${params.submenuWidth}rem;
           }
        }`;
    }

    if(params.linkColorMenu !== '#ffffff') {
        output += `
        .navbar__menu li a,
        .navbar__menu li span {
               color: ${params.linkColorMenu};
        }`;
    }

    if(params.linkHoverColorMenu !== '#ffffff') {
        output += `
        .navbar__menu li a:hover:not(span),
        .navbar__menu li span:hover:not(span) {
               color: ${params.linkHoverColorMenu};
        }`;
    }
    if(params.galleryItemGap !== '0.51429rem') {
        output += `   
       .gallery__item {
               padding: ${params.galleryItemGap}; 
    } 
       .gallery {   
               margin: calc(1.54286rem + 1vw) -${params.galleryItemGap}; 
       }`;    	 
    }	
	
    if(params.lazyLoad) {
	 if(params.lazyLoadEffect === 'fadein') {
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
        
	 if(params.lazyLoadEffect === 'blur') {
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
        
	 if(params.lazyLoadEffect === 'lqip') {
        output += ` 
        .lazyload {
             opacity: 0;
        }
        .lazyloading {
             opacity: 1;
             transition: opacity 300ms;
             background: #f8f8f8;
          }`;    	 
        }
	 }	
   
    return output;
}

module.exports = generateOverride;
