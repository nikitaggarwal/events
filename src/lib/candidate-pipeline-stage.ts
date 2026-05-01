/** Shared rules for ops pipeline tiles and candidate filters (must match API + UI). */

export type PipelineStage =
  | "contacted"
  | "rsvp"
  | "attended"
  | "starred"
  | "spoke"
  | "followUp"
  | "interviewed"
  | "offered"
  | "hired";

export interface CandidatePipelineFlags {
  inviteStatus: string;
  founderInteraction: {
    contacted: boolean;
    rsvp: boolean;
    attended: boolean;
    starred: boolean;
    spoke: boolean;
    followUp: boolean;
    interviewed: boolean;
    offered: boolean;
    hired: boolean;
  } | null;
}

export function candidateMatchesPipelineStage(
  c: CandidatePipelineFlags,
  stage: PipelineStage
): boolean {
  const f = c.founderInteraction;
  const inv = c.inviteStatus;
  switch (stage) {
    case "contacted":
      return (
        f?.contacted === true ||
        inv === "contacted" ||
        inv === "rsvp" ||
        inv === "attended"
      );
    case "rsvp":
      return f?.rsvp === true || inv === "rsvp" || inv === "attended";
    case "attended":
      return f?.attended === true || inv === "attended";
    case "starred":
      return f?.starred === true;
    case "spoke":
      return f?.spoke === true;
    case "followUp":
      return f?.followUp === true;
    case "interviewed":
      return f?.interviewed === true;
    case "offered":
      return f?.offered === true;
    case "hired":
      return f?.hired === true;
    default:
      return false;
  }
}

const PIPELINE_STAGES: PipelineStage[] = [
  "contacted",
  "rsvp",
  "attended",
  "starred",
  "spoke",
  "followUp",
  "interviewed",
  "offered",
  "hired",
];

export function pipelineInteractionStatsFromCandidates(
  candidates: CandidatePipelineFlags[]
): Record<PipelineStage, number> {
  const out = {} as Record<PipelineStage, number>;
  for (const stage of PIPELINE_STAGES) {
    out[stage] = candidates.filter((c) => candidateMatchesPipelineStage(c, stage)).length;
  }
  return out;
}
