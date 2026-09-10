import assert from 'node:assert/strict';
import test from 'node:test';
import {
    areP4BoundsColliding,
    chooseP4HazardSpawn,
    constrainP4HazardBounds,
    getP4Hitbox,
    getP4MovementAxis,
    getP4PickupResult,
    P4_HAZARD_EDGE_MARGIN,
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
    assert.deepEqual(spawn, { x: 1804, y: 964 });
    assert.equal(calls, 32);
});

test('an arena too small for the desired clearance still returns a bounded position', () => {
    const spawn = chooseP4HazardSpawn(
        { width: 120, height: 100 }, { width: 80, height: 80 },
        { x: 0, y: 0, width: 80, height: 80 }, () => 0,
    );
    assert.deepEqual(spawn, { x: 24, y: 10 });
});

test('random spawn extremes keep the complete hazard inside the edge margin', () => {
    assert.equal(P4_HAZARD_EDGE_MARGIN, 16);
    for (const [randomX, randomY, x, y] of [
        [0, 0, 16, 16],
        [1, 0, 1804, 16],
        [0, 1, 16, 964],
        [1, 1, 1804, 964],
    ]) {
        const values = [randomX, randomY];
        let calls = 0;
        const spawn = chooseP4HazardSpawn(
            { width: 1920, height: 1080 }, { width: 100, height: 100 },
            { x: 910, y: 490, width: 100, height: 100 }, () => values[calls++],
        );
        assert.deepEqual(spawn, { x, y });
        assert.equal(calls, 2, 'the safe extreme is accepted without falling back');
    }
});

const arena = { width: 1920, height: 1080 };
const constrain = (x, y, vX, vY) => constrainP4HazardBounds(
    arena, { x, y, width: 100, height: 100 }, { x: vX, y: vY },
);

test('an overshoot is clamped at each edge and the moving axis points back inward', () => {
    for (const [input, expected] of [
        [[-30, 500, -4.5, 0], { x: 16, y: 500, vX: 4.5, vY: 0 }],
        [[1810, 500, 2.5, 0], { x: 1804, y: 500, vX: -2.5, vY: 0 }],
        [[800, -20, 0, -1.5], { x: 800, y: 16, vX: 0, vY: 1.5 }],
        [[800, 1005, 0, 4.5], { x: 800, y: 964, vX: 0, vY: -4.5 }],
    ]) {
        assert.deepEqual(constrain(...input), expected);
    }
});

test('a hazard touching an exact edge turns inward without an off-canvas frame', () => {
    assert.deepEqual(constrain(16, 500, -2.5, 0), { x: 16, y: 500, vX: 2.5, vY: 0 });
    assert.deepEqual(constrain(1804, 500, 2.5, 0), { x: 1804, y: 500, vX: -2.5, vY: 0 });
    assert.deepEqual(constrain(800, 16, 0, -2.5), { x: 800, y: 16, vX: 0, vY: 2.5 });
    assert.deepEqual(constrain(800, 964, 0, 2.5), { x: 800, y: 964, vX: 0, vY: -2.5 });
});

test('already inward velocity is preserved instead of repeatedly reversing at an edge', () => {
    for (const [x, y, vX, vY, clampedX, clampedY] of [
        [0, 500, 3.5, 0, 16, 500],
        [1820, 500, -3.5, 0, 1804, 500],
        [800, 0, 0, 3.5, 800, 16],
        [800, 980, 0, -3.5, 800, 964],
    ]) {
        assert.deepEqual(constrain(x, y, vX, vY), { x: clampedX, y: clampedY, vX, vY });
        assert.deepEqual(constrain(clampedX, clampedY, vX, vY), { x: clampedX, y: clampedY, vX, vY });
    }
});

test('a stationary axis outside an edge is corrected without inventing movement', () => {
    assert.deepEqual(constrain(-45, 500, 0, 3.5), { x: 16, y: 500, vX: 0, vY: 3.5 });
    assert.deepEqual(constrain(1820, 500, 0, -3.5), { x: 1804, y: 500, vX: 0, vY: -3.5 });
    assert.deepEqual(constrain(800, -45, 3.5, 0), { x: 800, y: 16, vX: 3.5, vY: 0 });
    assert.deepEqual(constrain(800, 980, -3.5, 0), { x: 800, y: 964, vX: -3.5, vY: 0 });
});

test('an interior hazard retains fractional position and velocity without mutating the bounds', () => {
    const bounds = { x: 500.25, y: 400.75, width: 100, height: 100 };
    const velocity = { x: -2.5, y: 1.5 };
    assert.deepEqual(constrainP4HazardBounds(arena, bounds, velocity), {
        x: 500.25, y: 400.75, vX: -2.5, vY: 1.5,
    });
    assert.deepEqual(bounds, { x: 500.25, y: 400.75, width: 100, height: 100 });
    assert.deepEqual(velocity, { x: -2.5, y: 1.5 });
});

test('boundary correction uses all 90 pixels of rendered artwork, not the reduced collision hitbox', () => {
    assert.deepEqual(constrainP4HazardBounds(
        arena, { x: 1850, y: 990, width: 90, height: 90 }, { x: 4.5, y: 0 },
    ), { x: 1814, y: 974, vX: -4.5, vY: 0 });
});
