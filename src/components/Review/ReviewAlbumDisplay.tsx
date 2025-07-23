import CustomAudioPlayer from "@/components/AudioPlayer";
import { Phrase } from "@/types";

export default function ReviewAlbumDisplay({ chain }: { chain: Phrase[] }) {
  console.log(chain);
  return (
    <div className="space-y-4">
      {chain.map((p) => (
        <div
          key={p.id}
          className="bg-white text-black rounded-xl p-4 shadow-md space-y-2"
        >
          <div className="font-bold">Round {p.round_number}</div>
          <p>{p.text}</p>
          {p.translated_text && (
            <p className="text-sm text-gray-600">💬 {p.translated_text}</p>
          )}
          {p.assist_text && (
            <p className="text-sm italic text-gray-500">🗣 {p.assist_text}</p>
          )}
          {p.audio && (
            <>
              <CustomAudioPlayer url={p.audio} />
              {p.recorded_audio_url && (
                <CustomAudioPlayer url={p.recorded_audio_url} />
              )}
              <a
                href={p.audio}
                download={`round${p.round_number}_audio.mp3`}
                className="text-blue-500 underline text-sm"
              >
                Download Audio
              </a>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
