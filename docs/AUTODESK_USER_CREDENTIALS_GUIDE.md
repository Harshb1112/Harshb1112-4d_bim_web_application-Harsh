# Autodesk User Credentials Setup Guide

## Overview

Now each user can add their **own Autodesk app credentials** instead of using shared credentials. This means:

✅ Each user connects their own Autodesk ACC/BIM360 accounts  
✅ No shared API limits  
✅ Better security and privacy  
✅ Each user manages their own connections  

---

## For End Users

### Step 1: Create Your Autodesk App

1. Go to **[Autodesk Platform Services](https://aps.autodesk.com/)**
2. Sign in with your Autodesk account
3. Click **"Create App"** or use an existing app
4. Fill in the details:
   - **App Name**: "My 4D BIM Integration" (or any name)
   - **App Description**: "Personal integration for 4D BIM"
   - **Callback URL**: `https://4d-bim-web-application-harsh.vercel.app/api/autodesk/callback`
5. Click **"Create App"**

### Step 2: Get Your Credentials

1. After creating the app, you'll see:
   - **Client ID**: A long string like `mSWAP5Yj237bAIBAibDksMPTIby2Cl8vSHHSCLH0ZFbznr9G`
   - **Client Secret**: Another long string
2. **Copy both** - you'll need them in the next step

### Step 3: Add Credentials to 4D BIM App

1. Login to **4D BIM application**
2. Go to **Settings** (click your profile → Settings)
3. Click on **"Advanced"** tab
4. Scroll down to **"Autodesk Configuration"** section
5. Paste your **Client ID**
6. Paste your **Client Secret**
7. (Optional) Add **Callback URL** if different from default
8. Click **"Save Configuration"**

### Step 4: Connect Your Autodesk Account

1. Go to any project
2. Click **"Add 3D Model"**
3. Select **"Autodesk Construction Cloud"** or **"Autodesk Drive"**
4. Click **"Browse Autodesk"**
5. Click **"Add New Account"**
6. You'll be redirected to Autodesk login
7. Login with **your Autodesk account**
8. Accept permissions
9. You'll be redirected back to the app
10. Your Autodesk hubs/projects will appear!

---

## For Administrators

### No More Shared Credentials!

Previously, you had to:
- Create one Autodesk app
- Share Client ID and Secret with everyone
- Manage API limits for all users

Now:
- ✅ Each user creates their own Autodesk app
- ✅ Each user has their own API limits
- ✅ No shared credentials to manage
- ✅ Better security and scalability

### Migration from Shared Credentials

If you were using shared credentials before:

1. **Old way** (Environment variables):
   ```env
   AUTODESK_CLIENT_ID=shared-client-id
   AUTODESK_CLIENT_SECRET=shared-secret
   ```

2. **New way** (User-specific):
   - Each user adds their own credentials in Settings
   - System automatically uses user's credentials when available
   - Falls back to environment variables if user hasn't configured

### Deployment Checklist

- [ ] Database migration applied (adds autodesk_* columns to users table)
- [ ] New API route deployed: `/api/settings/autodesk-config`
- [ ] Settings page updated with Autodesk Configuration section
- [ ] Token route updated to use user-specific credentials
- [ ] User guide shared with all users

---

## Troubleshooting

### "Autodesk credentials not configured" error

**Solution**: User needs to add their credentials in Settings > Advanced > Autodesk Configuration

### "Request error" when clicking "Add New Account"

**Solution**: 
1. Check that callback URL is registered in Autodesk app settings
2. Verify Client ID and Secret are correct
3. Try in incognito/private window

### "No hubs found" after connecting

**Solution**:
1. Make sure user has access to at least one ACC/BIM360 hub
2. Check Autodesk account permissions
3. Verify the Autodesk app has correct scopes enabled

### User wants to change credentials

**Solution**:
1. Go to Settings > Advanced > Autodesk Configuration
2. Click "Change" button next to Client ID or Secret
3. Enter new credentials
4. Click "Save Configuration"

---

## Security Notes

### How Credentials are Stored

- ✅ Client ID and Secret are **encrypted** in database
- ✅ Only the user who added them can access them
- ✅ Credentials are never exposed in API responses
- ✅ Masked values (`••••••••`) shown in UI

### Best Practices

1. **Never share** your Client ID and Secret with others
2. **Rotate credentials** periodically for security
3. **Revoke access** in Autodesk portal if compromised
4. **Use separate apps** for development and production

---

## FAQ

### Q: Do I need to create a new Autodesk app?
**A:** Yes, each user should create their own app for better security and API limits.

### Q: Can I use the same app for multiple projects?
**A:** Yes! Once you add your credentials, they work for all projects in the 4D BIM app.

### Q: What if I don't have an Autodesk account?
**A:** You need an Autodesk account to access ACC/BIM360. Create one at [accounts.autodesk.com](https://accounts.autodesk.com/register)

### Q: Is there a cost for creating an Autodesk app?
**A:** No, creating an app on Autodesk Platform Services is free. You only pay for API usage based on your Autodesk subscription.

### Q: Can admin see my Autodesk credentials?
**A:** No, credentials are encrypted and only accessible by the user who added them.

### Q: What happens if I delete my credentials?
**A:** You won't be able to browse Autodesk files until you add new credentials. Existing models in projects are not affected.

---

## Support

If you need help:
1. Check this guide first
2. Try the troubleshooting section
3. Contact your system administrator
4. Visit [Autodesk APS Support](https://aps.autodesk.com/support)

---

## Summary

**Old System:**
- Shared credentials for everyone
- Admin manages everything
- API limits shared across all users

**New System:**
- Each user has their own credentials
- Users manage their own connections
- Independent API limits per user
- Better security and scalability

🎉 **Result**: More secure, scalable, and user-friendly Autodesk integration!
