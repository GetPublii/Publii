<template>
    <div
        class="overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="$t('tools.wpImport.reportTitle')">
        <div class="popup wp-import-report">
            <h1>{{ $t('tools.wpImport.reportTitle') }}</h1>
            <p class="popup-info">{{ $t('tools.wpImport.reportIntro') }}</p>

            <div class="wp-import-report__summary">
                <div class="wp-import-report__metric">
                    <strong>{{ importedContentCount }}</strong>
                    <span>{{ $t('tools.wpImport.reportImportedContent') }}</span>
                </div>
                <div class="wp-import-report__metric">
                    <strong>{{ requiredRedirects.length }}</strong>
                    <span>{{ $t('tools.wpImport.reportRequiredRedirects') }}</span>
                </div>
                <div class="wp-import-report__metric" :class="{ 'has-issues': report.imageErrors.length }">
                    <strong>{{ report.imageErrors.length }}</strong>
                    <span>{{ $t('tools.wpImport.reportImageErrors') }}</span>
                </div>
                <div class="wp-import-report__metric" :class="{ 'has-issues': unsupportedShortcodeCount }">
                    <strong>{{ unsupportedShortcodeCount }}</strong>
                    <span>{{ $t('tools.wpImport.reportShortcodes') }}</span>
                </div>
                <div class="wp-import-report__metric" :class="{ 'has-issues': report.dynamicBlocks.length }">
                    <strong>{{ report.dynamicBlocks.length }}</strong>
                    <span>{{ $t('tools.wpImport.reportDynamicBlocks') }}</span>
                </div>
                <div class="wp-import-report__metric" :class="{ 'has-issues': report.unresolvedLinks.length }">
                    <strong>{{ report.unresolvedLinks.length }}</strong>
                    <span>{{ $t('tools.wpImport.reportUnresolvedLinks') }}</span>
                </div>
            </div>

            <div class="wp-import-report__body">
                <tabs
                    ref="report-tabs"
                    :items="sectionLabels"
                    :on-toggle="setActiveSection"
                    :warning-items="warningSectionIndexes"
                    :warning-label="$t('tools.wpImport.reportRequiresAttention')"
                    orientation="horizontal"
                    scrollable>
                    <div
                        v-for="(section, index) in sections"
                        :key="section.id"
                        :slot="'tab-' + index">
                        <p class="wp-import-report__note">
                            {{ section.id === 'redirects' ? redirectNote : (section.id === 'seo' ? $t('tools.wpImport.reportSeoNote') : $t('tools.wpImport.reportVerificationNote')) }}
                        </p>

                        <textarea
                            class="wp-import-report__code"
                            readonly
                            spellcheck="false"
                            :aria-label="section.label"
                            :value="getSectionText(section.id)"></textarea>
                    </div>
                </tabs>
            </div>

            <div class="buttons">
                <p-button
                    size="medium"
                    square
                    :onClick="copyCurrentSection">
                    {{ copiedTarget === 'section' ? $t('tools.wpImport.reportCopied') : $t('tools.wpImport.reportCopySection') }}
                </p-button>
                <p-button
                    appearance="secondary"
                    size="medium"
                    square
                    :onClick="copyFullReport">
                    {{ copiedTarget === 'full' ? $t('tools.wpImport.reportCopied') : $t('tools.wpImport.reportCopyAll') }}
                </p-button>
                <p-button
                    appearance="popup-cancel"
                    size="medium"
                    square
                    :onClick="close">
                    {{ $t('ui.close') }}
                </p-button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'wp-import-report',
    props: {
        summary: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            activeSection: 'redirects',
            copiedTarget: '',
            copiedTimer: null
        };
    },
    computed: {
        report () {
            let report = this.summary.report || {};

            return {
                source: report.source || '',
                generatedAt: report.generatedAt || '',
                urlSettings: report.urlSettings || {},
                imageErrors: Array.isArray(report.imageErrors) ? report.imageErrors : [],
                unimportedMedia: Array.isArray(report.unimportedMedia) ? report.unimportedMedia : [],
                unsupportedShortcodes: Array.isArray(report.unsupportedShortcodes) ? report.unsupportedShortcodes : [],
                dynamicBlocks: Array.isArray(report.dynamicBlocks) ? report.dynamicBlocks : [],
                unresolvedLinks: Array.isArray(report.unresolvedLinks) ? report.unresolvedLinks : [],
                redirects: Array.isArray(report.redirects) ? report.redirects : [],
                redirectConflicts: Array.isArray(report.redirectConflicts) ? report.redirectConflicts : [],
                ignoredSystemTypes: Array.isArray(report.ignoredSystemTypes) ? report.ignoredSystemTypes : [],
                seo: report.seo && typeof report.seo === 'object' ? report.seo : {
                    provider: 'none',
                    detectedProviders: [],
                    imported: {},
                    skippedExisting: 0,
                    issues: []
                },
                warnings: Array.isArray(report.warnings) ? report.warnings : []
            };
        },
        importedContentCount () {
            return Number(this.summary.posts || 0) +
                Number(this.summary.pages || 0) +
                Number(this.summary.skipped && this.summary.skipped.posts || 0) +
                Number(this.summary.skipped && this.summary.skipped.pages || 0);
        },
        requiredRedirects () {
            return this.report.redirects.filter(item => item.needed && item.active !== false);
        },
        unsupportedShortcodeCount () {
            return this.report.unsupportedShortcodes.reduce((count, item) => {
                return count + Math.max(1, Number(item.occurrences) || 1);
            }, 0);
        },
        sections () {
            return [
                {
                    id: 'redirects',
                    label: this.$t('tools.wpImport.reportRedirects'),
                    count: this.requiredRedirects.length
                },
                {
                    id: 'images',
                    label: this.$t('tools.wpImport.reportImages'),
                    count: this.report.imageErrors.length
                },
                {
                    id: 'media',
                    label: this.$t('tools.wpImport.reportMedia'),
                    count: this.report.unimportedMedia.length
                },
                {
                    id: 'shortcodes',
                    label: this.$t('tools.wpImport.reportShortcodes'),
                    count: this.unsupportedShortcodeCount
                },
                {
                    id: 'blocks',
                    label: this.$t('tools.wpImport.reportBlocks'),
                    count: this.report.dynamicBlocks.length
                },
                {
                    id: 'links',
                    label: this.$t('tools.wpImport.reportLinks'),
                    count: this.report.unresolvedLinks.length
                },
                {
                    id: 'seo',
                    label: this.$t('tools.wpImport.reportSeo'),
                    count: Array.isArray(this.report.seo.issues) ? this.report.seo.issues.length : 0
                },
                {
                    id: 'warnings',
                    label: this.$t('tools.wpImport.reportWarnings'),
                    count: this.report.warnings.length + this.report.redirectConflicts.length +
                        (this.report.ignoredSystemTypes.length ? 1 : 0)
                }
            ];
        },
        sectionLabels () {
            return this.sections.map(section => section.label + ' (' + section.count + ')');
        },
        warningSectionIndexes () {
            return this.sections.reduce((indexes, section, index) => {
                if (section.id !== 'redirects' && section.count > 0) {
                    indexes.push(index);
                }

                return indexes;
            }, []);
        },
        redirectNote () {
            if (this.report.urlSettings.relativeUrls) {
                return this.$t('tools.wpImport.reportRelativeRedirectsNote');
            }

            return this.$t('tools.wpImport.reportRedirectsNote');
        },
        sectionText () {
            return this.getSectionText(this.activeSection);
        }
    },
    methods: {
        setActiveSection () {
            let tabs = this.$refs['report-tabs'];

            if (tabs && this.sections[tabs.activeIndex]) {
                this.activeSection = this.sections[tabs.activeIndex].id;
            }
        },
        emptySectionText () {
            return this.$t('tools.wpImport.reportNoIssues');
        },
        formatItemReference (item) {
            let itemID = item.itemID || item.sourceID || '?';

            if (item.itemType === 'menu') {
                return '[' + this.$t('tools.wpImport.reportMenuItemReference', {
                    menu: item.menuName || this.$t('tools.wpImport.reportUntitledItem'),
                    id: itemID
                }) + '] ' + (item.title || this.$t('tools.wpImport.reportUntitledItem'));
            }

            return '[' + item.itemType + ' #' + itemID + '] ' + (item.title || this.$t('tools.wpImport.reportUntitledItem'));
        },
        getRedirectsText () {
            let lines = [
                '# ' + this.$t('tools.wpImport.reportRedirectMapHeader'),
                '# ' + this.$t('tools.wpImport.reportRedirectMapColumns')
            ];

            if (this.report.source) {
                lines.push('# ' + this.$t('tools.wpImport.reportSource') + ': ' + this.report.source);
            }

            for (let redirect of this.report.redirects) {
                let target = redirect.targetUrl || redirect.targetPath;

                if (redirect.needed && redirect.active !== false) {
                    lines.push(redirect.sourcePath + '\t' + target + '\t301');
                } else if (redirect.active === false) {
                    lines.push('# ' + redirect.sourcePath + '\t' + target + '\t' +
                        this.$t('tools.wpImport.reportInactiveRedirect') +
                        (redirect.sourceStatus ? ' (' + redirect.sourceStatus + ')' : ''));
                } else {
                    lines.push('# ' + redirect.sourcePath + '\t' + target + '\t' + this.$t('tools.wpImport.reportUnchanged'));
                }
            }

            for (let conflict of this.report.redirectConflicts) {
                lines.push('# ' + this.$t('tools.wpImport.reportConflict') + ': ' + conflict.sourcePath +
                    ' -> ' + conflict.firstTarget + ' | ' + conflict.secondTarget);
            }

            return this.report.redirects.length ? lines.join('\n') : this.emptySectionText();
        },
        getImagesText () {
            if (!this.report.imageErrors.length) {
                return this.emptySectionText();
            }

            return this.report.imageErrors.map(item => {
                let post = item.postID ? '[post #' + item.postID + '] ' : '';
                return post + item.url + (item.reason ? '\t' + item.reason : '');
            }).join('\n');
        },
        getMediaText () {
            if (!this.report.unimportedMedia.length) {
                return this.emptySectionText();
            }

            return this.report.unimportedMedia.map(item => {
                return this.formatItemReference(item) + '\n' +
                    item.mediaType + (item.extension ? ' (.' + item.extension + ')' : '') + '\t' + item.url;
            }).join('\n\n');
        },
        getDetectedItemsText (items) {
            if (!items.length) {
                return this.emptySectionText();
            }

            return items.map(item => {
                let occurrences = Math.max(1, Number(item.occurrences) || 1);
                let occurrenceLabel = occurrences > 1 ? '\t\u00d7' + occurrences : '';

                return this.formatItemReference(item) + '\n' + item.name + '\t' + item.markup + occurrenceLabel;
            }).join('\n\n');
        },
        getLinksText () {
            if (!this.report.unresolvedLinks.length) {
                return this.emptySectionText();
            }

            return this.report.unresolvedLinks.map(item => {
                let output = this.formatItemReference(item) + '\n' + item.url +
                    '\n' + this.getLinkReason(item.reason);

                if (item.targetPath) {
                    output += '\n' + this.$t('tools.wpImport.reportPreservedTarget') + ': ' + item.targetPath;
                }

                return output;
            }).join('\n\n');
        },
        getLinkReason (reason) {
            let translations = {
                'not-mapped-to-imported-content': 'reportLinkNotMapped',
                'same-site-menu-path-preserved': 'reportLinkPathPreserved',
                'menu-target-not-imported': 'reportLinkTargetNotImported',
                'taxonomy-not-imported': 'reportLinkTaxonomyNotImported',
                'wordpress-search-url': 'reportLinkSearch'
            };

            return translations[reason] ? this.$t('tools.wpImport.' + translations[reason]) : reason;
        },
        getSeoProviderLabel (provider) {
            return {
                yoast: 'Yoast SEO',
                'rank-math': 'Rank Math',
                aioseo: 'All in One SEO (AIOSEO)',
                none: this.$t('tools.wpImport.reportSeoProviderNone')
            }[provider] || provider;
        },
        getSeoIssueReason (reason) {
            let translations = {
                'unsupported-template-variables': 'reportSeoUnsupportedTemplate',
                'unsupported-robots-directives': 'reportSeoUnsupportedRobots',
                'primary-category-not-imported': 'reportSeoPrimaryNotImported',
                'primary-category-not-resolved': 'reportSeoPrimaryNotResolved',
                'invalid-canonical-url': 'reportSeoInvalidCanonical',
                'canonical-conflicts-with-noindex': 'reportSeoCanonicalNoindex',
                'internal-canonical-not-resolved': 'reportSeoCanonicalNotResolved',
                'internal-canonical-needs-domain': 'reportSeoCanonicalNeedsDomain',
                'canonical-save-failed': 'reportSeoCanonicalSaveFailed'
            };

            return translations[reason] ? this.$t('tools.wpImport.' + translations[reason]) : reason;
        },
        getSeoText () {
            let seo = this.report.seo || {};
            let imported = seo.imported || {};
            let issues = Array.isArray(seo.issues) ? seo.issues : [];
            let lines = [
                this.$t('tools.wpImport.reportSeoSource') + ': ' + this.getSeoProviderLabel(seo.provider || 'none'),
                this.$t('tools.wpImport.reportSeoTitles') + ': ' + (Number(imported.titles) || 0),
                this.$t('tools.wpImport.reportSeoDescriptions') + ': ' + (Number(imported.descriptions) || 0),
                this.$t('tools.wpImport.reportSeoRobots') + ': ' + (Number(imported.robots) || 0),
                this.$t('tools.wpImport.reportSeoCanonicals') + ': ' + (Number(imported.canonicals) || 0),
                this.$t('tools.wpImport.reportSeoMainTags') + ': ' + (Number(imported.mainTags) || 0),
                this.$t('tools.wpImport.reportSeoSkippedExisting') + ': ' + (Number(seo.skippedExisting) || 0)
            ];

            if (issues.length) {
                lines.push('');

                for (let issue of issues) {
                    let detail = issue.field + ': ' + this.getSeoIssueReason(issue.reason);

                    if (issue.value) {
                        detail += ' (' + issue.value + ')';
                    }

                    lines.push(this.formatItemReference(issue));
                    lines.push(detail);
                    lines.push('');
                }
            }

            return lines.join('\n').trim();
        },
        getWarningsText () {
            let lines = this.report.warnings.slice();

            if (this.report.ignoredSystemTypes.length) {
                let count = this.report.ignoredSystemTypes.reduce((total, item) => {
                    return total + (Number(item.count) || 0);
                }, 0);
                let types = this.report.ignoredSystemTypes.map(item => {
                    return item.type + ' (' + item.count + ')';
                }).join(', ');

                lines.push(this.$t('tools.wpImport.reportIgnoredSystemItems', { count, types }));
            }

            for (let conflict of this.report.redirectConflicts) {
                lines.push(this.$t('tools.wpImport.reportConflict') + ': ' + conflict.sourcePath +
                    ' -> ' + conflict.firstTarget + ' | ' + conflict.secondTarget);
            }

            return lines.length ? lines.join('\n') : this.emptySectionText();
        },
        getSectionText (section) {
            if (section === 'redirects') {
                return this.getRedirectsText();
            }

            if (section === 'images') {
                return this.getImagesText();
            }

            if (section === 'media') {
                return this.getMediaText();
            }

            if (section === 'shortcodes') {
                return this.getDetectedItemsText(this.report.unsupportedShortcodes);
            }

            if (section === 'blocks') {
                return this.getDetectedItemsText(this.report.dynamicBlocks);
            }

            if (section === 'links') {
                return this.getLinksText();
            }

            if (section === 'seo') {
                return this.getSeoText();
            }

            return this.getWarningsText();
        },
        getFullReportText () {
            let lines = [
                this.$t('tools.wpImport.reportTitle').toUpperCase(),
                this.$t('tools.wpImport.reportGeneratedAt') + ': ' + this.report.generatedAt,
                this.$t('tools.wpImport.reportSource') + ': ' + this.report.source,
                ''
            ];

            for (let section of this.sections) {
                lines.push('[' + section.label.toUpperCase() + ']');
                lines.push(this.getSectionText(section.id));
                lines.push('');
            }

            return lines.join('\n').trim();
        },
        copyText (text, target) {
            let textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.setAttribute('readonly', 'readonly');
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.copiedTarget = target;

            if (this.copiedTimer) {
                clearTimeout(this.copiedTimer);
            }

            this.copiedTimer = setTimeout(() => {
                this.copiedTarget = '';
            }, 1800);
        },
        copyCurrentSection () {
            this.copyText(this.sectionText, 'section');
        },
        copyFullReport () {
            this.copyText(this.getFullReportText(), 'full');
        },
        close () {
            this.$emit('close');
        }
    },
    beforeDestroy () {
        if (this.copiedTimer) {
            clearTimeout(this.copiedTimer);
        }
    }
}
</script>

