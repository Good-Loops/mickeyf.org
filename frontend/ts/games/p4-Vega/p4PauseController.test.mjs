import assert from 'node:assert/strict';
import test from 'node:test';
import { createP4PauseController } from './p4PauseController.ts';
import { finishP4GameOver } from './p4GameOverFlow.ts';

const deferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
};

const fixture = () => {
    const animation = (playing) => ({
        playing, frame: 7.25,
        stop() { this.playing = false; },
        play() { this.playing = true; },
    });
    const sprites = [animation(true), animation(true), animation(false)];
    const ticker = {
        running: false, starts: 0,
        start() { this.running = true; this.starts++; },
        stop() { this.running = false; },
    };
    const audio = {
        position: 31.5, suspended: false, muted: false,
        suspend: async () => { audio.suspended = true; },
        resume: async () => { audio.suspended = false; },
        setMuted: (value) => { audio.muted = value; },
    };
    const run = { score: 140, x: 120, frames: 52, held: true };
    const states = [];
    const errors = [];
    const controller = createP4PauseController({
        ticker, audio, animations: () => sprites,
        clearInput: () => { run.held = false; },
        onStateChange: (state) => states.push(state),
        onAudioError: (error) => errors.push(error),
    });
    const advance = () => {
        if (ticker.running) { run.frames++; if (run.held) run.x++; }
        sprites.forEach((sprite) => { if (sprite.playing) sprite.frame += .1; });
        if (!audio.suspended) audio.position += .5;
    };
    return { controller, ticker, sprites, audio, run, states, errors, advance };
};

test('pause freezes the existing run, sprite progress and audio position; resume preserves stopped sprites', async () => {
    const f = fixture();
    f.controller.completeLoad();
    await f.controller.pause();
    const frozen = structuredClone({ run: f.run, frames: f.sprites.map((sprite) => sprite.frame), music: f.audio.position });
    for (let i = 0; i < 20; i++) f.advance();
    assert.deepEqual({ run: f.run, frames: f.sprites.map((sprite) => sprite.frame), music: f.audio.position }, frozen);
    assert.equal(f.audio.muted, true);
    assert.equal(f.controller.canMove, false);
    await f.controller.resume();
    assert.equal(f.run.score, 140);
    assert.equal(f.audio.position, 31.5);
    assert.deepEqual(f.sprites.map((sprite) => sprite.playing), [true, true, false]);
    assert.equal(f.run.held, false);
    assert.equal(f.audio.muted, false);
    f.advance();
    assert.equal(f.run.frames, 53);
    assert.equal(f.run.x, 120);
    assert.deepEqual(f.states, ['running', 'paused', 'running']);
});

test('loading and unfinished game-over reject pause, resume and restart', async () => {
    const f = fixture();
    await f.controller.pause();
    await f.controller.resume();
    assert.equal(f.controller.beginRestart(), false);
    assert.equal(f.ticker.starts, 0);
    f.controller.completeLoad();
    f.controller.endRun();
    await f.controller.pause();
    await f.controller.resume();
    assert.equal(f.controller.state, 'game-over');
    assert.equal(f.controller.beginRestart(), false);
    f.controller.finishGameOver();
    assert.equal(f.controller.canRestart, true);
    assert.equal(f.controller.beginRestart(), true);
    assert.equal(f.controller.beginRestart(), false);
    assert.equal(f.controller.canRestart, false);
    f.controller.completeLoad();
    assert.equal(f.controller.state, 'running');
});

test('an unresolved score request does not prevent the game-over screen or a new run', async () => {
    const f = fixture();
    const request = deferred();
    let submissionFinished = false;
    let overlayShown = false;
    f.controller.completeLoad();
    f.controller.endRun();
    await finishP4GameOver({
        submitScore: async () => { await request.promise; submissionFinished = true; },
        showOverlay: async () => { overlayShown = true; },
        onReady: () => f.controller.finishGameOver(),
        onScoreError: assert.fail,
        onDisplayError: assert.fail,
    });
    assert.equal(overlayShown, true);
    assert.equal(submissionFinished, false);
    assert.equal(f.controller.beginRestart(), true);
    f.controller.completeLoad();
    assert.equal(f.controller.state, 'running');
    request.resolve();
    await request.promise;
    assert.equal(submissionFinished, true);
});

test('a late failed score request reports the error without blocking the finished overlay', async () => {
    const request = deferred();
    const errors = [];
    let ready = false;
    await finishP4GameOver({
        submitScore: () => request.promise,
        showOverlay: async () => {},
        onReady: () => { ready = true; },
        onScoreError: (error) => errors.push(error),
        onDisplayError: assert.fail,
    });
    assert.equal(ready, true);
    const error = new Error('score request failed');
    request.reject(error);
    await request.promise.catch(() => {});
    assert.deepEqual(errors, [error]);
});

test('duplicate pause and resume calls do not duplicate ticker starts', async () => {
    const f = fixture();
    f.controller.completeLoad();
    await Promise.all([f.controller.pause(), f.controller.pause()]);
    await Promise.all([f.controller.resume(), f.controller.resume()]);
    assert.equal(f.ticker.starts, 2);
    assert.deepEqual(f.states, ['running', 'paused', 'running']);
});

test('a pending resume cannot revive a disposed session', async () => {
    const f = fixture();
    const pending = deferred();
    f.controller.completeLoad();
    await f.controller.pause();
    f.audio.resume = () => pending.promise;
    const resuming = f.controller.resume();
    f.controller.dispose();
    pending.resolve();
    await resuming;
    assert.equal(f.controller.disposed, true);
    assert.equal(f.ticker.running, false);
    assert.equal(f.audio.muted, true);
    assert.equal(f.controller.canMove, false);
    f.controller.completeLoad();
    assert.equal(f.ticker.starts, 1);
});

test('a new pause cancels an in-flight resume without losing the animation snapshot', async () => {
    const f = fixture();
    const pending = deferred();
    f.controller.completeLoad();
    await f.controller.pause();
    f.audio.resume = () => pending.promise;
    const resuming = f.controller.resume();
    await f.controller.pause();
    pending.resolve();
    await resuming;
    assert.equal(f.controller.state, 'paused');
    assert.equal(f.ticker.running, false);
    f.audio.resume = async () => {};
    await f.controller.resume();
    assert.deepEqual(f.sprites.map((sprite) => sprite.playing), [true, true, false]);
});

test('audio failures keep gameplay paused and silent; a later resume can retry', async () => {
    const f = fixture();
    f.controller.completeLoad();
    f.audio.suspend = async () => { throw new Error('suspend failed'); };
    await f.controller.pause();
    f.audio.resume = async () => { throw new Error('resume failed'); };
    await f.controller.resume();
    assert.equal(f.controller.state, 'paused');
    assert.equal(f.audio.muted, true);
    assert.equal(f.ticker.running, false);
    assert.equal(f.errors.length, 2);
    f.audio.resume = async () => {};
    await f.controller.resume();
    assert.equal(f.controller.state, 'running');
});
