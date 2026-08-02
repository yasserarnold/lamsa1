/**
 * Reads a browser File into a base64 string (without the `data:...;base64,` prefix).
 * Used before sending uploads to server functions that accept base64 payloads.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = reader.result as string;
      const comma = s.indexOf(",");
      resolve(comma >= 0 ? s.slice(comma + 1) : s);
    };
    reader.onerror = () => reject(reader.error ?? new Error("فشل قراءة الملف"));
    reader.readAsDataURL(file);
  });
}