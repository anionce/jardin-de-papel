const MAX_SIDE = 500
const QUALITY = 0.82

/**
 * Foto de portada subida desde el móvil/ordenador → JPEG pequeño en data URL
 * (unos 30–60 KB), que se guarda tal cual en el libro. Así no hace falta un
 * almacén de archivos aparte y se ve en todos tus dispositivos.
 */
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

/**
 * Carga una imagen antes de enseñarla: true si existe y no es un píxel vacío
 * (algunas portadas de Open Library fallan o tardan muchísimo).
 */
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
