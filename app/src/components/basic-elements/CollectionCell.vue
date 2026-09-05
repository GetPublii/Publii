<template>
    <div
        :class="cssClasses"
        :style="cellStyle">
        <slot></slot>
    </div>
</template>

<script>
export default {
    name: 'collection-cell',
    props: {
        minWidth: {
            default: 'auto',
            type: String
        },
        width: {
            default: 'auto',
            type: String
        },
        textAlign: {
            default: 'left',
            type: String
        },
        justifyContent: {
            default: 'left',
            type: String
        },
        variant: {
            default: '',
            type: String,
            validator: value => ['', 'titles', 'assignment', 'publish-dates', 'modification-dates', 'authors', 'actions', 'menu', 'identifier', 'file-size'].includes(value)
        }
    },
    computed: {
        cssClasses: function() {
            let classes = {
                'col': true
            };

            if(this.variant !== '') {
                classes[this.variant] = true;
            }

            return classes;
        },
        cellStyle: function() {
            // Only explicit overrides become inline styles, so variants can own their alignment
            let style = {};

            if (this.width !== 'auto') {
                style.width = this.width;
            }

            if (this.minWidth !== 'auto') {
                style.minWidth = this.minWidth;
            }

            if (this.textAlign !== 'left') {
                style.textAlign = this.textAlign;
            }

            if (this.justifyContent !== 'left') {
                style.justifyContent = this.justifyContent;
            }

            return style;
        }
    }
}
</script>

<style scoped>

.col {
    align-items: center;
    background: var(--collection-bg);
    box-sizing: content-box;
    border-bottom: 1px solid var(--border-light-color);
    display: grid;
    font-weight: var(--font-weight-regular);
    justify-content: left;
    padding: 1.4rem 1.8rem;
    text-align: left;

    &:first-child {
        padding-right: 0;
    }

    a {
        color: var(--link-invert-color);

        &:active,
        &:focus,
        &:hover {
            color: var(--link-invert-color-hover);
        }
    }

    &.checkbox {
        .featured-icon {
            fill: #dddddd;
            height: 20px;
            left: -2px;
            position: relative;
            top: 2px;
            width: 20px;
        }
    }

    &.titles {
        flex-wrap: wrap;

        .title {
            font-size: var(--font-size-ui-md);
            font-weight: var(--font-weight-medium);
            margin: 0 0 -.3rem;
            text-transform: none;
            width: 100%;
        }

        .tag {
            color: var(--text-light-color);
            font-size: var(--font-size-ui-xs);
            font-weight: var(--font-weight-regular);

            &:active,
            &:focus,
            &:hover {
                color: var(--link-primary-color);
            }
        }

        svg {
            left: 0.3rem;
            position: relative;
            top: .1rem;
        }
        
    }

    &.names {
        .name {
            font-size: var(--font-size-ui-md);
            font-weight: var(--font-weight-regular);
            margin: 0;
            text-transform: none;
        }

        .is-main-author {
            color: var(--text-light-color);
        }
    }

    &.publish-dates {
        flex-wrap: wrap;

        .publish-date,
        .modify-date {
            display: block;
            width: 100%;
        }

        .modify-date {
            color: var(--text-light-color);
            font-size: var(--font-size-ui-xs);
            margin: 0;
        }
    }

    &.authors {
        a {
            overflow: hidden;
            display: inline-block;
            text-overflow: ellipsis;
            white-space: nowrap;
             max-width: 15rem;
        }
    }
}

.actions {
    display:  flex !important;
}

/* Trailing cell for a row action menu, with the regular cell padding on both sides */
.col.menu {
    display: flex;
}

/* Numeric identifier or counter column: regular padding, centred numbers,
   a shared minimum width instead of per-screen values, never wrapped */
.col.identifier {
    justify-content: center;
    min-width: 3.5rem;
    text-align: center;
    white-space: nowrap;
}

.col.file-size {
    white-space: nowrap;
}

.item {
    &:hover,
    &.is-edited,
    &.is-expanded {
        .col {
           background: var(--collection-bg-hover);

           &:first-child {
               box-shadow: inset 3px 0 0 var(--color-primary);
           }
        }
    }

    &[data-is-draft="true"] {
        .title,
        .tags,
        .authors {
            a {
                color: var(--text-light-color);

                &:active,
                &:focus,
                &:hover {
                    color: var(--link-primary-color);
                }
            }
        }
    }
}

body[data-os="win"] {
    .col {
        &.titles {
            .title {
                margin: 0 0 -.3rem 0;
            }
        }
    }
}

/*
 * Responsive improvements
 */

@media (min-width: 1920px) {
    .col.authors a {
        max-width: 100%;
    }
}

</style>
