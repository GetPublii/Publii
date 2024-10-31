<template>
    <ul class="sidebar-menu">
        <li
            v-for="(item, index) in items"
            :key="'sidebar-item-' + index"
            :class="{ 'sidebar-menu-item': true, 'is-active': item.icon === activeMenuItem }"
            @click="setActiveMenuItem(item.icon)">
            <router-link :to="item.url">
                <icon
                    customWidth="18"
                    customHeight="18"
                    :name="item.icon" />
                {{ item.label }}
            </router-link>
        </li>
    </ul>
</template>

<script>
export default {
    name: 'sidebar-menu',
    data () {
        let activeMenuItem = this.$route.path.endsWith('/pages/') ? 'pages' : 'posts';

        return {
            activeMenuItem
        };
    },
    computed: {
        items: function() {
            let siteName = this.$route.params.name;

            return [{
                icon: 'posts',
                label: this.$t('ui.posts'),
                url: '/site/' + siteName + '/posts/'
            }, {
                icon: 'pages',
                label: this.$t('ui.pages'),
                url: '/site/' + siteName + '/pages/'
            }, {
                icon: 'tags',
                label: this.$t('ui.tags'),
                url: '/site/' + siteName + '/tags/'
            }, {
                icon: 'menus',
                label: this.$t('ui.menus'),
                url: '/site/' + siteName + '/menus/'
            }, {
                icon: 'authors',
                label: this.$t('ui.authors'),
                url: '/site/' + siteName + '/authors/'
            }, {
                icon: 'themes',
                label: this.$t('ui.theme'),
                url: '/site/' + siteName + '/settings/themes/'
            }, {
                icon: 'settings',
                label: this.$t('settings.siteSettings'),
                url: '/site/' + siteName + '/settings/'
            }, {
                icon: 'server',
                label: this.$t('ui.server'),
                url: '/site/' + siteName + '/settings/server/'
            }, {
                icon: 'tools',
                label: this.$t('ui.tools'),
                url: '/site/' + siteName + '/tools/'
            }];
        }
    },
    watch: {
        '$route': function(newValue, oldValue) {
            let pathElements = newValue.path.split('/');

            if(pathElements[3] && pathElements[3] !== 'settings') {
                this.setActiveMenuItem(pathElements[3]);
            } else if(pathElements[3] === 'settings' && pathElements[4]) {
                this.setActiveMenuItem(pathElements[4]);
            } else if(pathElements[3] === 'settings' && !pathElements[4]) {
                this.setActiveMenuItem(pathElements[3]);
            }
        }
    },
    methods: {
        setActiveMenuItem: function(newValue) {
            this.activeMenuItem = newValue;
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.sidebar-menu {
    clear: both;
    list-style-type: none;
    margin: 0;
    padding: 0;

    a {
        border-radius: var(--border-radius);
        color: var(--sidebar-link-color);
        display: block;
        font-size: $app-font-base;
        font-weight: var(--font-weight-normal);
        line-height: 2;
        margin: 0;
        opacity: var(--sidebar-link-opacity);
        position: relative;
        padding: .825rem .6rem;
        transition: var(--transition);

        &:active,
        &:focus,
        &:hover {
            background: var(--sidebar-link-bg-hover);
            color: var(--sidebar-link-color-hover);
            opacity: 1;

            svg {
               fill: var(--sidebar-link-icon-hover);
            }
        }
    }

    svg {
        fill: var(--sidebar-link-icon);
        left: 1rem;
        margin-right: 2.4rem;
        position: relative;
        transition: var(--transition);
        top: .5rem;
    }

    &-item {
        margin: 0 0 .2rem;

        a {
            display: flex;
        }

        &.is-active {
            a {
                background: var(--sidebar-link-bg-active);
                color: var(--sidebar-link-color-active);
                opacity: 1;
            }
        }

        .old-git-warning {
            background: var(--warning);
            border-radius: 50px;
            fill: var(--white);
            margin-left: auto;
            padding: 2px;
        }
    }
}

/*
 * Responsive improvements
 */
@media (max-height: 736px) {
    .sidebar-menu {
        a {
            padding: 0.5rem 0.8rem;
        }
    }
}

</style>
