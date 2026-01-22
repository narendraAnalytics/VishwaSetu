import {
    AudioModule,
    createAudioPlayer,
    RecordingPresets,
    setAudioModeAsync,
    useAudioRecorder,
    useAudioRecorderState
} from 'expo-audio';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { ClassroomMessage, ClassroomSession } from '../app/types/classroom';
import { classroomApi } from '../services/classroomApi';
import { pcmToWav } from '../services/audioUtils';

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

    // Continuous upload state
    const uploadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastUploadSizeRef = useRef<number>(0);

    // Audio playback queue
    const audioQueueRef = useRef<string[]>([]);        // Queue of base64 PCM chunks
    const isPlayingRef = useRef(false);                // Playback in progress flag
    const currentSoundRef = useRef<any>(null);         // Current playing sound

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
        // Stop upload interval
        if (uploadIntervalRef.current) {
            clearInterval(uploadIntervalRef.current);
            uploadIntervalRef.current = null;
        }

        // Stop recorder if active
        if (recorderState.isRecording) {
            await recorder.stop();
        }

        // Send final chunk to backend
        const uri = recorder.uri;
        if (uri && session?.sessionId) {
            try {
                const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
                const format = uri.endsWith('.caf') ? 'caf' : 'aac';
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
        lastUploadSizeRef.current = 0;

    }, [session, recorder, recorderState.isRecording]);

    // Start continuous recording with periodic uploads
    const startContinuousRecording = async (sessionId: string) => {
        try {
            // Prepare and start recording
            await recorder.prepareToRecordAsync();
            recorder.record();

            console.log('[FRONTEND] Started continuous recording');

            // Upload complete file every 500ms
            uploadIntervalRef.current = setInterval(async () => {
                try {
                    const uri = recorder.uri;
                    if (uri) {
                        // Read complete recording file
                        const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
                        const format = uri.endsWith('.caf') ? 'caf' : 'aac';

                        // Only upload if file has grown (new data available)
                        if (base64.length > lastUploadSizeRef.current) {
                            await classroomApi.sendAudioChunk(sessionId, base64, format);
                            lastUploadSizeRef.current = base64.length;
                            console.log(`[FRONTEND] Uploaded audio chunk (${base64.length} bytes)`);
                        }
                    }
                } catch (err) {
                    console.error('[FRONTEND] Upload error:', err);
                }
            }, 500); // Upload every 500ms

        } catch (err: any) {
            console.error('[FRONTEND] Recording error:', err);
            setError('Recording error: ' + err.message);
        }
    };

    const startSession = async () => {
        try {
            setError(null);
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

            // Start continuous recording
            await startContinuousRecording(sessionId);
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
            return;
        }

        try {
            isPlayingRef.current = true;
            const base64Pcm = audioQueueRef.current.shift()!;

            // Convert PCM to WAV with header
            const base64Wav = pcmToWav(base64Pcm, 24000, 1); // 24kHz mono from Gemini

            // Create audio player with data URI
            const player = createAudioPlayer({
                uri: `data:audio/wav;base64,${base64Wav}`
            });

            currentSoundRef.current = player;

            // Set playback finished callback
            player.addListener('playbackStatusUpdate', (status: any) => {
                if (status.didJustFinish) {
                    player.remove();
                    currentSoundRef.current = null;
                    isPlayingRef.current = false;
                    playNextAudioChunk(); // Play next chunk in queue
                }
            });

            // Start playback
            player.play();

        } catch (err) {
            console.error('[FRONTEND] Playback error:', err);
            isPlayingRef.current = false;
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
                // Queue audio chunk for playback
                audioQueueRef.current.push(data.audioData);
                playNextAudioChunk();
                break;
            case 'turnComplete':
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
