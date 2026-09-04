#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../..');
const sourceRoot = path.join(projectRoot, 'app/src');
const tokenFile = path.join(sourceRoot, 'css/css-variables.css');
const appearancesDirectory = path.join(sourceRoot, 'css/appearances');
const appearanceFiles = fs.existsSync(appearancesDirectory)
    ? fs.readdirSync(appearancesDirectory)
        .filter((file) => path.extname(file) === '.css')
        .map((file) => path.join(appearancesDirectory, file))
        .sort()
    : [];
const appearanceFileSet = new Set(appearanceFiles);
const tokenFiles = [tokenFile, ...appearanceFiles];
const tokenFileSet = new Set(tokenFiles);
const publiiAppearanceFile = path.join(appearancesDirectory, 'publii.css');
const appAppearanceHelperFile = path.join(sourceRoot, 'helpers/app-appearance.js');
const colorBaselineFile = path.join(__dirname, 'design-system-baseline.json');
const supportedExtensions = new Set(['.css', '.js', '.vue']);
const additionalContractFiles = [
    path.join(sourceRoot, 'assets/vendor/css/codemirror.css'),
    path.join(projectRoot, 'app/config/AST.app.config.js'),
    path.join(projectRoot, 'app/config/AST.currentSite.config.js')
];
const legacyTokenCompatibility = new Map([
    [path.join(sourceRoot, 'store/helpers/mutations.js'), new Set([
        '--font-base',
        '--font-serif'
    ])]
]);
const excludedSourceParts = [
    '/assets/vendor/',
    '/helpers/vendor/'
];
const colorLiteralExemptions = [
    '/assets/vendor/',
    '/components/block-editor/',
    '/components/post-editor/',
    '/css/editor/',
    '/css/vendor/',
    '/helpers/vendor/',
    '/components/ColorPicker.vue',
    '/components/PostEditorBlockEditor.vue',
    '/components/PostEditorMarkdown.vue',
    '/components/PostEditorTinyMCE.vue',
    '/components/Splashscreen.vue',
    '/components/basic-elements/ColorPicker.vue',
    '/helpers/sass-colors.js'
];
const spacingLiteralExemptions = [
    '/assets/vendor/',
    '/components/block-editor/',
    '/components/post-editor/',
    '/components/PostEditorBlockEditor.vue',
    '/components/PostEditorMarkdown.vue',
    '/components/PostEditorTinyMCE.vue',
    '/css/editor/',
    '/css/vendor/'
];
const legacyTokens = [
    '--app-font-base',
    '--border-radius',
    '--button-bg',
    '--button-bg-hover',
    '--button-tertiary-bg',
    '--button-tertiary-bg-hover',
    '--black-rgb',
    '--box-shadow-medium',
    '--box-shadow-small',
    '--color-danger-rgb',
    '--color-highlight-rgb',
    '--color-primary-rgb',
    '--color-success-rgb',
    '--font-base',
    '--font-monospace',
    '--font-serif',
    '--font-weight-normal',
    '--letter-spacing',
    '--line-height',
    '--shadow',
    '--spacing',
    '--transition',
    '--white-rgb'
];
const legacyComponentProps = {
    'p-button': ['type'],
    'btn-dropdown': ['type', 'buttonColor'],
    'collection': ['formIsOpened', 'itemsCount'],
    'collection-cell': ['type'],
    'collection-row': ['cssClasses'],
    'dropdown': ['selected'],
    'fields-group': ['type'],
    'icon': ['properties'],
    'image-upload': ['type'],
    'overlay': ['hasBorder', 'isBlue'],
    'progress-bar': ['color', 'stopped'],
    'radio-buttons': ['selected'],
    'switcher': ['checked'],
    'tabs': ['isHorizontal', 'isScrollable'],
    'text-input': ['properties', 'ariaInvalid']
};
const tokenDefinitionPattern = /(^|[;{\s'"])(--[a-zA-Z0-9_-]+)\s*:/gm;
const tokenReferencePattern = /var\(\s*(--[a-zA-Z0-9_-]+)/g;
const tokenOccurrencePattern = /--[a-zA-Z0-9_-]+/g;
const runtimeDefinitionPattern = /setProperty\(\s*['"](--[a-zA-Z0-9_-]+)['"]/g;
const colorLiteralPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(\s*(?!var\()[^)]+\)|hsla?\(\s*(?!var\()[^)]+\)|oklch\(\s*(?!from\s+var\()[^)]+\)/g;
const privatePaletteDefinitionPattern = /(--palette-(?:brand|neutral)-\d+)\s*:\s*([^;]+);/g;
const oklchLiteralPattern = /^oklch\(\s*\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s*\)$/;
const statusColorTokens = [
    '--color-danger',
    '--color-success',
    '--color-warning',
    '--color-highlight',
    '--color-highlight-surface',
    '--shadow-color'
];
const appearanceVisualTokens = [
    '--font-family-sans',
    '--font-family-serif',
    '--font-family-mono',
    '--font-size-ui-xs',
    '--font-size-ui-sm',
    '--font-size-ui-md',
    '--font-size-ui-lg',
    '--font-size-ui-xl',
    '--font-weight-light',
    '--font-weight-regular',
    '--font-weight-medium',
    '--font-weight-semibold',
    '--font-weight-bold',
    '--line-height-base',
    '--radius-base',
    '--space-unit',
    '--space-1',
    '--space-2',
    '--space-3',
    '--space-4',
    '--space-6',
    '--space-8',
    '--space-12',
    '--space-16',
    '--transition-default'
];
const spacingPropertyPattern = /((?:(?:margin|padding)(?:-[a-z-]+)?|(?:grid-)?(?:row-|column-)?gap)\s*:\s*)([^;}{]+)/g;
const spacingLiteralPattern = /(?<![-\d.])(?:0?\.25|0?\.5|0?\.75|1\.5|1|2|3|4)rem\b/g;
const typographyContracts = [
    {
        propertyPattern: /(font-size\s*:\s*)([^;}{]+)/g,
        literalPattern: /(?<![-\d.])(?:1\.2|1\.3|1\.4|1\.6|2\.4)rem\b/g
    },
    {
        propertyPattern: /(font-weight\s*:\s*)([^;}{]+)/g,
        literalPattern: /(?<![\d.])(?:300|400|500|600|700)(?![\d.])/g
    },
    {
        propertyPattern: /(line-height\s*:\s*)([^;}{]+)/g,
        literalPattern: /(?<![-\d.])1\.5(?![\d.a-zA-Z%])/g
    },
    {
        propertyPattern: /(\bfont\s*:\s*)([^;}{]+)/g,
        literalPattern: /(?<![-\d.])(?:1\.2|1\.3|1\.4|1\.6|2\.4)rem\b|(?<![\d.])(?:300|400|500|600|700)(?![\d.])|\/\s*1\.5(?=\s|$)/g
    }
];

function toProjectPath(filePath) {
    return path.relative(projectRoot, filePath).split(path.sep).join('/');
}

function toMatchPath(filePath) {
    return `/${toProjectPath(filePath)}`;
}

function walk(directory) {
    const results = [];

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const filePath = path.join(directory, entry.name);
        const matchPath = toMatchPath(filePath);

        if (entry.isDirectory()) {
            if (!excludedSourceParts.some((part) => matchPath.includes(part))) {
                results.push(...walk(filePath));
            }

            continue;
        }

        if (supportedExtensions.has(path.extname(entry.name))) {
            results.push(filePath);
        }
    }

    return results;
}

function collectMatches(content, pattern) {
    const matches = [];
    let match;

    pattern.lastIndex = 0;

    while ((match = pattern.exec(content)) !== null) {
        matches.push(match);
    }

    return matches;
}

function collectDefinitions(content) {
    return collectMatches(content, tokenDefinitionPattern).map((match) => match[2]);
}

function collectPrivatePaletteDefinitions(content) {
    return new Map(collectMatches(content, privatePaletteDefinitionPattern).map((match) => [
        match[1],
        match[2].trim()
    ]));
}

function collectDefinitionValues(content) {
    return new Map(collectMatches(content, /(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g).map((match) => [
        match[1],
        match[2].trim()
    ]));
}

function parseOklchLiteral(value) {
    const match = value.match(/^oklch\(\s*(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*\)$/);

    if (!match) {
        return null;
    }

    return {
        chroma: Number(match[2]),
        hue: Number(match[3]),
        lightness: Number(match[1]) / 100
    };
}

function oklchToLinearSrgb({ lightness, chroma, hue }) {
    const hueRadians = hue * Math.PI / 180;
    const a = chroma * Math.cos(hueRadians);
    const b = chroma * Math.sin(hueRadians);
    const lRoot = lightness + 0.3963377774 * a + 0.2158037573 * b;
    const mRoot = lightness - 0.1055613458 * a - 0.0638541728 * b;
    const sRoot = lightness - 0.0894841775 * a - 1.2914855480 * b;
    const l = lRoot ** 3;
    const m = mRoot ** 3;
    const s = sRoot ** 3;

    return {
        blue: -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
        green: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        red: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    };
}

function getRelativeLuminance(oklch) {
    const { red, green, blue } = oklchToLinearSrgb(oklch);

    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function getContrastRatio(first, second) {
    const firstLuminance = getRelativeLuminance(first);
    const secondLuminance = getRelativeLuminance(second);
    const lighter = Math.max(firstLuminance, secondLuminance);
    const darker = Math.min(firstLuminance, secondLuminance);

    return (lighter + 0.05) / (darker + 0.05);
}

function getPaletteContrast(palette, foregroundToken, backgroundToken) {
    const white = {
        chroma: 0,
        hue: 0,
        lightness: 1
    };
    const foreground = foregroundToken === '--white'
        ? white
        : parseOklchLiteral(palette.get(foregroundToken) || '');
    const background = backgroundToken === '--white'
        ? white
        : parseOklchLiteral(palette.get(backgroundToken) || '');

    if (!foreground || !background) {
        return null;
    }

    return getContrastRatio(foreground, background);
}

function collectRuntimeDefinitions(content) {
    return collectMatches(content, runtimeDefinitionPattern).map((match) => match[1]);
}

function collectReferences(content) {
    return collectMatches(content, tokenReferencePattern).map((match) => match[1]);
}

function collectOccurrences(content) {
    return collectMatches(content, tokenOccurrencePattern).map((match) => match[0]);
}

function removeAllowedLegacyTokens(content, file) {
    const allowedTokens = legacyTokenCompatibility.get(file);

    if (!allowedTokens) {
        return content;
    }

    for (const token of allowedTokens) {
        content = content.split(token).join(token.slice(2));
    }

    return content;
}

function collectLegacyComponentProps(files) {
    const violations = [];
    const componentPattern = Object.keys(legacyComponentProps).join('|');
    const tagPattern = new RegExp(`<(${componentPattern})(?=\\s|/?>)[^>]*>`, 'gs');

    for (const file of files.filter((file) => path.extname(file) === '.vue')) {
        const content = fs.readFileSync(file, 'utf8');
        const tags = content.match(tagPattern) || [];

        for (const tag of tags) {
            const component = tag.match(/^<([a-z-]+)/)[1];

            for (const prop of legacyComponentProps[component]) {
                const kebabProp = prop.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
                const propNames = prop === kebabProp ? prop : `${prop}|${kebabProp}`;
                const propPattern = new RegExp(`\\s(?::|v-bind:)?(?:${propNames})(?:\\s*=|(?=\\s|/?>))`);

                if (propPattern.test(tag)) {
                    violations.push(`${toProjectPath(file)}: <${component}> still uses ${prop}`);
                }
            }
        }
    }

    return violations;
}

function collectCssRules(content) {
    const rules = [];
    let cursor = 0;

    while (cursor < content.length) {
        const start = content.indexOf('{', cursor);

        if (start === -1) {
            break;
        }

        const selector = content
            .slice(cursor, start)
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .trim();
        let depth = 0;
        let end = -1;

        for (let index = start; index < content.length; index += 1) {
            if (content[index] === '{') {
                depth += 1;
            } else if (content[index] === '}') {
                depth -= 1;

                if (depth === 0) {
                    end = index;
                    break;
                }
            }
        }

        if (end === -1) {
            break;
        }

        if (selector) {
            rules.push({
                body: content.slice(start + 1, end),
                selector
            });
        }

        cursor = end + 1;
    }

    return rules;
}

function getSelectorAttribute(selector, attribute) {
    const match = selector.match(new RegExp(`${attribute}="([^"]+)"`));

    return match ? match[1] : null;
}

function collectAppearanceRules(content) {
    return collectCssRules(content)
        .map((rule) => ({
            ...rule,
            appAppearance: getSelectorAttribute(rule.selector, 'data-app-appearance'),
            colorScheme: getSelectorAttribute(rule.selector, 'data-color-scheme'),
            workspaceAccent: getSelectorAttribute(rule.selector, 'data-workspace-accent')
        }))
        .filter((rule) => rule.appAppearance);
}

function collectAppearanceRegistry(content) {
    const registry = new Map();
    const entryPattern = /^ {4}(['"]?)([a-z0-9-]+)\1:\s*Object\.freeze\(\{\s*workspaceAccents:\s*Object\.freeze\(\[([\s\S]*?)\]\)\s*\}\)/gm;
    let match;

    while ((match = entryPattern.exec(content)) !== null) {
        const accents = collectMatches(match[3], /['"]([a-z0-9-]+)['"]|DEFAULT_WORKSPACE_ACCENT/g)
            .map((accentMatch) => accentMatch[1] || 'default');

        registry.set(match[2], accents);
    }

    return registry;
}

function normalizeColorLiteral(literal) {
    return literal.toLowerCase().replace(/\s+/g, '');
}

function collectOwnedColorLiterals(files) {
    const literals = {};

    for (const file of files) {
        const matchPath = toMatchPath(file);

        if (tokenFileSet.has(file) || colorLiteralExemptions.some((part) => matchPath.includes(part))) {
            continue;
        }

        const content = fs.readFileSync(file, 'utf8');
        const matches = collectMatches(content, colorLiteralPattern);

        for (const match of matches) {
            const projectPath = toProjectPath(file);
            const literal = normalizeColorLiteral(match[0]);

            literals[projectPath] = literals[projectPath] || {};
            literals[projectPath][literal] = (literals[projectPath][literal] || 0) + 1;
        }
    }

    return literals;
}

function compareColorBaseline(current, baseline) {
    const additions = [];
    const reductions = [];
    const allPaths = new Set([
        ...Object.keys(current),
        ...Object.keys(baseline)
    ]);

    for (const file of [...allPaths].sort()) {
        const currentColors = current[file] || {};
        const baselineColors = baseline[file] || {};
        const allColors = new Set([
            ...Object.keys(currentColors),
            ...Object.keys(baselineColors)
        ]);

        for (const color of [...allColors].sort()) {
            const currentCount = currentColors[color] || 0;
            const baselineCount = baselineColors[color] || 0;

            if (currentCount > baselineCount) {
                additions.push(`${file}: ${color} (+${currentCount - baselineCount})`);
            } else if (currentCount < baselineCount) {
                reductions.push(`${file}: ${color} (-${baselineCount - currentCount})`);
            }
        }
    }

    return { additions, reductions };
}

function countColorLiterals(literals) {
    return Object.values(literals).reduce((total, colors) => {
        return total + Object.values(colors).reduce((sum, count) => sum + count, 0);
    }, 0);
}

function collectStyleBlocks(file, content) {
    if (path.extname(file) === '.css') {
        return [{ content, offset: 0 }];
    }

    return collectMatches(content, /<style\b[^>]*>([\s\S]*?)<\/style>/gi).map((match) => ({
        content: match[1],
        offset: match.index + match[0].indexOf(match[1])
    }));
}

function collectSpacingLiteralViolations(files) {
    const violations = [];

    for (const file of files) {
        const matchPath = toMatchPath(file);

        if (spacingLiteralExemptions.some((part) => matchPath.includes(part))) {
            continue;
        }

        const content = fs.readFileSync(file, 'utf8');
        const blocks = collectStyleBlocks(file, content);

        for (const block of blocks) {
            for (const propertyMatch of collectMatches(block.content, spacingPropertyPattern)) {
                for (const literalMatch of collectMatches(propertyMatch[2], spacingLiteralPattern)) {
                    const offset = block.offset + propertyMatch.index + propertyMatch[1].length + literalMatch.index;
                    const line = content.slice(0, offset).split('\n').length;

                    violations.push(`${toProjectPath(file)}:${line}: ${literalMatch[0]}`);
                }
            }
        }
    }

    return violations;
}

function collectTypographyLiteralViolations(files) {
    const violations = [];

    for (const file of files) {
        const matchPath = toMatchPath(file);

        if (spacingLiteralExemptions.some((part) => matchPath.includes(part))) {
            continue;
        }

        const content = fs.readFileSync(file, 'utf8');
        const blocks = collectStyleBlocks(file, content);

        for (const block of blocks) {
            for (const contract of typographyContracts) {
                for (const propertyMatch of collectMatches(block.content, contract.propertyPattern)) {
                    for (const literalMatch of collectMatches(propertyMatch[2], contract.literalPattern)) {
                        const offset = block.offset + propertyMatch.index + propertyMatch[1].length + literalMatch.index;
                        const line = content.slice(0, offset).split('\n').length;

                        violations.push(`${toProjectPath(file)}:${line}: ${literalMatch[0].trim()}`);
                    }
                }
            }
        }
    }

    return violations;
}

function printList(label, entries) {
    if (!entries.length) {
        return;
    }

    console.error(`\n${label}`);

    for (const entry of entries) {
        console.error(`  - ${entry}`);
    }
}

function main() {
    const errors = [];
    const information = [];
    const files = [
        ...walk(sourceRoot),
        ...additionalContractFiles.filter((file) => fs.existsSync(file))
    ];

    if (process.argv.includes('--print-color-baseline')) {
        console.log(JSON.stringify({
            version: 1,
            colorLiterals: collectOwnedColorLiterals(files)
        }, null, 4));
        return;
    }

    const tokenContents = new Map(tokenFiles.map((file) => [file, fs.readFileSync(file, 'utf8')]));
    const contractTokenDefinitions = tokenFiles.flatMap((file) => collectDefinitions(tokenContents.get(file)));
    const globalTokens = new Set(contractTokenDefinitions);
    const allDefinitions = new Set(globalTokens);
    const allReferences = new Set();
    const allOccurrences = new Map();
    const privatePaletteReferences = [];
    const directAppearanceAssignments = [];

    for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        const contractContent = removeAllowedLegacyTokens(content, file);

        if (file !== appAppearanceHelperFile && /setAttribute\(\s*['"]data-(?:theme|app-appearance|color-scheme|workspace-accent)['"]/.test(content)) {
            directAppearanceAssignments.push(toProjectPath(file));
        }

        for (const token of collectDefinitions(content)) {
            allDefinitions.add(token);
        }

        for (const token of collectRuntimeDefinitions(content)) {
            allDefinitions.add(token);
        }

        for (const token of collectReferences(contractContent)) {
            allReferences.add(token);

            if (!appearanceFileSet.has(file) && token.startsWith('--palette-')) {
                privatePaletteReferences.push(`${toProjectPath(file)}: ${token}`);
            }
        }

        for (const token of collectOccurrences(contractContent)) {
            allOccurrences.set(token, (allOccurrences.get(token) || 0) + 1);
        }
    }

    const unresolved = [...allReferences]
        .filter((token) => !allDefinitions.has(token))
        .sort();
    const unused = [...globalTokens]
        .filter((token) => (allOccurrences.get(token) || 0) <= contractTokenDefinitions.filter((item) => item === token).length)
        .sort();
    const invalidNames = [...globalTokens]
        .filter((token) => !/^--[a-z0-9]+(?:-[a-z0-9]+)*$/.test(token))
        .sort();
    const legacyOccurrences = legacyTokens
        .filter((token) => allOccurrences.has(token))
        .sort();

    if (unresolved.length) {
        errors.push(...unresolved.map((token) => `Unresolved custom property: ${token}`));
    }

    if (unused.length) {
        errors.push(...unused.map((token) => `Unused global token: ${token}`));
    }

    if (invalidNames.length) {
        errors.push(...invalidNames.map((token) => `Invalid global token name: ${token}`));
    }

    if (legacyOccurrences.length) {
        errors.push(...legacyOccurrences.map((token) => `Legacy token is still present: ${token}`));
    }

    errors.push(...privatePaletteReferences.map((entry) => `Private palette token used outside its owner: ${entry}`));
    errors.push(...directAppearanceAssignments.map((entry) => `Appearance attributes must be applied through app-appearance.js: ${entry}`));
    errors.push(...collectLegacyComponentProps(files).map((entry) => `Legacy component prop: ${entry}`));
    errors.push(...collectSpacingLiteralViolations(files).map((entry) => `Canonical spacing literal must use the shared scale: ${entry}`));
    errors.push(...collectTypographyLiteralViolations(files).map((entry) => `Canonical typography literal must use the shared token: ${entry}`));

    const appearanceContracts = new Map();
    const cssAppAppearances = new Set();
    const appearanceHelperContent = fs.existsSync(appAppearanceHelperFile)
        ? fs.readFileSync(appAppearanceHelperFile, 'utf8')
        : '';
    const appearanceRegistry = collectAppearanceRegistry(appearanceHelperContent);

    if (!appearanceFiles.length) {
        errors.push('No application appearance files were found in app/src/css/appearances.');
    }

    if (!appearanceRegistry.size) {
        errors.push('The application appearance registry is empty or invalid.');
    }

    for (const appearanceFile of appearanceFiles) {
        const appearanceContent = tokenContents.get(appearanceFile);
        const appearanceRules = collectAppearanceRules(appearanceContent);
        const commonRules = appearanceRules.filter((rule) => !rule.colorScheme && !rule.workspaceAccent);
        const baseRules = appearanceRules.filter((rule) => rule.colorScheme && !rule.workspaceAccent);
        const accentRules = appearanceRules.filter((rule) => rule.colorScheme && rule.workspaceAccent);
        const appAppearances = new Set(appearanceRules.map((rule) => rule.appAppearance));

        if (!appAppearances.size) {
            errors.push(`${toProjectPath(appearanceFile)} does not define an appAppearance.`);
        }

        if (appAppearances.size > 1) {
            errors.push(`${toProjectPath(appearanceFile)} must define exactly one appAppearance.`);
        }

        for (const appAppearance of appAppearances) {
            cssAppAppearances.add(appAppearance);
            const expectedAppAppearance = path.basename(appearanceFile, '.css');
            const appCommonRules = commonRules.filter((rule) => rule.appAppearance === appAppearance);
            const commonTokens = new Set(appCommonRules.flatMap((rule) => collectDefinitions(rule.body)));
            const missingVisualTokens = appearanceVisualTokens.filter((token) => !commonTokens.has(token));
            const registeredAccents = appearanceRegistry.get(appAppearance) || [];
            const duplicateRegisteredAccents = registeredAccents.filter((accent, index) => registeredAccents.indexOf(accent) !== index);

            if (appAppearance !== expectedAppAppearance) {
                errors.push(`${toProjectPath(appearanceFile)} defines ${appAppearance}; its filename requires ${expectedAppAppearance}.`);
            }

            if (!appearanceRegistry.has(appAppearance)) {
                errors.push(`${appAppearance} is not registered in app-appearance.js.`);
            }

            if (registeredAccents[0] !== 'default') {
                errors.push(`${appAppearance} must register default as its first workspace accent.`);
            }

            errors.push(...duplicateRegisteredAccents.map((accent) => `${appAppearance} registers workspace accent more than once: ${accent}`));

            errors.push(...missingVisualTokens.map((token) => `${appAppearance} shared visual language is missing: ${token}`));
            errors.push(...registeredAccents
                .filter((accent) => !commonTokens.has(`--workspace-accent-${accent}-preview`))
                .map((accent) => `${appAppearance}/${accent} is missing its preview token.`));

            if (!missingVisualTokens.length) {
                information.push(`${appAppearance} shared visual language: ${appearanceVisualTokens.length} required tokens`);
            }

            const schemeRules = baseRules.filter((rule) => rule.appAppearance === appAppearance);
            const lightRules = schemeRules.filter((rule) => rule.colorScheme === 'light');
            const darkRules = schemeRules.filter((rule) => rule.colorScheme === 'dark');

            if (lightRules.length !== 1 || darkRules.length !== 1) {
                errors.push(`${appAppearance} must define exactly one light and one dark appearance rule.`);
                continue;
            }

            const lightRule = lightRules[0].body;
            const darkRule = darkRules[0].body;
            const lightTokens = new Set(collectDefinitions(lightRule).filter((token) => !token.startsWith('--palette-')));
            const darkTokens = new Set(collectDefinitions(darkRule).filter((token) => !token.startsWith('--palette-')));
            const missingInDark = [...lightTokens].filter((token) => !darkTokens.has(token)).sort();
            const missingInLight = [...darkTokens].filter((token) => !lightTokens.has(token)).sort();

            errors.push(...missingInDark.map((token) => `${appAppearance} light-only appearance token: ${token}`));
            errors.push(...missingInLight.map((token) => `${appAppearance} dark-only appearance token: ${token}`));

            if (!missingInDark.length && !missingInLight.length) {
                information.push(`${appAppearance} light/dark appearance parity: ${lightTokens.size} tokens per scheme`);
            }

            const lightPalettes = collectPrivatePaletteDefinitions(lightRule);
            const darkPalettes = collectPrivatePaletteDefinitions(darkRule);
            const lightValues = collectDefinitionValues(lightRule);
            const darkValues = collectDefinitionValues(darkRule);
            const lightBrandTokens = new Set([...lightPalettes.keys()].filter((token) => token.startsWith('--palette-brand-')));
            const darkBrandTokens = new Set([...darkPalettes.keys()].filter((token) => token.startsWith('--palette-brand-')));
            const missingBrandInDark = [...lightBrandTokens].filter((token) => !darkBrandTokens.has(token)).sort();
            const missingBrandInLight = [...darkBrandTokens].filter((token) => !lightBrandTokens.has(token)).sort();

            errors.push(...missingBrandInDark.map((token) => `${appAppearance} light-only brand palette token: ${token}`));
            errors.push(...missingBrandInLight.map((token) => `${appAppearance} dark-only brand palette token: ${token}`));

            for (const [scheme, palettes] of [['light', lightPalettes], ['dark', darkPalettes]]) {
                for (const [token, value] of palettes) {
                    if (!oklchLiteralPattern.test(value)) {
                        errors.push(`${appAppearance} ${scheme} private palette token must use a literal OKLCH value: ${token}`);
                    }
                }
            }

            if (!missingBrandInDark.length && !missingBrandInLight.length) {
                information.push(`${appAppearance} brand palette parity: ${lightBrandTokens.size} OKLCH tokens per scheme`);
            }

            information.push(`${appAppearance} private palettes use OKLCH: ${lightPalettes.size} light and ${darkPalettes.size} dark tokens`);

            for (const [scheme, values] of [['light', lightValues], ['dark', darkValues]]) {
                for (const token of statusColorTokens) {
                    if (!values.has(token)) {
                        errors.push(`${appAppearance} ${scheme} scheme is missing required status color: ${token}`);
                    } else if (!values.get(token).startsWith('oklch(')) {
                        errors.push(`${appAppearance} ${scheme} status color must use OKLCH: ${token}`);
                    }
                }
            }

            appearanceContracts.set(appAppearance, lightTokens);
            information.push(`${appAppearance} status and shadow foundations use OKLCH: ${statusColorTokens.length} tokens per scheme`);

            const appAccentRules = accentRules.filter((rule) => rule.appAppearance === appAppearance);
            const workspaceAccents = new Set(appAccentRules.map((rule) => rule.workspaceAccent));
            const registeredOverrides = new Set(registeredAccents.filter((accent) => accent !== 'default'));

            errors.push(...[...registeredOverrides]
                .filter((accent) => !workspaceAccents.has(accent))
                .map((accent) => `${appAppearance}/${accent} is registered but has no CSS override.`));
            errors.push(...[...workspaceAccents]
                .filter((accent) => !registeredOverrides.has(accent))
                .map((accent) => `${appAppearance}/${accent} has a CSS override but is not registered.`));

            for (const workspaceAccent of workspaceAccents) {
                const accentSchemeRules = appAccentRules.filter((rule) => rule.workspaceAccent === workspaceAccent);
                const accentLightRules = accentSchemeRules.filter((rule) => rule.colorScheme === 'light');
                const accentDarkRules = accentSchemeRules.filter((rule) => rule.colorScheme === 'dark');

                if (accentLightRules.length !== 1 || accentDarkRules.length !== 1) {
                    errors.push(`${appAppearance}/${workspaceAccent} must define exactly one light and one dark accent rule.`);
                    continue;
                }

                const accentPalettesByScheme = new Map([
                    ['light', collectPrivatePaletteDefinitions(accentLightRules[0].body)],
                    ['dark', collectPrivatePaletteDefinitions(accentDarkRules[0].body)]
                ]);

                for (const [scheme, rule] of [['light', accentLightRules[0]], ['dark', accentDarkRules[0]]]) {
                    const accentTokens = new Set(collectDefinitions(rule.body));
                    const accentPalettes = accentPalettesByScheme.get(scheme);
                    const nonBrandTokens = [...accentTokens].filter((token) => !token.startsWith('--palette-brand-')).sort();
                    const missingBrandTokens = [...lightBrandTokens].filter((token) => !accentTokens.has(token)).sort();
                    const unexpectedBrandTokens = [...accentTokens].filter((token) => !lightBrandTokens.has(token)).sort();

                    errors.push(...nonBrandTokens.map((token) => `${appAppearance}/${workspaceAccent} ${scheme} accent overrides a non-brand token: ${token}`));
                    errors.push(...missingBrandTokens.map((token) => `${appAppearance}/${workspaceAccent} ${scheme} accent is missing: ${token}`));
                    errors.push(...unexpectedBrandTokens.map((token) => `${appAppearance}/${workspaceAccent} ${scheme} accent has an unexpected token: ${token}`));

                    for (const [token, value] of accentPalettes) {
                        if (!oklchLiteralPattern.test(value)) {
                            errors.push(`${appAppearance}/${workspaceAccent} ${scheme} token must use a literal OKLCH value: ${token}`);
                        }
                    }
                }

                const contrastPalettes = new Map([
                    ['light', new Map([...lightPalettes, ...accentPalettesByScheme.get('light')])],
                    ['dark', new Map([...darkPalettes, ...accentPalettesByScheme.get('dark')])]
                ]);
                const contrastChecks = [
                    ['light', '--white', '--palette-brand-55', 4.5, 'primary control'],
                    ['light', '--white', '--palette-brand-60', 4.5, 'primary control hover'],
                    ['light', '--palette-brand-65', '--palette-brand-10', 4.5, 'secondary control'],
                    ['light', '--palette-brand-70', '--palette-brand-15', 4.5, 'secondary control hover'],
                    ['light', '--palette-brand-65', '--white', 4.5, 'link'],
                    ['dark', '--white', '--palette-brand-50', 4.5, 'primary control'],
                    ['dark', '--white', '--palette-brand-55', 4.5, 'primary control hover'],
                    ['dark', '--palette-neutral-5', '--palette-brand-50', 4.5, 'sidebar sync control'],
                    ['dark', '--palette-brand-25', '--palette-brand-75', 4.5, 'secondary control'],
                    ['dark', '--palette-brand-15', '--palette-brand-70', 4.5, 'secondary control hover'],
                    ['dark', '--palette-brand-40', '--palette-neutral-60', 4.5, 'link'],
                    ['dark', '--palette-brand-50', '--palette-neutral-60', 3, 'focus indicator']
                ];
                let contrastFailures = 0;

                for (const [scheme, foreground, background, minimum, usage] of contrastChecks) {
                    const ratio = getPaletteContrast(contrastPalettes.get(scheme), foreground, background);

                    if (ratio === null) {
                        contrastFailures += 1;
                        errors.push(`${appAppearance}/${workspaceAccent} ${scheme} ${usage} contrast could not be calculated.`);
                    } else if (ratio < minimum) {
                        contrastFailures += 1;
                        errors.push(`${appAppearance}/${workspaceAccent} ${scheme} ${usage} contrast is ${ratio.toFixed(2)}:1; expected at least ${minimum}:1.`);
                    }
                }

                information.push(`${appAppearance}/${workspaceAccent} workspace accent: ${lightBrandTokens.size} light and dark brand tokens`);

                if (!contrastFailures) {
                    information.push(`${appAppearance}/${workspaceAccent} workspace accent: WCAG AA contrast for semantic controls and links`);
                }
            }
        }
    }

    for (const appAppearance of appearanceRegistry.keys()) {
        if (!cssAppAppearances.has(appAppearance)) {
            errors.push(`${appAppearance} is registered but has no appearance CSS file.`);
        }
    }

    const publiiContract = appearanceContracts.get('publii');

    if (publiiContract) {
        for (const [appAppearance, contract] of appearanceContracts) {
            const missingFromAppearance = [...publiiContract].filter((token) => !contract.has(token)).sort();
            const extraInAppearance = [...contract].filter((token) => !publiiContract.has(token)).sort();

            errors.push(...missingFromAppearance.map((token) => `${appAppearance} is missing the Publii semantic contract token: ${token}`));
            errors.push(...extraInAppearance.map((token) => `${appAppearance} adds a non-contract semantic token: ${token}`));
        }
    }

    if (!fs.existsSync(publiiAppearanceFile)) {
        errors.push('Missing app/src/css/appearances/publii.css.');
    } else {
        const publiiAppearanceContent = tokenContents.get(publiiAppearanceFile);

        if (!publiiAppearanceContent.includes('data-theme="default"') ||
            !publiiAppearanceContent.includes('data-theme="dark"') ||
            !publiiAppearanceContent.includes('data-app-appearance="publii"') ||
            !publiiAppearanceContent.includes('data-color-scheme="light"') ||
            !publiiAppearanceContent.includes('data-color-scheme="dark"')) {
            errors.push('The Publii appAppearance/colorScheme compatibility selectors are incomplete.');
        }
    }

    if (!fs.existsSync(appAppearanceHelperFile)) {
        errors.push(`Missing application appearance runtime: ${toProjectPath(appAppearanceHelperFile)}`);
    } else {
        for (const attribute of ['data-theme', 'data-app-appearance', 'data-color-scheme', 'data-workspace-accent']) {
            if (!appearanceHelperContent.includes(`setAttribute('${attribute}'`)) {
                errors.push(`Application appearance runtime does not set ${attribute}.`);
            }
        }
    }

    if (!fs.existsSync(colorBaselineFile)) {
        errors.push(`Missing color-literal baseline: ${toProjectPath(colorBaselineFile)}`);
    } else {
        const baseline = JSON.parse(fs.readFileSync(colorBaselineFile, 'utf8'));
        const currentLiterals = collectOwnedColorLiterals(files);
        const comparison = compareColorBaseline(currentLiterals, baseline.colorLiterals || {});

        errors.push(...comparison.additions.map((entry) => `New owned color literal: ${entry}`));

        if (comparison.reductions.length) {
            information.push(`Color-literal debt reduced in ${comparison.reductions.length} place(s); lower the baseline when the reduction is intentional`);
        }

        information.push(`Owned color-literal baseline: ${countColorLiterals(currentLiterals)} occurrences`);
    }

    information.unshift(`Global design tokens: ${globalTokens.size}`);
    information.push(`Resolved custom-property references: ${allReferences.size}`);
    information.push('Primitive palettes remain private to appAppearance files');
    information.push('Canonical application spacing uses the shared scale');
    information.push('Canonical application typography uses shared tokens');
    information.push('Application appearance attributes have one runtime owner');
    information.push('Editor-owned and vendor styles remain outside the color-literal baseline');

    console.log('Publii design-system audit');

    for (const item of information) {
        console.log(`  ✓ ${item}`);
    }

    printList('Errors:', errors);

    if (errors.length) {
        console.error(`\nAudit failed with ${errors.length} error(s).`);
        process.exitCode = 1;
        return;
    }

    console.log('\nAudit passed.');
}

main();
