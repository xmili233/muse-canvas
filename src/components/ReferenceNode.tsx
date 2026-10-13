import { useRef, useState } from "react";
import { ArrowUpRight, FileText, Grip, Play, Square } from "lucide-react";
import type { CanvasNode } from "../model";

export function Flower({ sketch = false }: { sketch?: boolean }) {
  return (
    <svg
      viewBox="0 0 220 220"
      aria-hidden="true"
      className={`flower ${sketch ? "sketch" : ""}`}
    >
      <g transform="translate(110 110)">
        {Array.from({ length: 6 }, (_, i) => (
          <g key={i} transform={`rotate(${i * 60 + (sketch ? 8 : 0)})`}>
            <path
              d="M-16 -15 C-20 -38 -36 -55 -27 -76 C-21 -95 9 -103 23 -83 C39 -61 16 -41 15 -15 Z"
              fill={sketch ? "#1a1a1a" : "white"}
              stroke={sketch ? "#1a1a1a" : "white"}
              strokeWidth={sketch ? 9 : 3}
              strokeLinejoin="round"
            />
            {sketch && (
              <path
                d="M-10 -20 C-3 -43 -24 -61 -13 -81 M4 -21 C9 -45 21 -55 12 -77 M-18 -45 Q4 -27 18 -51"
                fill="none"
                stroke="#f4f4f4"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            )}
          </g>
        ))}
        <circle r="29" fill={sketch ? "#1a1a1a" : "white"} />
      </g>
    </svg>
  );
}
export default function ReferenceNode({
  node,
  onNested,
  onUpdate,
  notify,
}: {
  node: CanvasNode;
  onNested: () => void;
  onUpdate: (patch: Partial<CanvasNode>) => void;
  notify: (message: string) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(3);
  const audio = useRef<HTMLAudioElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const clock = (value: number) =>
    `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
  async function speak() {
    if (!audio.current) return;
    if (playing) audio.current.pause();
    else {
      try {
        await audio.current.play();
      } catch {
        notify("无法播放此音频，请替换文件后重试");
      }
    }
  }
  async function replace(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("audio/") || file.size > 2 * 1024 * 1024) {
      notify("请选择小于 2 MB 的音频文件");
      return;
    }
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      onUpdate({
        audio: data,
        content: "Audio attached. Double-click to add your transcript.",
      });
    } catch {
      notify("音频读取失败，请重试");
    }
  }
  function downloadExample() {
    const url = URL.createObjectURL(
      new Blob(
        [
          "Welcome to your canvas.\n\nAttach files, collect ideas, and make space for what comes next.",
        ],
        { type: "text/plain" },
      ),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "Example.txt";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (node.kind === "drawing")
    return (
      <svg
        viewBox={`0 0 ${node.w} ${node.h}`}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
      >
        <polyline
          points={node.content}
          fill="none"
          stroke="#333"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (node.kind === "banner")
    return <div className="banner-title">{node.content}</div>;
  if (node.kind === "sticker")
    return (
      <>
        {node.content === "flower" && (
          <span className="creative-commons">cc</span>
        )}
        <Flower sketch={node.content === "doodle"} />
      </>
    );
  if (node.kind === "audio")
    return (
      <div className="audio-card">
        <h3>{node.label}</h3>
        <div className={`waveform ${playing ? "playing" : ""}`}>
          {Array.from({ length: 30 }, (_, i) => (
            <i
              key={i}
              style={{
                height: `${5 + Math.sin(i * 1.76) ** 2 * (i > 4 && i < 22 ? 31 : 8)}px`,
              }}
            />
          ))}
        </div>
        <div className="audio-controls">
          <button onClick={() => input.current?.click()}>Replace</button>
          <button
            className="play-voice"
            aria-label={playing ? "停止语音" : "播放语音"}
            onClick={speak}
          >
            {playing ? (
              <Square size={16} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" />
            )}
          </button>
          <span>
            {clock(time)} / {clock(duration)}
          </span>
        </div>
        <p>Transcription: {node.content}</p>
        <audio
          ref={audio}
          src={node.audio || "/voice-example.wav"}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={() => setTime(audio.current?.currentTime || 0)}
          onLoadedMetadata={() => setDuration(audio.current?.duration || 3)}
        />
        <input
          ref={input}
          hidden
          type="file"
          accept="audio/*"
          onChange={(e) => replace(e.target.files?.[0])}
        />
      </div>
    );
  if (node.kind === "attachment")
    return node.content === "PDF" ? (
      <div className="pdf-card">
        <FileText size={29} />
        <span>{node.label}</span>
      </div>
    ) : (
      <div className="attachment-card">
        <ArrowUpRight size={16} className="card-arrow" />
        <h3>{node.label}</h3>
        <p>{node.content}</p>
        <button onClick={downloadExample}>
          <FileText size={17} />
          Example
        </button>
      </div>
    );
  if (node.kind === "nested")
    return (
      <div className="nested-card">
        <div>
          <Grip size={27} />
          <h3>{node.label}</h3>
        </div>
        <button
          className="nested-preview"
          aria-label="打开子画板"
          onClick={onNested}
        >
          <Grip size={20} />
        </button>
        <ArrowUpRight className="card-arrow" size={16} />
      </div>
    );
  if (node.kind === "link")
    return (
      <div className="link-card">
        <Flower />
        <strong>{node.label}</strong>
        <small>{node.content}</small>
        <div className="link-footer">
          <span>causal.so</span>
          <ArrowUpRight size={16} />
        </div>
      </div>
    );
  if (node.kind === "swatch")
    return (
      <div className="swatch-card">
        <strong>{node.label}</strong>
        <span>{node.content}</span>
      </div>
    );
  return null;
}
