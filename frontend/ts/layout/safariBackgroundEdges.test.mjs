import assert from 'node:assert/strict';
import test from 'node:test';
import {
    createSafariBackgroundEdges,
    supportsSafariBackgroundEdges,
} from './safariBackgroundEdges.ts';

const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const INSET_PROPERTY = '--safari-edge-inset';
const FULLSCREEN_CLASS = 'canvas-fullscreen-fallback-active';

function createEvents() {
    const listeners = new Map();
    return {
        addEventListener(type, listener) {
            if (!listeners.has(type)) listeners.set(type, new Set());
            listeners.get(type).add(listener);
        },
        removeEventListener(type, listener) {
            listeners.get(type)?.delete(listener);
        },
        emit(type, event = {}) {
            for (const listener of [...(listeners.get(type) ?? [])]) {
                listener({ type, ...event });
            }
        },
        listenerCount() {
            return [...listeners.values()].reduce((sum, entries) => sum + entries.size, 0);
        },
    };
}

function createStyle() {
    const values = new Map();
    return {
        getPropertyValue: (name) => values.get(name) ?? '',
        getPropertyPriority: () => '',
        setProperty: (name, value) => values.set(name, String(value)),
        removeProperty(name) {
            const previous = values.get(name) ?? '';
            values.delete(name);
            return previous;
        },
    };
}

/**
 * Geometry/state regression model, not a substitute for Safari pixel checks.
 * scrollTo targets the visual document position; pinch offset remains separate
 * from the layout scroll so a mistaken offset subtraction fails these tests.
 */
