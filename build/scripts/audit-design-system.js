#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../..');
const sourceRoot = path.join(projectRoot, 'app/src');
const tokenFile = path.join(sourceRoot, 'css/css-variables.css');
const appAppearanceHelperFile = path.join(sourceRoot, 'helpers/app-appearance.js');
const colorBaselineFile = path.join(__dirname, 'design-system-baseline.json');
const supportedExtensions = new Set(['.css', '.js', '.vue']);
const additionalContractFiles = [
    path.join(sourceRoot, 'assets/vendor/css/codemirror.css'),
    path.join(projectRoot, 'app/config/AST.app.config.js')
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
    'text-input': ['properties']
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

function extractAppearanceRule(content, marker) {
    const markerIndex = content.indexOf(marker);

    if (markerIndex === -1) {
        return null;
    }

    const start = content.indexOf('{', markerIndex);

    if (start === -1) {
        return null;
    }

    let depth = 0;

    for (let index = start; index < content.length; index += 1) {
        if (content[index] === '{') {
            depth += 1;
        } else if (content[index] === '}') {
            depth -= 1;

            if (depth === 0) {
                return content.slice(start + 1, index);
            }
        }
    }

    return null;
}

function normalizeColorLiteral(literal) {
    return literal.toLowerCase().replace(/\s+/g, '');
}

function collectOwnedColorLiterals(files) {
    const literals = {};

    for (const file of files) {
        const matchPath = toMatchPath(file);

        if (file === tokenFile || colorLiteralExemptions.some((part) => matchPath.includes(part))) {
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

    const tokenContent = fs.readFileSync(tokenFile, 'utf8');
    const globalTokens = new Set(collectDefinitions(tokenContent));
    const allDefinitions = new Set(globalTokens);
    const allReferences = new Set();
    const allOccurrences = new Map();
    const privatePaletteReferences = [];
    const directAppearanceAssignments = [];

    for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        const contractContent = removeAllowedLegacyTokens(content, file);

        if (file !== appAppearanceHelperFile && /setAttribute\(\s*['"]data-(?:theme|app-appearance|color-scheme)['"]/.test(content)) {
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

            if (file !== tokenFile && token.startsWith('--palette-')) {
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
        .filter((token) => (allOccurrences.get(token) || 0) <= collectDefinitions(tokenContent).filter((item) => item === token).length)
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

    const lightRule = extractAppearanceRule(tokenContent, '/* Publii appearance: light color scheme */');
    const darkRule = extractAppearanceRule(tokenContent, '/* Publii appearance: dark color scheme */');

    if (!lightRule || !darkRule) {
        errors.push('The light and dark application appearance rules must both exist.');
    } else {
        const lightTokens = new Set(collectDefinitions(lightRule).filter((token) => !token.startsWith('--palette-')));
        const darkTokens = new Set(collectDefinitions(darkRule).filter((token) => !token.startsWith('--palette-')));
        const missingInDark = [...lightTokens].filter((token) => !darkTokens.has(token)).sort();
        const missingInLight = [...darkTokens].filter((token) => !lightTokens.has(token)).sort();

        errors.push(...missingInDark.map((token) => `Light-only appearance token: ${token}`));
        errors.push(...missingInLight.map((token) => `Dark-only appearance token: ${token}`));

        if (!missingInDark.length && !missingInLight.length) {
            information.push(`Light/dark appearance parity: ${lightTokens.size} tokens per scheme`);
        }

        const lightPalettes = collectPrivatePaletteDefinitions(lightRule);
        const darkPalettes = collectPrivatePaletteDefinitions(darkRule);
        const lightValues = collectDefinitionValues(lightRule);
        const darkValues = collectDefinitionValues(darkRule);
        const lightBrandTokens = new Set([...lightPalettes.keys()].filter((token) => token.startsWith('--palette-brand-')));
        const darkBrandTokens = new Set([...darkPalettes.keys()].filter((token) => token.startsWith('--palette-brand-')));
        const missingBrandInDark = [...lightBrandTokens].filter((token) => !darkBrandTokens.has(token)).sort();
        const missingBrandInLight = [...darkBrandTokens].filter((token) => !lightBrandTokens.has(token)).sort();

        errors.push(...missingBrandInDark.map((token) => `Light-only brand palette token: ${token}`));
        errors.push(...missingBrandInLight.map((token) => `Dark-only brand palette token: ${token}`));

        for (const [scheme, palettes] of [['light', lightPalettes], ['dark', darkPalettes]]) {
            for (const [token, value] of palettes) {
                if (!oklchLiteralPattern.test(value)) {
                    errors.push(`${scheme} private palette token must use a literal OKLCH value: ${token}`);
                }
            }
        }

        if (!missingBrandInDark.length && !missingBrandInLight.length) {
            information.push(`Light/dark brand palette parity: ${lightBrandTokens.size} OKLCH tokens per scheme`);
        }

        information.push(`Private appearance palettes use OKLCH: ${lightPalettes.size} light and ${darkPalettes.size} dark tokens`);

        for (const [scheme, values] of [['light', lightValues], ['dark', darkValues]]) {
            for (const token of statusColorTokens) {
                if (!values.has(token)) {
                    errors.push(`${scheme} scheme is missing required status color: ${token}`);
                } else if (!values.get(token).startsWith('oklch(')) {
                    errors.push(`${scheme} status color must use OKLCH: ${token}`);
                }
            }
        }

        information.push(`Status and shadow foundations use OKLCH: ${statusColorTokens.length} tokens per scheme`);
    }

    if (!tokenContent.includes('data-app-appearance="publii"') || !tokenContent.includes('data-color-scheme="light"') || !tokenContent.includes('data-color-scheme="dark"')) {
        errors.push('The appAppearance/colorScheme compatibility selectors are incomplete.');
    }

    if (!fs.existsSync(appAppearanceHelperFile)) {
        errors.push(`Missing application appearance runtime: ${toProjectPath(appAppearanceHelperFile)}`);
    } else {
        const appearanceHelperContent = fs.readFileSync(appAppearanceHelperFile, 'utf8');

        for (const attribute of ['data-theme', 'data-app-appearance', 'data-color-scheme']) {
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
    information.push('Primitive palettes remain private to css-variables.css');
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
