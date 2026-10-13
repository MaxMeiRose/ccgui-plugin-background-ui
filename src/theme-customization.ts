import { THEME_PALETTES, type Colors } from "./theme-palette";
import { MAX_BACKGROUND_BYTES, detectBackgroundMime } from "./background-import-core";

export {
  MAX_BACKGROUND_BYTES,
  detectBackgroundMime,
  isBackgroundImage,
} from "./background-import-core";

export type CustomPalette = { light: Colors; dark: Colors };

export function customThemeColor(color: string | undefined, preset: string): string {
  return /^#[0-9a-f]{6}$/i.test(color || "") ? color! : presetPaletteBase(preset).light.accent;
}

export function paletteFromColor(color: string): CustomPalette {
  const seed = customThemeColor(color, "graphite");
  const mix = (base: string, amount: number) => '#' + [1, 3, 5].map(index =>
    Math.round(parseInt(seed.slice(index, index + 2), 16) * (1 - amount) +
      parseInt(base.slice(index, index + 2), 16) * amount).toString(16).padStart(2, '0')).join('');
  const luminance = (hex: string) => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
  let accent = seed;
  // White button/bubble labels must stay legible even for a pale selected color.
  for (let amount = .05; luminance(accent) > .183 && amount <= 1; amount += .05) accent = mix('#000000', amount);
  return {
    light: { ...THEME_PALETTES.graphite.light, accent, bright: accent, canvas: mix('#f1f3f4', .96) },
    dark: { ...THEME_PALETTES.graphite.dark, accent, bright: mix('#ffffff', .6), canvas: mix('#17191b', .96) },
  };
}

export function presetPaletteBase(preset: string): CustomPalette {
  return Object.prototype.hasOwnProperty.call(THEME_PALETTES, preset)
    ? THEME_PALETTES[preset as keyof typeof THEME_PALETTES] : THEME_PALETTES.acrylic;
}

async function assertBackgroundPixels(data: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => image.naturalWidth * image.naturalHeight <= 40_000_000
      ? resolve() : reject(new Error("图片尺寸过大，请使用不超过 4000 万像素的图片"));
    image.onerror = () => reject(new Error("图片损坏或格式不受支持"));
    image.src = data;
  });
}

export async function readBackgroundFile(file: File): Promise<string> {
  if (file.size > MAX_BACKGROUND_BYTES) throw new Error("图片不能超过 12 MB");
  if (!file.size) throw new Error("图片文件为空");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const mime = detectBackgroundMime(bytes);
  if (!mime) throw new Error("请选择 PNG、JPEG、WebP 或 GIF 图片");
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(new Blob([file], { type: mime }));
  });
  await assertBackgroundPixels(data);
  // Keep original bytes, so GIF/WebP animation survives import and reload.
  return data;
}

export async function readBackgroundBytes(bytes: Uint8Array, mime: string): Promise<string> {
  if (bytes.byteLength > MAX_BACKGROUND_BYTES) throw new Error("图片不能超过 12 MB");
  if (!bytes.byteLength) throw new Error("图片文件为空");
  if (detectBackgroundMime(bytes) !== mime) throw new Error("请选择 PNG、JPEG、WebP 或 GIF 图片");
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  const data = `data:${mime};base64,${btoa(binary)}`;
  await assertBackgroundPixels(data);
  return data;
}


export async function createBackgroundThumbnail(data: string): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("壁纸缩略图生成失败"));
    element.src = data;
  });
  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 135;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前环境不支持壁纸缩略图");
  const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  return canvas.toDataURL("image/webp", 0.75);
}
