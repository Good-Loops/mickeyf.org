import assert from 'node:assert/strict';
import test from 'node:test';
import {
    areP4BoundsColliding,
    chooseP4HazardSpawn,
    getP4Hitbox,
    getP4MovementAxis,
    getP4PickupResult,
    P4_PICKUP_POINTS,
    P4_WIN_SCORE,
} from './p4Rules.ts';

test('the 80% collision rectangle has equal margins on every side', () => {
    assert.deepEqual(getP4Hitbox({ x: 100, y: 200, width: 100, height: 60 }), {
        x: 110, y: 206, width: 80, height: 48,
    });
});

test('collision edges are symmetric and merely touching does not count', () => {
    const player = { x: 100, y: 100, width: 100, height: 100 };
    for (const point of [{ x: 20, y: 100 }, { x: 180, y: 100 }, { x: 100, y: 20 }, { x: 100, y: 180 }]) {
        const hazard = { ...point, width: 100, height: 100 };
        assert.equal(areP4BoundsColliding(player, hazard), false);
        assert.equal(areP4BoundsColliding(hazard, player), false);
    }
    for (const point of [{ x: 21, y: 100 }, { x: 179, y: 100 }, { x: 100, y: 21 }, { x: 100, y: 179 }]) {
        assert.equal(areP4BoundsColliding(player, { ...point, width: 100, height: 100 }), true);
    }
});

test('analog movement is proportional while keyboard takes priority per axis', () => {
    assert.equal(getP4MovementAxis(false, false, .25), .25);
    assert.equal(getP4MovementAxis(false, false, -.6), -.6);
    assert.equal(getP4MovementAxis(true, false, -.6), 1);
    assert.equal(getP4MovementAxis(false, true, .6), -1);
    assert.equal(getP4MovementAxis(true, true, .6), 0);
    assert.equal(getP4MovementAxis(false, false, 2), 1);
    assert.equal(getP4MovementAxis(false, false, NaN), 0);
});

test('full diagonal input deliberately retains the square-root-of-two speed advantage', () => {
    const axis = getP4MovementAxis(false, false, 1);
    assert.equal(Math.hypot(axis, axis), Math.SQRT2);
});

test('100 pickups reach exactly 1000, with 99 added hazards and none on the final pickup', () => {
    let score = 0;
    let addedHazards = 0;
    for (let pickup = 1; pickup <= 100; pickup++) {
        const result = getP4PickupResult(score);
        assert.ok(result);
        assert.equal(result.score, pickup * P4_PICKUP_POINTS);
        assert.equal(result.completed, pickup === 100);
        if (!result.completed) addedHazards++;
        score = result.score;
    }
    assert.equal(score, P4_WIN_SCORE);
    assert.equal(addedHazards + 1, 100, 'initial hazard plus pickup spawns fits the animation pool');
    assert.equal(getP4PickupResult(score), null, 'completed runs cannot keep scoring');
});

test('hazard spawning immediately accepts a position with sufficient player clearance', () => {
    let calls = 0;
    const spawn = chooseP4HazardSpawn(
        { width: 1920, height: 1080 }, { width: 100, height: 100 },
        { x: 0, y: 0, width: 100, height: 100 }, () => { calls++; return .5; },
    );
    assert.deepEqual(spawn, { x: 910, y: 490 });
    assert.equal(calls, 2);
});

test('repeated unsafe spawn candidates terminate at the farthest valid corner', () => {
    let calls = 0;
    const spawn = chooseP4HazardSpawn(
        { width: 1920, height: 1080 }, { width: 100, height: 100 },
        { x: 0, y: 0, width: 100, height: 100 }, () => { calls++; return 0; },
    );
    assert.deepEqual(spawn, { x: 1820, y: 980 });
    assert.equal(calls, 32);
});

test('an arena too small for the desired clearance still returns a bounded position', () => {
    const spawn = chooseP4HazardSpawn(
        { width: 120, height: 100 }, { width: 80, height: 80 },
        { x: 0, y: 0, width: 80, height: 80 }, () => 0,
    );
    assert.deepEqual(spawn, { x: 40, y: 20 });
});
