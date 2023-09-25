<template>
    <div class="embed-consents-groups">
        <div
            v-if="content.length"
            class="embed-consents-groups-header">
            <div class="embed-consents-groups-header-cell">{{ $t('gdpr.embedConsents.groupRule') }}</div>
            <div class="embed-consents-groups-header-cell">{{ $t('gdpr.embedConsents.groupCookieGroup') }}</div>
            <div class="embed-consents-groups-header-cell">{{ $t('gdpr.embedConsents.groupButtonLabel') }}</div>
        </div>

        <div
            v-for="(group, index) of content"
            class="embed-consents-group"
            :key="'embed-consents-group-' + index">
            <text-input
                :spellcheck="false"
                v-model="group.rule"
                :placeholder="$t('gdpr.embedConsents.groupRulePlaceholder')" />

            <dropdown
                v-model="group.cookieGroup"
                :items="availableCookieGroups" />

            <text-input
                :spellcheck="false"
                v-model="group.buttonLabel"
                :placeholder="$t('gdpr.embedConsents.groupButtonLabel')" />

            <a
                href="#"
                class="embed-consents-group-btn delete"
                tabindex="-1"
                @click.stop.prevent="removeRule(index)">
                <icon
                    name="trash"
                    size="xs" />
            </a>

            <text-area
                v-model="group.text"
                :placeholder="$t('gdpr.embedConsents.groupTextPlaceholder')"
                :rows="3"></text-area>
        </div>

        <p-button
            icon="add-site-mono"
            type="secondary icon"
            @click.native="addRule">
            {{ $t('gdpr.embedConsents.addRule') }}
        </p-button>
    </div>
</template>

<script>
import Vue from 'vue';

export default {
    name: 'embed-consents',
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
                rule: '',
                buttonLabel: '',
                cookieGroup: '',
                text: ''
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

.embed-consents-groups {
    border-radius: 3px;
    padding-top: 1.75rem;

    .embed-consents-groups-header {
        display: flex;
        margin-top: 1rem;

        &-cell {
            font-size: 1.4rem;
            font-weight: bold;
            margin: 0 0 1rem 0;
            width: calc((100% / 3) - 15px);
        }
    }

    .embed-consents-group {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        padding: .25rem 0;

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
            width: calc((100% / 3) - 15px);
        }

        select {
            margin-right: 1rem;
            width: calc((100% / 3) - 15px - 1rem);
        }

        div:last-child {
            margin-bottom: 3rem;
            margin-top: 1rem;
            width: calc(100% - 56px);
        }
    }

    .button {
        margin: 1rem 0;
    }
}
</style>
