# ResQ - Production Deployment Guide

This guide covers deploying the ResQ Emergency Response System to production, including database setup, Edge Functions deployment, and frontend hosting.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Deployment](#database-deployment)
3. [Edge Functions Deployment](#edge-functions-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [Post-Deployment Configuration](#post-deployment-configuration)
6. [Verification & Testing](#verification--testing)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts

- **Supabase Account**: Sign up at https://supabase.com
- **Hosting Provider Account**: Vercel, Netlify, or similar
- **Git Repository**: GitHub, GitLab, or Bitbucket

### Required Tools

```bash
# Node.js 18+
node --version

# Supabase CLI
npm install -g supabase

# Vercel CLI (if using Vercel)
npm install -g vercel

# Netlify CLI (if using Netlify)
npm install -g netlify-cli
```

### Environment Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env`
4. Get Supabase credentials (see [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md))

---

## Database Deployment

### 1. Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in project details:
   - **Name**: ResQ Production (or your choice)
   - **Database Password**: Generate a strong password (save it securely)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier works for development, Pro for production
4. Wait for project to be created (~2 minutes)

### 2. Install Supabase CLI

```bash
# Windows (PowerShell as Administrator)
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
iwr -useb https://get.supabase.com | iex

# macOS
brew install supabase/tap/supabase

# Linux
brew install supabase/tap/supabase
# or
curl -fsSL https://get.supabase.com | sh

# Verify installation
supabase --version
```

### 3. Link to Supabase Project

```bash
# Login to Supabase
npx supabase login

# Link to your project
npx supabase link --project-ref your-project-ref

# Find your project ref in Supabase Dashboard > Settings > General > Reference ID
```

### 4. Deploy Database Schema

```bash
# Push all migrations to Supabase
npx supabase db push

# Verify migration status
npx supabase migration list

# Expected output:
# ✓ 20250101000001_initial_schema.sql
# ✓ 20250101000002_rls_policies.sql
# ✓ 20250101000003_rpc_functions.sql
# ✓ 20250101000004_seed_data.sql
# ✓ 20250101000005_add_deduplication.sql
```

### 5. Enable Realtime Replication

**Via Supabase Dashboard:**

1. Go to Database > Replication
2. Enable replication for these tables:
   - `public.incidents`
   - `public.units`
   - `public.dispatches`
3. Configure broadcast settings for each table:
   - ✅ INSERT events
   - ✅ UPDATE events
   - ✅ DELETE events
4. Click "Save"

**Via SQL (Alternative):**

```sql
-- Enable realtime for incidents
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;

-- Enable realtime for units
ALTER PUBLICATION supabase_realtime ADD TABLE public.units;

-- Enable realtime for dispatches
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatches;
```

### 6. Verify Database Setup

```bash
# Check tables exist
npx supabase db dump --schema public --data-only -f verify.sql

# Should see: incidents, units, dispatches, profiles, attachments, audit_logs
```

---

## Edge Functions Deployment

### 1. Deploy Functions

```bash
# Deploy both functions at once
npx supabase functions deploy dispatch-preview dispatch-commit

# Or deploy individually
npx supabase functions deploy dispatch-preview
npx supabase functions deploy dispatch-commit

# Verify deployment
npx supabase functions list

# Expected output:
# dispatch-preview (deployed)
# dispatch-commit (deployed)
```

### 2. Set Function Secrets

Edge Functions need the service role key to bypass RLS:

```bash
# Set service role key secret
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Get your service role key from:
# Supabase Dashboard > Settings > API > service_role key

# Verify secrets are set
npx supabase secrets list

# Expected output:
# SUPABASE_SERVICE_ROLE_KEY (set)
```

### 3. Test Edge Functions

```bash
# Test dispatch-preview function
npx supabase functions invoke dispatch-preview \
  --body '{"incidentId":"INC-20250101-0001","unitIds":["UNIT-001"]}'

# Test dispatch-commit function
npx supabase functions invoke dispatch-commit \
  --body '{"incidentId":"INC-20250101-0001","unitIds":["UNIT-001"],"dispatcherId":"user-id"}'
```

### 4. View Function Logs

```bash
# View logs for dispatch-preview
npx supabase functions logs dispatch-preview

# View logs for dispatch-commit
npx supabase functions logs dispatch-commit

# Follow logs in real-time
npx supabase functions logs dispatch-preview --follow
```

---

## Frontend Deployment

### Option 1: Vercel (Recommended)

#### Automatic Deployment (GitHub Integration)

1. **Connect Repository**
   - Go to https://vercel.com/new
   - Import your Git repository
   - Vercel auto-detects Vite configuration

2. **Configure Environment Variables**
   - In project settings, go to "Environment Variables"
   - Add these variables for all environments (Production, Preview, Development):
     ```
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key
     ```
   - Get values from Supabase Dashboard > Settings > API

3. **Deploy**
   - Click "Deploy"
   - Vercel builds and deploys automatically
   - Future git pushes trigger automatic deployments

#### Manual Deployment (CLI)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy to production
vercel --prod

# Set environment variables (first time only)
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
```

### Option 2: Netlify

#### Automatic Deployment (GitHub Integration)

1. **Connect Repository**
   - Go to https://app.netlify.com/start
   - Connect your Git repository
   - Netlify auto-detects build settings

2. **Configure Build Settings**
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **Configure Environment Variables**
   - Go to Site settings > Environment variables
   - Add:
     ```
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key
     ```

4. **Deploy**
   - Click "Deploy site"
   - Future git pushes trigger automatic deployments

#### Manual Deployment (CLI)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Build the project
npm run build

# Deploy to production
netlify deploy --prod --dir=dist

# Set environment variables (first time only)
netlify env:set VITE_SUPABASE_URL "https://your-project.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "your-anon-key"
```

### Option 3: AWS S3 + CloudFront

```bash
# Build the project
npm run build

# Install AWS CLI
# Follow: https://aws.amazon.com/cli/

# Create S3 bucket
aws s3 mb s3://resq-production

# Enable static website hosting
aws s3 website s3://resq-production --index-document index.html

# Upload files
aws s3 sync dist/ s3://resq-production --delete

# Create CloudFront distribution (optional, for CDN)
# Follow AWS CloudFront documentation
```

### Option 4: Other Static Hosts

The `dist/` folder can be deployed to any static hosting service:

- **GitHub Pages**: Use `gh-pages` package
- **Google Cloud Storage**: Use `gsutil` CLI
- **Azure Static Web Apps**: Use Azure CLI
- **Firebase Hosting**: Use `firebase deploy`
- **Cloudflare Pages**: Connect via dashboard

---

## Post-Deployment Configuration

### 1. Configure CORS (if needed)

If your frontend and backend are on different domains:

1. Go to Supabase Dashboard > Settings > API
2. Add your frontend domain to "CORS allowed origins"
3. Example: `https://resq-production.vercel.app`

### 2. Configure Authentication Redirects

1. Go to Supabase Dashboard > Authentication > URL Configuration
2. Set "Site URL" to your production URL
3. Add redirect URLs for OAuth providers

### 3. Set Up Custom Domain (Optional)

#### Vercel
1. Go to project settings > Domains
2. Add your custom domain
3. Configure DNS records as instructed

#### Netlify
1. Go to Site settings > Domain management
2. Add custom domain
3. Configure DNS records as instructed

### 4. Enable HTTPS

Both Vercel and Netlify provide automatic HTTPS with Let's Encrypt certificates. No configuration needed.

### 5. Configure Rate Limiting (Recommended)

Add rate limiting to RPC functions in Supabase:

```sql
-- Example: Limit dispatch operations to 10 per minute per user
-- Implement using pg_cron or application-level rate limiting
```

---

## Verification & Testing

### 1. Test Database Connection

```bash
# From your local machine
npm run dev

# Check console for:
# ✓ Loading initial data from Supabase...
# ✓ Initializing real-time subscriptions...
```

### 2. Test Incident Creation

1. Visit your production URL
2. Go to citizen mode: `https://your-domain.com/?mode=citizen`
3. Create a test incident
4. Verify it appears in Supabase Dashboard > Table Editor > incidents

### 3. Test Real-Time Synchronization

1. Open production URL in two browser tabs
2. In Supabase Dashboard, run:
   ```sql
   UPDATE public.incidents
   SET status = 'responding'
   WHERE id = (SELECT id FROM public.incidents ORDER BY created_at DESC LIMIT 1);
   ```
3. Verify both tabs update in real-time

### 4. Test Dispatch Flow

1. Go to responder mode: `https://your-domain.com/?mode=responder`
2. Select an incident
3. Click "Dispatch Units"
4. Select a unit and confirm
5. Verify:
   - Route appears on map
   - Unit status updates to 'dispatched'
   - Incident status updates to 'responding'
   - Dispatch record created in database

### 5. Test Edge Functions

```bash
# Test from command line
curl -X POST https://your-project.supabase.co/functions/v1/dispatch-preview \
  -H "Authorization: Bearer your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{"incidentId":"INC-20250101-0001","unitIds":["UNIT-001"]}'
```

### 6. Run Automated Tests

```bash
# Run full test suite
npm test

# Run integration tests
npm test -- integration

# Check test coverage
npm test -- --coverage
```

### 7. Performance Testing

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run Lighthouse audit
lighthouse https://your-domain.com --view

# Target scores:
# Performance: 90+
# Accessibility: 95+
# Best Practices: 95+
# SEO: 90+
```

---

## Monitoring & Maintenance

### Supabase Dashboard Monitoring

1. **Database**
   - Monitor query performance
   - Check table sizes
   - Review slow queries

2. **API Logs**
   - View request logs
   - Monitor error rates
   - Check response times

3. **Edge Function Logs**
   - View function invocations
   - Monitor errors and timeouts
   - Check execution times

4. **Realtime**
   - Monitor active connections
   - Check message throughput
   - Review connection errors

### Application Monitoring

#### Set Up Error Tracking (Recommended)

**Sentry Integration:**

```bash
npm install @sentry/react @sentry/vite-plugin
```

```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
});
```

**LogRocket Integration:**

```bash
npm install logrocket
```

```typescript
// src/main.tsx
import LogRocket from 'logrocket';

LogRocket.init('your-app-id');
```

#### Set Up Analytics (Optional)

**Google Analytics:**

```bash
npm install react-ga4
```

**Plausible Analytics:**

```html
<!-- Add to index.html -->
<script defer data-domain="your-domain.com" src="https://plausible.io/js/script.js"></script>
```

### Database Maintenance

#### Regular Backups

```bash
# Manual backup
npx supabase db dump -f backup-$(date +%Y%m%d).sql

# Automated backups (set up cron job)
0 2 * * * cd /path/to/resq && npx supabase db dump -f backup-$(date +%Y%m%d).sql
```

#### Archive Old Data

```sql
-- Archive incidents older than 1 year
CREATE TABLE incidents_archive AS
SELECT * FROM incidents
WHERE created_at < NOW() - INTERVAL '1 year';

DELETE FROM incidents
WHERE created_at < NOW() - INTERVAL '1 year';
```

#### Optimize Database

```sql
-- Analyze tables for query optimization
ANALYZE incidents;
ANALYZE units;
ANALYZE dispatches;

-- Vacuum to reclaim storage
VACUUM ANALYZE;
```

### Performance Monitoring

#### Key Metrics to Track

- **Dashboard Load Time**: Target < 2 seconds
- **Real-time Update Latency**: Target < 100ms
- **API Response Time**: Target < 500ms
- **Error Rate**: Target < 1%
- **Uptime**: Target 99.9%

#### Set Up Alerts

Configure alerts in Supabase Dashboard:

1. Go to Settings > Alerts
2. Set up alerts for:
   - High error rate
   - Slow queries
   - High database CPU
   - Storage approaching limit

---

## Troubleshooting

### Common Issues

#### "Failed to load incidents"

**Symptoms:**
- Empty dashboard
- Console error: "Failed to fetch incidents"

**Solutions:**
1. Check `.env` file has correct values:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
2. Verify Supabase project is active (not paused)
3. Check RLS policies allow read access:
   ```sql
   -- Check policies
   SELECT * FROM pg_policies WHERE tablename = 'incidents';
   ```
4. Test connection manually:
   ```typescript
   const { data, error } = await supabase.from('incidents').select('count');
   console.log({ data, error });
   ```

#### "Real-time not working"

**Symptoms:**
- Changes in database don't appear in UI
- No WebSocket connection in DevTools

**Solutions:**
1. Enable replication in Supabase Dashboard > Database > Replication
2. Check WebSocket connection in browser DevTools > Network > WS
3. Verify RLS policies allow read access
4. Check for firewall/proxy blocking WebSocket connections
5. Test subscription manually:
   ```typescript
   const channel = supabase
     .channel('test')
     .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, 
       (payload) => console.log('Change:', payload))
     .subscribe();
   ```

#### "RPC function not found"

**Symptoms:**
- Error: "function public.preview_routes does not exist"
- Dispatch operations fail

**Solutions:**
1. Verify migrations are applied:
   ```bash
   npx supabase migration list
   ```
2. Re-run migrations:
   ```bash
   npx supabase db push --include-all
   ```
3. Check function exists:
   ```sql
   SELECT routine_name FROM information_schema.routines
   WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
   ```

#### "Edge Functions return 500"

**Symptoms:**
- Dispatch preview/commit fails
- Function logs show errors

**Solutions:**
1. Check function logs:
   ```bash
   npx supabase functions logs dispatch-preview
   npx supabase functions logs dispatch-commit
   ```
2. Verify service role key is set:
   ```bash
   npx supabase secrets list
   ```
3. Re-deploy functions:
   ```bash
   npx supabase functions deploy dispatch-preview dispatch-commit
   ```
4. Test function locally:
   ```bash
   npx supabase functions serve dispatch-preview
   ```

#### "Invalid LatLng" errors

**Symptoms:**
- Map crashes or doesn't render
- Console error: "Invalid LatLng object"

**Solutions:**
1. System should automatically filter invalid coordinates
2. Check for NaN/Infinity in database:
   ```sql
   SELECT id, lat, lng FROM incidents
   WHERE lat IS NULL OR lng IS NULL
      OR lat = 'NaN'::float OR lng = 'NaN'::float
      OR lat = 'Infinity'::float OR lng = 'Infinity'::float;
   ```
3. Clean up invalid data:
   ```sql
   DELETE FROM incidents
   WHERE lat IS NULL OR lng IS NULL
      OR lat = 'NaN'::float OR lng = 'NaN'::float
      OR lat = 'Infinity'::float OR lng = 'Infinity'::float;
   ```
4. Verify `extractLatLngFromRow()` is used everywhere

#### "Build fails on Vercel/Netlify"

**Symptoms:**
- Deployment fails during build
- TypeScript errors or missing dependencies

**Solutions:**
1. Check build logs for specific errors
2. Verify all dependencies are in `package.json`
3. Test build locally:
   ```bash
   npm run build
   ```
4. Check Node.js version matches (18+):
   ```json
   // package.json
   "engines": {
     "node": ">=18.0.0"
   }
   ```
5. Clear build cache and retry

#### "Environment variables not working in production"

**Symptoms:**
- App works locally but not in production
- Supabase connection fails

**Solutions:**
1. Verify variables are set in hosting provider dashboard
2. Check variable names are exact (case-sensitive)
3. Ensure variables are prefixed with `VITE_`
4. Redeploy after setting variables
5. Check build logs for variable values (they should be replaced)

### Getting Help

**Supabase Support:**
- Documentation: https://supabase.com/docs
- Discord: https://discord.supabase.com
- GitHub Issues: https://github.com/supabase/supabase/issues

**Hosting Support:**
- Vercel: https://vercel.com/support
- Netlify: https://www.netlify.com/support

**Project Issues:**
- Create an issue in your repository
- Include error logs and steps to reproduce

---

## Production Deployment Checklist

### Pre-Deployment

- [ ] All tests passing (`npm test`)
- [ ] Build succeeds locally (`npm run build`)
- [ ] Environment variables documented
- [ ] Database migrations tested
- [ ] Edge Functions tested locally
- [ ] Performance audit completed (Lighthouse)
- [ ] Security audit completed
- [ ] Accessibility audit completed (WCAG 2.1 AA)

### Database

- [ ] Supabase project created
- [ ] Database migrations applied
- [ ] RLS policies enabled and tested
- [ ] Realtime replication enabled
- [ ] Indexes created for performance
- [ ] Seed data loaded (if needed)
- [ ] Backup strategy configured

### Edge Functions

- [ ] Functions deployed to Supabase
- [ ] Service role key secret set
- [ ] Functions tested with production data
- [ ] Function logs reviewed
- [ ] Error handling verified

### Frontend

- [ ] Deployed to hosting provider
- [ ] Environment variables set
- [ ] Custom domain configured (if applicable)
- [ ] HTTPS enabled
- [ ] CORS configured
- [ ] Authentication redirects configured
- [ ] CDN configured (if applicable)

### Post-Deployment

- [ ] Database connection verified
- [ ] Real-time synchronization tested
- [ ] Incident creation tested
- [ ] Dispatch flow tested
- [ ] Edge Functions tested
- [ ] Performance metrics baseline established
- [ ] Error tracking configured
- [ ] Monitoring alerts configured
- [ ] Documentation updated
- [ ] Team notified

### Ongoing Maintenance

- [ ] Regular database backups scheduled
- [ ] Performance monitoring active
- [ ] Error tracking reviewed weekly
- [ ] Security updates applied monthly
- [ ] Database optimized quarterly
- [ ] Old data archived annually

---

## Rollback Procedure

If deployment fails or issues arise:

### 1. Rollback Frontend

**Vercel:**
```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]
```

**Netlify:**
```bash
# Rollback via dashboard
# Go to Deploys > Click on previous deploy > Publish deploy
```

### 2. Rollback Database

```bash
# Restore from backup
npx supabase db reset

