"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { RealtimeChannel } from "@supabase/supabase-js";

export default function Recorder({
  playerId,
  phraseId,
  roundId,
  gameId,
  channel,
}: {
  playerId: string;
  phraseId: string;
  roundId: string;
  gameId: string;
  channel: RealtimeChannel | null;
}) {
  const supabase = createSupabaseClient();

  // Web Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const bufferRef = useRef<Float32Array[]>([]);

  // state
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [existingRowId, setExistingRowId] = useState<string | null>(null);

  // fetch any existing recording URL
  useEffect(() => {
    async function fetchExisting() {
      const { data, error } = await supabase
        .from("mermurs_recordings")
        .select("id, audio_path")
        .eq("round_id", roundId)
        .eq("player_id", playerId)
        .maybeSingle();
      if (error) return console.error(error);
      if (data) {
        setExistingRowId(data.id);
        setAudioURL(data.audio_path);
      }
    }
    fetchExisting();
  }, [playerId, roundId]);

  // cleanup AudioContext on unmount
  useEffect(() => {
    return () => {
      stopRecording(); // disconnect if still running
      audioContextRef.current?.close();
    };
  }, []);

  // when WAV blob ready, upload it
  useEffect(() => {
    if (audioBlob) handleUpload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob]);

  async function startRecording() {
    // reset buffers & URL
    bufferRef.current = [];
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
      setAudioURL(null);
    }

    // mark 'incomplete' if re-recording
    if (existingRowId) {
      await supabase
        .from("mermurs_recordings")
        .update({ status: "incomplete", updated_at: new Date().toISOString() })
        .eq("id", existingRowId);
      if (channel) {
        await channel.send({
          type: "broadcast",
          event: "recording_again",
          payload: { player_id: playerId, round_id: roundId },
        });
      }
    }

    // set up Web Audio
    const ctx = new AudioContext();
    audioContextRef.current = ctx;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = ctx.createMediaStreamSource(stream);
    sourceRef.current = source;
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      const channelData = e.inputBuffer.getChannelData(0);
      bufferRef.current.push(new Float32Array(channelData));
    };

    source.connect(processor);
    processor.connect(ctx.destination);

    setRecording(true);
  }

  function stopRecording() {
    if (!recording) return;

    // disconnect audio nodes
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();

    // flatten + encode WAV
    const samples = flattenArray(bufferRef.current);
    const wavBlob = encodeWAV(samples, audioContextRef.current!.sampleRate);
    setAudioBlob(wavBlob);
    setAudioURL(URL.createObjectURL(wavBlob));

    // tear down context
    audioContextRef.current?.close();
    audioContextRef.current = null;
    setRecording(false);
  }

  async function handleUpload() {
    if (!audioBlob) return;
    setUploading(true);

    const fileName = `${uuidv4()}.wav`;
    const { error: uploadError } = await supabase.storage
      .from("syai-mermurs")
      .upload(fileName, audioBlob, { contentType: "audio/wav", upsert: true });
    if (uploadError) {
      console.error("Upload failed:", uploadError);
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("syai-mermurs").getPublicUrl(fileName);

    if (existingRowId) {
      await supabase
        .from("mermurs_recordings")
        .update({
          audio_path: publicUrl,
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRowId);
    } else {
      const { data: insertData, error: insertError } = await supabase
        .from("mermurs_recordings")
        .insert({
          round_id: roundId,
          player_id: playerId,
          phrase_id: phraseId,
          audio_path: publicUrl,
          status: "completed",
          created_at: new Date().toISOString(),
          game_id: gameId,
        })
        .select()
        .single();
      if (insertError) console.error("Insert failed:", insertError);
      else setExistingRowId(insertData.id);
    }

    setUploading(false);
    toast.success("✅ Recording uploaded and marked as done!");
    if (channel) {
      await channel.send({
        type: "broadcast",
        event: "recording_done",
        payload: { player_id: playerId, round_id: roundId },
      });
    }
  }

  return (
    <div className="space-y-3">
      {!recording ? (
        <Button onClick={startRecording} disabled={uploading}>
          🎙️ Start Recording
        </Button>
      ) : (
        <Button variant="destructive" onClick={stopRecording}>
          ⏹️ Stop Recording
        </Button>
      )}

      {audioURL && <audio src={audioURL} controls className="w-full" />}
    </div>
  );
}

// —— WAV helper fns ——

function flattenArray(chunks: Float32Array[]): Float32Array {
  const length = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Float32Array(length);
  let offset = 0;
  for (const c of chunks) {
    result.set(c, offset);
    offset += c.length;
  }
  return result;
}

function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  /* RIFF header */
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  /* fmt chunk */
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk length
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byteRate = sr * blockAlign
  view.setUint16(32, 2, true); // blockAlign = channels * bytesPerSample
  view.setUint16(34, 16, true); // bitsPerSample
  /* data chunk */
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  // PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
