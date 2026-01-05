import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check environment variables
    const requiredEnvVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'NEXTAUTH_URL'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(
      envVar => !process.env[envVar]
    );
    
    if (missingEnvVars.length > 0) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Missing environment variables',
          missing: missingEnvVars,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      status: 'healthy',
      message: '4D BIM Web Application is running',
      database: 'connected',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      version: '1.1.0'
    });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}