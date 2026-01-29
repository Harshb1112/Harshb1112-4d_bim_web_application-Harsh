import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

// Currency Exchange Rates (Base: USD)
const EXCHANGE_RATES: Record<string, number> = {
  'USD': 1.00,
  'EUR': 0.92,
  'GBP': 0.79,
  'INR': 83.12,
  'JPY': 149.50,
  'CNY': 7.24,
  'AUD': 1.52,
  'CAD': 1.36,
  'CHF': 0.88,
  'SEK': 10.87,
  'NZD': 1.64,
  'KRW': 1320.50,
  'SGD': 1.34,
  'NOK': 10.72,
  'MXN': 17.08,
  'ZAR': 18.65,
  'HKD': 7.83,
  'BRL': 4.97,
  'RUB': 92.50,
  'AED': 3.67,
  'SAR': 3.75,
  'THB': 35.50,
  'TRY': 32.15,
  'PLN': 4.02,
  'DKK': 6.87,
  'IDR': 15680.00,
  'MYR': 4.72,
  'PHP': 56.25,
  'CZK': 22.85,
  'ILS': 3.64,
  'CLP': 970.50,
  'PKR': 278.50,
  'EGP': 48.75,
  'VND': 24500.00,
  'BDT': 109.50
};

// Convert amount from USD to target currency
function convertCurrency(amountUSD: number, targetCurrency: string): number {
  const rate = EXCHANGE_RATES[targetCurrency] || 1;
  return Math.round(amountUSD * rate * 100) / 100; // Round to 2 decimals
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, taskIds, format = 'json', exportType = 'all', config } = body;

    console.log('[SAP Export] Request:', { projectId, exportType, format, config });

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // Verify user has access to project
    const project = await prisma.project.findFirst({
      where: {
        id: Number(projectId),
        OR: [
          { createdById: user.id },
          { projectUsers: { some: { userId: user.id } } }
        ]
      },
      include: {
        team: true
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    console.log('[SAP Export] Project found:', project.name);

    // Fetch tasks to export
    const whereClause: any = {
      projectId: Number(projectId)
    };

    if (taskIds && taskIds.length > 0) {
      whereClause.id = { in: taskIds.map((id: any) => Number(id)) };
    }

    console.log('[SAP Export] Fetching tasks...');

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        assignee: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        },
        elementLinks: {
          include: {
            element: {
              select: {
                id: true,
                guid: true,
                category: true,
                family: true,
                typeName: true
              }
            }
          }
        },
        predecessors: {
          include: {
            predecessor: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log('[SAP Export] Tasks fetched:', tasks.length);

    if (tasks.length === 0) {
      return NextResponse.json({ 
        error: 'No tasks found to export' 
      }, { status: 404 });
    }

    // Generate SAP data based on export type
    let sapData: any = {};

    if (exportType === 'all' || exportType === 'wbs') {
      sapData.wbsElements = generateWBSElements(tasks, project, config);
    }

    if (exportType === 'all' || exportType === 'activities') {
      sapData.networkActivities = generateNetworkActivities(tasks, project, config);
    }

    if (exportType === 'all' || exportType === 'costs') {
      sapData.costElements = generateCostElements(tasks, project, config);
    }

    if (exportType === 'all' || exportType === 'workcenters') {
      sapData.workCenters = generateWorkCenters(tasks, project, config);
    }

    // Log export activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        projectId: Number(projectId),
        action: 'SAP_EXPORT',
        details: `Exported ${tasks.length} tasks to SAP ${format.toUpperCase()} format (${exportType})`
      }
    });

    // Return based on format
    if (format === 'csv') {
      const csv = convertToCSV(sapData, exportType);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="SAP_${exportType}_${config?.projectDefinition || projectId}_${Date.now()}.csv"`
        }
      });
    }

    if (format === 'xml') {
      const xml = convertToXML(sapData, project, config);
      return new NextResponse(xml, {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Content-Disposition': `attachment; filename="SAP_IDoc_${config?.projectDefinition || projectId}_${Date.now()}.xml"`
        }
      });
    }

    // Default JSON format
    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        projectDefinition: config?.projectDefinition || project.name
      },
      exportedAt: new Date().toISOString(),
      taskCount: tasks.length,
      format: format,
      exportType: exportType,
      data: sapData
    });

  } catch (error) {
    console.error('[SAP Export] Error:', error);
    console.error('[SAP Export] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Failed to export to SAP format',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Generate WBS Elements (Work Breakdown Structure)
function generateWBSElements(tasks: any[], project: any, config: any) {
  const targetCurrency = config?.currency || 'USD';
  
  return tasks.map((task, index) => {
    const wbsNumber = `${config?.projectDefinition || 'PRJ'}-${String(index + 1).padStart(4, '0')}`;
    
    // Calculate budget with currency conversion
    const budgetUSD = calculateLaborCost(task, 'USD');
    const budgetConverted = convertCurrency(budgetUSD, targetCurrency);
    
    return {
      // SAP PS WBS Element Fields
      'WBS Element': wbsNumber,
      'Description': task.name.substring(0, 40), // SAP limit
      'Long Text': task.description || '',
      'Project Definition': config?.projectDefinition || project.name.substring(0, 24),
      
      // Organizational Data
      'Controlling Area': config?.controllingArea || '1000',
      'Company Code': config?.companyCode || '1000',
      'Plant': config?.plant || '1000',
      
      // Dates (SAP format: YYYYMMDD)
      'Start Date': task.startDate ? formatReadableDate(task.startDate) : '',
      'End Date': task.endDate ? formatReadableDate(task.endDate) : '',
      'SAP Start Date': task.startDate ? formatSAPDate(task.startDate) : '',
      'SAP End Date': task.endDate ? formatSAPDate(task.endDate) : '',
      
      // Status
      'System Status': mapStatusToSAP(task.status),
      'User Status': task.status.toUpperCase(),
      
      // Financial with Currency Conversion
      'Currency': targetCurrency,
      'Budget': budgetConverted,
      'Actual Cost': budgetConverted * (task.progress / 100),
      'Exchange Rate': EXCHANGE_RATES[targetCurrency] || 1,
      'Cost Center': config?.costCenter || '',
      
      // Progress
      'Progress %': task.progress || 0,
      
      // Responsible
      'Responsible Person': task.assignee?.fullName || '',
      'Responsible Email': task.assignee?.email || '',
      
      // Additional
      'Priority': mapPriorityToSAP(task.priority),
      'Functional Area': task.team?.name || '',
      
      // BIM Integration
      'BIM Element Count': task.elementLinks?.length || 0,
      'Primary BIM Category': task.elementLinks?.[0]?.element?.category || ''
    };
  });
}

// Generate Network Activities
function generateNetworkActivities(tasks: any[], project: any, config: any) {
  const targetCurrency = config?.currency || 'USD';
  
  return tasks.map((task, index) => {
    const activityNumber = String(index + 1).padStart(4, '0');
    
    // Calculate activity cost with currency conversion
    const activityCostUSD = calculateLaborCost(task, 'USD');
    const activityCostConverted = convertCurrency(activityCostUSD, targetCurrency);
    
    return {
      // SAP PS Network Activity Fields
      'Network Number': `${config?.projectDefinition || 'NET'}-001`,
      'Activity': activityNumber,
      'Activity Description': task.name.substring(0, 40),
      
      // Control Data
      'Control Key': 'PS01', // Standard control key
      'Activity Type': 'NORM', // Normal activity
      
      // Dates and Duration
      'Earliest Start': task.startDate ? formatReadableDate(task.startDate) : '',
      'Earliest Finish': task.endDate ? formatReadableDate(task.endDate) : '',
      'SAP Start': task.startDate ? formatSAPDate(task.startDate) : '',
      'SAP Finish': task.endDate ? formatSAPDate(task.endDate) : '',
      'Duration': calculateDuration(task.startDate, task.endDate),
      'Duration Unit': 'DAY',
      
      // Work and Capacity
      'Work': calculateWork(task.startDate, task.endDate),
      'Work Unit': 'H', // Hours
      
      // Relationships
      'Predecessor Count': task.predecessors?.length || 0,
      
      // Resources
      'Work Center': config?.workCenter || 'WC-001',
      'Plant': config?.plant || '1000',
      
      // Status
      'System Status': mapStatusToSAP(task.status),
      'Completion %': task.progress || 0,
      
      // Cost with Currency Conversion
      'Planned Cost': activityCostConverted,
      'Actual Cost': activityCostConverted * (task.progress / 100),
      'Currency': targetCurrency,
      'Exchange Rate': EXCHANGE_RATES[targetCurrency] || 1,
      'Cost Center': config?.costCenter || ''
    };
  });
}

// Generate Cost Elements
function generateCostElements(tasks: any[], project: any, config: any) {
  const costElements: any[] = [];
  const targetCurrency = config?.currency || 'USD';
  
  tasks.forEach((task, index) => {
    // Labor costs with currency conversion
    const laborCostUSD = calculateLaborCost(task, 'USD');
    const laborCostConverted = convertCurrency(laborCostUSD, targetCurrency);
    
    costElements.push({
      'WBS Element': `${config?.projectDefinition || 'PRJ'}-${String(index + 1).padStart(4, '0')}`,
      'Cost Element': '400000', // Labor cost element
      'Cost Element Name': 'Labor Costs',
      'Planned Cost': laborCostConverted,
      'Actual Cost': laborCostConverted * (task.progress / 100),
      'Currency': targetCurrency,
      'Exchange Rate': EXCHANGE_RATES[targetCurrency] || 1,
      'Base Currency': 'USD',
      'Fiscal Year': new Date().getFullYear().toString(),
      'Period': (new Date().getMonth() + 1).toString().padStart(2, '0')
    });
    
    // Material costs (if applicable) with currency conversion
    if (task.elementLinks && task.elementLinks.length > 0) {
      const materialCostUSD = task.elementLinks.length * 1000;
      const materialCostConverted = convertCurrency(materialCostUSD, targetCurrency);
      
      costElements.push({
        'WBS Element': `${config?.projectDefinition || 'PRJ'}-${String(index + 1).padStart(4, '0')}`,
        'Cost Element': '300000', // Material cost element
        'Cost Element Name': 'Material Costs',
        'Planned Cost': materialCostConverted,
        'Actual Cost': materialCostConverted * (task.progress / 100),
        'Currency': targetCurrency,
        'Exchange Rate': EXCHANGE_RATES[targetCurrency] || 1,
        'Base Currency': 'USD',
        'Fiscal Year': new Date().getFullYear().toString(),
        'Period': (new Date().getMonth() + 1).toString().padStart(2, '0')
      });
    }
  });
  
  return costElements;
}

// Generate Work Centers
function generateWorkCenters(tasks: any[], project: any, config: any) {
  const teams = [...new Set(tasks.map(t => t.team?.name).filter(Boolean))];
  
  return teams.map((teamName, index) => ({
    'Work Center': `WC-${String(index + 1).padStart(3, '0')}`,
    'Work Center Name': teamName,
    'Plant': config?.plant || '1000',
    'Work Center Category': 'PROD',
    'Capacity Category': '001',
    'Standard Text Key': teamName?.substring(0, 20) || '',
    'Person Responsible': '',
    'Cost Center': config?.costCenter || ''
  }));
}

// Helper Functions
function formatSAPDate(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function formatReadableDate(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${day}/${month}/${year}`; // DD/MM/YYYY format
}

function mapStatusToSAP(status: string): string {
  const statusMap: Record<string, string> = {
    'todo': 'CRTD',
    'in_progress': 'REL',
    'completed': 'TECO',
    'on_hold': 'HOLD',
    'cancelled': 'CLSD'
  };
  return statusMap[status] || 'CRTD';
}

function mapPriorityToSAP(priority: string): string {
  const priorityMap: Record<string, string> = {
    'low': '3',
    'medium': '2',
    'high': '1',
    'critical': '1'
  };
  return priorityMap[priority] || '2';
}

function calculateDuration(startDate: Date | string | null, endDate: Date | string | null): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function calculateWork(startDate: Date | string | null, endDate: Date | string | null): number {
  const days = calculateDuration(startDate, endDate);
  return days * 8; // 8 hours per day
}

function calculateLaborCost(task: any, currency: string = 'USD'): number {
  const duration = calculateDuration(task.startDate, task.endDate);
  const hourlyRate = 50; // Default rate in USD
  const costUSD = duration * 8 * hourlyRate;
  
  // Convert to target currency
  return convertCurrency(costUSD, currency);
}

// Convert to CSV with proper formatting
function convertToCSV(data: any, exportType: string): string {
  let csvData: any[] = [];
  
  if (exportType === 'all') {
    // For 'all', create separate sections
    let csv = '';
    
    if (data.wbsElements && data.wbsElements.length > 0) {
      csv += '=== WBS ELEMENTS ===\n';
      csv += generateCSVSection(data.wbsElements);
      csv += '\n\n';
    }
    
    if (data.networkActivities && data.networkActivities.length > 0) {
      csv += '=== NETWORK ACTIVITIES ===\n';
      csv += generateCSVSection(data.networkActivities);
      csv += '\n\n';
    }
    
    if (data.costElements && data.costElements.length > 0) {
      csv += '=== COST ELEMENTS ===\n';
      csv += generateCSVSection(data.costElements);
      csv += '\n\n';
    }
    
    if (data.workCenters && data.workCenters.length > 0) {
      csv += '=== WORK CENTERS ===\n';
      csv += generateCSVSection(data.workCenters);
    }
    
    return '\uFEFF' + csv; // Add BOM for Excel
  } else if (exportType === 'wbs') {
    csvData = data.wbsElements || [];
  } else if (exportType === 'activities') {
    csvData = data.networkActivities || [];
  } else if (exportType === 'costs') {
    csvData = data.costElements || [];
  } else if (exportType === 'workcenters') {
    csvData = data.workCenters || [];
  }
  
  if (csvData.length === 0) return '';
  
  return '\uFEFF' + generateCSVSection(csvData);
}

// Helper function to generate CSV section
function generateCSVSection(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  
  // Create header row
  const headerRow = headers.map(h => `"${h}"`).join(',');
  
  // Create data rows
  const dataRows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '""';
      
      const stringValue = String(value);
      
      // Always quote values to prevent Excel formatting issues
      return `"${stringValue.replace(/"/g, '""')}"`;
    }).join(',')
  );
  
  return [headerRow, ...dataRows].join('\r\n');
}

