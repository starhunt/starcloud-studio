import { requestUrl } from 'obsidian';
import {
  AIProvider,
  AIApiFormat,
  AIAuthType,
  PromptGenerationResult,
  GenerationErrorClass,
  PROVIDER_CONFIGS,
  ImageStyle,
  InfographicSubStyle,
  INFOGRAPHIC_SUB_STYLES
} from '../types';
import { SYSTEM_PROMPT } from '../settingsData';
import type { ProviderInfo } from './slideService';

export class PromptService {
  /**
   * Generate an image prompt from note content using the specified AI provider
   */
  async generatePrompt(
    noteContent: string,
    provider: AIProvider,
    model: string,
    apiKey: string,
    imageStyle?: ImageStyle,
    infographicSubStyle?: InfographicSubStyle,
    providerInfo?: ProviderInfo
  ): Promise<PromptGenerationResult> {
    if (!apiKey) {
      const providerName = PROVIDER_CONFIGS[provider]?.name || provider;
      throw this.createError('INVALID_API_KEY', `${providerName} API key is not configured`);
    }

    if (!noteContent.trim()) {
      throw this.createError('NO_CONTENT', 'Note content is empty');
    }

    // Get style-specific system prompt
    let systemPrompt = SYSTEM_PROMPT;
    if (imageStyle === 'infographic' && infographicSubStyle && infographicSubStyle !== 'general') {
      const subStyleConfig = INFOGRAPHIC_SUB_STYLES[infographicSubStyle];
      systemPrompt = subStyleConfig.systemPrompt + '\n\n' + SYSTEM_PROMPT;
    }

    try {
      const prompt = await this.callProvider(provider, model, apiKey, noteContent, systemPrompt, providerInfo);
      return {
        prompt,
        model,
        provider
      };
    } catch (error) {
      if (error instanceof GenerationErrorClass) {
        throw error;
      }
      throw this.handleApiError(error, provider);
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
    const userMessage = `Create an image prompt for the following content:\n\n${content}`;

    if (providerInfo) {
      return this.callByApiFormat(providerInfo, model, apiKey, userMessage, systemPrompt, provider);
    }

    // 레거시 폴백
    switch (provider) {
      case 'openai':
      case 'xai':
      case 'glm': {
        const urls: Record<string, string> = {
          openai: 'https://api.openai.com/v1/chat/completions',
          xai: 'https://api.x.ai/v1/chat/completions',
          glm: 'https://api.z.ai/api/coding/paas/v4/chat/completions',
        };
        return this.callOpenAICompatible(urls[provider], model, apiKey, userMessage, systemPrompt, provider);
      }
      case 'google':
        return this.callGemini('https://generativelanguage.googleapis.com/v1beta/models', model, apiKey, userMessage, systemPrompt);
      case 'anthropic':
        return this.callAnthropicApi('https://api.anthropic.com/v1/messages', model, apiKey, userMessage, systemPrompt);
      default:
        throw this.createError('UNKNOWN', `Unknown provider: ${provider}. Please update settings.`);
    }
  }

  private async callByApiFormat(info: ProviderInfo, model: string, apiKey: string, content: string, systemPrompt: string, label: string): Promise<string> {
    switch (info.apiFormat) {
      case 'openai':
        return this.callOpenAICompatible(info.baseUrl, model, apiKey, content, systemPrompt, label);
      case 'gemini':
        return this.callGemini(info.baseUrl, model, apiKey, content, systemPrompt);
      case 'anthropic':
        return this.callAnthropicApi(info.baseUrl, model, apiKey, content, systemPrompt);
      default:
        throw this.createError('UNKNOWN', `Unknown API format: ${info.apiFormat}`);
    }
  }

  private async callOpenAICompatible(baseUrl: string, model: string, apiKey: string, content: string, systemPrompt: string, label: string): Promise<string> {
    const url = baseUrl.includes('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
    const response = await requestUrl({
      url, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content }],
        max_tokens: 1000, temperature: 0.7
      })
    });
    if (response.status !== 200) throw this.handleHttpError(response.status, response.text, label);
    return response.json.choices[0]?.message?.content?.trim() || '';
  }

  private async callGemini(baseUrl: string, model: string, apiKey: string, content: string, systemPrompt: string): Promise<string> {
    const url = `${baseUrl}/${model}:generateContent?key=${apiKey}`;
    const response = await requestUrl({
      url, method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: content }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
        ]
      })
    });
    if (response.status !== 200) throw this.handleHttpError(response.status, response.text, 'google');
    const text = response.json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    if (!text) throw this.createError('GENERATION_FAILED', 'Gemini API returned empty response.');
    return text;
  }

  private async callAnthropicApi(baseUrl: string, model: string, apiKey: string, content: string, systemPrompt: string): Promise<string> {
    const url = baseUrl.includes('/messages') ? baseUrl : `${baseUrl}/messages`;
    const response = await requestUrl({
      url, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model, max_tokens: 1000, system: systemPrompt,
        messages: [{ role: 'user', content }]
      })
    });
    if (response.status !== 200) throw this.handleHttpError(response.status, response.text, 'anthropic');
    return response.json.content?.[0]?.text?.trim() || '';
  }

  private handleHttpError(status: number, responseText: string, provider: AIProvider): GenerationErrorClass {
    if (status === 401 || status === 403) {
      return this.createError('INVALID_API_KEY', `Invalid ${PROVIDER_CONFIGS[provider].name} API key`);
    }
    if (status === 429) {
      return this.createError('RATE_LIMIT', 'API rate limit exceeded. Please wait a few minutes and try again.', false);
    }
    if (status >= 500) {
      return this.createError('NETWORK_ERROR', 'Server error. Please try again later.', true);
    }
    return this.createError('GENERATION_FAILED', `API error: ${responseText}`);
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

  private createError(type: GenerationErrorClass['type'], message: string, retryable = false): GenerationErrorClass {
    return new GenerationErrorClass(type, message, retryable);
  }
}
