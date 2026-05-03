import {
  DESIRED_EFFECTS,
  ENERGY_LEVELS,
  EXPORT_FORMATS,
  FOCUS_LEVELS,
  IMPORT_SOURCE_TYPES,
  MEDIA_TYPES,
  RECOMMENDATION_FORMULA_WEIGHT_KEYS,
  RISK_TOLERANCES,
  THEME_PREFERENCES,
  type AntiGenericRule,
  type DesiredEffect,
  type EnergyLevel,
  type ExportFormat,
  type ExportRestoreDryRunResult,
  type ExportResult,
  type FocusLevel,
  type ImportBatch,
  type ImportSourceType,
  type MediaType,
  type NotificationPreferences,
  type RecommendationFormulaWeightKey,
  type RecommendationFormulaWeights,
  type RiskTolerance,
  type ThemePreference,
  type UserSettings,
  type UserSettingsUpdateRequest,
} from "@canonos/contracts";
import { Download, FileUp, RotateCcw, Save, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSWR, { useSWRConfig } from "swr";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useToast } from "@/components/feedback/toastContext";
import { PageSubtitle, PageTitle } from "@/components/layout/PageText";
import { SectionCard } from "@/components/layout/SectionCard";
import { DestructiveActionButton } from "@/components/ui/DestructiveActionButton";
import { Button } from "@/components/ui/button";
import { resetAntiGenericRules, updateAntiGenericRule, useAntiGenericRules } from "@/features/anti-generic-filter/antiGenericApi";
import {
  confirmImportBatch,
  downloadExportText,
  dryRunExportRestore,
  previewImportFile,
  requestExport,
  rollbackImportBatch,
  useExportJobs,
  useImportBatches,
} from "@/features/portability/portabilityApi";
import {
  exportFormatLabels,
  exportStatusLabels,
  importBatchStatusLabels,
  importSourceTypeLabels,
  importStatusLabels,
} from "@/features/portability/portabilityLabels";
import {
  deleteAccount,
  deleteAllCanonOSData,
  getPersonalDataSummary,
  updateUserSettings,
  useUserSettings,
} from "@/features/settings/settingsApi";
import {
  recommendationFormulaWeightHelp,
  recommendationFormulaWeightLabels,
  riskToleranceLabels,
  settingsMediaTypeLabels,
  themePreferenceLabels,
} from "@/features/settings/settingsLabels";
import {
  desiredEffectLabels,
  energyLevelLabels,
  focusLevelLabels,
} from "@/features/tonight-mode/tonightLabels";
import { API_ROUTES } from "@/lib/apiRouteConstants";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";

type SettingsDraft = {
  displayName: string;
  timezone: string;
  preferredLanguage: string;
  themePreference: ThemePreference;
  defaultMediaTypes: MediaType[];
  defaultRiskTolerance: RiskTolerance;
  modernMediaSkepticismLevel: string;
  genericnessSensitivity: string;
  preferredScoringStrictness: string;
  recommendationFormulaWeights: Record<RecommendationFormulaWeightKey, string>;
  defaultTonightAvailableMinutes: string;
  defaultTonightEnergyLevel: EnergyLevel;
  defaultTonightFocusLevel: FocusLevel;
  defaultTonightDesiredEffect: DesiredEffect;
  preferredRecommendationStrictness: string;
  allowModernExceptions: boolean;
  burnoutSensitivity: string;
  completionDetoxStrictness: string;
  notificationPreferences: NotificationPreferences;
};

const recommendedRecommendationDefaults = {
  defaultMediaTypes: ["movie", "anime", "novel", "audiobook"] as MediaType[],
  defaultRiskTolerance: "medium" as RiskTolerance,
  modernMediaSkepticismLevel: "5",
  genericnessSensitivity: "6",
  preferredScoringStrictness: "5",
  recommendationFormulaWeights: {
    personalFit: "30",
    moodFit: "20",
    qualitySignal: "20",
    genericnessPenalty: "15",
    regretRiskPenalty: "10",
    commitmentCostPenalty: "5",
  } satisfies Record<RecommendationFormulaWeightKey, string>,
  defaultTonightAvailableMinutes: "90",
  defaultTonightEnergyLevel: "medium" as EnergyLevel,
  defaultTonightFocusLevel: "medium" as FocusLevel,
  defaultTonightDesiredEffect: "quality" as DesiredEffect,
  preferredRecommendationStrictness: "5",
  allowModernExceptions: true,
  burnoutSensitivity: "5",
  completionDetoxStrictness: "5",
  notificationPreferences: {
    browserNotifications: false,
    emailDigest: false,
    recommendationReminders: true,
    completionDetoxReminders: true,
  },
};

function formulaWeightsToDraft(
  weights: RecommendationFormulaWeights,
): Record<RecommendationFormulaWeightKey, string> {
  return Object.fromEntries(
    RECOMMENDATION_FORMULA_WEIGHT_KEYS.map((key) => [key, String(weights[key])]),
  ) as Record<RecommendationFormulaWeightKey, string>;
}

function formulaWeightsToRequest(
  weights: Record<RecommendationFormulaWeightKey, string>,
): RecommendationFormulaWeights {
  return Object.fromEntries(
    RECOMMENDATION_FORMULA_WEIGHT_KEYS.map((key) => [key, Number(weights[key])]),
  ) as RecommendationFormulaWeights;
}

