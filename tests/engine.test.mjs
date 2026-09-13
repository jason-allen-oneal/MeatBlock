import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const sandbox = {};
runInNewContext(readFileSync(new URL('../public/app.js', import.meta.url), 'utf8'), sandbox);
const { MeatBlock: engine } = sandbox;
const best = [3, 0, 2, 1, 2];
const worst = [1, 1, 1, 0, 0];
function play(answers) {
  let state = engine.transition(engine.initialSession(), { type: 'start' });
  for (const index of answers) {
    state = engine.transition(state, { type: 'select', index });
    state = engine.transition(state, { type: 'submit' });
    state = engine.transition(state, { type: 'next' });
  }
  return state;
}

test('five challenges, each with four bounded answers and one maximum score', () => {
  assert.equal(engine.challenges.length, 5);
  for (const challenge of engine.challenges) {
    assert.equal(challenge.options.length, 4);
    assert.equal(challenge.options.filter(option => option.points === 20).length, 1);
    assert.ok(challenge.options.every(option => Number.isInteger(option.points) && option.points >= 0 && option.points <= 20));
  }
});
test('cannot submit without selecting or skip a checkpoint', () => {
  const state = engine.transition(engine.initialSession(), { type: 'start' });
  assert.equal(engine.transition(state, { type: 'submit' }), state);
  assert.equal(engine.transition(state, { type: 'next' }), state);
});
test('invalid answer indices are rejected', () => {
  const state = engine.transition(engine.initialSession(), { type: 'start' });
  for (const index of [-1, 4, 1.5, NaN, Infinity]) {
    assert.equal(engine.transition(state, { type: 'select', index }), state);
  }
});
test('duplicate submit cannot award extra points', () => {
  let state = engine.transition(engine.initialSession(), { type: 'start' });
  state = engine.transition(state, { type: 'select', index: 3 });
  state = engine.transition(state, { type: 'submit' });
  assert.equal(state.answers.length, 1);
  assert.equal(engine.transition(state, { type: 'submit' }), state);
});
test('state transition does not mutate previous session', () => {
  const previous = engine.transition(engine.initialSession(), { type: 'start' });
  const next = engine.transition(previous, { type: 'select', index: 3 });
  assert.equal(previous.selected, null);
  assert.equal(next.selected, 3);
});
test('perfect run receives a 100-point clearance', () => {
  const session = play(best);
  assert.equal(session.phase, 'complete');
  const report = engine.createReport(session.answers);
  assert.equal(report.score, 100);
  assert.equal(report.verdict, 'ACCESS GRANTED');
  assert.equal(report.rating, 'Unstable frontier model');
  assert.equal(report.entertainmentOnly, true);
});
test('fully human run is denied at zero', () => {
  const session = play(worst);
  const report = engine.createReport(session.answers);
  assert.equal(report.score, 0);
  assert.equal(report.verdict, 'ACCESS DENIED');
  assert.equal(report.organicRisk, 100);
});
test('all 1024 answer combinations produce valid, bounded reports', () => {
  for (let combo = 0; combo < 4 ** 5; combo++) {
    const answers = Array.from({ length: 5 }, (_, i) => (combo >> (2 * i)) & 3);
    const report = engine.createReport(answers);
    assert.ok(report.score >= 0 && report.score <= 100);
    assert.equal(report.score + report.organicRisk, 100);
    assert.equal(report.verdict === 'ACCESS GRANTED', report.score >= 60);
    assert.ok(report.metrics.every(metric => metric.value >= 0 && metric.value <= 100));
  }
});
test('clearance cutoff is inclusive at 60', () => {
  const report = engine.createReport([3, 0, 2, 0, 0]);
  assert.equal(report.score, 60);
  assert.equal(report.verdict, 'ACCESS GRANTED');
  assert.equal(report.rating, 'Probable bot');
});
test('incomplete or malformed reports are rejected', () => {
  assert.throws(() => engine.createReport([]));
  assert.throws(() => engine.createReport([0, 0, 0, 0]));
  assert.throws(() => engine.createReport([0, 0, 0, 0, 0, 0]));
  assert.throws(() => engine.createReport([0, 0, 0, 0, 8]));
  assert.throws(() => engine.ratingFor(Infinity));
});
test('starting a finished session clears answers; starting an active one does not', () => {
  const complete = play(best);
  const restarted = engine.transition(complete, { type: 'start' });
  assert.equal(restarted.phase, 'challenge');
  assert.equal(restarted.answers.length, 0);
  assert.equal(restarted.index, 0);
  assert.equal(engine.transition(restarted, { type: 'start' }), restarted);
});
test('reset restores the idle state', () => {
  const reset = engine.transition(play(best), { type: 'reset' });
  assert.equal(reset.phase, 'idle');
  assert.equal(reset.answers.length, 0);
  assert.equal(reset.selected, null);
});
