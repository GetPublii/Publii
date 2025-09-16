<template>
    <li :title="title">
        <a 
            v-if="!path"
            href="#"
            @click.prevent="onClick">
            {{ label }}
            <span 
                v-if="hasBadge" 
                :class="badgeCssClass">
                {{ badgeValue }}
            </span>
        </a>

        <router-link
            v-if="path && !isExternal"
            :to="path">
            {{ label }}
            <span 
                v-if="hasBadge" 
                :class="badgeCssClass">
                {{ badgeValue }}
            </span>
        </router-link>

        <a
            v-if="path && isExternal"
            :href="path"
            target="_blank" 
            rel="noopener noreferrer">
            {{ label }}
            <span 
                v-if="hasBadge" 
                :class="badgeCssClass">
                {{ badgeValue }}
            </span>
        </a>
    </li>
</template>

<script>
export default {
    name: 'topbar-dropdown-item',
    props: [
        'hasBadge',
        'badgeValue',
        'badgeClass',
        'onClick',
        'label',
        'path',
        'title'
    ],
    computed: {
        badgeCssClass () {
            return this.badgeClass ? `badge ${this.badgeClass}` : 'badge';
        },
        isExternal () {
            return this.path.indexOf('http://') === 0 || this.path.indexOf('https://') === 0;
        }
    },
    methods: {
        openExternalLink (e) {
            e.preventDefault();
            mainProcessAPI.shellOpenExternal(this.path);
        }
    }
}
</script>

<style lang="scss" scoped>
li {
    & > a {
        color: var(--link-invert-color);
        display: block;
        font-weight: 400;
        padding: .5rem 3rem;
        white-space: nowrap;

        &:active,
        &:focus,
        &:hover {
            color: var(--link-invert-color-hover);
        }

        &:has(.badge) {
            align-items: center;
            display: flex;
        }

        .badge {
            align-items: center;
            aspect-ratio: 1/1;
            border-radius: 50%;
            display: inline-flex;
            font-size: 1rem;
            font-weight: var(--font-weight-semibold);
            height: 20px;
            justify-content: center;
            min-height: 20px;
            min-width: 20px;
            padding: 6px; 
            position: relative;
            right: -4px;
            top: -1px;
            width: auto;   
            z-index: 2;

            &.is-warning {
                background: rgba(var(--warning-rgb), 1);
                border: 2px solid var(--bg-site);
                color: white;
            }

            &.is-notice {
                aspect-ratio: unset;
                background: var(--gray-6);
                border-radius: 6px;
                color: var(--text-primary-color);
                font-size: 1rem;
                top: -2px;
            }
        }
    }
}
</style>
