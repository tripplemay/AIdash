import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const IMAGES_DIR = process.env.AI_IMAGES_DIR
  ?? path.join(process.cwd(), "public", "ai-images");

/** 确保目录存在 */
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** 从 URL 下载图片并保存到本地，返回访问路径 */
export async function saveImageFromUrl(imageUrl: string, subDir: string): Promise<string> {
  ensureDir(path.join(IMAGES_DIR, subDir));

  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const hash = crypto.createHash("md5").update(buffer).digest("hex").slice(0, 12);
  const fileName = `${hash}.png`;
  const filePath = path.join(IMAGES_DIR, subDir, fileName);

  fs.writeFileSync(filePath, buffer);

  return `/api/ai-images/${subDir}/${fileName}`;
}

/** 从 base64 保存图片 */
export async function saveImageFromBase64(base64: string, subDir: string): Promise<string> {
  ensureDir(path.join(IMAGES_DIR, subDir));

  const buffer = Buffer.from(base64, "base64");
  const hash = crypto.createHash("md5").update(buffer).digest("hex").slice(0, 12);
  const fileName = `${hash}.png`;
  const filePath = path.join(IMAGES_DIR, subDir, fileName);

  fs.writeFileSync(filePath, buffer);

  return `/api/ai-images/${subDir}/${fileName}`;
}
