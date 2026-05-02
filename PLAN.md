# Aegis Swarm - Security Command Center Implementation Plan

## 🎯 Project Overview

**Aegis Swarm** is an adversarial multi-agent security auditing system that analyzes GitHub repositories and Pull Requests for vulnerabilities using AI agents.

### Core Architecture
- **Backend**: Node.js/Express with LangGraph.js orchestration
- **Database**: Supabase (PostgreSQL)
- **AI Agents**: Provider-agnostic (OpenAI, Anthropic, local models)
- **Sandbox**: Docker for secure code execution
- **Frontend**: React with real-time SSE updates
- **Real-time**: Server-Sent Events (SSE) for streaming updates

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend - React + Vite                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Command      │  │ Vulnerability│  │ Patch Diff   │         │
│  │ Center UI    │  │ Map          │  │ Viewer       │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│         │                  │                  │                 │
│         └──────────────────┴──────────────────┘                 │
│                            │                                    │
│                    SSE Stream (Real-time)                       │
└────────────────────────────┼────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│              Backend - Express + LangGraph                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  API Layer                                │  │
│  │  POST /api/audit  │  GET /api/stream/:id                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              LangGraph Workflow                           │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐               │  │
│  │  │ Red Team │→ │ Blue Team│→ │ Sandbox  │               │  │
│  │  │ Scanner  │  │ Patcher  │  │ Verifier │               │  │
│  │  └──────────┘  └──────────┘  └──────────┘               │  │
│  └──────────────────────────────────────────────────────────┘  │
│         │                  │                  │                 │
│  ┌──────▼──────┐   ┌───────▼──────┐   ┌──────▼──────┐        │
│  │   GitHub    │   │  AI Provider │   │   Docker    │        │
│  │   Service   │   │   (Agnostic) │   │   Sandbox   │        │
│  └─────────────┘   └──────────────┘   └─────────────┘        │
└────────────────────────────┼────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                      Supabase (PostgreSQL)                      │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────┐  │
│  │  audits  │  │vulnerabilities│  │ patches  │  │ reports  │  │
│  └──────────┘  └──────────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Implementation Phases

### ✅ Phase 1: Foundation (COMPLETED)
- [x] Project setup with dependencies
- [x] Environment configuration
- [x] Logging and error handling
- [x] Express server with SSE support
- [x] API routes structure

### 🔄 Phase 2: Database & Storage (IN PROGRESS)
- [ ] Migrate from SQLite to Supabase
- [ ] Update database schema for PostgreSQL
- [ ] Implement Supabase client integration
- [ ] Update storage service for Supabase
- [ ] Add real-time subscriptions (optional)

### 📦 Phase 3: GitHub Integration
- [ ] Repository cloning service (simple-git)
- [ ] PR fetching and diff analysis
- [ ] File system scanner with filters
- [ ] Workspace management
- [ ] GitHub API integration (@octokit/rest)

### 🤖 Phase 4: AI Agent System (Provider-Agnostic)
- [ ] Abstract LLM provider interface
- [ ] Support for multiple providers:
  - OpenAI (GPT-4, GPT-4o)
  - Anthropic (Claude 3.5 Sonnet)
  - Local models (Ollama)
  - Azure OpenAI
- [ ] LangGraph workflow orchestration
- [ ] State management for multi-file analysis
- [ ] Red Team Agent implementation
- [ ] Blue Team Agent implementation

### 🔴 Phase 5: Red Team Agent (Vulnerability Scanner)
- [ ] Traditional vulnerability detection:
  - SQL Injection
  - XSS (Cross-Site Scripting)
  - CSRF
  - Authentication bypass
  - Path traversal
  - Insecure dependencies
- [ ] AI-specific vulnerability detection:
  - Prompt injection
  - Insecure LLM configuration
  - Data leakage to LLM context
  - Model DoS attacks
  - Insecure output handling
  - Training data poisoning
