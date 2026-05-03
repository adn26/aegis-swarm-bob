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

For detailed setup instructions to run the frontend and backend locally, please follow the [**Quick Start Guide**](QUICK_START.md).

### Prerequisites

- Node.js 20+
- Docker Desktop (for the Sandbox)
- Supabase account
- GitHub Personal Access Token
- Google Cloud Platform account (for Vertex AI)

### 1. Clone Repository

```bash
git clone https://github.com/adn26/aegis-swarm-bob.git
cd aegis-swarm-bob
```

### 2. See the Quick Start Guide

📖 **Complete Guide**: [QUICK_START.md](QUICK_START.md)

## 🤖 AI Provider Options

### Vertex AI - Gemini (Recommended & Default)
**Best for high-volume analysis and balanced security checks**

```env
AI_PROVIDER=vertex-gemini
VERTEX_GEMINI_MODEL=gemini-3-flash-preview
```

**Advantages:**
- Massive context window
- Fast response times
- Native Google integration
- Optimized pricing via GCP

### Vertex AI - Claude
**Best for deep reasoning and complex vulnerability detection**

```env
AI_PROVIDER=vertex-claude
VERTEX_CLAUDE_OPUS_MODEL=claude-4-6-opus@latest
```

**Advantages:**
- Superior code analysis capabilities
- 200K context window
- Enterprise SLAs and support

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

- [Quick Start Guide](QUICK_START.md)
- [Security Scanner Architecture](docs/security-scanner-architecture.md)

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
- Quick Start Guide: [Setup Guide](QUICK_START.md)

---

**Built with ❤️ for secure code, powered by Google Vertex AI** 🚀
