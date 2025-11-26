import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET - Fetch all team leaders with their teams
export async function GET() {
  try {
    const teamLeaders = await prisma.user.findMany({
      where: {
        role: 'team_leader'
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        teamMemberships: {
          where: {
            role: 'leader'
          },
          select: {
            team: {
              select: {
                id: true,
                name: true
              }
            }
          },
          take: 1
        }
      }
    })

    // Format the response to include team info
    const formattedLeaders = teamLeaders.map(leader => ({
      id: leader.id,
      fullName: leader.fullName,
      email: leader.email,
      teamId: leader.teamMemberships[0]?.team?.id || null,
      teamName: leader.teamMemberships[0]?.team?.name || null
    }))

    return NextResponse.json({ teamLeaders: formattedLeaders })
  } catch (error) {
    console.error('Error fetching team leaders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team leaders' },
      { status: 500 }
    )
  }
}
