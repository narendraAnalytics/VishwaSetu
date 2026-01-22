import { GoogleGenAI } from "@google/genai";

export class GeminiService {
    private ai: GoogleGenAI;

    constructor(apiKey: string) {
        // The @google/genai SDK requires an object with apiKey
        this.ai = new GoogleGenAI({ apiKey });
    }

    async testConnection(modelName: string = "gemini-3-flash-preview") {
        try {
            // Use the pattern from workingcode: ai.models.generateContent
            const response = await this.ai.models.generateContent({
                model: modelName,
                contents: "Say 'Gemini API is active and ready for VishwaSetu!'",
                config: {
                    systemInstruction: "You are the VishwaSetu testing assistant."
                }
            });

            return {
                success: true,
                text: response.text || "No response text",
                model: modelName
            };
        } catch (error: any) {
            console.error(`Gemini Service Error (${modelName}):`, error);
            throw error;
        }
    }

    // Live session and audio processing will be implemented here next
    // as per the codeinfo.md architecture
}
