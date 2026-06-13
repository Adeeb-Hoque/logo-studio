import { useCallback, useMemo, useReducer } from "react";

const LIMIT = 100;

interface HistState<T> {
  past: T[];
  present: T;
  future: T[];
}

type Updater<T> = T | ((prev: T) => T);
type Action<T> =
  | { type: "set"; value: Updater<T> }
  | { type: "snapshot" }
  | { type: "commit"; value: Updater<T> }
  | { type: "undo" }
  | { type: "redo" };

function apply<T>(value: Updater<T>, prev: T): T {
  return typeof value === "function" ? (value as (p: T) => T)(prev) : value;
}

function reducer<T>(s: HistState<T>, a: Action<T>): HistState<T> {
  switch (a.type) {
    // Live edit — no history entry (used during a drag gesture).
    case "set":
      return { ...s, present: apply(a.value, s.present) };
    // Record a restore point at the present value (call once at gesture start).
    case "snapshot":
      return { past: [...s.past, s.present].slice(-LIMIT), present: s.present, future: [] };
    // Discrete change — snapshot the old value, then apply the new one.
    case "commit":
      return {
        past: [...s.past, s.present].slice(-LIMIT),
        present: apply(a.value, s.present),
        future: [],
      };
    case "undo": {
      if (s.past.length === 0) return s;
      const prev = s.past[s.past.length - 1];
      return { past: s.past.slice(0, -1), present: prev, future: [s.present, ...s.future] };
    }
    case "redo": {
      if (s.future.length === 0) return s;
      const next = s.future[0];
      return { past: [...s.past, s.present], present: next, future: s.future.slice(1) };
    }
  }
}

export interface History<T> {
  state: T;
  /** Live update without a history entry (drag streams). */
  set: (value: Updater<T>) => void;
  /**
   * Record a restore point at the current value. Call once at the start of a
   * continuous gesture (the caller is responsible for not over-calling it).
   */
  snapshot: () => void;
  /** Discrete change: snapshot the old value then apply the new (one entry). */
  commit: (value: Updater<T>) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useHistory<T>(initial: T): History<T> {
  const [s, dispatch] = useReducer(
    reducer as (st: HistState<T>, a: Action<T>) => HistState<T>,
    { past: [], present: initial, future: [] },
  );

  const set = useCallback((value: Updater<T>) => dispatch({ type: "set", value }), []);
  const snapshot = useCallback(() => dispatch({ type: "snapshot" }), []);
  const commit = useCallback((value: Updater<T>) => dispatch({ type: "commit", value }), []);
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);

  return useMemo(
    () => ({
      state: s.present,
      set,
      snapshot,
      commit,
      undo,
      redo,
      canUndo: s.past.length > 0,
      canRedo: s.future.length > 0,
    }),
    [s.present, s.past.length, s.future.length, set, snapshot, commit, undo, redo],
  );
}
