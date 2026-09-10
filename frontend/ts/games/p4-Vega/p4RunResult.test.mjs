import assert from 'node:assert/strict';
import test from 'node:test';
import { createP4RunResults } from './p4RunResult.ts';

const deferred = () => {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
};

test('signed-out victory appears immediately without making a score request', async () => {
    const changes = [];
    const results = createP4RunResults({ submit: assert.fail, onChange: value => changes.push(value) });
    await results.finish('completed', 1000, false);
    assert.deepEqual(changes.at(-1), { outcome: 'completed', score: 1000, submission: 'signed-out', personalBest: false });
});

test('slow submissions never block restart or replace a newer run result', async () => {
    const pending = deferred();
    const changes = [];
    let signal;
    const results = createP4RunResults({ submit: (_score, s) => { signal = s; return pending.promise; }, onChange: value => changes.push(value) });
    const finishing = results.finish('defeat', 100, true);
    assert.equal(changes.at(-1).submission, 'submitting');
    results.reset();
    assert.equal(signal.aborted, true);
    assert.equal(changes.at(-1), null);
    await results.finish('defeat', 10, false);
    pending.resolve({ personalBest: true });
    await finishing;
    assert.equal(changes.at(-1).score, 10);
    assert.equal(changes.at(-1).personalBest, false);
});

test('failure is visible and retry submits the same score only once', async () => {
    const changes = [], scores = [];
    const pending = deferred();
    const results = createP4RunResults({
        submit: async score => { scores.push(score); if (scores.length === 1) throw Error('offline'); return pending.promise; },
        onChange: value => changes.push(value),
    });
    await results.finish('completed', 1000, true);
    assert.equal(changes.at(-1).submission, 'failed');
    const retry = results.retry();
    await results.retry();
    pending.resolve({ personalBest: true });
    await retry;
    assert.deepEqual(scores, [1000, 1000]);
    assert.equal(changes.at(-1).submission, 'submitted');
    assert.equal(changes.at(-1).personalBest, true);
});

test('request timeout exposes retry instead of leaving results submitting forever', async () => {
    let current;
    const results = createP4RunResults({
        timeoutMs: 5,
        submit: (_score, signal) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(Error('aborted')), { once: true })),
        onChange: value => { current = value; },
    });
    await results.finish('defeat', 90, true);
    assert.equal(current.submission, 'failed');
});

test('disposal aborts a pending request and prevents late UI updates', async () => {
    const pending = deferred();
    const changes = [];
    let signal;
    const results = createP4RunResults({ submit: (_score, s) => { signal = s; return pending.promise; }, onChange: value => changes.push(value) });
    const finishing = results.finish('defeat', 50, true);
    results.dispose();
    const count = changes.length;
    assert.equal(signal.aborted, true);
    pending.reject(Error('late failure'));
    await finishing;
    assert.equal(changes.length, count);
});
