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
    font-weight: 400;
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
            font-weight: 400;
            margin: 0 0 -.3rem;
            text-transform: none;
        }

        .tag {
            color: $color-7;
            font-size: 1.2rem;
            font-weight: 400;

            &:active,
            &:focus,
            &:hover {
                color: $link-color;
            }
        }

        svg {
            position: relative;
            top: .1rem;
        }
    }

    &.names {
        .name {
            font-size: 1.6rem;
            font-weight: 400;
            margin: 0;
            text-transform: none;
        }

        .is-main-author {
            color: $color-7;
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
            color: $color-7;
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
                color: $color-7;

                &:active,
                &:focus,
                &:hover {
                    color: $link-color;
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
