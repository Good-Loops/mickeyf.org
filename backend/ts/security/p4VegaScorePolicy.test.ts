import assert from 'node:assert/strict';
import test from 'node:test';
import {
    isValidP4VegaScore,
    P4_VEGA_MAX_SCORE,
} from './p4VegaScorePolicy';

test('accepts the complete boundary of legitimate p4-Vega scores', () => {
    for (let score = 0; score <= 990; score += 10) {
        assert.equal(isValidP4VegaScore(score), true, `legacy score rejected: ${score}`);
    }
    assert.equal(P4_VEGA_MAX_SCORE, 1000);
    assert.equal(isValidP4VegaScore(1000), true);
    assert.equal(isValidP4VegaScore(P4_VEGA_MAX_SCORE), true);
});

test('rejects values that current gameplay cannot produce', () => {
    for (const value of [-10, 1, 11, 991, 995, 1001, 1010, 1.5, NaN, Infinity, '10', null]) {
        assert.equal(isValidP4VegaScore(value), false, `unexpected valid score: ${String(value)}`);
    }
});
