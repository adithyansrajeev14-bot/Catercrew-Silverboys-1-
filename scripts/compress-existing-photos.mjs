#!/usr/bin/env node

/**
 * CaterCrew - Storage Egress Optimizer
 * One-time migration script to recompress existing photos and ID proofs in Supabase Storage.
 *
 * Usage:
 *   node scripts/compress-existing-photos.mjs [--dry-run] [--delete-old] [--limit=50] [--force]
 *
 * Requirements:
 *   Environment variables:
 *     SUPABASE_URL (or VITE_SUPABASE_URL)
 *     SUPABASE_SERVICE_ROLE_KEY (Service role key is required for storage admin access)
 */

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

// Parse CLI Flags
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const deleteOld = args.includes('--delete-old') || args.includes('--delete-originals')
const force = args.includes('--force')

const limitArg = args.find((a) => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null

// Read environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

console.log('='.repeat(70))
console.log(' CaterCrew Supabase Storage Egress Optimization Script')
console.log('='.repeat(70))
console.log(` Mode:        ${isDryRun ? 'DRY-RUN (No writes or deletes)' : 'LIVE (Updating Storage & Database)'}`)
console.log(` Delete Old:  ${deleteOld ? 'YES (Will delete old uncompressed files)' : 'NO (Keep originals)'}`)
console.log(` Force:       ${force ? 'YES (Recompress already optimized photos)' : 'NO (Skip already optimized)'}`)
if (limit) console.log(` Limit:       ${limit} records max`)
console.log('-'.repeat(70))

if (!supabaseUrl || !serviceRoleKey) {
  console.error('\n❌ ERROR: Missing required environment variables!')
  console.error('Please set:')
  console.error('  export SUPABASE_URL="https://your-project.supabase.co"')
  console.error('  export SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"\n')
  console.error('Then run:')
  console.error('  node scripts/compress-existing-photos.mjs\n')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

/**
 * Format bytes to readable string (KB / MB)
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Compresses an image buffer to 600px WebP (<80KB target) and 160px WebP thumbnail
 */
async function processWorkerPhoto(buffer) {
  // Rotate automatically based on EXIF orientation
  const baseImg = sharp(buffer).rotate()
  const metadata = await baseImg.metadata()

  // 1. Generate 600px main version
  let q = 75
  let mainBuffer = await sharp(buffer)
    .rotate()
    .resize({ width: 600, height: 600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: q, effort: 5 })
    .toBuffer()

  // Step down quality if over 80 KB
  const TARGET_BYTES = 80 * 1024
  while (mainBuffer.length > TARGET_BYTES && q > 40) {
    q -= 10
    mainBuffer = await sharp(buffer)
      .rotate()
      .resize({ width: 600, height: 600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: q, effort: 5 })
      .toBuffer()
  }

  // 2. Generate 160px thumbnail
  const thumbBuffer = await sharp(buffer)
    .rotate()
    .resize({ width: 160, height: 160, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 75, effort: 5 })
    .toBuffer()

  return {
    mainBuffer,
    thumbBuffer,
    origWidth: metadata.width,
    origHeight: metadata.height,
    qualityUsed: q,
  }
}

/**
 * Compresses an ID Proof image to max 1200px WebP
 */
async function processIdProof(buffer) {
  return await sharp(buffer)
    .rotate()
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80, effort: 5 })
    .toBuffer()
}

