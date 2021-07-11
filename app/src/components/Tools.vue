<template>
    <section class="content tools">
        <div class="tools-container">
            <p-header :title="$t('ui.tools')" />

            <div class="tools-list">
                <div
                    v-for="(item, key) in items">
                    <router-link :to="getUrl(item.link)">
                        <icon
                            :name="item.icon"
                            iconset="svg-map-tools"
                            customWidth="50"
                            customHeight="46" />
                        {{ item.name }}
                    </router-link>
                </div>
            </div>
        </div>
    </section>
</template>

<script>
export default {
    name: 'tools',
    data: function() {
        return {
            items: [{
                    name: this.$t('file.backups'),
                    link: 'tools/backups',
                    icon: 'backup'
                }, {
                    name: this.$t('tools.css.customCSS'),
                    link: 'tools/custom-css',
                    icon: 'css'
                }, {
                    name: this.$t('tools.customHTML'),
                    link: 'tools/custom-html',
                    icon: 'code'
                }, {
                    name: this.$t('file.fileManager'),
                    link: 'tools/file-manager',
                    icon: 'file-manager'
                }, {
                    name: this.$t('tools.logViewer'),
                    link: 'tools/log-viewer',
                    icon: 'log'
                }, {
                    name: this.$t('tools.thumbnails.regenerateThumbnails'),
                    link: 'tools/regenerate-thumbnails',
                    icon: 'regenerate-thumbnails'
                }, {
                    name: this.$t('tools.wpImport.wpImporter'),
                    link: 'tools/wp-importer',
                    icon: 'importer'
                }
            ]
        };
    },
    methods: {
        getUrl: function(link) {
            return '/site/' + this.$route.params.name + '/' + link;
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.tools {

    &-container {
        margin: 0 auto;
        max-width: $wrapper;
        user-select: none;
        z-index: 1;
    }

    &-list {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-auto-rows: minmax(calc(8rem + 8vh), auto);
        grid-gap: 2rem;

       & > div {
            background: var(--gray-1);
            border: 1px solid transparent;
            border-radius: 3px;
            height: 100%;
            transition: var(--transition);
            text-align: center;

            &:hover {
               background: var(--bg-primary);
               border-color: var(--secondary-color);
               box-shadow: 0 0 26px rgba(black, .07);
               cursor: pointer;

               svg {
                  fill: var(--primary-color);
               }

               a {
                  color: var(--primary-color);
               }
            }

            a {
               color: var(--text-primary-color);
               display: flex;
               flex-direction: column;
               justify-content: center;
               font-weight: 500;
               height: 100%;
               width: 100%;
            }

           svg {
               display: block;
               fill: var(--gray-5);
               margin: 0 auto 1rem;
               transition: inherit;
            }
        }
    }

    &-description {
        background: var(--option-sidebar-bg);
        float: right;
        padding: 2.4rem 3.6rem;
        width: 45%;
    }

    &-tab {
        h2 {
            font-size: 1.6rem;
            font-weight: 400;
            margin: 1rem 0 0;
            text-transform: none;
        }

        div {
            font-size: 1.4rem;
            font-style: italic;
        }
    }
}

@media (max-width: 1400px) {
    .tools {
        &-list li {
            flex-basis: calc(50% - 2rem);
        }
    }
}


@media (min-width: 1920px) {
    .tools {
        &-list li {
            flex-basis: calc(25% - 2rem);
        }
    }
}

@media (min-width: 2560px) {
    .tools {
        &-list li {
            flex-basis: calc(20% - 2rem);
        }
    }
}
</style>
