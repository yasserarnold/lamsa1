// Minimal Web NFC type surface (not in lib.dom yet).
export type NDEFReadingEvent = { serialNumber: string };
export type NDEFReaderLike = {
  scan: () => Promise<void>;
  write: (message: {
    records: Array<{
      recordType: string;
      mediaType?: string;
      data: string | BufferSource;
    }>;
  }) => Promise<void>;
  onreading: ((ev: NDEFReadingEvent) => void) | null;
  onreadingerror: (() => void) | null;
};

export const isNfcSupported = () =>
  typeof window !== "undefined" && "NDEFReader" in window;

export function getNDEFReader(): NDEFReaderLike {
  const ctor = (window as unknown as { NDEFReader: new () => NDEFReaderLike })
    .NDEFReader;
  return new ctor();
}

/** Scan a single tag and return its normalized (uppercase, no colons) UID. */
export async function scanUidOnce(timeoutMs = 20000): Promise<string> {
  const reader = getNDEFReader();
  await reader.scan();
  return await new Promise<string>((resolve, reject) => {
    const to = setTimeout(() => reject(new Error("انتهت مهلة القراءة")), timeoutMs);
    reader.onreading = (ev) => {
      clearTimeout(to);
      resolve(ev.serialNumber.replace(/:/g, "").toUpperCase());
    };
    reader.onreadingerror = () => {
      clearTimeout(to);
      reject(new Error("خطأ في قراءة البطاقة"));
    };
  });
}