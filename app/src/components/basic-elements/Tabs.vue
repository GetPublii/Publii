<template>
    <div
        :class="{
            'tabs': true,
            'tabs-horizontal': isHorizontal
        }"
        @click="detectInternalNavigation">
        <div>
            <ul>
                <li
                    v-for="(item, index) in items"
                    :key="'tab-item-' + index"
                    :class="{ 'active': item === activeItem}"
                    @click="toggle(item)">
                    {{ item }}
                </li>
            </ul>
        </div>

        <div class="content">
            <div
                v-for="(item, index) in items"
                :key="'tab-item-content-' + index"
                :class="{ 'tab': true, 'active': item === activeItem}">
                <slot :name="'tab-' + index"></slot>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'tabs',
    props: {
        id: {
            default: '',
            type: String
        },
        items: {
            default: [],
            type: Array
        },
        onToggle: {
            default: () => false,
            type: Function
        },
        isHorizontal: {
            defalt: false,
            type: Boolean
        }
    },
    data () {
        return {
            activeItem: false,
            activeIndex: 0
        }
    },
    mounted () {
        let lastOpenedTab = window.sessionStorage.getItem(this.id);

        if(lastOpenedTab && this.items.indexOf(lastOpenedTab) > -1) {
            this.activeItem = lastOpenedTab;
            this.activeIndex = this.items.indexOf(lastOpenedTab);
        } else {
            this.activeItem = this.items[0] || false;
        }
    },
    methods: {
        detectInternalNavigation (e) {
            if (e.target.tagName === 'A' && e.target.getAttribute('data-internal-link')) {
                e.preventDefault();

                let linkData = e.target.getAttribute('data-internal-link');
                linkData = linkData.split('#');

                if (linkData.length === 2) {
                    this.toggle(linkData[0], linkData[1]);
                } else {
                    this.toggle(linkData[0]);
                }
            }
        },
        toggle (newActiveItem, scrollTo = false) {
            this.activeItem = newActiveItem;
            this.activeIndex = this.items.indexOf(newActiveItem);

            if (this.id) {
                window.sessionStorage.setItem(this.id, newActiveItem);
            }

            this.onToggle();

            setTimeout(() => {
                if (scrollTo !== false) {
                    document.querySelector('#' + scrollTo).scrollIntoView({behavior: "smooth", block: "start", inline: "nearest"});
                }
            }, 0);
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';
@import '../../scss/mixins.scss';

.tabs {
    display: flex;
    justify-content: space-between;

    @include clearfix;

    &.tabs-horizontal {
        flex-direction: column;

        & > div {

            & > ul {
                border-bottom: 2px solid var(--input-border-color);
                position: relative;
                top: initial;
                text-align: left;
                width: 100%;

                & > li {
                    color: var(--text-light-color);
                    border-bottom: 2px solid transparent;
                    display: inline-block;
                    margin: 0 2rem;
                    padding: 0 0 1.7rem 0;
                    top: 2px;
                    width: auto;

                    &.active {
                        background: none!important;
                        border-bottom: 2px solid var(--button-tertiary-bg);
                        border-radius: 0;
                        color: var(--tab-color);
                    }

                    &:hover {
                        background: none;
                        border-radius: 0;
                        color: var(--tab-color);
                    }

                    &:first-child {
                        margin-left: 0;
                    }
                }
            }
        }

        & > .content {
            border: none;
            margin-top: 3rem;
            padding-left: 0;
            width: 100%;
        }
    }

    & > div {

        & > ul {
            list-style-type: none;
            margin: 0;
            padding: 0;
            position: sticky;
            top: 0;
            user-select: none;
            width: 18rem;

            & > li {
                border-radius: var(--border-radius);
                color: var(--tab-color);
                cursor: pointer;
                padding: 0.8rem 1.2rem;
                position: relative;
                transition: var(--transition);
                width: 100%;

                &.active {
                    background: var(--tab-active-bg)!important;
                    border-radius: var(--border-radius);
                    color: var(--tab-active-color) !important;
                    transition: all .125s ease-out;
                }

                &:hover {
                    color: var(--tab-color-hover);
                }

                &:last-child {
                    border-bottom: none;
                }
            }
        }
    }

    & > .content {
        border-left: 5px solid var(--bg-site);
        margin-left: auto;
        padding-left: 4rem;
        width: calc( 100% - 22rem);

        & > .tab {
            display: none;

            &.active {
                display: block;
            }

            .msg {
                margin: 2rem 0;
            }

            .separator:first-child {
                padding-top: 0 !important;
                
            }
        }
    }
}

/*
 * Responsive improvements
 */
@media (max-height: 900px) {

    .tabs > div > ul {
        width: 15rem;
    }

    .tabs > div > ul > li {
        font-size: 1.5rem;
    }

    .tabs > .content {
        padding-left: 3rem;
        width: calc(100% - 18rem);
    }
}

@media (max-width: 1400px) {

    .tabs > div > ul {
        width: 15rem;
    }

    .tabs > div > ul > li {
        font-size: 1.5rem;
    }

    .tabs > .content {
        padding-left: 3rem;
        width: calc(100% - 18rem);
    }
}
</style>
