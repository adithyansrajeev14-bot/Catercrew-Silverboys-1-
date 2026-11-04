/**
 * Client-Side Image Compression & Optimization Utility
 * Drastically reduces Supabase Storage Cached Egress by resizing and compressing
 * photos and documents before upload.
 */

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_ORIGINAL_PHOTO_BYTES = 15 * 1024 * 1024 // 15 MB
const TARGET_PHOTO_BYTES = 80 * 1024 // 80 KB target
const MAX_DOC_PDF_BYTES = 2 * 1024 * 1024 // 2 MB limit for PDF docs

/**
 * Checks if the browser's canvas supports WebP export.
 */
let _supportsWebP = null
export function isWebPSupported() {
  if (_supportsWebP !== null) return _supportsWebP
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    _supportsWebP = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
  } catch {
    _supportsWebP = false
  }
  return _supportsWebP
}

/**
 * Loads a File or Blob into an image element or bitmap, respecting EXIF orientation.
 */
async function loadImageSource(file) {
  if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
    try {
      const bitmap = await window.createImageBitmap(file, {
        imageOrientation: 'from-image',
      })
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => {
          if (typeof bitmap.close === 'function') bitmap.close()
        },
      }
    } catch {
      // Fall through to Image element
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      resolve({
        source: img,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        close: () => URL.revokeObjectURL(url),
      })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image file. The file may be corrupt or not a valid image.'))
    }
    img.src = url
  })
}

/**
 * Calculate aspect-ratio preserved dimensions for a given max longest side.
 */
function calculateDimensions(origWidth, origHeight, maxSide) {
  let targetWidth = origWidth
  let targetHeight = origHeight

  if (origWidth > maxSide || origHeight > maxSide) {
    if (origWidth >= origHeight) {
      targetWidth = maxSide
      targetHeight = Math.round((origHeight * maxSide) / origWidth)
    } else {
      targetHeight = maxSide
      targetWidth = Math.round((origWidth * maxSide) / origHeight)
    }
  }

  return { width: Math.max(1, targetWidth), height: Math.max(1, targetHeight) }
}

/**
 * Draws image source onto a canvas with background fill to avoid transparency artifacts.
 */
function drawToCanvas(source, width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context is not available.')

  // Clean white background for transparency in PNGs converted to WebP/JPEG
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(source, 0, 0, width, height)
  return canvas
}

/**
 * Compresses a profile photo:
 * - Max 600 px longest side (keeps aspect ratio)
 * - WebP (fallback JPEG), quality ~0.75
 * - Target under 80 KB (progressive step-down to 0.65, 0.55, 0.45 if needed)
 * - Generates a 160 px thumbnail version
 *
 * @param {File|Blob} file
 * @returns {Promise<{
 *   file: File,
 *   blob: Blob,
 *   previewUrl: string,
 *   width: number,
 *   height: number,
 *   sizeBytes: number,
 *   mimeType: string,
 *   ext: string,
 *   thumbBlob: Blob,
 *   thumbFile: File,
 *   thumbWidth: number,
 *   thumbHeight: number,
 *   thumbSizeBytes: number,
 *   qualityUsed: number
 * }>}
 */
