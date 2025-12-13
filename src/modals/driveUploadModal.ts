import { App, Modal, Notice } from 'obsidian';
import { DriveUploadService } from '../services/driveUploadService';
import { EmbedGenerator } from '../embedGenerator';
import { ContentCategory, SizeOption, DriveUploadResult, UploadProgress } from '../types';
import { getFileTypeInfo, getSizePresets, getRecommendedSize, isFileSupported, formatFileSize, getAllSupportedExtensions } from '../sizePresets';

export interface DriveUploadModalResult {
  embedCode: string;
  uploadResult: DriveUploadResult;
}

export class DriveUploadModal extends Modal {
  private driveService: DriveUploadService;
  private driveFolder: string;
  private organizeFoldersByDate: boolean;
  private showTitleByDefault: boolean;
  private onComplete: (result: DriveUploadModalResult) => void;

  private selectedFile: File | null = null;
  private selectedSize: SizeOption | null = null;
  private showTitle: boolean;
  private fileCategory: ContentCategory | null = null;

  private fileInfoContainer: HTMLElement | null = null;
  private sizeOptionsContainer: HTMLElement | null = null;
  private uploadButtonContainer: HTMLElement | null = null;
  private progressContainer: HTMLElement | null = null;

  constructor(
    app: App,
    driveService: DriveUploadService,
    driveFolder: string,
    organizeFoldersByDate: boolean,
    showTitleByDefault: boolean,
    onComplete: (result: DriveUploadModalResult) => void
  ) {
    super(app);
    this.driveService = driveService;
    this.driveFolder = driveFolder;
    this.organizeFoldersByDate = organizeFoldersByDate;
    this.showTitleByDefault = showTitleByDefault;
    this.showTitle = showTitleByDefault;
    this.onComplete = onComplete;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('nanobanana-drive-upload-modal');

    const header = contentEl.createDiv({ cls: 'nanobanana-modal-header' });
    header.createEl('span', { text: '📁', cls: 'nanobanana-modal-icon' });
    header.createEl('h2', { text: 'Drive Embedder', cls: 'nanobanana-modal-title' });

    contentEl.createEl('p', {
      text: 'Upload files to Google Drive and generate embed code.',
      cls: 'nanobanana-modal-desc'
    });

    this.createFileDropZone(contentEl);
    this.fileInfoContainer = contentEl.createDiv({ cls: 'nanobanana-file-info nanobanana-hidden' });
    this.sizeOptionsContainer = contentEl.createDiv({ cls: 'nanobanana-size-options nanobanana-hidden' });
    this.createTitleToggle(contentEl);
    this.uploadButtonContainer = contentEl.createDiv({ cls: 'nanobanana-upload-button-container nanobanana-hidden' });
    this.createUploadButton();
    this.progressContainer = contentEl.createDiv({ cls: 'nanobanana-progress-container nanobanana-hidden' });
    this.createSupportedFormatsSection(contentEl);
  }

  private createFileDropZone(container: HTMLElement) {
    const dropZone = container.createDiv({ cls: 'nanobanana-drop-zone' });
    const dropContent = dropZone.createDiv({ cls: 'nanobanana-drop-content' });
    dropContent.createEl('span', { text: '📂', cls: 'nanobanana-drop-icon' });
    dropContent.createEl('p', { text: 'Drag files here or' });

    const selectBtn = dropContent.createEl('button', {
      text: 'Select File',
      cls: 'nanobanana-btn nanobanana-btn-primary'
    });

    const fileInput = dropContent.createEl('input', { type: 'file' }) as HTMLInputElement;
    fileInput.accept = getAllSupportedExtensions().map(ext => '.' + ext).join(',');
    fileInput.style.display = 'none';

    selectBtn.onclick = () => fileInput.click();
    fileInput.onchange = () => {
      if (fileInput.files && fileInput.files[0]) {
        this.processFile(fileInput.files[0]);
      }
    };

    dropZone.ondragover = (e) => {
      e.preventDefault();
      dropZone.addClass('nanobanana-drop-zone-hover');
    };
    dropZone.ondragleave = () => dropZone.removeClass('nanobanana-drop-zone-hover');
    dropZone.ondrop = (e) => {
      e.preventDefault();
      dropZone.removeClass('nanobanana-drop-zone-hover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        this.processFile(e.dataTransfer.files[0]);
      }
    };
  }

