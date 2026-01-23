import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { convertToPcm } from '../services/audioUtils';
import { GeminiLiveSession } from '../services/geminiLiveService';

const router = Router();

// Session data structure
interface SessionData {
    session: GeminiLiveSession;
    clients: any[];
    lastActivity: number;       // Timestamp of last activity
    lastSentBytes?: number;     // Tracks bytes already sent to Gemini in current recording
}

const sessions = new Map<string, SessionData>();

// Session cleanup job - runs every minute
setInterval(() => {
    const now = Date.now();
    const TIMEOUT = 5 * 60 * 1000; // 5 minutes of inactivity

    for (const [id, data] of sessions.entries()) {
        if (now - data.lastActivity > TIMEOUT) {
            console.log(`[SESSION ${id}] Timeout after 5min inactivity, cleaning up`);
            if (data.session) {
                data.session.disconnect();
            }
            sessions.delete(id);
        }
    }
}, 60 * 1000); // Run every minute

// Start a new classroom session (Lazy initialization)
router.post('/session/start', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

    const sessionId = uuidv4();

    sessions.set(sessionId, {
        session: null as any,
        clients: [],
        lastActivity: Date.now(),
        lastSentBytes: 0,
    });

    console.log(`[SESSION ${sessionId}] Created new session`);
    res.json({ sessionId, status: 'pending' });
});

