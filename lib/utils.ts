import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { parseISO, differenceInDays, addDays, isBefore, isAfter } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function downloadFile(blob: Blob, filename: string, p0?: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function calculateProgress(tasks: any[]): number {
  if (!tasks.length) return 0
  const total = tasks.reduce((sum, task) => sum + Number(task.progress), 0)
  return Math.round(total / tasks.length)
}

interface TaskForCriticalPath {
  id: number;
  name: string;
  startDate: Date;
  endDate: Date;
  durationDays: number;
  predecessors: Array<{ predecessor: { id: number } }>;
}

interface CriticalPathResult {
  criticalTasks: Set<number>;
  taskData: Map<number, { es: Date; ef: Date; ls: Date; lf: Date; float: number }>;
}

export function calculateCriticalPath(tasks: TaskForCriticalPath[]): CriticalPathResult {
  if (tasks.length === 0) {
    return { criticalTasks: new Set(), taskData: new Map() };
  }

  const taskMap = new Map<number, TaskForCriticalPath>();
  tasks.forEach(task => taskMap.set(task.id, {
    ...task,
    startDate: parseISO(task.startDate.toISOString()), // Ensure Date objects
    endDate: parseISO(task.endDate.toISOString()),     // Ensure Date objects
  }));

  // Step 1: Build adjacency list and in-degrees for topological sort
  const adj: Map<number, number[]> = new Map();
  const inDegree: Map<number, number> = new Map();

  tasks.forEach(task => {
    adj.set(task.id, []);
    inDegree.set(task.id, 0);
  });

  tasks.forEach(task => {
    task.predecessors.forEach(dep => {
      const predId = dep.predecessor.id;
      if (adj.has(predId)) {
        adj.get(predId)?.push(task.id);
        inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
      }
    });
  });

  // Step 2: Forward Pass (Earliest Start/Finish)
  const queue: number[] = [];
  const es: Map<number, Date> = new Map(); // Earliest Start
  const ef: Map<number, Date> = new Map(); // Earliest Finish

  tasks.forEach(task => {
    if (inDegree.get(task.id) === 0) {
      queue.push(task.id);
      es.set(task.id, task.startDate);
      ef.set(task.id, task.endDate);
    }
  });

  let head = 0;
  while (head < queue.length) {
    const u = queue[head++];
    const uTask = taskMap.get(u)!;

    adj.get(u)?.forEach(v => {
      const vTask = taskMap.get(v)!;
      const newEs = addDays(ef.get(uTask.id)!, 0); // FS dependency, so v starts when u finishes
      
      if (!es.has(v) || isBefore(es.get(v)!, newEs)) {
        es.set(v, newEs);
        ef.set(v, addDays(newEs, vTask.durationDays));
      }

      inDegree.set(v, (inDegree.get(v)! || 0) - 1);
      if (inDegree.get(v) === 0) {
        queue.push(v);
      }
    });
  }

  // Step 3: Backward Pass (Latest Start/Finish)
  const ls: Map<number, Date> = new Map(); // Latest Start
  const lf: Map<number, Date> = new Map(); // Latest Finish

  const projectFinishDate = new Date(Math.max(...Array.from(ef.values()).map(d => d.getTime())));

  tasks.forEach(task => {
    lf.set(task.id, projectFinishDate);
    ls.set(task.id, addDays(projectFinishDate, -task.durationDays));
  });

  // Re-initialize in-degrees for reverse topological sort (or use a stack from forward pass)
  const reverseAdj: Map<number, number[]> = new Map();
  const outDegree: Map<number, number> = new Map();

  tasks.forEach(task => {
    reverseAdj.set(task.id, []);
    outDegree.set(task.id, 0);
  });

  tasks.forEach(task => {
    task.predecessors.forEach(dep => {
      const predId = dep.predecessor.id;
      if (reverseAdj.has(task.id)) {
        reverseAdj.get(task.id)?.push(predId);
        outDegree.set(predId, (outDegree.get(predId) || 0) + 1);
      }
    });
  });

  const reverseQueue: number[] = [];
  tasks.forEach(task => {
    if (outDegree.get(task.id) === 0) {
      reverseQueue.push(task.id);
    }
  });

  let head = 0;
  while (head < reverseQueue.length) {
    const u = reverseQueue[head++];
    const uTask = taskMap.get(u)!;

    reverseAdj.get(u)?.forEach(v => {
      const vTask = taskMap.get(v)!;
      const newLf = addDays(ls.get(uTask.id)!, 0); // FS dependency, so v must finish before u starts
      
      if (!lf.has(v) || isBefore(newLf, lf.get(v)!)) {
        lf.set(v, newLf);
        ls.set(v, addDays(newLf, -vTask.durationDays));
      }

      outDegree.set(v, (outDegree.get(v)! || 0) - 1);
      if (outDegree.get(v) === 0) {
        reverseQueue.push(v);
      }
    });
  }

  // Step 4: Calculate Float and Identify Critical Path
  const criticalTasks = new Set<number>();
  const fullTaskData = new Map<number, { es: Date; ef: Date; ls: Date; lf: Date; float: number }>();

  tasks.forEach(task => {
    const taskEs = es.get(task.id) || task.startDate;
    const taskEf = ef.get(task.id) || task.endDate;
    const taskLs = ls.get(task.id) || task.startDate;
    const taskLf = lf.get(task.id) || task.endDate;

    const float = differenceInDays(taskLf, taskEf); // Total Float = LF - EF

    if (float <= 0) { // Tasks with zero or negative float are critical
      criticalTasks.add(task.id);
    }
    fullTaskData.set(task.id, { es: taskEs, ef: taskEf, ls: taskLs, lf: taskLf, float });
  });

  return { criticalTasks, taskData: fullTaskData };
}