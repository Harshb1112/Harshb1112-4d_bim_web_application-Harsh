# Email Verification Setup Guide

## Problem
Email verification links were pointing to `localhost:3000` in production, causing "Page Not Found" errors when users tried to verify their email.

## Solution Implemented

### 1. Dynamic URL Detection
Created a helper function `getBaseUrl()` in `lib/url-helper.ts` that automatically detects the correct base URL:

- **Development**: Uses `http://localhost:3000`
- **Production**: Automatically detects from request headers (`x-forwarded-proto` and `x-forwarded-host`)
- **Override**: Can be set explicitly via `NEXTAUTH_URL` environment variable

### 2. Updated Routes
Modified the following API routes to use dynamic URL detection:
- `app/api/auth/register/route.ts` - User registration with email verification
- `app/api/users/invite/route.ts` - User invitation emails

## Vercel Deployment Setup

### Option 1: Automatic (Recommended)
The code now automatically detects the production URL from request headers. No additional configuration needed!

### Option 2: Manual Override
If you want to explicitly set the URL, add this environment variable in Vercel:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add:
   - **Key**: `NEXTAUTH_URL`
   - **Value**: `https://your-domain.vercel.app` (your actual production URL)
   - **Environment**: Production

## Testing

### Local Testing
```bash
# Email will use http://localhost:3000
npm run dev
```

### Production Testing
After deployment:
1. Register a new user
2. Check the email - verification link should point to your production domain
3. Click the link - should successfully verify

## How It Works

```typescript
// Priority order:
1. NEXTAUTH_URL env variable (if set)
2. Request headers (x-forwarded-proto + x-forwarded-host) 
3. Fallback to localhost:3000
```

## Verification Flow

1. User registers → Email sent with verification link
2. User clicks link → Redirected to `/api/auth/verify-email?token=xxx`
3. Token validated → User marked as verified
4. User can now login

## Troubleshooting

### Still getting localhost URLs?
- Clear your environment variables cache in Vercel
- Redeploy the application
- Check that `x-forwarded-host` header is being passed (Vercel does this automatically)

### Email not sending?
- Check email configuration in `.env`:
  - `EMAIL_HOST`
  - `EMAIL_PORT`
  - `EMAIL_USER`
  - `EMAIL_PASSWORD`
- Check Vercel logs for email errors

### Token expired?
- Tokens expire after 24 hours
- User needs to register again or request a new verification email
