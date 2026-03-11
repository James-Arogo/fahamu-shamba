# Twilio SMS Setup Guide

## ✅ Twilio Works on Localhost!

Twilio **does work on localhost** for sending SMS messages. You don't need a public URL to send SMS - only if you want to receive webhooks (callbacks).

## Quick Setup

### 1. Install Twilio SDK

```bash
cd backend
npm install twilio
```

### 2. Get Twilio Credentials

1. Sign up at [https://console.twilio.com/](https://console.twilio.com/)
2. Get your **Account SID** and **Auth Token** from the dashboard
3. Get a **Phone Number** (trial account includes a free number)

### 3. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```env
# SMS Provider Selection
SMS_PROVIDER=twilio  # or 'auto', 'safaricom'

# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+12345678900  # Your Twilio phone number in E.164 format
```

### 4. Start the Server

```bash
npm start
```

### 5. Test SMS Sending

1. Open `index.html` in your browser
2. Enter a phone number (verified number for trial account)
3. Get a crop recommendation
4. SMS will be sent immediately!

## For Webhooks (Optional)

If you need to receive webhooks from Twilio (e.g., delivery status, incoming SMS), use **ngrok**:

### Install ngrok

```bash
npm install -g ngrok
# or
npx ngrok http 5000
```

### Start ngrok

```bash
ngrok http 5000
```

This will give you a public URL like: `https://abc123.ngrok.io`

Update your Twilio webhook URLs in the Twilio Console to point to:
- `https://abc123.ngrok.io/api/twilio/webhook` (or your endpoint)

## SMS Provider Modes

### Auto Mode (Recommended)
```env
SMS_PROVIDER=auto
```
- Tries Twilio first (works on localhost)
- Falls back to Safaricom if Twilio fails
- Best for development and production

### Twilio Only
```env
SMS_PROVIDER=twilio
```
- Uses Twilio exclusively
- Perfect for localhost development

### Safaricom Only
```env
SMS_PROVIDER=safaricom
```
- Uses Safaricom SMS API
- Requires public URL for webhooks

## Testing with Trial Account

Twilio trial accounts can only send SMS to **verified phone numbers**:

1. Go to [Twilio Console → Phone Numbers → Manage → Verified Caller IDs](https://console.twilio.com/us1/develop/phone-numbers/manage/verified)
2. Add your phone number
3. Verify it via SMS/call
4. Now you can send SMS to that number!

## Production Setup

1. **Upgrade Twilio Account** - Remove trial limitations
2. **Buy a Phone Number** - Get a Kenyan number if needed
3. **Set up Webhooks** - Use a production URL (not ngrok)
4. **Monitor Usage** - Check Twilio Console for delivery status

## Troubleshooting

### "Twilio SDK not installed"
```bash
cd backend
npm install twilio
```

### "Twilio SMS not configured"
Make sure you've set all three environment variables:
- `TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- `TWILIO_AUTH_TOKEN=your_twilio_auth_token_here`
- `TWILIO_PHONE_NUMBER=+12345678900`

### "Invalid phone number format"
Phone numbers should be in E.164 format:
- Kenyan: `+254712345678`
- Or: `0712345678` (will be auto-converted)

### "Trial account can't send to this number"
- Add the number to verified caller IDs in Twilio Console
- Or upgrade to a paid account

## Advantages of Twilio

✅ **Works on localhost** - No public URL needed for sending SMS  
✅ **Easy setup** - Just API credentials  
✅ **Global coverage** - Works worldwide  
✅ **Trial account** - Free testing with verified numbers  
✅ **Webhook support** - Delivery status, incoming SMS  
✅ **Developer-friendly** - Great documentation and SDK  

## Cost Comparison

- **Twilio**: ~$0.0075 per SMS (Kenya)
- **Safaricom**: Varies by package
- **Trial Account**: Free for verified numbers

---

**Need help?** Check [Twilio Documentation](https://www.twilio.com/docs/sms) or the code comments in `server.js`.
