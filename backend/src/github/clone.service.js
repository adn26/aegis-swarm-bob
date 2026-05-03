import simpleGit from 'simple-git';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { CloneError } from '../utils/errors.js';

/**
 * GitHub Repository Cloning Service
 */
class CloneService {
  constructor() {
    this.workspacePath = config.workspace.path;
    this.maxSize = config.workspace.maxSize;
    
    // Ensure workspace directory exists
    if (!fs.existsSync(this.workspacePath)) {
      fs.mkdirSync(this.workspacePath, { recursive: true });
      logger.info(`Created workspace directory: ${this.workspacePath}`);
    }
  }

  /**
   * Parse GitHub repository URL
   * @param {string} repoUrl - GitHub repository URL
   * @returns {object} - { owner, repo, isValid }
   */
  parseRepoUrl(repoUrl) {
    try {
      // Detect Pull Request URLs
      let isPullRequest = false;
      let pullNumber = null;
      let baseUrl = repoUrl;
      
      const prMatch = repoUrl.match(/(https:\/\/github\.com\/[^\/]+\/[^\/]+)\/pull\/(\d+)/);
      if (prMatch) {
        isPullRequest = true;
        baseUrl = prMatch[1];
        pullNumber = prMatch[2];
      }

      // Support both HTTPS and SSH URLs
      const httpsPattern = /github\.com\/([^\/]+)\/([^\/\.]+)/;
      const sshPattern = /git@github\.com:([^\/]+)\/([^\/\.]+)/;
      
      let match = baseUrl.match(httpsPattern) || baseUrl.match(sshPattern);
      
      if (!match) {
        return { isValid: false };
      }

      return {
        isValid: true,
        owner: match[1],
        repo: match[2].replace('.git', ''),
        fullName: `${match[1]}/${match[2].replace('.git', '')}`,
        isPullRequest,
        pullNumber,
        baseUrl,
      };
    } catch (error) {
      logger.error('Failed to parse repository URL:', error);
      return { isValid: false };
    }
  }

  /**
   * Detect default branch of a repository
   * @param {string} repoUrl - GitHub repository URL
   * @returns {Promise<string>} - Default branch name
   */
  async detectDefaultBranch(repoUrl) {
    try {
      // Add GitHub token for authentication if available
      let authRepoUrl = repoUrl;
      if (config.github.token && repoUrl.startsWith('https://')) {
        authRepoUrl = repoUrl.replace(
          'https://github.com/',
          `https://${config.github.token}@github.com/`
        );
      }

      // Try to get remote info
      const git = simpleGit();
      const remoteInfo = await git.listRemote(['--symref', authRepoUrl, 'HEAD']);
      
      // Parse the output to find the default branch
      // Output format: "ref: refs/heads/main	HEAD"
      const match = remoteInfo.match(/ref: refs\/heads\/(\S+)\s+HEAD/);
      if (match) {
        logger.info(`Detected default branch: ${match[1]}`);
        return match[1];
      }
      
      // Fallback to 'main'
      logger.warn('Could not detect default branch, defaulting to "main"');
      return 'main';
    } catch (error) {
      logger.warn('Error detecting default branch, trying common branches:', error.message);
      // Try common branch names
      return 'main';
    }
  }

