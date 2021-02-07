<template>
    <div class="gdpr-groups">
        <div
            v-if="content.length"
            class="gdpr-groups-header">
            <div class="gdpr-groups-header-cell">Group name</div>
            <div class="gdpr-groups-header-cell">Group ID</div>
            <div class="gdpr-groups-header-cell">State</div>
        </div>

        <div
            v-for="(group, index) of content"
            class="gdpr-group"
            :key="'gdpr-group-' + index">
            <text-input
                :spellcheck="$store.state.currentSite.config.spellchecking"
                v-model="group.name" />

            <text-input
                :spellcheck="false"
                v-model="group.id" />
            
            <switcher
                :disabled="group.id === '-'"
                v-model="group.state" />

            <icon
                size="m"
                name="sidebar-close"                
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

            for (let i = 0; i < this.content.length; i++) {
                if (typeof this.content[i].state === 'undefined') {
                    this.content[i].state = false;

                    if (this.content[i].id === '-') {
                        this.content[i].state = true;
                    }
                }
            }
        }, 0);
    },
    methods: {
        addGroup () {
            this.content.push({
                name: "",
                id: "",
                state: false
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
            width: calc(50% - 40px);

            &:last-child {
                width: 80px;
            }
        }
    }

    .gdpr-group {
        align-items: center;
        display: flex;
        padding: .25rem 0;

        .input-wrapper {
            padding-right: 1.5rem;
            text-align: left;
            width: calc(50% - 40px);
        }

        .icon {
            cursor: pointer;
            fill: var(--warning);          
            transition: all .3s ease-out;           
            
            &:hover {
                fill: var(--icon-tertiary-color);
            }
        }
    }

    .button {
        margin: 1rem 0;
    }
}
</style>
