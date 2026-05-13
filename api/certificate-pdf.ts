import type { Hono } from "hono";
import { db } from "./queries/connection";
import { certificates } from "@db/schema";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { generatePdfFromHtml } from "./lib/pdf-generator";

export function registerCertificatePdf(app: Hono) {
  app.get("/api/certificates/:number/pdf", async (c) => {
    const number = c.req.param("number");

    const cert = await db.query.certificates.findFirst({
      where: eq(certificates.certificateNumber, number),
      with: {
        user: { columns: { id: true, name: true } },
        programVersion: {
          with: {
            program: { columns: { id: true, title: true } },
          },
        },
      },
    });

    if (!cert) {
      return c.json({ error: "Certificate not found" }, 404);
    }

    // Generate QR code pointing to verification page
    const verifyUrl = `${c.req.url.replace(/\/pdf$/, "")}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 200, margin: 2 });

    const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 297mm;
      height: 210mm;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }
    .border-decoration {
      position: absolute;
      inset: 12mm;
      border: 2px solid rgba(59, 130, 246, 0.4);
      border-radius: 8px;
      pointer-events: none;
    }
    .border-decoration::before {
      content: '';
      position: absolute;
      inset: 4mm;
      border: 1px solid rgba(59, 130, 246, 0.2);
      border-radius: 4px;
    }
    .content {
      text-align: center;
      z-index: 1;
      padding: 20mm;
      max-width: 260mm;
    }
    .logo {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #3b82f6;
      margin-bottom: 8mm;
    }
    .title {
      font-size: 42px;
      font-weight: 700;
      margin-bottom: 6mm;
      background: linear-gradient(90deg, #fff, #93c5fd);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      font-size: 16px;
      color: #94a3b8;
      margin-bottom: 12mm;
    }
    .recipient {
      font-size: 32px;
      font-weight: 600;
      color: #fff;
      margin-bottom: 4mm;
    }
    .program {
      font-size: 20px;
      color: #93c5fd;
      margin-bottom: 12mm;
    }
    .details {
      display: flex;
      justify-content: center;
      gap: 20mm;
      margin-bottom: 12mm;
      font-size: 13px;
      color: #94a3b8;
    }
    .details div {
      text-align: center;
    }
    .details .label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 2mm;
      color: #64748b;
    }
    .details .value {
      font-size: 15px;
      color: #e2e8f0;
      font-weight: 500;
    }
    .footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10mm;
      margin-top: 8mm;
    }
    .qr {
      width: 28mm;
      height: 28mm;
      background: #fff;
      padding: 2mm;
      border-radius: 4px;
    }
    .qr img {
      width: 100%;
      height: 100%;
    }
    .verify-text {
      font-size: 11px;
      color: #64748b;
      max-width: 50mm;
      text-align: left;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="border-decoration"></div>
  <div class="content">
    <div class="logo">DreamDocs Academy</div>
    <div class="title">Сертификат об окончании</div>
    <div class="subtitle">Настоящим удостоверяется, что</div>
    <div class="recipient">${escapeHtml(cert.user.name)}</div>
    <div class="program">успешно завершил(а) программу<br><strong>${escapeHtml(cert.programVersion.program.title)}</strong></div>
    <div class="details">
      <div>
        <div class="label">Номер сертификата</div>
        <div class="value">${cert.certificateNumber}</div>
      </div>
      <div>
        <div class="label">Дата выдачи</div>
        <div class="value">${new Date(cert.issuedAt).toLocaleDateString("ru-RU")}</div>
      </div>
      <div>
        <div class="label">Результат</div>
        <div class="value">${cert.score ?? "—"} / ${cert.maxScore ?? "—"}</div>
      </div>
    </div>
    <div class="footer">
      <div class="qr"><img src="${qrDataUrl}" alt="QR"></div>
      <div class="verify-text">Отсканируйте QR-код или перейдите по ссылке для проверки подлинности сертификата</div>
    </div>
  </div>
</body>
</html>`;

    try {
      const pdf = await generatePdfFromHtml(html);
      c.header("Content-Type", "application/pdf");
      c.header("Content-Disposition", `inline; filename="certificate-${cert.certificateNumber}.pdf"`);
      return c.body(new Uint8Array(pdf));
    } catch (err: any) {
      console.error("PDF generation error:", err);
      return c.json({ error: "Failed to generate PDF" }, 500);
    }
  });
}

function escapeHtml(text: string | null): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
