import { App, Modal, Setting } from 'obsidian';
import {
  QuickOptionsResult,
  InputSource,
  ImageStyle,
  IMAGE_STYLES,
  InfographicSubStyle,
  INFOGRAPHIC_SUB_STYLES,
  ImageSize,
  CartoonCuts,
  StarCloudStudioSettings
} from '../types';

export class QuickOptionsModal extends Modal {
  private result: QuickOptionsResult;
  private onSubmit: (result: QuickOptionsResult) => void;
  private hasSelection: boolean;
  private customInputTextArea: HTMLTextAreaElement | null = null;

  constructor(
    app: App,
    settings: StarCloudStudioSettings,
    hasSelection: boolean,
    onSubmit: (result: QuickOptionsResult) => void
  ) {
    super(app);
    this.hasSelection = hasSelection;
    this.onSubmit = onSubmit;
    this.result = {
      confirmed: false,
      inputSource: hasSelection ? 'selection' : settings.defaultInputSource,
      customInputText: '',
      imageStyle: settings.imageStyle,
      infographicSubStyle: settings.infographicSubStyle,
      imageSize: settings.imageSize,
      cartoonCuts: settings.cartoonCuts,
      customCartoonCuts: settings.customCartoonCuts
    };
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('starcloud-quick-options-modal');

    contentEl.createEl('h2', { text: '🎨 포스터 생성 옵션' });

    // Input Source Section
    new Setting(contentEl)
      .setName('입력 소스')
      .setHeading();

    const inputSourceContainer = contentEl.createDiv({ cls: 'input-source-container' });

    // Full Note Option
    const fullNoteOption = inputSourceContainer.createDiv({
      cls: `input-source-option ${this.result.inputSource === 'fullNote' ? 'selected' : ''}`
    });
    fullNoteOption.createDiv({ cls: 'option-icon', text: '📄' });
    fullNoteOption.createDiv({ cls: 'option-title', text: '전체 노트' });
    fullNoteOption.createDiv({ cls: 'option-desc', text: '노트 전체 내용 사용' });

    // Selection Option
    const selectionOption = inputSourceContainer.createDiv({
      cls: `input-source-option ${this.result.inputSource === 'selection' ? 'selected' : ''} ${!this.hasSelection ? 'disabled' : ''}`
    });
    selectionOption.createDiv({ cls: 'option-icon', text: '✂️' });
    selectionOption.createDiv({ cls: 'option-title', text: '선택 영역' });
    selectionOption.createDiv({ cls: 'option-desc', text: '선택된 텍스트만 사용' });
    if (!this.hasSelection) {
      selectionOption.createDiv({ cls: 'option-hint', text: '(텍스트를 선택해주세요)' });
    }

    // Custom Input Option
    const customOption = inputSourceContainer.createDiv({
      cls: `input-source-option ${this.result.inputSource === 'custom' ? 'selected' : ''}`
    });
    customOption.createDiv({ cls: 'option-icon', text: '✏️' });
    customOption.createDiv({ cls: 'option-title', text: '직접 입력' });
    customOption.createDiv({ cls: 'option-desc', text: '텍스트 직접 입력' });

    // Custom Input TextArea (shown when custom is selected)
    const customInputContainer = contentEl.createDiv({ cls: 'custom-input-container' });
    if (this.result.inputSource !== 'custom') {
      customInputContainer.style.display = 'none';
    }
    this.customInputTextArea = customInputContainer.createEl('textarea', {
      cls: 'custom-input-textarea',
      attr: {
        rows: '6',
        placeholder: '포스터로 만들 내용을 직접 입력하세요...'
      }
    });
    this.customInputTextArea.value = this.result.customInputText;
    this.customInputTextArea.oninput = () => {
      if (this.customInputTextArea) {
        this.result.customInputText = this.customInputTextArea.value;
      }
    };

    // Click handlers
    fullNoteOption.onclick = () => {
      this.selectInputSourceWithCustom('fullNote', fullNoteOption, selectionOption, customOption, customInputContainer);
    };
    if (this.hasSelection) {
      selectionOption.onclick = () => {
        this.selectInputSourceWithCustom('selection', fullNoteOption, selectionOption, customOption, customInputContainer);
      };
    }
    customOption.onclick = () => {
      this.selectInputSourceWithCustom('custom', fullNoteOption, selectionOption, customOption, customInputContainer);
    };

    // Image Style Section
    new Setting(contentEl)
      .setName('이미지 스타일')
      .setHeading();

    const styleGrid = contentEl.createDiv({ cls: 'style-grid' });

    const styleOptions: { key: ImageStyle; icon: string; name: string }[] = [
      { key: 'infographic', icon: '📊', name: '인포그래픽' },
      { key: 'poster', icon: '🎨', name: '포스터' },
      { key: 'diagram', icon: '📐', name: '다이어그램' },
      { key: 'mindmap', icon: '🧠', name: '마인드맵' },
      { key: 'timeline', icon: '📅', name: '타임라인' },
      { key: 'cartoon', icon: '🎬', name: '카툰' }
    ];

    styleOptions.forEach(style => {
      const styleCard = styleGrid.createDiv({
        cls: `style-card ${this.result.imageStyle === style.key ? 'selected' : ''}`
      });
      styleCard.createDiv({ cls: 'style-icon', text: style.icon });
      styleCard.createDiv({ cls: 'style-name', text: style.name });
      styleCard.onclick = () => this.selectStyle(style.key, styleGrid);
    });

    // Infographic Sub-Style Section (conditional)
    this.renderInfographicSubStyleSection(contentEl);

    // Cartoon Cuts Section (conditional)
    this.renderCartoonCutsSection(contentEl);

    // Image Size Section
    new Setting(contentEl)
      .setName('해상도')
      .addDropdown(dropdown => {
        dropdown.addOption('1K', '1K (1024px)');
        dropdown.addOption('2K', '2K (2048px)');
        dropdown.addOption('4K', '4K (4096px)');
        dropdown.setValue(this.result.imageSize);
        dropdown.onChange((value: ImageSize) => {
          this.result.imageSize = value;
        });
      });

    // Action Buttons
    const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

    const cancelButton = buttonContainer.createEl('button', { text: '취소' });
    cancelButton.onclick = () => {
      this.result.confirmed = false;
      this.close();
    };

    const generateButton = buttonContainer.createEl('button', {
      text: '🎨 포스터 생성',
      cls: 'mod-cta'
    });
    generateButton.onclick = () => {
      this.result.confirmed = true;
      this.close();
    };

    // Add custom styles
    this.addStyles();
  }

