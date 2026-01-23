import ffmpegPath from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { v4 as uuidv4 } from 'uuid';

// Set FFmpeg path to use bundled binary (Vercel compatible)
ffmpeg.setFfmpegPath(ffmpegPath!);

// Project-local temp directory for conversion
const TEMP_DIR = resolve(__dirname, '../../temp');

/**
 * Ensures the temp directory exists.
 */
function ensureTempDir() {
  if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR, { recursive: true });
    console.log(`[AUDIO] Created local temp directory: ${TEMP_DIR}`);
  }
}

/**
 * Converts audio buffer from various formats (CAF, AAC) to PCM 16-bit 16kHz mono.
 * This is the format required by Gemini Native Audio.
 *
 * Uses temp files for Windows compatibility and project-local paths for permissions.
 */
export async function convertToPcm(
  inputBuffer: Buffer,
  inputFormat: 'caf' | 'aac' | 'm4a'
): Promise<Buffer> {
  return new Promise((resolvePromise, reject) => {
    // Validation 1: Check empty buffer
    if (!inputBuffer || inputBuffer.length === 0) {
      return reject(new Error('Input audio buffer is empty.'));
    }

    console.log(`[AUDIO] Converting ${inputBuffer.length} bytes from ${inputFormat} to PCM...`);

    // Validation 2: Minimum viable audio size
    const MIN_AUDIO_SIZE = 100;
    if (inputBuffer.length < MIN_AUDIO_SIZE) {
      console.warn(`[AUDIO] Buffer too small (${inputBuffer.length} bytes), returning silence PCM.`);
      const silenceDuration = 0.1;
      const sampleRate = 16000;
      const silenceSamples = Math.floor(silenceDuration * sampleRate);
      const silenceBuffer = Buffer.alloc(silenceSamples * 2);
      return resolvePromise(silenceBuffer);
    }

    ensureTempDir();

    const tempId = uuidv4().substring(0, 8);
    // Use forward slashes for ALL paths passed to FFmpeg on Windows
    const inputPath = join(TEMP_DIR, `in-${tempId}.${inputFormat}`).replace(/\\/g, '/');
    const outputPath = join(TEMP_DIR, `out-${tempId}.pcm`).replace(/\\/g, '/');

    try {
      // Write input buffer to temp file
      writeFileSync(inputPath, inputBuffer);
      console.log(`[AUDIO] Wrote temp input file: ${inputPath} (${inputBuffer.length} bytes)`);

      // Run FFmpeg with file paths
      // Optimized flags for streaming audio chunks
      ffmpeg(inputPath)
        .inputFormat(inputFormat === 'm4a' ? 'mp4' : inputFormat)
        .audioFrequency(16000)
        .audioChannels(1)
        .audioCodec('pcm_s16le')
        .format('s16le')
        .outputOptions([
          '-y',                 // Overwrite output file
          '-loglevel', 'error', // Minimal logging
          '-probesize', '50000', // Better probesize for M4A headers
          '-analyzeduration', '100000' // Better duration analysis
        ])
        .on('start', (commandLine) => {
          console.log(`[FFMPEG] Command: ${commandLine}`);
        })
        .on('end', () => {
          try {
            if (!existsSync(outputPath)) {
              throw new Error(`Output file not created: ${outputPath}`);
            }

            const pcmBuffer = readFileSync(outputPath);
            console.log(`[AUDIO] Conversion finished. Output size: ${pcmBuffer.length} bytes`);

            // Cleanup temp files safely
            setTimeout(() => {
              try { if (existsSync(inputPath)) unlinkSync(inputPath); } catch (e) { }
              try { if (existsSync(outputPath)) unlinkSync(outputPath); } catch (e) { }
            }, 1000);

            if (pcmBuffer.length === 0) {
              resolvePromise(Buffer.alloc(320)); // Return a tiny bit of silence instead of failing
            } else {
              resolvePromise(pcmBuffer);
            }
          } catch (err) {
            reject(err);
          }
        })
        .on('error', (err) => {
          console.error('[FFMPEG ERROR]', err.message);
          // Cleanup
          try { if (existsSync(inputPath)) unlinkSync(inputPath); } catch (e) { }
          try { if (existsSync(outputPath)) unlinkSync(outputPath); } catch (e) { }
          reject(new Error(`FFmpeg error: ${err.message}`));
        })
        .save(outputPath);

    } catch (err) {
      try { if (existsSync(inputPath)) unlinkSync(inputPath); } catch (e) { }
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
