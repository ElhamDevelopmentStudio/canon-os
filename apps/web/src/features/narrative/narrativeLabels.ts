import type { NarrativeAnalysisStatus, NarrativeSourceBasis, NarrativeTraitKey } from "@canonos/contracts";

export const narrativeTraitLabels: Record<NarrativeTraitKey, string> = {
  character_complexity: "Character complexity",
  plot_complexity: "Plot complexity",
  pacing_density: "Pacing density",
  thematic_weight: "Thematic weight",
  moral_ambiguity: "Moral ambiguity",
  atmosphere: "Atmosphere",
  ending_dependency: "Ending dependency",
  trope_freshness: "Trope freshness",
};

export const narrativeStatusLabels: Record<NarrativeAnalysisStatus, string> = {
  queued: "Queued",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
};

export const narrativeStatusTone: Record<NarrativeAnalysisStatus, "neutral" | "active" | "success" | "danger"> = {
  queued: "neutral",
  running: "active",
  completed: "success",
  failed: "danger",
};

export const narrativeSourceBasisLabels: Record<NarrativeSourceBasis, string> = {
  user_notes: "User notes",
  metadata: "Metadata only",
  manual_analysis: "Manual analysis notes",
  mixed_notes_metadata: "User notes + metadata",
  manual_correction: "Manual correction",
};
