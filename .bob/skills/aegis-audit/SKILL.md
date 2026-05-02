---
name: aegis-audit
description: Trigger and monitor a multi-agent security audit for a GitHub repository using Aegis Swarm. Use this skill when the user asks to run a security scan, audit a GitHub repo, or check for vulnerabilities.
---

# Aegis Swarm Security Audit Skill

When the user asks to run a security audit, scan a GitHub repository, or check for vulnerabilities using Aegis Swarm, follow these instructions to interact with the local backend API.

## 1. Start the Audit
Make a POST request to the local Aegis Swarm backend to start the security audit.

**Endpoint**: `http://localhost:3000/api/audit`
**Method**: `POST`
**Headers**: `Content-Type: application/json`

**Payload**:
```json
{
  "repoUrl": "<url_of_the_github_repository>",
  "prNumber": <optional_pr_number>,
  "branch": "<optional_branch_name>"
}
```

*Example command:*
```bash
curl -X POST http://localhost:3000/api/audit \
  -H "Content-Type: application/json" \
  -d '{"repoUrl": "https://github.com/username/repo"}'
```

**Action**: Parse the JSON response. Extract the `auditId` and inform the user that the audit has started, providing them with the ID.

## 2. Check Audit Status
If the user asks for the status of an audit, make a GET request using the `auditId`.

**Endpoint**: `http://localhost:3000/api/audit/<auditId>`
**Method**: `GET`

*Example command:*
```bash
curl http://localhost:3000/api/audit/<auditId>
```

**Action**: Parse the response and summarize the current `status` (e.g., `pending`, `in_progress`, `completed`, `failed`) and any statistics provided (e.g., `total_vulnerabilities`, `critical_count`, etc.) to the user.

## 3. Get PDF Report
If the status is `completed` and the user asks for the report, provide them with the endpoint to download the PDF report.

**Endpoint**: `http://localhost:3000/api/audit/<auditId>/report`

*Example command:*
```bash
curl -O -J http://localhost:3000/api/audit/<auditId>/report
```
