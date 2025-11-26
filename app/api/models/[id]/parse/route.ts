import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseIFCFile } from '@/lib/ifc-parser';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const modelId = parseInt(id);

    // Get model from database
    const model = await prisma.model.findUnique({
      where: { id: modelId },
    });

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    if (model.source !== 'local_ifc') {
      return NextResponse.json(
        { error: 'Only IFC files can be parsed' },
        { status: 400 }
      );
    }

    if (!model.filePath) {
      return NextResponse.json(
        { error: 'File path not found' },
        { status: 400 }
      );
    }

    // Parse IFC file
    const elements = await parseIFCFile(model.filePath);

    // Save elements to database
    const createdElements = await Promise.all(
      elements.map((element) =>
        prisma.element.create({
          data: {
            modelId,
            guid: element.guid,
            category: element.category,
            family: element.family,
            typeName: element.typeName,
            level: element.level,
            parameters: element.properties,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      elementsCount: createdElements.length,
      message: `Parsed ${createdElements.length} elements from IFC file`,
    });
  } catch (error) {
    console.error('Parse error:', error);
    return NextResponse.json(
      { error: 'Failed to parse IFC file' },
      { status: 500 }
    );
  }
}
