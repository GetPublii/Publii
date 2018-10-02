/*
 * Custom function used to generate the output of the override.css file
 */

var generateOverride = function (params) {   
    let output = '';

if(params.minFontSize !== '1' || params.maxFontSize !== '1.1') {
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

if(params.textColor !== '#343434') {
        output += `
body {
        color: ${params.textColor};  
  }`;   
}
	
if(params.headingColor !== '#343434') {
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
	
if(params.linkColor !== '#dd2c00') {
        output += `
a,
.inverse:hover,
.inverse:active,
.inverse:focus {
        color: ${params.linkColor}; 
}
input[type=checkbox]:checked + label:before{  
        background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 11 8'%3e%3cpolygon points='9.53 0 4.4 5.09 1.47 2.18 0 3.64 2.93 6.54 4.4 8 5.87 6.54 11 1.46 9.53 0' fill='${params.linkColor.replace('#', '%23')}'/%3e%3c/svg%3e");
 }
input[type=radio]:checked + label:before {
        background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3e%3ccircle cx='4' cy='4' r='4' fill='${params.linkColor.replace('#', '%23')}'/%3e%3c/svg%3e"); 
}
.hero__category a:hover,
.hero__category a:active,
.hero__category a:focus {
        color: ${params.linkColor}; 
}
.post__tag dd > a:hover,
.post__tag dt > a:hover {
        color: ${params.linkColor};
}
.post__tag dd > a:active,
.post__tag dt > a:active {
        color: ${params.linkColor};
}
.post__tag dd > a:focus,
.post__tag dt > a:focus {
        color: ${params.linkColor};
}
.post__nav__link:hover h5 {
        color: ${params.linkColor};
  }`;    	 
}
    
if(params.linkColor) {
        output += `
.cookie-popup,
.cookie-popup__save {
        background: ${params.linkColor};      
  }`;    	 
}       
	
if(params.linkHoverColor !== '#343434') {
        output += `
a:hover,
a:active,
a:focus {
        color: ${params.linkHoverColor}; 
}
.post__share .icon:hover {
       fill: ${params.primaryColor};
  }`;    	 
}

	
if(params.primaryColor !== '#343434') {
        output += `  

blockquote cite {
       color: ${params.primaryColor};
}

.btn, [type=button],
[type=submit],
button {
       border-color: ${params.primaryColor}; 
       color: ${params.primaryColor};  
}

.btn:hover, [type=button]:hover,
[type=submit]:hover,
button:hover, .btn:focus, [type=button]:focus,
[type=submit]:focus,
button:focus {
       border-color: ${params.primaryColor}; 
       background: ${params.primaryColor}; 
}

.btn:focus, [type=button]:focus,
[type=submit]:focus,
button:focus {
       outline-color: ${params.primaryColor};
}

.btn:active, [type=button]:active,
[type=submit]:active,
button:active {
       border-color: ${params.primaryColor};
}

.btn--inverse {
        background: ${params.primaryColor}; 
        border-color: ${params.primaryColor};      
}

.btn--inverse:hover, .btn--inverse:focus {
        border-color: ${params.primaryColor}; 
        color: ${params.primaryColor}; 
}

[type=text]:focus,
[type=url]:focus,
[type=tel]:focus,
[type=number]:focus,
[type=email]:focus,
[type=search]:focus,
textarea:focus,
select:focus {
       border-color: ${params.primaryColor};
}

select[multiple]:focus {
       border-color: ${params.primaryColor};
}

.logo {
       color: ${params.primaryColor} !important;
}
@media all and (min-width: 37.5em) {
 .card--featured:before { 
        background: ${params.primaryColor}; 
    }
}
.post__share {
       border-color: ${params.primaryColor};
}
.dropcap:first-letter {
        color: ${params.primaryColor}; 
  }`;    	 
}
	
if(params.pageWidth !== '83rem') {
        output += `   
.container {
       max-width: calc(${params.pageWidth} + 8%);   
  }
@media all and (min-width: 56.25em) {
 .container > header  {
       max-width: ${params.pageWidth}; 
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

if(params.submenuItemBg !== '#343434' || params.submenuItemColor !== '#ffffff') {
        output += `
@media all and (min-width: 56.25em) {
.navbar__submenu li:hover > a {
       background: ${params.submenuItemBg}; 
       color: ${params.submenuItemColor} !important;
    }
  }`;    	 
}
	
if(params.linkColorMenu !== '#343434') {
        output += `
.navbar__menu li {
       color: ${params.linkColorMenu}; 
}
.navbar__menu li a,
.navbar__menu li span {
       color: ${params.linkColorMenu}; 
  }`;    	 
}
	
if(params.linkHoverColorMenu !== '#dd2c00') {
        output += `
.navbar__menu li a:hover:not(span),
.navbar__menu li span:hover:not(span) {
       color: ${params.linkHoverColorMenu}; 
  }`;    	 
}	
	
if(params.showBgLettersText1 !== 'Q' || params.showBgLettersText1Position !== '20' || params.showBgLettersText2 !== 'F' || params.showBgLettersText2Position !== '80') {
           output += `
   @media all and (min-width: 37.5em) {
       .category--bg-letters:before {
           content: "${params.showBgLettersText1}";
           top: calc(${params.showBgLettersText1Position}rem + 3vw);
        }
       .category--bg-letters:after {
           content: "${params.showBgLettersText2}";
           top: calc(${params.showBgLettersText2Position}rem + 6vw);
        }
    }`;    	 
 }
 
if(params.cardsReverse === true || params.cardsTagReverse === true || params.cardsAuthorReverse === true) {
        output += `		
@media all and (min-width: 37.5em) {
  .category--reverse .card:nth-child(2n) {
    -webkit-flex-direction: row-reverse;
        -ms-flex-direction: row-reverse;
            flex-direction: row-reverse;
  }
  .category--reverse .card:nth-child(2n) .card__txt {
    margin: 0 -12% 0 0;
  }
  }`;    	 
}
if(params.heroTitle === true) {
        output += `	
@media all and (min-width: 37.5em) {  
.hero__txt > h1 {
    display: -webkit-box;
    overflow: hidden;
    text-overflow: ellipsis;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    }
  }`;    	 
}
	
if(params.galleryItemGap !== '0.53333rem') {
        output += `   
.gallery__item {
     padding: ${params.galleryItemGap}; 
} 
.gallery {   
     margin: calc(1.6rem + 1vw) -${params.galleryItemGap}; 
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
