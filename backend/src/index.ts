import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { handleWebSocketConnection } from './routes/classroom';
import { GeminiService } from './services/geminiService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Test Gemini API Key
app.get('/api/test-gemini', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = "gemini-3-flash-preview";

    if (!apiKey) {
        return res.status(500).json({
            success: false,
            error: 'GEMINI_API_KEY not found in environment variables'
        });
    }

    try {
        const geminiService = new GeminiService(apiKey);
        const result = await geminiService.testConnection(modelName);

        res.json(result);
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to connect to Gemini API',
            details: error
        });
    }
});

// Create HTTP server from Express app
const server = createServer(app);

// Create WebSocket server on the same HTTP server
const wss = new WebSocketServer({ server });

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
    console.log('🔌 [WEBSOCKET] New client connected from:', req.socket.remoteAddress);
    handleWebSocketConnection(ws);
});

wss.on('error', (error) => {
    console.error('❌ [WEBSOCKET] Server error:', error);
});

// Start HTTP server (handles both Express and WebSocket)
server.listen(PORT, () => {
    console.log(`✅ VishwaSetu Backend running on http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`🧪 Test Gemini: http://localhost:${PORT}/api/test-gemini`);
    console.log(`🔌 WebSocket server ready on ws://localhost:${PORT}`);
});
