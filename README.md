# Publii - Static-Site CMS

[![GPLv3 license](https://img.shields.io/badge/License-GPLv3-blue.svg)](http://perso.crans.org/besson/LICENSE.html)
 [![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://GitHub.com/Naereen/StrapDown.js/graphs/commit-activity) [![Open Source Love svg1](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/ellerbrock/open-source-badges/)




[Publii](https://getpublii.com/) is a desktop-based CMS for Windows and Mac that makes creating static websites fast
and hassle-free, even for beginners.

**Current version: 0.27.4 (build 10902)**

## Why Publii?
Unlike static-site generators that are often unwieldy and difficult to use, Publii provides an
easy-to-understand UI much like server-based CMSs such as WordPress or Joomla!, where users
can create posts and other site content, and style their site using a variety of built-in themes and
options. Users can enjoy the benefits of a super-fast and secure static website, with all the
convenience that a CMS provides.

What makes Publii even more unique is that the app runs locally on your desktop rather
than on the site&#39;s server. Available for both Windows and Mac, once the app has been installed
you can create a site in minutes, even without internet access; since Publii is a desktop app you
can create, update and modify your site offline, then upload the site changes to your server at
the click of a button. Publii supports multiple upload options, including standard HTTP/HTTPS
servers, Netlify, Amazon S3, GitHub Pages and Google Cloud or SFTP.

## Installation
### Required Software

For app build you will need the following software installed:

* **node.js** (8.*)
* **npm (>= 5.*)**
* **python** (>= 2.5.0 && < 3.0.0)
* **electron** (in version used by Publii), **electron-packager**, **node-gyp** and **gulp** node.js modules installed globally

Only for Windows:

* `npm install --global --production windows-build-tools`

Only for macOS:

* Install XCode

### Build Process

In the root project directory run:

```sh
npm install
cd app
npm install
cd ..
npm run dev
```

When the files are compiled run:

```sh
gulp prepare-editor-css
```
Then create the **app/dist/vendor** catalog and copy the following catalogs to this newly created **vendor** catalog:

- app/src/helpers/vendor/jquery
- app/src/helpers/vendor/tinymce

Now you can run the Publii app:

```
npm run build
```
Please remember to have running the dev command in the second terminal process:

```
npm run dev
```

It will allows you to refresh the app with changes without app restart - just click `Ctrl+R` shortcut to refresh the app.

## Getting Started
You can learn more about getting started in our [User documentation](https://getpublii.com/docs/) or [Developer documentation](https://getpublii.com/dev/).
If you have any questions or suggestions, or just need some help with using Publii, you can
visit our [Community Hub](https://publii.ticksy.com) or follow us on [Twitter](https://twitter.com/GetPublii)

### Learn More

* [User docs](https://getpublii.com/docs/)
* [Developer docs](https://getpublii.com/dev/)
* [Wiki](https://github.com/GetPublii/Publii/wiki/)
* [Issues](https://github.com/GetPublii/Publii/issues/)
* [Community forum](https://publii.ticksy.com)

## License
Copyright (c) 2018 TidyCustoms. General Public License v3.0, read [LICENSE](https://getpublii.com/license.html) for details.
