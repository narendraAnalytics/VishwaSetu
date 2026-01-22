/**
 * Audio utility functions for VishwaSetu Live Classroom
 * Handles PCM to WAV conversion for expo-audio compatibility
 */

/**
 * Convert PCM base64 audio to WAV base64 audio
 * Adds 44-byte WAV header to raw PCM data for expo-av compatibility
 *
 * @param base64Pcm - Base64 encoded PCM audio data
 * @param sampleRate - Sample rate in Hz (e.g., 24000 for Gemini output)
 * @param channels - Number of audio channels (1 = mono, 2 = stereo)
 * @returns Base64 encoded WAV audio with proper headers
 */
export function pcmToWav(base64Pcm: string, sampleRate: number, channels: number = 1): string {
    // Decode base64 to bytes
    const binaryString = atob(base64Pcm);
    const pcmBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        pcmBytes[i] = binaryString.charCodeAt(i);
    }

    // Create WAV header (44 bytes)
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);

    const byteRate = sampleRate * channels * 2; // 16-bit = 2 bytes per sample
    const blockAlign = channels * 2;

    // "RIFF" chunk descriptor (bytes 0-11)
    view.setUint32(0, 0x46464952, false);         // "RIFF" (big-endian)
    view.setUint32(4, 36 + pcmBytes.length, true); // File size - 8
    view.setUint32(8, 0x45564157, false);         // "WAVE" (big-endian)

    // "fmt " sub-chunk (bytes 12-35)
    view.setUint32(12, 0x20746d66, false);        // "fmt " (big-endian)
    view.setUint32(16, 16, true);                 // Subchunk1 size (16 for PCM)
    view.setUint16(20, 1, true);                  // Audio format (1 = PCM)
    view.setUint16(22, channels, true);           // Number of channels
    view.setUint32(24, sampleRate, true);         // Sample rate
    view.setUint32(28, byteRate, true);           // Byte rate
    view.setUint16(32, blockAlign, true);         // Block align
    view.setUint16(34, 16, true);                 // Bits per sample

    // "data" sub-chunk (bytes 36-43)
    view.setUint32(36, 0x61746164, false);        // "data" (big-endian)
    view.setUint32(40, pcmBytes.length, true);    // Subchunk2 size

    // Combine header + PCM data
    const wavBytes = new Uint8Array(44 + pcmBytes.length);
    wavBytes.set(new Uint8Array(wavHeader), 0);
    wavBytes.set(pcmBytes, 44);

    // Encode to base64
    let binary = '';
    for (let i = 0; i < wavBytes.length; i++) {
        binary += String.fromCharCode(wavBytes[i]);
    }
    return btoa(binary);
}
