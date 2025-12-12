import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GitConfig {
  repoPath: string;
  branch: string;
  token: string;
  pagesUrl: string;
}

export interface GitResult {
  success: boolean;
  message: string;
  url?: string;
}

export class GitService {
  private config: GitConfig;

  constructor(config: GitConfig) {
    this.config = config;
  }

  /**
   * Commit and push a single file to the repository
   */
  async commitAndPush(filePath: string, commitMessage: string): Promise<GitResult> {
    try {
      const { repoPath, branch, token } = this.config;

      if (!repoPath) {
        return { success: false, message: 'Git repository path not configured' };
      }

      // Get relative path from repo root
      const relativePath = this.getRelativePath(filePath, repoPath);

      // Stage the file
      await this.execGit(`add "${relativePath}"`, repoPath);

      // Check if there are changes to commit
      const status = await this.execGit('status --porcelain', repoPath);
      if (!status.stdout.trim()) {
        return { success: true, message: 'No changes to commit' };
      }

      // Commit
      await this.execGit(`commit -m "${commitMessage}"`, repoPath);

      // Push with token authentication
      if (token) {
        await this.pushWithToken(repoPath, branch, token);
      } else {
        await this.execGit(`push origin ${branch}`, repoPath);
      }

      // Generate GitHub Pages URL
      const pagesUrl = this.generatePagesUrl(relativePath);

      return {
        success: true,
        message: 'Successfully committed and pushed',
        url: pagesUrl
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Git operation failed:', errorMessage);
      return {
        success: false,
        message: `Git operation failed: ${errorMessage}`
      };
    }
  }

  /**
   * Execute a git command in the specified directory
   */
  private async execGit(command: string, cwd: string): Promise<{ stdout: string; stderr: string }> {
    try {
      const result = await execAsync(`git ${command}`, {
        cwd,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
      });
      return result;
    } catch (error: any) {
      // exec throws on non-zero exit codes, but we might still have useful output
      if (error.stdout || error.stderr) {
        throw new Error(error.stderr || error.stdout || error.message);
      }
      throw error;
    }
  }

  /**
   * Push with Personal Access Token authentication
   */
  private async pushWithToken(repoPath: string, branch: string, token: string): Promise<void> {
    // Get the current remote URL
    const { stdout: remoteUrl } = await this.execGit('remote get-url origin', repoPath);
    const cleanUrl = remoteUrl.trim();

    // Parse the URL and inject token
    let authenticatedUrl: string;

    if (cleanUrl.startsWith('https://')) {
      // https://github.com/user/repo.git -> https://token@github.com/user/repo.git
      authenticatedUrl = cleanUrl.replace('https://', `https://${token}@`);
    } else if (cleanUrl.startsWith('git@')) {
      // git@github.com:user/repo.git -> https://token@github.com/user/repo.git
      const match = cleanUrl.match(/git@([^:]+):(.+)/);
      if (match) {
        authenticatedUrl = `https://${token}@${match[1]}/${match[2]}`;
      } else {
        throw new Error('Unable to parse SSH remote URL');
      }
    } else {
      throw new Error(`Unsupported remote URL format: ${cleanUrl}`);
    }

    // Push using the authenticated URL
    await this.execGit(`push ${authenticatedUrl} ${branch}`, repoPath);
  }

  /**
   * Get the relative path from repository root
   */
  private getRelativePath(absolutePath: string, repoPath: string): string {
    // Normalize paths
    const normalizedAbsolute = absolutePath.replace(/\\/g, '/');
    const normalizedRepo = repoPath.replace(/\\/g, '/');

    if (normalizedAbsolute.startsWith(normalizedRepo)) {
      return normalizedAbsolute.substring(normalizedRepo.length + 1);
    }

    // If the file is not directly under repo path, try to find common structure
    // This handles cases where slidesRootPath is a subdirectory
    const parts = normalizedAbsolute.split('/');
    const repoParts = normalizedRepo.split('/');
    const repoName = repoParts[repoParts.length - 1];

    const repoIndex = parts.indexOf(repoName);
    if (repoIndex >= 0) {
      return parts.slice(repoIndex + 1).join('/');
    }

    // Fallback: just use the filename with year/month structure
    const match = normalizedAbsolute.match(/(\d{4})\/(\d{2})\/([^/]+)$/);
    if (match) {
      return `${match[1]}/${match[2]}/${match[3]}`;
    }

    return parts[parts.length - 1];
  }

  /**
   * Generate the GitHub Pages URL for the file
   */
  private generatePagesUrl(relativePath: string): string {
    const { pagesUrl } = this.config;
    if (!pagesUrl) {
      return '';
    }

    // Ensure pagesUrl doesn't end with /
    const baseUrl = pagesUrl.replace(/\/$/, '');
    // Ensure relativePath doesn't start with /
    const cleanPath = relativePath.replace(/^\//, '');

    return `${baseUrl}/${cleanPath}`;
  }

  /**
   * Test the git configuration
   */
  async testConnection(): Promise<GitResult> {
    try {
      const { repoPath, branch } = this.config;

      if (!repoPath) {
        return { success: false, message: 'Repository path not configured' };
      }

      // Check if it's a git repository
      await this.execGit('rev-parse --git-dir', repoPath);

      // Check current branch
      const { stdout: currentBranch } = await this.execGit('branch --show-current', repoPath);

      if (currentBranch.trim() !== branch) {
        return {
          success: false,
          message: `Current branch is '${currentBranch.trim()}', expected '${branch}'`
        };
      }

      // Check remote
      await this.execGit('remote get-url origin', repoPath);

      return {
        success: true,
        message: `Connected to repository on branch '${branch}'`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Connection test failed: ${errorMessage}`
      };
    }
  }
}
