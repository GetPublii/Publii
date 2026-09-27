<template>
    <ul class="sidebar-menu">
        <li
            v-for="item in items"
            :key="item.section || item.icon"
            :class="{ 'sidebar-menu-item': true, 'is-active': (item.section || item.icon) === activeMenuItem }">
            <router-link
                :to="item.url"
                :aria-current="(item.section || item.icon) === activeMenuItem ? 'page' : null">
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
    computed: {
        activeMenuItem () {
            const parts = this.$route.path.split('/');

            if (parts[3] === 'settings') {
                return parts[4] || 'settings';
            }

            if (parts[3] === 'tools' && parts[4] === 'plugins') {
                return 'plugins';
            }

            if (parts[3] === 'tools' && parts[4] === 'file-manager' && this.$store.state.app.config.experimentalFileManagerInSidebar) {
                return 'folder';
            }

            return parts[3] || 'posts';
        },
        items: function() {
            let siteName = this.$route.params.name;
            let menuItems = [{
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
                section: 'plugins',
                icon: 'tools',
                label: this.$t('plugins.plugins'),
                url: '/site/' + siteName + '/plugins/'
            }, {
                icon: 'settings',
                label: this.$t('settings.siteSettings'),
                url: '/site/' + siteName + '/settings/'
            }, {
                icon: 'server',
                label: this.$t('ui.server'),
                url: '/site/' + siteName + '/settings/server/'
            }, {
                section: 'tools',
                icon: 'toolbox',
                label: this.$t('ui.tools'),
                url: '/site/' + siteName + '/tools/'
            }];

            if (this.$store.state.app.config.experimentalFileManagerInSidebar) {
                menuItems.splice(5, 0, {
                    icon: 'folder',
                    label: this.$t('file.fileManager'),
                    url: '/site/' + siteName + '/tools/file-manager'
                });
            }

            return menuItems;
        }
    },
    watch: {
        activeMenuItem () {
            this.$nextTick(this.revealActiveItem);
        }
    },
    mounted () {
        this.$nextTick(this.revealActiveItem);
    },
    methods: {
        revealActiveItem () {
            const activeLink = this.$el.querySelector('[aria-current="page"]');

            if (activeLink) {
                activeLink.scrollIntoView({ block: 'nearest' });
            }
        }
    }
}
</script>

<style scoped>

.sidebar-menu {
    clear: both;
    list-style-type: none;
    margin: 0;
    padding: 0;

    a {
        border-radius: var(--radius-base);
        color: var(--sidebar-link-color);
        display: block;
        font-size: var(--font-size-ui-md);
        font-weight: var(--font-weight-regular);
        line-height: 2;
        margin: 0;
        opacity: var(--sidebar-link-opacity);
        position: relative;
        padding: var(--space-3) .6rem;
        transition: var(--transition-default);

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

    a:focus-visible {
        outline: 2px solid var(--input-border-focus);
        outline-offset: 2px;
    }

    svg {
        fill: var(--sidebar-link-icon);
        left: 1rem;
        margin-right: 2.3rem;
        position: relative;
        transition: var(--transition-default);
        top: .5rem;
    }
}

.sidebar-menu-item {
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
        background: var(--color-danger);
        border-radius: 50px;
        fill: var(--white);
        margin-left: auto;
        padding: 2px;
    }
}

/*
 * Responsive improvements
 */
@media (max-height: 736px) {
    .sidebar-menu {
        a {
            padding: 0.55rem;
        }
    }
}

</style>
