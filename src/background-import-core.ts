export const MAX_BACKGROUND_BYTES = 12 * 1024 * 1024;

export function isBackgroundImage(value: unknown): value is string {
  return typeof value === "string" && value.length <= Math.ceil(MAX_BACKGROUND_BYTES / 3) * 4 + 64 &&
    /^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/]+={0,2}$/i.test(value);
}

export function detectBackgroundMime(bytes: Uint8Array): "image/png" | "image/jpeg" | "image/gif" | "image/webp" | null {
  const starts = (...header: number[]) => header.every((byte, index) => bytes[index] === byte);
  return starts(137, 80, 78, 71, 13, 10, 26, 10) ? "image/png"
    : starts(255, 216, 255) ? "image/jpeg"
      : starts(71, 73, 70, 56) ? "image/gif"
        : starts(82, 73, 70, 70) && bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80
          ? "image/webp" : null;
}

export function shouldSuppressBackgroundMotion(value: string | undefined): boolean {
  return /^data:image\/gif;/i.test(value || "");
}
