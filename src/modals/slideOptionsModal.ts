import { App, Modal, Setting } from 'obsidian';
import { SlideInputSource, SlidePromptType, SlidePromptConfig, SlideOptionsResult, PreferredLanguage } from '../types';
import { BUILTIN_SLIDE_PROMPTS } from '../settingsData';

export class SlideOptionsModal extends Modal {
  private selectedInputSource: SlideInputSource = 'note';
  private selectedPromptType: SlidePromptType | string;
  private customText: string = '';
  private customSlidePrompts: SlidePromptConfig[];
  private onSubmit: (result: SlideOptionsResult) => void;
  private customTextContainer: HTMLElement | null = null;
  private promptPreviewContainer: HTMLElement | null = null;
  private editedPrompt: string = '';
  private isPromptEdited: boolean = false;
  private language: PreferredLanguage;

  constructor(
    app: App,
    defaultPromptType: SlidePromptType,
    customSlidePrompts: SlidePromptConfig[],
    onSubmit: (result: SlideOptionsResult) => void,
    language: PreferredLanguage = 'ko'
  ) {
    super(app);
    this.selectedPromptType = defaultPromptType;
    this.customSlidePrompts = customSlidePrompts;
    this.onSubmit = onSubmit;
    this.language = language;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('nanobanana-slide-options');

    // Title
    contentEl.createEl('h2', {
      text: this.getMessage('slideOptionsTitle'),
      cls: 'nanobanana-modal-title'
    });

    contentEl.createEl('p', {
      text: this.getMessage('slideOptionsDesc'),
      cls: 'nanobanana-modal-desc'
    });

    // Input Source Selection
    new Setting(contentEl)
      .setName(this.getMessage('inputSourceLabel'))
      .setDesc(this.getMessage('inputSourceDesc'))
      .addDropdown(dropdown => dropdown
        .addOptions({
          'note': this.getMessage('inputSourceNote'),
          'custom-text': this.getMessage('inputSourceCustom')
        })
        .setValue(this.selectedInputSource)
        .onChange((value: SlideInputSource) => {
          this.selectedInputSource = value;
          this.updateCustomTextVisibility();
        })
      );

    // Custom Text Container (hidden by default)
    this.customTextContainer = contentEl.createDiv({ cls: 'nanobanana-custom-text-container' });
    this.updateCustomTextVisibility();

    // Prompt Type Selection
    new Setting(contentEl)
      .setName(this.getMessage('promptTypeLabel'))
      .setDesc(this.getMessage('promptTypeDesc'))
      .addDropdown(dropdown => {
        // Add built-in prompts
        const options: Record<string, string> = {};
        for (const [key, config] of Object.entries(BUILTIN_SLIDE_PROMPTS)) {
          if (key !== 'custom') {
            options[key] = config.name;
          }
        }
        // Add custom prompts
        for (const custom of this.customSlidePrompts) {
          options[custom.id] = `${custom.name} (Custom)`;
        }
        dropdown
          .addOptions(options)
          .setValue(this.selectedPromptType)
          .onChange((value: SlidePromptType | string) => {
            this.selectedPromptType = value;
            this.isPromptEdited = false;
            this.updatePromptPreview();
          });
        return dropdown;
      });

    // System Prompt Preview/Edit Section
    this.promptPreviewContainer = contentEl.createDiv({ cls: 'nanobanana-prompt-preview-container' });
    this.updatePromptPreview();

    // Buttons container
    const buttonContainer = contentEl.createDiv({ cls: 'nanobanana-button-container' });

    // Cancel button
    const cancelBtn = buttonContainer.createEl('button', {
      text: this.getMessage('cancel'),
      cls: 'nanobanana-btn nanobanana-btn-cancel'
    });
    cancelBtn.onclick = () => {
      this.onSubmit({
        confirmed: false,
        inputSource: this.selectedInputSource,
        customText: this.customText,
        promptType: this.selectedPromptType,
        selectedPromptConfig: this.getSelectedPromptConfig()
      });
      this.close();
    };

    // Generate button
    const generateBtn = buttonContainer.createEl('button', {
      text: this.getMessage('generateSlide'),
      cls: 'nanobanana-btn nanobanana-btn-primary'
    });
    generateBtn.onclick = () => {
      this.onSubmit({
        confirmed: true,
        inputSource: this.selectedInputSource,
        customText: this.customText,
        promptType: this.selectedPromptType,
        selectedPromptConfig: this.getSelectedPromptConfig()
      });
      this.close();
    };
  }

