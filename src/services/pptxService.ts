/**
 * PPTX Generation Service
 * Converts structured JSON data to PowerPoint presentations using PptxGenJS
 * Optimized for educational/learning slides (NotebookLM-style)
 */
import pptxgen from 'pptxgenjs';
import {
  PptxPresentationData,
  PptxSlideData,
  PptxGenerationResult,
  PptxSectionTheme,
  PptxFlexiblePresentationData,
  PptxFlexibleSlideData,
  PptxElement,
  PptxTextElement,
  PptxShapeElement,
  PptxBulletsElement,
  PptxTableElement,
  PptxChartElement,
  PptxIconTextElement,
} from '../types';

// Section color themes
interface SectionColors {
  primary: string;
  secondary: string;
  background: string;
  accent: string;
}

const SECTION_THEMES: Record<PptxSectionTheme, SectionColors> = {
  intro: {
    primary: '2563EB',      // Blue
    secondary: '3B82F6',
    background: 'EFF6FF',
    accent: '1D4ED8'
  },
  background: {
    primary: '0891B2',      // Cyan
    secondary: '06B6D4',
    background: 'ECFEFF',
    accent: '0E7490'
  },
  concepts: {
    primary: '7C3AED',      // Purple
    secondary: '8B5CF6',
    background: 'F5F3FF',
    accent: '6D28D9'
  },
  analysis: {
    primary: '4338CA',      // Indigo
    secondary: '6366F1',
    background: 'EEF2FF',
    accent: '3730A3'
  },
  application: {
    primary: '059669',      // Green
    secondary: '10B981',
    background: 'ECFDF5',
    accent: '047857'
  },
  summary: {
    primary: '1E40AF',      // Dark Blue
    secondary: '3B82F6',
    background: 'DBEAFE',
    accent: '1E3A8A'
  }
};

export class PptxService {
  // Default fonts
  private readonly FONTS = {
    title: 'Arial',
    body: 'Arial',
  };

  // Default text colors
  private readonly TEXT = {
    dark: '1F2937',
    light: '6B7280',
    white: 'FFFFFF',
  };

  /**
   * Generate PPTX from structured JSON data
   */
  async generatePptx(data: PptxPresentationData): Promise<PptxGenerationResult> {
    const pres = new pptxgen();

    // Set presentation properties
    pres.title = data.title;
    pres.author = data.author || 'StarCloud Studio';
    pres.subject = data.subject || 'Educational Presentation';
    pres.company = 'StarCloud Studio';

    // Set 16:9 layout
    pres.defineLayout({ name: 'CUSTOM', width: 13.33, height: 7.5 });
    pres.layout = 'CUSTOM';

    // Generate slides
    const slides = data.slides && Array.isArray(data.slides) ? data.slides : [];
    for (const slideData of slides) {
      if (slideData) {
        this.addSlide(pres, slideData);
      }
    }

    // Generate PPTX buffer
    const pptxBuffer = await pres.write({ outputType: 'arraybuffer' }) as ArrayBuffer;

    return {
      pptxBuffer,
      title: data.title || 'Presentation',
      slideCount: slides.length,
    };
  }

  /**
   * Get colors for a section theme
   */
  private getThemeColors(section?: PptxSectionTheme | string): SectionColors {
    // Handle valid section themes
    if (section && section in SECTION_THEMES) {
      return SECTION_THEMES[section as PptxSectionTheme];
    }

    // Map common section keywords to themes
    if (section) {
      const sectionLower = section.toLowerCase();
      if (sectionLower.includes('intro') || sectionLower.includes('narrative') || sectionLower.includes('도입')) {
        return SECTION_THEMES.intro;
      }
      if (sectionLower.includes('concept') || sectionLower.includes('개념') || sectionLower.includes('이해')) {
        return SECTION_THEMES.concepts;
      }
      if (sectionLower.includes('analysis') || sectionLower.includes('분석') || sectionLower.includes('논증')) {
        return SECTION_THEMES.analysis;
      }
      if (sectionLower.includes('risk') || sectionLower.includes('limit') || sectionLower.includes('한계') || sectionLower.includes('리스크')) {
        return SECTION_THEMES.background;
      }
      if (sectionLower.includes('apply') || sectionLower.includes('적용') || sectionLower.includes('실무') || sectionLower.includes('action')) {
        return SECTION_THEMES.application;
      }
      if (sectionLower.includes('summary') || sectionLower.includes('정리') || sectionLower.includes('확장') || sectionLower.includes('takeaway')) {
        return SECTION_THEMES.summary;
      }
    }

    // Default fallback
    return SECTION_THEMES.intro;
  }

  /**
   * Add section indicator (sectionNumber + sectionTitle) at top-right of slide
   */
  private addSectionIndicator(slide: pptxgen.Slide, data: PptxSlideData, theme: SectionColors): void {
    if (data.sectionNumber || data.sectionTitle) {
      const sectionText = [
        data.sectionNumber ? `${data.sectionNumber}` : '',
        data.sectionTitle ? ` ${data.sectionTitle}` : ''
      ].join('').trim();

      if (sectionText) {
        slide.addText(sectionText, {
          x: 9.5,
          y: 0.15,
          w: 3.33,
          h: 0.35,
          fontSize: 11,
          fontFace: this.FONTS.body,
          color: theme.primary,
          align: 'right',
          valign: 'middle',
        });
      }
    }
  }

  /**
   * Add a slide based on its type
   */
  private addSlide(pres: pptxgen, slideData: PptxSlideData): void {
    const theme = this.getThemeColors(slideData.section);

    switch (slideData.type) {
      case 'title':
        this.addTitleSlide(pres, slideData, theme);
        break;
      case 'agenda':
        this.addAgendaSlide(pres, slideData, theme);
        break;
      case 'section':
        this.addSectionSlide(pres, slideData, theme);
        break;
      case 'definition':
        this.addDefinitionSlide(pres, slideData, theme);
        break;
      case 'concept':
        this.addConceptSlide(pres, slideData, theme);
        break;
      case 'process':
        this.addProcessSlide(pres, slideData, theme);
        break;
      case 'comparison':
        this.addComparisonSlide(pres, slideData, theme);
        break;
      case 'chart':
        this.addChartSlide(pres, slideData, theme);
        break;
      case 'table':
        this.addTableSlide(pres, slideData, theme);
        break;
      case 'case-study':
        this.addCaseStudySlide(pres, slideData, theme);
        break;
      case 'key-points':
        this.addKeyPointsSlide(pres, slideData, theme);
        break;
      case 'summary':
        this.addSummarySlide(pres, slideData, theme);
        break;
      // Legacy types
      case 'content':
        this.addContentSlide(pres, slideData, theme);
        break;
      case 'two-column':
        this.addTwoColumnSlide(pres, slideData, theme);
        break;
      case 'quote':
        this.addQuoteSlide(pres, slideData, theme);
        break;
      default:
        // Map new v3 prompt types to existing renderers
        this.addMappedSlide(pres, slideData, theme);
    }
  }

