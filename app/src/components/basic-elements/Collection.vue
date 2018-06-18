<template>
    <div :class="cssClasses">
        <slot name="header"></slot>

        <div class="content">
            <slot name="content"></slot>
        </div>
    </div>
</template>

<script>
export default {
    name: 'collection',
    props: {
        formIsOpened: {
            default: false,
            type: Boolean
        }
    },
    computed: {
        cssClasses: function() {
            return {
                'collection': true,
                'is-add-form-opened': this.formIsOpened
            };
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

/*
 * Collection element
 */
.collection {
    bottom: 0;
    position: absolute;
    top: 13rem;
    width: calc(100% - 12rem);

    &:after {
        background: linear-gradient(transparent, #fff);
        bottom: 0;
        content: "";
        height: 100px;
        left: 0;
        pointer-events: none;
        position: absolute;
        right: 5px;
        z-index: 1;
    }

    &.is-add-form-opened {
        top: 64.75rem;
    }

    .content {
        bottom: 0;
        left: 0;
        overflow: auto;
        padding: 0 0 5rem 0;
        position: absolute;
        right: 0;
        top: 5.8rem;
        width: 100%;
    }

    /*
    &.authors-collection{
        .item,
        & > .heading {
            grid-template-columns: 30px auto 50px;
            grid-template-areas: "col col col"
                                 "form form form";
        }
    }

    &.backups-collection {
        .item,
        & > .heading {
            grid-template-columns: 30px auto 100px 175px 200px;
            grid-template-areas: "col col col col col";
        }

        .item {
            transition: background .75s ease-out;

            &.is-newest {
                background: lighten($color-helper-6, 35);
            }
        }
    }*/
}
@media (max-height: 900px) {
    .collection {          
         width: calc(100% - 8rem);
    }
 }
 
@media (max-width: 1400px) {
   .collection {          
         width: calc(100% - 8rem);
    }
}
</style>
