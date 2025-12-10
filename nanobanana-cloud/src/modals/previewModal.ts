import { App, Modal, Setting } from 'obsidian';
import { PreviewModalResult } from '../types';

export class PreviewModal extends Modal {
  private prompt: string;
  private result: PreviewModalResult;
  private onSubmit: (result: PreviewModalResult) => void;

  constructor(
    app: App,
    prompt: string,
    onSubmit: (result: PreviewModalResult) => void
  ) {
    super(app);
    this.prompt = prompt;
    this.onSubmit = onSubmit;
    this.result = {
      confirmed: false,
      prompt: prompt,
      regenerate: false
    };
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('nanobanana-preview-modal');

    contentEl.createEl('h2', { text: '📝 프롬프트 미리보기' });

    const descEl = contentEl.createEl('p', {
      text: '생성된 프롬프트를 확인하고 필요시 수정하세요.',
      cls: 'preview-description'
    });

    // Prompt text area
    const textAreaContainer = contentEl.createDiv({ cls: 'prompt-textarea-container' });

    const textArea = textAreaContainer.createEl('textarea', {
      cls: 'prompt-textarea',
      attr: {
        rows: '12',
        placeholder: 'AI가 생성한 프롬프트가 여기에 표시됩니다...'
      }
    });
    textArea.value = this.prompt;
    textArea.oninput = () => {
      this.result.prompt = textArea.value;
    };

    // Character count
    const charCount = textAreaContainer.createDiv({ cls: 'char-count' });
    const updateCharCount = () => {
      charCount.setText(`${textArea.value.length} 글자`);
    };
    updateCharCount();
    textArea.oninput = () => {
      this.result.prompt = textArea.value;
      updateCharCount();
    };

    // Action Buttons
    const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

    // Regenerate button
    const regenerateButton = buttonContainer.createEl('button', {
      text: '🔄 재생성',
      cls: 'mod-warning'
    });
    regenerateButton.onclick = () => {
      this.result.confirmed = true;
      this.result.regenerate = true;
      this.close();
    };

    // Cancel button
    const cancelButton = buttonContainer.createEl('button', { text: '취소' });
    cancelButton.onclick = () => {
      this.result.confirmed = false;
      this.close();
    };

    // Generate button
    const generateButton = buttonContainer.createEl('button', {
      text: '🎨 이미지 생성',
      cls: 'mod-cta'
    });
    generateButton.onclick = () => {
      this.result.confirmed = true;
      this.result.regenerate = false;
      this.close();
    };

    // Add custom styles
    this.addStyles();

    // Focus textarea
    setTimeout(() => textArea.focus(), 50);
  }

  private addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .nanobanana-preview-modal {
        padding: 20px;
        width: 600px;
        max-width: 90vw;
      }

      .preview-description {
        color: var(--text-muted);
        margin-bottom: 16px;
      }

      .prompt-textarea-container {
        margin-bottom: 20px;
      }

      .prompt-textarea {
        width: 100%;
        min-height: 250px;
        padding: 12px;
        font-family: var(--font-monospace);
        font-size: 13px;
        line-height: 1.5;
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        background: var(--background-primary);
        color: var(--text-normal);
        resize: vertical;
      }

      .prompt-textarea:focus {
        outline: none;
        border-color: var(--interactive-accent);
        box-shadow: 0 0 0 2px var(--interactive-accent-hover);
      }

      .char-count {
        text-align: right;
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 4px;
      }

      .modal-button-container {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding-top: 16px;
        border-top: 1px solid var(--background-modifier-border);
      }

      .modal-button-container button {
        padding: 8px 16px;
      }
    `;
    this.contentEl.appendChild(style);
  }

  onClose() {
    this.onSubmit(this.result);
    const { contentEl } = this;
    contentEl.empty();
  }
}
