export type ConvertErrorCode =
  | "invalid_url"
  | "blocked_address"
  | "fetch_failed"
  | "empty_content";

export class ConvertError extends Error {
  constructor(readonly code: ConvertErrorCode) {
    super(code);
    this.name = "ConvertError";
  }
}

export const ERROR_STATUS: Record<ConvertErrorCode, number> = {
  invalid_url: 400,
  blocked_address: 403,
  fetch_failed: 502,
  empty_content: 422,
};
