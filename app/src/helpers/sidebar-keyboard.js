const panels = new WeakMap();

function rememberTrigger(element, state) {
    const active = element.ownerDocument.activeElement;

    if (!active || active === element.ownerDocument.body || element.contains(active)) {
        return;
    }

    const menu = active.closest('.action-menu');
    state.trigger = menu ? menu.querySelector('.action-menu-trigger') : active;
}

function focusPanel(element, vnode) {
    vnode.context.$nextTick(() => {
        if (!panels.has(element) || !element.isConnected) {
            return;
        }

        const inputs = Array.from(element.querySelectorAll('input:not([disabled]), textarea:not([disabled])'));
        const input = inputs.find(item => !item.closest('[inert]') && item.getClientRects().length);
        (input || element).focus({ preventScroll: true });
    });
}

export default {
    inserted (element, binding, vnode) {
        const state = {
            trigger: null,
            key: binding.value.key,
            close: binding.value.close,
            parent: element.parentElement,
            onKeydown: null
        };

        rememberTrigger(element, state);
        state.onKeydown = event => {
            if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            state.close();
        };

        panels.set(element, state);
        element.addEventListener('keydown', state.onKeydown);
        focusPanel(element, vnode);
    },
    componentUpdated (element, binding, vnode) {
        const state = panels.get(element);
        state.close = binding.value.close;

        if (state.key !== binding.value.key) {
            state.key = binding.value.key;
            rememberTrigger(element, state);
            focusPanel(element, vnode);
        }
    },
    unbind (element, binding, vnode) {
        const state = panels.get(element);

        if (!state) {
            return;
        }

        const active = element.ownerDocument.activeElement;
        const restoreFocus = element.contains(active) || active === element.ownerDocument.body;
        element.removeEventListener('keydown', state.onKeydown);
        panels.delete(element);

        vnode.context.$nextTick(() => {
            if (restoreFocus && state.parent.isConnected && state.trigger && state.trigger.isConnected) {
                state.trigger.focus({ preventScroll: true });
            }
        });
    }
};
