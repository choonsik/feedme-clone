import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { Converter } from "@/components/converter/converter";

const MARKDOWN = [
  "When I learned to use a table saw, my teacher impressed upon me that the machine wants to cut fingers.",
  "",
  "## Habits that keep you safe",
  "",
  "- Never stand directly behind the workpiece.",
  "- Use a push stick for every narrow cut.",
].join("\n");

const ARTICLE = {
  title: "Use the saw, fear the saw",
  author: "Steph Ango",
  markdown: MARKDOWN,
};

const writeText = vi.fn();
const openMock = vi.fn();
const fetchMock = vi.fn();

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function urlInput() {
  return screen.getByLabelText("웹 페이지 주소") as HTMLInputElement;
}

function button(name: string | RegExp) {
  return screen.getByRole("button", { name });
}

async function convert(url = "https://stephango.com/saw", data: unknown = ARTICLE) {
  fetchMock.mockResolvedValue(jsonResponse(data));
  fireEvent.change(urlInput(), { target: { value: url } });
  fireEvent.click(button("변환"));
  await screen.findByRole("heading", { level: 2, name: (data as typeof ARTICLE).title });
}

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsText(blob);
  });
}

beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined);
  openMock.mockReset().mockReturnValue(null);
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("open", openMock);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("입력과 변환", () => {
  test("처음에는 결과 없이 입력창과 안내만 보인다", () => {
    render(<Converter />);

    expect(urlInput()).toHaveValue("");
    expect(screen.getByText("변환할 페이지를 기다리고 있어요")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "복사하기" })).not.toBeInTheDocument();
  });

  test("변환하면 주소를 서버에 보내고 제목, 저자, 렌더링된 본문을 보여준다", async () => {
    render(<Converter />);

    await convert();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/convert",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ url: "https://stephango.com/saw" }),
      })
    );
    expect(screen.getByText("Steph Ango")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Habits that keep you safe" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  test("서버 응답을 기다리는 동안 변환 중 상태를 보여준다", async () => {
    let finish: (res: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (finish = resolve)));
    render(<Converter />);

    fireEvent.change(urlInput(), { target: { value: "https://stephango.com/saw" } });
    fireEvent.click(button("변환"));

    expect(await screen.findByLabelText("변환 중")).toBeInTheDocument();

    finish(jsonResponse(ARTICLE));
    await screen.findByRole("heading", { level: 2, name: ARTICLE.title });
    expect(screen.queryByLabelText("변환 중")).not.toBeInTheDocument();
  });

  test("저자가 없으면 저자 줄만 빠진다", async () => {
    render(<Converter />);

    await convert("https://example.com", {
      title: "Example Domain",
      author: null,
      markdown: "This domain is for use in documentation examples.",
    });

    expect(screen.getByRole("heading", { level: 2, name: "Example Domain" })).toBeInTheDocument();
    expect(screen.queryByTestId("author")).not.toBeInTheDocument();
  });

  test("Enter 키로도 변환한다", async () => {
    fetchMock.mockResolvedValue(jsonResponse(ARTICLE));
    render(<Converter />);

    fireEvent.change(urlInput(), { target: { value: "https://stephango.com/saw" } });
    fireEvent.keyDown(urlInput(), { key: "Enter" });

    await screen.findByRole("heading", { level: 2, name: ARTICLE.title });
  });

  test("입력이 비어 있으면 서버에 요청하지 않는다", () => {
    render(<Converter />);

    fireEvent.click(button("변환"));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("본문 속 원시 HTML과 스크립트는 화면에 실행되지 않는다", async () => {
    const { container } = render(<Converter />);

    await convert("https://evil.example.com", {
      title: "Evil",
      author: null,
      markdown: 'Hello\n\n<script>window.hacked = true</script>\n\n<img src=x onerror="window.hacked = true">',
    });

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect((window as unknown as { hacked?: boolean }).hacked).toBeUndefined();
  });
});

