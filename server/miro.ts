import type { ScenarioAnalysis } from "./qwen";

const miroApiURL = "https://api.miro.com/v2";
const mapColumnX = 0;
const mapStartY = -700;
const mapStageSpacing = 280;
const maxItemsPerSection = 4;
const maxTextLength = 105;

export interface MiroBoard {
  id: string;
  name: string;
}

interface MiroItem {
  id: string;
  type?: string;
  data?: { content?: string };
  startItem?: { id: string };
  endItem?: { id: string };
}

interface MiroItemsResponse {
  data: MiroItem[];
  links?: { next?: string | null };
}

export interface ScenarioMapResult {
  boardId: string;
  itemIds: string[];
  created: number;
  updated: number;
  removed: number;
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

  if (response.status === 204) {
    return undefined as T;
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

function trimText(text: string, maxLength = maxTextLength): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function formatBullets(items: string[]): string {
  if (items.length === 0) return "• None identified";
  return items
    .slice(0, maxItemsPerSection)
    .map((item) => `• ${trimText(item)}`)
    .join("\n");
}

function createScenarioMapCards(analysis: ScenarioAnalysis) {
  const assumptions = [
    ...analysis.variables,
    ...analysis.fragileAssumptions,
  ].filter((item, index, items) => items.indexOf(item) === index);

  return [
    {
      key: "scenario",
      title: "SCENARIO",
      content: trimText(analysis.scenario, 280),
    },
    {
      key: "assumptions",
      title: "ASSUMPTIONS / VARIABLES",
      content: formatBullets(assumptions),
    },
    {
      key: "decisions",
      title: "DECISIONS",
      content: formatBullets(analysis.decisions),
    },
    {
      key: "dependencies-risks",
      title: "DEPENDENCIES + RISKS",
      content: [
        "Dependencies",
        formatBullets(analysis.dependencies),
        "Risks",
        formatBullets(analysis.risks),
      ].join("\n"),
    },
    {
      key: "outcomes",
      title: "OUTCOMES",
      content: formatBullets(analysis.outcomes),
    },
    {
      key: "recommendation",
      title: "RECOMMENDATION",
      content: trimText(analysis.recommendation, 280),
    },
  ].map((card, index) => ({
    ...card,
    marker: `QWEN WHAT-IF MAP · ${card.key.toUpperCase()}`,
    content: `${card.title}\n${card.content}`,
    position: { x: mapColumnX, y: mapStartY + index * mapStageSpacing },
  }));
}

async function listBoardCollection(
  collection: "items" | "connectors",
): Promise<MiroItem[]> {
  const { boardId } = getMiroConfig();
  const query = new URLSearchParams({ limit: "50" });
  let nextURL: string | undefined =
    `${miroApiURL}/boards/${encodeURIComponent(boardId)}/${collection}?${query}`;
  const miroOrigin = new URL(miroApiURL).origin;
  const items: MiroItem[] = [];

  while (nextURL) {
    const url: URL = new URL(nextURL);
    if (url.origin !== miroOrigin) {
      throw new Error("Miro returned an unexpected pagination URL.");
    }
    const page: MiroItemsResponse = await miroRequest<MiroItemsResponse>(
      `${url.pathname.replace(/^\/v2(?=\/)/, "")}${url.search}`,
    );
    if (!Array.isArray(page.data)) {
      throw new Error(`Miro returned board ${collection} in an unexpected format.`);
    }
    items.push(...page.data);
    nextURL = page.links?.next ?? undefined;
  }

  return items;
}

function cardMarker(item: MiroItem): string | undefined {
  if (typeof item.data?.content !== "string") return undefined;
  return item.data.content.match(
    /QWEN WHAT-IF MAP · (SCENARIO|ASSUMPTIONS|DECISIONS|DEPENDENCIES-RISKS|OUTCOMES|RECOMMENDATION)/,
  )?.[0];
}

async function deleteBoardItem(
  boardId: string,
  itemType: "sticky_notes" | "connectors",
  itemId: string,
): Promise<void> {
  await miroRequest<void>(
    `/boards/${encodeURIComponent(boardId)}/${itemType}/${encodeURIComponent(itemId)}`,
    { method: "DELETE" },
  );
}

async function saveCard(
  card: ReturnType<typeof createScenarioMapCards>[number],
  existingItem: MiroItem | undefined,
): Promise<{ item: MiroItem; created: boolean }> {
  const { boardId } = getMiroConfig();
  const collectionPath = `/boards/${encodeURIComponent(boardId)}/sticky_notes`;
  const itemPath = existingItem
    ? `${collectionPath}/${encodeURIComponent(existingItem.id)}`
    : collectionPath;
  const item = await miroRequest<MiroItem>(itemPath, {
    method: existingItem ? "PATCH" : "POST",
    body: JSON.stringify({
      data: { content: `${card.marker}\n${card.content}`, shape: "square" },
      position: card.position,
    }),
  });

  if (typeof item.id !== "string") {
    throw new Error("Miro did not return a sticky note ID.");
  }

  return { item, created: !existingItem };
}

async function saveConnector(
  startItemId: string,
  endItemId: string,
  existingConnector: MiroItem | undefined,
): Promise<{ item: MiroItem; created: boolean }> {
  const { boardId } = getMiroConfig();
  const collectionPath = `/boards/${encodeURIComponent(boardId)}/connectors`;
  const itemPath = existingConnector
    ? `${collectionPath}/${encodeURIComponent(existingConnector.id)}`
    : collectionPath;
  const item = await miroRequest<MiroItem>(itemPath, {
    method: existingConnector ? "PATCH" : "POST",
    body: JSON.stringify({
      startItem: { id: startItemId },
      endItem: { id: endItemId },
      style: {
        endStrokeCap: "stealth",
        strokeColor: "#475569",
        strokeWidth: "2.0",
      },
    }),
  });

  if (typeof item.id !== "string") {
    throw new Error("Miro did not return a connector ID.");
  }

  return { item, created: !existingConnector };
}

export async function upsertScenarioMap(
  analysis: ScenarioAnalysis,
): Promise<ScenarioMapResult> {
  const { boardId } = getMiroConfig();
  const [boardItems, boardConnectors] = await Promise.all([
    listBoardCollection("items"),
    listBoardCollection("connectors"),
  ]);
  const cardItems = new Map<string, MiroItem>();
  const duplicateCards: MiroItem[] = [];
  const connectorItems = new Map<string, MiroItem[]>();

  for (const item of boardItems) {
    const marker = cardMarker(item);
    if (marker) {
      if (cardItems.has(marker)) duplicateCards.push(item);
      else cardItems.set(marker, item);
    }
  }

  for (const item of boardConnectors) {
    if (!item.startItem || !item.endItem) continue;
    const key = `${item.startItem.id}:${item.endItem.id}`;
    const matches = connectorItems.get(key) ?? [];
    matches.push(item);
    connectorItems.set(key, matches);
  }

  for (const duplicate of duplicateCards) {
    await deleteBoardItem(boardId, "sticky_notes", duplicate.id);
  }

  const cards = createScenarioMapCards(analysis);
  const savedCards: MiroItem[] = [];
  let created = 0;
  let updated = 0;
  let removed = duplicateCards.length;

  for (const card of cards) {
    const result = await saveCard(card, cardItems.get(card.marker));
    savedCards.push(result.item);
    if (result.created) created += 1;
    else updated += 1;
  }

  const savedConnectors: MiroItem[] = [];
  const expectedConnectorKeys = new Set(
    savedCards.slice(0, -1).map(
      (item, index) => `${item.id}:${savedCards[index + 1].id}`,
    ),
  );
  const reusableConnectors = new Map<string, MiroItem>();
  for (const [key, matches] of connectorItems) {
    if (!expectedConnectorKeys.has(key)) {
      for (const connector of matches) {
        await deleteBoardItem(boardId, "connectors", connector.id);
        removed += 1;
      }
      continue;
    }

    reusableConnectors.set(key, matches[0]);
    for (const duplicate of matches.slice(1)) {
      await deleteBoardItem(boardId, "connectors", duplicate.id);
      removed += 1;
    }
  }

  for (let index = 0; index < savedCards.length - 1; index += 1) {
    const startItemId = savedCards[index].id;
    const endItemId = savedCards[index + 1].id;
    const result = await saveConnector(
      startItemId,
      endItemId,
      reusableConnectors.get(`${startItemId}:${endItemId}`),
    );
    savedConnectors.push(result.item);
    if (result.created) created += 1;
    else updated += 1;
  }

  return {
    boardId,
    itemIds: [...savedCards, ...savedConnectors].map((item) => item.id),
    created,
    updated,
    removed,
  };
}
