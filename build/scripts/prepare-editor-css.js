/*
 * Creates standalone editor stylesheets loaded inside the TinyMCE iframe
 */
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', '..', 'app', 'src', 'css');
const distDir = path.join(__dirname, '..', '..', 'app', 'dist', 'css');

const targets = {
    'editor.css': [
        'css-variables.css',
        'editor/scrollbar.css',
        'editor/editor.css'
    ],
    'editor-options.css': [
        'css-variables.css',
        'editor/scrollbar.css',
        'editor/editor-options.css'
    ]
};

fs.mkdirSync(distDir, { recursive: true });

for (const [output, inputs] of Object.entries(targets)) {
    const content = inputs
        .map(file => fs.readFileSync(path.join(srcDir, file), 'utf8'))
        .join('\n');
    fs.writeFileSync(path.join(distDir, output), content);
    console.log('Created: app/dist/css/' + output);
}
