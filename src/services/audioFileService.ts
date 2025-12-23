import { App, TFile, TFolder, normalizePath, Editor } from 'obsidian';
import { GenerationError, GenerationErrorClass } from '../types';

export class AudioFileService {
  constructor(private app: App) {}

  /**
   * Save audio to the vault and return the path
   */
  async saveAudio(
    audioData: ArrayBuffer,
    mimeType: string,
    noteFile: TFile,
    audioFolder: string
  ): Promise<string> {
    try {
      // Determine file extension from mime type
      const extension = this.getExtensionFromMimeType(mimeType);

      // Generate unique filename
      const timestamp = Date.now();
      const baseName = noteFile.basename.replace(/[^a-zA-Z0-9가-힣]/g, '-');
      const fileName = `${baseName}-speech-${timestamp}.${extension}`;

      // Create date-based folder structure (year/month)
      const datePath = this.getDateBasedPath(audioFolder);

      // Ensure audio folder exists
      await this.ensureFolderExistsRecursive(datePath);

      // Full path for the audio file
      const audioPath = normalizePath(`${datePath}/${fileName}`);

      // Save file
      await this.app.vault.createBinary(audioPath, audioData);

      return audioPath;
    } catch (error) {
      throw this.createError('SAVE_ERROR', `Failed to save audio: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get date-based folder path (baseFolder/YYYY/MM)
   */
  private getDateBasedPath(baseFolder: string): string {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return normalizePath(`${baseFolder}/${year}/${month}`);
  }

  /**
   * Embed audio at cursor position or at the top of the note
   */
  async embedAudioInNote(
    noteFile: TFile,
    audioPath: string,
    editor?: Editor
  ): Promise<void> {
    try {
      // Create embed syntax - Obsidian natively supports audio embeds
      const embedSyntax = `![[${audioPath}]]\n\n`;

      if (editor) {
        // Insert at cursor position
        const cursor = editor.getCursor();
        editor.replaceRange(embedSyntax, cursor);
      } else {
        // Insert at the top of the note (after frontmatter if exists)
        const content = await this.app.vault.read(noteFile);
        const frontmatterMatch = content.match(/^---\n[\s\S]*?\n---\n/);

        let newContent: string;

        if (frontmatterMatch) {
          // Insert after frontmatter
          const frontmatter = frontmatterMatch[0];
          const restContent = content.slice(frontmatter.length);

          // Check if already has a speech embed (to avoid duplicates)
          const existingEmbed = restContent.match(/^!\[\[.*-speech-\d+\.(mp3|wav|ogg|m4a)\]\]\n\n/);

          if (existingEmbed) {
            // Replace existing embed
            newContent = frontmatter + embedSyntax + restContent.slice(existingEmbed[0].length);
          } else {
            // Add new embed
            newContent = frontmatter + embedSyntax + restContent;
          }
        } else {
          // Check if already has a speech embed at the start
          const existingEmbed = content.match(/^!\[\[.*-speech-\d+\.(mp3|wav|ogg|m4a)\]\]\n\n/);

          if (existingEmbed) {
            // Replace existing embed
            newContent = embedSyntax + content.slice(existingEmbed[0].length);
          } else {
            // Add at the beginning
            newContent = embedSyntax + content;
          }
        }

        await this.app.vault.modify(noteFile, newContent);
      }
    } catch (error) {
      throw this.createError('SAVE_ERROR', `Failed to embed audio: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Embed audio with custom HTML5 audio player (for Drive links)
   */
  async embedDriveAudioInNote(
    noteFile: TFile,
    driveViewLink: string,
    driveFileId: string,
    title: string,
    editor?: Editor
  ): Promise<void> {
    try {
      // Create iframe embed for Google Drive audio
      const embedSyntax = `<div style="width: 100%; max-width: 600px; margin: 16px auto;">
<p style="margin: 0 0 8px 0; font-weight: bold;">${title}</p>
<iframe
    src="https://drive.google.com/file/d/${driveFileId}/preview"
    width="100%"
    height="80"
    frameborder="0"
    allow="autoplay"
    style="border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
</iframe>
<p style="margin: 8px 0 0 0; font-size: 12px;"><a href="${driveViewLink}" target="_blank">Open in Google Drive</a></p>
</div>\n\n`;

      if (editor) {
        // Insert at cursor position
        const cursor = editor.getCursor();
        editor.replaceRange(embedSyntax, cursor);
      } else {
        // Insert at the top of the note (after frontmatter if exists)
        const content = await this.app.vault.read(noteFile);
        const frontmatterMatch = content.match(/^---\n[\s\S]*?\n---\n/);

        let newContent: string;
        if (frontmatterMatch) {
          const frontmatter = frontmatterMatch[0];
          const restContent = content.slice(frontmatter.length);
          newContent = frontmatter + embedSyntax + restContent;
        } else {
          newContent = embedSyntax + content;
        }

        await this.app.vault.modify(noteFile, newContent);
      }
    } catch (error) {
      throw this.createError('SAVE_ERROR', `Failed to embed Drive audio: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/wav': 'wav',
      'audio/wave': 'wav',
      'audio/x-wav': 'wav',
      'audio/ogg': 'ogg',
      'audio/mp4': 'm4a',
      'audio/m4a': 'm4a',
      'audio/aac': 'aac',
      'audio/flac': 'flac'
    };
    return mimeMap[mimeType] || 'wav';
  }

  /**
   * Ensure folder exists recursively (creates parent folders)
   */
  private async ensureFolderExistsRecursive(folderPath: string): Promise<void> {
    const normalizedPath = normalizePath(folderPath);
    const parts = normalizedPath.split('/');

    let currentPath = '';
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const folder = this.app.vault.getAbstractFileByPath(currentPath);

      if (!folder) {
        await this.app.vault.createFolder(currentPath);
      } else if (!(folder instanceof TFolder)) {
        throw this.createError('SAVE_ERROR', `${currentPath} exists but is not a folder`);
      }
    }
  }

  /**
   * Get the absolute path to a file in the vault
   */
  getAbsolutePath(relativePath: string): string {
    const adapter = this.app.vault.adapter as { basePath?: string };
    const vaultPath = adapter.basePath || '';
    return `${vaultPath}/${relativePath}`.replace(/\\/g, '/');
  }

  /**
   * Format audio duration for display (seconds to mm:ss)
   */
  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private createError(type: GenerationError['type'], message: string): GenerationErrorClass {
    return new GenerationErrorClass(type, message, false);
  }
}
