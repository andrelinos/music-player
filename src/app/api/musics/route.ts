import { NextResponse } from "next/server";

interface MusicTrack {
  title: string;
  file: {
    url: string;
    stream: string;
    modifiedDatetime: string;
    checksum: string;
  };
  filesize: number;
  trackImage: {
    url: string;
    modifiedDatetime: string;
    checksum: string | null;
  };
}

export async function GET() {
  const apiUrl =
    "https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS?output=json&pub=osg&fileformat=MP3&alllangs=0&langwritten=T";

  try {
    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Falha ao buscar dados da API: ${response.statusText}`);
    }

    const data = await response.json();

    const musicTracks: MusicTrack[] = data?.files?.T?.MP3;

    if (!musicTracks || !Array.isArray(musicTracks)) {
      throw new Error(
        "A estrutura do JSON retornado pela API mudou ou está vazia.",
      );
    }

    const links = musicTracks.map((track) => {
      return {
        title: track.title,
        file: track.file,
        filesize: track.filesize,
        trackImage: track.trackImage,
      };
    });

    return NextResponse.json(links, { status: 200 });
  } catch (error) {
    console.error("Erro ao processar a requisição da API:", error);
    return NextResponse.json(
      { error: "Falha ao extrair os links via API." },
      { status: 500 },
    );
  }
}