  private updateCustomTextVisibility() {
    if (!this.customTextContainer) return;
    this.customTextContainer.empty();

    if (this.selectedInputSource === 'custom-text') {
      this.customTextContainer.removeClass('nanobanana-hidden');

      // Create label
      this.customTextContainer.createEl('label', {
        text: this.getMessage('customTextLabel'),
        cls: 'nanobanana-label'
      });

      // Create textarea
      const textarea = this.customTextContainer.createEl('textarea', {
        cls: 'nanobanana-custom-text-textarea',
        placeholder: this.getMessage('customTextPlaceholder')
      });
      textarea.value = this.customText;
      textarea.rows = 10;
      textarea.addEventListener('input', () => {
        this.customText = textarea.value;
      });
    } else {
      this.customTextContainer.addClass('nanobanana-hidden');
    }
  }

  private updatePromptPreview() {
    if (!this.promptPreviewContainer) return;
    this.promptPreviewContainer.empty();

    const currentConfig = this.getBasePromptConfig();

    // Collapsible header
    const header = this.promptPreviewContainer.createDiv({ cls: 'nanobanana-prompt-header' });
    const toggleBtn = header.createEl('button', {
      text: this.getMessage('viewSystemPrompt'),
      cls: 'nanobanana-btn nanobanana-btn-small'
    });

    const contentDiv = this.promptPreviewContainer.createDiv({
      cls: 'nanobanana-prompt-content nanobanana-hidden'
    });

    // Prompt description
    contentDiv.createEl('p', {
      text: currentConfig.description,
      cls: 'nanobanana-prompt-desc'
    });

    // Editable textarea
    const textarea = contentDiv.createEl('textarea', {
      cls: 'nanobanana-prompt-textarea'
    });
    textarea.value = this.isPromptEdited ? this.editedPrompt : currentConfig.prompt;
    textarea.rows = 12;
    textarea.addEventListener('input', () => {
      this.editedPrompt = textarea.value;
      this.isPromptEdited = true;
    });

    // Reset button
    const resetBtn = contentDiv.createEl('button', {
      text: this.getMessage('resetPrompt'),
      cls: 'nanobanana-btn nanobanana-btn-small nanobanana-btn-reset'
    });
    resetBtn.onclick = () => {
      this.isPromptEdited = false;
      this.editedPrompt = '';
      textarea.value = currentConfig.prompt;
    };

    // Toggle visibility
    toggleBtn.onclick = () => {
      contentDiv.toggleClass('nanobanana-hidden', !contentDiv.hasClass('nanobanana-hidden'));
      toggleBtn.setText(contentDiv.hasClass('nanobanana-hidden')
        ? this.getMessage('viewSystemPrompt')
        : this.getMessage('hideSystemPrompt'));
    };
  }

  private getBasePromptConfig(): SlidePromptConfig {
    // First check built-in prompts
    if (this.selectedPromptType in BUILTIN_SLIDE_PROMPTS) {
      return BUILTIN_SLIDE_PROMPTS[this.selectedPromptType as SlidePromptType];
    }
    // Then check custom prompts
    const custom = this.customSlidePrompts.find(p => p.id === this.selectedPromptType);
    if (custom) return custom;
    // Fallback
    return BUILTIN_SLIDE_PROMPTS['notebooklm-summary'];
  }

  private getSelectedPromptConfig(): SlidePromptConfig {
    const baseConfig = this.getBasePromptConfig();

    // If prompt was edited, return modified config
    if (this.isPromptEdited && this.editedPrompt) {
      return {
        ...baseConfig,
        prompt: this.editedPrompt
      };
    }

    return baseConfig;
  }

