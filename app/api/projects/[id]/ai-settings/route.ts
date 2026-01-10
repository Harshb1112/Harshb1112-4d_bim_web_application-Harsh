import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';

export async function PUT(
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
    const projectId = parseInt(id);
    const body = await request.json();
    const { aiEnabled, openaiApiKey } = body;

    // Check if user has access to project (admin/manager or team member)
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ...(user.role === 'admin' || user.role === 'manager'
          ? {}
          : {
              team: {
                members: {
                  some: { userId: user.id }
                }
              }
            })
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 403 }
      );
    }

    // Only admin/manager can update AI settings
    if (user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only admins and managers can update AI settings' },
        { status: 403 }
      );
    }

    // Update project AI settings
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        aiEnabled: aiEnabled || false,
        openaiApiKey: openaiApiKey || null
      }
    });

    console.log(`✅ AI settings updated for project ${projectId}:`, {
      aiEnabled: updatedProject.aiEnabled,
      hasApiKey: !!updatedProject.openaiApiKey
    });

    return NextResponse.json({
      success: true,
      message: 'AI settings updated successfully',
      aiEnabled: updatedProject.aiEnabled,
      hasApiKey: !!updatedProject.openaiApiKey
    });
  } catch (error) {
    console.error('Failed to update AI settings:', error);
    return NextResponse.json(
      { error: 'Failed to update AI settings' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch current AI settings
export async function GET(
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
    const projectId = parseInt(id);

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ...(user.role === 'admin' || user.role === 'manager'
          ? {}
          : {
              team: {
                members: {
                  some: { userId: user.id }
                }
              }
            })
      },
      select: {
        id: true,
        name: true,
        aiEnabled: true,
        openaiApiKey: true
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      aiEnabled: project.aiEnabled,
      hasApiKey: !!project.openaiApiKey,
      // Only return masked API key for security
      apiKeyPreview: project.openaiApiKey 
        ? `${project.openaiApiKey.substring(0, 10)}...${project.openaiApiKey.slice(-4)}`
        : null
    });
  } catch (error) {
    console.error('Failed to fetch AI settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI settings' },
      { status: 500 }
    );
  }
}