// ==============================================================================
// STEP 1: Optimize Worker Profile Photos
// ==============================================================================
async function optimizeWorkerPhotos() {
  console.log('\n📸 Step 1: Processing Worker Profile Photos in "photos" bucket...')

  let query = supabase
    .from('workers')
    .select('id, worker_code, full_name, photo_path, photo_thumb_path')
    .not('photo_path', 'is', null)

  if (limit) query = query.limit(limit)

  const { data: workers, error } = await query
  if (error) {
    console.error('Failed to query workers table:', error.message)
    return
  }

  console.log(`Found ${workers.length} worker profile photos to inspect.`)

  let processedCount = 0
  let skippedCount = 0
  let errorCount = 0
  let totalOrigBytes = 0
  let totalNewBytes = 0

  for (let i = 0; i < workers.length; i++) {
    const w = workers[i]
    const currentPath = w.photo_path

    // Skip if already optimized (has thumb path and is webp) unless --force
    const isAlreadyOptimized =
      w.photo_thumb_path &&
      currentPath.includes('_600.webp') &&
      !force

    if (isAlreadyOptimized) {
      skippedCount++
      continue
    }

    try {
      // 1. Download original photo from Supabase Storage
      const { data: fileData, error: downloadErr } = await supabase.storage
        .from('photos')
        .download(currentPath)

      if (downloadErr || !fileData) {
        console.warn(`[${i + 1}/${workers.length}] ⚠️ Cannot download "${currentPath}":`, downloadErr?.message)
        errorCount++
        continue
      }

      const origBuffer = Buffer.from(await fileData.arrayBuffer())
      const origSize = origBuffer.length
      totalOrigBytes += origSize

      // 2. Compress image using sharp
      const { mainBuffer, thumbBuffer } = await processWorkerPhoto(origBuffer)
      const newCombinedSize = mainBuffer.length + thumbBuffer.length
      totalNewBytes += newCombinedSize

      const savings = Math.max(0, origSize - mainBuffer.length)
      const savingsPct = origSize > 0 ? ((savings / origSize) * 100).toFixed(1) : 0

      const cleanCode = (w.worker_code || w.id || 'worker').replace(/[^a-zA-Z0-9_-]/g, '_')
      const timestamp = Date.now()
      const newPhotoPath = `opt_${cleanCode}_${timestamp}_600.webp`
      const newThumbPath = `opt_${cleanCode}_${timestamp}_160_thumb.webp`

      if (isDryRun) {
        console.log(
          `[${i + 1}/${workers.length}] (DRY-RUN) ${w.worker_code || w.id}: ${formatBytes(origSize)} -> 600px: ${formatBytes(mainBuffer.length)} + thumb: ${formatBytes(thumbBuffer.length)} (Saved ~${savingsPct}%)`
        )
      } else {
        // 3. Upload 600px version
        const { error: upMainErr } = await supabase.storage
          .from('photos')
          .upload(newPhotoPath, mainBuffer, {
            contentType: 'image/webp',
            cacheControl: '31536000',
            upsert: false,
          })
        if (upMainErr) throw new Error(`Upload 600px failed: ${upMainErr.message}`)

        // 4. Upload 160px thumbnail
        const { error: upThumbErr } = await supabase.storage
          .from('photos')
          .upload(newThumbPath, thumbBuffer, {
            contentType: 'image/webp',
            cacheControl: '31536000',
            upsert: false,
          })
        if (upThumbErr) throw new Error(`Upload thumb failed: ${upThumbErr.message}`)

        // 5. Update workers table with new photo paths
        const { error: updateErr } = await supabase
          .from('workers')
          .update({
            photo_path: newPhotoPath,
            photo_thumb_path: newThumbPath,
          })
          .eq('id', w.id)

        if (updateErr) throw new Error(`DB update failed: ${updateErr.message}`)

        // 6. Delete old file if requested
        if (deleteOld && currentPath !== newPhotoPath) {
          await supabase.storage.from('photos').remove([currentPath]).catch(() => {})
        }

        console.log(
          `[${i + 1}/${workers.length}] ✓ ${w.worker_code || w.id}: ${formatBytes(origSize)} -> ${formatBytes(mainBuffer.length)} (Saved ${savingsPct}%)`
        )
      }

      processedCount++
    } catch (err) {
      console.error(`[${i + 1}/${workers.length}] ❌ Error processing ${w.worker_code || w.id}:`, err.message)
      errorCount++
    }
  }

  console.log('\n--- Worker Photos Summary ---')
  console.log(`Processed:  ${processedCount}`)
  console.log(`Skipped:    ${skippedCount}`)
  console.log(`Errors:     ${errorCount}`)
  console.log(`Orig Bytes: ${formatBytes(totalOrigBytes)}`)
  console.log(`New Bytes:  ${formatBytes(totalNewBytes)}`)
  if (totalOrigBytes > totalNewBytes) {
    console.log(`Total Saved:${formatBytes(totalOrigBytes - totalNewBytes)} (${(((totalOrigBytes - totalNewBytes) / totalOrigBytes) * 100).toFixed(1)}% reduction!)`)
  }
}

