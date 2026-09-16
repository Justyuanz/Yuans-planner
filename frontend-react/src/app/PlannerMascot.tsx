import { useState, type FormEvent } from "react";

const LINES = [
  "Pick the next useful move.",
  "Tiny progress still counts on difficult days.",
  "Make the problem smaller, then hit it.",
  "One clean block can rescue the whole day."
];

interface PlannerMascotProps {
  chatOpen: boolean;
  onChatToggle: () => void;
}

export function PlannerMascot({ chatOpen, onChatToggle }: PlannerMascotProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  async function askMascot(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;
    setAnswer("Thinking about one useful next move...");
    try {
      const response = await fetch("/api/mascot/chat", {
        body: JSON.stringify({ context: {}, question: trimmed }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const payload: unknown = await response.json();
      const reply = typeof payload === "object" && payload !== null && "reply" in payload
        ? payload.reply
        : null;
      const text = typeof reply === "object" && reply !== null && "answer" in reply
        ? reply.answer
        : null;
      setAnswer(typeof text === "string" ? text : "Pick one small task and make the first move visible.");
    } catch {
      setAnswer("Pick one small task and make the first move visible.");
    }
    setQuestion("");
  }

  return (
    <div className={`mascot-card${chatOpen ? " is-mobile-open" : ""}`} aria-label="Planner companion">
      <div className="mascot-bubble" aria-live="polite">{answer || LINES[lineIndex]}</div>
      <button
        aria-label="Get a small encouraging note"
        className="soft-mascot"
        onClick={() => setLineIndex((current) => (current + 1) % LINES.length)}
        type="button"
      >
        <svg className="mascot-svg" viewBox="0 0 180 190" role="img" aria-hidden="true">
          <defs>
            <radialGradient id="reactMascotGlow" cx="50%" cy="34%" r="70%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="58%" stopColor="#fff1d9" />
              <stop offset="100%" stopColor="#f5cde0" />
            </radialGradient>
            <linearGradient id="reactMascotBody" x1="25%" y1="10%" x2="75%" y2="95%">
              <stop offset="0%" stopColor="#fffdf7" />
              <stop offset="52%" stopColor="#fff0c8" />
              <stop offset="100%" stopColor="#eec9dc" />
            </linearGradient>
            <linearGradient id="reactMascotSprout" x1="15%" y1="15%" x2="95%" y2="95%">
              <stop offset="0%" stopColor="#dbef96" />
              <stop offset="100%" stopColor="#8ac77f" />
            </linearGradient>
            <filter id="reactMascotShadow" x="-25%" y="-25%" width="150%" height="160%">
              <feDropShadow dx="0" dy="14" stdDeviation="10" floodColor="#8f7ad4" floodOpacity="0.18" />
            </filter>
          </defs>
          <ellipse cx="90" cy="166" rx="54" ry="10" fill="#9b8ad7" opacity="0.12" />
          <g className="mascot-sprout" style={{ transformOrigin: "90px 58px" }}>
            <path d="M88 61 C84 46 86 31 96 18" fill="none" stroke="#8f7948" strokeWidth="7" strokeLinecap="round" />
            <path d="M95 18 C72 4 50 12 43 31 C61 38 82 35 95 18Z" fill="url(#reactMascotSprout)" stroke="#7aa765" strokeWidth="2" />
            <path d="M96 18 C115 1 141 7 150 27 C132 39 109 36 96 18Z" fill="url(#reactMascotSprout)" stroke="#7aa765" strokeWidth="2" />
            <path d="M62 24 C72 24 82 21 92 16" fill="none" stroke="#eff8b6" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
            <path d="M111 17 C122 20 132 22 143 25" fill="none" stroke="#eff8b6" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
          </g>
          <g filter="url(#reactMascotShadow)">
            <path className="mascot-body-shape" d="M38 90 C38 65 55 52 90 52 C125 52 142 65 142 90 L142 127 C142 150 122 162 90 162 C58 162 38 150 38 127Z" fill="url(#reactMascotBody)" stroke="#d6b986" strokeWidth="4" />
            <path d="M48 96 C59 83 122 83 132 96" fill="none" stroke="#ffffff" strokeWidth="4" opacity="0.5" strokeLinecap="round" />
            <circle className="mascot-eye left-eye" cx="70" cy="107" r="7" fill="#293442" />
            <circle className="mascot-eye right-eye" cx="110" cy="107" r="7" fill="#293442" />
            <circle cx="68" cy="104" r="2" fill="#ffffff" opacity="0.8" />
            <circle cx="108" cy="104" r="2" fill="#ffffff" opacity="0.8" />
            <path className="mascot-smile" d="M82 125 C87 130 94 130 99 125" fill="none" stroke="#8f715e" strokeWidth="4" strokeLinecap="round" />
            <ellipse cx="56" cy="123" rx="12" ry="6" fill="#ff9fac" opacity="0.46" />
            <ellipse cx="124" cy="123" rx="12" ry="6" fill="#ff9fac" opacity="0.46" />
            <path className="mascot-arm left-arm" d="M42 124 C26 129 26 146 42 148" fill="none" stroke="#d6b986" strokeWidth="10" strokeLinecap="round" />
            <path className="mascot-arm right-arm" d="M138 124 C154 129 154 146 138 148" fill="none" stroke="#d6b986" strokeWidth="10" strokeLinecap="round" />
            <path d="M79 143 L89 132 L101 143 L90 151Z" fill="#b8d86d" stroke="#8eaf49" strokeWidth="2" />
          </g>
          <g className="mascot-sparkles">
            <path d="M31 65 L35 74 L44 78 L35 82 L31 91 L27 82 L18 78 L27 74Z" fill="#fff4a8" />
            <path d="M148 74 L151 81 L158 84 L151 87 L148 94 L145 87 L138 84 L145 81Z" fill="#c5f1ef" />
            <circle cx="142" cy="48" r="4" fill="#f8c8dc" />
          </g>
        </svg>
      </button>
      <div className="mascot-tools">
        <button className="secondary-button mascot-chat-toggle" onClick={onChatToggle} type="button">
          {chatOpen ? "Hide Sprouty" : "Ask Sprouty"}
        </button>
        <div className="mascot-chat" hidden={!chatOpen}>
          <div className="mascot-chat-log" aria-live="polite">
            {answer && <div className="mascot-message assistant">{answer}</div>}
          </div>
          <form className="mascot-chat-form" onSubmit={(event) => void askMascot(event)}>
            <input
              autoComplete="off"
              maxLength={140}
              onChange={(event) => setQuestion(event.currentTarget.value)}
              placeholder="Ask Sprouty about today"
              value={question}
            />
            <button className="secondary-button" type="submit">Ask</button>
          </form>
        </div>
      </div>
    </div>
  );
}
