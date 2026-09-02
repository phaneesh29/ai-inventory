import { ToolLoopAgent } from "ai";
import { mistral } from "@ai-sdk/mistral";
import { ALTERNATIVE_MATCHER_INSTRUCTIONS } from "./alternativeMatcher.instructions.js";
import { createAlternativeMatcherTools } from "./alternativeMatcher.tools.js";

export interface DeficitItemInput {
  itemId: string;
  partNumber: string;
  name: string;
  category: string;
  deficitQuantity: number;
  specifications?: Record<string, any>;
}

export interface RunAlternativeMatcherParams {
  deficitItems: DeficitItemInput[];
}

export interface SubstitutionRecommendation {
  tier: "TIER_1_DROP_IN" | "TIER_2_PARAMETRIC_UPGRADE" | "TIER_3_CIRCUIT_COMBINATION";
  title: string;
  confidenceScore: number;
  candidateItems: {
    itemId: string;
    partNumber: string;
    name: string;
    category: string;
    quantityAvailable: number;
    location: string;
    unitCost: number | null;
  }[];
  circuitTopology?: "SERIES" | "PARALLEL" | "SINGLE";
  effectiveCalculatedValue?: string;
  engineeringNotes: string;
  riskLevel: "NONE" | "LOW" | "MEDIUM";
}

export interface ItemAlternativeMatch {
  itemId: string;
  partNumber: string;
  name: string;
  category: string;
  deficitQuantity: number;
  hasMatches: boolean;
  recommendations: SubstitutionRecommendation[];
}

export interface AlternativeMatchResult {
  totalDeficitItemsAudited: number;
  itemsWithViableAlternatives: number;
  matches: ItemAlternativeMatch[];
  agentSummary: string;
}

export const runAlternativeMatcherAgent = async (
  params: RunAlternativeMatcherParams
): Promise<AlternativeMatchResult> => {
  if (params.deficitItems.length === 0) {
    return {
      totalDeficitItemsAudited: 0,
      itemsWithViableAlternatives: 0,
      matches: [],
      agentSummary: "No deficit items required alternative matching.",
    };
  }

  const { tools, getCachedData } = createAlternativeMatcherTools();

  const agent = new ToolLoopAgent({
    model: mistral("mistral-large-latest"),
    instructions: ALTERNATIVE_MATCHER_INSTRUCTIONS,
    tools,
  });

  const promptItemsSummary = params.deficitItems
    .map(
      (d) =>
        `- Part: ${d.partNumber} (${d.name}) | Category: ${d.category} | Deficit: ${d.deficitQuantity} | Specs: ${JSON.stringify(d.specifications || {})}`
    )
    .join("\n");

  const agentResponse = await agent.generate({
    prompt: `Analyze the following shortage/deficit components and find warehouse in-stock alternatives or circuit combinations:

${promptItemsSummary}

1. For each deficit item, search warehouse inventory with 'searchWarehouseInventory' using its category.
2. For any resistor or capacitor deficit, calculate series or parallel combinations with 'computeCircuitCombinations'.
3. Rank viable options into Tier 1 (Drop-In), Tier 2 (Parametric Upgrade), and Tier 3 (Circuit Combination).`,
  });

  const { candidates, combinations } = getCachedData();
  const matches: ItemAlternativeMatch[] = [];

  for (const item of params.deficitItems) {
    const itemRecommendations: SubstitutionRecommendation[] = [];
    const itemCategoryCandidates = candidates.filter(
      (c) => c.category.toLowerCase() === item.category.toLowerCase() && c.itemId !== item.itemId
    );

    for (const c of itemCategoryCandidates) {
      const targetFootprint = item.specifications?.packageFootprint;
      const candidateFootprint = c.specifications?.packageFootprint;
      const sameFootprint = targetFootprint && candidateFootprint && targetFootprint === candidateFootprint;

      if (sameFootprint) {
        itemRecommendations.push({
          tier: "TIER_1_DROP_IN",
          title: `Direct Drop-in: ${c.partNumber} (${c.name})`,
          confidenceScore: 98,
          candidateItems: [c],
          circuitTopology: "SINGLE",
          engineeringNotes: `Identical package (${targetFootprint}). In-stock at ${c.location} (${c.quantityAvailable} available).`,
          riskLevel: "NONE",
        });
      } else {
        itemRecommendations.push({
          tier: "TIER_2_PARAMETRIC_UPGRADE",
          title: `Parametric Alternative: ${c.partNumber}`,
          confidenceScore: 88,
          candidateItems: [c],
          circuitTopology: "SINGLE",
          engineeringNotes: `Functional in-stock alternative in category ${c.category}. Verify footprint/pinout before assembly.`,
          riskLevel: "LOW",
        });
      }
    }

    if (item.category === "Resistor" || item.category === "Capacitor") {
      for (const comb of combinations) {
        itemRecommendations.push({
          tier: "TIER_3_CIRCUIT_COMBINATION",
          title: `${comb.topology} Combination: ${comb.componentA.partNumber} + ${comb.componentB.partNumber}`,
          confidenceScore: 82,
          candidateItems: [
            {
              itemId: comb.componentA.itemId,
              partNumber: comb.componentA.partNumber,
              name: comb.componentA.name,
              category: item.category,
              quantityAvailable: comb.componentA.quantityAvailable,
              location: comb.componentA.location,
              unitCost: null,
            },
            {
              itemId: comb.componentB.itemId,
              partNumber: comb.componentB.partNumber,
              name: comb.componentB.name,
              category: item.category,
              quantityAvailable: comb.componentB.quantityAvailable,
              location: comb.componentB.location,
              unitCost: null,
            },
          ],
          circuitTopology: comb.topology,
          effectiveCalculatedValue: `${comb.effectiveCalculatedValue} ${comb.unit} (Target: ${comb.targetValue}, Error: ${comb.percentageError}%)`,
          engineeringNotes: `Synthesize equivalent target value using ${comb.topology.toLowerCase()} combination from warehouse stock.`,
          riskLevel: "MEDIUM",
        });
      }
    }

    matches.push({
      itemId: item.itemId,
      partNumber: item.partNumber,
      name: item.name,
      category: item.category,
      deficitQuantity: item.deficitQuantity,
      hasMatches: itemRecommendations.length > 0,
      recommendations: itemRecommendations.slice(0, 5),
    });
  }

  const itemsWithViable = matches.filter((m) => m.hasMatches).length;

  return {
    totalDeficitItemsAudited: params.deficitItems.length,
    itemsWithViableAlternatives: itemsWithViable,
    matches,
    agentSummary: agentResponse.text || "Alternative matcher audit completed.",
  };
};
