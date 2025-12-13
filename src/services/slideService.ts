import { requestUrl } from 'obsidian';
import {
  AIProvider,
  SlideGenerationResult,
  GenerationError,
  GenerationErrorClass,
  PROVIDER_CONFIGS,
  PptxPresentationData,
  PptxFlexiblePresentationData
} from '../types';

export class SlideService {
  /**
   * Generate an HTML slide from content using the specified AI provider
   */
  async generateSlide(
    content: string,
    provider: AIProvider,
    model: string,
    apiKey: string,
    systemPrompt: string
  ): Promise<SlideGenerationResult> {
    if (!apiKey) {
      throw this.createError('INVALID_API_KEY', `${PROVIDER_CONFIGS[provider].name} API key is not configured`);
    }

    if (!content.trim()) {
      throw this.createError('NO_CONTENT', 'Content is empty');
    }

    try {
      const response = await this.callProvider(provider, model, apiKey, content, systemPrompt);

      // Extract HTML from response (handles markdown code blocks)
      const htmlContent = this.extractHtmlFromResponse(response);

      // Extract title from HTML or generate one
      const title = this.extractTitleFromHtml(htmlContent) || this.generateTitle(content);

      return {
        htmlContent,
        model,
        provider,
        title
      };
    } catch (error) {
      if (error instanceof GenerationErrorClass) {
        throw error;
      }
      throw this.handleApiError(error, provider);
    }
  }

  /**
   * Generate PPTX slide data (JSON) from content using the specified AI provider
   */
  async generatePptxSlideData(
    content: string,
    provider: AIProvider,
    model: string,
    apiKey: string,
    systemPrompt: string
  ): Promise<PptxPresentationData> {
    if (!apiKey) {
      throw this.createError('INVALID_API_KEY', `${PROVIDER_CONFIGS[provider].name} API key is not configured`);
    }

    if (!content.trim()) {
      throw this.createError('NO_CONTENT', 'Content is empty');
    }

    try {
      const response = await this.callProviderForPptx(provider, model, apiKey, content, systemPrompt);

      // Extract JSON from response
      const presentationData = this.extractJsonFromResponse(response);

      return presentationData;
    } catch (error) {
      if (error instanceof GenerationErrorClass) {
        throw error;
      }
      throw this.handleApiError(error, provider);
    }
  }

  /**
   * Generate Flexible PPTX slide data (element-based JSON) from content
   */
  async generateFlexiblePptxSlideData(
    content: string,
    provider: AIProvider,
    model: string,
    apiKey: string,
    systemPrompt: string
  ): Promise<PptxFlexiblePresentationData> {
    if (!apiKey) {
      throw this.createError('INVALID_API_KEY', `${PROVIDER_CONFIGS[provider].name} API key is not configured`);
    }

    if (!content.trim()) {
      throw this.createError('NO_CONTENT', 'Content is empty');
    }

    try {
      const response = await this.callProviderForPptx(provider, model, apiKey, content, systemPrompt);

      // Extract and parse flexible JSON from response
      const presentationData = this.extractFlexibleJsonFromResponse(response);

      return presentationData;
    } catch (error) {
      if (error instanceof GenerationErrorClass) {
        throw error;
      }
      throw this.handleApiError(error, provider);
    }
  }

