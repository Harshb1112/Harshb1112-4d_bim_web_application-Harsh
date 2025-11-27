// lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  parseISO,
  differenceInDays,
  addDays,
  isBefore,
  isAfter,
} from "date-fns";

/* ----------------------------- Basic utilities --------------------------- */

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = toDate(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = toDate(date);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function downloadFile(blob: Blob, filename: string, p0: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  // append/click/remove to trigger download
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function calculateProgress(tasks: Array<{ progress?: number | string }>): number {
  if (!tasks || tasks.length === 0) return 0;
  const total = tasks.reduce((sum, task) => sum + Number(task.progress ?? 0), 0);
  return Math.round(total / tasks.length);
}

/* ------------------------------- Date helpers ---------------------------- */

/**
 * Convert a Date|string to a Date instance.
 * - If input is Date -> returned as-is
 * - If input is ISO string -> parsed via parseISO
 * - Otherwise -> new Date(input) (fallback)
 *
 * parseISO will often produce an "Invalid Date" for non-ISO strings;
 * new Date(string) is used as fallback for other string formats.
 */
export function toDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    try {
      // parseISO for strict ISO strings
      const parsed = parseISO(value);
      if (!isNaN(parsed.getTime())) return parsed;
    } catch {
      // fallthrough to Date below
    }
    return new Date(value);
  }
  // If someone calls with something unexpected, fallback to epoch date creation
  return new Date(value as unknown as string);
}

/* --------------------------- Critical Path Types ------------------------- */

export interface PredecessorRef {
  predecessor: { id: number };
}

export interface TaskForCriticalPath {
  id: number;
  name?: string;
  // startDate and endDate may be Date or ISO string
  startDate: Date | string;
  endDate: Date | string;
  // optional: duration in days; if missing it will be computed from start/end
  durationDays?: number;
  // simple predecessor list: [{ predecessor: { id: 3 }}, ...]
  predecessors: PredecessorRef[];
}

export interface TaskTiming {
  es: Date; // earliest start
  ef: Date; // earliest finish
  ls: Date; // latest start
  lf: Date; // latest finish
  float: number; // days
}

export interface CriticalPathResult {
  criticalTasks: Set<number>;
  taskData: Map<number, TaskTiming>;
}

/* ------------------------- calculateCriticalPath ------------------------- */

/**
 * Calculates the critical path using Forward and Backward passes (CPM).
 *
 * - Assumes Finish-to-Start (FS) predecessor relations.
 * - If durationDays is not supplied for a task, it's computed as differenceInDays(end, start).
 * - Returns set of critical task ids (float <= 0) and a map of timing data per task.
 */
