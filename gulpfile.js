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
