import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { compileString } from 'sass';

const css = compileString("@use 'layout/app-shell';", {
    loadPaths: [fileURLToPath(new URL('../../sass', import.meta.url))],
}).css;
const rule = selector => css.split('}').find(part => part.includes(`${selector} {`)) ?? '';

test('native shell locks the document without hiding overflowing page content', () => {
    assert.match(rule('html[data-native-app]'), /overflow: hidden;/);
    const shell = rule('html[data-native-app] .app-shell');
    assert.match(shell, /height: 100dvh;/);
    assert.match(shell, /grid-template-rows: auto minmax\(0, 1fr\) auto;/);
    const main = rule('html[data-native-app] .app-shell > .main');
    assert.match(main, /overflow: auto;/);
    assert.match(main, /overscroll-behavior: contain;/);
    assert.match(main, /justify-content: flex-start;/);
    assert.match(rule('html[data-native-app] .app-shell > .main > \*'), /margin-block: auto;/);
});

test('native layout is explicit and skips the Safari browser-toolbar workaround', () => {
    const bootstrap = readFileSync(new URL('../main.tsx', import.meta.url), 'utf8');
    assert.match(bootstrap, /if \(Capacitor\.isNativePlatform\(\)\) document\.documentElement\.dataset\.nativeApp = 'true'/);
    const hook = readFileSync(new URL('../hooks/useSafariBackgroundEdges.ts', import.meta.url), 'utf8');
    assert.match(hook, /if \(Capacitor\.isNativePlatform\(\) \|\| !shell\.current/);
});
