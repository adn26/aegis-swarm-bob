# 🚀 Aegis Swarm - Quick Start Guide

## Prerequisites

- Node.js 20+
- Supabase account
- Google Cloud Platform account (for Vertex AI)
- GitHub Personal Access Token

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```env
# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google Vertex AI
AI_PROVIDER=vertex-claude
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
VERTEX_AI_PROJECT_ID=your-gcp-project-id
VERTEX_AI_LOCATION=us-central1

# GitHub
GITHUB_TOKEN=ghp_your_github_token

# Server
PORT=3000
NODE_ENV=development
```

### 3. Initialize Database

Run the Supabase schema:

```bash
# In Supabase SQL Editor, run:
backend/src/db/supabase-schema.sql
```

### 4. Start Server

```bash
npm run dev
```

Server starts at `http://localhost:3000`

## API Usage

### Start an Audit

```bash
curl -X POST http://localhost:3000/api/audit \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "https://github.com/username/repo",
    "branch": "main"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Audit started successfully",
  "data": {
    "auditId": "uuid-here",
    "status": "pending",
    "repoUrl": "https://github.com/username/repo",
    "branch": "main",
    "createdAt": "2026-05-02T07:00:00.000Z"
  }
}
```

### Stream Real-time Updates (SSE)

```javascript
const eventSource = new EventSource('http://localhost:3000/api/stream/uuid-here');

eventSource.addEventListener('connected', (e) => {
  console.log('Connected:', JSON.parse(e.data));
});

eventSource.addEventListener('audit_started', (e) => {
  console.log('Audit started:', JSON.parse(e.data));
});

eventSource.addEventListener('vulnerability_found', (e) => {
  console.log('Vulnerability:', JSON.parse(e.data));
});

eventSource.addEventListener('patch_generated', (e) => {
  console.log('Patch:', JSON.parse(e.data));
});

eventSource.addEventListener('audit_completed', (e) => {
  console.log('Completed:', JSON.parse(e.data));
  eventSource.close();
});

eventSource.addEventListener('error', (e) => {
  console.error('Error:', JSON.parse(e.data));
});
```

### Get Audit Status

```bash
curl http://localhost:3000/api/audit/uuid-here
```

### Get Vulnerabilities

```bash
curl http://localhost:3000/api/audit/uuid-here/vulnerabilities
```

### Get Patches

```bash
curl http://localhost:3000/api/audit/uuid-here/patches
```

### Get Full Results

```bash
curl http://localhost:3000/api/audit/uuid-here/results
```

## SSE Event Types

| Event | Description |
|-------|-------------|
| `connected` | Initial connection established |
| `audit_started` | Audit workflow initiated |
| `repo_cloned` | Repository cloned successfully |
| `files_scanned` | File scanning completed |
| `redteam_analyzing` | Red Team analyzing file |
| `vulnerability_found` | Vulnerability detected |
| `blueteam_patching` | Blue Team generating patch |
| `patch_generated` | Patch created |
| `sandbox_deploying` | Deploying to sandbox |
| `tests_running` | Running tests |
| `test_results` | Test results available |
| `audit_completed` | Audit finished |
| `error` | Error occurred |
| `progress` | Progress update |

## Workflow Steps

1. **Clone Repository** - Clone GitHub repo to workspace
2. **Scan Files** - Identify JavaScript/TypeScript files
3. **Red Team Analysis** - Detect vulnerabilities using AI
4. **Blue Team Patch** - Generate secure patches
5. **Sandbox Test** - Verify patches (simulated for now)
6. **Finalize** - Complete audit and generate summary

## Vulnerability Types Detected

### Traditional
- SQL Injection
- Cross-Site Scripting (XSS)
- CSRF
- Authentication Bypass
- Path Traversal
- Insecure Dependencies
- Hardcoded Secrets

### AI-Specific
- Prompt Injection
- Insecure LLM Configuration
- Data Leakage to LLM
- Model DoS
- Insecure Output Handling
- Training Data Poisoning

## Example Response

### Vulnerability
```json
{
  "id": "uuid",
  "filePath": "src/app.js",
  "lineNumber": 42,
  "type": "SQL Injection",
  "severity": "Critical",
  "description": "User input concatenated directly into SQL query",
  "owaspCategory": "A03:2021 - Injection",
  "cweId": "CWE-89",
  "cvssScore": 9.8
}
```

### Patch
```json
{
  "id": "uuid",
  "filePath": "src/app.js",
  "originalCode": "const query = 'SELECT * FROM users WHERE id = ' + userId;",
  "patchedCode": "const query = 'SELECT * FROM users WHERE id = ?';\nconst result = await db.query(query, [userId]);",
  "explanation": "Replaced string concatenation with parameterized query",
  "testPassed": true
}
```

## Troubleshooting

### Server won't start
- Check environment variables are set
- Verify Supabase connection
- Check Vertex AI credentials

### No vulnerabilities found
- Ensure files are JavaScript/TypeScript
- Check AI provider is configured
- Verify repository has code files

### SSE connection fails
- Check CORS settings
- Verify audit ID is correct
- Check server logs

## Next Steps

- **Phase 6**: Test with real repositories
- **Phase 7**: Implement Docker sandbox
- **Phase 8**: Generate PDF reports
- **Phase 9**: Build frontend UI

## Support

See full documentation:
- [Architecture Plan](../PLAN.md)
- [Phase 5 Completion](./PHASE_5_COMPLETION.md)
- [Vertex AI Setup](./VERTEX_AI_SETUP.md)

---

**Made with ❤️ by Aegis Swarm Team**