export async function compressImage(file) {
  if (!file) {
    throw new Error('Please select an image file.')
  }

  const mime = (file.type || '').toLowerCase()
  if (!ALLOWED_IMAGE_TYPES.includes(mime)) {
    throw new Error('Only JPG, PNG, and WebP images are supported.')
  }

  if (file.size > MAX_ORIGINAL_PHOTO_BYTES) {
    throw new Error(
      `Photo file is ${(file.size / 1024 / 1024).toFixed(1)} MB. Please choose a file smaller than 15 MB.`
    )
  }

  const { source, width: origWidth, height: origHeight, close } = await loadImageSource(file)

  try {
    const useWebP = isWebPSupported()
    const targetMime = useWebP ? 'image/webp' : 'image/jpeg'
    const targetExt = useWebP ? 'webp' : 'jpg'

    // 1. Main 600px version
    const { width: mainWidth, height: mainHeight } = calculateDimensions(origWidth, origHeight, 600)
    const mainCanvas = drawToCanvas(source, mainWidth, mainHeight)

    // Quality steps to ensure < 80 KB
    const qualitySteps = [0.75, 0.65, 0.55, 0.45]
    let chosenBlob = null
    let chosenQuality = 0.75

    for (const q of qualitySteps) {
      const blob = await new Promise((resolve) => mainCanvas.toBlob(resolve, targetMime, q))
      if (!blob) continue
      chosenBlob = blob
      chosenQuality = q
      if (blob.size <= TARGET_PHOTO_BYTES) {
        break
      }
    }

    if (!chosenBlob) {
      throw new Error('Failed to compress image.')
    }

    // 2. Thumbnail 160px version
    const { width: thumbWidth, height: thumbHeight } = calculateDimensions(origWidth, origHeight, 160)
    const thumbCanvas = drawToCanvas(source, thumbWidth, thumbHeight)
    const thumbBlob = await new Promise((resolve) => thumbCanvas.toBlob(resolve, targetMime, 0.75))

    const originalName = file.name || 'photo'
    const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || 'photo'

    const mainFile = new File([chosenBlob], `${baseName}_600.${targetExt}`, {
      type: targetMime,
      lastModified: Date.now(),
    })

    const thumbFile = new File([thumbBlob || chosenBlob], `${baseName}_160_thumb.${targetExt}`, {
      type: targetMime,
      lastModified: Date.now(),
    })

    const previewUrl = URL.createObjectURL(chosenBlob)

    return {
      file: mainFile,
      blob: chosenBlob,
      previewUrl,
      width: mainWidth,
      height: mainHeight,
      sizeBytes: chosenBlob.size,
      mimeType: targetMime,
      ext: targetExt,
      thumbBlob: thumbBlob || chosenBlob,
      thumbFile,
      thumbWidth,
      thumbHeight,
      thumbSizeBytes: (thumbBlob || chosenBlob).size,
      qualityUsed: chosenQuality,
    }
  } finally {
    close()
  }
}

/**
 * Compresses an ID Proof or Company Document:
 * - If Image: resize to max 1200 px, quality 0.8, WebP (fallback JPEG)
 * - If PDF: limit to 2 MB, otherwise throw a friendly error
 *
 * @param {File} file
 * @returns {Promise<{
 *   file: File,
 *   isPdf: boolean,
 *   sizeBytes: number,
 *   previewUrl?: string,
 *   ext: string
 * }>}
 */
export async function compressDocument(file) {
  if (!file) {
    throw new Error('Please select a document or ID proof file.')
  }

  const mime = (file.type || '').toLowerCase()
  const isPdf = mime === 'application/pdf' || (file.name && file.name.toLowerCase().endsWith('.pdf'))

  // PDF handling
  if (isPdf) {
    if (file.size > MAX_DOC_PDF_BYTES) {
      throw new Error(
        `PDF document is ${(file.size / 1024 / 1024).toFixed(1)} MB. Please limit PDF files to 2 MB or upload a compressed version.`
      )
    }
    return {
      file,
      isPdf: true,
      sizeBytes: file.size,
      ext: 'pdf',
    }
  }

  // Image handling
  if (ALLOWED_IMAGE_TYPES.includes(mime)) {
    const { source, width: origWidth, height: origHeight, close } = await loadImageSource(file)
    try {
      const useWebP = isWebPSupported()
      const targetMime = useWebP ? 'image/webp' : 'image/jpeg'
      const targetExt = useWebP ? 'webp' : 'jpg'

      const { width: docWidth, height: docHeight } = calculateDimensions(origWidth, origHeight, 1200)
      const canvas = drawToCanvas(source, docWidth, docHeight)

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, targetMime, 0.8))
      if (!blob) throw new Error('Failed to compress document image.')

      const originalName = file.name || 'document'
      const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || 'document'
      const compressedFile = new File([blob], `${baseName}_compressed.${targetExt}`, {
        type: targetMime,
        lastModified: Date.now(),
      })

      return {
        file: compressedFile,
        isPdf: false,
        sizeBytes: blob.size,
        previewUrl: URL.createObjectURL(blob),
        ext: targetExt,
      }
    } finally {
      close()
    }
  }

  throw new Error('Unsupported format. Please upload a PDF under 2 MB or an image (JPG, PNG, WebP).')
}