  /**
   * Map new slide types from v3 prompt to existing renderers
   */
  private addMappedSlide(pres: pptxgen, slideData: PptxSlideData, theme: SectionColors): void {
    const typeStr = String(slideData.type).toLowerCase();

    // Title variants
    if (typeStr.includes('title') || typeStr.includes('hero')) {
      this.addTitleSlide(pres, slideData, theme);
      return;
    }

    // Agenda variants
    if (typeStr.includes('agenda') || typeStr.includes('map') || typeStr.includes('목차')) {
      this.addAgendaSlide(pres, slideData, theme);
      return;
    }

    // Definition variants
    if (typeStr.includes('definition') || typeStr.includes('card') && typeStr.includes('definition')) {
      this.addDefinitionSlide(pres, slideData, theme);
      return;
    }

    // Concept variants
    if (typeStr.includes('concept') || typeStr.includes('diagram') || typeStr.includes('claim') || typeStr.includes('evidence')) {
      this.addConceptSlide(pres, slideData, theme);
      return;
    }

    // Comparison variants
    if (typeStr.includes('comparison') || typeStr.includes('matrix') || typeStr.includes('vs') || typeStr.includes('misconception')) {
      this.addComparisonSlide(pres, slideData, theme);
      return;
    }

    // Process/Timeline variants
    if (typeStr.includes('process') || typeStr.includes('flow') || typeStr.includes('timeline') || typeStr.includes('evolution')) {
      this.addProcessSlide(pres, slideData, theme);
      return;
    }

    // Chart variants
    if (typeStr.includes('chart') || typeStr.includes('data') || typeStr.includes('insight')) {
      this.addChartSlide(pres, slideData, theme);
      return;
    }

    // Case study variants
    if (typeStr.includes('case') || typeStr.includes('study') || typeStr.includes('visual')) {
      this.addCaseStudySlide(pres, slideData, theme);
      return;
    }

    // Key points / takeaways / cards variants
    if (typeStr.includes('key') || typeStr.includes('takeaway') || typeStr.includes('cards') ||
        typeStr.includes('usecase') || typeStr.includes('action') || typeStr.includes('checklist')) {
      this.addKeyPointsSlide(pres, slideData, theme);
      return;
    }

    // Summary / questions variants
    if (typeStr.includes('summary') || typeStr.includes('question') || typeStr.includes('open')) {
      this.addSummarySlide(pres, slideData, theme);
      return;
    }

    // Risk / limitation / assumption variants
    if (typeStr.includes('risk') || typeStr.includes('limit') || typeStr.includes('assumption') || typeStr.includes('boundary')) {
      this.addConceptSlide(pres, slideData, theme);
      return;
    }

    // Section context
    if (typeStr.includes('section') || typeStr.includes('context')) {
      this.addSectionSlide(pres, slideData, theme);
      return;
    }

    // Default fallback
    this.addContentSlide(pres, slideData, theme);
  }

  /**
   * Add title slide
   */
  private addTitleSlide(pres: pptxgen, data: PptxSlideData, theme: SectionColors): void {
    const slide = pres.addSlide();
    slide.background = { color: theme.primary };

    // Main title
    if (data.title) {
      slide.addText(data.title, {
        x: 0.5,
        y: 2.5,
        w: 12.33,
        h: 1.5,
        fontSize: 44,
        fontFace: this.FONTS.title,
        color: this.TEXT.white,
        bold: true,
        align: 'center',
        valign: 'middle',
      });
    }

    // Subtitle
    if (data.subtitle) {
      slide.addText(data.subtitle, {
        x: 0.5,
        y: 4.2,
        w: 12.33,
        h: 0.8,
        fontSize: 24,
        fontFace: this.FONTS.body,
        color: 'E0E7FF',
        align: 'center',
        valign: 'middle',
      });
    }

    // Decorative line
    slide.addShape(pres.ShapeType.rect, {
      x: 5.5,
      y: 4.0,
      w: 2.33,
      h: 0.05,
      fill: { color: 'FFFFFF' },
    });

    if (data.notes) slide.addNotes(data.notes);
  }

  /**
   * Add agenda/table of contents slide
   */
  private addAgendaSlide(pres: pptxgen, data: PptxSlideData, theme: SectionColors): void {
    const slide = pres.addSlide();
    slide.background = { color: 'FFFFFF' };

    // Title
    slide.addText(data.title || '학습 목차', {
      x: 0.5,
      y: 0.3,
      w: 12.33,
      h: 0.8,
      fontSize: 32,
      fontFace: this.FONTS.title,
      color: theme.primary,
      bold: true,
    });

    // Agenda items
    if (data.items && Array.isArray(data.items) && data.items.length > 0) {
      let yPos = 1.3;
      data.items.forEach((item, index) => {
        if (!item) return;
        // Number circle
        slide.addShape(pres.ShapeType.ellipse, {
          x: 0.5,
          y: yPos,
          w: 0.6,
          h: 0.6,
          fill: { color: theme.primary },
        });

        slide.addText(item.number || String(index + 1).padStart(2, '0'), {
          x: 0.5,
          y: yPos,
          w: 0.6,
          h: 0.6,
          fontSize: 14,
          fontFace: this.FONTS.body,
          color: this.TEXT.white,
          align: 'center',
          valign: 'middle',
          bold: true,
        });

        // Title
        slide.addText(item.title || '', {
          x: 1.3,
          y: yPos,
          w: 4,
          h: 0.6,
          fontSize: 18,
          fontFace: this.FONTS.title,
          color: this.TEXT.dark,
          bold: true,
          valign: 'middle',
        });

        // Description
        slide.addText(item.description || '', {
          x: 5.5,
          y: yPos,
          w: 7.3,
          h: 0.6,
          fontSize: 14,
          fontFace: this.FONTS.body,
          color: this.TEXT.light,
          valign: 'middle',
        });

        yPos += 0.9;
      });
    }

    if (data.notes) slide.addNotes(data.notes);
  }

  /**
   * Add section divider slide
   */
  private addSectionSlide(pres: pptxgen, data: PptxSlideData, theme: SectionColors): void {
    const slide = pres.addSlide();
    slide.background = { color: theme.primary };

    // Section number
    if (data.sectionNumber) {
      slide.addText(data.sectionNumber, {
        x: 0.5,
        y: 2,
        w: 12.33,
        h: 0.8,
        fontSize: 60,
        fontFace: this.FONTS.title,
        color: theme.secondary,
        align: 'center',
        bold: true,
      });
    }

    // Section title
    if (data.title) {
      slide.addText(data.title, {
        x: 0.5,
        y: 3,
        w: 12.33,
        h: 1.2,
        fontSize: 40,
        fontFace: this.FONTS.title,
        color: this.TEXT.white,
        bold: true,
        align: 'center',
        valign: 'middle',
      });
    }

    // Subtitle
    if (data.subtitle) {
      slide.addText(data.subtitle, {
        x: 0.5,
        y: 4.3,
        w: 12.33,
        h: 0.8,
        fontSize: 20,
        fontFace: this.FONTS.body,
        color: 'E0E7FF',
        align: 'center',
      });
    }

    if (data.notes) slide.addNotes(data.notes);
  }

