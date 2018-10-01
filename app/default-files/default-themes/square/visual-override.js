/*
 * Custom function used to generate the output of the override.css file
 */

var generateOverride = function (params) {   
    let output = '';

  if(params.minFontSize !== '1' || params.maxFontSize !== '1.5') {
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

 if(params.textColor !== '#262626') {
        output += `
body {
        color: ${params.textColor};  
  }`;   
}
if(params.logoColor !== '#ffffff') {
        output += `
.logo {
        color: ${params.logoColor} !important;
  }`;    	 
}

if(params.headingColor !== '#000000') {
        output += `
h2,
h3,
h4,
h5,
h6,
.category > article a {
        color: ${params.headingColor}; 
  }`;    	 
}
if(params.linkColor !== '#a6752e') {
        output += `
a {
        color: ${params.linkColor};           
  }`;    	 
}
if(params.linkHoverColor !== '#a6752e') {
        output += `
a:hover,
a:active,
a:focus,
.category article a:hover,
.post__tag li > a:hover, 
.post__tag > dd > a:active,
.post__tag li > a:active,
.footer a:hover,
.cookie-bar > p > a:hover {
        color: ${params.linkHoverColor};
}
a:focus,
.post__tag li > a:focus {
        outline-color: ${params.linkHoverColor};
  }`;    	 
}

if(params.primaryColor !== '#a6752e') {
        output += `
blockquote,
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
.btn:hover, 
[type=button]:hover,
[type=submit]:hover,
button:hover, 
.btn:focus, 
[type=button]:focus,
[type=submit]:focus,
button:focus {
        border-color: ${params.primaryColor}; 
        color: ${params.primaryColor}; 
}
.btn:focus, 
[type=button]:focus,
[type=submit]:focus,
button:focus {
        outline-color: ${params.primaryColor}; 
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
	
if(params.backgroundMenu !== '#262626') {
        output += `
.menu {
        background: ${params.backgroundMenu}; 
  }`;    	 
}
if(params.linkColorMenu !== 'gray') {
        output += `
.menu > ul li,
.menu > ul li > a {
        color: ${params.linkColorMenu}; 
  }`;    	 
}
if(params.linkHoverColorMenu !== '#ffffff') {
        output += `
.menu > ul li > a:hover {
        color: ${params.linkHoverColorMenu}; 
  }`;    	 
}
if(params.heightHero !== '40vh') {
        output += `
.main__left,
.hero > img {
        min-height: ${params.heightHero}
  }`;    	 
}
if(params.textHeroColor !== '#ffffff') {
        output += `
.main__left > header {
        color: ${params.textHeroColor};
}
.main__left > header a,
.main__left > header a:hover,
.main__left > header a:active {
        color: ${params.textHeroColor}; 
  }`;    	 
}	
if(params.borderHero !== 'rgba(255, 255, 255, 0.7') {
        output += `
@media all and (min-width: 56.25em) {
    .top {
        border-bottom: 1px solid ${params.borderHero};
    }
  }`;    	 
}
if(params.backgroundHero !== '#000000') {
        output += `
.main__left {
        background: ${params.backgroundHero};
  }`;    	 
}
if(params.opacityHero !== '0.8') {
        output += `
.hero > img  {
        opacity: ${params.opacityHero}; 
  }`;    	 
}
if(params.imageEffects) {	
   if(params.imageFilter !== '#saturate' || params.imageFilterValue !== '0') {
        output += ` 
    .hero > img  {
     -webkit-filter: ${params.imageFilter}(${params.imageFilterValue});
       filter: ${params.imageFilter}(${params.imageFilterValue});
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
