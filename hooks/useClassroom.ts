import {
    AudioModule,
    createAudioPlayer,
    RecordingPresets,
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

export function useClassroom() {
    const [session, setSession] = useState<ClassroomSession | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isSessionActive, setIsSessionActive] = useState(false); // Tracks if conversation is active
    const [error, setError] = useState<string | null>(null);
    const [inputText, setInputText] = useState('');
    const [outputText, setOutputText] = useState('');

    // Recording state
    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const recorderState = useAudioRecorderState(recorder);

    // Chunked recording state
    const recordingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const isRecorderBusyRef = useRef(false);
    const errorCountRef = useRef(0);
    const MAX_CONSECUTIVE_ERRORS = 3;

    // Audio playback queue & buffering
    const audioQueueRef = useRef<string[]>([]);        // Queue of base64 PCM chunks
    const pcmBufferRef = useRef<string>('');           // Intermediate buffer for small chunks
    const isPlayingRef = useRef(false);                // Playback in progress flag
    const currentSoundRef = useRef<any>(null);         // Current playing sound
    const BUFFER_THRESHOLD = 15360;                    // ~300ms of PCM at 24kHz (24000 * 2 * 0.3)

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
            if (!status.granted) {
                Alert.alert('Permission to access microphone was denied');
            }

            await setAudioModeAsync({
                playsInSilentMode: true,
                allowsRecording: true,
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
        if (recorderState.isRecording) {
            await recorder.stop();
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
        pcmBufferRef.current = '';
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
                // Only prepare if recorder is not already prepared
                const currentState = recorderState;
                if (!currentState.isRecording && !currentState.canRecord) {
                    await recorder.prepareToRecordAsync();
                }

                recorder.record();
                console.log('[FRONTEND] Started 500ms audio chunk');

                // Wait 500ms (balanced chunking - fast enough for streaming, slow enough for Android)
                await new Promise(resolve => setTimeout(resolve, 500));

                // Stop recording
                await recorder.stop();

                // Wait slightly for file finalization (Android needs ~100ms)
                await new Promise(resolve => setTimeout(resolve, 100));

                const uri = recorder.uri;

                if (uri && sessionIdRef.current) {
                    // Validate file exists and has content (using new File API)
                    const recordedFile = new File(uri);
                    if (!recordedFile.exists || recordedFile.size === 0) {
                        console.warn('[FRONTEND] Recorded file is empty or missing');
                        isRecorderBusyRef.current = false;
                        return;
                    }

                    // Read complete, finalized file
                    const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
                    const format = uri.endsWith('.caf') ? 'caf' : uri.endsWith('.m4a') ? 'm4a' : 'aac';

                    console.log(`[FRONTEND] Sending audio chunk: ${base64.length} bytes, format: ${format}, fileSize: ${recordedFile.size}`);

                    // Send to backend ASYNCHRONOUSLY to avoid blocking the next recording
                    classroomApi.sendAudioChunk(sessionIdRef.current, base64, format)
                        .then(() => console.log(`[FRONTEND] Sent complete audio chunk (${base64.length} bytes)`))
                        .catch(err => console.error('[FRONTEND] Upload error:', err));
                }

                // Reset error count on success
                errorCountRef.current = 0;

            } catch (err: any) {
                errorCountRef.current++;
                console.error(`[FRONTEND] Chunk recording error (${errorCountRef.current}/${MAX_CONSECUTIVE_ERRORS}):`, err);
                setError('Recording error: ' + err.message);

                // Try to reset recorder state on error
                try {
                    if (recorderState.isRecording) {
                        await recorder.stop();
                    }
                } catch (resetErr) {
                    console.warn('[FRONTEND] Failed to reset recorder:', resetErr);
                }
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
            pcmBufferRef.current = '';
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

            const base64Pcm = audioQueueRef.current.shift()!;

            // Validate PCM data
            if (!base64Pcm || base64Pcm.length === 0) {
                console.warn('[FRONTEND] Empty audio chunk, skipping playback');
                isPlayingRef.current = false;
                if (timeoutId) clearTimeout(timeoutId);
                playNextAudioChunk(); // Try next
                return;
            }

            console.log('[FRONTEND] Converting PCM to WAV - input length:', base64Pcm.length);
            // Convert PCM to WAV with header
            const base64Wav = pcmToWav(base64Pcm, 24000, 1); // 24kHz mono from Gemini
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

            // Verify file exists and has content
            if (!audioFile.exists || audioFile.size === 0) {
                console.error('[FRONTEND] Audio file write failed or empty - exists:', audioFile.exists, 'size:', audioFile.size);
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
                if (status.didJustFinish) {
                    console.log('[FRONTEND] Playback finished successfully');
                    player.remove();
                    currentSoundRef.current = null;
                    isPlayingRef.current = false;
                    if (timeoutId) clearTimeout(timeoutId);

                    // Clean up temp file (new API)
                    try {
                        if (fileToCleanup.exists) {
                            fileToCleanup.delete();
                        }
                    } catch (e) {
                        console.warn('[FRONTEND] Failed to delete temp file:', e);
                    }

                    playNextAudioChunk(); // Play next chunk in queue
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
                console.log('[FRONTEND] audioChunk handler - data length:', data.audioData?.length || 0);

                // Add to intermediate buffer
                pcmBufferRef.current += data.audioData;

                // When buffer reaches threshold, push to playback queue
                // Base64 logic: 4 chars = 3 bytes. Threshold is in bytes.
                const bufferBytes = (pcmBufferRef.current.length / 4) * 3;

                if (bufferBytes >= BUFFER_THRESHOLD) {
                    console.log('[FRONTEND] Buffer threshold reached, pushing to queue');
                    audioQueueRef.current.push(pcmBufferRef.current);
                    pcmBufferRef.current = '';
                    playNextAudioChunk();
                }
                break;
            case 'turnComplete':
                // Flush any remaining buffer on turn complete
                if (pcmBufferRef.current.length > 0) {
                    console.log('[FRONTEND] Flushing remaining buffer on turn complete');
                    audioQueueRef.current.push(pcmBufferRef.current);
                    pcmBufferRef.current = '';
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
