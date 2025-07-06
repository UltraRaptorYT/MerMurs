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