  /**
   * Add definition slide - for explaining terms/concepts
   */
  private addDefinitionSlide(pres: pptxgen, data: PptxSlideData, theme: SectionColors): void {
    const slide = pres.addSlide();
    slide.background = { color: theme.background };

    // Section indicator
    this.addSectionIndicator(slide, data, theme);

    // Term (large)
    if (data.term) {
      slide.addText(data.term, {
        x: 0.5,
        y: 0.3,
        w: 12.33,
        h: 0.9,
        fontSize: 36,
        fontFace: this.FONTS.title,
        color: theme.primary,
        bold: true,
      });
    }

    // Etymology if provided
    if (data.etymology) {
      slide.addText(`어원: ${data.etymology}`, {
        x: 0.5,
        y: 1.2,
        w: 12.33,
        h: 0.4,
        fontSize: 12,
        fontFace: this.FONTS.body,
        color: this.TEXT.light,
        italic: true,
      });
    }

    // Definition box
    const defY = data.etymology ? 1.7 : 1.3;
    slide.addShape(pres.ShapeType.rect, {
      x: 0.5,
      y: defY,
      w: 12.33,
      h: 1.4,
      fill: { color: 'FFFFFF' },
      shadow: { type: 'outer', blur: 3, offset: 2, angle: 45, opacity: 0.1 },
    });

    if (data.definition) {
      slide.addText(data.definition, {
        x: 0.7,
        y: defY + 0.15,
        w: 11.93,
        h: 1.1,
        fontSize: 16,
        fontFace: this.FONTS.body,
        color: this.TEXT.dark,
        valign: 'middle',
      });
    }

    // Examples
    if (data.examples && Array.isArray(data.examples) && data.examples.length > 0) {
      slide.addText('예시', {
        x: 0.5,
        y: defY + 1.6,
        w: 6,
        h: 0.4,
        fontSize: 14,
        fontFace: this.FONTS.title,
        color: theme.primary,
        bold: true,
      });

      const exampleBullets = data.examples.map(ex => ({
        text: ex,
        options: { bullet: { type: 'bullet' as const, color: theme.primary }, indentLevel: 0 },
      }));

      slide.addText(exampleBullets, {
        x: 0.5,
        y: defY + 2.0,
        w: 6,
        h: 2.5,
        fontSize: 14,
        fontFace: this.FONTS.body,
        color: this.TEXT.dark,
        lineSpacing: 28,
      });
    }

    // Related terms
    if (data.relatedTerms && Array.isArray(data.relatedTerms) && data.relatedTerms.length > 0) {
      slide.addText('관련 용어', {
        x: 7,
        y: defY + 1.6,
        w: 5.83,
        h: 0.4,
        fontSize: 14,
        fontFace: this.FONTS.title,
        color: theme.primary,
        bold: true,
      });

      slide.addText(data.relatedTerms.join('  •  '), {
        x: 7,
        y: defY + 2.0,
        w: 5.83,
        h: 1,
        fontSize: 13,
        fontFace: this.FONTS.body,
        color: this.TEXT.light,
      });
    }

    if (data.notes) slide.addNotes(data.notes);
  }

  /**
   * Add concept explanation slide
   */
  private addConceptSlide(pres: pptxgen, data: PptxSlideData, theme: SectionColors): void {
    const slide = pres.addSlide();
    slide.background = { color: 'FFFFFF' };

    // Section indicator
    this.addSectionIndicator(slide, data, theme);

    // Title with accent bar
    slide.addShape(pres.ShapeType.rect, {
      x: 0.5,
      y: 0.3,
      w: 0.15,
      h: 0.7,
      fill: { color: theme.primary },
    });

    if (data.title) {
      slide.addText(data.title, {
        x: 0.8,
        y: 0.3,
        w: 11.93,
        h: 0.7,
        fontSize: 28,
        fontFace: this.FONTS.title,
        color: this.TEXT.dark,
        bold: true,
        valign: 'middle',
      });
    }

    // Description
    if (data.description) {
      slide.addText(data.description, {
        x: 0.5,
        y: 1.2,
        w: 12.33,
        h: 1.2,
        fontSize: 16,
        fontFace: this.FONTS.body,
        color: this.TEXT.dark,
        valign: 'top',
        lineSpacing: 26,
      });
    }

    // Key points
    if (data.keyPoints && Array.isArray(data.keyPoints) && data.keyPoints.length > 0) {
      slide.addText('핵심 포인트', {
        x: 0.5,
        y: 2.6,
        w: 12.33,
        h: 0.4,
        fontSize: 14,
        fontFace: this.FONTS.title,
        color: theme.primary,
        bold: true,
      });

      const keyPointBullets = data.keyPoints.map(kp => ({
        text: kp,
        options: { bullet: { type: 'bullet' as const, color: theme.primary }, indentLevel: 0 },
      }));

      slide.addText(keyPointBullets, {
        x: 0.5,
        y: 3.0,
        w: 12.33,
        h: 3,
        fontSize: 15,
        fontFace: this.FONTS.body,
        color: this.TEXT.dark,
        lineSpacing: 32,
      });
    }

    // Insight box
    if (data.insight) {
      slide.addShape(pres.ShapeType.rect, {
        x: 0.5,
        y: 6.3,
        w: 12.33,
        h: 0.8,
        fill: { color: theme.background },
      });

      slide.addText(`💡 ${data.insight}`, {
        x: 0.7,
        y: 6.4,
        w: 11.93,
        h: 0.6,
        fontSize: 14,
        fontFace: this.FONTS.body,
        color: theme.primary,
        bold: true,
        valign: 'middle',
      });
    }

    if (data.notes) slide.addNotes(data.notes);
  }

  /**
   * Add process/steps slide
   */
  private addProcessSlide(pres: pptxgen, data: PptxSlideData, theme: SectionColors): void {
    const slide = pres.addSlide();
    slide.background = { color: 'FFFFFF' };

    // Section indicator
    this.addSectionIndicator(slide, data, theme);

    // Title
    if (data.title) {
      slide.addText(data.title, {
        x: 0.5,
        y: 0.3,
        w: 12.33,
        h: 0.7,
        fontSize: 28,
        fontFace: this.FONTS.title,
        color: theme.primary,
        bold: true,
      });
    }

    // Description
    if (data.description) {
      slide.addText(data.description, {
        x: 0.5,
        y: 1.0,
        w: 12.33,
        h: 0.6,
        fontSize: 14,
        fontFace: this.FONTS.body,
        color: this.TEXT.light,
      });
    }

    // Process steps
    if (data.steps && Array.isArray(data.steps) && data.steps.length > 0) {
      const stepCount = data.steps.length;
      const startY = 1.8;
      const stepHeight = Math.min(1.0, 4.5 / stepCount);

      data.steps.forEach((step, index) => {
        if (!step) return;
        const yPos = startY + (index * stepHeight);

        // Step number circle
        slide.addShape(pres.ShapeType.ellipse, {
          x: 0.5,
          y: yPos,
          w: 0.5,
          h: 0.5,
          fill: { color: theme.primary },
        });

        slide.addText(String(step.step || index + 1), {
          x: 0.5,
          y: yPos,
          w: 0.5,
          h: 0.5,
          fontSize: 14,
          fontFace: this.FONTS.body,
          color: this.TEXT.white,
          align: 'center',
          valign: 'middle',
          bold: true,
        });

        // Connector line (except last)
        if (index < stepCount - 1) {
          slide.addShape(pres.ShapeType.rect, {
            x: 0.725,
            y: yPos + 0.5,
            w: 0.05,
            h: stepHeight - 0.5,
            fill: { color: theme.secondary },
          });
        }

        // Step title
        slide.addText(step.title || '', {
          x: 1.2,
          y: yPos,
          w: 3.5,
          h: 0.5,
          fontSize: 16,
          fontFace: this.FONTS.title,
          color: this.TEXT.dark,
          bold: true,
          valign: 'middle',
        });

        // Step description
        slide.addText(step.description || '', {
          x: 4.8,
          y: yPos,
          w: 8,
          h: stepHeight - 0.1,
          fontSize: 13,
          fontFace: this.FONTS.body,
          color: this.TEXT.light,
          valign: 'top',
        });
      });
    }

    if (data.notes) slide.addNotes(data.notes);
  }

