import { requestUrl } from 'obsidian';
import {
  TTSProvider,
  TTSGenerationResult,
  GenerationErrorClass,
  TTS_PROVIDER_CONFIGS,
  VoiceOption,
  DialogueVoices,
  DialogueSegment,
  AudioFormat
} from '../types';

export class TTSService {
  /**
   * Generate audio from text using the specified TTS provider
   */
  async generateAudio(
    text: string,
    provider: TTSProvider,
    model: string,
    apiKey: string,
    voice: VoiceOption,
    format: AudioFormat
  ): Promise<TTSGenerationResult> {
    if (!apiKey) {
      throw this.createError('INVALID_API_KEY', `${TTS_PROVIDER_CONFIGS[provider].name} API key is not configured`);
    }

    if (!text.trim()) {
      throw this.createError('NO_CONTENT', 'Text content is empty');
    }

    try {
      switch (provider) {
        case 'gemini':
          return await this.callGeminiTTS(text, model, apiKey, voice.id, format);
        case 'elevenlabs':
          return await this.callElevenLabsTTS(text, model, apiKey, voice.id, format);
        default: {
          const unknownProvider: never = provider;
          throw this.createError('UNKNOWN', `Unknown provider: ${String(unknownProvider)}`);
        }
      }
    } catch (error) {
      if (error instanceof GenerationErrorClass) {
        throw error;
      }
      throw this.handleApiError(error, provider);
    }
  }

