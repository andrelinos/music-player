import { NextResponse } from "next/server";
import puppeteer, { type Browser } from "puppeteer";

export async function GET(request: Request) {
  let browser: Browser | null = null;
  console.log("Iniciando extração de vídeos...");

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
    );
    await page.setViewport({ width: 1280, height: 800 });

    // 1. Navega para a página inicial
    const initialUrl =
      "https://www.jw.org/pt/biblioteca/musicas-canticos/clipes-musicais/";
    await page.goto(initialUrl, { waitUntil: "networkidle2", timeout: 60000 });

    // 2. Extrai a URL da página de download
    const videoPageSelector = "a.jsVideoModal";
    await page.waitForSelector(videoPageSelector);
    const downloadPageUrl = await page.$eval(
      videoPageSelector,
      (el) => (el as HTMLAnchorElement).href,
    );
    console.log(`URL da página de downloads encontrada: ${downloadPageUrl}`);

    // 3. Navega para a página de downloads.
    await page.goto(downloadPageUrl, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // --- CORREÇÃO DO MÉTODO DE CLIQUE ---
    // 4. Clica no botão "MP4" usando um método mais robusto.
    const mp4ButtonXPath = "//a[.//span[contains(text(), 'MP4')]]";
    console.log("Esperando pelo botão 'MP4'...");
    await page.waitForSelector("xpath/" + mp4ButtonXPath);

    console.log("Clicando no botão 'MP4' via page.evaluate...");
    await page.evaluate((xpath) => {
      const button = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null,
      ).singleNodeValue;
      if (button) {
        (button as HTMLElement).click();
      } else {
        throw new Error("Botão 'MP4' não foi encontrado dentro do evaluate.");
      }
    }, mp4ButtonXPath);

    // 5. Espera pelos links finais, que agora devem estar visíveis.
    const linkSelector = "a.secondaryButton.fileDownloadButton";
    console.log(`Esperando pelos links de vídeo finais: ${linkSelector}`);
    await page.waitForSelector(linkSelector, { visible: true, timeout: 10000 });

    // 6. Extrai os links de vídeo.
    console.log("Extraindo links de vídeo...");
    const links: string[] = await page.evaluate((sel) => {
      const anchors = Array.from(document.querySelectorAll(sel));
      return anchors
        .map((anchor) => (anchor as HTMLAnchorElement).href)
        .filter(
          (href) =>
            href.toUpperCase().endsWith(".MP4") ||
            href.toUpperCase().endsWith(".M4V"),
        );
    }, linkSelector);

    console.log(`${links.length} links de vídeo encontrados.`);
    return NextResponse.json({ links }, { status: 200 });
  } catch (error) {
    console.error("Erro durante o web scraping com Puppeteer:", error);
    return NextResponse.json(
      { error: "Falha ao extrair os links dos vídeos." },
      { status: 500 },
    );
  } finally {
    if (browser) {
      await browser.close();
      console.log("Navegador fechado.");
    }
  }
}
