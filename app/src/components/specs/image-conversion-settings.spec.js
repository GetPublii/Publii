const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Vue = require('vue');
const compiler = require('vue-template-compiler');

const source = fs.readFileSync(path.join(__dirname, '../Settings.vue'), 'utf8');
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
const context = {
    module: { exports: {} },
    ThemeUpload: {},
    EmbedConsentsGroups: {},
    GConsentModeGroups: {},
    GdprGroups: {},
    ThemesDropdown: {},
    WorkspaceAccentPicker: {},
    DEFAULT_WORKSPACE_ACCENT: 'default'
};
vm.runInNewContext(
    script.replace(/^import[\s\S]*?from ['"][^'"]+['"];\s*$/gm, '')
        .replace('export default', 'module.exports ='),
    context
);
const options = context.module.exports;

function createSettings(advanced) {
    return new Vue({
        data() {
            return {
                advanced: { ...options.data().advanced, ...advanced }
            };
        },
        computed: {
            imageConversion: options.computed.imageConversion,
            imageConversionItems: options.computed.imageConversionItems,
            imageConversionInfo: options.computed.imageConversionInfo,
            avifEffortItems: options.computed.avifEffortItems
        },
        methods: {
            $t(key) {
                return key;
            }
        }
    });
}

function descendants(node) {
    return [node, ...(node.children || []).flatMap(descendants)];
}

describe('Image conversion settings', function () {
    for (const forceWebp of [false, true]) {
        it(`restores legacy WebP selection and quality settings (forceWebp=${forceWebp})`, function () {
            const legacy = {
                forceWebp,
                imagesQuality: 73,
                alphaQuality: 91,
                webpLossless: true
            };
            const instance = createSettings(legacy);
            assert.equal(instance.imageConversion, forceWebp ? 'webp' : 'none');
            assert.equal(instance.advanced.forceAvif, false);

            for (const [key, value] of Object.entries(legacy)) {
                assert.equal(instance.advanced[key], value);
            }

            instance.$destroy();
        });
    }

    it('switches formats exclusively and restores the saved selection without losing format settings', function () {
        const instance = createSettings({
            forceWebp: true,
            imagesQuality: 73,
            alphaQuality: 91,
            webpLossless: true,
            avifQuality: 45,
            avifLossless: false,
            avifEffort: 6
        });

        for (const format of ['avif', 'webp', 'none', 'avif']) {
            instance.imageConversion = format;
            assert.equal(instance.advanced.forceWebp, format === 'webp');
            assert.equal(instance.advanced.forceAvif, format === 'avif');
            const reopened = createSettings(JSON.parse(JSON.stringify(instance.advanced)));
            assert.equal(reopened.imageConversion, format);
            assert.equal(reopened.advanced.imagesQuality, 73);
            assert.equal(reopened.advanced.alphaQuality, 91);
            assert.equal(reopened.advanced.webpLossless, true);
            assert.equal(reopened.advanced.avifQuality, 45);
            assert.equal(reopened.advanced.avifEffort, 6);
            reopened.$destroy();
        }

        instance.$destroy();
    });

    it('renders the selected radio value and only the relevant format controls', function () {
        const start = source.indexOf('<div slot="tab-6">');
        const end = source.indexOf('<div slot="tab-7">', start);
        const template = '<section>' + source.slice(start, end) + '</section>';
        assert.deepEqual(compiler.compile(template).errors, []);
        const compiled = compiler.compileToFunctions(template);
        const instance = createSettings({ responsiveImages: true, forceWebp: true });
        instance.$options.render = compiled.render;
        instance.$options.staticRenderFns = compiled.staticRenderFns;

        for (const format of ['webp', 'avif', 'none']) {
            instance.imageConversion = format;
            instance.advanced.avifLossless = true;
            const nodes = descendants(instance._render());
            const radio = nodes.find(node => node.tag === 'radio-buttons');
            assert.equal(radio.data.model.value, format);
            assert.equal(radio.data.attrs.role, 'radiogroup');
            assert.equal(radio.data.attrs['aria-labelledby'], 'image-conversion-label');
            const fields = nodes.filter(node => node.tag === 'field').map(node => node.data.attrs.id);
            assert.equal(fields.includes('avif-quality'), format === 'avif');
            assert.equal(fields.includes('avif-effort'), format === 'avif');
            assert.equal(fields.includes('webp-lossless'), format === 'webp');
            assert.equal(fields.includes('images-quality'), format !== 'avif');

            if (format === 'avif') {
                const effort = nodes.find(node => node.tag === 'radio-buttons' && node.data.attrs.name === 'avif-effort');
                assert.equal(effort.data.model.value, 4);
                assert.equal(effort.data.attrs['aria-labelledby'], 'avif-effort-label');
                const quality = nodes.find(node => node.tag === 'text-input' && node.data.attrs.id === 'avif-quality');
                assert.equal(quality.data.attrs.disabled, true);
            }
        }

        instance.$destroy();
    });
});
