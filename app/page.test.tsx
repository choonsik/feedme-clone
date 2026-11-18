import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import Home from "@/app/page";

// 로그인 상태 헤더는 요청 쿠키가 필요한 서버 컴포넌트라 이 테스트에서는 비운다.
vi.mock("@/components/auth-nav", () => ({ AuthNav: () => null }));

test("홈 화면은 서비스 제목과 주소 입력창을 보여준다", () => {
  render(<Home />);

  expect(
    screen.getByRole("heading", { level: 1, name: /URL → Markdown/ })
  ).toBeInTheDocument();
  expect(screen.getByLabelText("웹 페이지 주소")).toBeInTheDocument();
});
