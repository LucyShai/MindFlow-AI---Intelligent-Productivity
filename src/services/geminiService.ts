import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface NLPTaskResult {
  title: string;
  description?: string;
  due_date?: string;
  priority: number;
  difficulty: number;
  tags: string[];
  stress_detected: boolean;
  suggested_duration?: number;
}

export async function parseTaskWithAI(input: string): Promise<NLPTaskResult> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Extract task details from this natural language input: "${input}". 
    Current time is ${new Date().toISOString()}.
    Return a JSON object with:
    - title: string
    - description: string (optional)
    - due_date: ISO string (optional)
    - priority: number (1: Low, 2: Medium, 3: High)
    - difficulty: number (1: Easy, 2: Medium, 3: Hard)
    - tags: string[]
    - stress_detected: boolean (true if the input sounds overwhelmed, stressed, or urgent in a negative way)
    - suggested_duration: number (suggested time in minutes to complete the task)
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          due_date: { type: Type.STRING },
          priority: { type: Type.INTEGER },
          difficulty: { type: Type.INTEGER },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          stress_detected: { type: Type.BOOLEAN },
          suggested_duration: { type: Type.INTEGER },
        },
        required: ["title", "priority", "difficulty", "tags", "stress_detected"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}

export async function getProductivityInsights(tasks: any[]): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze these tasks and provide a short, motivating productivity insight. 
    Tasks: ${JSON.stringify(tasks)}
    Focus on:
    - Completion trends
    - Stress management
    - Time allocation
    Keep it under 3 sentences.`,
  });

  return response.text || "You're doing great! Keep focusing on your high-priority tasks.";
}
