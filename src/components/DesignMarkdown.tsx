import {
  Children,
  isValidElement,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const diagrams = new Map<string, Promise<string>>();
let sequence = 0;
let renderer: Promise<typeof import("mermaid").default> | undefined;
function diagramSvg(source: string) {
  if (!renderer)
    renderer = import("mermaid").then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "base",
        fontFamily: "Inter, PingFang SC, sans-serif",
        themeVariables: {
          primaryColor: "#f6f6f6",
          primaryTextColor: "#333333",
          primaryBorderColor: "#b8b8b8",
          lineColor: "#969696",
          secondaryColor: "#ffffff",
          tertiaryColor: "#eeeeee",
          fontSize: "14px",
        },
        flowchart: { htmlLabels: false, curve: "linear", padding: 16 },
      });
      return mermaid;
    });
  let result = diagrams.get(source);
  if (!result) {
    result = renderer
      .then((mermaid) => mermaid.render(`muse-design-${sequence++}`, source))
      .then((result) => result.svg);
    diagrams.set(source, result);
  }
  return result;
}
function Diagram({ source }: { source: string }) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setSvg("");
    setError(false);
    diagramSvg(source)
      .then((svg) => {
        if (active) setSvg(svg);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [source]);
  return (
    <figure className="design-diagram">
      {error ? (
        <pre className="design-code">
          <code>{source}</code>
        </pre>
      ) : svg ? (
        <div
          className="design-diagram-viewport"
          role="img"
          aria-label="当前章节流程图"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="design-diagram-loading" role="status">
          正在绘制流程图…
        </div>
      )}
      {error && <p role="alert">图表暂时无法绘制，已显示源码。</p>}
    </figure>
  );
}
function plainText(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) =>
      typeof child === "string" || typeof child === "number"
        ? String(child)
        : isValidElement<{ children?: ReactNode }>(child)
          ? plainText(child.props.children)
          : "",
    )
    .join("");
}
export default function DesignMarkdown({ content }: { content: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      components={{
        h2: ({ children }) => <h3>{children}</h3>,
        h3: ({ children }) => <h4>{children}</h4>,
        a: ({ children, href }) => (
          <a
            href={href}
            target={href?.startsWith("#") ? undefined : "_blank"}
            rel="noreferrer"
          >
            {children}
          </a>
        ),
        table: ({ children }) => (
          <div className="design-table-scroll">
            <table>{children}</table>
          </div>
        ),
        pre: ({ children }) => {
          const child = Children.toArray(children)[0];
          if (
            !isValidElement<{ className?: string; children?: ReactNode }>(child)
          )
            return <pre>{children}</pre>;
          const source = plainText(child.props.children).replace(/\n$/, "");
          return child.props.className === "language-mermaid" ? (
            <Diagram source={source} />
          ) : (
            <pre className="design-code">
              <code>{source}</code>
            </pre>
          );
        },
      }}
    >
      {content}
    </Markdown>
  );
}
