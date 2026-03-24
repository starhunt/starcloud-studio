import { requestUrl } from 'obsidian';
import {
  ImageGenerationResult,
  GenerationErrorClass,
  ImageStyle,
  InfographicSubStyle,
  PreferredLanguage,
  ImageOrientation,
  IMAGE_STYLES,
  INFOGRAPHIC_SUB_STYLES,
  GeminiApiResponse,
  AIAuthType,
  AIApiFormat
} from '../types';
import { IMAGE_GENERATION_PROMPT_TEMPLATE } from '../settingsData';

export class ImageService {
  /**
   * Generate an infographic image using Google Gemini
   */
  async generateImage(
    prompt: string,
    apiKey: string,
    model: string,
    style: ImageStyle,
    preferredLanguage: PreferredLanguage,
    imageSize: string = '2K',
    cartoonCuts: number = 4,
    infographicSubStyle: InfographicSubStyle = 'general',
    imageOrientation: ImageOrientation = 'horizontal',
    baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta/models',
    authType: AIAuthType = 'query-param',
    apiFormat: AIApiFormat = 'gemini',
    imageRequestParams?: string
  ): Promise<ImageGenerationResult> {
    if (!apiKey) {
      throw this.createError('INVALID_API_KEY', 'Google API key is not configured');
    }

    if (!prompt.trim()) {
      throw this.createError('NO_CONTENT', 'Prompt is empty');
    }

    try {
      // Language instruction mapping
      const languageInstructions: Record<PreferredLanguage, string> = {
        ko: 'IMPORTANT: All text in the image MUST be in Korean (한국어). Titles, labels, descriptions, and all content should be written in Korean.',
        en: 'IMPORTANT: All text in the image MUST be in English. Titles, labels, descriptions, and all content should be written in English.',
        ja: 'IMPORTANT: All text in the image MUST be in Japanese (日本語). Titles, labels, descriptions, and all content should be written in Japanese.',
        zh: 'IMPORTANT: All text in the image MUST be in Chinese (中文). Titles, labels, descriptions, and all content should be written in Chinese.',
        es: 'IMPORTANT: All text in the image MUST be in Spanish (Español). Titles, labels, descriptions, and all content should be written in Spanish.',
        fr: 'IMPORTANT: All text in the image MUST be in French (Français). Titles, labels, descriptions, and all content should be written in French.',
        de: 'IMPORTANT: All text in the image MUST be in German (Deutsch). Titles, labels, descriptions, and all content should be written in German.'
      };

      // Get style description
      let styleDescription = IMAGE_STYLES[style];

      // Apply infographic sub-style if applicable
      if (style === 'infographic' && infographicSubStyle !== 'general') {
        const subStyleConfig = INFOGRAPHIC_SUB_STYLES[infographicSubStyle];
        styleDescription = subStyleConfig.systemPrompt;
      }

      // Special handling for cartoon style
      if (style === 'cartoon') {
        styleDescription = this.getCartoonStyleDescription(cartoonCuts);
      }

      // Orientation instruction
      const orientationInstruction = imageOrientation === 'horizontal'
        ? 'IMPORTANT: Create the image in HORIZONTAL/LANDSCAPE orientation (wider than tall).'
        : 'IMPORTANT: Create the image in VERTICAL/PORTRAIT orientation (taller than wide).';

      // Format the prompt with style and language
      const fullPrompt = IMAGE_GENERATION_PROMPT_TEMPLATE
        .replace('{style}', styleDescription)
        .replace('{prompt}', prompt) + '\n\n' + languageInstructions[preferredLanguage] + '\n\n' + orientationInstruction;

      // 인증 헤더 구성
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authType === 'bearer') {
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else if (authType === 'x-api-key') {
        headers['x-api-key'] = apiKey;
      }

      if (apiFormat === 'gemini') {
        // === Gemini API ===
        const queryParam = authType === 'query-param' ? `?key=${apiKey}` : '';
        const url = `${baseUrl}/${model}:generateContent${queryParam}`;

        const response = await requestUrl({
          url,
          method: 'POST',
          headers,
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
              imageConfig: { imageSize: imageSize }
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
          throw this.handleHttpError(response.status, response.text);
        }

        const imageData = this.extractImageFromResponse(response.json);
        if (!imageData) {
          throw this.createError('GENERATION_FAILED', 'No image was generated. Try a different prompt or style.');
        }

        return { imageData: imageData.data, mimeType: imageData.mimeType, model };

      } else if (apiFormat === 'openai') {
        return await this.generateImageOpenAI(baseUrl, headers, model, fullPrompt, imageSize, imageOrientation, imageRequestParams);

      } else {
        throw this.createError('GENERATION_FAILED', `Image generation is not supported for API format: ${apiFormat}`);
      }
    } catch (error) {
      if (error instanceof GenerationErrorClass) {
        throw error;
      }
      throw this.handleApiError(error);
    }
  }

  /**
   * OpenAI 호환 프로바이더 이미지 생성
   * 1차: Chat Completions → 성공 시 이미지 파싱
   * 2차: 이미지 없는 성공 응답 시에만 /images/generations fallback
   * HTTP 에러 시 즉시 전파 (디버깅 가능)
   */
  private async generateImageOpenAI(
    baseUrl: string,
    headers: Record<string, string>,
    model: string,
    prompt: string,
    imageSize: string,
    imageOrientation: string = 'horizontal',
    imageRequestParams?: string
  ): Promise<ImageGenerationResult> {
    const aspectRatio = imageOrientation === 'horizontal' ? '16:9' : '9:16';

    // 이미지 요청 파라미터 구성
    let extraParams: Record<string, any> = {};
    const paramsTemplate = imageRequestParams || JSON.stringify({
      modalities: ['image', 'text'],
      image_config: { aspect_ratio: '{ratio}', image_size: '{size}' },
      max_tokens: 8192
    });

    try {
      // 플레이스홀더 치환 후 파싱
      const resolved = paramsTemplate
        .replace(/\{ratio\}/g, aspectRatio)
        .replace(/\{size\}/g, imageSize);
      extraParams = JSON.parse(resolved);
    } catch {
      // JSON 파싱 실패 시 기본값
      extraParams = {
        modalities: ['image', 'text'],
        image_config: { aspect_ratio: aspectRatio, image_size: imageSize },
        max_tokens: 8192
      };
    }

    // === 1차: Chat Completions + 모델별 이미지 파라미터 ===
    const chatResponse = await requestUrl({
      url: baseUrl,
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        ...extraParams
      })
    });

