const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const classroomApi = {
    startSession: async (): Promise<{ sessionId: string }> => {
        const response = await fetch(`${BASE_URL}/api/classroom/session/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to start session');
        return response.json();
    },

    stopSession: async (sessionId: string): Promise<void> => {
        await fetch(`${BASE_URL}/api/classroom/session/${sessionId}/stop`, {
            method: 'POST',
        });
    },

    sendAudioChunk: async (sessionId: string, base64Audio: string, format: string): Promise<void> => {
        await fetch(`${BASE_URL}/api/classroom/session/${sessionId}/audio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioData: base64Audio, format }),
        });
    },

    getEventSourceUrl: (sessionId: string): string => {
        return `${BASE_URL}/api/classroom/session/${sessionId}/events`;
    }
};
