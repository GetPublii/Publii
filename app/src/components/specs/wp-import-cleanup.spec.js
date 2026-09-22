const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Vue = require('vue');
const compiler = require('vue-template-compiler');

function loadComponent(name, extra = {}) {
    const source = fs.readFileSync(path.join(__dirname, '../' + name + '.vue'), 'utf8');
    const parsed = compiler.parseComponent(source);
    const context = { module: { exports: {} }, ...extra };
    vm.runInNewContext(parsed.script.content
        .replace(/^import[\s\S]*?from ['"][^'"]+['"];\s*$/gm, '')
        .replace('export default', 'module.exports ='), context);
    return { options: context.module.exports, template: parsed.template.content };
}

const report = loadComponent('WPImportReport');
const ipcMessages = [];
const importForm = loadComponent('WPImport', {
    mainProcessAPI: {
        receive() {},
        receiveOnce() {},
        send: (name, payload) => ipcMessages.push({ name, payload })
    },
    WPImportStats: {},
    WPImportReport: {},
    BackToTools: {},
    consumePendingWordPressImport() {}
});

function createReport(summary) {
    return new Vue({
        data() {
            return { summary, activeSection: 'redirects' };
        },
        computed: report.options.computed,
        methods: {
            ...report.options.methods,
            $t(key) {
                return key;
            }
        }
    });
}

