"use strict";

/*
 * Necessary plugins
 */
const gulp = require('gulp');
const sass = require('gulp-sass');
const exec = require('child_process').exec;
const fs = require('fs');
const electron = require('gulp-electron');
const winInstaller = require('electron-windows-installer');
const info = require('./app/package.json');

/*
 * Paths configuration
 */
const paths = {
    "frontend-js":      'app/js/front-end/',
    "backend-js":       'app/back-end/',
    "sass":             'app/src/scss/editor/',
    "css":              'app/dist/css/',
    "base":             'app/'
};

/*
 * Parse SASS into CSS
 */
gulp.task('prepare-editor-css', function() {
    gulp.src(paths.sass + 'editor.scss')
        .pipe(sass())
        .pipe(gulp.dest(paths['css']));

    gulp.src(paths.sass + 'editor-options.scss')
        .pipe(sass())
        .pipe(gulp.dest(paths['css']));
});

/*
 * Build
 */
gulp.task('build', function() {
    let buildData = JSON.parse(fs.readFileSync('app/back-end/builddata.json'));
    buildData.build += 1;
    buildData = JSON.stringify(buildData);
    fs.writeFileSync('app/back-end/builddata.json', buildData);

    exec('"./node_modules/.bin/electron" app/', function (err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
    });
});

/*
 * Packaging
 */

gulp.task('package', function() {
    gulp.src("")
        .pipe(electron({
            src: './app',
            packageJson: info,
            release: './dist',
            cache: './cache',
            version: 'v1.4.15',
            packaging: true,
            platforms: ['win32-ia32', 'darwin-x64'],
            platformResources: {
                darwin: {
                    CFBundleDisplayName: info.name,
                    CFBundleIdentifier: info.bundle,
                    CFBundleName: info.name,
                    CFBundleVersion: info.version
                },
                win: {
                    "version-string": info.version,
                    "file-version": info.version,
                    "product-version": info.version
                }
            }
        }))
        .pipe(gulp.dest(""));
});

/*
 * Creating Windows Installer
 */

gulp.task('create-win-installer', function(done) {
  winInstaller({
    appDirectory: './Publii-win32-x64',
    loadingGif: './app/src/assets/installation/loading.gif',
    outputDirectory: './release',
    exe: 'Publii.exe',
    name: 'Publii',
    setupExe: 'PubliiSetup.exe',
    title: 'Publii',
    owners: 'TidyCustoms',
    authors: 'TidyCustoms',
    iconUrl: 'https://tidycustoms.net/images/tidycustoms.ico',
    setupIcon: './app/src/assets/installation/icon.ico'
  }).then(done).catch(done);
});

/*
 * Creating Windows Installer for bleeding egde
 */

gulp.task('create-win-prerelease', function(done) {
    winInstaller({
        appDirectory: './Publii-win32-x64',
        loadingGif: './app/src/assets/installation/loading-prerelease.gif',
        outputDirectory: './release',
        exe: 'Publii.exe',
        name: 'Publii',
        setupExe: 'PubliiSetup.exe',
        title: 'Publii',
        owners: 'TidyCustoms',
        authors: 'TidyCustoms',
        iconUrl: 'https://tidycustoms.net/images/tidycustoms.ico',
        setupIcon: './app/src/assets/installation/icon.ico'
    }).then(done).catch(done);
});

/*
 * Creating macOS Installer
 */

gulp.task('create-mac-installer', function() {
    const createDMG = require('electron-installer-dmg');

    createDMG({
        appPath: './Publii-darwin-x64/Publii.app',
        name: 'Publii',
        icon: './app/src/assets/installation/volume.icns',
        overwrite: true
    }, function (err) {
        console.log(err)
    })
});

/*
 * Creating macOS Installer for bleeding edge
 */

gulp.task('create-mac-prerelease', function() {
    const createDMG = require('electron-installer-dmg');

    createDMG({
        appPath: './Publii-darwin-x64/Publii.app',
        name: 'Publii',
        icon: './app/src/assets/installation/volume-prerelease.icns',
        overwrite: true
    }, function (err) {
        console.log(err)
    });
});
