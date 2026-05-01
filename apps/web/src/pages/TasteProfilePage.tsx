import type {
  MediumPreference,
  NegativeTasteSignal,
  TasteProfileInfluentialWork,
  TasteProfileSummary,
  TasteSignal,
} from "@canonos/contracts";
import { RefreshCw, ShieldAlert, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { APP_ROUTES } from "@/app/routeConstants";
import { MediaTypeBadge } from "@/components/data-display/MediaTypeBadge";
import { MetricCard } from "@/components/data-display/MetricCard";
import { ScoreBadge } from "@/components/data-display/ScoreBadge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { PageActionBar } from "@/components/layout/PageActionBar";
import { PageSubtitle, PageTitle } from "@/components/layout/PageText";
import { SectionCard } from "@/components/layout/SectionCard";
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
    <div className="flex flex-col gap-6">
      <section>
        <PageActionBar className="justify-between">
          <div>
            <PageTitle>Taste Profile</PageTitle>
            <PageSubtitle>
              A transparent summary of what your scores and aftertaste logs say you value, avoid, and prefer by medium.
            </PageSubtitle>
          </div>
          <Button className="gap-2" disabled={isValidating} type="button" onClick={() => void mutate()}>
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            {isValidating ? "Refreshing…" : "Refresh Profile"}
          </Button>
        </PageActionBar>
      </section>

      {isLoading ? <LoadingState title="Loading Taste Profile" message="Calculating taste signals from scores and aftertaste entries." /> : null}
      {error ? <ErrorState title="Taste Profile unavailable" message={error.message} onRetry={() => void mutate()} /> : null}
      {!isLoading && !error && data ? <TasteProfileContent profile={data} /> : null}
    </div>
  );
}

function TasteProfileContent({ profile }: { profile: TasteProfileSummary }) {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          helper="Highest average positive dimension."
          label="Strongest Signal"
          value={profile.strongestDimensions[0]?.dimensionName ?? "Needs data"}
        />
        <MetricCard
          helper="Highest negative evidence count."
          label="Biggest Red Flag"
          value={biggestRedFlag(profile.negativeSignals)}
        />
        <MetricCard
          helper="Best average rating by medium."
          label="Strongest Medium"
          value={profile.strongestMediumPreference ? mediaTypeLabels[profile.strongestMediumPreference.mediaType] : "Needs data"}
        />
        <MetricCard
          helper={`${profile.evidenceCounts.scoreCount} scores · ${profile.evidenceCounts.aftertasteCount} aftertaste entries`}
          label="Confidence"
          value={confidenceLabels[profile.confidence]}
        />
      </section>

      {profile.isEmpty ? (
        <EmptyState
          actionLabel="Score Media"
          message="Score a few completed works and add aftertaste reflections to produce useful positive, negative, medium, and fatigue signals."
          title="Taste Profile needs more evidence"
          onAction={() => { window.location.href = APP_ROUTES.library; }}
        />
      ) : null}

      <SectionCard title="Generated summary">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-primary/10 p-2 text-primary">
            <Sparkles aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Current taste read</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{profile.generatedSummary}</p>
          </div>
        </div>
      </SectionCard>

      <section className="grid gap-4 xl:grid-cols-2">
        <SignalListCard
          emptyMessage="Add positive dimension scores to reveal what works."
          icon={<TrendingUp aria-hidden="true" className="h-5 w-5" />}
          signals={profile.strongestDimensions}
          title="Strongest dimensions"
        />
        <SignalListCard
          emptyMessage="Add varied scores to reveal weak or risky areas."
          icon={<TrendingDown aria-hidden="true" className="h-5 w-5" />}
          signals={profile.weakestDimensions}
          title="Weakest dimensions"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <MediumPreferenceCard profile={profile} />
        <NegativeSignalsCard signals={profile.negativeSignals} />
      </section>

      <InfluentialWorksCard works={profile.recentlyInfluentialWorks} />
    </>
  );
}

