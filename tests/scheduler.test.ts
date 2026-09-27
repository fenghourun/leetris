import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseNextIndex, chooseStartingIndex, nextReview } from '../src/scheduler.ts';

const drops = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

test('a newly completed current problem cannot immediately select itself', () => {
  const solved = new Set(['a']);
  const staleReviews = { a: { dueAt: 0 } };
  assert.equal(chooseNextIndex(drops, 0, solved, staleReviews, 100), 1);
});

test('a due completed review is preferred over a new problem', () => {
  const solved = new Set(['a', 'b']);
  const reviews = { b: { dueAt: 50 } };
  assert.equal(chooseNextIndex(drops, 0, solved, reviews, 100), 1);
});

test('startup resumes the first unsolved problem when no review is due', () => {
  assert.equal(chooseStartingIndex(drops, new Set(['a']), { a: { dueAt: 200 } }, 100), 1);
});

test('perfect recalls expand intervals while corrected answers return tomorrow', () => {
  assert.equal(nextReview({}, 0, 0).intervalDays, 1);
  assert.equal(nextReview({ repetitions: 1, attempts: 1 }, 0, 0).intervalDays, 3);
  assert.equal(nextReview({ repetitions: 4, attempts: 4 }, 2, 0).intervalDays, 1);
});
