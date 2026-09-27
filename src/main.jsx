import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BookOpen, Brain, Check, ChevronRight, Flame, HelpCircle, Keyboard, Pause, Play, SkipForward, Sparkles, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { CURRICULUM, TRACKS } from './curriculum';
import { BRIDGE_DRILLS } from './bridgeDrills';
import { SOLUTIONS } from './solutions';
import { techniqueFor } from './pedagogy';
import './styles.css';

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
];

const STARTER_META = {
  floor: ['Built-ins · min', 'min scans the values once · O(n)'],
  mirror: ['Slicing · reverse step', 'a negative slice step walks backward'],
  evens: ['Generators · conditional count', 'sum treats True as 1 and False as 0'],
  clamp: ['Function composition · min/max', 'nested bounds express a clamp without branches'],
  dedupe: ['Ordered dictionaries', 'dictionary keys preserve first-seen order'],
};

const DROPS = [
  ...STARTER_DROPS.map((drop) => ({ ...drop, track: 'Python Foundations', concept: STARTER_META[drop.id][0], insight: STARTER_META[drop.id][1], level: 1 })),
  ...CURRICULUM,
  ...BRIDGE_DRILLS,
].sort((a, b) => {
  const trackOrder = TRACKS.findIndex((track) => track.name === a.track) - TRACKS.findIndex((track) => track.name === b.track);
  return trackOrder || a.level - b.level;
});

const initialStack = [
  ['violet', 'violet', null, 'cyan', 'cyan', 'cyan', null, null, 'orange', 'orange'],
  ['violet', null, null, 'cyan', null, 'pink', 'pink', 'pink', 'orange', null],
];

const SOLVED_KEY = 'leetris-solved-v1';
const REVIEW_KEY = 'leetris-review-v1';
const EDITOR_KEY = 'leetris-editor-v1';

function loadEditorStyle() {
  return localStorage.getItem(EDITOR_KEY) === 'standard' ? 'standard' : 'vim';
}

function loadSolved() {
  try { return new Set(JSON.parse(localStorage.getItem(SOLVED_KEY)) || []); }
  catch { return new Set(); }
}

function loadReviews() {
  try { return JSON.parse(localStorage.getItem(REVIEW_KEY)) || {}; }
  catch { return {}; }
}

function startingDrop() {
  const reviews = loadReviews();
  const due = DROPS.findIndex((item) => reviews[item.id]?.dueAt <= Date.now());
  if (due >= 0) return due;
  const solved = loadSolved();
  const fresh = DROPS.findIndex((item) => !solved.has(item.id));
  return fresh < 0 ? 0 : fresh;
}

function nextUnsolvedIndex(current, solved) {
  const reviews = loadReviews();
  for (let offset = 1; offset <= DROPS.length; offset += 1) {
    const candidate = (current + offset) % DROPS.length;
    if (reviews[DROPS[candidate].id]?.dueAt <= Date.now()) return candidate;
  }
  for (let offset = 1; offset <= DROPS.length; offset += 1) {
    const candidate = (current + offset) % DROPS.length;
    if (!solved.has(DROPS[candidate].id)) return candidate;
  }
  return (current + 1) % DROPS.length;
}

