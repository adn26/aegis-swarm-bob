import fileScanner from '../../scanner/fileScanner.js';
import storageService from '../../services/storage.service.js';
import sseService from '../../services/sse.service.js';
import logger from '../../utils/logger.js';
import { addMessage, updateStats } from '../graph/state.js';

/**
 * Patterns for files to skip during security analysis
 * These are typically vendor libraries, minified files, or assets
 */
const SKIP_PATTERNS = [
  /node_modules/,
  /vendor/,
  /\.min\.js$/,
  /\.min\.css$/,
  /bootstrap/,
  /jquery/,
  /raphael/,
  /html5shiv/,
  /morris/,
  /assets\/vendor/,
  /assets\/js\/tour/,
  /assets\/js\/chart/,
  /\.bundle\./,
  /dist\//,
  /build\//,
];

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
    
    // Filter out vendor/minified files
    const files = allFiles.filter(file => !shouldSkipFile(file.path));
    
    const skippedCount = allFiles.length - files.length;
    logger.info(`Found ${allFiles.length} files, analyzing ${files.length} (skipped ${skippedCount} vendor/minified files)`);

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
      status: 'analyzing',
    });

    // Send SSE event
    sseService.sendFilesScanned(state.auditId, {
      message: `Found ${files.length} files to analyze`,
      totalFiles: files.length,
      files: files.map(f => ({
        path: f.path,
        language: f.language,
        lines: f.lines,
      })),
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