import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import logger from '../utils/logger.js';

const execAsync = promisify(exec);

// Docker executable path
// Node.js may not inherit the same PATH as PowerShell, so we use the full path
// Set DOCKER_EXE in .env: C:\Program Files\Docker\Docker\resources\bin\docker.exe
const DOCKER = process.env.DOCKER_EXE
  ? `"${process.env.DOCKER_EXE}"`
  : 'docker';

// Add this helper at the top of the file with the other helpers
const capitalizeSeverity = (s) => {
  const map = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low', info: 'Low' };
  return map[s?.toLowerCase()] ?? 'Medium';
};

// ── Docker path conversion (Windows → Docker Desktop)
const toDockerPath = (windowsPath) =>
  windowsPath
    .replace(/\\/g, '/')
    .replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`);

// Parse NDJSON (one JSON object per line)
const parseNDJSON = (stdout) =>
  stdout
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);

// Parse standard JSON with fallback
const parseJSON = (stdout) => {
  try {
    return JSON.parse(stdout);
  } catch {
    // Strip any non-JSON prefix lines (download progress, warnings, etc.)
    const jsonStart = stdout.indexOf('{');
    const arrStart = stdout.indexOf('[');
    const start = jsonStart === -1 ? arrStart
      : arrStart === -1 ? jsonStart
      : Math.min(jsonStart, arrStart);
    if (start === -1) return null;
    try {
      return JSON.parse(stdout.slice(start));
    } catch {
      return null;
    }
  }
};

class ToolScannerService {
  // Semgrep
  async runSemgrep(repoPath) {
    const absPath = path.resolve(repoPath);
    logger.info(`Running Semgrep on ${absPath}`);
    const dockerPath = toDockerPath(absPath);

    // p/owasp-top-ten covers A01-A10; p/secrets catches hardcoded creds
    // Architecture Layer 2 — Tool 1: Semgrep
    // --quiet suppresses progress output so stdout is pure JSON
    // --no-git-ignore ensures we scan everything even if it's in .gitignore (like .env files)
    const cmd = [
      `${DOCKER} run --rm`,
      `-v "${dockerPath}:/src"`,
      'returntocorp/semgrep',
      'semgrep scan',
      '--config=p/default',
      '--config=p/owasp-top-ten',
      '--config=p/secrets',
      '--config=p/javascript',
      '--config=p/python',
      '--config=p/go',
      '--config=p/jwt',
      '--config=p/xss',
      '--config=p/sql-injection',
      '--json',
      '--quiet',
      '--no-git-ignore',
      '--exclude="node_modules/*"',
      '--exclude="vendor/*"',
      '--exclude="dist/*"',
      '--exclude="build/*"',
      '/src',
    ].join(' ');

    let stdout = '';
    try {
      ({ stdout } = await execAsync(cmd, { timeout: 300_000 }));
    } catch (err) {
      // Semgrep exits 1 when it finds issues — that's normal
      if (err.stdout) stdout = err.stdout;
      else {
        logger.error('Semgrep failed:', err.message);
        return [];
      }
    }

    const results = parseJSON(stdout);
    if (!results) {
      logger.error('Semgrep: could not parse JSON output');
      return [];
    }
    return this.normalizeSemgrep(results, repoPath);
  }

  normalizeSemgrep(results, repoPath) {
    if (!Array.isArray(results.results)) return [];
    return results.results.map((r, i) => ({
      id: `SEMGREP-${i}`,
      source: 'semgrep',
      title: r.extra?.message?.split('\n')[0] || r.check_id,
      description: r.extra?.message || '',
      file: path.relative(repoPath, r.path).replace(/\\/g, '/'),
      line_start: r.start?.line || 0,
      line_end: r.end?.line || 0,
      severity: this._semgrepSeverity(r.extra?.severity),
      category: r.extra?.metadata?.category || 'security',
      owasp_category: r.extra?.metadata?.owasp?.[0] || null,
      cwe_id: r.extra?.metadata?.cwe?.[0] || null,
      rule_id: r.check_id,
      code_snippet: r.extra?.lines || '',
    }));
  }

  _semgrepSeverity(s) {
    return capitalizeSeverity({ ERROR: 'high', WARNING: 'medium', INFO: 'low' }[s] ?? 'medium');
  }

  // TruffleHog
  async runTruffleHog(repoPath) {
    const absPath = path.resolve(repoPath);
    logger.info(`Running TruffleHog on ${absPath}`);
    const dockerPath = toDockerPath(absPath);

    // Try git scan first, fallback to filesystem
    const scanTypes = ['git file:///pwd', 'filesystem /pwd'];
    let stdout = '';
    let stderr = '';

    for (const scanType of scanTypes) {
      const cmd = [
        `${DOCKER} run --rm`,
        `-v "${dockerPath}:/pwd"`,
        'trufflesecurity/trufflehog:latest',
        scanType,
        '--json',
        '--no-update',
        '--only-verified=false',
      ].join(' ');

      try {
        const result = await execAsync(cmd, { timeout: 120_000 });
        stdout = result.stdout;
        stderr = result.stderr;
        if (stdout) break;
      } catch (err) {
        stdout = err.stdout || '';
        stderr = err.stderr || '';
        
        // If we have findings (NDJSON) in stdout, we're good even if it exited with error
        if (stdout && stdout.includes('{')) {
          logger.info(`TruffleHog found findings using ${scanType.split(' ')[0]}`);
          break;
        }
        
        logger.warn(`TruffleHog ${scanType.split(' ')[0]} scan failed: ${err.message.split('\n')[0]}`);
      }
    }

    if (!stdout && !stderr) {
      logger.error('TruffleHog failed completely on all scan types');
      return [];
    }

    // TruffleHog output can be a mix of progress logs, summary JSON, and findings NDJSON
    // The findings we want are individual JSON objects per line
    // Combining stdout and stderr because sometimes Docker/TruffleHog sends JSON to stderr
    const combinedOutput = stdout + '\n' + stderr;
    const findings = parseNDJSON(combinedOutput);
    
    // Filter out the summary object if it exists (usually has "totalFiles", "scannedFiles", etc.)
    const actualFindings = findings.filter(f => !f.totalFiles && (f.DetectorType || f.SourceMetadata));
    
    logger.info(`TruffleHog: parsed ${findings.length} total JSON objects, identified ${actualFindings.length} actual secrets`);
    
    if (actualFindings.length === 0 && (combinedOutput.includes('"totalVulnerabilities"') || combinedOutput.includes('"totalFiles"'))) {
      logger.info('TruffleHog summary detected but no detailed findings found.');
      // If we see the summary but no findings, it might be in a different format or we need to look closer
      // Some versions of TruffleHog might wrap findings
    }

    return this.normalizeTruffleHog(actualFindings);
  }

  normalizeTruffleHog(rawFindings) {
    return rawFindings.map((f, i) => {
      const detector = f.DetectorType || f.DetectorName || 'Unknown';
      const fileMeta = f.SourceMetadata?.Data?.Git || f.SourceMetadata?.Data?.Filesystem;
      const file = fileMeta?.file || fileMeta?.filename || 'unknown';
      const line = fileMeta?.line || 0;
      return {
        id: `TRUFFLEHOG-${detector}-${i}`,
        source: 'trufflehog',
        title: `Exposed ${detector} credential`,
        description: `${detector} secret found in ${file} at line ${line}${f.Verified ? ' — VERIFIED LIVE' : ''}`,
        file,
        line_start: line,
        line_end: line,
        // Verified = credential confirmed live against the API → always Critical
        severity: capitalizeSeverity(f.Verified ? 'critical' : 'high'),
        verified: f.Verified || false,
        category: 'secrets',
        rule_id: detector,
        // Truncate — never log full secret values
        code_snippet: f.Raw ? f.Raw.slice(0, 20) + '...' : '',
        link: fileMeta?.link || null,
      };
    });
  }

  // Trivy
  async runTrivy(repoPath) {
    const absPath = path.resolve(repoPath);
    logger.info(`Running Trivy on ${absPath}`);
    const dockerPath = toDockerPath(absPath);

    // --quiet is CRITICAL — without it Trivy prints download progress to stdout
    // which breaks JSON parsing completely
    const cmd = [
      `${DOCKER} run --rm`,
      `-v "${dockerPath}:/src"`,
      'aquasec/trivy',
      'fs',
      '--format json',
      '--quiet',
      '--scanners vuln,secret,config',
      '/src',
    ].join(' ');

    let stdout = '';
    try {
      ({ stdout } = await execAsync(cmd, { timeout: 300_000 }));
    } catch (err) {
      if (err.stdout) stdout = err.stdout;
      else {
        logger.error('Trivy failed:', err.message);
        return [];
      }
    }

    const results = parseJSON(stdout);
    if (!results) {
      logger.error('Trivy: could not parse JSON output');
      return [];
    }
    return this.normalizeTrivy(results);
  }

  normalizeTrivy(results) {
    if (!Array.isArray(results.Results)) return [];
    const findings = [];

    results.Results.forEach((result) => {
      const target = result.Target || 'unknown';

      (result.Vulnerabilities || []).forEach((v, i) => {
        findings.push({
          id: `TRIVY-CVE-${v.VulnerabilityID}-${i}`,
          source: 'trivy',
          title: `${v.PkgName}: ${v.Title || v.VulnerabilityID}`,
          description: v.Description || `CVE ${v.VulnerabilityID} in ${v.PkgName}`,
          file: target,
          line_start: 0,
          line_end: 0,
          severity: this._trivySeverity(v.Severity),
          category: 'dependency-cve',
          rule_id: v.VulnerabilityID,
          cve_id: v.VulnerabilityID,
          code_snippet: [
            `Package: ${v.PkgName}`,
            `Installed: ${v.InstalledVersion}`,
            `Fixed in: ${v.FixedVersion || 'no fix available'}`,
          ].join('\n'),
        });
      });

      (result.Misconfigurations || []).forEach((m, i) => {
        findings.push({
          id: `TRIVY-MISC-${m.ID || i}`,
          source: 'trivy',
          title: m.Title || 'Misconfiguration',
          description: m.Description || m.Message || '',
          file: target,
          line_start: m.CauseMetadata?.StartLine || 0,
          line_end: m.CauseMetadata?.EndLine || 0,
          severity: this._trivySeverity(m.Severity),
          category: 'misconfiguration',
          rule_id: m.ID || 'unknown',
          code_snippet: m.Message || '',
        });
      });
    });

    return findings;
  }

  _trivySeverity(s) {
    return capitalizeSeverity(s);
  }

  // Filter noise (Layer 1 - Ingestion "Skip entirely" list)
  filterFindings(findings) {
    const IGNORE = [
      /node_modules\//,
      /vendor\//,
      /dist\//,
      /build\//,
      /\.git\//,
      /package-lock\.json$/,
      /yarn\.lock$/,
      /pnpm-lock\.yaml$/,
      /Pipfile\.lock$/,
      /\.(png|jpg|jpeg|gif|svg|ico|pdf|zip|tar|gz|mp4|mp3|woff|woff2|ttf|eot)$/i,
      /test-fixtures\//,
      /mock-data\//,
      /\.min\.(js|css)$/,
    ];
    return findings.filter((f) => !IGNORE.some((p) => p.test(f.file || '')));
  }

  // Run all three tools in parallel
  async runAllTools(repoPath) {
    // Ensure absolute path — Docker requires it
    const absoluteRepoPath = path.resolve(repoPath);
    logger.info(`Starting deterministic analysis in: ${absoluteRepoPath}`);

    const [semgrepFindings, truffleFindings, trivyFindings] = await Promise.all([
      this.runSemgrep(absoluteRepoPath),
      this.runTruffleHog(absoluteRepoPath),
      this.runTrivy(absoluteRepoPath),
    ]);

    logger.info(`Raw findings — Semgrep: ${semgrepFindings.length} | TruffleHog: ${truffleFindings.length} | Trivy: ${trivyFindings.length}`);

    const all = this.filterFindings([
      ...semgrepFindings,
      ...truffleFindings,
      ...trivyFindings,
    ]);

    // Sort: verified secrets first, then by severity
    const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
    all.sort((a, b) => {
      if (a.verified && !b.verified) return -1;
      if (!a.verified && b.verified) return 1;
      return (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
    });

    logger.info(`Found ${all.length} findings after filtering`);
    return all;
  }
}

export default new ToolScannerService();

// Made with Bob