describe("지우기", () => {
  test("입력, 결과, 프롬프트 선택, 직접 입력 문장이 모두 처음 상태로 돌아간다", async () => {
    render(<Converter />);
    await convert();
    fireEvent.click(button("직접 입력"));
    fireEvent.change(screen.getByLabelText("직접 입력 프롬프트"), {
      target: { value: "핵심만 알려줘" },
    });

    fireEvent.click(button("지우기"));

    expect(urlInput()).toHaveValue("");
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("직접 입력 프롬프트")).not.toBeInTheDocument();
    expect(screen.getByText("변환할 페이지를 기다리고 있어요")).toBeInTheDocument();

    // 다시 변환해 보면 프롬프트 선택이 남아 있지 않다.
    await convert();
    for (const name of ["요약해줘", "한국어로 번역해줘", "쉽게 설명해줘", "직접 입력"]) {
      expect(button(name)).toHaveAttribute("aria-pressed", "false");
    }
    expect(screen.queryByLabelText("직접 입력 프롬프트")).not.toBeInTheDocument();
  });

  test("오류 메시지도 지운다", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "blocked_address" }, 403));
    render(<Converter />);
    fireEvent.change(urlInput(), { target: { value: "http://localhost:3000" } });
    fireEvent.click(button("변환"));
    await screen.findByRole("alert");

    fireEvent.click(button("지우기"));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(urlInput()).toHaveValue("");
  });
});

describe("오류 상태", () => {
  test.each([
    ["invalid_url", 400, "주소 형식이 올바르지 않습니다"],
    ["blocked_address", 403, "이 주소는 변환할 수 없습니다"],
    ["fetch_failed", 502, "페이지를 가져오지 못했습니다"],
    ["empty_content", 422, "추출할 본문을 찾지 못했습니다"],
  ])("%s 응답은 이유를 알려 주고 입력값을 유지한다", async (code, status, message) => {
    fetchMock.mockResolvedValue(jsonResponse({ error: code }, status));
    render(<Converter />);
    fireEvent.change(urlInput(), { target: { value: "https://example.com/x" } });

    fireEvent.click(button("변환"));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(urlInput()).toHaveValue("https://example.com/x");
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  test("서버에 닿지 못해도 가져오기 실패로 알려 준다", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<Converter />);
    fireEvent.change(urlInput(), { target: { value: "https://example.com/x" } });

    fireEvent.click(button("변환"));

    expect(await screen.findByRole("alert")).toHaveTextContent("페이지를 가져오지 못했습니다");
  });

  test("오류 뒤에 다시 변환하면 성공 결과로 바뀐다", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "fetch_failed" }, 502));
    render(<Converter />);
    fireEvent.change(urlInput(), { target: { value: "https://example.com/x" } });
    fireEvent.click(button("변환"));
    await screen.findByRole("alert");

    await convert();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("복사와 다운로드", () => {
  test("복사하기는 프롬프트를 고른 상태에서도 Markdown 원문만 복사한다", async () => {
    render(<Converter />);
    await convert();
    fireEvent.click(button("요약해줘"));

    fireEvent.click(button("복사하기"));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(MARKDOWN));
    expect(await screen.findByRole("status")).toHaveTextContent("복사");
  });

  test(".md 다운로드는 Markdown 원문을 제목으로 만든 파일 이름으로 내려받는다", async () => {
    const createObjectURL = vi.fn((blob: Blob) => (void blob, "blob:mock"));
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
    const downloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this.download);
    });
    render(<Converter />);
    await convert();
    fireEvent.click(button("요약해줘"));

    fireEvent.click(button(".md 다운로드"));

    expect(downloads).toEqual(["Use the saw, fear the saw.md"]);
    const blob = createObjectURL.mock.calls[0][0];
    expect(await readBlob(blob)).toBe(MARKDOWN);
  });
});