  private processFile(file: File) {
    if (!isFileSupported(file.name)) {
      new Notice('Unsupported file type: ' + file.name);
      return;
    }
    this.selectedFile = file;
    const fileInfo = getFileTypeInfo(file.name);
    this.fileCategory = fileInfo ? fileInfo.category : 'image';
    this.updateFileInfo(file);
    this.updateSizeOptions();
    if (this.uploadButtonContainer) this.uploadButtonContainer.removeClass('nanobanana-hidden');
  }

  private updateFileInfo(file: File) {
    if (!this.fileInfoContainer) return;
    this.fileInfoContainer.empty();
    this.fileInfoContainer.removeClass('nanobanana-hidden');

    const infoDiv = this.fileInfoContainer.createDiv({ cls: 'nanobanana-selected-file' });
    const icons: Record<ContentCategory, string> = { video: '🎬', audio: '🎵', document: '📄', image: '🖼️' };
    const icon = this.fileCategory ? icons[this.fileCategory] : '📄';

    infoDiv.createEl('span', { text: icon, cls: 'nanobanana-file-icon' });
    const details = infoDiv.createDiv({ cls: 'nanobanana-file-details' });
    details.createEl('span', { text: file.name, cls: 'nanobanana-file-name' });
    const categoryText = this.fileCategory ? this.fileCategory.toUpperCase() : 'FILE';
    details.createEl('span', { text: categoryText + ' • ' + formatFileSize(file.size), cls: 'nanobanana-file-meta' });

    const clearBtn = infoDiv.createEl('button', { text: '✕', cls: 'nanobanana-btn-clear' });
    clearBtn.onclick = () => this.clearSelection();
  }

  private updateSizeOptions() {
    if (!this.sizeOptionsContainer || !this.fileCategory) return;
    this.sizeOptionsContainer.empty();
    this.sizeOptionsContainer.removeClass('nanobanana-hidden');
    this.sizeOptionsContainer.createEl('label', { text: 'Embed Size', cls: 'nanobanana-label' });

    const presets = getSizePresets(this.fileCategory);
    this.selectedSize = getRecommendedSize(this.fileCategory);
    const optionsGrid = this.sizeOptionsContainer.createDiv({ cls: 'nanobanana-size-grid' });

    presets.forEach(preset => {
      const isSelected = this.selectedSize && this.selectedSize.id === preset.id;
      const option = optionsGrid.createDiv({
        cls: 'nanobanana-size-option' + (preset.recommended ? ' nanobanana-recommended' : '') + (isSelected ? ' nanobanana-selected' : '')
      });
      option.createEl('span', { text: preset.name, cls: 'nanobanana-size-name' });
      option.createEl('span', { text: preset.width + ' × ' + preset.height, cls: 'nanobanana-size-dims' });
      if (preset.recommended) option.createEl('span', { text: 'Recommended', cls: 'nanobanana-badge' });

      option.onclick = () => {
        this.selectedSize = preset;
        optionsGrid.querySelectorAll('.nanobanana-size-option').forEach(el => el.removeClass('nanobanana-selected'));
        option.addClass('nanobanana-selected');
      };
    });
  }

  private createTitleToggle(container: HTMLElement) {
    const toggleContainer = container.createDiv({ cls: 'nanobanana-title-toggle' });
    const label = toggleContainer.createEl('label', { cls: 'nanobanana-toggle-label' });
    label.createEl('span', { text: 'Show filename' });
    label.createEl('span', { text: 'Display filename above the embed', cls: 'nanobanana-toggle-desc' });
    const toggle = toggleContainer.createEl('input', { type: 'checkbox' }) as HTMLInputElement;
    toggle.checked = this.showTitle;
    toggle.onchange = () => { this.showTitle = toggle.checked; };
  }

