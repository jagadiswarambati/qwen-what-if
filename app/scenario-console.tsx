"use client";

import { useEffect, useReducer, useRef, useState } from "react";

const API_URL = "http://127.0.0.1:4000";
const DEMO_SCENARIO =
  "We have â‚¹10 lakh to launch an AI education startup for 10,000 users within 6 months. We need to decide how to allocate the budget across product development, infrastructure, hiring, and marketing.";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ScenarioAnalysis {
  scenario: string;
  variables: string[];
  decisions: string[];
  dependencies: string[];
  risks: string[];
  outcomes: string[];
  recommendation: string;
  fragileAssumptions: string[];
}

interface MiroResult {
  boardId: string;
  itemIds: string[];
  created: number;
  updated: number;
  removed: number;
}

interface AssumptionChange {
  previous: string;
  updated: string;
}

interface Diff {
  decisions: boolean;
  risks: boolean;
  outcomes: boolean;
  recommendation: boolean;
  variables: boolean;
  dependencies: boolean;
}

interface ConnectionStatus {
  ok: boolean;
  configured: Record<string, boolean>;
  qwen: { ok: boolean; message: string };
  miro: { ok: boolean; message: string; board?: { id: string; name: string } };
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function computeDiff(prev: ScenarioAnalysis, next: ScenarioAnalysis): Diff {
  const arrChanged = (a: string[], b: string[]) =>
    JSON.stringify([...a].sort()) !== JSON.stringify([...b].sort());
  return {
    decisions: arrChanged(prev.decisions, next.decisions),
    risks: arrChanged(prev.risks, next.risks),
    outcomes: arrChanged(prev.outcomes, next.outcomes),
    recommendation: prev.recommendation !== next.recommendation,
    variables: arrChanged(prev.variables, next.variables),
    dependencies: arrChanged(prev.dependencies, next.dependencies),
  };
}

function changedCount(diff: Diff): number {
  return Object.values(diff).filter(Boolean).length;
}

// â”€â”€â”€ Small reusable components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Badge({
  children,
  variant = "neutral",
}: {
  children: React.ReactNode;
  variant?: "ok" | "error" | "neutral" | "warn";
}) {
  const cls = {
    ok: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    error: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    warn: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    neutral: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  }[variant];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {children}
    </span>
  );
}

function SectionCard({
  title,
  children,
  highlight,
  changed,
}: {
  title: string;
  children: React.ReactNode;
  highlight?: boolean;
  changed?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        highlight
          ? "border-violet-400 bg-violet-50 dark:border-violet-500/50 dark:bg-violet-950/30"
          : changed
            ? "border-amber-400 bg-amber-50 dark:border-amber-500/50 dark:bg-amber-950/30"
            : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/60"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <h3
          className={`text-xs font-bold uppercase tracking-widest ${
            highlight
              ? "text-violet-700 dark:text-violet-400"
              : changed
                ? "text-amber-700 dark:text-amber-400"
                : "text-zinc-500 dark:text-zinc-400"
          }`}
        >
          {title}
        </h3>
        {changed && <Badge variant="warn">Changed</Badge>}
      </div>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0)
    return <p className="text-sm text-zinc-400 dark:text-zinc-500 italic">None identified</p>;
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-zinc-700 dark:text-zinc-200">
          <span className="mt-0.5 shrink-0 text-zinc-400 dark:text-zinc-500">â€¢</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
      <svg
        className="h-4 w-4 animate-spin text-violet-600 dark:text-violet-400"
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
      {label}
    </div>
  );
}

// â”€â”€â”€ Editable Assumption Chip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AssumptionChip({
  value,
  onSimulate,
  disabled,
}: {
  value: string;
  onSimulate: (prev: string, updated: string) => void;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function handleSimulate() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      setEditing(false);
      setDraft(value);
      return;
    }
    onSimulate(value, trimmed);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-violet-400 bg-violet-50 px-2 py-1 dark:border-violet-500/60 dark:bg-violet-950/30">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSimulate();
            if (e.key === "Escape") {
              setEditing(false);
              setDraft(value);
            }
          }}
          className="w-36 bg-transparent text-sm text-zinc-800 outline-none dark:text-zinc-100 placeholder:text-zinc-400"
        />
        <button
          type="button"
          onClick={handleSimulate}
          disabled={disabled || !draft.trim() || draft.trim() === value}
          className="rounded-md bg-violet-600 px-2 py-0.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Simulate
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setDraft(value);
          }}
          className="rounded-md px-1.5 py-0.5 text-xs text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          âœ•
        </button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 dark:border-zinc-600 dark:bg-zinc-700">
      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{value}</span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        disabled={disabled}
        className="ml-1 text-xs text-zinc-400 opacity-0 transition group-hover:opacity-100 hover:text-violet-600 disabled:cursor-not-allowed dark:text-zinc-500 dark:hover:text-violet-400"
        title="Change this assumption"
      >
        âœŽ Change
      </button>
    </div>
  );
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Phase = "idle" | "analyzing" | "simulating" | "done" | "error";

