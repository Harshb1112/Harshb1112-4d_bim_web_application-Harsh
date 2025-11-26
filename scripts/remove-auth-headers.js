/**
 * Script to remove Authorization headers from all fetch calls
 * and replace with credentials: 'include'
 */

const fs = require('fs')
const path = require('path')

const filesToFix = [
  'components/project/tabs/AnalyticsDashboard.tsx',
  'components/project/tabs/ErrorLogViewer.tsx',
  'components/project/tabs/FourDSimulation.tsx',
  'components/project/tabs/ImportExport.tsx',
  'components/project/tabs/ScheduleManager.tsx',
  'components/project/LinkingPanel.tsx',
  'components/project/ProjectSettingsDialog.tsx',
  'components/project/SpeckleViewer.tsx',
  'components/profile/UserProfileForm.tsx'
]

filesToFix.forEach(file => {
  const filePath = path.join(process.cwd(), file)
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`)
    return
  }
  
  let content = fs.readFileSync(filePath, 'utf8')
  let modified = false
  
  // Pattern 1: Remove Authorization header with token from cookie
  const pattern1 = /headers:\s*{\s*'Authorization':\s*`Bearer\s*\$\{document\.cookie\.split\('token='\)\[1\]\?\.split\(';'\)\[0\]\}`\s*}/g
  if (pattern1.test(content)) {
    content = content.replace(pattern1, "credentials: 'include'")
    modified = true
  }
  
  // Pattern 2: Remove Authorization header with token variable
  const pattern2 = /headers:\s*{\s*'Authorization':\s*`Bearer\s*\$\{token\}`\s*}/g
  if (pattern2.test(content)) {
    content = content.replace(pattern2, "credentials: 'include'")
    modified = true
  }
  
  // Pattern 3: Remove Authorization from headers object
  const pattern3 = /'Authorization':\s*`Bearer\s*\$\{[^}]+\}`,?\s*/g
  if (pattern3.test(content)) {
    content = content.replace(pattern3, '')
    modified = true
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8')
    console.log(`✅ Fixed: ${file}`)
  } else {
    console.log(`ℹ️  No changes needed: ${file}`)
  }
})

console.log('\n✅ Done!')
