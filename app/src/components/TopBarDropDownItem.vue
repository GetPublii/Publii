<template>
    <li :title="title">
        <a 
            v-if="!path"
            href="#"
            @click.prevent="onClick">
            {{ label }}
            <span 
                v-if="hasBadge" 
                class="badge">
                {{ badgeValue }}
            </span>
        </a>

        <router-link
            v-if="path && !isExternal"
            :to="path">
            {{ label }}
            <span 
                v-if="hasBadge" 
                class="badge">
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
                class="badge">
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
        'onClick',
        'label',
        'path',
        'title'
    ],
    computed: {
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
            color: rgba(var(--warning-rgb), 1);
        }

        .badge {
            align-items: center;
            border-radius: 50%;
            color: rgba(var(--warning-rgb), 1);
            display: inline-flex;
            font-size: 1.2rem;
            font-weight: var(--font-weight-bold);
            height: 1.6rem;
            justify-content: center;
            line-height: 1;
            margin-left: 5px;
            position: relative;
            vertical-align: text-top;
            white-space: nowrap;
            width: 1.6rem;
            z-index: 2;

            &::before,
            &::after {
                animation: ripple 2s ease-out infinite;
                border: 1px solid rgba(var(--warning-rgb), .4);
                border-radius: 50%;
                content: '';
                height: 100%;
                left: 50%;
                opacity: 0;
                position: absolute;
                top: 50%;
                transform: translate(-50%, -50%) scale(0.6);
                width: 100%;
                z-index: 1;
            }

            &::after {
               animation-delay: 1s;
            }
        }

        @keyframes pulseCore {
            0%, 100% {
                transform: translate(-50%, -50%) scale(1);
            }
            50% {
                transform: translate(-50%, -50%) scale(1.4);
            }
        }

        @keyframes ripple {
            0% {
                opacity: 0.8;
                transform: translate(-50%, -50%) scale(0.9);
            }
            60% {
                opacity: 0.4;
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(2);
            }
        }
    }
}
</style>
