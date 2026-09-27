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
import SidebarSites from './SidebarSites';

export default {
    name: 'sidebar',
    components: {
        'sidebar-menu': SidebarMenu,
        'sidebar-sync-button': SidebarSyncButton,
        'topbar-sites': SidebarSites
    }
}
</script>

<style scoped>

.sidebar {
    background: linear-gradient(to bottom, var(--sidebar-bg-top) 0%, var(--sidebar-bg-bottom) 100%);
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 0 var(--app-sidebar-margin) var(--space-12);
    position: absolute;
    -webkit-app-region: no-drag;
    -webkit-user-select: none;
    width: 100%;
}

.sidebar > .site-switch {
    flex-shrink: 0;
    order: 0;
}

.sidebar > .sidebar-menu {
    flex: 1;
    margin: -4px -4px 0;
    min-height: 0;
    overflow-y: auto;
    padding: 4px;
}

.sidebar > .sidebar-sync {
    flex-shrink: 0;
    margin-top: auto;
    position: static;
}
</style>
