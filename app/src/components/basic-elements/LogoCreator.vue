<template>
    <div class="logo-creator">
        <div
            class="logo-creator-preview"
            :data-icon="activeIcon">
            <icon
                size="xl"
                :name="icons[activeIcon - 1]" 
                iconset="svg-map-site"/>
        </div>

        <ul class="logo-creator-icon">
            <li
                v-for="(icon, index) in icons"
                :data-status="isActiveIcon(index + 1)"
                @click="changeIcon(index + 1)"
                class="logo-creator-icon-block" >
                <icon                   
                    size="m"
                    properties="not-clickable"
                    :name="icon" 
                    iconset="svg-map-site"/>
            </li>
        </ul>
    </div>
</template>

<script>
import Vue from 'vue';

export default {
    name: 'logo-creator',
    data () {
        return {
            activeIcon: 1,
            activeColor: 1,
            icons: []
        };
    },
    computed: {
        colors: function() {
            return Array(16).fill().map((e, i) => i+1);
        }
    },
    mounted () {
        Vue.nextTick(() => {
            this.icons = [
                'web-pizza',
                'web-ice-cream',
                'web-school',
                'web-leaf',
                'web-bag',
                'web-shirt',
                'web-note',
                'web-mic',
                'web-headphone',
                'web-american-football',
                'web-racket',
                'web-car',
                'web-camera',
                'web-doc',
                'web-credit-card',
                'web-gear',
                'web-palette',
                'web-boat',
                'web-cut',
                'web-film',
                'web-flask',
                'web-heart',
                'web-journal',
                'web-rocket',
                'web-glass',
                'web-pie',
                'web-paw',
                'web-fire',
                'web-planet',
                'web-watch',
                'web-idea',
                'web-pulse',
                'web-bell',
                'web-briefcase',
                'web-clipboard',
                'web-command',
                'web-cpu',
                'web-droplet',
                'web-dollar-sign',
                'web-edit-2',
                'web-eye',
                'web-feather',
                'web-file-text',
                'web-flag',
                'web-home',
                'web-image',
                'web-moon',
                'web-percent',
                'web-power',
                'web-shield',
                'web-smartphone',
                'web-speaker',
                'web-sun',
                'web-tv',
                'web-umbrella',
                'web-radio',
                'web-layers'
            ];
        });
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
    display: flex;
    margin-bottom: 32px;
    max-width: 100%;
    overflow: hidden;
    text-align: center;

    &-preview {          
        line-height: 100%;
        min-width: 23rem;
        overflow: hidden;
        padding: 1rem;
        text-align: left;       
    }

    &-color {        
        margin: 0 0 1rem;
        padding: 0;       

        &-block {  
            border-radius: 50%;
            cursor: pointer;
            display: block;
            float: left;
            height: 3.2rem;
            list-style-type: none;
            margin: 0 0.15rem;
            padding: 0;
            transition: all .2s ease-out;
            width: 3.2rem;

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
        margin: 0;
        padding: 0;

        &-block {
            color: var(--icon-secondary-color);
            cursor: pointer;
            display: block;
            float: left;
            height: 3rem;
            list-style-type: none;
            padding: 0 1px 0 0;
            transition: all .2s ease-out;  
            
            &:hover {
                color: var(--icon-tertiary-color);
            }

            & > svg {                 
                margin: .5rem;
            }

            &[data-status="active"] {
                color: var(--icon-tertiary-color);
                transform: scale(1);
            }

            &[data-status="inactive"] {               
                transform: scale(.75);
            }
        }
    }
}
</style>