export function calculateCriticalPath(tasksInput: TaskForCriticalPath[]): CriticalPathResult {
  // Defensive copy
  const tasks = tasksInput.map((t) => ({ ...t }));

  if (tasks.length === 0) {
    return { criticalTasks: new Set(), taskData: new Map() };
  }

  // Normalized task type used internally (all fields concrete)
  type NormalizedTask = {
    id: number;
    name: string;
    startDate: Date;
    endDate: Date;
    durationDays: number;
    predecessors: PredecessorRef[];
  };

  const taskMap = new Map<number, NormalizedTask>();

  // Build normalized task map
  tasks.forEach((t) => {
    const start = toDate(t.startDate);
    const end = toDate(t.endDate);
    const computedDuration =
      typeof t.durationDays === "number" ? t.durationDays : Math.max(0, differenceInDays(end, start));
    taskMap.set(t.id, {
      id: t.id,
      name: t.name ?? "",
      startDate: start,
      endDate: end,
      durationDays: computedDuration,
      predecessors: t.predecessors ?? [],
    });
  });

  // adjacency: predecessor -> [successor ids]
  const adj = new Map<number, number[]>();
  // inDegree: node -> number of incoming edges
  const inDegree = new Map<number, number>();

  // initialize maps for every known node id
  Array.from(taskMap.keys()).forEach((id) => {
    adj.set(id, []);
    inDegree.set(id, 0);
  });

  // fill adjacency & in-degree
  taskMap.forEach((task) => {
    task.predecessors.forEach((p) => {
      const predId = p.predecessor.id;
      // ensure predecessor exists as a key so adjacency works even if pred isn't in taskMap
      if (!adj.has(predId)) adj.set(predId, []);
      if (!inDegree.has(task.id)) inDegree.set(task.id, 0);
      adj.get(predId)!.push(task.id);
      inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
    });
  });

  // Forward pass: compute ES and EF
  const es = new Map<number, Date>();
  const ef = new Map<number, Date>();
  const q: number[] = [];

  // initialize queue with root tasks (no predecessors)
  taskMap.forEach((task) => {
    if ((inDegree.get(task.id) ?? 0) === 0) {
      q.push(task.id);
      es.set(task.id, task.startDate);
      ef.set(task.id, addDays(task.startDate, task.durationDays));
    }
  });

  let forwardHead = 0;
  while (forwardHead < q.length) {
    const u = q[forwardHead++];
    const uTask = taskMap.get(u)!;
    const uEf = ef.get(u)!;

    const successors = adj.get(u) ?? [];
    for (const v of successors) {
      const vTask = taskMap.get(v)!;
      // For FS dependency: successor ES must be at least predecessor EF
      const candidateEs = uEf;
      const currentEs = es.get(v);
      // choose later ES
      if (!currentEs || isBefore(currentEs, candidateEs)) {
        es.set(v, candidateEs);
        ef.set(v, addDays(candidateEs, vTask.durationDays));
      }
      // decrement in-degree
      inDegree.set(v, (inDegree.get(v) || 0) - 1);
      if ((inDegree.get(v) || 0) === 0) {
        // fallback if ES never set
        if (!es.has(v)) {
          es.set(v, vTask.startDate);
          ef.set(v, addDays(vTask.startDate, vTask.durationDays));
        }
        q.push(v);
      }
    }
  }

  // Ensure ES/EF exist for tasks not visited (cycles or disconnected)
  taskMap.forEach((task) => {
    if (!es.has(task.id)) {
      es.set(task.id, task.startDate);
      ef.set(task.id, addDays(task.startDate, task.durationDays));
    }
  });

  // project finish date is max EF
  const efValues = Array.from(ef.values());
  const projectFinishDate =
    efValues.length > 0 ? new Date(Math.max(...efValues.map((d) => d.getTime()))) : new Date();

  // Backward pass: compute LF and LS
  const lf = new Map<number, Date>();
  const ls = new Map<number, Date>();

  // initialize LF/LS to projectFinishDate
  taskMap.forEach((task) => {
    lf.set(task.id, projectFinishDate);
    ls.set(task.id, addDays(projectFinishDate, -task.durationDays));
  });

  // Build reverse adjacency (node -> predecessors) and out-degree (node -> number of outgoing edges)
  const reverseAdj = new Map<number, number[]>();
  const outDegree = new Map<number, number>();

  Array.from(taskMap.keys()).forEach((id) => {
    reverseAdj.set(id, []);
    outDegree.set(id, 0);
  });

  taskMap.forEach((task) => {
    task.predecessors.forEach((p) => {
      const predId = p.predecessor.id;
      if (!reverseAdj.has(task.id)) reverseAdj.set(task.id, []);
      reverseAdj.get(task.id)!.push(predId);
      outDegree.set(predId, (outDegree.get(predId) || 0) + 1);
    });
  });

  // reverseQueue: nodes with no outgoing edges (sinks)
  const reverseQueue: number[] = [];
  taskMap.forEach((task) => {
    if ((outDegree.get(task.id) ?? 0) === 0) {
      reverseQueue.push(task.id);
      // For sinks set LF = EF (makes backward pass tighter)
      lf.set(task.id, ef.get(task.id)!);
      ls.set(task.id, addDays(ef.get(task.id)!, -task.durationDays));
    }
  });

  let backwardHead = 0;
  while (backwardHead < reverseQueue.length) {
    const u = reverseQueue[backwardHead++];
    const uTask = taskMap.get(u)!;
    const uLs = ls.get(u)!;

    const preds = reverseAdj.get(u) ?? [];
    for (const v of preds) {
      const vTask = taskMap.get(v)!;
      // v must finish before u starts (FS) so candidate LF for v is uLs
      const candidateLf = uLs;
      const currentLf = lf.get(v);
      // choose earlier LF (tighten schedule)
      if (!currentLf || isBefore(candidateLf, currentLf)) {
        lf.set(v, candidateLf);
        ls.set(v, addDays(candidateLf, -vTask.durationDays));
      }

      outDegree.set(v, (outDegree.get(v) || 0) - 1);
      if ((outDegree.get(v) || 0) === 0) {
        reverseQueue.push(v);
      }
    }
  }

  // Ensure LF/LS exist for any remaining nodes
  taskMap.forEach((task) => {
    if (!lf.has(task.id)) {
      lf.set(task.id, ef.get(task.id)!);
      ls.set(task.id, addDays(ef.get(task.id)!, -task.durationDays));
    }
  });

  // Step 4: Compute float and critical tasks
  const criticalTasks = new Set<number>();
  const fullTaskData = new Map<number, TaskTiming>();

  taskMap.forEach((task) => {
    const taskEs = es.get(task.id)!;
    const taskEf = ef.get(task.id)!;
    const taskLs = ls.get(task.id)!;
    const taskLf = lf.get(task.id)!;

    // Float (total float) in days: LF - EF
    const floatDays = differenceInDays(taskLf, taskEf);

    if (floatDays <= 0) {
      criticalTasks.add(task.id);
    }

    fullTaskData.set(task.id, {
      es: taskEs,
      ef: taskEf,
      ls: taskLs,
      lf: taskLf,
      float: floatDays,
    });
  });

  return { criticalTasks, taskData: fullTaskData };
}
