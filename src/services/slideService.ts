import { requestUrl } from 'obsidian';
import {
  AIProvider,
  AIApiFormat,
  AIAuthType,
  SlideGenerationResult,
  GenerationError,
  GenerationErrorClass,
  PROVIDER_CONFIGS,
  PptxPresentationData,
  PptxFlexiblePresentationData
} from '../types';

/** 동적 프로바이더 정보 (main.ts에서 전달) */
export interface ProviderInfo {
  baseUrl: string;
  apiFormat: AIApiFormat;
  authType: AIAuthType;
}

export class SlideService {
  private maxOutputTokens: number = 65536;

  /**
   * Set max output tokens for API calls
   */
  setMaxOutputTokens(tokens: number): void {
    this.maxOutputTokens = tokens;
  }

  /**
   * Generate an HTML slide from content using the specified AI provider
   */
  async generateSlide(
    content: string,
    provider: AIProvider,
    model: string,
    apiKey: string,
    systemPrompt: string,
    providerInfo?: ProviderInfo
  ): Promise<SlideGenerationResult> {
    if (!apiKey) {
      const providerName = PROVIDER_CONFIGS[provider]?.name || provider;
      throw this.createError('INVALID_API_KEY', `${providerName} API key is not configured`);
    }

    if (!content.trim()) {
      throw this.createError('NO_CONTENT', 'Content is empty');
    }

    try {
      const response = await this.callProvider(provider, model, apiKey, content, systemPrompt, providerInfo);

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
    systemPrompt: string,
    providerInfo?: ProviderInfo
  ): Promise<PptxPresentationData> {
    if (!apiKey) {
      const providerName = PROVIDER_CONFIGS[provider]?.name || provider;
      throw this.createError('INVALID_API_KEY', `${providerName} API key is not configured`);
    }

    if (!content.trim()) {
      throw this.createError('NO_CONTENT', 'Content is empty');
    }

    try {
      const response = await this.callProviderForPptx(provider, model, apiKey, content, systemPrompt, providerInfo);

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
    systemPrompt: string,
    providerInfo?: ProviderInfo
  ): Promise<PptxFlexiblePresentationData> {
    if (!apiKey) {
      const providerName = PROVIDER_CONFIGS[provider]?.name || provider;
      throw this.createError('INVALID_API_KEY', `${providerName} API key is not configured`);
    }

    if (!content.trim()) {
      throw this.createError('NO_CONTENT', 'Content is empty');
    }

    try {
      const response = await this.callProviderForPptx(provider, model, apiKey, content, systemPrompt, providerInfo);

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

    // JSON 문자열 리터럴 내부의 제어 문자를 이스케이프 처리
    // "..." 안의 raw 줄바꿈/탭/제어문자를 \\n, \\t 등으로 변환
    jsonString = this.sanitizeJsonControlChars(jsonString);

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
    systemPrompt: string,
    providerInfo?: ProviderInfo
  ): Promise<string> {
    const userMessage = `다음 콘텐츠를 분석하여 PowerPoint 프레젠테이션용 JSON 데이터를 생성해주세요:\n\n${content}`;
    return this.callProvider(provider, model, apiKey, userMessage, systemPrompt, providerInfo);
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

    // eslint-disable-next-line no-control-regex
    jsonString = jsonString.replace(/[\x00-\x1F\x7F]/g, (ch) => {
      if (ch === '\n' || ch === '\r' || ch === '\t') return ch;
      return '';
    });

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
    systemPrompt: string,
    providerInfo?: ProviderInfo
  ): Promise<string> {
    // 동적 프로바이더 정보가 있으면 apiFormat 기반으로 라우팅
    if (providerInfo) {
      return this.callByApiFormat(providerInfo, model, apiKey, content, systemPrompt, provider);
    }

    // 레거시 폴백: 빌트인 프로바이더 ID 기반
    switch (provider) {
      case 'openai':
      case 'xai':
      case 'glm': {
        const urls: Record<string, string> = {
          openai: 'https://api.openai.com/v1/chat/completions',
          xai: 'https://api.x.ai/v1/chat/completions',
          glm: 'https://api.z.ai/api/coding/paas/v4/chat/completions',
        };
        return this.callOpenAICompatible(urls[provider], model, apiKey, content, systemPrompt, provider);
      }
      case 'google':
        return this.callGemini('https://generativelanguage.googleapis.com/v1beta/models', model, apiKey, content, systemPrompt);
      case 'anthropic':
        return this.callAnthropicApi('https://api.anthropic.com/v1/messages', model, apiKey, content, systemPrompt);
      default:
        throw this.createError('UNKNOWN', `Unknown provider: ${provider}. Please update slide settings.`);
    }
  }

  /**
   * apiFormat 기반 API 호출 라우팅
   */
  private async callByApiFormat(
    info: ProviderInfo,
    model: string,
    apiKey: string,
    content: string,
    systemPrompt: string,
    providerLabel: string
  ): Promise<string> {
    switch (info.apiFormat) {
      case 'openai':
        return this.callOpenAICompatible(info.baseUrl, model, apiKey, content, systemPrompt, providerLabel);
      case 'gemini':
        return this.callGemini(info.baseUrl, model, apiKey, content, systemPrompt);
      case 'anthropic':
        return this.callAnthropicApi(info.baseUrl, model, apiKey, content, systemPrompt);
      default:
        throw this.createError('UNKNOWN', `Unknown API format: ${info.apiFormat}`);
    }
  }

  private async callOpenAICompatible(
    baseUrl: string, model: string, apiKey: string, content: string, systemPrompt: string, providerLabel: string
  ): Promise<string> {
    // baseUrl이 /chat/completions를 포함하지 않으면 추가
    const url = baseUrl.includes('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
    const response = await requestUrl({
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content }
        ],
        max_tokens: this.maxOutputTokens,
        temperature: 0.7
      })
    });

    if (response.status !== 200) {
      throw this.handleHttpError(response.status, response.text, providerLabel);
    }

    const data = response.json;
    return data.choices[0]?.message?.content?.trim() || '';
  }

