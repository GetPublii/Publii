<template>
    <div class="empty-state">
        <app-illustration
            v-if="illustrationName"
            :name="illustrationName"
            :height="illustrationHeight"
            :width="illustrationWidth"
            :scale="1.4"
            :translate-y="-32" />

        <h3 v-if="title">
            {{ title }}
        </h3>

        <p v-if="description">
            {{ description }}
        </p>

        <slot
            v-if="hasButtonSlot"
            name="button" />
    </div>
</template>

<script>
export default {
    name: 'empty-state',
    props: {
        illustrationName: {
            default: '',
            type: String
        },
        illustrationWidth: {
            default: '',
            type: String
        },
        illustrationHeight: {
            default: '',
            type: String
        },
        title: {
            default: '',
            type: String
        },
        description: {
            default: '',
            type: String
        }
    },
    computed: {
        hasButtonSlot () {
            return !!this.$slots['button'];
        }
    }
}
</script>

<style scoped>
@import '../../css/empty-states.css';
</style>