- [ ] OWASP categorization
- [ ] CVSS scoring
- [ ] Exploit code generation

### 🔵 Phase 6: Blue Team Agent (Patch Generator)
- [ ] Vulnerability analysis
- [ ] Secure patch generation
- [ ] Code diff creation
- [ ] Explanation generation
- [ ] Best practices implementation

### 🐳 Phase 7: Docker Sandbox
- [ ] Dockerfile for Node.js sandbox
- [ ] Security hardening (non-root, read-only, network isolation)
- [ ] Resource limits (CPU, memory, timeout)
- [ ] Dockerode integration
- [ ] Container lifecycle management
- [ ] Test execution and validation
- [ ] Log capture and parsing

### 📊 Phase 8: PDF Report Generation
- [ ] PDFKit integration
- [ ] Professional report template
- [ ] Executive summary
- [ ] Vulnerability details with severity
- [ ] Patch information
- [ ] Recommendations
- [ ] OWASP/CWE references

### 🎨 Phase 9: Frontend - Security Command Center
- [ ] React application setup (Vite)
- [ ] Tailwind CSS with dark theme + gold accents
- [ ] Repository input form
- [ ] Real-time agent activity feed (SSE)
- [ ] Vulnerability map visualization
- [ ] File tree with vulnerability indicators
- [ ] Patch diff viewer (side-by-side)
- [ ] Sandbox terminal component
- [ ] PDF report download
- [ ] Responsive design

### 🔗 Phase 10: Integration & Testing
- [ ] End-to-end workflow testing
- [ ] GitHub webhook integration (optional)
- [ ] PR comment posting
- [ ] Error handling and recovery
- [ ] Performance optimization
- [ ] Security hardening

### 📚 Phase 11: Documentation & Deployment
- [ ] API documentation
- [ ] Architecture documentation
- [ ] Deployment guide (Docker Compose)
- [ ] Environment setup guide
- [ ] Contributing guidelines

---

## 🔧 Technology Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js 4.x
- **Database**: Supabase (PostgreSQL)
- **Agent Orchestration**: @langchain/langgraph
- **AI Providers** (Provider-agnostic):
  - Vertex AI (GCP)
  - OpenAI SDK (@openai/api)
  - Anthropic SDK (@anthropic-ai/sdk)
  - LangChain integrations
- **Docker**: dockerode
- **GitHub**: @octokit/rest, simple-git
- **PDF**: pdfkit
- **Validation**: joi
- **Logging**: winston

### Frontend
- **Framework**: React 18+
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Code Editor**: Monaco Editor
- **Diff Viewer**: react-diff-viewer-continued
- **HTTP Client**: axios
- **SSE**: Native EventSource API

### Infrastructure
- **Database**: Supabase (PostgreSQL with real-time)
- **Sandbox**: Docker containers
- **Deployment**: Docker Compose
- **CI/CD**: GitHub Actions (optional)

---

## 🤖 AI Provider Abstraction

### Supported Providers
```javascript
// Provider interface
interface LLMProvider {
  name: string;
  generateCompletion(prompt, options): Promise<string>;
  streamCompletion(prompt, options): AsyncGenerator<string>;
}

// Supported providers
- OpenAI (gpt-4, gpt-4o, gpt-4-turbo)
- Anthropic (claude-3-5-sonnet, claude-3-opus)
- Azure OpenAI
- Local models via Ollama (llama3, codellama, mistral)
- Custom API endpoints
```

### Configuration
```env
# AI Provider Selection
AI_PROVIDER=anthropic  # openai | anthropic | azure | ollama | custom

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# Azure OpenAI
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=...
AZURE_OPENAI_DEPLOYMENT=...

# Ollama (Local)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3

# Custom
CUSTOM_API_ENDPOINT=...
CUSTOM_API_KEY=...
```

---

## 🗄️ Database Schema (Supabase/PostgreSQL)