  private async callGemini(
    baseUrl: string, model: string, apiKey: string, content: string, systemPrompt: string
  ): Promise<string> {
    const url = `${baseUrl}/${model}:generateContent?key=${apiKey}`;
    const response = await requestUrl({
      url,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: content }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: this.maxOutputTokens },
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
      throw this.createError('GENERATION_FAILED', 'Gemini API returned empty response. Check console for details.');
    }

    return generatedText;
  }

  private async callAnthropicApi(
    baseUrl: string, model: string, apiKey: string, content: string, systemPrompt: string
  ): Promise<string> {
    // baseUrl이 /messages를 포함하지 않으면 추가
    const url = baseUrl.includes('/messages') ? baseUrl : `${baseUrl}/messages`;
    const response = await requestUrl({
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: this.maxOutputTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content }]
      })
    });

    if (response.status !== 200) {
      throw this.handleHttpError(response.status, response.text, 'anthropic');
    }

    const data = response.json;
    return data.content?.[0]?.text?.trim() || '';
  }

  /**
   * JSON 문자열 리터럴 내부의 제어 문자를 이스케이프 처리
   * "..." 안의 raw \n, \r, \t 등을 \\n, \\r, \\t로 변환
   */
  private sanitizeJsonControlChars(json: string): string {
    // JSON 문자열 리터럴("..." 내부)에서 이스케이프 안 된 제어 문자를 처리
    // 상태 머신: 따옴표 안/밖 추적
    let result = '';
    let inString = false;
    let escaped = false;

    for (let i = 0; i < json.length; i++) {
      const ch = json[i];

      if (escaped) {
        result += ch;
        escaped = false;
        continue;
      }

      if (ch === '\\' && inString) {
        result += ch;
        escaped = true;
        continue;
      }

      if (ch === '"') {
        inString = !inString;
        result += ch;
        continue;
      }

      if (inString) {
        const code = ch.charCodeAt(0);
        if (code < 0x20) {
          // 제어 문자를 이스케이프 시퀀스로 변환
          switch (ch) {
            case '\n': result += '\\n'; break;
            case '\r': result += '\\r'; break;
            case '\t': result += '\\t'; break;
            default: result += `\\u${code.toString(16).padStart(4, '0')}`; break;
          }
        } else {
          result += ch;
        }
      } else {
        result += ch;
      }
    }

    return result;
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
