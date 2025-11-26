# 4D Simulation - Architecture & Data Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     4D Simulation Feature                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │     FourDSimulation.tsx (Main)          │
        │  - Manages simulation state             │
        │  - Fetches data from API                │
        │  - Controls 3D viewer                   │
        │  - Coordinates child components         │
        └─────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────────┐   ┌─────────────────┐
│ SpeckleViewer│    │SimulationControl │   │TaskInformation  │
│              │    │                  │   │Panel            │
│ - 3D Model   │    │ - Play/Pause     │   │                 │
│ - Colors     │    │ - Timeline       │   │ - Active Tasks  │
│ - Visibility │    │ - Speed Control  │   │ - Task Details  │
│ - Legend     │    │ - Mode Toggle    │   │ - Progress Info │
└──────────────┘    └──────────────────┘   └─────────────────┘
```

## Data Flow Diagram

```
┌──────────────┐
│   Database   │
│              │
│ - Tasks      │
│ - Elements   │
│ - Links      │
└──────┬───────┘
       │
       │ API Calls
       │
       ▼
┌──────────────────────────────────────┐
│  FourDSimulation Component           │
│                                      │
│  State:                              │
│  - links: ElementTaskLink[]          │
│  - tasks: Task[]                     │
│  - currentDate: Date                 │
│  - isPlaying: boolean                │
│  - mode: 'planned' | 'actual'        │
│  - activeTasks: Task[]               │
│  - selectedTask: Task | null         │
└──────────────┬───────────────────────┘
               │
               │ useEffect (on currentDate change)
               │
               ▼
┌──────────────────────────────────────┐
│  Element Visibility Calculation      │
│                                      │
│  For each link:                      │
│  1. Get task dates                   │
│  2. Check if currentDate in range    │
│  3. Check task progress > 0%         │
│  4. Calculate expected progress      │
│  5. Determine color                  │
│  6. Set visibility                   │
└──────────────┬───────────────────────┘
               │
               ├─────────────────┬─────────────────┐
               │                 │                 │
               ▼                 ▼                 ▼
       ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
       │ 3D Viewer    │  │ Controls     │  │ Task Panel   │
       │              │  │              │  │              │
       │ Update:      │  │ Display:     │  │ Show:        │
       │ - Colors     │  │ - Date       │  │ - Active     │
       │ - Visibility │  │ - Progress   │  │ - Details    │
       └──────────────┘  └──────────────┘  └──────────────┘
```

## Component Hierarchy

```
FourDSimulation
├── Header
│   ├── Title & Description
│   └── Action Buttons
│       ├── Refresh Data
│       └── Toggle Critical Path
│
├── Grid Layout (4 columns)
│   │
│   ├── 3D Viewer (2 columns)
│   │   ├── SpeckleViewer
│   │   │   ├── Three.js Scene
│   │   │   ├── Camera Controls
│   │   │   └── Object Rendering
│   │   │
│   │   ├── Date Display (Header)
│   │   └── Color Legend (Overlay)
│   │
│   └── Right Panel (2 columns)
│       │
│       ├── SimulationControl
│       │   ├── Play/Pause/Reset Buttons
│       │   ├── Mode Toggle (Planned/Actual)
│       │   ├── Current Date Display
│       │   ├── Timeline Slider
│       │   ├── Playback Speed Slider
│       │   └── Milestone Buttons
│       │
│       ├── TaskInformationPanel
│       │   ├── Active Tasks List
│       │   │   └── Task Cards (clickable)
│       │   │
│       │   └── Selected Task Details
│       │       ├── Name & Status Badge
│       │       ├── Progress Bar
│       │       ├── Planned Dates Panel
│       │       ├── Actual Dates Panel
│       │       ├── Element Count
│       │       └── Resource Info
│       │
│       └── Export & Capture
│           ├── Screenshot Button
│           ├── Record Video Button
│           └── Export Button
```

## State Management

```
┌─────────────────────────────────────────┐
│         Component State                  │
├─────────────────────────────────────────┤
│                                          │
│  Data State:                             │
│  ├── links: Link[]                       │
│  ├── tasks: Task[]                       │
│  ├── projectTimeframe: {start, end}     │
│  ├── milestones: Milestone[]            │
│  └── criticalPathTasks: Set<number>     │
│                                          │
│  Simulation State:                       │
│  ├── currentDate: Date                   │
│  ├── isPlaying: boolean                  │
│  ├── playbackSpeed: number               │
│  └── mode: 'planned' | 'actual'          │
│                                          │
│  UI State:                               │
│  ├── activeTasks: Task[]                 │
│  ├── selectedTask: Task | null           │
│  ├── showCriticalPath: boolean           │
│  ├── isRecording: boolean                │
│  └── loadingData: boolean                │
│                                          │
│  Refs:                                   │
│  ├── viewerRef: SpeckleViewerRef         │
│  ├── viewerCanvasRef: HTMLCanvasElement  │
│  └── videoRecorderRef: VideoRecorder     │
│                                          │
└─────────────────────────────────────────┘
```

## Element Visibility Algorithm

```
┌─────────────────────────────────────────┐
│  Input: currentDate, link, mode          │
└─────────────────┬───────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │ Get Task Dates │
         │ - startDate    │
         │ - endDate      │
         │ - progress     │
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────────┐
         │ Is currentDate     │
         │ before startDate?  │
         └────────┬───────────┘
                  │
         ┌────────┴────────┐
         │                 │
        YES               NO
         │                 │
         ▼                 ▼
    ┌────────┐    ┌────────────────┐
    │ HIDE   │    │ Is currentDate │
    │ Element│    │ after endDate? │
    └────────┘    └────────┬───────┘
                           │
                  ┌────────┴────────┐
                  │                 │
                 YES               NO
                  │                 │
                  ▼                 ▼
         ┌────────────────┐  ┌──────────────┐
         │ Is progress    │  │ Is progress  │
         │ >= 100%?       │  │ > 0%?        │
         └────────┬───────┘  └──────┬───────┘
                  │                 │
         ┌────────┴────────┐       │
         │                 │       │
        YES               NO       │
         │                 │       │
         ▼                 ▼       ▼
    ┌────────┐      ┌────────┐  ┌──────────────┐
    │ SHOW   │      │ HIDE   │  │ Calculate    │
    │ GREEN  │      │ Element│  │ Expected     │
    └────────┘      └────────┘  │ Progress     │
                                └──────┬───────┘
                                       │
                              ┌────────┴────────┐
                              │                 │
                    Actual >= Expected    Actual < Expected
                              │                 │
                              ▼                 ▼
                         ┌────────┐        ┌────────┐
                         │ SHOW   │        │ SHOW   │
                         │ BLUE   │        │ ORANGE │
                         └────────┘        └────────┘
