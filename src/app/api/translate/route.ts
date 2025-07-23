import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!, // Set this in .env.local
});

const config = {
  responseMimeType: "application/json",
  responseSchema: {
    type: Type.OBJECT,
    properties: {
      output: {
        type: Type.STRING,
      },
    },
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = body.input;

    const prompt = `
You are a translation assistant.

Translate the following sentence to English. Only return the translation, no explanation or formatting.

Return it in this exact JSON format:
{ "output": "<translated English sentence>" }

Input: "${input}"
`;

    const result = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      config,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    const responseText = (result.text || "").trim();

    const cleanText = responseText.replace(/```json|```/g, "").trim();

    const parsed = JSON.parse(cleanText);
    return NextResponse.json(parsed, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
