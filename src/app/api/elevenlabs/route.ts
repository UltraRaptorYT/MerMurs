import { NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { v4 as uuid } from "uuid";
import { ExtendedReadableStream } from "@/types";

const supabase = createSupabaseClient();
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const BUCKET = "syai-mermurs";

if (!ELEVENLABS_API_KEY) {
  throw new Error("Missing ELEVENLABS_API_KEY in environment variables");
}

const elevenlabs = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY,
});

export async function GET() {
  console.log(elevenlabs.samples);
  return NextResponse.json({
    message: "Hi",
  });
}

async function streamToBuffer(
  iter: AsyncIterable<Uint8Array>
): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of iter) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function POST(req: Request) {
  const { text, lang } = await req.json();

  if (!text || typeof text !== "string") {
    return NextResponse.json(
      { error: "Invalid `text` field" },
      { status: 400 }
    );
  }

  const audioChunks = (await elevenlabs.textToSpeech.stream(
    "sla02gCKN0hNfNn9ORJN",
    {
      modelId: "eleven_multilingual_v2",
      text,
      outputFormat: "mp3_44100_128",
      voiceSettings: {
        stability: 0.75,
        similarityBoost: 0.75,
        useSpeakerBoost: true,
        speed: lang == "tamil" ? 0.85 : 1.05,
        style: 1,
      },
    }
  )) as ExtendedReadableStream<Buffer>;

  const buffer = await streamToBuffer(audioChunks);

  // const nodeReadable = readableFromIterator(streamIterator);
  const fileName = `${uuid()}.mp3`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, buffer, {
      contentType: "audio/mpeg",
      upsert: true,
    });

  if (error) {
    console.error("Supabase upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);

  return NextResponse.json({ url: data.publicUrl });
}
