# 🛡️ Aegis Swarm - Security Command Center

An adversarial multi-agent security auditing system that analyzes GitHub repositories and Pull Requests for vulnerabilities using AI agents powered by Google Vertex AI.

## 🎯 Features

- **🔴 Red Team Agent**: Scans code for traditional and AI-specific vulnerabilities
- **🔵 Blue Team Agent**: Generates secure patches for detected vulnerabilities
- **🐳 Docker Sandbox**: Isolated environment for testing patches
- **📊 Real-time Updates**: Server-Sent Events (SSE) for live progress tracking
- **📄 PDF Reports**: Professional security audit reports
- **🤖 Vertex AI Integration**: Access Claude & Gemini models through unified API
- **💾 Supabase Backend**: PostgreSQL database with real-time capabilities
- **🔗 LangGraph Orchestration**: Seamless multi-agent workflow

## 🏗️ Architecture

```
Frontend (React) ←→ Backend (Express + LangGraph) ←→ Supabase (PostgreSQL)
                            ↓
                    Google Vertex AI
                    ├─ Claude 4.6 Opus (Security Analysis)
                    └─ Gemini 3.1 Pro (Alternative)
                            ↓
                    Docker Sandbox (Verification)
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Supabase account
- GitHub Personal Access Token
- Google Cloud Platform account (for Vertex AI)

### 1. Clone Repository

```bash
git clone https://github.com/adn26/aegis-swarm-bob.git
cd aegis-swarm-bob
```

### 2. Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `backend/src/db/supabase-schema.sql`
3. Copy your project URL and keys

### 3. Setup Google Vertex AI

📖 **Detailed Guide**: [Vertex AI Setup](docs/VERTEX_AI_SETUP.md)

Quick steps:
1. Create GCP project
2. Enable Vertex AI API
3. Enable Claude in Model Garden
4. Create service account with Vertex AI User role
5. Download service account key JSON

### 4. Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google Vertex AI (Recommended)
AI_PROVIDER=vertex-claude
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
VERTEX_AI_PROJECT_ID=your-gcp-project-id
VERTEX_AI_LOCATION=us-central1
VERTEX_CLAUDE_MODEL=claude-4-6-opus

# Or use Gemini via Vertex AI
# AI_PROVIDER=vertex-gemini
# VERTEX_GEMINI_MODEL=gemini-3-1-pro

# Or OpenAI (Alternative)
# AI_PROVIDER=openai
# OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4o

# GitHub
GITHUB_TOKEN=ghp_...
```

### 5. Install Dependencies

```bash
npm install
```

### 6. Start Development Server

```bash
npm run dev
```

Server will start at `http://localhost:3000`

## 🤖 AI Provider Options

### Vertex AI - Claude (Recommended)
**Best for security analysis and vulnerability detection**

```env
AI_PROVIDER=vertex-claude
VERTEX_CLAUDE_MODEL=claude-4-6-opus
```

**Advantages:**
- Superior code analysis capabilities
- 200K context window
- Enterprise SLAs and support
- Competitive pricing via GCP

### Vertex AI - Gemini
**Best for high-volume, cost-sensitive workloads**

```env
AI_PROVIDER=vertex-gemini
VERTEX_GEMINI_MODEL=gemini-3-1-pro
```

**Advantages:**
- 1M context window
- Faster response times
- Lower cost
- Native Google integration

### OpenAI (Alternative)
**Direct OpenAI API access**

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
```

### Ollama (Local)
**For offline or privacy-sensitive deployments**

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

## 📡 API Endpoints

### Start Audit
```bash
POST /api/audit
Content-Type: application/json