function createBrowser(startup = {}) {
    let now = 0;
    let nextId = 0;
    let layoutY = startup.layoutY ?? 0;
    let layoutX = startup.left ?? 0;
    let shellHeight = startup.shellHeight ?? 695;
    let smallViewportHeight = 695;
    let footerOverhang = 0;
    let ignoredRequests = startup.ignoredRequests ?? 0;
    let ignoreCorrections = false;
    let ignoredAlignments = startup.ignoredAlignments ?? 0;
    let ignoreAlignmentRequests = false;
    let fontsReady;
    const tasks = new Map();
    const resizeObservers = new Set();
    const mutationObservers = new Set();
    const scrollRequests = [];
    const alignRequests = [];
    const schedule = (callback, delay) => {
        const id = ++nextId;
        tasks.set(id, { callback, at: now + delay });
        return id;
    };
    const createObserver = (registry) => class {
        constructor(callback) {
            this.callback = callback;
            this.targets = new Set();
            registry.add(this);
        }
        observe(target) { this.targets.add(target); }
        unobserve(target) { this.targets.delete(target); }
        disconnect() { this.targets.clear(); }
    };
    const notify = (registry, target, records) => {
        for (const observer of registry) {
            if (observer.targets.has(target)) observer.callback(records, observer);
        }
    };
    const classes = new Set();
    const root = {
        dataset: {},
        style: createStyle(),
        clientWidth: 393,
        scrollWidth: 393,
        clientTop: 0,
        offsetTop: 0,
        offsetParent: null,
        classList: {
            contains: (name) => classes.has(name),
            add(name) { classes.add(name); },
            remove(name) { classes.delete(name); },
        },
    };
    const inset = () => Number.parseFloat(root.style.getPropertyValue(INSET_PROPERTY)) || smallViewportHeight;
    const documentTop = () => root.dataset.safariEdges ? inset() : 0;
    const viewport = {
        ...createEvents(),
        scale: startup.scale ?? 1,
        height: 695 / (startup.scale ?? 1),
        width: 393 / (startup.scale ?? 1),
        offsetTop: startup.visualY ?? 0,
        offsetLeft: 0,
        get pageTop() { return layoutY + this.offsetTop; },
        get pageLeft() { return layoutX + this.offsetLeft; },
    };
    const footer = {
        getBoundingClientRect() {
            const top = documentTop() + shellHeight - 12 + footerOverhang - layoutY;
            return { top, bottom: top + 12, height: 12 };
        },
    };
    const shell = {
        isConnected: true,
        offsetParent: null,
        get offsetTop() { return documentTop(); },
        get offsetHeight() { return shellHeight; },
        get scrollHeight() { return shellHeight; },
        querySelector(selector) {
            if (selector === '.footer__text') return footer;
            if (selector === '.space-background') return {};
            return null;
        },
        getBoundingClientRect() {
            const top = documentTop() - layoutY;
            return { top, bottom: top + shellHeight, height: shellHeight, left: 0, width: 393 };
        },
        scrollIntoView(options) {
            alignRequests.push(options);
            if (ignoreAlignmentRequests || ignoredAlignments-- > 0) return;
            layoutY = documentTop();
            viewport.emit('scroll');
        },
    };
    const body = { style: createStyle(), matches: () => false };
    const document = {
        ...createEvents(),
        documentElement: root,
        body,
        activeElement: body,
        visibilityState: 'visible',
        fullscreenElement: null,
        webkitFullscreenElement: null,
        fonts: { ready: { then(callback) { fontsReady = callback; callback(); } } },
        querySelector(selector) {
            if (selector === '.app-shell') return shell;
            if (selector === '.footer__text') return footer;
            return null;
        },
    };
    shell.ownerDocument = document;
    const browserWindow = {
        ...createEvents(),
        document,
        visualViewport: viewport,
        navigator: { userAgent: IPHONE_SAFARI, maxTouchPoints: 5, standalone: false },
        location: { pathname: '/', href: 'http://localhost:5173/', search: '' },
        history: { scrollRestoration: 'auto' },
        innerHeight: 695,
        innerWidth: 393,
        get scrollY() { return layoutY; },
        get scrollX() { return layoutX; },
        getComputedStyle: () => ({ paddingTop: `${inset()}px` }),
        requestAnimationFrame: (callback) => schedule(callback, 16),
        cancelAnimationFrame: (id) => tasks.delete(id),
        setTimeout: schedule,
        clearTimeout: (id) => tasks.delete(id),
        ResizeObserver: createObserver(resizeObservers),
        MutationObserver: createObserver(mutationObservers),
        scrollTo(options) {
            scrollRequests.push(options);
            if (!ignoreCorrections && ignoredRequests-- <= 0) {
                const change = options.top - viewport.pageTop;
                const nextOffset = Math.min(
                    Math.max(0, smallViewportHeight - viewport.height),
                    Math.max(0, viewport.offsetTop + change),
                );
                layoutY += change - (nextOffset - viewport.offsetTop);
                viewport.offsetTop = nextOffset;
                if (options.left !== undefined) layoutX = options.left - viewport.offsetLeft;
            }
            viewport.emit('scroll');
            browserWindow.emit('scroll');
        },
    };
    document.defaultView = browserWindow;
    const controller = createSafariBackgroundEdges(shell, browserWindow);
    return {
        controller, root, shell, footer, viewport, document, window: browserWindow,
        scrollRequests, alignRequests,
        pan(y, visualY = 0, x = 0) {
            layoutY = y;
            viewport.offsetTop = visualY;
            layoutX = x;
            viewport.emit('scroll');
            browserWindow.emit('scroll');
        },
        focusInput(focused) {
            document.activeElement = focused ? { matches: () => true, isContentEditable: false } : body;
            document.emit(focused ? 'focusin' : 'focusout', { target: document.activeElement });
        },
        resizeShell(height) {
            shellHeight = height;
            notify(resizeObservers, shell, [{ target: shell, contentRect: shell.getBoundingClientRect() }]);
        },
        resizeSmallViewport(height) { smallViewportHeight = height; },
        setFooterOverhang(value) { footerOverhang = value; },
        ignoreCorrections(value) { ignoreCorrections = value; },
        ignoreAlignments(value) { ignoreAlignmentRequests = value; },
        skipAlignments(count) { ignoredAlignments = count; },
        setFallbackFullscreen(active) {
            if (active) classes.add(FULLSCREEN_CLASS);
            else classes.delete(FULLSCREEN_CLASS);
            notify(mutationObservers, root, [{ type: 'attributes', attributeName: 'class', target: root }]);
        },
        notifyFontsReady() { fontsReady?.(); },
        activeObserverCount() {
            return [...resizeObservers, ...mutationObservers].filter((observer) => observer.targets.size).length;
        },
        advance(duration = 1000) {
            const end = now + duration;
            let iterations = 0;
            while (true) {
                const next = [...tasks.entries()]
                    .filter(([, task]) => task.at <= end)
                    .sort((a, b) => a[1].at - b[1].at)[0];
                if (!next) break;
                assert.ok(++iterations < 1000, 'Viewport handlers must not create a correction loop');
                const [id, task] = next;
                tasks.delete(id);
                now = task.at;
                task.callback(now);
            }
            now = end;
        },
    };
}

