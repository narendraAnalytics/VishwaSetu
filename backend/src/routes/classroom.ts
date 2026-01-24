import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { GeminiLiveSession } from '../services/geminiLiveService';

// Session data structure
interface SessionData {
    sessionId: string;
    geminiSession: GeminiLiveSession;
    ws: WebSocket;
    lastActivity: number;
}

const sessions = new Map<string, SessionData>();

// Session cleanup job - runs every minute
setInterval(() => {
    const now = Date.now();
    const TIMEOUT = 5 * 60 * 1000; // 5 minutes of inactivity

    for (const [sessionId, data] of sessions.entries()) {
        if (now - data.lastActivity > TIMEOUT) {
            console.log(`[SESSION ${sessionId}] Timeout after 5min inactivity, cleaning up`);
            if (data.geminiSession) {
                data.geminiSession.disconnect();
            }
            sessions.delete(sessionId);
        }
    }
}, 60 * 1000); // Run every minute

// WebSocket message types
interface WebSocketMessage {
    type: 'start_session' | 'audio_chunk' | 'stop_session';
    data: any;
}

// Handle incoming WebSocket connections
export function handleWebSocketConnection(ws: WebSocket) {
    let currentSessionId: string | null = null;

    // Send message to client
    const send = (type: string, data: any) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type, data }));
        }
    };

    // Handle incoming messages
    ws.on('message', async (rawMessage: Buffer) => {
        try {
            const message: WebSocketMessage = JSON.parse(rawMessage.toString());
            console.log(`[WEBSOCKET] Received message type: ${message.type}`);

            switch (message.type) {
                case 'start_session':
                    await handleStartSession(ws, send);
                    break;

                case 'audio_chunk':
                    await handleAudioChunk(message.data, currentSessionId, send);
                    break;

                case 'stop_session':
                    await handleStopSession(currentSessionId);
                    currentSessionId = null;
                    send('session_stopped', {});
                    break;

                default:
                    console.warn(`[WEBSOCKET] Unknown message type: ${message.type}`);
            }
        } catch (error: any) {
            console.error('[WEBSOCKET] Message parsing error:', error.message);
            send('error', { message: 'Invalid message format' });
        }
    });

    // Handle start session
    async function handleStartSession(ws: WebSocket, send: Function) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            send('error', { message: 'API key not configured' });
            return;
        }

        const sessionId = uuidv4();
        currentSessionId = sessionId;

        console.log(`[SESSION ${sessionId}] Creating new session`);

        // Event callback for Gemini events
        const onGeminiEvent = (event: string, data: any) => {
            send(event, data);
        };

        try {
            // Create and connect Gemini Live session
            const geminiSession = new GeminiLiveSession(apiKey, onGeminiEvent);
            await geminiSession.connect();

            // Store session data
            sessions.set(sessionId, {
                sessionId,
                geminiSession,
                ws,
                lastActivity: Date.now()
            });

            send('session_started', { sessionId });
            send('status', { connected: true });

            console.log(`[SESSION ${sessionId}] Successfully started and connected to Gemini`);
        } catch (error: any) {
            console.error(`[SESSION ${sessionId}] Failed to connect to Gemini:`, error.message);
            send('error', { message: 'Failed to connect to Gemini', details: error.message });
        }
    }

    // Handle audio chunk
    async function handleAudioChunk(data: any, sessionId: string | null, send: Function) {
        if (!sessionId) {
            send('error', { message: 'No active session' });
            return;
        }

        const sessionData = sessions.get(sessionId);
        if (!sessionData) {
            send('error', { message: 'Session not found' });
            return;
        }

        const { audioData, format } = data;
        if (!audioData) {
            send('error', { message: 'No audio data provided' });
            return;
        }

        try {
            // Convert base64 to buffer
            const pcmBuffer = Buffer.from(audioData, 'base64');

            // Validate PCM buffer
            if (pcmBuffer.length === 0) {
                console.warn(`[SESSION ${sessionId}] Empty audio buffer received`);
                return;
            }

            if (pcmBuffer.length % 2 !== 0) {
                console.warn(`[SESSION ${sessionId}] ⚠️ PCM buffer size ${pcmBuffer.length} is not aligned to 16-bit samples`);
            }

            console.log(`[SESSION ${sessionId}] Received ${pcmBuffer.length} bytes of PCM audio`);

            // Send PCM directly to Gemini (no conversion needed)
            sessionData.geminiSession.sendAudioChunk(pcmBuffer);
            sessionData.lastActivity = Date.now();

        } catch (error: any) {
            console.error(`[SESSION ${sessionId}] Audio processing error:`, error.message);
            send('error', { message: 'Audio processing failed', details: error.message });
        }
    }

    // Handle stop session
    async function handleStopSession(sessionId: string | null) {
        if (!sessionId) return;

        const sessionData = sessions.get(sessionId);
        if (sessionData) {
            console.log(`[SESSION ${sessionId}] Stopping session`);
            sessionData.geminiSession.disconnect();
            sessions.delete(sessionId);
        }
    }

    // Handle client disconnect
    ws.on('close', () => {
        console.log('[WEBSOCKET] Client disconnected');
        if (currentSessionId) {
            handleStopSession(currentSessionId);
            currentSessionId = null;
        }
    });

    // Handle WebSocket errors
    ws.on('error', (error) => {
        console.error('[WEBSOCKET] Connection error:', error);
    });

    // Send heartbeat every 15 seconds
    const heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            send('heartbeat', { alive: true });
        } else {
            clearInterval(heartbeatInterval);
        }
    }, 15000);

    // Send initial connection confirmation
    send('connected', { timestamp: Date.now() });
}
