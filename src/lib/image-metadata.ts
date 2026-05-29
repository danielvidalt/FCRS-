// CRC32 (IEEE 802.3) for PNG chunk validation
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of data) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// PNG: insert a tEXt chunk right after the IHDR chunk (offset 33).
function withPngText(bytes: Uint8Array, keyword: string, value: string): Uint8Array {
  const kw = new TextEncoder().encode(keyword);
  const val = new TextEncoder().encode(value);
  const data = new Uint8Array(kw.length + 1 + val.length);
  data.set(kw);
  data[kw.length] = 0;
  data.set(val, kw.length + 1);

  const type = new Uint8Array([0x74, 0x45, 0x58, 0x74]); // "tEXt"
  const crcSrc = new Uint8Array(4 + data.length);
  crcSrc.set(type);
  crcSrc.set(data, 4);
  const checksum = crc32(crcSrc);

  const chunk = new Uint8Array(4 + 4 + data.length + 4);
  const len = data.length;
  chunk[0] = (len >>> 24) & 0xff;
  chunk[1] = (len >>> 16) & 0xff;
  chunk[2] = (len >>> 8) & 0xff;
  chunk[3] = len & 0xff;
  chunk.set(type, 4);
  chunk.set(data, 8);
  chunk[8 + len] = (checksum >>> 24) & 0xff;
  chunk[9 + len] = (checksum >>> 16) & 0xff;
  chunk[10 + len] = (checksum >>> 8) & 0xff;
  chunk[11 + len] = checksum & 0xff;

  // PNG sig (8) + IHDR len(4) + type(4) + data(13) + CRC(4) = 33
  const at = 33;
  const out = new Uint8Array(bytes.length + chunk.length);
  out.set(bytes.slice(0, at));
  out.set(chunk, at);
  out.set(bytes.slice(at), at + chunk.length);
  return out;
}

// JPEG: insert a COM segment (0xFF 0xFE) right after SOI (0xFF 0xD8).
function withJpegComment(bytes: Uint8Array, comment: string): Uint8Array {
  const text = new TextEncoder().encode(comment);
  const segLen = 2 + text.length; // length field includes its own 2 bytes
  const com = new Uint8Array(4 + text.length);
  com[0] = 0xff;
  com[1] = 0xfe;
  com[2] = (segLen >>> 8) & 0xff;
  com[3] = segLen & 0xff;
  com.set(text, 4);

  const out = new Uint8Array(bytes.length + com.length);
  out.set(bytes.slice(0, 2)); // SOI
  out.set(com, 2);
  out.set(bytes.slice(2), 2 + com.length);
  return out;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let b64 = "";
  const STEP = 0x8000;
  for (let i = 0; i < bytes.length; i += STEP) {
    b64 += String.fromCharCode(...bytes.subarray(i, i + STEP));
  }
  return btoa(b64);
}

export interface ImageMetadata {
  projectName?: string;
}

export function addImageMetadata(
  dataUrl: string,
  format: "png" | "jpeg",
  meta: ImageMetadata
): string {
  if (!meta.projectName?.trim()) return dataUrl;

  const [header, b64] = dataUrl.split(",");
  let bytes = base64ToBytes(b64);

  if (format === "jpeg") {
    bytes = withJpegComment(bytes, meta.projectName.trim());
  } else {
    bytes = withPngText(bytes, "Title", meta.projectName.trim());
    bytes = withPngText(bytes, "Software", "Facade Grid Mapper");
  }

  return `${header},${bytesToBase64(bytes)}`;
}
