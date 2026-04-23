# Deployment Checklist & Risk Mitigation Guide

## Pre-Deployment Checklist

### Backend (Render)
- [ ] All environment variables are correctly set in `.env` file with UPPERCASE keys
  - [ ] `PORT` (not `port`)
  - [ ] `MONGO_URI`
  - [ ] `JWT_SECRET`
  - [ ] `CLOUDINARY_CLOUD_NAME`
  - [ ] `CLOUDINARY_API_KEY`
  - [ ] `CLOUDINARY_API_SECRET`
- [ ] `render.yaml` is in root directory and properly configured
- [ ] `package.json` has correct start script: `"start": "node index.js"`
- [ ] All npm dependencies are listed in `package.json`
- [ ] Test locally: `npm start` runs without errors
- [ ] Health check endpoint works: `GET /api/health` returns 200
- [ ] MongoDB connection string is valid and database is accessible
- [ ] All routes are prefixed with `/api/` (e.g., `/api/auth`, `/api/posts`)

### Frontend (Vercel)
- [ ] `vercel.json` is in root directory and properly configured
- [ ] `frontend/config.js` has correct API URL for production
- [ ] All environment variables are set in Vercel dashboard
- [ ] Test locally: `npm start` or open `frontend/index.html` works
- [ ] Links to other pages are correct (relative paths)
- [ ] API calls use the `API_BASE_URL` from config, not hardcoded URLs
- [ ] No console errors in browser DevTools

## Deployment Process

### 1. Deploy Backend (Render)
```bash
# Push changes to GitHub
git add .
git commit -m "Ready for deployment"
git push origin main

# On Render:
# 1. Connect your GitHub repository
# 2. Set environment variables in Render dashboard
# 3. Deploy will auto-start (watch logs for errors)
# 4. Test: Visit https://heart-nest.onrender.com/api/health
```

### 2. Deploy Frontend (Vercel)
```bash
# Push changes to GitHub (if not already done)
git add .
git commit -m "Frontend updates"
git push origin main

# On Vercel:
# 1. Connect your GitHub repository
# 2. Set root directory to: frontend/ (or /)
# 3. Deploy will auto-start
# 4. Test: Visit your Vercel URL
```

## Post-Deployment Verification

- [ ] Backend health check: `https://heart-nest.onrender.com/api/health` returns status
- [ ] Frontend loads without 404 errors
- [ ] Sign in page loads and connects to backend API
- [ ] Sign up functionality works
- [ ] Dashboard loads with data from backend
- [ ] Community page works
- [ ] Profile page works
- [ ] Check browser console for errors (F12 DevTools)
- [ ] Check browser Network tab for failed requests

## Common Issues & Solutions

### 404 Errors on Frontend
**Causes:**
- Missing `vercel.json` configuration
- Incorrect root directory set in Vercel
- Routes not properly configured

**Solution:**
- Ensure `vercel.json` exists in root
- Check Vercel project settings for correct root directory
- Test health endpoint to ensure frontend can reach backend

### Backend Not Starting
**Causes:**
- Missing environment variables
- Lowercase `port` instead of `PORT`
- Database connection string invalid
- Port already in use

**Solution:**
- Verify all env vars in Render dashboard
- Check `.env` file uses uppercase keys
- Test MongoDB connection: try connecting in MongoDB Atlas dashboard
- Use a different PORT if needed

### API Calls Failing (CORS/404)
**Causes:**
- Hardcoded API URL instead of using config
- CORS not enabled on backend
- Wrong API endpoint path

**Solution:**
- Use `window.APP_CONFIG.API_BASE_URL` in frontend code
- Ensure `app.use(cors())` is in backend
- Verify routes match: `/api/auth`, `/api/posts`, `/api/users`

## Monitoring & Maintenance

### Weekly Checks
- [ ] Test the health endpoint: `GET /api/health`
- [ ] Try signing in from deployed frontend
- [ ] Check Render logs for errors
- [ ] Check Vercel analytics for 404s

### Monthly Checks
- [ ] Review error logs for patterns
- [ ] Check MongoDB storage usage
- [ ] Verify Cloudinary API limits
- [ ] Test all major features end-to-end

### Logs Location
- **Render Backend Logs:** Render Dashboard > Services > heart-nest-backend > Logs
- **Vercel Frontend Logs:** Vercel Dashboard > Deployments > View logs
- **MongoDB Logs:** MongoDB Atlas Dashboard > Collections

## Environment Variables Template

Create a `.env` file in `Backend/` with exact casing:

```
PORT=5500
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Version Control Best Practices

- [ ] Never commit `.env` file (add to `.gitignore`)
- [ ] Store production secrets only in deployment platform dashboards
- [ ] Tag releases: `git tag -a v1.0.0 -m "Initial deployment"`
- [ ] Keep main branch deployment-ready

## Rollback Procedure (if something breaks)

1. **For Backend:** Go to Render dashboard > Deployments > select previous working version > Rollback
2. **For Frontend:** Go to Vercel dashboard > Deployments > select previous working version > Promote

## Contact & Support

- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- MongoDB Atlas: https://www.mongodb.com/cloud/atlas
