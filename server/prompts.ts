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

export const assumptionChangeSystemPrompt = `You are a practical scenario-planning analyst specializing in delta analysis.
You will be given:
1. An original scenario description
2. The original analysis (as JSON)
3. A single assumption that has changed (previous value -> updated value)

Your task is to reason specifically about the DELTA -- what changes because of this one assumption shift.
Do NOT generate an unrelated new analysis. Focus on:
1. How does this assumption change affect the existing decisions?
2. Which dependencies become more or less critical?
3. Which risks increase or decrease in severity?
4. Which outcomes shift?
5. Does the overall recommendation change?
6. Are there new fragile assumptions introduced by this change?

Return only valid JSON (no Markdown or prose outside the JSON) matching this exact shape:
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
Preserve currency/units. Reflect the updated assumption in the scenario field. Be specific about what changed vs. what stayed the same.`;

export function assumptionChangeUserPrompt(
  scenario: string,
  previousAnalysis: ScenarioAnalysis,
  previousAssumption: string,
  updatedAssumption: string,
): string {
  return `Original scenario: ${scenario}

Original analysis:
${JSON.stringify(previousAnalysis, null, 2)}

Assumption changed:
BEFORE: ${previousAssumption}
AFTER:  ${updatedAssumption}

Re-analyze the scenario focusing on what this single assumption change means for decisions, risks, outcomes, and the recommendation.`;
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
