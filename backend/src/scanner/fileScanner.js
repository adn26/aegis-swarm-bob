import fs from 'fs';
import path from 'path';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { ScanError } from '../utils/errors.js';

/**
 * File Scanner Service
 * Scans repository for JavaScript/TypeScript files
 */
class FileScanner {
  constructor() {
    this.supportedExtensions = config.scanning.supportedExtensions;
    this.ignoredDirs = config.scanning.ignoredDirs;
    this.ignoredFiles = config.scanning.ignoredFiles;
    this.maxFileSize = config.scanning.maxFileSize;
  }

  /**
   * Scan directory for files
   * @param {string} dirPath - Directory path to scan
   * @returns {Promise<Array>} - List of scanned files
   */
  async scanDirectory(dirPath) {
    try {
      logger.info(`Scanning directory: ${dirPath}`);
      
      const files = [];
      const startTime = Date.now();
      
      await this.walkDirectory(dirPath, dirPath, files);
      
      const duration = Date.now() - startTime;
      logger.info(`Scan completed: ${files.length} files found in ${duration}ms`);
      
      return files;
    } catch (error) {
      logger.error('Failed to scan directory:', error);
      throw new ScanError('Failed to scan directory', error.message);
    }
  }

  /**
   * Walk directory recursively
   * @param {string} currentPath - Current directory path
   * @param {string} basePath - Base directory path
   * @param {Array} files - Array to store found files
   */
  async walkDirectory(currentPath, basePath, files) {
    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(basePath, fullPath);
        
        // Skip ignored directories
        if (entry.isDirectory()) {
          if (this.shouldIgnoreDirectory(entry.name)) {
            continue;
          }
          
          // Recursively scan subdirectory
          await this.walkDirectory(fullPath, basePath, files);
        } else if (entry.isFile()) {
          // Check if file should be scanned
          if (this.shouldScanFile(entry.name, fullPath)) {
            const fileInfo = await this.getFileInfo(fullPath, relativePath);
            if (fileInfo) {
              files.push(fileInfo);
            }
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to walk directory ${currentPath}:`, error);
      // Continue scanning other directories
    }
  }

  /**
   * Check if directory should be ignored
   * @param {string} dirName - Directory name
   * @returns {boolean}
   */
  shouldIgnoreDirectory(dirName) {
    return this.ignoredDirs.includes(dirName) || dirName.startsWith('.');
  }

  /**
   * Check if file should be scanned
   * @param {string} fileName - File name
   * @param {string} filePath - Full file path
   * @returns {boolean}
   */
  shouldScanFile(fileName, filePath) {
    // Check if file is in ignored list
    if (this.ignoredFiles.includes(fileName)) {
      return false;
    }
    
    // Check file extension
    const ext = path.extname(fileName).toLowerCase();
    if (!this.supportedExtensions.includes(ext)) {
      return false;
    }
    
    // Check file size
    try {
      const stats = fs.statSync(filePath);
      if (stats.size > this.maxFileSize) {
        logger.warn(`Skipping large file: ${fileName} (${this.formatBytes(stats.size)})`);
        return false;
      }
    } catch (error) {
      return false;
    }
    
    return true;
  }

  /**
   * Get file information
   * @param {string} filePath - Full file path
   * @param {string} relativePath - Relative file path
   * @returns {Promise<object>} - File information
   */
  async getFileInfo(filePath, relativePath) {
    try {
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Count lines of code (excluding empty lines and comments)
      const lines = content.split('\n');
      const linesOfCode = lines.filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && 
               !trimmed.startsWith('//') && 
               !trimmed.startsWith('/*') && 
               !trimmed.startsWith('*');
      }).length;
      
      return {
        path: relativePath,
        fullPath: filePath,
        name: path.basename(filePath),
        extension: path.extname(filePath),
        size: stats.size,
        lines: lines.length,
        linesOfCode,
        content,
        language: this.detectLanguage(filePath),
        modifiedAt: stats.mtime,
      };
    } catch (error) {
      logger.error(`Failed to get file info for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Detect programming language from file extension
   * @param {string} filePath - File path
   * @returns {string} - Language name
   */
  detectLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap = {
      '.js': 'JavaScript',
      '.jsx': 'JavaScript (React)',
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript (React)',
      '.mjs': 'JavaScript (ES Module)',
      '.cjs': 'JavaScript (CommonJS)',
    };
    
    return languageMap[ext] || 'JavaScript';
  }

  /**
   * Format bytes to human-readable format
   * @param {number} bytes - Size in bytes
   * @returns {string} - Formatted size
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get scan statistics
   * @param {Array} files - Scanned files
   * @returns {object} - Statistics
   */
  getStatistics(files) {
    const stats = {
      totalFiles: files.length,
      totalSize: 0,
      totalLines: 0,
      totalLinesOfCode: 0,
      byLanguage: {},
      byExtension: {},
      largestFiles: [],
    };
    
    for (const file of files) {
      stats.totalSize += file.size;
      stats.totalLines += file.lines;
      stats.totalLinesOfCode += file.linesOfCode;
      
      // Count by language
      if (!stats.byLanguage[file.language]) {
        stats.byLanguage[file.language] = 0;
      }
      stats.byLanguage[file.language]++;
      
      // Count by extension
      if (!stats.byExtension[file.extension]) {
        stats.byExtension[file.extension] = 0;
      }
      stats.byExtension[file.extension]++;
    }
    
    // Get largest files
    stats.largestFiles = files
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .map(f => ({
        path: f.path,
        size: this.formatBytes(f.size),
        lines: f.lines,
      }));
    
    return stats;
  }

  /**
   * Filter files by pattern
   * @param {Array} files - Files to filter
   * @param {string} pattern - Pattern to match (regex or glob)
   * @returns {Array} - Filtered files
   */
  filterFiles(files, pattern) {
    try {
      const regex = new RegExp(pattern);
      return files.filter(file => regex.test(file.path));
    } catch (error) {
      logger.error('Invalid filter pattern:', error);
      return files;
    }
  }

  /**
   * Group files by directory
   * @param {Array} files - Files to group
   * @returns {object} - Files grouped by directory
   */
  groupByDirectory(files) {
    const grouped = {};
    
    for (const file of files) {
      const dir = path.dirname(file.path);
      if (!grouped[dir]) {
        grouped[dir] = [];
      }
      grouped[dir].push(file);
    }
    
    return grouped;
  }

  /**
   * Find files containing specific pattern
   * @param {Array} files - Files to search
   * @param {string} pattern - Pattern to search for
   * @returns {Array} - Files containing pattern
   */
  findFilesWithPattern(files, pattern) {
    try {
      const regex = new RegExp(pattern, 'i');
      return files.filter(file => regex.test(file.content));
    } catch (error) {
      logger.error('Invalid search pattern:', error);
      return [];
    }
  }

  /**
   * Get file tree structure
   * @param {Array} files - Scanned files
   * @returns {object} - Tree structure
   */
  getFileTree(files) {
    const tree = {};
    
    for (const file of files) {
      const parts = file.path.split(path.sep);
      let current = tree;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        
        if (i === parts.length - 1) {
          // Leaf node (file)
          current[part] = {
            type: 'file',
            ...file,
          };
        } else {
          // Directory node
          if (!current[part]) {
            current[part] = {
              type: 'directory',
              children: {},
            };
          }
          current = current[part].children;
        }
      }
    }
    
    return tree;
  }
}

export default new FileScanner();

// Made with Bob
