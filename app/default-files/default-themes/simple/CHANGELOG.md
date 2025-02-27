# Changelog

## [3.1.2.0] - 2025-02-08
### Improved
- Enhanced post image styling (margins) and add blog index body class
### Removed
- Removed unnecessary onclick attribute from back to top button in footer

## [3.1.1.0] - 2025-01-21
### Improved
- Some UI improvements
### Fixed
- Resolved issue with horizontal scrollbar on Windows OS,
### Removed
- Removed unnecessary gallery CSS rule 

## [3.1.0.0] - 2024-12-10
### Removed
- Removed built-in gallery to support external gallery plugins

## [3.0.0.0] - 2024-07-07
### Added
- Added support for italic fonts 
- Redesigned the theme

## [2.9.0.0] - 2024-06-30
### Added
- Added support for Pages
- Added new typography options: now you can adjust letter spacing or line height for both body and heading elements.
- Added a new baseline option to defines a core vertical rhythm unit for consistent spacing across the website

### Improved
- Minor CSS enhancements

## [2.8.3.0] - 2023-11-03
### Fixed
- Resolved issue with missing the responsive thumbnails on the post page

## [2.8.2.0] - 2023-10-25
### Fixed
- Resolved checkIf function issue caused by parsing error in Handlebars, occurring when SocialSharing plugin was missing
### Updated
- Updated X Twitter icon

## [2.8.1.0] - 2023-10-21
### Fixed
- Fixed the CSS error related to the missing ‘gray-2’ CSS variable

## [2.8.0.0] - 2023-10-20
**Note:** The new features and enhancements require at least Publii version 0.43.1!
### Added
- Added a ‘customSocialSharing’ custom HTML position to support the Social Sharing plugin

## [2.7.0.0] - 2023-10-03
### Added
- Added more variable fonts
### Improved
- Made minor CSS improvements

## [2.6.2.0] - 2023-04-17
### Added
- Added option to disable tag counter on Tags page
### Improved
- Minor CSS enhancements

## [2.6.1.0] - 2023-04-03
### Changed
- Reorganized and renamed theme options to improve navigation and readability

## [2.6.0.0] - 2023-03-29
**Note:** The new features and enhancements require at least Publii version 0.42.x!
### Added
- Implemented support for new tag and author options
- Added support for new extended menu assignment options
- Removed AMP-related files
- Added the NoScript tag to handle images when JavaScript is disabled
### Improved
- Made minor CSS improvements

## [2.5.0.0] - 2022-07-07
**Note:** The new features and enhancements require at least Publii version 0.40.x!
### Added
- Added support for Search plugins
- Added a script to calculate the aspect ratio of the iframes automatically
- Added support for Emended Content Consent
- Updated menu script
- Updated supportedFeatures section

## [2.4.1.0] - 2022-03-20
### Adjusted
- Slight Dark mode CSS adjustment

## [2.4.0.0] - 2022-03-16
**Note:** The new features and enhancements require at least Publii version 0.39.x!
### Changed
- Changed how Google fonts are handled, from loading them from a CDN to hosting them locally
### Added
- Added Dark Mode (now it supports light, dark, and auto mode)
- Added support for Comment plugins
- Updated Facebook social icon
- Updated avatar code markup
- Changed the way the “Back to top” button works

## [2.3.3.0] - 2021-11-07
### Fixed
- Fixed Photoswipe script to open gallery image in the pop-up window directly by firing image URL
- Updated Disqus script (now uses an Intersection Observer to detect / load comment section)
- Updated menu script
### Improved
- Improved accessibility of the navigation menu
### Changed
- Changed the way CSS variables work in the theme (now uses theme-variables.js)
- Small CSS improvements

## [2.3.0.0] - 2020-09-25
**Note:** The new features and enhancements require Publii version 0.37.x!
### Added
- Added support for tags page
- Added support for tag featured image
- Added support for author featured image
- Added support for author website field
- Added supported features flags
- Added option to define the number of related posts
- Updated Disqus script

## [2.2.3.0] - 2020-06-16
### Updated
- Updated menu script to support the anchors in mobile view
### Fixed
- Fixed mobile menu styling

## [2.2.2.0] - 2020-06-04
### Added
- Added aria-label to the search input
### Fixed
- Fixed zoom/in/out gallery option
- Updated font.hbs file
- Fixed WhatsApp share button

## [2.2.1.0] - 2020-05-25
**Note:** Before installing, make sure you have installed Publii at least version 0.36.0! If you need to keep using Publii 0.35.3 you can always download the previous version of the theme from [here](https://cdn.getpublii.com/themes/simple_2.1.0.0.zip).
### Added
- Added support for „Enable Responsive Images” option
- Added support for native Lazy Loading
### Adjusted
- Typo adjustment
### Updated
- Updated Photoswipe gallery to 4.1.3 version
### Fixed
- Fixed gallery UI buttons behavior on hover
### Rewritten
- Rewritten to use CSS variables

## [2.1.0.0] - 2020-01-13
### Added
- Added Block editor support

## [2.0.4.0] - 2019-11-27
**Note:** Before installing, make sure you have installed Publii at least version 35.3
### Added
- Added support for better display of SVG images

## [2.0.3.0] - 2019-08-04
### Optimized
- Optimized image lazyload for the smoothest, fastest experience possible
### Fixed
- Fixed page scrolling when the mobile menu is opened (iOS only)
### Added
- Added WhatsApp share button

## [2.0.2.1] - 2019-05-25
### Fixed
- Fixed display of the image in the post content

## [2.0.2.0] - 2019-05-13
### Improved
- Improved the way the first menu level is displayed; now the menu items break down on the next line when it is needed
### Fixed
- Fixed the hero section by removing the space between the image and the right side of the browser window

## [2.0.1.0] - 2019-05-09
### Rewritten
- A minor redesign, with a rewritten code to make it more efficient
### Added
- An option for displaying a featured image on post list pages
- Overhauled menu system! New scripts, two mobile menu styles (Sidebar and overlay), and a reactive submenu that shifts position when it gets too close to the edge of the browser window
- Responsive iframes (for things like videos, maps etc…)
- No more jQuery; now Simple uses Vanilla scripts
- Expanded hero section controls
- New font selection options
- New ‘Back to Top’ option
- A new gallery style and optimized image lazyload for the smoothest, fastest experience possible

## [1.7.2.0] - 2019-03-28
### Added
- Added option to change the overlay of hero section; now it supports gradient or solid color

## [1.7.1.0] - 2019-03-25
### Removed
- If the menu is unassigned to any menu position, its HTML markup is no longer displayed
- Removed Google+ service due to its shutdown on April 2

## [1.7.0.0] - 2019-03-02
### Changed
- Gallery styling has been changed
### Centered
- Centered caption in a gallery lightbox
### Fixed
- Fixed pagination ordering
- Fixed Pinterest share button

## [1.6.1.0] - 2018-12-12
### Added
- Added support for a table of content
- Updated the lazysizes script to v. 1.4.5
- Added preload option to an image gallery
- jQuery JavaScript library is now served locally

## [1.6.0.0] - 2018-10-22
### Changed
- Changed the CSS style of the <hr> tag
- Moved share icons to the bottom of article
- Updated StumbleUpon share button, now it’s Mix.com
### Fixed
- Fixed the image logo, now it looks well on the mobile devices too
### Removed
- Removed the lazyload from the hero image to speed up its loading
