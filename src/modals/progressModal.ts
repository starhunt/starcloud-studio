import { App, Modal } from 'obsidian';
import { ProgressState, ProgressStep } from '../types';

export type ProgressMode = 'image' | 'slide' | 'pptx' | 'speech';

export class ProgressModal extends Modal {
  private state: ProgressState;
  private progressBarEl: HTMLElement | null = null;
  private messageEl: HTMLElement | null = null;
  private detailsEl: HTMLElement | null = null;
  private stepListEl: HTMLElement | null = null;
  private currentStepIndex: number = 0;
  private onCancel?: () => void;
  private mode: ProgressMode;

  private readonly imageSteps: { step: ProgressStep; label: string; icon: string }[] = [
    { step: 'analyzing', label: '노트 분석 중...', icon: '📋' },
    { step: 'generating-prompt', label: '프롬프트 생성 중...', icon: '✍️' },
    { step: 'preview', label: '프롬프트 확인', icon: '👁️' },
    { step: 'generating-image', label: '이미지 생성 중...', icon: '🎨' },
    { step: 'uploading', label: 'Google Drive 업로드 중...', icon: '☁️' },
    { step: 'embedding', label: '노트에 삽입 중...', icon: '📝' },
    { step: 'complete', label: '완료!', icon: '✅' }
  ];

  private readonly slideSteps: { step: ProgressStep; label: string; icon: string }[] = [
    { step: 'analyzing', label: '콘텐츠 분석 중...', icon: '📋' },
    { step: 'generating-slide', label: 'HTML 슬라이드 생성 중...', icon: '🎴' },
    { step: 'saving', label: '슬라이드 저장 중...', icon: '💾' },
    { step: 'uploading', label: 'GitHub에 업로드 중...', icon: '☁️' },
    { step: 'embedding', label: '노트에 삽입 중...', icon: '📝' },
    { step: 'complete', label: '완료!', icon: '✅' }
  ];

  private readonly pptxSteps: { step: ProgressStep; label: string; icon: string }[] = [
    { step: 'analyzing', label: '콘텐츠 분석 중...', icon: '📋' },
    { step: 'generating-slide', label: 'PPTX 데이터 생성 중...', icon: '🎴' },
    { step: 'saving', label: 'PPTX 파일 생성 중...', icon: '💾' },
    { step: 'uploading', label: 'Google Drive에 업로드 중...', icon: '☁️' },
    { step: 'embedding', label: '노트에 삽입 중...', icon: '📝' },
    { step: 'complete', label: '완료!', icon: '✅' }
  ];

  private readonly speechSteps: { step: ProgressStep; label: string; icon: string }[] = [
    { step: 'analyzing', label: '콘텐츠 분석 중...', icon: '📋' },
    { step: 'generating-speech-script', label: '스피치 스크립트 생성 중...', icon: '✍️' },
    { step: 'preview', label: '스크립트 확인', icon: '👁️' },
    { step: 'generating-audio', label: '음성 생성 중...', icon: '🎤' },
    { step: 'processing-audio', label: '오디오 처리 중...', icon: '🔊' },
    { step: 'saving', label: '오디오 저장 중...', icon: '💾' },
    { step: 'uploading', label: 'Google Drive에 업로드 중...', icon: '☁️' },
    { step: 'embedding', label: '노트에 삽입 중...', icon: '📝' },
    { step: 'complete', label: '완료!', icon: '✅' }
  ];

  private get steps() {
    if (this.mode === 'speech') return this.speechSteps;
    if (this.mode === 'pptx') return this.pptxSteps;
    if (this.mode === 'slide') return this.slideSteps;
    return this.imageSteps;
  }

  constructor(app: App, onCancel?: () => void, mode: ProgressMode = 'image') {
    super(app);
    this.onCancel = onCancel;
    this.mode = mode;
    this.state = {
      step: 'analyzing',
      progress: 0,
      message: '시작 중...'
    };
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('nanobanana-progress-modal');

    const title = this.mode === 'speech' ? '🎤 오디오 생성 중' :
                  this.mode === 'pptx' ? '📊 PPTX 생성 중' :
                  this.mode === 'slide' ? '🎴 슬라이드 생성 중' : '🎨 포스터 생성 중';
    contentEl.createEl('h2', { text: title });

    // Step list
    this.stepListEl = contentEl.createDiv({ cls: 'step-list' });
    this.renderStepList();

    // Progress bar container
    const progressContainer = contentEl.createDiv({ cls: 'progress-container' });

    const progressTrack = progressContainer.createDiv({ cls: 'progress-track' });
    this.progressBarEl = progressTrack.createDiv({ cls: 'progress-bar' });

    // Message
    this.messageEl = contentEl.createDiv({ cls: 'progress-message' });
    this.messageEl.setText(this.state.message);

    // Details
    this.detailsEl = contentEl.createDiv({ cls: 'progress-details' });

    // Cancel button (hidden by default, shown during long operations)
    const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

    const cancelButton = buttonContainer.createEl('button', {
      text: '취소',
      cls: 'cancel-button'
    });
    cancelButton.onclick = () => {
      if (this.onCancel) {
        this.onCancel();
      }
      this.close();
    };

    // Add styles
    this.addStyles();
  }

