# HeartNest

HeartNest is a full-stack community platform where users can sign up, publish posts, like and comment on posts, follow other users, and manage profile information including avatar uploads.

## Table of Contents

- Overview
- Tech Stack
- Project Structure
- Features
- Local Development Setup
- Environment Variables
- API Reference
- Deployment Guide
- Pre-Deployment Checklist
- Troubleshooting
- Known Limitations

## Overview

This repository contains:

- A Node.js + Express + MongoDB backend API in the Backend folder.
- A multi-page static frontend in the frontend folder.

The backend handles authentication, users, posts, likes, comments, and avatar uploads.
The frontend consumes the backend API with fetch calls.

## Tech Stack

Backend:

- Node.js
- Express
- MongoDB + Mongoose
- JWT authentication
- Bcrypt password hashing
- Multer + Cloudinary for avatar upload
- Dotenv for configuration

Frontend:

- HTML/CSS/Vanilla JavaScript
- Browser localStorage/sessionStorage for auth/session state

## Project Structure

- Backend
  - index.js
  - package.json
  - config/cloudinary.js
  - middleware/auth.js
  - models/user.js
  - models/post.js
  - routes/authRoutes.js
  - routes/postRoutes.js
  - routes/userRoutes.js
- frontend
  - index.html
  - style.css
  - SignIn
  - SignUp
  - Dashboard
  - community
  - profile

## Features

- Account signup and signin with JWT token issuance
- Secure password hashing with bcrypt
- Auth-protected routes
- Create, list, like/unlike, and delete posts
- Create and delete comments
- Follow and unfollow users
- User profile view and edit (bio)
- Profile avatar upload to Cloudinary
- User search by username

## Local Development Setup

## 1) Prerequisites

- Node.js 18 or newer recommended
- MongoDB database (MongoDB Atlas or local)
- Cloudinary account for avatar uploads

## 2) Backend Setup

From repository root:

```bash
cd Backend
npm install
```

Create an environment file:

```bash
cp .env.example .env
```

If .env.example does not exist yet, create Backend/.env manually with the variables in the Environment Variables section below.

Start backend:

```bash
npm start
```

Expected startup logs include:

- MongoDB Connected
- server running on 5000 (or your configured PORT)

## 3) Frontend Setup

The frontend is static (no npm project required).

You can serve it with any static server. Example with Python:

```bash
cd frontend
python3 -m http.server 5500
```

Then open:

- http://localhost:5500

Important:

- Frontend API URLs are currently hardcoded to a deployed backend URL (https://heart-nest.onrender.com).
- For local backend testing, update those URLs to your local backend URL (for example, http://localhost:5000).

Files that currently contain hardcoded API URL usage:

- frontend/SignIn/signin.js
- frontend/SignUp/signup.js
- frontend/Dashboard/dashboard.js
- frontend/community/community.js
- frontend/profile/profile.js

## Environment Variables

Create Backend/.env with:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_strong_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Notes:

- Do not commit Backend/.env.
- Rotate all secrets immediately if they were ever exposed.

## API Reference

Base URL:

- Local: http://localhost:5000
- Production: your deployed backend URL

Authentication:

- For protected routes, send Authorization header:
  - Bearer <token>

## Auth Routes

- POST /api/auth/signup
  - Body: username, email, password
  - Response: message, token, userId, username

- POST /api/auth/signin
  - Body: email, password
  - Response: message, token, userId, username

## Post Routes (protected)

- POST /api/posts
  - Body: content
  - Creates a new post

- GET /api/posts
  - Gets community feed (all posts)

- GET /api/posts/mine
  - Gets current user's posts

- GET /api/posts/liked
  - Gets posts liked by current user

- DELETE /api/posts/:id
  - Deletes own post

- PUT /api/posts/:id/like
  - Toggles like/unlike

- POST /api/posts/:id/comments
  - Body: content
  - Adds comment to post

- DELETE /api/posts/:id/comments/:commentId
  - Deletes own comment

## User Routes (protected)

- GET /api/users/me
  - Gets authenticated user's full profile

- PUT /api/users/me
  - Body: bio, profilePic (optional)
  - Updates own profile fields

- POST /api/users/me/avatar
  - Form-Data field: avatar (image)
  - Uploads avatar to Cloudinary and updates profilePic

- GET /api/users/search?q=keyword
  - Searches users by username

- GET /api/users/:userId
  - Gets public profile by userId

- PUT /api/users/:userId/follow
  - Toggles follow/unfollow target user

## Deployment Guide

## 1) Deploy Backend

Recommended platforms: Render, Railway, Fly.io, or similar Node host.

Backend deployment configuration:

- Root directory: Backend
- Build command: npm install
- Start command: npm start
- Environment variables: set all variables from Environment Variables section

Database and cloud services:

- Ensure MONGO_URI is reachable from your host (Atlas recommended).
- Ensure Cloudinary keys are valid for avatar uploads.

Backend health check:

- GET / should return: API Running

## 2) Deploy Frontend

Recommended platforms: Netlify, Vercel (static), Cloudflare Pages, GitHub Pages.

Frontend deployment configuration:

- Publish directory: frontend

Before deploying frontend:

- Update all frontend API base URLs from https://heart-nest.onrender.com to your own deployed backend URL if different.
- Verify signin/signup/dashboard/community/profile pages all target the correct backend URL.

## 3) CORS and Security Hardening (Recommended)

Current backend CORS is open:

- app.use(cors())

For production, restrict allowed origins to your frontend domain(s).

Also recommended:

- Enforce HTTPS only
- Add request rate limiting
- Add input validation/sanitization
- Add security headers via helmet
- Add centralized error logging/monitoring

## Pre-Deployment Checklist

- Backend .env is configured with production values
- No secrets are committed
- JWT_SECRET is strong and unique
- MongoDB connection works from deployed backend
- Cloudinary upload works from deployed backend
- Frontend API URLs point to deployed backend
- CORS allows only intended frontend domains
- Signup/signin flow works end-to-end
- Create post / like / comment / delete flows work
- Profile update and avatar upload work
- Follow/unfollow flow works

## Troubleshooting

Backend fails to start:

- Check that MONGO_URI and JWT_SECRET are set
- Confirm Node version compatibility
- Check backend logs for connection/auth errors

401 No token provided:

- Ensure token is stored in localStorage after signin
- Ensure Authorization header is sent as Bearer token

403 Invalid or expired token:

- Sign in again to refresh token
- Verify JWT_SECRET consistency between token issuing and verification

Avatar upload failing:

- Confirm Cloudinary env values
- Confirm file is an image and under 5 MB

Frontend cannot reach backend:

- Verify API URL in frontend files
- Verify backend is up and accessible
- Verify CORS configuration

## Known Limitations

- No automated tests yet
- Frontend API URL is hardcoded in multiple files
- No environment-based frontend config layer yet
- Open CORS policy in current backend setup

## Suggested Next Improvements

- Add a central frontend config file for API base URL
- Add backend .env.example file
- Add automated tests for auth, posts, and users routes
- Add production middleware (helmet, rate-limit, request logging)
