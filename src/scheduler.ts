import type { ReviewMap, ReviewRecord } from './types';

interface SchedulableDrop { id: string }

export const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60];

export function chooseStartingIndex(drops: SchedulableDrop[], solved: Set<string>, reviews: ReviewMap, now = Date.now()): number {
  const due = drops.findIndex((drop) => solved.has(drop.id) && (reviews[drop.id]?.dueAt ?? Infinity) <= now);
  if (due >= 0) return due;
  const fresh = drops.findIndex((drop) => !solved.has(drop.id));
  return fresh >= 0 ? fresh : 0;
}

export function chooseNextIndex(drops: SchedulableDrop[], current: number, solved: Set<string>, reviews: ReviewMap, now = Date.now()): number {
  // Never return the current card during the same transition. This matters when
  // its previous review record is stale or it was answered after an earlier miss.
  for (let offset = 1; offset < drops.length; offset += 1) {
    const candidate = (current + offset) % drops.length;
    const drop = drops[candidate];
    if (solved.has(drop.id) && (reviews[drop.id]?.dueAt ?? Infinity) <= now) return candidate;
  }
  for (let offset = 1; offset < drops.length; offset += 1) {
    const candidate = (current + offset) % drops.length;
    if (!solved.has(drops[candidate].id)) return candidate;
  }
  return (current + 1) % drops.length;
}

export function nextReview(previous: ReviewRecord = {}, misses = 0, now = Date.now()): ReviewRecord {
  const repetitions = Math.min((previous.repetitions || 0) + 1, REVIEW_INTERVALS.length);
  const intervalDays = misses === 0 ? REVIEW_INTERVALS[repetitions - 1] : 1;
  return {
    repetitions,
    attempts: (previous.attempts || 0) + 1,
    intervalDays,
    dueAt: now + intervalDays * 86_400_000,
    lastScore: misses === 0 ? 'clean' : 'learned',
  };
}
