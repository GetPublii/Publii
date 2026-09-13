const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const bridgeSource = fs.readFileSync(path.join(__dirname, '../post-editor/EditorBridge.js'), 'utf8')
    .replace(/^import .*;\s*$/gm, '')
    .replace('export default EditorBridge;', 'module.exports = EditorBridge;');

const imageClassOptions = [
    { title: 'None', value: 'post__image' },
    { title: 'Full image', value: 'post__image post__image--full' },
    { title: 'Wide image', value: 'post__image post__image--wide' },
    { title: 'Left-aligned image', value: 'post__image post__image--left' },
    { title: 'Right-aligned image', value: 'post__image post__image--right' },
    { title: 'Centered image', value: 'post__image post__image--center' }
];

function element(tagName, classes = '', attributes = {}) {
    return {
        tagName,
        className: classes,
        get classList() {
            return this.className.split(/\s+/).filter(Boolean);
        },
        hasAttribute: name => Object.hasOwn(attributes, name),
        setAttribute(name, value) {
            attributes[name] = value;
        },
        closest() {
            return null;
        },
        querySelector() {
            return null;
        }
    };
}

function harness(imageClasses, figureClasses = null, attributes = {}) {
    const image = element('IMG', imageClasses, attributes);
    const figure = figureClasses === null ? null : element('FIGURE', figureClasses);
    const events = new Map();
    const context = {
        module: { exports: {} },
        setTimeout: callback => callback()
    };
    vm.runInNewContext(bridgeSource, context);
    const bridge = Object.create(context.module.exports.prototype);
    const editor = {
        on: (event, callback) => events.set(event, callback),
        getParam: () => imageClassOptions,
        getBody: () => ({ querySelectorAll: () => figure ? [figure] : [] }),
        selection: { getNode: () => image }
    };

    if (figure) {
        image.closest = selector => selector === 'figure.image' ? figure : null;
        figure.querySelector = selector => selector === 'img' ? image : null;
    }

    bridge.tinymceEditor = editor;
    bridge.setupImageFigureClassTranslation(editor);

    return {
        image,
        figure,
        editor,
        bridge,
        fire: (name, event) => events.get(name)(event)
    };
}

describe('Image-dialog custom classes', function () {
    for (const option of imageClassOptions) {
        for (const hasCaption of [false, true]) {
            it(`preselects ${option.title} with custom classes and caption=${hasCaption}`, function () {
                const classes = 'xxx ' + option.value.split(' ').reverse().join(' ') + ' feature-photo';
                const test = harness(classes, hasCaption ? 'image ' + option.value : null);
                const data = {
                    classes: 'post__image',
                    caption: hasCaption,
                    src: { value: 'photo.jpg' }
                };
                const originalClasses = test.image.className;
                test.fire('OpenWindow', {
                    dialog: {
                        getData: () => data,
                        setData: values => Object.assign(data, values)
                    }
                });
                assert.equal(data.classes, option.value);
                assert.equal(test.image.className, originalClasses, 'opening must not mutate image classes');
                assert.equal(data.caption, hasCaption);
                assert.equal(data.src.value, 'photo.jpg');
            });
        }
    }

    it('does not update unrelated dialogs', function () {
        const test = harness('post__image post__image--wide xxx');
        test.fire('OpenWindow', {
            dialog: {
                getData: () => ({ classes: 'other' }),
                setData: () => assert.fail('Unrelated dialog was updated')
            }
        });
    });

    for (const fixture of [
        {
            name: 'keeps manually entered image classes when choosing a layout',
            image: 'xxx feature-photo',
            chosen: 'post__image post__image--wide',
            expected: 'post__image post__image--wide xxx feature-photo'
        },
        {
            name: 'preserves figure classes when removing the caption',
            image: 'post__image post__image--wide',
            figure: 'image post__image post__image--wide xxx',
            chosen: 'post__image post__image--wide',
            expected: 'post__image post__image--wide xxx'
        },
        {
            name: 'replaces the old layout without losing custom classes',
            image: 'post__image post__image--wide',
            figure: 'image post__image post__image--wide xxx',
            chosen: 'post__image post__image--full',
            expected: 'post__image post__image--full xxx'
        },
        {
            name: 'respects None without restoring the old layout',
            image: 'post__image post__image--wide',
            figure: 'image post__image post__image--wide xxx',
            chosen: 'post__image',
            expected: 'post__image xxx'
        },
        {
            name: 'deduplicates custom classes from the image, figure and dialog',
            image: 'post__image xxx',
            figure: 'image post__image xxx custom-figure',
            chosen: 'post__image xxx',
            expected: 'post__image xxx custom-figure'
        }
    ]) {
        it(fixture.name, function () {
            const test = harness(fixture.image, fixture.figure);
            const data = { class: fixture.chosen, src: 'photo.jpg', alt: 'Photo' };
            test.fire('BeforeExecCommand', { command: 'mceUpdateImage', value: data });
            assert.equal(data.class, fixture.expected);
            assert.equal(data.src, 'photo.jpg');
            assert.equal(data.alt, 'Photo');
            assert.equal(test.image.className, fixture.image, 'preparing the command must not mutate the image');
        });
    }

    it('leaves image classes untouched when opening and cancelling the dialog', function () {
        const test = harness('post__image xxx');
        test.fire('BeforeExecCommand', { command: 'mceImage' });
        test.fire('CloseWindow');
        assert.equal(test.image.className, 'post__image xxx');
    });

    it('does not handle media commands', function () {
        const test = harness('xxx');
        const data = { class: 'post__video' };
        test.fire('BeforeExecCommand', { command: 'mceMedia', value: data });
        assert.equal(data.class, 'post__video');
    });

    for (const attribute of ['data-mce-object', 'data-mce-placeholder']) {
        it(`ignores ${attribute} media placeholders`, function () {
            const test = harness('xxx', null, { [attribute]: 'video' });
            const data = { class: 'post__image' };
            test.fire('BeforeExecCommand', { command: 'mceUpdateImage', value: data });
            assert.equal(data.class, 'post__image');
        });
    }

    it('does not copy unrelated selection classes into a newly inserted image', function () {
        const test = harness('xxx');
        test.editor.selection.getNode = () => element('P', 'unrelated');
        const data = { class: 'post__image' };
        test.fire('BeforeExecCommand', { command: 'mceUpdateImage', value: data });
        assert.equal(data.class, 'post__image');
    });

    it('moves custom classes onto the live figure and keeps layout preselection on the image', function () {
        const test = harness('post__image post__image--wide xxx', 'image post__image frame xxx');
        test.bridge.normalizeImageFigures();
        assert.equal(test.figure.className, 'image post__image post__image--wide frame xxx');
        assert.equal(test.image.className, 'post__image post__image--wide');
        test.bridge.normalizeImageFigures();
        assert.equal(test.figure.className, 'image post__image post__image--wide frame xxx');
    });
});
