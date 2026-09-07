import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { compileString } from 'sass';

const css = compileString(`
    @use 'abstracts/mixins' as mixins;
    .fixture { @include mixins.block-canvas-fullscreen('fixture'); }
`, {
    loadPaths: [fileURLToPath(new URL('../../sass', import.meta.url))],
}).css;

const compactStart = css.indexOf('@media');
const desktopCss = css.slice(0, compactStart);
const compactCss = css.slice(compactStart);

test('compact native, prefixed and fallback fullscreen share aspect-preserving sizing', () => {
    assert.notEqual(compactStart, -1);
    assert.match(compactCss, /__canvas-wrapper:fullscreen .*__canvas/);
    assert.match(compactCss, /__canvas-wrapper:-webkit-full-screen .*__canvas/);
    assert.match(compactCss, /__canvas-wrapper\[data-canvas-fullscreen=fallback\] .*__canvas/);
    for (const declaration of [
        'width: auto;', 'height: auto;', 'max-width: 100%;', 'max-height: 100%;',
        'min-width: 0;', 'min-height: 0;', 'flex: 0 0 auto;',
    ]) assert.ok(compactCss.includes(declaration), declaration);
});

test('height-limited landscape joins the shared narrow-screen breakpoint', () => {
    assert.match(compactCss, /@media only screen and \(max-width: [^)]+\), only screen and \(orientation: landscape\) and \(max-height: [^)]+\)/);
});

test('larger desktop fullscreen keeps its existing width-driven enlargement', () => {
    assert.match(desktopCss, /width: 100%;/);
    assert.match(desktopCss, /height: auto;/);
    assert.match(desktopCss, /max-height: 100dvh;/);
    assert.doesNotMatch(desktopCss, /flex: 0 0 auto;/);
});