  /**
   * Extract and parse flexible PPTX JSON data from AI response
   */
  private extractFlexibleJsonFromResponse(response: string): PptxFlexiblePresentationData {
    let jsonString = response.trim();

    // Remove markdown code blocks if present
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
      const data = JSON.parse(jsonString) as PptxFlexiblePresentationData;

      // Validate required fields
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
      throw this.createError('GENERATION_FAILED', `Failed to parse Flexible PPTX JSON data: ${message}`);
    }
  }

  /**
   * Call provider for PPTX JSON generation
   */
  private async callProviderForPptx(
    provider: AIProvider,
    model: string,
    apiKey: string,
    content: string,
    systemPrompt: string
  ): Promise<string> {
    const userMessage = `다음 콘텐츠를 분석하여 PowerPoint 프레젠테이션용 JSON 데이터를 생성해주세요:\n\n${content}`;
    return this.callProvider(provider, model, apiKey, userMessage, systemPrompt);
  }

  /**
   * Extract and parse JSON presentation data from AI response
   */
  private extractJsonFromResponse(response: string): PptxPresentationData {
    let jsonString = response.trim();

    // Remove markdown code blocks if present
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
      throw this.createError('GENERATION_FAILED', `Failed to parse PPTX JSON data: ${message}`);
    }
  }

  private async callProvider(
    provider: AIProvider,
    model: string,
    apiKey: string,
    content: string,
    systemPrompt: string
  ): Promise<string> {
    switch (provider) {
      case 'openai':
        return this.callOpenAI(model, apiKey, content, systemPrompt);
      case 'google':
        return this.callGoogle(model, apiKey, content, systemPrompt);
      case 'anthropic':
        return this.callAnthropic(model, apiKey, content, systemPrompt);
      case 'xai':
        return this.callXAI(model, apiKey, content, systemPrompt);
      case 'glm':
        return this.callGLM(model, apiKey, content, systemPrompt);
      default: {
        const unknownProvider: never = provider;
        throw this.createError('UNKNOWN', `Unknown provider: ${String(unknownProvider)}`);
      }
    }
  }

  private async callOpenAI(model: string, apiKey: string, content: string, systemPrompt: string): Promise<string> {
    const response = await requestUrl({
      url: 'https://api.openai.com/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please create an interactive HTML slide based on the following content:\n\n${content}` }
        ],
        max_tokens: 64000,
        temperature: 0.7
      })
    });

    if (response.status !== 200) {
      throw this.handleHttpError(response.status, response.text, 'openai');
    }

    const data = response.json;
    return data.choices[0]?.message?.content?.trim() || '';
  }

  private async callGoogle(model: string, apiKey: string, content: string, systemPrompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await requestUrl({
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [{
          role: 'user',
          parts: [{
            text: `Please create an interactive HTML slide based on the following content:\n\n${content}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 65536  // Higher limit for HTML output
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
        ]
      })
    });

    if (response.status !== 200) {
      throw this.handleHttpError(response.status, response.text, 'google');
    }

    const data = response.json;
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    if (!generatedText) {
      console.error('Gemini API response:', JSON.stringify(data, null, 2));
      const safetyRatings = data.candidates?.[0]?.safetyRatings;
      if (safetyRatings) {
        console.error('Safety Ratings:', JSON.stringify(safetyRatings, null, 2));
      }
      throw this.createError('GENERATION_FAILED', 'Gemini API returned empty response. Check console for details.');
    }

    return generatedText;
  }

  private async callAnthropic(model: string, apiKey: string, content: string, systemPrompt: string): Promise<string> {
    const response = await requestUrl({
      url: 'https://api.anthropic.com/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 64000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: `Please create an interactive HTML slide based on the following content:\n\n${content}` }
        ]
      })
    });

    if (response.status !== 200) {
      throw this.handleHttpError(response.status, response.text, 'anthropic');
    }

    const data = response.json;
    return data.content?.[0]?.text?.trim() || '';
  }

  private async callXAI(model: string, apiKey: string, content: string, systemPrompt: string): Promise<string> {
    const response = await requestUrl({
      url: 'https://api.x.ai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please create an interactive HTML slide based on the following content:\n\n${content}` }
        ],
        max_tokens: 64000,
        temperature: 0.7
      })
    });

    if (response.status !== 200) {
      throw this.handleHttpError(response.status, response.text, 'xai');
    }

    const data = response.json;
    return data.choices[0]?.message?.content?.trim() || '';
  }

  private async callGLM(model: string, apiKey: string, content: string, systemPrompt: string): Promise<string> {
    const response = await requestUrl({
      url: 'https://api.z.ai/api/coding/paas/v4/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please create an interactive HTML slide based on the following content:\n\n${content}` }
        ],
        max_tokens: 64000,
        temperature: 0.7
      })
    });

    if (response.status !== 200) {
      throw this.handleHttpError(response.status, response.text, 'glm');
    }

    const data = response.json;
    return data.choices[0]?.message?.content?.trim() || '';
  }

  /**
   * Extract HTML content from AI response
   * Handles cases where response might include markdown code blocks
   */
  private extractHtmlFromResponse(response: string): string {
    // Check if response is wrapped in markdown code block (```html or ```)
    const htmlBlockMatch = response.match(/```html\n?([\s\S]*?)\n?```/);
    if (htmlBlockMatch) {
      return htmlBlockMatch[1].trim();
    }

    // Check for generic code block
    const codeBlockMatch = response.match(/```\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      const content = codeBlockMatch[1].trim();
      // Only use if it looks like HTML
      if (content.startsWith('<!DOCTYPE') || content.startsWith('<html') || content.startsWith('<')) {
        return content;
      }
    }

    // Check if response starts with <!DOCTYPE or <html
    if (response.trim().startsWith('<!DOCTYPE') || response.trim().startsWith('<html')) {
      return response.trim();
    }

    // Return as-is if no extraction needed
    return response.trim();
  }

  /**
   * Extract title from HTML <title> tag or first <h1>
   */
  private extractTitleFromHtml(html: string): string | null {
    // Try <title> tag
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    if (titleMatch) {
      return this.cleanTitle(titleMatch[1]);
    }

    // Try first <h1>
    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (h1Match) {
      // Strip HTML tags from h1 content
      return this.cleanTitle(h1Match[1].replace(/<[^>]*>/g, ''));
    }

    return null;
  }

  /**
   * Generate a title from content (first line or first N words)
   * Returns English-only title, max 20 characters
   */
  private generateTitle(content: string): string {
    const firstLine = content.split('\n')[0].trim();
    // Remove markdown headers
    const cleaned = firstLine.replace(/^#+\s*/, '');
    return this.sanitizeTitleForFilename(cleaned) || 'untitled-slide';
  }

  /**
   * Clean and sanitize title for use in filenames
   * Returns English-only title, max 20 characters
   */
  private cleanTitle(title: string): string {
    return this.sanitizeTitleForFilename(title.trim()) || 'untitled-slide';
  }

  /**
   * Sanitize title for use in filename
   * English-only, max 20 characters
   */
  private sanitizeTitleForFilename(title: string): string {
    // Extract only English letters, numbers, and spaces
    const englishOnly = title
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Keep only English alphanumeric, spaces, hyphens
      .trim();

    // If no English characters found, generate a generic name
    if (!englishOnly) {
      return 'slide-' + Date.now().toString(36).substring(0, 8);
    }

    return englishOnly
      .toLowerCase()
      .replace(/\s+/g, '-')  // Replace spaces with hyphens
      .replace(/-+/g, '-')   // Remove consecutive hyphens
      .substring(0, 20)      // Limit to 20 characters
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      || 'untitled';
  }

  private handleHttpError(status: number, responseText: string, provider: AIProvider): GenerationErrorClass {
    if (status === 401 || status === 403) {
      return this.createError('INVALID_API_KEY', `Invalid ${PROVIDER_CONFIGS[provider].name} API key`);
    }
    if (status === 429) {
      return this.createError('RATE_LIMIT', 'API rate limit exceeded. Please wait a few minutes and try again.', false);
    }
    if (status === 400) {
      // Check for content filtering
      if (responseText.includes('SAFETY') || responseText.includes('blocked')) {
        return this.createError('CONTENT_FILTERED', 'Content was blocked by safety filters. Please modify your content.');
      }
      return this.createError('GENERATION_FAILED', `Bad request: ${responseText}`);
    }
    if (status >= 500) {
      return this.createError('NETWORK_ERROR', 'Server error. Please try again later.', true);
    }
    return this.createError('GENERATION_FAILED', `API error (${status}): ${responseText}`);
  }

  private handleApiError(error: unknown, provider: AIProvider): GenerationErrorClass {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('status 429') || errorMessage.includes('429')) {
      return this.createError('RATE_LIMIT', 'API rate limit exceeded. Please wait a few minutes and try again.', false);
    }

    if (errorMessage.includes('status 401') || errorMessage.includes('status 403')) {
      return this.createError('INVALID_API_KEY', `Invalid ${PROVIDER_CONFIGS[provider].name} API key`);
    }

    if (errorMessage.includes('net::') || errorMessage.includes('network')) {
      return this.createError('NETWORK_ERROR', 'Network connection error. Check your internet connection.', true);
    }

    return this.createError('GENERATION_FAILED', `${PROVIDER_CONFIGS[provider].name} error: ${errorMessage}`);
  }

  private createError(type: GenerationError['type'], message: string, retryable = false): GenerationErrorClass {
    return new GenerationErrorClass(type, message, retryable);
  }
}
