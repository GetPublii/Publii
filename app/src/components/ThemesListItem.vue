<template>
    <figure class="theme">
        <img
            :src="thumbnail"
            class="theme-thumbnail"
            alt="">

        <a
            href="#"
            class="theme-delete"
            @click.stop.prevent="deleteTheme(name, directory)">
            &times;
        </a>

        <figcaption class="theme-name">
            {{ name }}
            <span class="theme-version">
                (v.{{ version }})
            </span>
        </figcaption>
    </figure>
</template>

<script>
import { ipcRenderer } from 'electron';

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
                message: 'Do you really want to remove the ' + themeName + ' theme?',
                okClick: function() {
                    ipcRenderer.send('app-theme-delete', {
                        name: themeName,
                        directory: themeDirectory
                    });

                    ipcRenderer.once('app-theme-deleted', (event, data) => {
                        this.$bus.$emit('message-display', {
                            message: 'Theme has been successfully removed.',
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
    float: left;
    margin: 1%;
    position: relative;
    width: 31.333333%;

    &:nth-child(3n+1) {
        clear: both;
    }

    &-thumbnail {
        box-shadow: 0 0 1px rgba(0,0,0,0.3);
        display: block;
        height: auto;
        margin-bottom: 1rem;
        max-width: 100%;
    }

    &-delete {
        background: $color-3;
        border-radius: 50%;
        color: transparent;
        font-size: 1rem;
        height: 2rem;
        line-height: 2.1rem;
        position: absolute;
        right: 10px;
        text-align: center;
        top: 10px;
        width: 2rem;

        &:before,
        &:after {
            background: $color-10;
            content: "";
            display: block;
            height: .2rem;
            left: 4px;
            position: absolute;
            top: 9px;
            transform: rotate(45deg);
            width: 1.2rem;
        }

        &:after {
            transform: rotate(-45deg);
        }

        &:hover {
            opacity: .75;
        }
    }

    &-name {
        display: block;
        font-size: 1.6rem;
        text-align: center;
    }

    &-version {
        color: $color-7;
        font-size: 1.4rem;
    }
}
</style>
