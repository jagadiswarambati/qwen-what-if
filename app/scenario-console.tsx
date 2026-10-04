"use client";

import { useEffect, useState } from "react";

const apiURL = "http://localhost:4000";

interface ConnectionStatus {
  ok: boolean;
  configured: Record<string, boolean>;
  qwen: { ok: boolean; message: string };
  miro: {
    ok: boolean;
    message: string;
    board?: { id: string; name: string };
  };
}

export default function ScenarioConsole() {
  const [scenario, setScenario] = useState(
    "We have ₹10 lakh to launch an AI education startup.",
  );
  const [analysis, setAnalysis] = useState<unknown>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [connections, setConnections] = useState<ConnectionStatus | null>(null);

  useEffect(() => {
    fetch(`${apiURL}/api/health`)
      .then((response) => setBackendOnline(response.ok))
      .catch(() => setBackendOnline(false));
  }, []);

  async function checkConnections() {
    setChecking(true);
    setError("");
    try {
      const response = await fetch(`${apiURL}/api/connections`);
      const result = (await response.json()) as ConnectionStatus;
      setConnections(result);
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
      setError("Cannot reach the backend. Start it with npm run dev:server.");
    } finally {
      setChecking(false);
    }
  }

  async function analyze() {
    setLoading(true);
    setError("");
    setAnalysis(null);
    try {
      const response = await fetch(`${apiURL}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      const result = (await response.json()) as
        | Record<string, unknown>
        | { error: string };
      if (!response.ok) {
        setError(
          "error" in result && typeof result.error === "string"
            ? result.error
            : "Scenario analysis failed.",
        );
        return;
      }
      setAnalysis(result);
    } catch {
      setBackendOnline(false);
      setError("Cannot reach the backend. Start it with npm run dev:server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12 sm:px-10">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
          Interactive Scenario Lab
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Qwen What-If
        </h1>
        <p className="max-w-2xl text-base leading-7 text-zinc-600">
          Explore a real-world scenario with Qwen and check the connection to
          your Miro board.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.7fr)]">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <label
            htmlFor="scenario"
            className="mb-3 block text-sm font-semibold text-zinc-800"
          >
            Describe your scenario
          </label>
          <textarea
            id="scenario"
            value={scenario}
            onChange={(event) => setScenario(event.target.value)}
            rows={6}
            maxLength={10000}
            className="w-full resize-y rounded-xl border border-zinc-300 bg-zinc-50 p-4 text-sm leading-6 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={analyze}
              disabled={loading || !scenario.trim()}
              className="rounded-full bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Analyzing…" : "Analyze with Qwen"}
            </button>
            <button
              type="button"
              onClick={checkConnections}
              disabled={checking}
              className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              {checking ? "Checking…" : "Test connections"}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-4 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
        </div>

        <aside className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Backend connections</h2>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                backendOnline === true
                  ? "bg-emerald-100 text-emerald-800"
                  : backendOnline === false
                    ? "bg-red-100 text-red-800"
                    : "bg-zinc-100 text-zinc-600"
              }`}
            >
              {backendOnline === true
                ? "Backend online"
                : backendOnline === false
                  ? "Backend offline"
                  : "Checking…"}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Connection tests make a small live request to each configured
            service. Credentials stay on the backend.
          </p>
          {connections && (
            <div className="mt-5 space-y-4 text-sm">
              {(["qwen", "miro"] as const).map((service) => {
                const status = connections[service];
                return (
                  <div key={service} className="border-t border-zinc-100 pt-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold capitalize">{service}</span>
                      <span
                        className={
                          status.ok ? "text-emerald-700" : "text-red-700"
                        }
                      >
                        {status.ok ? "Connected" : "Not connected"}
                      </span>
                    </div>
                    <p className="mt-1 text-zinc-600">{status.message}</p>
                    {service === "miro" && "board" in status && status.board && (
                      <p className="mt-1 text-zinc-500">
                        {status.board.name} · {status.board.id}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </section>

      {analysis !== null && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Scenario analysis</h2>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-zinc-950 p-5 text-sm leading-6 text-zinc-100">
            {JSON.stringify(analysis, null, 2)}
          </pre>
        </section>
      )}
    </main>
  );
}
