<template>
    <aside class="sidebar">
        <topbar-sites />
        <sidebar-menu />
        <sidebar-sync-button />
    </aside>
</template>

<script>
import SidebarMenu from './SidebarMenu';
import SidebarSyncButton from './SidebarSyncButton';
import TopBarSites from './TopBarSites';

export default {
    name: 'sidebar',
    components: {
        'sidebar-menu': SidebarMenu,
        'sidebar-sync-button': SidebarSyncButton,
        'topbar-sites': TopBarSites
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.sidebar {
    background: var(--sidebar-bg);
    background: linear-gradient(to bottom, var(--sidebar-bg-top) 0%, var(--sidebar-bg-bottom) 100%);
    height: 100%;
    padding: 0 4rem 3rem;
    position: absolute;
    -webkit-app-region: no-drag;
    -webkit-user-select: none;
    width: 100%;
}
</style>
