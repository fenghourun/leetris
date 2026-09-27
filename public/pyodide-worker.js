let pyodide;
let ready;

async function boot() {
  importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js');
  pyodide = await loadPyodide();
  self.postMessage({ type: 'ready' });
}

ready = boot().catch((error) => {
  self.postMessage({ type: 'boot-error', error: String(error) });
});

self.onmessage = async ({ data }) => {
  if (data.type !== 'run') return;
  await ready;
  if (!pyodide) return;

  const started = performance.now();
  try {
    pyodide.globals.set('__leetris_code', data.code);
    pyodide.globals.set('__leetris_tests', JSON.stringify(data.tests));
    const raw = await pyodide.runPythonAsync(`
import json, time, traceback, contextlib, io

tests = json.loads(__leetris_tests)
scope = {}
captured = io.StringIO()
result = {"passed": 0, "cases": [], "stdout": "", "error": None}

try:
    with contextlib.redirect_stdout(captured):
        exec(__leetris_code, scope)
    if "solve" not in scope or not callable(scope["solve"]):
        raise NameError("Define a function named solve")

    for test in tests:
        case_start = time.perf_counter()
        try:
            actual = scope["solve"](*test["args"])
            elapsed = (time.perf_counter() - case_start) * 1000
            passed = actual == test["expected"]
            result["passed"] += int(passed)
            result["cases"].append({
                "passed": passed,
                "actual": repr(actual),
                "expected": repr(test["expected"]),
                "input": test["label"],
                "ms": round(elapsed, 2)
            })
        except Exception as exc:
            result["cases"].append({
                "passed": False,
                "actual": f"{type(exc).__name__}: {exc}",
                "expected": repr(test["expected"]),
                "input": test["label"],
                "ms": 0
            })
except Exception:
    result["error"] = traceback.format_exc(limit=3)

result["stdout"] = captured.getvalue()
json.dumps(result)
    `);
    const result = JSON.parse(raw);
    self.postMessage({
      type: 'result',
      id: data.id,
      result,
      totalMs: Math.round(performance.now() - started)
    });
  } catch (error) {
    self.postMessage({ type: 'error', id: data.id, error: String(error) });
  }
};