test('scopes the workaround to supported iPhone Safari, excluding standalone and other browsers', () => {
    assert.equal(supportsSafariBackgroundEdges(IPHONE_SAFARI, false), true);
    assert.equal(supportsSafariBackgroundEdges(IPHONE_SAFARI.replace('Version/26.0', 'Version/26.6.1'), false), true);
    assert.equal(supportsSafariBackgroundEdges(IPHONE_SAFARI, true), false);
    assert.equal(supportsSafariBackgroundEdges(IPHONE_SAFARI.replace('Version/26.0', 'Version/18.6'), false), false);
    for (const browserToken of ['CriOS/140.0', 'FxiOS/140.0', 'EdgiOS/140.0', 'OPiOS/3.0', 'DuckDuckGo/7']) {
        assert.equal(supportsSafariBackgroundEdges(`${IPHONE_SAFARI} ${browserToken}`, false), false, browserToken);
    }
    for (const device of ['iPad', 'Macintosh', 'Android']) {
        assert.equal(supportsSafariBackgroundEdges(IPHONE_SAFARI.replaceAll('iPhone', device), false), false, device);
    }
    assert.equal(supportsSafariBackgroundEdges('', false), false);
});

test('normal startup aligns before paint, freezes the inset, and settles without feedback', () => {
    const browser = createBrowser();
    assert.equal(browser.shell.getBoundingClientRect().top, 0);
    assert.equal(browser.root.style.getPropertyValue(INSET_PROPERTY), '695px');
    browser.advance();
    assert.equal(browser.root.dataset.safariEdges, 'locked');
    const requests = browser.scrollRequests.length + browser.alignRequests.length;
    browser.window.emit('scroll');
    browser.viewport.emit('scroll');
    browser.advance();
    assert.equal(browser.scrollRequests.length + browser.alignRequests.length, requests);
});

test('zoomed reload preserves header, middle, and footer focal positions without double translation', () => {
    for (const visualY of [0, 173, 347.5]) {
        for (const ignoredRequests of [0, 1]) {
            const browser = createBrowser({ scale: 2, visualY, left: 61, ignoredRequests });
            browser.advance();
            assert.equal(browser.root.dataset.safariEdges, 'zooming');
            assert.equal(browser.viewport.pageTop, 695 + visualY);
            assert.equal(browser.viewport.pageLeft, 61);
            assert.equal(browser.viewport.scale, 2);
            assert.equal(browser.alignRequests.length, 0, 'A restored pinch must not be aligned to the header');
            const requests = browser.scrollRequests.length;
            browser.window.emit('pageshow');
            browser.notifyFontsReady();
            browser.viewport.emit('resize');
            browser.advance();
            assert.equal(browser.viewport.pageTop, 695 + visualY);
            assert.equal(browser.scrollRequests.length, requests);
        }
    }
});

test('bootstrap retry accepts a later native restoration and preserves horizontal pan', () => {
    const browser = createBrowser({ scale: 2, visualY: 100, left: 30, ignoredRequests: 1 });
    browser.pan(695, 240, 80);
    browser.advance();
    assert.equal(browser.viewport.pageTop, 935);
    assert.equal(browser.viewport.pageLeft, 80);
    assert.equal(browser.scrollRequests.length, 1);
    const horizontalOnly = createBrowser({ scale: 2, visualY: 100, left: 30, ignoredRequests: 1 });
    horizontalOnly.pan(0, 100, 80);
    horizontalOnly.advance();
    assert.equal(horizontalOnly.viewport.pageLeft, 80);
    assert.equal(horizontalOnly.viewport.pageTop, 695);
});

test('restored zoom arriving during normal startup does not add an existing inset twice', () => {
    const browser = createBrowser();
    browser.viewport.scale = 2;
    browser.viewport.height = 347.5;
    browser.pan(695, 180, 70);
    browser.advance();
    assert.equal(browser.root.dataset.safariEdges, 'zooming');
    assert.equal(browser.viewport.pageTop, 875);
    assert.equal(browser.viewport.pageLeft, 70);
});