```

## Color Coding Logic

```
┌─────────────────────────────────────────────────────────┐
│                    Color Decision Tree                   │
└─────────────────────────────────────────────────────────┘

Task Progress = 0%
    └─> GREY (Not Started / Hidden)

Task Progress > 0% AND currentDate < startDate
    └─> GREY (Hidden - not started yet)

Task Progress > 0% AND currentDate >= startDate AND currentDate <= endDate
    ├─> Progress >= 100%
    │   └─> GREEN (Completed)
    │
    ├─> Progress >= Expected Progress
    │   └─> BLUE (On Track)
    │
    └─> Progress < Expected Progress
        └─> ORANGE (Behind Schedule)

Task Progress > 0% AND currentDate > endDate
    ├─> Progress >= 100%
    │   └─> GREEN (Completed)
    │
    └─> Progress < 100%
        └─> ORANGE (Delayed)

Critical Path Task (when enabled)
    └─> RED (Critical)

Where:
    Expected Progress = (Days Passed / Total Days) * 100
    Days Passed = currentDate - startDate
    Total Days = endDate - startDate
```

## API Integration

```
┌─────────────────────────────────────────┐
│           API Endpoints                  │
├─────────────────────────────────────────┤
│                                          │
│  GET /api/links?projectId={id}          │
│  Returns:                                │
│  {                                       │
│    links: [                              │
│      {                                   │
│        id: number                        │
│        element: { guid: string }         │
│        task: {                           │
│          id: number                      │
│          name: string                    │
│          startDate: string               │
│          endDate: string                 │
│          actualStartDate?: string        │
│          actualEndDate?: string          │
│          progress: number                │
│          status: string                  │
│        }                                 │
│        startDate?: string                │
│        endDate?: string                  │
│      }                                   │
│    ]                                     │
│  }                                       │
│                                          │
│  GET /api/projects/{id}/tasks            │
│  Returns:                                │
│  {                                       │
│    tasks: [                              │
│      {                                   │
│        id: number                        │
│        name: string                      │
│        description?: string              │
│        startDate: string                 │
│        endDate: string                   │
│        actualStartDate?: string          │
│        actualEndDate?: string            │
│        progress: number                  │
│        status: string                    │
│        durationDays: number              │
│        elementLinks: Link[]              │
│        predecessors: Dependency[]        │
│      }                                   │
│    ]                                     │
│  }                                       │
│                                          │
└─────────────────────────────────────────┘
```

## Database Schema

```
┌─────────────────────────────────────────┐
│              Tasks Table                 │
├─────────────────────────────────────────┤
│ id                 INT (PK)              │
│ projectId          INT (FK)              │
│ name               VARCHAR               │
│ description        TEXT                  │
│ startDate          DATETIME              │
│ endDate            DATETIME              │
│ actualStartDate    DATETIME (nullable)   │
│ actualEndDate      DATETIME (nullable)   │
│ progress           FLOAT (0-100)         │
│ status             VARCHAR               │
│ durationDays       INT                   │
└─────────────────────────────────────────┘
                     │
                     │ 1:N
                     │
                     ▼