function settingsToDraft(settings: UserSettings): SettingsDraft {
  return {
    displayName: settings.profile.displayName,
    timezone: settings.profile.timezone,
    preferredLanguage: settings.profile.preferredLanguage,
    themePreference: settings.display.themePreference,
    defaultMediaTypes: settings.recommendation.defaultMediaTypes,
    defaultRiskTolerance: settings.recommendation.defaultRiskTolerance,
    modernMediaSkepticismLevel: String(settings.recommendation.modernMediaSkepticismLevel),
    genericnessSensitivity: String(settings.recommendation.genericnessSensitivity),
    preferredScoringStrictness: String(settings.recommendation.preferredScoringStrictness),
    recommendationFormulaWeights: formulaWeightsToDraft(
      settings.recommendation.recommendationFormulaWeights,
    ),
    defaultTonightAvailableMinutes: String(
      settings.recommendation.defaultTonightMode.availableMinutes,
    ),
    defaultTonightEnergyLevel: settings.recommendation.defaultTonightMode.energyLevel,
    defaultTonightFocusLevel: settings.recommendation.defaultTonightMode.focusLevel,
    defaultTonightDesiredEffect: settings.recommendation.defaultTonightMode.desiredEffect,
    preferredRecommendationStrictness: String(
      settings.recommendation.preferredRecommendationStrictness,
    ),
    allowModernExceptions: settings.recommendation.allowModernExceptions,
    burnoutSensitivity: String(settings.recommendation.burnoutSensitivity),
    completionDetoxStrictness: String(settings.recommendation.completionDetoxStrictness),
    notificationPreferences: settings.recommendation.notificationPreferences,
  };
}

function draftToRequest(draft: SettingsDraft): UserSettingsUpdateRequest {
  return {
    profile: {
      displayName: draft.displayName.trim(),
      timezone: draft.timezone.trim() || "UTC",
      preferredLanguage: draft.preferredLanguage.trim() || "en",
    },
    display: {
      themePreference: draft.themePreference,
    },
    recommendation: {
      defaultMediaTypes: draft.defaultMediaTypes,
      defaultRiskTolerance: draft.defaultRiskTolerance,
      modernMediaSkepticismLevel: Number(draft.modernMediaSkepticismLevel),
      genericnessSensitivity: Number(draft.genericnessSensitivity),
      preferredScoringStrictness: Number(draft.preferredScoringStrictness),
      recommendationFormulaWeights: formulaWeightsToRequest(draft.recommendationFormulaWeights),
      defaultTonightMode: {
        availableMinutes: Number(draft.defaultTonightAvailableMinutes),
        energyLevel: draft.defaultTonightEnergyLevel,
        focusLevel: draft.defaultTonightFocusLevel,
        desiredEffect: draft.defaultTonightDesiredEffect,
      },
      preferredRecommendationStrictness: Number(draft.preferredRecommendationStrictness),
      allowModernExceptions: draft.allowModernExceptions,
      burnoutSensitivity: Number(draft.burnoutSensitivity),
      completionDetoxStrictness: Number(draft.completionDetoxStrictness),
      notificationPreferences: draft.notificationPreferences,
    },
  };
}

