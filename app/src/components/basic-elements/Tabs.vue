<template>
    <div
        :class="{
            'tabs': true,
            'tabs-horizontal': isHorizontal,
            'tabs-scrollable': isScrollable
        }"
        @click="detectInternalNavigation">
        <div
            class="tabs-navigation"
            ref="tabs-navigation"
            @scroll.passive="updateScrollControls">
            <ul
                role="tablist"
                :aria-orientation="isHorizontal ? 'horizontal' : 'vertical'">
                <li
                    v-for="(item, index) in items"
                    :key="'tab-item-' + index"
                    :id="tabID(index)"
                    ref="tab-items"
                    role="tab"
                    :tabindex="index === activeIndex ? 0 : -1"
                    :aria-selected="index === activeIndex ? 'true' : 'false'"
                    :aria-controls="panelID(index)"
                    :class="{ 
                        'active': Array.isArray(item) ? item[0] === activeItem : item === activeItem,
                        'active-parent': item === activeParentItem,
                        'subtab': Array.isArray(item)
                    }"
                    @click="toggle(item, index, true)"
                    @keydown="handleTabKeydown($event, index)">
                    <template v-if="Array.isArray(item)">
                        {{ item[0] }}
                    </template>
                    <template v-else>
                        {{ item }}
                    </template>
                    <span
                        v-if="warningItems.indexOf(index) > -1"
                        class="tabs-warning"
                        aria-hidden="true">!</span>
                    <span
                        v-if="warningItems.indexOf(index) > -1 && warningLabel"
                        class="tabs-warning-label">
                        {{ warningLabel }}
                    </span>
                </li>
            </ul>
        </div>

        <button
            v-if="isHorizontal && isScrollable && canScrollBackward"
            type="button"
            class="tabs-scroll-control tabs-scroll-control-previous"
            :aria-label="$t('ui.showFirstTabs')"
            @click.stop="scrollTabsToEdge('start')">
            <icon
                name="preview-prev"
                customWidth="5"
                customHeight="10"
                properties="not-clickable"
                aria-hidden="true" />
        </button>

        <button
            v-if="isHorizontal && isScrollable && canScrollForward"
            type="button"
            class="tabs-scroll-control tabs-scroll-control-next"
            :aria-label="$t('ui.showLastTabs')"
            @click.stop="scrollTabsToEdge('end')">
            <icon
                name="preview-next"
                customWidth="5"
                customHeight="10"
                properties="not-clickable"
                aria-hidden="true" />
        </button>

        <div class="content">
            <div
                v-for="(item, index) in items"
                :key="'tab-item-content-' + index"
                :id="panelID(index)"
                role="tabpanel"
                :aria-labelledby="tabID(index)"
                :aria-hidden="index === activeIndex ? 'false' : 'true'"
                :class="{ 
                    'tab': true, 
                    'active': Array.isArray(item) ? item[0] === activeItem : item === activeItem,
                }">
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
        warningItems: {
            default: () => [],
            type: Array
        },
        warningLabel: {
            default: '',
            type: String
        },
        isHorizontal: {
            default: false,
            type: Boolean
        },
        isScrollable: {
            default: false,
            type: Boolean
        }
    },
    data () {
        return {
            activeItem: false,
            activeParentItem: false,
            activeIndex: 0,
            canScrollBackward: false,
            canScrollForward: false
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

        if (this.isHorizontal && this.isScrollable) {
            this.$nextTick(() => {
                this.scrollActiveTab(this.activeIndex, false);
                this.updateScrollControls();
            });
            this.resizeHandler = () => {
                this.scrollActiveTab(this.activeIndex, false);
                this.updateScrollControls();
            };
            window.addEventListener('resize', this.resizeHandler);
        }
    },
    beforeDestroy () {
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
    },
    methods: {
        tabID (index) {
            return 'tabs-' + this._uid + '-tab-' + index;
        },
        panelID (index) {
            return 'tabs-' + this._uid + '-panel-' + index;
        },
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
        toggle (newActiveItem, newIndex, scrollFromVisibleEdge = false) {
            let previousIndex = this.activeIndex;
            let resolvedIndex = Number(newIndex);

            if (!Number.isInteger(resolvedIndex)) {
                resolvedIndex = this.items.findIndex(item => {
                    return Array.isArray(item) ? item[0] === newActiveItem : item === newActiveItem;
                });
            }

            if (resolvedIndex < 0) {
                resolvedIndex = 0;
            }

            let visibleEdge = scrollFromVisibleEdge ? this.getVisibleTabEdge(resolvedIndex) : false;

            if (Array.isArray(newActiveItem)) {
                this.activeItem = newActiveItem[0];
                this.activeParentItem = newActiveItem[1];
            } else {
                this.activeItem = newActiveItem;
                this.activeParentItem = false;
            }

            this.activeIndex = resolvedIndex;

            if (this.id) {
                window.sessionStorage.setItem(this.id, newActiveItem);
            }

            this.onToggle();
            this.$nextTick(() => {
                if (visibleEdge) {
                    this.scrollTabsToEdge(visibleEdge);
                } else {
                    this.scrollActiveTab(previousIndex);
                }
            });
        },
        handleTabKeydown (event, index) {
            let previousKey = this.isHorizontal ? 'ArrowLeft' : 'ArrowUp';
            let nextKey = this.isHorizontal ? 'ArrowRight' : 'ArrowDown';
            let targetIndex = index;

            if (event.key === previousKey) {
                targetIndex = index > 0 ? index - 1 : this.items.length - 1;
            } else if (event.key === nextKey) {
                targetIndex = index < this.items.length - 1 ? index + 1 : 0;
            } else if (event.key === 'Home') {
                targetIndex = 0;
            } else if (event.key === 'End') {
                targetIndex = this.items.length - 1;
            } else if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.toggle(this.items[index], index, true);
                return;
            } else {
                return;
            }

            event.preventDefault();
            this.toggle(this.items[targetIndex], targetIndex);
            this.$nextTick(() => {
                let tabItems = this.$refs['tab-items'] || [];

                if (tabItems[targetIndex]) {
                    tabItems[targetIndex].focus();
                }
            });
        },
        getVisibleTabEdge (index) {
            let navigation = this.$refs['tabs-navigation'];
            let tabItems = this.$refs['tab-items'] || [];

            if (!navigation || navigation.scrollWidth <= navigation.clientWidth) {
                return false;
            }

            let viewportStart = navigation.scrollLeft - 1;
            let viewportEnd = navigation.scrollLeft + navigation.clientWidth + 1;
            let visibleIndexes = [];

            tabItems.forEach((tab, tabIndex) => {
                let tabStart = tab.offsetLeft;
                let tabEnd = tabStart + tab.offsetWidth;

                if (tabEnd > viewportStart && tabStart < viewportEnd) {
                    visibleIndexes.push(tabIndex);
                }
            });

            if (!visibleIndexes.length) {
                return false;
            }

            let firstVisible = visibleIndexes[0];
            let lastVisible = visibleIndexes[visibleIndexes.length - 1];

            if (index === firstVisible && index === lastVisible) {
                let maxScroll = Math.max(0, navigation.scrollWidth - navigation.clientWidth);
                return navigation.scrollLeft <= maxScroll / 2 ? 'end' : 'start';
            }

            if (index === firstVisible) {
                return 'start';
            }

            if (index === lastVisible) {
                return 'end';
            }

            return false;
        },
        scrollTabsToEdge (edge, animate = true) {
            let navigation = this.$refs['tabs-navigation'];

            if (!navigation) {
                return;
            }

            let maxScroll = Math.max(0, navigation.scrollWidth - navigation.clientWidth);
            let reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            navigation.scrollTo({
                left: edge === 'start' ? 0 : maxScroll,
                behavior: animate && !reduceMotion ? 'smooth' : 'auto'
            });
        },
        updateScrollControls () {
            let navigation = this.$refs['tabs-navigation'];

            if (!navigation || navigation.scrollWidth <= navigation.clientWidth) {
                this.canScrollBackward = false;
                this.canScrollForward = false;
                return;
            }

            let maxScroll = Math.max(0, navigation.scrollWidth - navigation.clientWidth);
            this.canScrollBackward = navigation.scrollLeft > 1;
            this.canScrollForward = navigation.scrollLeft < maxScroll - 1;
        },
        scrollActiveTab (previousIndex = this.activeIndex, animate = true) {
            if (!this.isHorizontal || !this.isScrollable) {
                return;
            }

            let navigation = this.$refs['tabs-navigation'];
            let tabItems = this.$refs['tab-items'] || [];
            let activeTab = tabItems[this.activeIndex];

            if (!navigation || !activeTab || navigation.scrollWidth <= navigation.clientWidth) {
                if (navigation) {
                    navigation.scrollLeft = 0;
                }

                return;
            }

            let maxScroll = Math.max(0, navigation.scrollWidth - navigation.clientWidth);
            let previousTab = tabItems[this.activeIndex - 1];
            let nextTab = tabItems[this.activeIndex + 1];
            let tabPeek = 24;
            let minimumScroll = nextTab ?
                nextTab.offsetLeft + Math.min(tabPeek, nextTab.offsetWidth) - navigation.clientWidth :
                activeTab.offsetLeft + activeTab.offsetWidth - navigation.clientWidth;
            let maximumScroll = previousTab ?
                previousTab.offsetLeft + previousTab.offsetWidth - Math.min(tabPeek, previousTab.offsetWidth) :
                activeTab.offsetLeft;
            let targetScroll = navigation.scrollLeft;

            if (this.activeIndex === 0 || (this.activeIndex <= 1 && this.activeIndex < previousIndex)) {
                targetScroll = 0;
            } else if (this.activeIndex === tabItems.length - 1) {
                targetScroll = maxScroll;
            } else if (this.activeIndex > previousIndex) {
                targetScroll = Math.max(targetScroll, minimumScroll);
            } else if (this.activeIndex < previousIndex) {
                targetScroll = Math.min(targetScroll, maximumScroll);
            } else {
                targetScroll = Math.min(Math.max(targetScroll, minimumScroll), maximumScroll);
            }

            targetScroll = Math.max(0, Math.min(maxScroll, targetScroll));
            let reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            navigation.scrollTo({
                left: targetScroll,
                behavior: animate && !reduceMotion ? 'smooth' : 'auto'
            });
        }
    }
}
</script>

