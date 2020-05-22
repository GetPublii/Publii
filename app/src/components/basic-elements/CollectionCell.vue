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
    font-weight: var(--font-weight-normal);
    padding: 1.6rem 0;
    text-align: left;

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
        .title {
            font-size: 1.6rem;
            font-weight: var(--font-weight-semibold);
            margin: 0 0 -.3rem;
            text-transform: none;
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
            font-size: 1.6rem;
            font-weight: var(--font-weight-normal);
            margin: 0;
            text-transform: none;
        }

        .is-main-author {
            color: var(--text-light-color);
        }
    }

    &.publish-dates {
        .publish-date,
        .modify-date {
            display: block;
        }

        .publish-date {
            font-size: 1.4rem;
        }

        .modify-date {
            color: var(--text-light-color);
            font-size: 1.2rem;
            margin: .2rem 0 0 0;
        }
    }
}

.item {
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
</style>
