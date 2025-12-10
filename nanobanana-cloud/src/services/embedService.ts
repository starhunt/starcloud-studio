/**
 * Embed Service
 * Generates embed code for Google Drive images and inserts into notes
 */
import { Editor, TFile, App } from 'obsidian';
import {
  DriveUploadResult,
  EmbedOptions,
  EmbedPosition,
  EmbedSize,
  EMBED_SIZES,
  InputSource
} from '../types';

export class EmbedService {
  constructor(private app: App) {}

  /**
   * Embed Google Drive image in note at the specified position
   */
  async embedDriveImageInNote(
    editor: Editor,
    noteFile: TFile,
    uploadResult: DriveUploadResult,
    options: EmbedOptions,
    position: EmbedPosition
  ): Promise<void> {
    // Generate embed HTML
    const embedCode = this.generateImageEmbed(uploadResult, options.size, options.showTitle);

    // Insert at the appropriate position
    if (position.type === 'cursor') {
      // Insert at cursor position (full note mode)
      const cursor = editor.getCursor();
      const lineContent = editor.getLine(cursor.line);

      // Insert on a new line after current line if current line has content
      if (lineContent.trim()) {
        editor.replaceRange('\n\n' + embedCode + '\n', { line: cursor.line, ch: lineContent.length });
      } else {
        editor.replaceRange(embedCode + '\n\n', cursor);
      }
    } else {
      // Insert after selection (selection mode)
      const selectionEnd = position.line;
      const lineContent = editor.getLine(selectionEnd);

      // Insert on a new line after the selection ends
      editor.replaceRange('\n\n' + embedCode + '\n', { line: selectionEnd, ch: lineContent.length });
    }
  }

  /**
   * Generate HTML embed code for Google Drive image
   */
  generateImageEmbed(
    uploadResult: DriveUploadResult,
    size: EmbedSize,
    showTitle: boolean
  ): string {
    const sizeConfig = EMBED_SIZES[size];
    const thumbnailUrl = `https://drive.google.com/thumbnail?id=${uploadResult.fileId}&sz=w1000`;
    const viewUrl = uploadResult.webViewLink;

    let embedCode = '';

    // Add title if enabled
    if (showTitle) {
      embedCode += `**🎨 ${uploadResult.fileName}**\n\n`;
    }

    // Generate responsive image embed
    embedCode += `<div style="width: ${sizeConfig.width}; margin: 0 auto; text-align: center;">
<a href="${viewUrl}" target="_blank">
<img
    src="${thumbnailUrl}"
    alt="Knowledge Poster"
    style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); cursor: pointer;"
/>
</a>
</div>`;

    return embedCode;
  }

  /**
   * Generate alternative embed formats
   */
  generateAllFormats(
    uploadResult: DriveUploadResult,
    options: EmbedOptions
  ): {
    htmlEmbed: string;
    markdownLink: string;
    directLink: string;
    iframeEmbed: string;
  } {
    const thumbnailUrl = `https://drive.google.com/thumbnail?id=${uploadResult.fileId}&sz=w1000`;

    return {
      htmlEmbed: this.generateImageEmbed(uploadResult, options.size, options.showTitle),
      markdownLink: `[${uploadResult.fileName}](${uploadResult.webViewLink})`,
      directLink: uploadResult.webViewLink,
      iframeEmbed: this.generateIframeEmbed(uploadResult, options.size)
    };
  }

  /**
   * Generate iframe embed (alternative for preview-style embedding)
   */
  private generateIframeEmbed(uploadResult: DriveUploadResult, size: EmbedSize): string {
    const sizeConfig = EMBED_SIZES[size];
    const previewUrl = `https://drive.google.com/file/d/${uploadResult.fileId}/preview`;

    return `<div style="width: ${sizeConfig.width}; margin: 0 auto;">
<iframe
    src="${previewUrl}"
    width="100%"
    height="${sizeConfig.height}"
    frameborder="0"
    allowfullscreen
    style="border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
</iframe>
</div>`;
  }

  /**
   * Determine embed position based on input source and editor state
   */
  getEmbedPosition(editor: Editor, inputSource: InputSource): EmbedPosition {
    if (inputSource === 'selection') {
      // Get the end of selection
      const to = editor.getCursor('to');
      return {
        type: 'afterSelection',
        line: to.line
      };
    } else {
      // Get current cursor position
      const cursor = editor.getCursor();
      return {
        type: 'cursor',
        line: cursor.line
      };
    }
  }

  /**
   * Get selected text from editor
   */
  getSelectedText(editor: Editor): string | null {
    const selection = editor.getSelection();
    return selection && selection.trim() ? selection : null;
  }

  /**
   * Check if there's a valid selection in the editor
   */
  hasSelection(editor: Editor): boolean {
    const selection = editor.getSelection();
    return !!(selection && selection.trim());
  }
}