<style scoped>

.tabs {
    display: flex;
    justify-content: space-between;

    &:after {

        content: " ";

        display: block;

        clear: both;

    }

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

    &.tabs-horizontal.tabs-scrollable {
        position: relative;

        & > .tabs-navigation {
            max-width: 100%;
            overflow-x: auto;
            overflow-y: hidden;
            overscroll-behavior-inline: contain;
            scrollbar-width: none;

            &::-webkit-scrollbar {
                display: none;
            }

            & > ul {
                display: flex;
                flex-wrap: nowrap;
                min-width: 100%;
                width: max-content;

                & > li {
                    flex: 0 0 auto;
                    white-space: nowrap;

                    &:focus-visible {
                        outline-offset: -2px;
                    }
                }
            }
        }

        & > .tabs-scroll-control {
            align-items: center;
            border: 0;
            cursor: pointer;
            display: flex;
            height: 3.2rem;
            padding: 0;
            position: absolute;
            top: -.4rem;
            width: 3.2rem;
            z-index: 2;

            & > svg {
                fill: var(--icon-secondary-color);
                opacity: .7;
                transition: var(--transition);
            }

            &:hover > svg,
            &:focus-visible > svg {
                fill: var(--color-primary);
                opacity: 1;
            }

            &:focus-visible {
                outline: 2px solid var(--button-tertiary-bg);
                outline-offset: -2px;
            }
        }

        & > .tabs-scroll-control-previous {
            background: linear-gradient(to right, var(--popup-bg) 55%, transparent);
            justify-content: flex-start;
            left: 0;
            padding-left: .6rem;
        }

        & > .tabs-scroll-control-next {
            background: linear-gradient(to left, var(--popup-bg) 55%, transparent);
            justify-content: flex-end;
            padding-right: .6rem;
            right: 0;
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

                &.subtab {
                    padding: 0.6rem .6rem 0.6rem 3rem;

                    &::before {
                        border-radius: 0 0 0 2px;
                        content: '';
                        display: block;
                        width: 8px;
                        height: 100%;
                        border-left: 1px solid var(--input-border-dark);
                        border-bottom: 1px solid var(--input-border-dark);
                        position: absolute;
                        left: 1.2rem;
                        top: 0;
                        transform: translate(0, -46%);
                    }

                    &.active {
                        background: none !important;
                        font-weight: var(--font-weight-semibold);
                    }
                }

                /* Add selector for the first `.subtab` in the group */
                & + .subtab:not(.subtab + .subtab) {
                    margin-top: 0.6rem;

                    &::before {
                        height: 60%;
                        top: 23%;
                    }
                }

                &:hover {
                    color: var(--tab-color-hover);
                }

                &:focus-visible {
                    outline: 2px solid var(--button-tertiary-bg);
                    outline-offset: 2px;
                }

                &:last-child {
                    border-bottom: none;
                }

                &.active-parent {
                    background: var(--tab-parent-active-bg);
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

.tabs-warning {
    color: var(--warning);
    display: inline-block;
    font-weight: var(--font-weight-bold);
}

.tabs-warning-label {
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
}

/*
 * Responsive improvements
 */
@media (max-height: 900px) {

    .tabs > div > ul {
        width: 15rem;
    }

    .tabs > div > ul > li {
        font-size: 1.4rem;
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
        font-size: 1.4rem;
    }

    .tabs > .content {
        padding-left: 3rem;
        width: calc(100% - 18rem);
    }
}
</style>
