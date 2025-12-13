/**
 * Google Drive Upload Service
 * Handles file upload to Google Drive with year/month folder structure and duplicate handling
 */
import { requestUrl, Notice } from 'obsidian';
import { GoogleOAuthFlow } from './googleOAuthFlow';
import { OAuthTokens, DriveUploadResult, UploadProgress, GenerationErrorClass } from '../types';

export interface DriveUploadConfig {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: number;
  onTokenRefresh?: (tokens: OAuthTokens) => Promise<void>;
}

export class DriveUploadService {
  private readonly API_URL = 'https://www.googleapis.com/drive/v3';
  private readonly UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3';
  private readonly REDIRECT_PORT = 8586;

  private config: DriveUploadConfig;
  private oauthFlow: GoogleOAuthFlow;

  constructor(config: DriveUploadConfig) {
    this.config = config;
    this.oauthFlow = new GoogleOAuthFlow({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectPort: this.REDIRECT_PORT
    });
  }

  /**
   * Check if connected to Google Drive
   */
  isConnected(): boolean {
    return !!(this.config.accessToken && this.config.refreshToken);
  }

  /**
   * Upload base64 image to Google Drive
   */
  async uploadImage(
    imageData: string,
    mimeType: string,
    fileName: string,
    baseFolderPath: string,
    organizeFoldersByDate: boolean,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<DriveUploadResult> {
    try {
      // Stage 1: Preparing
      onProgress?.({
        stage: 'preparing',
        message: 'Preparing upload...',
        progress: 10
      });

      const accessToken = await this.ensureValidToken();

      // Get or create folder (with year/month structure if enabled)
      const folderId = await this.ensureFolderWithDateStructure(baseFolderPath, organizeFoldersByDate);

      // Check for duplicate filename and get unique name
      const uniqueFileName = await this.getUniqueFileName(folderId, fileName, accessToken);

      // Stage 2: Uploading
      onProgress?.({
        stage: 'uploading',
        message: 'Uploading to Google Drive...',
        progress: 30
      });

      // Create file metadata
      const metadata = {
        name: uniqueFileName,
        mimeType: mimeType,
        parents: [folderId]
      };

      // Upload using multipart
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const multipartBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType}\r\n` +
        'Content-Transfer-Encoding: base64\r\n\r\n' +
        imageData +
        closeDelimiter;

      const uploadResponse = await requestUrl({
        url: `${this.UPLOAD_URL}/files?uploadType=multipart&fields=id,webViewLink,webContentLink,name,mimeType`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartBody
      });

      if (uploadResponse.status !== 200) {
        throw new GenerationErrorClass('UPLOAD_ERROR', `Upload failed: ${uploadResponse.status}`);
      }

      const fileData = uploadResponse.json;
      const fileId = fileData.id;

      // Stage 3: Setting permission
      onProgress?.({
        stage: 'setting-permission',
        message: 'Setting public access...',
        progress: 70
      });

      await this.makeFilePublic(fileId);

      // Get updated file info
      const fileInfo = await this.getFileInfo(fileId);

      // Stage 4: Complete
      onProgress?.({
        stage: 'complete',
        message: 'Upload complete!',
        progress: 100
      });

      return {
        fileId: fileId,
        webViewLink: fileInfo.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
        webContentLink: fileInfo.webContentLink || `https://drive.google.com/uc?export=view&id=${fileId}`,
        fileName: uniqueFileName,
        mimeType: mimeType
      };

    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
      const message = error instanceof Error ? error.message : String(error);
      onProgress?.({
        stage: 'error',
        message: 'Upload failed',
        progress: 0,
        error: message
      });

      if (error instanceof GenerationErrorClass) {
        throw error;
      }
      throw new GenerationErrorClass('UPLOAD_ERROR', `Upload failed: ${message}`);
    }
  }

  /**
   * Ensure folder exists with optional year/month structure
   */
  private async ensureFolderWithDateStructure(
    basePath: string,
    organizeByDate: boolean
  ): Promise<string> {
    // Create base folder path
    let folderId = await this.ensureFolder(basePath);

    if (organizeByDate) {
      const now = new Date();
      const year = now.getFullYear().toString();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');

      // Create year folder
      folderId = await this.ensureSubfolder(folderId, year);

      // Create month folder
      folderId = await this.ensureSubfolder(folderId, month);
    }

    return folderId;
  }

  /**
   * Get unique filename by checking for duplicates
   */
  private async getUniqueFileName(
    folderId: string,
    originalName: string,
    accessToken: string
  ): Promise<string> {
    // Extract base name and extension
    const lastDotIndex = originalName.lastIndexOf('.');
    const baseName = lastDotIndex > 0 ? originalName.slice(0, lastDotIndex) : originalName;
    const extension = lastDotIndex > 0 ? originalName.slice(lastDotIndex) : '';

    let fileName = originalName;
    let counter = 1;

    // Check for existing files with the same name
    while (await this.fileExists(folderId, fileName, accessToken)) {
      fileName = `${baseName}-${counter}${extension}`;
      counter++;

      // Safety limit to prevent infinite loop
      if (counter > 100) {
        throw new GenerationErrorClass('UPLOAD_ERROR', 'Too many duplicate files. Please clean up your Drive folder.');
      }
    }

    return fileName;
  }

  /**
   * Check if a file exists in the folder
   */
  private async fileExists(
    folderId: string,
    fileName: string,
    accessToken: string
  ): Promise<boolean> {
    try {
      const query = `name='${fileName.replace(/'/g, "\\'")}' and '${folderId}' in parents and trashed=false`;

      const response = await requestUrl({
        url: `${this.API_URL}/files?q=${encodeURIComponent(query)}&fields=files(id)`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.status === 200) {
        const data = response.json;
        return data.files && data.files.length > 0;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Ensure a subfolder exists under a parent folder
   */
  private async ensureSubfolder(parentId: string, folderName: string): Promise<string> {
    const existingId = await this.findFolder(folderName, parentId);

    if (existingId) {
      return existingId;
    }

    return await this.createFolder(folderName, parentId);
  }

  /**
   * Ensure we have a valid access token, refreshing if necessary
   */
  private async ensureValidToken(): Promise<string> {
    if (this.config.tokenExpiresAt && this.config.refreshToken) {
      if (this.oauthFlow.isTokenExpired(this.config.tokenExpiresAt)) {
        console.debug('Access token expired, refreshing...');
        try {
          const newTokens = await this.oauthFlow.refreshAccessToken(this.config.refreshToken);

          this.config.accessToken = newTokens.accessToken;
          this.config.tokenExpiresAt = newTokens.expiresAt;

          if (this.config.onTokenRefresh) {
            await this.config.onTokenRefresh(newTokens);
          }

          new Notice('Google Drive token automatically refreshed');
        } catch (error) {
          console.error('Token refresh failed:', error);
          throw new GenerationErrorClass('OAUTH_ERROR', 'Token refresh failed. Please reconnect Google Drive.');
        }
      }
    }

    if (!this.config.accessToken) {
      throw new GenerationErrorClass('OAUTH_ERROR', 'Not connected to Google Drive. Please connect first.');
    }

    return this.config.accessToken;
  }

  /**
   * Make a file publicly accessible
   */
  private async makeFilePublic(fileId: string): Promise<void> {
    try {
      const accessToken = await this.ensureValidToken();

      await requestUrl({
        url: `${this.API_URL}/files/${fileId}/permissions`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone'
        })
      });
    } catch (error) {
      console.error('Failed to make file public:', error);
      // Don't throw - file is uploaded, just not public
    }
  }

  /**
   * Get file info from Google Drive
   */
  private async getFileInfo(fileId: string): Promise<{ webViewLink?: string; webContentLink?: string }> {
    try {
      const accessToken = await this.ensureValidToken();

      const response = await requestUrl({
        url: `${this.API_URL}/files/${fileId}?fields=webViewLink,webContentLink`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return response.json as { webViewLink?: string; webContentLink?: string };
    } catch (error) {
      return {};
    }
  }

  /**
   * Ensure folder exists, creating if necessary
   */
  private async ensureFolder(folderPath: string): Promise<string> {
    const parts = folderPath.split('/').filter(p => p.length > 0);
    let parentId = 'root';

    for (const folderName of parts) {
      const existingId = await this.findFolder(folderName, parentId);

      if (existingId) {
        parentId = existingId;
      } else {
        parentId = await this.createFolder(folderName, parentId);
      }
    }

    return parentId;
  }

  /**
   * Find a folder by name
   */
  private async findFolder(name: string, parentId: string): Promise<string | null> {
    try {
      const accessToken = await this.ensureValidToken();
      const query = `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;

      const response = await requestUrl({
        url: `${this.API_URL}/files?q=${encodeURIComponent(query)}&fields=files(id)`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.status === 200) {
        const data = response.json;
        if (data.files && data.files.length > 0) {
          return data.files[0].id;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Create a new folder
   */
  private async createFolder(name: string, parentId: string): Promise<string> {
    const accessToken = await this.ensureValidToken();

    const metadata = {
      name: name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    };

    const response = await requestUrl({
      url: `${this.API_URL}/files`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata)
    });

    if (response.status !== 200) {
      throw new GenerationErrorClass('UPLOAD_ERROR', `Folder creation failed: ${response.status}`);
    }

    return response.json.id;
  }

  /**
   * Test the connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const accessToken = await this.ensureValidToken();

      const response = await requestUrl({
        url: `${this.API_URL}/about?fields=user`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user info
   */
  async getUserInfo(): Promise<{ email: string; name: string } | null> {
    try {
      const accessToken = await this.ensureValidToken();

      const response = await requestUrl({
        url: `${this.API_URL}/about?fields=user`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.status === 200) {
        const data = response.json;
        return {
          email: data.user.emailAddress,
          name: data.user.displayName
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Disconnect from Google Drive
   */
  disconnect(): void {
    this.config.accessToken = '';
    this.config.refreshToken = '';
    this.config.tokenExpiresAt = 0;
  }

  /**
   * Upload a File object to Google Drive
   */
  async uploadFile(
    file: File,
    baseFolderPath: string,
    organizeFoldersByDate: boolean,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<DriveUploadResult> {
    try {
      // Stage 1: Preparing
      onProgress?.({
        stage: 'preparing',
        message: 'Preparing upload...',
        progress: 10
      });

      const accessToken = await this.ensureValidToken();

      // Get or create folder (with year/month structure if enabled)
      const folderId = await this.ensureFolderWithDateStructure(baseFolderPath, organizeFoldersByDate);

      // Check for duplicate filename and get unique name
      const uniqueFileName = await this.getUniqueFileName(folderId, file.name, accessToken);

      // Stage 2: Uploading
      onProgress?.({
        stage: 'uploading',
        message: 'Uploading to Google Drive...',
        progress: 30
      });

      // Read file as base64
      const base64Data = await this.fileToBase64(file);

      // Create file metadata
      const metadata = {
        name: uniqueFileName,
        mimeType: file.type || 'application/octet-stream',
        parents: [folderId]
      };

      // Upload using multipart
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const multipartBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${file.type || 'application/octet-stream'}\r\n` +
        'Content-Transfer-Encoding: base64\r\n\r\n' +
        base64Data +
        closeDelimiter;

      const uploadResponse = await requestUrl({
        url: `${this.UPLOAD_URL}/files?uploadType=multipart&fields=id,webViewLink,webContentLink,name,mimeType`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartBody
      });

      if (uploadResponse.status !== 200) {
        throw new GenerationErrorClass('UPLOAD_ERROR', `Upload failed: ${uploadResponse.status}`);
      }

      const fileData = uploadResponse.json;
      const fileId = fileData.id;

      // Stage 3: Setting permission
      onProgress?.({
        stage: 'setting-permission',
        message: 'Setting public access...',
        progress: 70
      });

      await this.makeFilePublic(fileId);

      // Get updated file info
      const fileInfo = await this.getFileInfo(fileId);

      // Stage 4: Complete
      onProgress?.({
        stage: 'complete',
        message: 'Upload complete!',
        progress: 100
      });

      return {
        fileId: fileId,
        webViewLink: fileInfo.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
        webContentLink: fileInfo.webContentLink || `https://drive.google.com/uc?export=view&id=${fileId}`,
        fileName: uniqueFileName,
        mimeType: file.type || 'application/octet-stream'
      };

    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      const message = error instanceof Error ? error.message : String(error);
      onProgress?.({
        stage: 'error',
        message: 'Upload failed',
        progress: 0,
        error: message
      });

      if (error instanceof GenerationErrorClass) {
        throw error;
      }
      throw new GenerationErrorClass('UPLOAD_ERROR', `Upload failed: ${message}`);
    }
  }

  /**
   * Convert File to base64 string
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}