export default function ScenarioConsole() {
  // â”€â”€ Theme â”€â”€
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // â”€â”€ State â”€â”€
  const [scenario, setScenario] = useState(DEMO_SCENARIO);
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [analysis, setAnalysis] = useState<ScenarioAnalysis | null>(null);
  const [previousAnalysis, setPreviousAnalysis] = useState<ScenarioAnalysis | null>(null);
  const [miro, setMiro] = useState<MiroResult | null>(null);
  const [lastChange, setLastChange] = useState<AssumptionChange | null>(null);
  const [diff, setDiff] = useState<Diff | null>(null);
  const [connections, setConnections] = useState<ConnectionStatus | null>(null);
  const [checkingConn, setCheckingConn] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [showRaw, setShowRaw] = useReducer((s: boolean) => !s, false);

  // â”€â”€ Health check on mount â”€â”€
  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then((r) => setBackendOnline(r.ok))
      .catch(() => setBackendOnline(false));
  }, []);

  // â”€â”€ Connection check â”€â”€
  async function checkConnections() {
    setCheckingConn(true);
    setErrorMsg("");
    try {
      const r = await fetch(`${API_URL}/api/connections`);
      const data = (await r.json()) as ConnectionStatus;
      setConnections(data);
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
      setErrorMsg("Cannot reach backend. Run: npm run dev:server");
    } finally {
      setCheckingConn(false);
    }
  }

  // â”€â”€ Initial analysis â”€â”€
  async function analyze() {
    if (!scenario.trim()) return;
    setPhase("analyzing");
    setErrorMsg("");
    setAnalysis(null);
    setPreviousAnalysis(null);
    setMiro(null);
    setLastChange(null);
    setDiff(null);
    try {
      const r = await fetch(`${API_URL}/api/analyze-and-visualize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: scenario.trim() }),
      });
      const data = (await r.json()) as {
        analysis?: ScenarioAnalysis;
        miro?: MiroResult;
        error?: string;
      };
      if (!r.ok) {
        setErrorMsg(data.error ?? "Analysis failed.");
        setPhase("error");
        return;
      }
      setAnalysis(data.analysis ?? null);
      setMiro(data.miro ?? null);
      setPhase("done");
    } catch {
      setBackendOnline(false);
      setErrorMsg("Cannot reach backend. Run: npm run dev:server");
      setPhase("error");
    }
  }

  // â”€â”€ Assumption change / What-If simulation â”€â”€
  async function simulateChange(prev: string, updated: string) {
    if (!analysis) return;
    setPhase("simulating");
    setErrorMsg("");
    setLastChange({ previous: prev, updated });
    setPreviousAnalysis(analysis);
    try {
      const r = await fetch(`${API_URL}/api/update-assumption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: scenario.trim(),
          previousAnalysis: analysis,
          assumption: { previous: prev, updated },
        }),
      });
      const data = (await r.json()) as {
        analysis?: ScenarioAnalysis;
        miro?: MiroResult;
        error?: string;
      };
      if (!r.ok) {
        setErrorMsg(data.error ?? "Simulation failed.");
        setPhase("error");
        return;
      }
      const newAnalysis = data.analysis ?? null;
      if (newAnalysis && previousAnalysis) {
        setDiff(computeDiff(analysis, newAnalysis));
      }
      setAnalysis(newAnalysis);
      setMiro(data.miro ?? null);
      setPhase("done");
    } catch {
      setBackendOnline(false);
      setErrorMsg("Cannot reach backend. Run: npm run dev:server");
      setPhase("error");
    }
  }

  const isLoading = phase === "analyzing" || phase === "simulating";
  const miroHref = miro?.boardId
    ? `https://miro.com/app/board/${encodeURIComponent(miro.boardId)}/`
    : null;

  // â”€â”€â”€ UI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 transition-colors duration-200">
      {/* â”€â”€ Top bar â”€â”€ */}
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
              Interactive Scenario Lab
            </span>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Qwen What-If
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Miro status */}
            {connections?.miro.ok && (
              <Badge variant="ok">âœ“ Miro connected</Badge>
            )}
            {backendOnline === false && <Badge variant="error">Backend offline</Badge>}
            {/* Theme toggle */}
            <button
              type="button"
              onClick={() => setDark((d) => !d)}
              aria-label="Toggle theme"
              className="rounded-lg border border-zinc-200 bg-zinc-100 p-2 text-zinc-600 transition hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              {dark ? (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 2.22a1 1 0 011.415 0l.707.707a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 010-1.414zM18 9a1 1 0 110 2h-1a1 1 0 110-2h1zM5.636 15.364a1 1 0 010-1.414l.707-.707A1 1 0 017.757 14.6l-.707.707a1 1 0 01-1.414 0zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-6-7a1 1 0 110 2H3a1 1 0 110-2h1zm2.343-5.657a1 1 0 010 1.414l-.707.707A1 1 0 014.222 4.05l.707-.707a1 1 0 011.414 0zM10 6a4 4 0 100 8 4 4 0 000-8z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* â”€â”€ Hero â”€â”€ */}
        <div className="mb-8">
          <p className="text-base text-zinc-500 dark:text-zinc-400">
            Explore how decisions change when assumptions change.
          </p>
        </div>

        {/* â”€â”€ Two-column layout â”€â”€ */}
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* â”€â”€ Left: input + results â”€â”€ */}
          <div className="space-y-6">
            {/* Scenario input card */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <label
                htmlFor="scenario-input"
                className="mb-2 block text-sm font-semibold text-zinc-800 dark:text-zinc-100"
              >
                Describe your scenario
              </label>
              <textarea
                id="scenario-input"
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                rows={5}
                maxLength={10000}
                disabled={isLoading}
                placeholder="e.g. We have â‚¹10 lakh to launch an AI education startupâ€¦"
                className="w-full resize-y rounded-xl border border-zinc-300 bg-zinc-50 p-4 text-sm leading-6 text-zinc-900 outline-none placeholder:text-zinc-400 transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-violet-500"
              />
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  id="analyze-btn"
                  onClick={analyze}
                  disabled={isLoading || !scenario.trim()}
                  className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {phase === "analyzing" ? "Analyzingâ€¦" : "Analyze Scenario"}
                </button>
                {analysis && (
                  <button
                    type="button"
                    id="re-analyze-btn"
                    onClick={analyze}
                    disabled={isLoading}
                    className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Re-analyze
                  </button>
                )}
              </div>

              {/* Loading states */}
              {phase === "analyzing" && (
                <div className="mt-4 space-y-1">
                  <Spinner label="Analyzing scenarioâ€¦" />
                  <p className="pl-7 text-xs text-zinc-400 dark:text-zinc-500">
                    Qwen is reasoning about your assumptions.
                  </p>
                </div>
              )}
              {phase === "simulating" && (
                <div className="mt-4 space-y-1">
                  <Spinner label="Simulating changeâ€¦" />
                  <p className="pl-7 text-xs text-zinc-400 dark:text-zinc-500">
                    Re-evaluating consequences.
                  </p>
                </div>
              )}

              {/* Error state */}
              {phase === "error" && errorMsg && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800/50 dark:bg-red-950/30">
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 110-12 6 6 0 010 12zm-1-5V7a1 1 0 012 0v4a1 1 0 01-2 0zm0 3a1 1 0 112 0 1 1 0 01-2 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                      {errorMsg}
                    </p>
                    <button
                      type="button"
                      onClick={analyze}
                      className="mt-2 text-xs font-semibold text-red-600 underline hover:no-underline dark:text-red-400"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* â”€â”€ Diff banner â”€â”€ */}
            {lastChange && diff && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-600/50 dark:bg-amber-950/30">
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                  Assumption Changed
                </p>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                  <span className="rounded bg-red-100 px-1 py-0.5 text-red-700 line-through dark:bg-red-900/40 dark:text-red-400">
                    {lastChange.previous}
                  </span>
                  {" â†’ "}
                  <span className="rounded bg-emerald-100 px-1 py-0.5 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                    {lastChange.updated}
                  </span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {changedCount(diff) === 0 ? (
                    <Badge variant="ok">No significant changes</Badge>
                  ) : (
                    <>
                      {diff.decisions && <Badge variant="warn">Decisions changed</Badge>}
                      {diff.risks && <Badge variant="warn">Risks changed</Badge>}
                      {diff.outcomes && <Badge variant="warn">Outcomes changed</Badge>}
                      {diff.recommendation && <Badge variant="warn">Recommendation updated</Badge>}
                      {diff.variables && <Badge variant="warn">Variables changed</Badge>}
                      {diff.dependencies && <Badge variant="warn">Dependencies changed</Badge>}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* â”€â”€ Structured analysis â”€â”€ */}
            {analysis && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-zinc-800 dark:text-zinc-100">
                    Scenario Analysis
                  </h2>
                  <button
                    type="button"
                    onClick={setShowRaw}
                    className="text-xs text-zinc-400 underline hover:no-underline dark:text-zinc-500"
                  >
                    {showRaw ? "Hide" : "View"} raw JSON
                  </button>
                </div>

                {showRaw && (
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-zinc-950 p-5 text-xs leading-6 text-zinc-100 dark:bg-zinc-800">
                    {JSON.stringify(analysis, null, 2)}
                  </pre>
                )}

                {/* Scenario */}
                <SectionCard title="Scenario">
                  <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-200">
                    {analysis.scenario}
                  </p>
                </SectionCard>

                {/* Assumptions â€” editable */}
                <SectionCard
                  title="Assumptions / Variables"
                  changed={diff?.variables ?? false}
                >
                  <div className="flex flex-wrap gap-2">
                    {[...analysis.variables, ...analysis.fragileAssumptions]
                      .filter((v, i, arr) => arr.indexOf(v) === i)
                      .map((v, i) => (
                        <AssumptionChip
                          key={i}
                          value={v}
                          onSimulate={simulateChange}
                          disabled={isLoading}
                        />
                      ))}
                  </div>
                  <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                    Hover a chip and click &ldquo;Change&rdquo; to simulate a what-if.
                  </p>
                </SectionCard>

                {/* Fragile assumptions */}
                <SectionCard
                  title="âš  Fragile Assumptions"
                  highlight
                >
                  <BulletList items={analysis.fragileAssumptions} />
                  <p className="mt-2 text-xs text-violet-600 dark:text-violet-400">
                    These are the assumptions most likely to break the scenario.
                  </p>
                </SectionCard>

                {/* 2-col grid for decisions / deps */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <SectionCard title="Decisions" changed={diff?.decisions ?? false}>
                    <BulletList items={analysis.decisions} />
                  </SectionCard>
                  <SectionCard title="Dependencies" changed={diff?.dependencies ?? false}>
                    <BulletList items={analysis.dependencies} />
                  </SectionCard>
                </div>

                {/* 2-col for risks / outcomes */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <SectionCard title="Risks" changed={diff?.risks ?? false}>
                    <BulletList items={analysis.risks} />
                  </SectionCard>
                  <SectionCard title="Outcomes" changed={diff?.outcomes ?? false}>
                    <BulletList items={analysis.outcomes} />
                  </SectionCard>
                </div>

                {/* Recommendation */}
                <SectionCard
                  title="Recommendation"
                  changed={diff?.recommendation ?? false}
                >
                  <p className="text-sm font-medium leading-6 text-zinc-800 dark:text-zinc-100">
                    {analysis.recommendation}
                  </p>
                </SectionCard>
              </div>
            )}
          </div>

          {/* â”€â”€ Right sidebar â”€â”€ */}
          <div className="space-y-4">
            {/* Connections */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <h2 className="font-semibold text-zinc-800 dark:text-zinc-100">Connections</h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Credentials stay server-side only.
              </p>
              <button
                type="button"
                id="check-connections-btn"
                onClick={checkConnections}
                disabled={checkingConn}
                className="mt-3 w-full rounded-xl border border-zinc-300 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {checkingConn ? "Checkingâ€¦" : "Test connections"}
              </button>

              {connections && (
                <div className="mt-4 space-y-3">
                  {(["qwen", "miro"] as const).map((svc) => {
                    const s = connections[svc];
                    return (
                      <div
                        key={svc}
                        className="flex items-start justify-between gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-700"
                      >
                        <div>
                          <p className="text-sm font-semibold capitalize text-zinc-800 dark:text-zinc-100">
                            {svc}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{s.message}</p>
                          {svc === "miro" && "board" in s && s.board && (
                            <p className="text-xs text-zinc-400 dark:text-zinc-500">
                              {s.board.name}
                            </p>
                          )}
                        </div>
                        <Badge variant={s.ok ? "ok" : "error"}>
                          {s.ok ? "âœ“" : "âœ—"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Miro sync status */}
            {miro && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <div className="flex items-center gap-2">
                  <Badge variant="ok">âœ“ Miro synced</Badge>
                </div>
                <p className="mt-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                  {miro.itemIds.length} objects on board
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {miro.created} created Â· {miro.updated} updated Â· {miro.removed} removed
                </p>
                {miroHref && (
                  <a
                    href={miroHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    id="open-miro-btn"
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open Miro Board
                  </a>
                )}
              </div>
            )}

            {/* What-If loop explainer */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                The Loop
              </h3>
              {[
                ["Describe", "Write your scenario"],
                ["Visualize", "Qwen reasons Â· Miro maps"],
                ["Change", "Edit an assumption chip"],
                ["Simulate", "Qwen re-reasons the delta"],
                ["Understand", "See what changed"],
                ["Decide", "Act on updated intelligence"],
              ].map(([step, desc], i, arr) => (
                <div key={step} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
                      {i + 1}
                    </div>
                    {i < arr.length - 1 && (
                      <div className="my-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
                    )}
                  </div>
                  <div className="pb-2">
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{step}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
