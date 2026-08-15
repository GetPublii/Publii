// Solves issues with imports and protects code before making @import parts becoming global code
const fs = require('fs');
const path = require('path');
const postcss = require('postcss');

function inlineImports (loaderContext, css, dir, seen) {
    return css.replace(/^[ \t]*@import[ \t]+(['"])([^'"]+)\1[ \t]*;[ \t]*\r?\n?/gm, (match, quote, specificity) => {
        if (!specificity.startsWith('.')) {
            return match;
        }

        let file = path.resolve(dir, specificity);

        if (seen.has(file)) {
            return '';
        }

        seen.add(file);
        loaderContext.addDependency(file);
        let content = fs.readFileSync(file, 'utf8');
        return inlineImports(loaderContext, content, path.dirname(file), seen) + '\n';
    });
}

function resolveParts(selectors, parentParts) {
    let output = [];

    for (let selector of selectors) {
        if (selector.includes('&')) {
            for (let parentPart of parentParts) {
                output.push(selector.replace(/&/g, parentPart));
            }
        } else {
            for (let parentPart of parentParts) {
                output.push(parentPart + ' ' + selector);
            }
        }
    }

    return output;
}

function flattenInto(container, rule, parentParts) {
    let parts = parentParts ? resolveParts(rule.selectors, parentParts) : rule.selectors.slice();
    let own = rule.nodes.filter((n) => n.type === 'decl' || n.type === 'comment');

    if (own.some((n) => n.type === 'decl')) {
        let flat = postcss.rule({ 
            selector: parts.join(',\n'), 
            raws: { 
                before: '\n\n', 
                between: ' ', 
                semicolon: true 
            } 
        });
        
        flat.append(own.map((n) => n.clone()));
        container.append(flat);
    }

    for (let child of rule.nodes) {
        if (child.type === 'rule') {
            flattenInto(container, child, parts);
        } else if (
            child.type === 'atrule' && (
                child.name === 'media' || 
                child.name === 'supports' || 
                child.name === 'container'
            ) && 
            child.nodes
        ) {
            let atRule = postcss.atRule({ 
                name: child.name, 
                params: child.params, 
                raws: { 
                    before: '\n\n', 
                    between: ' ', 
                    semicolon: true 
                } 
            });
            container.append(atRule);

            let innerDecls = child.nodes.filter((n) => n.type === 'decl' || n.type === 'comment');

            if (innerDecls.some((n) => n.type === 'decl')) {
                const flat = postcss.rule({ 
                    selector: parts.join(',\n'), 
                    raws: { 
                        before: '\n', 
                        between: ' ', 
                        semicolon: true 
                    } 
                });
                
                flat.append(innerDecls.map((n) => n.clone()));
                atRule.append(flat);
            }

            for (let subNode of child.nodes) {
                if (subNode.type === 'rule') {
                    flattenInto(atRule, subNode, parts);
                }
            }
        } else if (child.type === 'atrule' && child.nodes) {
            container.append(child.clone());
        }
    }
}

function flatten(css) {
    let root = postcss.parse(css);
    let out = postcss.root();

    for (let node of root.nodes) {
        if (node.type === 'rule') {
            flattenInto(out, node, null);
        } else if (
            node.type === 'atrule' && (
                node.name === 'media' || 
                node.name === 'supports' || 
                node.name === 'container'
            ) && 
            node.nodes
        ) {
            let atRule = postcss.atRule({ 
                name: node.name, 
                params: node.params, 
                raws: { 
                    before: '\n\n', 
                    between: ' ', 
                    semicolon: true 
                } 
            });
            
            out.append(atRule);

            for (let subNode of node.nodes) {
                if (subNode.type === 'rule') {
                    flattenInto(atRule, subNode, null);
                } else {
                    atRule.append(subNode.clone());
                }
            }
        } else {
            out.append(node.clone());
        }
    }

    return out.toString();
}

module.exports = function (source) {
    const inlined = inlineImports(this, source, path.dirname(this.resourcePath), new Set());
    return flatten(inlined);
};
