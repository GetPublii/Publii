<template>
    <div class="collection-wrapper">
        <div
            :class="cssClasses"
            :style="gridLayout">
            <slot name="header"></slot>

            <div class="content">
                <slot name="content"></slot>
            </div>
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
        },
        itemsCount: {
            default: 3,
            type: Number
        }
    },
    computed: {
        cssClasses: function() {
            return {
                'collection': true,
                'is-add-form-opened': this.formIsOpened
            };
        },
        gridLayout: function() {
            let column = ' auto';
            let templateColumns = `auto 1fr${column.repeat(Math.max(0, this.itemsCount - 2))}`;

            return `grid-template-columns: ${templateColumns}`;
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

/*
 * Collection element
 */
 .collection-wrapper {
     &:after {
        background: linear-gradient(transparent, var(--bg-primary));
        bottom: 0;
        content: "";
        height: 100px;
        left: 0;
        pointer-events: none;
        position: absolute;
        right: 5px;
        z-index: 9999;
    }

 }
.collection {
    border-collapse: collapse;
    bottom: 0;
    display: grid;
    grid-auto-rows: max-content;
    overflow: auto;
    position: absolute;
    top: 13rem;
    width: calc(100% - 10rem);

    &.is-add-form-opened {
        top: 64.75rem;
    }

    .content {
        bottom: 0;
        display: contents;
        left: 0;
        overflow-y: scroll;
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
