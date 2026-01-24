export interface ClassroomMessage {
    id: string;
    role: 'user' | 'vishwa';
    text: string;
    timestamp: Date;
}

export interface ClassroomSession {
    sessionId: string;
    status: 'active' | 'closed';
    messages: ClassroomMessage[];
}

export interface ClassroomEvent {
    event: 'status' | 'audioChunk' | 'inputTranscript' | 'outputTranscript' | 'turnComplete' | 'interrupted' | 'error';
    data: any;
}