  private selectInputSourceWithCustom(
    source: InputSource,
    fullNoteEl: HTMLElement,
    selectionEl: HTMLElement,
    customEl: HTMLElement,
    customInputContainer: HTMLElement
  ) {
    this.result.inputSource = source;
    fullNoteEl.removeClass('selected');
    selectionEl.removeClass('selected');
    customEl.removeClass('selected');

    if (source === 'fullNote') {
      fullNoteEl.addClass('selected');
      customInputContainer.style.display = 'none';
    } else if (source === 'selection') {
      selectionEl.addClass('selected');
      customInputContainer.style.display = 'none';
    } else if (source === 'custom') {
      customEl.addClass('selected');
      customInputContainer.style.display = 'block';
      if (this.customInputTextArea) {
        this.customInputTextArea.focus();
      }
    }
  }

  private selectStyle(style: ImageStyle, styleGrid: HTMLElement) {
    this.result.imageStyle = style;

    // Update visual selection
    styleGrid.querySelectorAll('.style-card').forEach(card => {
      card.removeClass('selected');
    });
    styleGrid.querySelectorAll('.style-card').forEach(card => {
      const name = card.querySelector('.style-name')?.textContent;
      const styleNames: Record<ImageStyle, string> = {
        infographic: '인포그래픽',
        poster: '포스터',
        diagram: '다이어그램',
        mindmap: '마인드맵',
        timeline: '타임라인',
        cartoon: '카툰'
      };
      if (name === styleNames[style]) {
        card.addClass('selected');
      }
    });

    // Re-render conditional sections
    this.reRenderConditionalSections();
  }