{
  "repoUrl": "https://github.com/username/repo",
  "prNumber": 123,  // optional
  "branch": "main"  // optional
}
```

### Get Audit Status
```bash
GET /api/audit/:id
```

### Stream Real-time Updates (SSE)
```bash
GET /api/stream/:auditId
```

### Download PDF Report
```bash
GET /api/audit/:id/report
```

## 🔐 Security Features Detected

### Traditional Vulnerabilities
- SQL Injection
- Cross-Site Scripting (XSS)
- CSRF
- Authentication Bypass
- Path Traversal
- Insecure Dependencies
- Hardcoded Secrets

### AI-Specific Vulnerabilities
- **Prompt Injection**: User input in LLM prompts
- **Insecure LLM Config**: Exposed API keys, missing rate limits
- **Data Leakage**: PII sent to LLM context
- **Model DoS**: No token limits or cost controls
- **Insecure Output Handling**: LLM output executed without validation
- **Training Data Poisoning**: Unvalidated data in RAG/vector stores

## 📊 Database Schema

### Tables
- `audits`: Main audit records
- `vulnerabilities`: Detected security issues
- `patches`: Generated security patches
- `reports`: PDF report metadata
- `scanned_files`: File scanning metadata

See `backend/src/db/supabase-schema.sql` for complete schema.

## 🐳 Docker Sandbox

The sandbox provides isolated code execution for patch verification:

- **Security**: Non-root user, read-only filesystem, no network
- **Resources**: 256MB RAM, 0.5 CPU, 30s timeout
- **Isolation**: Separate container per audit

Build sandbox image:
```bash
cd docker
docker build -f sandbox.Dockerfile -t aegis-sandbox:latest .
```

## 📝 Development

### Project Structure
```
aegis-swarm/
├── backend/
│   ├── src/
│   │   ├── api/          # API routes and controllers
│   │   ├── agents/       # Red Team & Blue Team agents
│   │   ├── config/       # Configuration
│   │   ├── db/           # Database (Supabase)
│   │   ├── services/     # Business logic & AI providers
│   │   ├── sandbox/      # Docker sandbox
│   │   └── utils/        # Utilities
│   └── server.js
├── frontend/             # React application
├── docker/               # Docker configurations
├── docs/                 # Documentation
│   └── VERTEX_AI_SETUP.md
└── PLAN.md              # Implementation plan
```

### Run Tests
```bash
npm test
```

## 🔄 Workflow

1. **User submits** GitHub repository URL
2. **Backend clones** repository to workspace
3. **File scanner** identifies JavaScript files
4. **Red Team Agent** (Claude) analyzes code for vulnerabilities
5. **Blue Team Agent** (Claude) generates patches
6. **Docker Sandbox** tests patches
7. **PDF Report** generated with findings
8. **Real-time updates** streamed via SSE

## 💰 Cost Comparison

### Vertex AI - Claude
- Input: $3 per 1M tokens
- Output: $15 per 1M tokens
- **Best for**: Security-critical analysis

### Vertex AI - Gemini Pro
- Input: $1.25 per 1M tokens
- Output: $5 per 1M tokens
- **Best for**: High-volume workloads

### Vertex AI - Gemini Flash
- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens
- **Best for**: Cost-sensitive deployments

*Prices subject to change. Check [Vertex AI Pricing](https://cloud.google.com/vertex-ai/pricing)*

## 📚 Documentation

- [Architecture & Implementation Plan](PLAN.md)
- [Vertex AI Setup Guide](docs/VERTEX_AI_SETUP.md)
- [API Documentation](docs/api.md) (coming soon)
- [Agent Design](docs/agents.md) (coming soon)
- [Deployment Guide](docs/deployment.md) (coming soon)

## 🎯 Why Vertex AI?

1. **Unified Access**: Single API for Claude and Gemini models
2. **Enterprise Features**: Better SLAs, support, and compliance
3. **Cost Optimization**: Competitive pricing with volume discounts
4. **LangGraph Integration**: Seamless integration with LangChain ecosystem
5. **Scalability**: Enterprise-grade infrastructure
6. **Security**: Google Cloud security and compliance

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- LangGraph.js for agent orchestration
- Google Vertex AI for unified AI access
- Supabase for database infrastructure
- Anthropic for Claude models
- Google for Gemini models
- Docker for sandboxing

## 📞 Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/adn26/aegis-swarm-bob/issues)
- Documentation: [Read the docs](docs/)
- Vertex AI Setup: [Setup Guide](docs/VERTEX_AI_SETUP.md)

---

**Built with ❤️ for secure code, powered by Google Vertex AI** 🚀
