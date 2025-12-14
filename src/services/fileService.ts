import { App, TFile, TFolder, normalizePath, Editor } from 'obsidian';
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
   * Embed slide in note at cursor position using iframe with GitHub Pages URL
   */
  async embedSlideInNote(
    noteFile: TFile,
    slidePath: string,
    githubPagesUrl?: string,
    editor?: Editor
  ): Promise<void> {
    try {
      let embedSyntax: string;

      if (githubPagesUrl) {
        // Use div-wrapped iframe for GitHub Pages URL
        embedSyntax = `<div style="width: 100%; margin: 0 auto;">
<iframe
    src="${githubPagesUrl}"
    width="100%"
    height="600px"
    frameborder="0"
    style="border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
</iframe>
</div>\n\n`;
      } else {
        // Fallback: Create a link to open the file
        embedSyntax = `> [!info] Slide Generated\n> [[${slidePath}|Open Slide in Browser]]\n\n`;
      }

      if (editor) {
        // Insert at cursor position
        const cursor = editor.getCursor();
        editor.replaceRange(embedSyntax, cursor);
      } else {
        // Fallback: Insert at beginning of note (after frontmatter if exists)
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
      throw this.createError('SAVE_ERROR', `Failed to embed slide: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get the absolute path to a file in the vault
   */
  getAbsolutePath(relativePath: string): string {
    const vaultPath = (this.app.vault.adapter as any).basePath || '';
    return `${vaultPath}/${relativePath}`.replace(/\\/g, '/');
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
   * English-only, 20-50 characters for better identification
   */
  private sanitizeTitleForFilename(title: string): string {
    // Extract only English letters, numbers, and spaces
    const englishOnly = title
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .trim();

    // If no English characters found, generate a generic name
    if (!englishOnly) {
      return 'slide-' + Date.now().toString(36).substring(0, 8);
    }

    return englishOnly
      .toLowerCase()
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
