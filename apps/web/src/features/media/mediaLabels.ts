import type { ConsumptionStatus, MediaType } from "@canonos/contracts";

export const mediaTypeLabels: Record<MediaType, string> = {
  movie: "Movie",
  tv_show: "TV show",
  anime: "Anime",
  novel: "Novel",
  audiobook: "Audiobook",
};

export const statusLabels: Record<ConsumptionStatus, string> = {
  planned: "Planned",
  consuming: "Consuming",
  completed: "Completed",
  paused: "Paused",
  dropped: "Dropped",
};
