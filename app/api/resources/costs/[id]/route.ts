import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id } = await params;
    const costId = parseInt(id);
    if (isNaN(costId)) {
      return NextResponse.json({ error: 'Invalid cost ID' }, { status: 400 });
    }

    console.log(`🗑️ Attempting to delete cost ID: ${costId}`);

    // Check if cost exists and user has access
    const cost = await prisma.resourceCost.findUnique({
      where: { id: costId },
      include: {
        resource: {
          include: {
            project: {
              include: {
                team: {
                  include: {
                    members: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!cost) {
      console.log(`❌ Cost ID ${costId} not found in database`);
      return NextResponse.json({ error: 'Cost entry not found' }, { status: 404 });
    }

    console.log(`✅ Found cost: ${cost.id}, Resource: ${cost.resource.name}, Project: ${cost.resource.project.name}`);

    // Check permissions
    const hasAccess = 
      user.role === 'admin' || 
      user.role === 'manager' ||
      cost.resource.project.team?.members.some(m => m.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete the cost entry
    await prisma.resourceCost.delete({
      where: { id: costId }
    });

    console.log(`✅ Successfully deleted cost ID: ${costId}`);

    return NextResponse.json({ 
      success: true,
      message: 'Cost entry deleted successfully' 
    });

  } catch (error: any) {
    console.error('Delete cost error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete cost entry' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id } = await params;
    const costId = parseInt(id);
    if (isNaN(costId)) {
      return NextResponse.json({ error: 'Invalid cost ID' }, { status: 400 });
    }

    const body = await request.json();
    const { date, hours, quantity, unitCost, notes } = body;

    // Check if cost exists and user has access
    const cost = await prisma.resourceCost.findUnique({
      where: { id: costId },
      include: {
        resource: {
          include: {
            project: {
              include: {
                team: {
                  include: {
                    members: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!cost) {
      return NextResponse.json({ error: 'Cost entry not found' }, { status: 404 });
    }

    // Check permissions
    const hasAccess = 
      user.role === 'admin' || 
      user.role === 'manager' ||
      cost.resource.project.team?.members.some(m => m.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Calculate total cost
    const parsedUnitCost = parseFloat(unitCost) || 0;
    const parsedHours = hours ? parseFloat(hours) : null;
    const parsedQuantity = quantity ? parseFloat(quantity) : null;
    
    let totalCost = 0;
    if (parsedHours) {
      totalCost = parsedHours * parsedUnitCost;
    } else if (parsedQuantity) {
      totalCost = parsedQuantity * parsedUnitCost;
    }

    // Update the cost entry
    const updatedCost = await prisma.resourceCost.update({
      where: { id: costId },
      data: {
        date: date ? new Date(date) : undefined,
        hours: parsedHours,
        quantity: parsedQuantity,
        unitCost: parsedUnitCost,
        totalCost,
        notes: notes || null
      },
      include: {
        resource: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    });

    return NextResponse.json({ 
      success: true,
      cost: updatedCost,
      message: 'Cost entry updated successfully' 
    });

  } catch (error: any) {
    console.error('Update cost error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update cost entry' },
      { status: 500 }
    );
  }
}
