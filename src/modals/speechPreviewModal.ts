import { App, Modal } from 'obsidian';
import { SpeechPreviewResult, SpeechTemplate, SPEECH_TEMPLATE_CONFIGS } from '../types';

export class SpeechPreviewModal extends Modal {
  private script: string;
  private template: SpeechTemplate;
  private estimatedDuration: number;
  private wordCount: number;
  private result: SpeechPreviewResult;
  private onSubmit: (result: SpeechPreviewResult) => void;

  constructor(
    app: App,
    script: string,
    template: SpeechTemplate,
    estimatedDuration: number,
    wordCount: number,
    onSubmit: (result: SpeechPreviewResult) => void
  ) {
    super(app);
    this.script = script;
    this.template = template;
    this.estimatedDuration = estimatedDuration;
    this.wordCount = wordCount;
    this.onSubmit = onSubmit;
    this.result = {
      confirmed: false,
      script: script,
      regenerate: false
    };
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('starcloud-speech-preview-modal');

    const templateConfig = SPEECH_TEMPLATE_CONFIGS[this.template];

    contentEl.createEl('h2', { text: `${templateConfig.icon} 스피치 스크립트 미리보기` });

    const descEl = contentEl.createEl('p', {
      text: '생성된 스크립트를 확인하고 필요시 수정하세요. 수정된 내용으로 음성이 생성됩니다.',
      cls: 'preview-description'
    });

    // Stats bar
    const statsBar = contentEl.createDiv({ cls: 'speech-stats-bar' });

    const templateBadge = statsBar.createEl('span', { cls: 'speech-stat-badge' });
    templateBadge.setText(`${templateConfig.icon} ${templateConfig.nameKo}`);

    const durationBadge = statsBar.createEl('span', { cls: 'speech-stat-badge duration' });
    durationBadge.setText(`⏱️ 예상 ${this.estimatedDuration.toFixed(1)}분`);

    const wordCountBadge = statsBar.createEl('span', { cls: 'speech-stat-badge' });
    wordCountBadge.setText(`📝 ${this.wordCount.toLocaleString()}${this.isKorean() ? '자' : ' words'}`);

    // Script text area
    const textAreaContainer = contentEl.createDiv({ cls: 'prompt-textarea-container' });

    const textArea = textAreaContainer.createEl('textarea', {
      cls: 'prompt-textarea speech-script-textarea',
      attr: {
        rows: '15',
        placeholder: 'AI가 생성한 스피치 스크립트가 여기에 표시됩니다...'
      }
    });
    textArea.value = this.script;

    // Highlight speaker labels if dialogue mode
    if (this.template === 'notebooklm-dialogue') {
      textArea.classList.add('dialogue-mode');
    }

    textArea.oninput = () => {
      this.result.script = textArea.value;
      this.updateStats(textArea.value, charCount);
    };

    // Character/Word count
    const charCount = textAreaContainer.createDiv({ cls: 'char-count' });
    this.updateStats(this.script, charCount);

    // Tips section
    if (this.template === 'notebooklm-dialogue') {
      const tipsSection = contentEl.createDiv({ cls: 'speech-tips' });
      tipsSection.createEl('p', {
        text: '💡 대화 모드: [Host A]와 [Host B] 라벨을 유지해 주세요. 각 라벨에 따라 다른 음성으로 생성됩니다.',
        cls: 'speech-tip'
      });
    }

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

    // Generate Audio button
    const generateButton = buttonContainer.createEl('button', {
      text: '🎤 음성 생성',
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

  private isKorean(): boolean {
    // Simple check: if more than 30% of text is Korean characters
    const koreanChars = (this.script.match(/[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/g) || []).length;
    return koreanChars / this.script.length > 0.3;
  }

  private updateStats(text: string, charCountEl: HTMLElement) {
    const isKorean = this.isKorean();
    const wordCount = isKorean
      ? text.replace(/\s+/g, '').length
      : text.split(/\s+/).filter(w => w.length > 0).length;

    const rate = isKorean ? 280 : 150;
    const estimatedDuration = wordCount / rate;

    charCountEl.setText(`${wordCount.toLocaleString()}${isKorean ? '자' : ' words'} | 예상 ${estimatedDuration.toFixed(1)}분`);
  }

  private addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .starcloud-speech-preview-modal {
        padding: 20px;
        width: 700px;
        max-width: 90vw;
      }

      .preview-description {
        color: var(--text-muted);
        margin-bottom: 16px;
      }

      .speech-stats-bar {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
        flex-wrap: wrap;
      }

      .speech-stat-badge {
        background: var(--background-secondary);
        padding: 4px 12px;
        border-radius: 16px;
        font-size: 13px;
        color: var(--text-muted);
      }

      .speech-stat-badge.duration {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
      }

      .prompt-textarea-container {
        margin-bottom: 16px;
      }

      .prompt-textarea.speech-script-textarea {
        width: 100%;
        min-height: 350px;
        padding: 16px;
        font-family: var(--font-text);
        font-size: 14px;
        line-height: 1.8;
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        background: var(--background-primary);
        color: var(--text-normal);
        resize: vertical;
        white-space: pre-wrap;
      }

      .prompt-textarea.speech-script-textarea:focus {
        outline: none;
        border-color: var(--interactive-accent);
        box-shadow: 0 0 0 2px var(--interactive-accent-hover);
      }

      .prompt-textarea.dialogue-mode {
        font-family: var(--font-text);
      }

      .char-count {
        text-align: right;
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 8px;
      }

      .speech-tips {
        background: var(--background-secondary);
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 16px;
      }

      .speech-tip {
        margin: 0;
        font-size: 13px;
        color: var(--text-muted);
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
