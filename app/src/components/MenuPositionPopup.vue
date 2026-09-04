<template>
    <div class="overlay">
        <div
            class="popup"
            @click.stop>
            <h1>{{ $t('menuPositionPopup.title') }}</h1>

            <div class="menu-position-items">
                <div
                    v-for="(menu, position) of availableMenus"
                    :key="'menu-position-item-' + position"
                    class="menu-position-item">
                    <div class="menu-position-item-main">
                        <switcher
                            v-model="configuration[position].status"
                            :key="'menu-position-item-' + position + '-switcher'"
                            :disabled="!!menu.used" />

                        <span class="menu-position-item-name">
                            {{ menu.name }}
                        </span>

                        <small
                            v-if="menu.desc"
                            class="menu-position-item-desc">
                            {{ menu.desc }}
                        </small>

                        <small
                            v-if="menu.used"
                            class="menu-position-item-usedby">
                            {{ $t('menuPositionPopup.usedBy') }} {{ getMenuUsingPosition(position) }}
                        </small>
                    </div>

                    <div
                        v-if="configuration[position].status && !menu.used"
                        class="menu-position-item-depth"
                        :key="'menu-position-item-' + position + '-depth'">
                        <switcher
                            v-if="menu.maxLevels === -1"
                            v-model="configuration[position].unlimited"
                            :key="'menu-position-item-' + position + '-unlimited'"
                            :label="$t('menuPositionPopup.noDepthLimit')" />

                        <div
                            v-if="!configuration[position].unlimited"
                            class="menu-position-item-max-levels">
                            <label :for="'menu-position-depth-' + position">
                                {{ $t('menuPositionPopup.depthLabel') }}
                            </label>

                            <text-input
                                :id="'menu-position-depth-' + position"
                                type="number"
                                v-model="configuration[position].maxLevels"
                                min="1"
                                :max="menu.maxLevels === -1 ? '' : menu.maxLevels.toString()"
                                step="1"
                                size="small"
                                :aria-invalid="configuration[position].invalid"
                                :aria-describedby="configuration[position].invalid ? 'menu-position-error-' + position : ''"
                                :class="{ 'is-invalid': configuration[position].invalid }" />
                        </div>

                        <small
                            v-if="menu.maxLevels !== -1"
                            class="menu-position-item-hint">
                            {{ $t('menuPositionPopup.themeLimit', { levels: menu.maxLevels }) }}
                        </small>

                        <small
                            v-if="configuration[position].invalid"
                            :id="'menu-position-error-' + position"
                            class="menu-position-item-error"
                            role="alert">
                            <template v-if="menu.maxLevels === -1">{{ $t('menuPositionPopup.depthMinError') }}</template>
                            <template v-else>{{ $t('menuPositionPopup.depthRangeError', { max: menu.maxLevels }) }}</template>
                        </small>
                    </div>
                </div>
            </div>

            <div class="buttons">
                <p-button
                    @click.native="close"
                    appearance="popup-cancel"
                    size="medium"
                    width="half"
                    square>
                    {{ $t('ui.cancel') }}
                </p-button>

                <p-button
                    @click.native="saveChanges"
                    :disabled="!configurationIsValid"
                    size="medium"
                    width="half"
                    square>
                    {{ $t('ui.saveChanges') }}
                </p-button>
            </div>
        </div>
    </div>
</template>

<script>
import Vue from 'vue';