  private createUploadButton() {
    if (!this.uploadButtonContainer) return;
    const buttonRow = this.uploadButtonContainer.createDiv({ cls: 'nanobanana-button-row' });
    const cancelBtn = buttonRow.createEl('button', { text: 'Cancel', cls: 'nanobanana-btn nanobanana-btn-cancel' });
    cancelBtn.onclick = () => this.close();
    const uploadBtn = buttonRow.createEl('button', { text: '☁️ Upload & Embed', cls: 'nanobanana-btn nanobanana-btn-primary nanobanana-btn-upload' });
    uploadBtn.onclick = () => this.handleUpload();
  }

  private async handleUpload() {
    if (!this.selectedFile || !this.selectedSize) {
      new Notice('Please select a file and size');
      return;
    }
    this.showProgressUI();

    try {
      const uploadResult = await this.driveService.uploadFile(
        this.selectedFile,
        this.driveFolder,
        this.organizeFoldersByDate,
        (progress) => this.updateProgressUI(progress)
      );

      const embedGenerator = new EmbedGenerator();
      const embedCode = embedGenerator.generateEmbed(uploadResult, this.selectedSize, this.showTitle);
      this.onComplete({ embedCode, uploadResult });
      this.close();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice('Upload failed: ' + message);
      this.hideProgressUI();
    }
  }

  private showProgressUI() {
    if (!this.progressContainer) return;
    this.progressContainer.empty();
    this.progressContainer.removeClass('nanobanana-hidden');
    if (this.uploadButtonContainer) this.uploadButtonContainer.addClass('nanobanana-hidden');
    this.progressContainer.createDiv({ cls: 'nanobanana-progress-spinner' });
    this.progressContainer.createEl('p', { text: 'Preparing upload...', cls: 'nanobanana-progress-message' });
    const progressBar = this.progressContainer.createDiv({ cls: 'nanobanana-progress-bar' });
    progressBar.createDiv({ cls: 'nanobanana-progress-fill' });
  }

  private updateProgressUI(progress: UploadProgress) {
    if (!this.progressContainer) return;
    const message = this.progressContainer.querySelector('.nanobanana-progress-message');
    if (message) message.textContent = progress.message;
    const fill = this.progressContainer.querySelector('.nanobanana-progress-fill') as HTMLElement;
    if (fill) fill.style.width = progress.progress + '%';
  }

  private hideProgressUI() {
    if (this.progressContainer) this.progressContainer.addClass('nanobanana-hidden');
    if (this.uploadButtonContainer) this.uploadButtonContainer.removeClass('nanobanana-hidden');
  }

  private clearSelection() {
    this.selectedFile = null;
    this.selectedSize = null;
    this.fileCategory = null;
    if (this.fileInfoContainer) this.fileInfoContainer.addClass('nanobanana-hidden');
    if (this.sizeOptionsContainer) this.sizeOptionsContainer.addClass('nanobanana-hidden');
    if (this.uploadButtonContainer) this.uploadButtonContainer.addClass('nanobanana-hidden');
  }

  private createSupportedFormatsSection(container: HTMLElement) {
    const section = container.createEl('details', { cls: 'nanobanana-formats-section' });
    section.createEl('summary', { text: '▶ Supported File Formats' });
    const content = section.createDiv({ cls: 'nanobanana-formats-content' });

    const categories: { name: string; category: ContentCategory; icon: string }[] = [
      { name: 'Video', category: 'video', icon: '🎬' },
      { name: 'Audio', category: 'audio', icon: '🎵' },
      { name: 'Document', category: 'document', icon: '📄' },
      { name: 'Image', category: 'image', icon: '🖼️' }
    ];

    categories.forEach(({ name, category, icon }) => {
      const row = content.createDiv({ cls: 'nanobanana-format-row' });
      row.createEl('span', { text: icon + ' ' + name + ':', cls: 'nanobanana-format-label' });
      const exts = getAllSupportedExtensions().filter(ext => {
        const info = getFileTypeInfo('test.' + ext);
        return info && info.category === category;
      }).map(ext => '.' + ext).join(', ');
      row.createEl('span', { text: exts, cls: 'nanobanana-format-exts' });
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