# Or restore specific backup
psql -h your-db-host -U postgres -d postgres -f backup-20250101.sql
```

### 3. Rollback Edge Functions

```bash
# Redeploy previous version
git checkout previous-commit
npx supabase functions deploy dispatch-preview dispatch-commit
git checkout main
```

---

## Next Steps

After successful deployment:

1. **Monitor Performance**
   - Set up Lighthouse CI for continuous monitoring
   - Configure Supabase alerts
   - Review logs daily for first week

2. **Optimize**
   - Add CDN for static assets
   - Enable database connection pooling
   - Implement caching strategy

3. **Scale**
   - Upgrade Supabase plan if needed
   - Add read replicas for high traffic
   - Implement rate limiting

4. **Enhance**
   - Add push notifications
   - Implement analytics
   - Add more Edge Functions
   - Integrate third-party services

---

## Additional Resources

- **Supabase Documentation**: https://supabase.com/docs
- **Vite Deployment**: https://vitejs.dev/guide/static-deploy.html
- **Vercel Documentation**: https://vercel.com/docs
- **Netlify Documentation**: https://docs.netlify.com
- **PostgreSQL Performance**: https://www.postgresql.org/docs/current/performance-tips.html
- **Leaflet Documentation**: https://leafletjs.com/reference.html

---

## Support

For deployment issues or questions:

1. Check this guide and [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md)
2. Review [README.md](README.md) for general setup
3. Check Supabase Dashboard logs
4. Search Supabase Discord
5. Create an issue in the repository

---

<div align="center">
  <p><strong>Happy Deploying! 🚀</strong></p>
  <p>⚡ Seconds Save Lives ⚡</p>
</div>
