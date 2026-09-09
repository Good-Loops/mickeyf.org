import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import { PassThrough } from 'node:stream';
import { setImmediate } from 'node:timers/promises';
import { test } from 'node:test';
import {
    createRebuildQueue,
    documentationPatterns,
    runDocumentationBuild,
    startDocumentationWatcher,
} from './watch-docs.mjs';

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

function fakeChild() {
    const child = new EventEmitter();
    child.stdout = new PassThrough();
    child.exitCode = null;
    child.signalCode = null;
    child.kill = () => {
        child.signalCode = 'SIGTERM';
        child.stdout.end();
        child.emit('close', null, 'SIGTERM');
        return true;
    };
    return child;
}

test('debounces a burst into one build without building on startup', async (context) => {
    context.mock.timers.enable({ apis: ['setTimeout'] });
    let builds = 0;
    const queue = createRebuildQueue(() => { builds++; });
    assert.equal(builds, 0);
    for (let index = 0; index < 20; index++) queue.request();
    context.mock.timers.tick(399);
    await setImmediate();
    assert.equal(builds, 0);
    context.mock.timers.tick(1);
    await setImmediate();
    assert.equal(builds, 1);
    await queue.stop();
});

test('changes during a slow build coalesce into exactly one subsequent build', async (context) => {
    context.mock.timers.enable({ apis: ['setTimeout'] });
    const builds = [];
    const queue = createRebuildQueue(() => {
        const build = deferred();
        builds.push(build);
        return build.promise;
    });
    queue.request();
    context.mock.timers.tick(400);
    await setImmediate();
    for (let index = 0; index < 20; index++) {
        queue.request();
        context.mock.timers.tick(400);
    }
    await setImmediate();
    assert.equal(builds.length, 1);
    builds[0].resolve();
    await setImmediate();
    assert.equal(builds.length, 2);
    builds[1].resolve();
    await setImmediate();
    assert.equal(builds.length, 2);
    await queue.stop();
});

test('waits for the quiet period if a build finishes before the debounce timer', async (context) => {
    context.mock.timers.enable({ apis: ['setTimeout'] });
    const first = deferred();
    let builds = 0;
    const queue = createRebuildQueue(() => ++builds === 1 ? first.promise : undefined);
    queue.request();
    context.mock.timers.tick(400);
    await setImmediate();
    queue.request();
    first.resolve();
    await setImmediate();
    assert.equal(builds, 1);
    context.mock.timers.tick(400);
    await setImmediate();
    assert.equal(builds, 2);
    await queue.stop();
});

test('a failed build reports once and can recover on a later change', async (context) => {
    context.mock.timers.enable({ apis: ['setTimeout'] });
    const errors = [];
    let builds = 0;
    const queue = createRebuildQueue(() => {
        if (++builds === 1) throw new Error('fixture failure');
    }, { onError: (error) => errors.push(error.message) });
    queue.request();
    context.mock.timers.tick(400);
    await setImmediate();
    context.mock.timers.tick(10000);
    await setImmediate();
    assert.deepEqual(errors, ['fixture failure']);
    assert.equal(builds, 1);
    queue.request();
    context.mock.timers.tick(400);
    await setImmediate();
    assert.equal(builds, 2);
    await queue.stop();
});

test('stop drops queued work, ignores later events and waits for an active build', async (context) => {
    context.mock.timers.enable({ apis: ['setTimeout'] });
    const active = deferred();
    let builds = 0;
    const queue = createRebuildQueue(() => { builds++; return active.promise; });
    queue.request();
    context.mock.timers.tick(400);
    await setImmediate();
    queue.request();
    let stopped = false;
    const stopping = queue.stop().then(() => { stopped = true; });
    queue.request();
    context.mock.timers.tick(10000);
    await setImmediate();
    assert.equal(stopped, false);
    active.resolve();
    await stopping;
    assert.equal(stopped, true);
    assert.equal(builds, 1);
});

test('a rejected build does not lose a change queued while it was running', async (context) => {
    context.mock.timers.enable({ apis: ['setTimeout'] });
    const first = deferred();
    const errors = [];
    let builds = 0;
    const queue = createRebuildQueue(() => ++builds === 1 ? first.promise : undefined, {
        onError: (error) => errors.push(error.message),
    });
    queue.request();
    context.mock.timers.tick(400);
    await setImmediate();
    queue.request();
    context.mock.timers.tick(400);
    first.reject(new Error('fixture rejection'));
    await setImmediate();
    assert.deepEqual(errors, ['fixture rejection']);
    assert.equal(builds, 2);
    await queue.stop();
});

