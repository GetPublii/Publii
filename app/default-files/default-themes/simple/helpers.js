/*
 * Custom theme helpers for Handlebars.js
 */

let themeHelpers = {
    lazyLoadForContentImages: function(postText, lazyLoadEffect = '') {
        let modifiedPostText = postText;
        // Select all images from the content
        modifiedPostText = modifiedPostText.replace(/<img[a-zA-Z0-9\s\"\'\=\-]*?src="(.*?)".*?>/gmi, function(match, url) {
            if (match.indexOf('data-is-external-image="true"') > -1) {
                return match;
            }  
            
             if (match.indexOf('width="') > -1 && match.indexOf('height="') > -1) {
                let imgWidth = match.match(/width="(.*?)"/);
                let imgHeight = match.match(/height="(.*?)"/);

                if (imgWidth && imgWidth[1]) {
                    imgWidth = parseInt(imgWidth[1], 10);
                } else {
                    imgWidth = NaN;
                }

                if (imgHeight && imgHeight[1]) {
                    imgHeight = parseInt(imgHeight[1], 10);
                } else {
                    imgHeight = NaN;
                }

                if (!isNaN(imgWidth) && !isNaN(imgHeight)) {
                    let aspectRatio = Number(imgWidth / imgHeight).toFixed(6);
                    match = match.replace('width="', ' data-aspectratio="' + aspectRatio + '" width="');
                }
            }
          
            // Create *-xs image path
            let image = url.split('.');

            if(
                url.indexOf('/gallery/') === -1 && (
                    image[image.length - 1] === 'jpeg' ||
                    image[image.length - 1] === 'jpg' ||
                    image[image.length - 1] === 'png' ||
                    image[image.length - 1] === 'JPEG' ||
                    image[image.length - 1] === 'JPG' ||
                    image[image.length - 1] === 'PNG'
                )
            ) {
                let xsImage = image.slice(0, image.length - 1).join('.') + '-xs.' + image[image.length - 1];
                xsImage = xsImage.split('/');
                xsImage[xsImage.length - 2] = xsImage[xsImage.length - 2] + '/responsive';
                xsImage = xsImage.join('/');
                
                if (lazyLoadEffect !== 'fadein') {
                    // Replace src attribute with *-xs image path
                    match = match.replace(/src=".*?"/gi, 'src="' + xsImage + '"');                     
                } else {
                    // Remove src attribute
                    match = match.replace('src="', 'data-src="');                       
                }                
                
                // change srcset to data-srcset
                match = match.replace('srcset="', 'data-srcset="');
                // replace sizes with data-sizes
                match = match.replace(/sizes=".*?"/i, 'data-sizes="auto"');               
                // add necessary CSS classes
                if(match.indexOf('class="') > -1) {
                    match = match.replace('class="', 'class="lazyload ');
                } else {
                    match = match.replace('<img', '<img class="lazyload"');
                }
            }
            // return modified <img> tag
            return match;
        });           
                   
        // Select all iframes from the content
        modifiedPostText = modifiedPostText.replace(/<iframe[a-zA-Z0-9\s\"\'\=\-]*?src="(.*?)".*?>/gmi, function(match, url) {
            // Replace src attribute with data-src            
            match = match.replace('src="', 'data-src="');
            // Add class attribute            
            match = match.replace('<iframe', '<iframe class="lazyload"');
            // return modified <iframe> tag
            return match;
        });
       
        // Select all videos from the content
        modifiedPostText = modifiedPostText.replace(/<video[a-zA-Z0-9\s\"\'\=\-]*?src="(.*?)".*?>/gmi, function(match, url) {
            // Replace src attribute with data-src            
            match = match.replace('src="', 'data-src="');
            // Add class attribute            
            match = match.replace('<video', '<video class="lazyload"');
            // return modified <video> tag
            return match;
        });


        return modifiedPostText;
    }
};

module.exports = themeHelpers;