  /**
   * Add comparison slide
   */
  private addComparisonSlide(pres: pptxgen, data: PptxSlideData, theme: SectionColors): void {
    const slide = pres.addSlide();
    slide.background = { color: 'FFFFFF' };

    // Section indicator
    this.addSectionIndicator(slide, data, theme);

    // Title
    if (data.title) {
      slide.addText(data.title, {
        x: 0.5,
        y: 0.3,
        w: 12.33,
        h: 0.7,
        fontSize: 28,
        fontFace: this.FONTS.title,
        color: theme.primary,
        bold: true,
      });
    }

    // Description
    if (data.description) {
      slide.addText(data.description, {
        x: 0.5,
        y: 1.0,
        w: 12.33,
        h: 0.5,
        fontSize: 14,
        fontFace: this.FONTS.body,
        color: this.TEXT.light,
      });
    }

    // Table headers and rows
    if (data.headers && Array.isArray(data.headers) && data.headers.length > 0 && data.rows && Array.isArray(data.rows)) {
      const tableRows: pptxgen.TableRow[] = [];

      // Header row
      tableRows.push(data.headers.map(h => ({
        text: h || '',
        options: {
          fill: { color: theme.primary },
          color: 'FFFFFF',
          bold: true,
          align: 'center' as const,
          valign: 'middle' as const,
        }
      })));

      // Data rows - handle all formats
      data.rows.forEach((row, idx) => {
        if (!row) return;
        const bgColor = idx % 2 === 0 ? 'FFFFFF' : 'F9FAFB';

        if (Array.isArray(row)) {
          // string[][] format
          tableRows.push((row as string[]).map(cell => ({
            text: cell || '',
            options: {
              fill: { color: bgColor },
              color: this.TEXT.dark,
              align: 'center' as const,
              valign: 'middle' as const,
            }
          })));
        } else if ('values' in row && Array.isArray((row as { values?: unknown }).values)) {
          // New v2 format: { aspect, values: string[] }
          const compRow = row as { aspect: string; values: string[] };
          const cells = [
            { text: compRow.aspect || '', options: { fill: { color: bgColor }, color: this.TEXT.dark, bold: true, align: 'left' as const, valign: 'middle' as const } },
            ...(compRow.values || []).map(val => ({
              text: val || '',
              options: { fill: { color: bgColor }, color: this.TEXT.dark, align: 'center' as const, valign: 'middle' as const }
            }))
          ];
          tableRows.push(cells);
        } else {
          // Legacy format: { aspect, itemA, itemB }
          const compRow = row as { aspect?: string; itemA?: string; itemB?: string };
          tableRows.push([
            { text: compRow.aspect || '', options: { fill: { color: bgColor }, color: this.TEXT.dark, bold: true, align: 'left' as const, valign: 'middle' as const } },
            { text: compRow.itemA || '', options: { fill: { color: bgColor }, color: this.TEXT.dark, align: 'center' as const, valign: 'middle' as const } },
            { text: compRow.itemB || '', options: { fill: { color: bgColor }, color: this.TEXT.dark, align: 'center' as const, valign: 'middle' as const } },
          ]);
        }
      });

      // Calculate dynamic column widths based on header count
      const colCount = data.headers.length || 3;
      const firstColW = 3.5;  // Aspect column is wider
      const remainingW = colCount > 1 ? (12.33 - firstColW) / (colCount - 1) : 4.415;
      const colWidths = colCount > 1 ? [firstColW, ...Array(colCount - 1).fill(remainingW)] : [12.33];

      slide.addTable(tableRows, {
        x: 0.5,
        y: 1.6,
        w: 12.33,
        colW: colWidths,
        fontFace: this.FONTS.body,
        fontSize: 15,
        border: { type: 'solid', pt: 0.5, color: 'E5E7EB' },
        rowH: 0.65,
      });
    }

    // Conclusion
    if (data.conclusion) {
      slide.addShape(pres.ShapeType.rect, {
        x: 0.5,
        y: 6.3,
        w: 12.33,
        h: 0.8,
        fill: { color: theme.background },
      });

      slide.addText(`결론: ${data.conclusion}`, {
        x: 0.7,
        y: 6.4,
        w: 11.93,
        h: 0.6,
        fontSize: 14,
        fontFace: this.FONTS.body,
        color: theme.primary,
        bold: true,
        valign: 'middle',
      });
    }

    if (data.notes) slide.addNotes(data.notes);
  }

  /**
   * Add chart slide
   */
  private addChartSlide(pres: pptxgen, data: PptxSlideData, theme: SectionColors): void {
    const slide = pres.addSlide();
    slide.background = { color: 'FFFFFF' };

    // Section indicator
    this.addSectionIndicator(slide, data, theme);

    // Title
    if (data.title) {
      slide.addText(data.title, {
        x: 0.5,
        y: 0.3,
        w: 12.33,
        h: 0.7,
        fontSize: 28,
        fontFace: this.FONTS.title,
        color: theme.primary,
        bold: true,
      });
    }

    // Chart
    if (data.data && data.chartType) {
      const chartData = [{
        name: 'Data',
        labels: data.data.labels,
        values: data.data.values,
      }];

      const chartColors = data.data.colors || [theme.primary, theme.secondary, theme.accent, '94A3B8', 'CBD5E1'];

      let chartType: pptxgen.CHART_NAME;
      switch (data.chartType) {
        case 'bar':
          chartType = pres.ChartType.bar;
          break;
        case 'pie':
          chartType = pres.ChartType.pie;
          break;
        case 'line':
          chartType = pres.ChartType.line;
          break;
        case 'doughnut':
          chartType = pres.ChartType.doughnut;
          break;
        default:
          chartType = pres.ChartType.bar;
      }

      slide.addChart(chartType, chartData, {
        x: 0.5,
        y: 1.2,
        w: 7.5,
        h: 4.5,
        chartColors: chartColors.map(c => c.replace('#', '')),
        showLegend: true,
        legendPos: 'b',
        showValue: true,
        dataLabelPosition: 'outEnd',
      });
    }

    // Description & Insight
    if (data.description) {
      slide.addText(data.description, {
        x: 8.5,
        y: 1.2,
        w: 4.33,
        h: 2,
        fontSize: 14,
        fontFace: this.FONTS.body,
        color: this.TEXT.dark,
      });
    }

    if (data.insight) {
      slide.addShape(pres.ShapeType.rect, {
        x: 8.5,
        y: 3.5,
        w: 4.33,
        h: 1.2,
        fill: { color: theme.background },
      });

      slide.addText(`💡 ${data.insight}`, {
        x: 8.7,
        y: 3.6,
        w: 3.93,
        h: 1,
        fontSize: 13,
        fontFace: this.FONTS.body,
        color: theme.primary,
        bold: true,
      });
    }

    if (data.notes) slide.addNotes(data.notes);
  }

