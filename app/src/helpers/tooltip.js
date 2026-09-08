import Vue from 'vue';
import Tooltip from '../components/basic-elements/Tooltip.vue';

const entries = new Map();
let nextID = 0;
let view = null;
let active = null;
let showTimer = null;
let hideTimer = null;
let lastShownAt = -Infinity;
let tooltipHovered = false;
let tooltipsEnabled = true;

export function setTooltipsEnabled (value) {
    tooltipsEnabled = value !== false;

    if (!tooltipsEnabled) {
        hide();
    }
}

function options (binding) {
    const value = typeof binding.value === 'string' ? { text: binding.value } : binding.value || {};

    return {
        text: typeof value.text === 'string' ? value.text.trim() : '',
        title: typeof value.title === 'string' ? value.title.trim() : '',
        disabled: value.disabled === true,
        describe: value.describe !== false && !binding.modifiers.hover
    };
}

function hide () {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);

    if (view) {
        if (view.visible) {
            lastShownAt = Date.now();
        }

        view.visible = false;
        view.placed = false;
    }

    active = null;
    tooltipHovered = false;
    document.removeEventListener('keydown', onKeydown, true);
    document.removeEventListener('pointerdown', hide, true);
    document.removeEventListener('click', hide, true);
    document.removeEventListener('scroll', hide, true);
    window.removeEventListener('resize', hide);
    window.removeEventListener('blur', hide);
}

function onKeydown (event) {
    if (event.key === 'Escape') {
        hide();
    }
}

function scheduleHide (entry) {
    if (active !== entry || entry.hovered || entry.focused || tooltipHovered) {
        return;
    }

    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, 120);
}

function ensureView () {
    if (view) {
        return;
    }

    view = new (Vue.extend(Tooltip))().$mount();
    // Mount outside scrolling content while retaining application token overrides.
    (document.getElementById('app') || document.body).appendChild(view.$el);
    view.$on('enter', () => {
        tooltipHovered = true;
        clearTimeout(hideTimer);
    });
    view.$on('leave', () => {
        tooltipHovered = false;
        if (active) {
            scheduleHide(active);
        }
    });
}

function show (entry, keyboard = false) {
    if (!tooltipsEnabled || entry.options.disabled || !entry.options.text || entry.element.disabled) {
        return;
    }

    if (active === entry) {
        clearTimeout(hideTimer);
        return;
    }

    const warm = (view && view.visible) || Date.now() - lastShownAt < 800;
    hide();
    active = entry;
    document.addEventListener('keydown', onKeydown, true);
    document.addEventListener('pointerdown', hide, true);
    document.addEventListener('click', hide, true);
    document.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    window.addEventListener('blur', hide);

    showTimer = setTimeout(() => {
        if (active !== entry || !entry.element.isConnected) {
            hide();
            return;
        }

        ensureView();
        view.text = entry.options.text;
        view.title = entry.options.title;
        view.visible = true;
        view.placed = false;
        view.$nextTick(() => {
            if (active === entry && view.visible) {
                view.place(entry.element);
            }
        });
    }, keyboard ? 0 : warm ? 100 : 500);
}

function updateDescription (entry) {
    const description = [entry.options.title, entry.options.text].filter(Boolean).join('\n');
    const describedBy = (entry.element.getAttribute('aria-describedby') || '')
        .split(/\s+/)
        .filter(id => id && id !== entry.id);

    if (entry.options.describe && entry.options.text && !entry.options.disabled) {
        if (!entry.description) {
            // Keep the description available before focus, including when the visual
            // tooltip is delayed or dismissed. The floating copy is aria-hidden.
            entry.description = document.createElement('span');
            entry.description.id = entry.id;
            entry.description.hidden = true;
            entry.description.setAttribute('role', 'tooltip');
            document.body.appendChild(entry.description);
        }

        if (entry.description.textContent !== description) {
            entry.description.textContent = description;
        }
        describedBy.push(entry.id);
    } else if (entry.description) {
        entry.description.remove();
        entry.description = null;
    }

    if (describedBy.length) {
        entry.element.setAttribute('aria-describedby', describedBy.join(' '));
    } else {
        entry.element.removeAttribute('aria-describedby');
    }
}

export default {
    inserted (element, binding) {
        const entry = {
            element,
            id: 'app-tooltip-description-' + ++nextID,
            options: options(binding),
            description: null,
            hovered: false,
            focused: false,
            listeners: {}
        };

        if (!binding.modifiers.focus) {
            entry.listeners.pointerenter = event => {
                if (event.pointerType !== 'touch' && !event.buttons) {
                    entry.hovered = true;
                    show(entry);
                }
            };
            entry.listeners.pointerleave = () => {
                entry.hovered = false;
                scheduleHide(entry);
            };
        }

        if (!binding.modifiers.hover) {
            const focusEvent = binding.modifiers.focusin ? 'focusin' : 'focus';
            const blurEvent = binding.modifiers.focusin ? 'focusout' : 'blur';

            entry.listeners[focusEvent] = event => {
                // Anchor to the visible label when its clipped radio input receives focus.
                const focusTarget = binding.modifiers.focusin ? event.target : element;

                if (focusTarget.matches(':focus-visible')) {
                    entry.focused = true;
                    show(entry, true);
                }
            };
            entry.listeners[blurEvent] = event => {
                if (binding.modifiers.focusin && event.relatedTarget && element.contains(event.relatedTarget)) {
                    return;
                }

                entry.focused = false;
                scheduleHide(entry);
            };
        }

        for (const [type, listener] of Object.entries(entry.listeners)) {
            element.addEventListener(type, listener);
        }

        entries.set(element, entry);
        updateDescription(entry);
    },
    componentUpdated (element, binding) {
        const entry = entries.get(element);

        if (!entry) {
            return;
        }

        const previous = entry.options;
        entry.options = options(binding);
        updateDescription(entry);

        if (active === entry && (entry.options.disabled || !entry.options.text || element.disabled)) {
            hide();
        } else if (active === entry && view && view.visible && (
            previous.text !== entry.options.text || previous.title !== entry.options.title
        )) {
            view.text = entry.options.text;
            view.title = entry.options.title;
            view.$nextTick(() => {
                if (active === entry) {
                    view.place(element);
                }
            });
        }
    },
    unbind (element) {
        const entry = entries.get(element);

        if (!entry) {
            return;
        }

        if (active === entry) {
            hide();
        }

        for (const [type, listener] of Object.entries(entry.listeners)) {
            element.removeEventListener(type, listener);
        }

        entry.options.describe = false;
        updateDescription(entry);
        entries.delete(element);

        if (!entries.size && view) {
            view.$destroy();
            view.$el.remove();
            view = null;
            lastShownAt = -Infinity;
        }
    }
};