<style scoped>
@import '../css/popup-common.css';

.wp-import-report {
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 6rem);
    max-width: 108rem;
    padding: var(--space-16) var(--space-16) 0;
    text-align: left;
    user-select: text;
    width: calc(100vw - 8rem);
}

.popup-info {
    color: var(--text-light-color);
    font-size: var(--font-size-ui-md);
    line-height: var(--line-height-base);
    margin: -1.5rem 0 var(--space-12);
    text-align: center;
}

.wp-import-report__summary {
    background: var(--bg-secondary);
    display: grid;
    gap: var(--space-4);
    grid-template-columns: repeat(6, 1fr);
    margin: 0;
}

.wp-import-report__metric {
    border: 1px solid var(--border-light-color);
    border-radius: var(--radius-base);
    min-width: 0;
    padding: 1.8rem var(--space-6);
    text-align: center;

    strong {
        color: var(--color-primary);
        display: block;
        font-size: 2.2rem;
        line-height: 1;
        margin-bottom: .7rem;
    }

    span {
        color: var(--text-light-color);
        display: block;
        font-size: var(--font-size-ui-xs);
        line-height: 1.3;
    }

    &.has-issues strong {
        color: var(--color-danger);
    }
}

.wp-import-report__body {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: var(--space-16) 0 var(--space-16);
}

.wp-import-report__note {
    color: var(--text-light-color);
    font-size: 1.25rem;
    line-height: var(--line-height-base);
    margin: 1.6rem 0 var(--space-4);
}

.wp-import-report__code {
    background: var(--input-bg-light);
    border: 1px solid var(--input-border-color);
    border-radius: .4rem;
    color: var(--text-primary-color);
    display: block;
    font-family: SFMono-Regular, Consolas, 'Liberation Mono', monospace;
    font-size: var(--font-size-ui-xs);
    height: 29rem;
    line-height: 1.55;
    padding: var(--space-6);
    resize: vertical;
    white-space: pre;
    width: 100%;
}

.buttons {
    display: flex;
    margin: 0 -4rem;
    position: relative;
    text-align: center;
    top: 1px;

    .button {
        flex: 1;
        margin: 0!important;
    }
}

@media (max-width: 900px) {
    .wp-import-report__summary {
        grid-template-columns: repeat(3, 1fr);
    }
}
</style>
