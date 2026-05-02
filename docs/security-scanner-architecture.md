# Security Scanner Architecture
## Comprehensive Vulnerability Detection with Red/Blue Team Simulation

---

## Overview

This document defines the full stack and architecture for a GitHub repo security scanner that combines deterministic static analysis with LLM-powered adversarial simulation. Every finding is anchored to ground truth evidence before the LLM layer touches it.

**Core principle:** SAST tools find *what* exists. The LLM explains *why it matters* and *how to fix it*.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    INPUT LAYER                          │
│              GitHub Repo URL (public/private)           │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                  INGESTION LAYER                        │
│  Clone repo → triage files → build context bundle      │
│  Tools: GitHub API / git clone, tree-sitter, tiktoken  │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│             DETERMINISTIC ANALYSIS LAYER                │
│                                                         │
│  ┌─────────────┐  ┌────────────┐  ┌─────────────────┐  │
│  │   Semgrep   │  │ Trufflehog │  │      Trivy      │  │
│  │  (SAST/    │  │  (Secrets) │  │  (Dependencies) │  │
│  │   OWASP)   │  │            │  │                 │  │
│  └──────┬──────┘  └─────┬──────┘  └────────┬────────┘  │
│         └───────────────┼──────────────────┘           │
│                         │                               │
│              ┌──────────▼──────────┐                   │
│              │  CodeQL (optional)  │                   │
│              │  (Deep data flow)   │                   │
│              └──────────┬──────────┘                   │
└─────────────────────────┬───────────────────────────────┘
                          │
                 Structured findings JSON
                          │
