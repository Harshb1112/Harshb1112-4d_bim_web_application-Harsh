# View Site (LIVE) - 360° Construction Site Monitoring

## Overview

The **View Site** feature provides a comprehensive real-time and historical view of construction sites through **Hikvision pole-mounted 360° cameras**. 

> "Live 360° site view powered by a Hikvision pole-mounted camera. Login required."

Users can:
- Watch **LIVE 360° video** from site cameras
- View **historical captures** and timelapse
- Track **daily costs** and expenses
- Monitor **construction progress**
- See **upcoming tasks** and schedule
- Navigate through time with an interactive timeline

## Login Required

**Sign in to view the live site**

You must be logged in to access the live 360° camera feed and historical timelapse. Unauthorized users cannot view the site.

## Features

### 1. Live 360° Camera View (Hikvision)
- Full 360° panoramic view of the construction site
- Real-time footage from **Hikvision pole-mounted 360° camera**
- Drag to look around (front, back, left, right, up, down)
- Scroll to zoom in/out
- Compass indicator for orientation
- Date & Time overlay on the live video
- Support for multiple camera brands:
  - **Hikvision PanoVu** (Primary - Pole-mounted 360°)
  - Hikvision DS-2CD6986F-H
  - Dahua
  - Axis
  - Any RTSP/WebRTC compatible camera

### 2. Time-lapse Mode
- Play through historical captures
- Adjustable playback speed (0.5x to 4x)
- Timeline slider for date navigation
- Thumbnail preview of captures
- Day-by-day progress comparison

### 3. Cost Tracking
- Daily cost entries by category:
  - Labor
  - Materials
  - Equipment
  - Subcontractor
  - Overhead
- Total project cost summary
- Cost breakdown by category with percentages
- Add new cost entries directly from the viewer

### 4. Progress Monitoring
- Overall project progress percentage
- Active tasks for selected date
- Upcoming tasks (next 7 days)
- Daily work log with:
  - Work description
  - Team name
  - Worker count
  - Hours worked
  - Weather conditions
  - Issues/delays

### 5. Information Overlays
- Current date and time
- Weather conditions
- Camera information
- Progress percentage
- Cost summary

## Database Schema

### New Tables

```sql
-- Site Cameras
site_cameras (
  id, project_id, name, camera_type, brand, model,
  stream_url, snapshot_url, api_key, api_secret,
  location, latitude, longitude, altitude,
  is_active, is_live, last_ping_at, settings, created_at
)

-- Site Captures (360° photos/videos)
site_captures (
  id, project_id, camera_id, capture_type, url, thumbnail_url,
  file_size, duration, resolution, captured_at,
  weather, temperature, notes, metadata, is_processed, created_at
)

-- Daily Site Costs
daily_site_costs (
  id, project_id, date, category, description,
  quantity, unit, unit_cost, total_cost, currency,
  vendor, invoice_ref, notes, created_at
)

-- Daily Site Progress
daily_site_progress (
  id, project_id, date, work_description, team_name,
  workers_count, hours_worked, progress_percent,
  weather, issues, notes, created_at
)

-- Site View Logs (Audit Trail)
site_view_logs (
  id, project_id, user_id, view_type, capture_id,
  viewed_at, duration, ip_address, user_agent
)
```

## API Endpoints

### Site View Data
```
GET /api/site-view/[projectId]?date=YYYY-MM-DD
```
Returns complete site data including cameras, captures, costs, progress, and tasks.

### Cameras
```
GET  /api/site-view/[projectId]/cameras
POST /api/site-view/[projectId]/cameras
```

### Captures
```
GET  /api/site-view/[projectId]/captures?startDate=&endDate=&type=
POST /api/site-view/[projectId]/captures
```

### Costs
```
GET  /api/site-view/[projectId]/costs?date=YYYY-MM-DD
POST /api/site-view/[projectId]/costs
```

### Progress
```
GET  /api/site-view/[projectId]/progress?date=YYYY-MM-DD
POST /api/site-view/[projectId]/progress
```

## Camera Setup Guide

### Hikvision Pole-mounted 360° Camera (Recommended)

**Models Supported:**
- DS-2CD6986F-H (PanoVu 360°)
- DS-2CD6365G0E-IVS (Fisheye)
- DS-2CD6924F-IS (PanoVu)

**Setup Steps:**
1. Mount camera on pole at construction site (15-20m height recommended)
2. Connect camera to network (PoE or WiFi)
3. Get camera IP from Hikvision NVR or iVMS-4200 software
4. Configure in system:
   - **Main Stream:** `rtsp://admin:password@[IP]:554/Streaming/Channels/101`
   - **Panoramic 360°:** `rtsp://admin:password@[IP]:554/Streaming/Channels/103`
   - **Snapshot:** `http://admin:password@[IP]/ISAPI/Streaming/channels/103/picture`

