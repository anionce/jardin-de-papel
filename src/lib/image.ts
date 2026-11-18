const MAX_SIDE = 500
const QUALITY = 0.82

export async function imageFileToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas no disponible")
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL("image/jpeg", QUALITY)
}

export const isUploadedImage = (url: string) => url.startsWith("data:")

export function preloadImage(url: string, timeoutMs = 6000): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.referrerPolicy = "no-referrer"
    const timer = setTimeout(() => resolve(false), timeoutMs)
    img.onload = () => {
      clearTimeout(timer)
      resolve(img.naturalWidth > 10 && img.naturalHeight > 10)
    }
    img.onerror = () => {
      clearTimeout(timer)
      resolve(false)
    }
    img.src = url
  })
}

export async function nextLoadableCover(
  urls: string[],
  current: number,
  failed: Set<string>,
  load: (url: string) => Promise<boolean> = preloadImage
): Promise<number> {
  for (let step = 1; step <= urls.length; step++) {
    const index = (current + step) % urls.length
    if (index === current) break
    const url = urls[index]
    if (failed.has(url)) continue
    if (await load(url)) return index
    failed.add(url)
  }
  return -1
}
