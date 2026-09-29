const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Vue = require('vue');
const VueI18n = require('vue-i18n');

Vue.use(VueI18n);

const componentSource = fs.readFileSync(path.join(__dirname, '../Settings.vue'), 'utf8');
const methodsStart = componentSource.indexOf('        checkBeforeSave (');
const methodsEnd = componentSource.indexOf('        save (', methodsStart);
assert.ok(methodsStart >= 0 && methodsEnd > methodsStart);
const escapeSource = fs.readFileSync(path.join(__dirname, '../../helpers/escape-html.js'), 'utf8');
const escapeHTML = vm.runInNewContext('(' + escapeSource.replace('export default ', '') + ')');
const methods = vm.runInNewContext('({' + componentSource.slice(methodsStart, methodsEnd) + '})', {
    escapeHTML
});

function createHarness (locale = 'en-gb') {
    const translations = JSON.parse(fs.readFileSync(
        path.join(__dirname, '../../../default-files/default-languages', locale, 'translations.json'),
        'utf8'
    ));
    const i18n = new VueI18n({
        locale,
        messages: { [locale]: translations }
    });
    const events = [];
    const saves = [];
    const drafts = [];
    const instance = {
        theme: 'use-simple',
        siteThemesState: {
            siteCopies: [{ directory: 'simple', name: 'Simple' }],
            library: [{ directory: 'new-theme', name: 'New Theme' }]
        },
        $store: {
            state: {
                currentSite: {
                    config: { name: 'site-a', theme: 'reveral' },
                    themeHasOverrides: false
                }
            }
        },
        $t: (...args) => i18n.t(...args),
        $bus: {
            $emit (name, config) {
                events.push({ name, config });
            }
        },
        save (...args) {
            saves.push(args);
        },
        rememberSettingsDraft () {
            drafts.push(this.theme);
        }
    };

    instance.rememberSettingsDraft = instance.rememberSettingsDraft.bind(instance);

    for (const [name, method] of Object.entries(methods)) {
        instance[name] = method.bind(instance);
    }

    return { instance, events, saves, drafts, translations };
}

describe('Theme change confirmation', function () {
    for (const selection of ['use-simple', 'install-use-new-theme']) {
        for (const action of ['save', 'preview', 'render']) {
            it(`waits for confirmation before ${action} with ${selection}`, function () {
                const harness = createHarness();
                harness.instance.theme = selection;
                let expectedArgs;

                if (action === 'save') {
                    harness.instance.checkBeforeSave(false);
                    expectedArgs = [false, undefined, undefined];
                } else if (action === 'preview') {
                    harness.instance.saveAndPreview('full');
                    expectedArgs = [true, 'full', false];
                } else {
                    harness.instance.saveAndRender('partial');
                    expectedArgs = [true, 'partial', true];
                }

                assert.equal(harness.events.length, 1);
                assert.equal(harness.events[0].name, 'confirm-display');
                assert.deepEqual(harness.saves, []);
                const confirmation = harness.events[0].config;
                assert.equal(confirmation.isDanger, true);
                assert.ok(confirmation.dialogLabel.includes(selection === 'use-simple' ? 'Simple' : 'New Theme'));
                assert.equal(harness.instance.$store.state.currentSite.config.theme, 'reveral');

                confirmation.okClick();
                assert.deepEqual(harness.saves, [expectedArgs]);
            });
        }
    }

    it('links to backups and discards the pending theme before preserving the remaining draft', function () {
        const harness = createHarness('pl');
        harness.instance.checkBeforeSave(false);
        const link = harness.events[0].config.link;
        assert.equal(link.to, '/site/site-a/tools/backups');
        assert.equal(link.label, harness.translations.theme.openBackups);
        link.onClick();
        assert.equal(harness.instance.theme, '');
        assert.deepEqual(harness.drafts, ['']);
        assert.deepEqual(harness.saves, []);
        assert.equal(harness.instance.$store.state.currentSite.config.theme, 'reveral');
    });

    for (const selected of ['', 'use-reveral', 'install-use-reveral']) {
        it(`saves without a theme-change warning for unchanged theme: ${selected || '(no selection)'}`, function () {
            const harness = createHarness();
            harness.instance.theme = selected;
            harness.instance.checkBeforeSave(false);
            assert.deepEqual(harness.events, []);
            assert.equal(harness.saves.length, 1);
        });
    }

    for (const current of ['', undefined]) {
        it(`does not warn about losing a previous theme on initial selection: ${String(current)}`, function () {
            const harness = createHarness();
            harness.instance.$store.state.currentSite.config.theme = current;
            harness.instance.checkBeforeSave(false);
            assert.deepEqual(harness.events, []);
            assert.equal(harness.saves.length, 1);
        });
    }

    it('preserves the existing override warning when reinstalling the current theme', function () {
        const harness = createHarness();
        harness.instance.theme = 'install-use-reveral';
        harness.instance.$store.state.currentSite.themeHasOverrides = true;
        harness.instance.saveAndRender('full');
        assert.equal(harness.events.length, 1);
        assert.equal(harness.events[0].config.message, harness.translations.settings.currentThemeHasOverrides);
        assert.deepEqual(harness.saves, []);
        harness.events[0].config.okClick();
        assert.deepEqual(harness.saves, [[true, 'full', true]]);
    });

    it('shows only the change warning when switching away from a theme with overrides', function () {
        const harness = createHarness();
        harness.instance.$store.state.currentSite.themeHasOverrides = true;
        harness.instance.checkBeforeSave(false);
        assert.equal(harness.events.length, 1);
        assert.ok(harness.events[0].config.dialogLabel.includes('Simple'));
        assert.equal(harness.events[0].config.message.includes(harness.translations.settings.currentThemeHasOverrides), false);
    });

    it('does not strip action-like prefixes from the theme directory itself', function () {
        const harness = createHarness();
        harness.instance.$store.state.currentSite.config.theme = 'use-simple';
        harness.instance.theme = 'install-use-use-simple';
        harness.instance.checkBeforeSave(false);
        assert.deepEqual(harness.events, []);
        assert.equal(harness.saves.length, 1);
    });

    it('falls back to the directory name if theme metadata is unavailable', function () {
        const harness = createHarness();
        harness.instance.theme = 'use-missing-theme';
        harness.instance.checkBeforeSave(false);
        assert.ok(harness.events[0].config.dialogLabel.includes('missing-theme'));
        assert.deepEqual(harness.saves, []);
    });

    for (const locale of ['en-gb', 'pl', 'de']) {
        it(`keeps the localized title as plain text, separate from the HTML message in ${locale}`, function () {
            const harness = createHarness(locale);
            const themeName = '<img src=x onerror=alert(1)> & "Theme"';
            harness.instance.siteThemesState.siteCopies[0].name = themeName;
            harness.instance.checkBeforeSave(false);
            const confirmation = harness.events[0].config;
            assert.equal(confirmation.dialogLabel, harness.translations.theme.changeConfirmTitle.replace('{themeName}', themeName));
            assert.equal(confirmation.title, confirmation.dialogLabel);
            assert.equal(confirmation.message.includes('<img'), false);
            assert.equal(confirmation.message, harness.translations.theme.changeConfirmMessage);
            assert.equal(confirmation.okLabel, harness.translations.theme.changeConfirm);
            assert.equal(confirmation.cancelLabel, harness.translations.ui.cancel);
            assert.equal(/\{themeName\}|theme\.changeConfirm/.test(confirmation.message), false);
        });
    }
});
