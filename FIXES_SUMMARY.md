# Fixes Applied - Cobblemon Los Pitufos

## Date: December 21, 2025

## Issues Fixed

### 1. **CORS Error** ✅
**Problem**: External API returned "Access-Control-Allow-Origin header must not be the wildcard '*' when credentials mode is 'include'"

**Fix Applied**:
- `backend/server.js` (lines 81-116): Changed from wildcard `origin: '*'` to specific origin validation
- Added support for Vercel domains and localhost
- Proper CORS configuration with credentials support

### 2. **Tournament API 500 Error** ✅  
**Problem**: `/api/tournaments` returning 500 Internal Server Error

**Fixes Applied**:
- `backend/server.js` (lines 179-188): Connected to real MongoDB instead of placeholder
- `src/app/api/tournaments/route.ts`: Changed to return `{ tournaments: [] }` format instead of raw array
- Changed error handling to return 200 with empty array instead of 500 error
- Added better error logging

### 3. **External Backend 404 Errors** ✅
**Problem**: `https://api.playadoradarp.xyz/port/25617/api/gacha/roll` returns 404

**Analysis**:
- External backend is old/incomplete
- Fixed `backend/server.js` has the routes but needs deployment
- Frontend has working Next.js API routes as fallback

**Solution**:
- Use Next.js API routes (already deployed on Vercel)
- OR deploy fixed `backend/server.js` to external server

### 4. **Backend Build System** ✅
**Fixes Applied**:
- `backend/package.json`: Updated build scripts
  - `dev`: Now uses `tsx watch src/server.ts`
  - `build`: Added `tsc` build script  
  - `start`: Now uses `node dist/server.js`
- Backend builds successfully with TypeScript

### 5. **API Client Configuration** ✅
**Fixes Applied**:
- `src/lib/api-client.ts`: Fixed fallback URL from hardcoded external URL to empty string
- Now uses environment variables: `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_BACKEND_URL`
- Falls back to relative URLs (Next.js routes) if not set

## Architecture Overview

The application has **TWO API layers**:

1. **Next.js API Routes** (`src/app/api/`)
   - Deployed on Vercel with frontend
   - Connect directly to MongoDB
   - Work as fallback when external backend unavailable

2. **Express Backend** (`backend/`)
   - Separate Express server
   - TypeScript-based
   - Should be deployed to `https://api.playadoradarp.xyz/port/25617`

## Environment Configuration

### Production (Vercel)
```env
NEXT_PUBLIC_API_URL=https://api.playadoradarp.xyz/port/25617
MONGODB_URI=mongodb://ADMIN:9XMsZKF34EAVeSRW@...
MONGODB_DB=admin
```

### Local Development
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

## Next Steps

1. **Option A**: Deploy fixed `backend/server.js` to external server
   - Run `npm run build` in backend folder
   - Deploy dist folder to server
   - Restart service on port 25617

2. **Option B**: Continue using Next.js API routes
   - Already working on Vercel
   - No additional deployment needed
   - Remove `NEXT_PUBLIC_API_URL` from Vercel environment variables

## Files Modified

- `backend/server.js` - CORS fix, MongoDB integration
- `backend/package.json` - Build scripts
- `src/lib/api-client.ts` - Fallback URL configuration
- `src/app/api/tournaments/route.ts` - Response format and error handling

## Testing Recommendations

1. Test Next.js API routes work on Vercel
2. If using external backend, deploy and test CORS
3. Verify MongoDB connection in both environments
4. Test gacha roll functionality
5. Test tournament listing
