# Vercel Deployment Fix Guide

## Problem
SQLite doesn't work on Vercel serverless functions (no persistent file system).

## Solution: Use Vercel Postgres

### Step 1: Create Vercel Postgres Database

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project
3. Go to "Storage" tab
4. Click "Create Database"
5. Select "Postgres"
6. Choose a region close to your users (e.g., Washington D.C. for Kenya)
7. Click "Create"

### Step 2: Connect Database to Project

1. After creation, click "Connect Project"
2. Select your fahamu-shamba project
3. Vercel will automatically add these environment variables:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`
   - `POSTGRES_USER`
   - `POSTGRES_HOST`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DATABASE`

### Step 3: Update package.json

Make `pg` a required dependency (not optional):

```json
{
  "dependencies": {
    "pg": "^8.13.1"
  }
}
```

Remove from optionalDependencies:
```json
{
  "optionalDependencies": {
    "sqlite3": "^5.0.2"  // Remove this
  }
}
```

### Step 4: Add Environment Variables (Optional)

If you need additional config, add in Vercel dashboard under Settings > Environment Variables:

```
NODE_ENV=production
ADMIN_JWT_SECRET=your-secure-random-string-here
ADMIN_REFRESH_SECRET=your-secure-refresh-secret-here
PASSWORD_SALT=your-secure-salt-here
```

### Step 5: Redeploy

```bash
git add .
git commit -m "Fix: Configure for Vercel Postgres deployment"
git push origin main
```

Vercel will auto-deploy.

## Alternative: Use Neon or Supabase

If you prefer external Postgres:

### Neon (Free tier available)
1. Sign up at https://neon.tech
2. Create a project
3. Copy connection string
4. Add to Vercel env vars as `DATABASE_URL`

### Supabase (Free tier available)
1. Sign up at https://supabase.com
2. Create a project
3. Go to Settings > Database
4. Copy connection string (use "Connection pooling" for serverless)
5. Add to Vercel env vars as `DATABASE_URL`

## Verify Deployment

After deployment, check:
1. Visit your Vercel URL
2. Check `/api/health` endpoint
3. Check Vercel logs for any errors

## Common Issues

### Issue: "Cannot find module 'sqlite3'"
**Fix**: Remove sqlite3 from dependencies, use Postgres only

### Issue: "Database connection failed"
**Fix**: Verify DATABASE_URL or POSTGRES_URL is set in Vercel env vars

### Issue: "Function timeout"
**Fix**: Optimize database queries, add indexes, use connection pooling

## Your Code Already Supports Postgres!

Your `server.js` already has Postgres support:
- Line 56-60: Checks for POSTGRES_URL
- Line 61: Sets USE_POSTGRES flag
- Line 398-407: Initializes Postgres connection
- `db/postgres.js`: Full Postgres implementation

Just need to:
1. ✅ Add Postgres database
2. ✅ Set environment variables
3. ✅ Make `pg` a required dependency
4. ✅ Redeploy
