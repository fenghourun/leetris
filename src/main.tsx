import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { indentUnit } from '@codemirror/language';
import { indentLess, indentMore } from '@codemirror/commands';
import { oneDark } from '@codemirror/theme-one-dark';
import { getCM, Vim, vim } from '@replit/codemirror-vim';
import { EditorView, ViewUpdate } from '@codemirror/view';
import { Transaction } from '@codemirror/state';
import { BookOpen, Brain, Check, ChevronDown, ChevronRight, Command, CornerDownLeft, Flame, HelpCircle, Keyboard, Pause, Play, SkipForward, Sparkles, X, Zap } from 'lucide-react';
import { CURRICULUM, TRACKS } from './curriculum';
import { BRIDGE_DRILLS } from './bridgeDrills';
import { CHUNK_DRILLS } from './chunkDrills';
import { SOLUTIONS } from './solutions';
import { referenceFor, techniqueFor } from './pedagogy';
import { chooseNextIndex, chooseStartingIndex, nextReview } from './scheduler';
import type { Diagnostic, Drop, EditorStyle, ReviewMap, VimMode, WorkerMessage } from './types';
import './styles.css';

type StarterDrop = Omit<Drop, 'track' | 'concept' | 'insight' | 'level'>;

const STARTER_DROPS = [
  { id: 'floor', color: 'lime', label: 'MIN', seconds: 20, xp: 80, task: 'smallest number', description: 'Return the lowest value in the list.', input: 'nums = [8, 3, 5, 1]', output: '1', signature: 'nums', hint: 'A built-in can do this.', answer: 'min(nums)', tests: [
    { args: [[8, 3, 5, 1]], expected: 1, label: '[8, 3, 5, 1]' }, { args: [[-4, 9, 0]], expected: -4, label: '[-4, 9, 0]' }, { args: [[42]], expected: 42, label: '[42]' },
  ]},
  { id: 'mirror', color: 'violet', label: 'FLIP', seconds: 18, xp: 100, task: 'reversed text', description: 'Return the characters in reverse order.', input: 'text = "python"', output: '"nohtyp"', signature: 'text', hint: 'Slices can step backwards.', answer: 'text[::-1]', tests: [
    { args: ['python'], expected: 'nohtyp', label: '"python"' }, { args: ['racecar'], expected: 'racecar', label: '"racecar"' }, { args: [''], expected: '', label: '""' },
  ]},
  { id: 'evens', color: 'cyan', label: 'COUNT', seconds: 25, xp: 120, task: 'number of evens', description: 'Count how many values are divisible by 2.', input: 'nums = [1, 2, 4, 7, 8]', output: '3', signature: 'nums', hint: 'Booleans add like 0 and 1.', answer: 'sum(n % 2 == 0 for n in nums)', tests: [
    { args: [[1, 2, 4, 7, 8]], expected: 3, label: '[1, 2, 4, 7, 8]' }, { args: [[1, 3, 5]], expected: 0, label: '[1, 3, 5]' }, { args: [[0, -2, 9, 12]], expected: 3, label: '[0, -2, 9, 12]' },
  ]},
  { id: 'clamp', color: 'orange', label: 'LIMIT', seconds: 28, xp: 140, task: 'number inside a range', description: 'Return n, but never below lo or above hi.', input: 'n = 12, lo = 0, hi = 10', output: '10', signature: 'n, lo, hi', hint: 'Combine min and max.', answer: 'max(lo, min(n, hi))', tests: [
    { args: [12, 0, 10], expected: 10, label: '12, 0, 10' }, { args: [-4, 0, 10], expected: 0, label: '-4, 0, 10' }, { args: [6, 0, 10], expected: 6, label: '6, 0, 10' },
  ]},
  { id: 'dedupe', color: 'pink', label: 'UNIQUE', seconds: 30, xp: 180, task: 'unique items, same order', description: 'Remove repeats without rearranging the list.', input: 'items = [3, 3, 1, 3, 2, 1]', output: '[3, 1, 2]', signature: 'items', hint: 'Dictionary keys remember insertion order.', answer: 'list(dict.fromkeys(items))', tests: [
    { args: [[3, 3, 1, 3, 2, 1]], expected: [3, 1, 2], label: '[3, 3, 1, 3, 2, 1]' }, { args: [['a', 'b', 'a']], expected: ['a', 'b'], label: '["a", "b", "a"]' }, { args: [[]], expected: [], label: '[]' },
  ]},
] satisfies StarterDrop[];

