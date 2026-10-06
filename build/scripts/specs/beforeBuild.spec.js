const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
    default: beforeBuild,
    removeCpuFeatures
} = require('../beforeBuild');

describe('electron-builder beforeBuild hook', () => {
    let appDir;
    let nodeModulesDir;
    let moduleDir;

    function createModule(name, packageJson) {
        const dir = path.join(nodeModulesDir, name);
        fs.mkdirSync(path.join(dir, 'lib'), { recursive: true });
        fs.writeFileSync(path.join(dir, 'lib', 'index.js'), 'module.exports = {};\n');

        if (packageJson !== null) {
            fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(packageJson));
        }

        return dir;
    }

    function captureConsoleLog(fn) {
        const originalLog = console.log;
        const logged = [];
        console.log = (...args) => logged.push(args.join(' '));

        try {
            return { result: fn(), logged };
        } finally {
            console.log = originalLog;
        }
    }

    beforeEach(() => {
        appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-before-build-'));
        nodeModulesDir = path.join(appDir, 'node_modules');
        moduleDir = path.join(nodeModulesDir, 'cpu-features');
        createModule('ssh2', { name: 'ssh2', optionalDependencies: { 'cpu-features': '~0.0.10' } });
    });

    afterEach(() => {
        fs.rmSync(appDir, { recursive: true, force: true });
    });

    describe('removeCpuFeatures', () => {
        it('does nothing when cpu-features is not installed', () => {
            const result = removeCpuFeatures(appDir);

            assert.deepStrictEqual(result, { status: 'absent', moduleDir });
            assert.strictEqual(fs.existsSync(path.join(nodeModulesDir, 'ssh2')), true);
        });

        it('removes the whole module directory and leaves sibling modules untouched', () => {
            createModule('cpu-features', { name: 'cpu-features', version: '0.0.10' });
            fs.mkdirSync(path.join(moduleDir, 'build', 'Release'), { recursive: true });
            fs.writeFileSync(path.join(moduleDir, 'build', 'Release', 'cpufeatures.node'), 'binary');

            const result = removeCpuFeatures(appDir);

            assert.deepStrictEqual(result, { status: 'removed', moduleDir });
            assert.strictEqual(fs.existsSync(moduleDir), false);
            assert.strictEqual(fs.existsSync(path.join(nodeModulesDir, 'ssh2', 'package.json')), true);
        });

        it('is idempotent across electron-builder calling the hook per platform/arch', () => {
            createModule('cpu-features', { name: 'cpu-features', version: '0.0.10' });

            assert.strictEqual(removeCpuFeatures(appDir).status, 'removed');
            assert.strictEqual(removeCpuFeatures(appDir).status, 'absent');
        });

        it('refuses to remove a directory whose package.json names a different package', () => {
            createModule('cpu-features', { name: 'something-else', version: '1.0.0' });

            assert.throws(
                () => removeCpuFeatures(appDir),
                /refusing to remove .*cpu-features.*found "something-else"/
            );
            assert.strictEqual(fs.existsSync(path.join(moduleDir, 'lib', 'index.js')), true);
        });

        it('refuses to remove a directory without a readable package.json', () => {
            createModule('cpu-features', null);

            assert.throws(
                () => removeCpuFeatures(appDir),
                /refusing to remove .*cpu-features.*found none/
            );
            assert.strictEqual(fs.existsSync(path.join(moduleDir, 'lib', 'index.js')), true);
        });

        it('resolves a relative appDir against the current working directory', () => {
            createModule('cpu-features', { name: 'cpu-features', version: '0.0.10' });
            const originalCwd = process.cwd();
            process.chdir(appDir);

            try {
                const result = removeCpuFeatures('.');

                assert.strictEqual(result.status, 'removed');
                assert.strictEqual(fs.existsSync(moduleDir), false);
            } finally {
                process.chdir(originalCwd);
            }
        });
    });

    describe('default hook', () => {
        const context = () => ({ appDir, electronVersion: '43.7.7', platform: 'linux', arch: 'x64' });

        it('removes the module, logs it once and returns true so electron-builder still rebuilds the rest', () => {
            createModule('cpu-features', { name: 'cpu-features', version: '0.0.10' });

            const { result, logged } = captureConsoleLog(() => beforeBuild(context()));

            assert.strictEqual(result, true);
            assert.strictEqual(fs.existsSync(moduleDir), false);
            assert.strictEqual(logged.length, 1);
            assert.match(logged[0], /beforeBuild {2}removed .*cpu-features/);
        });

        it('returns true and stays silent when there is nothing to remove', () => {
            const { result, logged } = captureConsoleLog(() => beforeBuild(context()));

            assert.strictEqual(result, true);
            assert.deepStrictEqual(logged, []);
        });

        it('propagates a refusal instead of silently continuing with a suspicious directory', () => {
            createModule('cpu-features', { name: 'something-else', version: '1.0.0' });

            assert.throws(() => captureConsoleLog(() => beforeBuild(context())), /refusing to remove/);
            assert.strictEqual(fs.existsSync(moduleDir), true);
        });
    });
});
