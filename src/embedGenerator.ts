import { ContentCategory, SizeOption, DriveUploadResult } from './types';
import { getFileTypeInfo } from './sizePresets';

/**
 * Generate embed code for Google Drive files
 */
export class EmbedGenerator {
  /**
   * Generate embed code based on file type
   */
  generateEmbed(
    uploadResult: DriveUploadResult,
    size: SizeOption,
    showTitle: boolean
  ): string {
    const fileInfo = getFileTypeInfo(uploadResult.fileName);
    const category = fileInfo?.category || 'image';

    let embedCode: string;

    switch (category) {
      case 'video':
        embedCode = this.generateVideoEmbed(uploadResult, size);
        break;
      case 'audio':
        embedCode = this.generateAudioEmbed(uploadResult, size);
        break;
      case 'document':
        embedCode = this.generateDocumentEmbed(uploadResult, size);
        break;
      case 'image':
      default:
        embedCode = this.generateImageEmbed(uploadResult, size);
        break;
    }

    if (showTitle) {
      return `**${uploadResult.fileName}**\n\n${embedCode}`;
    }

    return embedCode;
  }

  /**
   * Generate video embed (iframe)
   */
  private generateVideoEmbed(uploadResult: DriveUploadResult, size: SizeOption): string {
    const previewUrl = `https://drive.google.com/file/d/${uploadResult.fileId}/preview`;

    return `<div style="width: ${size.width}; margin: 0 auto;">
<iframe
    src="${previewUrl}"
    width="100%"
    height="${size.height}"
    frameborder="0"
    allow="autoplay; encrypted-media"
    allowfullscreen
    style="border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
</iframe>
</div>`;
  }

  /**
   * Generate audio embed (iframe)
   */
  private generateAudioEmbed(uploadResult: DriveUploadResult, size: SizeOption): string {
    const previewUrl = `https://drive.google.com/file/d/${uploadResult.fileId}/preview`;

    return `<div style="width: ${size.width}; margin: 0 auto;">
<iframe
    src="${previewUrl}"
    width="100%"
    height="${size.height}"
    frameborder="0"
    style="border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
</iframe>
</div>`;
  }

  /**
   * Generate document (PDF) embed (iframe)
   */
  private generateDocumentEmbed(uploadResult: DriveUploadResult, size: SizeOption): string {
    const previewUrl = `https://drive.google.com/file/d/${uploadResult.fileId}/preview`;

    return `<div style="width: ${size.width}; margin: 0 auto;">
<iframe
    src="${previewUrl}"
    width="100%"
    height="${size.height}"
    frameborder="0"
    style="border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
</iframe>
</div>`;
  }

  /**
   * Generate image embed (img tag with link)
   */
  private generateImageEmbed(uploadResult: DriveUploadResult, size: SizeOption): string {
    const thumbnailUrl = `https://drive.google.com/thumbnail?id=${uploadResult.fileId}&sz=w1000`;
    const viewUrl = uploadResult.webViewLink;

    const heightStyle = size.height === 'auto' ? '' : `height: ${size.height};`;

    return `<div style="width: ${size.width}; margin: 0 auto;">
<a href="${viewUrl}" target="_blank">
<img
    src="${thumbnailUrl}"
    width="100%"
    style="border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); object-fit: contain; ${heightStyle}"
    alt="${uploadResult.fileName}">
</a>
</div>`;
  }

  /**
   * Generate simple markdown link
   */
  generateMarkdownLink(uploadResult: DriveUploadResult): string {
    return `[${uploadResult.fileName}](${uploadResult.webViewLink})`;
  }
}
