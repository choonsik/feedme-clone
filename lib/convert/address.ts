import { isIP } from "node:net";

function parseIPv4(address: string): number[] | null {
  const parts = address.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map((part) => (/^\d{1,3}$/.test(part) ? Number(part) : NaN));
  return octets.every((n) => n >= 0 && n <= 255) ? octets : null;
}

function isBlockedIPv4([a, b]: number[]): boolean {
  return (
    a === 0 || // 0.0.0.0/8
    a === 10 ||
    (a === 100 && b >= 64 && b <= 127) || // 공유 주소 공간(CGNAT)
    a === 127 ||
    (a === 169 && b === 254) || // 링크 로컬, 클라우드 메타데이터 주소 포함
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // 멀티캐스트와 예약 대역
  );
}

// IPv6 주소를 16바이트로 푼다. 끝에 IPv4 표기가 붙은 형태(::ffff:127.0.0.1)도 처리한다.
function parseIPv6(address: string): number[] | null {
  let text = address.toLowerCase().split("%")[0];
  const v4Tail = text.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Tail) {
    const octets = parseIPv4(v4Tail[1]);
    if (!octets) return null;
    const hi = ((octets[0] << 8) | octets[1]).toString(16);
    const lo = ((octets[2] << 8) | octets[3]).toString(16);
    text = text.slice(0, -v4Tail[1].length) + `${hi}:${lo}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...tail];
  const bytes: number[] = [];
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(group)) return null;
    const value = parseInt(group, 16);
    bytes.push(value >> 8, value & 0xff);
  }
  return bytes;
}

function isBlockedIPv6(bytes: number[]): boolean {
  if (bytes.every((b) => b === 0)) return true; // ::
  if (bytes.slice(0, 15).every((b) => b === 0) && bytes[15] === 1) return true; // ::1
  const mapped = bytes.slice(0, 10).every((b) => b === 0) && bytes[10] === 0xff && bytes[11] === 0xff;
  if (mapped) return isBlockedIPv4(bytes.slice(12)); // ::ffff:a.b.c.d
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return true; // fe80::/10 링크 로컬
  if ((bytes[0] & 0xfe) === 0xfc) return true; // fc00::/7 고유 로컬
  if (bytes[0] === 0xff) return true; // 멀티캐스트
  return false;
}

/** 로컬, 사설, 링크 로컬 등 인터넷에 공개되지 않은 주소인지. 해석하지 못하면 막는 쪽으로 본다. */
export function isBlockedAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const octets = parseIPv4(address);
    return octets ? isBlockedIPv4(octets) : true;
  }
  if (version === 6) {
    const bytes = parseIPv6(address);
    return bytes ? isBlockedIPv6(bytes) : true;
  }
  return true;
}
