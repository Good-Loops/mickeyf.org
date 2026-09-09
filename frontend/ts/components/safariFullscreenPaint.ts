const pendingRestorations = new WeakMap<HTMLElement, () => void>();
const PAINT_RESTORE_DEADLINE_MS = 150;

/** Cleanup and re-entry restore immediately; neither should start a new pulse. */
export function cancelSafariFullscreenPaint(target: HTMLElement): void {
    pendingRestorations.get(target)?.();
}

/**
 * Offer WebKit one hidden paint after CSS fullscreen, without detaching or
 * resizing the live canvas. Its last-fixed-container color cache ignores hidden
 * renderers. This is a bounded workaround candidate, pending physical Safari QA.
 * https://github.com/WebKit/WebKit/blob/a09cbd759c1a2625ac0e34ddf8a488dc154fe582/Source/WebCore/page/Page.cpp#L5675-L5690
 */
export function releaseSafariFullscreenPaint(target: HTMLElement, page: Document): Promise<void> {
    cancelSafariFullscreenPaint(target);
    const browser = page.defaultView;
    if (!browser || !target.isConnected || page.visibilityState !== 'visible'
        || !page.documentElement.hasAttribute('data-safari-edges')) return Promise.resolve();

    const previousValue = target.style.getPropertyValue('visibility');
    const previousPriority = target.style.getPropertyPriority('visibility');

    return new Promise((resolve) => {
        let frame = 0;
        let deadline = 0;
        let restored = false;
        const restore = () => {
            if (restored) return;
            restored = true;
            browser.cancelAnimationFrame(frame);
            browser.clearTimeout(deadline);
            page.removeEventListener('visibilitychange', onVisibilityChange);
            pendingRestorations.delete(target);
            // Do not overwrite a visibility change made by another owner.
            if (target.style.getPropertyValue('visibility') === 'hidden'
                && target.style.getPropertyPriority('visibility') === 'important') {
                if (previousValue) target.style.setProperty('visibility', previousValue, previousPriority);
                else target.style.removeProperty('visibility');
            }
            resolve();
        };
        const onVisibilityChange = () => {
            if (page.visibilityState !== 'visible') restore();
        };

        pendingRestorations.set(target, restore);
        target.style.setProperty('visibility', 'hidden', 'important');
        page.addEventListener('visibilitychange', onVisibilityChange);
        // A backgrounded/throttled tab must never leave a live canvas hidden.
        deadline = browser.setTimeout(restore, PAINT_RESTORE_DEADLINE_MS);
        frame = browser.requestAnimationFrame(() => {
            frame = browser.requestAnimationFrame(restore);
        });
    });
}
