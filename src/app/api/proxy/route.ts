// Exemplo para Next.js 13+ (App Router)
// Arquivo: /app/api/proxy/route.ts

import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const audioUrl = searchParams.get("url");

  if (!audioUrl) {
    return new NextResponse("URL de áudio não fornecida", { status: 400 });
  }

  try {
    // O servidor Next.js busca o áudio do CDN
    const audioResponse = await fetch(audioUrl);

    if (!audioResponse.ok) {
      return new NextResponse("Falha ao buscar o áudio do servidor de origem", {
        status: audioResponse.status,
      });
    }

    // Repassa o áudio para o frontend
    const headers = new Headers();
    headers.set(
      "Content-Type",
      audioResponse.headers.get("Content-Type") || "audio/mpeg",
    );
    headers.set(
      "Content-Length",
      audioResponse.headers.get("Content-Length") || "",
    );

    // O 'ReadableStream' é a forma correta de fazer streaming de grandes arquivos
    return new NextResponse(audioResponse.body, { headers });
  } catch (error) {
    return new NextResponse("Erro no servidor proxy", { status: 500 });
  }
}
