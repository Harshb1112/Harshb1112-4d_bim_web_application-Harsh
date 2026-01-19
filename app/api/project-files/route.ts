import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import { writeFile, mkdir } from 'fs/promises';
import * as path from 'path';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = req.nextUrl.searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const files = await prisma.projectFile.findMany({
      where: { projectId: parseInt(projectId) },
      orderBy: { uploadedAt: 'desc' }
    });

    return NextResponse.json(files);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    const formData = await req.formData();
    
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;
    const category = formData.get('category') as string;
    const description = formData.get('description') as string;

    if (!file || !projectId) {
      return NextResponse.json({ error: 'File and project ID required' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), 'uploads', 'project-files', projectId);
    await mkdir(uploadDir, { recursive: true });

    const fileName = `${Date.now()}-${file.name}`;
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    const projectFile = await prisma.projectFile.create({
      data: {
        projectId: parseInt(projectId),
        name: file.name,
        fileName: fileName,
        fileType: file.type,
        fileSize: file.size,
        filePath: `/uploads/project-files/${projectId}/${fileName}`,
        category: category || null,
        description: description || null,
        uploadedBy: decoded.userId
      }
    });

    return NextResponse.json(projectFile);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
