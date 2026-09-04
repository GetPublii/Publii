<template>
    <select
        :id="id"
        @change="onChangeEvent">
        <option
            value=""
            :selected="value === ''">
            {{ placeholderLabel }}
        </option>

        <optgroup
            v-if="updateOption"
            :label="$t('theme.groupUpdateAvailable')">
            <option
                :value="updateOption.value"
                :selected="value === updateOption.value">
                {{ updateOption.label }}
            </option>
        </optgroup>

        <optgroup
            v-if="reinstallOption"
            :label="$t('theme.groupReinstall')">
            <option
                :value="reinstallOption.value"
                :selected="value === reinstallOption.value">
                {{ reinstallOption.label }}
            </option>
        </optgroup>

        <optgroup
            v-if="siteOptions.length"
            :label="$t('theme.groupInstalledOnSite')">
            <option
                v-for="option in siteOptions"
                :value="option.value"
                :selected="value === option.value"
                :key="option.value">
                {{ option.label }}
            </option>
        </optgroup>

        <optgroup
            v-if="libraryOptions.length"
            :label="$t('theme.groupInLibrary')">
            <option
                v-for="option in libraryOptions"
                :value="option.value"
                :selected="value === option.value"
                :key="option.value">
                {{ option.label }}
            </option>
        </optgroup>
    </select>
</template>

<script>
export default {
    name: 'themes-dropdown',
    props: {
        id: {
            default: '',
            required: true,
            type: String
        },
        value: {
            default: '',
            type: String
        }
    },
    computed: {
        themes () {
            return this.$store.getters.siteThemesState;
        },
        placeholderLabel () {
            if (!this.themes.current) {
                return this.$t('theme.selectTheme');
            }

            return this.$t('theme.optionCurrent', {
                name: this.themes.current.name,
                version: this.themes.current.version
            });
        },
        updateOption () {
            let current = this.themes.current;

            if (!current || !current.updateFromLibrary) {
                return null;
            }

            return {
                value: 'install-use-' + current.directory,
                label: this.$t('theme.optionUpdateFromLibrary', {
                    name: current.name,
                    version: current.libraryVersion
                })
            };
        },
        reinstallOption () {
            let current = this.themes.current;

            // Offered from the field's action menu; listed only while it is the pending choice
            if (!current || !current.libraryVersion || current.updateFromLibrary || this.value !== 'install-use-' + current.directory) {
                return null;
            }

            return {
                value: 'install-use-' + current.directory,
                label: this.$t('theme.optionReinstallFromLibrary', {
                    name: current.name,
                    version: current.libraryVersion
                })
            };
        },
        siteOptions () {
            return this.themes.siteCopies
                .filter(copy => !copy.isCurrent)
                .map(copy => ({
                    value: 'use-' + copy.directory,
                    label: copy.updateFromLibrary
                        ? this.$t('theme.optionLibraryVersion', {
                            name: copy.name,
                            version: copy.version,
                            libraryVersion: copy.libraryVersion
                        })
                        : this.$t('theme.optionVersion', {
                            name: copy.name,
                            version: copy.version
                        })
                }));
        },
        libraryOptions () {
            return this.themes.library.map(theme => ({
                value: 'install-use-' + theme.directory,
                label: this.$t('theme.optionVersion', {
                    name: theme.name,
                    version: theme.version
                })
            }));
        }
    },
    methods: {
        onChangeEvent (e) {
            this.$emit('input', e.target.value);
        }
    }
}
</script>

<style scoped>

select {
    -webkit-appearance: none;
    max-width: 100%;
    min-width: 100px;
    min-height: 46px;
    position: relative;
    width: 100%;

    &:not([multiple]) {
        background: url('data:image/svg+xml;utf8,<svg fill="%238e929d" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 6"><polygon points="10 0 5 0 0 0 5 6 10 0"/></svg>') no-repeat calc(100% - 2rem) 50%;
        background-color: var(--input-bg);
        background-size: 10px;
        padding-right: var(--space-12);
    }
}

/*
 * Special rules for Windows
 */

body[data-os="win"] {
    select:not([multiple]) {
        height: 4.8rem;
    }
}
</style>
