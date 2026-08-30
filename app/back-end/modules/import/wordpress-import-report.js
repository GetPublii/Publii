const fs = require('fs-extra');
const path = require('path');
const PathValidator = require('../../helpers/path-validator.js');

const { isValidDirSegment } = PathValidator;
const REPORT_FILE = 'import-report-wordpress.log';
const REPORT_SCHEMA_VERSION = 1;

class WordPressImportReport {
    constructor(appInstance) {
        this.app = appInstance;
    }

    validateSiteName(siteName) {
        if (!isValidDirSegment(siteName)) {
            return false;
        }

        let sitePath = path.join(this.app.sitesDir, siteName);

        try {
            return fs.existsSync(sitePath) && fs.statSync(sitePath).isDirectory();
        } catch (e) {
            return false;
        }
    }

    save(siteName, summary) {
        if (!summary || !summary.report || !this.validateSiteName(siteName)) {
            return false;
        }

        let logsDir = this.app.app.getPath('logs');
        let reportPath = path.join(logsDir, REPORT_FILE);
        let temporaryPath = reportPath + '.tmp';
        let siteConfig = this.app.sites && this.app.sites[siteName] ? this.app.sites[siteName] : {};
        let payload = {
            schemaVersion: REPORT_SCHEMA_VERSION,
            importer: 'wordpress',
            siteName,
            siteUUID: typeof siteConfig.uuid === 'string' ? siteConfig.uuid : '',
            generatedAt: summary.report.generatedAt || new Date().toISOString(),
            summary
        };

        try {
            fs.ensureDirSync(logsDir);
            fs.writeFileSync(temporaryPath, JSON.stringify(payload, null, 4), 'utf8');
            fs.moveSync(temporaryPath, reportPath, { overwrite: true });
            return true;
        } catch (e) {
            try {
                fs.removeSync(temporaryPath);
            } catch (removeError) {
                // The original write error is more useful to the caller.
            }

            return false;
        }
    }

    persistImportResult(siteName, data) {
        if (!data || data.status !== 'success' || !data.summary || !data.summary.report) {
            return false;
        }

        let reportSaved = this.save(siteName, data.summary);

        if (!reportSaved) {
            let warning = 'The WordPress import report could not be saved in the Publii logs directory.';

            if (!Array.isArray(data.summary.warnings)) {
                data.summary.warnings = [];
            }

            if (!Array.isArray(data.summary.report.warnings)) {
                data.summary.report.warnings = [];
            }

            data.summary.warnings.push(warning);
            data.summary.report.warnings.push(warning);
        }

        return reportSaved;
    }

    load(siteName) {
        if (!this.validateSiteName(siteName)) {
            return null;
        }

        let reportPath = path.join(this.app.app.getPath('logs'), REPORT_FILE);

        if (!fs.existsSync(reportPath)) {
            return null;
        }

        try {
            let payload = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
            let siteConfig = this.app.sites && this.app.sites[siteName] ? this.app.sites[siteName] : {};
            let currentSiteUUID = typeof siteConfig.uuid === 'string' ? siteConfig.uuid : '';

            if (!payload ||
                payload.schemaVersion !== REPORT_SCHEMA_VERSION ||
                payload.importer !== 'wordpress' ||
                payload.siteName !== siteName ||
                (currentSiteUUID && payload.siteUUID !== currentSiteUUID) ||
                !payload.summary ||
                !payload.summary.report) {
                return null;
            }

            return payload;
        } catch (e) {
            return null;
        }
    }
}

WordPressImportReport.FILE_NAME = REPORT_FILE;
WordPressImportReport.SCHEMA_VERSION = REPORT_SCHEMA_VERSION;

module.exports = WordPressImportReport;
