// src/lib/image.ts
export async function compressImage(
  file: File,
  opts: { maxSize: number; quality?: number; mime?: string } = { maxSize: 1600, quality: 0.85, mime: "image/webp" }
): Promise<File> {
  const img = document.createElement("img");
  img.src = URL.createObjectURL(file);
  await new Promise((res) => (img.onload = res));

  const { width, height } = img;
  const scale = Math.min(1, opts.maxSize / Math.max(width, height));
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const blob: Blob = await new Promise((res) =>
    canvas.toBlob(
      (b) => res(b as Blob),
      opts.mime || "image/webp",
      opts.quality ?? 0.85
    )
  );

  // 파일 객체로 변환
  return new File([blob], file.name.replace(/\.\w+$/, ".webp"), { type: blob.type });
}
