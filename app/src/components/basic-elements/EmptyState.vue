<template>
    <div class="empty-state">
        <img
            v-if="imageName"
            :src="imagePath"
            :height="imageHeight"
            :width="imageWidth"
            alt="">

        <h2 v-if="title">
            {{ title }}
        </h2>

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
            return 'src/assets/svg/' + this.imageName;
        },
        hasButtonSlot: function() {
            return !!this.$slots['button'];
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

.empty-state {
    clear: both;
    color: $color-7;
    font-size: 1.6rem;
    left: 0;
    padding: 20px;
    position: absolute;
    text-align: center;
    top: 50%;
    transform: translateY(-50%);
    width: 100%;

    h2 {
        color: $color-7;
        font-size: 2.8rem;
        font-weight: 400;
        text-transform: none;
    }

    p {
        font-size: 1.8rem;
        margin: -1.5rem 0 4rem 0;
    }

    img {
        height: 284px;
        margin: 0 auto 3.5rem;
        width: 258px;
    }
}

/*
 * Responsive improvements
 */
@media (max-height: 900px) {
    .empty-state {
        img {
            max-width: 22rem;
            margin-bottom: 0.5rem;
        }
    }
}

@media (max-width: 1400px) {
    .empty-state {
        img {
            max-width: 22rem;
            margin-bottom: 0.5rem;
        }
    }
}
</style>