// SSE endpoint for session events
router.get('/session/:id/events', async (req, res) => {
    const sessionId = req.params.id;
    const sessionData = sessions.get(sessionId);

    if (!sessionData) return res.status(404).json({ error: 'Session not found' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const client = { res };
    sessionData.clients.push(client);

    // Function to send event to this specific client
    const sendToThisClient = (event: string, data: any) => {
        if (!res.writableEnded) {
            res.write(`event: ${event}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
    };

    // Immediate echo to confirm SSE is working
    sendToThisClient('sse_connected', { sessionId, timestamp: Date.now() });

    // Heartbeat to prevent timeouts
    const heartbeat = setInterval(() => {
        sendToThisClient('heartbeat', { alive: true });
    }, 15000);

    // If Gemini session isn't started yet, start it now
    if (!sessionData.session) {
        const apiKey = process.env.GEMINI_API_KEY!;

        const onEvent = (event: string, data: any) => {
            const currentSession = sessions.get(sessionId);
            if (currentSession) {
                console.log(`[BACKEND] Broadcasting SSE event: ${event}`);
                currentSession.clients.forEach(c => {
                    if (!c.res.writableEnded) {
                        c.res.write(`event: ${event}\n`);
                        c.res.write(`data: ${JSON.stringify(data)}\n\n`);
                    }
                });
            }
        };

        console.log(`[SESSION ${sessionId}] Creating new Gemini Live connection`);
        const liveSession = new GeminiLiveSession(apiKey, onEvent);
        sessionData.session = liveSession;

        try {
            await liveSession.connect();
        } catch (error: any) {
            console.error(`[SESSION ${sessionId}] Gemini connection failed:`, error.message);
            sendToThisClient('error', { message: 'Gemini connection failed', details: error.message });
        }
    } else {
        // Session already exists, reuse it
        console.log(`[SESSION ${sessionId}] Reusing existing Gemini connection`);
        sendToThisClient('status', { connected: true });
    }

    // Update last activity
    sessionData.lastActivity = Date.now();

    // Cleanup on client disconnect
    req.on('close', () => {
        clearInterval(heartbeat);
        sessionData.clients = sessionData.clients.filter(c => c !== client);

        console.log(`[SESSION ${sessionId}] Client disconnected. Remaining clients: ${sessionData.clients.length}`);

        // If this was the last client, disconnect Gemini session
        if (sessionData.clients.length === 0) {
            console.log(`[SESSION ${sessionId}] Last client disconnected, closing Gemini session`);
            if (sessionData.session) {
                sessionData.session.disconnect();
            }
            // Don't delete from map yet - timeout cleanup will handle it
        }
    });
});

// Audio chunk upload endpoint with buffering
router.post('/session/:id/audio', async (req, res) => {
    const sessionId = req.params.id;
    const sessionData = sessions.get(sessionId);

    if (!sessionData) return res.status(404).json({ error: 'Session not found' });

    const { audioData, format } = req.body;
    if (!audioData) return res.status(400).json({ error: 'No audio data provided' });

    try {
        // Convert base64 to buffer
        const incomingBuffer = Buffer.from(audioData, 'base64');

        console.log(`[SESSION ${sessionId}] Received ${incomingBuffer.length} bytes of ${format || 'unknown'} audio`);

        // NOTE: Removed minimum size check to allow 200ms micro-chunks for continuous streaming

        let pcmBuffer: Buffer;

        // DUAL-MODE: Support both PCM (direct) and M4A/CAF (conversion) formats
        if (format === 'pcm') {
            // ✅ Direct PCM path (no conversion)
            console.log(`[SESSION ${sessionId}] PCM DIRECT MODE: Received ${incomingBuffer.length} bytes of raw PCM`);

            // Validate PCM buffer
            if (incomingBuffer.length % 2 !== 0) {
                console.warn(`[SESSION ${sessionId}] ⚠️ PCM buffer size ${incomingBuffer.length} is not aligned to 16-bit samples`);
            }

            if (incomingBuffer.length < 100) {
                console.error(`[SESSION ${sessionId}] ❌ PCM buffer too small: ${incomingBuffer.length} bytes`);
                return res.status(400).json({ error: 'PCM buffer too small (minimum 100 bytes)' });
            }

            // Use buffer directly (no conversion)
            pcmBuffer = incomingBuffer;
            console.log(`[SESSION ${sessionId}] ✅ PCM validation passed: ${pcmBuffer.length} bytes`);

        } else {
            // 🔄 FFmpeg conversion path (M4A/CAF → PCM)
            try {
                console.log(`[SESSION ${sessionId}] FFMPEG MODE: Starting conversion of ${incomingBuffer.length} bytes...`);
                pcmBuffer = await convertToPcm(incomingBuffer, format || 'caf');
                console.log(`[SESSION ${sessionId}] ✅ Conversion successful: ${pcmBuffer?.length || 0} PCM bytes produced`);
            } catch (conversionError: any) {
                console.error(`[SESSION ${sessionId}] ❌ Conversion failed:`, conversionError.message);

                // Return error but don't fail the whole request
                return res.json({
                    status: 'conversion_failed',
                    error: conversionError.message,
                    receivedBytes: incomingBuffer.length
                });
            }
        }

        // Send PCM to Gemini (works for both direct and converted PCM)
        if (pcmBuffer.length > 0 && sessionData.session) {
            const mode = format === 'pcm' ? 'DIRECT' : 'CONVERTED';
            console.log(`[SESSION ${sessionId}] 📤 Sending ${mode} PCM buffer (${pcmBuffer.length} bytes) to Gemini`);
            sessionData.session.sendAudioChunk(pcmBuffer);
        }

        sessionData.lastActivity = Date.now();

        res.json({
            status: 'success',
            receivedBytes: incomingBuffer.length,
            pcmBytes: pcmBuffer.length
        });

    } catch (error: any) {
        console.error('[AUDIO PROCESSING ERROR]', error);

        // Return error but don't crash
        res.status(500).json({
            error: 'Failed to process audio',
            details: error.message
        });

        // Still broadcast to SSE clients
        sessionData.clients.forEach(c => {
            if (!c.res.writableEnded) {
                c.res.write(`event: error\n`);
                c.res.write(`data: ${JSON.stringify({ message: 'Audio processing error', details: error.message })}\n\n`);
            }
        });
    }
});

// Stop session
router.post('/session/:id/stop', (req, res) => {
    const sessionId = req.params.id;
    const sessionData = sessions.get(sessionId);

    if (sessionData) {
        sessionData.session.disconnect();
        sessions.delete(sessionId);
    }
    res.json({ status: 'closed' });
});

export default router;