test('pinch interrupting queued alignment never forces zoomed content back to the header', () => {
    const browser = createBrowser();
    browser.advance(266);
    const alignments = browser.alignRequests.length;
    browser.viewport.scale = 2;
    browser.viewport.height = 347;
    browser.pan(695, 173, 61);
    browser.viewport.emit('resize');
    browser.advance();
    assert.equal(browser.root.dataset.safariEdges, 'zooming');
    assert.equal(browser.alignRequests.length, alignments);
    assert.equal(browser.viewport.pageTop, 868);
    assert.equal(browser.viewport.pageLeft, 61);
    browser.viewport.scale = 1;
    browser.viewport.height = 620;
    browser.viewport.emit('resize');
    browser.advance();
    assert.equal(browser.root.dataset.safariEdges, 'zooming', 'A partially restored viewport must remain bounded');
    browser.viewport.height = 695;
    browser.viewport.offsetTop = 0;
    browser.viewport.emit('resize');
    browser.advance();
    assert.equal(browser.root.dataset.safariEdges, 'locked');
    assert.equal(browser.shell.getBoundingClientRect().top, 0);
});

test('rotation preserves the frozen document origin before delayed validation', () => {
    const browser = createBrowser();
    browser.advance();
    for (const height of [360, 695]) {
        browser.resizeSmallViewport(height);
        browser.viewport.height = height;
        browser.resizeShell(height);
        browser.window.emit('orientationchange');
        assert.equal(browser.root.style.getPropertyValue(INSET_PROPERTY), '695px');
        assert.equal(browser.shell.getBoundingClientRect().top, 0, 'No exposed spacer frame during rotation');
        browser.advance();
        assert.equal(browser.root.dataset.safariEdges, 'locked');
    }
});

test('Safari chrome keyboard shrink preserves paint and recovers after scroll-only dismissal', () => {
    const browser = createBrowser();
    browser.advance();
    browser.viewport.height = 393;
    browser.viewport.emit('resize');
    browser.advance();
    assert.ok(browser.root.dataset.safariEdges, 'Keyboard suspension must not remove the artwork');
    assert.notEqual(browser.root.dataset.safariEdges, 'locked');
    assert.equal(browser.viewport.pageTop, 695);
    browser.viewport.height = 695;
    browser.viewport.emit('scroll');
    browser.advance();
    assert.equal(browser.root.dataset.safariEdges, 'locked');
    assert.equal(browser.shell.getBoundingClientRect().top, 0);
});

test('zoom containment leaves legal focal points alone and clamps only exposed spacers', () => {
    const browser = createBrowser();
    browser.advance();
    browser.viewport.scale = 2;
    browser.viewport.height = 347;
    browser.pan(695, 173, 61);
    browser.advance();
    assert.equal(browser.viewport.pageTop, 868);
    assert.equal(browser.viewport.pageLeft, 61);
    browser.pan(500, 0, 61);
    browser.advance();
    assert.equal(browser.viewport.pageTop, 695);
    browser.pan(1200, 0, 61);
    browser.advance();
    assert.equal(browser.viewport.pageTop, 1043);
    assert.equal(browser.viewport.scale, 2);
    assert.equal(browser.viewport.pageLeft, 61);
    browser.setFooterOverhang(12);
    browser.pan(1200, 0, 61);
    browser.advance();
    assert.equal(browser.viewport.pageTop, 1055, 'The lowered footer must remain inside reachable content');
});

test('ignored zoom corrections are bounded instead of creating an animation-frame loop', () => {
    const browser = createBrowser();
    browser.advance();
    browser.viewport.scale = 2;
    browser.viewport.height = 347;
    browser.viewport.emit('resize');
    browser.advance();
    browser.ignoreCorrections(true);
    const before = browser.scrollRequests.length;
    browser.pan(400, 0);
    browser.advance(5000);
    assert.equal(browser.scrollRequests.length - before, 2);
});

test('DOM input focus releases the root lock and recovery does not fight keyboard reveal', () => {
    const browser = createBrowser();
    browser.advance();
    browser.focusInput(true);
    browser.viewport.height = 393;
    browser.pan(760, 0);
    browser.advance();
    assert.equal(browser.root.dataset.safariEdges, 'editing');
    assert.equal(browser.viewport.pageTop, 760, 'Preserve the browser scroll that reveals the focused field');
    browser.focusInput(false);
    browser.viewport.height = 695;
    browser.viewport.emit('resize');
    browser.advance();
    assert.equal(browser.root.dataset.safariEdges, 'locked');
    assert.equal(browser.shell.getBoundingClientRect().top, 0);
});

