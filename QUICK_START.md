# 🚀 Aegis Swarm - Quick Start Guide

## Running Backend + Frontend Together

### Step 1: Install All Dependencies

From the **project root** directory:

```bash
# Install root dependencies (concurrently)
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

Or use the convenience script:
```bash
npm run install:all
```

### Step 2: Configure Environment Variables

#### Backend Configuration
```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
```

Required variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to your GCP service account JSON
- `VERTEX_AI_PROJECT_ID` - Your GCP project ID
- `VERTEX_GEMINI_MODEL` - E.g. `gemini-3-flash-preview`
- `GITHUB_TOKEN` - Your GitHub personal access token

#### Frontend Configuration
```bash
cd frontend
cp .env.example .env
```

The frontend .env is optional (defaults work fine):
```env
VITE_API_URL=http://localhost:3000
VITE_API_BASE_PATH=/api
```

### Step 3: Setup Docker Sandbox (Required for Sandbox Testing)

Aegis Swarm uses Docker to safely test generated patches. Ensure Docker Desktop is running on your machine, then build the sandbox image:

```bash
cd backend/src/sandbox
docker build -t aegis-sandbox .
cd ../../..
```

### Step 4: Run Both Servers

From the **project root** directory:

```bash
npm start
```

This single command will:
- ✅ Start the backend server on `http://localhost:3000`
- ✅ Start the frontend dev server on `http://localhost:5173`
- ✅ Show output from both in the same terminal

You'll see output like:
```
[backend] Server running on port 3000
[backend] Connected to Supabase
[frontend] VITE v5.0.8  ready in 500 ms
[frontend] ➜  Local:   http://localhost:5173/
```

### Step 5: Open Your Browser

Navigate to: **http://localhost:5173**

You should see the Aegis Swarm Security Command Center! 🎉

---

## Alternative: Run Separately

### Backend Only
```bash
cd backend
npm run dev
```

### Frontend Only
```bash
cd frontend
npm run dev
```

---

## Available Commands

From **project root**:
```bash
npm start              # Run both backend + frontend
npm run backend        # Run backend only
npm run frontend       # Run frontend only
npm run install:all    # Install all dependencies
```

From **backend**:
```bash
npm run dev           # Start development server
npm start             # Start production server
npm test              # Run tests
```

From **frontend**:
```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run preview       # Preview production build
npm run lint          # Lint code
```

---

## Troubleshooting

### Port Already in Use

**Backend (port 3000):**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

**Frontend (port 5173):**
```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5173 | xargs kill -9
```

### Dependencies Not Installing

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors in Frontend

These are normal before `npm install` completes. After installation:
1. Restart VS Code TypeScript server: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
2. Or reload VS Code window

### Backend Not Connecting to Supabase

1. Check your `.env` file has correct credentials
2. Verify Supabase project is active
3. Check network connection
4. Review backend logs for specific errors

### Frontend Can't Connect to Backend

1. Ensure backend is running on port 3000
2. Check CORS settings in backend
3. Verify proxy configuration in `frontend/vite.config.ts`
4. Check browser console for errors

---

## Testing the Setup

### 1. Check Backend Health
```bash
curl http://localhost:3000/api/health
```

Should return: `{"status":"ok"}`

### 2. Test Frontend
Open browser to `http://localhost:5173` - you should see the home page

### 3. Test API Integration
From the frontend, try submitting a repository URL. Check:
- Network tab shows requests to `/api/audit`
- Backend logs show incoming requests
- SSE connection establishes

---

## Development Workflow

1. **Start both servers**: `npm start` from root
2. **Make changes**: Edit files in `backend/` or `frontend/`
3. **Auto-reload**: Both servers watch for changes
4. **Test**: Changes reflect immediately in browser
5. **Commit**: Git commit your changes

---

## Production Build

### Backend
```bash
cd backend
npm start
```

### Frontend
```bash
cd frontend
npm run build
npm run preview
```

Or use Docker (coming soon).

---

## Next Steps

1. ✅ Servers running
2. 📝 Submit a repository for audit
3. 👀 Watch real-time updates
4. 📊 View vulnerability reports
5. 🔧 Generate and test patches

---

## Support

- 📖 [Full Documentation](README.md)
- 🎨 [Frontend Plan](frontend/FRONTEND_PLAN.md)
- 🏗️ [Architecture Plan](PLAN.md)
- 🐛 [Report Issues](https://github.com/adn26/aegis-swarm-bob/issues)

---

**Happy Auditing! 🛡️✨**