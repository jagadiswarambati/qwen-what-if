import cors from "cors";
import dotenv from "dotenv";
import express, { type NextFunction, type Request, type Response } from "express";
import {
  testMiroConnection,
  type MiroBoard,
  upsertScenarioMap,
} from "./miro";
import { analyzeScenario, reanalyzeWithAssumptionChange, testQwenConnection } from "./qwen";

dotenv.config({ path: ".env.local" });

const app = express();
const port = Number(process.env.API_PORT ?? 4000);

app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  }),
);
app.use(express.json({ limit: "64kb" }));

function safeErrorMessage(error: unknown, service: "Qwen" | "Miro"): string {
  if (error instanceof Error && error.message.startsWith("Missing ")) {
    return error.message;
  }

  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
      ? error.status
      : undefined;

  if (status === 401) return `${service} rejected the configured credentials.`;
  if (status === 403) return `${service} denied access to the requested resource.`;
  if (status === 400 || status === 422) {
    return service === "Qwen"
      ? "Qwen rejected the request. Verify that QWEN_MODEL is available to this API key."
      : "Miro rejected the request. Check the board ID and token permissions.";
  }
  if (status === 404) {
    return service === "Miro"
      ? "Miro could not find the configured board."
      : "Qwen could not find the configured model or endpoint.";
  }
  if (status === 429) return `${service} rate limit or quota was exceeded.`;
  if (status !== undefined && status >= 500) {
    return `${service} is temporarily unavailable (HTTP ${status}).`;
  }
  if (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  ) {
    return `${service} request timed out.`;
  }
  if (error instanceof Error && error.message.startsWith("Qwen returned")) {
    return error.message;
  }
  if (
    error instanceof Error &&
    error.message === "Miro returned board details in an unexpected format."
  ) {
    return error.message;
  }
  return `Could not connect to ${service}. Check the server configuration and network.`;
}

function requiredVariables(): Record<string, boolean> {
  return {
    MODELSCOPE_API_KEY: Boolean(process.env.MODELSCOPE_API_KEY),
    QWEN_MODEL: Boolean(process.env.QWEN_MODEL?.trim()),
    MIRO_ACCESS_TOKEN: Boolean(process.env.MIRO_ACCESS_TOKEN),
    MIRO_BOARD_ID: Boolean(process.env.MIRO_BOARD_ID),
  };
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "qwen-what-if-api" });
});

app.get("/api/connections", async (_request, response) => {
  const configured = requiredVariables();
  const [qwenResult, miroResult] = await Promise.allSettled([
    testQwenConnection(),
    testMiroConnection(),
  ]);

  const qwen =
    qwenResult.status === "fulfilled"
      ? { ok: true as const, message: "Connected to Qwen." }
      : {
          ok: false as const,
          message: safeErrorMessage(qwenResult.reason, "Qwen"),
        };
  const miro: { ok: boolean; message: string; board?: MiroBoard } =
    miroResult.status === "fulfilled"
      ? {
          ok: true as const,
          message: "Connected to Miro.",
          board: miroResult.value,
        }
      : {
          ok: false as const,
          message: safeErrorMessage(miroResult.reason, "Miro"),
        };

  response.status(qwen.ok && miro.ok ? 200 : 503).json({
    ok: qwen.ok && miro.ok,
    configured,
    qwen,
    miro,
  });
});

app.post(
  "/api/analyze",
  async (request: Request, response: Response) => {
    const scenario: unknown = request.body?.scenario;
    if (typeof scenario !== "string" || scenario.trim().length === 0) {
      response.status(400).json({
        error: "Provide a non-empty scenario string.",
      });
      return;
    }
    if (scenario.length > 10000) {
      response.status(400).json({
        error: "Scenario must be 10,000 characters or fewer.",
      });
      return;
    }

    try {
      const analysis = await analyzeScenario(scenario.trim());
      response.json(analysis);
    } catch (error) {
      response.status(502).json({
        error: safeErrorMessage(error, "Qwen"),
      });
    }
  },
);

app.post(
  "/api/analyze-and-visualize",
  async (request: Request, response: Response) => {
    const scenario: unknown = request.body?.scenario;
    if (typeof scenario !== "string" || scenario.trim().length === 0) {
      response.status(400).json({
        error: "Provide a non-empty scenario string.",
      });
      return;
    }
    if (scenario.length > 10000) {
      response.status(400).json({
        error: "Scenario must be 10,000 characters or fewer.",
      });
      return;
    }

    let analysis;
    try {
      analysis = await analyzeScenario(scenario.trim());
    } catch (error) {
      response.status(502).json({
        error: safeErrorMessage(error, "Qwen"),
      });
      return;
    }

    try {
      const miro = await upsertScenarioMap(analysis);
      response.json({ analysis, miro });
    } catch (error) {
      response.status(502).json({
        error: safeErrorMessage(error, "Miro"),
        analysis,
      });
    }
  },
);

app.post(
  "/api/update-assumption",
  async (request: Request, response: Response) => {
    const { scenario, previousAnalysis, assumption } = request.body as {
      scenario?: unknown;
      previousAnalysis?: unknown;
      assumption?: { previous?: unknown; updated?: unknown };
    };

    if (typeof scenario !== "string" || scenario.trim().length === 0) {
      response.status(400).json({ error: "Provide a non-empty scenario string." });
      return;
    }
    if (scenario.length > 10000) {
      response.status(400).json({ error: "Scenario must be 10,000 characters or fewer." });
      return;
    }
    if (
      typeof previousAnalysis !== "object" ||
      previousAnalysis === null ||
      Array.isArray(previousAnalysis)
    ) {
      response.status(400).json({ error: "Provide the previousAnalysis object." });
      return;
    }
    if (
      typeof assumption?.previous !== "string" ||
      assumption.previous.trim().length === 0 ||
      typeof assumption?.updated !== "string" ||
      assumption.updated.trim().length === 0
    ) {
      response.status(400).json({
        error: "Provide assumption.previous and assumption.updated strings.",
      });
      return;
    }

    let analysis;
    try {
      analysis = await reanalyzeWithAssumptionChange(
        scenario.trim(),
        previousAnalysis as Parameters<typeof reanalyzeWithAssumptionChange>[1],
        assumption.previous.trim(),
        assumption.updated.trim(),
      );
    } catch (error) {
      response.status(502).json({ error: safeErrorMessage(error, "Qwen") });
      return;
    }

    try {
      const miro = await upsertScenarioMap(analysis);
      response.json({ analysis, miro, assumptionChanged: { previous: assumption.previous, updated: assumption.updated } });
    } catch (error) {
      response.status(502).json({
        error: safeErrorMessage(error, "Miro"),
        analysis,
        assumptionChanged: { previous: assumption.previous, updated: assumption.updated },
      });
    }
  },
);

app.use(
  (
    error: unknown,
    _request: Request,
    response: Response,
    next: NextFunction,
  ) => {
    if (response.headersSent) {
      next(error);
      return;
    }
    if (error instanceof SyntaxError && "body" in error) {
      response.status(400).json({ error: "Request body must contain valid JSON." });
      return;
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      error.status === 413
    ) {
      response.status(413).json({ error: "Request body is too large." });
      return;
    }
    response.status(500).json({ error: "An unexpected server error occurred." });
  },
);

app.listen(port, "127.0.0.1", () => {
  console.log(`Qwen What-If API listening on http://127.0.0.1:${port}`);
});
