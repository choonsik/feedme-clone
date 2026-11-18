import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// 외부 페이지에서 가져온 내용이므로 원시 HTML은 렌더링하지 않는다(react-markdown 기본 동작).
// 결과 제목이 h2이므로 본문의 h1, h2는 h3로 내려 제목 위계를 지킨다.
export function Markdown({ children }: { children: string }) {
  return (
    <div className="md" data-component="Markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h3>{children}</h3>,
          h2: ({ children }) => <h3>{children}</h3>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={typeof src === "string" ? src : undefined}
              alt={alt ?? ""}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
