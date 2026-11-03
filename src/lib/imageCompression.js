/**
 * Client-Side Image Compression & Optimization Utility
 * Prevents high Supabase egress by resizing and compressing photos before upload.
 */

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_ORIGINAL_SIZE_MB = 15
const MAX_ORIGINAL_BYTES = MAX_ORIGINAL_SIZE_MB * 1024 * 1024
const TARGET_BYTES = 100 * 1024 // 100 KB
const MAX_ALLOWED_BYTES = 500 * 1024 // 500 KB max limit

/**
 * Loads a File/Blob into an image source, respecting EXIF orientation.
 */
async function loadImageSource(file) {
  // Try modern createImageBitmap with EXIF orientation first
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
      // Fallback to standard Image loading below
    }
  }

  // Fallback to HTMLImageElement
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
      reject(new Error('Failed to load image file. The image may be corrupted.'))
    }
    img.src = url
  })
}

/**
 * Compresses an image File or Blob on the client.
 *
 * Rules:
 * 1. Allowed MIME types: image/jpeg, image/png, image/webp
 * 2. Max original size: 15 MB
 * 3. Resize to longest side max 600px (keeps aspect ratio)
 * 4. Output JPEG at quality 0.7, step down to 0.6, 0.5 to reach < 100 KB
 * 5. Also generates a 120px thumbnail (thumbBlob) for list views
 *
 * @param {File|Blob} file
 * @param {Object} options
 * @returns {Promise<{
 *   file: File,
 *   blob: Blob,
 *   previewUrl: string,
 *   width: number,
 *   height: number,
 *   sizeBytes: number,
 *   thumbBlob: Blob,
 *   thumbFile: File,
 *   qualityUsed: number
 * }>}
 */
export async function compressImage(file, options = {}) {
  if (!file) {
    throw new Error('No photo file provided.')
  }

  // 1. Validate MIME type
  const mimeType = file.type || ''
  if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
    throw new Error('Only JPG, PNG, and WebP images are allowed.')
  }

  // 2. Validate original size (max 15 MB)
  if (file.size > MAX_ORIGINAL_BYTES) {
    throw new Error(`Original photo is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed is ${MAX_ORIGINAL_SIZE_MB} MB.`)
  }

  // 3. Load image source with EXIF orientation
  const imgData = await loadImageSource(file)
  const { source, width: origWidth, height: origHeight, close } = imgData

  try {
    const maxSide = options.maxSide || 600
    let targetWidth = origWidth
    let targetHeight = origHeight

    // Calculate aspect-ratio preserved dimensions
    if (origWidth > maxSide || origHeight > maxSide) {
      if (origWidth >= origHeight) {
        targetWidth = maxSide
        targetHeight = Math.round((origHeight * maxSide) / origWidth)
      } else {
        targetHeight = maxSide
        targetWidth = Math.round((origWidth * maxSide) / origHeight)
      }
    }

    // Canvas for main compressed image
    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas 2D context not available.')
    }

    // Optional subtle white background for transparent PNGs
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, targetWidth, targetHeight)
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight)

    // Progressive quality reduction (0.7 -> 0.6 -> 0.5) to hit < 100 KB
    const qualities = [0.7, 0.6, 0.5]
    let chosenBlob = null
    let chosenQuality = 0.7

    for (const q of qualities) {
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', q))
      if (!blob) continue
      chosenBlob = blob
      chosenQuality = q
      if (blob.size <= TARGET_BYTES) {
        break // Reached under 100 KB target!
      }
    }

    if (!chosenBlob) {
      throw new Error('Could not export compressed image from canvas.')
    }

    // Reject if still over 500 KB after compression
    if (chosenBlob.size > MAX_ALLOWED_BYTES) {
      throw new Error(
        `Compressed image is ${(chosenBlob.size / 1024).toFixed(0)} KB, which exceeds the 500 KB safety limit. Please upload a smaller photo.`
      )
    }

    // Generate 120px thumbnail
    const thumbMaxSide = options.thumbMaxSide || 120
    let thumbWidth = origWidth
    let thumbHeight = origHeight
    if (origWidth > thumbMaxSide || origHeight > thumbMaxSide) {
      if (origWidth >= origHeight) {
        thumbWidth = thumbMaxSide
        thumbHeight = Math.round((origHeight * thumbMaxSide) / origWidth)
      } else {
        thumbHeight = thumbMaxSide
        thumbWidth = Math.round((origWidth * thumbMaxSide) / origHeight)
      }
    }

    const thumbCanvas = document.createElement('canvas')
    thumbCanvas.width = thumbWidth
    thumbCanvas.height = thumbHeight
    const thumbCtx = thumbCanvas.getContext('2d')
    thumbCtx.fillStyle = '#FFFFFF'
    thumbCtx.fillRect(0, 0, thumbWidth, thumbHeight)
    thumbCtx.drawImage(source, 0, 0, thumbWidth, thumbHeight)

    const thumbBlob = await new Promise((res) => thumbCanvas.toBlob(res, 'image/jpeg', 0.7))

    const originalName = file.name || 'photo.jpg'
    const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || 'photo'
    const compressedFile = new File([chosenBlob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
    const thumbFile = new File([thumbBlob || chosenBlob], `${baseName}_thumb.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })

    const previewUrl = URL.createObjectURL(chosenBlob)

    return {
      file: compressedFile,
      blob: chosenBlob,
      previewUrl,
      width: targetWidth,
      height: targetHeight,
      sizeBytes: chosenBlob.size,
      thumbBlob: thumbBlob || chosenBlob,
      thumbFile,
      qualityUsed: chosenQuality,
    }
  } finally {
    close()
  }
}