test('route refresh aligns once and tall routes remain naturally scrollable', () => {
    const browser = createBrowser();
    browser.advance();
    browser.resizeShell(1150);
    browser.controller.refresh();
    browser.advance();
    assert.equal(browser.root.dataset.safariEdges, 'scrolling');
    assert.equal(browser.shell.getBoundingClientRect().top, 0);
    browser.pan(930, 0);
    browser.advance();
    assert.equal(browser.viewport.pageTop, 930, 'Do not recenter a tall route while the user reads it');
    browser.resizeShell(695);
    browser.controller.refresh();
    browser.advance();
    assert.equal(browser.root.dataset.safariEdges, 'locked');
    assert.equal(browser.shell.getBoundingClientRect().top, 0);
    assert.equal(browser.root.style.getPropertyValue(INSET_PROPERTY), '695px');
});

test('asynchronous content growth releases an existing lock without a viewport event', () => {
    const browser = createBrowser();
    browser.advance();
    browser.resizeShell(1300);
    browser.advance();
    assert.equal(browser.root.dataset.safariEdges, 'scrolling');
    browser.pan(1000, 0);
    browser.advance();
    assert.equal(browser.viewport.pageTop, 1000);
});

test('both native and CSS fallback fullscreen suspend correction and restore on exit', () => {
    for (const fullscreen of ['fallback', 'native']) {
        const browser = createBrowser();
        browser.advance();
        if (fullscreen === 'fallback') browser.setFallbackFullscreen(true);
        else {
            browser.document.fullscreenElement = {};
            browser.document.emit('fullscreenchange');
        }
        browser.advance();
        assert.equal(browser.root.dataset.safariEdges, 'fullscreen', fullscreen);
        const requests = browser.scrollRequests.length + browser.alignRequests.length;
        browser.pan(810, 0);
        browser.viewport.scale = 2;
        browser.viewport.height = 347;
        browser.viewport.emit('resize');
        browser.advance();
        assert.equal(browser.scrollRequests.length + browser.alignRequests.length, requests, fullscreen);
        browser.viewport.scale = 1;
        browser.viewport.height = 695;
        if (fullscreen === 'fallback') browser.setFallbackFullscreen(false);
        else {
            browser.document.fullscreenElement = null;
            browser.document.emit('fullscreenchange');
        }
        browser.advance();
        assert.equal(browser.root.dataset.safariEdges, 'locked', fullscreen);
        assert.equal(browser.shell.getBoundingClientRect().top, 0, fullscreen);
    }
});

test('a deferred Safari fullscreen exit preserves paint until alignment becomes available', () => {
    const browser = createBrowser();
    browser.advance();
    const activeObservers = browser.activeObserverCount();
    const activeListeners = browser.window.listenerCount()
        + browser.viewport.listenerCount() + browser.document.listenerCount();
    browser.setFallbackFullscreen(true);
    browser.pan(810, 0);
    browser.ignoreAlignments(true);
    browser.ignoreCorrections(true);
    browser.setFallbackFullscreen(false);
    browser.advance(500);

    assert.ok(browser.root.dataset.safariEdges, 'A temporary scroll refusal must not remove the painted layout');
    assert.equal(browser.root.style.getPropertyValue(INSET_PROPERTY), '695px');
    assert.equal(browser.activeObserverCount(), activeObservers);
    assert.equal(browser.window.listenerCount()
        + browser.viewport.listenerCount() + browser.document.listenerCount(), activeListeners);

    browser.ignoreAlignments(false);
    browser.ignoreCorrections(false);
    browser.advance(1500);
    assert.equal(browser.root.dataset.safariEdges, 'locked');
    assert.equal(browser.shell.getBoundingClientRect().top, 0);
});

test('exhausted fullscreen recovery stays bounded and can recover on a later real event', () => {
    for (const resumeWith of ['resize', 'route']) {
        const browser = createBrowser();
        browser.advance();
        const activeObservers = browser.activeObserverCount();
        browser.setFallbackFullscreen(true);
        browser.pan(810, 0);
        browser.ignoreAlignments(true);
        browser.ignoreCorrections(true);
        browser.setFallbackFullscreen(false);
        const requestsBefore = browser.alignRequests.length + browser.scrollRequests.length;
        browser.advance(10000);

        assert.ok(browser.root.dataset.safariEdges, resumeWith);
        assert.equal(browser.root.style.getPropertyValue(INSET_PROPERTY), '695px', resumeWith);
        assert.equal(browser.activeObserverCount(), activeObservers, resumeWith);
        const requestsAfter = browser.alignRequests.length + browser.scrollRequests.length;
        assert.ok(requestsAfter > requestsBefore, 'Recovery should attempt alignment');
        assert.ok(requestsAfter - requestsBefore <= 16, 'Recovery must have a finite request budget');
        browser.advance(10000);
        assert.equal(browser.alignRequests.length + browser.scrollRequests.length, requestsAfter,
            'Exhausting recovery must not leave a timer or animation-frame retry loop');

        browser.ignoreAlignments(false);
        browser.ignoreCorrections(false);
        if (resumeWith === 'resize') browser.viewport.emit('resize');
        else browser.controller.refresh();
        browser.advance(1500);
        assert.equal(browser.root.dataset.safariEdges, 'locked', resumeWith);
        assert.equal(browser.shell.getBoundingClientRect().top, 0, resumeWith);
    }
});

