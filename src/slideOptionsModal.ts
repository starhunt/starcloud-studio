import { App, Modal, Setting } from 'obsidian';
import { SlideInputSource, SlidePromptType, SlidePromptConfig, PreferredLanguage } from './types';
import { BUILTIN_SLIDE_PROMPTS } from './settingsData';

export interface SlideOptionsResult {
  confirmed: boolean;
  inputSource: SlideInputSource;
  customText: string;
  promptType: SlidePromptType | string;
  selectedPromptConfig: SlidePromptConfig;
}

export class SlideOptionsModal extends Modal {
  private selectedInputSource: SlideInputSource = 'note';
  private selectedPromptType: SlidePromptType | string;
  private customText: string = '';
  private customSlidePrompts: SlidePromptConfig[];
  private onSubmit: (result: SlideOptionsResult) => void;
  private customTextContainer: HTMLElement | null = null;
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
          });
        return dropdown;
      });

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

  private getSelectedPromptConfig(): SlidePromptConfig {
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

  private getMessage(key: string): string {
    const messages: Record<PreferredLanguage, Record<string, string>> = {
      ko: {
        slideOptionsTitle: '📑 슬라이드 생성 옵션',
        slideOptionsDesc: '슬라이드 생성을 위한 입력 소스와 시스템 프롬프트를 선택하세요.',
        inputSourceLabel: '입력 소스',
        inputSourceDesc: '슬라이드를 생성할 콘텐츠를 선택하세요',
        inputSourceNote: '📄 현재 노트 내용',
        inputSourceCustom: '✏️ 직접 입력',
        customTextLabel: '슬라이드로 변환할 텍스트',
        customTextPlaceholder: '슬라이드로 변환할 텍스트를 입력하세요...',
        promptTypeLabel: '시스템 프롬프트',
        promptTypeDesc: '슬라이드 생성에 사용할 지침을 선택하세요',
        cancel: '취소',
        generateSlide: '📑 슬라이드 생성'
      },
      en: {
        slideOptionsTitle: '📑 slide generation options',
        slideOptionsDesc: 'Select input source and system prompt for slide generation.',
        inputSourceLabel: 'Input source',
        inputSourceDesc: 'Select the content source for slide generation',
        inputSourceNote: '📄 Current note content',
        inputSourceCustom: '✏️ Custom text',
        customTextLabel: 'Text to convert to slide',
        customTextPlaceholder: 'Enter text to convert to slide...',
        promptTypeLabel: 'System prompt',
        promptTypeDesc: 'Select the instruction type for slide generation',
        cancel: 'Cancel',
        generateSlide: '📑 Generate slide'
      },
      ja: {
        slideOptionsTitle: '📑 スライド生成オプション',
        slideOptionsDesc: 'スライド生成の入力ソースとシステムプロンプトを選択してください。',
        inputSourceLabel: '入力ソース',
        inputSourceDesc: 'スライド生成のコンテンツソースを選択',
        inputSourceNote: '📄 現在のノート内容',
        inputSourceCustom: '✏️ カスタムテキスト',
        customTextLabel: 'スライドに変換するテキスト',
        customTextPlaceholder: 'スライドに変換するテキストを入力...',
        promptTypeLabel: 'システムプロンプト',
        promptTypeDesc: 'スライド生成に使用する指示を選択',
        cancel: 'キャンセル',
        generateSlide: '📑 スライド生成'
      },
      zh: {
        slideOptionsTitle: '📑 幻灯片生成选项',
        slideOptionsDesc: '选择幻灯片生成的输入源和系统提示。',
        inputSourceLabel: '输入源',
        inputSourceDesc: '选择幻灯片生成的内容源',
        inputSourceNote: '📄 当前笔记内容',
        inputSourceCustom: '✏️ 自定义文本',
        customTextLabel: '要转换为幻灯片的文本',
        customTextPlaceholder: '输入要转换为幻灯片的文本...',
        promptTypeLabel: '系统提示',
        promptTypeDesc: '选择幻灯片生成使用的指令',
        cancel: '取消',
        generateSlide: '📑 生成幻灯片'
      },
      es: {
        slideOptionsTitle: '📑 opciones de generacion de diapositivas',
        slideOptionsDesc: 'Seleccione la fuente de entrada y el prompt del sistema.',
        inputSourceLabel: 'Fuente de entrada',
        inputSourceDesc: 'Seleccione la fuente de contenido',
        inputSourceNote: '📄 Contenido de la nota actual',
        inputSourceCustom: '✏️ Texto personalizado',
        customTextLabel: 'Texto para convertir',
        customTextPlaceholder: 'Ingrese el texto...',
        promptTypeLabel: 'Prompt del sistema',
        promptTypeDesc: 'Seleccione el tipo de instruccion',
        cancel: 'Cancelar',
        generateSlide: '📑 Generar diapositiva'
      },
      fr: {
        slideOptionsTitle: '📑 options de generation de diapositives',
        slideOptionsDesc: 'Selectionnez la source et le prompt systeme.',
        inputSourceLabel: 'Source',
        inputSourceDesc: 'Selectionnez la source de contenu',
        inputSourceNote: '📄 Contenu de la note actuelle',
        inputSourceCustom: '✏️ Texte personnalise',
        customTextLabel: 'Texte a convertir',
        customTextPlaceholder: 'Entrez le texte...',
        promptTypeLabel: 'Prompt systeme',
        promptTypeDesc: 'Selectionnez le type instruction',
        cancel: 'Annuler',
        generateSlide: '📑 Generer diapositive'
      },
      de: {
        slideOptionsTitle: '📑 Folien-Generierungsoptionen',
        slideOptionsDesc: 'Wahlen Sie Eingabequelle und System-Prompt.',
        inputSourceLabel: 'Eingabequelle',
        inputSourceDesc: 'Wahlen Sie die Inhaltsquelle',
        inputSourceNote: '📄 Aktueller Notizinhalt',
        inputSourceCustom: '✏️ Benutzerdefinierter Text',
        customTextLabel: 'Zu konvertierender Text',
        customTextPlaceholder: 'Text eingeben...',
        promptTypeLabel: 'System-Prompt',
        promptTypeDesc: 'Wahlen Sie den Anweisungstyp',
        cancel: 'Abbrechen',
        generateSlide: '📑 Folie generieren'
      }
    };

    return messages[this.language]?.[key] || messages['en'][key] || key;
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
