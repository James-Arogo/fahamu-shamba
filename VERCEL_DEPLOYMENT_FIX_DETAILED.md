# Vercel Deployment Fix - Complete Guide

## Issue Summary
The 500 FUNCTION_INVOCATION_FAILED error occurs because:
1. Database initialization blocks the serverless function startup (>10s timeout)
2. SQLite doesn't work reliably on Vercel's ephemeral filesystem
3. Missing environment variables for PostgreSQL connection

## Solution

### Step 1: Push Code Changes
The following files have been updated:

**✅ backend/server.js**
- Added lazy database initialization for Vercel
- Added middleware to ensure DB is ready before processing requests
- Updated health check to handle initialization state

**✅ vercel.json**
- Updated build configuration with 30s timeout
- Added proper route handling

**✅ .env.production**
- Created with required environment variables

### Step 2: Set Environment Variables in Vercel Dashboard

1. Go to: https://vercel.com/dashboard
2. Select your project: `fahamu-shamba`
3. Click **Settings** → **Environment Variables**
4. Add these variables (important - use STRONG secrets):

```
NODE_ENV               production
VERCEL                 true
PORT                   3000
DB_DIALECT             postgres
DB_TIMEOUT             5000
DB_POOL_MIN            1
DB_POOL_MAX            5
ADMIN_JWT_SECRET       [generate random: openssl rand -hex 32]
ADMIN_REFRESH_SECRET   [generate random: openssl rand -hex 32]
PASSWORD_SALT          [generate random: openssl rand -hex 32]
DATABASE_URL           [your PostgreSQL connection string]
```

### Step 3: Use PostgreSQL (Recommended)

For production, you MUST use PostgreSQL, not SQLite.

**Option A: Use Vercel Postgres (Easiest)**
1. In Vercel Dashboard, go to **Storage** tab
2. Click **Create Database**
3. Choose **Postgres**
4. Copy the connection string to DATABASE_URL

**Option B: Use External PostgreSQL**
1. Get your PostgreSQL connection string from your provider
2. Set DATABASE_URL in environment variables

### Step 4: Redeploy

```bash
# Push changes to GitHub
git add backend/server.js vercel.json .env.production
git commit -m "Fix: Vercel serverless deployment with lazy DB init"
git push

# Vercel will auto-deploy from GitHub
# Monitor: https://vercel.com/dashboard → fahamu-shamba → Deployments
```

### Step 5: Test Deployment

Once deployed:

```bash
# Health check
curl https://fahamu-shamba.vercel.app/api/health

# Should return:
{
  "success": true,
  "status": "Initializing",
  "timestamp": "2026-03-11T...",
  "uptime": 0.123
}

# Test API
curl https://fahamu-shamba.vercel.app/api/test

# Test recommendation
curl -X POST https://fahamu-shamba.vercel.app/api/analyze-farm \
  -H "Content-Type: application/json" \
  -d '{
    "subCounty": "bondo",
    "soilType": "loam",
    "season": "long_rains"
  }'
```

## Troubleshooting

### Still Getting 500 Error?

1. **Check Vercel logs:**
   ```
   https://vercel.com/dashboard → fahamu-shamba → Functions → Check logs
   ```

2. **Verify DATABASE_URL is set:**
   - Must be PostgreSQL (not SQLite)
   - Format: `postgresql://user:password@host:port/dbname`
   - Not SQLite file path

3. **Check timeout:**
   - vercel.json maxDuration should be 30+
   - DB query timeout (DB_TIMEOUT) should be 5000ms

4. **Clear cache and redeploy:**
   ```bash
   git commit --allow-empty -m "Trigger redeploy"
   git push
   ```

### Database Connection String Format

**PostgreSQL (correct):**
```
postgresql://user:password@localhost:5432/fahamu_shamba
postgres://user:password@localhost:5432/fahamu_shamba
```

**SQLite (won't work on Vercel):**
```
/path/to/fahamu_shamba.db  ❌ WRONG
```

### Environment Variable Issues

Verify all variables are set:
```bash
curl 'https://fahamu-shamba.vercel.app/api/health?debug=1'
# (Add debug logging in server if needed)
```

## File Changes Summary

### server.js
- Lines 552-570: Added lazy database initialization
- Lines 384-398: Added DB init middleware
- Lines 4816-4830: Updated health check endpoint

### vercel.json
- Updated maxDuration to 30 seconds
- Added proper memory allocation (1024MB)
- Fixed route configuration

### .env.production
- New file with production configuration
- Use strong secrets for JWT tokens
- Database connection handled via DATABASE_URL

## Next Steps

1. ✅ Update environment variables in Vercel
2. ✅ Push code changes
3. ✅ Monitor first deployment
4. ✅ Test all major endpoints
5. ✅ Set up monitoring alerts
6. ✅ Review logs for any errors

## Success Indicators

After deployment:
- ✅ GET /api/health returns 200
- ✅ GET /api/test returns 200
- ✅ POST /api/analyze-farm works
- ✅ POST /api/register-farmer works
- ✅ Admin login accessible

## Support

If issues persist:
1. Check Vercel function logs
2. Verify DATABASE_URL environment variable
3. Test locally: `npm start` (should work locally first)
4. Check Vercel Postgres status
5. Review error codes in documentation

---

**Last Updated:** March 11, 2026  
**Status:** Ready for Deployment
