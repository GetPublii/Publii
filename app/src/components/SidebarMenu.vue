<template>
    <ul class="sidebar-menu">
        <li
            v-for="(item, index) in items"
            :key="index"
            :class="{ 'sidebar-menu-item': true, 'is-active': item.icon === activeMenuItem }"
            @click="setActiveMenuItem(item.icon)">
            <router-link :to="item.url">
                <icon
                    primaryColor="color-10"
                    size="s"
                    :name="item.icon" />
                {{ item.label }}
            </router-link>
        </li>
    </ul>
</template>

<script>
export default {
    name: 'sidebar-menu',
    data: function() {
        return {
            activeMenuItem: 'posts'
        };
    },
    computed: {
        items: function() {
            let siteName = this.$route.params.name;

            return [{
                icon: 'posts',
                label: 'Posts',
                url: '/site/' + siteName + '/posts/'
            }, {
                icon: 'tags',
                label: 'Tags',
                url: '/site/' + siteName + '/tags/'
            }, {
                icon: 'menus',
                label: 'Menus',
                url: '/site/' + siteName + '/menus/'
            }, {
                icon: 'authors',
                label: 'Authors',
                url: '/site/' + siteName + '/authors/'
            }, {
                icon: 'server',
                label: 'Server',
                url: '/site/' + siteName + '/settings/server/'
            }, {
                icon: 'themes',
                label: 'Theme',
                url: '/site/' + siteName + '/settings/themes/'
            }, {
                icon: 'settings',
                label: 'Settings',
                url: '/site/' + siteName + '/settings/'
            }, {
                icon: 'tools',
                label: 'Tools',
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
        border-radius: 3px;
        color: $color-10;
        display: block;
        font-size: 1.6rem;
        font-weight: 400;
        line-height: 3.2rem;
        margin: 0 0;
        opacity: .7;
        position: relative;
        padding: 0.85rem 0.8rem;        

        &:active,
        &:focus,
        &:hover {
            background: rgba(98, 185, 255, 0.35);
            color: $color-10;
            opacity: 1;
        }
    }

    svg {
        left: 1rem;
        margin-right: 2.6rem;
        position: relative;
        top: .4rem;
    }

    &-item {
        &.is-active {
            a {
                background: rgba($color-10, .18);
                color: $color-10;
                opacity: 1;
            }
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
