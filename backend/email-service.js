import nodemailer from 'nodemailer';

/**
 * Email Service for sending OTP and notifications
 */

let transporter = null;

/**
 * Initialize email transporter
 */
export function initializeEmailService() {
  // Gmail configuration
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASSWORD || 'your-app-password'
    }
  });

  // Verify connection
  transporter.verify((error, success) => {
    if (error) {
      console.warn('⚠️  Email service not configured:', error.message);
      console.warn('   OTP codes will be logged to console instead');
      console.warn('   Set EMAIL_USER and EMAIL_PASSWORD in .env to enable email');
    } else {
      console.log('✅ Email service configured and ready');
    }
  });
}

/**
 * Send OTP via email
 */
export async function sendOTPEmail(email, otp) {
  if (!transporter) {
    console.log(`\n🔐 OTP Code for ${email}: ${otp}\n`);
    return {
      success: true,
      method: 'console',
      message: 'OTP sent to console (email not configured)'
    };
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '🌱 Fahamu Shamba - Admin Login OTP',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
            .container { max-width: 500px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; }
            .header { color: #2c5f2d; font-size: 24px; margin-bottom: 20px; }
            .content { color: #333; line-height: 1.6; }
            .otp-box { background-color: #f0f0f0; border-left: 4px solid #2c5f2d; padding: 15px; margin: 20px 0; font-size: 18px; font-weight: bold; letter-spacing: 2px; }
            .footer { color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">🌱 Fahamu Shamba Admin Portal</div>
            
            <div class="content">
              <p>Hello,</p>
              
              <p>You have requested to log in to the Fahamu Shamba Admin Dashboard.</p>
              
              <p>Your One-Time Password (OTP) is:</p>
              
              <div class="otp-box">${otp}</div>
              
              <p><strong>Important:</strong></p>
              <ul>
                <li>This code expires in 5 minutes</li>
                <li>Never share this code with anyone</li>
                <li>Fahamu Shamba will never ask for this code via email</li>
              </ul>
              
              <p>If you did not request this code, please ignore this email.</p>
              
              <div class="footer">
                <p>© 2025 Fahamu Shamba. All rights reserved.</p>
                <p>This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Your Fahamu Shamba Admin OTP is: ${otp}\n\nThis code expires in 5 minutes.\n\nDo not share this code with anyone.`
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log(`✅ OTP sent to ${email}`);
    
    return {
      success: true,
      method: 'email',
      messageId: info.messageId
    };
  } catch (error) {
    console.error('❌ Error sending OTP email:', error.message);
    
    // Fallback: log to console
    console.log(`\n🔐 OTP Code for ${email}: ${otp}\n`);
    
    return {
      success: false,
      method: 'email',
      error: error.message,
      fallback: 'console'
    };
  }
}

/**
 * Send farmer password reset code via email
 */
export async function sendFarmerPasswordResetEmail(email, otp, firstName = 'Farmer') {
  if (!transporter) {
    console.log(`\n🔐 Farmer password reset code for ${email}: ${otp}\n`);
    return {
      success: true,
      method: 'console',
      message: 'Reset code sent to console (email not configured)'
    };
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '🌱 Fahamu Shamba - Password Reset Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
            .container { max-width: 500px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; }
            .header { color: #2c5f2d; font-size: 24px; margin-bottom: 20px; }
            .content { color: #333; line-height: 1.6; }
            .otp-box { background-color: #f0f0f0; border-left: 4px solid #2c5f2d; padding: 15px; margin: 20px 0; font-size: 18px; font-weight: bold; letter-spacing: 2px; }
            .footer { color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">🌱 Fahamu Shamba Farmer Portal</div>

            <div class="content">
              <p>Hello ${firstName},</p>
              <p>You requested to reset your Fahamu Shamba account password.</p>
              <p>Your password reset code is:</p>
              <div class="otp-box">${otp}</div>
              <p><strong>Important:</strong></p>
              <ul>
                <li>This code expires in 10 minutes</li>
                <li>Never share this code with anyone</li>
              </ul>
              <p>If you did not request this reset, ignore this message.</p>

              <div class="footer">
                <p>© 2026 Fahamu Shamba. All rights reserved.</p>
                <p>This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hello ${firstName}, your Fahamu Shamba password reset code is ${otp}. This code expires in 10 minutes.`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Farmer password reset code sent to ${email}`);
    return {
      success: true,
      method: 'email',
      messageId: info.messageId
    };
  } catch (error) {
    console.error('❌ Error sending farmer reset email:', error.message);
    console.log(`\n🔐 Farmer password reset code for ${email}: ${otp}\n`);
    return {
      success: false,
      method: 'email',
      error: error.message,
      fallback: 'console'
    };
  }
}

/**
 * Send security alert email
 */
export async function sendSecurityAlertEmail(email, alertTitle, alertDetails) {
  if (!transporter) {
    console.log(`\n🚨 Security Alert for ${email}: ${alertTitle}\n`);
    return {
      success: true,
      method: 'console'
    };
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `🚨 Fahamu Shamba - ${alertTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
            .container { max-width: 500px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; }
            .alert { color: #d9534f; font-size: 18px; font-weight: bold; margin-bottom: 15px; }
            .details { background-color: #f9f9f9; padding: 15px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="alert">🚨 ${alertTitle}</div>
            <div class="details">
              ${alertDetails.split('\n').map(line => `<p>${line}</p>`).join('')}
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true, method: 'email' };
  } catch (error) {
    console.error('Error sending security alert:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send welcome email for new admin
 */
export async function sendWelcomeEmail(email, adminName) {
  if (!transporter) {
    console.log(`\n👋 Welcome email would be sent to ${email}\n`);
    return {
      success: true,
      method: 'console'
    };
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '🌱 Welcome to Fahamu Shamba Admin Dashboard',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
            .container { max-width: 500px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; }
            .header { color: #2c5f2d; font-size: 24px; margin-bottom: 20px; }
            .content { color: #333; line-height: 1.6; }
            .button { display: inline-block; background-color: #2c5f2d; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">🌱 Welcome to Fahamu Shamba Admin Dashboard</div>
            
            <div class="content">
              <p>Hello ${adminName},</p>
              
              <p>Your admin account has been successfully created. You can now access the Fahamu Shamba Admin Dashboard.</p>
              
              <p><strong>Quick Security Tips:</strong></p>
              <ul>
                <li>Enable Multi-Factor Authentication (MFA) on your account</li>
                <li>Use a strong, unique password</li>
                <li>Never share your login credentials</li>
                <li>Log out when finished with your session</li>
              </ul>
              
              <a href="http://localhost:5000/admin" class="button">Go to Admin Dashboard</a>
              
              <p style="margin-top: 20px; color: #666;">Questions? Contact your system administrator.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true, method: 'email' };
  } catch (error) {
    console.error('Error sending welcome email:', error.message);
    return { success: false, error: error.message };
  }
}

export default {
  initializeEmailService,
  sendOTPEmail,
  sendFarmerPasswordResetEmail,
  sendSecurityAlertEmail,
  sendWelcomeEmail
};
