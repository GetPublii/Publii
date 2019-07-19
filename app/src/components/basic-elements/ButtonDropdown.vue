<template>
    <div :class="{ 'button': true, 'is-green': isGreen, 'has-icon': hasIcon }">
        <span 
            class="button-trigger"
            :style="'min-width:' + minWidth + 'px;'"
            @click.stop="doCurrentAction()">
            <icon
                v-if="buttonIcon"
                size="s"
                properties="not-clickable"
                :name="buttonIcon" />

            {{ currentLabel }}
        </span>

        <span 
            class="button-toggle"
            @click.stop="toggleDropdown()">
        </span>

        <div 
            v-if="dropdownVisible"
            class="button-dropdown">
            <div
                v-for="(item, index) of filteredItems"
                :key="'button-dropdown-' + index"
                class="button-dropdown-item" 
                @click="doAction(item.value)">
                {{ item.label }}
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'btn-dropdown',
    props: {
        'items': {
            default: '',
            type: Array
        },
        'defaultValue': {
            default: '',
            type: String
        },
        'buttonColor': {
            default: 'blue',
            type: String
        },
        'buttonIcon': {
            default: '',
            type: String
        },
        'minWidth': {
            default: 150,
            type: Number
        }
    },
    computed: {
        filteredItems () {
            return this.items.filter(item => item.isVisible());
        },
        currentLabel () {
            let foundedItem = this.items.filter(item => item.value === this.value);

            if (foundedItem.length) {
                if (foundedItem[0].activeLabel) {
                    return foundedItem[0].activeLabel;
                }

                return foundedItem[0].label;
            }

            return '';
        }
    },
    data () {
        return {
            value: '',
            hasIcon: false,
            isGreen: false,
            dropdownVisible: false
        };
    },
    mounted () {
        this.setValue(this.defaultValue);
        this.$bus.$on('document-body-clicked', this.hideDropdown);

        if (this.buttonColor === 'green') {
            this.isGreen = true;
        }

        if (this.buttonIcon) {
            this.hasIcon = true;
        }
    },
    methods: {
        doAction (actionName) {
            this.value = actionName;
            this.items.filter(item => item.value === this.value)[0].onClick();
            this.hideDropdown();
        },
        doCurrentAction () {
            this.items.filter(item => item.value === this.value)[0].onClick();
        },
        toggleDropdown () {
            this.dropdownVisible = !this.dropdownVisible;
        },
        hideDropdown () {
            this.dropdownVisible = false;
        },
        setValue (newValue) {
            this.value = newValue;
        },
        getValue () {
            return this.value;
        }
    },
    beforeDestroy () {
        this.$bus.$off('document-body-clicked', this.hideDropdown);
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

.button {
    background: $color-1;
    border: none;
    border-radius: 3px;
    box-shadow: none;
    color: $color-10;
    cursor: pointer;
    display: inline-block;
    font-size: 15px;
    font-weight: 500;
    height: 4.2rem;
    line-height: 4.1rem;      
    padding: 0;
    position: relative;
    text-align: left;
    transition: all .25s ease-out;
    user-select: none;
    white-space: nowrap;
    width: auto;

    &-trigger {
        border-top-left-radius: 3px;
        border-bottom-left-radius: 3px;        
        display: block;
        height: 4.2rem;
        left: 0;
        padding-left: 2rem;
        padding-right: 6rem;
        position: relative;
        text-align: left;
        top: 0;
        transition: all .25s ease-out;          
            
        &:hover {
            background: darken($color-1, 5%);  
        }
    }

    &-toggle {
        background: darken($color-1, 5%);
        border-radius: 0 3px 3px 0;
        cursor: pointer;
        height: 100%;
        position: absolute;
        right: 0;
        top: 0;
        transition: all .25s ease-out;
        width: 44px;
        
        &:hover {
            background: darken($color-1, 9%);
        }

        &::after {
            border-color: $color-10 transparent transparent;
            border-style: solid;
            border-width: 5px;              
            content: "";
            pointer-events: none;
            left: 50%;
            position: absolute;
            top: 50%;
            transform: translateX(-50%) translateY(-2.5px);
        }
    }

    &-dropdown {
        background: $color-10;
        border-radius: 0 0 5px 5px;
        box-shadow: 0 5px 5px rgba(0, 0, 0, .125);
        left: 0;
        position: absolute;
        text-align: left;
        top: 42px;
        width: 100%;
        z-index: 10;

        &-item {
            border-top: 1px solid lighten($color-8, 10%);
            color: $color-5;
            padding: .2rem 2rem;
            text-align: left;

            &:hover {
                background: $color-9;
            }
        }
    }

    &.has-icon {
        .button-trigger {
            padding-left: 4.3rem;

            & > svg {
                display: inline-block;
                fill: $color-10;
                left: 1.4rem;
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
            }
        }
    }

    &.is-green {
        background-color: $color-2;

        .button-trigger {
            border-right: 1px inset $color-2;

            &:hover {
                background: darken($color-2, 5%);  
            }
        }

        .button-toggle {
            background: darken($color-2, 5%);
            
            &:hover {
                background: darken($color-2, 9%);
            }
        }
    }
}
</style>
