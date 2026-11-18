import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { isBlockedAddress } from "./address";
import { ConvertError } from "./errors";

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 10_000;
const MAX_BYTES = 5 * 1024 * 1024;
const USER_AGENT = "Mozilla/5.0 (compatible; url-to-markdown/0.1)";

async function assertPublicHost(url: URL) {
  const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost")) {
    throw new ConvertError("blocked_address");
  }
  if (isIP(host)) {
    if (isBlockedAddress(host)) throw new ConvertError("blocked_address");
    return;
  }
  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new ConvertError("fetch_failed");
  }
  if (addresses.length === 0) throw new ConvertError("fetch_failed");
  if (addresses.some(({ address }) => isBlockedAddress(address))) {
    throw new ConvertError("blocked_address");
  }
}

async function readText(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) throw new ConvertError("fetch_failed");
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new ConvertError("fetch_failed");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const charset = res.headers.get("content-type")?.match(/charset=([^;\s]+)/i)?.[1];
  try {
    return new TextDecoder(charset ?? "utf-8").decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

/**
 * 공개 인터넷의 HTML 페이지만 가져온다. 리다이렉트는 직접 따라가며 매 단계의
 * 주소를 이름 풀이 결과까지 검사한다.
 */
export async function fetchPage(start: URL): Promise<{ html: string; finalUrl: URL }> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let current = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(current);

    let res: Response;
    try {
      res = await fetch(current, {
        redirect: "manual",
        signal,
        headers: { accept: "text/html,application/xhtml+xml", "user-agent": USER_AGENT },
      });
    } catch {
      throw new ConvertError("fetch_failed");
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      let next: URL;
      try {
        next = new URL(location ?? "", current);
      } catch {
        throw new ConvertError("fetch_failed");
      }
      if (!location || !/^https?:$/.test(next.protocol)) throw new ConvertError("fetch_failed");
      current = next;
      continue;
    }

    if (!res.ok) throw new ConvertError("fetch_failed");
    if (!/text\/html|application\/xhtml\+xml/i.test(res.headers.get("content-type") ?? "")) {
      throw new ConvertError("fetch_failed");
    }
    try {
      return { html: await readText(res), finalUrl: current };
    } catch (error) {
      throw error instanceof ConvertError ? error : new ConvertError("fetch_failed");
    }
  }
  throw new ConvertError("fetch_failed");
}