  /**
   * Add table slide
   */
  private addTableSlide(pres: pptxgen, data: PptxSlideData, theme: SectionColors): void {
    const slide = pres.addSlide();
    slide.background = { color: 'FFFFFF' };

    // Section indicator
    this.addSectionIndicator(slide, data, theme);

    // Title
    if (data.title) {
      slide.addText(data.title, {
        x: 0.5,
        y: 0.3,
        w: 12.33,
        h: 0.7,
        fontSize: 28,
        fontFace: this.FONTS.title,
        color: theme.primary,
        bold: true,
      });
    }

    // Description
    if (data.description) {
      slide.addText(data.description, {
        x: 0.5,
        y: 1.0,
        w: 12.33,
        h: 0.5,
        fontSize: 14,
        fontFace: this.FONTS.body,
        color: this.TEXT.light,
      });
    }

    // Table
    if (data.headers && Array.isArray(data.headers) && data.headers.length > 0 && data.rows && Array.isArray(data.rows)) {
      const tableRows: pptxgen.TableRow[] = [];

      // Header row
      tableRows.push(data.headers.map(h => ({
        text: h || '',
        options: {
          fill: { color: theme.primary },
          color: 'FFFFFF',
          bold: true,
          align: 'center' as const,
          valign: 'middle' as const,
        }
      })));

      // Data rows
      const rowsData = data.rows as string[][];
      rowsData.forEach((row, idx) => {
        if (!Array.isArray(row)) return;
        const bgColor = idx % 2 === 0 ? 'FFFFFF' : 'F9FAFB';
        tableRows.push(row.map((cell, cellIdx) => ({
          text: cell || '',
          options: {
            fill: { color: bgColor },
            color: this.TEXT.dark,
            align: cellIdx === 0 ? 'left' as const : 'center' as const,
            valign: 'middle' as const,
          }
        })));
      });

      const colCount = data.headers.length || 1;
      const colW = 12.33 / colCount;

      slide.addTable(tableRows, {
        x: 0.5,
        y: 1.6,
        w: 12.33,
        colW: Array(colCount).fill(colW),
        fontFace: this.FONTS.body,
        fontSize: 14,
        border: { type: 'solid', pt: 0.5, color: 'E5E7EB' },
        rowH: 0.55,
      });
    }

    if (data.notes) slide.addNotes(data.notes);
  }

  /**
   * Add case study slide
   */
  private addCaseStudySlide(pres: pptxgen, data: PptxSlideData, theme: SectionColors): void {
    const slide = pres.addSlide();
    slide.background = { color: 'FFFFFF' };

    // Section indicator
    this.addSectionIndicator(slide, data, theme);

    // Title with case study badge
    slide.addShape(pres.ShapeType.rect, {
      x: 0.5,
      y: 0.3,
      w: 1.5,
      h: 0.4,
      fill: { color: theme.primary },
    });

    slide.addText('CASE STUDY', {
      x: 0.5,
      y: 0.3,
      w: 1.5,
      h: 0.4,
      fontSize: 10,
      fontFace: this.FONTS.body,
      color: this.TEXT.white,
      align: 'center',
      valign: 'middle',
      bold: true,
    });

    if (data.title) {
      slide.addText(data.title, {
        x: 0.5,
        y: 0.8,
        w: 12.33,
        h: 0.6,
        fontSize: 24,
        fontFace: this.FONTS.title,
        color: this.TEXT.dark,
        bold: true,
      });
    }

    // Context, Challenge, Solution, Result - 2x2 grid
    const sections = [
      { label: '배경', content: data.context, x: 0.5, y: 1.6 },
      { label: '과제', content: data.challenge, x: 6.7, y: 1.6 },
      { label: '해결방안', content: data.solution, x: 0.5, y: 3.8 },
      { label: '결과', content: data.result, x: 6.7, y: 3.8 },
    ];

    sections.forEach(sec => {
      if (sec.content) {
        slide.addText(sec.label, {
          x: sec.x,
          y: sec.y,
          w: 6,
          h: 0.4,
          fontSize: 12,
          fontFace: this.FONTS.title,
          color: theme.primary,
          bold: true,
        });

        slide.addText(sec.content, {
          x: sec.x,
          y: sec.y + 0.4,
          w: 6,
          h: 1.6,
          fontSize: 13,
          fontFace: this.FONTS.body,
          color: this.TEXT.dark,
          valign: 'top',
        });
      }
    });

    // Lessons learned
    if (data.lessons && Array.isArray(data.lessons) && data.lessons.length > 0) {
      slide.addText('📚 교훈', {
        x: 0.5,
        y: 6.0,
        w: 2,
        h: 0.4,
        fontSize: 12,
        fontFace: this.FONTS.title,
        color: theme.primary,
        bold: true,
      });

      slide.addText(data.lessons.join('  |  '), {
        x: 2.5,
        y: 6.0,
        w: 10.33,
        h: 0.4,
        fontSize: 12,
        fontFace: this.FONTS.body,
        color: this.TEXT.dark,
        valign: 'middle',
      });
    }

    if (data.notes) slide.addNotes(data.notes);
  }

