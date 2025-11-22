// Test Manager Access
const baseUrl = 'http://localhost:3000'

async function testManagerAccess() {
  console.log('🧪 Testing Manager Access...\n')

  // 1. Login as Manager
  console.log('1️⃣ Logging in as Manager...')
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'manager@example.com',
      password: 'manager123'
    })
  })

  if (!loginResponse.ok) {
    console.error('❌ Login failed:', await loginResponse.text())
    return
  }

  const loginData = await loginResponse.json()
  console.log('✅ Login successful!')
  console.log('   User:', loginData.user.fullName)
  console.log('   Role:', loginData.user.role)
  console.log('   Token:', loginData.token.substring(0, 20) + '...')

  const token = loginData.token

  // 2. Get Projects
  console.log('\n2️⃣ Fetching projects as Manager...')
  const projectsResponse = await fetch(`${baseUrl}/api/projects`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  if (!projectsResponse.ok) {
    console.error('❌ Failed to fetch projects:', await projectsResponse.text())
    return
  }

  const projectsData = await projectsResponse.json()
  console.log('✅ Projects fetched successfully!')
  console.log(`   Total projects: ${projectsData.projects.length}`)
  
  projectsData.projects.forEach((project, index) => {
    console.log(`   ${index + 1}. ${project.name} (Team: ${project.team?.name || 'N/A'})`)
  })

  // 3. Get Teams
  console.log('\n3️⃣ Fetching teams as Manager...')
  const teamsResponse = await fetch(`${baseUrl}/api/teams`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  if (!teamsResponse.ok) {
    console.error('❌ Failed to fetch teams:', await teamsResponse.text())
    return
  }

  const teamsData = await teamsResponse.json()
  console.log('✅ Teams fetched successfully!')
  console.log(`   Total teams: ${teamsData.teams.length}`)
  
  teamsData.teams.forEach((team, index) => {
    console.log(`   ${index + 1}. ${team.name} (${team._count.members} members, ${team._count.projects} projects)`)
  })

  // 4. Get Dashboard Stats
  console.log('\n4️⃣ Fetching dashboard stats as Manager...')
  const statsResponse = await fetch(`${baseUrl}/api/dashboard/stats`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  if (!statsResponse.ok) {
    console.error('❌ Failed to fetch stats:', await statsResponse.text())
    return
  }

  const statsData = await statsResponse.json()
  console.log('✅ Dashboard stats fetched successfully!')
  console.log(`   Total Projects: ${statsData.stats.totalProjects}`)
  console.log(`   Total Tasks: ${statsData.stats.totalTasks}`)
  console.log(`   Total Teams: ${statsData.stats.totalTeams}`)

  // 5. Test Create Project
  console.log('\n5️⃣ Testing project creation as Manager...')
  const createProjectResponse = await fetch(`${baseUrl}/api/projects`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Test Project from Manager',
      description: 'This is a test project created by manager',
      teamId: 1, // Team A
      teamLeaderId: 3, // Team A Leader
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    })
  })

  if (!createProjectResponse.ok) {
    console.error('❌ Failed to create project:', await createProjectResponse.text())
    return
  }

  const newProject = await createProjectResponse.json()
  console.log('✅ Project created successfully!')
  console.log(`   Project ID: ${newProject.project.id}`)
  console.log(`   Project Name: ${newProject.project.name}`)
  console.log(`   Team: ${newProject.project.team.name}`)
  console.log(`   Team Leader: ${newProject.project.teamLeader.fullName}`)

  console.log('\n🎉 All tests passed! Manager access is working correctly.')
}

// Run the test
testManagerAccess().catch(error => {
  console.error('❌ Test failed with error:', error)
})
