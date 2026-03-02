use client;

import React, { useState, useRef, useEffect } from "react";
import { ProductCarousel, type ProductItem } from "./ProductCarousel";

interface Message {
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
  ui?: { kind: string; products?: ProductItem[] };
}

const SUGGESTED_QUESTIONS = [
  "How long does shipping take?",
  "What is your return policy?",
  "How do I wash my items?",
  "I want to speak to a human",
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function EscalationCard() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="mt-2 rounded-lg border border-border bg-muted p-3 text-sm text-center">
        <p className="font-semibold text-foreground">✅ Message sent!</p>
        <p className="text-xs text-muted-foreground mt-1">
          We&apos;ll get back to you within one business day.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-border bg-muted p-3 text-sm">
      <p className="mb-2 font-semibold text-foreground">Contact Support</p>
      <p className="mb-3 text-muted-foreground text-xs">
        Fill in your details and we&apos;ll get back to you within one business
        day.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
        className="space-y-2"
      >
        <input
          type="text"
          placeholder="Your name"
          required
          className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <input
          type="email"
          placeholder="Your email"
          required
          className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <textarea
          placeholder="How can we help?"
          rows={2}
          required
          className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
        <button
          type="submit"
          className="w-full rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Send message
        </button>
      </form>
    </div>
  );
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listKey = 0;

  function flushList() {
    if (listItems.length > 0) {
      result.push(
        <ul key={`ul-${listKey++}`} className="mt-1 mb-1 ml-4 list-disc space-y-1">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  }

  lines.forEach((line, i) => {
    const listMatch = line.match(/^[*\-•]\s+(.*)/);
    if (listMatch) {
      listItems.push(
        <li key={i} className="text-sm leading-relaxed">
          {renderInline(listMatch[1].trim())}
        </li>
      );
    } else {
      flushList();
      const trimmed = line.trim();
      if (trimmed !== "") {
        result.push(
          <p key={i} className="mb-1 leading-relaxed">
            {renderInline(trimmed)}
          </p>
        );
      }
    }
  });

  flushList();
  return <div className="space-y-0.5">{result}</div>;
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
    </div>
  );
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, open]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      role: "user",
      text: text.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Add empty assistant placeholder — streaming will populate it
    setMessages((prev) => [
      ...prev,
      { role: "assistant", text: "", timestamp: new Date() },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          history: messages.map((m) => ({
            role: m.role,
            content: m.text,
          })),
        }),
      });

      const contentType = res.headers.get("content-type") ?? "";

      if (contentType.includes("text/event-stream")) {
        // SSE streaming path
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let firstChunk = true;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6)) as {
                type: string;
                chunk?: string;
                text?: string;
                ui?: Message["ui"]; 
              };

              if (event.type === "text" && event.chunk) {
                if (firstChunk) {
                  setLoading(false);
                  firstChunk = false;
                }
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      text: last.text + event.chunk,
                    };
                  }
                  return updated;
                });
              } else if (event.type === "replace" && event.text !== undefined) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = { ...last, text: event.text! };
                  }
                  return updated;
                });
              } else if (event.type === "ui" && event.ui) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = { ...last, ui: event.ui };
                  }
                  return updated;
                });
              } else if (event.type === "done") {
                setLoading(false);
              }
            } catch {
              // ignore parse errors
            }
          }
        }
        setLoading(false);
      } else {
        // JSON fast-path (escalation, Ollama unavailable)
        const data = await res.json();
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            text: data.reply ?? "",
            timestamp: new Date(),
            ui: data.ui,
          };
          return updated;
        });
        setLoading(false);
      }
    } catch (error) {
      console.error("Chat API error:", error);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          text: "Sorry, something went wrong. Please try again.",
          timestamp: new Date(),
        };
        return updated;
      });
      setLoading(false);
    }
  }

  const showSuggestions = messages.length === 0;

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-20 right-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
          style={{
            width: "clamp(300px, 90vw, 380px)",
            maxHeight: "min(600px, 80vh)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-primary px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🦙</span>
              <div>
                <p className="text-sm font-semibold text-primary-foreground">
                  Little Llama Support
                </p>
                <p className="text-xs text-primary-foreground/70">
                  Typically replies instantly
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-primary-foreground/80 hover:text-primary-foreground transition-colors"
              aria-label="Close chat"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Welcome message */}
            <div className="flex flex-col items-start gap-1">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm text-foreground">
                Hi! 👋 I&apos;m your Little Llama assistant. How can I help you
                today?
              </div>
              <span className="text-xs text-muted-foreground pl-1">
                {formatTime(new Date())}
              </span>
            </div>

            {/* Suggested questions */}
            {showSuggestions && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Suggested questions:
                </p>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="block w-full rounded-xl border border-border bg-background px-3 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Conversation */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "rounded-tr-sm bg-primary text-primary-foreground whitespace-pre-wrap"
                      : "rounded-tl-sm bg-muted text-foreground"
                  }`}
                >
                  {msg.role === "assistant" ? renderMarkdown(msg.text) : msg.text}
                  {msg.ui?.kind === "escalation_form" && <EscalationCard />}
                  {msg.ui?.kind === "product_carousel" &&
                    msg.ui.products &&
                    msg.ui.products.length > 0 && (
                      <ProductCarousel products={msg.ui.products} />
                    )}
                </div>
                <span className="text-xs text-muted-foreground px-1">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex flex-col items-start gap-1">
                <div className="rounded-2xl rounded-tl-sm bg-muted">
                  <LoadingDots />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                aria-label="Send message"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-200 hover:scale-105"
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
    </>
  );
}