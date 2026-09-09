import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const documentationPatterns = [
    'typedoc.merge.json',
    'docs-src/index.md',
    'docs-src/typedoc.css',
    'docs-src/assets/**/*',
    'frontend/ts/**/*.ts',
    'frontend/ts/**/*.tsx',
    'backend/ts/**/*.ts',
];

export function createRebuildQueue(build, { debounceMs = 400, onError = console.error } = {}) {
    let timer;
    let activeBuild;
    let pending = false;
    let stopped = false;

    function drain() {
        if (stopped || activeBuild || !pending) return;
        pending = false;
        activeBuild = Promise.resolve().then(build).catch(onError).finally(() => {
            activeBuild = undefined;
            // A change during the build is not lost, but never starts a parallel build.
            if (pending && !timer && !stopped) drain();
        });
    }

    return {
        request() {
            if (stopped) return;
            pending = true;
            clearTimeout(timer);
            timer = setTimeout(() => {
                timer = undefined;
                drain();
            }, debounceMs);
        },
        stop() {
            stopped = true;
            pending = false;
            clearTimeout(timer);
            timer = undefined;
            // Await the current pipeline instead of killing npm without its descendants.
            return activeBuild ?? Promise.resolve();
        },
    };
}

export function runDocumentationBuild(npmCli, {
    spawnProcess = spawn,
    cwd = repositoryRoot,
} = {}) {
    return new Promise((resolveBuild, reject) => {
        // npm_execpath avoids shell quoting and Windows npm.cmd spawning differences.
        const child = spawnProcess(process.execPath, [npmCli, 'run', 'docs'], {
            cwd,
            stdio: 'inherit',
            windowsHide: true,
        });
        child.once('error', reject);
        child.once('close', (code, signal) => {
            if (code === 0) resolveBuild();
            else reject(new Error(`Documentation build failed (${signal ?? `exit ${code}`}).`));
        });
    });
}

export function startDocumentationWatcher({
    npmCli = process.env.npm_execpath,
    spawnProcess = spawn,
    reportError = console.error,
    report = console.log,
} = {}) {
    if (!npmCli) throw new Error('Start this watcher with npm run docs:watch (or docs:dev).');

    const watcherPackage = require.resolve('chokidar-cli/package.json');
    const watcherCli = resolve(dirname(watcherPackage), require(watcherPackage).bin.chokidar);
    const watcher = spawnProcess(process.execPath, [watcherCli, ...documentationPatterns], {
        cwd: repositoryRoot,
        stdio: ['ignore', 'pipe', 'inherit'],
        windowsHide: true,
    });
    const watcherClosed = new Promise((resolveClosed) => watcher.once('close', resolveClosed));
    const lines = createInterface({ input: watcher.stdout });
    let closing;
    const queue = createRebuildQueue(() => {
        report('[docs:watch] Rebuilding documentation.');
        return runDocumentationBuild(npmCli, { spawnProcess });
    }, { onError: (error) => {
        reportError(`[docs:watch] ${error.message}${closing ? '' : ' Waiting for changes.'}`);
    } });

    let finish;
    const done = new Promise((resolveDone) => { finish = resolveDone; });

    function stop(exitCode = 0) {
        if (closing) return closing;
        lines.close();
        closing = Promise.all([queue.stop(), watcherClosed]).then(() => {
            finish(exitCode);
        });
        if (watcher.exitCode === null && watcher.signalCode === null) watcher.kill();
        return closing;
    }

    // Chokidar's documented stdout event stream; no filenames become shell commands.
    lines.on('line', (line) => {
        if (/^(add|addDir|change|unlink|unlinkDir):/.test(line)) queue.request();
    });
    watcher.once('error', (error) => {
        reportError(`[docs:watch] Cannot start file watcher: ${error.message}`);
        void stop(1);
    });
    watcher.once('close', (code, signal) => {
        if (!closing) {
            reportError(`[docs:watch] File watcher stopped unexpectedly (${signal ?? `exit ${code}`}).`);
            void stop(1);
        }
    });

    return { stop, done };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        const watcher = startDocumentationWatcher();
        const stop = () => { void watcher.stop(); };
        process.once('SIGINT', stop);
        process.once('SIGTERM', stop);
        process.exitCode = await watcher.done;
        process.removeListener('SIGINT', stop);
        process.removeListener('SIGTERM', stop);
    } catch (error) {
        console.error(`[docs:watch] ${error.message}`);
        process.exitCode = 1;
    }
}
