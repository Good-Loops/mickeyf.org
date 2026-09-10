import assert from 'node:assert/strict';
import test from 'node:test';
import { bindP4RestartTap } from './p4RestartTap.ts';

const createFixture = () => {
    const listeners = new Map();
    let gameOver = true;
    let restarts = 0;
    const canvas = {
        addEventListener: (name, handler, options) => {
            assert.equal(options.passive, true);
            listeners.set(name, handler);
        },
        removeEventListener: (name, handler) => {
            assert.equal(listeners.get(name), handler);
            listeners.delete(name);
        },
    };
    const dispose = bindP4RestartTap(canvas, () => gameOver, () => { restarts++; });
    return {
        dispose,
        listeners,
        get restarts() { return restarts; },
        setGameOver: (value) => { gameOver = value; },
        emit: (name, overrides = {}) => listeners.get(name)?.({
            pointerId: 1, isPrimary: true, button: 0,
            clientX: 100, clientY: 100, pointerType: 'touch',
            ...overrides,
        }),
    };
};

test('touch and primary mouse taps restart once despite small finger movement', () => {
    for (const pointerType of ['touch', 'mouse']) {
        const fixture = createFixture();
        fixture.emit('pointerdown', { pointerType });
        fixture.emit('pointermove', { pointerType, clientX: 105 });
        fixture.emit('pointerup', { pointerType, clientX: 105 });
        fixture.emit('pointerup', { pointerType });
        assert.equal(fixture.restarts, 1);
    }
});

test('dragging away and back cannot become a restart tap', () => {
    const fixture = createFixture();
    fixture.emit('pointerdown');
    fixture.emit('pointermove', { clientY: 130 });
    fixture.emit('pointermove');
    fixture.emit('pointerup');
    assert.equal(fixture.restarts, 0);
});

test('release distance rejects a drag even without a pointermove event', () => {
    const fixture = createFixture();
    fixture.emit('pointerdown');
    fixture.emit('pointerup', { clientY: 130 });
    assert.equal(fixture.restarts, 0);
});

test('browser scroll cancellation and leaving the canvas discard the tap', () => {
    for (const event of ['pointercancel', 'pointerleave']) {
        const fixture = createFixture();
        fixture.emit('pointerdown');
        fixture.emit(event);
        fixture.emit('pointerup');
        assert.equal(fixture.restarts, 0);
    }
});

test('right click and a second touch cannot restart the game', () => {
    const fixture = createFixture();
    fixture.emit('pointerdown', { button: 2 });
    fixture.emit('pointerup', { button: 2 });
    fixture.emit('pointerdown');
    fixture.emit('pointerdown', { pointerId: 2, isPrimary: false });
    fixture.emit('pointerup');
    assert.equal(fixture.restarts, 0);
});

test('restart requires game-over at both the beginning and end of a tap', () => {
    const fixture = createFixture();
    fixture.setGameOver(false);
    fixture.emit('pointerdown');
    fixture.setGameOver(true);
    fixture.emit('pointerup');
    fixture.emit('pointerdown');
    fixture.setGameOver(false);
    fixture.emit('pointerup');
    assert.equal(fixture.restarts, 0);
});

test('a release without a matching canvas press cannot restart', () => {
    const fixture = createFixture();
    fixture.emit('pointerup');
    fixture.emit('pointerdown');
    fixture.emit('pointerup', { pointerId: 2 });
    assert.equal(fixture.restarts, 0);
});

test('disposal removes all gesture listeners and pending taps', () => {
    const fixture = createFixture();
    fixture.emit('pointerdown');
    fixture.dispose();
    fixture.emit('pointerup');
    assert.equal(fixture.listeners.size, 0);
    assert.equal(fixture.restarts, 0);
});
