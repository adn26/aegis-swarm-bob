# Frontend-Backend Connection Setup

## 🔗 Overview

This guide explains how the Aegis Swarm frontend connects to the backend API for security auditing.

## 📋 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (React + Vite)                                    │
│  http://localhost:5173                                      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Home.tsx                                            │  │
│  │  - Form submission                                   │  │
│  │  - Calls apiService.startAudit()                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  api.service.ts                                      │  │
│  │  - Axios client                                      │  │
│  │  - Base URL: http://localhost:3000/api              │  │
│  │  - Handles requests/responses                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP POST /api/audit
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  BACKEND (Node.js + Express)                                │
│  http://localhost:3000                                      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  audit.routes.js                                     │  │
│  │  POST /api/audit                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  audit.controller.js                                 │  │
│  │  - Validates request                                 │  │
│  │  - Calls orchestrator.startAudit()                   │  │
│  │  - Returns audit ID                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  orchestrator.js                                     │  │
│  │  - Creates audit in Supabase                         │  │
│  │  - Starts LangGraph workflow                         │  │
│  │  - Red Team (GLM-5) → Blue Team (GLM-5) → Sandbox   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Setup Instructions

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start backend server
npm start
```

**Backend runs on:** `http://localhost:3000`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment (already done)
# frontend/.env contains:
# VITE_API_URL=http://localhost:3000
# VITE_API_BASE_PATH=/api

# Start frontend dev server
npm run dev
```

**Frontend runs on:** `http://localhost:5173`

### 3. Verify Connection

1. **Start Backend:**
   ```bash
   cd backend && npm start
   ```
   Should see: `Server running on port 3000`

2. **Start Frontend:**
   ```bash
   cd frontend && npm run dev
   ```
   Should see: `Local: http://localhost:5173`

3. **Test Connection:**
   - Open browser: `http://localhost:5173`
   - Fill in repository URL
   - Click "EXECUTE_AUDIT"
   - Should navigate to `/audit/{id}` page

## 📡 API Endpoints

### Base URL
```
http://localhost:3000/api
```

### Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/audit` | Start new security audit |
| GET | `/audit/:id` | Get audit status and details |
| GET | `/audit` | Get all audits (paginated) |
| GET | `/audit/:id/vulnerabilities` | Get vulnerabilities for audit |
| GET | `/audit/:id/patches` | Get patches for audit |
| GET | `/audit/:id/results` | Get full audit results |
| GET | `/audit/:id/report` | Download PDF report |
| GET | `/stream/:auditId` | SSE stream for real-time updates |

## 🔧 Frontend API Service

### Location
`frontend/src/services/api.service.ts`

### Usage Example

```typescript
import { apiService } from '@/services/api.service';

// Start audit
const response = await apiService.startAudit({
  repoUrl: 'https://github.com/user/repo',
  branch: 'main',
  prNumber: 123, // optional
});

// Get audit status
const audit = await apiService.getAudit(auditId);

// Get vulnerabilities
const vulnerabilities = await apiService.getVulnerabilities(auditId);

// Get patches
const patches = await apiService.getPatches(auditId);
```

### Configuration

The API service reads from environment variables:

```typescript
// frontend/src/utils/constants.ts
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH || '/api';
```

## 🎯 Request/Response Flow

### 1. Start Audit Request

**Frontend:**
```typescript
const response = await apiService.startAudit({
  repoUrl: 'https://github.com/user/repo',
  branch: 'main',
});
```

**HTTP Request:**
```http
POST http://localhost:3000/api/audit
Content-Type: application/json

{
  "repoUrl": "https://github.com/user/repo",
  "branch": "main"
}
```

**Backend Response:**
```json
{
  "success": true,
  "message": "Audit started successfully",
  "data": {
    "auditId": "uuid-here",
    "status": "pending",
    "repoUrl": "https://github.com/user/repo",
    "branch": "main",
    "createdAt": "2026-05-02T10:00:00.000Z"
  }
}
```

**Frontend Navigation:**
```typescript
navigate(`/audit/${response.data.auditId}`);
```

### 2. Real-Time Updates (SSE)

**Frontend:**
```typescript
import { sseService } from '@/services/sse.service';

// Connect to SSE stream
sseService.connect(auditId, {
  onConnected: () => console.log('Connected'),
  onAuditStarted: (data) => console.log('Audit started', data),
  onVulnerabilityFound: (vuln) => console.log('Vulnerability:', vuln),
  onPatchGenerated: (patch) => console.log('Patch:', patch),
  onCompleted: (results) => console.log('Completed:', results),
  onError: (error) => console.error('Error:', error),
});
```

**SSE Endpoint:**
```
GET http://localhost:3000/api/stream/{auditId}
```

## 🔍 Debugging

### Check Backend is Running

```bash
curl http://localhost:3000/api/health
```

Should return: `{"status":"ok"}`

### Check Frontend API Configuration

```bash
# In frontend directory
cat .env
```

Should show:
```
VITE_API_URL=http://localhost:3000
VITE_API_BASE_PATH=/api
```

### Test API from Frontend Console

```javascript
// Open browser console on http://localhost:5173
fetch('http://localhost:3000/api/health')
  .then(r => r.json())
  .then(console.log);
```

### Common Issues

#### 1. CORS Error
**Symptom:** `Access-Control-Allow-Origin` error in browser console

**Solution:** Backend already has CORS configured in `backend/src/app.js`:
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
```

Make sure `FRONTEND_URL` in `backend/.env` matches your frontend URL.

#### 2. Connection Refused
**Symptom:** `ERR_CONNECTION_REFUSED`

**Solution:** 
- Ensure backend is running: `cd backend && npm start`
- Check backend port: Should be 3000
- Verify `VITE_API_URL` in `frontend/.env`

#### 3. 404 Not Found
**Symptom:** API returns 404

**Solution:**
- Check endpoint path in `api.service.ts`
- Verify route exists in `backend/src/api/routes/`
- Check `API_BASE_PATH` is `/api`

## 📊 Data Flow Example

### Complete Audit Flow

1. **User submits form** → `Home.tsx`
2. **Frontend calls API** → `apiService.startAudit()`
3. **Backend receives request** → `audit.controller.js`
4. **Orchestrator starts workflow** → `orchestrator.js`
5. **Audit created in Supabase** → `storage.service.js`
6. **LangGraph workflow begins:**
   - Clone repository
   - Scan files
   - Red Team analysis (GLM-5)
   - Blue Team patching (GLM-5)
   - Sandbox testing
   - Finalize results
7. **SSE events sent to frontend** → Real-time updates
8. **Frontend displays results** → `AuditDashboard.tsx`

## ✅ Verification Checklist

- [ ] Backend running on port 3000
- [ ] Frontend running on port 5173
- [ ] `frontend/.env` configured with correct API URL
- [ ] `backend/.env` configured with Supabase credentials
- [ ] CORS enabled in backend
- [ ] Can submit audit form
- [ ] Navigates to audit dashboard after submission
- [ ] SSE connection works for real-time updates

## 🎉 Success!

If you can:
1. ✅ Start both backend and frontend
2. ✅ Submit an audit request
3. ✅ Navigate to audit dashboard
4. ✅ See real-time updates

Then the frontend-backend connection is working correctly!

## 📚 Related Documentation

- **Backend API**: `backend/src/api/`
- **Frontend Services**: `frontend/src/services/`
- **GLM-5 Setup**: `docs/GLM5_MIGRATION.md`
- **Design System**: `docs/DESIGN_SYSTEM_USAGE.md`
- **Frontend Redesign**: `docs/FRONTEND_REDESIGN.md`