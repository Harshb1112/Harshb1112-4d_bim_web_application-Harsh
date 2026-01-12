// Universal element reader - reads from any loaded 3D viewer
// Works with IFC, Autodesk, and Speckle viewers

export async function readElementsFromLoadedViewer(): Promise<any[]> {
  const elements: any[] = []
  
  try {
    console.log('[Universal Reader] Checking for loaded viewers...')
    
    // 1. Try Autodesk Viewer - Multiple detection methods
    const Autodesk = (window as any).Autodesk
    if (Autodesk?.Viewing) {
      console.log('[Universal Reader] Autodesk Viewing API found')
      
      let viewer = null
      
      // Method 1: Check global autodeskViewer variable (set by our component)
      if ((window as any).autodeskViewer) {
        viewer = (window as any).autodeskViewer
        console.log('[Universal Reader] Found viewer via window.autodeskViewer')
      }
      
      // Method 2: Check global NOP_VIEWER variable (Autodesk's internal)
      if (!viewer && (window as any).NOP_VIEWER) {
        viewer = (window as any).NOP_VIEWER
        console.log('[Universal Reader] Found viewer via NOP_VIEWER')
      }
      
      // Method 3: Check for viewer in DOM
      if (!viewer) {
        const viewerDivs = document.querySelectorAll('[id^="viewer"]')
        for (const div of viewerDivs) {
          if ((div as any).viewer) {
            viewer = (div as any).viewer
            console.log('[Universal Reader] Found viewer in DOM element')
            break
          }
        }
      }
      
      // Method 4: Search all Autodesk viewer instances
      if (!viewer && Autodesk.Viewing.Private?.viewerUniqIdCount) {
        // Try to find viewer by checking window properties
        for (const key in window) {
          if ((window as any)[key]?.model?.getInstanceTree) {
            viewer = (window as any)[key]
            console.log('[Universal Reader] Found viewer via window property:', key)
            break
          }
        }
      }
      
      // Method 5: Try Autodesk.Viewing.Private.viewerMap
      if (!viewer && Autodesk.Viewing.Private?.viewerMap) {
        const viewerMap = Autodesk.Viewing.Private.viewerMap
        for (const key in viewerMap) {
          if (viewerMap[key]?.model) {
            viewer = viewerMap[key]
            console.log('[Universal Reader] Found viewer via viewerMap:', key)
            break
          }
        }
      }
      
      if (viewer?.model) {
        console.log('[Universal Reader] Autodesk viewer has model loaded')
        
        const model = viewer.model
        const instanceTree = model.getInstanceTree()
        
        if (instanceTree) {
          const rootId = instanceTree.getRootId()
          
          // Get all node IDs - use enumNodeChildren with recursive flag
          const allDbIds: number[] = []
          instanceTree.enumNodeChildren(rootId, (dbId: number) => {
            allDbIds.push(dbId)
          }, true) // true = recursive (gets all descendants)
          
          console.log('[Universal Reader] Found', allDbIds.length, 'Autodesk nodes')
          
          // Filter out root and non-leaf nodes for cleaner results
          const leafDbIds = allDbIds.filter(dbId => {
            let isLeaf = true
            instanceTree.enumNodeChildren(dbId, () => {
              isLeaf = false
            }, false)
            return isLeaf && dbId !== rootId
          })
          
          console.log('[Universal Reader] Filtered to', leafDbIds.length, 'leaf nodes')
          
          // Get properties using bulk API
          return new Promise((resolve) => {
            const dbIdsToQuery = leafDbIds.length > 0 ? leafDbIds : allDbIds
            
            model.getBulkProperties(dbIdsToQuery, { propFilter: ['name', 'Category', 'Type', 'Family'] }, (results: any[]) => {
              results.forEach((props: any) => {
                if (props && props.name && props.name !== 'Model') {
                  let category = 'Element'
                  let family = ''
                  
                  if (props.properties) {
                    const catProp = props.properties.find((p: any) => 
                      p.displayName === 'Category' || p.attributeName === 'Category'
                    )
                    if (catProp) category = catProp.displayValue
                    
                    const famProp = props.properties.find((p: any) => 
                      p.displayName === 'Family' || p.attributeName === 'Family'
                    )
                    if (famProp) family = famProp.displayValue
                  }
                  
                  elements.push({
                    id: props.dbId,
                    guid: props.externalId || props.dbId.toString(),
                    type: category,
                    name: props.name,
                    family: family,
                    source: 'autodesk',
                    properties: props
                  })
                }
              })
              console.log('[Universal Reader] Extracted', elements.length, 'Autodesk elements')
              resolve(elements)
            }, (error: any) => {
              console.error('[Universal Reader] Bulk properties error:', error)
              resolve(elements)
            })
          })
        } else {
          console.warn('[Universal Reader] Autodesk viewer has no instance tree')
        }
      } else {
        console.warn('[Universal Reader] Autodesk viewer found but no model loaded')
      }
    }
    
    // 2. Try IFC Viewer (Three.js based)
    const scene = (window as any).ifcScene
    if (scene) {
      console.log('[Universal Reader] Found IFC scene')
      
      scene.traverse((object: any) => {
        if (object.userData?.expressID) {
          const typeName = object.userData.typeName || object.userData.type || 'Element'
          const elementName = object.name || object.userData.name || `${typeName}_${object.userData.expressID}`
          
          elements.push({
            id: object.userData.expressID,
            guid: `IFC_${object.userData.expressID}`,
            type: typeName,
            name: elementName,
            source: 'ifc',
            properties: object.userData
          })
        }
      })
      
      console.log('[Universal Reader] Extracted', elements.length, 'IFC elements')
      return elements
    }
    
    // 3. Try Speckle Viewer (Three.js based)
    const speckleViewer = (window as any).speckleViewer
    if (speckleViewer?.scene) {
      console.log('[Universal Reader] Found Speckle viewer')
      
      speckleViewer.scene.traverse((object: any) => {
        if (object.userData?.id || object.userData?.speckleId) {
          const speckleId = object.userData.id || object.userData.speckleId
          const speckleType = object.userData.speckle_type || object.userData.type || 'Element'
          const typeParts = speckleType.split('.')
          const category = typeParts[typeParts.length - 1].replace('Revit', '')
          
          const elementName = object.name || 
                             object.userData.name || 
                             object.userData.Family || 
                             `${category}_${speckleId.slice(0, 8)}`
          
          elements.push({
            id: speckleId,
            guid: speckleId,
            type: category,
            name: elementName,
            source: 'speckle',
            properties: object.userData
          })
        }
      })
      
      console.log('[Universal Reader] Extracted', elements.length, 'Speckle elements')
      return elements
    }
    
    console.warn('[Universal Reader] No viewer found or no model loaded')
    console.log('[Universal Reader] Debug info:', {
      hasAutodesk: !!Autodesk,
      hasViewing: !!Autodesk?.Viewing,
      hasGlobalAutodeskViewer: !!(window as any).autodeskViewer,
      hasNOPViewer: !!(window as any).NOP_VIEWER,
      hasIFCScene: !!scene,
      hasSpeckleViewer: !!speckleViewer,
      windowKeys: Object.keys(window).filter(k => k.toLowerCase().includes('viewer')).slice(0, 10)
    })
    
    return []
    
  } catch (error) {
    console.error('[Universal Reader] Error:', error)
    return elements
  }
}
