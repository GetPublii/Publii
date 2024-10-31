<template>
    <div
        :class="cssClasses"
        :style="cellStyle">
        <slot></slot>
    </div>
</template>

<script>
export default {
    name: 'collectioncell',
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
        type: {
            default: '',
            type: String
        }
    },
    computed: {
        cssClasses: function() {
            let classes = {
                'col': true
            };

            if(this.type !== '') {
                classes[this.type] = true;
            }

            return classes;
        },
        cellStyle: function() {
            let styles = [
                'width: ' + this.width,
                'min-width: ' + this.minWidth,
                'text-align: ' + this.textAlign,
                'justify-content: ' + this.justifyContent
            ];

            return styles.join(';');
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

.col {
    align-items: center;
    background: var(--collection-bg);
    box-sizing: content-box;
    border-bottom: 1px solid var(--border-light-color);
    display: grid;
    font-weight: var(--font-weight-normal);
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
            fill: $color-8;
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
            font-size: $app-font-base;
            font-weight: var(--font-weight-semibold);
            margin: 0 0 -.3rem;
            text-transform: none;
            width: 100%;
        }

        .tag {
            color: var(--text-light-color);
            font-size: 1.2rem;
            font-weight: var(--font-weight-normal);

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
            font-size: $app-font-base;
            font-weight: var(--font-weight-normal);
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
            font-size: 1.2rem;
            margin: 0;
        }
    }

    &-buttons {
        display:  flex !important;
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

.item {
    &:hover,
    &.is-edited {
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