  /**
   * Add key points slide
   */
  private addKeyPointsSlide(pres: pptxgen, data: PptxSlideData, theme: SectionColors): void {
    const slide = pres.addSlide();
    slide.background = { color: theme.background };

    // Title with icon
    const icon = data.icon || '💡';
    slide.addText(`${icon} ${data.title || '핵심 정리'}`, {
      x: 0.5,
      y: 0.3,
      w: 12.33,
      h: 0.8,
      fontSize: 28,
      fontFace: this.FONTS.title,
      color: theme.primary,
      bold: true,
    });

    // Key points as cards
    if (data.points && Array.isArray(data.points) && data.points.length > 0) {
      const cols = Math.min(data.points.length, 3);
      const cardWidth = (12.33 - (cols - 1) * 0.3) / cols;
      let row = 0;
      let col = 0;

      data.points.forEach((point, index) => {
        if (!point) return;
        const x = 0.5 + col * (cardWidth + 0.3);
        const y = 1.4 + row * 2.2;

        // Card background
        slide.addShape(pres.ShapeType.rect, {
          x: x,
          y: y,
          w: cardWidth,
          h: 2,
          fill: { color: 'FFFFFF' },
          shadow: { type: 'outer', blur: 3, offset: 2, angle: 45, opacity: 0.1 },
        });

        // Point number
        slide.addShape(pres.ShapeType.ellipse, {
          x: x + 0.15,
          y: y + 0.15,
          w: 0.4,
          h: 0.4,
          fill: { color: theme.primary },
        });

        slide.addText(String(index + 1), {
          x: x + 0.15,
          y: y + 0.15,
          w: 0.4,
          h: 0.4,
          fontSize: 14,
          fontFace: this.FONTS.body,
          color: this.TEXT.white,
          align: 'center',
          valign: 'middle',
          bold: true,
        });

        // Point title
        slide.addText(point.title || '', {
          x: x + 0.65,
          y: y + 0.15,
          w: cardWidth - 0.8,
          h: 0.4,
          fontSize: 14,
          fontFace: this.FONTS.title,
          color: this.TEXT.dark,
          bold: true,
          valign: 'middle',
        });

        // Point description
        slide.addText(point.description || '', {
          x: x + 0.15,
          y: y + 0.65,
          w: cardWidth - 0.3,
          h: 1.2,
          fontSize: 12,
          fontFace: this.FONTS.body,
          color: this.TEXT.light,
          valign: 'top',
        });

        col++;
        if (col >= cols) {
          col = 0;
          row++;
        }
      });
    }

    if (data.notes) slide.addNotes(data.notes);
  }

  /**
   * Add summary/conclusion slide
   */
  private addSummarySlide(pres: pptxgen, data: PptxSlideData, theme: SectionColors): void {
    const slide = pres.addSlide();
    slide.background = { color: theme.primary };

    // Title
    slide.addText(data.title || '학습 요약', {
      x: 0.5,
      y: 0.3,
      w: 12.33,
      h: 0.8,
      fontSize: 32,
      fontFace: this.FONTS.title,
      color: this.TEXT.white,
      bold: true,
    });

    // Key takeaways
    if (data.keyTakeaways && Array.isArray(data.keyTakeaways) && data.keyTakeaways.length > 0) {
      slide.addText('핵심 내용', {
        x: 0.5,
        y: 1.3,
        w: 6,
        h: 0.4,
        fontSize: 14,
        fontFace: this.FONTS.title,
        color: 'E0E7FF',
        bold: true,
      });

      const takeawayBullets = data.keyTakeaways.map(t => ({
        text: t,
        options: { bullet: { type: 'bullet' as const, color: 'FFFFFF' }, indentLevel: 0 },
      }));

      slide.addText(takeawayBullets, {
        x: 0.5,
        y: 1.7,
        w: 6,
        h: 3.5,
        fontSize: 15,
        fontFace: this.FONTS.body,
        color: this.TEXT.white,
        lineSpacing: 32,
      });
    }

    // Next steps
    if (data.nextSteps && Array.isArray(data.nextSteps) && data.nextSteps.length > 0) {
      slide.addText('다음 학습', {
        x: 7,
        y: 1.3,
        w: 5.83,
        h: 0.4,
        fontSize: 14,
        fontFace: this.FONTS.title,
        color: 'E0E7FF',
        bold: true,
      });

      const nextBullets = data.nextSteps.map(n => ({
        text: n,
        options: { bullet: { type: 'bullet' as const, color: 'FFFFFF' }, indentLevel: 0 },
      }));

      slide.addText(nextBullets, {
        x: 7,
        y: 1.7,
        w: 5.83,
        h: 2,
        fontSize: 14,
        fontFace: this.FONTS.body,
        color: this.TEXT.white,
        lineSpacing: 28,
      });
    }

    // References
    if (data.references && Array.isArray(data.references) && data.references.length > 0) {
      slide.addText('참고 자료: ' + data.references.join(', '), {
        x: 0.5,
        y: 6.5,
        w: 12.33,
        h: 0.5,
        fontSize: 11,
        fontFace: this.FONTS.body,
        color: 'A5B4FC',
      });
    }

    if (data.notes) slide.addNotes(data.notes);
  }

  // ============================================
  // Legacy slide types for backward compatibility
  // ============================================

  private addContentSlide(pres: pptxgen, data: PptxSlideData, theme: SectionColors): void {
    const slide = pres.addSlide();
    slide.background = { color: 'FFFFFF' };

    if (data.title) {
      slide.addText(data.title, {
        x: 0.5,
        y: 0.3,
        w: 12.33,
        h: 0.8,
        fontSize: 28,
        fontFace: this.FONTS.title,
        color: theme.primary,
        bold: true,
      });

      slide.addShape(pres.ShapeType.rect, {
        x: 0.5,
        y: 1.1,
        w: 2,
        h: 0.05,
        fill: { color: theme.primary },
      });
    }

    if (data.bullets && Array.isArray(data.bullets) && data.bullets.length > 0) {
      const bulletText = data.bullets.map(bullet => ({
        text: bullet,
        options: { bullet: { type: 'bullet' as const, color: theme.primary }, indentLevel: 0 },
      }));

      slide.addText(bulletText, {
        x: 0.5,
        y: 1.5,
        w: 12.33,
        h: 5.5,
        fontSize: 18,
        fontFace: this.FONTS.body,
        color: this.TEXT.dark,
        valign: 'top',
        lineSpacing: 36,
      });
    }

    if (data.notes) slide.addNotes(data.notes);
  }

  private addTwoColumnSlide(pres: pptxgen, data: PptxSlideData, theme: SectionColors): void {
    const slide = pres.addSlide();
    slide.background = { color: 'FFFFFF' };

    if (data.title) {
      slide.addText(data.title, {
        x: 0.5,
        y: 0.3,
        w: 12.33,
        h: 0.8,
        fontSize: 28,
        fontFace: this.FONTS.title,
        color: theme.primary,
        bold: true,
      });
    }

    if (data.leftColumn && typeof data.leftColumn === 'object') {
      slide.addText(data.leftColumn.header || '', {
        x: 0.5,
        y: 1.5,
        w: 5.9,
        h: 0.6,
        fontSize: 20,
        fontFace: this.FONTS.title,
        color: theme.primary,
        bold: true,
      });

      if (data.leftColumn.items && Array.isArray(data.leftColumn.items) && data.leftColumn.items.length > 0) {
        const leftBullets = data.leftColumn.items.map(item => ({
          text: item || '',
          options: { bullet: { type: 'bullet' as const, color: theme.primary }, indentLevel: 0 },
        }));

        slide.addText(leftBullets, {
          x: 0.5,
          y: 2.2,
          w: 5.9,
          h: 4.8,
          fontSize: 16,
          fontFace: this.FONTS.body,
          color: this.TEXT.dark,
          valign: 'top',
          lineSpacing: 30,
        });
      }
    }

    if (data.rightColumn && typeof data.rightColumn === 'object') {
      slide.addText(data.rightColumn.header || '', {
        x: 6.9,
        y: 1.5,
        w: 5.9,
        h: 0.6,
        fontSize: 20,
        fontFace: this.FONTS.title,
        color: theme.secondary,
        bold: true,
      });

      if (data.rightColumn.items && Array.isArray(data.rightColumn.items) && data.rightColumn.items.length > 0) {
        const rightBullets = data.rightColumn.items.map(item => ({
          text: item || '',
          options: { bullet: { type: 'bullet' as const, color: theme.secondary }, indentLevel: 0 },
        }));

        slide.addText(rightBullets, {
          x: 6.9,
          y: 2.2,
          w: 5.9,
          h: 4.8,
          fontSize: 16,
          fontFace: this.FONTS.body,
          color: this.TEXT.dark,
          valign: 'top',
          lineSpacing: 30,
        });
      }
    }

    // Divider
    slide.addShape(pres.ShapeType.line, {
      x: 6.6,
      y: 1.5,
      w: 0,
      h: 5.5,
      line: { color: 'E5E7EB', width: 1 },
    });

    if (data.notes) slide.addNotes(data.notes);
  }