### Hikvision PanoVu Specific
- Channel 101 = Main stream (high quality)
- Channel 102 = Sub stream (lower bandwidth)
- Channel 103 = Panoramic 360° view (recommended for View Site)

### Other Cameras

**Dahua:**
- Stream URL: `rtsp://admin:password@[IP]:554/cam/realmonitor?channel=1&subtype=0`

**Generic RTSP:**
1. Get RTSP stream URL from camera manual
2. Set up RTSP to WebRTC gateway (go2rtc recommended)
3. Configure gateway URL in system

## Components

```
components/view-site/
├── ViewSiteClient.tsx      # Main container component
├── Viewer360.tsx           # Three.js 360° viewer
├── TimelineSlider.tsx      # Timeline navigation
├── CostPanel.tsx           # Cost display and entry
├── ProgressPanel.tsx       # Progress display and logging
├── CameraSelector.tsx      # Camera management
├── AddCaptureDialog.tsx    # Upload captures
├── AddCostDialog.tsx       # Add cost entries
├── AddProgressDialog.tsx   # Log daily progress
└── index.ts                # Exports
```

## Usage

### Accessing View Site
1. Navigate to any project
2. Click the **"View Site (LIVE)"** button in the project header
3. Login is required (authentication enforced)

### Viewing Live Feed
1. Select a camera from the Cameras tab
2. The 360° viewer will show the live stream
3. Drag to look around, scroll to zoom

### Viewing Historical Data
1. Switch to "Time-lapse" mode
2. Use the timeline slider to select a date
3. Click play to watch the timelapse
4. Adjust speed as needed

### Adding Data
- **Captures**: Click "Add Capture" in Cameras tab
- **Costs**: Click "Add Cost Entry" in Costs tab
- **Progress**: Click "Log Daily Progress" in Progress tab

## Security

- JWT authentication required
- Role-based access control
- Audit logging of all views
- Signed media URLs for captures
- HTTPS for all API calls
- RTSP stream protection via tokens

## Demo Data

To seed demo data for testing:
```bash
node scripts/seed-view-site-demo.js
```

This creates:
- 3 demo cameras
- 30 days of captures
- 30 days of cost entries
- 30 days of progress logs

## Technology Stack

- **Frontend**: React, Three.js, Tailwind CSS
- **360° Rendering**: Three.js with SphereGeometry
- **Streaming**: WebRTC, RTSP (via gateway)
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma
- **Storage**: S3/GCS for captures (configurable)

## Real Hikvision Integration

### Option 1: Hik-Connect Cloud (Recommended)

For remote access to cameras from anywhere:

1. **Register on Hikvision Open Platform**
   - Go to https://open.hikvision.com/
   - Create developer account
   - Create an application to get `appKey` and `appSecret`

2. **Add Camera to Hik-Connect**
   - Download Hik-Connect app on mobile
   - Login with OneHikID
   - Add your camera using serial number or QR code

3. **Configure in .env**
   ```
   HIKVISION_APP_KEY="your-app-key"
   HIKVISION_APP_SECRET="your-app-secret"
   HIKVISION_API_URL="https://open.hik-connect.com"
   ```

4. **Add Camera in App**
   - Go to View Site → Cameras
   - Add camera with Hik-Connect device serial

### Option 2: Direct RTSP (Local Network)

For cameras on local network:

1. **Find Camera IP**
   - Use SADP Tool or check router
   - Default: 192.168.1.64

2. **Get RTSP URL**
   ```
   rtsp://admin:YourPassword@192.168.1.64:554/Streaming/Channels/101
   ```

3. **Setup RTSP to WebRTC Gateway**
   
   Install go2rtc (recommended):
   ```bash
   # Download from https://github.com/AlexxIT/go2rtc
   # Create go2rtc.yaml:
   streams:
     site_camera: rtsp://admin:password@192.168.1.64:554/Streaming/Channels/101
   
   # Run go2rtc
   ./go2rtc
   ```

4. **Configure in App**
   - Add camera with RTSP URL
   - Or use WebRTC URL: `http://localhost:8554/api/ws?src=site_camera`

### Hikvision Camera Models Supported

| Model | Type | Best For |
|-------|------|----------|
| DS-2CD6986F-H | PanoVu 360° | Full site panoramic view |
| DS-2CD6365G0E-IVS | Fisheye | Indoor 360° |
| DS-2CD2T87G2-L | Bullet | Fixed angle monitoring |
| DS-2DE4425IW-DE | PTZ | Remote controlled view |

## Future Enhancements

- [ ] AI-powered progress detection from images
- [ ] Automatic cost estimation from visual analysis
- [ ] VR headset support
- [ ] Multi-camera split view
- [ ] Annotation tools on 360° images
- [ ] Integration with BIM model overlay
- [ ] Mobile app with offline support
- [ ] Push notifications for site events
