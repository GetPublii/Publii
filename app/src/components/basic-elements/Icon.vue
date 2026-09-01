<template>
    <svg
        :class="cssClasses"
        :style="style">
        <use :xlink:href="iconPath" />
    </svg>
</template>

<script>
import SassColors from './../../helpers/sass-colors.js';

export default {
    props: {
        'name': {
            default: '',
            type: String
        },
        'size': {
            default: '',
            type: String,
            validator: value => ['', 'xxxs', 'xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl'].includes(value)
        },
        'iconset': {
            default: 'svg-map',
            type: String
        },
        'primaryColor': {
            default: '',
            type: String
        },
        'strokeColor': {  // Changed from primaryStroke to strokeColor
            default: '',
            type: String
        },
        'nonInteractive': {
            default: false,
            type: Boolean
        },
        'customCssClasses': {
            default: '',
            type: String
        },
        'customWidth': {
            default: '',
            type: String
        },
        'customHeight': {
            default: '',
            type: String
        }
    },
    name: 'icon',
    computed: {
        cssClasses: function() {
            let classes = {
                'icon': true,
                'size-xxxs': this.size === 'xxxs',
                'size-xxs': this.size === 'xxs',
                'size-xs': this.size === 'xs',
                'size-s': this.size === 's',
                'size-m': this.size === 'm',
                'size-l': this.size === 'l',
                'size-xl': this.size === 'xl',
                'size-xxl': this.size === 'xxl',
                'size-xxxl': this.size === 'xxxl',
                'not-clickable': this.nonInteractive
            };

            if(this.customCssClasses !== '') {
                let additionalCssClasses = this.customCssClasses.split(' ');

                for(let cssClass of additionalCssClasses) {
                    classes[cssClass] = true;
                }
            }

            return classes;
        },
        style: function() {
            let style = [];

            if(this.primaryColor !== '' && SassColors[this.primaryColor]) {
                style.push(`fill: ${SassColors[this.primaryColor]}`);
            }

            if(this.strokeColor !== '' && SassColors[this.strokeColor]) {
                style.push(`color: ${SassColors[this.strokeColor]}`);
            }

            if(this.customWidth !== '') {
                style.push(`width: ${this.customWidth}px`);
            }

            if(this.customHeight !== '') {
                style.push(`height: ${this.customHeight}px`);
            }

            return style.join(';')
        },
        iconPath: function() {
            return `../src/assets/svg/${this.iconset}.svg#${this.name}`;
        }
    }
}
</script>

<style scoped>

.icon {
    &.size-xxxs {
        height: 10px;
        width: 10px;
    }

    &.size-xxs {
        height: 12px;
        width: 12px;
    }

    &.size-xs {
        height: 16px;
        width: 16px;
    }

    &.size-s {
        height: 20px;
        width: 20px;
    }

    &.size-m {
        height: 24px;
        width: 24px;
    }

    &.size-l {
        height: 32px;
        width: 32px;
    }

    &.size-xl {
        height: 50px;
        width: 50px;
    }

    &.size-xxl {
        height: 100px;
        width: 100px;
    }

    &.size-xxxl {
        height: 200px;
        width: 200px;
    }

    &.not-clickable {
        pointer-events: none;
    }

    &.file {
        fill: var(--color-icon-faint);
        margin: -2px var(--space-4) -2px 0;
        position: relative!important;
        top: 4px!important;
    }

    &.file--txt {
        color: #42a5f5;
    }

    &.file--code {
        color: #2a2e30;
    }

    &.file--img {
        color: #40b771;
    }

    &.file--video {
        color: #ef5350;
    }

    &.file--zip {
        color: #2a2e30;
    }

    &.file--music {
        color: #2a2e30;
    }

    &.file--pdf {
        color: #ef5350;
    }
}

.directory-link {
    .icon {
        margin-right: var(--space-4);
        position: relative;
        top: 3px;
    }
}
</style>