export default {
    name: 'menu-position-popup',
    props: [
        'editedItem',
        'editedItemIndex',
        'menus'
    ],
    computed: {
        configurationIsValid () {
            let positions = Object.keys(this.configuration);

            for (let i = 0; i < positions.length; i++) {
                let position = positions[i];

                if (this.menusInUse.indexOf(position) === -1 && this.configuration[position].invalid) {
                    return false;
                }
            }

            return true;
        },
        menusInUse () {
            return this.menus.filter((item, index) => index !== this.editedItemIndex || item.position === '')
                                .map(item => item.position)
                                .join(';')
                                .split(';');
        },
        availableMenus () {
            let menus = JSON.parse(JSON.stringify(this.$store.state.currentSite.themeSettings.menus));
            let menuPositions = Object.keys(menus);

            for (let i = 0; i < menuPositions.length; i++) {
                let menuPosition = menuPositions[i];

                // Check which format uses theme in menus inside config.json
                if (typeof menus[menuPosition] === 'object') {
                    menus[menuPosition] = {
                        desc: menus[menuPosition].desc || '',
                        name: menus[menuPosition].name,
                        maxLevels: menus[menuPosition].maxLevels || -1,
                        used: this.menusInUse.indexOf(menuPosition) > -1
                    };
                } else {
                    menus[menuPosition] = {
                        desc: '',
                        name: menus[menuPosition],
                        maxLevels: -1,
                        used: this.menusInUse.indexOf(menuPosition) > -1
                    };
                }
            }

            return menus;
        }
    },
    data () {
        return {
            configuration: {}
        };
    },
    watch: {
        configuration: {
            deep: true,
            handler () {
                this.validateMaxLevels();
            }
        }
    },
    beforeMount () {
        let menus = JSON.parse(JSON.stringify(this.$store.state.currentSite.themeSettings.menus));
        let menuPositions = Object.keys(menus);
        let currentlyUsedMenuPositions = this.editedItem.position ? this.editedItem.position.split(';') : [];
        let currentlyUsedMaxLevels = this.editedItem.maxLevels ? this.editedItem.maxLevels.split(';').map(level => parseInt(level, 10)) : [];
        let savedLevels = {};

        for (let i = 0; i < currentlyUsedMenuPositions.length; i++) {
            let position = currentlyUsedMenuPositions[i];

            if (position === '') {
                continue;
            }

            savedLevels[position] = Number.isInteger(currentlyUsedMaxLevels[i]) ? currentlyUsedMaxLevels[i] : -1;
        }

        for (let i = 0; i < menuPositions.length; i++) {
            let position = menuPositions[i];
            let themeMaxLevels = this.getThemeMaxLevels(menus[position]);
            let savedLevel = Object.prototype.hasOwnProperty.call(savedLevels, position) ? savedLevels[position] : null;
            let unlimited = themeMaxLevels === -1 && (savedLevel === null || savedLevel === -1);
            let depth = savedLevel > 0 ? savedLevel : (themeMaxLevels > 0 ? themeMaxLevels : 1);

            if (themeMaxLevels > 0 && depth > themeMaxLevels) {
                depth = themeMaxLevels;
            }

            Vue.set(this.configuration, position, {
                status: currentlyUsedMenuPositions.indexOf(position) > -1,
                unlimited: unlimited,
                maxLevels: depth.toString(),
                invalid: false
            });
        }
    },
    methods: {
        getThemeMaxLevels (menu) {
            if (menu && typeof menu === 'object' && menu.maxLevels) {
                return menu.maxLevels;
            }

            return -1;
        },
        close () {
            this.$bus.$emit('hide-menu-position-popup');
        },
        getMenuUsingPosition (position) {
            let foundedMenu = this.menus.filter(menu => menu.position.split(';').indexOf(position) > -1);

            if (foundedMenu[0]) {
                return foundedMenu[0].name;
            }

            return '??';
        },
        saveChanges () {
            let itemPositions = [];
            let itemMaxLevels = [];
            let positions = Object.keys(this.configuration);

            for (let i = 0; i < positions.length; i++) {
                let position = positions[i];
                let config = this.configuration[position];

                if (config.status) {
                    itemPositions.push(position);
                    itemMaxLevels.push(config.unlimited ? -1 : parseInt(config.maxLevels, 10));
                }
            }

            itemPositions = itemPositions.join(';');
            itemMaxLevels = itemMaxLevels.join(';');

            this.$bus.$emit('menus-manager-save-menu-positions', {
                index: this.editedItemIndex,
                position: itemPositions,
                maxLevels: itemMaxLevels
            });

            this.close();
        },
        validateMaxLevels () {
            let positions = Object.keys(this.configuration);

            for (let i = 0; i < positions.length; i++) {
                let position = positions[i];

                if (this.menusInUse.indexOf(position) > -1) {
                    continue;
                }

                let menu = this.availableMenus[position];
                let config = this.configuration[position];
                let invalid = false;

                if (config.status && !config.unlimited) {
                    let value = (config.maxLevels === null || config.maxLevels === undefined) ? '' : config.maxLevels.toString().trim();
                    let depth = parseInt(value, 10);

                    invalid = !/^\d+$/.test(value) ||
                        depth < 1 ||
                        (menu.maxLevels > -1 && depth > menu.maxLevels);
                }

                if (config.invalid !== invalid) {
                    Vue.set(config, 'invalid', invalid);
                }
            }
        }
    }
}
</script>

<style scoped>
@import '../css/popup-common.css';

.overlay {
    z-index: var(--layer-alert);
}

.popup {
    padding: var(--space-16) var(--space-16) var(--space-4) var(--space-16);
    text-align: left;
    width: 60rem;
}

.buttons {
    display: flex;
    margin: 0 -4rem -1rem -4rem;
    position: relative;
    text-align: center;
    top: 1px;

    .button.button-disabled {
       border-top: 1px solid var(--input-border-color);
    }
}

.menu-position-items {
    padding-bottom: var(--space-8);

    .menu-position-item {
        margin: var(--space-8) 0;
        position: relative;

        & + .menu-position-item {
            border-top: 1px solid var(--border-light-color);
            padding-top: var(--space-8);
        }

        .menu-position-item-main {
            align-items: baseline;
            display: flex;
            flex-wrap: wrap;
            gap: 0 var(--space-3);
        }

        .menu-position-item-name {
            font-weight: var(--font-weight-medium);
        }

        .menu-position-item-desc,
        .menu-position-item-usedby {
            color: var(--text-light-color);
            display: block;
            flex-basis: 100%;
            margin-left: 41px;
        }

        .menu-position-item-depth {
            display: flex;
            flex-direction: column;
            gap: var(--space-2);
            margin: var(--space-3) 0 0 41px;
        }

        .menu-position-item-max-levels {
            align-items: center;
            display: flex;
            gap: var(--space-3);

            label {
                color: var(--label-color);
                font-size: var(--font-size-ui-sm);
                font-weight: var(--font-weight-medium);
            }

            .input-wrapper {
                width: 10rem;
            }
        }

        .menu-position-item-hint {
            color: var(--text-light-color);
            display: block;
        }

        .menu-position-item-error {
            color: var(--color-danger);
            display: block;
        }
    }
}
</style>
