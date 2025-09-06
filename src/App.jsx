import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

// Default export React component
export default function App() {
  const [input, setInput] = useState("8,9,0,1,2,3,4,5,6,7");
  const [arr, setArr] = useState([8,9,0,1,2,3,4,5,6,7]);
  const [steps, setSteps] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(800);
  const intervalRef = useRef(null);
  const [error, setError] = useState("");

  // --- Test cases ---
  const testCases = [
    { name: "Example from prompt", a: [8,9,0,1,2,3,4,5,6,7], expectIndex: 1 },
    { name: "Typical rotation", a: [4,5,6,7,0,1,2,3], expectIndex: 3 },
    { name: "No rotation (ascending)", a: [1,2,3,4,5,6,7], expectIndex: 6 },
    { name: "Single element", a: [2], expectIndex: 0 },
    { name: "Peak at index 0", a: [3,1,2], expectIndex: 0 },
    { name: "Peak in middle", a: [2,3,4,5,1], expectIndex: 3 },
  ];

  useEffect(() => {
    // cleanup on unmount
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (playing) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setIndex((i) => {
          if (i < steps.length - 1) return i + 1;
          clearInterval(intervalRef.current);
          setPlaying(false);
          return i;
        });
      }, speed);
    } else {
      clearInterval(intervalRef.current);
    }
  }, [playing, speed, steps]);

  function parseInputToArray(text) {
    if (!text.trim()) return [];
    const parts = text.split(",").map(s => s.trim()).filter(s => s !== "");
    const nums = [];
    for (let p of parts) {
      if (!/^[-]?\d+$/.test(p)) {
        throw new Error("Only integers separated by commas are allowed.");
      }
      nums.push(Number(p));
    }
    return nums;
  }

  function handleApplyInput() {
    try {
      const a = parseInputToArray(input);
      if (a.length === 0) throw new Error("Array must contain at least 1 element.");
      setArr(a);
      setError("");
      const s = generateSteps(a);
      setSteps(s);
      setIndex(0);
      setPlaying(false);
    } catch (e) {
      setError(e.message);
    }
  }

  function handleRandom(size = 10) {
    const n = Math.max(1, Number(size) || 10);
    // generate ascending array 0..n-1 then rotate by random pivot
    const base = Array.from({length: n}, (_, i) => i);
    const pivot = Math.floor(Math.random() * n);
    const rotated = base.slice(pivot+1).concat(base.slice(0, pivot+1));
    setInput(rotated.join(","));
    setArr(rotated);
    const s = generateSteps(rotated);
    setSteps(s);
    setIndex(0);
    setPlaying(false);
    setError("");
  }

  useEffect(() => {
    // initialize steps for default arr
    setSteps(generateSteps(arr));
    setIndex(0);
  }, []);

  function reset() {
    setIndex(0);
    setPlaying(false);
    clearInterval(intervalRef.current);
  }

  // Helper to build human‑readable actions without using raw comparison symbols inside JSX text
  function actionGreater(mid, rightVal) {
    return `arr[mid] is greater than arr[mid+1] → peak at index ${mid} (${rightVal.prev} vs ${rightVal.next})`;
  }
  function actionLess(mid, leftVal) {
    return `arr[mid] is less than arr[mid-1] → peak at index ${mid - 1} (${leftVal.prev} vs ${leftVal.next})`;
  }
  function actionLeftSorted(lowVal, midVal) {
    return `Left half is sorted (arr[low] not larger than arr[mid], ${lowVal} compared with ${midVal}). Move low to mid + 1`;
  }
  function actionPivotLeft(lowVal, midVal) {
    return `Pivot lies in left half (arr[low] larger than arr[mid], ${lowVal} compared with ${midVal}). Move high to mid - 1`;
  }

  // generate steps of the pivot-finding binary search
  function generateSteps(a) {
    const steps = [];
    const n = a.length;
    let low = 0;
    let high = n - 1;

    // Edge case: single element
    if (n === 1) {
      steps.push({ low: 0, high: 0, mid: 0, action: `Single element → peak at index 0`, found: true, peakIndex: 0, arr: a.slice() });
      return steps;
    }

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const step = { low, high, mid, arr: a.slice(), action: "", found: false };

      // check if mid is pivot (peak): a[mid] > a[mid+1]
      if (mid < high && a[mid] > a[mid + 1]) {
        step.action = actionGreater(mid, { prev: a[mid], next: a[mid+1] });
        step.found = true;
        step.peakIndex = mid;
        steps.push(step);
        break;
      }

      // check other pivot condition: a[mid] < a[mid-1]
      if (mid > low && a[mid] < a[mid - 1]) {
        step.action = actionLess(mid, { prev: a[mid - 1], next: a[mid] });
        step.found = true;
        step.peakIndex = mid - 1;
        steps.push(step);
        break;
      }

      // decide which half to search next
      if (a[low] <= a[mid]) {
        step.action = actionLeftSorted(a[low], a[mid]);
        steps.push(step);
        low = mid + 1;
      } else {
        step.action = actionPivotLeft(a[low], a[mid]);
        steps.push(step);
        high = mid - 1;
      }
    }

    // if not found, handle fallback: when array is fully sorted ascending (no rotation)
    if (steps.length === 0 || !steps[steps.length - 1].found) {
      // peak is the max element's index
      let maxIdx = 0;
      for (let i = 1; i < a.length; i++) if (a[i] > a[maxIdx]) maxIdx = i;
      steps.push({ low: -1, high: -1, mid: -1, arr: a.slice(), action: `No rotation detected by loop; fallback peak at index ${maxIdx} (value ${a[maxIdx]})`, found: true, peakIndex: maxIdx });
    }

    return steps;
  }

  const current = steps[index] || null;

  // Run all built‑in tests and return results
  function runAllTests() {
    return testCases.map(tc => {
      const s = generateSteps(tc.a);
      const last = s[s.length - 1];
      return {
        name: tc.name,
        array: `[${tc.a.join(", ")}]`,
        expectedIndex: tc.expectIndex,
        gotIndex: last.peakIndex,
        value: tc.a[last.peakIndex],
        pass: last.peakIndex === tc.expectIndex
      };
    });
  }

  const [tests, setTests] = useState([]);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-extrabold mb-1">Rotated Array Peak Visualizer</h1>
          <p className="text-sm text-slate-600">Visualize binary-search pivot finding (maximum element) on a rotated sorted array.</p>
        </header>

        <section className="bg-white rounded-2xl shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Array (comma separated integers)</label>
              <textarea value={input} onChange={(e) => setInput(e.target.value)} className="mt-2 p-3 w-full border rounded-md h-28" />
              <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={handleApplyInput} className="px-4 py-2 rounded bg-blue-600 text-white">Apply</button>
                <button onClick={() => handleRandom(10)} className="px-4 py-2 rounded bg-indigo-600 text-white">Random rotate size 10</button>
                <button onClick={() => handleRandom(6)} className="px-4 py-2 rounded bg-indigo-500 text-white">Random rotate size 6</button>
                <button onClick={() => { setInput("8,9,0,1,2,3,4,5,6,7"); setArr([8,9,0,1,2,3,4,5,6,7]); const s=generateSteps([8,9,0,1,2,3,4,5,6,7]); setSteps(s); setIndex(0); setPlaying(false); }} className="px-4 py-2 rounded bg-slate-200">Reset to example</button>
              </div>
              {error && <p className="text-red-600 mt-2">{error}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Playback</label>
              <div className="mt-2 flex items-center gap-2">
                <button onClick={() => { setIndex(i => Math.max(0, i - 1)); setPlaying(false); }} className="px-3 py-2 rounded bg-slate-100">Prev</button>
                <button onClick={() => setPlaying(p => !p)} className="px-3 py-2 rounded bg-emerald-500 text-white">{playing ? 'Pause' : 'Play'}</button>
                <button onClick={() => { setIndex(i => Math.min(steps.length - 1, i + 1)); setPlaying(false); }} className="px-3 py-2 rounded bg-slate-100">Next</button>
                <button onClick={reset} className="px-3 py-2 rounded bg-slate-100">Reset</button>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700">Speed (ms)</label>
                <input type="range" min="200" max="2000" step="100" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-full mt-2" />
                <div className="text-xs text-slate-500 mt-1">{speed} ms per step</div>
              </div>

      
              <div className="mt-4">
                <div className="text-sm text-slate-600">Step {index + 1} / {steps.length}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Array Visualization</h2>

          <div className="overflow-x-auto py-2 max-h-36">
            <div className="flex gap-2 items-end w-max">
              {arr.map((v, i) => {
                const isLow = current && current.low === i;
                const isHigh = current && current.high === i;
                const isMid = current && current.mid === i;
                const isPeak = current && current.found && current.peakIndex === i;
                return (
                  <motion.div key={i} animate={{ scale: isMid ? 1.08 : 1 }} transition={{ duration: 0.18 }} className={`flex flex-col items-center p-0.5`}>
                    <div className={`w-14 h-14 flex items-center justify-center rounded-md border ${isPeak ? 'border-yellow-500 bg-yellow-50' : 'bg-white'} ${isMid ? 'ring-2 ring-offset-2 ring-indigo-300' : ''}`}>
                      <div className="text-base font-medium">{v}</div>
                    </div>
                    <div className="text-xs mt-2">i: {i}</div>
                    <div className="mt-1 flex gap-1">
                      {isLow && <div className="text-xs px-2 py-0.5 bg-green-100 rounded">low</div>}
                      {isMid && <div className="text-xs px-2 py-0.5 bg-indigo-100 rounded">mid</div>}
                      {isHigh && <div className="text-xs px-2 py-0.5 bg-red-100 rounded">high</div>}
                      {isPeak && <div className="text-xs px-2 py-0.5 bg-yellow-100 rounded">peak</div>}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-slate-700">Current Step</h3>
              <div className="mt-2 p-4 rounded-md bg-slate-50 border">
                {current ? (
                  <>
                    <div className="text-sm"><strong>low:</strong> {current.low} {current.low >= 0 && `(${current.arr[current.low]})`}</div>
                    <div className="text-sm"><strong>high:</strong> {current.high} {current.high >= 0 && `(${current.arr[current.high]})`}</div>
                    <div className="text-sm"><strong>mid:</strong> {current.mid} {current.mid >= 0 && `(${current.arr[current.mid]})`}</div>
                    <div className="mt-2 text-sm text-slate-700"><strong>Action:</strong> {current.action}</div>
                    {current.found && <div className="mt-3 p-2 bg-amber-50 border-l-4 border-amber-300">Peak found at index <strong>{current.peakIndex}</strong> with value <strong>{current.arr[current.peakIndex]}</strong></div>}
                  </>
                ) : (
                  <div className="text-sm text-slate-500">No step selected</div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-slate-700">Step Log</h3>
              <div className="mt-2 p-3 rounded-md bg-slate-50 border max-h-56 overflow-auto text-sm">
                {steps.length === 0 && <div className="text-slate-500">No steps yet. Apply an array above.</div>}
                {steps.map((s, idx) => (
                  <div key={idx} className={`mb-2 p-2 rounded ${idx === index ? 'bg-white border' : 'bg-transparent'}`} onClick={() => { setIndex(idx); setPlaying(false); }}>
                    <div className="font-medium">Step {idx + 1} {s.found ? '(found)' : ''}</div>
                    <div className="text-xs text-slate-600">mid: {s.mid}, low: {s.low}, high: {s.high}</div>
                    <div className="text-sm mt-1">{s.action}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="text-base font-semibold mb-3">Quick Test Cases</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {testCases.map((tc, i) => (
              <div key={i} className="p-3 rounded-lg border bg-slate-50">
                <div className="text-sm font-medium">{tc.name}</div>
                <div className="text-xs text-slate-600">[{tc.a.join(', ')}]</div>
                <div className="text-xs mt-1">Expected peak index: <span className="font-semibold">{tc.expectIndex}</span></div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => {
                      setInput(tc.a.join(","));
                      setArr(tc.a);
                      const s = generateSteps(tc.a);
                      setSteps(s);
                      setIndex(0);
                      setPlaying(false);
                    }}
                    className="px-3 py-1 rounded bg-slate-200"
                  >Load</button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <button onClick={() => setTests(runAllTests())} className="px-4 py-2 rounded bg-emerald-600 text-white">Run All Tests</button>
          </div>

          {tests.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm border">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="p-2 text-left border">Name</th>
                    <th className="p-2 text-left border">Array</th>
                    <th className="p-2 text-left border">Expected Index</th>
                    <th className="p-2 text-left border">Got Index</th>
                    <th className="p-2 text-left border">Value</th>
                    <th className="p-2 text-left border">Pass?</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((t, i) => (
                    <tr key={i} className="odd:bg-white even:bg-slate-50">
                      <td className="p-2 border whitespace-nowrap">{t.name}</td>
                      <td className="p-2 border">{t.array}</td>
                      <td className="p-2 border text-center">{t.expectedIndex}</td>
                      <td className="p-2 border text-center">{t.gotIndex}</td>
                      <td className="p-2 border text-center">{t.value}</td>
                      <td className="p-2 border text-center">{t.pass ? '✅' : '❌'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="text-xs text-slate-500 text-center mt-6">
          Algorithm: Find the peak (maximum) element in a rotated sorted array using an adapted binary search that looks for the pivot where arr[i] is greater than arr[i+1]. Assumes distinct values.
        </footer>
      </div>
    </div>
  );
}