describe('WordPress HTML cleanup controls and report', function() {
    it('compiles the import and report templates', function() {
        for (const component of [importForm, report]) {
            assert.deepEqual(compiler.compile(component.template).errors, []);
        }
    });

    it('defaults to disabled and resets the cleanup selection for a new import', function() {
        const context = {
            $store: { state: { currentSite: { config: { uuid: 'test' } }, site: { uuid: 'test' } } },
            $t: key => key
        };
        const data = importForm.options.data.call(context);
        assert.equal(data.cleanImportedHtml, false);
        data.cleanImportedHtml = true;
        importForm.options.methods.resetState.call(data);
        assert.equal(data.cleanImportedHtml, false);
    });

    it('sends both cleanup states from the form to the import event', function() {
        for (const cleanImportedHtml of [false, true]) {
            const context = {
                $store: { state: { currentSite: { config: { name: 'test-site' } } } },
                $t: key => key
            };
            Object.assign(context, importForm.options.data.call(context), {
                fileImported() {},
                fileImportProgress() {},
                cleanImportedHtml
            });
            importForm.options.methods.importFile.call(context);
            assert.equal(ipcMessages.at(-1).name, 'app-wxr-import');
            assert.equal(ipcMessages.at(-1).payload.cleanHtml, cleanImportedHtml);
        }
    });

    for (const summary of [{}, { report: {} }, { report: { htmlCleanup: { enabled: false } } }]) {
        it('keeps legacy and disabled reports free of the cleanup tab', function() {
            const instance = createReport(summary);
            assert.equal(instance.sections.length, 8);
            assert.equal(instance.sections.some(section => section.id === 'htmlCleanup'), false);
            assert.equal(instance.getFullReportText().includes('reportCleanup'), false);
            instance.$destroy();
        });
    }

    it('adds an informational tab, counts and copied report text when enabled', function() {
        const instance = createReport({
            report: {
                imageErrors: [{ url: 'failed.jpg' }],
                htmlCleanup: {
                    enabled: true,
                    processedItems: 5,
                    changedItems: 3,
                    changedPosts: 2,
                    changedPages: 1,
                    removedClasses: 17,
                    removedStyles: 8,
                    removedAttributes: 4,
                    removedEmptyElements: 6,
                    convertedCovers: 3,
                    semanticConversions: 2,
                    skippedItems: [{ itemID: 7, itemType: 'post', title: 'Widget', reason: 'active-content' }]
                }
            }
        });
        const index = instance.sections.findIndex(section => section.id === 'htmlCleanup');
        instance.$refs['report-tabs'] = { activeIndex: index };
        instance.setActiveSection();
        assert.equal(instance.activeSection, 'htmlCleanup');
        assert.equal(instance.sectionLabels[index], 'tools.wpImport.reportCleanup (3)');
        assert.equal(instance.warningSectionIndexes.includes(index), false);
        assert.equal(instance.warningSectionIndexes.includes(1), true);
        assert.match(instance.getSectionText('htmlCleanup'), /reportCleanupClasses: 17/);
        assert.match(instance.getSectionText('htmlCleanup'), /reportCleanupEmptyElements: 6/);
        assert.match(instance.getSectionText('htmlCleanup'), /reportCleanupCovers: 3/);
        assert.match(instance.getSectionText('htmlCleanup'), /reportCleanupActiveContent/);
        assert.match(instance.getFullReportText(), /reportCleanupStyles: 8/);
        assert.match(instance.getFullReportText(), /reportCleanupAlignment: 2/);
        assert.match(instance.getFullReportText(), /reportCleanupEmptyElements: 6/);
        assert.match(instance.getFullReportText(), /reportCleanupCovers: 3/);
        assert.doesNotMatch(instance.getFullReportText(), /reportCleanupWrappers|reportCleanupSemantic/);
        instance.$destroy();
    });

    for (const reason of ['invalid-html', 'processing-error']) {
        for (const changedItems of [0, 2]) {
            it('marks cleanup ' + reason + ' for attention with ' + changedItems + ' cleaned items', function() {
                const instance = createReport({
                    report: {
                        htmlCleanup: {
                            enabled: true,
                            changedItems,
                            skippedItems: [
                                {
                                    itemID: 7,
                                    itemType: 'post',
                                    title: 'Unprocessed post',
                                    reason
                                }
                            ]
                        }
                    }
                });
                const index = instance.sections.findIndex(section => section.id === 'htmlCleanup');

                assert.equal(instance.warningSectionIndexes.includes(index), true);
                assert.equal(instance.sections[index].count, changedItems);
                assert.match(instance.getFullReportText(), /Unprocessed post/);
                instance.$destroy();
            });
        }
    }

    it('keeps protected fragments informational when no cleanup error occurred', function() {
        const instance = createReport({
            report: {
                htmlCleanup: {
                    enabled: true,
                    changedItems: 0,
                    preservedBlocks: 3,
                    skippedItems: [
                        {
                            itemID: 7,
                            reason: 'active-content'
                        }
                    ]
                }
            }
        });
        const index = instance.sections.findIndex(section => section.id === 'htmlCleanup');

        assert.equal(instance.warningSectionIndexes.includes(index), false);
        instance.$destroy();
    });

    it('does not report clean code when processing was skipped or protected styles remain', function() {
        for (const stats of [
            { preservedBlocks: 1 },
            { preservedStyles: 1 },
            { skippedItems: [{ reason: 'invalid-html' }] }
        ]) {
            const instance = createReport({ report: { htmlCleanup: { enabled: true, ...stats } } });
            assert.doesNotMatch(instance.getCleanupText(), /reportCleanupNoChanges/);
            instance.$destroy();
        }
        const instance = createReport({ report: { htmlCleanup: { enabled: true, processedItems: 1, changedItems: 0 } } });
        assert.match(instance.getCleanupText(), /reportCleanupNoChanges/);
        assert.match(instance.getCleanupText(), /reportCleanupEmptyElements: 0/);
        assert.match(instance.getCleanupText(), /reportCleanupCovers: 0/);
        instance.$destroy();
    });

    it('provides a switch label, description and disabled state using the shared accessible switcher', function() {
        const ast = compiler.compile(importForm.template).ast;
        function find(node) {
            if (node.tag === 'switcher' && node.attrsMap.id === 'clean-imported-html') {
                return node;
            }
            return (node.children || []).map(find).find(Boolean);
        }
        const control = find(ast);
        assert.ok(control.attrsMap[':accessible-label']);
        assert.ok(control.attrsMap[':description']);
        assert.equal(control.attrsMap[':disabled'], 'importInProgress');
    });
});