describe("LLM으로 열기", () => {
  function openedUrl() {
    return new URL(openMock.mock.calls[0][0] as string);
  }

  test("프롬프트를 고르지 않으면 본문만 전달한다", async () => {
    render(<Converter />);
    await convert();

    fireEvent.click(button("ChatGPT로 열기"));

    expect(openedUrl().origin + openedUrl().pathname).toBe("https://chatgpt.com/");
    expect(openedUrl().searchParams.get("q")).toBe(MARKDOWN);
    expect(openMock).toHaveBeenCalledWith(expect.any(String), "_blank", "noopener,noreferrer");
  });

  test("프리셋을 고르면 그 문장이 본문 앞에 붙고 Claude 새 대화로 열린다", async () => {
    render(<Converter />);
    await convert();
    fireEvent.click(button("한국어로 번역해줘"));

    fireEvent.click(button("Claude로 열기"));

    expect(openedUrl().origin + openedUrl().pathname).toBe("https://claude.ai/new");
    expect(openedUrl().searchParams.get("q")).toBe(`한국어로 번역해줘\n\n${MARKDOWN}`);
  });

  test("같은 프리셋을 다시 누르면 선택이 풀린다", async () => {
    render(<Converter />);
    await convert();
    fireEvent.click(button("요약해줘"));
    expect(button("요약해줘")).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(button("요약해줘"));

    expect(button("요약해줘")).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button("ChatGPT로 열기"));
    expect(openedUrl().searchParams.get("q")).toBe(MARKDOWN);
  });

  test("직접 입력을 고르면 입력창이 나타나고 입력한 문장이 본문 앞에 붙는다", async () => {
    render(<Converter />);
    await convert();
    expect(screen.queryByLabelText("직접 입력 프롬프트")).not.toBeInTheDocument();

    fireEvent.click(button("직접 입력"));
    fireEvent.change(screen.getByLabelText("직접 입력 프롬프트"), {
      target: { value: "핵심 주장을 세 가지로 정리해줘" },
    });
    fireEvent.click(button("Claude로 열기"));

    expect(openedUrl().searchParams.get("q")).toBe(`핵심 주장을 세 가지로 정리해줘\n\n${MARKDOWN}`);
  });

  test("직접 입력을 골랐지만 비어 있으면 프롬프트 없이 보낸다", async () => {
    render(<Converter />);
    await convert();
    fireEvent.click(button("직접 입력"));

    fireEvent.click(button("ChatGPT로 열기"));

    expect(openedUrl().searchParams.get("q")).toBe(MARKDOWN);
  });

  test("다른 프롬프트로 옮기면 직접 입력 문장은 사라진다", async () => {
    render(<Converter />);
    await convert();
    fireEvent.click(button("직접 입력"));
    fireEvent.change(screen.getByLabelText("직접 입력 프롬프트"), { target: { value: "임시 문장" } });

    fireEvent.click(button("쉽게 설명해줘"));
    fireEvent.click(button("직접 입력"));

    expect(screen.getByLabelText("직접 입력 프롬프트")).toHaveValue("");
  });

  test("열었다는 사실을 알려 준다", async () => {
    render(<Converter />);
    await convert();
    fireEvent.click(button("요약해줘"));

    fireEvent.click(button("ChatGPT로 열기"));

    expect(await screen.findByRole("status")).toHaveTextContent("ChatGPT");
  });
});

describe("긴 글", () => {
  const LONG = { ...ARTICLE, markdown: "가나다라마바사 ".repeat(1500) };

  test("주소 한도를 넘으면 열기 전에 미리 안내한다", async () => {
    render(<Converter />);
    await convert("https://stephango.com/long", LONG);

    expect(screen.getByText("본문이 길어 주소로 보낼 수 없어요")).toBeInTheDocument();
  });

  test("짧은 글에는 긴 글 안내가 없다", async () => {
    render(<Converter />);
    await convert();

    expect(screen.queryByText("본문이 길어 주소로 보낼 수 없어요")).not.toBeInTheDocument();
  });

  test("열기를 누르면 프롬프트와 본문 전체를 복사한 뒤 빈 새 대화를 열고 붙여넣기를 안내한다", async () => {
    render(<Converter />);
    await convert("https://stephango.com/long", LONG);
    fireEvent.click(button("요약해줘"));

    fireEvent.click(button("Claude로 열기"));

    expect(writeText).toHaveBeenCalledWith(`요약해줘\n\n${LONG.markdown}`);
    expect(openMock).toHaveBeenCalledWith("https://claude.ai/new", "_blank", "noopener,noreferrer");
    expect(await screen.findByRole("status")).toHaveTextContent("붙여넣기");
  });
});
