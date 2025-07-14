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
You are a multilingual pronunciation assistant.

Given a sentence or phrase, detect whether the language is Chinese or Tamil.

If it's Chinese, return the Hanyu Pinyin without tone marks.

If it's Tamil, return the Romanized version of the Tamil pronunciation (standard transliteration, not a translation).

Do not translate the phrase. Only convert it to its phonetic pronunciation.

Return the result in this exact JSON format:
{ "output": "<converted pronunciation>" }

Input: "${input}"
`;

    const result = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    });

    const responseText = (result.text || "").trim();

    // If wrapped in Markdown (e.g. triple backticks), remove them
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
