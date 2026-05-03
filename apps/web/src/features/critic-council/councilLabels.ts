import type { CriticPersonaRole, EvaluationDecision } from "@canonos/contracts";

import type { StatusTone } from "@/components/data-display/StatusPill";

export const criticPersonaRoleLabels: Record<CriticPersonaRole, string> = {
  ruthless_critic: "Ruthless Critic",
  historian: "Historian",
  modern_defender: "Modern Defender",
  anime_specialist: "Anime Specialist",
  literary_editor: "Literary Editor",
  mood_doctor: "Mood Doctor",
  completion_strategist: "Completion Strategist",
  wildcard: "Wildcard",
};

export const councilDecisionLabels: Record<EvaluationDecision, string> = {
  watch_now: "Watch now",
  sample: "Sample first",
  delay: "Delay",
  skip: "Skip",
};

export const councilDecisionTone: Record<EvaluationDecision, StatusTone> = {
  watch_now: "success",
  sample: "active",
  delay: "warning",
  skip: "danger",
};
