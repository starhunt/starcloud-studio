/**
 * PPTX Generation Service
 * Converts structured JSON data to PowerPoint presentations using PptxGenJS
 */
import pptxgen from 'pptxgenjs';
import { PptxPresentationData, PptxSlideData, PptxGenerationResult } from '../types';

export class PptxService {
  // Default theme colors
  private readonly THEME = {
    primary: '2563EB',      // Blue
    secondary: '7C3AED',    // Purple
    background: 'FFFFFF',   // White
    text: '1F2937',         // Dark gray
    textLight: '6B7280',    // Light gray
    accent: '059669',       // Green
  };

  // Default fonts
  private readonly FONTS = {
    title: 'Arial',
    body: 'Arial',
  };

  /**
   * Generate PPTX from structured JSON data
   */
  async generatePptx(data: PptxPresentationData): Promise<PptxGenerationResult> {
    const pres = new pptxgen();

    // Set presentation properties
    pres.title = data.title;
    pres.author = data.author || 'NanoBanana Cloud';
    pres.subject = data.subject || 'Generated Presentation';
    pres.company = 'NanoBanana Cloud';

    // Apply default theme
    this.applyDefaultTheme(pres);

    // Generate slides
    for (const slideData of data.slides) {
      this.addSlide(pres, slideData);
    }

    // Generate PPTX buffer
    const pptxBuffer = await pres.write({ outputType: 'arraybuffer' }) as ArrayBuffer;

    return {
      pptxBuffer,
      title: data.title,
      slideCount: data.slides.length,
    };
  }

  /**
   * Apply default theme to presentation
   */
  private applyDefaultTheme(pres: pptxgen): void {
    // Set default layout (16:9)
    pres.defineLayout({ name: 'CUSTOM', width: 13.33, height: 7.5 });
    pres.layout = 'CUSTOM';
  }

  /**
   * Add a slide based on its type
   */
  private addSlide(pres: pptxgen, slideData: PptxSlideData): void {
    switch (slideData.type) {
      case 'title':
        this.addTitleSlide(pres, slideData);
        break;
      case 'content':
        this.addContentSlide(pres, slideData);
        break;
      case 'two-column':
        this.addTwoColumnSlide(pres, slideData);
        break;
      case 'section':
        this.addSectionSlide(pres, slideData);
        break;
      case 'image':
        this.addImageSlide(pres, slideData);
        break;
      case 'quote':
        this.addQuoteSlide(pres, slideData);
        break;
      default:
        // Fallback to content slide
        this.addContentSlide(pres, slideData);
    }
  }

