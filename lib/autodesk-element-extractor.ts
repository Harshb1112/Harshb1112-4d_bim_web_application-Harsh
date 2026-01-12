// Client-side Autodesk element extractor
// Note: This requires the Autodesk viewer to be loaded first

export async function extractElementsFromAutodeskViewer(modelId: number): Promise<any[]> {
  return new Promise((resolve, reject) => {
    try {
      console.log('[Autodesk Extractor] Extracting elements for model:', modelId)
      
      // Check if Autodesk viewer is available
      const Autodesk = (window as any).Autodesk
      if (!Autodesk || !Autodesk.Viewing) {
        reject(new Error('Autodesk Viewer not loaded. Please wait for the 3D viewer to load first.'))
        return
      }
      
      // Get the viewer instance (assuming it's the first one)
      const viewer = Autodesk.Viewing.Private.GuiViewer3D.getInstances()?.[0]
      if (!viewer || !viewer.model) {
        reject(new Error('No Autodesk model loaded in viewer. Please load the model first.'))
        return
      }
      
      console.log('[Autodesk Extractor] Found viewer with model')
      
      const elements: any[] = []
      const model = viewer.model
      
      // Get instance tree
      const instanceTree = model.getInstanceTree()
      if (!instanceTree) {
        reject(new Error('Model instance tree not available'))
        return
      }
      
      const rootId = instanceTree.getRootId()
      
      // Recursive function to get all nodes
      function getAllDbIds(node: number, dbIds: number[]) {
        dbIds.push(node)
        instanceTree.enumNodeChildren(node, (childId: number) => {
          getAllDbIds(childId, dbIds)
        })
      }
      
      const allDbIds: number[] = []
      getAllDbIds(rootId, allDbIds)
      
      console.log('[Autodesk Extractor] Found', allDbIds.length, 'nodes')
      
      // Get properties for each element
      let processed = 0
      allDbIds.forEach((dbId) => {
        viewer.getProperties(dbId, (props: any) => {
          if (props && props.name) {
            // Extract category/type
            let category = 'Element'
            if (props.properties) {
              const categoryProp = props.properties.find((p: any) => 
                p.displayName === 'Category' || p.displayName === 'Type'
              )
              if (categoryProp) {
                category = categoryProp.displayValue
              }
            }
            
            elements.push({
              id: dbId.toString(),
              guid: props.externalId || dbId.toString(),
              dbId: dbId,
              type: category,
              name: props.name,
              category: category,
              properties: props
            })
          }
          
          processed++
          if (processed === allDbIds.length) {
            console.log('[Autodesk Extractor] Extracted', elements.length, 'elements')
            resolve(elements)
          }
        }, (error: any) => {
          console.warn('[Autodesk Extractor] Failed to get properties for dbId:', dbId, error)
          processed++
          if (processed === allDbIds.length) {
            resolve(elements)
          }
        })
      })
      
    } catch (error) {
      console.error('[Autodesk Extractor] Error:', error)
      reject(error)
    }
  })
}
