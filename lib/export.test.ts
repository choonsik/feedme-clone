import { describe, expect, test } from "vitest";

import { composeMessage, markdownFileName, planOpen } from "@/lib/export";

describe("composeMessage", () => {
  test("프롬프트가 있으면 본문 앞에 빈 줄을 두고 붙인다", () => {
    expect(composeMessage("요약해줘", "# 제목\n\n본문")).toBe(
      "요약해줘\n\n# 제목\n\n본문"
    );
  });

  test("프롬프트가 비어 있거나 공백뿐이면 본문만 보낸다", () => {
    expect(composeMessage("", "본문")).toBe("본문");
    expect(composeMessage("   \n", "본문")).toBe("본문");
  });
});

describe("planOpen", () => {
  test("ChatGPT는 chatgpt.com/?q= 주소에 메시지를 인코딩해 싣는다", () => {
    expect(planOpen("chatgpt", "요약해줘\n\nhello")).toEqual({
      kind: "url",
      url: "https://chatgpt.com/?q=%EC%9A%94%EC%95%BD%ED%95%B4%EC%A4%98%0A%0Ahello",
    });
  });

  test("Claude는 claude.ai/new?q= 주소에 메시지를 인코딩해 싣는다", () => {
    expect(planOpen("claude", "hi there")).toEqual({
      kind: "url",
      url: "https://claude.ai/new?q=hi%20there",
    });
  });

  test("주소 전체 길이가 6000자 이하면 주소로 전달한다", () => {
    // "https://chatgpt.com/?q=" 는 23자이므로 5977자가 한도의 끝이다.
    const plan = planOpen("chatgpt", "a".repeat(5977));
    expect(plan.kind).toBe("url");
  });

  test("한도를 1자라도 넘으면 본문 전체를 클립보드로 보내고 빈 대화 주소를 쓴다", () => {
    const message = "a".repeat(5978);
    expect(planOpen("chatgpt", message)).toEqual({
      kind: "clipboard",
      url: "https://chatgpt.com/",
      text: message,
    });
    expect(planOpen("claude", "a".repeat(6000))).toEqual({
      kind: "clipboard",
      url: "https://claude.ai/new",
      text: "a".repeat(6000),
    });
  });

  test("한글은 인코딩 후 길이로 계산해 짧은 글도 한도를 넘을 수 있다", () => {
    // 한글 1자는 인코딩하면 9자가 된다. 700자면 6300자.
    expect(planOpen("claude", "가".repeat(700)).kind).toBe("clipboard");
    expect(planOpen("claude", "가".repeat(600)).kind).toBe("url");
  });
});

describe("markdownFileName", () => {
  test("제목에 .md를 붙인다", () => {
    expect(markdownFileName("Use the saw, fear the saw", "stephango.com")).toBe(
      "Use the saw, fear the saw.md"
    );
  });

  test("파일 이름에 쓸 수 없는 문자는 뺀다", () => {
    expect(markdownFileName('a/b\\c:d*e?f"g<h>i|j', "x.com")).toBe("abcdefghij.md");
  });

  test("한글 제목과 여러 칸 공백은 한 칸으로 정리해 유지한다", () => {
    expect(markdownFileName("  한글   제목  ", "x.com")).toBe("한글 제목.md");
  });

  test("제목이 비거나 쓸 수 있는 글자가 없으면 도메인을 쓴다", () => {
    expect(markdownFileName("", "example.com")).toBe("example.com.md");
    expect(markdownFileName("///???", "example.com")).toBe("example.com.md");
  });

  test("너무 긴 제목은 80자까지만 쓴다", () => {
    const name = markdownFileName("가".repeat(200), "x.com");
    expect(name).toBe("가".repeat(80) + ".md");
  });
});