test('a position shift on the first locked frame retries without tearing down the inset', () => {
    const browser = createBrowser();
    browser.advance();
    browser.setFallbackFullscreen(true);
    browser.pan(810, 0);
    browser.setFallbackFullscreen(false);
    browser.advance(298);
    assert.equal(browser.root.dataset.safariEdges, 'locked');

    // Safari may apply a delayed viewport restoration after the overflow lock.
    browser.pan(720, 0);
    browser.skipAlignments(1);
    browser.advance(16);
    assert.ok(browser.root.dataset.safariEdges);
    assert.equal(browser.root.style.getPropertyValue(INSET_PROPERTY), '695px');
    browser.advance(1500);
    assert.equal(browser.root.dataset.safariEdges, 'locked');
    assert.equal(browser.shell.getBoundingClientRect().top, 0);
});

test('editing and fullscreen exits resume containment without requiring users to undo zoom', () => {
    for (const interruption of ['editing', 'fallback', 'native']) {
        const browser = createBrowser({ scale: 2, visualY: 173, left: 61 });
        browser.advance();
        if (interruption === 'editing') browser.focusInput(true);
        else if (interruption === 'fallback') browser.setFallbackFullscreen(true);
        else {
            browser.document.fullscreenElement = {};
            browser.document.emit('fullscreenchange');
        }
        browser.advance();
        if (interruption === 'editing') browser.focusInput(false);
        else if (interruption === 'fallback') browser.setFallbackFullscreen(false);
        else {
            browser.document.fullscreenElement = null;
            browser.document.emit('fullscreenchange');
        }
        browser.advance();
        assert.equal(browser.root.dataset.safariEdges, 'zooming', interruption);
        assert.equal(browser.viewport.pageTop, 868, interruption);
        assert.equal(browser.viewport.pageLeft, 61, interruption);
        assert.equal(browser.viewport.scale, 2, interruption);
        browser.pan(500, 0, 61);
        browser.advance();
        assert.equal(browser.viewport.pageTop, 695, `Containment must resume after ${interruption}`);
    }
});

test('pagehide preserves painted geometry, pageshow resumes, and disposal removes all work', () => {
    const browser = createBrowser({ scale: 2, visualY: 200 });
    browser.advance();
    const beforeHide = browser.scrollRequests.length;
    browser.window.emit('pagehide');
    assert.equal(browser.root.dataset.safariEdges, 'zooming');
    assert.equal(browser.viewport.pageTop, 895);
    assert.equal(browser.window.history.scrollRestoration, 'auto');
    browser.viewport.emit('resize');
    browser.window.emit('focus');
    browser.advance();
    assert.equal(browser.scrollRequests.length, beforeHide);
    browser.window.emit('pageshow');
    browser.advance();
    assert.equal(browser.window.history.scrollRestoration, 'manual');
    assert.equal(browser.viewport.pageTop, 895);
    browser.pan(500, 0);
    browser.advance();
    assert.equal(browser.viewport.pageTop, 695);
    browser.controller.dispose();
    const afterDispose = browser.scrollRequests.length + browser.alignRequests.length;
    assert.equal(browser.root.dataset.safariEdges, undefined);
    assert.equal(browser.root.style.getPropertyValue(INSET_PROPERTY), '');
    assert.equal(browser.window.history.scrollRestoration, 'auto');
    assert.equal(browser.activeObserverCount(), 0);
    assert.equal(browser.window.listenerCount() + browser.viewport.listenerCount() + browser.document.listenerCount(), 0);
    browser.window.emit('pageshow');
    browser.viewport.emit('resize');
    browser.notifyFontsReady();
    browser.controller.refresh();
    browser.advance();
    assert.equal(browser.scrollRequests.length + browser.alignRequests.length, afterDispose);
});