  /**
   * Clone a GitHub repository
   * @param {string} repoUrl - GitHub repository URL
   * @param {string} branch - Branch to clone (optional, will auto-detect if not provided)
   * @returns {Promise<object>} - { workspacePath, repoInfo }
   */
  async cloneRepository(repoUrl, branch = null) {
    const repoInfo = this.parseRepoUrl(repoUrl);
    
    if (!repoInfo.isValid) {
      throw new CloneError(repoUrl, 'Invalid GitHub repository URL');
    }

    // Generate unique workspace directory
    const workspaceId = uuidv4();
    const repoWorkspace = path.join(this.workspacePath, workspaceId);

    try {
      logger.info(`Cloning repository: ${repoInfo.fullName}`);
      
      // Use baseUrl for cloning
      const targetUrl = repoInfo.baseUrl;
      
      // Auto-detect branch if not provided and not a PR
      if (!branch && !repoInfo.isPullRequest) {
        branch = await this.detectDefaultBranch(targetUrl);
        logger.info(`Using detected branch: ${branch}`);
      }
      
      // Initialize git
      const git = simpleGit();
      
      // Add GitHub token for authentication if available
      let authRepoUrl = targetUrl;
      if (config.github.token && targetUrl.startsWith('https://')) {
        authRepoUrl = targetUrl.replace(
          'https://github.com/',
          `https://${config.github.token}@github.com/`
        );
      }

      let cloneSuccess = false;
      let lastError = null;

      if (repoInfo.isPullRequest) {
        try {
          logger.info(`Attempting to clone Pull Request #${repoInfo.pullNumber}`);
          // Clone base repo without checking out
          await git.clone(authRepoUrl, repoWorkspace, ['--no-checkout']);
          
          const repoGit = simpleGit(repoWorkspace);
          // Fetch the PR
          await repoGit.fetch('origin', `pull/${repoInfo.pullNumber}/head:pr-${repoInfo.pullNumber}`);
          // Checkout the PR branch
          await repoGit.checkout(`pr-${repoInfo.pullNumber}`);
          
          cloneSuccess = true;
          branch = `pr-${repoInfo.pullNumber}`;
          logger.info(`Successfully cloned PR #${repoInfo.pullNumber}`);
        } catch (error) {
          lastError = error;
          logger.warn(`Failed to clone PR #${repoInfo.pullNumber}: ${error.message}`);
          if (fs.existsSync(repoWorkspace)) {
            fs.rmSync(repoWorkspace, { recursive: true, force: true });
          }
        }
      } else {
        // Try to clone with specified/detected branch
        const branchesToTry = [branch, 'main', 'master'];

        for (const tryBranch of branchesToTry) {
          try {
            logger.info(`Attempting to clone branch: ${tryBranch}`);
            
            const cloneOptions = {
              '--depth': 1,
              '--single-branch': null,
              '--branch': tryBranch,
            };

            await git.clone(authRepoUrl, repoWorkspace, cloneOptions);
            cloneSuccess = true;
            branch = tryBranch; // Update to the successful branch
            logger.info(`Successfully cloned branch: ${tryBranch}`);
            break;
          } catch (error) {
            lastError = error;
            logger.warn(`Failed to clone branch ${tryBranch}: ${error.message}`);
            // Clean up failed attempt
            if (fs.existsSync(repoWorkspace)) {
              fs.rmSync(repoWorkspace, { recursive: true, force: true });
            }
          }
        }
      }

      if (!cloneSuccess) {
        throw lastError || new Error('Failed to clone repository with any common branch');
      }
      
      // Get repository info
      const repoGit = simpleGit(repoWorkspace);
      const status = await repoGit.status();
      const log = await repoGit.log({ maxCount: 1 });
      
      // Check repository size
      const repoSize = await this.getDirectorySize(repoWorkspace);
      if (repoSize > this.maxSize) {
        // Cleanup
        await this.cleanupWorkspace(repoWorkspace);
        throw new CloneError(
          repoUrl,
          `Repository size (${this.formatBytes(repoSize)}) exceeds maximum allowed size (${this.formatBytes(this.maxSize)})`
        );
      }

      logger.info(`Successfully cloned repository to: ${repoWorkspace}`);
      logger.info(`Repository size: ${this.formatBytes(repoSize)}`);

      return {
        workspacePath: repoWorkspace,
        workspaceId,
        repoInfo: {
          ...repoInfo,
          branch: status.current,
          commitSha: log.latest?.hash,
          commitMessage: log.latest?.message,
          commitAuthor: log.latest?.author_name,
          commitDate: log.latest?.date,
          size: repoSize,
        },
      };
    } catch (error) {
      // Cleanup on error
      if (fs.existsSync(repoWorkspace)) {
        await this.cleanupWorkspace(repoWorkspace);
      }
      
      logger.error('Failed to clone repository:', error);
      throw new CloneError(repoUrl, error.message);
    }
  }

  /**
   * Get directory size recursively
   * @param {string} dirPath - Directory path
   * @returns {Promise<number>} - Size in bytes
   */
  async getDirectorySize(dirPath) {
    let size = 0;

    const walk = (dir) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          walk(filePath);
        } else {
          size += stats.size;
        }
      }
    };

    walk(dirPath);
    return size;
  }

  /**
   * Format bytes to human-readable format
   * @param {number} bytes - Size in bytes
   * @returns {string} - Formatted size
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Cleanup workspace directory
   * @param {string} workspacePath - Workspace path to cleanup
   */
  async cleanupWorkspace(workspacePath) {
    try {
      if (fs.existsSync(workspacePath)) {
        fs.rmSync(workspacePath, { recursive: true, force: true });
        logger.info(`Cleaned up workspace: ${workspacePath}`);
      }
    } catch (error) {
      logger.error('Failed to cleanup workspace:', error);
    }
  }

  /**
   * Cleanup old workspaces (older than 24 hours)
   */
  async cleanupOldWorkspaces() {
    try {
      const workspaces = fs.readdirSync(this.workspacePath);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const workspace of workspaces) {
        const workspacePath = path.join(this.workspacePath, workspace);
        const stats = fs.statSync(workspacePath);
        
        if (stats.isDirectory() && (now - stats.mtimeMs) > maxAge) {
          await this.cleanupWorkspace(workspacePath);
        }
      }
      
      logger.info('Cleaned up old workspaces');
    } catch (error) {
      logger.error('Failed to cleanup old workspaces:', error);
    }
  }

  /**
   * Get workspace info
   * @param {string} workspacePath - Workspace path
   * @returns {Promise<object>} - Workspace info
   */
  async getWorkspaceInfo(workspacePath) {
    try {
      const git = simpleGit(workspacePath);
      const status = await git.status();
      const log = await git.log({ maxCount: 1 });
      const remotes = await git.getRemotes(true);
      
      return {
        branch: status.current,
        commitSha: log.latest?.hash,
        commitMessage: log.latest?.message,
        remoteUrl: remotes[0]?.refs?.fetch,
        modified: status.modified.length,
        created: status.created.length,
        deleted: status.deleted.length,
      };
    } catch (error) {
      logger.error('Failed to get workspace info:', error);
      return null;
    }
  }
}

export default new CloneService();

// Made with Bob
