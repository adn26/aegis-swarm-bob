# 🐛 Aegis Swarm - Debugging Guide

## Issue: "Testing..." or White Page on Audit Dashboard

### Quick Checks

#### 1. Check Backend is Running
```bash
# In backend directory
npm run dev

# Should see:
# Server running on port 3000
# Supabase connected
# AI Provider initialized
```

#### 2. Check Backend Logs
Look for these in the terminal:
```
✓ Starting audit request for: <repo-url>
✓ Audit started successfully
✓ Created audit record: <uuid>
✓ Running workflow for audit: <uuid>
✓ Cloning repository: <repo-url>
✓ Repository cloned to: <path>
✓ Found X files to analyze
✓ Red Team analyzing: <file>
```

#### 3. Check Browser Console
Open DevTools (F12) and look for:
- API call errors
- SSE connection status
- Network requests to `/api/audit` and `/api/stream/:id`

#### 4. Check Supabase
Go to your Supabase dashboard:
- Table: `audits` - Should have new rows
- Check `status` column - Should progress from `pending` → `cloning` → `scanning` → `analyzing`
- Check `error_message` column for any errors

---

## Common Issues & Solutions

### Issue 1: White Page on Dashboard

**Symptoms**: Dashboard shows blank white page

**Causes**:
1. Audit ID not found in database
2. API endpoint returning error
3. React error in component

**Debug Steps**:
```bash
# 1. Check if audit exists in Supabase
# Go to Supabase → Table Editor → audits
# Look for the audit ID from URL

# 2. Test API endpoint directly
curl http://localhost:3000/api/audit/<audit-id>

# 3. Check browser console for React errors
# Open DevTools → Console tab
```

**Solution**:
- If audit doesn't exist: Backend didn't create it properly
- If API returns 404: Check audit ID is correct
- If React error: Check component code for bugs

---

### Issue 2: "Testing..." Never Changes

**Symptoms**: Status stuck on "Testing..." or "Pending"

**Causes**:
1. Workflow not starting
2. LangGraph error
3. AI provider error (GLM-5)
4. GitHub cloning error

**Debug Steps**:
```bash
# 1. Check backend logs for errors
# Look for:
# - "Failed to clone repository"
# - "Vertex AI GLM-5 error"
# - "Workflow failed"

# 2. Check Supabase audit status
# Should progress through: pending → cloning → scanning → analyzing

# 3. Test GLM-5 provider
cd backend
node test-glm5-provider.js

# 4. Check workspace folder
ls backend/workspace/
# Should see folders with audit IDs
```

**Solutions**:
- **Cloning fails**: Check GitHub token in `.env`
- **GLM-5 fails**: Check gcloud authentication
- **Workflow stuck**: Check LangGraph logs

---

### Issue 3: No SSE Events

**Symptoms**: Activity feed shows only "Waiting for events..."

**Causes**:
1. SSE connection not established
2. Backend not sending events
3. CORS issues

**Debug Steps**:
```bash
# 1. Check SSE connection in browser
# DevTools → Network tab → Filter: EventSource
# Should see connection to /api/stream/<audit-id>

# 2. Check backend SSE service
# Look for logs:
# "SSE connection added for audit: <id>"
# "SSE event sent: <event-type>"

# 3. Test SSE endpoint directly
curl -N http://localhost:3000/api/stream/<audit-id>
# Should see: event: connected
```

**Solutions**:
- **No connection**: Check CORS settings in backend
- **No events**: Check orchestrator is calling SSE service
- **Connection drops**: Check for network issues

---

### Issue 4: Vulnerabilities Not Showing

**Symptoms**: Stats show 0 vulnerabilities even after scan completes

**Causes**:
1. Red Team agent not finding vulnerabilities
2. GLM-5 not returning proper format
3. Database not saving vulnerabilities

**Debug Steps**:
```bash
# 1. Check Supabase vulnerabilities table
# Go to Supabase → Table Editor → vulnerabilities
# Filter by audit_id

# 2. Check backend logs for Red Team
# Look for:
# "Red Team analyzing: <file>"
# "Found X vulnerabilities in <file>"

# 3. Check GLM-5 response format
# Look for JSON parsing errors in logs
```

**Solutions**:
- **No vulnerabilities found**: Repository might be secure, or GLM-5 prompt needs tuning
- **Parse errors**: GLM-5 response format incorrect
- **Database errors**: Check Supabase connection

---

## Verification Checklist

### Backend Health
- [ ] Backend server running on port 3000
- [ ] Supabase connection successful
- [ ] GLM-5 provider initialized
- [ ] GitHub token configured
- [ ] gcloud authenticated

### Frontend Health
- [ ] Frontend running on port 5173
- [ ] Can access home page
- [ ] Form submission works
- [ ] Redirects to dashboard
- [ ] SSE connection established

### Database Health
- [ ] Audit record created in `audits` table
- [ ] Status progressing (not stuck on `pending`)
- [ ] No error_message in audit record
- [ ] Workspace folder created

