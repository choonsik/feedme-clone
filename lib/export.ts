export type LlmTarget = "chatgpt" | "claude";

export type OpenPlan =
  | { kind: "url"; url: string }
  | { kind: "clipboard"; url: string; text: string };

// 두 서비스의 미리 채우기 주소(?q=)에 본문을 싣는 방식은 비공식 동작이다.
// 서버와 프록시가 받는 주소 길이에는 한도가 있어서 보수적인 값 하나를 쓴다.
const MAX_OPEN_URL_LENGTH = 6000;

const TARGETS: Record<LlmTarget, { blank: string; prefilled: string }> = {
  chatgpt: { blank: "https://chatgpt.com/", prefilled: "https://chatgpt.com/?q=" },
  claude: { blank: "https://claude.ai/new", prefilled: "https://claude.ai/new?q=" },
};

export function composeMessage(prompt: string, markdown: string): string {
  const trimmed = prompt.trim();
  return trimmed ? `${trimmed}\n\n${markdown}` : markdown;
}

export function planOpen(target: LlmTarget, message: string): OpenPlan {
  const { blank, prefilled } = TARGETS[target];
  const url = prefilled + encodeURIComponent(message);
  if (url.length <= MAX_OPEN_URL_LENGTH) return { kind: "url", url };
  return { kind: "clipboard", url: blank, text: message };
}

export function markdownFileName(title: string, fallback: string): string {
  const cleaned = title
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 80)
    .trim();
  return `${cleaned || fallback}.md`;
}
