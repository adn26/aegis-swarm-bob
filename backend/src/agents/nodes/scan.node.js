import { scanDirectory } from '../../scanner/fileScanner.js';
import storageService from '../../services/storage.service.js';
import sseService from '../../services/sse.service.js';
import logger from '../../utils/logger.js';
import { addMessage, updateStats } from '../graph/state.js';

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
    const files = await scanDirectory(state.workspacePath);

    logger.info(`Found ${files.length} files to analyze`);

    // Create scanned file records in database
    for (const file of files) {
      await storageService.createScannedFile({
        auditId: state.auditId,
        filePath: file.path,
        fileSize: file.size,
        linesOfCode: file.lines,
        language: file.language,
      });
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