function useGameClock(duration, active, paused, resetKey, onExpire) {
  const [time, setTime] = useState(duration);
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

function MiniBlock({ drop, ghost = false, solved = false }) {
  return <div className={`mini-block ${drop.color} ${ghost ? 'ghost' : ''} ${solved ? 'solved' : ''}`}><span>{solved && <Check />} {drop.label}</span><small>{solved ? 'CLEARED' : `${drop.seconds}s`}</small></div>;
}

function VimInput({ value, setValue, mode, setMode, onRun, onStart, disabled, focusSignal, multiline, vimEnabled }) {
  const ref = useRef(null);
  const history = useRef([]);
  useEffect(() => { const timer = setTimeout(() => ref.current?.focus(), 120); return () => clearTimeout(timer); }, []);
  useEffect(() => {
    if (disabled) return;
    const timer = setTimeout(() => ref.current?.focus(), 30);
    return () => clearTimeout(timer);
  }, [focusSignal, disabled]);

  const moveWord = (direction) => {
    const el = ref.current;
    const pos = el.selectionStart;
    if (direction > 0) {
      const rest = value.slice(pos);
      const match = rest.match(/\W+\w|$/);
      const next = Math.min(value.length, pos + (match?.index ?? rest.length) + (match?.[0]?.length ? 1 : 0));
      el.setSelectionRange(next, next);
    } else {
      const before = value.slice(0, pos);
      const match = before.match(/\w+\W*$/);
      const next = match ? before.length - match[0].length : 0;
      el.setSelectionRange(next, next);
    }
  };

  const moveLine = (direction) => {
    const el = ref.current;
    const before = value.slice(0, el.selectionStart);
    const rowStart = before.lastIndexOf('\n') + 1;
    const column = el.selectionStart - rowStart;
    const lines = value.split('\n');
    const row = before.split('\n').length - 1;
    const nextRow = Math.max(0, Math.min(lines.length - 1, row + direction));
    const next = lines.slice(0, nextRow).reduce((sum, line) => sum + line.length + 1, 0) + Math.min(column, lines[nextRow].length);
    el.setSelectionRange(next, next);
  };

  const onKeyDown = (event) => {
    const el = ref.current;
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); onRun(); return; }
    if (multiline && event.key === 'Tab' && (!vimEnabled || mode === 'INSERT')) {
      event.preventDefault();
      const start = el.selectionStart;
      setValue(value.slice(0, start) + '    ' + value.slice(el.selectionEnd));
      requestAnimationFrame(() => el.setSelectionRange(start + 4, start + 4));
      return;
    }
    if (!vimEnabled) return;
    if (event.key === 'Escape') { event.preventDefault(); setMode('NORMAL'); return; }
    if (mode !== 'NORMAL') return;
    event.preventDefault();
    const pos = el.selectionStart;
    if (event.key === 'h') el.setSelectionRange(Math.max(0, pos - 1), Math.max(0, pos - 1));
    if (event.key === 'l') el.setSelectionRange(Math.min(value.length, pos + 1), Math.min(value.length, pos + 1));
    if (event.key === 'j' && multiline) moveLine(1);
    if (event.key === 'k' && multiline) moveLine(-1);
    if (event.key === '0') el.setSelectionRange(0, 0);
    if (event.key === '$') el.setSelectionRange(value.length, value.length);
    if (event.key === 'w') moveWord(1);
    if (event.key === 'b') moveWord(-1);
    if (event.key === 'i') setMode('INSERT');
    if (event.key === 'a') { const next = Math.min(value.length, pos + 1); el.setSelectionRange(next, next); setMode('INSERT'); }
    if (event.key === 'x') { history.current.push(value); setValue(value.slice(0, pos) + value.slice(pos + 1)); requestAnimationFrame(() => el.setSelectionRange(pos, pos)); }
    if (event.key === 'u' && history.current.length) setValue(history.current.pop());
  };

  const Field = multiline ? 'textarea' : 'input';
  return <div className={`input-wrap ${vimEnabled ? 'vim-editor' : 'standard-editor'} ${mode.toLowerCase()} ${disabled ? 'disabled' : ''} ${multiline ? 'multiline' : ''}`}>
    {!multiline && <span className="return-token">return</span>}
    <Field ref={ref} aria-label={multiline ? 'Python function body' : 'Python expression'} value={value} disabled={disabled}
      onChange={(event) => { history.current.push(value); setValue(event.target.value); onStart(); }}
      onKeyDown={onKeyDown}
      placeholder={multiline ? '# write the function body' : 'your_expression'} autoComplete="off" autoCapitalize="off" spellCheck="false" />
    <span className="mode-chip">{vimEnabled ? mode : 'STANDARD'}</span>
  </div>;
}

