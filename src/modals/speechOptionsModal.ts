import { App, Modal, Setting, MarkdownView } from 'obsidian';
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
import { SPEECH_TEMPLATE_PROMPTS } from '../settingsData';

type PromptMode = 'template' | 'custom';

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
  private promptMode: PromptMode = 'template';
  private customPrompt: string = '';
  private onSubmit: (result: SpeechOptionsResult) => void;

  // UI Elements
  private contentPreviewEl: HTMLTextAreaElement | null = null;
  private charCountEl: HTMLElement | null = null;
  private templateButtonsContainer: HTMLElement | null = null;
  private promptPreviewContainer: HTMLElement | null = null;
  private voiceSelectionContainer: HTMLElement | null = null;
  private durationSliderEl: HTMLInputElement | null = null;
  private durationValueEl: HTMLElement | null = null;
  private inputSourceButtons: Map<InputSource, HTMLElement> = new Map();
  private templateButtons: Map<SpeechTemplate, HTMLElement> = new Map();
  private promptTabButtons: Map<PromptMode, HTMLElement> = new Map();

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
    sourceRow.createEl('span', { text: 'Content:', cls: 'row-label' });

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

    // ===== Prompt Preview Section =====
    const promptSection = contentEl.createDiv({ cls: 'section prompt-section' });

    // Prompt Mode Tabs
    const promptTabs = promptSection.createDiv({ cls: 'prompt-tabs' });

    const templateTabBtn = promptTabs.createEl('button', {
      text: '템플릿 프롬프트',
      cls: `prompt-tab-btn ${this.promptMode === 'template' ? 'active' : ''}`
    });
    templateTabBtn.onclick = () => this.selectPromptMode('template');
    this.promptTabButtons.set('template', templateTabBtn);

    const customTabBtn = promptTabs.createEl('button', {
      text: '커스텀 프롬프트',
      cls: `prompt-tab-btn ${this.promptMode === 'custom' ? 'active' : ''}`
    });
    customTabBtn.onclick = () => this.selectPromptMode('custom');
    this.promptTabButtons.set('custom', customTabBtn);

    // Prompt Preview Container
    this.promptPreviewContainer = promptSection.createDiv({ cls: 'prompt-preview-container' });
    this.updatePromptPreview();

    // ===== Compact Settings Section =====
    const settingsSection = contentEl.createDiv({ cls: 'section compact-settings' });

    // Row 1: Duration + Language
    const row1 = settingsSection.createDiv({ cls: 'settings-row' });

    // Duration
    const durationGroup = row1.createDiv({ cls: 'setting-group duration-group' });
    durationGroup.createEl('span', { text: '길이', cls: 'setting-label' });
    this.durationSliderEl = durationGroup.createEl('input', {
      cls: 'duration-slider',
      attr: { type: 'range', min: '3', max: '15', value: String(this.targetDuration) }
    });
    this.durationValueEl = durationGroup.createEl('span', {
      text: `${this.targetDuration}분`,
      cls: 'duration-value'
    });
    this.durationSliderEl.oninput = () => {
      this.targetDuration = parseInt(this.durationSliderEl?.value || '5');
      if (this.durationValueEl) {
        this.durationValueEl.setText(`${this.targetDuration}분`);
      }
    };

    // Language
    const langGroup = row1.createDiv({ cls: 'setting-group' });
    langGroup.createEl('span', { text: '언어', cls: 'setting-label' });
    const langSelect = langGroup.createEl('select', { cls: 'setting-select' });
    Object.entries(LANGUAGE_NAMES).forEach(([key, name]) => {
      const opt = langSelect.createEl('option', { value: key, text: name });
      if (key === this.selectedLanguage) opt.selected = true;
    });
    langSelect.onchange = () => {
      this.selectedLanguage = langSelect.value as PreferredLanguage;
    };

    // Row 2: TTS Provider + Voice(s)
    const row2 = settingsSection.createDiv({ cls: 'settings-row' });

    // TTS Provider
    const ttsGroup = row2.createDiv({ cls: 'setting-group' });
    ttsGroup.createEl('span', { text: 'TTS', cls: 'setting-label' });
    const ttsSelect = ttsGroup.createEl('select', { cls: 'setting-select' });
    Object.entries(TTS_PROVIDER_CONFIGS).forEach(([key, config]) => {
      const opt = ttsSelect.createEl('option', { value: key, text: config.name });
      if (key === this.selectedTtsProvider) opt.selected = true;
    });
    ttsSelect.onchange = () => {
      this.selectedTtsProvider = ttsSelect.value as TTSProvider;
      this.selectedTtsModel = TTS_PROVIDER_CONFIGS[this.selectedTtsProvider].defaultModel;
      this.updateVoiceSelection();
    };

    // Voice Selection Container (will be populated dynamically)
    this.voiceSelectionContainer = row2.createDiv({ cls: 'voice-group' });
    this.updateVoiceSelection();

    // Row 3: Drive upload
    const row3 = settingsSection.createDiv({ cls: 'settings-row' });
    const driveGroup = row3.createDiv({ cls: 'setting-group toggle-group' });
    driveGroup.createEl('span', { text: 'Drive 업로드', cls: 'setting-label' });
    const driveToggle = driveGroup.createEl('input', {
      cls: 'setting-toggle',
      attr: { type: 'checkbox' }
    });
    (driveToggle as HTMLInputElement).checked = this.uploadToDrive;
    driveToggle.onchange = () => {
      this.uploadToDrive = (driveToggle as HTMLInputElement).checked;
    };

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

    // Reordered: verbatim moved to last
    const templates: { key: SpeechTemplate; icon: string; label: string }[] = [
      { key: 'key-summary', icon: '📝', label: '핵심 요약' },
      { key: 'lecture', icon: '🎓', label: '강의식' },
      { key: 'podcast', icon: '🎙️', label: '팟캐스트' },
      { key: 'notebooklm-dialogue', icon: '👥', label: 'NotebookLM' },
      { key: 'verbatim', icon: '📄', label: '원문 그대로' }
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
    this.promptMode = 'template';

    // Update template button states
    this.templateButtons.forEach((btn, key) => {
      btn.classList.toggle('active', key === template);
    });

    // Update prompt tab buttons
    this.promptTabButtons.forEach((btn, key) => {
      btn.classList.toggle('active', key === 'template');
    });

    // Update prompt preview
    this.updatePromptPreview();

    // Update voice selection for dialogue mode
    this.updateVoiceSelection();
  }

  private selectPromptMode(mode: PromptMode) {
    this.promptMode = mode;

    // Update tab button states
    this.promptTabButtons.forEach((btn, key) => {
      btn.classList.toggle('active', key === mode);
    });

    // Update prompt preview
    this.updatePromptPreview();
  }

  private updatePromptPreview() {
    if (!this.promptPreviewContainer) return;
    this.promptPreviewContainer.empty();

    if (this.promptMode === 'template') {
      // Show template prompt preview (read-only)
      const templateConfig = SPEECH_TEMPLATE_CONFIGS[this.selectedTemplate];
      const promptContent = SPEECH_TEMPLATE_PROMPTS[this.selectedTemplate] || '';

      const previewBox = this.promptPreviewContainer.createDiv({ cls: 'prompt-preview-box' });

      const titleLine = previewBox.createDiv({ cls: 'prompt-title' });
      titleLine.createEl('span', { text: `[${templateConfig.nameKo}]` });

      previewBox.createEl('div', {
        cls: 'prompt-content',
        text: promptContent.substring(0, 300) + (promptContent.length > 300 ? '...' : '')
      });
    } else {
      // Show custom prompt editor
      const customEditor = this.promptPreviewContainer.createEl('textarea', {
        cls: 'custom-prompt-editor',
        attr: {
          placeholder: '커스텀 프롬프트를 입력하세요...\n\n예시:\n다음 내용을 친근한 말투로 요약해주세요.\n핵심 포인트를 3개로 정리하고, 마지막에 결론을 추가해주세요.'
        }
      });
      customEditor.value = this.customPrompt;
      customEditor.oninput = () => {
        this.customPrompt = customEditor.value;
      };
    }
  }

  private updateVoiceSelection() {
    if (!this.voiceSelectionContainer) return;
    this.voiceSelectionContainer.empty();

    if (this.selectedTtsProvider === 'gemini') {
      const isDialogue = this.selectedTemplate === 'notebooklm-dialogue';

      if (isDialogue) {
        // Host A
        const hostAGroup = this.voiceSelectionContainer.createDiv({ cls: 'setting-group' });
        hostAGroup.createEl('span', { text: 'Host A', cls: 'setting-label' });
        const hostASelect = hostAGroup.createEl('select', { cls: 'setting-select' });
        GEMINI_TTS_VOICES.forEach(voice => {
          const opt = hostASelect.createEl('option', {
            value: voice.id,
            text: `${voice.name} (${voice.gender})`
          });
          if (voice.id === this.selectedVoiceHostA.id) opt.selected = true;
        });
        hostASelect.onchange = () => {
          this.selectedVoiceHostA = GEMINI_TTS_VOICES.find(v => v.id === hostASelect.value) || GEMINI_TTS_VOICES[0];
        };

        // Host B
        const hostBGroup = this.voiceSelectionContainer.createDiv({ cls: 'setting-group' });
        hostBGroup.createEl('span', { text: 'Host B', cls: 'setting-label' });
        const hostBSelect = hostBGroup.createEl('select', { cls: 'setting-select' });
        GEMINI_TTS_VOICES.forEach(voice => {
          const opt = hostBSelect.createEl('option', {
            value: voice.id,
            text: `${voice.name} (${voice.gender})`
          });
          if (voice.id === this.selectedVoiceHostB.id) opt.selected = true;
        });
        hostBSelect.onchange = () => {
          this.selectedVoiceHostB = GEMINI_TTS_VOICES.find(v => v.id === hostBSelect.value) || GEMINI_TTS_VOICES[1];
        };
      } else {
        // Single voice
        const voiceGroup = this.voiceSelectionContainer.createDiv({ cls: 'setting-group' });
        voiceGroup.createEl('span', { text: '음성', cls: 'setting-label' });
        const voiceSelect = voiceGroup.createEl('select', { cls: 'setting-select' });
        GEMINI_TTS_VOICES.forEach(voice => {
          const opt = voiceSelect.createEl('option', {
            value: voice.id,
            text: `${voice.name} (${voice.gender})`
          });
          if (voice.id === this.selectedVoice.id) opt.selected = true;
        });
        voiceSelect.onchange = () => {
          this.selectedVoice = GEMINI_TTS_VOICES.find(v => v.id === voiceSelect.value) || GEMINI_TTS_VOICES[0];
        };
      }
    } else if (this.selectedTtsProvider === 'elevenlabs') {
      const voiceGroup = this.voiceSelectionContainer.createDiv({ cls: 'setting-group' });
      voiceGroup.createEl('span', { text: 'Voice ID', cls: 'setting-label' });
      const voiceInput = voiceGroup.createEl('input', {
        cls: 'setting-input',
        attr: { type: 'text', placeholder: 'ElevenLabs Voice ID' }
      });
      (voiceInput as HTMLInputElement).value = this.selectedVoice.id;
      voiceInput.oninput = () => {
        this.selectedVoice = { id: (voiceInput as HTMLInputElement).value, name: (voiceInput as HTMLInputElement).value, gender: 'neutral' };
      };
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
      uploadToDrive: this.uploadToDrive,
      customPrompt: this.promptMode === 'custom' ? this.customPrompt : undefined
    });
    this.close();
  }

  private addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .nanobanana-speech-options {
        width: 620px;
        max-width: 95vw;
        padding: 16px 20px;
      }

      .nanobanana-speech-options .modal-title {
        margin: 0 0 14px 0;
        font-size: 1.3em;
      }

      .nanobanana-speech-options .accent-text {
        color: var(--interactive-accent);
      }

      .nanobanana-speech-options .section {
        margin-bottom: 12px;
      }

      .nanobanana-speech-options .section-label {
        font-weight: 600;
        margin-bottom: 8px;
        display: block;
        font-size: 13px;
      }

      .nanobanana-speech-options .row-label {
        font-weight: 600;
        font-size: 13px;
      }

      .nanobanana-speech-options .source-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 10px;
      }

      .nanobanana-speech-options .source-buttons {
        display: flex;
        gap: 6px;
      }

      .nanobanana-speech-options .source-btn {
        padding: 5px 12px;
        border-radius: 14px;
        border: 1px solid var(--background-modifier-border);
        background: var(--background-secondary);
        cursor: pointer;
        font-size: 12px;
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
        min-height: 50px;
        max-height: 80px;
        padding: 8px 10px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        background: var(--background-primary);
        font-family: var(--font-text);
        font-size: 12px;
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
        font-size: 11px;
        color: var(--text-muted);
        margin-top: 4px;
      }

      /* Template Buttons */
      .nanobanana-speech-options .template-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
      }

      .nanobanana-speech-options .template-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 12px;
        border-radius: 8px;
        border: 1px solid var(--background-modifier-border);
        background: var(--background-secondary);
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .nanobanana-speech-options .template-btn:hover {
        border-color: var(--interactive-accent);
      }

      .nanobanana-speech-options .template-btn.active {
        background: var(--interactive-accent);
        border-color: var(--interactive-accent);
        color: var(--text-on-accent);
      }

      .nanobanana-speech-options .template-icon {
        font-size: 16px;
        line-height: 1;
      }

      .nanobanana-speech-options .template-label {
        font-size: 13px;
      }

      /* Prompt Preview Section */
      .nanobanana-speech-options .prompt-section {
        margin-top: 12px;
      }

      .nanobanana-speech-options .prompt-tabs {
        display: flex;
        border-bottom: 1px solid var(--background-modifier-border);
        margin-bottom: 0;
      }

      .nanobanana-speech-options .prompt-tab-btn {
        padding: 8px 16px;
        border: none;
        background: transparent;
        color: var(--text-muted);
        cursor: pointer;
        font-size: 13px;
        border-bottom: 2px solid transparent;
        margin-bottom: -1px;
        transition: all 0.15s ease;
      }

      .nanobanana-speech-options .prompt-tab-btn:hover {
        color: var(--text-normal);
      }

      .nanobanana-speech-options .prompt-tab-btn.active {
        color: var(--interactive-accent);
        border-bottom-color: var(--interactive-accent);
      }

      .nanobanana-speech-options .prompt-preview-container {
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-top: none;
        border-radius: 0 0 6px 6px;
        min-height: 70px;
        max-height: 100px;
        overflow-y: auto;
      }

      .nanobanana-speech-options .prompt-preview-box {
        padding: 10px;
      }

      .nanobanana-speech-options .prompt-title {
        font-weight: 600;
        margin-bottom: 6px;
        color: var(--text-normal);
        font-size: 13px;
      }

      .nanobanana-speech-options .prompt-content {
        font-size: 12px;
        color: var(--text-muted);
        line-height: 1.4;
        white-space: pre-wrap;
      }

      .nanobanana-speech-options .custom-prompt-editor {
        width: 100%;
        min-height: 70px;
        max-height: 100px;
        padding: 10px;
        border: none;
        background: transparent;
        font-family: var(--font-text);
        font-size: 12px;
        line-height: 1.4;
        resize: none;
        color: var(--text-normal);
      }

      .nanobanana-speech-options .custom-prompt-editor:focus {
        outline: none;
      }

      /* Compact Settings */
      .nanobanana-speech-options .compact-settings {
        margin-top: 12px;
      }

      .nanobanana-speech-options .settings-row {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 10px;
        align-items: center;
      }

      .nanobanana-speech-options .setting-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .nanobanana-speech-options .setting-label {
        font-size: 13px;
        color: var(--text-normal);
        white-space: nowrap;
      }

      .nanobanana-speech-options .setting-select {
        padding: 4px 8px;
        border-radius: 4px;
        border: 1px solid var(--background-modifier-border);
        background: var(--background-secondary);
        color: var(--text-normal);
        font-size: 12px;
        min-width: 100px;
      }

      .nanobanana-speech-options .setting-input {
        padding: 4px 8px;
        border-radius: 4px;
        border: 1px solid var(--background-modifier-border);
        background: var(--background-secondary);
        color: var(--text-normal);
        font-size: 12px;
        width: 120px;
      }

      .nanobanana-speech-options .duration-group {
        flex: 1;
        min-width: 200px;
      }

      .nanobanana-speech-options .duration-slider {
        flex: 1;
        min-width: 100px;
        margin: 0 8px;
      }

      .nanobanana-speech-options .duration-value {
        font-size: 13px;
        color: var(--text-accent);
        min-width: 35px;
      }

      .nanobanana-speech-options .voice-group {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }

      .nanobanana-speech-options .toggle-group {
        gap: 10px;
      }

      .nanobanana-speech-options .setting-toggle {
        width: 36px;
        height: 20px;
        cursor: pointer;
      }

      .nanobanana-speech-options .modal-button-container {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 14px;
        padding-top: 12px;
        border-top: 1px solid var(--background-modifier-border);
      }

      .nanobanana-speech-options .btn-cancel,
      .nanobanana-speech-options .btn-primary {
        padding: 7px 18px;
        border-radius: 6px;
        font-size: 13px;
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
