// Real construction resources based on element categories
export const RESOURCE_MAPPING: Record<string, string[]> = {
  // Foundation & Earthwork
  'Structural Foundations': ['Concrete (M25)', 'Rebar (TMT 500D)', 'Formwork', 'Excavation'],
  'Foundation': ['Concrete (M20)', 'Rebar (TMT 500D)', 'PCC (M15)', 'Excavation'],
  'Footings': ['Concrete (M25)', 'Rebar (TMT 500D)', 'Formwork'],
  'Pile': ['Concrete (M30)', 'Rebar (TMT 550D)', 'Pile Casing'],
  
  // Structural Elements
  'Structural Framing': ['Steel Beams (ISMB)', 'Welding Electrodes', 'Bolts & Nuts', 'Paint'],
  'Structural Columns': ['Concrete (M30)', 'Rebar (TMT 550D)', 'Formwork', 'Curing Compound'],
  'Beams': ['Concrete (M25)', 'Rebar (TMT 500D)', 'Formwork'],
  'Slabs': ['Concrete (M25)', 'Rebar (TMT 500D)', 'Formwork', 'Curing Compound'],
  'Floors': ['Concrete (M25)', 'Rebar (TMT 500D)', 'Waterproofing'],
  
  // Walls & Partitions
  'Walls': ['Bricks (230mm)', 'Cement Mortar', 'Plastering', 'Labor'],
  'Curtain Walls': ['Aluminum Frames', 'Glass Panels', 'Sealant', 'Gaskets'],
  'Curtain Panels': ['Aluminum Frames', 'Glass Panels', 'Sealant'],
  'Partitions': ['Gypsum Board', 'Metal Studs', 'Joint Compound', 'Screws'],
  
  // Doors & Windows
  'Doors': ['Wooden Doors', 'Door Frames', 'Hardware', 'Paint'],
  'Windows': ['Aluminum Windows', 'Glass', 'Sealant', 'Hardware'],
  'Glazing': ['Glass Panels', 'Aluminum Frames', 'Sealant'],
  
  // Roofing
  'Roofs': ['Roofing Sheets', 'Purlins', 'Insulation', 'Waterproofing'],
  'Roof': ['Concrete (M25)', 'Rebar (TMT 500D)', 'Waterproofing Membrane'],
  'Ceilings': ['Gypsum Board', 'Metal Grid', 'Suspension System'],
  
  // MEP - Mechanical
  'Mechanical Equipment': ['HVAC Units', 'Ductwork', 'Insulation', 'Dampers'],
  'Air Terminals': ['Diffusers', 'Grilles', 'Registers'],
  'Ducts': ['GI Ducting', 'Insulation', 'Hangers', 'Sealant'],
  
  // MEP - Electrical
  'Electrical Equipment': ['Electrical Panels', 'MCBs', 'Cables', 'Conduits'],
  'Electrical Fixtures': ['LED Lights', 'Switches', 'Sockets', 'Wiring'],
  'Lighting Fixtures': ['LED Lights', 'Mounting Hardware', 'Wiring'],
  'Cable Trays': ['GI Cable Trays', 'Supports', 'Covers'],
  
  // MEP - Plumbing
  'Plumbing Fixtures': ['Sanitary Fixtures', 'Faucets', 'Pipes (CPVC)', 'Fittings'],
  'Pipes': ['PVC Pipes', 'GI Pipes', 'Fittings', 'Valves'],
  'Pipe Accessories': ['Valves', 'Couplings', 'Elbows', 'Tees'],
  
  // MEP - Fire Protection
  'Sprinklers': ['Sprinkler Heads', 'Pipes (GI)', 'Valves', 'Fittings'],
  'Fire Protection': ['Fire Extinguishers', 'Hose Reels', 'Sprinklers', 'Alarm System'],
  
  // Finishes - Interior
  'Casework': ['Wooden Cabinets', 'Hardware', 'Countertops', 'Paint'],
  'Furniture': ['Furniture Items', 'Assembly Hardware'],
  'Specialty Equipment': ['Equipment Units', 'Installation Materials'],
  
  // Finishes - Exterior
  'Site': ['Paving Blocks', 'Concrete', 'Landscaping', 'Drainage'],
  'Parking': ['Concrete Paving', 'Line Marking', 'Signage'],
  'Landscaping': ['Plants', 'Soil', 'Mulch', 'Irrigation'],
  
  // Stairs & Railings
  'Stairs': ['Concrete (M25)', 'Rebar (TMT 500D)', 'Formwork', 'Nosing'],
  'Railings': ['MS Railings', 'Glass Panels', 'Welding', 'Paint'],
  
  // Default for unknown categories
  'Generic': ['Construction Materials', 'Labor', 'Equipment'],
};

