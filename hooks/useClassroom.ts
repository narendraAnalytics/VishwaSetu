import {
    AudioModule,
    AudioQuality,
    createAudioPlayer,
    IOSOutputFormat,
    RecordingOptions,
    setAudioModeAsync,
    useAudioRecorder,
    useAudioRecorderState
} from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { ClassroomMessage, ClassroomSession } from '../app/types/classroom';
import { pcmToWav } from '../services/audioUtils';
import { classroomApi } from '../services/classroomApi';

// ⭐ Gemini-Optimized Recording Preset
// Records at 16kHz mono to match Gemini Live API's expected input format
// This eliminates resampling corruption and reduces file sizes by ~30%
const GEMINI_RECORDING_PRESET: RecordingOptions = {
    // Common properties for all platforms
    extension: '.m4a',
    sampleRate: 16000,        // ⭐ Match Gemini's native 16kHz input requirement
    numberOfChannels: 1,       // Mono
    bitRate: 128000,           // Sufficient for voice

    // Android-specific configuration
    android: {
        outputFormat: 'mpeg4',
        audioEncoder: 'aac',
    },

    // iOS-specific configuration
    ios: {
        outputFormat: IOSOutputFormat.MPEG4AAC,
        audioQuality: AudioQuality.MEDIUM,
    },

    // Web-specific configuration
    web: {
        mimeType: 'audio/mp4',
        bitsPerSecond: 128000,
    }
};

