import { CANVAS_FULLSCREEN_ROOT_CLASS } from '../components/fullscreenMode.ts';

type EdgeWindow = Window & Pick<typeof globalThis, 'MutationObserver' | 'ResizeObserver'>;
type FullscreenDocument = Document & { webkitFullscreenElement?: Element | null };

/** This workaround is verified in ordinary iPhone Safari, not native webviews. */
export function supportsSafariBackgroundEdges(userAgent: string, standalone: boolean): boolean {
    const version = /Version\/(\d+)/.exec(userAgent);
    return !standalone && /iPhone/.test(userAgent) && /Safari\//.test(userAgent)
        && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/.test(userAgent)
        && Number(version?.[1] ?? 0) >= 26;
}

/**
 * Keeps Safari's browser bars over painted document content. The document has
 * background-only insets, but users may pan/scroll only through the actual shell.
 * No gesture is cancelled and no viewport scale or persistent preference changes.
 */
export function createSafariBackgroundEdges(shell: HTMLElement, browser: EdgeWindow = window) {
    const page = browser.document as FullscreenDocument;
    const root = page.documentElement;
    const viewport = browser.visualViewport;
    const originalScroll = { left: browser.scrollX, top: browser.scrollY };
    const originalRestoration = browser.history.scrollRestoration;
    const originalInset = root.style.getPropertyValue('--safari-edge-inset');
    const originalInsetPriority = root.style.getPropertyPriority('--safari-edge-inset');
    const originalPhase = root.dataset.safariEdges;
    let frame = 0;
    let boundsFrame = 0;
    let settleTimer = 0;
    let disposed = false;
    let paused = false;
    let positioning = false;
    let layoutReady = false;
    let zoomChanged = false;
    let restoreLockOnInterruption = false;
    let frozenInset: number | null = null;
    let contentTop: number | null = null;
    let lastCorrection: { from: number; to: number; attempts: number } | null = null;
    let alignmentRetries = 0;

    const isZoomed = () => Math.abs((viewport?.scale ?? 1) - 1) > 0.01;
    const isEditing = () => Boolean(page.activeElement?.matches(
        'input, textarea, select, [contenteditable="true"]',
    ));
    const isFullscreen = () => Boolean(page.fullscreenElement || page.webkitFullscreenElement
        || root.classList.contains(CANVAS_FULLSCREEN_ROOT_CLASS));
    const visibleHeight = () => viewport?.height ?? browser.innerHeight;
    const fitsViewport = () => shell.getBoundingClientRect().height <= visibleHeight() + 4;

    function layoutDocumentTop(element: HTMLElement): number {
        let top = 0;
        for (let node: HTMLElement | null = element; node; node = node.offsetParent as HTMLElement | null) {
            top += node.offsetTop;
            if (node.offsetParent) top += node.offsetParent.clientTop;
        }
        return top;
    }

    function cancelWork() {
        browser.cancelAnimationFrame(frame);
        browser.cancelAnimationFrame(boundsFrame);
        browser.clearTimeout(settleTimer);
        frame = 0;
        boundsFrame = 0;
        settleTimer = 0;
        positioning = false;
    }

    function deferToBrowser(): boolean {
        if (disposed || paused) return true;
        if (isFullscreen() || isEditing()) {
            cancelWork();
            root.dataset.safariEdges = isFullscreen() ? 'fullscreen' : 'editing';
            return true;
        }
        return false;
    }

    function prepareLayout(): boolean {
        restoreLockOnInterruption ||= ['locked', 'zooming'].includes(root.dataset.safariEdges ?? '');
        root.dataset.safariEdges = 'preparing';
        if (frozenInset !== null) return true;
        // Freeze the computed small viewport, not the keyboard-sensitive visual
        // viewport. Changing this inset on rotation causes an exposed-spacer flash.
        const inset = parseFloat(browser.getComputedStyle(page.body).paddingTop);
        if (!Number.isFinite(inset) || inset <= 0) { dispose(); return false; }
        frozenInset = inset;
        root.style.setProperty('--safari-edge-inset', `${inset}px`);
        contentTop = layoutDocumentTop(shell);
        return true;
    }

    function alignShell(): boolean {
        if (Math.abs(shell.getBoundingClientRect().top) <= 2) return true;
        try {
            shell.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'auto' });
            return true;
        } catch {
            dispose();
            return false;
        }
    }

    function activateZoomedLayout() {
        if (layoutReady || !viewport || deferToBrowser()) return;
        const beforeTop = layoutDocumentTop(shell);
        const previousTop = viewport.pageTop;
        const previousLeft = viewport.pageLeft;
        const previousScale = viewport.scale;
        if (!prepareLayout()) return;
        contentTop = layoutDocumentTop(shell);
        const targetTop = previousTop + contentTop - beforeTop;
        layoutReady = true;
        zoomChanged = true;
        root.dataset.safariEdges = 'zooming';
        // Reserve the frame before a native scroll request can emit its events.
        // Retry only an unchanged position, never overwrite a later restoration.
        boundsFrame = browser.requestAnimationFrame(() => {
            if (!disposed && !paused && !isEditing() && !isFullscreen()
                && page.visibilityState !== 'hidden' && viewport.scale === previousScale
                && Math.abs(viewport.pageTop - previousTop) <= 1
                && Math.abs(viewport.pageLeft - previousLeft) <= 1) {
                try {
                    browser.scrollTo({ top: targetTop, left: previousLeft, behavior: 'instant' });
                } catch { /* A subsequent viewport event can retry bounded scrolling. */ }
            }
            boundsFrame = 0;
            scheduleBounds();
        });
        try {
            browser.scrollTo({ top: targetTop, left: previousLeft, behavior: 'instant' });
        } catch { /* Retry after the scrollable layout has reached the browser. */ }
    }

    function interruptForZoom() {
        if (!layoutReady) activateZoomedLayout();
        zoomChanged = true;
        browser.clearTimeout(settleTimer);
        browser.cancelAnimationFrame(frame);
        frame = 0;
        positioning = false;
        if (layoutReady) {
            root.dataset.safariEdges = 'zooming';
        }
        restoreLockOnInterruption = false;
        scheduleBounds();
    }

    function canAlign(): boolean {
        if (deferToBrowser()) return false;
        if (isZoomed()) { interruptForZoom(); return false; }
        return true;
    }

    function allowContentScroll() {
        positioning = false;
        layoutReady = true;
        contentTop = layoutDocumentTop(shell);
        root.dataset.safariEdges = zoomChanged && restoreLockOnInterruption ? 'zooming' : 'scrolling';
        restoreLockOnInterruption = false;
        scheduleBounds();
    }

    function retryAlignment() {
        cancelWork();
        // Safari can defer scroll/overflow changes while leaving fullscreen.
        // Keep the painted inset mounted; disposal would also prevent recovery
        // on later navigation. After two delayed retries, yield to browser events.
        if (alignmentRetries >= 2) { allowContentScroll(); return; }
        alignmentRetries += 1;
        root.dataset.safariEdges = 'preparing';
        settleTimer = browser.setTimeout(() => {
            settleTimer = 0;
            frame = browser.requestAnimationFrame(centerLayout);
        }, 250);
    }

    function verifyPosition(attempt: number) {
        frame = 0;
        if (!canAlign()) return;
        if (!fitsViewport()) { allowContentScroll(); return; }
        if (Math.abs(shell.getBoundingClientRect().top) > 2) {
            if (attempt < 2 && alignShell()) {
                frame = browser.requestAnimationFrame(() => verifyPosition(attempt + 1));
            } else retryAlignment();
            return;
        }
        root.dataset.safariEdges = 'locked';
        restoreLockOnInterruption = false;
        browser.cancelAnimationFrame(boundsFrame);
        boundsFrame = 0;
        lastCorrection = null;
        frame = browser.requestAnimationFrame(() => {
            frame = 0;
            if (!canAlign()) return;
            if (!fitsViewport()) { allowContentScroll(); return; }
            if (Math.abs(shell.getBoundingClientRect().top) > 2) { retryAlignment(); return; }
            positioning = false;
            zoomChanged = false;
            alignmentRetries = 0;
            contentTop = layoutDocumentTop(shell);
            layoutReady = true;
        });
    }

    function centerLayout() {
        frame = 0;
        if (!canAlign()) return;
        positioning = true;
        const firstActivation = frozenInset === null;
        if (!prepareLayout()) return;
        if (firstActivation && !alignShell()) return;
        const sampledHeight = visibleHeight();
        frame = browser.requestAnimationFrame(() => {
            frame = 0;
            if (!canAlign()) return;
            if (Math.abs(visibleHeight() - sampledHeight) > 1) {
                positioning = false;
                scheduleLayout();
                return;
            }
            if (!fitsViewport()) { allowContentScroll(); return; }
            if (!alignShell()) return;
            frame = browser.requestAnimationFrame(() => verifyPosition(0));
        });
    }

    function scheduleLayout() {
        if (deferToBrowser()) return;
        browser.clearTimeout(settleTimer);
        if (isZoomed()) { interruptForZoom(); return; }
        if (positioning) return;
        scheduleBounds();
        settleTimer = browser.setTimeout(() => {
            settleTimer = 0;
            frame = browser.requestAnimationFrame(centerLayout);
        }, 250);
    }

    function scheduleBounds() {
        if (disposed || paused || boundsFrame || !layoutReady || positioning || isEditing() || isFullscreen()
            || page.visibilityState === 'hidden'
            || !['zooming', 'scrolling'].includes(root.dataset.safariEdges ?? '')) return;
        boundsFrame = browser.requestAnimationFrame(constrainPan);
    }

    function constrainPan() {
        boundsFrame = 0;
        if (disposed || paused || positioning || isEditing() || isFullscreen()
            || page.visibilityState === 'hidden' || contentTop === null
            || !['zooming', 'scrolling'].includes(root.dataset.safariEdges ?? '')
            || !viewport || !(viewport.height > 0) || !Number.isFinite(viewport.pageTop)) return;
        const rect = shell.getBoundingClientRect();
        const footer = shell.querySelector('.footer__text')?.getBoundingClientRect();
        const bottom = contentTop + Math.max(rect.height, (footer?.bottom ?? rect.bottom) - rect.top);
        const lastTop = Math.max(contentTop, bottom - viewport.height);
        const targetTop = Math.min(lastTop, Math.max(contentTop, viewport.pageTop));
        if (Math.abs(targetTop - viewport.pageTop) <= 1) { lastCorrection = null; return; }
        const previous = lastCorrection;
        const unchanged = previous && Math.abs(previous.from - viewport.pageTop) <= 1
            && Math.abs(previous.to - targetTop) <= 1;
        const attempts = unchanged ? previous.attempts + 1 : 1;
        if (attempts > 2) return;
        lastCorrection = { from: viewport.pageTop, to: targetTop, attempts };
        // iOS uses visual document coordinates here. Subtracting offsetTop again
        // would reintroduce the header/footer escape, so retain horizontal pan too.
        try {
            browser.scrollTo({ top: targetTop, left: viewport.pageLeft, behavior: 'instant' });
        } catch {
            lastCorrection.attempts = 2;
            return;
        }
        scheduleBounds();
    }

    function onScroll() {
        if (disposed || paused || positioning || !root.dataset.safariEdges) return;
        if (isFullscreen() || isEditing()) return;
        if (root.dataset.safariEdges === 'scrolling' && !fitsViewport()) { scheduleBounds(); return; }
        if (isZoomed() || zoomChanged || root.dataset.safariEdges !== 'locked'
            || Math.abs(shell.getBoundingClientRect().top) > 2) scheduleLayout();
    }

    function onVisibility() {
        if (page.visibilityState === 'visible') scheduleLayout();
    }

    function pause() {
        paused = true;
        cancelWork();
        // Preserve geometry for reload and back/forward cache snapshots.
        browser.history.scrollRestoration = originalRestoration;
    }

    function resume() {
        if (disposed) return;
        paused = false;
        browser.history.scrollRestoration = 'manual';
        scheduleLayout();
    }

    /** Called after a React route commit; the inset remains mounted across routes. */
    function refresh() {
        if (deferToBrowser()) return;
        cancelWork();
        lastCorrection = null;
        alignmentRetries = 0;
        if (isZoomed()) {
            if (!layoutReady) activateZoomedLayout();
            else { root.dataset.safariEdges = 'zooming'; scheduleBounds(); }
            return;
        }
        if (!prepareLayout()) return;
        positioning = true;
        // Route entry aligns even tall pages once, then allows content scrolling.
        if (!alignShell()) return;
        positioning = false;
        scheduleLayout();
    }

    const shellObserver = new browser.ResizeObserver(scheduleLayout);
    const fullscreenObserver = new browser.MutationObserver(scheduleLayout);
    shellObserver.observe(shell);
    fullscreenObserver.observe(root, { attributes: true, attributeFilter: ['class'] });
    browser.addEventListener('resize', scheduleLayout);
    browser.addEventListener('orientationchange', scheduleLayout);
    browser.addEventListener('scroll', onScroll, { passive: true });
    browser.addEventListener('focus', scheduleLayout);
    browser.addEventListener('pagehide', pause);
    browser.addEventListener('pageshow', resume);
    page.addEventListener('focusin', scheduleLayout);
    page.addEventListener('focusout', scheduleLayout);
    page.addEventListener('visibilitychange', onVisibility);
    page.addEventListener('fullscreenchange', scheduleLayout);
    page.addEventListener('webkitfullscreenchange', scheduleLayout);
    viewport?.addEventListener('resize', scheduleLayout);
    viewport?.addEventListener('scroll', onScroll);
    browser.history.scrollRestoration = 'manual';
    refresh();
    page.fonts.ready.then(scheduleLayout);

    function dispose() {
        if (disposed) return;
        disposed = true;
        cancelWork();
        shellObserver.disconnect();
        fullscreenObserver.disconnect();
        browser.removeEventListener('resize', scheduleLayout);
        browser.removeEventListener('orientationchange', scheduleLayout);
        browser.removeEventListener('scroll', onScroll);
        browser.removeEventListener('focus', scheduleLayout);
        browser.removeEventListener('pagehide', pause);
        browser.removeEventListener('pageshow', resume);
        page.removeEventListener('focusin', scheduleLayout);
        page.removeEventListener('focusout', scheduleLayout);
        page.removeEventListener('visibilitychange', onVisibility);
        page.removeEventListener('fullscreenchange', scheduleLayout);
        page.removeEventListener('webkitfullscreenchange', scheduleLayout);
        viewport?.removeEventListener('resize', scheduleLayout);
        viewport?.removeEventListener('scroll', onScroll);
        if (originalPhase === undefined) delete root.dataset.safariEdges;
        else root.dataset.safariEdges = originalPhase;
        if (originalInset) root.style.setProperty('--safari-edge-inset', originalInset, originalInsetPriority);
        else root.style.removeProperty('--safari-edge-inset');
        browser.history.scrollRestoration = originalRestoration;
        browser.scrollTo({ ...originalScroll, behavior: 'auto' });
    }

    return { refresh, dispose };
}
