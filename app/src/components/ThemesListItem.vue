<template>
    <figure class="theme">
        <img
            :src="thumbnail"
            class="theme-thumbnail"
            alt="">

        <figcaption class="theme-name">
            <h3>
                {{ name }}
                <span class="theme-version">
                    {{ version }}
                </span>
             </h3>
            <a
                href="#"
                class="theme-delete"
                :title="$t('theme.deleteTheme')"
                @click.stop.prevent="deleteTheme(name, directory)">
                    <icon
                        size="xs"
                        properties="not-clickable"
                        name="trash" />
            </a>
        </figcaption>
    </figure>
</template>

<script>
export default {
    name: 'themes-list-item',
    props: [
        'themeData'
    ],
    computed: {
        thumbnail: function() {
            return this.themeData.thumbnail;
        },
        name: function() {
            return this.themeData.name;
        },
        directory: function() {
            return this.themeData.directory;
        },
        version: function() {
            return this.themeData.version;
        }
    },
    methods: {
        deleteTheme: function(themeName, themeDirectory) {
            let confirmConfig = {
                message: this.$t('theme.removeThemeMessage', { themeName }),
                isDanger: true,
                okClick: function() {
                    mainProcessAPI.send('app-theme-delete', {
                        name: themeName,
                        directory: themeDirectory
                    });

                    mainProcessAPI.receiveOnce('app-theme-deleted', (data) => {
                        this.$bus.$emit('message-display', {
                            message: this.$t('theme.removeThemeSuccessMessage'),
                            type: 'success',
                            lifeTime: 3
                        });

                        this.$store.commit('replaceAppThemes', data.themes);
                        this.$store.commit('updateSiteThemes');
                    });
                }
            };

            this.$bus.$emit('confirm-display', confirmConfig);
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.theme {
    background-color: var(--bg-secondary);
    border: 1px solid transparent;
    border-radius: var(--border-radius);
    box-shadow: var(--box-shadow-small);      
    height: 100%;
    margin: 0;
    overflow: hidden;
    padding: 1rem;
    position: relative;
    transition: var(--transition);
    text-align: center;

    &-thumbnail {
        display: block;
        height: auto;
        max-width: 100%;
    }

    &-delete {
        align-items: center;
        background: var(--bg-primary);
        border-radius: 50%;
        height: 3rem;
        justify-content: center;
        display: inline-flex;
        position: absolute;
        right: 1.4rem;
        text-align: center;
        width: 3rem;

        & > svg {
             fill: var(--icon-secondary-color);
             transform: scale(.9);
             transition: var(--transition);
        }

        &:hover {
             & > svg {
                fill: var(--warning);
                transform: scale(1);
             }
        }
    }

    &-name {
        align-items: center;
        background: var(--gray-1);
        border-radius: 0 0 4px 4px;
        display: flex;
        justify-content: space-between;
        padding: 0 2rem;
        position: relative;
        text-align: left;

        & > h3 {
             font-size: 1.4rem;
             font-weight: var(--font-weight-semibold);
             line-height: 1.4;
             margin: 1.2rem 0;
        }
    }

    &-version {
        color: var(--text-light-color);
        display: block;
        font-size: 1.2rem;
        font-weight: 400;
        margin: 0 4rem 0 auto;
    }
}
</style>
