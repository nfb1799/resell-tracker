// Photo handling without Cloud Storage.
//
// Firebase's Cloud Storage needs a billing account attached, so photos live in
// Firestore instead, as JPEG data URLs shrunk in the browser first. Two sizes
// come out of every pick:
//
//   thumb — tiny, rides along on the item document so lists can show it without
//           an extra read (a few KB each, so syncing a full inventory stays cheap)
//   full  — the one worth looking at, kept in a separate document that is only
//           read when you open the item
//
// A Firestore document caps at 1 MiB, which the sizes below stay well inside.

const THUMB_MAX_PX = 96
const FULL_MAX_PX = 900
const THUMB_QUALITY = 0.6
const FULL_QUALITY = 0.72

// Rejecting oversized input up front beats decoding a 50MP photo on a phone.
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

function drawScaled(bitmap, maxPx, quality) {
  const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))

  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  // JPEG has no alpha; without this, transparent PNGs come out with black edges.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

  return canvas.toDataURL('image/jpeg', quality)
}

// Turns a picked file into { thumb, full } data URLs.
export async function processPhoto(file) {
  if (!file.type.startsWith('image/')) {
    throw new Error('That file is not an image.')
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('That image is too large — pick one under 25MB.')
  }

  // `from-image` applies the EXIF rotation, so phone photos are not sideways.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    return {
      thumb: drawScaled(bitmap, THUMB_MAX_PX, THUMB_QUALITY),
      full: drawScaled(bitmap, FULL_MAX_PX, FULL_QUALITY),
    }
  } finally {
    bitmap.close()
  }
}
