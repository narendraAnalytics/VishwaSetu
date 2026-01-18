
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GroundingSource } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export async function askKnowledgeHub(query: string): Promise<{ text: string; sources: GroundingSource[] }> {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are an assistant for VishwaSetu. Provide interesting cultural facts or information about world languages and countries using simple language. Use search grounding for accuracy.",
      },
    });

    const text = response.text || "I couldn't find information on that right now.";
    const sources: GroundingSource[] = [];

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web) {
          sources.push({
            title: chunk.web.title || "Reference",
            uri: chunk.web.uri,
          });
        }
      });
    }

    return { text, sources };
  } catch (error) {
    console.error("Knowledge Hub Error:", error);
    return { text: "Sorry, I am having trouble reaching the knowledge base.", sources: [] };
  }
}
