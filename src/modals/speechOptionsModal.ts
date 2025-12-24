import { App, Modal, Setting, Editor, MarkdownView } from 'obsidian';
import {
  InputSource,
  SpeechTemplate,
  SpeechOptionsResult,
  PreferredLanguage,
  TTSProvider,
  TTS_PROVIDER_CONFIGS,
  SPEECH_TEMPLATE_CONFIGS,
  GEMINI_TTS_VOICES,
  VoiceOption,
  DialogueVoices,
  LANGUAGE_NAMES
} from '../types';

export class SpeechOptionsModal extends Modal {
  private selectedInputSource: InputSource;
  private selectedTemplate: SpeechTemplate;
  private selectedLanguage: PreferredLanguage;
  private selectedTtsProvider: TTSProvider;
  private selectedTtsModel: string;
  private selectedVoice: VoiceOption;
  private selectedVoiceHostA: VoiceOption;
  private selectedVoiceHostB: VoiceOption;
  private targetDuration: number;
  private uploadToDrive: boolean = false;
  private customText: string = '';
  private sourceContent: string = '';
  private onSubmit: (result: SpeechOptionsResult) => void;

  // UI Elements
  private contentPreviewEl: HTMLTextAreaElement | null = null;
  private charCountEl: HTMLElement | null = null;
  private templateButtonsContainer: HTMLElement | null = null;
  private voiceSelectionContainer: HTMLElement | null = null;
  private inputSourceButtons: Map<InputSource, HTMLElement> = new Map();
  private templateButtons: Map<SpeechTemplate, HTMLElement> = new Map();

