export type ErrorCode =
  | "invalid_url"
  | "blocked_address"
  | "fetch_failed"
  | "empty_content";

export const ERROR_MESSAGES: Record<ErrorCode, { title: string; description: string }> = {
  invalid_url: {
    title: "주소 형식이 올바르지 않습니다",
    description: "http:// 또는 https://로 시작하는 웹 주소를 입력해 주세요.",
  },
  blocked_address: {
    title: "이 주소는 변환할 수 없습니다",
    description:
      "로컬 또는 사설 네트워크 주소는 가져올 수 없어요. 인터넷에 공개된 페이지 주소를 입력해 주세요.",
  },
  fetch_failed: {
    title: "페이지를 가져오지 못했습니다",
    description: "페이지가 없거나(404) 응답이 너무 늦습니다. 주소를 확인한 뒤 다시 시도해 주세요.",
  },
  empty_content: {
    title: "추출할 본문을 찾지 못했습니다",
    description:
      "로그인이 필요하거나 스크립트로 내용을 그리는 페이지일 수 있어요. 다른 주소로 시도해 보세요.",
  },
};

export function toErrorCode(value: unknown): ErrorCode {
  return typeof value === "string" && value in ERROR_MESSAGES
    ? (value as ErrorCode)
    : "fetch_failed";
}
