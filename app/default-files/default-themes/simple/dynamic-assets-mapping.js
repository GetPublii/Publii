/*
 * Generate  dynamic assets
 */

module.exports = function (themeConfig) {
   let fontBody = themeConfig.customConfig['fontBody'];
   let fontHeadings = themeConfig.customConfig['fontHeadings'];

   return [
      '/fonts/' + fontBody + '/' + fontBody + '.woff2', 
      '/fonts/' + fontHeadings + '/' + fontHeadings + '.woff2'
   ];
};
