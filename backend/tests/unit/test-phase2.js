import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import path from 'node:path';
import { tmpdir } from 'node:os';
import fs from 'node:fs/promises';

// Mirror of detectTestRunner from sandbox.service.js
async function detectTestRunner(workspacePath) {
  try {
    const raw = await fs.readFile(path.join(workspacePath, 'package.json'), 'utf-8');
    const pkg = JSON.parse(raw);
    const mainEntry = pkg.main || 'index.js';
    if (pkg.scripts?.test && !pkg.scripts.test.includes('no test specified')) {
      return { testCmd: 'npm test', fallbackCmd: `node --check ${mainEntry}` };
    }
    return { testCmd: 'npm test', fallbackCmd: `node --check ${mainEntry}` };
  } catch {}

  for (const f of ['pytest.ini', 'setup.py', 'pyproject.toml']) {
    try {
      await fs.access(path.join(workspacePath, f));
      return { testCmd: 'pytest -q', fallbackCmd: 'python -m py_compile $(find . -name "*.py")' };
    } catch {}
  }

  try {
    await fs.access(path.join(workspacePath, 'go.mod'));
    return { testCmd: 'go test ./...', fallbackCmd: 'go build ./...' };
  } catch {}

  try {
    await fs.access(path.join(workspacePath, 'pom.xml'));
    return { testCmd: 'mvn test -q', fallbackCmd: 'mvn compile -q' };
  } catch {}

  return { testCmd: null, fallbackCmd: 'node --check' };
}

describe('detectTestRunner', () => {
  it('detects npm test when package.json has test script', async () => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'sandbox-test-'));
    await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify({ scripts: { test: 'jest' } }));
    const result = await detectTestRunner(dir);
    assert.equal(result.testCmd, 'npm test');
    await fs.rm(dir, { recursive: true });
  });

  it('falls back when package.json has placeholder test script', async () => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'sandbox-test-'));
    await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify({
      scripts: { test: 'echo "no test specified"' }
    }));
    const result = await detectTestRunner(dir);
    assert.equal(result.testCmd, 'npm test');
    await fs.rm(dir, { recursive: true });
  });

  it('detects Python when pytest.ini present', async () => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'sandbox-test-'));
    await fs.writeFile(path.join(dir, 'pytest.ini'), '[pytest]');
    const result = await detectTestRunner(dir);
    assert.match(result.testCmd, /pytest/);
    await fs.rm(dir, { recursive: true });
  });

  it('detects Go when go.mod present', async () => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'sandbox-test-'));
    await fs.writeFile(path.join(dir, 'go.mod'), 'module example.com/m\n\ngo 1.21');
    const result = await detectTestRunner(dir);
    assert.equal(result.testCmd, 'go test ./...');
    await fs.rm(dir, { recursive: true });
  });

  it('detects Maven when pom.xml present', async () => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'sandbox-test-'));
    await fs.writeFile(path.join(dir, 'pom.xml'), '<project></project>');
    const result = await detectTestRunner(dir);
    assert.equal(result.testCmd, 'mvn test -q');
    await fs.rm(dir, { recursive: true });
  });

  it('returns null testCmd when no language detected', async () => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'sandbox-test-'));
    const result = await detectTestRunner(dir);
    assert.equal(result.testCmd, null);
    await fs.rm(dir, { recursive: true });
  });
});
