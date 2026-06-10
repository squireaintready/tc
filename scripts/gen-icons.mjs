// Generates the PWA icons: gradient coin + the same dollar glyph used by the
// Calculator tab icon, punched in the background color.
// Run: node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// ---- minimal PNG encoder (RGBA, no filtering) ----
const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

const encodePng = (size, pixels) => {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filter: none
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---- glyph: dollar sign from the app's Calculator tab icon (24x24 viewBox) ----
const cubic = (p0, p1, p2, p3, n = 80) => {
  const pts = []
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t
    pts.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ])
  }
  return pts
}
const line = (a, b, n = 30) => {
  const pts = []
  for (let i = 0; i <= n; i++) pts.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n])
  return pts
}

const GLYPH_PTS = [
  // S-curve
  ...cubic([12, 8], [10.343, 8], [9, 8.895], [9, 10]),
  ...cubic([9, 10], [9, 11.105], [10.343, 12], [12, 12]),
  ...cubic([12, 12], [13.657, 12], [15, 12.895], [15, 14]),
  ...cubic([15, 14], [15, 15.105], [13.657, 16], [12, 16]),
  // top-right and bottom-left hooks
  ...cubic([12, 8], [13.11, 8], [14.08, 8.402], [14.599, 9]),
  ...cubic([12, 16], [10.89, 16], [9.92, 15.598], [9.401, 15]),
  // vertical bar
  ...line([12, 7], [12, 17]),
]

// ---- drawing ----
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const lerp = (a, b, t) => a + (b - a) * t
const clamp01 = (v) => Math.min(1, Math.max(0, v))

const BG = hex('#0a0010')
const COIN_TOP = hex('#e040fb')
const COIN_BOTTOM = hex('#7c4dff')

const drawIcon = (size, coinScale) => {
  const px = Buffer.alloc(size * size * 4)
  const c = size / 2
  const R = size * coinScale
  const glyphScale = (R * 2 * 0.62) / 10  // glyph is ~10 units tall in its 24-unit box
  const strokeW = glyphScale * 1.9
  const pts = GLYPH_PTS.map(([gx, gy]) => [c + (gx - 12) * glyphScale, c + (gy - 12) * glyphScale])

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      let [r, g, b] = BG
      const dist = Math.hypot(x - c + 0.5, y - c + 0.5)
      const coinA = clamp01(R - dist + 0.5)
      if (coinA > 0) {
        const t = clamp01((y - (c - R)) / (2 * R))
        const cr = lerp(COIN_TOP[0], COIN_BOTTOM[0], t)
        const cg = lerp(COIN_TOP[1], COIN_BOTTOM[1], t)
        const cb = lerp(COIN_TOP[2], COIN_BOTTOM[2], t)
        // distance to the dollar glyph polyline → punched stroke
        let d = Infinity
        for (const [px2, py2] of pts) {
          const dd = Math.hypot(x - px2 + 0.5, y - py2 + 0.5)
          if (dd < d) d = dd
        }
        const glyphA = clamp01(strokeW / 2 - d + 0.5)
        const cover = coinA * (1 - glyphA)
        r = lerp(r, cr, cover)
        g = lerp(g, cg, cover)
        b = lerp(b, cb, cover)
      }
      px[i] = Math.round(r)
      px[i + 1] = Math.round(g)
      px[i + 2] = Math.round(b)
      px[i + 3] = 255
    }
  }
  return encodePng(size, px)
}

mkdirSync(join(ROOT, 'public'), { recursive: true })
writeFileSync(join(ROOT, 'public/icon-192.png'), drawIcon(192, 0.36))
writeFileSync(join(ROOT, 'public/icon-512.png'), drawIcon(512, 0.36))
writeFileSync(join(ROOT, 'public/icon-maskable-512.png'), drawIcon(512, 0.3))
writeFileSync(join(ROOT, 'public/apple-touch-icon.png'), drawIcon(180, 0.36))
console.log('icons written to public/')
