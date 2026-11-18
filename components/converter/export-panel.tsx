"use client";

import { CheckIcon, CopyIcon, DownloadIcon, InfoIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  composeMessage,
  markdownFileName,
  planOpen,
  type LlmTarget,
} from "@/lib/export";

const PRESETS = ["요약해줘", "한국어로 번역해줘", "쉽게 설명해줘"] as const;
const DIRECT = "direct";
type Choice = (typeof PRESETS)[number] | typeof DIRECT;

const TARGET_NAMES: Record<LlmTarget, string> = { chatgpt: "ChatGPT", claude: "Claude" };

type Props = {
  title: string;
  markdown: string;
  fallbackName: string;
};

export function ExportPanel({ title, markdown, fallbackName }: Props) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [directText, setDirectText] = useState("");
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  const prompt = choice === DIRECT ? directText.trim() : (choice ?? "");
  const message = composeMessage(prompt, markdown);
  const tooLong =
    planOpen("chatgpt", message).kind === "clipboard" ||
    planOpen("claude", message).kind === "clipboard";

  function select(next: Choice) {
    setChoice((current) => (current === next ? null : next));
    setDirectText("");
  }

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setStatus("Markdown 원문을 클립보드에 복사했습니다.");
    } catch {
      setStatus("복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해 주세요.");
    }
  }

  function download() {
    const name = markdownFileName(title, fallbackName);
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setStatus(`${name} 파일을 내려받았습니다.`);
  }

  function openIn(target: LlmTarget) {
    const name = TARGET_NAMES[target];
    const plan = planOpen(target, message);
    if (plan.kind === "clipboard") {
      // 사용자 클릭 안에서 복사를 시작하고 곧바로 새 탭을 연다.
      navigator.clipboard.writeText(plan.text).catch(() => {
        setStatus("복사하지 못했습니다. 복사하기 버튼으로 직접 복사해 주세요.");
      });
      window.open(plan.url, "_blank", "noopener,noreferrer");
      setStatus(`프롬프트와 본문 전체를 복사했습니다. ${name} 새 대화에서 붙여넣기(Ctrl+V) 하세요.`);
      return;
    }
    window.open(plan.url, "_blank", "noopener,noreferrer");
    setStatus(`${name}를 새 탭에서 열었습니다 · ${prompt ? `프롬프트: ${prompt}` : "프롬프트 없음"}`);
  }

  return (
    <Card data-component="Card">
      <CardContent className="gap-0">
        <h3 className="mb-1 text-[15px] font-bold">내보내기</h3>
        <p className="mb-3 text-[13px] text-[var(--iso-soft)]">
          복사와 다운로드는 프롬프트 없이 Markdown 원문만 다룹니다.
        </p>
        <div className="flex flex-wrap gap-3.5">
          <Button variant="outline" onClick={copyMarkdown}>
            {copied ? <CheckIcon /> : <CopyIcon />}
            <span>{copied ? "복사됨" : "복사하기"}</span>
          </Button>
          <Button variant="outline" onClick={download}>
            <DownloadIcon />
            .md 다운로드
          </Button>
        </div>

        <hr className="my-[18px] border-0 border-t-2 border-dashed border-[var(--iso-edge)] opacity-70" />

        <h3 className="mb-1 text-[15px] font-bold">LLM으로 보내기</h3>
        <p className="text-[13px] text-[var(--iso-soft)]">
          프롬프트를 고르면 본문 앞에 붙습니다. 고르지 않으면 본문만 보냅니다.
        </p>
        <div className="my-3.5 flex flex-wrap gap-3.5" role="group" aria-label="프롬프트" data-component="ToggleGroup">
          {PRESETS.map((preset) => (
            <Button
              key={preset}
              variant="chip"
              size="chip"
              aria-pressed={choice === preset}
              onClick={() => select(preset)}
            >
              {preset}
            </Button>
          ))}
          <Button
            variant="chip"
            size="chip"
            aria-pressed={choice === DIRECT}
            onClick={() => select(DIRECT)}
          >
            직접 입력
          </Button>
        </div>
        {choice === DIRECT && (
          <div className="mb-3">
            <Input
              aria-label="직접 입력 프롬프트"
              autoComplete="off"
              autoFocus
              placeholder="예: 핵심 주장을 세 가지로 정리해줘"
              value={directText}
              onChange={(event) => setDirectText(event.target.value)}
            />
            <p className="mt-2.5 text-[13px] text-[var(--iso-soft)]">
              이번 변환에만 쓰이며 저장되지 않습니다.
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-3.5">
          <Button onClick={() => openIn("chatgpt")}>ChatGPT로 열기</Button>
          <Button onClick={() => openIn("claude")}>Claude로 열기</Button>
        </div>

        {tooLong && (
          <Alert role="note" className="mt-3" data-component="Alert">
            <InfoIcon />
            <AlertTitle>본문이 길어 주소로 보낼 수 없어요</AlertTitle>
            <AlertDescription>
              열기를 누르면 프롬프트와 본문 전체를 클립보드에 복사한 뒤 빈 대화를 엽니다. 대화 창에서
              붙여넣기(Ctrl+V) 하세요.
            </AlertDescription>
          </Alert>
        )}
        {status && (
          <p role="status" className="mt-3.5 text-[13px] font-semibold text-[var(--iso-soft)]">
            {status}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
