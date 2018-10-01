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
    
	 if(params.textColor !== '#111111') {
        output += `
        body {
               color: ${params.textColor};  
        }`;   
	 }
	
	 if(params.headingColor !== '#111111') {
        output += `
        h1,
        h2,
        h3,
        h4,
        h5,
        h6,
        .inverse {
               color: ${params.headingColor};           
        }`;    	 
	 }
	
	 if(params.linkColor !== '#02bb80') {
        output += `
        a,
        .inverse:hover,
        .inverse:active,
        .inverse:focus,
        .post__tag li > a:hover {
               color: ${params.linkColor};           
        }`;    	 
	 }
	
	 if(params.linkHoverColor !== '#111111') {
        output += `
        a:hover,
        a:active,
        a:focus {
               color: ${params.linkHoverColor}; 
        }`;    	 
	 }

	
	 if(params.primaryColor !== '#02bb80') {
        output += `      
        blockquote,
        .btn:hover, [type=button]:hover,
        [type=submit]:hover,
        button:hover,
        .btn:active, [type=button]:active,
        [type=submit]:active,
        button:active,
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
        }`;    	 
	 }
    
	 if(params.primaryColor) {
        output += `
        .cookie-popup,
        .cookie-popup__save {
               background: ${params.primaryColor};      
        }`;    	 
	 }
    
	 if(params.pageWidth !== '48rem') {
        output += `   
        .container {
               max-width: calc(${params.pageWidth} + 8%);   
        }

        @media all and (min-width: 56.25em) {
                 .container > header.is-sticky {
                       max-width: ${params.pageWidth}; 
                 }
        }

        .search__input {  
               width: ${params.pageWidth};  
        }`;  	 
	 }	
	
	 if(params.backgroundMenu !== '#ffffff') {
        output += `
        .is-opened > ul {
               background: ${params.backgroundMenu}; 
        }
        @media all and (min-width: 56.25em) {
                .navbar__submenu,
                .navbar__submenu:after {
                       background: ${params.backgroundMenu};   
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
	 if(params.linkColorMenu !== '#111111') {
        output += `
        .navbar__menu li,
        .navbar__menu li a,
        .navbar__menu li span {
               color: ${params.linkColorMenu}; 
        }`;    	 
	 }
	
	 if(params.linkHoverColorMenu !== '#02bb80') {
        output += `
        .navbar__menu li a:hover:not(span),
        .navbar__menu li span:hover:not(span) {
               color: ${params.linkHoverColorMenu}; 
        }`;    	 
	 }

	 if(params.imageEffectsHover) {
	 if(params.imageFilterHover !== '#saturate' || params.imageFilterHoverValue !== '2' || params.imageZoom !=='1.05') {
        output += ` 
        .card__image img:hover {
               -webkit-filter: ${params.imageFilterHover}(${params.imageFilterHoverValue});
               filter: ${params.imageFilterHover}(${params.imageFilterHoverValue});
               -webkit-transform: scale(${params.imageZoom});
               -ms-transform: scale(${params.imageZoom});
               transform: scale(${params.imageZoom});
          }`;    	 
        }
	 }	
	
	 if(params.galleryItemGap !== '0.5rem') {
        output += `   
        .gallery__item {
               padding: ${params.galleryItemGap}; 
        } 
        .gallery {   
               margin: calc(1.5rem + 1vw) -${params.galleryItemGap}; 
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
               transition: opacity 2s cubic-bezier(0.215, 0.61, 0.355, 1); 
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