  /**
   * Generate dialogue audio with alternating voices
   */
  async generateDialogueAudio(
    segments: DialogueSegment[],
    provider: TTSProvider,
    model: string,
    apiKey: string,
    voices: DialogueVoices,
    format: AudioFormat
  ): Promise<TTSGenerationResult> {
    if (!apiKey) {
      throw this.createError('INVALID_API_KEY', `${TTS_PROVIDER_CONFIGS[provider].name} API key is not configured`);
    }

    if (segments.length === 0) {
      throw this.createError('NO_CONTENT', 'No dialogue segments provided');
    }

    try {
      // Generate audio for each segment
      const audioBuffers: ArrayBuffer[] = [];
      let totalDuration = 0;

      for (const segment of segments) {
        const voice = segment.speaker === 'hostA' ? voices.hostA : voices.hostB;
        const result = await this.generateAudio(
          segment.text,
          provider,
          model,
          apiKey,
          voice,
          format
        );
        audioBuffers.push(result.audioData);
        totalDuration += result.duration;

        // Add a small pause between segments (optional: add silence buffer)
        // For now, we'll just concatenate directly
      }

      // Concatenate all audio buffers
      const combinedAudio = this.concatenateAudioBuffers(audioBuffers);

      return {
        audioData: combinedAudio,
        mimeType: format === 'mp3' ? 'audio/mpeg' : 'audio/wav',
        duration: totalDuration,
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
   * Call Gemini TTS API
   * Uses the native audio generation capability of Gemini models
   */
  private async callGeminiTTS(
    text: string,
    model: string,
    apiKey: string,
    voiceId: string,
    format: AudioFormat
  ): Promise<TTSGenerationResult> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await requestUrl({
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: text
          }]
        }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceId
              }
            }
          }
        }
      })
    });

    if (response.status !== 200) {
      throw this.handleHttpError(response.status, response.text, 'gemini');
    }

    const data = response.json;

    // Extract audio data from response
    const audioData = this.extractGeminiAudioData(data);
    if (!audioData) {
      console.error('Gemini TTS API response:', JSON.stringify(data, null, 2));
      throw this.createError('GENERATION_FAILED', 'Gemini TTS API returned no audio data.');
    }

    // Gemini returns PCM audio (Linear16) at 24kHz
    // We need to convert it to the requested format
    const pcmBuffer = this.base64ToArrayBuffer(audioData.data);
    let outputBuffer: ArrayBuffer;
    let mimeType: string;

    if (format === 'wav') {
      // Convert PCM to WAV
      outputBuffer = this.pcmToWav(pcmBuffer, 24000, 1, 16);
      mimeType = 'audio/wav';
    } else {
      // For MP3, we'll need to use WAV for now since browser-side MP3 encoding is complex
      // In production, you might want to use a library like lamejs
      outputBuffer = this.pcmToWav(pcmBuffer, 24000, 1, 16);
      mimeType = 'audio/wav';
      console.warn('MP3 encoding not implemented, using WAV format');
    }

    // Estimate duration based on PCM data
    // PCM 24kHz, 16-bit mono = 48000 bytes per second
    const duration = pcmBuffer.byteLength / 48000;

    return {
      audioData: outputBuffer,
      mimeType,
      duration,
      model,
      provider: 'gemini'
    };
  }

  /**
   * Call ElevenLabs TTS API
   */
  private async callElevenLabsTTS(
    text: string,
    model: string,
    apiKey: string,
    voiceId: string,
    format: AudioFormat
  ): Promise<TTSGenerationResult> {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const response = await requestUrl({
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
        'Accept': format === 'mp3' ? 'audio/mpeg' : 'audio/wav'
      },
      body: JSON.stringify({
        text: text,
        model_id: model,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });

    if (response.status !== 200) {
      throw this.handleHttpError(response.status, response.text, 'elevenlabs');
    }

    // ElevenLabs returns audio data directly in the response body
    const audioData = response.arrayBuffer;

    // Estimate duration (rough estimate: ~12kB per second for MP3 at 128kbps)
    const duration = audioData.byteLength / 12000;

    return {
      audioData,
      mimeType: format === 'mp3' ? 'audio/mpeg' : 'audio/wav',
      duration,
      model,
      provider: 'elevenlabs'
    };
  }

  /**
   * Extract audio data from Gemini API response
   */
  private extractGeminiAudioData(data: Record<string, unknown>): { data: string; mimeType: string } | null {
    const candidates = data.candidates as Array<{
      content?: {
        parts?: Array<{
          inlineData?: { data: string; mimeType: string };
          inline_data?: { data: string; mime_type: string };
        }>;
      };
    }>;

    if (!candidates || candidates.length === 0) return null;

    const content = candidates[0].content;
    if (!content || !content.parts) return null;

    for (const part of content.parts) {
      if (part.inlineData) {
        return {
          data: part.inlineData.data,
          mimeType: part.inlineData.mimeType
        };
      }
      if (part.inline_data) {
        return {
          data: part.inline_data.data,
          mimeType: part.inline_data.mime_type
        };
      }
    }

    return null;
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Convert PCM data to WAV format
   */
  private pcmToWav(pcmData: ArrayBuffer, sampleRate: number, numChannels: number, bitsPerSample: number): ArrayBuffer {
    const dataLength = pcmData.byteLength;
    const headerLength = 44;
    const totalLength = headerLength + dataLength;
    const buffer = new ArrayBuffer(totalLength);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, totalLength - 8, true); // File size - 8
    this.writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Sub-chunk size (16 for PCM)
    view.setUint16(20, 1, true); // Audio format (1 = PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true); // Byte rate
    view.setUint16(32, numChannels * bitsPerSample / 8, true); // Block align
    view.setUint16(34, bitsPerSample, true);

    // data sub-chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // Copy PCM data
    const pcmBytes = new Uint8Array(pcmData);
    const wavBytes = new Uint8Array(buffer);
    wavBytes.set(pcmBytes, headerLength);

    return buffer;
  }

  /**
   * Write string to DataView
   */
  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Concatenate multiple audio buffers
   */
  private concatenateAudioBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
    // Calculate total length
    let totalLength = 0;
    for (const buffer of buffers) {
      totalLength += buffer.byteLength;
    }

    // Create combined buffer
    const combined = new ArrayBuffer(totalLength);
    const combinedBytes = new Uint8Array(combined);

    let offset = 0;
    for (const buffer of buffers) {
      combinedBytes.set(new Uint8Array(buffer), offset);
      offset += buffer.byteLength;
    }

    return combined;
  }

  private handleHttpError(status: number, responseText: string, provider: TTSProvider): GenerationErrorClass {
    if (status === 401 || status === 403) {
      return this.createError('INVALID_API_KEY', `Invalid ${TTS_PROVIDER_CONFIGS[provider].name} API key`);
    }
    if (status === 429) {
      return this.createError('RATE_LIMIT', 'API rate limit exceeded. Please wait a few minutes and try again.', false);
    }
    if (status >= 500) {
      return this.createError('NETWORK_ERROR', 'Server error. Please try again later.', true);
    }
    return this.createError('GENERATION_FAILED', `API error: ${responseText}`);
  }

  private handleApiError(error: unknown, provider: TTSProvider): GenerationErrorClass {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('status 429') || errorMessage.includes('429')) {
      return this.createError('RATE_LIMIT', 'API rate limit exceeded. Please wait a few minutes and try again.', false);
    }

    if (errorMessage.includes('status 401') || errorMessage.includes('status 403')) {
      return this.createError('INVALID_API_KEY', `Invalid ${TTS_PROVIDER_CONFIGS[provider].name} API key`);
    }

    if (errorMessage.includes('net::') || errorMessage.includes('network')) {
      return this.createError('NETWORK_ERROR', 'Network connection error. Check your internet connection.', true);
    }

    return this.createError('GENERATION_FAILED', `${TTS_PROVIDER_CONFIGS[provider].name} error: ${errorMessage}`);
  }

  private createError(type: GenerationErrorClass['type'], message: string, retryable = false): GenerationErrorClass {
    return new GenerationErrorClass(type, message, retryable);
  }
}
