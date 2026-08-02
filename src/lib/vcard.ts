// Build a vCard 3.0 string. Values are escaped per RFC 6350.
import type { LinkKind } from "@/lib/link-types";

function esc(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export interface VCardInput {
  fullName: string;
  title?: string | null;
  bio?: string | null;
  photoBase64?: string | null; // raw base64 (no data: prefix), or null
  photoMime?: string | null; // e.g. "image/jpeg"
  url?: string | null;
  links: Array<{
    type: LinkKind;
    label: string;
    value: string;
  }>;
}

export function buildVCard(input: VCardInput): string {
  const lines: string[] = [];
  lines.push("BEGIN:VCARD");
  lines.push("VERSION:3.0");
  lines.push(`FN;CHARSET=UTF-8:${esc(input.fullName)}`);
  // N (structured name) — put full name in family for simplicity
  lines.push(`N;CHARSET=UTF-8:${esc(input.fullName)};;;;`);
  if (input.title) lines.push(`TITLE;CHARSET=UTF-8:${esc(input.title)}`);
  if (input.bio) lines.push(`NOTE;CHARSET=UTF-8:${esc(input.bio)}`);
  if (input.url) lines.push(`URL;TYPE=WORK:${input.url}`);
  if (input.photoBase64 && input.photoMime) {
    const type = input.photoMime.split("/")[1]?.toUpperCase() || "JPEG";
    lines.push(`PHOTO;ENCODING=b;TYPE=${type}:${input.photoBase64}`);
  }
  for (const link of input.links) {
    switch (link.type) {
      case "email":
        lines.push(`EMAIL;TYPE=INTERNET:${esc(link.value)}`);
        break;
      case "phone":
        lines.push(`TEL;TYPE=CELL:${esc(link.value)}`);
        break;
      case "whatsapp":
        lines.push(`TEL;TYPE=CELL,VOICE:${esc(link.value)}`);
        lines.push(`URL;TYPE=WhatsApp:https://wa.me/${link.value.replace(/[^0-9]/g, "")}`);
        break;
      case "custom": {
        // Custom links use the user-provided label as the URL type so they
        // appear as a single readable line in the exported vCard.
        const typeLabel = (link.label || "LINK").toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 20) || "LINK";
        lines.push(`URL;TYPE=${typeLabel}:${esc(link.value)}`);
        break;
      }
      default:
        lines.push(`URL;TYPE=${link.type.toUpperCase()}:${esc(link.value)}`);
        break;
    }
  }
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

export interface VCardIssue {
  field: string;
  message: string;
  severity: "error" | "warning";
  suggestion?: string;
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^\+?[0-9\s\-()]{6,20}$/;

export function validateVCard(input: VCardInput): VCardIssue[] {
  const issues: VCardIssue[] = [];
  if (!input.fullName || input.fullName.trim().length < 2) {
    issues.push({
      field: "fullName",
      message: "الاسم الكامل مطلوب (حرفان على الأقل)",
      severity: "error",
      suggestion: "افتح صفحة البروفايل واملأ حقل \"الاسم الكامل\" بالاسم الثنائي على الأقل",
    });
  }
  if (!input.title) {
    issues.push({
      field: "title",
      message: "المسمى الوظيفي غير محدد",
      severity: "warning",
      suggestion: "أضف مسمى مثل \"مؤسس شركة\" أو \"مصمم منتجات\" لعرض احترافي",
    });
  }
  if (!input.url) {
    issues.push({
      field: "url",
      message: "رابط البروفايل العام غير متاح",
      severity: "warning",
      suggestion: "حدّد اسم مستخدم من صفحة البروفايل لينتج رابط /u/username",
    });
  }
  const hasPhone = input.links.some((l) => l.type === "phone" || l.type === "whatsapp");
  const hasEmail = input.links.some((l) => l.type === "email");
  if (!hasPhone && !hasEmail) {
    issues.push({
      field: "links",
      message: "لا يوجد وسيلة تواصل مباشرة",
      severity: "error",
      suggestion: "أضف رابطًا من نوع \"هاتف\" أو \"بريد إلكتروني\" ليعمل التحميل كجهة اتصال",
    });
  }
  input.links.forEach((l, i) => {
    const name = l.label || l.type;
    if (!l.value?.trim()) {
      issues.push({
        field: `links[${i}]`,
        message: `الرابط "${name}" فارغ`,
        severity: "error",
        suggestion: "أدخل قيمة للرابط أو احذفه من صفحة الروابط",
      });
      return;
    }
    if (l.type === "email" && !emailRe.test(l.value)) {
      const suggested = l.value.replace(/\s+/g, "").toLowerCase();
      issues.push({
        field: `links[${i}]`,
        message: `صيغة البريد غير صحيحة: ${l.value}`,
        severity: "error",
        suggestion: `تأكد من الصيغة name@domain.com${suggested !== l.value ? ` — جرّب: ${suggested}` : ""}`,
      });
    }
    if ((l.type === "phone" || l.type === "whatsapp") && !phoneRe.test(l.value)) {
      const digits = l.value.replace(/[^\d+]/g, "");
      const suggested = digits.startsWith("+") ? digits : `+${digits}`;
      issues.push({
        field: `links[${i}]`,
        message: `رقم غير صالح: ${l.value}`,
        severity: "error",
        suggestion: `استخدم الصيغة الدولية بادئة +${digits ? ` — جرّب: ${suggested}` : ""}`,
      });
    }
    if ((l.type === "url" || l.type === "social") && !/^https?:\/\//i.test(l.value)) {
      issues.push({
        field: `links[${i}]`,
        message: `الرابط "${name}" لا يبدأ بـ https://`,
        severity: "warning",
        suggestion: `جرّب: https://${l.value.replace(/^\/+/, "")}`,
      });
    }
  });
  return issues;
}
