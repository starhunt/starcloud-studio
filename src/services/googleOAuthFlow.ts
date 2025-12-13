import { OAuthTokens } from '../types';
import * as http from 'http';
import * as crypto from 'crypto';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectPort: number;
}

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email'
];

export class GoogleOAuthFlow {
  private config: OAuthConfig;

  constructor(config: OAuthConfig) {
    this.config = config;
  }

  /**
   * Start OAuth flow and return tokens
   */
  async startOAuthFlow(): Promise<OAuthTokens> {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    return new Promise((resolve, reject) => {
      const server = http.createServer();
      let resolved = false;

      // Timeout after 2 minutes
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          server.close();
          reject(new Error('OAuth flow timed out'));
        }
      }, 120000);

      server.on('request', async (req, res) => {
        if (!req.url?.startsWith('/callback')) return;

        const url = new URL(req.url, `http://localhost:${this.config.redirectPort}`);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(this.getErrorHtml(error));
          clearTimeout(timeout);
          resolved = true;
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }

        if (code) {
          try {
            const tokens = await this.exchangeCodeForTokens(code, codeVerifier);
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(this.getSuccessHtml());
            clearTimeout(timeout);
            resolved = true;
            server.close();
            resolve(tokens);
          } catch (err) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(this.getErrorHtml(err instanceof Error ? err.message : 'Token exchange failed'));
            clearTimeout(timeout);
            resolved = true;
            server.close();
            reject(err);
          }
        }
      });

      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`Port ${this.config.redirectPort} is already in use`));
        } else {
          reject(err);
        }
      });

      server.listen(this.config.redirectPort, () => {
        const authUrl = this.buildAuthUrl(codeChallenge);
        // Open browser - use Electron's shell if available
        const { shell } = require('electron');
        shell.openExternal(authUrl);
      });
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(code: string, codeVerifier: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: `http://localhost:${this.config.redirectPort}/callback`
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Token exchange failed: ${errorData}`);
    }

    const data = await response.json();
    const expiresAt = Date.now() + (data.expires_in * 1000);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      expiresAt
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Token refresh failed: ${errorData}`);
    }

    const data = await response.json();
    const expiresAt = Date.now() + (data.expires_in * 1000);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in,
      expiresAt
    };
  }

  /**
   * Check if token is expired (with 5 minute buffer)
   */
  isTokenExpired(expiresAt: number): boolean {
    const bufferMs = 5 * 60 * 1000;
    return Date.now() >= (expiresAt - bufferMs);
  }

  /**
   * Build authorization URL
   */
  private buildAuthUrl(codeChallenge: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: `http://localhost:${this.config.redirectPort}/callback`,
      response_type: 'code',
      scope: SCOPES.join(' '),
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'offline',
      prompt: 'consent'
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const hash = crypto.createHash('sha256').update(verifier).digest();
    return hash.toString('base64url');
  }

  private getSuccessHtml(): string {
    return `<!DOCTYPE html><html><head><title>Connected!</title><style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%)}.container{text-align:center;background:white;padding:40px 60px;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,0.2)}.icon{font-size:64px;margin-bottom:16px}h1{color:#333;margin:0 0 8px 0}p{color:#666;margin:0}</style></head><body><div class="container"><div class="icon">✅</div><h1>Connected!</h1><p>You can close this window and return to Obsidian.</p></div></body></html>`;
  }

  private getErrorHtml(error: string): string {
    return `<!DOCTYPE html><html><head><title>Connection Failed</title><style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:linear-gradient(135deg,#ff6b6b 0%,#ee5a24 100%)}.container{text-align:center;background:white;padding:40px 60px;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,0.2)}.icon{font-size:64px;margin-bottom:16px}h1{color:#333;margin:0 0 8px 0}p{color:#666;margin:0}.error{color:#e74c3c;font-family:monospace;margin-top:16px;padding:12px;background:#fee;border-radius:8px}</style></head><body><div class="container"><div class="icon">❌</div><h1>Connection Failed</h1><p>Please try again from Obsidian.</p><div class="error">${error}</div></div></body></html>`;
  }
}