export function SettingsPage() {
  const { data, error, isLoading, mutate } = useUserSettings();
  const setThemeMode = useAppStore((state) => state.setThemeMode);
  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    const nextDraft = settingsToDraft(data);
    setDraft((current) => current ?? nextDraft);
    setThemeMode(data.display.themePreference);
  }, [data, setThemeMode]);

  const cleanDraft = useMemo(() => (data ? settingsToDraft(data) : null), [data]);
  const isDirty = Boolean(draft && cleanDraft && JSON.stringify(draft) !== JSON.stringify(cleanDraft));

  function updateDraft<K extends keyof SettingsDraft>(field: K, value: SettingsDraft[K]) {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
    setSavedMessage(null);
    setFormError(null);
  }

  function toggleMediaType(mediaType: MediaType) {
    setDraft((current) => {
      if (!current) return current;
      const selected = current.defaultMediaTypes.includes(mediaType);
      return {
        ...current,
        defaultMediaTypes: selected
          ? current.defaultMediaTypes.filter((item) => item !== mediaType)
          : [...current.defaultMediaTypes, mediaType],
      };
    });
    setSavedMessage(null);
    setFormError(null);
  }

  function updateFormulaWeight(field: RecommendationFormulaWeightKey, value: string) {
    setDraft((current) =>
      current
        ? {
            ...current,
            recommendationFormulaWeights: {
              ...current.recommendationFormulaWeights,
              [field]: value,
            },
          }
        : current,
    );
    setSavedMessage(null);
    setFormError(null);
  }

  function updateNotificationPreference(field: keyof NotificationPreferences, value: boolean) {
    setDraft((current) =>
      current
        ? {
            ...current,
            notificationPreferences: {
              ...current.notificationPreferences,
              [field]: value,
            },
          }
        : current,
    );
    setSavedMessage(null);
    setFormError(null);
  }

  function resetRecommendationDefaults() {
    setDraft((current) => (current ? { ...current, ...recommendedRecommendationDefaults } : current));
    setSavedMessage(null);
    setFormError(null);
  }

  async function saveSettings() {
    if (!draft) return;
    if (!draft.displayName.trim()) {
      setFormError("Display name is required.");
      return;
    }
    setIsSaving(true);
    setFormError(null);
    setSavedMessage(null);
    try {
      const saved = await updateUserSettings(draftToRequest(draft));
      await mutate(saved, { revalidate: false });
      setDraft(settingsToDraft(saved));
      setThemeMode(saved.display.themePreference);
      setSavedMessage("Settings saved.");
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not save settings.");
    } finally {
      setIsSaving(false);
    }
  }

  function resetChanges() {
    if (!cleanDraft) return;
    setDraft(cleanDraft);
    setSavedMessage(null);
    setFormError(null);
  }

  if (isLoading || !draft) {
    return <LoadingState title="Loading settings" message="Fetching your profile and recommendation defaults." />;
  }

  if (error) {
    return <ErrorState title="Settings unavailable" message={error.message} onRetry={() => void mutate()} />;
  }

  if (!data) {
    return <EmptyState title="Settings unavailable" message="Your settings could not be loaded yet." />;
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={(event) => { event.preventDefault(); void saveSettings(); }}>
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <PageTitle>Settings</PageTitle>
          <PageSubtitle>
            Configure your profile, display preference, and recommendation defaults for CanonOS.
          </PageSubtitle>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button className="gap-2" disabled={!isDirty || isSaving} type="button" variant="secondary" onClick={resetChanges}>
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Reset Changes
          </Button>
          <Button className="gap-2" disabled={!isDirty || isSaving} type="submit">
            <Save aria-hidden="true" className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </section>

      {formError ? <ErrorState title="Settings save failed" message={formError} /> : null}
      {savedMessage ? <SuccessMessage message={savedMessage} /> : null}

      <div className="grid gap-6 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <SettingsSubnav />
        <div className="grid gap-6">
          <SectionCard title="Profile settings">
            <h2 className="text-xl font-semibold">Profile settings</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Keep your local workspace identity and locale clear. Email and password changes stay in account security later.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <TextField label="Display name" value={draft.displayName} onChange={(value) => updateDraft("displayName", value)} />
              <TextField label="Timezone" value={draft.timezone} onChange={(value) => updateDraft("timezone", value)} />
              <TextField label="Preferred language" value={draft.preferredLanguage} onChange={(value) => updateDraft("preferredLanguage", value)} />
            </div>
          </SectionCard>

          <SectionCard title="Display settings">
            <h2 className="text-xl font-semibold">Display settings</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Theme preference is applied to the app shell after saving and restored when settings load.
            </p>
            <div className="mt-5 max-w-sm">
              <SelectField
                label="Theme preference"
                labels={themePreferenceLabels}
                options={THEME_PREFERENCES}
                value={draft.themePreference}
                onChange={(value) => updateDraft("themePreference", value)}
              />
            </div>
          </SectionCard>

          <SectionCard title="Advanced Recommendation Settings">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Advanced Recommendation Settings</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Tune CanonOS without hiding the formula. These values affect Candidate Evaluator, Tonight Mode, and Completion Detox.
                </p>
              </div>
              <Button type="button" variant="secondary" onClick={resetRecommendationDefaults}>
                Reset To Recommended Defaults
              </Button>
            </div>

            <fieldset className="mt-5 grid gap-3">
              <legend className="text-sm font-semibold">Default media types</legend>
              <p className="text-sm text-muted-foreground">
                Tonight Mode uses these when you do not choose media types manually.
              </p>
              <div className="flex flex-wrap gap-2">
                {MEDIA_TYPES.map((type) => (
                  <label
                    className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-2 text-sm"
                    key={type}
                  >
                    <input
                      checked={draft.defaultMediaTypes.includes(type)}
                      type="checkbox"
                      onChange={() => toggleMediaType(type)}
                    />
                    {settingsMediaTypeLabels[type]}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <SelectField
                label="Default risk tolerance"
                labels={riskToleranceLabels}
                options={RISK_TOLERANCES}
                value={draft.defaultRiskTolerance}
                onChange={(value) => updateDraft("defaultRiskTolerance", value)}
              />
              <TextField
                label="Default Tonight minutes"
                max={1440}
                min={1}
                type="number"
                value={draft.defaultTonightAvailableMinutes}
                onChange={(value) => updateDraft("defaultTonightAvailableMinutes", value)}
              />
              <SelectField
                label="Default Tonight energy"
                labels={energyLevelLabels}
                options={ENERGY_LEVELS}
                value={draft.defaultTonightEnergyLevel}
                onChange={(value) => updateDraft("defaultTonightEnergyLevel", value)}
              />
              <SelectField
                label="Default Tonight focus"
                labels={focusLevelLabels}
                options={FOCUS_LEVELS}
                value={draft.defaultTonightFocusLevel}
                onChange={(value) => updateDraft("defaultTonightFocusLevel", value)}
              />
              <SelectField
                label="Default Tonight desired effect"
                labels={desiredEffectLabels}
                options={DESIRED_EFFECTS}
                value={draft.defaultTonightDesiredEffect}
                onChange={(value) => updateDraft("defaultTonightDesiredEffect", value)}
              />
              <RangeField
                helpText="Adds caution for recent releases when actual risk signals exist."
                label="Modern media skepticism level"
                value={draft.modernMediaSkepticismLevel}
                onChange={(value) => updateDraft("modernMediaSkepticismLevel", value)}
              />
              <RangeField
                helpText="Raises the penalty for expected genericness and Anti-Generic red flags."
                label="Genericness sensitivity"
                value={draft.genericnessSensitivity}
                onChange={(value) => updateDraft("genericnessSensitivity", value)}
              />
              <RangeField
                helpText="Makes Candidate Evaluator require stronger evidence before watch-now/sample decisions."
                label="Recommendation strictness"
                value={draft.preferredRecommendationStrictness}
                onChange={(value) => {
                  updateDraft("preferredRecommendationStrictness", value);
                  updateDraft("preferredScoringStrictness", value);
                }}
              />
              <RangeField
                helpText="Increases fatigue penalties for repeated, stale, or high-commitment queue items."
                label="Burnout sensitivity"
                value={draft.burnoutSensitivity}
                onChange={(value) => updateDraft("burnoutSensitivity", value)}
              />
              <RangeField
                helpText="Makes sample-boundary drop or pause advice trigger at higher motivation scores."
                label="Completion detox strictness"
                value={draft.completionDetoxStrictness}
                onChange={(value) => updateDraft("completionDetoxStrictness", value)}
              />
            </div>

            <fieldset className="mt-6 grid gap-4">
              <legend className="text-sm font-semibold">Formula weights</legend>
              <p className="text-sm leading-6 text-muted-foreground">
                Defaults mirror the SRS scoring model. Higher positive weights lift fit; higher penalty weights protect time.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {RECOMMENDATION_FORMULA_WEIGHT_KEYS.map((key) => (
                  <RangeField
                    helpText={recommendationFormulaWeightHelp[key]}
                    key={key}
                    label={recommendationFormulaWeightLabels[key]}
                    max={50}
                    suffix="%"
                    value={draft.recommendationFormulaWeights[key]}
                    onChange={(value) => updateFormulaWeight(key, value)}
                  />
                ))}
              </div>
            </fieldset>

            <div className="mt-6 grid gap-3 rounded-2xl border border-border bg-background p-4">
              <h3 className="font-semibold">Modern exceptions and notifications</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Modern exception support prevents recent, distinctive works from being punished only because of release year. Notification preferences are stored now so reminders can use the same contract later.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <ToggleField
                  checked={draft.allowModernExceptions}
                  description="Let Candidate Evaluator reduce recency caution when creator voice or low-genericness evidence is present."
                  label="Allow modern exceptions"
                  onChange={(value) => updateDraft("allowModernExceptions", value)}
                />
                <ToggleField
                  checked={draft.notificationPreferences.recommendationReminders}
                  description="Prepare reminders for queued recommendations and Tonight Mode follow-up."
                  label="Recommendation reminders"
                  onChange={(value) => updateNotificationPreference("recommendationReminders", value)}
                />
                <ToggleField
                  checked={draft.notificationPreferences.completionDetoxReminders}
                  description="Prepare gentle check-ins at sample boundaries."
                  label="Completion Detox reminders"
                  onChange={(value) => updateNotificationPreference("completionDetoxReminders", value)}
                />
                <ToggleField
                  checked={draft.notificationPreferences.browserNotifications}
                  description="Store browser-notification preference; permission prompt will be added when notifications ship."
                  label="Browser notifications"
                  onChange={(value) => updateNotificationPreference("browserNotifications", value)}
                />
                <ToggleField
                  checked={draft.notificationPreferences.emailDigest}
                  description="Store weekly digest preference for future notification integrations."
                  label="Email digest"
                  onChange={(value) => updateNotificationPreference("emailDigest", value)}
                />
              </div>
            </div>
          </SectionCard>

          <AntiGenericRulesSection />

          <PortabilitySection />

          <PrivacySection />
        </div>
      </div>
    </form>
  );
}

function SettingsSubnav() {
  return (
    <nav aria-label="Settings sections" className="h-fit rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Settings Sections</p>
      <ul className="mt-4 grid gap-2 text-sm">
        <li className="rounded-xl bg-muted px-3 py-2 font-medium text-foreground">Profile & Preferences</li>
        <li className="rounded-xl px-3 py-2 text-muted-foreground">Advanced Recommendations</li>
        <li className="rounded-xl px-3 py-2 text-muted-foreground">Anti-Generic Rules</li>
        <li className="rounded-xl px-3 py-2 text-muted-foreground">Data & Integrations</li>
        <li className="rounded-xl px-3 py-2 text-muted-foreground">Privacy & Security</li>
      </ul>
    </nav>
  );
}

function TextField({
  label,
  max,
  min,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  max?: number;
  min?: number;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <input
        className={fieldClassName}
        max={max}
        min={min}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  labels,
  options,
  value,
  onChange,
}: {
  label: string;
  labels: Record<T, string>;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <select className={fieldClassName} value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option]}
          </option>
        ))}
      </select>
    </label>
  );
}

