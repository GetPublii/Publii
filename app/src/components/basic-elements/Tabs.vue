<template>
    <div 
        class="tabs"
        @click="detectInternalNavigation">
        <ul>
            <li
                v-for="(item, index) in items"
                :class="{ 'active': item === activeItem}"
                @click="toggle(item)">
                {{ item }}
            </li>
        </ul>

        <div class="content">
            <div
                v-for="(item, index) in items"
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
        }
    },
    data () {
        return {
            activeItem: false
        }
    },
    mounted () {
        let lastOpenedTab = window.sessionStorage.getItem(this.id);

        if(lastOpenedTab && this.items.indexOf(lastOpenedTab) > -1) {
            this.activeItem = lastOpenedTab;
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
            window.sessionStorage.setItem(this.id, newActiveItem);
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

    & > ul {        
        list-style-type: none;
        margin: 0;
        padding: 0;
        user-select: none;
        width: 18rem;

        & > li {           
            color: var(--tab-color);
            cursor: pointer;
            padding: 0.8rem 1.2rem;
            position: relative;
            width: 100%;

            &.active {
                background: var(--tab-active-bg)!important;
                border-radius: 3px;
                color: var(--tab-active-color);
                transition: all .125s ease-out;

                &:after {
                   background: var(--bg-primary);
                    content: "";
                    height: 100%;
                    position: absolute;
                    right: -1px;
                    top: 0;
                    width: 1px;
                }
            }

            &:hover {
                background: var(--tab-hover-color);
                border-radius: 3px;
            }

            &:last-child {
                border-bottom: none;
            }
        }
    }

    & > .content {
        border-left: 1px solid var(--input-border-color);
        margin-left: auto;
        padding-left: 4rem;
        width: calc( 100% - 22rem);

        & > .tab {
            display: none;

            &.active {
                display: block;
               
            }
        }
    }
}

/*
 * Responsive improvements
 */
@media (max-height: 900px) {
    
    .tabs > ul {
        width: 15rem;
    }
    
    .tabs > ul > li {
        font-size: 1.5rem;
    }

    .tabs > .content {
        padding-left: 3rem;
        width: calc(100% - 18rem);
    }
}

@media (max-width: 1400px) {
    
    .tabs > ul {
        width: 15rem;
    }
    
    .tabs > ul > li {
        font-size: 1.5rem;
    }

    .tabs > .content {
        padding-left: 3rem;
        width: calc(100% - 18rem);
    }
}
</style>