    if (chatResponse.status !== 200) {
      throw this.handleHttpError(chatResponse.status, chatResponse.text);
    }

    // 이미지 파싱 시도
    const extracted = this.extractImageFromOpenAIResponse(chatResponse.json);
    if (extracted) {
      // HTTP URL인 경우 다운로드하여 base64 변환
      if (extracted.imageUrl && !extracted.imageData) {
        const downloaded = await this.downloadImageAsBase64(extracted.imageUrl);
        return { imageData: downloaded.imageData, mimeType: downloaded.mimeType, model };
      }
      return { imageData: extracted.imageData, mimeType: extracted.mimeType, model };
    }

    // === 2차: 이미지 없는 성공 응답 → /images/generations fallback ===
    const imagesUrl = baseUrl.replace(/\/chat\/completions\/?$/, '/images/generations');
    if (imagesUrl !== baseUrl) {
      try {
        const sizeMap: Record<string, string> = {
          '1K': '1024x1024', '2K': '1024x1792', '4K': '1024x1792',
        };
        const imgResponse = await requestUrl({
          url: imagesUrl,
          method: 'POST',
          headers,
          body: JSON.stringify({
            model, prompt, n: 1,
            size: sizeMap[imageSize] || '1024x1024',
            response_format: 'b64_json'
          })
        });

        if (imgResponse.status === 200 && imgResponse.json?.data?.[0]?.b64_json) {
          return { imageData: imgResponse.json.data[0].b64_json, mimeType: 'image/png', model };
        }
      } catch {
        // /images/generations 실패는 무시
      }
    }