// Convert to SAP IDoc XML with proper structure - Real SAP PS Format
function convertToXML(data: any, project: any, config: any): string {
  const timestamp = new Date();
  const docNum = String(Math.floor(Math.random() * 999999999)).padStart(16, '0');
  const creationDate = formatSAPDate(timestamp);
  const creationTime = timestamp.toTimeString().substring(0, 8).replace(/:/g, '');
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<!--SAP IDoc for Project System (PS) - BIM Integration-->\n';
  xml += '<BAPI_PROJECT_MAINTAIN01>\n';
  xml += '  <IDOC BEGIN="1">\n';
  
  // ==================== CONTROL RECORD (EDI_DC40) ====================
  xml += '    <EDI_DC40 SEGMENT="1">\n';
  xml += `      <TABNAM>EDI_DC40</TABNAM>\n`;
  xml += `      <MANDT>${config?.client || '100'}</MANDT>\n`;
  xml += `      <DOCNUM>${docNum}</DOCNUM>\n`;
  xml += `      <DOCREL>740</DOCREL>\n`;
  xml += `      <STATUS>30</STATUS>\n`;
  xml += `      <DIRECT>2</DIRECT>\n`;
  xml += `      <OUTMOD>2</OUTMOD>\n`;
  xml += `      <IDOCTYP>BAPI_PROJECT_MAINTAIN01</IDOCTYP>\n`;
  xml += `      <CIMTYP></CIMTYP>\n`;
  xml += `      <MESTYP>BAPI_PROJECT</MESTYP>\n`;
  xml += `      <MESCOD></MESCOD>\n`;
  xml += `      <MESFCT></MESFCT>\n`;
  xml += `      <STD></STD>\n`;
  xml += `      <STDVRS></STDVRS>\n`;
  xml += `      <STDMES></STDMES>\n`;
  xml += `      <SNDPOR>SAPBIM</SNDPOR>\n`;
  xml += `      <SNDPRT>LS</SNDPRT>\n`;
  xml += `      <SNDPFC>LS</SNDPFC>\n`;
  xml += `      <SNDPRN>BIMAPP</SNDPRN>\n`;
  xml += `      <SNDSAD></SNDSAD>\n`;
  xml += `      <SNDLAD></SNDLAD>\n`;
  xml += `      <RCVPOR>SAPSYS</RCVPOR>\n`;
  xml += `      <RCVPRT>LS</RCVPRT>\n`;
  xml += `      <RCVPFC>LS</RCVPFC>\n`;
  xml += `      <RCVPRN>SAPSYS</RCVPRN>\n`;
  xml += `      <RCVSAD></RCVSAD>\n`;
  xml += `      <RCVLAD></RCVLAD>\n`;
  xml += `      <CREDAT>${creationDate}</CREDAT>\n`;
  xml += `      <CRETIM>${creationTime}</CRETIM>\n`;
  xml += `      <SERIAL>${docNum}</SERIAL>\n`;
  xml += '    </EDI_DC40>\n';
  
  // ==================== PROJECT DEFINITION HEADER ====================
  const projectDef = (config?.projectDefinition || project.name.substring(0, 24)).toUpperCase().replace(/[^A-Z0-9]/g, '_');
  
  xml += '    <E1BPPROJECTDEF SEGMENT="1">\n';
  xml += `      <PROJECT_DEFINITION>${escapeXML(projectDef)}</PROJECT_DEFINITION>\n`;
  xml += `      <DESCRIPTION>${escapeXML(project.name.substring(0, 40))}</DESCRIPTION>\n`;
  xml += `      <COMPANY_CODE>${config?.companyCode || '1000'}</COMPANY_CODE>\n`;
  xml += `      <CONTROLLING_AREA>${config?.controllingArea || '1000'}</CONTROLLING_AREA>\n`;
  xml += `      <PLANT>${config?.plant || '1000'}</PLANT>\n`;
  xml += `      <CURRENCY>${config?.currency || 'USD'}</CURRENCY>\n`;
  xml += `      <PROFIT_CENTER>${config?.profitCenter || ''}</PROFIT_CENTER>\n`;
  xml += `      <FUNCTIONAL_AREA>${config?.functionalArea || ''}</FUNCTIONAL_AREA>\n`;
  xml += `      <RESPONSIBLE_COST_CENTER>${config?.costCenter || ''}</RESPONSIBLE_COST_CENTER>\n`;
  xml += `      <APPLICANT>${escapeXML((project.createdBy?.fullName || '').substring(0, 12))}</APPLICANT>\n`;
  xml += `      <PROJECT_TYPE>${config?.projectType || 'CONS'}</PROJECT_TYPE>\n`;
  xml += `      <PROJECT_PROFILE>${config?.projectProfile || 'BIM001'}</PROJECT_PROFILE>\n`;
  xml += `      <START_DATE>${data.wbsElements?.[0]?.['SAP Start Date'] || creationDate}</START_DATE>\n`;
  xml += `      <END_DATE>${data.wbsElements?.[data.wbsElements.length - 1]?.['SAP End Date'] || creationDate}</END_DATE>\n`;
  xml += `      <FACTORY_CALENDAR>${config?.factoryCalendar || '01'}</FACTORY_CALENDAR>\n`;
  xml += `      <SCHEDULING_TYPE>1</SCHEDULING_TYPE>\n`;
  xml += `      <PRIORITY>${config?.priority || '2'}</PRIORITY>\n`;
  xml += '    </E1BPPROJECTDEF>\n';
  
  // ==================== WBS ELEMENTS (Work Breakdown Structure) ====================
  if (data.wbsElements && data.wbsElements.length > 0) {
    data.wbsElements.forEach((wbs: any, index: number) => {
      const wbsElement = wbs['WBS Element'].replace(/[^A-Z0-9\-]/g, '');
      const level = index === 0 ? 1 : 2; // First is root, rest are children
      
      xml += `    <E1BPWBS_ELEMENT SEGMENT="1">\n`;
      xml += `      <WBS_ELEMENT>${escapeXML(wbsElement)}</WBS_ELEMENT>\n`;
      xml += `      <DESCRIPTION>${escapeXML(wbs['Description'].substring(0, 40))}</DESCRIPTION>\n`;
      xml += `      <PROJECT_DEFINITION>${escapeXML(projectDef)}</PROJECT_DEFINITION>\n`;
      
      // Hierarchy
      xml += `      <WBS_LEVEL>${level}</WBS_LEVEL>\n`;
      if (index > 0) {
        xml += `      <SUPERIOR_WBS>${escapeXML(data.wbsElements[0]['WBS Element'].replace(/[^A-Z0-9\-]/g, ''))}</SUPERIOR_WBS>\n`;
      }
      
      // Organizational Assignment
      xml += `      <CONTROLLING_AREA>${escapeXML(wbs['Controlling Area'])}</CONTROLLING_AREA>\n`;
      xml += `      <COMPANY_CODE>${escapeXML(wbs['Company Code'])}</COMPANY_CODE>\n`;
      xml += `      <PLANT>${escapeXML(wbs['Plant'])}</PLANT>\n`;
      xml += `      <PROFIT_CENTER>${config?.profitCenter || ''}</PROFIT_CENTER>\n`;
      xml += `      <FUNCTIONAL_AREA>${escapeXML(wbs['Functional Area'].substring(0, 16))}</FUNCTIONAL_AREA>\n`;
      xml += `      <COST_CENTER>${escapeXML(wbs['Cost Center'])}</COST_CENTER>\n`;
      
      // Dates
      xml += `      <BASIC_START_DATE>${wbs['SAP Start Date']}</BASIC_START_DATE>\n`;
      xml += `      <BASIC_FINISH_DATE>${wbs['SAP End Date']}</BASIC_FINISH_DATE>\n`;
      xml += `      <FORECAST_START_DATE>${wbs['SAP Start Date']}</FORECAST_START_DATE>\n`;
      xml += `      <FORECAST_FINISH_DATE>${wbs['SAP End Date']}</FORECAST_FINISH_DATE>\n`;
      
      // Status and Control
      xml += `      <SYSTEM_STATUS>${escapeXML(wbs['System Status'])}</SYSTEM_STATUS>\n`;
      xml += `      <USER_STATUS>${escapeXML(wbs['User Status'])}</USER_STATUS>\n`;
      xml += `      <PRIORITY>${escapeXML(wbs['Priority'])}</PRIORITY>\n`;
      xml += `      <RESPONSIBLE_PERSON>${escapeXML(wbs['Responsible Person'].substring(0, 12))}</RESPONSIBLE_PERSON>\n`;
      
      // Financial
      xml += `      <CURRENCY>${escapeXML(wbs['Currency'])}</CURRENCY>\n`;
      xml += `      <PLANNING_PROFILE>BIM001</PLANNING_PROFILE>\n`;
      xml += `      <BUDGET_PROFILE>BIM001</BUDGET_PROFILE>\n`;
      
      // Progress
      xml += `      <PROGRESS_PERCENT>${wbs['Progress %']}</PROGRESS_PERCENT>\n`;
      
      // BIM Custom Fields (Extension)
      xml += `      <E1BPWBS_EXTENSION SEGMENT="1">\n`;
      xml += `        <STRUCTURE>ZZBIM</STRUCTURE>\n`;
      xml += `        <VALUEPART1>${wbs['BIM Element Count']}</VALUEPART1>\n`;
      xml += `        <VALUEPART2>${escapeXML(wbs['Primary BIM Category'])}</VALUEPART2>\n`;
      xml += `        <VALUEPART3>${escapeXML(wbs['Responsible Email'])}</VALUEPART3>\n`;
      xml += `      </E1BPWBS_EXTENSION>\n`;
      
      // Long Text
      if (wbs['Long Text']) {
        const textLines = wbs['Long Text'].match(/.{1,132}/g) || [wbs['Long Text']];
        textLines.forEach((line: string, lineNum: number) => {
          xml += `      <E1BPWBS_TEXT SEGMENT="1">\n`;
          xml += `        <TEXT_ID>LTXT</TEXT_ID>\n`;
          xml += `        <TEXT_LINE>${String(lineNum + 1).padStart(4, '0')}</TEXT_LINE>\n`;
          xml += `        <FORMAT_COL>*</FORMAT_COL>\n`;
          xml += `        <TEXT_STRING>${escapeXML(line)}</TEXT_STRING>\n`;
          xml += `      </E1BPWBS_TEXT>\n`;
        });
      }
      
      xml += `    </E1BPWBS_ELEMENT>\n`;
    });
  }
  
  // ==================== NETWORK HEADER & ACTIVITIES ====================
  if (data.networkActivities && data.networkActivities.length > 0) {
    const networkNumber = data.networkActivities[0]['Network Number'].replace(/[^A-Z0-9]/g, '');
    
    xml += `    <E1BPNETWORK SEGMENT="1">\n`;
    xml += `      <NETWORK_NUMBER>${networkNumber}</NETWORK_NUMBER>\n`;
    xml += `      <SHORT_TEXT>BIM Project Network</SHORT_TEXT>\n`;
    xml += `      <NETWORK_TYPE>PS</NETWORK_TYPE>\n`;
    xml += `      <NETWORK_PROFILE>BIM001</NETWORK_PROFILE>\n`;
    xml += `      <PLANT>${config?.plant || '1000'}</PLANT>\n`;
    xml += `      <COMPANY_CODE>${config?.companyCode || '1000'}</COMPANY_CODE>\n`;
    xml += `      <CONTROLLING_AREA>${config?.controllingArea || '1000'}</CONTROLLING_AREA>\n`;
    xml += `      <PROFIT_CENTER>${config?.profitCenter || ''}</PROFIT_CENTER>\n`;
    xml += `      <WBS_ELEMENT>${escapeXML(data.wbsElements?.[0]?.['WBS Element'].replace(/[^A-Z0-9\-]/g, '') || '')}</WBS_ELEMENT>\n`;
    xml += `      <CURRENCY>${config?.currency || 'USD'}</CURRENCY>\n`;
    
    // Network Activities
    data.networkActivities.forEach((activity: any, actIndex: number) => {
      xml += `      <E1BPACTIVITY SEGMENT="1">\n`;
      xml += `        <ACTIVITY>${escapeXML(activity['Activity'])}</ACTIVITY>\n`;
      xml += `        <DESCRIPTION>${escapeXML(activity['Activity Description'].substring(0, 40))}</DESCRIPTION>\n`;
      xml += `        <CONTROL_KEY>${escapeXML(activity['Control Key'])}</CONTROL_KEY>\n`;
      xml += `        <ACTIVITY_TYPE>${escapeXML(activity['Activity Type'])}</ACTIVITY_TYPE>\n`;
      xml += `        <WORK_CENTER>${escapeXML(activity['Work Center'])}</WORK_CENTER>\n`;
      xml += `        <PLANT>${escapeXML(activity['Plant'])}</PLANT>\n`;
      
      // Dates
      xml += `        <EARLIEST_START_DATE>${activity['SAP Start']}</EARLIEST_START_DATE>\n`;
      xml += `        <EARLIEST_FINISH_DATE>${activity['SAP Finish']}</EARLIEST_FINISH_DATE>\n`;
      xml += `        <LATEST_START_DATE>${activity['SAP Start']}</LATEST_START_DATE>\n`;
      xml += `        <LATEST_FINISH_DATE>${activity['SAP Finish']}</LATEST_FINISH_DATE>\n`;
      
      // Duration and Work
      xml += `        <DURATION>${activity['Duration']}</DURATION>\n`;
      xml += `        <DURATION_UNIT>${escapeXML(activity['Duration Unit'])}</DURATION_UNIT>\n`;
      xml += `        <WORK>${activity['Work']}</WORK>\n`;
      xml += `        <WORK_UNIT>${escapeXML(activity['Work Unit'])}</WORK_UNIT>\n`;
      
      // Status and Progress
      xml += `        <SYSTEM_STATUS>${escapeXML(activity['System Status'])}</SYSTEM_STATUS>\n`;
      xml += `        <COMPLETION_PERCENT>${activity['Completion %']}</COMPLETION_PERCENT>\n`;
      
      // Cost Assignment
      xml += `        <COST_CENTER>${escapeXML(activity['Cost Center'])}</COST_CENTER>\n`;
      xml += `        <CURRENCY>${escapeXML(activity['Currency'])}</CURRENCY>\n`;
      
      // Relationships (if predecessor exists)
      if (activity['Predecessor Count'] > 0 && actIndex > 0) {
        xml += `        <E1BPRELATIONSHIP SEGMENT="1">\n`;
        xml += `          <PREDECESSOR_ACTIVITY>${String(actIndex).padStart(4, '0')}</PREDECESSOR_ACTIVITY>\n`;
        xml += `          <SUCCESSOR_ACTIVITY>${activity['Activity']}</SUCCESSOR_ACTIVITY>\n`;
        xml += `          <RELATIONSHIP_TYPE>FS</RELATIONSHIP_TYPE>\n`;
        xml += `          <LAG_DURATION>0</LAG_DURATION>\n`;
        xml += `          <LAG_UNIT>DAY</LAG_UNIT>\n`;
        xml += `        </E1BPRELATIONSHIP>\n`;
      }
      
      xml += `      </E1BPACTIVITY>\n`;
    });
    
    xml += `    </E1BPNETWORK>\n`;
  }
  
  // ==================== COST PLANNING ====================
  if (data.costElements && data.costElements.length > 0) {
    data.costElements.forEach((cost: any) => {
      xml += `    <E1BPCOST_PLANNING SEGMENT="1">\n`;
      xml += `      <WBS_ELEMENT>${escapeXML(cost['WBS Element'].replace(/[^A-Z0-9\-]/g, ''))}</WBS_ELEMENT>\n`;
      xml += `      <COST_ELEMENT>${escapeXML(cost['Cost Element'])}</COST_ELEMENT>\n`;
      xml += `      <COST_ELEMENT_TEXT>${escapeXML(cost['Cost Element Name'])}</COST_ELEMENT_TEXT>\n`;
      xml += `      <FISCAL_YEAR>${escapeXML(cost['Fiscal Year'])}</FISCAL_YEAR>\n`;
      xml += `      <PERIOD>${escapeXML(cost['Period'])}</PERIOD>\n`;
      xml += `      <PLAN_VERSION>0</PLAN_VERSION>\n`;
      xml += `      <TOTAL_PLAN_COST>${cost['Planned Cost']}</TOTAL_PLAN_COST>\n`;
      xml += `      <TOTAL_ACTUAL_COST>${cost['Actual Cost']}</TOTAL_ACTUAL_COST>\n`;
      xml += `      <CURRENCY>${escapeXML(cost['Currency'])}</CURRENCY>\n`;
      xml += `      <EXCHANGE_RATE>${cost['Exchange Rate'] || 1}</EXCHANGE_RATE>\n`;
      xml += `      <BASE_CURRENCY>${cost['Base Currency'] || 'USD'}</BASE_CURRENCY>\n`;
      xml += `      <COST_CENTER>${config?.costCenter || ''}</COST_CENTER>\n`;
      xml += `    </E1BPCOST_PLANNING>\n`;
    });
  }
  
  // ==================== WORK CENTERS ====================
  if (data.workCenters && data.workCenters.length > 0) {
    data.workCenters.forEach((wc: any) => {
      xml += `    <E1BPWORK_CENTER SEGMENT="1">\n`;
      xml += `      <WORK_CENTER>${escapeXML(wc['Work Center'])}</WORK_CENTER>\n`;
      xml += `      <PLANT>${escapeXML(wc['Plant'])}</PLANT>\n`;
      xml += `      <WORK_CENTER_TEXT>${escapeXML(wc['Work Center Name'].substring(0, 40))}</WORK_CENTER_TEXT>\n`;
      xml += `      <WORK_CENTER_CATEGORY>${escapeXML(wc['Work Center Category'])}</WORK_CENTER_CATEGORY>\n`;
      xml += `      <CAPACITY_CATEGORY>${escapeXML(wc['Capacity Category'])}</CAPACITY_CATEGORY>\n`;
      xml += `      <STANDARD_TEXT_KEY>${escapeXML(wc['Standard Text Key'])}</STANDARD_TEXT_KEY>\n`;
      xml += `      <COST_CENTER>${escapeXML(wc['Cost Center'])}</COST_CENTER>\n`;
      xml += `      <PERSON_RESPONSIBLE>${escapeXML(wc['Person Responsible'])}</PERSON_RESPONSIBLE>\n`;
      xml += `      <USAGE>001</USAGE>\n`;
      xml += `      <STANDARD_VALUE_KEY>SAP1</STANDARD_VALUE_KEY>\n`;
      xml += `    </E1BPWORK_CENTER>\n`;
    });
  }
  
  xml += '  </IDOC>\n';
  xml += '</BAPI_PROJECT_MAINTAIN01>\n';
  
  return xml;
}

function escapeXML(str: string | number): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
