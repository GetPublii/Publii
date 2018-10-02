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

if(params.textColor !== '#4e5360') {
        output += `
body {
        color: ${params.textColor};
}
.card {
       color: ${params.textColor};

 }`;
}

if(params.linkColor !== '#D6496C') {
        output += `
a {
      color: ${params.linkColor};  
}
.category__header > h2 a:hover {
      color: ${params.linkColor};  
}
.category__header > h2 a:active {
      color: ${params.linkColor};  
}

category__header > h2 a:focus {
      color: ${params.linkColor};  
}

.post__bio-text > h3 a:hover {
      color: ${params.linkColor}; 
}

.post__bio-text > h3 a:active {
      color: ${params.linkColor}; 
}

.post__bio-text > h3 a:focus {
      color: ${params.linkColor}; 
 }`;
}

if(params.linkHoverColor !== '#4e5360') {
        output += `
a:hover,
a:active,
a:focus {
        color: ${params.linkHoverColor};
}
.category__header > h2 a {
        color: ${params.linkHoverColor};
}
.slider__category:hover {
      color: ${params.linkHoverColor}; 
}
.slider__category:active {
      color: ${params.linkHoverColor}; 
}
.slider__category:focus {
      color: ${params.linkHoverColor};
  }`;
}
	
if(params.headingColor !== '#4e5360') {
        output += `
h1,
h2,
h3,
h4,
h5,
h6 {
        color: ${params.headingColor};
}

blockquote cite {
        color: ${params.headingColor};
}
.logo {
        color: ${params.headingColor};
}
 .slider__txtwrap:before {
        border-color: ${params.headingColor};
}
.slider__category:after {
        border-color: ${params.headingColor};

 }`;
}


if(params.primaryColor !== '#D6496C') {
        output += `
blockquote {
       border-color: ${params.primaryColor};
}

.btn:hover, [type=button]:hover,
[type=submit]:hover,
button:hover, .btn:focus, [type=button]:focus,
[type=submit]:focus,
button:focus { 
       background: ${params.primaryColor};
}
.btn:active, [type=button]:active,
[type=submit]:active,
button:active {
       background: ${params.primaryColor};
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

input[type=checkbox]:checked + label:before{
       background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 11 8'%3e%3cpolygon points='9.53 0 4.4 5.09 1.47 2.18 0 3.64 2.93 6.54 4.4 8 5.87 6.54 11 1.46 9.53 0' fill='${params.primaryColor.replace('#', '%23')}'/%3e%3c/svg%3e");
}
input[type=radio]:checked + label:before {
       background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3e%3ccircle cx='4' cy='4' r='4' fill='${params.primaryColor.replace('#', '%23')}'/%3e%3c/svg%3e"); 
}
select[multiple]:focus {
       border-color: ${params.primaryColor};
}
.pagination__prev:after, .pagination__next:after {
       background: ${params.primaryColor};

  }`;
}
    
if(params.primaryColor) {
        output += `
.cookie-popup,
.cookie-popup__save {
       background: ${params.primaryColor};      
  }`;    	 
}
	
if(params.secondaryColor !== '#4e5360') {
        output += `

.pagination__prev, .pagination__next {
       background: ${params.secondaryColor};
}
blockquote cite {
       color: ${params.secondaryColor};
  }`;
}

