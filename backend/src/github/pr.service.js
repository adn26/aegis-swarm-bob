import { Octokit } from '@octokit/rest';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { GitHubError } from '../utils/errors.js';

/**
 * GitHub Pull Request Service
 */
class PRService {
  constructor() {
    this.octokit = new Octokit({
      auth: config.github.token,
      userAgent: config.github.userAgent,
    });
  }

  /**
   * Fetch Pull Request information
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {number} prNumber - Pull request number
   * @returns {Promise<object>} - PR information
   */
  async fetchPR(owner, repo, prNumber) {
    try {
      logger.info(`Fetching PR #${prNumber} from ${owner}/${repo}`);

      const { data: pr } = await this.octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });

      return {
        number: pr.number,
        title: pr.title,
        description: pr.body,
        state: pr.state,
        author: pr.user.login,
        authorAvatar: pr.user.avatar_url,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        mergedAt: pr.merged_at,
        branch: {
          head: pr.head.ref,
          base: pr.base.ref,
        },
        commits: pr.commits,
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.changed_files,
        url: pr.html_url,
        labels: pr.labels.map(l => l.name),
      };
    } catch (error) {
      logger.error('Failed to fetch PR:', error);
      throw new GitHubError(`Failed to fetch PR #${prNumber}`, error.message);
    }
  }

  /**
   * Fetch PR files (changed files in the PR)
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {number} prNumber - Pull request number
   * @returns {Promise<Array>} - List of changed files
   */
  async fetchPRFiles(owner, repo, prNumber) {
    try {
      logger.info(`Fetching files for PR #${prNumber}`);

      const { data: files } = await this.octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber,
      });

      return files.map(file => ({
        filename: file.filename,
        status: file.status, // added, removed, modified, renamed
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch,
        blobUrl: file.blob_url,
        rawUrl: file.raw_url,
      }));
    } catch (error) {
      logger.error('Failed to fetch PR files:', error);
      throw new GitHubError(`Failed to fetch files for PR #${prNumber}`, error.message);
    }
  }

  /**
   * Fetch PR diff
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {number} prNumber - Pull request number
   * @returns {Promise<string>} - PR diff content
   */
  async fetchPRDiff(owner, repo, prNumber) {
    try {
      logger.info(`Fetching diff for PR #${prNumber}`);

      const { data: diff } = await this.octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
        mediaType: {
          format: 'diff',
        },
      });

      return diff;
    } catch (error) {
      logger.error('Failed to fetch PR diff:', error);
      throw new GitHubError(`Failed to fetch diff for PR #${prNumber}`, error.message);
    }
  }

  /**
   * Post comment on PR
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {number} prNumber - Pull request number
   * @param {string} body - Comment body
   * @returns {Promise<object>} - Comment information
   */
  async postPRComment(owner, repo, prNumber, body) {
    try {
      logger.info(`Posting comment on PR #${prNumber}`);

      const { data: comment } = await this.octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body,
      });

      return {
        id: comment.id,
        url: comment.html_url,
        createdAt: comment.created_at,
      };
    } catch (error) {
      logger.error('Failed to post PR comment:', error);
      throw new GitHubError(`Failed to post comment on PR #${prNumber}`, error.message);
    }
  }

  /**
   * Generate security audit comment for PR
   * @param {object} auditResults - Audit results
   * @returns {string} - Formatted comment body
   */
  generateAuditComment(auditResults) {
    const { audit, vulnerabilities, patches, summary } = auditResults;
    
    let comment = `## 🛡️ Aegis Swarm Security Audit Report\n\n`;
    
    // Summary
    comment += `### 📊 Summary\n`;
    comment += `- **Total Vulnerabilities**: ${summary.totalVulnerabilities}\n`;
    comment += `- **Critical**: ${summary.criticalCount} | **High**: ${summary.highCount} | **Medium**: ${summary.mediumCount} | **Low**: ${summary.lowCount}\n`;
    comment += `- **AI-Related Issues**: ${summary.aiRelatedCount}\n`;
    comment += `- **Patches Generated**: ${summary.patchesApplied}\n`;
    comment += `- **Patches Verified**: ${summary.patchesSuccessful}\n\n`;

    // Vulnerabilities
    if (vulnerabilities.length > 0) {
      comment += `### 🔍 Vulnerabilities Found\n\n`;
      
      vulnerabilities.forEach((vuln, index) => {
        const severityEmoji = {
          'Critical': '🔴',
          'High': '🟠',
          'Medium': '🟡',
          'Low': '🟢'
        }[vuln.severity] || '⚪';
        
        comment += `#### ${index + 1}. ${severityEmoji} ${vuln.type} (${vuln.severity})\n`;
        comment += `**File**: \`${vuln.file_path}\``;
        if (vuln.line_number) {
          comment += `:${vuln.line_number}`;
        }
        comment += `\n`;
        comment += `**Description**: ${vuln.description}\n`;
        
        if (vuln.is_ai_related) {
          comment += `🤖 **AI-Related Vulnerability**\n`;
        }
        
        if (vuln.owasp_category) {
          comment += `**OWASP**: ${vuln.owasp_category}\n`;
        }
        
        comment += `\n`;
      });
    }

    // Patches
    if (patches.length > 0) {
      comment += `### 🔧 Patches Applied\n\n`;
      
      patches.forEach((patch, index) => {
        const status = patch.test_passed ? '✅ Verified' : '❌ Failed';
        comment += `#### ${index + 1}. \`${patch.file_path}\` - ${status}\n`;
        comment += `${patch.explanation}\n\n`;
      });
    }

    // Recommendations
    comment += `### 💡 Recommendations\n\n`;
    if (summary.criticalCount > 0 || summary.highCount > 0) {
      comment += `- 🚨 **Immediate Action Required**: Address Critical and High severity vulnerabilities before merging\n`;
    }
    if (summary.aiRelatedCount > 0) {
      comment += `- 🤖 **AI Security**: Review AI-related vulnerabilities for prompt injection and data leakage\n`;
    }
    if (summary.patchesApplied > 0) {
      comment += `- ✅ **Apply Patches**: ${summary.patchesSuccessful}/${summary.patchesApplied} patches have been verified\n`;
    }
    
    comment += `\n---\n`;
    comment += `🛡️ *Generated by [Aegis Swarm](https://github.com/yourusername/aegis-swarm) Security Command Center*`;

    return comment;
  }

  /**
   * Check if repository exists and is accessible
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<object>} - Repository information
   */
  async checkRepository(owner, repo) {
    try {
      const { data: repository } = await this.octokit.repos.get({
        owner,
        repo,
      });

      return {
        exists: true,
        private: repository.private,
        defaultBranch: repository.default_branch,
        language: repository.language,
        size: repository.size,
        forksCount: repository.forks_count,
        starsCount: repository.stargazers_count,
        openIssues: repository.open_issues_count,
        hasIssues: repository.has_issues,
        hasPullRequests: repository.has_projects,
        createdAt: repository.created_at,
        updatedAt: repository.updated_at,
      };
    } catch (error) {
      if (error.status === 404) {
        return { exists: false };
      }
      
      logger.error('Failed to check repository:', error);
      throw new GitHubError(`Failed to check repository ${owner}/${repo}`, error.message);
    }
  }

  /**
   * Get repository languages
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<object>} - Languages used in repository
   */
  async getRepositoryLanguages(owner, repo) {
    try {
      const { data: languages } = await this.octokit.repos.listLanguages({
        owner,
        repo,
      });

      return languages;
    } catch (error) {
      logger.error('Failed to get repository languages:', error);
      throw new GitHubError(`Failed to get languages for ${owner}/${repo}`, error.message);
    }
  }

  /**
   * Parse GitHub URL to extract owner and repo
   * @param {string} url - GitHub URL
   * @returns {object} - { owner, repo, prNumber }
   */
  parseGitHubUrl(url) {
    try {
      // Handle different GitHub URL formats
      const patterns = [
        // PR URL: https://github.com/owner/repo/pull/123
        /github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/,
        // Repository URL: https://github.com/owner/repo
        /github\.com\/([^\/]+)\/([^\/\.]+)/,
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          return {
            owner: match[1],
            repo: match[2],
            prNumber: match[3] ? parseInt(match[3], 10) : null,
          };
        }
      }

      return null;
    } catch (error) {
      logger.error('Failed to parse GitHub URL:', error);
      return null;
    }
  }
}

export default new PRService();

// Made with Bob