  constructor(
    app: App,
    defaultInputSource: InputSource,
    defaultTemplate: SpeechTemplate,
    defaultLanguage: PreferredLanguage,
    defaultTtsProvider: TTSProvider,
    defaultTtsModel: string,
    defaultVoice: string,
    defaultVoiceHostA: string,
    defaultVoiceHostB: string,
    defaultDuration: number,
    onSubmit: (result: SpeechOptionsResult) => void
  ) {
    super(app);
    this.selectedInputSource = defaultInputSource;
    this.selectedTemplate = defaultTemplate;
    this.selectedLanguage = defaultLanguage;
    this.selectedTtsProvider = defaultTtsProvider;
    this.selectedTtsModel = defaultTtsModel;
    this.targetDuration = defaultDuration;
    this.onSubmit = onSubmit;

    // Initialize voice options
    this.selectedVoice = GEMINI_TTS_VOICES.find(v => v.id === defaultVoice) || GEMINI_TTS_VOICES[0];
    this.selectedVoiceHostA = GEMINI_TTS_VOICES.find(v => v.id === defaultVoiceHostA) || GEMINI_TTS_VOICES[0];
    this.selectedVoiceHostB = GEMINI_TTS_VOICES.find(v => v.id === defaultVoiceHostB) || GEMINI_TTS_VOICES[1];
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('nanobanana-speech-options');

    // Add styles
    this.addStyles();

    // Title
    contentEl.createEl('h2', {
      text: '🎤 음성 생성',
      cls: 'modal-title accent-text'
    });

    // ===== Content Section =====
    const contentSection = contentEl.createDiv({ cls: 'section' });

    // Input Source Label and Buttons
    const sourceRow = contentSection.createDiv({ cls: 'source-row' });
    sourceRow.createEl('span', { text: 'Content:', cls: 'section-label' });

    const sourceButtonsContainer = sourceRow.createDiv({ cls: 'source-buttons' });

    const inputSources: { key: InputSource; label: string }[] = [
      { key: 'fullNote', label: '전체' },
      { key: 'selection', label: '선택' },
      { key: 'clipboard', label: '클립보드' },
      { key: 'custom', label: '직접입력' }
    ];

    inputSources.forEach(source => {
      const btn = sourceButtonsContainer.createEl('button', {
        text: source.label,
        cls: `source-btn ${this.selectedInputSource === source.key ? 'active' : ''}`
      });
      btn.onclick = () => this.selectInputSource(source.key);
      this.inputSourceButtons.set(source.key, btn);
    });

    // Content Preview Text Area
    const contentPreviewContainer = contentSection.createDiv({ cls: 'content-preview-container' });
    this.contentPreviewEl = contentPreviewContainer.createEl('textarea', {
      cls: 'content-preview',
      attr: {
        rows: '3',
        placeholder: '콘텐츠를 불러오는 중...'
      }
    });
    this.contentPreviewEl.oninput = () => {
      this.customText = this.contentPreviewEl?.value || '';
      this.updateCharCount();
    };

    // Character count
    this.charCountEl = contentPreviewContainer.createDiv({ cls: 'char-count' });

    // Load initial content
    await this.loadSourceContent();

    // ===== Template Section =====
    const templateSection = contentEl.createDiv({ cls: 'section' });
    templateSection.createEl('div', { text: '스피치 템플릿', cls: 'section-label accent-text' });

    this.templateButtonsContainer = templateSection.createDiv({ cls: 'template-buttons' });
    this.renderTemplateButtons();

    // ===== Settings Section =====
    const settingsSection = contentEl.createDiv({ cls: 'section settings-section' });

    // Duration slider
    const durationConfig = SPEECH_TEMPLATE_CONFIGS[this.selectedTemplate].targetDurationMinutes;
    new Setting(settingsSection)
      .setName('목표 길이')
      .setDesc(`${durationConfig.min}-${durationConfig.max}분`)
      .addSlider(slider => slider
        .setLimits(durationConfig.min, durationConfig.max, 1)
        .setValue(this.targetDuration)
        .setDynamicTooltip()
        .onChange((value) => {
          this.targetDuration = value;
        })
      );

    // Language
    new Setting(settingsSection)
      .setName('언어')
      .addDropdown(dropdown => {
        Object.entries(LANGUAGE_NAMES).forEach(([key, name]) => {
          dropdown.addOption(key, name);
        });
        dropdown.setValue(this.selectedLanguage);
        dropdown.onChange((value: PreferredLanguage) => {
          this.selectedLanguage = value;
        });
        return dropdown;
      });

    // TTS Provider
    new Setting(settingsSection)
      .setName('TTS')
      .addDropdown(dropdown => {
        Object.entries(TTS_PROVIDER_CONFIGS).forEach(([key, config]) => {
          dropdown.addOption(key, config.name);
        });
        dropdown.setValue(this.selectedTtsProvider);
        dropdown.onChange((value: TTSProvider) => {
          this.selectedTtsProvider = value;
          this.selectedTtsModel = TTS_PROVIDER_CONFIGS[value].defaultModel;
          this.updateVoiceSelection();
        });
        return dropdown;
      });

    // Voice Selection Container
    this.voiceSelectionContainer = settingsSection.createDiv({ cls: 'voice-selection-container' });
    this.updateVoiceSelection();

    // Upload to Drive
    new Setting(settingsSection)
      .setName('Google Drive 업로드')
      .addToggle(toggle => toggle
        .setValue(this.uploadToDrive)
        .onChange((value) => {
          this.uploadToDrive = value;
        })
      );

    // ===== Buttons =====
    const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

    const cancelBtn = buttonContainer.createEl('button', {
      text: '취소',
      cls: 'btn-cancel'
    });
    cancelBtn.onclick = () => {
      this.submitResult(false);
    };

    const generateBtn = buttonContainer.createEl('button', {
      text: '생성',
      cls: 'btn-primary'
    });
    generateBtn.onclick = () => {
      this.submitResult(true);
    };
  }

  private selectInputSource(source: InputSource) {
    this.selectedInputSource = source;

    // Update button states
    this.inputSourceButtons.forEach((btn, key) => {
      btn.classList.toggle('active', key === source);
    });

    // Update content preview
    this.loadSourceContent();
  }

  private async loadSourceContent() {
    if (!this.contentPreviewEl) return;

    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const editor = view?.editor;
    const file = view?.file;

    switch (this.selectedInputSource) {
      case 'fullNote':
        if (file) {
          this.sourceContent = await this.app.vault.read(file);
          this.contentPreviewEl.value = this.sourceContent;
          this.contentPreviewEl.readOnly = true;
          this.contentPreviewEl.placeholder = '';
        } else {
          this.contentPreviewEl.value = '';
          this.contentPreviewEl.placeholder = '열린 노트가 없습니다';
        }
        break;

      case 'selection':
        if (editor) {
          const selection = editor.getSelection();
          if (selection) {
            this.sourceContent = selection;
            this.contentPreviewEl.value = selection;
            this.contentPreviewEl.readOnly = true;
            this.contentPreviewEl.placeholder = '';
          } else {
            this.contentPreviewEl.value = '';
            this.contentPreviewEl.placeholder = '선택된 텍스트가 없습니다';
          }
        }
        break;

      case 'clipboard':
        try {
          const clipboardText = await navigator.clipboard.readText();
          this.sourceContent = clipboardText;
          this.contentPreviewEl.value = clipboardText;
          this.contentPreviewEl.readOnly = true;
          this.contentPreviewEl.placeholder = '';
        } catch {
          this.contentPreviewEl.value = '';
          this.contentPreviewEl.placeholder = '클립보드를 읽을 수 없습니다';
        }
        break;

      case 'custom':
        this.contentPreviewEl.value = this.customText;
        this.contentPreviewEl.readOnly = false;
        this.contentPreviewEl.placeholder = '음성으로 변환할 텍스트를 입력하세요...';
        this.contentPreviewEl.focus();
        break;
    }

    this.updateCharCount();
  }