if(params.postPageWidth !== '52rem') {
        output += `
@media all and (min-width: 56.25em) {
.category {  
       max-width: ${params.postPageWidth};
  }
}
@media all and (min-width: 56.25em) {
.post {  
      max-width: ${params.postPageWidth};
   }
 }
@media all and (min-width: 56.25em) {
.tank {   
      max-width: ${params.postPageWidth};
  }
}
@media all and (min-width: 56.25em) {
.tank__inner--with-aside {  
    max-width: ${params.postPageWidth};   
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

if(params.linkColorMenu !== '#4e5360') {
        output += `
.navbar__menu li a,
.navbar__menu li span {
       color: ${params.linkColorMenu};
  }`;
}

if(params.linkHoverColorMenu !== '#D6496C') {
        output += `
.navbar__menu li a:hover:not(span),
.navbar__menu li span:hover:not(span){
       color: ${params.linkHoverColorMenu};
  }`;
}
	
	
if(params.pageBodyBorder !== '3') {
        output += `

@media all and (min-width: 56.25em) {
 .container {
       padding: 0 ${params.pageBodyBorder}rem;
  }
}
.container > header {
       height: ${params.pageBodyBorder}rem;
}
@media all and (min-width: 56.25em) {
.container > header {    
       width: calc(100% - ${params.pageBodyBorder}rem * 2); 
  }
}
main {
	  padding-top: ${params.pageBodyBorder}rem;
}
.hero--overlay {
      top: calc(${params.pageBodyBorder}rem + 3rem);
}
@media all and (min-width: 56.25em) {
.hero--overlay {
      left: calc(${params.pageBodyBorder}rem + 3rem);
  }
}
.portfolio {
      margin-bottom: ${params.pageBodyBorder}rem;
}
@media all and (min-width: 37.5em) { 
.portfolio > article:nth-child(6n-5), .portfolio > article:nth-child(6n-2) {
       height: calc(100vh - ${params.pageBodyBorder}rem * 2);
 }
 .portfolio > article:nth-child(6n-5) .card__image > img, .portfolio > article:nth-child(6n-2) .card__image > img {
       height: calc(100vh - ${params.pageBodyBorder}rem * 2);
  } 
}
@media all and (max-width: 74.9375em) {
.portfolio--gutter {
       margin: -0.5rem -0.5rem calc(${params.pageBodyBorder}rem - 0.5rem);
 }
 .portfolio--gutter .card {
       margin: 0.5rem;
 }
 .portfolio--gutter .card__image > img {
       height: calc((100vh - ${params.pageBodyBorder}rem * 2) / 2 - 0.5rem);
  }
}
@media all and (min-width: 37.5em) and (max-width: 74.9375em) {
.portfolio--gutter > article:nth-child(6n-5), .portfolio--gutter > article:nth-child(6n-2) {
       height: calc((100vh - ${params.pageBodyBorder}rem * 2) + 1rem);
  }
}
@media all and (min-width: 75em) {
 .portfolio--gutter {
       margin: -1rem -1rem calc(${params.pageBodyBorder}rem - 1rem);
 }
.portfolio--gutter .card__image > img {
       height: calc((100vh - ${params.pageBodyBorder}rem * 2) / 2 - 1rem);
  }
}
@media all and (min-width: 75em) {
.portfolio--gutter > article:nth-child(6n-5), .portfolio--gutter > article:nth-child(6n-2) {
       height: calc((100vh - ${params.pageBodyBorder}rem * 2) + 2rem);
  }
}
.card__image > img {
     height: calc((100vh - ${params.pageBodyBorder}rem * 2) / 2);
}
@media all and (min-width: 56.25em) {
 .category {
       margin-bottom: calc(${params.pageBodyBorder}rem - 1rem);   
  }
}
@media all and (min-width: 56.25em) {
 .post {
       margin-bottom: ${params.pageBodyBorder}rem;
  
  }
}
@media all and (min-width: 56.25em) {
 .post__image--full > img {
       width: calc(100% - ${params.pageBodyBorder}rem * 2);
  }
}
@media all and (min-width: 56.25em) {
 .post-nav {    
       padding: calc(${params.pageBodyBorder}rem * 2) ${params.pageBodyBorder}rem;
       width: calc(100% - ${params.pageBodyBorder}rem * 2);
  }
}

@media all and (max-width: 56.1875em) {
 .footer {  
       margin-top: ${params.pageBodyBorder}rem;
       padding: calc(${params.pageBodyBorder}rem / 2) 0;   
  }
}
@media all and (min-width: 56.25em) {
 .footer {
       bottom: ${params.pageBodyBorder}rem;  
       width: calc(100% - ${params.pageBodyBorder}rem * 2);
  }
}
@media all and (min-width: 56.25em) {
 .footer__social {  
       left: calc(-${params.pageBodyBorder}rem / 2 - 0.44444rem);
  }
}
@media all and (min-width: 56.25em) {
.footer__copyright {   
    right: calc(-${params.pageBodyBorder}rem / 2 - 0.3rem);   
  }
}

@media all and (max-width: 56.1875em) {
 .navbar__menu {   
       top: ${params.pageBodyBorder}rem;
  }
}
.pagination__prev, .pagination__next { 
     height: ${params.pageBodyBorder}rem;
}
@media all and (min-width: 56.25em) {
.slider-dots--right {
    right: calc(-${params.pageBodyBorder}rem / 2 - 6px);   
  }
}
@media all and (min-width: 56.25em) {
.slider-dots--left {
    left: calc(-${params.pageBodyBorder}rem / 2 - 6px);   
  }
}
.slider__viewport {
     height: calc(100vh - ${params.pageBodyBorder}rem * 2);
}
.slider__down > img {
     height: calc(100vh - ${params.pageBodyBorder}rem * 2);
}
.slider__txt { 
     height: calc(100vh - ${params.pageBodyBorder}rem * 2);
  }
@media all and (min-width: 56.25em) {
.tank {
     margin-bottom: ${params.pageBodyBorder}rem;    
  }
}`;
}	
	
if(params.featuredImageHeight !== '100' || params.pageBodyBorder !== '3') {
        output += `
@media all and (min-width: 56.25em) {
 .post__featured-image > img {
       height: calc(${params.featuredImageHeight}vh - ${params.pageBodyBorder}rem * 2);    
    }
  }`;
}
	
if(params.featuredImageHeight !== '100') {
        output += `	
@media all and (min-width: 56.25em) {
.post-nav {   
      bottom: calc(100vh - ${params.featuredImageHeight}vh);   
    }
 }`;
}
	
if(params.gridImageOverlay !== 'rgba(255, 255, 255, 0.3)') {
        output += ` 
.card__image:before  {
      background: ${params.gridImageOverlay};    
  }`;    	 
}
	
if(params.gridImageScale !== 'rgba(255, 255, 255, 0.3)') {
        output += ` 
.card:hover .card__image img {
    -webkit-transform: scale(${params.gridImageScale});
      -ms-transform: scale(${params.gridImageScale});
          transform: scale(${params.gridImageScale}); 
  }`;    	 
}
if(params.sliderAnimationSpeed !== '500' || params.sliderAnimationType !== 'cubic-bezier(0, .99, .99, 1)') {
        output += `
.slider__down {  
    -webkit-transition-duration: ${params.sliderAnimationSpeed}ms;
      transition-duration: ${params.sliderAnimationSpeed}ms;
    -webkit-transition-timing-function: ${params.sliderAnimationType};
      transition-timing-function: ${params.sliderAnimationType}; 
}
.slider__up {
    -webkit-transition-duration: ${params.sliderAnimationSpeed}ms;
      transition-duration: ${params.sliderAnimationSpeed}ms;
    -webkit-transition-timing-function: ${params.sliderAnimationType};
      transition-timing-function: ${params.sliderAnimationType};
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