const STARTER_META: Record<string, [string, string]> = {
  floor: ['Built-ins · min', 'min scans the values once · O(n)'],
  mirror: ['Slicing · reverse step', 'a negative slice step walks backward'],
  evens: ['Generators · conditional count', 'sum treats True as 1 and False as 0'],
  clamp: ['Function composition · min/max', 'nested bounds express a clamp without branches'],
  dedupe: ['Ordered dictionaries', 'dictionary keys preserve first-seen order'],
};

const DROPS: Drop[] = [
  ...STARTER_DROPS.map((drop): Drop => {
    const [concept, insight] = STARTER_META[drop.id]!;
    return { ...drop, track: 'Python Foundations', concept, insight, level: 1 };
  }),
  ...CHUNK_DRILLS,
  ...CURRICULUM,
  ...BRIDGE_DRILLS,
].sort((a, b) => {
  const trackOrder = TRACKS.findIndex((track) => track.name === a.track) - TRACKS.findIndex((track) => track.name === b.track);
  return trackOrder || a.level - b.level;
});

function starterCode(drop: Drop): string {
  return drop.mode === 'code'
    ? `def solve(${drop.signature}):\n    `
    : `def solve(${drop.signature}):\n    return `;
}

function pythonLiteral(value: unknown): string {
  if (value === null) return 'None';
  if (value === true) return 'True';
  if (value === false) return 'False';
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(pythonLiteral).join(', ')}]`;
  return String(value);
}

function exampleFor(drop: Drop, repetitions: number): { input: string; output: string; index: number } {
  const index = repetitions % drop.tests.length;
  if (index === 0) return { input: drop.input, output: drop.output, index };
  const test = drop.tests[index]!;
  const names = drop.signature.split(',').map((name) => name.trim());
  return {
    input: test.args.map((arg, argumentIndex) => `${names[argumentIndex] ?? `arg${argumentIndex + 1}`} = ${pythonLiteral(arg)}`).join(', '),
    output: pythonLiteral(test.expected),
    index,
  };
}

const initialStack = [
  ['violet', 'violet', null, 'cyan', 'cyan', 'cyan', null, null, 'orange', 'orange'],
  ['violet', null, null, 'cyan', null, 'pink', 'pink', 'pink', 'orange', null],
];

const SOLVED_KEY = 'leetris-solved-v1';
const REVIEW_KEY = 'leetris-review-v1';
const EDITOR_KEY = 'leetris-editor-v1';

function loadEditorStyle(): EditorStyle {
  return localStorage.getItem(EDITOR_KEY) === 'standard' ? 'standard' : 'vim';
}

function loadSolved(): Set<string> {
  try {
    const raw = localStorage.getItem(SOLVED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []);
  }
  catch { return new Set(); }
}

function loadReviews(): ReviewMap {
  try {
    const raw = localStorage.getItem(REVIEW_KEY);
    return raw ? JSON.parse(raw) as ReviewMap : {};
  }
  catch { return {}; }
}

function startingDrop(): number {
  return chooseStartingIndex(DROPS, loadSolved(), loadReviews());
}

function useGameClock(duration: number, active: boolean, paused: boolean, resetKey: number, onExpire: () => void): number {
  const [time, setTime] = useState<number>(duration);
  const expiredRef = useRef(false);
  useEffect(() => { setTime(duration); expiredRef.current = false; }, [duration, resetKey]);
  useEffect(() => {
    if (!active || paused || time <= 0) return;
    const timer = setInterval(() => setTime((value) => Math.max(0, +(value - .1).toFixed(1))), 100);
    return () => clearInterval(timer);
  }, [active, paused, time]);
  useEffect(() => {
    if (time === 0 && !expiredRef.current) { expiredRef.current = true; onExpire(); }
  }, [time, onExpire]);
  return time;
}

function MiniBlock({ drop, ghost = false, solved = false }: { drop: Drop; ghost?: boolean; solved?: boolean }) {
  return <div className={`mini-block ${drop.color} ${ghost ? 'ghost' : ''} ${solved ? 'solved' : ''}`}><span>{solved && <Check />} {drop.label}</span><strong>{drop.task}</strong><small>{solved ? 'CLEARED' : `${drop.seconds}s`}</small></div>;
}

interface VimInputProps {
  value: string;
  setValue: (value: string) => void;
  mode: VimMode;
  setMode: (mode: VimMode) => void;
  onRun: () => void;
  onStart: () => void;
  disabled: boolean;
  focusSignal: string;
  multiline: boolean;
  vimEnabled: boolean;
}

interface Feedback {
  type: 'clear' | 'error' | 'coach';
  title: string;
  detail: string;
}

interface ActiveRun {
  id: number;
  drop: Drop;
  misses: number;
  techniqueMatched: boolean;
}

function VimInput({ value, setValue, mode, setMode, onRun, onStart, disabled, focusSignal, multiline, vimEnabled }: VimInputProps) {
  const viewRef = useRef<EditorView | null>(null);
  const extensions = useMemo(() => [
    ...(vimEnabled ? [vim({ status: false })] : []),
    python(),
    indentUnit.of('    '),
    EditorView.lineWrapping,
    EditorView.contentAttributes.of({ 'aria-label': 'Python solution editor' }),
  ], [vimEnabled, multiline]);

  useEffect(() => { const timer = setTimeout(() => viewRef.current?.focus(), 120); return () => clearTimeout(timer); }, []);
  useEffect(() => {
    if (disabled) return;
    const timer = setTimeout(() => viewRef.current?.focus(), 30);
    return () => clearTimeout(timer);
  }, [focusSignal, disabled]);

  const createEditor = (view: EditorView) => {
    viewRef.current = view;
    view.dispatch({ selection: { anchor: view.state.doc.length } });
    if (!vimEnabled) return;
    const cm = getCM(view);
    if (!cm) return;
    cm.on('vim-mode-change', (event: { mode: string }) => setMode(event.mode === 'insert' ? 'INSERT' : 'NORMAL'));
    Vim.handleKey(cm, 'i', 'user');
    setMode('INSERT');
  };

  const handleKeys = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab' && (!vimEnabled || mode === 'INSERT')) {
      event.preventDefault();
      event.stopPropagation();
      const view = viewRef.current;
      if (view) {
        (event.shiftKey ? indentLess : indentMore)(view);
        onStart();
      }
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      onRun();
    }
  };

  return <div onKeyDownCapture={handleKeys} className={`input-wrap cm-input ${vimEnabled ? 'vim-editor' : 'standard-editor'} ${mode.toLowerCase()} ${disabled ? 'disabled' : ''} ${multiline ? 'multiline' : ''}`}>
    <CodeMirror key={vimEnabled ? 'vim' : 'standard'} aria-label="Python solution editor" value={value}
      height="100%" theme={oneDark} extensions={extensions} editable={!disabled} autoFocus
      indentWithTab={false}
      basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLineGutter: false, highlightActiveLine: false, autocompletion: false, bracketMatching: true, closeBrackets: true }}
      placeholder="# write your solution"
      onCreateEditor={createEditor}
      onChange={(nextValue, update: ViewUpdate) => {
        setValue(nextValue);
        if (update.transactions.some((transaction) => Boolean(transaction.annotation(Transaction.userEvent)))) onStart();
      }} />
    <span className="mode-chip">{vimEnabled ? mode : 'STANDARD'}</span>
  </div>;
}

function App() {
  const [initialDropIndex] = useState(startingDrop);
  const [solved, setSolved] = useState<Set<string>>(loadSolved);
  const [reviews, setReviews] = useState<ReviewMap>(loadReviews);
  const [dropIndex, setDropIndex] = useState(initialDropIndex);
  const drop = DROPS[dropIndex];
  const [answer, setAnswer] = useState(() => starterCode(DROPS[initialDropIndex]!));
  const [exampleIndex, setExampleIndex] = useState(() => (reviews[DROPS[initialDropIndex]!.id]?.repetitions ?? 0) % DROPS[initialDropIndex]!.tests.length);
  const [editorStyle, setEditorStyle] = useState<EditorStyle>(loadEditorStyle);
  const [mode, setMode] = useState<VimMode>(() => loadEditorStyle() === 'vim' ? 'INSERT' : 'EDIT');
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [stack, setStack] = useState(initialStack);
  const [resetKey, setResetKey] = useState(0);
  const [misses, setMisses] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(() => window.innerWidth > 820);
  const [pageHidden, setPageHidden] = useState(document.hidden);
  const [practiceTrack, setPracticeTrack] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRunRef = useRef<ActiveRun | null>(null);
  const workerMessageRef = useRef<((data: WorkerMessage) => void) | null>(null);
  const timeRef = useRef(drop.seconds);
  const missesRef = useRef(misses);
  missesRef.current = misses;
  const solvedRef = useRef(solved);
  solvedRef.current = solved;
  const reviewsRef = useRef(reviews);
  reviewsRef.current = reviews;
  const reinforcementQueueRef = useRef<Array<{ id: string; dueTurn: number }>>([]);
  const successfulTurnsRef = useRef(0);

  useEffect(() => localStorage.setItem(SOLVED_KEY, JSON.stringify([...solved])), [solved]);
  useEffect(() => localStorage.setItem(REVIEW_KEY, JSON.stringify(reviews)), [reviews]);
  useEffect(() => localStorage.setItem(EDITOR_KEY, editorStyle), [editorStyle]);
  useEffect(() => {
    const updateVisibility = () => setPageHidden(document.hidden);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);
  useEffect(() => {
    const closeOverlay = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (solutionOpen) setSolutionOpen(false);
      else if (curriculumOpen) setCurriculumOpen(false);
      else if (helpOpen) setHelpOpen(false);
    };
    window.addEventListener('keydown', closeOverlay);
    return () => window.removeEventListener('keydown', closeOverlay);
  }, [solutionOpen, curriculumOpen, helpOpen]);

  const technique = techniqueFor(drop);
  const techniqueMismatch = Boolean(answer !== starterCode(drop) && answer.trim() && technique.enforced && technique.pattern && !technique.pattern.test(answer));
  const reference = referenceFor(drop);
  const repetitions = reviews[drop.id]?.repetitions ?? 0;
  const mastery = Math.min(repetitions, 5);
  const example = exampleFor(drop, exampleIndex);
  const canonicalBody = drop.mode === 'code' ? (SOLUTIONS[drop.id] ?? '# Solution unavailable') : `return ${drop.answer ?? ''}`;
  const canonicalCode = `def solve(${drop.signature}):\n${canonicalBody.split('\n').map((line) => `    ${line}`).join('\n')}`;

  const chooseEditor = (style: EditorStyle) => {
    setEditorStyle(style);
    setMode(style === 'vim' ? 'INSERT' : 'EDIT');
  };

  function advance(newlySolved?: string, reviewSnapshot?: ReviewMap) {
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    activeRunRef.current = null;
    const completed = new Set(solvedRef.current);
    if (newlySolved) completed.add(newlySolved);
    const dueReinforcement = reinforcementQueueRef.current.findIndex((item) => {
      const candidate = DROPS.find((candidateDrop) => candidateDrop.id === item.id);
      return item.dueTurn <= successfulTurnsRef.current && item.id !== drop.id && (!practiceTrack || candidate?.track === practiceTrack);
    });
    let nextIndex: number;
    if (dueReinforcement >= 0) {
      const [item] = reinforcementQueueRef.current.splice(dueReinforcement, 1);
      nextIndex = DROPS.findIndex((candidate) => candidate.id === item!.id);
    }
    else if (practiceTrack) {
      const trackIndices = DROPS.map((candidate, index) => candidate.track === practiceTrack ? index : -1).filter((index) => index >= 0);
      const localDrops = trackIndices.map((index) => DROPS[index]!);
      const localCurrent = Math.max(0, trackIndices.indexOf(dropIndex));
      nextIndex = trackIndices[chooseNextIndex(localDrops, localCurrent, completed, reviewSnapshot || reviewsRef.current)]!;
    }
    else nextIndex = chooseNextIndex(DROPS, dropIndex, completed, reviewSnapshot || reviewsRef.current);
    const nextDrop = DROPS[nextIndex]!;
    const nextReviews = reviewSnapshot || reviewsRef.current;
    setDropIndex(nextIndex);
    setExampleIndex((nextReviews[nextDrop.id]?.repetitions ?? 0) % nextDrop.tests.length);
    setAnswer(starterCode(nextDrop)); setFeedback(null); setDiagnostic(null); setRunning(false); setStarted(false); setPaused(false); setSolutionOpen(false); setMode(editorStyle === 'vim' ? 'INSERT' : 'EDIT'); setMisses(0); setResetKey((key) => key + 1);
  }

  workerMessageRef.current = (data: WorkerMessage) => {
    if (data.type === 'ready') { setRuntimeReady(true); return; }
    if (data.type === 'boot-error') { setRuntimeReady(false); setDiagnostic({ title: 'Runtime unavailable', message: data.error || 'The Python runtime could not load. Check your connection and refresh.' }); return; }
    if (data.type !== 'result' && data.type !== 'error') return;

    const context = activeRunRef.current;
    if (!context || data.id !== context.id || context.drop.id !== drop.id) return;
    activeRunRef.current = null;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setRunning(false);
    const runDrop = context.drop;

    if (data.type === 'result' && data.result.passed === runDrop.tests.length) {
      const bonus = Math.round(timeRef.current * 10);
      const firstClear = !solvedRef.current.has(runDrop.id);
      const completed = new Set(solvedRef.current).add(runDrop.id);
      const updatedReviews = { ...reviewsRef.current, [runDrop.id]: nextReview(reviewsRef.current[runDrop.id], context.misses + (context.techniqueMatched ? 0 : 1)) };
      solvedRef.current = completed;
      reviewsRef.current = updatedReviews;
      setScore((value) => value + runDrop.xp + bonus);
      setCombo((value) => value + 1);
      setStack((rows) => rows.length > 1 ? rows.slice(1) : []);
      setSolved(completed);
      setReviews(updatedReviews);
      successfulTurnsRef.current += 1;
      if (firstClear && !reinforcementQueueRef.current.some((item) => item.id === runDrop.id)) {
        reinforcementQueueRef.current.push({ id: runDrop.id, dueTurn: successfulTurnsRef.current + 3 });
      }
      setDiagnostic({ kind: 'success', title: 'All hidden tests passed', message: runDrop.insight });
      setFeedback({ type: 'clear', title: 'BLOCK CLEARED', detail: context.techniqueMatched ? `${runDrop.insight} · +${runDrop.xp + bonus}` : `Passed · focus-move review scheduled sooner · +${runDrop.xp + bonus}` });
      transitionTimerRef.current = setTimeout(() => advance(runDrop.id, updatedReviews), 1600);
      return;
    }

    const result = data.type === 'result' ? data.result : null;
    const failed = result?.cases.find((item) => !item.passed);
    const updatedReviews = { ...reviewsRef.current, [runDrop.id]: { ...(reviewsRef.current[runDrop.id] || {}), attempts: (reviewsRef.current[runDrop.id]?.attempts || 0) + 1, dueAt: Date.now() } };
    reviewsRef.current = updatedReviews;
    setMisses((value) => value + 1);
    setCombo(0);
    setStarted(false);
    setResetKey((key) => key + 1);
    setReviews(updatedReviews);
    setDiagnostic(result?.error
      ? { title: 'Python error', message: result.error.trim() }
      : data.type === 'error'
        ? { title: 'Execution error', message: data.error }
        : { title: 'Hidden test failed', input: failed?.input, expected: failed?.expected, received: failed?.actual });
  };

  const createWorker = useCallback(() => {
    workerRef.current?.terminate(); setRuntimeReady(false);
    const worker = new Worker(new URL('./pyodide-worker.ts', import.meta.url));
    workerRef.current = worker;
    worker.onmessage = ({ data }) => workerMessageRef.current?.(data);
    return worker;
  }, []);

  const cancelRun = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    activeRunRef.current = null;
    if (running) createWorker();
    setRunning(false);
  };

  useEffect(() => {
    createWorker();
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current); workerRef.current?.terminate(); };
  }, [createWorker]);

  const expire = useCallback(() => {
    if (!started) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    activeRunRef.current = null;
    if (running) createWorker();
    setRunning(false);
    setHearts((value) => Math.max(0, value - 1)); setCombo(0);
    setMisses((value) => value + 1); setStarted(false); setResetKey((key) => key + 1);
    setStack((rows) => [...rows, Array.from({ length: 10 }, (_, index) => index === 4 ? null : drop.color)]);
    setFeedback(null);
    setDiagnostic({ title: 'Time expired', message: 'This drop is still yours. Edit and retry, study the solution, or choose the next problem.' });
  }, [started, drop.color, running, createWorker]);

  const overlaysOpen = helpOpen || curriculumOpen || solutionOpen;
  const time = useGameClock(drop.seconds, started && !feedback, paused || pageHidden || overlaysOpen, resetKey, expire);
  timeRef.current = time;

  const run = () => {
    if (!answer.trim() || answer === starterCode(drop) || running || feedback?.type === 'clear') return;
    if (!runtimeReady) { setFeedback({ type: 'error', title: 'WARMING UP', detail: 'Python will be ready in a moment' }); setTimeout(() => setFeedback(null), 1100); return; }
    setStarted(true); setRunning(true); setFeedback(null); setDiagnostic(null);
    const code = answer;
    const runId = Date.now();
    activeRunRef.current = { id: runId, drop, misses: missesRef.current, techniqueMatched: !techniqueMismatch };
    workerRef.current?.postMessage({ type: 'run', id: runId, code, tests: drop.tests });
    timeoutRef.current = setTimeout(() => { activeRunRef.current = null; workerRef.current?.terminate(); setRunning(false); setStarted(false); setMisses((value) => value + 1); setResetKey((key) => key + 1); setDiagnostic({ title: 'Time limit exceeded', message: 'Your function ran for more than 4 seconds. Check for an infinite loop or reduce repeated work, then retry—or choose the next problem.' }); createWorker(); }, 4000);
  };

  const resetGame = () => {
    cancelRun();
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    const nextIndex = chooseStartingIndex(DROPS, solvedRef.current, reviewsRef.current);
    reinforcementQueueRef.current = []; successfulTurnsRef.current = 0;
    const nextDrop = DROPS[nextIndex]!;
    setPracticeTrack(null); setDropIndex(nextIndex); setExampleIndex((reviewsRef.current[nextDrop.id]?.repetitions ?? 0) % nextDrop.tests.length); setAnswer(starterCode(nextDrop)); setStarted(false); setPaused(false); setFeedback(null); setDiagnostic(null); setSolutionOpen(false); setScore(0); setCombo(0); setHearts(3); setStack(initialStack); setMisses(0); setMode(editorStyle === 'vim' ? 'INSERT' : 'EDIT'); setResetKey((key) => key + 1);
  };

  const progress = (time / drop.seconds) * 100;
  const danger = time < 6 && started;
  const stackExample = example.input.length > 32 || example.output.length > 26 || example.input.length + example.output.length > 55;

  return <main className={`game ${diagnostic && diagnostic.kind !== 'success' ? 'has-diagnostic' : ''}`}>
    <header className="hud">
      <button className="logo" onClick={resetGame} aria-label="Reset game"><span className="logo-stack"><i /><i /><i /></span><strong>LEETRIS</strong></button>
      <div className="hud-score"><small>SCORE</small><strong>{score.toLocaleString().padStart(6, '0')}</strong></div>
      <div className="hud-actions">
        <span className={`runtime ${runtimeReady ? 'ready' : ''}`}><i />{runtimeReady ? 'PY READY' : 'LOADING PY'}</span>
        <button onClick={() => setHelpOpen(true)} aria-label="Keyboard help"><HelpCircle /></button>
      </div>
    </header>

    <section className="game-layout">
      <aside className="left-stats">
        <button className="side-curriculum" onClick={() => setCurriculumOpen(true)}><BookOpen /><span>Curriculum</span><ChevronRight /></button>
        <div className="lesson-card">
          <div className="lesson-heading"><span>{practiceTrack ? 'TRACK LOOP' : 'CURRENT LESSON'}</span><i>{drop.chunk ?? `LEVEL ${drop.level}`}</i></div>
          <small>{drop.track}</small><strong>{drop.concept}</strong>
          <div className="lesson-move"><div><Brain /><span>USE THIS MOVE</span></div><p>{technique.cue}</p></div>
          <div className="mastery"><span>MASTERY</span><div>{[0,1,2,3,4].map((step) => <i className={step < mastery ? 'filled' : ''} key={step} />)}</div><em>{mastery}/5</em></div>
          <button className="reference-toggle" aria-expanded={referenceOpen} onClick={() => setReferenceOpen((value) => !value)}><span>QUICK REFERENCE</span><ChevronDown className={referenceOpen ? 'open' : ''} /></button>
          {referenceOpen && <div className="reference-body"><code>{reference.signature}</code><p>{reference.note}</p>{reference.example && <pre>{reference.example}</pre>}</div>}
        </div>
        <div className="stat-card combo-card"><span>COMBO</span><strong>{combo}<small>×</small></strong><div className="flames">{[0,1,2].map((n) => <Flame key={n} className={n < Math.min(combo,3) ? 'hot' : ''} />)}</div></div>
        <div className="stat-card life-card"><span>SHIELDS</span><div>{[0,1,2].map((n) => <i className={n < hearts ? 'full' : ''} key={n} />)}</div></div>
        <div className="controls-note"><Keyboard /><span><b>ESC</b> normal<br/><b>⌘ ↵</b> fire</span></div>
      </aside>

      <section className={`well ${drop.mode === 'code' ? 'code-mode' : ''}`} aria-label="Active code drop">
        <div className="well-grid" /><div className="time-rail"><i style={{ height: `${progress}%` }} className={danger ? 'danger' : ''} /></div>
        <div className="drop-head"><div className={`drop-kind ${drop.color}`}><Zap fill="currentColor" />CODE DROP{solved.has(drop.id) && <span className="cleared-tag"><Check /> CLEARED</span>}</div><div className={`clock ${danger ? 'danger' : ''}`}><small>{started ? 'DROP IN' : 'READY'}</small><strong>{started ? time.toFixed(1) : drop.seconds.toFixed(1)}</strong></div></div>
        <div className="challenge-core">
          <div className="challenge-copy"><h1>{drop.task}</h1><div className="drop-description">{drop.description}</div></div>
          <div className="challenge-context"><div className={`io-blocks ${stackExample ? 'stacked' : ''}`}><div><span>EXAMPLE INPUT <em>VARIANT {example.index + 1}/{drop.tests.length}</em></span><code>{example.input}</code></div><ChevronRight aria-hidden="true" /><div className="output-block"><span>EXPECTED OUTPUT</span><code>{example.output}</code></div></div></div>
        </div>
        <div className={`code-dock ${drop.mode === 'code' ? 'multiline' : ''} ${diagnostic && diagnostic.kind !== 'success' ? 'has-error' : ''}`}>
          <div className="signature"><div className="signature-code"><span className="python-glyph">PY</span> solution.py</div><div className="editor-toggle" aria-label="Editor mode"><button aria-pressed={editorStyle === 'standard'} className={editorStyle === 'standard' ? 'active' : ''} onClick={() => chooseEditor('standard')}>STANDARD</button><button aria-pressed={editorStyle === 'vim'} className={editorStyle === 'vim' ? 'active' : ''} onClick={() => chooseEditor('vim')}>VIM</button></div></div>
          <VimInput key={drop.id} value={answer} setValue={setAnswer} mode={mode} setMode={setMode} onRun={run} onStart={() => setStarted(true)} disabled={running || feedback?.type === 'clear'} focusSignal={`${misses}-${editorStyle}-${solutionOpen}`} multiline={drop.mode === 'code'} vimEnabled={editorStyle === 'vim'} />
          {techniqueMismatch && <div className="technique-warning" role="status"><Brain /><span><strong>Different approach</strong>Your code can still pass. This drill is targeting: {technique.cue}</span></div>}
          {diagnostic && <div className={`diagnostic ${diagnostic.kind || 'error'}`} role="alert"><span>{diagnostic.kind === 'success' ? <Check /> : <X />}</span><div><strong>{diagnostic.title}</strong>{diagnostic.message && <pre>{diagnostic.message}</pre>}{diagnostic.input && <div className="diagnostic-case"><code><b>INPUT</b>{diagnostic.input}</code><code><b>EXPECTED</b>{diagnostic.expected}</code><code><b>RECEIVED</b>{diagnostic.received}</code></div>}</div>{diagnostic.kind !== 'success' && misses > 0 && <button className="diagnostic-solution" onClick={() => setSolutionOpen(true)}>View solution <ChevronRight /></button>}</div>}
          <div className="dock-foot"><button className="skip" disabled={running || feedback?.type === 'clear'} onClick={() => advance()}><SkipForward /> {diagnostic && diagnostic.kind !== 'success' ? 'next problem' : 'skip'}</button><span className={misses >= 2 ? 'hint visible' : 'hint'}>{misses >= 2 ? drop.hint : `${2 - misses} tries until hint`}</span><button className="fire" onClick={run} disabled={answer === starterCode(drop) || !answer.trim() || running || !runtimeReady}>{running ? <span className="spinner" /> : <Play fill="currentColor" />}{running ? 'CHECKING' : 'FIRE'}<kbd className="shortcut-key" aria-label="Command Enter"><Command /><CornerDownLeft /></kbd></button></div>
        </div>
        {feedback && <div className={`feedback ${feedback.type}`} role="status" aria-live="polite"><span>{feedback.type === 'clear' ? <Check /> : feedback.type === 'coach' ? <Brain /> : <X />}</span><div><strong>{feedback.title}</strong><small>{feedback.detail}</small></div>{feedback.type === 'clear' && <Sparkles className="spark s1" />}{feedback.type === 'clear' && <Sparkles className="spark s2" />}</div>}
        <div className="block-stack">{stack.map((row, rowIndex) => <div className="stack-row" key={rowIndex}>{row.map((color, index) => <i key={index} className={color || 'empty'} />)}</div>)}</div>
      </section>

      <aside className="next-queue"><span className="aside-label">UP NEXT</span><div className="queue">{[1,2,3].map((offset) => { const next = DROPS[(dropIndex + offset) % DROPS.length]; return <MiniBlock key={offset} drop={next} solved={solved.has(next.id)} ghost={offset > 1} />; })}</div><div className="session-goal"><span>COLLECTION</span><strong>{solved.size}<small> / {DROPS.length}</small></strong><div><i style={{ width: `${(solved.size / DROPS.length) * 100}%` }} /></div></div><button className="pause" onClick={() => setPaused((value) => !value)}>{paused ? <Play /> : <Pause />}{paused ? 'resume' : 'pause'}</button></aside>
    </section>

    <footer className="footer-tip"><span><i /> {drop.mode === 'code' ? 'COMPLETE THE FUNCTION' : 'RETURN ONE EXPRESSION'} · THREE HIDDEN TESTS · {drop.track.toUpperCase()}</span><em>{Object.values(reviews).filter((item) => item.dueAt !== undefined && item.dueAt <= Date.now()).length} reviews due · progress saved locally</em></footer>
    {paused && <button className="pause-screen" onClick={() => setPaused(false)}><Pause /><strong>FLOW PAUSED</strong><span>click anywhere to drop back in</span></button>}
    {solutionOpen && <div className="modal-backdrop" onMouseDown={() => setSolutionOpen(false)}><div className="solution-modal" role="dialog" aria-modal="true" aria-labelledby="solution-title" onMouseDown={(event) => event.stopPropagation()}><button className="close" aria-label="Close solution" onClick={() => setSolutionOpen(false)}><X /></button><span className="modal-kicker">CANONICAL MOVE · {drop.concept.toUpperCase()}</span><h2 id="solution-title">Study the shape,<br/>then type it yourself.</h2><pre>{canonicalCode}</pre><div className="solution-why"><Brain /><div><strong>Why this works</strong><span>{drop.insight}</span></div></div><div className="solution-actions"><button onClick={() => setSolutionOpen(false)}>Keep trying</button><button onClick={() => { setAnswer(canonicalCode); setSolutionOpen(false); setMode(editorStyle === 'vim' ? 'INSERT' : 'EDIT'); }}>Load into editor <ChevronRight /></button></div></div></div>}
    {curriculumOpen && <div className="modal-backdrop" onMouseDown={() => setCurriculumOpen(false)}><div className="curriculum-modal" role="dialog" aria-modal="true" aria-labelledby="curriculum-title" onMouseDown={(event) => event.stopPropagation()}><button className="close" aria-label="Close curriculum" onClick={() => setCurriculumOpen(false)}><X /></button><div className="curriculum-title"><Brain /><div><span>ADAPTIVE PATH</span><h2 id="curriculum-title">Your curriculum</h2></div><strong>{solved.size}/{DROPS.length}</strong></div><p className="curriculum-copy">New patterns unlock in sequence. Fresh clears return after three other wins, then again after 1, 3, 7, 14, and 30 days.</p><div className="curriculum-mode"><span>{practiceTrack ? `TRACK LOOP · ${practiceTrack}` : 'ADAPTIVE MIX · ALL TRACKS'}</span>{practiceTrack && <button onClick={() => setPracticeTrack(null)}>Return to adaptive mix</button>}</div><div className="track-list">{TRACKS.map((track, trackIndex) => { const items = DROPS.filter((item) => item.track === track.name); const done = items.filter((item) => solved.has(item.id)).length; const firstIndex = DROPS.findIndex((item) => item.track === track.name && !solved.has(item.id)); return <button className={practiceTrack === track.name ? 'active' : ''} key={track.name} onClick={() => { cancelRun(); if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current); const selectedIndex = firstIndex >= 0 ? firstIndex : DROPS.findIndex((item) => item.track === track.name); const selectedDrop = DROPS[selectedIndex]!; setPracticeTrack(track.name); setDropIndex(selectedIndex); setExampleIndex((reviewsRef.current[selectedDrop.id]?.repetitions ?? 0) % selectedDrop.tests.length); setCurriculumOpen(false); setAnswer(starterCode(selectedDrop)); setFeedback(null); setDiagnostic(null); setStarted(false); setResetKey((key) => key + 1); }}><i>{String(trackIndex + 1).padStart(2, '0')}</i><div><strong>{track.name}</strong><small>{track.goal}</small></div><span>{practiceTrack === track.name ? 'LOOP' : `${done}/${items.length}`}</span><ChevronRight /></button>; })}</div></div></div>}
    {helpOpen && <div className="modal-backdrop" onMouseDown={() => setHelpOpen(false)}><div className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title" onMouseDown={(event) => event.stopPropagation()}><button className="close" aria-label="Close keyboard help" onClick={() => setHelpOpen(false)}><X /></button><span className="modal-kicker">EDITOR SHORTCUTS · VIM IS THE DEFAULT</span><h2 id="help-title">Hands on keys.<br/>Eyes on the drop.</h2><div className="keys"><kbd>esc</kbd><span>normal mode</span><kbd>i / a</kbd><span>insert / append</span><kbd>h j k l</kbd><span>move</span><kbd>w / b</kbd><span>jump words</span><kbd>0 / $</kbd><span>edges</span><kbd>x / u</kbd><span>delete / undo</span><kbd>⌘ ↵</kbd><span>fire</span><kbd>tab</kbd><span>indent code</span></div><button className="got-it" onClick={() => setHelpOpen(false)}>Got it <ChevronRight /></button></div></div>}
  </main>;
}

createRoot(document.getElementById('root')!).render(<App />);
