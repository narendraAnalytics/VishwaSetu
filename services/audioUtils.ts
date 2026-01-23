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
// Custom Base64 to Uint8Array for React Native (atob replacement)
function base64ToUint8Array(base64: string): Uint8Array {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const lookup = new Uint8Array(256);
    for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;

    const len = base64.length;
    let bufferLength = len * 0.75;
    if (base64[len - 1] === '=') {
        bufferLength--;
        if (base64[len - 2] === '=') bufferLength--;
    }

    const bytes = new Uint8Array(bufferLength);
    for (let i = 0, j = 0; i < len; i += 4) {
        const encoded1 = lookup[base64.charCodeAt(i)];
        const encoded2 = lookup[base64.charCodeAt(i + 1)];
        const encoded3 = lookup[base64.charCodeAt(i + 2)];
        const encoded4 = lookup[base64.charCodeAt(i + 3)];

        bytes[j++] = (encoded1 << 2) | (encoded2 >> 4);
        bytes[j++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
        bytes[j++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }
    return bytes;
}

// Custom Uint8Array to Base64 for React Native (btoa replacement)
function uint8ArrayToBase64(bytes: Uint8Array): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let base64 = '';
    const len = bytes.length;
    for (let i = 0; i < len; i += 3) {
        base64 += chars[bytes[i] >> 2];
        base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
        base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
        base64 += chars[bytes[i + 2] & 63];
    }

    if (len % 3 === 2) base64 = base64.substring(0, base64.length - 1) + '=';
    else if (len % 3 === 1) base64 = base64.substring(0, base64.length - 2) + '==';

    return base64;
}

export function pcmToWav(pcmData: string | Uint8Array, sampleRate: number, channels: number = 1): string {
    console.log(`[AUDIO] pcmToWav called - input type: ${typeof pcmData}, sampleRate: ${sampleRate}, channels: ${channels}`);

    // Validate inputs
    if (!pcmData) {
        throw new Error('Empty PCM data provided to pcmToWav');
    }

    let pcmBytes: Uint8Array;

    if (pcmData instanceof Uint8Array) {
        pcmBytes = pcmData;
    } else {
        // Decode base64 to bytes
        if (pcmData.length === 0) throw new Error('Empty PCM string');
        try {
            pcmBytes = base64ToUint8Array(pcmData);
        } catch (e) {
            throw new Error('Invalid base64 PCM data');
        }
    }

    // Validate PCM data size (must be even for 16-bit samples)
    if (pcmBytes.length % 2 !== 0) {
        console.warn(`[AUDIO] PCM data has odd length (${pcmBytes.length} bytes), padding with zero`);
        const paddedBytes = new Uint8Array(pcmBytes.length + 1);
        paddedBytes.set(pcmBytes);
        paddedBytes[pcmBytes.length] = 0;
        pcmBytes = paddedBytes;
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

    console.log(`[AUDIO] Created WAV: ${wavBytes.length} bytes (${pcmBytes.length} PCM + 44 header), ${sampleRate}Hz, ${channels}ch`);

    // Encode to base64
    return uint8ArrayToBase64(wavBytes);
}