  private getMessage(key: string): string {
    const messages: Record<PreferredLanguage, Record<string, string>> = {
      ko: {
        slideOptionsTitle: 'Slide generation options',
        slideOptionsDesc: '슬라이드 생성을 위한 입력 소스와 시스템 프롬프트를 선택하세요.',
        inputSourceLabel: '입력 소스',
        inputSourceDesc: '슬라이드를 생성할 콘텐츠를 선택하세요',
        inputSourceNote: 'Current note content',
        inputSourceCustom: 'Custom text',
        customTextLabel: '슬라이드로 변환할 텍스트',
        customTextPlaceholder: '슬라이드로 변환할 텍스트를 입력하세요...',
        promptTypeLabel: '시스템 프롬프트',
        promptTypeDesc: '슬라이드 생성에 사용할 지침을 선택하세요',
        viewSystemPrompt: '시스템 프롬프트 보기/편집',
        hideSystemPrompt: '시스템 프롬프트 숨기기',
        resetPrompt: '기본값으로 초기화',
        cancel: 'Cancel',
        generateSlide: 'Generate slide'
      },
      en: {
        slideOptionsTitle: 'Slide generation options',
        slideOptionsDesc: 'Select input source and system prompt for slide generation.',
        inputSourceLabel: 'Input source',
        inputSourceDesc: 'Select the content source for slide generation',
        inputSourceNote: 'Current note content',
        inputSourceCustom: 'Custom text',
        customTextLabel: 'Text to convert to slide',
        customTextPlaceholder: 'Enter text to convert to slide...',
        promptTypeLabel: 'System prompt',
        promptTypeDesc: 'Select the instruction type for slide generation',
        viewSystemPrompt: 'View/Edit System Prompt',
        hideSystemPrompt: 'Hide System Prompt',
        resetPrompt: 'Reset to Default',
        cancel: 'Cancel',
        generateSlide: 'Generate slide'
      },
      ja: {
        slideOptionsTitle: 'Slide generation options',
        slideOptionsDesc: 'スライド生成の入力ソースとシステムプロンプトを選択してください。',
        inputSourceLabel: '入力ソース',
        inputSourceDesc: 'スライド生成のコンテンツソースを選択',
        inputSourceNote: 'Current note content',
        inputSourceCustom: 'Custom text',
        customTextLabel: 'スライドに変換するテキスト',
        customTextPlaceholder: 'スライドに変換するテキストを入力...',
        promptTypeLabel: 'システムプロンプト',
        promptTypeDesc: 'スライド生成に使用する指示を選択',
        viewSystemPrompt: 'システムプロンプトを表示/編集',
        hideSystemPrompt: 'システムプロンプトを隠す',
        resetPrompt: 'デフォルトにリセット',
        cancel: 'Cancel',
        generateSlide: 'Generate slide'
      },
      zh: {
        slideOptionsTitle: 'Slide generation options',
        slideOptionsDesc: '选择幻灯片生成的输入源和系统提示。',
        inputSourceLabel: '输入源',
        inputSourceDesc: '选择幻灯片生成的内容源',
        inputSourceNote: 'Current note content',
        inputSourceCustom: 'Custom text',
        customTextLabel: '要转换为幻灯片的文本',
        customTextPlaceholder: '输入要转换为幻灯片的文本...',
        promptTypeLabel: '系统提示',
        promptTypeDesc: '选择幻灯片生成使用的指令',
        viewSystemPrompt: '查看/编辑系统提示',
        hideSystemPrompt: '隐藏系统提示',
        resetPrompt: '重置为默认',
        cancel: 'Cancel',
        generateSlide: 'Generate slide'
      },
      es: {
        slideOptionsTitle: 'Slide generation options',
        slideOptionsDesc: 'Seleccione la fuente de entrada y el prompt del sistema.',
        inputSourceLabel: 'Fuente de entrada',
        inputSourceDesc: 'Seleccione la fuente de contenido',
        inputSourceNote: 'Current note content',
        inputSourceCustom: 'Custom text',
        customTextLabel: 'Texto para convertir',
        customTextPlaceholder: 'Ingrese el texto...',
        promptTypeLabel: 'Prompt del sistema',
        promptTypeDesc: 'Seleccione el tipo de instruccion',
        viewSystemPrompt: 'Ver/Editar prompt',
        hideSystemPrompt: 'Ocultar prompt',
        resetPrompt: 'Restablecer',
        cancel: 'Cancel',
        generateSlide: 'Generate slide'
      },
      fr: {
        slideOptionsTitle: 'Slide generation options',
        slideOptionsDesc: 'Selectionnez la source et le prompt systeme.',
        inputSourceLabel: 'Source',
        inputSourceDesc: 'Selectionnez la source de contenu',
        inputSourceNote: 'Current note content',
        inputSourceCustom: 'Custom text',
        customTextLabel: 'Texte a convertir',
        customTextPlaceholder: 'Entrez le texte...',
        promptTypeLabel: 'Prompt systeme',
        promptTypeDesc: 'Selectionnez le type instruction',
        viewSystemPrompt: 'Voir/Modifier prompt',
        hideSystemPrompt: 'Masquer prompt',
        resetPrompt: 'Reinitialiser',
        cancel: 'Cancel',
        generateSlide: 'Generate slide'
      },
      de: {
        slideOptionsTitle: 'Slide generation options',
        slideOptionsDesc: 'Wahlen Sie Eingabequelle und System-Prompt.',
        inputSourceLabel: 'Eingabequelle',
        inputSourceDesc: 'Wahlen Sie die Inhaltsquelle',
        inputSourceNote: 'Current note content',
        inputSourceCustom: 'Custom text',
        customTextLabel: 'Zu konvertierender Text',
        customTextPlaceholder: 'Text eingeben...',
        promptTypeLabel: 'System-Prompt',
        promptTypeDesc: 'Wahlen Sie den Anweisungstyp',
        viewSystemPrompt: 'Prompt anzeigen/bearbeiten',
        hideSystemPrompt: 'Prompt ausblenden',
        resetPrompt: 'Zurucksetzen',
        cancel: 'Cancel',
        generateSlide: 'Generate slide'
      }
    };

    return messages[this.language]?.[key] || messages['en'][key] || key;
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