function RangeField({
  helpText,
  label,
  max = 10,
  min = 0,
  suffix,
  value,
  onChange,
}: {
  helpText?: string;
  label: string;
  max?: number;
  min?: number;
  suffix?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span className="flex items-center justify-between gap-3">
        {label}
        <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
          {value}
          {suffix ?? `/${max}`}
        </span>
      </span>
      {helpText ? <span className="text-xs leading-5 text-muted-foreground">{helpText}</span> : null}
      <input
        aria-label={label}
        max={max}
        min={min}
        step={1}
        type="range"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ToggleField({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm">
      <input
        checked={checked}
        className="mt-1"
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <span className="block font-medium">{label}</span>
        <span className="mt-1 block leading-5 text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}


type AntiGenericRuleDraft = {
  isEnabled: boolean;
  weight: string;
};

function AntiGenericRulesSection() {
  const { data, error, isLoading, mutate } = useAntiGenericRules();
  const [drafts, setDrafts] = useState<Record<string, AntiGenericRuleDraft>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (!data) return;
    setDrafts((current) => {
      if (Object.keys(current).length > 0) return current;
      return Object.fromEntries(data.results.map((rule) => [rule.id, ruleToDraft(rule)]));
    });
  }, [data]);

  function updateRuleDraft(id: string, next: Partial<AntiGenericRuleDraft>) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...(current[id] ?? { isEnabled: true, weight: "0" }), ...next },
    }));
    setMessage(null);
    setRuleError(null);
  }

  async function saveRule(rule: AntiGenericRule) {
    const draft = drafts[rule.id];
    if (!draft) return;
    setSavingId(rule.id);
    setMessage(null);
    setRuleError(null);
    try {
      const saved = await updateAntiGenericRule(rule.id, {
        isEnabled: draft.isEnabled,
        weight: Number(draft.weight),
      });
      await mutate();
      setDrafts((current) => ({ ...current, [rule.id]: ruleToDraft(saved) }));
      setMessage(`Saved ${saved.name}. Re-run a candidate evaluation to apply the change.`);
    } catch (caught) {
      setRuleError(caught instanceof Error ? caught.message : "Could not save Anti-Generic rule.");
    } finally {
      setSavingId(null);
    }
  }

  async function resetRules() {
    setIsResetting(true);
    setMessage(null);
    setRuleError(null);
    try {
      const rules = await resetAntiGenericRules();
      await mutate({ count: rules.length, next: null, previous: null, results: rules }, { revalidate: false });
      setDrafts(Object.fromEntries(rules.map((rule) => [rule.id, ruleToDraft(rule)])));
      setMessage("Anti-Generic rules reset. Re-run a candidate evaluation to apply the default rules.");
    } catch (caught) {
      setRuleError(caught instanceof Error ? caught.message : "Could not reset Anti-Generic rules.");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <SectionCard title="Anti-Generic Filter rules">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Anti-Generic Filter rules</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Tune red flags and positive exception rules. Recency is never a red flag by itself; modern works need actual genericness signals.
          </p>
        </div>
        <Button disabled={isResetting} type="button" variant="secondary" onClick={() => void resetRules()}>
          {isResetting ? "Resetting..." : "Reset Rules"}
        </Button>
      </div>

      {isLoading ? <LoadingState title="Loading Anti-Generic rules" message="Fetching rule weights and toggles." /> : null}
      {error ? <ErrorState title="Anti-Generic rules unavailable" message={error.message} onRetry={() => void mutate()} /> : null}
      {ruleError ? <ErrorState title="Anti-Generic rule save failed" message={ruleError} /> : null}
      {message ? <SuccessMessage message={message} /> : null}

      <div className="mt-5 grid gap-3">
        {(data?.results ?? []).map((rule) => {
          const draft = drafts[rule.id] ?? ruleToDraft(rule);
          return (
            <article className="rounded-2xl border border-border bg-background p-4" key={rule.id}>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_10rem_8rem_auto] lg:items-center">
                <div>
                  <h3 className="font-semibold">{rule.name}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{rule.description}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {rule.isPositiveException ? "Positive exception" : "Red flag"}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    checked={draft.isEnabled}
                    type="checkbox"
                    onChange={(event) => updateRuleDraft(rule.id, { isEnabled: event.target.checked })}
                  />
                  Enabled
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Weight
                  <input
                    className={fieldClassName}
                    max={100}
                    min={0}
                    type="number"
                    value={draft.weight}
                    onChange={(event) => updateRuleDraft(rule.id, { weight: event.target.value })}
                  />
                </label>
                <Button disabled={savingId === rule.id} type="button" onClick={() => void saveRule(rule)}>
                  {savingId === rule.id ? "Saving..." : "Save Rule"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </SectionCard>
  );
}

function ruleToDraft(rule: AntiGenericRule): AntiGenericRuleDraft {
  return { isEnabled: rule.isEnabled, weight: String(rule.weight) };
}


function PortabilitySection() {
  const { mutate: mutateCache } = useSWRConfig();
  const { data: importBatches = [], mutate: mutateImportBatches } = useImportBatches();
  const { data: exportJobs = [], mutate: mutateExportJobs } = useExportJobs();
  const [importSourceType, setImportSourceType] = useState<ImportSourceType>("csv");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBatch, setImportBatch] = useState<ImportBatch | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("json");
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [exportPreview, setExportPreview] = useState<string>("");
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [isExportLoading, setIsExportLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreResult, setRestoreResult] = useState<ExportRestoreDryRunResult | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [isRestoreLoading, setIsRestoreLoading] = useState(false);

  async function previewImport() {
    if (!importFile) {
      setImportError("Choose a CSV or JSON file before previewing.");
      return;
    }
    setIsImportLoading(true);
    setImportError(null);
    setImportMessage(null);
    try {
      const preview = await previewImportFile(importFile, importSourceType);
      setImportBatch(preview);
      setImportMessage("Import preview ready. Review every row before confirming.");
      await mutateImportBatches();
    } catch (caught) {
      setImportError(caught instanceof Error ? caught.message : "Could not preview import.");
    } finally {
      setIsImportLoading(false);
    }
  }

  async function confirmImport() {
    if (!importBatch || importBatch.invalidCount > 0) return;
    setIsImportLoading(true);
    setImportError(null);
    setImportMessage(null);
    try {
      const confirmed = await confirmImportBatch(importBatch.id);
      setImportBatch(confirmed);
      setImportMessage(`Import complete. Created ${confirmed.createdCount} records.`);
      await Promise.all([
        mutateImportBatches(),
        mutateCache((key) => typeof key === "string" && (key.startsWith(API_ROUTES.mediaItems) || key === API_ROUTES.dashboardSummary)),
      ]);
    } catch (caught) {
      setImportError(caught instanceof Error ? caught.message : "Could not confirm import.");
    } finally {
      setIsImportLoading(false);
    }
  }

  async function rollbackImport(batch: ImportBatch) {
    setRollingBackId(batch.id);
    setImportError(null);
    setImportMessage(null);
    try {
      const result = await rollbackImportBatch(batch.id);
      setImportBatch((current) => (current?.id === batch.id ? result.batch : current));
      setImportMessage(`Import rolled back. Removed ${result.removedCount} records.`);
      await Promise.all([
        mutateImportBatches(),
        mutateCache((key) => typeof key === "string" && (key.startsWith(API_ROUTES.mediaItems) || key === API_ROUTES.dashboardSummary)),
      ]);
    } catch (caught) {
      setImportError(caught instanceof Error ? caught.message : "Could not roll back import.");
    } finally {
      setRollingBackId(null);
    }
  }

  async function createExport() {
    setIsExportLoading(true);
    setExportError(null);
    setExportMessage(null);
    setExportPreview("");
    try {
      const result = await requestExport(exportFormat);
      setExportResult(result);
      setExportMessage(`${exportFormatLabels[result.format]} is ready to download.`);
      await mutateExportJobs();
    } catch (caught) {
      setExportError(caught instanceof Error ? caught.message : "Could not create export.");
    } finally {
      setIsExportLoading(false);
    }
  }

  async function downloadExport() {
    if (!exportResult) return;
    setIsExportLoading(true);
    setExportError(null);
    try {
      const content = await downloadExportText(exportResult.id);
      setExportPreview(content.slice(0, 600));
      setExportMessage(`Downloaded ${exportResult.filename}.`);
    } catch (caught) {
      setExportError(caught instanceof Error ? caught.message : "Could not download export.");
    } finally {
      setIsExportLoading(false);
    }
  }

  async function validateRestore() {
    if (!restoreFile) {
      setRestoreError("Choose a CanonOS JSON export before validating restore.");
      return;
    }
    setIsRestoreLoading(true);
    setRestoreError(null);
    setRestoreResult(null);
    try {
      setRestoreResult(await dryRunExportRestore(restoreFile));
    } catch (caught) {
      setRestoreError(caught instanceof Error ? caught.message : "Could not validate restore file.");
    } finally {
      setIsRestoreLoading(false);
    }
  }

  const confirmDisabled = !importBatch || importBatch.invalidCount > 0 || importBatch.status !== "previewed" || isImportLoading;
  const latestExport = exportResult ?? exportJobs[0] ?? null;

  return (
    <SectionCard title="Import and export">
      <h2 className="text-xl font-semibold">Import and export</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Bring in existing media history, preview validation before any write, track job progress, and test restore safety before committing data.
      </p>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border p-4">
          <h3 className="font-semibold">Import data</h3>
          <p className="mt-1 text-sm text-muted-foreground">Invalid rows block confirmation, duplicate rows are skipped, and confirmed batches can be rolled back.</p>
          <div className="mt-4 grid gap-4">
            <SelectField
              label="Import source type"
              labels={importSourceTypeLabels}
              options={IMPORT_SOURCE_TYPES}
              value={importSourceType}
              onChange={(value) => {
                setImportSourceType(value);
                setImportBatch(null);
                setImportMessage(null);
                setImportError(null);
              }}
            />
            <label className="grid gap-1.5 text-sm font-medium">
              Import file
              <input
                accept={importSourceType === "csv" ? ".csv,text/csv" : ".json,application/json"}
                className={fieldClassName}
                type="file"
                onChange={(event) => {
                  setImportFile(event.target.files?.[0] ?? null);
                  setImportBatch(null);
                  setImportMessage(null);
                  setImportError(null);
                }}
              />
            </label>
            <p className="text-xs text-muted-foreground">CSV and JSON imports are limited to {formatBytes(2 * 1024 * 1024)} per file.</p>
            <div className="flex flex-wrap gap-3">
              <Button className="gap-2" disabled={isImportLoading} type="button" variant="secondary" onClick={() => void previewImport()}>
                <FileUp aria-hidden="true" className="h-4 w-4" />
                {isImportLoading ? "Previewing..." : "Preview Import"}
              </Button>
              <Button disabled={confirmDisabled} type="button" onClick={() => void confirmImport()}>
                Confirm Import
              </Button>
            </div>
          </div>
          {importError ? <ErrorState title="Import failed" message={importError} /> : null}
          {importMessage ? <SuccessMessage message={importMessage} /> : null}
          {importBatch ? (
            <div className="mt-4 grid gap-4">
              <ProgressMeter label="Import job progress" percent={importBatch.progressPercent} processed={importBatch.progressProcessed} total={importBatch.progressTotal} />
              {importBatch.duplicateCount > 0 ? (
                <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200" role="status">
                  {importBatch.duplicateCount} duplicate row{importBatch.duplicateCount === 1 ? "" : "s"} will be skipped. Review warnings before confirming.
                </div>
              ) : null}
              <ImportPreviewTable batch={importBatch} />
            </div>
          ) : <EmptyState title="No import preview yet" message="Choose a file and preview it before committing records." />}
        </section>

        <section className="rounded-2xl border border-border p-4">
          <h3 className="font-semibold">Export backup</h3>
          <p className="mt-1 text-sm text-muted-foreground">JSON is full fidelity. CSV focuses on media library fields and taste scores.</p>
          <div className="mt-4 grid gap-4">
            <SelectField
              label="Export format"
              labels={exportFormatLabels}
              options={EXPORT_FORMATS}
              value={exportFormat}
              onChange={(value) => {
                setExportFormat(value);
                setExportResult(null);
                setExportPreview("");
                setExportMessage(null);
                setExportError(null);
              }}
            />
            <div className="flex flex-wrap gap-3">
              <Button disabled={isExportLoading} type="button" variant="secondary" onClick={() => void createExport()}>
                {isExportLoading ? "Preparing..." : "Request Export"}
              </Button>
              <Button className="gap-2" disabled={!exportResult || isExportLoading} type="button" onClick={() => void downloadExport()}>
                <Download aria-hidden="true" className="h-4 w-4" />
                Download Export
              </Button>
            </div>
          </div>
          {exportError ? <ErrorState title="Export failed" message={exportError} /> : null}
          {exportMessage ? <SuccessMessage message={exportMessage} /> : null}
          {latestExport ? (
            <div className="mt-4 rounded-xl bg-muted p-3 text-sm">
              <p className="font-medium">{latestExport.filename}</p>
              <p className="text-muted-foreground">{latestExport.recordCount} records • {exportStatusLabels[latestExport.status]} • {formatBytes(latestExport.fileSizeBytes)}</p>
              <ProgressMeter label="Export job progress" percent={latestExport.progressPercent} processed={latestExport.progressProcessed} total={latestExport.progressTotal} />
              {latestExport.retentionExpiresAt ? <p className="mt-2 text-xs text-muted-foreground">Retained until {new Date(latestExport.retentionExpiresAt).toLocaleString()}.</p> : null}
            </div>
          ) : (
            <EmptyState title="No export requested yet" message="Request an export before downloading a backup." />
          )}
          {exportPreview ? (
            <pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-50">{exportPreview}</pre>
          ) : null}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ImportHistory batches={importBatches} rollingBackId={rollingBackId} onRollback={(batch) => void rollbackImport(batch)} />
        <section className="rounded-2xl border border-border p-4">
          <h3 className="font-semibold">Restore dry run</h3>
          <p className="mt-1 text-sm text-muted-foreground">Validate a CanonOS JSON backup and see the records it would restore before importing it.</p>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium">
              Restore file
              <input
                accept=".json,application/json"
                className={fieldClassName}
                type="file"
                onChange={(event) => {
                  setRestoreFile(event.target.files?.[0] ?? null);
                  setRestoreResult(null);
                  setRestoreError(null);
                }}
              />
            </label>
            <Button disabled={isRestoreLoading} type="button" variant="secondary" onClick={() => void validateRestore()}>
              {isRestoreLoading ? "Validating..." : "Validate Restore"}
            </Button>
          </div>
          {restoreError ? <ErrorState title="Restore validation failed" message={restoreError} /> : null}
          {restoreResult ? <RestoreDryRunSummary result={restoreResult} /> : <EmptyState title="No restore validation yet" message="Choose a JSON backup to see restore counts and warnings." />}
        </section>
      </div>

      <ExportHistory jobs={exportJobs} />
    </SectionCard>
  );
}

const DATA_DELETION_PHRASE = "DELETE MY DATA";
const ACCOUNT_DELETION_PHRASE = "DELETE MY ACCOUNT";

function PrivacySection() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const clearSession = useAuthStore((state) => state.clearSession);
  const { mutate: mutateCache } = useSWRConfig();
  const { data: summary, error, isLoading, mutate } = useSWR(
    API_ROUTES.authDataSummary,
    getPersonalDataSummary,
  );
  const [dialog, setDialog] = useState<"data" | "account" | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [latestPrivacyExport, setLatestPrivacyExport] = useState<ExportResult | null>(null);

  async function createPrivacyExport() {
    setIsExporting(true);
    try {
      const result = await requestExport("json");
      setLatestPrivacyExport(result);
      notify({
        title: "Privacy export ready",
        message: `${result.recordCount} records are available from Import and export.`,
        tone: "success",
      });
      await mutateCache(API_ROUTES.exportRequest);
    } catch (caught) {
      notify({
        title: "Export failed",
        message: caught instanceof Error ? caught.message : "Could not create privacy export.",
        tone: "error",
      });
    } finally {
      setIsExporting(false);
    }
  }

  async function confirmDataDeletion() {
    setIsDeletingData(true);
    try {
      const result = await deleteAllCanonOSData();
      setDialog(null);
      notify({
        title: "CanonOS data deleted",
        message: `${result.totalDeleted} private records were removed. Your account and settings remain.`,
        tone: "success",
      });
      await Promise.all([
        mutate(),
        mutateCache(
          (key) =>
            typeof key === "string" &&
            key !== API_ROUTES.authMe &&
            key !== API_ROUTES.authSettings &&
            key !== API_ROUTES.authDataSummary,
          undefined,
          { revalidate: true },
        ),
      ]);
    } catch (caught) {
      notify({
        title: "Data deletion failed",
        message: caught instanceof Error ? caught.message : "Could not delete CanonOS data.",
        tone: "error",
      });
    } finally {
      setIsDeletingData(false);
    }
  }

  async function confirmAccountDeletion() {
    setIsDeletingAccount(true);
    try {
      await deleteAccount();
      setDialog(null);
      clearSession();
      notify({
        title: "Account deleted",
        message: "Your session was cleared and the account was removed.",
        tone: "success",
      });
      await mutateCache(() => true, undefined, { revalidate: false });
      navigate("/register", { replace: true });
    } catch (caught) {
      notify({
        title: "Account deletion failed",
        message: caught instanceof Error ? caught.message : "Could not delete your account.",
        tone: "error",
      });
    } finally {
      setIsDeletingAccount(false);
    }
  }

  const countRows = [
    ["Media items", summary?.counts.mediaItems ?? 0],
    ["Candidates", summary?.counts.candidates ?? 0],
    ["Queue items", summary?.counts.queueItems ?? 0],
    ["Aftertaste notes", summary?.counts.aftertasteEntries ?? 0],
    ["Taste scores", summary?.counts.mediaScores ?? 0],
    ["Graph nodes", summary?.counts.graphNodes ?? 0],
    ["Exports/imports", (summary?.counts.exportJobs ?? 0) + (summary?.counts.importBatches ?? 0)],
    ["Jobs and analyses", (summary?.counts.backgroundJobs ?? 0) + (summary?.counts.narrativeAnalyses ?? 0)],
  ] as const;

  return (
    <SectionCard title="Privacy and security">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <ShieldCheck aria-hidden="true" className="h-5 w-5 text-primary" />
            Privacy and security
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            CanonOS stores private media history, ratings, taste scores, queue decisions, aftertaste notes, imports, exports, and analysis history under your account only.
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            External metadata snapshots store provider IDs, public descriptions, artwork URLs, and ratings for media you attach. They do not send your private notes, ratings, or taste profile to metadata providers.
          </p>
        </div>
        <Button className="gap-2" disabled={isExporting} type="button" variant="secondary" onClick={() => void createPrivacyExport()}>
          <Download aria-hidden="true" className="h-4 w-4" />
          {isExporting ? "Preparing export..." : "Export My Data"}
        </Button>
      </div>

      {error ? <ErrorState title="Privacy summary unavailable" message={error.message} onRetry={() => void mutate()} /> : null}
      {isLoading ? <LoadingState title="Loading privacy summary" message="Counting private records before export or deletion." /> : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {countRows.map(([label, count]) => (
          <dl className="rounded-xl border border-border bg-background p-3" key={label}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold">{count}</dd>
          </dl>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
        <p className="font-medium text-foreground">Before destructive changes</p>
        <p>
          Export first if you may want a backup. Delete All CanonOS Data removes product records but keeps your login and settings. Delete Account removes the login account and clears the session.
        </p>
        {latestPrivacyExport ? (
          <p className="mt-2 text-foreground">
            Latest privacy export: {latestPrivacyExport.filename} ({latestPrivacyExport.recordCount} records).
          </p>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-avoid/30 bg-avoid/5 p-4">
          <h3 className="font-semibold">Delete All CanonOS Data</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Removes media, candidates, queue, aftertaste, scores, graph, analytics inputs, imports, exports, jobs, and analyses. Your account remains signed in.
          </p>
          <DestructiveActionButton
            className="mt-4"
            disabled={isDeletingData}
            onClick={() => setDialog("data")}
          >
            Delete All CanonOS Data
          </DestructiveActionButton>
        </article>

        <article className="rounded-2xl border border-avoid/30 bg-avoid/5 p-4">
          <h3 className="font-semibold">Delete Account</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Permanently removes your user account and all account-owned CanonOS records. You will be redirected to registration after deletion.
          </p>
          <DestructiveActionButton
            className="mt-4"
            disabled={isDeletingAccount}
            onClick={() => setDialog("account")}
          >
            Delete Account
          </DestructiveActionButton>
        </article>
      </div>

      <StrongConfirmationDialog
        confirmLabel={isDeletingData ? "Deleting data..." : "Delete All CanonOS Data"}
        isBusy={isDeletingData}
        message="This removes your CanonOS product data and cannot be undone from inside the app. Your account, profile, and settings remain so you can keep using CanonOS."
        open={dialog === "data"}
        phrase={DATA_DELETION_PHRASE}
        title="Delete all CanonOS data?"
        onCancel={() => setDialog(null)}
        onConfirm={() => void confirmDataDeletion()}
      />
      <StrongConfirmationDialog
        confirmLabel={isDeletingAccount ? "Deleting account..." : "Delete Account"}
        isBusy={isDeletingAccount}
        message="This removes your login account and clears this session. Export your data first if you need a backup."
        open={dialog === "account"}
        phrase={ACCOUNT_DELETION_PHRASE}
        title="Delete your account?"
        onCancel={() => setDialog(null)}
        onConfirm={() => void confirmAccountDeletion()}
      />
    </SectionCard>
  );
}

function StrongConfirmationDialog({
  confirmLabel,
  isBusy,
  message,
  onCancel,
  onConfirm,
  open,
  phrase,
  title,
}: {
  confirmLabel: string;
  isBusy: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  phrase: string;
  title: string;
}) {
  const [typedPhrase, setTypedPhrase] = useState("");

  useEffect(() => {
    if (open) setTypedPhrase("");
  }, [open]);

  if (!open) return null;

  const titleId = `${phrase.toLowerCase().replace(/\s+/g, "-")}-dialog-title`;
  const confirmed = typedPhrase === phrase;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl"
        role="dialog"
      >
        <h3 className="text-lg font-semibold" id={titleId}>{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
        <label className="mt-5 grid gap-2 text-sm font-medium">
          Type {phrase} to confirm
          <input
            autoFocus
            className={fieldClassName}
            value={typedPhrase}
            onChange={(event) => setTypedPhrase(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
          />
        </label>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button disabled={isBusy} type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <DestructiveActionButton disabled={!confirmed || isBusy} onClick={onConfirm}>
            {confirmLabel}
          </DestructiveActionButton>
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ProgressMeter({ label, percent, processed, total }: { label: string; percent: number; processed: number; total: number }) {
  return (
    <div className="mt-3 grid gap-1.5 text-sm" role="status" aria-label={label}>
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{processed}/{total || processed} • {percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
      </div>
    </div>
  );
}

function ImportHistory({ batches, rollingBackId, onRollback }: { batches: ImportBatch[]; rollingBackId: string | null; onRollback: (batch: ImportBatch) => void }) {
  return (
    <section className="rounded-2xl border border-border p-4">
      <h3 className="font-semibold">Import history</h3>
      <p className="mt-1 text-sm text-muted-foreground">Recent import jobs, progress, duplicate counts, and rollback actions.</p>
      <div className="mt-4 grid gap-3">
        {batches.length ? batches.map((batch) => (
          <article className="rounded-xl bg-muted p-3 text-sm" key={batch.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{batch.originalFilename || batch.uploadedFileReference}</p>
                <p className="text-muted-foreground">{importSourceTypeLabels[batch.sourceType]} • {importBatchStatusLabels[batch.status]} • {batch.createdCount} created • {batch.duplicateCount} duplicates</p>
              </div>
              <Button disabled={batch.status !== "confirmed" || rollingBackId === batch.id} type="button" variant="secondary" onClick={() => onRollback(batch)}>
                {rollingBackId === batch.id ? "Rolling back..." : "Roll Back Import"}
              </Button>
            </div>
            <ProgressMeter label={`Import ${batch.id} progress`} percent={batch.progressPercent} processed={batch.progressProcessed} total={batch.progressTotal} />
            {batch.rolledBackAt ? <p className="mt-2 text-xs text-muted-foreground">Rolled back {batch.rollbackItemCount} records on {new Date(batch.rolledBackAt).toLocaleString()}.</p> : null}
          </article>
        )) : <EmptyState title="No import history yet" message="Preview and confirm an import to see it here." />}
      </div>
    </section>
  );
}

function ExportHistory({ jobs }: { jobs: ExportResult[] }) {
  return (
    <section className="mt-6 rounded-2xl border border-border p-4">
      <h3 className="font-semibold">Export history</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {jobs.length ? jobs.map((job) => (
          <article className="rounded-xl bg-muted p-3 text-sm" key={job.id}>
            <p className="font-medium">{job.filename}</p>
            <p className="text-muted-foreground">{exportFormatLabels[job.format]} • {exportStatusLabels[job.status]} • {job.recordCount} records • {formatBytes(job.fileSizeBytes)}</p>
            <ProgressMeter label={`Export ${job.id} progress`} percent={job.progressPercent} processed={job.progressProcessed} total={job.progressTotal} />
          </article>
        )) : <EmptyState title="No export history yet" message="Request an export to see retention and progress details." />}
      </div>
    </section>
  );
}

function RestoreDryRunSummary({ result }: { result: ExportRestoreDryRunResult }) {
  return (
    <div className="mt-4 rounded-xl bg-muted p-3 text-sm" role="status">
      <p className="font-medium">Restore dry run {result.isValid ? "passed" : "found errors"}</p>
      <p className="mt-1 text-muted-foreground">
        {result.totalCount} records checked • {result.validCount} valid • {result.invalidCount} invalid • {result.duplicateCount} duplicates • {result.warningsCount} warnings
      </p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-3">
        <div><dt className="text-xs uppercase text-muted-foreground">Media</dt><dd className="font-semibold">{result.countsByKind.media ?? 0}</dd></div>
        <div><dt className="text-xs uppercase text-muted-foreground">Candidates</dt><dd className="font-semibold">{result.countsByKind.candidate ?? 0}</dd></div>
        <div><dt className="text-xs uppercase text-muted-foreground">Queue</dt><dd className="font-semibold">{result.countsByKind.queue ?? 0}</dd></div>
      </dl>
      {result.errors.length ? <p className="mt-3 text-destructive">{result.errors.join(" ")}</p> : null}
      {result.warnings.length ? <p className="mt-3 text-muted-foreground">{result.warnings.join(" ")}</p> : null}
    </div>
  );
}

function ImportPreviewTable({ batch }: { batch: ImportBatch }) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border">
      <div className="grid gap-2 border-b border-border bg-muted p-3 text-sm md:grid-cols-4">
        <span>Valid: {batch.validCount}</span>
        <span>Invalid: {batch.invalidCount}</span>
        <span>Duplicates: {batch.duplicateCount}</span>
        <span>Warnings: {batch.warningsCount}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Row</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Messages</th>
            </tr>
          </thead>
          <tbody>
            {batch.items.map((item) => (
              <tr className="border-t border-border" key={item.id}>
                <td className="px-3 py-2">{item.rowNumber}</td>
                <td className="px-3 py-2 font-medium">{item.title || "Untitled row"}</td>
                <td className="px-3 py-2">{importStatusLabels[item.status]}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {[...item.errors, ...item.warnings].join(" ") || "Ready"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SuccessMessage({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-promising/30 bg-promising/10 p-4 text-sm font-medium text-promising" role="status">
      {message}
    </div>
  );
}

const fieldClassName = cn(
  "h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary",
);