// Get primary resource for an element category
export function getPrimaryResource(category: string | null): string {
  if (!category) return 'Construction Materials';
  
  const resources = RESOURCE_MAPPING[category];
  if (resources && resources.length > 0) {
    return resources[0]; // Return first (primary) resource
  }
  
  // Fallback: try to match partial category name
  for (const [key, value] of Object.entries(RESOURCE_MAPPING)) {
    if (category.toLowerCase().includes(key.toLowerCase()) || 
        key.toLowerCase().includes(category.toLowerCase())) {
      return value[0];
    }
  }
  
  return 'Construction Materials';
}

// Get all resources for an element category
export function getAllResources(category: string | null): string[] {
  if (!category) return ['Construction Materials'];
  
  const resources = RESOURCE_MAPPING[category];
  if (resources) return resources;
  
  // Fallback: try to match partial category name
  for (const [key, value] of Object.entries(RESOURCE_MAPPING)) {
    if (category.toLowerCase().includes(key.toLowerCase()) || 
        key.toLowerCase().includes(category.toLowerCase())) {
      return value;
    }
  }
  
  return ['Construction Materials'];
}

// Group elements by category for task creation
export function groupElementsByCategory(elements: Array<{ category: string | null }>): Map<string, number> {
  const categoryMap = new Map<string, number>();
  
  elements.forEach(element => {
    const category = element.category || 'Generic';
    categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
  });
  
  return categoryMap;
}

// Get task name from category
export function getTaskNameFromCategory(category: string): string {
  const taskNames: Record<string, string> = {
    'Structural Foundations': 'Foundation Work',
    'Foundation': 'Foundation Work',
    'Footings': 'Footing Construction',
    'Pile': 'Pile Foundation',
    'Structural Framing': 'Structural Steel Work',
    'Structural Columns': 'Column Construction',
    'Beams': 'Beam Construction',
    'Slabs': 'Slab Casting',
    'Floors': 'Floor Construction',
    'Walls': 'Masonry Work',
    'Curtain Walls': 'Curtain Wall Installation',
    'Curtain Panels': 'Curtain Panel Installation',
    'Partitions': 'Partition Work',
    'Doors': 'Door Installation',
    'Windows': 'Window Installation',
    'Glazing': 'Glazing Work',
    'Roofs': 'Roofing Work',
    'Roof': 'Roof Construction',
    'Ceilings': 'Ceiling Work',
    'Mechanical Equipment': 'HVAC Installation',
    'Air Terminals': 'Air Terminal Installation',
    'Ducts': 'Ductwork Installation',
    'Electrical Equipment': 'Electrical Panel Installation',
    'Electrical Fixtures': 'Electrical Fixture Installation',
    'Lighting Fixtures': 'Lighting Installation',
    'Cable Trays': 'Cable Tray Installation',
    'Plumbing Fixtures': 'Plumbing Fixture Installation',
    'Pipes': 'Piping Work',
    'Pipe Accessories': 'Pipe Accessory Installation',
    'Sprinklers': 'Sprinkler Installation',
    'Fire Protection': 'Fire Protection System',
    'Casework': 'Casework Installation',
    'Furniture': 'Furniture Installation',
    'Specialty Equipment': 'Equipment Installation',
    'Site': 'Site Work',
    'Parking': 'Parking Construction',
    'Landscaping': 'Landscaping Work',
    'Stairs': 'Staircase Construction',
    'Railings': 'Railing Installation',
    'Generic': 'General Construction',
  };
  
  return taskNames[category] || `${category} Work`;
}
