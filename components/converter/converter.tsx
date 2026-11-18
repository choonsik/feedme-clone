"use client";

import { CircleAlertIcon } from "lucide-react";
import { useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

import { ExportPanel } from "./export-panel";
import { Markdown } from "./markdown";
import { ERROR_MESSAGES, toErrorCode, type ErrorCode } from "./messages";

type Article = { title: string; author: string | null; markdown: string; host: string };

type Phase =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; article: Article }
  | { kind: "error"; code: ErrorCode };

function hostOf(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return "markdown";
  }
}

export function Converter() {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  // 지우기나 새 변환이 시작되면 이전 요청의 응답은 버린다.
  const requestId = useRef(0);
  // 지우기를 누르면 내보내기 패널(프롬프트 선택 등)을 새로 만들어 처음 상태로 돌린다.
  const [session, setSession] = useState(0);

  async function convert() {
    const target = url.trim();
    if (!target) return;
    const id = ++requestId.current;
    setPhase({ kind: "loading" });
    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const data = await res.json();
      if (id !== requestId.current) return;
      if (res.ok) {
        setSession((n) => n + 1);
        setPhase({
          kind: "done",
          article: {
            title: data.title,
            author: data.author ?? null,
            markdown: data.markdown,
            host: hostOf(target),
          },
        });
      } else {
        setPhase({ kind: "error", code: toErrorCode(data?.error) });
      }
    } catch {
      if (id === requestId.current) setPhase({ kind: "error", code: "fetch_failed" });
    }
  }

  function clear() {
    requestId.current++;
    setUrl("");
    setPhase({ kind: "idle" });
    setSession((n) => n + 1);
  }

  const invalid = phase.kind === "error";

  return (
    <div className="flex flex-col gap-[26px] pr-[18px]">
      <Card data-component="Card">
        <CardContent className="gap-0">
          <Label htmlFor="url" className="mb-2.5 text-sm font-bold" data-component="Label">
            웹 페이지 주소
          </Label>
          <div className="flex flex-wrap gap-3 sm:flex-nowrap" data-component="Field">
            <Input
              id="url"
              type="text"
              inputMode="url"
              autoComplete="off"
              placeholder="https://stephango.com/saw"
              aria-describedby="url-help"
              aria-invalid={invalid}
              className="max-sm:basis-full sm:flex-1"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) convert();
              }}
            />
            <Button className="max-sm:flex-1" onClick={convert}>
              변환
            </Button>
            <Button variant="outline" className="max-sm:flex-1" onClick={clear}>
              지우기
            </Button>
          </div>
          <p id="url-help" className="mt-2.5 text-[13px] text-[var(--iso-soft)]">
            기사, 블로그, 문서처럼 본문이 있는 페이지의 주소를 붙여넣으세요.
          </p>
        </CardContent>
      </Card>

      {phase.kind === "error" && (
        <Alert variant="destructive" data-component="Alert">
          <CircleAlertIcon />
          <AlertTitle>{ERROR_MESSAGES[phase.code].title}</AlertTitle>
          <AlertDescription>{ERROR_MESSAGES[phase.code].description}</AlertDescription>
        </Alert>
      )}

      {phase.kind === "idle" && <EmptyState />}

      {phase.kind === "loading" && (
        <Card aria-busy="true" aria-label="변환 중" data-component="Skeleton">
          <CardContent className="gap-0">
            <Skeleton className="h-7 w-[70%]" />
            <Skeleton className="mt-3 mb-6 h-3.5 w-[30%]" />
            <Skeleton className="mb-2.5 h-3.5 w-full" />
            <Skeleton className="mb-2.5 h-3.5 w-[96%]" />
            <Skeleton className="mb-2.5 h-3.5 w-[88%]" />
            <Skeleton className="h-3.5 w-[60%]" />
          </CardContent>
        </Card>
      )}

      {phase.kind === "done" && (
        <div className="flex flex-col gap-[26px]">
          <Card data-component="Card">
            <CardContent className="gap-0">
              <header>
                <h2 className="text-[22px] leading-tight font-bold tracking-tight [overflow-wrap:anywhere] sm:text-[26px]">
                  {phase.article.title}
                </h2>
                {phase.article.author && (
                  <p data-testid="author" className="mt-2 text-sm font-semibold text-[var(--iso-soft)]">
                    {phase.article.author}
                  </p>
                )}
              </header>
              <hr className="my-[18px] border-0 border-t-2 border-dashed border-[var(--iso-edge)] opacity-70" />
              <Markdown>{phase.article.markdown}</Markdown>
            </CardContent>
          </Card>
          <ExportPanel
            key={session}
            title={phase.article.title}
            markdown={phase.article.markdown}
            fallbackName={phase.article.host}
          />
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="items-center px-4 pt-5 pb-7 text-center" data-component="Empty">
      <svg
        className="iso-hero mx-auto block h-auto w-full max-w-[360px]"
        viewBox="0 0 360 132"
        role="img"
        aria-label="웹 페이지가 Markdown을 거쳐 LLM으로 전달되는 흐름"
      >
        <g style={{ "--ft": "var(--iso-top)", "--fr": "var(--iso-right)", "--fb": "var(--iso-bottom)" } as React.CSSProperties}>
          <polygon className="l" points="16,70 60,95 60,105 16,80" />
          <polygon className="r" points="60,95 104,70 104,80 60,105" />
          <polygon className="t" points="60,45 104,70 60,95 16,70" />
          <line className="ln" x1="33.6" y1="72.5" x2="64.4" y2="55" />
          <line className="ln" x1="44.6" y1="78.8" x2="75.4" y2="61.3" />
          <line className="ln" x1="55.6" y1="85" x2="86.4" y2="67.5" />
        </g>
        <g style={{ "--ft": "var(--iso-mint-top)", "--fr": "var(--iso-mint-right)", "--fb": "var(--iso-mint-bottom)" } as React.CSSProperties}>
          <polygon className="l" points="136,70 180,95 180,105 136,80" />
          <polygon className="r" points="180,95 224,70 224,80 180,105" />
          <polygon className="t" points="180,45 224,70 180,95 136,70" />
          <line className="ln on-mint" style={{ strokeWidth: 5 }} x1="153.6" y1="72.5" x2="184.4" y2="55" />
          <line className="ln on-mint" x1="164.6" y1="78.8" x2="195.4" y2="61.3" />
          <line className="ln on-mint" x1="175.6" y1="85" x2="206.4" y2="67.5" />
        </g>
        <g style={{ "--ft": "var(--iso-accent-top)", "--fr": "var(--iso-accent-right)", "--fb": "var(--iso-accent-bottom)" } as React.CSSProperties}>
          <polygon className="l" points="256,62 300,87 300,123 256,98" />
          <polygon className="r" points="300,87 344,62 344,98 300,123" />
          <polygon className="t" points="300,37 344,62 300,87 256,62" />
          <polygon points="300,52 312,62 300,72 288,62" fill="rgba(255,255,255,.6)" />
        </g>
        <path className="ar" d="M110 70 L126 70" />
        <polygon className="ah" points="126,65 134,70 126,75" />
        <path className="ar" d="M230 70 L246 70" />
        <polygon className="ah" points="246,65 254,70 246,75" />
      </svg>
      <div>
        <b className="mt-1 mb-1.5 block text-base font-bold">변환할 페이지를 기다리고 있어요</b>
        <span className="text-sm text-[var(--iso-soft)]">
          주소를 붙여넣고 변환을 누르면 본문이 여기에 Markdown으로 나타납니다.
        </span>
      </div>
    </Card>
  );
}
