const EXACT_RULES = {
  floor: [/\bmin\s*\(/, 'Use min(nums). This rep is specifically for recalling min().'],
  largest: [/\bmax\s*\(/, 'Use max(nums). This rep is specifically for recalling max().'],
  total: [/\bsum\s*\(/, 'Use sum(nums), rather than writing an accumulator loop.'],
  mirror: [/\[\s*::\s*-1\s*\]/, 'Use a reverse slice: text[::-1]. Avoid reversed() for this rep.'],
  'last-item': [/\[\s*-1\s*\]/, 'Use negative indexing: items[-1]. Avoid len(items) for this rep.'],
  evens: [/\bsum\s*\([^)]*for\b/, 'Use sum with a generator expression that produces booleans.'],
  clamp: [/(?=.*\bmin\s*\()(?=.*\bmax\s*\()/s, 'Compose min() and max() without an if statement.'],
  dedupe: [/dict\.fromkeys\s*\(/, 'Use dict.fromkeys(items) to preserve first-seen order.'],
  squares: [/\[[\s\S]*\bfor\b[\s\S]*\bin\b[\s\S]*\]/, 'Use a list comprehension, not map() or a loop.'],
  positives: [/\[[\s\S]*\bfor\b[\s\S]*\bif\b[\s\S]*\]/, 'Use a filtering list comprehension with a trailing if.'],
  'all-positive': [/\ball\s*\(/, 'Use all() with a generator expression.'],
  'vowel-count': [/(?=.*\bsum\s*\()(?=.*\bin\b)/s, 'Use membership testing inside a generator passed to sum().'],
  'pair-up': [/\bzip\s*\(/, 'Use zip() to traverse both lists together.'],
  anagram: [/\bsorted\s*\(/, 'Create a canonical form by sorting both strings.'],
  majority: [/\bmax\s*\(/, 'Use max() with a frequency-based key.'],
  'has-duplicate': [/\bset\s*\(/, 'Use set() to collapse duplicate values.'],
  intersection: [/(?=.*\bset\s*\()(?=.*&)/s, 'Use the set intersection operator (&).'],
  'palindrome-number': [/\[\s*::\s*-1\s*\]/, 'Convert to text and practice a reverse slice.'],
  'running-sum': [/accumulate\s*\(/, 'Use itertools.accumulate() for this fluency rep.'],
};

const PATTERN_CUES = [
  ['Two Pointers', 'Maintain two indices and move them using the ordering invariant.'],
  ['Hash Maps', 'Use hashed state so each lookup or count is constant-time on average.'],
  ['Stacks', 'Use a stack to preserve the most recent unresolved item.'],
  ['Binary Search', 'Define a monotonic condition, then discard half the search space.'],
  ['Sliding Window', 'Maintain only the current contiguous window as its edges move.'],
  ['Prefix Sums', 'Reuse cumulative totals instead of recomputing ranges.'],
  ['Dynamic Programming', 'Name the smaller state, then build each answer from solved states.'],
  ['Graphs & Grids', 'Track visited state and traverse each reachable neighbor once.'],
  ['Intervals & Greedy', 'Sort first, then make the locally safe decision.'],
  ['Heaps', 'Keep only the priority frontier needed for the next decision.'],
  ['Backtracking', 'Choose, recurse, then undo before exploring the next choice.'],
  ['Trees', 'Write the base case first, then solve the same task on each child.'],
];

export function techniqueFor(drop) {
  const exact = EXACT_RULES[drop.id];
  if (exact) return { enforced: true, pattern: exact[0], cue: exact[1] };
  const trackCue = PATTERN_CUES.find(([track]) => track === drop.track)?.[1];
  return { enforced: false, cue: trackCue || `Practice ${drop.concept} as the primary move.` };
}
