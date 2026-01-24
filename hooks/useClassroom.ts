import {
    AudioModule,
    createAudioPlayer,
    setAudioModeAsync
} from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import LiveAudioStream from 'react-native-live-audio-stream';
import { ClassroomMessage, ClassroomSession } from '../app/types/classroom';
import { pcmToWav } from '../services/audioUtils';
import { classroomApi } from '../services/classroomApi';

export function useClassroom() {
    const [session, setSession] = useState<ClassroomSession | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inputText, setInputText] = useState('');
    const [outputText, setOutputText] = useState('');

    // WebSocket connection
    const wsRef = useRef<WebSocket | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const isRecordingRef = useRef(false);

    // Audio playback queue & buffering
    const audioQueueRef = useRef<Uint8Array[]>([]);
    const pcmBufferRef = useRef<Uint8Array>(new Uint8Array(0));
    const isPlayingRef = useRef(false);
    const currentSoundRef = useRef<any>(null);
    const BUFFER_THRESHOLD = 15360; // ~300ms of PCM at 24kHz

    // Helper to decode Base64 to Uint8Array
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

    // Request permissions on mount
    useEffect(() => {
        (async () => {
            const status = await AudioModule.requestRecordingPermissionsAsync();
            console.log('[FRONTEND] Microphone permission:', status.status, 'granted:', status.granted);

            if (!status.granted) {
                Alert.alert('Microphone Required', 'VishwaSetu needs microphone access. Please enable it in system settings.');
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

    // Play audio chunks in sequence
    const playNextAudioChunk = async () => {
        if (isPlayingRef.current || audioQueueRef.current.length === 0) {
            return;
        }

        console.log('[FRONTEND] Playing audio chunk - queue length:', audioQueueRef.current.length);

        let audioFile: File | null = null;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        try {
            isPlayingRef.current = true;

            // Safety timeout: Reset after 10 seconds
            timeoutId = setTimeout(() => {
                console.warn('[FRONTEND] Playback timeout - forcing reset');
                isPlayingRef.current = false;
                playNextAudioChunk();
            }, 10000);

            const pcmBytes = audioQueueRef.current.shift()!;

            if (!pcmBytes || pcmBytes.length === 0) {
                console.warn('[FRONTEND] Empty audio chunk, skipping');
                isPlayingRef.current = false;
                if (timeoutId) clearTimeout(timeoutId);
                playNextAudioChunk();
                return;
            }

            // Convert PCM to WAV with header
            const base64Wav = pcmToWav(pcmBytes, 24000, 1); // 24kHz mono from Gemini

            // Create File instance in cache directory
            audioFile = new File(Paths.cache, `vishwa-audio-${Date.now()}.wav`);

            // Decode base64 to binary
            const binaryString = atob(base64Wav);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Write file
            await audioFile.write(bytes);

            // Wait for filesystem flush
            await new Promise(resolve => setTimeout(resolve, 50));

            // Verify file exists
            if (!audioFile.exists || audioFile.size === 0) {
                console.error('[FRONTEND] Audio file write failed');
                isPlayingRef.current = false;
                if (timeoutId) clearTimeout(timeoutId);
                playNextAudioChunk();
                return;
            }

            console.log(`[FRONTEND] Playing audio: ${audioFile.uri} (${audioFile.size} bytes)`);

            // Create player
            const player = createAudioPlayer({
                uri: audioFile.uri
            }, {
                updateInterval: 50
            });
            currentSoundRef.current = player;

            const fileToCleanup = audioFile;

            // Set playback finished callback
            player.addListener('playbackStatusUpdate', (status: any) => {
                const isFinished = status.didJustFinish || (status.isLoaded && status.currentTime >= status.duration && status.duration > 0);

                if (isFinished) {
                    console.log('[FRONTEND] Playback finished');
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

                if (status.error) {
                    console.error('[FRONTEND] Playback error:', status.error);
                    isPlayingRef.current = false;
                    if (timeoutId) clearTimeout(timeoutId);
                    playNextAudioChunk();
                }
            });

            player.play();

        } catch (err) {
            console.error('[FRONTEND] Playback error:', err);
            isPlayingRef.current = false;
            if (timeoutId) clearTimeout(timeoutId);

            if (audioFile?.exists) {
                try {
                    audioFile.delete();
                } catch (e) { }
            }

            playNextAudioChunk();
        }
    };

    // Handle WebSocket messages
    const handleWebSocketMessage = (event: string, data: any) => {
        console.log(`[FRONTEND] WebSocket event [${event}]:`, data);

        switch (event) {
            case 'connected':
                console.log('[FRONTEND] WebSocket connected');
                break;

            case 'heartbeat':
                break;

            case 'session_started':
                sessionIdRef.current = data.sessionId;
                console.log('[FRONTEND] Session started:', data.sessionId);
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
                    console.log('[FRONTEND] Flushing remaining bytes:', pcmBufferRef.current.length);
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

    // Start session with WebSocket and native PCM recording
    const startSession = async () => {
        try {
            setError(null);

            // Reset playback state
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

            // Connect to WebSocket
            const wsUrl = classroomApi.getWebSocketUrl();
            console.log('[FRONTEND] Connecting to WebSocket:', wsUrl);

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[FRONTEND] WebSocket connected');
                // Send start session message
                ws.send(JSON.stringify({ type: 'start_session', data: {} }));
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    handleWebSocketMessage(message.type, message.data);
                } catch (e) {
                    console.error('[FRONTEND] Failed to parse WebSocket message:', e);
                }
            };

            ws.onerror = (error) => {
                console.error('[FRONTEND] WebSocket error:', error);
                setError('WebSocket connection error');
                setIsConnected(false);
            };

            ws.onclose = () => {
                console.log('[FRONTEND] WebSocket closed');
                setIsConnected(false);
            };

            // Configure native PCM recording
            const options = {
                sampleRate: 16000,      // 16kHz for Gemini
                channels: 1,            // Mono
                bitsPerSample: 16,      // 16-bit PCM
                audioSource: 6,         // VOICE_COMMUNICATION on Android
                wavFile: ''             // Required: empty string = streaming only, no file save
            };

            LiveAudioStream.init(options);

            // Handle audio data from microphone
            LiveAudioStream.on('data', (data: string) => {
                if (ws.readyState === WebSocket.OPEN) {
                    // data is already base64 PCM from native module
                    ws.send(JSON.stringify({
                        type: 'audio_chunk',
                        data: { audioData: data, format: 'pcm' }
                    }));
                }
            });

            // Start recording
            LiveAudioStream.start();
            isRecordingRef.current = true;

            setSession({ sessionId: 'pending', status: 'active', messages: [] });
            setIsSessionActive(true);

            console.log('[FRONTEND] Session started with native PCM recording');

        } catch (err: any) {
            console.error('[FRONTEND] Start session error:', err);
            setError('Failed to start session: ' + err.message);
            setIsConnected(false);
        }
    };

    // Stop session
    const stopSession = useCallback(async () => {
        // Stop recording
        if (isRecordingRef.current) {
            try {
                LiveAudioStream.stop();
                isRecordingRef.current = false;
            } catch (e) {
                console.error('[FRONTEND] Error stopping recording:', e);
            }
        }

        // Send stop message via WebSocket
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'stop_session', data: {} }));
            wsRef.current.close();
        }
        wsRef.current = null;
        sessionIdRef.current = null;

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

    }, []);

    return {
        session,
        isSessionActive,
        isConnected,
        error,
        inputText,
        outputText,
        startSession,
        stopSession,
        addMessage,
    };
}
