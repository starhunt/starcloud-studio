import { App, Modal, Setting } from 'obsidian';
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
  private onSubmit: (result: SpeechOptionsResult) => void;
  private customTextContainer: HTMLElement | null = null;
  private voiceSelectionContainer: HTMLElement | null = null;

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

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('nanobanana-speech-options');

    // Add styles
    this.addStyles();

    // Title
    contentEl.createEl('h2', {
      text: '🎤 노트에서 음성 생성',
      cls: 'nanobanana-modal-title'
    });

    contentEl.createEl('p', {
      text: '노트 내용을 AI가 요약하여 음성 파일로 변환합니다.',
      cls: 'nanobanana-modal-desc'
    });

    // Input Source Selection
    new Setting(contentEl)
      .setName('입력 소스')
      .setDesc('음성 생성에 사용할 콘텐츠를 선택하세요')
      .addDropdown(dropdown => dropdown
        .addOptions({
          'fullNote': '전체 노트',
          'selection': '선택 영역',
          'clipboard': '클립보드',
          'custom': '직접 입력'
        })
        .setValue(this.selectedInputSource)
        .onChange((value: InputSource) => {
          this.selectedInputSource = value;
          this.updateCustomTextVisibility();
        })
      );

    // Custom Text Container (hidden by default)
    this.customTextContainer = contentEl.createDiv({ cls: 'nanobanana-custom-text-container' });
    this.updateCustomTextVisibility();

    // Speech Template Selection
    new Setting(contentEl)
      .setName('스피치 템플릿')
      .setDesc('음성 생성 스타일을 선택하세요')
      .addDropdown(dropdown => {
        Object.entries(SPEECH_TEMPLATE_CONFIGS).forEach(([key, config]) => {
          dropdown.addOption(key, `${config.icon} ${config.nameKo} (${config.name})`);
        });
        dropdown.setValue(this.selectedTemplate);
        dropdown.onChange((value: SpeechTemplate) => {
          this.selectedTemplate = value;
          this.updateVoiceSelectionVisibility();
          this.updateDurationRange();
        });
        return dropdown;
      });

    // Target Duration
    const durationConfig = SPEECH_TEMPLATE_CONFIGS[this.selectedTemplate].targetDurationMinutes;
    new Setting(contentEl)
      .setName('목표 길이')
      .setDesc(`생성할 오디오 길이 (${durationConfig.min}-${durationConfig.max}분)`)
      .addSlider(slider => slider
        .setLimits(durationConfig.min, durationConfig.max, 1)
        .setValue(this.targetDuration)
        .setDynamicTooltip()
        .onChange((value) => {
          this.targetDuration = value;
        })
      );

    // Language Selection
    new Setting(contentEl)
      .setName('언어')
      .setDesc('스크립트 및 음성 생성 언어')
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

    // TTS Provider Selection
    new Setting(contentEl)
      .setName('TTS 프로바이더')
      .setDesc('음성 변환 서비스를 선택하세요')
      .addDropdown(dropdown => {
        Object.entries(TTS_PROVIDER_CONFIGS).forEach(([key, config]) => {
          dropdown.addOption(key, config.name);
        });
        dropdown.setValue(this.selectedTtsProvider);
        dropdown.onChange((value: TTSProvider) => {
          this.selectedTtsProvider = value;
          this.selectedTtsModel = TTS_PROVIDER_CONFIGS[value].defaultModel;
          this.updateVoiceSelectionVisibility();
        });
        return dropdown;
      });

    // Voice Selection Container
    this.voiceSelectionContainer = contentEl.createDiv({ cls: 'nanobanana-voice-selection-container' });
    this.updateVoiceSelectionVisibility();

    // Upload to Drive
    new Setting(contentEl)
      .setName('Google Drive에 업로드')
      .setDesc('생성된 오디오를 Google Drive에도 업로드합니다')
      .addToggle(toggle => toggle
        .setValue(this.uploadToDrive)
        .onChange((value) => {
          this.uploadToDrive = value;
        })
      );

    // Buttons container
    const buttonContainer = contentEl.createDiv({ cls: 'nanobanana-button-container' });

    // Cancel button
    const cancelBtn = buttonContainer.createEl('button', {
      text: '취소',
      cls: 'nanobanana-btn nanobanana-btn-cancel'
    });
    cancelBtn.onclick = () => {
      this.onSubmit({
        confirmed: false,
        inputSource: this.selectedInputSource,
        customInputText: this.customText,
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
    };

    // Generate button
    const generateBtn = buttonContainer.createEl('button', {
      text: '🎤 음성 생성',
      cls: 'nanobanana-btn nanobanana-btn-primary'
    });
    generateBtn.onclick = () => {
      this.onSubmit({
        confirmed: true,
        inputSource: this.selectedInputSource,
        customInputText: this.customText,
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
    };
  }

  private updateCustomTextVisibility() {
    if (!this.customTextContainer) return;
    this.customTextContainer.empty();

    if (this.selectedInputSource === 'custom') {
      this.customTextContainer.removeClass('nanobanana-hidden');

      this.customTextContainer.createEl('label', {
        text: '직접 입력',
        cls: 'nanobanana-label'
      });

      const textarea = this.customTextContainer.createEl('textarea', {
        cls: 'nanobanana-custom-text-textarea',
        placeholder: '음성으로 변환할 텍스트를 입력하세요...'
      });
      textarea.value = this.customText;
      textarea.rows = 8;
      textarea.addEventListener('input', () => {
        this.customText = textarea.value;
      });
    } else {
      this.customTextContainer.addClass('nanobanana-hidden');
    }
  }

  private updateVoiceSelectionVisibility() {
    if (!this.voiceSelectionContainer) return;
    this.voiceSelectionContainer.empty();

    if (this.selectedTtsProvider === 'gemini') {
      const isDialogue = this.selectedTemplate === 'notebooklm-dialogue';

      if (isDialogue) {
        // Two voice selections for dialogue mode
        new Setting(this.voiceSelectionContainer)
          .setName('Host A 음성')
          .setDesc('설명을 담당하는 진행자 음성')
          .addDropdown(dropdown => {
            GEMINI_TTS_VOICES.forEach(voice => {
              dropdown.addOption(voice.id, `${voice.name} (${voice.gender}) - ${voice.description}`);
            });
            dropdown.setValue(this.selectedVoiceHostA.id);
            dropdown.onChange((value) => {
              this.selectedVoiceHostA = GEMINI_TTS_VOICES.find(v => v.id === value) || GEMINI_TTS_VOICES[0];
            });
            return dropdown;
          });

        new Setting(this.voiceSelectionContainer)
          .setName('Host B 음성')
          .setDesc('질문을 담당하는 진행자 음성')
          .addDropdown(dropdown => {
            GEMINI_TTS_VOICES.forEach(voice => {
              dropdown.addOption(voice.id, `${voice.name} (${voice.gender}) - ${voice.description}`);
            });
            dropdown.setValue(this.selectedVoiceHostB.id);
            dropdown.onChange((value) => {
              this.selectedVoiceHostB = GEMINI_TTS_VOICES.find(v => v.id === value) || GEMINI_TTS_VOICES[1];
            });
            return dropdown;
          });
      } else {
        // Single voice selection
        new Setting(this.voiceSelectionContainer)
          .setName('음성')
          .setDesc('음성 생성에 사용할 목소리를 선택하세요')
          .addDropdown(dropdown => {
            GEMINI_TTS_VOICES.forEach(voice => {
              dropdown.addOption(voice.id, `${voice.name} (${voice.gender}) - ${voice.description}`);
            });
            dropdown.setValue(this.selectedVoice.id);
            dropdown.onChange((value) => {
              this.selectedVoice = GEMINI_TTS_VOICES.find(v => v.id === value) || GEMINI_TTS_VOICES[0];
            });
            return dropdown;
          });
      }
    } else if (this.selectedTtsProvider === 'elevenlabs') {
      // ElevenLabs voice ID input (for now, just a text field)
      new Setting(this.voiceSelectionContainer)
        .setName('Voice ID')
        .setDesc('ElevenLabs 음성 ID를 입력하세요')
        .addText(text => text
          .setPlaceholder('음성 ID 입력...')
          .setValue(this.selectedVoice.id)
          .onChange((value) => {
            this.selectedVoice = { id: value, name: value, gender: 'neutral' };
          })
        );
    }
  }

  private updateDurationRange() {
    // Duration range is fixed at creation, so we just need to recreate the modal
    // For simplicity, we'll keep the current duration if it's within range
    const config = SPEECH_TEMPLATE_CONFIGS[this.selectedTemplate].targetDurationMinutes;
    if (this.targetDuration < config.min) {
      this.targetDuration = config.min;
    } else if (this.targetDuration > config.max) {
      this.targetDuration = config.max;
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

  private addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .nanobanana-speech-options {
        width: 550px;
        max-width: 90vw;
      }
      .nanobanana-modal-title {
        margin-bottom: 8px;
      }
      .nanobanana-modal-desc {
        color: var(--text-muted);
        margin-bottom: 20px;
      }
      .nanobanana-custom-text-container {
        margin-bottom: 16px;
      }
      .nanobanana-custom-text-container.nanobanana-hidden {
        display: none;
      }
      .nanobanana-label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
      }
      .nanobanana-custom-text-textarea {
        width: 100%;
        min-height: 150px;
        padding: 12px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        font-family: inherit;
        font-size: 14px;
        resize: vertical;
      }
      .nanobanana-voice-selection-container {
        margin-bottom: 16px;
      }
      .nanobanana-button-container {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid var(--background-modifier-border);
      }
      .nanobanana-btn {
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }
      .nanobanana-btn-cancel {
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
      }
      .nanobanana-btn-primary {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        border: none;
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
