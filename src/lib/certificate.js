import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { getPhotoPublicUrl } from './supabase'

/**
 * Convert an image URL to a base64 data URL for jsPDF embedding
 */
async function getBase64Image(url) {
  if (!url) return null
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || 300
        canvas.height = img.naturalHeight || 300
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/jpeg', 0.9))
      } catch (e) {
        console.warn('Canvas export failed, falling back:', e)
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

/**
 * Generate and download an A4 landscape CaterCrew Verification Certificate
 */
export async function generateCertificate(worker) {
  if (!worker || worker.status !== 'verified') {
    throw new Error('Certificate is only available for verified catering staff.')
  }

  // A4 Landscape: 297mm x 210mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = 297
  const pageHeight = 210
  const margin = 12

  // Background
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')

  // Outer Border (Emerald Green)
  doc.setDrawColor(5, 150, 105) // Emerald-600
  doc.setLineWidth(1.5)
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2)

  // Inner Accent Border
  doc.setDrawColor(16, 185, 129) // Emerald-500
  doc.setLineWidth(0.4)
  doc.rect(margin + 2.5, margin + 2.5, pageWidth - (margin + 2.5) * 2, pageHeight - (margin + 2.5) * 2)

  // Corner Accents
  const cornerSize = 8
  const corners = [
    [margin + 4, margin + 4],
    [pageWidth - margin - 4 - cornerSize, margin + 4],
    [margin + 4, pageHeight - margin - 4 - cornerSize],
    [pageWidth - margin - 4 - cornerSize, pageHeight - margin - 4 - cornerSize],
  ]
  doc.setFillColor(5, 150, 105)
  corners.forEach(([x, y]) => {
    doc.rect(x, y, cornerSize, 1, 'F')
    doc.rect(x, y, 1, cornerSize, 'F')
  })

  // Header Brand
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.setTextColor(5, 150, 105) // Emerald-600
  doc.text('CATERCREW', pageWidth / 2, 28, { align: 'center' })

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59) // Slate-800
  doc.text('VERIFICATION CERTIFICATE', pageWidth / 2, 36, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139) // Slate-500
  doc.text('OFFICIAL CATERING EVENT STAFF CREDENTIAL', pageWidth / 2, 42, { align: 'center' })

  // Decorative Horizontal Line with Diamond
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.5)
  doc.line(35, 47, pageWidth - 35, 47)
  doc.setFillColor(5, 150, 105)
  doc.rect(pageWidth / 2 - 2, 45.8, 4, 2.4, 'F')

  // Verification URL
  const verifyUrl = `${window.location.origin}/verify/${encodeURIComponent(worker.worker_code)}`

  // 1. Worker Photo (Left)
  const photoX = 26
  const photoY = 56
  const photoW = 44
  const photoH = 55

  // Photo border box
  doc.setDrawColor(203, 213, 225)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(photoX, photoY, photoW, photoH, 2, 2, 'FD')

  const photoUrl = getPhotoPublicUrl(worker.photo_path)
  let photoData = null
  if (photoUrl) {
    try {
      photoData = await getBase64Image(photoUrl)
    } catch (e) {
      console.warn('Could not load worker photo for PDF:', e)
    }
  }

  if (photoData) {
    try {
      doc.addImage(photoData, 'JPEG', photoX + 1, photoY + 1, photoW - 2, photoH - 2)
    } catch (e) {
      console.warn('jsPDF addImage failed:', e)
    }
  } else {
    // Fallback photo text
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(148, 163, 184)
    doc.text('Verified Staff\nPhoto ID', photoX + photoW / 2, photoY + photoH / 2 - 2, { align: 'center' })
  }

  // 2. Worker Details (Center)
  const infoX = 78
  let currentY = 62

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(148, 163, 184)
  doc.text('REGISTERED NAME', infoX, currentY)

  currentY += 7
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(15, 23, 42)
  doc.text(worker.full_name || 'Staff Member', infoX, currentY)

  currentY += 10
  // Worker ID Badge Container
  doc.setFillColor(236, 253, 245) // emerald-50
  doc.setDrawColor(16, 185, 129) // emerald-500
  doc.roundedRect(infoX, currentY - 4, 60, 9, 1.5, 1.5, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(6, 95, 70) // emerald-800
  doc.text(`ID: ${worker.worker_code}`, infoX + 30, currentY + 2, { align: 'center' })

  // Tier Badge Container
  const tierName = (worker.tier || 'silver').toUpperCase()
  doc.setFillColor(241, 245, 249) // slate-100
  doc.setDrawColor(203, 213, 225)
  doc.roundedRect(infoX + 65, currentY - 4, 52, 9, 1.5, 1.5, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(51, 65, 85)
  doc.text(`${tierName} TIER`, infoX + 91, currentY + 2, { align: 'center' })

  currentY += 14
  // Verified Status Pill
  doc.setFillColor(220, 252, 231) // emerald-100
  doc.setDrawColor(34, 197, 94)
  doc.roundedRect(infoX, currentY - 4, 50, 8, 1.5, 1.5, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(22, 101, 52) // emerald-800
  doc.text('● VERIFIED ACTIVE', infoX + 25, currentY + 1.5, { align: 'center' })

  currentY += 12
  // Issue Date
  const issueDate = worker.verified_at
    ? new Date(worker.verified_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(`Issued Date: ${issueDate}`, infoX, currentY)

  currentY += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(148, 163, 184)
  doc.text('Security Status: Background verified & approved for professional catering events.', infoX, currentY)

  // 3. QR Code Section (Right)
  const qrX = 224
  const qrY = 56
  const qrSize = 46

  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 256,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)
  } catch (err) {
    console.warn('QR code generation failed:', err)
  }

  // QR box border
  doc.setDrawColor(226, 232, 240)
  doc.rect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4)

  // QR Instruction Text
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  doc.text('Verify this certificate by', qrX + qrSize / 2, qrY + qrSize + 6, { align: 'center' })
  doc.text('scanning the QR code.', qrX + qrSize / 2, qrY + qrSize + 10, { align: 'center' })

  // Footer divider line
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.4)
  doc.line(margin + 10, 180, pageWidth - margin - 10, 180)

  // Footer text
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text(
    'CaterCrew Platform • Official Certificate of Verification • Event Catering Staffing Network',
    pageWidth / 2,
    188,
    { align: 'center' }
  )

  doc.setFontSize(7.5)
  doc.setTextColor(5, 150, 105) // Emerald-600
  doc.text(verifyUrl, pageWidth / 2, 193, { align: 'center' })

  // Save PDF
  const filename = `CaterCrew_Certificate_${worker.worker_code || 'verified'}.pdf`
  doc.save(filename)
}
