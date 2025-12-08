import { App, Modal, Setting } from 'obsidian';
import { ImageStyle, ImageSize, IMAGE_STYLES } from './types';

export interface QuickOptionsResult {
  confirmed: boolean;
  imageStyle: ImageStyle;
  imageSize: ImageSize;
}

export class QuickOptionsModal extends Modal {
  private selectedStyle: ImageStyle;
  private selectedSize: ImageSize;
  private onSubmit: (result: QuickOptionsResult) => void;

  constructor(
    app: App,
    currentStyle: ImageStyle,
    currentSize: ImageSize,
    onSubmit: (result: QuickOptionsResult) => void
  ) {
    super(app);
    this.selectedStyle = currentStyle;
    this.selectedSize = currentSize;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('nanobanana-quick-options');

    // Title
    contentEl.createEl('h2', {
      text: '🎨 Quick Options',
      cls: 'nanobanana-modal-title'
    });

    contentEl.createEl('p', {
      text: 'Choose image style and resolution for this generation.',
      cls: 'nanobanana-modal-desc'
    });

    // Image Style dropdown
    new Setting(contentEl)
      .setName('Image Style')
      .setDesc('Select the visual style for your Knowledge Poster')
      .addDropdown(dropdown => dropdown
        .addOptions({
          'infographic': '📊 Infographic - Charts & Visual Hierarchy',
          'poster': '🎨 Poster - Bold Typography & Imagery',
          'diagram': '📐 Diagram - Technical Connections',
          'mindmap': '🧠 Mind Map - Central Concept & Branches',
          'timeline': '📅 Timeline - Progression & Milestones'
        })
        .setValue(this.selectedStyle)
        .onChange((value: ImageStyle) => {
          this.selectedStyle = value;
        })
      );

    // Image Resolution dropdown
    new Setting(contentEl)
      .setName('Image Resolution')
      .setDesc('Higher resolution = better quality (4K recommended for Korean text)')
      .addDropdown(dropdown => dropdown
        .addOptions({
          '1K': '1K - Standard Quality',
          '2K': '2K - High Quality',
          '4K': '4K - Ultra HD Quality ⭐'
        })
        .setValue(this.selectedSize)
        .onChange((value: ImageSize) => {
          this.selectedSize = value;
        })
      );

    // Buttons container
    const buttonContainer = contentEl.createDiv({ cls: 'nanobanana-button-container' });

    // Cancel button
    const cancelBtn = buttonContainer.createEl('button', {
      text: 'Cancel',
      cls: 'nanobanana-btn nanobanana-btn-cancel'
    });
    cancelBtn.onclick = () => {
      this.onSubmit({
        confirmed: false,
        imageStyle: this.selectedStyle,
        imageSize: this.selectedSize
      });
      this.close();
    };

    // Generate button
    const generateBtn = buttonContainer.createEl('button', {
      text: '🚀 Generate Poster',
      cls: 'nanobanana-btn nanobanana-btn-primary'
    });
    generateBtn.onclick = () => {
      this.onSubmit({
        confirmed: true,
        imageStyle: this.selectedStyle,
        imageSize: this.selectedSize
      });
      this.close();
    };

    // Add styles
    this.addStyles();
  }

  private addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .nanobanana-quick-options {
        padding: 20px;
      }
      .nanobanana-modal-title {
        margin: 0 0 8px 0;
        font-size: 1.4em;
      }
      .nanobanana-modal-desc {
        color: var(--text-muted);
        margin-bottom: 20px;
      }
      .nanobanana-button-container {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
        padding-top: 15px;
        border-top: 1px solid var(--background-modifier-border);
      }
      .nanobanana-btn {
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        border: none;
        transition: all 0.2s ease;
      }
      .nanobanana-btn-cancel {
        background: var(--background-modifier-border);
        color: var(--text-normal);
      }
      .nanobanana-btn-cancel:hover {
        background: var(--background-modifier-hover);
      }
      .nanobanana-btn-primary {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
      }
      .nanobanana-btn-primary:hover {
        background: var(--interactive-accent-hover);
      }
    `;
    this.contentEl.appendChild(style);
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