┌─────────────────────────▼───────────────────────────────┐
│                  RED TEAM LAYER (LLM)                   │
│  Input: findings + relevant code chunks                 │
│  Output: attack narratives, exploit simulations,        │
│          chained vulnerability discovery                │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                  BLUE TEAM LAYER (LLM)                  │
│  Input: red team findings + same code chunks            │
│  Output: severity ratings, concrete patches,            │
│          compensating controls, false positive flags    │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                SANDBOX EXECUTION LAYER                  │
│  Input: concrete patches from Blue Team                 │
│  Output: test pass/fail signals, patch stability checks │
│  Tools: Isolated Docker container, unit test runners    │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                    OUTPUT LAYER                         │
│  Merged report: severity consensus, verified fixes,     │
│  CVSS scores, remediation priority queue                │
└─────────────────────────────────────────────────────────┘
```

---

## Layer 1 — Ingestion

### Goal
Fetch the repo and build a context bundle that covers the full attack surface without overflowing the LLM context window.

### Tools

| Tool | Purpose |
|------|---------|
| GitHub REST API | Fetch file tree and file contents without cloning |
| `git clone --depth=1` | Full local clone for running CLI tools (Semgrep, Trivy, Trufflehog) |
| tree-sitter | Parse code into AST — extract functions, classes, imports by language |
| tiktoken | Count tokens before sending to LLM to stay within budget |

### File Triage

Do not send the entire repo to the LLM. Score and prioritize files in this order:

**Priority 1 — Configuration and secrets surface**
- `package.json`, `requirements.txt`, `Gemfile`, `go.mod`, `Cargo.toml`
- `.env`, `.env.example`, `.env.local`
- `docker-compose.yml`, `Dockerfile`
- `nginx.conf`, `httpd.conf`, `.htaccess`

**Priority 2 — Entry points and routing**
- `server.js`, `app.py`, `main.go`, `index.ts`, `wsgi.py`, `asgi.py`
- Files matching `/routes?/i`, `/controllers?/i`, `/views?/i`, `/handlers?/i`
- API definition files: `openapi.yml`, `swagger.json`

**Priority 3 — Auth and security surface**
- Files matching `/auth/i`, `/login/i`, `/jwt/i`, `/oauth/i`, `/session/i`
- Files matching `/password/i`, `/token/i`, `/crypto/i`, `/secret/i`
- Middleware files

**Priority 4 — Data layer**
- Files matching `/model/i`, `/schema/i`, `/migration/i`, `/repository/i`
- Raw SQL files: `*.sql`
- ORM config files

**Priority 5 — CI/CD and infrastructure**
- `.github/workflows/*.yml`
- `Makefile`, `Jenkinsfile`, `*.tf` (Terraform)
- `k8s/*.yml`, `helm/`

**Skip entirely**
- `node_modules/`, `vendor/`, `dist/`, `build/`, `.git/`
- Lock files: `package-lock.json`, `yarn.lock`, `Pipfile.lock`
- Binary files, images, fonts, compiled assets
- Test fixtures and mock data files

### Token Budget

Target context allocation per LLM call:

```
System prompt:          ~2,000 tokens
Code context bundle:   ~60,000 tokens
SAST findings:          ~5,000 tokens
Output buffer:         ~10,000 tokens
─────────────────────────────────────
Total:                 ~77,000 tokens  (fits Claude Sonnet, GPT-4o, Gemini Flash)
```

If the repo exceeds budget: use tree-sitter to extract function signatures and docstrings only for lower-priority files, reserving full function bodies for Priority 1 and 2 files.

### Context Bundle Format

Structure the bundle as a single string fed to the LLM:

```
=== FILE TREE ===
src/
  auth/
    login.js
    jwt.js
  routes/
    api.js
  models/
    user.js
...

=== FILE: src/auth/login.js ===
[full content]

=== FILE: src/auth/jwt.js ===
[full content]

=== FILE: src/routes/api.js ===
[full content]
...
```

---

## Layer 2 — Deterministic Analysis

This layer produces ground truth findings. The LLM never invents vulnerabilities from nothing — it only reasons about what this layer finds.

### Tool 1: Semgrep

**What it catches:** OWASP Top 10, injection flaws, insecure deserialization, path traversal, XSS, hardcoded credentials, dangerous function usage, framework-specific misconfigurations.

**Setup:**
```bash
pip install semgrep

# Run with auto config (detects language, applies relevant rules)
semgrep --config=auto --json --output=semgrep-results.json /path/to/repo

# Or target specific rulesets
semgrep --config=p/owasp-top-ten --json --output=semgrep-results.json /path/to/repo
semgrep --config=p/secrets --json /path/to/repo
semgrep --config=p/javascript --json /path/to/repo
semgrep --config=p/python --json /path/to/repo
```

**Key rulesets to run:**
- `p/owasp-top-ten` — OWASP A01–A10
- `p/secrets` — hardcoded API keys, passwords, tokens
- `p/javascript` / `p/typescript` / `p/python` / `p/go` / `p/java` — language-specific
- `p/jwt` — JWT misconfigurations
- `p/sql-injection` — SQL injection patterns
- `p/xss` — cross-site scripting

**Output fields to extract:**
```json
{
  "check_id": "python.django.security.injection.tainted-sql-string",
  "path": "src/db/queries.py",
  "start": { "line": 42 },
  "end": { "line": 44 },
  "extra": {
    "message": "Detected SQL injection",
    "severity": "ERROR",
    "metadata": { "owasp": ["A03:2021"] }
  }
}
```

---

### Tool 2: Trufflehog

**What it catches:** Secrets and credentials committed to code or git history — API keys, private keys, passwords, tokens, connection strings. Scans all git commits, not just the current state.

**Setup:**
```bash
# Install
brew install trufflehog  # macOS
# or: docker run -it trufflesecurity/trufflehog:latest

# Scan local repo including git history
trufflehog filesystem /path/to/repo --json > trufflehog-results.json

# Scan directly from GitHub URL
trufflehog github --repo=https://github.com/owner/repo --json > trufflehog-results.json
```

**Output fields to extract:**
```json
{
  "SourceMetadata": {
    "Data": {
      "Filesystem": { "file": "config/database.yml", "line": 7 }
    }
  },
  "DetectorName": "AWS",
  "Verified": true,
  "Raw": "AKIA..."
}
```

**Critical field:** `"Verified": true` means Trufflehog confirmed the secret is *live and valid* by calling the API. Treat these as Critical severity automatically.

---

### Tool 3: Trivy

**What it catches:** Known CVEs in dependencies (npm, pip, gem, go modules, cargo), OS packages in Docker images, misconfigurations in Dockerfiles and IaC files.

**Setup:**
```bash
# Install
brew install trivy  # macOS
# or: docker run aquasec/trivy

# Scan filesystem (dependencies + IaC)
trivy fs --format json --output trivy-results.json /path/to/repo

# Scan Docker image if present
trivy image --format json --output trivy-image-results.json myapp:latest
```

**Output fields to extract:**
```json
{
  "Target": "package-lock.json",
  "Type": "npm",
  "Vulnerabilities": [
    {
      "VulnerabilityID": "CVE-2021-44228",
      "PkgName": "log4j-core",
      "InstalledVersion": "2.14.1",
      "FixedVersion": "2.15.0",
      "Severity": "CRITICAL",
      "Title": "Apache Log4j2 Remote Code Execution"
    }
  ]
}
```

---

### Tool 4: CodeQL (optional, deep analysis)

**What it catches:** Data flow vulnerabilities that cross multiple files — taint analysis, SQL injection through multi-hop call chains, XSS from source to sink across functions. This is the most powerful but also the most complex to set up.

**When to use:** Enable for repos where thorough analysis matters more than speed. Adds 5–15 minutes to scan time.

**Setup:**
```bash
# Install CodeQL CLI
# Download from: https://github.com/github/codeql-action/releases

# Create database
codeql database create codeql-db --language=javascript --source-root=/path/to/repo

# Run analysis
codeql database analyze codeql-db \
  javascript-security-extended.qls \
  --format=sarif-latest \
  --output=codeql-results.sarif

# Convert SARIF to JSON
cat codeql-results.sarif | python -c "import json,sys; print(json.dumps(json.load(sys.stdin), indent=2))"
```

**Supported languages:** JavaScript/TypeScript, Python, Java, C/C++, C#, Go, Ruby, Swift

---

### Merging Findings

After all tools run, normalize output into a single findings schema:

```typescript
interface Finding {
  id: string;                  // "SEMGREP-001", "TRUFFLEHOG-001", etc.
  source: "semgrep" | "trufflehog" | "trivy" | "codeql";
  title: string;
  description: string;
  file: string;
  line_start: number;
  line_end: number;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;            // "injection", "secrets", "dependency-cve", etc.
  owasp_category?: string;     // "A03:2021 - Injection"
  cve_id?: string;             // "CVE-2021-44228"
  rule_id: string;             // tool-specific rule identifier
  code_snippet: string;        // the flagged code, fetched from file
  verified?: boolean;          // Trufflehog-specific: live credential confirmed
}
```

**Deduplication:** If Semgrep and CodeQL both flag the same line for the same issue, merge into one finding and note both sources.

---

## Layer 3 — Red Team (LLM)

### Role

The Red Team receives the merged SAST findings and the code context bundle. Its job is not to find new vulnerabilities from scratch — it is to:

1. Write a realistic attack narrative for each finding
2. Chain related findings into multi-step attack scenarios
3. Identify logic flaws that SAST cannot detect (auth bypass, IDOR, business logic bugs)
4. Boost severity for findings that are more dangerous in context

### System Prompt

```
You are a senior offensive security researcher conducting a red team assessment.

You have been given:
1. Static analysis findings from Semgrep, Trufflehog, and Trivy (ground truth)
2. The relevant source code around each finding
3. The full file tree of the application

Your tasks:
1. For each SAST finding, write a concrete attack narrative:
   - How would an attacker discover this vulnerability?
   - What is the exact exploit (HTTP request, payload, sequence of steps)?
   - What is the impact if successfully exploited?
   - Is this finding more or less severe in context than the tool rated it?

2. Identify chains: can multiple findings be combined for greater impact?
   Example: a secret in code (Trufflehog) + an exposed admin endpoint (Semgrep)
   = full account takeover chain.

3. Logic flaw scan: review auth flows, access control, and session management
   in the code for issues SAST tools cannot detect. Only report what you can
   point to in the code — do not hallucinate.

Output each finding as:
FINDING-ID: [matches SAST finding id, or "LOGIC-N" for new logic findings]
TITLE: [short descriptive title]
ATTACK-VECTOR: [step-by-step exploit simulation]
IMPACT: [what the attacker achieves]
SEVERITY: [critical/high/medium/low with justification]
CHAINED-WITH: [other finding IDs if applicable]
```

### What Red Team should catch that SAST misses

- **IDOR (Insecure Direct Object Reference)** — an endpoint takes a user ID parameter and returns data without checking ownership
- **Broken auth flows** — password reset that doesn't verify email, 2FA that can be skipped, session fixation
- **Mass assignment** — ORM models that accept all fields without allowlisting
- **Race conditions** — concurrent requests that bypass rate limits or double-spend
- **JWT algorithm confusion** — accepting `alg: none` or RS256/HS256 confusion
- **GraphQL introspection + over-permissioned resolvers**

---

## Layer 4 — Blue Team (LLM)

### Role

The Blue Team receives Red Team's findings plus the same code context. It acts as an adversarial reviewer — not a rubber stamp. It should:

1. Verify whether Red's findings are actually exploitable in context
2. Check for existing mitigations Red may have missed (WAF, auth middleware, framework protections)
3. Downgrade findings that are theoretical or already mitigated
4. Confirm and escalate findings that are genuinely dangerous
5. Write the actual patched code

### System Prompt

```
You are a senior defensive security engineer reviewing red team findings.

You have been given:
1. Red team findings with attack narratives
2. The same source code the red team analyzed

Your tasks:
1. For each red team finding, evaluate:
   - Is this actually exploitable? Consider existing auth layers,
     middleware, framework-level protections, and deployment context.
   - Is the severity accurate, or is it inflated/deflated?
   - Are there compensating controls the red team overlooked?

2. For confirmed findings, provide:
   - The exact corrected code (not "sanitize your inputs" — the actual fix)
   - Whether the fix is a quick patch or requires architectural change
   - Any additional hardening recommendations

3. Rate each finding as:
   CONFIRMED: exploitable as described, severity agreed
   CONFIRMED-DOWNGRADED: exploitable but lower severity than rated
   CONFIRMED-UPGRADED: exploitable and more severe than rated
   DISPUTED: not exploitable in this context, explain why
   FALSE-POSITIVE: SAST rule fired incorrectly, explain why

Be skeptical. A finding that requires authentication to exploit is not
the same severity as an unauthenticated one. A CVE in a dependency that
is never called is lower priority than one in active use.
```

### Blue Team output schema

```typescript
interface BlueTeamResponse {
  finding_id: string;
  verdict: "confirmed" | "confirmed-downgraded" | "confirmed-upgraded" | "disputed" | "false-positive";
  severity_final: "critical" | "high" | "medium" | "low" | "info";
  severity_justification: string;
  existing_mitigations: string;
  patch: {
    file: string;
    description: string;
    code_before: string;
    code_after: string;
  };
  remediation_complexity: "line-change" | "function-refactor" | "architectural";
  additional_hardening: string[];
}
```

---

## Layer 5 — Sandbox Execution Layer

### Role

The Sandbox Execution Layer closes the gap between hypothetical patches and proven, stable fixes. It verifies the patches generated by the Blue Team by actually running them against the application code in an isolated container.

1. Inject the patched files back into the original repository.
2. Spin up an ephemeral, highly restricted Docker container.
3. Run the application's existing test suite (or syntax/build checks if tests are absent).
4. Provide a clear "pass/fail" boolean to the final report, proving the patch does not break the build.

This eliminates the widespread industry problem of security tools offering fixes that break compilation or application logic.

---

## Layer 6 — Final Report

### Severity Consensus

When Red and Blue disagree on severity, apply this rule:

- Blue rates CONFIRMED-UPGRADED → use Blue's higher severity
- Blue rates CONFIRMED-DOWNGRADED → use Blue's lower severity
- Blue rates CONFIRMED with same severity → use that severity
- Blue rates DISPUTED → downgrade to Low / flag for manual review
- Blue rates FALSE-POSITIVE → exclude from report, log for tuning

### Report Structure

```
Executive Summary
  - Total findings by severity
  - Top 3 critical risks
  - Overall risk rating

Critical Findings  [immediate action required]
High Findings      [fix within 1 sprint]
Medium Findings    [fix within 1 quarter]
Low / Info         [backlog]

Per Finding:
  - Title + severity
  - File + line
  - SAST source (Semgrep rule ID / CVE / etc.)
  - Attack narrative (from Red Team)
  - Blue Team verdict + justification
  - Patched code
  - Remediation complexity

Appendix
  - Raw SAST output
  - False positives log
  - Scan coverage (files analyzed, files skipped)
```

---

## LLM Selection Guide

### Context window comparison

| Model | Context window | Best for |
|-------|---------------|---------|
| Gemini 2.0 Flash | 1M tokens | Large repos, cost-sensitive |
| Gemini 1.5 Pro | 1M tokens | Large repos, higher quality |
| GPT-4o | 128k tokens | Medium repos, best structured output |
| Claude Sonnet 4 | 200k tokens | Medium repos, best security reasoning |

### Recommended configurations

**Best quality (medium repos, under 200 files):**
Use Claude Sonnet for both Red and Blue passes. Strongest security reasoning, best at catching logic flaws.

**Best for large repos:**
Gemini 2.0 Flash for the ingestion/summarization pass, GPT-4o for Red and Blue passes. Gemini's 1M context handles the full codebase; GPT-4o's structured output is easier to parse reliably.

**Single provider, cost-optimized:**
Gemini 2.0 Flash end-to-end. Cheapest per token, large context, good enough reasoning for most repos.

**Private repos:**
All three providers offer zero data retention API options. Confirm the specific endpoint before processing proprietary code.

---

## Hallucination Prevention

### Rules for the LLM layer

1. **Every finding must reference a SAST source.** The LLM cannot introduce a new finding without pointing to a specific line in the code. Logic flaw findings must quote the exact code that demonstrates the issue.

2. **Structured output enforcement.** Use JSON mode (GPT-4o) or constrained output schemas. Parse and validate before storing. Reject responses that don't conform.

3. **Code snippets in context.** Always include the exact code around each SAST finding when prompting — not just the finding description. This grounds the LLM in the actual code, not its general knowledge.

4. **Blue Team as falsifier.** The Blue Team's explicit job is to falsify Red Team findings. This adversarial structure catches cases where Red Team over-inferred from a SAST signal.

5. **Confidence scoring.** Ask both teams to rate their confidence (high/medium/low) per finding. Low confidence findings get flagged for manual review rather than included in the report as confirmed.

---

## Tech Stack Summary

### Backend

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js (TypeScript) or Python |
| GitHub ingestion | `@octokit/rest` or `PyGithub` |
| Repo cloning | `simple-git` (Node) or `GitPython` |
| AST parsing | `tree-sitter` with language grammars |
| Token counting | `tiktoken` |
| Job queue | BullMQ (Redis-backed) for async scans |
| Database | PostgreSQL — store findings, scan history |

### SAST tools (run as subprocesses)

| Tool | Install |
|------|---------|
| Semgrep | `pip install semgrep` |
| Trufflehog | Binary download or Docker |
| Trivy | Binary download or Docker |
| CodeQL | Binary download (optional) |

### LLM APIs

| Provider | SDK |
|----------|-----|
| Anthropic | `@anthropic-ai/sdk` |
| OpenAI | `openai` |
| Google | `@google/generative-ai` |

### Infrastructure

| Component | Technology |
|-----------|-----------|
| Container | Docker — isolate repo clones, run SAST tools safely |
| Orchestration | Docker Compose (dev) / Kubernetes (prod) |
| Storage | S3 or local volume for cloned repos (ephemeral) |
| Secrets | Environment variables / AWS Secrets Manager |

---

## Security Considerations for the Scanner Itself

- **Sandbox all code execution.** Clone repos into ephemeral Docker containers with no network access. Never run untrusted code.
- **Rate limit GitHub API calls.** Unauthenticated: 60 req/hour. Authenticated: 5,000 req/hour. Use a token.
- **Sanitize repo paths.** Validate that file paths from the GitHub API don't contain traversal sequences before writing to disk.
- **Rotate LLM API keys.** Store separately from application config.
- **Do not log code content.** Log finding metadata only. Code snippets in logs are a data exposure risk.
- **Private repo consent.** If scanning private repos, require explicit authorization from a repo admin, not just any collaborator.

---

## Development Phases

### Phase 1 — Deterministic foundation
Build the ingestion pipeline and wire up Semgrep + Trufflehog + Trivy. Output raw merged findings JSON. No LLM yet. Validate that ground truth findings are accurate.

### Phase 2 — Red Team pass
Add the LLM Red Team layer on top of Phase 1 findings. Evaluate quality of attack narratives. Tune the system prompt until narratives are realistic and grounded.

### Phase 3 — Blue Team pass
Add the LLM Blue Team layer. Evaluate false positive rate. Tune the falsification prompt. Measure how often Blue correctly disputes weak findings.

### Phase 4 — Sandbox Verification
Integrate an ephemeral Docker sandbox to physically execute the patches generated by the Blue Team. Test compilation, run existing unit tests, and mark patches as "Verified" or "Failed".

### Phase 5 — Report generation
Build the final report merger and output formatter. Add CVSS scoring. Build the remediation priority queue.

### Phase 6 — CodeQL integration
Add CodeQL for deep data flow analysis on supported languages. Wire into the existing findings merger.
