const fs = require('fs')

async function testIFCElements() {
  try {
    const filePath = 'C:\\Users\\Bimboss\\Documents\\4d_bim_web_application-v28\\uploads\\ifc\\1768195461520_acxdel01_sbc_dc_zz_m3_tcom_1001_detached.ifc'
    
    console.log('Reading IFC file...')
    const fileBuffer = fs.readFileSync(filePath)
    console.log(`File size: ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`)
    
    // Parse IFC using web-ifc
    const WebIFC = require('web-ifc')
    const ifcApi = new WebIFC.IfcAPI()
    
    console.log('Initializing web-ifc...')
    ifcApi.SetWasmPath('./node_modules/web-ifc/web-ifc.wasm')
    await ifcApi.Init()
    
    console.log('Opening IFC model...')
    const modelID = ifcApi.OpenModel(new Uint8Array(fileBuffer))
    console.log(`Model ID: ${modelID}`)
    
    // Get all IFC element types
    const allTypes = [
      { type: WebIFC.IFCWALL, name: 'Wall' },
      { type: WebIFC.IFCWALLSTANDARDCASE, name: 'Wall' },
      { type: WebIFC.IFCSLAB, name: 'Slab' },
      { type: WebIFC.IFCCOLUMN, name: 'Column' },
      { type: WebIFC.IFCBEAM, name: 'Beam' },
      { type: WebIFC.IFCDOOR, name: 'Door' },
      { type: WebIFC.IFCWINDOW, name: 'Window' },
      { type: WebIFC.IFCROOF, name: 'Roof' },
      { type: WebIFC.IFCSTAIR, name: 'Stair' },
      { type: WebIFC.IFCRAILING, name: 'Railing' },
      { type: WebIFC.IFCFURNISHINGELEMENT, name: 'Furniture' },
      { type: WebIFC.IFCBUILDINGELEMENTPROXY, name: 'Element' }
    ]
    
    const elements = []
    const typeCounts = {}
    
    console.log('\nExtracting elements...')
    
    for (const { type: ifcType, name: typeName } of allTypes) {
      try {
        const ids = ifcApi.GetLineIDsWithType(modelID, ifcType)
        const count = ids.size()
        
        if (count > 0) {
          typeCounts[typeName] = (typeCounts[typeName] || 0) + count
          console.log(`  ${typeName}: ${count}`)
          
          // Get first 5 elements of this type
          for (let i = 0; i < Math.min(5, count); i++) {
            const expressID = ids.get(i)
            
            try {
              const props = ifcApi.GetLine(modelID, expressID)
              
              let elementName = `${typeName}_${expressID}`
              if (props.Name?.value) {
                elementName = props.Name.value
              } else if (props.Tag?.value) {
                elementName = props.Tag.value
              }
              
              elements.push({
                id: `IFC_${expressID}`,
                expressID,
                type: typeName,
                name: elementName
              })
            } catch (e) {
              // Skip
            }
          }
        }
      } catch (e) {
        // Skip types that don't exist
      }
    }
    
    console.log('\n=== SUMMARY ===')
    console.log('Total element types:', Object.keys(typeCounts).length)
    console.log('Type counts:', typeCounts)
    console.log('\nFirst 20 elements:')
    elements.slice(0, 20).forEach((el, i) => {
      console.log(`${i + 1}. ${el.name} (${el.type}) - ID: ${el.id}`)
    })
    
    ifcApi.CloseModel(modelID)
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testIFCElements()
