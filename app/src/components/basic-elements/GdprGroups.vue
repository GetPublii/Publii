<template>
    <div class="gdpr-groups">
        <div
            v-if="content.length"
            class="gdpr-groups-header">
            <div class="gdpr-groups-header-cell">Group name</div>
            <div class="gdpr-groups-header-cell">Group ID</div>
        </div>

        <div
            v-for="(group, index) of content"
            class="gdpr-group"
            :key="'gdpr-group-' + index">
            <text-input
                v-model="group.name" />

            <text-input
                v-model="group.id" />

            <icon
                size="m"
                name="sidebar-close"
                primaryColor="color-3"
                @click.native="removeGroup(index)" />
        </div>

        <p-button
            type="small"
            @click.native="addGroup">
            Add group
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
        }, 0);
    },
    methods: {
        addGroup () {
            this.content.push({
                name: "",
                id: ""
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

    .gdpr-groups-header {
        display: flex;
        margin-top: 1rem;

        &-cell {
            font-size: 1.4rem;
            font-weight: bold;
            margin: 0 0 1rem 0;
            width: calc((100% - 40px) / 2);
        }
    }

    .gdpr-group {
        align-items: center;
        display: flex;
        padding: .25rem 0;

        .input-wrapper {
            padding-right: .5rem;
            text-align: left;
            width: calc((100% - 40px) / 2);
        }

        .icon {
            cursor: pointer;
        }
    }

    .button {
        margin: 1rem 0;
    }
}
</style>
