# BIMBOSS Integrations

## Overview
The Integrations tab allows you to connect BIMBOSS with external ERP systems like SAP Project System (SAP PS) for seamless data exchange.

## Features

### 1. SAP Project System Export
Export project data in SAP-compatible formats:
- **XML Export**: Full project structure with WBS elements, activities, cost elements, and work centers
- **CSV Export**: Simplified format for direct import into SAP using LSMW or other tools

### 2. Integration Management
- Add and configure multiple integrations
- Activate/deactivate integrations as needed
- Track last sync timestamps
- Secure credential storage

### 3. Supported Integration Types
- **SAP Project System (SAP PS)**: Full project export with WBS and network activities
- **Generic ERP**: Standard format for other ERP systems
- **Webhook**: Real-time data push to external systems

## How to Use

### Export to SAP

1. Navigate to the **Integrations** tab in your project
2. Click **Export XML** or **Export CSV**
3. Save the generated file
4. Import into SAP using:
   - Transaction CJ20N (WBS Elements)
   - Transaction CN22 (Network Activities)
   - LSMW (Legacy System Migration Workbench)

### Add Integration

1. Click **Add Integration**
2. Select integration type (SAP, ERP, Webhook)
3. Enter integration name
4. Configure connection details:
   - API URL
   - Username
   - Password/API Key
5. Click **Add Integration**

### Manage Integrations

- **Activate/Deactivate**: Toggle integration status
- **Delete**: Remove integration permanently
- **View Status**: Check last sync time and connection status

## Data Mapping

### WBS Elements
- WBS Code: `{ProjectID}.{TaskIndex}`
- WBS Name: Task name
- Start/End Dates: Task schedule
- Status: Task status
- Progress: Task completion percentage

### Network Activities
- Activity Code: `{ProjectID}{TaskIndex}`
- Activity Name: Task name
- Duration: Calculated from start/end dates
- Work Center: Assigned user
- Status: Task status

### Cost Elements
- Cost Code: Resource ID
- Cost Name: Resource name
- Unit Cost: Resource unit cost
- Quantity: Resource quantity
- Total Cost: Calculated total

### Work Centers
- WC Code: Auto-generated
- WC Name: User full name
- WC Type: PERSON
- Capacity: 1

## API Endpoints

### Export Endpoints
- `POST /api/projects/[id]/export-sap` - Export as XML
- `POST /api/projects/[id]/export-csv` - Export as CSV

### Integration Management
- `GET /api/integrations` - List all integrations
- `POST /api/integrations` - Create new integration
- `GET /api/integrations/[id]` - Get integration details
- `PATCH /api/integrations/[id]` - Update integration
- `DELETE /api/integrations/[id]` - Delete integration

### Webhook
- `POST /api/integrations/webhook` - Test webhook integration

## Security

- All credentials are encrypted in the database
- API keys are never exposed in responses
- User-level access control
- Integration ownership validation

## Best Practices

1. **Test First**: Use CSV export to verify data before XML export
2. **Regular Backups**: Export data regularly for backup purposes
3. **Validate Dates**: Ensure all tasks have valid start/end dates
4. **Assign Resources**: Assign users to tasks for proper work center mapping
5. **Use Webhooks**: For real-time integration, configure webhooks instead of manual exports

## Troubleshooting

### Export Issues
- Ensure all tasks have valid dates
- Check that project has tasks to export
- Verify user permissions

### Integration Connection Issues
- Verify API URL is correct
- Check credentials are valid
- Ensure network connectivity
- Review integration logs

## Future Enhancements
- Real-time sync with SAP
- Bi-directional data flow
- Advanced mapping configuration
- Integration templates
- Scheduled exports
- Integration monitoring dashboard
