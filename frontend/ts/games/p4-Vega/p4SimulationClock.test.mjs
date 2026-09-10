import assert from 'node:assert/strict';
import test from 'node:test';
import { createP4SimulationClock } from './p4SimulationClock.ts';

test('30, 60, 120 and 144Hz rendering produce identical movement over ten seconds', () => {
    for (const fps of [30, 60, 120, 144]) {
        const clock = createP4SimulationClock();
        let ticks = 0, x = 0, y = 0;
        for (let frame = 0; frame < fps * 10; frame++) clock.advance(1000 / fps, () => { ticks++; x += 8; y += 8; });
        assert.equal(ticks, 600, `${fps}Hz steps`);
        assert.equal(x, 4800);
        assert.equal(y, 4800, 'diagonal still advances at full speed on both axes');
    }
});

test('stalls have bounded catch-up and end-of-run stops remaining substeps', () => {
    const clock = createP4SimulationClock();
    let ticks = 0;
    clock.advance(10_000, () => { ticks++; });
    assert.equal(ticks, 6);
    clock.advance(100, () => { ticks++; return false; });
    assert.equal(ticks, 7);
});

test('pause/restart reset discards fractional old-run time', () => {
    const clock = createP4SimulationClock();
    let ticks = 0;
    clock.advance(10, () => { ticks++; });
    clock.reset();
    clock.advance(10, () => { ticks++; });
    assert.equal(ticks, 0);
    clock.advance(7, () => { ticks++; });
    assert.equal(ticks, 1);
    for (const value of [NaN, Infinity, -1]) clock.advance(value, assert.fail);
});
