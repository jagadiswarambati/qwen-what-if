import type { ScenarioAnalysis } from "./qwen";

export const scenarioAnalysisSystemPrompt = `You are a practical scenario-planning analyst.
Analyze the user's real-world scenario and return only valid JSON (no Markdown or prose outside the JSON) matching this exact shape:
{
  "scenario": "string",
  "variables": ["string"],
  "decisions": ["string"],
  "dependencies": ["string"],
  "risks": ["string"],
  "outcomes": ["string"],
  "recommendation": "string",
  "fragileAssumptions": ["string"]
}
Use concise, specific strings in each array. Preserve the scenario's meaning and currency/units. Do not invent facts; label uncertainty and make fragile assumptions explicit.`;

export function scenarioAnalysisUserPrompt(scenario: string): string {
  return `Analyze this scenario:\n${scenario}`;
}

export function formatScenarioSummary(analysis: ScenarioAnalysis): string {
  const section = (title: string, items: string[]) =>
    `${title}:\n${items.length > 0 ? items.map((item) => `• ${item}`).join("\n") : "None identified"}`;

  return [
    `Scenario\n${analysis.scenario}`,
    section("Variables / assumptions", analysis.variables),
    section("Decisions", analysis.decisions),
    section("Dependencies", analysis.dependencies),
    section("Risks", analysis.risks),
    section("Outcomes", analysis.outcomes),
    `Recommendation:\n${analysis.recommendation}`,
    section("Fragile assumptions", analysis.fragileAssumptions),
  ].join("\n\n");
}
