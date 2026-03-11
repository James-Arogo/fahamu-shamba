#!/bin/bash

# Email OTP Setup Script
# This script helps configure email OTP for admin authentication

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  🌱 Fahamu Shamba - Email OTP Setup Helper             ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check if .env exists
ENV_FILE="backend/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env file not found at $ENV_FILE"
    exit 1
fi

echo "📧 Email Configuration Setup"
echo ""
echo "This will help you add Gmail SMTP configuration to your .env file"
echo ""
echo "Prerequisites:"
echo "1. Gmail account with 2-Step Verification enabled"
echo "2. App Password generated from Gmail"
echo ""
echo "Steps to get your Gmail App Password:"
echo "  1. Go to https://myaccount.google.com/security"
echo "  2. Enable '2-Step Verification' if not already enabled"
echo "  3. Go to 'App passwords' (near 2-Step Verification)"
echo "  4. Select 'Mail' and 'Windows Computer'"
echo "  5. Google will generate a 16-character password"
echo "  6. Copy the password (without spaces)"
echo ""
echo "Current .env configuration:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat "$ENV_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if EMAIL_USER already configured
if grep -q "EMAIL_USER" "$ENV_FILE"; then
    echo "✅ EMAIL_USER already configured"
else
    echo "❌ EMAIL_USER not configured"
fi

if grep -q "EMAIL_PASSWORD" "$ENV_FILE"; then
    echo "✅ EMAIL_PASSWORD already configured"
else
    echo "❌ EMAIL_PASSWORD not configured"
fi

echo ""
echo "To add email configuration, append these lines to your .env:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "# Email Configuration for OTP"
echo "EMAIL_USER=cjoarogo@gmail.com"
echo "EMAIL_PASSWORD=your-16-char-app-password"
echo ""
echo "# JWT Configuration (optional, defaults provided)"
echo "ADMIN_JWT_SECRET=your-secret-key-change-in-production"
echo "ADMIN_REFRESH_SECRET=your-refresh-secret-key"
echo ""
echo "# Password Salt (optional)"
echo "PASSWORD_SALT=your-salt-change-in-production"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Options to add configuration:"
echo ""
echo "Option 1: Manual Edit"
echo "  Edit: backend/.env"
echo "  Add the configuration lines shown above"
echo "  Replace 'your-16-char-app-password' with actual app password"
echo ""
echo "Option 2: Auto-append (if you have the app password)"
echo "  Set EMAIL_USER=cjoarogo@gmail.com"
echo "  Set EMAIL_PASSWORD=your-app-password"
echo "  Run: echo 'EMAIL_USER=cjoarogo@gmail.com' >> backend/.env"
echo "       echo 'EMAIL_PASSWORD=xxxx-xxxx-xxxx-xxxx' >> backend/.env"
echo ""
echo "After configuration:"
echo "  1. Restart the server: npm start (in backend/)"
echo "  2. Check console for: ✅ Email service configured and ready"
echo "  3. Try admin login with: cjoarogo@gmail.com / Jemo@721"
echo "  4. Check email for OTP code"
echo ""
echo "🔗 Documentation:"
echo "  Full guide: ADMIN_OTP_SETUP_GUIDE.md"
echo "  Quick ref:  ADMIN_OTP_QUICK_REFERENCE.md"
echo ""
