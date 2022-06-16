<template>
    <div class="gdpr-groups">
        <div
            v-if="content.length"
            class="gdpr-groups-header">
            <div class="gdpr-groups-header-cell">{{ $t('gdpr.groupName') }}</div>
            <div class="gdpr-groups-header-cell">{{ $t('gdpr.groupID') }}</div>
        </div>

        <div
            v-for="(group, index) of content"
            class="gdpr-group"
            :key="'gdpr-group-' + index">
            <text-input
                :spellcheck="$store.state.currentSite.config.spellchecking"
                v-model="group.name"
                :placeholder="$t('gdpr.groupName')" />

            <text-input
                :spellcheck="false"
                v-model="group.id"
                :placeholder="$t('gdpr.groupID')" />

            <icon
                size="m"
                name="sidebar-close"
                @click.native="removeGroup(index)" />

            <text-area
                v-model="group.description"
                :placeholder="$t('gdpr.groupDescriptionPlaceholder')"
                :rows="3"></text-area>
        </div>

        <p-button
            icon="add-site-mono"
            type="secondary icon"
            @click.native="addGroup">
            {{ $t('gdpr.addGroup') }}
        </p-button>
    </div>
</template>

<script>
export default {
    name: 'gdpr-groups',
    props: ['value'],
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
        }
    },
    mounted: function() {
        setTimeout(() => {
            this.content = this.value;

            for (let i = 0; i < this.content.length; i++) {
                if (typeof this.content[i].description === 'undefined') {
                    this.content[i].description = '';
                }
            }
        }, 0);
    },
    methods: {
        addGroup () {
            this.content.push({
                name: "",
                id: "",
                description: ""
            });
        },
        removeGroup (index) {
            this.content.splice(index, 1);
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

.gdpr-groups {
    border-radius: 3px;
    padding-top: 1.75rem;

    .gdpr-groups-header {
        display: flex;
        margin-top: 1rem;

        &-cell {
            font-size: 1.4rem;
            font-weight: bold;
            margin: 0 0 1rem 0;
            width: calc(50% - 23px);

            &:last-child {
                width: 80px;
            }
        }
    }

    .gdpr-group {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        padding: .25rem 0;

        .input-wrapper {
            padding-right: 1rem;
            text-align: left;
            width: calc(50% - 23px);
        }

        .icon {
            cursor: pointer;
            fill: var(--warning);
            transition: all .3s ease-out;

            &:hover {
                fill: var(--icon-tertiary-color);
            }
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
