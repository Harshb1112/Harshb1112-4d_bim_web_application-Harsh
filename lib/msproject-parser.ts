import { XMLParser } from 'fast-xml-parser'

interface MSPTask {
  UID: number
  ID: number
  Name: string
  Start: string
  Finish: string
  Duration: string
  OutlineNumber?: string
  PredecessorLink?: Array<{ PredecessorUID: number; Type: number }> | { PredecessorUID: number; Type: number }
}

interface ParsedTask {
  uid: number
  name: string
  startDate: Date
  endDate: Date
  durationDays: number
  parentId?: number
}

interface ParsedDependency {
  predecessorUID: number
  successorUID: number
  type: string
}

const dependencyTypeMap: { [key: number]: string } = {
  0: 'FF', // Finish-to-Finish
  1: 'FS', // Finish-to-Start
  2: 'SF', // Start-to-Finish
  3: 'SS', // Start-to-Start
}

function parseDuration(duration: string): number {
  // PT8H0M0S -> 1 day, P1D... -> 1 day
  if (duration.includes('H')) {
    return 1 // Assume any hours-based duration is 1 day for simplicity
  }
  const match = duration.match(/P(\d+)D/)
  return match ? parseInt(match[1], 10) : 0
}

export function parseMSProjectXML(xmlData: string) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    textNodeName: '_text',
    parseAttributeValue: true,
  })
  const jsonObj = parser.parse(xmlData)
  const project = jsonObj.Project

  if (!project || !project.Tasks || !project.Tasks.Task) {
    throw new Error('Invalid MS Project XML format: Tasks not found.')
  }

  const mspTasks: MSPTask[] = Array.isArray(project.Tasks.Task) ? project.Tasks.Task : [project.Tasks.Task]
  
  const tasks: ParsedTask[] = []
  const dependencies: ParsedDependency[] = []
  const outlineMap = new Map<string, number>() // Map outline number to task UID

  // First pass: parse tasks and build outline map
  for (const task of mspTasks) {
    if (!task.Name || task.ID === 0) continue // Skip summary tasks or tasks without names

    const parsedTask: ParsedTask = {
      uid: task.UID,
      name: task.Name,
      startDate: new Date(task.Start),
      endDate: new Date(task.Finish),
      durationDays: parseDuration(task.Duration),
    }
    tasks.push(parsedTask)
    if (task.OutlineNumber) {
      outlineMap.set(task.OutlineNumber, task.UID)
    }
  }

  // Second pass: establish parent-child relationships and dependencies
  for (const task of mspTasks) {
    if (!task.Name || task.ID === 0) continue

    // Find parent
    if (task.OutlineNumber && task.OutlineNumber.includes('.')) {
      const parentOutline = task.OutlineNumber.substring(0, task.OutlineNumber.lastIndexOf('.'))
      const parentUID = outlineMap.get(parentOutline)
      if (parentUID) {
        const childTask = tasks.find(t => t.uid === task.UID)
        if (childTask) {
          childTask.parentId = parentUID
        }
      }
    }

    // Find dependencies
    if (task.PredecessorLink) {
      const links = Array.isArray(task.PredecessorLink) ? task.PredecessorLink : [task.PredecessorLink]
      for (const link of links) {
        dependencies.push({
          predecessorUID: link.PredecessorUID,
          successorUID: task.UID,
          type: dependencyTypeMap[link.Type] || 'FS',
        })
      }
    }
  }

  return { tasks, dependencies }
}