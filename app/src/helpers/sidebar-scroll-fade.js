const instances = new WeakMap();

export default {
    inserted (element) {
        const panel = element.parentElement;
        let frame = null;

        const update = () => {
            frame = null;
            const remaining = element.scrollHeight - element.clientHeight - element.scrollTop;
            const scrollbarWidth = element.offsetWidth - element.clientWidth;

            panel.classList.toggle('has-content-below', remaining > 1);
            panel.style.setProperty('--sidebar-scrollbar-width', scrollbarWidth + 'px');
        };

        const scheduleUpdate = () => {
            if (frame === null) {
                frame = requestAnimationFrame(update);
            }
        };

        const resizeObserver = new ResizeObserver(scheduleUpdate);
        const observeContent = () => {
            resizeObserver.disconnect();
            resizeObserver.observe(element);

            Array.from(element.children).forEach(child => {
                resizeObserver.observe(child);
            });

            scheduleUpdate();
        };

        const mutationObserver = new MutationObserver(observeContent);
        mutationObserver.observe(element, { childList: true });
        element.addEventListener('scroll', scheduleUpdate, { passive: true });
        observeContent();

        instances.set(element, () => {
            resizeObserver.disconnect();
            mutationObserver.disconnect();
            element.removeEventListener('scroll', scheduleUpdate);

            if (frame !== null) {
                cancelAnimationFrame(frame);
            }

            panel.classList.remove('has-content-below');
            panel.style.removeProperty('--sidebar-scrollbar-width');
        });
    },
    unbind (element) {
        const cleanup = instances.get(element);

        if (cleanup) {
            cleanup();
            instances.delete(element);
        }
    }
};
