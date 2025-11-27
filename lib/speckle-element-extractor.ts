import ObjectLoader from '@speckle/objectloader'

interface SpeckleObject {
  id: string
  speckle_type: string
  name?: string
  children?: SpeckleObject[]
  displayValue?: any
  [key: string]: any
}

interface ExtractedElement {
  guid: string
  category: string
  family: string
  typeName: string
  level: string | null
  parameters: object
}

export async function fetchAndExtractElements(
  serverUrl: string,
  token: string,
  streamId: string,
  commitId: string
): Promise<ExtractedElement[]> {
  // Get commit object ID
  const commitResponse = await fetch(`${serverUrl}/api/stream/${streamId}/commits/${commitId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!commitResponse.ok) {
    throw new Error('Failed to fetch commit details')
  }

  const commitData = await commitResponse.json()
  const referencedObject = commitData.commit.referencedObject

  // Load the object data using the object loader
  const loader = new ObjectLoader({
    serverUrl,
    streamId,
    objectId: referencedObject,
    token,
    options: {
      enableCaching: true,
      customLogger: (...args: unknown[]) => console.log(...args),
      customWarner: (...args: unknown[]) => console.warn(...args)
    }
  })

  const objectData = await loader.getAndConstructObject(() => {})

  if (!objectData) {
    throw new Error('Failed to load object data from the project')
  }

  return extractElementsFromSpeckle(objectData as SpeckleObject)
}

function extractElementsFromSpeckle(obj: SpeckleObject): ExtractedElement[] {
  const elements: ExtractedElement[] = []
  const visitedIds = new Set<string>()

  const extractRecursive = (object: SpeckleObject, category = 'General', depth = 0) => {
    if (!object || !object.id || visitedIds.has(object.id) || depth > 20) {
      return
    }
    visitedIds.add(object.id)

    const isElement =
      object.displayValue ||
      object.speckle_type?.includes('Element') ||
      object.speckle_type?.includes('Object') ||
      object.speckle_type?.includes('Instance') ||
      object.speckle_type?.includes('Family') ||
      (object.speckle_type && !object.speckle_type.includes('Collection'))

    if (isElement) {
      let elementCategory = category
      if (object.category) {
        elementCategory = object.category
      } else if (object.speckle_type) {
        const type = object.speckle_type
        if (type.includes('Wall')) elementCategory = 'Walls'
        else if (type.includes('Floor')) elementCategory = 'Floors'
        else if (type.includes('Column')) elementCategory = 'Structural Columns'
        else if (type.includes('Beam')) elementCategory = 'Structural Framing'
        else if (type.includes('Door')) elementCategory = 'Doors'
        else if (type.includes('Window')) elementCategory = 'Windows'
        else if (type.includes('Roof')) elementCategory = 'Roofs'
        else if (type.includes('Stair')) elementCategory = 'Stairs'
        else if (type.includes('Pipe')) elementCategory = 'Pipes'
        else if (type.includes('Duct')) elementCategory = 'Ducts'
      }

      elements.push({
        guid: object.id,
        category: elementCategory,
        family: object.family || object.speckle_type || 'Unknown',
        typeName: object.name || object.type || 'Unnamed',
        level: object.level?.name || object.baseLevel || null,
        parameters: {
          ...object
        }
      })
    }

    if (object.children && Array.isArray(object.children)) {
      object.children.forEach(child => {
        if (child && typeof child === 'object') {
          const childCategory = child.category || child.name || category
          extractRecursive(child, childCategory, depth + 1)
        }
      })
    }

    Object.keys(object).forEach(key => {
      const value = object[key]
      if (value && typeof value === 'object' && value.speckle_type && key !== 'children') {
        if (Array.isArray(value)) {
          value.forEach(item => {
            if (item && typeof item === 'object' && item.speckle_type) {
              extractRecursive(item, category, depth + 1)
            }
          })
        } else {
          extractRecursive(value, category, depth + 1)
        }
      }
    })
  }

  extractRecursive(obj)
  return elements
}