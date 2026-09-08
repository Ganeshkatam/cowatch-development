export interface DefaultAvatar {
  id: string;
  name: string;
  url: string;
}

export const SUPABASE_STORAGE_URL =
  "https://mbnuunibouzwteoeuyfh.supabase.co/storage/v1/object/public/app";

export const DEFAULT_AVATARS: DefaultAvatar[] = [
  {
    id: "avatar_1",
    name: "Teal Breeze",
    url: `${SUPABASE_STORAGE_URL}/avatars/avatar_1.jpg`,
  },
  {
    id: "avatar_2",
    name: "Violet Vision",
    url: `${SUPABASE_STORAGE_URL}/avatars/avatar_2.jpg`,
  },
  {
    id: "avatar_3",
    name: "Amber Glow",
    url: `${SUPABASE_STORAGE_URL}/avatars/avatar_3.jpg`,
  },
  {
    id: "avatar_4",
    name: "Mint Pulse",
    url: `${SUPABASE_STORAGE_URL}/avatars/avatar_4.jpg`,
  },
  {
    id: "avatar_5",
    name: "Rose Coral",
    url: `${SUPABASE_STORAGE_URL}/avatars/avatar_5.jpg`,
  },
];
