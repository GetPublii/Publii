const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const helperSource = fs.readFileSync(path.join(__dirname, '../../helpers/get-editor-toolbar-position.js'), 'utf8')
    .replace('export default', 'module.exports =');

function loadScript(componentName) {
    const source = fs.readFileSync(path.join(__dirname, '../post-editor', componentName + '.vue'), 'utf8');
    return source.match(/<script>([\s\S]*?)<\/script>/)[1]
        .replace(/^import .*;\s*$/gm, '')
        .replace('export default', 'module.exports =');
}

function calculateComponentPosition(componentName, toolbarID, rect, dimensions = {}) {
    const {
        viewportWidth = 1000,
        iframeLeft = 0,
        iframeTop = 200,
        iframeWidth = viewportWidth,
        toolbarWidth = 126,
        toolbarHeight = 46,
        sidebarLeft = null
    } = dimensions;
    const context = {
        module: { exports: {} },
        window: { innerWidth: viewportWidth, outerWidth: 1000 },
        $(selector) {
            if (selector === '#post-editor_ifr') {
                return {
                    offset: () => ({ left: iframeLeft, top: iframeTop }),
                    outerWidth: () => iframeWidth
                };
            }

            if (selector === '.post-editor-sidebar.is-visible') {
                return {
                    length: sidebarLeft === null ? 0 : 1,
                    offset: () => ({ left: sidebarLeft })
                };
            }

            assert.equal(selector, toolbarID);
            return {
                outerWidth: () => toolbarWidth,
                outerHeight: () => toolbarHeight
            };
        }
    };

    vm.runInNewContext(helperSource, context);
    context.getEditorToolbarPosition = context.module.exports;
    vm.runInNewContext(loadScript(componentName), context);
    return context.module.exports.methods.calculatePosition(rect);
}

for (const [componentName, toolbarID] of [
    ['LinkToolbar', '#link-toolbar'],
    ['InlineEditor', '#inline-toolbar']
]) {
    describe(`WYSIWYG toolbar position: ${componentName}`, () => {
        const calculateLeft = (rect, dimensions) => calculateComponentPosition(componentName, toolbarID, rect, dimensions).left;

        it('centers over a selection in the right half without reflecting it to the left', () => {
            assert.equal(calculateLeft({ left: 850, width: 60 }), 817);
        });

        it('preserves centering in the left half', () => {
            assert.equal(calculateLeft({ left: 150, width: 60 }), 117);
        });

        it('keeps a ten-pixel gutter at both edges', () => {
            assert.equal(calculateLeft({ left: 0, width: 20 }), 10);
            assert.equal(calculateLeft({ left: 980, width: 20 }), 864);
        });

        it('uses the actual toolbar width at the right edge', () => {
            assert.equal(calculateLeft({ left: 980, width: 20 }, { toolbarWidth: 180 }), 810);
        });

        it('stays within an editor narrowed by the open sidebar', () => {
            const dimensions = { viewportWidth: 1600, iframeWidth: 1200 };
            assert.equal(calculateLeft({ left: 950, width: 60 }, dimensions), 917);
            assert.equal(calculateLeft({ left: 1180, width: 20 }, dimensions), 1064);
        });

        it('keeps clear of a sidebar overlaying the editor in a narrow window', () => {
            assert.equal(calculateLeft({ left: 560, width: 20 }, { sidebarLeft: 600 }), 464);
        });

        it('includes the iframe offset when centering and clamping', () => {
            const dimensions = { iframeLeft: 40, iframeWidth: 900 };
            assert.equal(calculateLeft({ left: 700, width: 60 }, dimensions), 707);
            assert.equal(calculateLeft({ left: 0, width: 20 }, dimensions), 50);
            assert.equal(calculateLeft({ left: 880, width: 20 }, dimensions), 804);
        });

        it('uses the CSS viewport width when the application is zoomed in', () => {
            assert.equal(calculateLeft({ left: 770, width: 20 }, { viewportWidth: 800 }), 664);
        });

        it('does not overflow the viewport when the iframe extends beyond it', () => {
            assert.equal(calculateLeft({ left: 1050, width: 20 }, { iframeWidth: 1200 }), 864);
        });

        it('keeps the toolbar body fourteen pixels above the selection', () => {
            const position = calculateComponentPosition(componentName, toolbarID, { left: 450, width: 60, top: 100 });
            assert.equal(position.top, 240);
        });

        it('preserves the gap when platform styles change the toolbar height', () => {
            const position = calculateComponentPosition(
                componentName,
                toolbarID,
                { left: 450, width: 60, top: 100 },
                { toolbarHeight: 54 }
            );
            assert.equal(position.top, 232);
        });
    });
}
