import fileScanner from '../../scanner/fileScanner.js';
import storageService from '../../services/storage.service.js';
import sseService from '../../services/sse.service.js';
import logger from '../../utils/logger.js';
import { addMessage, updateStats } from '../graph/state.js';

/**
 * Patterns for files to skip during security analysis (Layer 1 - Ingestion)
 * These are skipped entirely from both deterministic and LLM analysis
 */
const SKIP_PATTERNS = [
  /node_modules\//,
  /vendor\//,
  /dist\//,
  /build\//,
  /\.git\//,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /Pipfile\.lock$/,
  /\.(png|jpg|jpeg|gif|svg|ico|pdf|zip|tar|gz|mp4|mp3|woff|woff2|ttf|eot)$/i, // Binary/Assets
  /test-fixtures\//,
  /mock-data\//,
  /\.min\.(js|css)$/,
];

/**
 * Priority Scoring for LLM Context Bundle
 * 1: Config/Secrets, 2: Entry points, 3: Auth, 4: Data, 5: CI/CD
 */
const getFilePriority = (filePath) => {
  const fileName = filePath.split('/').pop().toLowerCase();

  // Priority 1 — Configuration and secrets surface
  if (
    ['package.json', 'requirements.txt', 'gemfile', 'go.mod', 'cargo.toml'].includes(fileName) ||
    fileName.startsWith('.env') ||
    ['docker-compose.yml', 'dockerfile'].includes(fileName) ||
    ['nginx.conf', 'httpd.conf', '.htaccess'].includes(fileName)
  ) return 1;

  // Priority 2 — Entry points and routing
  if (
    ['server.js', 'app.js', 'app.py', 'main.go', 'index.ts', 'index.js', 'wsgi.py', 'asgi.py'].includes(fileName) ||
    /routes?/i.test(filePath) || /controllers?/i.test(filePath) || /views?/i.test(filePath) || /handlers?/i.test(filePath) ||
    ['openapi.yml', 'swagger.json'].includes(fileName)
  ) return 2;

  // Priority 3 — Auth and security surface
  if (
    /auth/i.test(filePath) || /login/i.test(filePath) || /jwt/i.test(filePath) || /oauth/i.test(filePath) || /session/i.test(filePath) ||
    /password/i.test(filePath) || /token/i.test(filePath) || /crypto/i.test(filePath) || /secret/i.test(filePath) ||
    /middleware/i.test(filePath)
  ) return 3;

  // Priority 4 — Data layer
  if (
    /model/i.test(filePath) || /schema/i.test(filePath) || /migration/i.test(filePath) || /repository/i.test(filePath) ||
    filePath.endsWith('.sql')
  ) return 4;

  // Priority 5 — CI/CD and infrastructure
  if (
    filePath.includes('.github/workflows/') ||
    ['makefile', 'jenkinsfile'].includes(fileName) ||
    filePath.endsWith('.tf') ||
    filePath.includes('k8s/') || filePath.includes('helm/')
  ) return 5;

  return 10; // Default lower priority
};

/**
 * Check if a file should be skipped from analysis
 */
const shouldSkipFile = (filePath) => {
  return SKIP_PATTERNS.some(pattern => pattern.test(filePath));
};

/**
 * Scan Files Node
 * Scans the repository for files to analyze
 */
export const scanFilesNode = async (state) => {
  try {
    logger.info(`Scanning files in: ${state.workspacePath}`);

    // Send SSE event
    sseService.sendProgress(state.auditId, {
      message: 'Scanning repository files',
      step: 'file_scanning',
    });

    // Scan the directory for files
    const allFiles = await fileScanner.scanDirectory(state.workspacePath);
    
    // Filter and assign priorities
    const files = allFiles
      .filter(file => !shouldSkipFile(file.path))
      .map(file => ({
        ...file,
        priority: getFilePriority(file.path)
      }))
      .sort((a, b) => a.priority - b.priority); // Sort by priority (1 is highest)
    
    const skippedCount = allFiles.length - files.length;
    logger.info(`Found ${allFiles.length} files, analyzing ${files.length} (skipped ${skippedCount} vendor/minified/ignored files)`);

    // Create scanned file records in database (batch insert for performance)
    try {
      // Use Promise.all for parallel inserts (faster than sequential)
      await Promise.all(
        files.map(file =>
          storageService.createScannedFile({
            auditId: state.auditId,
            filePath: file.path,
            fileSize: file.size,
            linesOfCode: file.lines,
            language: file.language,
            priority: file.priority,
          }).catch(err => {
            logger.warn(`Failed to create scanned file record for ${file.path}:`, err.message);
            // Continue even if one file fails
            return null;
          })
        )
      );
      logger.info(`Created ${files.length} scanned file records`);
    } catch (error) {
      logger.error('Error creating scanned file records:', error);
      // Continue workflow even if database inserts fail
    }

    // Update audit statistics
    await storageService.updateAudit(state.auditId, {
      totalFiles: files.length,
      status: 'scanning', // Start deterministic phase
    });

    // Send SSE event for files scanned
    sseService.sendFilesScanned(state.auditId, {
      message: `Ingestion complete: ${files.length} files discovered`,
      totalFiles: files.length,
      status: 'ingestion_complete',
      files: files.map(f => ({
        path: f.path,
        language: f.language,
        lines: f.lines,
        priority: f.priority,
      })),
    });

    // Also send a progress update to transition the UI
    sseService.sendProgress(state.auditId, {
      message: `Starting deterministic analysis...`,
      step: 'deterministic_analysis_start',
      status: 'deterministic_analysis_started',
      totalFiles: files.length
    });

    // Return updated state with files
    const updatedState = updateStats(
      {
        ...state,
        files,
        currentFileIndex: 0,
        currentFile: files.length > 0 ? files[0] : null,
        currentStep: 'scan_complete',
      },
      {
        totalFiles: files.length,
      }
    );

    return addMessage(updatedState, {
      role: 'system',
      content: `Scanned ${files.length} files for analysis`,
      step: 'scan_files',
    });

  } catch (error) {
    logger.error('Failed to scan files:', error);

    // Send error event
    sseService.sendError(state.auditId, {
      message: 'Failed to scan files',
      error: error.message,
    });

    // Update audit status
    await storageService.updateAudit(state.auditId, {
      status: 'failed',
      errorMessage: `File scan failed: ${error.message}`,
    });

    return {
      ...state,
      status: 'failed',
      error: error.message,
      currentStep: 'scan_failed',
    };
  }
};

export default scanFilesNode;

// Made with Bob