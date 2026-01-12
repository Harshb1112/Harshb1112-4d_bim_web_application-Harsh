// Client-side IFC element extractor
// Extracts elements from loaded IFC viewer

export async function extractElementsFromIFCViewer(modelId: number): Promise<any[]> {
  try {
    console.log('[IFC Extractor] Extracting elements from viewer for model:', modelId)
    
    // Get IFC file URL
    const fileUrl = `/api/models/${modelId}/file`
    
    // Load IFC file
    const response = await fetch(fileUrl, { credentials: 'include' })
    if (!response.ok) {
      throw new Error(`Failed to fetch IFC file: ${response.status}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    console.log('[IFC Extractor] File loaded, size:', (arrayBuffer.byteLength / 1024 / 1024).toFixed(2), 'MB')
    
    // Parse using web-ifc (client-side)
    const WebIFC = await import('web-ifc')
    const ifcApi = new WebIFC.IfcAPI()
    
    // Set WASM path for browser
    ifcApi.SetWasmPath('/wasm/', true)
    await ifcApi.Init((path: string) => `/wasm/${path}`)
    
    console.log('[IFC Extractor] Opening model...')
    const ifcModelID = ifcApi.OpenModel(new Uint8Array(arrayBuffer))
    
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
    
    const elements: any[] = []
    
    console.log('[IFC Extractor] Extracting elements...')
    
    for (const { type: ifcType, name: typeName } of allTypes) {
      try {
        const ids = ifcApi.GetLineIDsWithType(ifcModelID, ifcType)
        const count = ids.size()
        
        if (count > 0) {
          console.log(`[IFC Extractor]   ${typeName}: ${count}`)
          
          for (let i = 0; i < count; i++) {
            const expressID = ids.get(i)
            
            try {
              const props = ifcApi.GetLine(ifcModelID, expressID)
              
              let elementName = `${typeName}_${expressID}`
              if (props.Name?.value) {
                elementName = props.Name.value
              } else if (props.Tag?.value) {
                elementName = props.Tag.value
              } else if (props.ObjectType?.value) {
                elementName = props.ObjectType.value
              }
              
              elements.push({
                id: `IFC_${expressID}`,
                guid: `IFC_${expressID}`,
                expressID: expressID,
                type: typeName,
                name: elementName,
                category: typeName,
                properties: {
                  expressID,
                  ifcType,
                  typeName,
                  name: elementName
                }
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
    
    ifcApi.CloseModel(ifcModelID)
    
    console.log(`[IFC Extractor] Extracted ${elements.length} elements`)
    
    return elements
    
  } catch (error) {
    console.error('[IFC Extractor] Error:', error)
    throw error
  }
}
