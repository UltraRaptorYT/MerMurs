import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabaseClient";

export async function POST(req: NextRequest) {
  const supabase = createSupabaseClient();
  const { audio_url, check_id, phrase_id, next_language, old_language } =
    await req.json();

  if (
    !audio_url ||
    !next_language ||
    !old_language ||
    !phrase_id ||
    !check_id
  ) {
    console.log(audio_url, next_language, old_language, phrase_id, check_id);
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
    formData.append("old_lang", old_language);
    formData.append("new_lang", next_language);

    const scrapeRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/scrape`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!scrapeRes.ok) {
      const err = await scrapeRes.json(); // or .json() depending on your API
      throw new Error(`Scrape failed: ${err}`);
    }
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
      console.log("STEP 4");
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

    console.log("STEP 4b");
    let translated_text = "";
    if (next_language != "english") {
      const translateRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/translate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: transcribed_text,
          }),
        }
      );

      const result = await translateRes.json();
      translated_text = result.output;

      if (!translated_text) {
        return NextResponse.json(
          { error: "Failed to get English translation" },
          { status: 500 }
        );
      }
    }

    // Step 5 Update original phrase to have the recording audio_url
    console.log("STEP 5");
    const { error: updateError } = await supabase
      .from("mermurs_phrases")
      .update({
        recorded_audio_url: audio_url,
      })
      .eq("id", check_id);

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
      translated_text,
    });
  } catch (err) {
    console.error("❌ Error in /api/processRecording:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