  private updateCharCount() {
    if (!this.charCountEl || !this.contentPreviewEl) return;
    const text = this.contentPreviewEl.value;
    const charCount = text.length;
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    this.charCountEl.setText(`${charCount.toLocaleString()}자 / ${wordCount.toLocaleString()}단어`);
  }

  private renderTemplateButtons() {
    if (!this.templateButtonsContainer) return;
    this.templateButtonsContainer.empty();
    this.templateButtons.clear();

    const templates: { key: SpeechTemplate; icon: string; label: string }[] = [
      { key: 'verbatim', icon: '📄', label: '원문 그대로' },
      { key: 'key-summary', icon: '📝', label: '핵심 요약' },
      { key: 'lecture', icon: '🎓', label: '강의식' },
      { key: 'podcast', icon: '🎙️', label: '팟캐스트' },
      { key: 'notebooklm-dialogue', icon: '👥', label: 'NotebookLM' }
    ];

    templates.forEach(template => {
      const btn = this.templateButtonsContainer!.createEl('button', {
        cls: `template-btn ${this.selectedTemplate === template.key ? 'active' : ''}`
      });

      btn.createEl('span', { text: template.icon, cls: 'template-icon' });
      btn.createEl('span', { text: template.label, cls: 'template-label' });

      btn.onclick = () => this.selectTemplate(template.key);
      this.templateButtons.set(template.key, btn);
    });
  }

  private selectTemplate(template: SpeechTemplate) {
    this.selectedTemplate = template;

    // Update button states
    this.templateButtons.forEach((btn, key) => {
      btn.classList.toggle('active', key === template);
    });

    // Update voice selection for dialogue mode
    this.updateVoiceSelection();
  }

  private updateVoiceSelection() {
    if (!this.voiceSelectionContainer) return;
    this.voiceSelectionContainer.empty();

    if (this.selectedTtsProvider === 'gemini') {
      const isDialogue = this.selectedTemplate === 'notebooklm-dialogue';

      if (isDialogue) {
        new Setting(this.voiceSelectionContainer)
          .setName('Host A')
          .addDropdown(dropdown => {
            GEMINI_TTS_VOICES.forEach(voice => {
              dropdown.addOption(voice.id, `${voice.name} (${voice.gender})`);
            });
            dropdown.setValue(this.selectedVoiceHostA.id);
            dropdown.onChange((value) => {
              this.selectedVoiceHostA = GEMINI_TTS_VOICES.find(v => v.id === value) || GEMINI_TTS_VOICES[0];
            });
            return dropdown;
          });

        new Setting(this.voiceSelectionContainer)
          .setName('Host B')
          .addDropdown(dropdown => {
            GEMINI_TTS_VOICES.forEach(voice => {
              dropdown.addOption(voice.id, `${voice.name} (${voice.gender})`);
            });
            dropdown.setValue(this.selectedVoiceHostB.id);
            dropdown.onChange((value) => {
              this.selectedVoiceHostB = GEMINI_TTS_VOICES.find(v => v.id === value) || GEMINI_TTS_VOICES[1];
            });
            return dropdown;
          });
      } else {
        new Setting(this.voiceSelectionContainer)
          .setName('음성')
          .addDropdown(dropdown => {
            GEMINI_TTS_VOICES.forEach(voice => {
              dropdown.addOption(voice.id, `${voice.name} (${voice.gender})`);
            });
            dropdown.setValue(this.selectedVoice.id);
            dropdown.onChange((value) => {
              this.selectedVoice = GEMINI_TTS_VOICES.find(v => v.id === value) || GEMINI_TTS_VOICES[0];
            });
            return dropdown;
          });
      }
    } else if (this.selectedTtsProvider === 'elevenlabs') {
      new Setting(this.voiceSelectionContainer)
        .setName('Voice ID')
        .addText(text => text
          .setPlaceholder('ElevenLabs Voice ID')
          .setValue(this.selectedVoice.id)
          .onChange((value) => {
            this.selectedVoice = { id: value, name: value, gender: 'neutral' };
          })
        );
    }
  }

