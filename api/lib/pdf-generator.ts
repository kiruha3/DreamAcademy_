import { chromium, type Browser } from "playwright";

let browser: Browser | null = null;

export async function getPdfBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

export async function generatePdfFromHtml(html: string): Promise<Buffer> {
  const bw = await getPdfBrowser();
  const page = await bw.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdf = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return pdf;
  } finally {
    await page.close();
  }
}

export async function closePdfBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
