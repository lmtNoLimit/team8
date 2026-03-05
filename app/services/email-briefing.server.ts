import nodemailer from "nodemailer";
import type { BriefingSummary } from "./briefing.server";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP credentials not configured. Set SMTP_USER and SMTP_PASS in .env");
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendBriefingEmail(
  to: string,
  briefing: BriefingSummary,
  appUrl: string,
) {
  const transporter = getTransporter();
  const html = buildEmailHtml(briefing, appUrl);

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: briefing.totalEstimatedRevenue > 0
      ? `Your Store Today: ~$${briefing.totalEstimatedRevenue}/mo at risk`
      : "Your Store Today — Morning Briefing",
    html,
  });
}

function buildEmailHtml(briefing: BriefingSummary, appUrl: string): string {
  const priorities = briefing.topPriorities
    .map(
      (p, i) => `
      <tr>
        <td style="width:28px;vertical-align:top;padding:12px 0">
          <div style="width:24px;height:24px;border-radius:50%;background:${i === 0 ? "#fff5f5" : "#f7f8fa"};border:1px solid ${i === 0 ? "#f5c0c0" : "#e4e6eb"};text-align:center;line-height:24px;font-size:12px;font-weight:600;color:${i === 0 ? "#b93030" : "#5c6270"}">${i + 1}</div>
        </td>
        <td style="padding:12px 0 12px 14px;border-bottom:1px solid #e4e6eb;font-size:14px;color:#0f1115;line-height:1.4">${escapeHtml(p.text)}</td>
      </tr>`,
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:40px 16px;background:#eef0f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.07)">

  <!-- Header -->
  <tr><td style="padding:28px 32px 24px;border-bottom:1px solid #e4e6eb">
    <div style="font-size:11px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:#9ba3af;margin-bottom:8px">
      ${escapeHtml(new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }))} &middot; Morning Briefing
    </div>
    <div style="font-size:22px;color:#0f1115;line-height:1.3">${escapeHtml(briefing.greeting)}</div>
    ${
      briefing.totalEstimatedRevenue > 0
        ? `<div style="display:inline-block;margin-top:12px;padding:5px 12px;background:#fffbf0;border:1px solid #f0d898;border-radius:20px;font-size:12px;font-weight:500;color:#7a5b00">~$${briefing.totalEstimatedRevenue}/mo at risk</div>`
        : ""
    }
  </td></tr>

  ${
    priorities
      ? `<!-- Priorities -->
  <tr><td style="padding:24px 32px;border-bottom:1px solid #e4e6eb">
    <div style="font-size:11px;font-weight:600;letter-spacing:0.09em;text-transform:uppercase;color:#9ba3af;margin-bottom:16px">Top Priorities</div>
    <table cellpadding="0" cellspacing="0" style="width:100%">${priorities}</table>
  </td></tr>`
      : ""
  }

  <!-- Banners -->
  <tr><td style="padding:20px 32px 24px">
    ${
      briefing.autoHandledSummary
        ? `<div style="padding:14px 16px;background:#f0faf4;border:1px solid #b5dfc8;border-radius:10px;font-size:13px;color:#1a7a46;line-height:1.4;margin-bottom:10px">${escapeHtml(briefing.autoHandledSummary)}</div>`
        : ""
    }
    ${
      briefing.insightHighlight
        ? `<div style="padding:14px 16px;background:#f0f6ff;border:1px solid #bdd2f5;border-radius:10px;font-size:13px;color:#1a4d8f;line-height:1.4;margin-bottom:10px">${escapeHtml(briefing.insightHighlight)}</div>`
        : ""
    }
    <div style="text-align:center;padding-top:12px">
      <a href="${escapeHtml(appUrl)}" style="display:inline-block;padding:10px 24px;background:#0f1115;color:#fff;border-radius:8px;font-size:13px;font-weight:500;text-decoration:none">Open Full Briefing</a>
    </div>
  </td></tr>

</table>
</body>
</html>`;
}