test('stop before debounce prevents a build', async (context) => {
    context.mock.timers.enable({ apis: ['setTimeout'] });
    let builds = 0;
    const queue = createRebuildQueue(() => { builds++; });
    queue.request();
    await queue.stop();
    context.mock.timers.tick(1000);
    await setImmediate();
    assert.equal(builds, 0);
});

test('build runner invokes npm through Node without a shell and propagates exit failures', async () => {
    const child = fakeChild();
    let invocation;
    const building = runDocumentationBuild('C:/fixture with spaces/npm-cli.js', {
        cwd: 'C:/fixture with spaces/repository',
        spawnProcess: (...args) => { invocation = args; return child; },
    });
    assert.equal(invocation[0], process.execPath);
    assert.deepEqual(invocation[1], ['C:/fixture with spaces/npm-cli.js', 'run', 'docs']);
    assert.equal(invocation[2].cwd, 'C:/fixture with spaces/repository');
    assert.equal(invocation[2].shell, undefined);
    assert.equal(invocation[2].windowsHide, true);
    const failed = assert.rejects(building, /exit 2/);
    child.emit('close', 2, null);
    await failed;
});

test('build spawn errors reject rather than hanging the queue', async () => {
    const child = fakeChild();
    const building = runDocumentationBuild('/fixture/npm-cli.js', { spawnProcess: () => child });
    const failed = assert.rejects(building, /fixture spawn failure/);
    child.emit('error', new Error('fixture spawn failure'));
    await failed;
});

test('watcher reads chunked event lines, retains globs and shuts down without a new build', async (context) => {
    context.mock.timers.enable({ apis: ['setTimeout'] });
    const watchChild = fakeChild();
    const buildChild = fakeChild();
    const invocations = [];
    const errors = [];
    const watcher = startDocumentationWatcher({
        npmCli: '/fixture/npm-cli.js',
        spawnProcess: (...args) => {
            invocations.push(args);
            return invocations.length === 1 ? watchChild : buildChild;
        },
        report: () => {},
        reportError: (error) => errors.push(error),
    });
    assert.deepEqual(invocations[0][1].slice(1), documentationPatterns);
    assert.equal(invocations[0][1].includes('-c'), false);
    watchChild.stdout.write('Watching fixture\nchan');
    watchChild.stdout.write('ge:C:\\fixture\\file.ts\r\nadd:another.ts\n');
    context.mock.timers.tick(400);
    await setImmediate();
    assert.equal(invocations.length, 2);
    const stopping = watcher.stop();
    buildChild.emit('close', 0, null);
    await stopping;
    assert.equal(await watcher.done, 0);
    assert.equal(watchChild.signalCode, 'SIGTERM');
    assert.deepEqual(errors, []);
});

test('watcher failure exits nonzero without attempting a build', async () => {
    const child = fakeChild();
    const errors = [];
    const watcher = startDocumentationWatcher({
        npmCli: '/fixture/npm-cli.js',
        spawnProcess: () => child,
        reportError: (error) => errors.push(error),
    });
    child.exitCode = 2;
    child.stdout.end();
    child.emit('close', 2, null);
    assert.equal(await watcher.done, 1);
    assert.match(errors[0], /stopped unexpectedly.*exit 2/);
});

test('stop waits for the owned file-watcher process to close', async () => {
    const child = fakeChild();
    child.kill = () => { child.signalCode = 'SIGTERM'; return true; };
    const watcher = startDocumentationWatcher({
        npmCli: '/fixture/npm-cli.js',
        spawnProcess: () => child,
    });
    let stopped = false;
    const stopping = watcher.stop().then(() => { stopped = true; });
    await setImmediate();
    assert.equal(stopped, false);
    child.stdout.end();
    child.emit('close', null, 'SIGTERM');
    await stopping;
    assert.equal(stopped, true);
    assert.equal(await watcher.done, 0);
});

test('direct invocation requires npm context and root scripts retain the intended workflow', async () => {
    assert.throws(() => startDocumentationWatcher({ npmCli: '' }), /npm run docs:watch/);
    const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
    assert.deepEqual(documentationPatterns, [
        'typedoc.merge.json', 'docs-src/index.md', 'docs-src/typedoc.css',
        'docs-src/assets/**/*', 'frontend/ts/**/*.ts', 'frontend/ts/**/*.tsx',
        'backend/ts/**/*.ts',
    ]);
    assert.equal(manifest.scripts['docs:watch'], 'node scripts/watch-docs.mjs');
    assert.equal(manifest.scripts['docs:dev:fresh'], 'npm run docs && npm run docs:dev');
    assert.equal(manifest.scripts['docs:dev'], 'concurrently "npm:docs:watch" "npm:docs:serve"');
});