  private getDialogueVoices(): DialogueVoices | undefined {
    if (this.selectedTemplate === 'notebooklm-dialogue') {
      return {
        hostA: this.selectedVoiceHostA,
        hostB: this.selectedVoiceHostB
      };
    }
    return undefined;
  }

  private submitResult(confirmed: boolean) {
    const customInputText = this.selectedInputSource === 'custom'
      ? this.customText
      : (this.contentPreviewEl?.value || '');

    this.onSubmit({
      confirmed,
      inputSource: this.selectedInputSource,
      customInputText,
      template: this.selectedTemplate,
      language: this.selectedLanguage,
      ttsProvider: this.selectedTtsProvider,
      ttsModel: this.selectedTtsModel,
      voice: this.selectedVoice,
      dialogueVoices: this.getDialogueVoices(),
      targetDuration: this.targetDuration,
      uploadToDrive: this.uploadToDrive
    });
    this.close();
  }

  private addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .nanobanana-speech-options {
        width: 600px;
        max-width: 95vw;
        padding: 20px;
      }

      .nanobanana-speech-options .modal-title {
        margin: 0 0 20px 0;
        font-size: 1.4em;
      }

      .nanobanana-speech-options .accent-text {
        color: var(--interactive-accent);
      }

      .nanobanana-speech-options .section {
        margin-bottom: 20px;
      }

      .nanobanana-speech-options .section-label {
        font-weight: 600;
        margin-bottom: 10px;
        display: block;
      }

      .nanobanana-speech-options .source-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }

      .nanobanana-speech-options .source-buttons {
        display: flex;
        gap: 8px;
      }

      .nanobanana-speech-options .source-btn {
        padding: 6px 14px;
        border-radius: 16px;
        border: 1px solid var(--background-modifier-border);
        background: var(--background-secondary);
        cursor: pointer;
        font-size: 13px;
        transition: all 0.15s ease;
      }

      .nanobanana-speech-options .source-btn:hover {
        background: var(--background-modifier-hover);
      }

      .nanobanana-speech-options .source-btn.active {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        border-color: var(--interactive-accent);
      }

      .nanobanana-speech-options .content-preview-container {
        position: relative;
      }

      .nanobanana-speech-options .content-preview {
        width: 100%;
        min-height: 60px;
        max-height: 100px;
        padding: 10px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        background: var(--background-primary);
        font-family: var(--font-text);
        font-size: 13px;
        line-height: 1.4;
        resize: none;
        color: var(--text-normal);
        overflow-y: auto;
      }

      .nanobanana-speech-options .content-preview:focus {
        outline: none;
        border-color: var(--interactive-accent);
      }

      .nanobanana-speech-options .content-preview[readonly] {
        background: var(--background-secondary);
        color: var(--text-muted);
      }

      .nanobanana-speech-options .char-count {
        text-align: right;
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 6px;
      }

      .nanobanana-speech-options .template-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
      }

      .nanobanana-speech-options .template-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 6px 12px;
        border-radius: 6px;
        border: 1px solid var(--background-modifier-border);
        background: var(--background-secondary);
        cursor: pointer;
        transition: all 0.15s ease;
        font-size: 13px;
      }

      .nanobanana-speech-options .template-btn:hover {
        background: var(--background-modifier-hover);
        border-color: var(--interactive-accent);
      }

      .nanobanana-speech-options .template-btn.active {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        border-color: var(--interactive-accent);
      }

      .nanobanana-speech-options .template-icon {
        font-size: 14px;
        line-height: 1;
      }

      .nanobanana-speech-options .template-label {
        font-size: 13px;
        line-height: 1;
      }

      .nanobanana-speech-options .settings-section .setting-item {
        border-top: none;
        padding: 8px 0;
      }

      .nanobanana-speech-options .voice-selection-container .setting-item {
        padding: 6px 0;
      }

      .nanobanana-speech-options .modal-button-container {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid var(--background-modifier-border);
      }

      .nanobanana-speech-options .btn-cancel,
      .nanobanana-speech-options .btn-primary {
        padding: 8px 20px;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
      }

      .nanobanana-speech-options .btn-cancel {
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
      }

      .nanobanana-speech-options .btn-primary {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        border: none;
      }

      .nanobanana-speech-options .btn-primary:hover {
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
