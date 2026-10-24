import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { getPhotoPublicUrl } from './supabase'

/**
 * Load an image from URL into an HTMLImageElement
 */
function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null)
      return
    }
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => {
      console.warn('Failed to load image:', src)
      resolve(null)
    }
    // 5-second timeout safeguard
    setTimeout(() => resolve(null), 5000)
    img.src = src
  })
}

/**
 * Draw image with object-fit: cover into target rectangle
 */
function drawImageCover(ctx, img, targetX, targetY, targetW, targetH) {
  const imgW = img.naturalWidth || img.width
  const imgH = img.naturalHeight || img.height

  const imgRatio = imgW / imgH
  const targetRatio = targetW / targetH

  let srcX = 0
  let srcY = 0
  let srcW = imgW
  let srcH = imgH

  if (imgRatio > targetRatio) {
    // Image is wider than target
    srcW = imgH * targetRatio
    srcX = (imgW - srcW) / 2
  } else {
    // Image is taller than target
    srcH = imgW / targetRatio
    srcY = (imgH - srcH) / 2
  }

  ctx.drawImage(img, srcX, srcY, srcW, srcH, targetX, targetY, targetW, targetH)
}

/**
 * Draw vector fallback template if template image is unavailable
 */
function drawVectorFallback(ctx, width, height) {
  // Background
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, '#f9fafb')
  gradient.addColorStop(0.5, '#f4f6fa')
  gradient.addColorStop(1, '#eaedf2')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  // Outer border
  ctx.strokeStyle = '#162842'
  ctx.lineWidth = 3
  ctx.strokeRect(30, 30, width - 60, height - 60)

  // Inner border with notched corners
  ctx.lineWidth = 6
  ctx.strokeRect(45, 45, width - 90, height - 90)

  // Title
  ctx.fillStyle = '#162842'
  ctx.textAlign = 'center'
  ctx.font = '600 48px "Playfair Display", "Cinzel", "Times New Roman", serif'
  ctx.fillText('VERIFICATIONCERTIFICATE', width / 2, 340)

  // Subtitle
  ctx.fillStyle = '#4a5568'
  ctx.font = '400 28px "Plus Jakarta Sans", system-ui, sans-serif'
  ctx.fillText('This Certificate is given to :', width / 2, 442)
}

/**
 * Generate and download the official CaterCrew Verification Certificate PDF
 * matching the authentic official diploma / certificate design
 */