### Workflow Health
- [ ] Repository cloned successfully
- [ ] Files scanned and counted
- [ ] Red Team analyzing files
- [ ] Vulnerabilities being saved
- [ ] Blue Team generating patches

---

## Manual Testing Steps

### 1. Test Backend API

```bash
# Start audit
curl -X POST http://localhost:3000/api/audit \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "https://github.com/OWASP/NodeGoat",
    "branch": "master"
  }'

# Response should include auditId
# {"success":true,"data":{"auditId":"<uuid>",...}}

# Get audit status
curl http://localhost:3000/api/audit/<audit-id>

# Stream events (will keep connection open)
curl -N http://localhost:3000/api/stream/<audit-id>
```

### 2. Test Frontend

1. Open `http://localhost:5173`
2. Enter repo URL: `https://github.com/OWASP/NodeGoat`
3. Click "Start Security Audit"
4. Should redirect to `/audit/<id>`
5. Should see:
   - Connection status: "Live" (green)
   - Activity feed updating
   - Stats incrementing

### 3. Monitor Logs

**Backend Terminal**:
```
Watch for:
✓ Audit started
✓ Repository cloned
✓ Files scanned
✓ Red Team analyzing
✓ Vulnerability found
✓ Blue Team patching
✓ Patch generated
✓ Audit completed
```

**Browser Console**:
```
Watch for:
✓ Starting scan: {repoUrl: "..."}
✓ Audit started: {auditId: "..."}
✓ Connecting to SSE for audit: <id>
✓ SSE Event: {type: "connected", ...}
✓ SSE Event: {type: "audit_started", ...}
```

---

## Expected Timeline

For a small repository (~10 files):

| Time | Event | What's Happening |
|------|-------|------------------|
| 0s | Audit Started | Backend creates audit record |
| 1-5s | Repo Cloned | Git clone operation |
| 5-10s | Files Scanned | File system scan |
| 10-30s | Red Team Analysis | GLM-5 analyzing each file |
| 30-60s | Blue Team Patching | GLM-5 generating patches |
| 60-70s | Sandbox Testing | Running tests (simulated) |
| 70s | Audit Completed | Final summary |

**Note**: Actual time depends on:
- Repository size
- Number of files
- GLM-5 response time
- Network speed

---

## Logs to Check

### Backend Logs
```bash
# Check application logs
tail -f backend/logs/aegis.log

# Check for errors
grep "error" backend/logs/aegis.log
grep "failed" backend/logs/aegis.log
```

### Supabase Logs
- Go to Supabase Dashboard
- Click "Logs" in sidebar
- Filter by "Postgres Logs"
- Look for INSERT/UPDATE errors

### Browser Logs
- Open DevTools (F12)
- Console tab: JavaScript errors
- Network tab: Failed requests
- Application tab: Local storage

---

## Quick Fixes

### Reset Everything
```bash
# 1. Stop both servers (Ctrl+C)

# 2. Clear workspace
rm -rf backend/workspace/*

# 3. Clear Supabase data (optional)
# Go to Supabase → Table Editor
# Delete all rows from audits table

# 4. Restart backend
cd backend && npm run dev

# 5. Restart frontend
cd frontend && npm run dev

# 6. Try again
```

### Test with Simple Repo
Use a small, known-vulnerable repository:
```
https://github.com/OWASP/NodeGoat
```

This is intentionally vulnerable and should find issues quickly.

---

## Getting Help

### Information to Provide

When asking for help, include:

1. **Backend logs** (last 50 lines)
2. **Browser console** (errors and warnings)
3. **Audit ID** from URL
4. **Supabase audit record** (status, error_message)
5. **Steps to reproduce**

### Debug Commands

```bash
# Check backend is running
curl http://localhost:3000/api/health

# Check audit exists
curl http://localhost:3000/api/audit/<audit-id>

# Check GLM-5 provider
cd backend && node test-glm5-provider.js

# Check gcloud auth
gcloud auth list
gcloud auth print-access-token

# Check Supabase connection
# In backend/.env, verify:
# SUPABASE_URL
# SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY
```

---

## Success Indicators

You know it's working when you see:

✅ **Backend**:
- "Audit started successfully"
- "Repository cloned to: ..."
- "Found X files to analyze"
- "Red Team analyzing: ..."
- "Found X vulnerabilities"
- "Blue Team generating patches"
- "Audit completed"

✅ **Frontend**:
- Form submits without errors
- Redirects to dashboard
- Connection status shows "Live"
- Activity feed updates in real-time
- Stats increment as scan progresses
- Vulnerabilities appear in list

✅ **Database**:
- New audit record in `audits` table
- Status progresses through stages
- Vulnerabilities saved in `vulnerabilities` table
- Patches saved in `patches` table
- No error_message

---

**Last Updated**: 2026-05-02
**Version**: 1.0.0