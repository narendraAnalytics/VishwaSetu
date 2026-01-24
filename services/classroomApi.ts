const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Convert HTTP URL to WebSocket URL
const getWebSocketUrl = (): string => {
    const wsUrl = BASE_URL.replace(/^http/, 'ws');
    return wsUrl;
};

export const classroomApi = {
    // Get WebSocket connection URL
    getWebSocketUrl,
};
