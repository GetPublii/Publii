<template>
    <div class="logo-creator">
        <div
            class="logo-creator-preview"
            :data-color="activeColor"
            :data-icon="activeIcon">
            <icon
                primaryColor="color-10"
                size="xl"
                :name="icons[activeIcon - 1]" />
        </div>

        <ul class="logo-creator-color">
            <li
                v-for="(color, index) in colors"
                class="logo-creator-color-block"
                :data-color="index + 1"
                :data-status="isActiveColor(index + 1)"
                @click="changeColor(index + 1)"
                >
            </li>
        </ul>

        <ul class="logo-creator-icon">
            <li
                v-for="(icon, index) in icons"
                :data-status="isActiveIcon(index + 1)"
                @click="changeIcon(index + 1)"
                class="logo-creator-icon-block" >
                <icon
                    primaryColor="color-5"
                    size="m"
                    properties="not-clickable"
                    :name="icon" />
            </li>
        </ul>
    </div>
</template>

<script>
export default {
    name: 'logo-creator',
    data: function() {
        return {
            activeIcon: 1,
            activeColor: 1,
            icons: [
                'web-pizza',
                'web-glass',
                'web-apple',
                'web-shoe',
                'web-bag',
                'web-shirt',
                'web-note',
                'web-mic',
                'web-headphone',
                'web-billard',
                'web-racket',
                'web-car',
                'web-camera',
                'web-doc',
                'web-money',
                'web-gear'
            ]
        };
    },
    computed: {
        colors: function() {
            return Array(16).fill().map((e, i) => i+1);
        }
    },
    methods: {
        changeIcon: function(newIndex) {
            if (typeof newIndex === 'string') {
                newIndex = this.icons.indexOf(newIndex) + 1;
            }

            this.activeIcon = newIndex;
        },
        changeColor: function(newIndex) {
            this.activeColor = newIndex;
        },
        isActiveColor: function(colorIndex) {
            if(colorIndex === this.activeColor) {
                return 'active';
            }

            return 'inactive';
        },
        isActiveIcon: function(iconIndex) {
            if(iconIndex === this.activeIcon) {
                return 'active';
            }

            return 'inactive';
        },
        getActiveColor: function() {
            return this.activeColor;
        },
        getActiveIcon: function() {
            return this.icons[this.activeIcon - 1];
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';
@import '../../scss/mixins.scss';

.logo-creator {
    margin-bottom: 32px;
    max-width: 100%;
    overflow: hidden;
    text-align: center;

    &-preview {
        border-radius: 4px;
        float: left;
        height: 9rem;
        line-height: 100%;
        overflow: hidden;
        text-align: center;
        width: 9rem;

        & > svg {
            margin: 2rem;
        }

        @include logoColors();
    }

    &-color {
        float: right;
        margin: 0 0 1rem 2rem;
        padding: 0;       

        &-block {  
            border-radius: 50%;
            cursor: pointer;
            display: block;
            float: left;
            height: 3.5rem;
            list-style-type: none;
            padding: 0;
            transition: all .2s ease-out;
            width: 3.5rem;

            @include logoColors();

            &[data-status="active"] {
                transform: scale(1);
            }

            &[data-status="inactive"] {
                transform: scale(.75); 
            }
        }
    }

    &-icon {
        float: right;
        margin: 0 0 1rem 1rem;
        padding: 0;       

        &-block {
            cursor: pointer;
            display: block;
            float: left;
            height: 3.5rem;
            list-style-type: none;
            padding: 0;
            transition: all .2s ease-out;
            will-change: transform;
            width: 3.5rem;

            & > svg {
                margin: .5rem;
            }

            &[data-status="active"] {
                transform: scale(1);
            }

            &[data-status="inactive"] {
                opacity: .35;
                transform: scale(.75);
            }
        }
    }
}
</style>