  /**
   * Update the progress state
   */
  updateProgress(state: ProgressState) {
    this.state = state;

    // Update current step index
    const stepIndex = this.steps.findIndex(s => s.step === state.step);
    if (stepIndex >= 0) {
      this.currentStepIndex = stepIndex;
    }

    // Update progress bar
    if (this.progressBarEl) {
      this.progressBarEl.style.width = `${state.progress}%`;
    }

    // Update message
    if (this.messageEl) {
      this.messageEl.setText(state.message);
    }

    // Update details
    if (this.detailsEl) {
      if (state.details) {
        this.detailsEl.setText(state.details);
        this.detailsEl.style.display = 'block';
      } else {
        this.detailsEl.style.display = 'none';
      }
    }

    // Update step list
    this.renderStepList();

    // If complete, auto-close after a short delay
    if (state.step === 'complete') {
      setTimeout(() => this.close(), 1500);
    }
  }

  /**
   * Show error state
   */
  showError(error: string, details?: string) {
    this.updateProgress({
      step: 'error',
      progress: 0,
      message: `❌ 오류: ${error}`,
      details: details
    });

    // Add error styling
    if (this.progressBarEl) {
      this.progressBarEl.addClass('error');
    }
    if (this.messageEl) {
      this.messageEl.addClass('error');
    }
  }

  private renderStepList() {
    if (!this.stepListEl) return;

    this.stepListEl.empty();

    this.steps.forEach((step, index) => {
      if (step.step === 'preview' || step.step === 'error') return; // Skip preview step in list

      const stepEl = this.stepListEl!.createDiv({ cls: 'step-item' });

      // Status indicator
      let statusIcon = step.icon;
      let statusClass = '';

      if (index < this.currentStepIndex) {
        statusIcon = '✅';
        statusClass = 'completed';
      } else if (index === this.currentStepIndex) {
        statusClass = 'active';
      } else {
        statusClass = 'pending';
      }

      stepEl.addClass(statusClass);

      const iconEl = stepEl.createSpan({ cls: 'step-icon', text: statusIcon });
      const labelEl = stepEl.createSpan({ cls: 'step-label', text: step.label });

      // Add spinner for active step
      if (statusClass === 'active') {
        iconEl.addClass('spinning');
      }
    });
  }

  private addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .nanobanana-progress-modal {
        padding: 20px;
        width: 400px;
        max-width: 90vw;
      }

      .step-list {
        margin-bottom: 20px;
      }

      .step-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 0;
        transition: opacity 0.3s ease;
      }

      .step-item.pending {
        opacity: 0.4;
      }

      .step-item.completed {
        opacity: 0.7;
      }

      .step-item.active {
        opacity: 1;
        font-weight: 600;
      }

      .step-icon {
        font-size: 18px;
        width: 24px;
        text-align: center;
      }

      .step-icon.spinning {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .step-label {
        flex: 1;
      }

      .progress-container {
        margin: 20px 0;
      }

      .progress-track {
        height: 8px;
        background: var(--background-modifier-border);
        border-radius: 4px;
        overflow: hidden;
      }

      .progress-bar {
        height: 100%;
        background: linear-gradient(90deg, var(--interactive-accent), var(--interactive-accent-hover));
        border-radius: 4px;
        transition: width 0.3s ease;
        width: 0%;
      }

      .progress-bar.error {
        background: var(--text-error);
      }

      .progress-message {
        text-align: center;
        font-size: 14px;
        margin-top: 12px;
        color: var(--text-muted);
      }

      .progress-message.error {
        color: var(--text-error);
      }

      .progress-details {
        text-align: center;
        font-size: 12px;
        color: var(--text-faint);
        margin-top: 8px;
        font-family: var(--font-monospace);
        display: none;
      }

      .modal-button-container {
        display: flex;
        justify-content: center;
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid var(--background-modifier-border);
      }

      .cancel-button {
        padding: 8px 24px;
      }
    `;
    this.contentEl.appendChild(style);
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
