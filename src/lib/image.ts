const COVER_MAX_SIDE = 500
const COVER_QUALITY = 0.82
const LOCATION_PHOTO_MAX_SIDE = 640
const LOCATION_PHOTO_QUALITY = 0.72

export const scaledSize = (width: number, height: number, maxSide: number) => {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

const resizeToJpegDataUrl = async (file: File, maxSide: number, quality: number): Promise<string> => {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement("canvas")
  Object.assign(canvas, scaledSize(bitmap.width, bitmap.height, maxSide))
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas no disponible")
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL("image/jpeg", quality)
}

export const imageFileToDataUrl = (file: File): Promise<string> => resizeToJpegDataUrl(file, COVER_MAX_SIDE, COVER_QUALITY)

export const locationPhotoToDataUrl = (file: File): Promise<string> =>
  resizeToJpegDataUrl(file, LOCATION_PHOTO_MAX_SIDE, LOCATION_PHOTO_QUALITY)

export const isUploadedImage = (url: string) => url.startsWith("data:")

export const preloadImage = (url: string, timeoutMs = 6000): Promise<boolean> => {
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

export const nextLoadableCover = async (urls: string[], current: number, failed: Set<string>, load: (url: string) => Promise<boolean> = preloadImage): Promise<number> => {
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
