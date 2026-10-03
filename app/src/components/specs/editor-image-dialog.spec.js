const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const bridgeSource = fs.readFileSync(path.join(__dirname, '../post-editor/EditorBridge.js'), 'utf8')
    .replace(/^import .*;\s*$/gm, '')
    .replace('export default EditorBridge;', 'module.exports = EditorBridge;');
const context = { module: { exports: {} } };
vm.runInNewContext(bridgeSource, context);

function setup({ tagName = 'IMG', caption = false, placeholder = '' } = {}) {
    const focusCalls = [];
    const events = new Map();
    const image = {
        tagName,
        hasAttribute: name => name === placeholder
    };
    const selected = {
        ...image,
        closest: () => caption ? { querySelector: () => image } : null
    };
    const editor = {
        on: (name, callback) => events.set(name, callback),
        selection: { getNode: () => selected },
        getBody: () => ({
            focus: options => focusCalls.push(options.preventScroll)
        })
    };
    const dialog = {
        getData: () => ({
            src: { value: 'photo.jpg' },
            classes: 'post__image',
            caption
        })
    };
    const bridge = Object.create(context.module.exports.prototype);
    bridge.setupImageFocus(editor);
    return {
        dialog,
        focusCalls,
        fire: (name, event) => events.get(name)(event)
    };
}

describe('Image Save focus', function () {
    for (const caption of [false, true]) {
        it(`prevents native focus from scrolling an existing image with caption=${caption}`, function () {
            const test = setup({ caption });
            test.fire('OpenWindow', { dialog: test.dialog });
            assert.deepEqual(test.focusCalls, [], 'Opening must leave focus in the dialog.');

            test.fire('BeforeExecCommand', { command: 'mceFocus', value: false });
            assert.deepEqual(test.focusCalls, [true]);
        });
    }

    it('supports case-insensitive focus commands', function () {
        const test = setup();
        test.fire('OpenWindow', { dialog: test.dialog });
        test.fire('BeforeExecCommand', { command: 'mcefocus' });
        assert.deepEqual(test.focusCalls, [true]);
    });

    it('does not take focus when the editor only requests activation', function () {
        const test = setup();
        test.fire('OpenWindow', { dialog: test.dialog });
        test.fire('BeforeExecCommand', { command: 'mceFocus', value: true });
        assert.deepEqual(test.focusCalls, []);
    });

    it('leaves ordinary editor focus unchanged before opening and after closing the dialog', function () {
        const test = setup();
        test.fire('BeforeExecCommand', { command: 'mceFocus' });
        assert.deepEqual(test.focusCalls, []);

        test.fire('OpenWindow', { dialog: test.dialog });
        test.fire('CloseWindow', { dialog: test.dialog });
        assert.deepEqual(test.focusCalls, [true], 'Closing still restores focus without scrolling.');
        test.focusCalls.length = 0;
        test.fire('BeforeExecCommand', { command: 'mceFocus' });
        assert.deepEqual(test.focusCalls, []);
    });

    it('keeps the image guard when an unrelated nested dialog closes', function () {
        const test = setup();
        const nested = { getData: () => ({ url: 'https://example.test' }) };
        test.fire('OpenWindow', { dialog: test.dialog });
        test.fire('OpenWindow', { dialog: nested });
        test.fire('CloseWindow', { dialog: nested });
        test.fire('BeforeExecCommand', { command: 'mceFocus' });
        assert.deepEqual(test.focusCalls, [true]);
    });

    it('does not handle unrelated dialogs', function () {
        const test = setup();
        test.fire('OpenWindow', { dialog: { getData: () => ({ url: 'https://example.test' }) } });
        test.fire('BeforeExecCommand', { command: 'mceFocus' });
        assert.deepEqual(test.focusCalls, []);
    });

    for (const fixture of [
        { name: 'a new image at a text cursor', tagName: 'P' },
        { name: 'an embedded media object', placeholder: 'data-mce-object' },
        { name: 'a media placeholder', placeholder: 'data-mce-placeholder' }
    ]) {
        it(`does not pre-focus ${fixture.name}`, function () {
            const test = setup(fixture);
            test.fire('OpenWindow', { dialog: test.dialog });
            test.fire('BeforeExecCommand', { command: 'mceFocus' });
            assert.deepEqual(test.focusCalls, []);
        });
    }
});

function captionUndoSetup() {
    const events = new Map();
    const figure = {};
    const root = {};
    const image = {
        parentNode: figure,
        closest: () => image.parentNode === figure ? figure : null
    };
    figure.querySelector = () => image;
    const normalizations = [];
    const fire = (name, event = {}) => events.get(name)(event);
    const editor = {
        on(names, callback) {
            for (const name of names.split(' ')) {
                events.set(name, callback);
            }
        },
        selection: { getNode: () => image },
        nodeChanged() {
            normalizations.push(image.parentNode);
            // Native root-block normalization restores the selection recursively.
            fire('AfterSetSelectionRange');
        }
    };
    const bridge = Object.create(context.module.exports.prototype);
    bridge.setupImageCaptionUndo(editor);
    return { image, root, normalizations, fire };
}

describe('Image caption Undo', function () {
    it('normalizes once after the figure is removed and before the image command ends', function () {
        const test = captionUndoSetup();
        test.fire('BeforeExecCommand', {
            command: 'mceUpdateImage',
            value: { src: 'photo.jpg', caption: false }
        });
        test.fire('AfterSetSelectionRange');
        assert.equal(test.normalizations.length, 0, 'The existing figure must stay untouched.');

        test.image.parentNode = test.root;
        test.fire('AfterSetSelectionRange');
        assert.deepEqual(test.normalizations, [test.root]);
        test.fire('AfterSetSelectionRange');
        assert.equal(test.normalizations.length, 1, 'Recursive selection updates must not normalize twice.');
    });

    for (const fixture of [
        { name: 'adding a caption', command: 'mceUpdateImage', src: 'photo.jpg', caption: true },
        { name: 'deleting an image', command: 'mceUpdateImage', src: '', caption: false },
        { name: 'an unrelated command', command: 'mceMedia', src: 'video.mp4', caption: false }
    ]) {
        it(`leaves selection handling unchanged when ${fixture.name}`, function () {
            const test = captionUndoSetup();
            test.fire('BeforeExecCommand', {
                command: fixture.command,
                value: { src: fixture.src, caption: fixture.caption }
            });
            test.image.parentNode = test.root;
            test.fire('AfterSetSelectionRange');
            assert.equal(test.normalizations.length, 0);
        });
    }

    for (const event of ['ExecCommand', 'CloseWindow']) {
        it(`clears pending normalization on ${event}`, function () {
            const test = captionUndoSetup();
            test.fire('BeforeExecCommand', {
                command: 'mceUpdateImage',
                value: { src: 'photo.jpg', caption: false }
            });
            test.fire(event);
            test.image.parentNode = test.root;
            test.fire('AfterSetSelectionRange');
            assert.equal(test.normalizations.length, 0);
        });
    }
});
