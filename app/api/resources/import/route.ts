import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import ExcelJS from 'exceljs'

// Market rates for auto-fill
const MARKET_RATES: Record<string, { hourly: number; daily: number; unit: string }> = {
  'mason': { hourly: 100, daily: 800, unit: 'person' },
  'carpenter': { hourly: 90, daily: 720, unit: 'person' },
  'plumber': { hourly: 100, daily: 800, unit: 'person' },
  'electrician': { hourly: 110, daily: 880, unit: 'person' },
  'painter': { hourly: 80, daily: 640, unit: 'person' },
  'welder': { hourly: 120, daily: 960, unit: 'person' },
  'helper': { hourly: 50, daily: 400, unit: 'person' },
  'supervisor': { hourly: 150, daily: 1200, unit: 'person' },
  'site engineer': { hourly: 200, daily: 1600, unit: 'person' },
  'foreman': { hourly: 125, daily: 1000, unit: 'person' },
  'jcb': { hourly: 1500, daily: 12000, unit: 'machine' },
  'crane': { hourly: 2500, daily: 20000, unit: 'machine' },
  'concrete mixer': { hourly: 300, daily: 2400, unit: 'machine' },
  'excavator': { hourly: 2000, daily: 16000, unit: 'machine' },
  'bulldozer': { hourly: 2200, daily: 17600, unit: 'machine' },
  'scaffolding': { hourly: 50, daily: 400, unit: 'set' },
  'generator': { hourly: 200, daily: 1600, unit: 'machine' },
  'cement': { hourly: 0, daily: 380, unit: 'bag' },
  'steel': { hourly: 0, daily: 65, unit: 'kg' },
  'sand': { hourly: 0, daily: 60, unit: 'cft' },
  'bricks': { hourly: 0, daily: 8, unit: 'piece' },
  'concrete': { hourly: 0, daily: 5500, unit: 'cum' },
  'tiles': { hourly: 0, daily: 45, unit: 'sqft' },
  'paint': { hourly: 0, daily: 250, unit: 'liter' },
}

function getMarketRate(name: string) {
  const nameLower = name.toLowerCase()
  for (const [key, rates] of Object.entries(MARKET_RATES)) {
    if (nameLower.includes(key) || key.includes(nameLower)) {
      return rates
    }
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const projectIdStr = formData.get('projectId') as string
    const projectId = parseInt(projectIdStr)

    console.log('Import request:', { 
      hasFile: !!file, 
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
      projectIdStr, 
      projectId,
      isValidProjectId: !isNaN(projectId) && projectId > 0
    })

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    if (!projectIdStr || isNaN(projectId) || projectId <= 0) {
      return NextResponse.json({ error: 'Valid projectId is required' }, { status: 400 })
    }

    // Read Excel or CSV file
    const buffer = await file.arrayBuffer()
    
    if (buffer.byteLength === 0) {
      return NextResponse.json({ 
        error: 'File is empty or could not be read' 
      }, { status: 400 })
    }
    
    const workbook = new ExcelJS.Workbook()
    
    // Check file type and load accordingly
    const fileName = file.name.toLowerCase()
    if (fileName.endsWith('.csv')) {
      // Parse CSV - use readFile method with stream
      const { Readable } = await import('stream')
      const textDecoder = new TextDecoder('utf-8')
      const csvText = textDecoder.decode(buffer)
      const stream = Readable.from([csvText])
      await workbook.csv.read(stream)
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // Parse Excel
      await workbook.xlsx.load(buffer)
    } else {
      return NextResponse.json({ 
        error: 'Invalid file type. Please upload .xlsx, .xls, or .csv file' 
      }, { status: 400 })
    }

    const worksheet = workbook.worksheets[0]
    if (!worksheet) {
      return NextResponse.json({ error: 'No worksheet found' }, { status: 400 })
    }

    const resources: any[] = []
    let headerRow: string[] = []
    let rowCount = 0

    worksheet.eachRow((row, rowNumber) => {
      const values = row.values as any[]
      rowCount++
      
      // First row is header
      if (rowNumber === 1) {
        headerRow = values.slice(1).map(v => String(v || '').toLowerCase().trim())
        console.log('CSV Headers:', headerRow)
        return
      }

      // Parse data rows
      const rowData: Record<string, any> = {}
      values.slice(1).forEach((val, idx) => {
        const header = headerRow[idx]
        if (header) {
          rowData[header] = val
        }
      })

      // Get name (required)
      const name = rowData['name'] || rowData['resource'] || rowData['resource name'] || rowData['resource_name']
      if (!name) {
        console.log(`Row ${rowNumber}: Skipping - no name found`, rowData)
        return
      }

      // Get type
      let type = (rowData['type'] || rowData['category'] || 'labor').toString().toLowerCase()
      if (!['labor', 'equipment', 'material', 'subcontractor'].includes(type)) {
        type = 'labor'
      }

      // Get rates - use provided or auto-fill from market rates
      const marketRates = getMarketRate(name.toString())
      
      const hourlyRate = rowData['hourlyrate'] || rowData['hourly rate'] || rowData['hourly'] || rowData['hourly_rate'] || marketRates?.hourly || null
      const dailyRate = rowData['dailyrate'] || rowData['daily rate'] || rowData['daily'] || rowData['rate'] || rowData['daily_rate'] || marketRates?.daily || null
      const unit = rowData['unit'] || marketRates?.unit || null
      const capacity = rowData['capacity'] || rowData['qty'] || rowData['quantity'] || null

      const resource = {
        projectId,
        name: name.toString().trim(),
        type,
        unit: unit?.toString() || null,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        dailyRate: dailyRate ? parseFloat(dailyRate) : null,
        capacity: capacity ? parseInt(capacity) : null,
        description: rowData['description'] || rowData['notes'] || `Imported from ${fileName}`
      }
      
      console.log(`Row ${rowNumber}: Parsed resource`, resource)
      resources.push(resource)
    })

    console.log(`Parsed ${resources.length} resources from ${rowCount} rows`)

    if (resources.length === 0) {
      return NextResponse.json({ 
        error: `No valid resources found in file. Found ${rowCount} rows (including header). Please add resource data rows below the header. Example:\nname,type,unit,hourly_rate,daily_rate,capacity,description\nMason,labor,person,100,800,5,Skilled mason\nCrane,equipment,machine,2500,20000,1,Tower crane` 
      }, { status: 400 })
    }

    // Create resources in database
    let created = 0
    for (const resource of resources) {
      try {
        await prisma.resource.create({ data: resource })
        created++
      } catch (error) {
        console.error('Failed to create resource:', resource.name, error)
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: created,
      message: `Successfully imported ${created} resources`
    })

  } catch (error) {
    console.error('Import error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to import resources'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