  private reRenderConditionalSections() {
    // Remove existing conditional sections
    const existingInfographicSection = this.contentEl.querySelector('.infographic-substyle-section');
    if (existingInfographicSection) existingInfographicSection.remove();

    const existingCartoonSection = this.contentEl.querySelector('.cartoon-cuts-section');
    if (existingCartoonSection) existingCartoonSection.remove();

    // Find insertion point (before resolution setting)
    const settingsItems = this.contentEl.querySelectorAll('.setting-item');
    let resolutionSetting: Element | undefined;
    for (const item of Array.from(settingsItems)) {
      const name = item.querySelector('.setting-item-name');
      if (name && name.textContent === '해상도') {
        resolutionSetting = item;
        break;
      }
    }

    // Re-render conditional sections
    if (resolutionSetting && resolutionSetting.parentNode) {
      if (this.result.imageStyle === 'infographic') {
        const subStyleSection = this.renderInfographicSubStyleSectionEl();
        resolutionSetting.parentNode.insertBefore(subStyleSection, resolutionSetting);
      } else if (this.result.imageStyle === 'cartoon') {
        const cartoonSection = this.renderCartoonCutsSectionEl();
        resolutionSetting.parentNode.insertBefore(cartoonSection, resolutionSetting);
      }
    }
  }

  private renderInfographicSubStyleSection(containerEl: HTMLElement) {
    if (this.result.imageStyle !== 'infographic') return;

    const section = this.renderInfographicSubStyleSectionEl();
    containerEl.appendChild(section);
  }

  private renderInfographicSubStyleSectionEl(): HTMLElement {
    const section = createDiv({ cls: 'infographic-substyle-section' });

    new Setting(section)
      .setName('인포그래픽 스타일')
      .setHeading();

    const subStyleGrid = section.createDiv({ cls: 'substyle-grid' });

    const subStyleOptions: { key: InfographicSubStyle; name: string; desc: string }[] = [
      { key: 'general', name: '일반', desc: '기본 인포그래픽' },
      { key: 'visualStory', name: '비주얼 스토리텔링', desc: '카드뉴스, SNS' },
      { key: 'tedEd', name: 'TED-Ed 교육', desc: '교육, 튜토리얼' },
      { key: 'journalism', name: '저널리즘', desc: '보도자료, 리포트' },
      { key: 'gamification', name: '게이미피케이션', desc: '이벤트, 프로세스' },
      { key: 'vcPitch', name: 'VC 피칭', desc: '투자 제안서' }
    ];

    subStyleOptions.forEach(subStyle => {
      const subStyleCard = subStyleGrid.createDiv({
        cls: `substyle-card ${this.result.infographicSubStyle === subStyle.key ? 'selected' : ''}`
      });
      subStyleCard.createDiv({ cls: 'substyle-name', text: subStyle.name });
      subStyleCard.createDiv({ cls: 'substyle-desc', text: subStyle.desc });
      subStyleCard.onclick = () => {
        this.result.infographicSubStyle = subStyle.key;
        subStyleGrid.querySelectorAll('.substyle-card').forEach(card => card.removeClass('selected'));
        subStyleCard.addClass('selected');
      };
    });

    return section;
  }

  private renderCartoonCutsSection(containerEl: HTMLElement) {
    if (this.result.imageStyle !== 'cartoon') return;

    const section = this.renderCartoonCutsSectionEl();
    containerEl.appendChild(section);
  }

