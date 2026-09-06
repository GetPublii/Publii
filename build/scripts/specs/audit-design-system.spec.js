const assert = require('assert');
const { resolveTokenValue } = require('../audit-design-system');

describe('Design-system audit token resolution', () => {
    it('resolves shadow aliases through global and appearance definitions', () => {
        const globals = new Map([
            ['--black', 'oklch(0% 0 0)'],
            ['--shadow-color', '#000']
        ]);
        const common = new Map([
            ['--shadow-base', 'var(--black)']
        ]);
        const scheme = new Map([
            ['--shadow-color', 'var( --shadow-base )']
        ]);
        const definitions = new Map([...globals, ...common, ...scheme]);

        assert.strictEqual(resolveTokenValue('--shadow-color', definitions), 'oklch(0% 0 0)');
    });

    it('uses the active scheme value when it overrides a global token', () => {
        const globals = new Map([
            ['--black', 'oklch(0% 0 0)']
        ]);
        const scheme = new Map([
            ['--black', '#000'],
            ['--shadow-color', 'var(--black)']
        ]);

        assert.strictEqual(resolveTokenValue('--shadow-color', new Map([...globals, ...scheme])), '#000');
    });

    it('preserves direct OKLCH values and does not convert unsupported colors', () => {
        for (const value of ['oklch(59% 0.234 29)', '#000', 'rgb(0 0 0)']) {
            const definitions = new Map([
                ['--shadow-color', value]
            ]);

            assert.strictEqual(resolveTokenValue('--shadow-color', definitions), value);
        }
    });

    it('rejects missing tokens and missing alias targets', () => {
        const definitions = new Map([
            ['--shadow-color', 'var(--missing)']
        ]);

        assert.strictEqual(resolveTokenValue('--missing', definitions), '');
        assert.strictEqual(resolveTokenValue('--shadow-color', definitions), '');
    });

    it('rejects self references and cycles without looping indefinitely', () => {
        const definitions = new Map([
            ['--self', 'var(--self)'],
            ['--shadow-color', 'var(--shadow-base)'],
            ['--shadow-base', 'var(--shadow-color)']
        ]);

        assert.strictEqual(resolveTokenValue('--self', definitions), '');
        assert.strictEqual(resolveTokenValue('--shadow-color', definitions), '');
    });
});
