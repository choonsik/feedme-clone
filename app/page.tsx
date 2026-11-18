import { Converter } from "@/components/converter/converter";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-[26px] px-4 py-6">
      <header className="flex items-center justify-between gap-3 pr-[18px]">
        <h1 className="flex flex-wrap items-baseline gap-x-2.5 text-[17px] font-bold tracking-tight">
          URL → Markdown
          <small className="text-[13px] font-medium text-[var(--iso-soft)]">LLM에 바로 넘기기</small>
        </h1>
        <ThemeToggle />
      </header>
      <Converter />
    </main>
  );
}