    throw this.createError('GENERATION_FAILED', 'Response received but no image found. This model may not support image generation.');
  }

  /**
   * OpenAI 호환 응답에서 이미지 추출 (다양한 프로바이더 패턴 지원)
   */
  private extractImageFromOpenAIResponse(data: any): { imageData: string; mimeType: string; imageUrl?: string } | null {
    const message = data?.choices?.[0]?.message;
    if (!message) return null;

    // 1) 표준: message.content 배열 (OpenAI 멀티모달)
    if (Array.isArray(message.content)) {
      for (const part of message.content) {
        const url = part?.image_url?.url;
        if (url) {
          const result = this.parseImageUrl(url);
          if (result) return result;
        }
      }
    }

    // 2) 표준: data[].b64_json (OpenAI images API 형식이 chat으로 온 경우)
    if (data?.data?.[0]?.b64_json) {
      return { imageData: data.data[0].b64_json, mimeType: 'image/png' };
    }
    // data[].url 패턴
    if (data?.data?.[0]?.url) {
      return { imageData: '', mimeType: 'image/png', imageUrl: data.data[0].url };
    }

    // 3) Gemini 프록시: candidates 구조
    if (data?.candidates) {
      const geminiResult = this.extractImageFromResponse(data);
      if (geminiResult) return { imageData: geminiResult.data, mimeType: geminiResult.mimeType };
    }

    // === Fallback: 비표준 응답 패턴 ===

    // 4) message.images 배열 (Timely, OpenRouter 등)
    if (Array.isArray(message.images)) {
      for (const img of message.images) {
        const url = img?.image_url?.url || img?.url;
        if (url) {
          const result = this.parseImageUrl(url);
          if (result) return result;
        }
      }
    }

    // 5) message.content 문자열에서 이미지 추출
    if (typeof message.content === 'string') {
      // 5a) data:image base64 패턴
      if (message.content.includes('data:image/')) {
        const result = this.parseImageUrl(message.content.trim());
        if (result) return result;

        const b64Match = message.content.match(/data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\s]+)/s);
        if (b64Match) {
          return { imageData: b64Match[2].replace(/\s/g, ''), mimeType: `image/${b64Match[1]}` };
        }
      }

      // 5b) HTTP(S) 이미지 URL 패턴 (커스텀 프로바이더)
      const httpUrlMatch = message.content.match(/(https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|webp|gif|bmp|svg)(?:\?[^\s"'<>]*)?)/i);
      if (httpUrlMatch) {
        return { imageData: '', mimeType: 'image/png', imageUrl: httpUrlMatch[1] };
      }
    }

    return null;
  }

  /**
   * data:image URL 또는 HTTP URL에서 이미지 데이터 추출
   */
  private parseImageUrl(url: string): { imageData: string; mimeType: string; imageUrl?: string } | null {
    // data:image/...;base64,...
    const dataMatch = url.match(/^data:([^;]+);base64,(.+)$/s);
    if (dataMatch) {
      return { imageData: dataMatch[2], mimeType: dataMatch[1] };
    }
    // HTTP(S) 이미지 URL
    if (/^https?:\/\/.+\.(png|jpg|jpeg|webp|gif|bmp|svg)/i.test(url)) {
      return { imageData: '', mimeType: 'image/png', imageUrl: url };
    }
    return null;
  }

  /**
   * HTTP URL에서 이미지를 다운로드하여 base64로 변환
   */
  private async downloadImageAsBase64(url: string): Promise<{ imageData: string; mimeType: string }> {
    const response = await requestUrl({ url, method: 'GET' });
    if (response.status !== 200) {
      throw this.createError('GENERATION_FAILED', `Failed to download image: HTTP ${response.status}`);
    }

    // Content-Type에서 MIME 타입 추출
    const contentType = response.headers['content-type'] || 'image/png';
    const mimeType = contentType.split(';')[0].trim();

    // ArrayBuffer → base64
    const bytes = new Uint8Array(response.arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const imageData = btoa(binary);

    return { imageData, mimeType };
  }

  /**
   * Extract base64 image data from Gemini API response
   */
  private extractImageFromResponse(data: GeminiApiResponse): { data: string; mimeType: string } | null {
    try {
      const candidates = data.candidates;
      if (!candidates || candidates.length === 0) {
        return null;
      }

      const content = candidates[0].content;
      if (!content || !content.parts) {
        return null;
      }

      // Look for inline_data (image) in parts
      for (const part of content.parts) {
        if (part.inline_data) {
          return {
            data: part.inline_data.data,
            mimeType: part.inline_data.mime_type || 'image/png'
          };
        }
      }

      // Check for image in different response format
      if (content.parts[0]?.inlineData) {
        return {
          data: content.parts[0].inlineData.data,
          mimeType: content.parts[0].inlineData.mimeType || 'image/png'
        };
      }

      return null;
    } catch (e) {
      console.error('Error extracting image from response:', e);
      return null;
    }
  }

  private handleHttpError(status: number, responseText: string): GenerationErrorClass {
    if (status === 401 || status === 403) {
      return this.createError('INVALID_API_KEY', 'Invalid Google API key');
    }
    if (status === 429) {
      return this.createError('RATE_LIMIT', 'API rate limit exceeded. Please wait and try again.', true);
    }
    if (status === 400) {
      if (responseText.includes('SAFETY') || responseText.includes('blocked')) {
        return this.createError('CONTENT_FILTERED', 'Content was blocked by safety filters. Try modifying your prompt.');
      }
      return this.createError('GENERATION_FAILED', `Bad request: ${responseText}`);
    }
    if (status >= 500) {
      return this.createError('NETWORK_ERROR', 'Server error. Please try again later.', true);
    }
    return this.createError('GENERATION_FAILED', `API error (${status}): ${responseText}`);
  }

  private handleApiError(error: unknown): GenerationErrorClass {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('net::') || errorMessage.includes('network')) {
      return this.createError('NETWORK_ERROR', 'Network connection error. Check your internet connection.', true);
    }

    return this.createError('GENERATION_FAILED', `Image generation error: ${errorMessage}`);
  }

  private createError(type: GenerationErrorClass['type'], message: string, retryable = false): GenerationErrorClass {
    return new GenerationErrorClass(type, message, retryable);
  }

  /**
   * Generate cartoon style description based on number of cuts
   */
  private getCartoonStyleDescription(cuts: number): string {
    const layoutDescriptions: Record<number, string> = {
      4: '2x2 grid layout (2 rows, 2 columns)',
      6: '2x3 grid layout (2 rows, 3 columns) or 3x2 grid layout',
      8: '2x4 grid layout (2 rows, 4 columns) or 4x2 grid layout'
    };

    const layout = layoutDescriptions[cuts] || `${cuts} sequential panels in a balanced grid`;

    return `Comic strip / manga style illustration with exactly ${cuts} sequential panels arranged in a ${layout}.
Each panel should:
- Tell part of the story in clear visual sequence from panel 1 to panel ${cuts}
- Feature expressive characters with consistent design across all panels
- Include speech bubbles or thought bubbles where appropriate
- Use bold black outlines and vibrant colors
- Show dynamic compositions and varied camera angles
- Have clear panel borders with small gaps between panels
- Progress the narrative logically from beginning to end

The overall style should be:
- Modern comic/manga aesthetic with clean linework
- High contrast colors for visual impact
- Professional quality suitable for educational content
- Easy to follow visual storytelling`;
  }
}
