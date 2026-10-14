import { useEffect, useRef, useState } from "react";
import { Modal } from "./Ui";
import DesignMarkdown from "./DesignMarkdown";
import { designSections } from "../content/design";
import { designSectionFromHash } from "../designRoute";
import "../designGuide.css";

function sectionFromHash() {
  const id = designSectionFromHash(location.hash);
  return designSections.find((section) => section.id === id)?.id || "overview";
}

export default function DesignGuide({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(sectionFromHash);
  const scroll = useRef<HTMLDivElement>(null);

  function jump(id: string) {
    const section = scroll.current?.querySelector<HTMLElement>(`#design-${id}`);
    if (section && scroll.current)
      scroll.current.scrollTo({
        top: section.offsetTop - 24,
        behavior: "instant",
      });
    setSelected(id);
  }

  function select(id: string) {
    history.replaceState(
      null,
      "",
      `${location.pathname}${location.search}#design/${id}`,
    );
    jump(id);
  }

  useEffect(() => {
    if (!open) return;
    scroll.current?.focus({ preventScroll: true });
    let frame = 0;
    const syncSection = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => jump(sectionFromHash()));
    };
    syncSection();
    addEventListener("hashchange", syncSection);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("hashchange", syncSection);
    };
  }, [open]);

  return (
    <Modal
      open={open}
      title="设计讲解"
      onClose={onClose}
      className="design-guide"
    >
      <div className="design-layout">
        <div className="design-mobile-nav">
          <select
            aria-label="跳转到内容"
            value={selected}
            onChange={(event) => select(event.target.value)}
          >
            {designSections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.title}
              </option>
            ))}
          </select>
        </div>
        <div
          className="design-scroll"
          ref={scroll}
          tabIndex={-1}
          role="region"
          aria-label="设计讲解正文"
          onScroll={(event) => {
            const container = event.currentTarget;
            const sections = [
              ...container.querySelectorAll<HTMLElement>(".design-section"),
            ];
            const atEnd =
              container.scrollTop + container.clientHeight >= container.scrollHeight - 2;
            const active = atEnd
              ? sections.at(-1)
              : sections.reverse().find(
                  (section) => section.offsetTop <= container.scrollTop + 100,
                );
            if (active) setSelected(active.dataset.section!);
          }}
        >
          <article className="design-article" aria-label="Agent 设计">
            {designSections.map((section) => (
              <section
                className="design-section"
                key={section.id}
                id={`design-${section.id}`}
                data-section={section.id}
                aria-labelledby={`design-title-${section.id}`}
              >
                <h2 id={`design-title-${section.id}`}>{section.title}</h2>
                <div className="design-prose">
                  <DesignMarkdown content={section.content} />
                </div>
              </section>
            ))}
          </article>
        </div>
        <nav className="design-toc" aria-label="本页目录">
          <p>本页内容</p>
          {designSections.map((section) => (
            <button
              type="button"
              key={section.id}
              aria-current={selected === section.id ? "location" : undefined}
              onClick={() => select(section.id)}
            >
              {section.title}
            </button>
          ))}
        </nav>
      </div>
    </Modal>
  );
}
