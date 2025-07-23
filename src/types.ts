export interface Member {
  id: string;
  name: string;
  uuid: string;
  image: string;
}

export interface Lobby {
  id: string;
  lobby_code: string;
  status: string;
  chain_length: number;
  round: number;
  created_at: string;
  updated_at: string;
}

export interface Game {
  id: string;
  lobby_code: string;
  status: "waiting" | "start_game" | "in_progress" | "review" | "ended";
  created_at?: string;
  is_review: boolean;
}

export interface Round {
  id: string;
  game_id: string;
  round_number: number;
  created_at?: string;
}

export interface Phrase {
  id: string;
  text: string;
  audio: string;
  created_at: string;
  game_id: string;
  player_id: string;
  round_id: string;
  round_number: number;
  language: string;
  assist_text: string;
  translated_text: string;
  original_phrase_id: string;
  recorded_audio_url: string;
}

export type SupabaseChangePayload<T> = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  schema: string;
  table: string;
  commit_timestamp: string;
  errors?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  old: T | null;
  new: T | null;
};

export interface ExtendedReadableStream<R> extends ReadableStream {
  [Symbol.asyncIterator](): AsyncIterableIterator<R>;
}