function App() {
  const [solved, setSolved] = useState(loadSolved);
  const [reviews, setReviews] = useState(loadReviews);
  const [dropIndex, setDropIndex] = useState(startingDrop);
  const drop = DROPS[dropIndex];
  const [answer, setAnswer] = useState('');
  const [editorStyle, setEditorStyle] = useState(loadEditorStyle);
  const [mode, setMode] = useState(() => loadEditorStyle() === 'vim' ? 'INSERT' : 'EDIT');
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [diagnostic, setDiagnostic] = useState(null);
  const [score, setScore] = useState(1240);
  const [combo, setCombo] = useState(3);
  const [hearts, setHearts] = useState(3);
  const [stack, setStack] = useState(initialStack);
  const [resetKey, setResetKey] = useState(0);
  const [misses, setMisses] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const workerRef = useRef(null);
  const timeoutRef = useRef(null);
  const timeRef = useRef(drop.seconds);
  const missesRef = useRef(misses);
  missesRef.current = misses;

  useEffect(() => localStorage.setItem(SOLVED_KEY, JSON.stringify([...solved])), [solved]);
  useEffect(() => localStorage.setItem(REVIEW_KEY, JSON.stringify(reviews)), [reviews]);
  useEffect(() => localStorage.setItem(EDITOR_KEY, editorStyle), [editorStyle]);

  const technique = techniqueFor(drop);
  const canonicalBody = drop.mode === 'code' ? SOLUTIONS[drop.id] : `return ${drop.answer}`;
  const canonicalCode = `def solve(${drop.signature}):\n${canonicalBody.split('\n').map((line) => `    ${line}`).join('\n')}`;

  const chooseEditor = (style) => {
    setEditorStyle(style);
    setMode(style === 'vim' ? 'INSERT' : 'EDIT');
  };

  function advance(newlySolved) {
    const completed = new Set(solved);
    if (newlySolved) completed.add(newlySolved);
    setDropIndex((index) => nextUnsolvedIndex(index, completed));
    setAnswer(''); setFeedback(null); setDiagnostic(null); setRunning(false); setStarted(false); setPaused(false); setSolutionOpen(false); setMode(editorStyle === 'vim' ? 'INSERT' : 'EDIT'); setMisses(0); setResetKey((key) => key + 1);
  }

  const createWorker = useCallback(() => {
    workerRef.current?.terminate(); setRuntimeReady(false);
    const worker = new Worker('/pyodide-worker.js');
    workerRef.current = worker;
    worker.onmessage = ({ data }) => {
      if (data.type === 'ready') setRuntimeReady(true);
      if (data.type === 'boot-error') { setRuntimeReady(false); setFeedback({ type: 'error', title: 'PYTHON IS OFFLINE', detail: 'Check your connection' }); setDiagnostic({ title: 'Runtime unavailable', message: data.error || 'The Python runtime could not load. Check your connection and refresh.' }); }
      if (data.type === 'result' || data.type === 'error') {
        clearTimeout(timeoutRef.current); setRunning(false);
        if (data.type === 'result' && data.result.passed === drop.tests.length) {
          const bonus = Math.round(timeRef.current * 10);
          setScore((value) => value + drop.xp + bonus); setCombo((value) => value + 1); setStack((rows) => rows.length > 1 ? rows.slice(1) : []); setSolved((items) => new Set(items).add(drop.id));
          setReviews((current) => {
            const previous = current[drop.id] || { repetitions: 0, attempts: 0 };
            const repetitions = Math.min(previous.repetitions + 1, 5);
            const intervals = [1, 3, 7, 14, 30, 60];
            const intervalDays = missesRef.current === 0 ? intervals[repetitions - 1] : 1;
            return { ...current, [drop.id]: { repetitions, attempts: previous.attempts + 1, intervalDays, dueAt: Date.now() + intervalDays * 86400000, lastScore: missesRef.current === 0 ? 'clean' : 'learned' } };
          });
          setDiagnostic({ kind: 'success', title: 'All hidden tests passed', message: drop.insight });
          setFeedback({ type: 'clear', title: 'BLOCK CLEARED', detail: `${drop.insight} · +${drop.xp + bonus}` });
          setTimeout(() => advance(drop.id), 1250);
        } else {
          const failed = data.result?.cases?.find((item) => !item.passed);
          setMisses((value) => value + 1); setCombo(0);
          setReviews((current) => ({ ...current, [drop.id]: { ...(current[drop.id] || {}), attempts: (current[drop.id]?.attempts || 0) + 1, dueAt: Date.now() } }));
          setDiagnostic(data.result?.error
            ? { title: 'Python error', message: data.result.error.trim() }
            : data.type === 'error'
              ? { title: 'Execution error', message: data.error }
              : { title: 'Hidden test failed', input: failed?.input, expected: failed?.expected, received: failed?.actual });
          setFeedback({ type: 'error', title: 'NOT QUITE', detail: failed ? `${failed.input} → ${failed.actual}` : 'Check the expression' });
          setTimeout(() => setFeedback(null), 1450);
        }
      }
    };
    return worker;
  }, [drop]);

  useEffect(() => { const worker = createWorker(); return () => worker.terminate(); }, [dropIndex]);

  const expire = useCallback(() => {
    if (!started) return;
    setHearts((value) => Math.max(0, value - 1)); setCombo(0);
    setStack((rows) => [...rows, Array.from({ length: 10 }, (_, index) => index === 4 ? null : drop.color)]);
    setFeedback({ type: 'error', title: 'BLOCK LANDED', detail: 'Keep the stack low' });
    setTimeout(advance, 900);
  }, [started, drop.color]);

  const time = useGameClock(drop.seconds, started && !feedback, paused, resetKey, expire);
  timeRef.current = time;

  const run = () => {
    if (!answer.trim() || running || feedback?.type === 'clear') return;
    if (technique.enforced && !technique.pattern.test(answer)) {
      setMisses((value) => value + 1);
      setDiagnostic({ title: 'Technique mismatch', message: technique.cue });
      setFeedback({ type: 'coach', title: 'USE THE FOCUS MOVE', detail: technique.cue });
      setTimeout(() => setFeedback(null), 1800);
      return;
    }
    if (!runtimeReady) { setFeedback({ type: 'error', title: 'WARMING UP', detail: 'Python will be ready in a moment' }); setTimeout(() => setFeedback(null), 1100); return; }
    setStarted(true); setRunning(true); setFeedback(null); setDiagnostic(null);
    const body = drop.mode === 'code' ? answer.split('\n').map((line) => `    ${line}`).join('\n') : `    return ${answer}`;
    const code = `def solve(${drop.signature}):\n${body}`;
    workerRef.current.postMessage({ type: 'run', id: Date.now(), code, tests: drop.tests });
    timeoutRef.current = setTimeout(() => { workerRef.current?.terminate(); setRunning(false); setDiagnostic({ title: 'Time limit exceeded', message: 'Your function ran for more than 4 seconds. Check for an infinite loop or reduce repeated work.' }); setFeedback({ type: 'error', title: 'TOO SLOW', detail: 'Execution took over 4 seconds' }); createWorker(); }, 4000);
  };

  const resetGame = () => {
    setDropIndex(0); setAnswer(''); setStarted(false); setPaused(false); setFeedback(null); setDiagnostic(null); setSolutionOpen(false); setScore(0); setCombo(0); setHearts(3); setStack(initialStack); setMisses(0); setMode(editorStyle === 'vim' ? 'INSERT' : 'EDIT'); setResetKey((key) => key + 1);
  };

  const progress = (time / drop.seconds) * 100;
  const danger = time < 6 && started;

  return <main className={`game ${feedback?.type === 'error' ? 'shake' : ''}`}>
    <header className="hud">
      <button className="logo" onClick={resetGame} aria-label="Reset game"><span className="logo-stack"><i /><i /><i /></span><strong>LEETRIS</strong></button>
      <div className="hud-score"><small>SCORE</small><strong>{score.toLocaleString().padStart(6, '0')}</strong></div>
      <div className="hud-actions">
        <span className={`runtime ${runtimeReady ? 'ready' : ''}`}><i />{runtimeReady ? 'PY READY' : 'LOADING PY'}</span>
        <button className="curriculum-button" onClick={() => setCurriculumOpen(true)} aria-label="Open curriculum"><BookOpen /><span>CURRICULUM</span></button>
        <button onClick={() => setMuted((value) => !value)} aria-label="Toggle sound">{muted ? <VolumeX /> : <Volume2 />}</button>
        <button onClick={() => setHelpOpen(true)} aria-label="Keyboard help"><HelpCircle /></button>
      </div>
    </header>

    <section className="game-layout">
      <aside className="left-stats">
        <div className="stat-card combo-card"><span>COMBO</span><strong>{combo}<small>×</small></strong><div className="flames">{[0,1,2].map((n) => <Flame key={n} className={n < Math.min(combo,3) ? 'hot' : ''} />)}</div></div>
        <div className="stat-card life-card"><span>SHIELDS</span><div>{[0,1,2].map((n) => <i className={n < hearts ? 'full' : ''} key={n} />)}</div></div>
        <div className="controls-note"><Keyboard /><span><b>ESC</b> normal<br/><b>⌘ ↵</b> fire</span></div>
      </aside>

      <section className={`well ${drop.mode === 'code' ? 'code-mode' : ''}`} aria-label="Active code drop">
        <div className="well-grid" /><div className="time-rail"><i style={{ height: `${progress}%` }} className={danger ? 'danger' : ''} /></div>
        <div className="drop-head"><div className={`drop-kind ${drop.color}`}><Zap fill="currentColor" />{drop.label}{solved.has(drop.id) && <span className="cleared-tag"><Check /> CLEARED</span>}</div><div className={`clock ${danger ? 'danger' : ''}`}><small>{started ? 'DROP IN' : 'READY'}</small><strong>{started ? time.toFixed(1) : drop.seconds.toFixed(1)}</strong></div></div>
        <div className="challenge-core">
          <div className="challenge-copy"><div className="concept-banner"><span>FOCUS</span>{drop.concept}<em>LVL {drop.level}</em></div><p>{drop.mode === 'code' ? 'BUILD A FUNCTION FOR THE' : 'MAKE THIS RETURN THE'}</p><h1>{drop.task}</h1><div className="drop-description">{drop.description}</div></div>
          <div className="challenge-context"><div className="technique-cue"><Brain /> <span><b>USE THIS MOVE</b>{technique.cue}</span></div><div className="io-blocks"><div><span>INPUT</span><code>{drop.input}</code></div><ChevronRight /><div className="output-block"><span>TARGET</span><code>{drop.output}</code></div></div></div>
        </div>
        <div className={`code-dock ${drop.mode === 'code' ? 'multiline' : ''} ${diagnostic && diagnostic.kind !== 'success' ? 'has-error' : ''}`}>
          <div className="signature"><div className="signature-code"><span>def</span> solve({drop.signature}):</div><div className="editor-toggle" aria-label="Editor mode"><button className={editorStyle === 'standard' ? 'active' : ''} onClick={() => chooseEditor('standard')}>STANDARD</button><button className={editorStyle === 'vim' ? 'active' : ''} onClick={() => chooseEditor('vim')}>VIM</button></div></div>
          <VimInput key={drop.id} value={answer} setValue={setAnswer} mode={mode} setMode={setMode} onRun={run} onStart={() => setStarted(true)} disabled={running || feedback?.type === 'clear'} focusSignal={`${misses}-${editorStyle}`} multiline={drop.mode === 'code'} vimEnabled={editorStyle === 'vim'} />
          {diagnostic && <div className={`diagnostic ${diagnostic.kind || 'error'}`} role="alert"><span>{diagnostic.kind === 'success' ? <Check /> : <X />}</span><div><strong>{diagnostic.title}</strong>{diagnostic.message && <pre>{diagnostic.message}</pre>}{diagnostic.input && <div className="diagnostic-case"><code>input: {diagnostic.input}</code><code>expected: {diagnostic.expected}</code><code>received: {diagnostic.received}</code></div>}</div></div>}
          <div className="dock-foot"><button className="skip" onClick={() => advance()}><SkipForward /> skip</button>{misses > 0 && <button className="solution-link" onClick={() => setSolutionOpen(true)}>view solution</button>}<span className={misses >= 2 ? 'hint visible' : 'hint'}>{misses >= 2 ? drop.hint : `${2 - misses} tries until hint`}</span><button className="fire" onClick={run} disabled={!answer.trim() || running || !runtimeReady}>{running ? <span className="spinner" /> : <Play fill="currentColor" />}{running ? 'CHECKING' : 'FIRE'}<kbd>⌘↵</kbd></button></div>
        </div>
        {feedback && <div className={`feedback ${feedback.type}`}><span>{feedback.type === 'clear' ? <Check /> : feedback.type === 'coach' ? <Brain /> : <X />}</span><div><strong>{feedback.title}</strong><small>{feedback.detail}</small></div>{feedback.type === 'clear' && <Sparkles className="spark s1" />}{feedback.type === 'clear' && <Sparkles className="spark s2" />}</div>}
        <div className="block-stack">{stack.map((row, rowIndex) => <div className="stack-row" key={rowIndex}>{row.map((color, index) => <i key={index} className={color || 'empty'} />)}</div>)}</div>
      </section>

      <aside className="next-queue"><span className="aside-label">UP NEXT</span><div className="queue">{[1,2,3].map((offset) => { const next = DROPS[(dropIndex + offset) % DROPS.length]; return <MiniBlock key={offset} drop={next} solved={solved.has(next.id)} ghost={offset > 1} />; })}</div><div className="session-goal"><span>COLLECTION</span><strong>{solved.size}<small> / {DROPS.length}</small></strong><div><i style={{ width: `${(solved.size / DROPS.length) * 100}%` }} /></div></div><button className="pause" onClick={() => setPaused((value) => !value)}>{paused ? <Play /> : <Pause />}{paused ? 'resume' : 'pause'}</button></aside>
    </section>

    <footer className="footer-tip"><span><i /> {drop.mode === 'code' ? 'FUNCTION BODY' : 'ONE EXPRESSION'} · THREE HIDDEN TESTS · {drop.track.toUpperCase()}</span><em>{Object.values(reviews).filter((item) => item.dueAt <= Date.now()).length} reviews due · progress saved locally</em></footer>
    {paused && <div className="pause-screen" onClick={() => setPaused(false)}><Pause /><strong>FLOW PAUSED</strong><span>click anywhere to drop back in</span></div>}
    {solutionOpen && <div className="modal-backdrop" onMouseDown={() => setSolutionOpen(false)}><div className="solution-modal" onMouseDown={(event) => event.stopPropagation()}><button className="close" onClick={() => setSolutionOpen(false)}><X /></button><span className="modal-kicker">CANONICAL MOVE · {drop.concept.toUpperCase()}</span><h2>Study the shape,<br/>then type it yourself.</h2><pre>{canonicalCode}</pre><div className="solution-why"><Brain /><div><strong>Why this works</strong><span>{drop.insight}</span></div></div><div className="solution-actions"><button onClick={() => setSolutionOpen(false)}>Keep trying</button><button onClick={() => { setAnswer(drop.mode === 'code' ? SOLUTIONS[drop.id] : drop.answer); setSolutionOpen(false); setMode(editorStyle === 'vim' ? 'INSERT' : 'EDIT'); }}>Load into editor <ChevronRight /></button></div></div></div>}
    {curriculumOpen && <div className="modal-backdrop" onMouseDown={() => setCurriculumOpen(false)}><div className="curriculum-modal" onMouseDown={(event) => event.stopPropagation()}><button className="close" onClick={() => setCurriculumOpen(false)}><X /></button><div className="curriculum-title"><Brain /><div><span>ADAPTIVE PATH</span><h2>Your curriculum</h2></div><strong>{solved.size}/{DROPS.length}</strong></div><p className="curriculum-copy">New patterns unlock in sequence. Cleared drops return after 1, 3, 7, 14, and 30 days to build durable recall.</p><div className="track-list">{TRACKS.map((track, trackIndex) => { const items = DROPS.filter((item) => item.track === track.name); const done = items.filter((item) => solved.has(item.id)).length; const firstIndex = DROPS.findIndex((item) => item.track === track.name && !solved.has(item.id)); return <button key={track.name} onClick={() => { setDropIndex(firstIndex >= 0 ? firstIndex : DROPS.findIndex((item) => item.track === track.name)); setCurriculumOpen(false); setAnswer(''); setFeedback(null); setDiagnostic(null); setStarted(false); setResetKey((key) => key + 1); }}><i>{String(trackIndex + 1).padStart(2, '0')}</i><div><strong>{track.name}</strong><small>{track.goal}</small></div><span>{done}/{items.length}</span><ChevronRight /></button>; })}</div></div></div>}
    {helpOpen && <div className="modal-backdrop" onMouseDown={() => setHelpOpen(false)}><div className="help-modal" onMouseDown={(event) => event.stopPropagation()}><button className="close" onClick={() => setHelpOpen(false)}><X /></button><span className="modal-kicker">VIM MODE IS ALWAYS ON</span><h2>Hands on keys.<br/>Eyes on the drop.</h2><div className="keys"><kbd>esc</kbd><span>normal mode</span><kbd>i / a</kbd><span>insert / append</span><kbd>h j k l</kbd><span>move</span><kbd>w / b</kbd><span>jump words</span><kbd>0 / $</kbd><span>edges</span><kbd>x / u</kbd><span>delete / undo</span><kbd>⌘ ↵</kbd><span>fire</span><kbd>tab</kbd><span>indent code</span></div><button className="got-it" onClick={() => setHelpOpen(false)}>Got it <ChevronRight /></button></div></div>}
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
