<template>
    <div class="empty-state">
        <img
            v-if="imageName"
            :src="imagePath"
            :height="imageHeight"
            :width="imageWidth"
            alt="">

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
    name: 'emptystate',
    props: {
        imageName: {
            default: '',
            type: String
        },
        imageWidth: {
            default: '',
            type: String
        },
        imageHeight: {
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
        imagePath: function() {
            let theme = this.$store.state.app.theme;
            return '../src/assets/svg/' + theme + '/' + this.imageName;
        },
        hasButtonSlot: function() {
            return !!this.$slots['button'];
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';
@import '../../scss/empty-states.scss';
</style>