  private renderCartoonCutsSectionEl(): HTMLElement {
    const section = createDiv({ cls: 'cartoon-cuts-section' });

    new Setting(section)
      .setName('카툰 컷 수')
      .addDropdown(dropdown => {
        dropdown.addOption('4', '4컷 (2x2)');
        dropdown.addOption('6', '6컷 (2x3)');
        dropdown.addOption('8', '8컷 (2x4)');
        dropdown.addOption('custom', '커스텀');
        dropdown.setValue(this.result.cartoonCuts);
        dropdown.onChange((value: CartoonCuts) => {
          this.result.cartoonCuts = value;
          this.reRenderCartoonCustomInput(section);
        });
      });

    this.reRenderCartoonCustomInput(section);

    return section;
  }

  private reRenderCartoonCustomInput(section: HTMLElement) {
    const existingInput = section.querySelector('.custom-cuts-input');
    if (existingInput) existingInput.remove();

    if (this.result.cartoonCuts === 'custom') {
      new Setting(section)
        .setClass('custom-cuts-input')
        .setName('커스텀 컷 수')
        .setDesc('2-12 사이의 숫자')
        .addText(text => {
          text.setValue(String(this.result.customCartoonCuts));
          text.onChange((value) => {
            const num = parseInt(value) || 4;
            this.result.customCartoonCuts = Math.min(12, Math.max(2, num));
          });
        });
    }
  }

  private addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .starcloud-quick-options-modal {
        padding: 20px;
        max-width: 500px;
      }

      .input-source-container {
        display: flex;
        gap: 12px;
        margin-bottom: 20px;
      }

      .input-source-option {
        flex: 1;
        padding: 16px;
        border: 2px solid var(--background-modifier-border);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .input-source-option:hover:not(.disabled) {
        border-color: var(--interactive-accent);
        background: var(--background-modifier-hover);
      }

      .input-source-option.selected {
        border-color: var(--interactive-accent);
        background: var(--background-modifier-active-hover);
      }

      .input-source-option.disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .option-icon {
        font-size: 24px;
        margin-bottom: 8px;
      }

      .option-title {
        font-weight: 600;
        margin-bottom: 4px;
      }

      .option-desc {
        font-size: 12px;
        color: var(--text-muted);
      }

      .option-hint {
        font-size: 11px;
        color: var(--text-error);
        margin-top: 4px;
      }

      .custom-input-container {
        margin-bottom: 20px;
      }

      .custom-input-textarea {
        width: 100%;
        min-height: 120px;
        padding: 12px;
        font-size: 13px;
        line-height: 1.5;
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        background: var(--background-primary);
        color: var(--text-normal);
        resize: vertical;
      }

      .custom-input-textarea:focus {
        outline: none;
        border-color: var(--interactive-accent);
        box-shadow: 0 0 0 2px var(--interactive-accent-hover);
      }

      .style-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin-bottom: 20px;
      }

      .style-card {
        padding: 12px;
        border: 2px solid var(--background-modifier-border);
        border-radius: 8px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .style-card:hover {
        border-color: var(--interactive-accent);
        background: var(--background-modifier-hover);
      }

      .style-card.selected {
        border-color: var(--interactive-accent);
        background: var(--background-modifier-active-hover);
      }

      .style-icon {
        font-size: 24px;
        margin-bottom: 6px;
      }

      .style-name {
        font-size: 12px;
        font-weight: 500;
      }

      .substyle-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        margin-bottom: 20px;
      }

      .substyle-card {
        padding: 10px;
        border: 2px solid var(--background-modifier-border);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .substyle-card:hover {
        border-color: var(--interactive-accent);
      }

      .substyle-card.selected {
        border-color: var(--interactive-accent);
        background: var(--background-modifier-active-hover);
      }

      .substyle-name {
        font-weight: 500;
        margin-bottom: 2px;
      }

      .substyle-desc {
        font-size: 11px;
        color: var(--text-muted);
      }

      .modal-button-container {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid var(--background-modifier-border);
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
