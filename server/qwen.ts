import OpenAI from "openai";
import {
  assumptionChangeSystemPrompt,
  assumptionChangeUserPrompt,
  scenarioAnalysisSystemPrompt,
  scenarioAnalysisUserPrompt,
} from "./prompts";

export interface ScenarioAnalysis {
  scenario: string;
  variables: string[];
  decisions: string[];
  dependencies: string[];
  risks: string[];
  outcomes: string[];
  recommendation: string;
  fragileAssumptions: string[];
}

const qwenBaseURL = "https://api-inference.modelscope.ai/v1";

function getClient(): OpenAI {
  const apiKey = process.env.MODELSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing MODELSCOPE_API_KEY.");
  }
  return new OpenAI({ apiKey, baseURL: qwenBaseURL });
}

function getModel(): string {
  const model = process.env.QWEN_MODEL?.trim();
  if (!model) {
    throw new Error("Missing QWEN_MODEL.");
  }
  return model;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parseScenarioAnalysis(content: string): ScenarioAnalysis {
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    throw new Error("Qwen returned invalid JSON. Check the configured model and try again.");
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Qwen returned JSON in an unexpected format.");
  }

  const analysis = value as Record<string, unknown>;
  const arrayFields = [
    "variables",
    "decisions",
    "dependencies",
    "risks",
    "outcomes",
    "fragileAssumptions",
  ] as const;
  const hasValidArrays = arrayFields.every((field) =>
    isStringArray(analysis[field]),
  );

  if (
    typeof analysis.scenario !== "string" ||
    typeof analysis.recommendation !== "string" ||
    !hasValidArrays
  ) {
    throw new Error("Qwen returned JSON that does not match the expected scenario schema.");
  }

  return {
    scenario: analysis.scenario,
    variables: analysis.variables as string[],
    decisions: analysis.decisions as string[],
    dependencies: analysis.dependencies as string[],
    risks: analysis.risks as string[],
    outcomes: analysis.outcomes as string[],
    recommendation: analysis.recommendation,
    fragileAssumptions: analysis.fragileAssumptions as string[],
  };
}

export async function analyzeScenario(
  scenario: string,
): Promise<ScenarioAnalysis> {
  const completion = await getClient().chat.completions.create({
    model: getModel(),
    messages: [
      { role: "system", content: scenarioAnalysisSystemPrompt },
      { role: "user", content: scenarioAnalysisUserPrompt(scenario) },
    ],
  });
  const content = completion.choices[0]?.message.content;

  if (typeof content !== "string" || content.length === 0) {
    throw new Error("Qwen returned an empty response.");
  }

  return parseScenarioAnalysis(content);
}

export async function reanalyzeWithAssumptionChange(
  scenario: string,
  previousAnalysis: ScenarioAnalysis,
  previousAssumption: string,
  updatedAssumption: string,
): Promise<ScenarioAnalysis> {
  const completion = await getClient().chat.completions.create({
    model: getModel(),
    messages: [
      { role: "system", content: assumptionChangeSystemPrompt },
      {
        role: "user",
        content: assumptionChangeUserPrompt(
          scenario,
          previousAnalysis,
          previousAssumption,
          updatedAssumption,
        ),
      },
    ],
  });
  const content = completion.choices[0]?.message.content;

  if (typeof content !== "string" || content.length === 0) {
    throw new Error("Qwen returned an empty response.");
  }

  return parseScenarioAnalysis(content);
}

export async function testQwenConnection(): Promise<void> {
  const completion = await getClient().chat.completions.create({
    model: getModel(),
    messages: [{ role: "user", content: "Reply with OK." }],
    max_tokens: 8,
  });

  if (!completion.choices[0]?.message.content) {
    throw new Error("Qwen returned an empty response.");
  }
}
