import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameplayNotePlayback } from './gameplayNotePlayback.ts';

const fixture = () => {
    const calls = [];
    const errors = [];
    let clock = 10;
    let throwOnPlayback = false;
    const synth = {
        sampleTime: 1 / 48_000,
        now: () => clock,
        triggerAttackRelease(note, duration, time) {
            calls.push({ note, duration, time });
            if (throwOnPlayback) throw new Error('Audio unavailable');
        },
    };
    return {
        play: createGameplayNotePlayback(synth, (error) => errors.push(error)),
        calls, errors, synth,
        setClock: (value) => { clock = value; },
        setFailure: (value) => { throwOnPlayback = value; },
    };
};

test('catch-up pickups with the same audio-clock time use strictly increasing sample times', () => {
    const f = fixture();
    for (let index = 0; index < 6; index++) f.play(() => 220 + index);
    assert.equal(f.calls.length, 6);
    assert.equal(f.calls[0].time, 10);
    for (let index = 1; index < f.calls.length; index++) {
        assert.ok(f.calls[index].time > f.calls[index - 1].time + 1e-6,
            'Tone requires start times to differ by more than its 1e-6 comparison tolerance');
        assert.equal(f.calls[index].time, f.calls[index - 1].time + f.synth.sampleTime);
    }
    assert.deepEqual(f.calls.map(({ note }) => note), [220, 221, 222, 223, 224, 225]);
    assert.ok(f.calls.every(({ duration }) => duration === .8));
    assert.equal(f.errors.length, 0);
});

test('normally spaced pickups keep using the current audio clock without extra delay', () => {
    const f = fixture();
    f.play(() => 220);
    f.setClock(12);
    f.play(() => 440);
    assert.equal(f.calls[1].time, 12);
});

test('audio errors do not escape or spam warnings, and a later pickup can recover', () => {
    const f = fixture();
    f.setFailure(true);
    assert.doesNotThrow(() => { f.play(() => 220); f.play(() => 330); });
    assert.equal(f.errors.length, 1);
    f.setFailure(false);
    f.play(() => 440);
    assert.equal(f.calls.length, 3);
    assert.equal(f.calls[2].note, 440);
    assert.ok(f.calls[2].time > f.calls[1].time);
});

test('a note-selection error cannot stop gameplay or prevent the next valid pickup', () => {
    const f = fixture();
    assert.doesNotThrow(() => f.play(() => { throw new Error('Invalid note selection'); }));
    assert.equal(f.calls.length, 0);
    assert.equal(f.errors.length, 1);
    f.play(() => 220);
    assert.equal(f.calls[0].time, 10);
});