function SignalListCard({
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
    <SectionCard title={title}>
      <CardHeading icon={icon} title={title} />
      {signals.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {signals.map((signal) => (
            <div className="rounded-xl border border-border bg-background p-4" key={`${title}-${signal.dimensionSlug}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{signal.dimensionName}</h3>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {signal.dimensionDirection === "negative" ? "Negative signal" : "Positive signal"} · {signal.evidenceLabel}
                  </p>
                </div>
                <ScoreBadge score={signal.averageScore} tone={signal.averageScore >= 8 ? "excellent" : "promising"} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{emptyMessage}</p>
      )}
    </SectionCard>
  );
}

function MediumPreferenceCard({ profile }: { profile: TasteProfileSummary }) {
  return (
    <SectionCard title="Medium preference">
      <CardHeading icon={<Sparkles aria-hidden="true" className="h-5 w-5" />} title="Medium preference" />
      <div className="mt-4 grid gap-3">
        {profile.strongestMediumPreference ? (
          <PreferenceCallout label="Strongest" preference={profile.strongestMediumPreference} />
        ) : null}
        {profile.weakestMediumPreference ? (
          <PreferenceCallout label="Weakest" preference={profile.weakestMediumPreference} />
        ) : null}
        {profile.mediumPreferences.length === 0 ? <p className="text-sm text-muted-foreground">Add rated media to calculate medium tendencies.</p> : null}
        {profile.mediumPreferences.map((preference) => (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-3" key={preference.mediaType}>
            <MediaTypeBadge label={mediaTypeLabels[preference.mediaType]} type={preference.mediaType} />
            <p className="text-sm text-muted-foreground">
              {preference.averageRating === null ? "No rating" : `${preference.averageRating.toFixed(1)}/10`} · {preference.mediaCount} item{preference.mediaCount === 1 ? "" : "s"} · {preference.scoreCount} scores
            </p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function PreferenceCallout({ label, preference }: { label: string; preference: MediumPreference }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">{label}</p>
      <p className="mt-1 text-sm font-medium">
        {mediaTypeLabels[preference.mediaType]} · {preference.averageRating?.toFixed(1) ?? "unrated"}/10 average
      </p>
    </div>
  );
}

function NegativeSignalsCard({ signals }: { signals: NegativeTasteSignal[] }) {
  return (
    <SectionCard title="Red flags">
      <CardHeading icon={<ShieldAlert aria-hidden="true" className="h-5 w-5" />} title="Red flags" />
      <div className="mt-4 grid gap-3">
        {signals.map((signal) => (
          <div className="rounded-xl border border-border bg-background p-4" key={signal.slug}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{signal.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{signal.evidenceLabel}</p>
              </div>
              <ScoreBadge score={signal.averageScore ?? undefined} tone={signal.warningCount > 0 ? "risky" : "unknown"} />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function InfluentialWorksCard({ works }: { works: TasteProfileInfluentialWork[] }) {
  return (
    <SectionCard title="Recently influential works">
      <CardHeading icon={<Sparkles aria-hidden="true" className="h-5 w-5" />} title="Recently influential works" />
      {works.length > 0 ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {works.map((work) => (
            <Link
              className="rounded-xl border border-border bg-background p-4 transition hover:border-primary/40 hover:bg-muted/30"
              key={work.id}
              to={APP_ROUTES.mediaDetail.replace(":mediaId", work.id)}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{work.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Updated {new Date(work.updatedAt).toLocaleDateString()}</p>
                </div>
                <MediaTypeBadge label={mediaTypeLabels[work.mediaType]} type={work.mediaType} />
              </div>
              <dl className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <InlineMetric label="Rating" value={work.personalRating === null ? "—" : `${work.personalRating.toFixed(1)}/10`} />
                <InlineMetric label="Stayed" value={work.stayedWithMeScore === null ? "—" : `${work.stayedWithMeScore}/10`} />
                <InlineMetric label="Worth time" value={work.worthTime === null ? "—" : booleanLabel(work.worthTime)} />
                <InlineMetric label="Felt generic" value={work.feltGeneric === null ? "—" : booleanLabel(work.feltGeneric)} />
                <InlineMetric label="Appetite" value={work.appetiteEffect ? appetiteEffectLabels[work.appetiteEffect] : "—"} />
              </dl>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No influential works yet. Score media or add aftertaste reflections.</p>
      )}
    </SectionCard>
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

function CardHeading({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="rounded-xl bg-muted p-2 text-muted-foreground">{icon}</span>
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  );
}

function biggestRedFlag(signals: NegativeTasteSignal[]) {
  const signal = [...signals].sort((a, b) => b.warningCount - a.warningCount)[0];
  if (!signal || signal.warningCount === 0) return "None yet";
  return signal.label.replace(" warning", "");
}
