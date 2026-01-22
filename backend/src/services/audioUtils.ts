import ffmpeg from 'fluent-ffmpeg';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Converts audio buffer from various formats (CAF, AAC) to PCM 16-bit 16kHz mono.
 * This is the format required by Gemini Native Audio.
 *
 * Uses temp files instead of stream piping for Windows compatibility.
 */
export async function convertToPcm(
  inputBuffer: Buffer,
  inputFormat: 'caf' | 'aac' | 'm4a'
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    console.log(`[AUDIO] Converting ${inputBuffer.length} bytes from ${inputFormat} to PCM...`);

    if (inputBuffer.length === 0) {
      return reject(new Error('Input audio buffer is empty.'));
    }

    // Generate unique temp file paths (convert backslashes to forward slashes for Windows FFmpeg compatibility)
    const tempId = uuidv4();
    const inputPath = join(tmpdir(), `vishwa-input-${tempId}.${inputFormat}`).replace(/\\/g, '/');
    const outputPath = join(tmpdir(), `vishwa-output-${tempId}.pcm`).replace(/\\/g, '/');

    try {
      // Write input buffer to temp file
      writeFileSync(inputPath, inputBuffer);
      console.log(`[AUDIO] Wrote temp input file: ${inputPath}`);

      // Run FFmpeg with file paths (not pipes) - Windows compatible
      ffmpeg(inputPath)
        .inputFormat(inputFormat === 'm4a' ? 'mp4' : inputFormat) // m4a is MP4 container
        .audioFrequency(16000)
        .audioChannels(1)
        .audioCodec('pcm_s16le')
        .format('s16le')
        .on('stderr', (line) => {
          if (line.includes('Error') || line.includes('error')) {
            console.warn(`[FFMPEG] ${line}`);
          }
        })
        .on('end', () => {
          try {
            // Read output file
            const pcmBuffer = readFileSync(outputPath);
            console.log(`[AUDIO] Conversion finished. Output size: ${pcmBuffer.length} bytes`);

            // Cleanup temp files
            try { unlinkSync(inputPath); } catch (e) { /* Ignore cleanup errors */ }
            try { unlinkSync(outputPath); } catch (e) { /* Ignore cleanup errors */ }

            if (pcmBuffer.length === 0) {
              reject(new Error(`Audio conversion resulted in empty buffer. Ensure FFmpeg is installed and the input format is supported.`));
            } else {
              resolve(pcmBuffer);
            }
          } catch (err) {
            // Cleanup on error
            try { unlinkSync(inputPath); } catch (e) {}
            try { unlinkSync(outputPath); } catch (e) {}
            reject(err);
          }
        })
        .on('error', (err) => {
          console.error('[FFMPEG ERROR]', err);
          // Cleanup on error
          try { unlinkSync(inputPath); } catch (e) {}
          try { unlinkSync(outputPath); } catch (e) {}
          reject(new Error(`FFmpeg conversion error: ${err.message}`));
        })
        .save(outputPath); // Save to file instead of pipe

    } catch (err) {
      // Cleanup on exception
      try { unlinkSync(inputPath); } catch (e) {}
      try { unlinkSync(outputPath); } catch (e) {}
      reject(err);
    }
  });
}

/**
 * Encodes raw bytes to base64 string.
 */
export function encodeToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

/**
 * Decodes base64 string to Buffer.
 */
export function decodeFromBase64(base64: string): Buffer {
  return Buffer.from(base64, 'base64');
}
