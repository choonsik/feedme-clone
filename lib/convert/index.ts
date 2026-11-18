import { Defuddle } from "defuddle/node";
import { parseHTML } from "linkedom";

import { ConvertError } from "./errors";
import { fetchPage } from "./fetch-page";

export { ConvertError, ERROR_STATUS, type ConvertErrorCode } from "./errors";

export type ConvertResult = {
  title: string;
  author: string | null;
  markdown: string;
};

// 본문으로 볼 수 있는 최소 길이(글자 수). 이보다 짧으면 추출에 실패한 것으로 본다.
const MIN_MARKDOWN_LENGTH = 20;

function parseHttpUrl(raw: unknown): URL {
  if (typeof raw !== "string") throw new ConvertError("invalid_url");
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new ConvertError("invalid_url");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ConvertError("invalid_url");
  }
  return url;
}

export async function convertUrl(rawUrl: unknown): Promise<ConvertResult> {
  const url = parseHttpUrl(rawUrl);
  const { html, finalUrl } = await fetchPage(url);

  let extracted;
  try {
    const { document } = parseHTML(html);
    extracted = await Defuddle(document, finalUrl.href, { markdown: true });
  } catch {
    throw new ConvertError("empty_content");
  }

  const markdown = extracted.content.trim();
  // 이미지 표기(![](주소))는 글자 수에서 뺀다. 영상 임베드만 남은 페이지는 본문이 없는 것이다.
  const text = markdown.replace(/!\[[^\]]*\]\([^)]*\)/g, "").trim();
  if (text.length < MIN_MARKDOWN_LENGTH) throw new ConvertError("empty_content");

  return {
    title: extracted.title?.trim() || finalUrl.hostname,
    author: extracted.author?.trim() || null,
    markdown,
  };
}