export function useClassroom() {
    const [session, setSession] = useState<ClassroomSession | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isSessionActive, setIsSessionActive] = useState(false); // Tracks if conversation is active
    const [error, setError] = useState<string | null>(null);
    const [inputText, setInputText] = useState('');
    const [outputText, setOutputText] = useState('');

    // Recording state with Gemini-optimized 16kHz preset
    const recorder = useAudioRecorder(GEMINI_RECORDING_PRESET);
    const recorderState = useAudioRecorderState(recorder);

    // Chunked recording state
    const recordingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const isRecorderBusyRef = useRef(false);
    const isCurrentlyRecordingRef = useRef(false); // Synchronous track of recorder state
    const errorCountRef = useRef(0);
    const MAX_CONSECUTIVE_ERRORS = 3;

    // Audio playback queue & buffering
    const audioQueueRef = useRef<Uint8Array[]>([]);    // Queue of PCM Byte arrays
    const pcmBufferRef = useRef<Uint8Array>(new Uint8Array(0)); // Byte buffer
    const isPlayingRef = useRef(false);                // Playback in progress flag
    const currentSoundRef = useRef<any>(null);         // Current playing sound
    const BUFFER_THRESHOLD = 15360;                    // ~300ms of PCM at 24kHz (24000 * 2 * 0.3)

    // Helper to decode Base64 to Uint8Array in React Native (atob replacement)
    const base64ToUint8Array = (base64: string): Uint8Array => {
        try {
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
        } catch (e) {
            console.error('[FRONTEND] Base64 decode error:', e);
            return new Uint8Array(0);
        }
    };

    // Helper to join Uint8Arrays
    const concatUint8Arrays = (a: Uint8Array, b: Uint8Array): Uint8Array => {
        const res = new Uint8Array(a.length + b.length);
        res.set(a);
        res.set(b, a.length);
        return res;
    };

    const addMessage = useCallback((role: 'user' | 'vishwa', text: string) => {
        setSession(prev => {
            if (!prev) return null;
            const newMessage: ClassroomMessage = {
                id: Math.random().toString(36).substr(2, 9),
                role,
                text,
                timestamp: new Date(),
            };
            return { ...prev, messages: [...prev.messages, newMessage] };
        });
    }, []);

    useEffect(() => {
        (async () => {
            const status = await AudioModule.requestRecordingPermissionsAsync();
            console.log('[FRONTEND] Microphone permission status:', status.status, 'granted:', status.granted);

            if (!status.granted) {
                Alert.alert('Microphone Required', 'VishwaSetu needs microphone access to listen to you. Please enable it in system settings.');
            }

            await setAudioModeAsync({
                playsInSilentMode: true,
                allowsRecording: true,
                interruptionMode: 'doNotMix',
                shouldPlayInBackground: true,
                shouldRouteThroughEarpiece: false,
                interruptionModeAndroid: 'doNotMix',
            });
        })();
    }, []);

    const stopSession = useCallback(async () => {
        // Clear recording timeout
        if (recordingIntervalRef.current) {
            clearTimeout(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
        }
        sessionIdRef.current = null;
        isRecorderBusyRef.current = false;
        errorCountRef.current = 0;

        // Stop recorder if active
        if (isCurrentlyRecordingRef.current) {
            try {
                await recorder.stop();
            } catch (e) { }
            isCurrentlyRecordingRef.current = false;
        }

        // Send final chunk to backend
        const uri = recorder.uri;
        if (uri && session?.sessionId) {
            try {
                const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
                const format = uri.endsWith('.caf') ? 'caf' : uri.endsWith('.m4a') ? 'm4a' : 'aac';
                await classroomApi.sendAudioChunk(session.sessionId, base64, format);
            } catch (err) {
                console.error('[FRONTEND] Error sending final chunk:', err);
            }
        }

        // Stop backend session
        if (session?.sessionId) {
            await classroomApi.stopSession(session.sessionId);
        }

        // Clear audio queue and stop playback
        audioQueueRef.current = [];
        pcmBufferRef.current = new Uint8Array(0);
        if (currentSoundRef.current) {
            try {
                currentSoundRef.current.pause();
                currentSoundRef.current.remove();
            } catch (e) {
                // Ignore cleanup errors
            }
            currentSoundRef.current = null;
        }
        isPlayingRef.current = false;

        setSession(null);
        setIsConnected(false);
        setIsSessionActive(false);

    }, [session, recorder, recorderState.isRecording]);

    // Start chunked recording with timeout loop (prevents overlapping)
    const startChunkedRecording = async (sessionId: string) => {
        sessionIdRef.current = sessionId;

        const recordChunk = async () => {
            // Circuit breaker - stop if too many consecutive errors
            if (errorCountRef.current >= MAX_CONSECUTIVE_ERRORS) {
                console.error('[FRONTEND] Too many recording errors, stopping session');
                setError('Recording failed repeatedly. Please restart the session.');
                await stopSession();
                return;
            }

            // Prevent overlapping recordings
            if (isRecorderBusyRef.current) {
                console.warn('[FRONTEND] Recorder busy, skipping chunk');
                return;
            }

            isRecorderBusyRef.current = true;

            try {
                // 1. Ensure recorder is in a valid state
                if (!recorderState.isRecording && !recorderState.canRecord) {
                    console.log('[FRONTEND] Preparing recorder...');
                    await recorder.prepareToRecordAsync();
                }

                // 2. Strict check: are we already recording?
                if (isCurrentlyRecordingRef.current) {
                    console.warn('[FRONTEND] Already recording, trying to stop first');
                    try {
                        await recorder.stop();
                        isCurrentlyRecordingRef.current = false;
                    } catch (e) { }
                }

                // Small delay to ensure hardware is ready (Increased for stability)
                await new Promise(resolve => setTimeout(resolve, 100));

                console.log('[FRONTEND] Starting 800ms audio chunk');
                recorder.record();
                isCurrentlyRecordingRef.current = true;

                // Wait for the chunk duration
                await new Promise(resolve => setTimeout(resolve, 800));

                // 3. Stop recording with robust state tracking
                if (isCurrentlyRecordingRef.current) {
                    try {
                        await recorder.stop();
                        isCurrentlyRecordingRef.current = false;
                        console.log('[FRONTEND] Recorder stopped successfully');
                    } catch (stopErr: any) {
                        console.error('[FRONTEND] recorder.stop() failed:', stopErr.message);
                        isCurrentlyRecordingRef.current = false;
                    }
                }

                // Wait slightly for file finalization
                await new Promise(resolve => setTimeout(resolve, 150));

                const uri = recorder.uri;

                if (uri && sessionIdRef.current) {
                    const recordedFile = new File(uri);
                    if (!recordedFile.exists || recordedFile.size === 0) {
                        console.warn('[FRONTEND] Recorded file is empty or missing');
                        isRecorderBusyRef.current = false;
                        return;
                    }

                    const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
                    const format = uri.endsWith('.caf') ? 'caf' : uri.endsWith('.m4a') ? 'm4a' : 'aac';

                    console.log(`[FRONTEND] Sending audio chunk: ${base64.length} bytes, format: ${format}, fileSize: ${recordedFile.size}`);

                    classroomApi.sendAudioChunk(sessionIdRef.current, base64, format)
                        .then(() => console.log(`[FRONTEND] Sent complete audio chunk (${base64.length} bytes)`))
                        .catch(err => console.error('[FRONTEND] Upload error:', err));
                }

                errorCountRef.current = 0;

            } catch (err: any) {
                errorCountRef.current++;
                console.error(`[FRONTEND] Chunk recording error (${errorCountRef.current}/${MAX_CONSECUTIVE_ERRORS}):`, err);
                setError('Recording error: ' + err.message);

                isCurrentlyRecordingRef.current = false;
                try {
                    await recorder.stop();
                } catch (resetErr) { }
            } finally {
                isRecorderBusyRef.current = false;
            }
        };

        const recordChunkLoop = async () => {
            if (!sessionIdRef.current) return; // Session stopped

            await recordChunk();

            // Schedule next chunk immediately with minimal gap
            if (sessionIdRef.current) {
                recordingIntervalRef.current = setTimeout(recordChunkLoop, 10);
            }
        };

        // Start first chunk
        await recordChunkLoop();
    };

    const startSession = async () => {
        try {
            setError(null);

            // RESET playback state from any previous session
            console.log('[FRONTEND] Resetting playback state on session start');
            isPlayingRef.current = false;
            audioQueueRef.current = [];
            pcmBufferRef.current = new Uint8Array(0);
            if (currentSoundRef.current) {
                try {
                    currentSoundRef.current.pause();
                    currentSoundRef.current.remove();
                } catch (e) {
                    console.warn('[FRONTEND] Failed to clean up previous sound:', e);
                }
                currentSoundRef.current = null;
            }

            const { sessionId } = await classroomApi.startSession();
            setSession({ sessionId, status: 'active', messages: [] });

            // Connect to SSE events
            const eventSourceUrl = classroomApi.getEventSourceUrl(sessionId);
            console.log('Connecting to SSE:', eventSourceUrl);

            const xhr = new XMLHttpRequest();
            xhr.open('GET', eventSourceUrl);

            let lastProcessedIndex = 0;
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 3 || xhr.readyState === 4) {
                    const currentResponse = xhr.responseText;
                    const unprocessed = currentResponse.substring(lastProcessedIndex);

                    // SSE events are separated by double newlines
                    const parts = unprocessed.split('\n\n');

                    // Process all complete events (all except the last one which might be partial)
                    for (let i = 0; i < parts.length - 1; i++) {
                        const chunk = parts[i];
                        if (!chunk.trim()) continue;

                        const lines = chunk.split('\n');
                        let event = '';
                        let dataStr = '';

                        lines.forEach(line => {
                            if (line.startsWith('event:')) event = line.replace('event:', '').trim();
                            if (line.startsWith('data:')) dataStr = line.replace('data:', '').trim();
                        });

                        if (event && dataStr) {
                            try {
                                const data = JSON.parse(dataStr);
                                handleEvent(event, data);
                            } catch (e) {
                                console.error('[FRONTEND] SSE Parse Error:', e);
                            }
                        }

                        // Update the index correctly (include the \n\n we split on)
                        lastProcessedIndex += chunk.length + 2;
                    }
                }

                if (xhr.readyState === 4 && xhr.status !== 200) {
                    setError('Connection lost. Please check backend.');
                    setIsConnected(false);
                }
            };

            xhr.onerror = () => {
                setError('Network error. Ensure backend is accessible.');
                setIsConnected(false);
            };

            xhr.send();

            // Start chunked recording loop
            await startChunkedRecording(sessionId);
            setIsSessionActive(true);

        } catch (err: any) {
            console.error('Start Session Error:', err);
            setError('Failed to start session: ' + err.message);
            setIsConnected(false);
        }
    };

    // Play audio chunks in sequence
    const playNextAudioChunk = async () => {
        // Don't start new playback if already playing or queue empty
        if (isPlayingRef.current || audioQueueRef.current.length === 0) {
            console.log(`[FRONTEND] playNextAudioChunk skipped - isPlaying: ${isPlayingRef.current}, queueLength: ${audioQueueRef.current.length}`);
            return;
        }

        console.log('[FRONTEND] playNextAudioChunk started - queue length:', audioQueueRef.current.length);

        let audioFile: File | null = null;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        try {
            isPlayingRef.current = true;

            // SAFETY: Reset flag after 10 seconds if playback doesn't complete
            timeoutId = setTimeout(() => {
                console.warn('[FRONTEND] Playback timeout - forcing reset of isPlayingRef');
                isPlayingRef.current = false;
                playNextAudioChunk();
            }, 10000);

            const pcmBytes = audioQueueRef.current.shift()!;

            // Validate PCM data
            if (!pcmBytes || pcmBytes.length === 0) {
                console.warn('[FRONTEND] Empty audio chunk, skipping playback');
                isPlayingRef.current = false;
                if (timeoutId) clearTimeout(timeoutId);
                playNextAudioChunk();
                return;
            }

            console.log('[FRONTEND] Converting PCM to WAV - input bytes:', pcmBytes.length);
            // Convert PCM to WAV with header
            const base64Wav = pcmToWav(pcmBytes, 24000, 1); // 24kHz mono from Gemini
            console.log('[FRONTEND] WAV conversion successful - output length:', base64Wav.length);

            // Create File instance in cache directory (new API)
            audioFile = new File(Paths.cache, `vishwa-audio-${Date.now()}.wav`);
            console.log('[FRONTEND] Created audio file instance:', audioFile.uri);

            // Decode base64 to binary
            const binaryString = atob(base64Wav);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            console.log('[FRONTEND] Decoded WAV to bytes:', bytes.length);

            // Write file
            console.log('[FRONTEND] Writing audio file...');
            await audioFile.write(bytes);
            console.log('[FRONTEND] Audio file written');

            // CRITICAL: Wait for file system flush
            await new Promise(resolve => setTimeout(resolve, 50));

            // Verify file exists and has content (New API)
            console.log(`[FRONTEND] Audio file status - exists: ${audioFile.exists}, size: ${audioFile.size}`);
            if (!audioFile.exists || audioFile.size === 0) {
                console.error('[FRONTEND] Audio file write failed or empty');
                isPlayingRef.current = false;
                if (timeoutId) clearTimeout(timeoutId);
                playNextAudioChunk();
                return;
            }

            console.log(`[FRONTEND] Playing audio: ${audioFile.uri} (${audioFile.size} bytes)`);

            // Create player with file URI and shorter update interval
            console.log('[FRONTEND] Creating audio player...');
            const player = createAudioPlayer({
                uri: audioFile.uri
            }, {
                updateInterval: 50 // 50ms for high-frequency updates
            });
            currentSoundRef.current = player;
            console.log('[FRONTEND] Audio player created');

            // Capture file reference for cleanup
            const fileToCleanup = audioFile;

            // Set playback finished callback
            player.addListener('playbackStatusUpdate', (status: any) => {
                const isFinished = status.didJustFinish || (status.isLoaded && status.currentTime >= status.duration && status.duration > 0);

                if (isFinished) {
                    console.log('[FRONTEND] Playback finished - duration:', status.duration);
                    player.remove();
                    currentSoundRef.current = null;
                    isPlayingRef.current = false;
                    if (timeoutId) clearTimeout(timeoutId);

                    // Clean up temp file
                    try {
                        if (fileToCleanup.exists) {
                            fileToCleanup.delete();
                        }
                    } catch (e) {
                        console.warn('[FRONTEND] Failed to delete temp file:', e);
                    }

                    playNextAudioChunk();
                }

                // Handle playback errors
                if (status.error) {
                    console.error('[FRONTEND] Playback error:', status.error);
                    isPlayingRef.current = false;
                    if (timeoutId) clearTimeout(timeoutId);
                    playNextAudioChunk();
                }
            });

            // Start playback
            console.log('[FRONTEND] Starting audio playback...');
            player.play();
            console.log('[FRONTEND] Audio playback started');

        } catch (err) {
            console.error('[FRONTEND] Playback error:', err);
            isPlayingRef.current = false;
            if (timeoutId) clearTimeout(timeoutId);

            // Clean up file on error
            if (audioFile?.exists) {
                try {
                    audioFile.delete();
                } catch (e) { }
            }

            playNextAudioChunk(); // Try next chunk on error
        }
    };

    const handleEvent = (event: string, data: any) => {
        console.log(`[FRONTEND] Event [${event}]:`, data);
        switch (event) {
            case 'sse_connected':
                console.log('[FRONTEND] SSE Connected Event');
                break;
            case 'heartbeat':
                break;
            case 'status':
                setIsConnected(data.connected);
                if (data.connected) {
                    setError(null);
                }
                break;
            case 'inputTranscript':
                setInputText(prev => prev + data.text);
                break;
            case 'outputTranscript':
                setOutputText(prev => prev + data.text);
                break;
            case 'audioChunk':
                console.log('[FRONTEND] audioChunk handler - received base64 length:', data.audioData?.length || 0);

                // Decode and add to byte buffer
                const chunkBytes = base64ToUint8Array(data.audioData);
                pcmBufferRef.current = concatUint8Arrays(pcmBufferRef.current, chunkBytes);

                if (pcmBufferRef.current.length >= BUFFER_THRESHOLD) {
                    console.log('[FRONTEND] Buffer threshold reached:', pcmBufferRef.current.length);
                    audioQueueRef.current.push(pcmBufferRef.current);
                    pcmBufferRef.current = new Uint8Array(0);
                    playNextAudioChunk();
                }
                break;
            case 'turnComplete':
                // Flush remaining bytes
                if (pcmBufferRef.current.length > 0) {
                    console.log('[FRONTEND] Flushing remaining bytes on turn complete:', pcmBufferRef.current.length);
                    audioQueueRef.current.push(pcmBufferRef.current);
                    pcmBufferRef.current = new Uint8Array(0);
                    playNextAudioChunk();
                }
                setInputText(prev => {
                    if (prev.trim()) addMessage('user', prev);
                    return '';
                });
                setOutputText(prev => {
                    if (prev.trim()) addMessage('vishwa', prev);
                    return '';
                });
                break;
            case 'error':
                setError(data.message);
                setIsConnected(false);
                break;
        }
    };

    return {
        session,
        isSessionActive,    // Indicates if conversation is active
        isConnected,
        error,
        inputText,
        outputText,
        startSession,       // Start conversation (recording + SSE + playback)
        stopSession,        // Stop conversation
        addMessage,
    };
}
