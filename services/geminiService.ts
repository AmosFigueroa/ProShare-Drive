import { GoogleGenAI, Type } from "@google/genai";
import { DriveFile, GeminiAnalysis } from '../types';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * Generates a professional summary and context for a specific file.
 */
export const analyzeFileWithGemini = async (file: DriveFile, clientName: string): Promise<GeminiAnalysis> => {
  if (!apiKey) {
    return {
      summary: "AI services unavailable (Missing API Key).",
      tags: [],
      professionalNote: "Please view the file details below."
    };
  }

  const prompt = `
    You are a professional project manager. 
    Analyze this file metadata for a client named "${clientName}".
    
    File Name: ${file.name}
    File Type: ${file.mimeType}
    Size: ${file.size || 'Unknown'}
    Created: ${file.createdTime || 'Unknown'}
    
    Task:
    1. Write a 1-sentence summary of what this file likely contains based on its name and type.
    2. Suggest 3 relevant tags.
    3. Write a short, professional note to the client explaining why this file is important.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            tags: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            professionalNote: { type: Type.STRING }
          },
          required: ["summary", "tags", "professionalNote"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as GeminiAnalysis;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      summary: "Could not generate AI summary.",
      tags: ["File"],
      professionalNote: "Review the file content directly."
    };
  }
};

/**
 * Generates a welcome message for the client based on the file list.
 */
export const generateWelcomeMessage = async (clientName: string, files: DriveFile[]): Promise<string> => {
  if (!apiKey || files.length === 0) return `Welcome, ${clientName}. Here are your shared files.`;

  const fileNames = files.slice(0, 10).map(f => f.name).join(", ");
  
  const prompt = `
    Write a short, warm, and professional welcome message (max 2 sentences) for a client named "${clientName}".
    The shared folder contains: ${fileNames}.
    Focus on collaboration and ease of access.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || `Welcome, ${clientName}. Please find your project files below.`;
  } catch (e) {
    return `Welcome, ${clientName}. Please find your project files below.`;
  }
};