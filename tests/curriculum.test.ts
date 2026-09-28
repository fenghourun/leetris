import test from 'node:test';
import assert from 'node:assert/strict';
import { CURRICULUM, TRACKS } from '../src/curriculum.ts';
import { BRIDGE_DRILLS } from '../src/bridgeDrills.ts';
import { CHUNK_DRILLS } from '../src/chunkDrills.ts';
import { SOLUTIONS } from '../src/solutions.ts';
import { techniqueFor, referenceFor } from '../src/pedagogy.ts';

const drills = [...CHUNK_DRILLS, ...CURRICULUM, ...BRIDGE_DRILLS];

test('curriculum entries are unique, complete, and assigned to known tracks', () => {
  assert.ok(drills.length >= 80, 'the practice bank should support sustained sessions');
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

test('chunk drills explicitly label their isolated learning step', () => {
  for (const drop of CHUNK_DRILLS) {
    assert.match(drop.chunk, /^CHUNK \d+ · /, `${drop.id}: missing chunk label`);
    assert.ok(drop.level <= 3, `${drop.id}: chunk should precede the composed pattern`);
  }
});

test('canonical expression answers satisfy enforced technique rules', () => {
  for (const drop of drills.filter((item) => item.mode !== 'code')) {
    const technique = techniqueFor(drop);
    if (technique.enforced && technique.pattern) assert.match(drop.answer!, technique.pattern, `${drop.id}: canonical answer violates its technique`);
  }
});
