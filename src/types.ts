export type DropColor = 'lime' | 'violet' | 'cyan' | 'orange' | 'pink';
export type EditorStyle = 'standard' | 'vim';
export type VimMode = 'INSERT' | 'NORMAL' | 'EDIT';

export interface TestCase {
  args: unknown[];
  expected: unknown;
  label: string;
}

export interface Drop {
  id: string;
  track: string;
  concept: string;
  level: number;
  color: DropColor;
  label: string;
  seconds: number;
  xp: number;
  task: string;
  description: string;
  input: string;
  output: string;
  signature: string;
  hint: string;
  insight: string;
  tests: TestCase[];
  mode?: 'code';
  answer?: string;
}

export interface ReviewRecord {
  repetitions?: number;
  attempts?: number;
  intervalDays?: number;
  dueAt?: number;
  lastScore?: 'clean' | 'learned';
}

export type ReviewMap = Record<string, ReviewRecord>;

export interface TestResult {
  passed: boolean;
  actual: string;
  expected: string;
  input: string;
  ms: number;
}

export interface RunResult {
  passed: number;
  cases: TestResult[];
  stdout: string;
  error: string | null;
}

export type WorkerMessage =
  | { type: 'ready' }
  | { type: 'boot-error'; error: string }
  | { type: 'result'; id: number; result: RunResult; totalMs: number }
  | { type: 'error'; id: number; error: string };

export interface Diagnostic {
  kind?: 'success';
  title: string;
  message?: string;
  input?: string;
  expected?: string;
  received?: string;
}
