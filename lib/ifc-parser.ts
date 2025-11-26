import * as WebIFC from 'web-ifc';
import { readFile } from 'fs/promises';

export interface IFCElement {
  guid: string;
  category: string;
  family?: string;
  typeName?: string;
  level?: string;
  properties: Record<string, any>;
}

export class IFCParser {
  private ifcApi: WebIFC.IfcAPI;

  constructor() {
    this.ifcApi = new WebIFC.IfcAPI();
  }

  async initialize() {
    await this.ifcApi.Init();
  }

  async parseFile(filePath: string): Promise<IFCElement[]> {
    try {
      // Read file
      const fileData = await readFile(filePath);
      const buffer = new Uint8Array(fileData);

      // Open model
      const modelID = this.ifcApi.OpenModel(buffer);

      // Get all elements
      const elements: IFCElement[] = [];
      
      // Common IFC element types to extract
      const elementTypes = [
        WebIFC.IFCWALL,
        WebIFC.IFCSLAB,
        WebIFC.IFCCOLUMN,
        WebIFC.IFCBEAM,
        WebIFC.IFCDOOR,
        WebIFC.IFCWINDOW,
        WebIFC.IFCSTAIR,
        WebIFC.IFCROOF,
        WebIFC.IFCFURNISHINGELEMENT,
        WebIFC.IFCBUILDINGELEMENTPROXY,
      ];

      for (const type of elementTypes) {
        const elementIDs = this.ifcApi.GetLineIDsWithType(modelID, type);
        
        for (let i = 0; i < elementIDs.size(); i++) {
          const elementID = elementIDs.get(i);
          const element = this.ifcApi.GetLine(modelID, elementID);
          
          if (element) {
            const parsedElement = this.parseElement(modelID, elementID, element);
            if (parsedElement) {
              elements.push(parsedElement);
            }
          }
        }
      }

      // Close model
      this.ifcApi.CloseModel(modelID);

      return elements;
    } catch (error) {
      console.error('Error parsing IFC file:', error);
      throw error;
    }
  }

  private parseElement(modelID: number, elementID: number, element: any): IFCElement | null {
    try {
      // Get GUID
      const guid = element.GlobalId?.value || `element_${elementID}`;

      // Get element type name
      const typeName = this.ifcApi.GetNameFromTypeCode(element.type);

      // Get properties
      const properties: Record<string, any> = {};
      
      // Try to get common properties
      if (element.Name) properties.Name = element.Name.value;
      if (element.Description) properties.Description = element.Description.value;
      if (element.ObjectType) properties.ObjectType = element.ObjectType.value;
      if (element.Tag) properties.Tag = element.Tag.value;

      // Get property sets
      const propSets = this.ifcApi.GetLine(modelID, elementID);
      if (propSets) {
        // Extract additional properties from property sets
        // This is simplified - full implementation would traverse property sets
        properties.ElementType = typeName;
      }

      return {
        guid,
        category: typeName || 'Unknown',
        typeName: element.ObjectType?.value || typeName,
        properties,
      };
    } catch (error) {
      console.error('Error parsing element:', error);
      return null;
    }
  }

  async dispose() {
    // Cleanup
  }
}

export async function parseIFCFile(filePath: string): Promise<IFCElement[]> {
  const parser = new IFCParser();
  await parser.initialize();
  const elements = await parser.parseFile(filePath);
  await parser.dispose();
  return elements;
}