┌─────────────────────────────────────────┐
│         ElementTaskLinks Table           │
├─────────────────────────────────────────┤
│ id                 INT (PK)              │
│ elementId          INT (FK)              │
│ taskId             INT (FK)              │
│ linkType           VARCHAR               │
│ status             VARCHAR               │
│ startDate          DATETIME (nullable)   │
│ endDate            DATETIME (nullable)   │
└─────────────────────────────────────────┘
                     │
                     │ N:1
                     │
                     ▼
┌─────────────────────────────────────────┐
│            Elements Table                │
├─────────────────────────────────────────┤
│ id                 INT (PK)              │
│ guid               VARCHAR (unique)      │
│ name               VARCHAR               │
│ type               VARCHAR               │
│ properties         JSON                  │
└─────────────────────────────────────────┘
```

## Performance Considerations

```
┌─────────────────────────────────────────┐
│         Optimization Strategies          │
├─────────────────────────────────────────┤
│                                          │
│  1. Data Fetching                        │
│     - Fetch once on mount                │
│     - Poll every 10 seconds              │
│     - Cache in component state           │
│                                          │
│  2. Rendering                            │
│     - Use useMemo for calculations       │
│     - Debounce slider changes            │
│     - Batch 3D viewer updates            │
│                                          │
│  3. 3D Viewer                            │
│     - Isolate/ghost instead of remove    │
│     - Batch color updates                │
│     - Limit visible objects              │
│                                          │
│  4. Animation                            │
│     - Use requestAnimationFrame          │
│     - Clear intervals on unmount         │
│     - Throttle updates at high speeds    │
│                                          │
└─────────────────────────────────────────┘
```

## Error Handling

```
┌─────────────────────────────────────────┐
│          Error Scenarios                 │
├─────────────────────────────────────────┤
│                                          │
│  1. API Failures                         │
│     - Show error toast                   │
│     - Retry with exponential backoff     │
│     - Fallback to cached data            │
│                                          │
│  2. Missing Data                         │
│     - Show empty state                   │
│     - Provide helpful message            │
│     - Suggest actions                    │
│                                          │
│  3. Invalid Dates                        │
│     - Validate on input                  │
│     - Show warning                       │
│     - Use fallback values                │
│                                          │
│  4. 3D Viewer Issues                     │
│     - Catch rendering errors             │
│     - Offer external viewer option       │
│     - Log to console                     │
│                                          │
└─────────────────────────────────────────┘
```

## Testing Strategy

```
┌─────────────────────────────────────────┐
│            Test Coverage                 │
├─────────────────────────────────────────┤
│                                          │
│  Unit Tests:                             │
│  ├── Element visibility calculation      │
│  ├── Color determination logic           │
│  ├── Date formatting functions           │
│  ├── Progress calculation                │
│  └── Variance calculation                │
│                                          │
│  Integration Tests:                      │
│  ├── API data fetching                   │
│  ├── Component communication             │
│  ├── State updates                       │
│  └── 3D viewer integration               │
│                                          │
│  E2E Tests:                              │
│  ├── Full simulation playback            │
│  ├── Task selection flow                 │
│  ├── Mode switching                      │
│  ├── Export functionality                │
│  └── Responsive behavior                 │
│                                          │
└─────────────────────────────────────────┘
```

## Deployment Checklist

```
┌─────────────────────────────────────────┐
│        Pre-Deployment Checks             │
├─────────────────────────────────────────┤
│                                          │
│  ✓ All TypeScript errors resolved        │
│  ✓ ESLint warnings addressed             │
│  ✓ Components render without errors      │
│  ✓ API endpoints tested                  │
│  ✓ Database migrations applied           │
│  ✓ Browser compatibility verified        │
│  ✓ Performance benchmarks met            │
│  ✓ Documentation complete                │
│  ✓ User guide created                    │
│  ✓ Training materials prepared           │
│                                          │
└─────────────────────────────────────────┘
```

---

**Document Version**: 1.0  
**Last Updated**: November 25, 2025  
**Status**: Complete