### Tables

#### audits
```sql
CREATE TABLE audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_url TEXT NOT NULL,
  pr_number INTEGER,
  branch TEXT,
  commit_sha TEXT,
  workspace_path TEXT,
  status TEXT DEFAULT 'pending',
  total_files INTEGER DEFAULT 0,
  scanned_files INTEGER DEFAULT 0,
  total_vulnerabilities INTEGER DEFAULT 0,
  critical_count INTEGER DEFAULT 0,
  high_count INTEGER DEFAULT 0,
  medium_count INTEGER DEFAULT 0,
  low_count INTEGER DEFAULT 0,
  patches_applied INTEGER DEFAULT 0,
  tests_passed BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

#### vulnerabilities
```sql
CREATE TABLE vulnerabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID REFERENCES audits(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  line_number INTEGER,
  line_end INTEGER,
  type TEXT NOT NULL,
  category TEXT,
  severity TEXT NOT NULL CHECK(severity IN ('Critical', 'High', 'Medium', 'Low')),
  description TEXT NOT NULL,
  exploit_code TEXT,
  is_ai_related BOOLEAN DEFAULT false,
  owasp_category TEXT,
  cwe_id TEXT,
  cvss_score DECIMAL(3,1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### patches
```sql
CREATE TABLE patches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vulnerability_id UUID REFERENCES vulnerabilities(id) ON DELETE CASCADE,
  audit_id UUID REFERENCES audits(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  original_code TEXT,
  patched_code TEXT,
  diff TEXT,
  explanation TEXT,
  test_passed BOOLEAN DEFAULT false,
  test_output TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### reports
```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID REFERENCES audits(id) ON DELETE CASCADE,
  pdf_path TEXT NOT NULL,
  file_size INTEGER,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### scanned_files
```sql
CREATE TABLE scanned_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID REFERENCES audits(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  lines_of_code INTEGER,
  language TEXT,
  has_vulnerabilities BOOLEAN DEFAULT false,
  vulnerability_count INTEGER DEFAULT 0,
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔐 Security Considerations

### Sandbox Security
- Non-root user execution
- Read-only filesystem (except /tmp)
- No network access
- Resource limits (CPU, memory, timeout)
- Isolated containers per audit

### API Security
- Rate limiting
- Input validation
- CORS configuration
- Environment variable protection
- Secure GitHub token handling

### AI Security
- API key encryption
- Rate limiting on LLM calls
- Token usage monitoring
- Prompt injection prevention
- Output sanitization

---

## 📊 SSE Event Types

Real-time events streamed to frontend:

```javascript
- connected: Initial connection established
- audit_started: Audit workflow initiated
- repo_cloned: Repository successfully cloned
- files_scanned: File scanning completed
- redteam_analyzing: Red Team analyzing file
- vulnerability_found: Vulnerability detected
- blueteam_patching: Blue Team generating patch
- patch_generated: Patch created
- sandbox_deploying: Deploying to sandbox
- tests_running: Running tests in sandbox
- test_results: Test execution results
- audit_completed: Audit finished successfully
- error: Error occurred
- progress: Progress update
- agent_thinking: Agent reasoning (streaming)
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Supabase account
- GitHub Personal Access Token
- AI Provider API key (OpenAI/Anthropic/etc.)

### Setup Steps
1. Clone repository
2. Set up Supabase project
3. Configure environment variables
4. Install dependencies: `npm install`
5. Run database migrations
6. Build Docker sandbox image
7. Start development server: `npm run dev`

---

## 📝 Current Status

**Phase 1**: ✅ Complete
**Phase 2**: 🔄 In Progress (Migrating to Supabase)

**Next Steps**:
1. Update database layer for Supabase
2. Implement provider-agnostic AI interface
3. Build GitHub integration
4. Create agent system

---

## 🎯 Success Criteria

- ✅ Successfully clone and scan GitHub repositories
- ✅ Detect both traditional and AI-specific vulnerabilities
- ✅ Generate working patches for vulnerabilities
- ✅ Verify patches in isolated sandbox
- ✅ Stream real-time updates to frontend
- ✅ Generate professional PDF reports
- ✅ Support multiple AI providers
- ✅ Handle errors gracefully
- ✅ Maintain security best practices

---

## 📝 Progress Tracker

### ✅ Completed Components

#### Phase 1: Foundation (100%)
- [x] Project setup with dependencies
- [x] Environment configuration (.env with Vertex AI)
- [x] Logging system (Winston)
- [x] Error handling classes
- [x] Express server with SSE support
- [x] API routes structure

#### Phase 2: Database & Storage (100%)
- [x] Supabase PostgreSQL schema
- [x] Supabase client initialization
- [x] Storage service with async operations
- [x] Database connection testing

#### Phase 3: GitHub Integration (100%)
- [x] Repository cloning service (simple-git)
- [x] PR fetching and diff analysis
- [x] File system scanner with filters
- [x] Workspace management
- [x] GitHub API integration (@octokit/rest)

#### Phase 4: AI Provider System (100%)
- [x] Abstract LLM provider interface
- [x] Vertex AI Claude Opus (Red Team)
- [x] Vertex AI Claude Haiku (Blue Team & Judge)
- [x] Vertex AI Claude Sonnet (Alternative)
- [x] OpenAI provider (Alternative)
- [x] Ollama provider (Local)
- [x] Role-based model selection
- [x] LangGraph integration helpers

#### Phase 5: LangGraph Workflow (COMPLETED - 100%)
- [x] State schema definition
- [x] State management helpers
- [x] Workflow graph definition
- [x] Node implementations (6 nodes)
- [x] Edge conditions and routing
- [x] Orchestrator integration
- [x] API controller integration

#### Red Team Agent (COMPLETED - 100%)
- [x] Vulnerability detection prompts
- [x] Traditional vulnerability scanning
- [x] AI-specific vulnerability detection
- [x] Exploit code generation
- [x] OWASP categorization
- [x] GLM-5 integration

#### Blue Team Agent (COMPLETED - 100%)
- [x] Patch generation prompts
- [x] Secure code patching
- [x] Code diff creation
- [x] Explanation generation
- [x] GLM-5 integration

### 🔄 In Progress

#### Phase 6: Testing & Debugging (0%)
- [ ] Test workflow with sample repository
- [ ] Verify GLM-5 responses
- [ ] Debug edge cases
- [ ] Performance optimization

### 📋 Pending Components

#### Docker Sandbox (0%)
- [ ] Dockerfile for Node.js sandbox
- [ ] Security hardening
- [ ] Resource limits
- [ ] Container lifecycle management
- [ ] Test execution
- [ ] Log capture

#### PDF Report Generation (0%)
- [ ] PDFKit integration
- [ ] Report template
- [ ] Vulnerability details
- [ ] Patch information
- [ ] Recommendations

#### Frontend (0%)
- [ ] React application setup
- [ ] Command Center UI
- [ ] Real-time SSE integration
- [ ] Vulnerability visualization
- [ ] Patch diff viewer
- [ ] Sandbox terminal

#### Integration & Testing (0%)
- [ ] End-to-end workflow testing
- [ ] Error handling
- [ ] Performance optimization
- [ ] Security hardening

---

**Last Updated**: 2026-05-02 3:22 PM IST
**Version**: 1.1.0
**Status**: Active Development - Phase 6 (Testing & Debugging)
**Progress**: ~65% Complete

**Recent Updates**:
- ✅ Phase 5 completed: Full LangGraph workflow with 6 nodes
- ✅ Red Team & Blue Team agents implemented with GLM-5
- ✅ Orchestrator and API integration complete
- 🔄 Ready for Phase 6: Testing with real repositories