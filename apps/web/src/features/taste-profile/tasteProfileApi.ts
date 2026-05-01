import type { TasteProfileSummary } from "@canonos/contracts";
import useSWR from "swr";

import { API_ROUTES } from "@/lib/apiRouteConstants";
import { fetcher } from "@/lib/swr";

function normalizeProfile(profile: TasteProfileSummary): TasteProfileSummary {
  return {
    ...profile,
    strongestDimensions: profile.strongestDimensions.map((signal) => ({
      ...signal,
      averageScore: Number(signal.averageScore),
    })),
    weakestDimensions: profile.weakestDimensions.map((signal) => ({
      ...signal,
      averageScore: Number(signal.averageScore),
    })),
    negativeSignals: profile.negativeSignals.map((signal) => ({
      ...signal,
      averageScore: signal.averageScore === null ? null : Number(signal.averageScore),
      warningCount: Number(signal.warningCount),
    })),
    mediumPreferences: profile.mediumPreferences.map((preference) => ({
      ...preference,
      averageRating: preference.averageRating === null ? null : Number(preference.averageRating),
      mediaCount: Number(preference.mediaCount),
      completedCount: Number(preference.completedCount),
      scoreCount: Number(preference.scoreCount),
    })),
    strongestMediumPreference: profile.strongestMediumPreference
      ? {
        ...profile.strongestMediumPreference,
        averageRating: profile.strongestMediumPreference.averageRating === null
          ? null
          : Number(profile.strongestMediumPreference.averageRating),
      }
      : null,
    weakestMediumPreference: profile.weakestMediumPreference
      ? {
        ...profile.weakestMediumPreference,
        averageRating: profile.weakestMediumPreference.averageRating === null
          ? null
          : Number(profile.weakestMediumPreference.averageRating),
      }
      : null,
    recentlyInfluentialWorks: profile.recentlyInfluentialWorks.map((work) => ({
      ...work,
      personalRating: work.personalRating === null ? null : Number(work.personalRating),
      stayedWithMeScore: work.stayedWithMeScore === null ? null : Number(work.stayedWithMeScore),
    })),
  };
}

export function useTasteProfile() {
  return useSWR(API_ROUTES.tasteProfile, async (url: string) => normalizeProfile(await fetcher<TasteProfileSummary>(url)));
}
