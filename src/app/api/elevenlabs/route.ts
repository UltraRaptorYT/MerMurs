// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const { message, voice_id } = body;

//     if (!message || !voice_id) {
//       return new Response(
//         JSON.stringify({ error: "Missing message or voice_id" }),
//         {
//           status: 400,
//           headers: { "Content-Type": "application/json" },
//         }
//       );
//     }

//     // Call ElevenLabs API directly
//     const elevenResponse = await fetch(
//       `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}/stream/with-timestamps?allow_unauthenticated=1`,
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           // Add your API key here if needed:
//           // "xi-api-key": "YOUR_API_KEY"
//         },
//         body: JSON.stringify({
//           text: message,
//           model_id: "eleven_v3",
//           voice_settings: {
//             speed: 1,
//           },
//         }),
//       }
//     );

//     if (!elevenResponse.ok || !elevenResponse.body) {
//       throw new Error(`ElevenLabs API error: ${elevenResponse.status}`);
//     }

//     // Process NDJSON stream
//     const reader = elevenResponse.body.getReader();
//     const decoder = new TextDecoder("utf-8");

//     let done = false;
//     let audioChunks: Buffer[] = [];

//     let buffer = "";

//     while (!done) {
//       const { value, done: readerDone } = await reader.read();
//       if (value) {
//         buffer += decoder.decode(value, { stream: true });

//         // Process each complete line (NDJSON)
//         let lines = buffer.split("\n");
//         buffer = lines.pop() || ""; // Leave the last incomplete line in the buffer

//         for (let line of lines) {
//           if (!line.trim()) continue;

//           try {
//             const json = JSON.parse(line);
//             if (json.audio_base64) {
//               audioChunks.push(Buffer.from(json.audio_base64, "base64"));
//             }
//           } catch (err) {
//             console.error("Failed to parse NDJSON chunk:", err);
//           }
//         }
//       }
//       done = readerDone;
//     }

//     if (audioChunks.length === 0) {
//       throw new Error("No audio chunks captured.");
//     }

//     const audioBuffer = Buffer.concat(audioChunks);

//     return new Response(audioBuffer, {
//       status: 200,
//       headers: {
//         "Content-Type": "audio/mpeg",
//         "Content-Disposition": `attachment; filename="output.mp3"`,
//       },
//     });
//   } catch (error) {
//     console.error(error);
//     return new Response(
//       JSON.stringify({ error: "Error processing request." }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }
