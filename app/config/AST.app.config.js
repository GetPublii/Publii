let defaultResizeEngine = 'sharp';

if (process.platform === 'linux') {
  defaultResizeEngine = 'jimp';
}

const AstAppConfig = {
    backupsLocation: "",
    previewLocation: "",
    licenseAccepted: false,
    openDevToolsInMain: false,
    openDevToolsInPreview: false,
    resizeEngine: defaultResizeEngine,
    sitesLocation: "",
    startScreen: "",
    timeFormat: 12,
    closeEditorOnSave: true,
    wideScrollbars: false,
    showModificationDateAsColumn: false
};

module.exports = AstAppConfig;
