<template>
    <section class="content">
        <div class="tools-content">
            <p-header :title="$t('ui.tools')" />

            <div class="navigation-tiles tools-grid">
                <router-link
                    v-for="tool in tools"
                    :key="tool.id"
                    :to="toolUrl(tool)"
                    class="navigation-tile tool-tile"
                    :aria-labelledby="'tool-title-' + tool.id">
                    <icon
                        :name="tool.icon"
                        iconset="svg-map-tools"
                        customWidth="48"
                        customHeight="48"
                        non-interactive
                        aria-hidden="true" />
                    <span :id="'tool-title-' + tool.id" class="tool-name">
                        {{ $t(tool.label) }}
                    </span>
                </router-link>
            </div>
        </div>
    </section>
</template>

<script>
export default {
    name: 'tools',
    data () {
        return {
            tools: [
                {
                    id: 'backups',
                    label: 'file.backups',
                    link: 'backups',
                    icon: 'backup'
                },
                {
                    id: 'css',
                    label: 'tools.css.customCSS',
                    link: 'custom-css',
                    icon: 'css'
                },
                {
                    id: 'html',
                    label: 'tools.customHTML',
                    link: 'custom-html',
                    icon: 'code'
                },
                {
                    id: 'files',
                    label: 'file.fileManager',
                    link: 'file-manager',
                    icon: 'file-manager'
                },
                {
                    id: 'logs',
                    label: 'tools.logViewer',
                    link: 'log-viewer',
                    icon: 'log'
                },
                {
                    id: 'thumbnails',
                    label: 'tools.thumbnails.regenerateThumbnails',
                    link: 'regenerate-thumbnails',
                    icon: 'regenerate-thumbnails'
                },
                {
                    id: 'import',
                    label: 'tools.wpImport.wpImporter',
                    link: 'wp-importer',
                    icon: 'importer'
                }
            ]
        };
    },
    methods: {
        toolUrl (tool) {
            return '/site/' + encodeURIComponent(this.$route.params.name) + '/tools/' + tool.link;
        }
    }
};
</script>

<style scoped>
@import '../css/navigation-tiles.css';

.tools-content {
    margin: 0 auto;
    max-width: var(--wrapper-width);
}

.tool-tile {
    padding: var(--space-8);
}

.tool-name {
    font-size: var(--font-size-ui-md);
}

@media (max-width: 1100px) {
    .tools-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}
</style>
