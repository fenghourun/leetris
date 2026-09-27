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

const REFERENCES = {
  floor: ['min(iterable)', 'Returns the smallest item.', 'min([8, 3, 5])  # 3'],
  largest: ['max(iterable)', 'Returns the largest item.', 'max([4, 9, 2])  # 9'],
  total: ['sum(iterable, start=0)', 'Adds items from left to right.', 'sum([4, 2, 7])  # 13'],
  mirror: ['sequence[start:stop:step]', 'A step of -1 traverses a sequence backward.', 'text[::-1]'],
  'last-item': ['sequence[-1]', 'Negative indices count backward from the end.', 'items[-1]'],
  evens: ['sum(expression for item in items)', 'Booleans count as 1 or 0 when summed.', 'sum(n % 2 == 0 for n in nums)'],
  clamp: ['max(low, min(value, high))', 'The inner call caps the top; the outer call raises the bottom.', 'max(lo, min(n, hi))'],
  dedupe: ['dict.fromkeys(iterable)', 'Dictionary keys keep their first insertion order.', 'list(dict.fromkeys(items))'],
  squares: ['[expression for item in iterable]', 'Builds one output value for every input value.', '[n * n for n in nums]'],
  positives: ['[item for item in iterable if test]', 'The trailing condition decides which items survive.', '[n for n in nums if n > 0]'],
  'all-positive': ['all(iterable) → bool', 'True when every item is truthy. An empty iterable is True.', 'all(n > 0 for n in nums)'],
  'vowel-count': ['item in collection → bool', 'Membership checks whether a value occurs in a collection.', 'char.lower() in "aeiou"'],
  'pair-up': ['zip(*iterables)', 'Yields aligned tuples and stops at the shortest input.', 'zip(names, scores)'],
  anagram: ['sorted(iterable)', 'Returns a new list in ascending order.', 'sorted(a) == sorted(b)'],
  majority: ['max(iterable, key=function)', 'The key function supplies the value used for comparison.', 'max(set(nums), key=nums.count)'],
  'has-duplicate': ['set(iterable)', 'Stores each distinct hashable value once.', 'len(nums) != len(set(nums))'],
  intersection: ['set_a & set_b', 'Intersection keeps only members present in both sets.', 'set(a) & set(b)'],
  'palindrome-number': ['sequence[::-1]', 'A full slice with step -1 reverses the sequence.', 'str(n) == str(n)[::-1]'],
  'running-sum': ['itertools.accumulate(iterable)', 'Yields each intermediate cumulative result.', 'list(accumulate(nums))'],
};

const TRACK_REFERENCES = {
  'Hash Maps': ['seen[key] = value', 'Store information by key so later membership and lookup are fast.', 'if needed in seen: ...'],
  'Two Pointers': ['left, right = 0, len(items) - 1', 'Move indices according to the invariant instead of checking every pair.', 'while left < right: ...'],
  'Stacks': ['stack.append(x) / stack.pop()', 'The top represents the most recent unresolved item.', 'while stack and can_resolve: ...'],
  'Binary Search': ['while left <= right', 'Each comparison must prove that one half cannot contain the answer.', 'middle = (left + right) // 2'],
  'Sliding Window': ['left = 0', 'Expand the right edge and shrink the left while maintaining window state.', 'for right, value in enumerate(items): ...'],
  'Prefix Sums': ['prefix[i + 1] = prefix[i] + nums[i]', 'A range sum becomes the difference between two cumulative totals.', 'sum(left..right) = prefix[right+1] - prefix[left]'],
  'Dynamic Programming': ['dp[state] = best(previous states)', 'Define what one state means before writing its recurrence.', 'current = max(take, skip)'],
  'Graphs & Grids': ['frontier + visited', 'Mark a state when discovered so it is processed at most once.', 'while frontier: visit(neighbors)'],
  'Intervals & Greedy': ['intervals.sort()', 'Sorting exposes the next safe merge or locally optimal choice.', 'if start <= previous_end: merge'],
  'Heaps': ['heapq.heappush / heapq.heappop', 'A heap maintains the next minimum-priority item efficiently.', 'smallest = heapq.heappop(heap)'],
  'Backtracking': ['choose → recurse → undo', 'Restore mutable state after each branch so siblings start clean.', 'path.append(x); search(); path.pop()'],
  'Trees': ['base case → left → right', 'Solve the same smaller problem on each child.', 'return combine(solve(left), solve(right))'],
};

export function referenceFor(drop) {
  const [signature, note, example] = REFERENCES[drop.id] || TRACK_REFERENCES[drop.track] || [drop.concept, drop.insight, ''];
  return { signature, note, example };
}
