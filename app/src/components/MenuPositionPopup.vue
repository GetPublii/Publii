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
                    <div>
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
                        class="menu-position-item-max-levels"
                        :key="'menu-position-item-' + position + '-input'">
                        {{ $t('menuPositionPopup.maxLevels') }}
                        <div>
                            <text-input 
                                type="number"
                                @input="validateMaxLevels"
                                v-model="configuration[position].maxLevels"
                                :min="((menu.maxLevels === -1) ? -1 : 1).toString()"
                                :max="((menu.maxLevels === -1) ? 999 : menu.maxLevels).toString()"
                                step="1"
                                properties="is-small"
                                :class="{ 'is-invalid': configuration[position].invalid }" />
                            
                            <small 
                                v-if="(configuration[position].maxLevels).toString() !== (menu.maxLevels).toString()"
                                class="menu-position-item-max-levels-desc">
                                {{ $t('menuPositionPopup.themeDefaultValue') }} {{ menu.maxLevels }}
                            </small>
                        </div>
                    </div>
                    <small 
                        v-if="configuration[position].invalid"
                        class="menu-position-item-max-levels-error">
                        {{ $t('menuPositionPopup.invalidValue') }}
                    </small>
                </div>
            </div>

            <div class="buttons">
                <p-button
                    @click.native="close"
                    type="medium no-border-radius half-width cancel-popup">
                    {{ $t('ui.cancel') }}
                </p-button>

                <p-button
                    @click.native="saveChanges"
                    :disabled="!configurationIsValid"
                    type="medium no-border-radius half-width">
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
    beforeMount () {
        let menus = JSON.parse(JSON.stringify(this.$store.state.currentSite.themeSettings.menus));
        let menuPositions = Object.keys(menus);
        let currentlyUsedMenuPositions = this.editedItem.position ? this.editedItem.position.split(';') : [];
        let currentlyUsedMaxLevels = this.editedItem.maxLevels ? this.editedItem.maxLevels.split(';').map(level => parseInt(level, 10)) : []; 
        let maxLevels = {};
        
        if (!currentlyUsedMaxLevels && currentlyUsedMenuPositions.length && currentlyUsedMenuPositions[0] !== '') {
            currentlyUsedMaxLevels = Array.from({length: currentlyUsedMenuPositions.length}, () => -1);
        }

        if (currentlyUsedMenuPositions.length && currentlyUsedMenuPositions[0] !== '') {
            for (let i = 0; i < currentlyUsedMenuPositions.length; i++) {
                let position = currentlyUsedMenuPositions[i];

                if (menus[position]) {
                    maxLevels[position] = currentlyUsedMaxLevels[i];

                    if (menus[position].maxLevels) {
                        if (maxLevels[position] === -1 && menus[position].maxLevels !== -1) {
                            maxLevels[position] = menus[position].maxLevels;
                        } else if (maxLevels[position] > 0 && menus[position].maxLevels > -1 && maxLevels[position] > menus[position].maxLevels) {
                            maxLevels[position] = menus[position].maxLevels;
                        }
                    }    
                }
            }
        }

        for (let i = 0; i < menuPositions.length; i++) {
            let position = menuPositions[i];
            let themeMaxLevel = menus[position].maxLevels;

            if (!themeMaxLevel) {
                themeMaxLevel = -1;
            }

            Vue.set(this.configuration, position, {
                status: currentlyUsedMenuPositions.indexOf(position) > -1,
                maxLevels: maxLevels[position] ? maxLevels[position] : themeMaxLevel,
                invalid: false
            });
        }
    },
    methods: {
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

                if (this.configuration[position].status) {
                    itemPositions.push(position);
                    itemMaxLevels.push(this.configuration[position].maxLevels);
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

                if (this.menusInUse.indexOf(position) === -1) {
                    let menu = this.availableMenus[position];
                    
                    if (
                        (this.configuration[position].maxLevels).toString() === '' ||
                        this.configuration[position].maxLevels < -1 ||
                        this.configuration[position].maxLevels === 0 ||
                        parseInt(this.configuration[position].maxLevels, 10) === 0 || 
                        (this.configuration[position].maxLevels).toString().indexOf('+') > -1 ||
                        (this.configuration[position].maxLevels).toString().indexOf('e') > -1 ||
                        (this.configuration[position].maxLevels).toString().indexOf(',') > -1 ||
                        (this.configuration[position].maxLevels).toString().indexOf('.') > -1 ||
                        isNaN(this.configuration[position].maxLevels) ||
                        (
                            menu.maxLevels > -1 && 
                            this.configuration[position].maxLevels > menu.maxLevels
                        )
                    ) {
                        Vue.set(this.configuration[position], 'invalid', true);
                    } else {
                        Vue.set(this.configuration[position], 'invalid', false);
                    }
                }
            }
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';
@import '../scss/popup-common.scss';

.overlay {
    z-index: 100006;
}

.popup {
    padding: 4rem 4rem 1rem 4rem;
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
    padding-bottom: 2rem;

    .menu-position-item {
        align-items: baseline;
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 0 3rem;
        margin: 3rem 0;
        position: relative;
        
        & + .menu-position-item {
            border-top: 1px solid var(--border-light-color);
            padding-top: 3rem;
        }

        .menu-position-item-max-levels {
            align-items: baseline;
            display: flex;
            gap: 0 .75rem;
            text-align: left;

            &-desc,
            &-error {
                color: var(--text-light-color);
                display: block;
                flex-basis: 100%;
                margin-top: .5rem;
            }

            &-error {
                background-color: var(--popup-bg);
                bottom: -2rem;
                color: var(--warning);
                margin-left: 41px;
                position: absolute;
            }
        }

        .menu-position-item-desc,
        .menu-position-item-usedby {   
            color: var(--text-light-color);
            display: block;
            flex-basis: 100%;
            margin-left: 41px;
        }

        input.is-invalid {
            border-color: var(--warning);
        }
    }
}
</style>
