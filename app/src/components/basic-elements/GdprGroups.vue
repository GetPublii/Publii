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

            <a
                href="#"
                class="gdpr-group-btn delete"
                tabindex="-1"
                @click.stop.prevent="removeGroup(index)">
                <icon
                    name="trash"
                    size="xs" />
            </a>

            <text-area
                v-model="group.description"
                :placeholder="$t('gdpr.groupDescriptionPlaceholder')"
                :rows="3"></text-area>
        </div>

        <p-button
            icon="add-site-mono"
            appearance="secondary"
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

<style scoped>

.gdpr-groups {
    border-radius: 3px;
    padding-top: 1.75rem;

    .gdpr-groups-header {
        display: flex;
        margin-top: var(--space-4)
    }

    .gdpr-group {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        padding: var(--space-1) 0;

        .input-wrapper {
            padding-right: var(--space-4);
            text-align: left;
            width: calc(50% - 23px);
        }

        div:last-child {
            margin-bottom: var(--space-12);
            margin-top: var(--space-4);
            width: calc(100% - 56px);
        }
    }

    .button {
        margin: var(--space-4) 0;
    }
}

.gdpr-groups .gdpr-groups-header-cell {
    font-size: var(--font-size-ui-md);
    font-weight: var(--font-weight-bold);
    margin: 0 0 var(--space-4) 0;
    width: calc(50% - 23px);

    &:last-child {
        width: 80px;
    }
}

.gdpr-groups .gdpr-group-btn {
    align-items: center;
    background: var(--color-surface-subtle);
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
        transition: var(--transition-default);
        width: 1.6rem;
    }

    &.delete {

        &:hover {

            & > svg {
                fill: var(--color-danger);
            }
        }
    }
}
</style>