  /**
   * Add title slide (first slide with main title and subtitle)
   */
  private addTitleSlide(pres: pptxgen, slideData: PptxSlideData): void {
    const slide = pres.addSlide();

    // Background gradient
    slide.background = {
      color: this.THEME.primary,
    };

    // Main title
    if (slideData.title) {
      slide.addText(slideData.title, {
        x: 0.5,
        y: 2.5,
        w: 12.33,
        h: 1.5,
        fontSize: 44,
        fontFace: this.FONTS.title,
        color: 'FFFFFF',
        bold: true,
        align: 'center',
        valign: 'middle',
      });
    }

    // Subtitle
    if (slideData.subtitle) {
      slide.addText(slideData.subtitle, {
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

    // Add speaker notes
    if (slideData.notes) {
      slide.addNotes(slideData.notes);
    }
  }

  /**
   * Add content slide with title and bullet points
   */
  private addContentSlide(pres: pptxgen, slideData: PptxSlideData): void {
    const slide = pres.addSlide();

    // White background
    slide.background = { color: this.THEME.background };

    // Title
    if (slideData.title) {
      slide.addText(slideData.title, {
        x: 0.5,
        y: 0.3,
        w: 12.33,
        h: 0.8,
        fontSize: 32,
        fontFace: this.FONTS.title,
        color: this.THEME.primary,
        bold: true,
      });

      // Title underline
      slide.addShape(pres.ShapeType.rect, {
        x: 0.5,
        y: 1.1,
        w: 2,
        h: 0.05,
        fill: { color: this.THEME.primary },
      });
    }

    // Bullet points
    if (slideData.bullets && slideData.bullets.length > 0) {
      const bulletText = slideData.bullets.map(bullet => ({
        text: bullet,
        options: {
          bullet: { type: 'bullet' as const, color: this.THEME.primary },
          indentLevel: 0,
        },
      }));

      slide.addText(bulletText, {
        x: 0.5,
        y: 1.5,
        w: 12.33,
        h: 5.5,
        fontSize: 20,
        fontFace: this.FONTS.body,
        color: this.THEME.text,
        valign: 'top',
        lineSpacing: 36,
      });
    }

    // Add speaker notes
    if (slideData.notes) {
      slide.addNotes(slideData.notes);
    }
  }

  /**
   * Add two-column comparison slide
   */
  private addTwoColumnSlide(pres: pptxgen, slideData: PptxSlideData): void {
    const slide = pres.addSlide();

    // White background
    slide.background = { color: this.THEME.background };

    // Title
    if (slideData.title) {
      slide.addText(slideData.title, {
        x: 0.5,
        y: 0.3,
        w: 12.33,
        h: 0.8,
        fontSize: 32,
        fontFace: this.FONTS.title,
        color: this.THEME.primary,
        bold: true,
      });

      // Title underline
      slide.addShape(pres.ShapeType.rect, {
        x: 0.5,
        y: 1.1,
        w: 2,
        h: 0.05,
        fill: { color: this.THEME.primary },
      });
    }

    // Left column
    if (slideData.leftColumn) {
      // Left header
      slide.addText(slideData.leftColumn.header, {
        x: 0.5,
        y: 1.5,
        w: 5.9,
        h: 0.6,
        fontSize: 22,
        fontFace: this.FONTS.title,
        color: this.THEME.primary,
        bold: true,
      });

      // Left items
      if (slideData.leftColumn.items && slideData.leftColumn.items.length > 0) {
        const leftBullets = slideData.leftColumn.items.map(item => ({
          text: item,
          options: {
            bullet: { type: 'bullet' as const, color: this.THEME.primary },
            indentLevel: 0,
          },
        }));

        slide.addText(leftBullets, {
          x: 0.5,
          y: 2.2,
          w: 5.9,
          h: 4.8,
          fontSize: 18,
          fontFace: this.FONTS.body,
          color: this.THEME.text,
          valign: 'top',
          lineSpacing: 32,
        });
      }
    }

    // Right column
    if (slideData.rightColumn) {
      // Right header
      slide.addText(slideData.rightColumn.header, {
        x: 6.9,
        y: 1.5,
        w: 5.9,
        h: 0.6,
        fontSize: 22,
        fontFace: this.FONTS.title,
        color: this.THEME.secondary,
        bold: true,
      });

      // Right items
      if (slideData.rightColumn.items && slideData.rightColumn.items.length > 0) {
        const rightBullets = slideData.rightColumn.items.map(item => ({
          text: item,
          options: {
            bullet: { type: 'bullet' as const, color: this.THEME.secondary },
            indentLevel: 0,
          },
        }));

        slide.addText(rightBullets, {
          x: 6.9,
          y: 2.2,
          w: 5.9,
          h: 4.8,
          fontSize: 18,
          fontFace: this.FONTS.body,
          color: this.THEME.text,
          valign: 'top',
          lineSpacing: 32,
        });
      }
    }

    // Center divider line
    slide.addShape(pres.ShapeType.line, {
      x: 6.6,
      y: 1.5,
      w: 0,
      h: 5.5,
      line: { color: 'E5E7EB', width: 1 },
    });

    // Add speaker notes
    if (slideData.notes) {
      slide.addNotes(slideData.notes);
    }
  }

  /**
   * Add section divider slide
   */
  private addSectionSlide(pres: pptxgen, slideData: PptxSlideData): void {
    const slide = pres.addSlide();

    // Gradient-like background (using secondary color)
    slide.background = { color: this.THEME.secondary };

    // Section title
    if (slideData.title) {
      slide.addText(slideData.title, {
        x: 0.5,
        y: 3,
        w: 12.33,
        h: 1.5,
        fontSize: 40,
        fontFace: this.FONTS.title,
        color: 'FFFFFF',
        bold: true,
        align: 'center',
        valign: 'middle',
      });
    }

    // Subtitle (if provided)
    if (slideData.subtitle) {
      slide.addText(slideData.subtitle, {
        x: 0.5,
        y: 4.5,
        w: 12.33,
        h: 0.8,
        fontSize: 20,
        fontFace: this.FONTS.body,
        color: 'E9D5FF',
        align: 'center',
        valign: 'middle',
      });
    }

    // Add speaker notes
    if (slideData.notes) {
      slide.addNotes(slideData.notes);
    }
  }

  /**
   * Add image slide
   */
  private addImageSlide(pres: pptxgen, slideData: PptxSlideData): void {
    const slide = pres.addSlide();

    // White background
    slide.background = { color: this.THEME.background };

    // Title
    if (slideData.title) {
      slide.addText(slideData.title, {
        x: 0.5,
        y: 0.3,
        w: 12.33,
        h: 0.8,
        fontSize: 28,
        fontFace: this.FONTS.title,
        color: this.THEME.primary,
        bold: true,
        align: 'center',
      });
    }

    // Image placeholder (since we can't embed external URLs directly in most cases)
    if (slideData.imageUrl) {
      // Add a placeholder with the URL as text
      slide.addText(`[Image: ${slideData.imageUrl}]`, {
        x: 1,
        y: 1.5,
        w: 11.33,
        h: 4.5,
        fontSize: 14,
        fontFace: this.FONTS.body,
        color: this.THEME.textLight,
        align: 'center',
        valign: 'middle',
        fill: { color: 'F3F4F6' },
      });
    }

    // Caption
    if (slideData.caption) {
      slide.addText(slideData.caption, {
        x: 0.5,
        y: 6.2,
        w: 12.33,
        h: 0.6,
        fontSize: 16,
        fontFace: this.FONTS.body,
        color: this.THEME.textLight,
        align: 'center',
        italic: true,
      });
    }

    // Add speaker notes
    if (slideData.notes) {
      slide.addNotes(slideData.notes);
    }
  }

  /**
   * Add quote slide
   */
  private addQuoteSlide(pres: pptxgen, slideData: PptxSlideData): void {
    const slide = pres.addSlide();

    // Light background
    slide.background = { color: 'F9FAFB' };

    // Large quotation mark
    slide.addText('"', {
      x: 0.5,
      y: 1,
      w: 2,
      h: 1.5,
      fontSize: 120,
      fontFace: 'Georgia',
      color: this.THEME.primary,
      bold: true,
    });

    // Quote text
    if (slideData.quote) {
      slide.addText(slideData.quote, {
        x: 1.5,
        y: 2.5,
        w: 10.33,
        h: 3,
        fontSize: 28,
        fontFace: 'Georgia',
        color: this.THEME.text,
        italic: true,
        align: 'center',
        valign: 'middle',
      });
    }

    // Author
    if (slideData.author) {
      slide.addText(`— ${slideData.author}`, {
        x: 0.5,
        y: 5.8,
        w: 12.33,
        h: 0.6,
        fontSize: 20,
        fontFace: this.FONTS.body,
        color: this.THEME.primary,
        align: 'center',
        bold: true,
      });
    }

    // Add speaker notes
    if (slideData.notes) {
      slide.addNotes(slideData.notes);
    }
  }

  /**
   * Parse JSON response from AI and extract presentation data
   */
  parseJsonResponse(response: string): PptxPresentationData {
    // Remove markdown code blocks if present
    let jsonString = response.trim();

    // Handle ```json ... ``` format
    const jsonBlockMatch = jsonString.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonBlockMatch) {
      jsonString = jsonBlockMatch[1].trim();
    }

    // Try to find JSON object boundaries
    const firstBrace = jsonString.indexOf('{');
    const lastBrace = jsonString.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonString = jsonString.substring(firstBrace, lastBrace + 1);
    }

    try {
      const data = JSON.parse(jsonString) as PptxPresentationData;

      // Validate required fields
      if (!data.title) {
        data.title = 'Untitled Presentation';
      }

      if (!data.slides || !Array.isArray(data.slides)) {
        throw new Error('Invalid presentation data: slides array is required');
      }

      // Validate each slide has a type
      for (let i = 0; i < data.slides.length; i++) {
        if (!data.slides[i].type) {
          data.slides[i].type = 'content';
        }
      }

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse PPTX JSON data: ${message}`);
    }
  }
}
