<template>
    <svg
        v-if="inlineIllustration"
        class="illustration"
        :width="width"
        :height="height"
        :viewBox="inlineIllustration.viewBox"
        :fill="inlineIllustration.fill"
        :style="illustrationStyle"
        aria-hidden="true"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
        v-html="inlineIllustration.content">
    </svg>
</template>

<script>
import illustrationMapSource from './../../assets/svg/svg-map-empty-states.svg?raw';

const AVAILABLE_ILLUSTRATIONS = [
    'backups',
    'block-editor',
    'file-manager',
    'markdown-editor',
    'menus',
    'notifications-center',
    'tags',
    'wysiwyg-editor'
];

let illustrationMap = null;

function escapeRegExp (value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getIllustrationMap () {
    if (!illustrationMap) {
        illustrationMap = new DOMParser().parseFromString(
            illustrationMapSource,
            'image/svg+xml'
        );
    }

    return illustrationMap;
}

function namespaceIllustration (symbol, namespace) {
    let illustration = symbol.cloneNode(true);
    let elements = [illustration, ...illustration.querySelectorAll('*')];
    let identifiers = new Map();
    let classes = new Map();

    elements.forEach(element => {
        if (element.id) {
            identifiers.set(element.id, `${namespace}-${element.id}`);
            element.id = identifiers.get(element.id);
        }

        if (element.hasAttribute('class')) {
            let classNames = element.getAttribute('class').split(/\s+/).filter(Boolean);

            classNames.forEach(className => {
                classes.set(className, `${namespace}-${className}`);
            });

            element.setAttribute(
                'class',
                classNames.map(className => classes.get(className)).join(' ')
            );
        }
    });

    elements.forEach(element => {
        [...element.attributes].forEach(attribute => {
            let value = attribute.value;

            identifiers.forEach((namespacedId, id) => {
                value = value.replace(
                    new RegExp(`url\\(\\s*#${escapeRegExp(id)}\\s*\\)`, 'g'),
                    `url(#${namespacedId})`
                );

                if (value === `#${id}`) {
                    value = `#${namespacedId}`;
                }
            });

            element.setAttribute(attribute.name, value);
        });
    });

    illustration.querySelectorAll('style').forEach(style => {
        let css = style.textContent;

        identifiers.forEach((namespacedId, id) => {
            css = css.replace(
                new RegExp(`url\\(\\s*#${escapeRegExp(id)}\\s*\\)`, 'g'),
                `url(#${namespacedId})`
            );
            css = css.replace(
                new RegExp(`#${escapeRegExp(id)}(?![\\w-])`, 'g'),
                `#${namespacedId}`
            );
        });

        classes.forEach((namespacedClass, className) => {
            css = css.replace(
                new RegExp(`\\.${escapeRegExp(className)}(?![\\w-])`, 'g'),
                `.${namespacedClass}`
            );
        });

        style.textContent = css;
    });

    return illustration;
}

function getInlineIllustration (symbolId, namespace) {
    let symbols = getIllustrationMap().getElementsByTagName('symbol');
    let symbol = Array.from(symbols).find(item => item.getAttribute('id') === symbolId);

    if (!symbol) {
        return null;
    }

    let illustration = namespaceIllustration(symbol, namespace);

    return {
        content: illustration.innerHTML,
        fill: illustration.getAttribute('fill'),
        viewBox: illustration.getAttribute('viewBox')
    };
}

export default {
    name: 'app-illustration',
    props: {
        name: {
            default: '',
            type: String,
            validator: value => AVAILABLE_ILLUSTRATIONS.includes(value)
        },
        width: {
            default: null,
            type: [Number, String]
        },
        height: {
            default: null,
            type: [Number, String]
        },
        scale: {
            default: 1,
            type: [Number, String]
        },
        translateY: {
            default: 0,
            type: [Number, String]
        }
    },
    computed: {
        illustrationStyle () {
            return {
                transform: `translateY(${this.translateY}px) scale(${this.scale})`,
                transformOrigin: 'center'
            };
        },
        inlineIllustration () {
            return getInlineIllustration(
                this.name,
                `illustration-${this._uid}`
            );
        }
    }
};
</script>

<style scoped>
.illustration {
    display: block;
    margin: 0 auto;
    max-width: 100%;
}
</style>
