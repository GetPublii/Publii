<template>
    <div class="header">
        <slot></slot>
    </div>
</template>

<script>
export default {
    name: 'collection-header'
}
</script>

<style scoped>

.header {
    display: contents;

    .tools {
        background: var(--bg-site);
        display: flex;
        gap: var(--space-3);
        margin-left: 5rem;
        min-width: 200px;
        padding: .55rem 0;
        position: fixed;
        z-index: 5;

        .button {
            background: none;
            position: relative;
            z-index: 0;

            &::before {
                content: "";
                background: var(--popup-bg);  
                border-radius: var(--radius-base);
                display: block;
                left: -2px;
                opacity: 0;
                position: absolute;
                right: 0;
                height: 100%;
                top: 0;
                transition: all .15s cubic-bezier(0.4,0.0,0.2,1);
                transform: scale(.5);
                width: calc(100% + 2px);
                z-index: -1;
            }
            
            & + .button {
               margin: 0;
               position: relative;
            }

            &:hover {
                background: none;

                &::before {
                    opacity: 1;
                    transform: scale(1);
                }
            }

            &.button-active {
                 background: var(--popup-bg);  
            }
        }
    }

    .col {
        background: var(--bg-site);
        color: var(--headings-color);
        position: sticky;
        top: 0;
        z-index: 2;
    }
}

@media (max-width: 1350px) {
    .header .tools .button-small {
        font-size: var(--font-size-ui-sm);
        padding: 0 var(--space-3);

        &.button-icon {
            padding-left: 3.6rem;

            & > svg {
                display: none;
            }
        }
    }
}
</style>
