import { headers } from "next/headers";

import MusicPlayer from "@/components/music-player";

type Track = {
  title: string;
  file: {
    url: string;
  };
  trackImage?: {
    url: string;
  };
};

async function getMusics() {
  const h = await headers();
  const host = h.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const origin = `${protocol}://${host}`;

  try {
    const response = await fetch(`${origin}/api/musics`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Falha ao buscar as músicas");
    }

    const data: Track[] = await response.json();
    return data;
  } catch (error) {
    console.error("Erro na busca de dados:", error);
    return [];
  }
}

export default async function Home() {
  const musicData = await getMusics();

  return (
    <main className="font-sans grid items-center justify-items-center min-h-screen p-4 sm:p-8 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {musicData && musicData.length > 0 ? (
        <MusicPlayer playlist={musicData} />
      ) : (
        <div className="text-white text-center bg-red-500/50 p-4 rounded-lg">
          <h1 className="text-2xl font-bold">Nenhuma música encontrada</h1>
          <p>
            Não foi possível carregar a playlist. Verifique o console para mais
            detalhes.
          </p>
        </div>
      )}
    </main>
  );
}
