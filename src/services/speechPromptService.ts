import { requestUrl } from 'obsidian';
import {
  AIProvider,
  SpeechGenerationResult,
  GenerationErrorClass,
  PROVIDER_CONFIGS,
  SpeechTemplate,
  PreferredLanguage,
  DialogueSegment
} from '../types';
import { SPEECH_TEMPLATE_PROMPTS } from '../settingsData';

export class SpeechPromptService {
  /**
   * Generate a speech script from note content using the specified AI provider
   */
  async generateSpeechScript(
    noteContent: string,
    template: SpeechTemplate,
    targetDuration: number,
    language: PreferredLanguage,
    provider: AIProvider,
    model: string,
    apiKey: string
  ): Promise<SpeechGenerationResult> {
    if (!apiKey) {
      throw this.createError('INVALID_API_KEY', `${PROVIDER_CONFIGS[provider].name} API key is not configured`);
    }

    if (!noteContent.trim()) {
      throw this.createError('NO_CONTENT', 'Note content is empty');
    }

    // Get template-specific system prompt
    const templatePrompt = SPEECH_TEMPLATE_PROMPTS[template];
    const systemPrompt = templatePrompt
      .replace('{duration}', String(targetDuration))
      .replace('{content}', noteContent);

    // Add language instruction
    const languageInstruction = this.getLanguageInstruction(language);
    const fullPrompt = `${languageInstruction}\n\n${systemPrompt}`;

    try {
      const script = await this.callProvider(provider, model, apiKey, fullPrompt);

      // Parse dialogue segments if this is a dialogue template
      const dialogueSegments = template === 'notebooklm-dialogue'
        ? this.parseDialogueScript(script)
        : undefined;

      // Calculate word count and estimated duration
      const wordCount = this.countWords(script, language);
      const estimatedDuration = this.estimateDuration(wordCount, language);

      return {
        script,
        dialogueSegments,
        estimatedDuration,
        wordCount,
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

  /**
   * Public method to parse dialogue segments from a script
   */
  parseDialogueSegments(script: string): DialogueSegment[] {
    return this.parseDialogueScript(script);
  }

  private getLanguageInstruction(language: PreferredLanguage): string {
    const instructions: Record<PreferredLanguage, string> = {
      ko: '모든 내용을 한국어로 작성하세요.',
      en: 'Write all content in English.',
      ja: 'すべての内容を日本語で作成してください。',
      zh: '请用中文撰写所有内容。',
      es: 'Escribe todo el contenido en español.',
      fr: 'Rédigez tout le contenu en français.',
      de: 'Schreiben Sie alle Inhalte auf Deutsch.'
    };
    return instructions[language] || instructions['ko'];
  }

  /**
   * Parse dialogue script into segments with speaker labels
   */
  private parseDialogueScript(script: string): DialogueSegment[] {
    const segments: DialogueSegment[] = [];
    const lines = script.split(/\n\n+/);

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (trimmedLine.startsWith('[Host A]')) {
        segments.push({
          speaker: 'hostA',
          text: trimmedLine.replace(/^\[Host A\]\s*/i, '').trim()
        });
      } else if (trimmedLine.startsWith('[Host B]')) {
        segments.push({
          speaker: 'hostB',
          text: trimmedLine.replace(/^\[Host B\]\s*/i, '').trim()
        });
      } else if (segments.length > 0) {
        // Append to previous segment if no speaker label
        segments[segments.length - 1].text += ' ' + trimmedLine;
      } else {
        // Default to Host A if no label at the start
        segments.push({
          speaker: 'hostA',
          text: trimmedLine
        });
      }
    }

    return segments;
  }

  /**
   * Count words in the script
   */
  private countWords(text: string, language: PreferredLanguage): number {
    // For CJK languages, count characters; for others, count words
    if (['ko', 'ja', 'zh'].includes(language)) {
      // Remove spaces and count characters
      return text.replace(/\s+/g, '').length;
    } else {
      // Count words for alphabetic languages
      return text.split(/\s+/).filter(w => w.length > 0).length;
    }
  }

  /**
   * Estimate speech duration in minutes based on word/character count
   */
  private estimateDuration(wordCount: number, language: PreferredLanguage): number {
    // Average speaking rates:
    // Korean: ~250-300 characters per minute
    // English: ~150-160 words per minute
    // Japanese: ~300 characters per minute
    // Chinese: ~200 characters per minute

    const ratesPerMinute: Record<PreferredLanguage, number> = {
      ko: 280,  // characters
      en: 150,  // words
      ja: 300,  // characters
      zh: 200,  // characters
      es: 150,  // words
      fr: 150,  // words
      de: 140   // words
    };

    const rate = ratesPerMinute[language] || 150;
    return Math.round((wordCount / rate) * 10) / 10; // Round to 1 decimal
  }

  private async callProvider(
    provider: AIProvider,
    model: string,
    apiKey: string,
    prompt: string
  ): Promise<string> {
    switch (provider) {
      case 'openai':
        return this.callOpenAI(model, apiKey, prompt);
      case 'google':
        return this.callGoogle(model, apiKey, prompt);
      case 'anthropic':
        return this.callAnthropic(model, apiKey, prompt);
      case 'xai':
        return this.callXAI(model, apiKey, prompt);
      case 'glm':
        return this.callGLM(model, apiKey, prompt);
      default: {
        const unknownProvider: never = provider;
        throw this.createError('UNKNOWN', `Unknown provider: ${String(unknownProvider)}`);
      }
    }
  }

  private async callOpenAI(model: string, apiKey: string, prompt: string): Promise<string> {
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
          { role: 'user', content: prompt }
        ],
        max_tokens: 8000,
        temperature: 0.8
      })
    });

    if (response.status !== 200) {
      throw this.handleHttpError(response.status, response.text, 'openai');
    }

    const data = response.json;
    return data.choices[0]?.message?.content?.trim() || '';
  }

  private async callGoogle(model: string, apiKey: string, prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await requestUrl({
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 8000
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
      throw this.createError('GENERATION_FAILED', 'Gemini API returned empty response.');
    }

    return generatedText;
  }

  private async callAnthropic(model: string, apiKey: string, prompt: string): Promise<string> {
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
        max_tokens: 8000,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (response.status !== 200) {
      throw this.handleHttpError(response.status, response.text, 'anthropic');
    }

    const data = response.json;
    return data.content?.[0]?.text?.trim() || '';
  }

  private async callXAI(model: string, apiKey: string, prompt: string): Promise<string> {
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
          { role: 'user', content: prompt }
        ],
        temperature: 0.8
      })
    });

    if (response.status !== 200) {
      throw this.handleHttpError(response.status, response.text, 'xai');
    }

    const data = response.json;
    return data.choices[0]?.message?.content?.trim() || '';
  }

  private async callGLM(model: string, apiKey: string, prompt: string): Promise<string> {
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
          { role: 'user', content: prompt }
        ],
        temperature: 0.8
      })
    });

    if (response.status !== 200) {
      throw this.handleHttpError(response.status, response.text, 'glm');
    }

    const data = response.json;
    return data.choices[0]?.message?.content?.trim() || '';
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