export async function generateCertificate(worker) {
  if (!worker) {
    throw new Error('Worker record is required to generate certificate.')
  }

  // High-resolution canvas for crisp print quality (A4 aspect ratio ~ 1.414)
  const canvasWidth = 1600
  const canvasHeight = 1131

  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext('2d')

  // 1. Load Background Template
  const templateImg = await loadImage('/certificate-template.jpg')
  if (templateImg) {
    ctx.drawImage(templateImg, 0, 0, canvasWidth, canvasHeight)
  } else {
    drawVectorFallback(ctx, canvasWidth, canvasHeight)
  }

  // 2. Draw Recipient's Name
  const rawName = (worker.full_name || 'Staff Member').trim().toUpperCase()
  ctx.save()
  ctx.fillStyle = '#23324f' // Deep midnight navy
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  // Dynamic font sizing for long names
  let nameFontSize = 54
  ctx.font = `500 ${nameFontSize}px "Playfair Display", "Cinzel", "Times New Roman", Georgia, serif`
  let measuredWidth = ctx.measureText(rawName).width
  const maxNameWidth = 920

  if (measuredWidth > maxNameWidth) {
    nameFontSize = Math.floor(nameFontSize * (maxNameWidth / measuredWidth))
    ctx.font = `500 ${nameFontSize}px "Playfair Display", "Cinzel", "Times New Roman", Georgia, serif`
    measuredWidth = ctx.measureText(rawName).width
  }

  // Name baseline at y = 556
  ctx.fillText(rawName, 800, 556)
  ctx.restore()

  // 3. Draw Gold Accent Divider Line
  ctx.save()
  ctx.fillStyle = '#cca756' // Refined gold tone
  const goldLineWidth = Math.max(540, Math.min(measuredWidth + 80, 850))
  const goldLineX = 800 - goldLineWidth / 2
  const goldLineY = 582.5
  ctx.fillRect(goldLineX, goldLineY, goldLineWidth, 2.5)
  ctx.restore()

  // 4. Draw CREW ID (Bold Black Sans-serif)
  const code = (worker.worker_code || 'CC-SLV-000001').trim()
  const crewIdText = `CREWID:${code}`

  ctx.save()
  ctx.fillStyle = '#000000'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = '800 42px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.fillText(crewIdText, 800, 642)
  ctx.restore()

  // 5. Draw Worker Photo (Centered below CREW ID)
  // Target coordinates in reference image: x: 697, y: 731, width: 202, height: 238
  const photoX = 697
  const photoY = 731
  const photoW = 202
  const photoH = 238

  let photoImg = null
  const photoPath = worker.photo_path || worker.photo
  const photoUrl = photoPath ? getPhotoPublicUrl(photoPath) : null

  if (photoUrl) {
    photoImg = await loadImage(photoUrl)
  }

  ctx.save()
  if (photoImg) {
    // Fill background behind photo to avoid transparency issues
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(photoX, photoY, photoW, photoH)

    // Render photo with object-fit: cover
    drawImageCover(ctx, photoImg, photoX, photoY, photoW, photoH)

    // Subtle 1px crisp photo border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)'
    ctx.lineWidth = 1
    ctx.strokeRect(photoX, photoY, photoW, photoH)
  } else {
    // Elegant placeholder avatar box if photo is missing or offline
    ctx.fillStyle = '#e5e7eb'
    ctx.fillRect(photoX, photoY, photoW, photoH)
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 1.5
    ctx.strokeRect(photoX, photoY, photoW, photoH)

    ctx.fillStyle = '#64748b'
    ctx.textAlign = 'center'
    ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif'
    ctx.fillText('VERIFIED', photoX + photoW / 2, photoY + photoH / 2 - 8)
    ctx.fillText('STAFF PHOTO', photoX + photoW / 2, photoY + photoH / 2 + 18)
  }
  ctx.restore()

  // 6. Draw Verification QR Code (Bottom Right Corner)
  // Target coordinates in reference image: x: 1344, y: 902, width: 142, height: 134
  const qrX = 1344
  const qrY = 902
  const qrW = 142
  const qrH = 134

  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const verifyUrl = `${origin}/verify/${encodeURIComponent(code)}`

    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 256,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })

    const qrImg = await loadImage(qrDataUrl)
    if (qrImg) {
      // Crisp white background for QR code
      ctx.save()
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(qrX - 2, qrY - 2, qrW + 4, qrH + 4)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)'
      ctx.lineWidth = 1
      ctx.strokeRect(qrX - 2, qrY - 2, qrW + 4, qrH + 4)

      // Center square QR code inside bounding box
      const qrSquareSize = Math.min(qrW, qrH)
      const qrOffsetX = qrX + (qrW - qrSquareSize) / 2
      const qrOffsetY = qrY + (qrH - qrSquareSize) / 2
      ctx.drawImage(qrImg, qrOffsetX, qrOffsetY, qrSquareSize, qrSquareSize)
      ctx.restore()
    }
  } catch (err) {
    console.warn('QR Code rendering encountered an issue:', err)
  }

  // 7. Convert Canvas to A4 Landscape PDF using jsPDF
  const certificateDataUrl = canvas.toDataURL('image/jpeg', 0.98)

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  // Full A4 Landscape page dimensions (297mm x 210mm)
  doc.addImage(certificateDataUrl, 'JPEG', 0, 0, 297, 210, undefined, 'FAST')

  // Save the downloaded PDF
  const filename = `CaterCrew_Verification_${code.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
  doc.save(filename)
}
