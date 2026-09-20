<template>
    <div class="search">
        <text-input
            changeEventName="sites-list-filtered"
            v-model="value"
            icon="magnifier"
            size="small"
            ref="search-input"
            :spellcheck="false"
            :placeholder="$t('ui.search')"
            tabindex="0" />
        <span
            v-if="value !== ''"
            @click.stop="clear">
            <icon
                name="close"
                size="m"
                non-interactive
                aria-hidden="true"
                focusable="false" />
        </span>
    </div>
</template>

<script>
export default {
    name: 'sites-search',
    data () {
        return {
            value: ''
        };
    },
    methods: {
        clear () {
            this.value = '';
        }
    }
}
</script>

<style>

.sites-popup {
    .search {
        position: relative;

        .input-wrapper {
            padding: var(--space-4) var(--space-8);

            input {
                background: var(--input-bg-lightest);
                border-radius: 30px;
                box-shadow: none!important;
                padding: var(--space-6) 4.4rem var(--space-6) 6rem!important;
            }

            svg {
                fill: var(--icon-primary-color)!important;
                height: 1.7rem;
                left: 3.4rem!important;
                width: 1.7rem;
            }
        }

        & > span {
            align-items: center;
            border-radius: 50%;
            color: var(--icon-secondary-color);
            cursor: pointer;
            display: flex;
            font-size: var(--font-size-ui-xl);
            font-weight: var(--font-weight-light);
            height: 3rem;
            justify-content: center;
            padding: 0;
            position: absolute;
            right: 3rem;
            transition: all .3s ease-out;
            top: 50%;
            transform: translate(0, -50%);
            width: 3rem;

            &:active,
            &:focus,
            &:hover {
                color: var(--icon-tertiary-color);
            }

            &:hover {
                background: var(--input-border-color);
            }
        }
    }
}
</style>
