<template>
    <div class="g-consent-mode-groups">
        <div
            v-if="content.length"
            class="g-consent-mode-groups-header">
            <div class="g-consent-mode-groups-header-cell">
                {{ $t('settings.gConsentMode.cookieGroup') }}
            </div>
        </div>

        <div
            v-for="(group, index) of content"
            class="g-consent-mode-group"
            :key="'g-consent-mode-group-' + index">
            <dropdown
                v-model="group.cookieGroup"
                :items="availableCookieGroups" />

            <a
                href="#"
                class="g-consent-mode-group-btn delete"
                tabindex="-1"
                @click.stop.prevent="removeRule(index)">
                <icon
                    name="trash"
                    size="xs" />
            </a>

            <div  
                class="g-consent-mode-group-switchers">
                <switcher 
                    :key="'gcm-switcher-1-' + index"
                    v-model="group.ad_storage"
                    label="ad_storage" />
                
                <switcher 
                    :key="'gcm-switcher-2-' + index"
                    v-model="group.ad_personalization"
                    label="ad_personalization" />

                <switcher 
                    :key="'gcm-switcher-3-' + index"
                    v-model="group.ad_user_data"
                    label="ad_user_data" />

                <switcher 
                    :key="'gcm-switcher-4-' + index"
                    v-model="group.analytics_storage"
                    label="analytics_storage" />

                <switcher 
                    :key="'gcm-switcher-5-' + index"
                    v-model="group.personalization_storage"
                    label="personalization_storage" />

                <switcher 
                    :key="'gcm-switcher-6-' + index"
                    v-model="group.functionality_storage"
                    label="functionality_storage" />

                <switcher 
                    :key="'gcm-switcher-7-' + index"
                    v-model="group.security_storage"
                    label="security_storage" />
            </div>
        </div>

        <p-button
            icon="add-site-mono"
            type="secondary icon"
            @click.native="addRule">
            {{ $t('settings.gConsentMode.addGroup') }}
        </p-button>
    </div>
</template>

<script>
import Vue from 'vue';

export default {
    name: 'g-consent-mode-groups',
    props: [
        'value',
        'cookieGroups'
    ],
    computed: {
        availableCookieGroups () {
            if (!this.cookieGroups) {
                return [{
                    label: 'None',
                    value: ''
                }];
            }

            return [{
                label: 'None',
                value: ''
            }].concat(this.cookieGroups.filter(group => group.id !== '' && group.id !== '-').map(group => ({
                label: group.id,
                value: group.id
            })));
        }
    },
    data () {
        return {
            content: []
        };
    },
    watch: {
        value (newValue) {
            this.content = newValue;
        },
        content (newValue) {
            this.$emit('input', newValue);
        },
        cookieGroups: {
            handler: function (newValue) {
                if (!newValue) {
                    return;
                }

                let availableGroups = newValue.map(group => group.id);

                for (let i = 0; i < this.content.length; i++) {
                    if (availableGroups.indexOf(this.content[i].cookieGroup) === -1) {
                        Vue.set(this.content[i], 'cookieGroup', '');
                    }
                }
            },
            deep: true
        }
    },
    mounted: function() {
        setTimeout(() => {
            this.content = this.value;
        }, 0);
    },
    methods: {
        addRule () {
            this.content.push({
                cookieGroup: '',
                ad_storage: false,
                ad_personalization: false,
                ad_user_data: false,
                analytics_storage: false,
                personalization_storage: false,
                functionality_storage: false,
                security_storage: false
            });
        },
        removeRule (index) {
            this.content.splice(index, 1);
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

.g-consent-mode-groups {
    border-radius: 3px;
    padding-top: 1.75rem;

    &-header {
        display: flex;
        margin-top: 1rem;

        &-cell {
            font-size: 1.4rem;
            font-weight: bold;
            margin: 0 0 1rem 0;
            width: calc(100% - 15px);
        }
    }

    .button {
        margin: 1rem 0;
    }
    
}

.g-consent-mode-group {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    margin-bottom: 20px;
    padding: .25rem 0;

    &-switchers {
        display: grid;
        grid-template-columns: repeat(3, auto);
        gap: .8rem 1rem;
        margin: 1.5rem 0 2rem .5rem;
        width: calc(100% - 51px);
    }

    &-btn {
        align-items: center;
        background: var(--gray-1);
        position: relative;
        border-radius: 50%;
        display: flex;
        height: 30px;
        justify-content: center;
        margin: 0 2px;
        position: relative;
        text-align: center;
        width: 30px;

        &:active,
        &:focus,
        &:hover {
            color: var(--headings-color);
        }

        &:hover {

            & > svg {
                fill: var(--icon-tertiary-color);
                transform: scale(1);
            }
        }

        svg {
            fill: var(--icon-secondary-color);
            height: 1.6rem;
            pointer-events: none;
            transform: scale(.9);
            transition: var(--transition);
            width: 1.6rem;
        }

        &.delete {

            &:hover {

                & > svg {
                    fill: var(--warning);
                }
            }
        }
    } 


    .input-wrapper,
    select {
        padding-right: 1rem;
        text-align: left;
        width: calc(100% - 15px);
    }

    select {
        margin-right: 1rem;
        width: calc(100% - 56px);
    }

    .has-label {
        align-items: center;
        display: flex;
        font-size: 1.4rem;
        letter-spacing: -.01em;
        margin: 0;

        ::v-deep .switcher {
            top: 0;
            transform: scale(.88);
        }
    }
    
}
</style>