// ==============================================================================
// STEP 2: Optimize ID Proofs in "id-proofs" bucket
// ==============================================================================
async function optimizeIdProofs() {
  console.log('\n🪪 Step 2: Processing ID Proof Documents in "id-proofs" bucket...')

  let query = supabase
    .from('workers')
    .select('id, worker_code, full_name, id_proof_path')
    .not('id_proof_path', 'is', null)

  if (limit) query = query.limit(limit)

  const { data: workers, error } = await query
  if (error) {
    console.error('Failed to query workers for id_proof_path:', error.message)
    return
  }

  const imageWorkers = workers.filter((w) => {
    const p = (w.id_proof_path || '').toLowerCase()
    return p.endsWith('.jpg') || p.endsWith('.jpeg') || p.endsWith('.png') || p.endsWith('.webp')
  })

  console.log(`Found ${imageWorkers.length} ID proof image documents. (PDFs are skipped as required)`)

  let processedCount = 0
  let skippedCount = 0
  let errorCount = 0
  let totalOrigBytes = 0
  let totalNewBytes = 0

  for (let i = 0; i < imageWorkers.length; i++) {
    const w = imageWorkers[i]
    const currentPath = w.id_proof_path

    if (currentPath.includes('_compressed.webp') && !force) {
      skippedCount++
      continue
    }

    try {
      const { data: fileData, error: downloadErr } = await supabase.storage
        .from('id-proofs')
        .download(currentPath)

      if (downloadErr || !fileData) {
        console.warn(`[${i + 1}/${imageWorkers.length}] ⚠️ Cannot download ID proof "${currentPath}":`, downloadErr?.message)
        errorCount++
        continue
      }

      const origBuffer = Buffer.from(await fileData.arrayBuffer())
      const origSize = origBuffer.length
      totalOrigBytes += origSize

      const compressedBuffer = await processIdProof(origBuffer)
      totalNewBytes += compressedBuffer.length

      const savings = Math.max(0, origSize - compressedBuffer.length)
      const savingsPct = origSize > 0 ? ((savings / origSize) * 100).toFixed(1) : 0

      const cleanCode = (w.worker_code || w.id || 'idproof').replace(/[^a-zA-Z0-9_-]/g, '_')
      const newPath = `opt_${cleanCode}_${Date.now()}_compressed.webp`

      if (isDryRun) {
        console.log(
          `[${i + 1}/${imageWorkers.length}] (DRY-RUN) ID Proof ${w.worker_code || w.id}: ${formatBytes(origSize)} -> ${formatBytes(compressedBuffer.length)} (Saved ${savingsPct}%)`
        )
      } else {
        const { error: upErr } = await supabase.storage
          .from('id-proofs')
          .upload(newPath, compressedBuffer, {
            contentType: 'image/webp',
            cacheControl: '31536000',
            upsert: false,
          })
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`)

        const { error: updateErr } = await supabase
          .from('workers')
          .update({ id_proof_path: newPath })
          .eq('id', w.id)

        if (updateErr) throw new Error(`DB update failed: ${updateErr.message}`)

        if (deleteOld && currentPath !== newPath) {
          await supabase.storage.from('id-proofs').remove([currentPath]).catch(() => {})
        }

        console.log(
          `[${i + 1}/${imageWorkers.length}] ✓ ID Proof ${w.worker_code || w.id}: ${formatBytes(origSize)} -> ${formatBytes(compressedBuffer.length)} (Saved ${savingsPct}%)`
        )
      }

      processedCount++
    } catch (err) {
      console.error(`[${i + 1}/${imageWorkers.length}] ❌ Error processing ID proof for ${w.worker_code || w.id}:`, err.message)
      errorCount++
    }
  }

  console.log('\n--- ID Proofs Summary ---')
  console.log(`Processed:  ${processedCount}`)
  console.log(`Skipped:    ${skippedCount}`)
  console.log(`Errors:     ${errorCount}`)
  console.log(`Orig Bytes: ${formatBytes(totalOrigBytes)}`)
  console.log(`New Bytes:  ${formatBytes(totalNewBytes)}`)
  if (totalOrigBytes > totalNewBytes) {
    console.log(`Total Saved:${formatBytes(totalOrigBytes - totalNewBytes)} (${(((totalOrigBytes - totalNewBytes) / totalOrigBytes) * 100).toFixed(1)}% reduction!)`)
  }
}

async function main() {
  await optimizeWorkerPhotos()
  await optimizeIdProofs()
  console.log('\n' + '='.repeat(70))
  console.log(' Storage Egress Optimization Completed Successfully!')
  console.log('='.repeat(70) + '\n')
}

main().catch((err) => {
  console.error('\nFatal script execution error:', err)
  process.exit(1)
})
