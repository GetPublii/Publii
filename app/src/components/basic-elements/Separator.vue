<template>
    <div :class="cssClasses" :id="anchor">
        <div 
        class="separator-wrapper"
        :class="{ 'has-label': label }">
            <label v-if="label">{{ label }}</label>
        </div>

        <small
            v-if="note"
            class="note"
            v-pure-html="note">        
        </small>
    </div>
</template>

<script>
export default {
    name: 'separator',
    props: {
        'label': {
            default: '',
            type: [String, Boolean]
        },
        'anchor': {
            default: '',
            type: String
        },
        'type': {
            default: '',
            type: String
        },
        'is-line': {
            default: true,
            type: Boolean
        },
        'note': {
            default: '',
            type: String
        },
        'customCssClasses': {
            default: '',
            type: String
        }
    },
    computed: {
        cssClasses () {
            let cssClasses = {
                'separator': true,
                'line': this.isLine,
                'no-line': this.type.indexOf('no-line') > -1,
                'empty': this.type.indexOf('empty') > -1,
                'thin': this.type.indexOf('thin') > -1,
                'small': this.type.indexOf('small') > -1,
                'medium': this.type.indexOf('medium') > -1,
                'big': this.type.indexOf('big') > -1,
                'ultra': this.type.indexOf('ultra') > -1
            };

            if (this.customCssClasses && this.customCssClasses.trim() !== '') {
                this.customCssClasses.split(' ').forEach(item => {
                    item = item.replace(/[^a-z0-9\-\_\s]/gmi, '');
                    cssClasses[item] = true;
                });
            }

            return cssClasses;
        }
    }
}
</script>

<style scoped>

.separator {
    clear: both;
    display: block;
    position: relative;
    width: 100%;

    &.small,
    &.medium,
    &.big,
    &.ultra {
        padding-bottom: var(--space-8);

        & > .separator-wrapper {

            & > label {
               margin-bottom: -2rem;
            }
        }
    }

    &.small {
        padding-top: var(--space-8);
    }

    &.medium {
        padding-top: var(--space-12);
    }

    &.big {
        padding-top: var(--space-16);
    }

    &.ultra {
        padding-top: 5rem;
    }

    & > .separator-wrapper {
        position: relative;

        & > label {
            color: var(--headings-color);
            display: block;
            font-size: var(--font-size-ui-lg);
            font-weight: var(--font-weight-semibold);
            padding: 3.5rem 0 0;

        }
    }

    & > .note {
        padding: 0;
        clear: both;
        display: block;
        font-size: var(--font-size-ui-md);
        font-style: italic;
        line-height: 1.4;
        opacity: .75;
    }

    &.line {
        & > .separator-wrapper::before {
            border-top: 4px solid var(--bg-site);
            content: "";
            left: 0;
            position: absolute;
            top: 0;
            width: 100%;
        }

        & > .note {
           padding: 2.5rem 0 0 0;
        }
    }

    &.no-line {
        padding: 0 0 var(--space-8);
        & > .separator-wrapper::before {     
            content: none; 
        }
        & > .separator-wrapper {
            padding: 0;
        }

        & > .note {
           padding: 0;
        }
    }

    &.empty {
        & > .separator-wrapper {
            padding-bottom: var(--space-1);
        }
    }

    &.thin {
          & > .separator-wrapper { 

            &::before {
                border-top: 2px solid var(--bg-site);
            }

             & > label {
                 font-size: var(--font-size-ui-lg);
                padding-top: var(--space-8);
            }
        }
    }

    & + &.thin {
        & > .separator-wrapper { 

            &::before {
                display: none;
            }
        }
    }
}

.field {
    &:first-child {

        .separator-wrapper {
            
            & > label {
                padding-top: var(--space-2);
            }

            &::before {
                display: none;
            }
        }
    }
}

.site-settings .tab  {

    .separator:first-child {

        .separator-wrapper {
            
            & > label {
                padding-top: var(--space-2);
            }

            &::before {
                display: none;
            }
        }
    }
}
</style>
