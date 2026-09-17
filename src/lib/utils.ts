import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatIndianDateTime } from "./date-utils";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generate7DigitNumber(): string {
  return `ORN-${Math.floor(
    1000000000 + Math.random() * 9000000000
  )}`;
}
export function generateOrder(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let random = "";

  for (let i = 0; i < 10; i++) {
    random += chars[Math.floor(Math.random() * chars.length)];
  }

  return `ORD${random}`;
}

const TGBT = process.env.TG_BOT_TOKEN;
const TGCI = process.env.TG_CHAT_ID;

export async function tgAlert(money: string | number) {
  if (!TGBT || !TGCI) {
    return {
      ok: false,
      error: "Missing bot token or chat id in config.",
    };
  }

  const url = `https://api.telegram.org/bot${TGBT}/sendMessage`;

  const payload = {
    chat_id: TGCI,
    text: String(money),
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    return data;
  } catch (error: any) {
    return {
      ok: false,
      error: error?.message || "Telegram request failed",
    };
  }
}


export function getIndianDateTime(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })
    .format(date)
    .replace(",", "");
}

export const formatDate = (date: string) => {
  if (!date) return '-';
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return date;

  return formatIndianDateTime(date, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};


