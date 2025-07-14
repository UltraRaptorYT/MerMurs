import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabaseClient";

export async function POST(req: NextRequest) {
  const supabase = createSupabaseClient();
  const { audio_url, phrase_id, next_language } = await req.json();

  if (!audio_url || !next_language || !phrase_id) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    console.log("STEP 1");
    // Step 1: Fetch audio file as Blob
    const audioRes = await fetch(audio_url);
    if (!audioRes.ok) {
      const err = await audioRes.json();
      console.error("Supabase storage error:", err);
      throw new Error(
        "Failed to download audio: " + (err.message || audioRes.status)
      );
    }
    const audioBlob = await audioRes.blob();
    console.log("Fetched blob type:", audioBlob.type);

    // Step 2: Send FormData to /api/scrape
    console.log("STEP 2");
    const formData = new FormData();
    formData.append(
      "file",
      new File([audioBlob], "audio.wav", { type: "audio/wav" })
    );
    formData.append("lang", next_language);

    const scrapeRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/scrape`,
      {
        method: "POST",
        body: formData,
      }
    );

    const { text: transcribed_text } = await scrapeRes.json();

    if (!transcribed_text) {
      return NextResponse.json(
        { error: "Failed to transcribe" },
        { status: 500 }
      );
    }

    // Step 3: Send transcription to /api/elevenlabs
    console.log("STEP 3");
    const elevenRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/elevenlabs`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcribed_text, lang: next_language }),
      }
    );

    const { url: processed_audio_url } = await elevenRes.json();

    if (!processed_audio_url) {
      return NextResponse.json(
        { error: "Failed to synthesize speech" },
        { status: 500 }
      );
    }

    // Step 4: Check for if need like pronounciation help
    let assist_text = "";
    if (next_language == "chinese" || next_language == "tamil") {
      const geminiRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/gemini`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: transcribed_text,
          }),
        }
      );

      const { output } = await geminiRes.json();

      if (!output) {
        return NextResponse.json(
          { error: "Failed to get pronounciation assistance" },
          { status: 500 }
        );
      }

      assist_text = output;
    }
    // Step 4: Update `mermurs_phrases` with both results
    console.log("STEP 4");
    const { error: updateError } = await supabase
      .from("mermurs_phrases")
      .update({
        transcribed_text,
        processed_audio_url,
        assist_text,
      })
      .eq("id", phrase_id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update DB" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      phrase_id,
      transcribed_text,
      processed_audio_url,
      assist_text,
    });
  } catch (err) {
    console.error("❌ Error in /api/processRecording:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