  private addQuoteSlide(pres: pptxgen, data: PptxSlideData, theme: SectionColors): void {
    const slide = pres.addSlide();
    slide.background = { color: theme.background };

    slide.addText('"', {
      x: 0.5,
      y: 1,
      w: 2,
      h: 1.5,
      fontSize: 120,
      fontFace: 'Georgia',
      color: theme.primary,
      bold: true,
    });

    if (data.quote) {
      slide.addText(data.quote, {
        x: 1.5,
        y: 2.5,
        w: 10.33,
        h: 3,
        fontSize: 26,
        fontFace: 'Georgia',
        color: this.TEXT.dark,
        italic: true,
        align: 'center',
        valign: 'middle',
      });
    }

    if (data.author) {
      slide.addText(`— ${data.author}`, {
        x: 0.5,
        y: 5.8,
        w: 12.33,
        h: 0.6,
        fontSize: 18,
        fontFace: this.FONTS.body,
        color: theme.primary,
        align: 'center',
        bold: true,
      });
    }

    if (data.notes) slide.addNotes(data.notes);
  }

  /**
   * Parse JSON response from AI and extract presentation data
   */
  parseJsonResponse(response: string): PptxPresentationData {
    let jsonString = response.trim();

    // Remove markdown code blocks if present
    const jsonBlockMatch = jsonString.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonBlockMatch) {
      jsonString = jsonBlockMatch[1].trim();
    }

