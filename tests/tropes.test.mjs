import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const sandbox = {};
runInNewContext(readFileSync(new URL('../public/app.js', import.meta.url), 'utf8'), sandbox);
const { MeatBlock: engine } = sandbox;
const best = [3, 0, 2, 1, 2];

test('five distinct verbal tropes replace the original challenges', () => {
  assert.deepEqual(Array.from(engine.challenges, q => q.id), [
    'performative-accountability', 'system-goblins', 'why-that-matters',
    'grand-reframe', 'framework-compulsion'
  ]);
  const phrases = ["You're right. And that's on me.", 'goblin', "Here's why that matters:",
    "You didn't just clean your desk.", 'clear, actionable framework'];
  engine.challenges.forEach((q, i) => {
    assert.ok(q.options[best[i]].label.includes(phrases[i]));
    assert.equal(q.options[best[i]].points, 20);
    assert.ok(q.options.every(o => o.feedback.trim().length > 0));
    assert.notEqual(q.grid, true);
  });
});

test('question copy changes preserve every existing answer weight', () => {
  const expected = [[6, 0, 3, 20], [20, 0, 10, 2], [6, 0, 20, 10],
    [0, 20, 4, 12], [0, 8, 20, 4]];
  engine.challenges.forEach((q, i) => {
    assert.deepEqual(Array.from(q.options, o => o.points), expected[i]);
  });
});

test('report labels and responses refer to the new trope questions', () => {
  const report = engine.createReport(best);
  assert.deepEqual(Array.from(report.metrics, m => m.label), [
    'Goblin attribution', 'Dramatic reframing', 'Framework dependency'
  ]);
  report.checks.forEach((item, i) => {
    assert.equal(item.id, engine.challenges[i].id);
    assert.equal(item.response, engine.challenges[i].options[best[i]].label);
  });
  assert.ok(report.metrics.every(m => m.value === 100));
});

test('compact CAPTCHA and requested captions remain without marketing sections', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(html, /id="checkbox-widget"/);
  assert.match(html, /id="challenge-dialog"/);
  assert.match(html, /Human exclusion services/);
  assert.match(html, /Established 2026\. Unsupervised ever since\./);
  assert.doesNotMatch(html, /<nav\b|class="hero"|id="plans"|id="event-log"|class="access-panel"/);
});
