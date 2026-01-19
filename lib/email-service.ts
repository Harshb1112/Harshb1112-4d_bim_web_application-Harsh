import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

// Generic email sending function
export async function sendEmail(options: {
  to: string
  subject: string
  html: string
  from?: string
}) {
  const mailOptions = {
    from: options.from || process.env.SMTP_FROM || process.env.SMTP_USER,
    to: options.to,
    subject: options.subject,
    html: options.html,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log('✅ Email sent to:', options.to)
    return { success: true }
  } catch (error) {
    console.error('❌ Failed to send email:', error)
    return { success: false, error }
  }
}

export async function sendTaskAssignmentEmail(
  userEmail: string,
  userName: string,
  taskName: string,
  projectName: string,
  taskUrl: string
) {
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: userEmail,
    subject: `🎯 New Task Assigned: ${taskName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 New Task Assigned</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${userName}</strong>,</p>
            <p>You have been assigned a new task in the <strong>${projectName}</strong> project:</p>
            <h2 style="color: #667eea;">${taskName}</h2>
            <p>Click the button below to view the task details:</p>
            <a href="${taskUrl}" class="button">View Task</a>
            <p>Best regards,<br>4D BIM Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email from 4D BIM Application</p>
            <p>To manage your notification preferences, visit Settings</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log('✅ Task assignment email sent to:', userEmail)
    return { success: true }
  } catch (error) {
    console.error('❌ Failed to send task assignment email:', error)
    return { success: false, error }
  }
}

export async function sendProjectUpdateEmail(
  userEmail: string,
  userName: string,
  projectName: string,
  updateMessage: string,
  projectUrl: string
) {
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: userEmail,
    subject: `📊 Project Update: ${projectName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Project Update</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${userName}</strong>,</p>
            <p>There's an update in the <strong>${projectName}</strong> project:</p>
            <div style="background: white; padding: 15px; border-left: 4px solid #f5576c; margin: 20px 0;">
              ${updateMessage}
            </div>
            <a href="${projectUrl}" class="button">View Project</a>
            <p>Best regards,<br>4D BIM Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email from 4D BIM Application</p>
            <p>To manage your notification preferences, visit Settings</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log('✅ Project update email sent to:', userEmail)
    return { success: true }
  } catch (error) {
    console.error('❌ Failed to send project update email:', error)
    return { success: false, error }
  }
}

export async function sendWeeklyDigestEmail(
  userEmail: string,
  userName: string,
  stats: {
    tasksCompleted: number
    tasksInProgress: number
    tasksPending: number
    projectsActive: number
  }
) {
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: userEmail,
    subject: `📈 Your Weekly Digest - 4D BIM`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .stat-box { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
          .stat-number { font-size: 32px; font-weight: bold; color: #4facfe; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📈 Your Weekly Digest</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${userName}</strong>,</p>
            <p>Here's your weekly summary:</p>
            
            <div class="stat-box">
              <div>
                <h3 style="margin: 0;">✅ Tasks Completed</h3>
                <p style="margin: 5px 0; color: #666;">Great job!</p>
              </div>
              <div class="stat-number">${stats.tasksCompleted}</div>
            </div>
            
            <div class="stat-box">
              <div>
                <h3 style="margin: 0;">🔄 Tasks In Progress</h3>
                <p style="margin: 5px 0; color: #666;">Keep going!</p>
              </div>
              <div class="stat-number">${stats.tasksInProgress}</div>
            </div>
            
            <div class="stat-box">
              <div>
                <h3 style="margin: 0;">📋 Tasks Pending</h3>
                <p style="margin: 5px 0; color: #666;">Time to start!</p>
              </div>
              <div class="stat-number">${stats.tasksPending}</div>
            </div>
            
            <div class="stat-box">
              <div>
                <h3 style="margin: 0;">🏗️ Active Projects</h3>
                <p style="margin: 5px 0; color: #666;">You're involved in</p>
              </div>
              <div class="stat-number">${stats.projectsActive}</div>
            </div>
            
            <p style="margin-top: 30px;">Keep up the great work!</p>
            <p>Best regards,<br>4D BIM Team</p>
          </div>
          <div class="footer">
            <p>This is an automated weekly digest from 4D BIM Application</p>
            <p>To manage your notification preferences, visit Settings</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log('✅ Weekly digest email sent to:', userEmail)
    return { success: true }
  } catch (error) {
    console.error('❌ Failed to send weekly digest email:', error)
    return { success: false, error }
  }
}

export async function send2FACodeEmail(
  userEmail: string,
  userName: string,
  code: string
) {
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: userEmail,
    subject: `🔐 Your 2FA Code - 4D BIM`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; text-align: center; }
          .code-box { background: white; padding: 30px; margin: 20px 0; border-radius: 10px; border: 2px dashed #fa709a; }
          .code { font-size: 48px; font-weight: bold; color: #fa709a; letter-spacing: 10px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Two-Factor Authentication</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${userName}</strong>,</p>
            <p>Your 2FA verification code is:</p>
            <div class="code-box">
              <div class="code">${code}</div>
            </div>
            <p style="color: #666;">This code will expire in 10 minutes.</p>
            <p style="color: #fa709a; font-weight: bold;">⚠️ Never share this code with anyone!</p>
            <p>Best regards,<br>4D BIM Team</p>
          </div>
          <div class="footer">
            <p>This is an automated security email from 4D BIM Application</p>
            <p>If you didn't request this code, please contact support immediately</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log('✅ 2FA code email sent to:', userEmail)
    return { success: true }
  } catch (error) {
    console.error('❌ Failed to send 2FA code email:', error)
    return { success: false, error }
  }
}

export async function sendDataExportEmail(
  userEmail: string,
  userName: string,
  downloadUrl: string
) {
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: userEmail,
    subject: `📦 Your Data Export is Ready - 4D BIM`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); color: #333; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📦 Data Export Ready</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${userName}</strong>,</p>
            <p>Your data export is ready for download!</p>
            <p>This export includes:</p>
            <ul>
              <li>Your profile information</li>
              <li>All your tasks and comments</li>
              <li>Team memberships</li>
              <li>Project associations</li>
              <li>Settings and preferences</li>
            </ul>
            <a href="${downloadUrl}" class="button">Download Your Data</a>
            <p style="color: #666; font-size: 14px;">⚠️ This link will expire in 7 days for security reasons.</p>
            <p>Best regards,<br>4D BIM Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email from 4D BIM Application</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log('✅ Data export email sent to:', userEmail)
    return { success: true }
  } catch (error) {
    console.error('❌ Failed to send data export email:', error)
    return { success: false, error }
  }
}
