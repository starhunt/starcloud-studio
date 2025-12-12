import { App, TFile, TFolder, normalizePath } from 'obsidian';
import { GenerationError, GenerationErrorClass } from '../types';

export class FileService {
  constructor(private app: App) {}

  /**
   * Save image to the vault and return the path
   */
  async saveImage(
    imageData: string,
    mimeType: string,
    noteFile: TFile,
    attachmentFolder: string
  ): Promise<string> {
    try {
      // Determine file extension from mime type
      const extension = this.getExtensionFromMimeType(mimeType);

      // Generate unique filename
      const timestamp = Date.now();
      const baseName = noteFile.basename.replace(/[^a-zA-Z0-9가-힣]/g, '-');
      const fileName = `${baseName}-poster-${timestamp}.${extension}`;

      // Ensure attachment folder exists
      await this.ensureFolderExists(attachmentFolder);

      // Full path for the image
      const imagePath = normalizePath(`${attachmentFolder}/${fileName}`);

      // Convert base64 to binary
      const binaryData = this.base64ToArrayBuffer(imageData);

      // Save file
      await this.app.vault.createBinary(imagePath, binaryData);

      return imagePath;
    } catch (error) {
      throw this.createError('SAVE_ERROR', `Failed to save image: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Embed image at the top of the note
   */
  async embedImageInNote(noteFile: TFile, imagePath: string): Promise<void> {
    try {
      const content = await this.app.vault.read(noteFile);

      // Create embed syntax
      const embedSyntax = `![[${imagePath}]]\n\n`;

      // Check if note has frontmatter
      const frontmatterMatch = content.match(/^---\n[\s\S]*?\n---\n/);

      let newContent: string;

      if (frontmatterMatch) {
        // Insert after frontmatter
        const frontmatter = frontmatterMatch[0];
        const restContent = content.slice(frontmatter.length);

        // Check if already has a poster embed (to replace it)
        const existingEmbed = restContent.match(/^!\[\[.*-poster-\d+\.(png|jpg|jpeg|webp)\]\]\n\n/);

        if (existingEmbed) {
          // Replace existing embed
          newContent = frontmatter + embedSyntax + restContent.slice(existingEmbed[0].length);
        } else {
          // Add new embed
          newContent = frontmatter + embedSyntax + restContent;
        }
      } else {
        // Check if already has a poster embed at the start
        const existingEmbed = content.match(/^!\[\[.*-poster-\d+\.(png|jpg|jpeg|webp)\]\]\n\n/);

        if (existingEmbed) {
          // Replace existing embed
          newContent = embedSyntax + content.slice(existingEmbed[0].length);
        } else {
          // Add at the beginning
          newContent = embedSyntax + content;
        }
      }

      await this.app.vault.modify(noteFile, newContent);
    } catch (error) {
      throw this.createError('SAVE_ERROR', `Failed to embed image: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Ensure a folder exists, creating it if necessary
   */
  private async ensureFolderExists(folderPath: string): Promise<void> {
    const normalizedPath = normalizePath(folderPath);
    const folder = this.app.vault.getAbstractFileByPath(normalizedPath);

    if (!folder) {
      await this.app.vault.createFolder(normalizedPath);
    } else if (!(folder instanceof TFolder)) {
      throw this.createError('SAVE_ERROR', `${folderPath} exists but is not a folder`);
    }
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif'
    };
    return mimeMap[mimeType] || 'png';
  }

  /**
   * Save HTML slide to vault with year/month directory structure
   * Path: {slidesRootPath}/{year}/{month}/yyyyMMddHHmmss_title.html
   */
  async saveSlide(
    htmlContent: string,
    noteFile: TFile,
    slidesRootPath: string,
    title: string
  ): Promise<string> {
    try {
      const now = new Date();
      const year = now.getFullYear().toString();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const timestamp = this.formatTimestamp(now);

      // Convert title to safe filename
      const safeTitle = this.sanitizeTitleForFilename(title);
      const fileName = `${timestamp}_${safeTitle}.html`;

      // Build path: {root}/{year}/{month}/filename.html
      const folderPath = normalizePath(`${slidesRootPath}/${year}/${month}`);

      // Ensure folder structure exists (recursive)
      await this.ensureFolderExistsRecursive(folderPath);

      // Full path for the slide
      const slidePath = normalizePath(`${folderPath}/${fileName}`);

      // Save HTML file
      await this.app.vault.create(slidePath, htmlContent);

      return slidePath;
    } catch (error) {
      throw this.createError('SAVE_ERROR', `Failed to save slide: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Embed slide in note using iframe
   */
  async embedSlideInNote(noteFile: TFile, slidePath: string): Promise<void> {
    try {
      const content = await this.app.vault.read(noteFile);

      // Create iframe embed syntax
      // Use app://local/ protocol for Obsidian to load local files
      const vaultPath = (this.app.vault.adapter as any).basePath || '';
      const fullPath = `${vaultPath}/${slidePath}`.replace(/\\/g, '/');
      const embedSyntax = `<iframe src="app://local/${encodeURI(fullPath)}" width="100%" height="800px" style="border: 1px solid var(--background-modifier-border); border-radius: 8px;"></iframe>\n\n`;

      // Check if note has frontmatter
      const frontmatterMatch = content.match(/^---\n[\s\S]*?\n---\n/);

      let newContent: string;

      if (frontmatterMatch) {
        // Insert after frontmatter
        const frontmatter = frontmatterMatch[0];
        const restContent = content.slice(frontmatter.length);

        // Check for existing slide embed (replace it)
        const existingEmbed = restContent.match(/^<iframe src="[^"]*\.html"[^>]*><\/iframe>\n\n/);

        if (existingEmbed) {
          newContent = frontmatter + embedSyntax + restContent.slice(existingEmbed[0].length);
        } else {
          newContent = frontmatter + embedSyntax + restContent;
        }
      } else {
        const existingEmbed = content.match(/^<iframe src="[^"]*\.html"[^>]*><\/iframe>\n\n/);

        if (existingEmbed) {
          newContent = embedSyntax + content.slice(existingEmbed[0].length);
        } else {
          newContent = embedSyntax + content;
        }
      }

      await this.app.vault.modify(noteFile, newContent);
    } catch (error) {
      throw this.createError('SAVE_ERROR', `Failed to embed slide: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Format date to yyyyMMddHHmmss
   */
  private formatTimestamp(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  /**
   * Sanitize title for use in filename
   */
  private sanitizeTitleForFilename(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s가-힣\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50)
      .replace(/^-|-$/g, '')
      || 'untitled';
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

  private createError(type: GenerationError['type'], message: string): GenerationErrorClass {
    return new GenerationErrorClass(type, message, false);
  }
}
