<template>
    <aside class="sidebar">
        <sidebar-menu />
        <sidebar-sync-button />
    </aside>
</template>

<script>
import SidebarMenu from './SidebarMenu';
import SidebarSyncButton from './SidebarSyncButton';

export default {
    name: 'sidebar',
    components: {
        'sidebar-menu': SidebarMenu,
        'sidebar-sync-button': SidebarSyncButton
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.sidebar {
    background: $color-1;
    height: 100%;
    padding: 4.4rem 5rem;
    position: absolute;
    -webkit-app-region: no-drag;
    -webkit-user-select: none;
    width: 100%;
}

/*
 * Responsive improvements
 */
@media (max-height: 736px) {
    .sidebar {
        padding: 4rem 4rem 3rem;
    }
}

@media (min-height: 737px) and (max-height: 900px) {
    .sidebar {
        padding: 4rem 4rem 3rem;
    }
}


@media (max-width: 1400px) {
    .sidebar {
        padding: 4rem 4rem 3rem;
    }
}
</style>
