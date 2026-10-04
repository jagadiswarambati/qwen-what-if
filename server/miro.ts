import type { ScenarioAnalysis } from "./qwen";
import { formatScenarioSummary } from "./prompts";

const miroApiURL = "https://api.miro.com/v2";

export interface MiroBoard {
  id: string;
  name: string;
}

interface MiroItem {
  id: string;
}

function getMiroConfig(): { accessToken: string; boardId: string } {
  const accessToken = process.env.MIRO_ACCESS_TOKEN;
  const boardId = process.env.MIRO_BOARD_ID;
  if (!accessToken || !boardId) {
    throw new Error("Missing MIRO_ACCESS_TOKEN or MIRO_BOARD_ID.");
  }
  return { accessToken, boardId };
}

async function miroRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const { accessToken } = getMiroConfig();
  const response = await fetch(`${miroApiURL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw Object.assign(
      new Error(`Miro request failed with status ${response.status}.`),
      { status: response.status },
    );
  }

  return (await response.json()) as T;
}

export async function getConfiguredBoard(): Promise<MiroBoard> {
  const { boardId } = getMiroConfig();
  const board = await miroRequest<MiroBoard>(
    `/boards/${encodeURIComponent(boardId)}`,
  );

  if (typeof board.id !== "string" || typeof board.name !== "string") {
    throw new Error("Miro returned board details in an unexpected format.");
  }

  return { id: board.id, name: board.name };
}

export async function testMiroConnection(): Promise<MiroBoard> {
  return getConfiguredBoard();
}

export async function upsertScenarioSummary(
  analysis: ScenarioAnalysis,
  itemId?: string,
): Promise<MiroItem> {
  const { boardId } = getMiroConfig();
  const path = `/boards/${encodeURIComponent(boardId)}/sticky_notes`;
  const body = {
    data: { content: formatScenarioSummary(analysis), shape: "square" },
    position: { x: 0, y: 0 },
  };
  const itemPath = itemId ? `${path}/${encodeURIComponent(itemId)}` : path;
  const item = await miroRequest<MiroItem>(itemPath, {
    method: itemId ? "PATCH" : "POST",
    body: JSON.stringify(body),
  });

  if (typeof item.id !== "string") {
    throw new Error("Miro did not return an item ID.");
  }

  return item;
}
