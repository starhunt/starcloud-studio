import { ContentCategory, SizeOption, FileTypeInfo } from './types';

/**
 * Supported file extensions by category
 */
export const FILE_EXTENSIONS: Record<ContentCategory, string[]> = {
  video: ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'],
  audio: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'],
  document: ['pdf'],
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']
};

/**
 * Size presets by content category
 */
export const SIZE_PRESETS: Record<ContentCategory, SizeOption[]> = {
  video: [
    { id: 'compact', name: 'Compact', width: '60%', height: '280px' },
    { id: 'medium', name: 'Medium', width: '80%', height: '400px', recommended: true },
    { id: 'large', name: 'Large', width: '100%', height: '500px' },
    { id: 'fullwidth', name: 'Full Width', width: '100%', height: '600px' }
  ],
  audio: [
    { id: 'slim', name: 'Slim', width: '100%', height: '100px', recommended: true },
    { id: 'standard', name: 'Standard', width: '100%', height: '120px' }
  ],
  document: [
    { id: 'compact', name: 'Compact', width: '70%', height: '400px' },
    { id: 'medium', name: 'Medium', width: '100%', height: '500px', recommended: true },
    { id: 'large', name: 'Large', width: '100%', height: '650px' },
    { id: 'fullscreen', name: 'Full Screen', width: '100%', height: '800px' }
  ],
  image: [
    { id: 'thumbnail', name: 'Thumbnail', width: '200px', height: 'auto' },
    { id: 'compact', name: 'Compact', width: '400px', height: 'auto' },
    { id: 'medium', name: 'Medium', width: '600px', height: 'auto', recommended: true },
    { id: 'large', name: 'Large', width: '100%', height: 'auto' }
  ]
};

/**
 * Get file type info from filename
 */
export function getFileTypeInfo(fileName: string): FileTypeInfo | null {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (!extension) return null;

  for (const [category, extensions] of Object.entries(FILE_EXTENSIONS)) {
    if (extensions.includes(extension)) {
      return {
        category: category as ContentCategory,
        extension,
        mimeType: getMimeType(extension)
      };
    }
  }
  return null;
}

/**
 * Check if file extension is supported
 */
export function isFileSupported(fileName: string): boolean {
  return getFileTypeInfo(fileName) !== null;
}

/**
 * Get size presets for a content category
 */
export function getSizePresets(category: ContentCategory): SizeOption[] {
  return SIZE_PRESETS[category] || SIZE_PRESETS.image;
}

/**
 * Get the recommended size for a category
 */
export function getRecommendedSize(category: ContentCategory): SizeOption {
  const presets = getSizePresets(category);
  return presets.find(p => p.recommended) || presets[0];
}

/**
 * Get size option by ID
 */
export function getSizeById(category: ContentCategory, sizeId: string): SizeOption | null {
  const presets = getSizePresets(category);
  return presets.find(p => p.id === sizeId) || null;
}

/**
 * Get MIME type from extension
 */
function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    // Video
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    m4v: 'video/x-m4v',
    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    flac: 'audio/flac',
    aac: 'audio/aac',
    // Document
    pdf: 'application/pdf',
    // Image
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp'
  };
  return mimeTypes[extension] || 'application/octet-stream';
}

/**
 * Get all supported extensions as a flat array
 */
export function getAllSupportedExtensions(): string[] {
  return Object.values(FILE_EXTENSIONS).flat();
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
