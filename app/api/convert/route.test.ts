// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// 이 핸들러는 서버(Node)에서 도므로 DOM 전역이 없는 환경에서 시험한다.
// 네트워크 경계: DNS 조회와 fetch만 가짜로 바꾼다. 변환(defuddle)은 실제로 돈다.
const lookupMock = vi.hoisted(() => vi.fn());
vi.mock("node:dns/promises", () => ({ lookup: lookupMock }));

import { POST } from "@/app/api/convert/route";

const ARTICLE_HTML = `<!doctype html>
<html lang="en">
<head>
  <title>Use the saw, fear the saw</title>
  <meta name="author" content="Steph Ango">
</head>
<body>
  <nav><a href="/">Home</a> <a href="/about">About</a> <a href="/archive">Archive</a></nav>
  <article>
    <h1>Use the saw, fear the saw</h1>
    <p>When I learned to use a table saw, my teacher impressed upon me that the machine wants to cut fingers. Fear the saw!</p>
    <p>Power tools reward respect, not bravado. The people who get hurt are rarely beginners, because beginners are still afraid. It is the person with ten years of experience who gets comfortable and stops paying attention.</p>
    <p>The same idea applies far beyond the workshop. Any tool that gives you leverage deserves a short checklist you run every time you pick it up.</p>
  </article>
  <footer>Copyright footer text</footer>
</body>
</html>`;

const NO_AUTHOR_HTML = `<!doctype html><html><head><title>Example Domain</title></head>
<body><div><h1>Example Domain</h1>
<p>This domain is for use in documentation examples without needing permission. Avoid use in operations.</p></div></body></html>`;

const EMPTY_HTML = `<!doctype html><html><head><title>App</title></head>
<body><div id="root"></div><script>window.render()</script></body></html>`;

function htmlResponse(body: string, init: ResponseInit = {}) {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
    ...init,
  });
}

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/convert", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  lookupMock.mockReset();
  lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/convert 성공", () => {
  test("문서형 페이지는 제목, 저자, 본문만 남긴 Markdown을 돌려준다", async () => {
    fetchMock.mockResolvedValue(htmlResponse(ARTICLE_HTML));

    const res = await post({ url: "https://stephango.com/saw" });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.title).toBe("Use the saw, fear the saw");
    expect(data.author).toBe("Steph Ango");
    expect(data.markdown).toContain("the machine wants to cut fingers");
    expect(data.markdown).not.toContain("Archive");
    expect(data.markdown).not.toContain("Copyright footer text");
  });

  test("저자가 없는 페이지도 성공하고 author는 null이다", async () => {
    fetchMock.mockResolvedValue(htmlResponse(NO_AUTHOR_HTML));

    const res = await post({ url: "https://example.com" });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.title).toBe("Example Domain");
    expect(data.author).toBeNull();
    expect(data.markdown).toContain("documentation examples");
  });

  test("공개 주소로 가는 리다이렉트는 따라간다", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(null, { status: 301, headers: { location: "https://www.example.com/saw" } })
      )
      .mockResolvedValueOnce(htmlResponse(ARTICLE_HTML));

    const res = await post({ url: "https://example.com/saw" });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0].toString()).toBe("https://www.example.com/saw");
  });
});

describe("POST /api/convert 주소 형식 오류", () => {
  test.each([
    ["URL이 아닌 글자", { url: "hello world" }],
    ["https:// 없는 주소", { url: "stephango.com/saw" }],
    ["http/https가 아닌 주소", { url: "ftp://example.com/file" }],
    ["url 필드 없음", {}],
    ["빈 문자열", { url: "   " }],
    ["JSON이 아닌 본문", "not json"],
  ])("%s는 400 invalid_url", async (_name, body) => {
    const res = await post(body);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_url" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/convert 내부망 차단", () => {
  test.each([
    "http://localhost:3000/",
    "http://127.0.0.1/",
    "http://10.1.2.3/admin",
    "http://192.168.0.1/",
    "http://172.16.5.4/",
    "http://169.254.169.254/latest/meta-data/",
    "http://0.0.0.0/",
    "http://[::1]/",
    "http://[fe80::1]/",
    "http://[::ffff:127.0.0.1]/",
  ])("%s는 가져오지 않고 403 blocked_address", async (url) => {
    const res = await post({ url });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "blocked_address" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("이름을 풀었더니 사설 주소면 가져오지 않는다", async () => {
    lookupMock.mockResolvedValue([{ address: "10.0.0.7", family: 4 }]);

    const res = await post({ url: "https://internal.example.com/" });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "blocked_address" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("이름이 공개 주소와 사설 주소를 함께 돌려줘도 막는다", async () => {
    lookupMock.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ]);

    const res = await post({ url: "https://mixed.example.com/" });

    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("공개 주소가 사설 주소로 리다이렉트하면 두 번째 요청은 보내지 않는다", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest" } })
    );

    const res = await post({ url: "https://example.com/redirect" });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "blocked_address" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("이름 풀이 결과를 못 얻으면 가져오기 실패로 본다", async () => {
    lookupMock.mockRejectedValue(Object.assign(new Error("not found"), { code: "ENOTFOUND" }));

    const res = await post({ url: "https://no-such-host.example.com/" });

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "fetch_failed" });
  });
});

describe("POST /api/convert 가져오기 실패", () => {
  test("404는 502 fetch_failed", async () => {
    fetchMock.mockResolvedValue(htmlResponse("not found", { status: 404 }));

    const res = await post({ url: "https://example.com/missing" });

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "fetch_failed" });
  });

  test("연결 오류는 502 fetch_failed", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const res = await post({ url: "https://example.com/" });

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "fetch_failed" });
  });

  test("시간 초과는 502 fetch_failed", async () => {
    fetchMock.mockRejectedValue(new DOMException("timed out", "TimeoutError"));

    const res = await post({ url: "https://example.com/slow" });

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "fetch_failed" });
  });

  test("HTML이 아닌 응답은 502 fetch_failed", async () => {
    fetchMock.mockResolvedValue(
      new Response("%PDF-1.7", { status: 200, headers: { "content-type": "application/pdf" } })
    );

    const res = await post({ url: "https://example.com/doc.pdf" });

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "fetch_failed" });
  });

  test("리다이렉트가 끝없이 이어지면 502 fetch_failed", async () => {
    fetchMock.mockImplementation(
      async () => new Response(null, { status: 302, headers: { location: "https://example.com/loop" } })
    );

    const res = await post({ url: "https://example.com/loop" });

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "fetch_failed" });
  });
});

describe("POST /api/convert 본문 없음", () => {
  test("스크립트로만 그려지는 페이지는 422 empty_content", async () => {
    fetchMock.mockResolvedValue(htmlResponse(EMPTY_HTML));

    const res = await post({ url: "https://app.example.com/dashboard" });

    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "empty_content" });
  });

  test("영상 임베드처럼 이미지 표기만 남는 페이지도 본문 없음으로 본다", async () => {
    // 실제로 youtube.com 첫 화면이 이런 결과를 냈다: "![](https://www.youtube.com/watch?v=embed)"
    fetchMock.mockResolvedValue(
      htmlResponse(
        `<!doctype html><html><head><title>Player</title></head><body><div class="player"><iframe src="https://www.youtube.com/embed/abc"></iframe></div></body></html>`
      )
    );

    const res = await post({ url: "https://video.example.com/watch" });

    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "empty_content" });
  });
});
