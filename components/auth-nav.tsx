import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

// 서버에서 검증한 로그인 상태에 따라 헤더 버튼을 바꾼다.
export async function AuthNav() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    return (
      <>
        <Link
          href="/auth/login"
          data-component="Button"
          className={buttonVariants({ variant: "outline" })}
        >
          로그인
        </Link>
        <Link href="/auth/sign-up" data-component="Button" className={buttonVariants()}>
          가입
        </Link>
      </>
    );
  }

  return (
    <>
      <span className="hidden max-w-[160px] truncate text-[13px] text-[var(--iso-soft)] sm:inline">
        {claims.email}
      </span>
      <Link
        href="/settings"
        data-component="Button"
        className={buttonVariants({ variant: "outline" })}
      >
        설정
      </Link>
      <LogoutButton />
    </>
  );
}
