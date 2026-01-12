// Client-side Speckle element extractor
// Note: This requires the Speckle viewer to be loaded first

export async function extractElementsFromSpeckleViewer(modelId: number): Promise<any[]> {
  try {
    console.log('[Speckle Extractor] Extracting elements for model:', modelId)
    
    // For Speckle, we need to access the viewer's scene
    // This is a simplified version - actual implementation depends on how Speckle viewer is set up
    
    // Check if there's a global viewer reference
    const viewer = (window as any).speckleViewer
    if (!viewer) {
      throw new Error('Speckle Viewer not loaded. Please wait for the 3D viewer to load first.')
    }
    
    console.log('[Speckle Extractor] Found Speckle viewer')
    
    const elements: any[] = []
    
    // Get all objects from the scene
    if (viewer.scene) {
      viewer.scene.traverse((object: any) => {
        if (object.userData && object.userData.id) {
          const speckleType = object.userData.speckle_type || 'Element'
          const typeParts = speckleType.split('.')
          const category = typeParts[typeParts.length - 1].replace('Revit', '')
          
          elements.push({
            id: object.userData.id,
            guid: object.userData.id,
            type: category,
            name: object.name || object.userData.name || `${category}_${object.userData.id.slice(0, 8)}`,
            category: category,
            properties: object.userData
          })
        }
      })
    }
    
    console.log('[Speckle Extractor] Extracted', elements.length, 'elements')
    
    return elements
    
  } catch (error) {
    console.error('[Speckle Extractor] Error:', error)
    throw error
  }
}