    // Find JSON object boundaries
    const firstBrace = jsonString.indexOf('{');
    const lastBrace = jsonString.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonString = jsonString.substring(firstBrace, lastBrace + 1);
    }

    // Try to fix common JSON issues before parsing
    jsonString = this.sanitizeJsonString(jsonString);

    try {
      const data = JSON.parse(jsonString) as PptxPresentationData;

      if (!data.title) {
        data.title = 'Untitled Presentation';
      }

      if (!data.slides || !Array.isArray(data.slides)) {
        throw new Error('Invalid presentation data: slides array is required');
      }

      // Validate/normalize each slide
      for (let i = 0; i < data.slides.length; i++) {
        if (!data.slides[i].type) {
          data.slides[i].type = 'content';
        }
        // Set default section if not provided
        if (!data.slides[i].section) {
          data.slides[i].section = 'concepts';
        }
      }

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse PPTX JSON data: ${message}`);
    }
  }

  /**
   * Attempt to fix common JSON formatting issues from AI responses
   */
  private sanitizeJsonString(jsonString: string): string {
    // Remove trailing commas before ] or }
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');

    // Fix unquoted property names (common AI mistake)
    // Matches: { propertyName: "value" } -> { "propertyName": "value" }
    jsonString = jsonString.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');

    // Remove any control characters except newline and tab
    jsonString = jsonString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

    // Fix escaped single quotes that should be regular quotes in strings
    // But be careful not to break valid escapes

    return jsonString;
  }

  // ============================================
  // Flexible Mode - Generic Element Rendering
  // ============================================

  /**
   * Generate PPTX from flexible (element-based) JSON data
   */
  async generateFlexiblePptx(data: PptxFlexiblePresentationData): Promise<PptxGenerationResult> {
    const pres = new pptxgen();

    // Set presentation properties
    pres.title = data.title;
    pres.author = data.author || 'StarCloud Studio';
    pres.subject = 'Educational Presentation';
    pres.company = 'StarCloud Studio';

    // Set 16:9 layout
    pres.defineLayout({ name: 'CUSTOM', width: 13.33, height: 7.5 });
    pres.layout = 'CUSTOM';

    // Generate slides
    const slides = data.slides && Array.isArray(data.slides) ? data.slides : [];
    for (const slideData of slides) {
      if (slideData) {
        this.addFlexibleSlide(pres, slideData);
      }
    }

    // Generate PPTX buffer
    const pptxBuffer = await pres.write({ outputType: 'arraybuffer' }) as ArrayBuffer;

    return {
      pptxBuffer,
      title: data.title || 'Presentation',
      slideCount: slides.length,
    };
  }

  /**
   * Add a flexible slide with generic elements
   */
  private addFlexibleSlide(pres: pptxgen, slideData: PptxFlexibleSlideData): void {
    const slide = pres.addSlide();

    // Set background
    const bgColor = slideData.background || 'FFFFFF';
    slide.background = { color: bgColor.replace('#', '') };

    // Render each element
    const elements = slideData.elements && Array.isArray(slideData.elements) ? slideData.elements : [];
    for (const element of elements) {
      if (element) {
        this.renderElement(pres, slide, element);
      }
    }

    // Add notes if provided
    if (slideData.notes) {
      slide.addNotes(slideData.notes);
    }
  }

  /**
   * Dispatch element rendering to specific renderer
   */
  private renderElement(pres: pptxgen, slide: pptxgen.Slide, element: PptxElement): void {
    switch (element.type) {
      case 'text':
        this.renderTextElement(slide, element as PptxTextElement);
        break;
      case 'shape':
        this.renderShapeElement(pres, slide, element as PptxShapeElement);
        break;
      case 'bullets':
        this.renderBulletsElement(slide, element as PptxBulletsElement);
        break;
      case 'table':
        this.renderTableElement(slide, element as PptxTableElement);
        break;
      case 'chart':
        this.renderChartElement(pres, slide, element as PptxChartElement);
        break;
      case 'icon-text':
        this.renderIconTextElement(slide, element as PptxIconTextElement);
        break;
      default:
        console.warn(`Unknown element type: ${(element as PptxElement).type}`);
    }
  }

  /**
   * Render text element
   */
  private renderTextElement(slide: pptxgen.Slide, element: PptxTextElement): void {
    const style = element.style || {};
    slide.addText(element.content || '', {
      x: element.x,
      y: element.y,
      w: element.w,
      h: element.h,
      fontSize: style.fontSize || 16,
      fontFace: style.fontFace || this.FONTS.body,
      color: (style.color || this.TEXT.dark).replace('#', ''),
      bold: style.bold || false,
      italic: style.italic || false,
      align: style.align || 'left',
      valign: style.valign || 'top',
    });
  }

  /**
   * Render shape element
   */
  private renderShapeElement(pres: pptxgen, slide: pptxgen.Slide, element: PptxShapeElement): void {
    let shapeType: pptxgen.SHAPE_NAME;

    switch (element.shape) {
      case 'rect':
        shapeType = pres.ShapeType.rect;
        break;
      case 'ellipse':
        shapeType = pres.ShapeType.ellipse;
        break;
      case 'line':
        shapeType = pres.ShapeType.line;
        break;
      case 'roundRect':
        shapeType = pres.ShapeType.roundRect;
        break;
      default:
        shapeType = pres.ShapeType.rect;
    }

    const shapeOptions: pptxgen.ShapeProps = {
      x: element.x,
      y: element.y,
      w: element.w,
      h: element.h,
    };

    if (element.fill) {
      shapeOptions.fill = { color: element.fill.replace('#', '') };
    }

    if (element.line) {
      shapeOptions.line = {
        color: element.line.replace('#', ''),
        width: element.lineWidth || 1,
      };
    }

    slide.addShape(shapeType, shapeOptions);
  }

  /**
   * Render bullets element
   */
  private renderBulletsElement(slide: pptxgen.Slide, element: PptxBulletsElement): void {
    const items = element.items && Array.isArray(element.items) ? element.items : [];
    if (items.length === 0) return;

    const style = element.style || {};
    const bulletColor = (element.bulletColor || '2563EB').replace('#', '');

    const bulletText = items.map(item => ({
      text: item || '',
      options: { bullet: { type: 'bullet' as const, color: bulletColor }, indentLevel: 0 },
    }));

    slide.addText(bulletText, {
      x: element.x,
      y: element.y,
      w: element.w,
      h: element.h,
      fontSize: style.fontSize || 14,
      fontFace: style.fontFace || this.FONTS.body,
      color: (style.color || this.TEXT.dark).replace('#', ''),
      valign: style.valign || 'top',
      lineSpacing: 28,
    });
  }

  /**
   * Render table element
   */
  private renderTableElement(slide: pptxgen.Slide, element: PptxTableElement): void {
    const headers = element.headers && Array.isArray(element.headers) ? element.headers : [];
    const rows = element.rows && Array.isArray(element.rows) ? element.rows : [];

    if (headers.length === 0 && rows.length === 0) return;

    const headerBgColor = (element.headerBgColor || '2563EB').replace('#', '');
    const headerColor = (element.headerColor || 'FFFFFF').replace('#', '');

    const tableRows: pptxgen.TableRow[] = [];

    // Header row
    if (headers.length > 0) {
      tableRows.push(headers.map(h => ({
        text: h || '',
        options: {
          fill: { color: headerBgColor },
          color: headerColor,
          bold: true,
          align: 'center' as const,
          valign: 'middle' as const,
        }
      })));
    }

    // Data rows
    rows.forEach((row, idx) => {
      if (!Array.isArray(row)) return;
      const bgColor = idx % 2 === 0 ? 'FFFFFF' : 'F9FAFB';
      tableRows.push(row.map((cell, cellIdx) => ({
        text: cell || '',
        options: {
          fill: { color: bgColor },
          color: this.TEXT.dark,
          align: cellIdx === 0 ? 'left' as const : 'center' as const,
          valign: 'middle' as const,
        }
      })));
    });

    if (tableRows.length === 0) return;

    const colCount = headers.length || (rows[0]?.length || 1);
    const colW = element.w / colCount;

    slide.addTable(tableRows, {
      x: element.x,
      y: element.y,
      w: element.w,
      colW: Array(colCount).fill(colW),
      fontFace: this.FONTS.body,
      fontSize: 14,
      border: { type: 'solid', pt: 0.5, color: 'E5E7EB' },
      rowH: 0.55,
    });
  }

  /**
   * Render chart element
   */
  private renderChartElement(pres: pptxgen, slide: pptxgen.Slide, element: PptxChartElement): void {
    const labels = element.labels && Array.isArray(element.labels) ? element.labels : [];
    const values = element.values && Array.isArray(element.values) ? element.values : [];

    if (labels.length === 0 || values.length === 0) return;

    const chartData = [{
      name: 'Data',
      labels: labels,
      values: values,
    }];

    const defaultColors = ['2563EB', '3B82F6', '1D4ED8', '94A3B8', 'CBD5E1'];
    const chartColors = element.colors && Array.isArray(element.colors)
      ? element.colors.map(c => c.replace('#', ''))
      : defaultColors;

    let chartType: pptxgen.CHART_NAME;
    switch (element.chartType) {
      case 'bar':
        chartType = pres.ChartType.bar;
        break;
      case 'pie':
        chartType = pres.ChartType.pie;
        break;
      case 'line':
        chartType = pres.ChartType.line;
        break;
      case 'doughnut':
        chartType = pres.ChartType.doughnut;
        break;
      default:
        chartType = pres.ChartType.bar;
    }

    slide.addChart(chartType, chartData, {
      x: element.x,
      y: element.y,
      w: element.w,
      h: element.h,
      chartColors: chartColors,
      showLegend: true,
      legendPos: 'b',
      showValue: true,
      dataLabelPosition: 'outEnd',
    });
  }

  /**
   * Render icon-text element (emoji + text)
   */
  private renderIconTextElement(slide: pptxgen.Slide, element: PptxIconTextElement): void {
    const style = element.style || {};
    const content = `${element.icon || ''} ${element.text || ''}`.trim();

    slide.addText(content, {
      x: element.x,
      y: element.y,
      w: element.w,
      h: element.h,
      fontSize: style.fontSize || 14,
      fontFace: style.fontFace || this.FONTS.body,
      color: (style.color || this.TEXT.dark).replace('#', ''),
      bold: style.bold || false,
      align: style.align || 'left',
      valign: style.valign || 'middle',
    });
  }

  /**
   * Parse JSON response from AI for flexible mode
   */
  parseFlexibleJsonResponse(response: string): PptxFlexiblePresentationData {
    let jsonString = response.trim();

    // Remove markdown code blocks if present
    const jsonBlockMatch = jsonString.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonBlockMatch) {
      jsonString = jsonBlockMatch[1].trim();
    }

    // Find JSON object boundaries
    const firstBrace = jsonString.indexOf('{');
    const lastBrace = jsonString.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonString = jsonString.substring(firstBrace, lastBrace + 1);
    }

    // Sanitize JSON
    jsonString = this.sanitizeJsonString(jsonString);

    try {
      const data = JSON.parse(jsonString) as PptxFlexiblePresentationData;

      if (!data.title) {
        data.title = 'Untitled Presentation';
      }

      if (!data.slides || !Array.isArray(data.slides)) {
        throw new Error('Invalid presentation data: slides array is required');
      }

      // Validate each slide has elements array
      for (let i = 0; i < data.slides.length; i++) {
        if (!data.slides[i].elements) {
          data.slides[i].elements = [];
        }
        if (!Array.isArray(data.slides[i].elements)) {
          data.slides[i].elements = [];
        }
      }

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse Flexible PPTX JSON data: ${message}`);
    }
  }
}
