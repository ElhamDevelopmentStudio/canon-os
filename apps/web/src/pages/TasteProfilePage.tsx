import type {
  MediumPreference,
  NegativeTasteSignal,
  TasteProfileInfluentialWork,
  TasteProfileSummary,
  TasteSignal,
} from "@canonos/contracts";
import { BarChart3, RefreshCw, ShieldAlert, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { APP_ROUTES } from "@/app/routeConstants";
import { MediaTypeBadge } from "@/components/data-display/MediaTypeBadge";
import { ScoreBadge } from "@/components/data-display/ScoreBadge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/button";
import { appetiteEffectLabels, booleanLabel } from "@/features/aftertaste/aftertasteLabels";
import { mediaTypeLabels } from "@/features/media/mediaLabels";
import { useTasteProfile } from "@/features/taste-profile/tasteProfileApi";

const confidenceLabels: Record<TasteProfileSummary["confidence"], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function TasteProfilePage() {
  const { data, error, isLoading, isValidating, mutate } = useTasteProfile();

  return (
    <div className="grid gap-6">
      <section className="border-b border-border pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Taste desk</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">Taste Profile</h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              A transparent read of what your scores and aftertaste logs say you value, avoid, and prefer by medium.
            </p>
          </div>
          <Button className="gap-2" disabled={isValidating} type="button" onClick={() => void mutate()}>
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            {isValidating ? "Refreshing..." : "Refresh Profile"}
          </Button>
        </div>
      </section>

      {isLoading ? <LoadingState title="Loading Taste Profile" message="Calculating taste signals from scores and aftertaste entries." /> : null}
      {error ? <ErrorState title="Taste Profile unavailable" message={error.message} onRetry={() => void mutate()} /> : null}
      {!isLoading && !error && data ? <TasteProfileContent profile={data} /> : null}
    </div>
  );
}

function TasteProfileContent({ profile }: { profile: TasteProfileSummary }) {
  return (
    <div className="grid gap-6">
      <TasteSignalStrip profile={profile} />

      {profile.isEmpty ? (
        <EmptyState
          actionLabel="Score Media"
          message="Score a few completed works and add aftertaste reflections to produce useful positive, negative, medium, and fatigue signals."
          title="Taste Profile needs more evidence"
          onAction={() => { window.location.href = APP_ROUTES.library; }}
        />
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[minmax(28rem,0.95fr)_minmax(32rem,1.05fr)]">
        <div className="grid content-start gap-7 xl:border-r xl:border-border xl:pr-8">
          <TasteSummaryPanel profile={profile} />
          <SignalListPanel
            emptyMessage="Add positive dimension scores to reveal what works."
            icon={<TrendingUp aria-hidden="true" className="h-5 w-5" />}
            signals={profile.strongestDimensions}
            title="Strongest dimensions"
          />
          <SignalListPanel
            emptyMessage="Add varied scores to reveal weak or risky areas."
            icon={<TrendingDown aria-hidden="true" className="h-5 w-5" />}
            signals={profile.weakestDimensions}
            title="Weakest dimensions"
          />
        </div>

        <div className="grid content-start gap-7">
          <MediumPreferencePanel profile={profile} />
          <NegativeSignalsPanel signals={profile.negativeSignals} />
          <InfluentialWorksPanel works={profile.recentlyInfluentialWorks} />
        </div>
      </div>
    </div>
  );
}

function TasteSignalStrip({ profile }: { profile: TasteProfileSummary }) {
  const strongestMedium = profile.strongestMediumPreference
    ? mediaTypeLabels[profile.strongestMediumPreference.mediaType]
    : "Needs data";

  return (
    <section aria-label="Taste signals" className="grid gap-3 border-b border-border pb-6 md:grid-cols-4">
      <SignalStat
        helper="Highest positive dimension average."
        icon={<TrendingUp aria-hidden="true" className="h-4 w-4" />}
        label="Strongest signal"
        value={profile.strongestDimensions[0]?.dimensionName ?? "Needs data"}
      />
      <SignalStat
        helper="Most repeated negative evidence."
        icon={<ShieldAlert aria-hidden="true" className="h-4 w-4" />}
        label="Biggest red flag"
        value={biggestRedFlag(profile.negativeSignals)}
      />
      <SignalStat
        helper="Best average rating by medium."
        icon={<Sparkles aria-hidden="true" className="h-4 w-4" />}
        label="Strongest medium"
        value={strongestMedium}
      />
      <SignalStat
        helper={`${profile.evidenceCounts.scoreCount} scores / ${profile.evidenceCounts.aftertasteCount} aftertaste entries`}
        icon={<BarChart3 aria-hidden="true" className="h-4 w-4" />}
        label="Confidence"
        value={confidenceLabels[profile.confidence]}
      />
    </section>
  );
}

function SignalStat({ helper, icon, label, value }: { helper: string; icon: ReactNode; label: string; value: string }) {
  return (
    <div className="border-l border-border pl-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
    </div>
  );
}

function TasteSummaryPanel({ profile }: { profile: TasteProfileSummary }) {
  return (
    <section aria-label="Taste summary">
      <PanelHeading icon={<Sparkles aria-hidden="true" className="h-5 w-5" />} kicker="Generated summary" title="Current taste read" />
      <p className="mt-4 border-l-2 border-primary pl-4 text-base leading-8 text-foreground">{profile.generatedSummary}</p>
      <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 border-y border-border py-4 text-sm sm:grid-cols-4">
        <InlineMetric label="Media" value={String(profile.evidenceCounts.mediaCount)} />
        <InlineMetric label="Scored" value={String(profile.evidenceCounts.scoredMediaCount)} />
        <InlineMetric label="Scores" value={String(profile.evidenceCounts.scoreCount)} />
        <InlineMetric label="Aftertaste" value={String(profile.evidenceCounts.aftertasteCount)} />
      </dl>
    </section>
  );
}

function SignalListPanel({
  emptyMessage,
  icon,
  signals,
  title,
}: {
  emptyMessage: string;
  icon: ReactNode;
  signals: TasteSignal[];
  title: string;
}) {
  return (
    <section aria-label={title}>
      <PanelHeading icon={icon} title={title} />
      {signals.length > 0 ? (
        <div className="mt-4 divide-y divide-border border-y border-border">
          {signals.map((signal) => (
            <div className="flex flex-wrap items-center justify-between gap-4 py-4" key={`${title}-${signal.dimensionSlug}`}>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground">{signal.dimensionName}</h3>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {signal.dimensionDirection === "negative" ? "Negative signal" : "Positive signal"} / {signal.evidenceLabel}
                </p>
              </div>
              <ScoreBadge score={signal.averageScore} tone={signal.averageScore >= 8 ? "excellent" : "promising"} />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 border-y border-border py-4 text-sm text-muted-foreground">{emptyMessage}</p>
      )}
    </section>
  );
}

function MediumPreferencePanel({ profile }: { profile: TasteProfileSummary }) {
  return (
    <section aria-label="Medium preferences">
      <PanelHeading icon={<Sparkles aria-hidden="true" className="h-5 w-5" />} title="Medium preference" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {profile.strongestMediumPreference ? (
          <PreferenceHighlight label="Strongest" preference={profile.strongestMediumPreference} />
        ) : null}
        {profile.weakestMediumPreference ? (
          <PreferenceHighlight label="Weakest" preference={profile.weakestMediumPreference} />
        ) : null}
      </div>
      {profile.mediumPreferences.length === 0 ? (
        <p className="mt-3 border-y border-border py-4 text-sm text-muted-foreground">Add rated media to calculate medium tendencies.</p>
      ) : (
        <div className="mt-4 divide-y divide-border border-y border-border">
          {profile.mediumPreferences.map((preference) => (
            <div className="flex flex-wrap items-center justify-between gap-3 py-3" key={preference.mediaType}>
              <MediaTypeBadge label={mediaTypeLabels[preference.mediaType]} type={preference.mediaType} />
              <p className="text-sm text-muted-foreground">
                {formatAverage(preference.averageRating)} / {preference.mediaCount} item{preference.mediaCount === 1 ? "" : "s"} / {preference.scoreCount} scores
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PreferenceHighlight({ label, preference }: { label: string; preference: MediumPreference }) {
  return (
    <div className="border-l-2 border-primary pl-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{label}</p>
      <p className="mt-1 text-base font-semibold text-foreground">{mediaTypeLabels[preference.mediaType]}</p>
      <p className="mt-1 text-sm text-muted-foreground">{formatAverage(preference.averageRating)} average</p>
    </div>
  );
}

function NegativeSignalsPanel({ signals }: { signals: NegativeTasteSignal[] }) {
  return (
    <section aria-label="Taste red flags">
      <PanelHeading icon={<ShieldAlert aria-hidden="true" className="h-5 w-5" />} title="Red flags" />
      {signals.length > 0 ? (
        <div className="mt-4 divide-y divide-border border-y border-border">
          {signals.map((signal) => (
            <div className="flex items-start justify-between gap-4 py-4" key={signal.slug}>
              <div>
                <h3 className="font-semibold text-foreground">{signal.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{signal.evidenceLabel}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {signal.warningCount} warning{signal.warningCount === 1 ? "" : "s"}
                </p>
              </div>
              <ScoreBadge score={signal.averageScore ?? undefined} tone={signal.warningCount > 0 ? "risky" : "unknown"} />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 border-y border-border py-4 text-sm text-muted-foreground">No recurring genericness or regret warnings yet.</p>
      )}
    </section>
  );
}

function InfluentialWorksPanel({ works }: { works: TasteProfileInfluentialWork[] }) {
  return (
    <section aria-label="Influential works">
      <PanelHeading icon={<Sparkles aria-hidden="true" className="h-5 w-5" />} title="Recently influential works" />
      {works.length > 0 ? (
        <div className="mt-4 divide-y divide-border border-y border-border">
          {works.map((work) => (
            <Link
              className="block py-4 transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              key={work.id}
              to={APP_ROUTES.mediaDetail.replace(":mediaId", work.id)}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-foreground">{work.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Updated {new Date(work.updatedAt).toLocaleDateString()}</p>
                </div>
                <MediaTypeBadge label={mediaTypeLabels[work.mediaType]} type={work.mediaType} />
              </div>
              <dl className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <InlineMetric label="Rating" value={work.personalRating === null ? "-" : `${work.personalRating.toFixed(1)}/10`} />
                <InlineMetric label="Stayed" value={work.stayedWithMeScore === null ? "-" : `${work.stayedWithMeScore}/10`} />
                <InlineMetric label="Worth time" value={work.worthTime === null ? "-" : booleanLabel(work.worthTime)} />
                <InlineMetric label="Felt generic" value={work.feltGeneric === null ? "-" : booleanLabel(work.feltGeneric)} />
                <InlineMetric label="Appetite" value={work.appetiteEffect ? appetiteEffectLabels[work.appetiteEffect] : "-"} />
              </dl>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-3 border-y border-border py-4 text-sm text-muted-foreground">No influential works yet. Score media or add aftertaste reflections.</p>
      )}
    </section>
  );
}

function InlineMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="inline font-semibold text-foreground">{label}: </dt>
      <dd className="inline">{value}</dd>
    </div>
  );
}

function PanelHeading({ icon, kicker, title }: { icon: ReactNode; kicker?: string; title: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-primary">{icon}</span>
      <div>
        {kicker ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{kicker}</p> : null}
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      </div>
    </div>
  );
}

function formatAverage(value: number | null) {
  return value === null ? "Unrated" : `${value.toFixed(1)}/10`;
}

function biggestRedFlag(signals: NegativeTasteSignal[]) {
  const signal = [...signals].sort((a, b) => b.warningCount - a.warningCount)[0];
  if (!signal || signal.warningCount === 0) return "None yet";
  return signal.label.replace(" warning", "");
}
