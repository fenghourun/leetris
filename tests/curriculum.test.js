import test from 'node:test';
import assert from 'node:assert/strict';
import { CURRICULUM, TRACKS } from '../src/curriculum.js';
import { BRIDGE_DRILLS } from '../src/bridgeDrills.js';
import { SOLUTIONS } from '../src/solutions.js';
import { techniqueFor, referenceFor } from '../src/pedagogy.js';

const drills = [...CURRICULUM, ...BRIDGE_DRILLS];

test('curriculum entries are unique, complete, and assigned to known tracks', () => {
  assert.equal(new Set(drills.map((drop) => drop.id)).size, drills.length);
  for (const drop of drills) {
    assert.ok(TRACKS.some((track) => track.name === drop.track), `${drop.id}: unknown track`);
    assert.ok(drop.concept && drop.description && drop.insight, `${drop.id}: missing teaching copy`);
    assert.equal(drop.tests.length, 3, `${drop.id}: expected three tests`);
    assert.ok(drop.mode === 'code' ? SOLUTIONS[drop.id] : drop.answer, `${drop.id}: missing solution`);
  }
});

test('every drill has an actionable technique and reference', () => {
  for (const drop of drills) {
    assert.ok(techniqueFor(drop).cue, `${drop.id}: missing technique cue`);
    const reference = referenceFor(drop);
    assert.ok(reference.signature && reference.note, `${drop.id}: missing reference`);
  }
});

test('canonical expression answers satisfy enforced technique rules', () => {
  for (const drop of drills.filter((item) => item.mode !== 'code')) {
    const technique = techniqueFor(drop);
    if (technique.enforced) assert.match(drop.answer, technique.pattern, `${drop.id}: canonical answer violates its technique`);
  }
});
