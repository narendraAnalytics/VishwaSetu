import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../config/constants";

export type ClassroomEventCallback = (event: string, data: any) => void;

export class GeminiLiveSession {
  private ai: GoogleGenAI;
  private session: any; // Using any as the SDK type might be complex
  private onEvent: ClassroomEventCallback;

  constructor(apiKey: string, onEvent: ClassroomEventCallback) {
    this.ai = new GoogleGenAI({ apiKey });
    this.onEvent = onEvent;
  }

  async connect() {
    const model = 'gemini-2.5-flash-native-audio-preview-12-2025';
    try {
      console.log(`🔌 Attempting Gemini Live connection with model: ${model}...`);
      this.session = await this.ai.live.connect({
        model: model,
        config: {
          // ⭐ Response modalities - both text and audio
          responseModalities: [Modality.TEXT, Modality.AUDIO],

          // ⭐ CORRECT: Generation fields DIRECTLY on config (not nested)
          temperature: 0.8,          // Controls randomness in output generation
          maxOutputTokens: 1024,     // Maximum number of tokens the model can generate
          topP: 0.95,                // Nucleus sampling parameter for diversity control
          topK: 40,                  // Limits token selection to top K candidates

          // Voice configuration
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },

          // System instruction
          systemInstruction: SYSTEM_INSTRUCTION,

          // ⭐ Transcription configs
          inputAudioTranscription: { model: 'default' },
          outputAudioTranscription: { model: 'default' },
        },
        callbacks: {
          onopen: () => {
            console.log(`✅ [BACKEND] Gemini Live Session Connected (${model})`);
            this.onEvent('status', { connected: true });

            // Initial nudge to trigger greeting - ensure this.session is ready
            setTimeout(() => {
              if (this.session) {
                console.log('📤 [BACKEND] Sending initial audio nudge...');
                const nudge = new Int16Array(1600).fill(0);
                this.sendAudioChunk(Buffer.from(nudge.buffer));
              }
            }, 500);
          },
          onmessage: (message: LiveServerMessage) => {
            // ⭐ Detailed logging to see full message structure
            console.log('📥 [BACKEND] Full Gemini message:', JSON.stringify(message, null, 2));

            // 🔊 Audio output from Gemini (PCM 24kHz)
            if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
              const audioData = message.serverContent.modelTurn.parts[0].inlineData.data;
              console.log(`🔊 [BACKEND] Gemini audio chunk received: ${audioData.length} base64 chars (~${Math.floor(audioData.length * 0.75)} bytes PCM)`);
              this.onEvent('audioChunk', {
                audioData,
                mimeType: 'audio/pcm;rate=24000'
              });
            }

            if (message.serverContent?.inputTranscription) {
              this.onEvent('inputTranscript', { text: message.serverContent.inputTranscription.text });
            }

            if (message.serverContent?.outputTranscription) {
              this.onEvent('outputTranscript', { text: message.serverContent.outputTranscription.text });
            }

            if (message.serverContent?.turnComplete) {
              console.log('🔄 [BACKEND] Turn complete');
              this.onEvent('turnComplete', { timestamp: Date.now() });
            }

            if (message.serverContent?.interrupted) {
              this.onEvent('interrupted', {});
            }
          },
          onerror: (error) => {
            console.error(`❌ [BACKEND] Gemini Live Error (${model}):`, error);
            this.onEvent('error', { message: error.message });
          },
          onclose: () => {
            console.log(`📡 [BACKEND] Gemini Live Session Closed (${model})`);
            this.onEvent('status', { connected: false });
          }
        }
      });
    } catch (error: any) {
      console.error(`🚫 [BACKEND] Failed to connect using ${model}:`, error.message);
      throw error;
    }
  }

  sendAudioChunk(buffer: Buffer) {
    if (this.session) {
      const base64 = buffer.toString('base64');
      console.log(`[BACKEND] Sending ${buffer.length} bytes of PCM to Gemini...`);
      try {
        this.session.sendRealtimeInput({
          media: {
            data: base64,
            mimeType: 'audio/pcm;rate=16000'
          }
        });
      } catch (err) {
        console.error('[BACKEND] Error sending to Gemini:', err);
      }
    } else {
      console.warn('[BACKEND] Cannot send audio: Session not active');
    }
  }

  disconnect() {
    if (this.session) {
      try {
        console.log('[BACKEND] Disconnecting Gemini Live session...');

        // The Gemini Live SDK session has a close() method
        if (typeof this.session.close === 'function') {
          this.session.close();
        } else if (typeof this.session.disconnect === 'function') {
          this.session.disconnect();
        } else {
          console.warn('[BACKEND] Session object has no close() or disconnect() method');
        }

        this.session = null;
        this.onEvent('status', { connected: false });
        console.log('✅ [BACKEND] Gemini session disconnected successfully');
      } catch (err: any) {
        console.error('[BACKEND] Error disconnecting Gemini session:', err.message);
      }
    } else {
      console.log('[BACKEND] No active session to disconnect');
    }
  }
}
