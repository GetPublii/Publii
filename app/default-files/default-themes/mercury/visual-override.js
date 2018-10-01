/*
 * Custom function used to generate the output of the override.css file
 */

var generateOverride = function (params) {
    let output = '';

    if(params.minFontSize !== '1' || params.maxFontSize !== '1.2') {
        output += `
        html {
               font-size: ${params.minFontSize}rem;
        }

        @media screen and (min-width: 20rem) {
               html {
                   font-size: calc(${params.minFontSize}rem + (${params.maxFontSize} - ${params.minFontSize}) * ((100vw - 20rem) / 113));
               }
        }

        @media screen and (min-width: 133rem) {
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
        blockquote cite,
        .logo,
        .card__body,
        .inverse {
               color: ${params.headingColor};
        }`;
    }

    if(params.linkColor !== '#ff80ab') {
        output += `
        a,
        .post__entry a:hover,
        .post__tag li > a:hover,
        .post__tag li > a:active,
        .post__tag li > a:focus,
        .post__nav__prev:hover h5:before,
        .post__nav__next:hover h5:after,
        .inverse:hover,
        .inverse:active,
        .inverse:focus{
               color: ${params.linkColor};
        }
        .footer__social .icon:hover {
               fill: ${params.linkColor};
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


    if(params.primaryColor !== '#ff80ab' || params.secondaryColor !== '#111111') {
        output += `

        .btn, [type=button],
        [type=submit],
        button {
               background: ${params.primaryColor};
               border-color: ${params.primaryColor};
        }

        .btn:hover, [type=button]:hover,
        [type=submit]:hover,
        button:hover, .btn:focus, [type=button]:focus,
        [type=submit]:focus,
        button:focus {
               background: ${params.secondaryColor};
               border-color: ${params.secondaryColor};
        }

        .btn:focus, [type=button]:focus,
        [type=submit]:focus,
        button:focus {
               outline-color: ${params.secondaryColor};
        }

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

        .card--featured:before {
               background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 18 30'%3e%3cpath fill='${params.primaryColor.replace('#', '%23')}' d='M0,0H18V30L9,18.5,0,30Z'/%3e%3c/svg%3e ");
        }

        .post--featured .post__title:after {
               background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 18 30'%3e%3cpath fill='${params.primaryColor.replace('#', '%23')}' d='M0,0H18V30L9,18.5,0,30Z'/%3e%3c/svg%3e ");
        }

        input[type=checkbox]:checked + label:before{
               background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 11 8'%3e%3cpolygon points='9.53 0 4.4 5.09 1.47 2.18 0 3.64 2.93 6.54 4.4 8 5.87 6.54 11 1.46 9.53 0' fill='${params.primaryColor.replace('#', '%23')}'/%3e%3c/svg%3e");
        }

        input[type=radio]:checked + label:before {
               background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3e%3ccircle cx='4' cy='4' r='4' fill='${params.primaryColor.replace('#', '%23')}'/%3e%3c/svg%3e"); 
        }

        .tag-menu ul li > a {
               color: ${params.secondaryColor};
        }

        .cookie-bar {
               border-color: ${params.primaryColor};
        }

        @media all and (max-width: 56.1875em) {
               .has-submenu:after {
                   border-color: ${params.primaryColor};
               }
        }`;
    }

    if(params.primaryColor) {
        output += `
        .cookie-popup,
        .cookie-popup__save {
               background: ${params.primaryColor};      
    }`;    	 
    }

    if(params.pageWidth !== '66rem') {
        output += `
        .container {
               max-width: ${params.pageWidth};
        }
        @media all and (min-width: 56.25em) {
                .container > header {
                   max-width: calc(${params.pageWidth} - 8%);
                 }
        }

        .post__image--wide > img {
               width: calc(${params.pageWidth} - 8%);
        }
        .post__image--full > img {
               width: ${params.pageWidth};

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
        .navbar__menu li span{
               color: ${params.linkColorMenu};
        }`;
    }

    if(params.linkHoverColorMenu !== '#ff80ab') {
        output += `
        .navbar__menu li a:hover:not(span),
        .navbar__menu li span:hover:not(span) {
               color: ${params.linkHoverColorMenu};
        }`;
    }
    if(params.gridType === 'fitRows'){
        output += `
        .layout .card__header img {
               height: ${params.cardsHeight};
        }`;
    }
    if(params.cardsImgScale !== '1.3') {
        output += `
        .card:hover .card__header > img {
               -webkit-transform: scale(${params.cardsImgScale});
              transform: scale(${params.cardsImgScale});
         }`;
    }
	
    if(params.gridGutter !== '1rem') {
        output += `
        .layout {
               margin: -${params.gridGutter}rem;
        }
        .layout > .card {
               padding: ${params.gridGutter}rem;
         }`;	
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
