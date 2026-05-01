import {
  EXPORT_FORMATS,
  IMPORT_SOURCE_TYPES,
  MEDIA_TYPES,
  RISK_TOLERANCES,
  THEME_PREFERENCES,
  type ExportFormat,
  type ExportResult,
  type ImportBatch,
  type ImportSourceType,
  type MediaType,
  type RiskTolerance,
  type ThemePreference,
  type UserSettings,
  type UserSettingsUpdateRequest,
} from "@canonos/contracts";
import { Download, FileUp, RotateCcw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { PageSubtitle, PageTitle } from "@/components/layout/PageText";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { confirmImportBatch, downloadExportText, previewImportFile, requestExport } from "@/features/portability/portabilityApi";
import { exportFormatLabels, importSourceTypeLabels, importStatusLabels } from "@/features/portability/portabilityLabels";
import { updateUserSettings, useUserSettings } from "@/features/settings/settingsApi";
import {
  riskToleranceLabels,
  settingsMediaTypeLabels,
  themePreferenceLabels,
} from "@/features/settings/settingsLabels";
import { API_ROUTES } from "@/lib/apiRouteConstants";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/appStore";

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
};

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

          <SectionCard title="Recommendation settings">
            <h2 className="text-xl font-semibold">Recommendation settings</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              These defaults inform Candidate Evaluator risk scoring and Tonight Mode defaults.
            </p>
            <fieldset className="mt-5 grid gap-3">
              <legend className="text-sm font-semibold">Default media types</legend>
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
              <RangeField
                label="Modern media skepticism level"
                value={draft.modernMediaSkepticismLevel}
                onChange={(value) => updateDraft("modernMediaSkepticismLevel", value)}
              />
              <RangeField
                label="Genericness sensitivity"
                value={draft.genericnessSensitivity}
                onChange={(value) => updateDraft("genericnessSensitivity", value)}
              />
              <RangeField
                label="Preferred scoring strictness"
                value={draft.preferredScoringStrictness}
                onChange={(value) => updateDraft("preferredScoringStrictness", value)}
              />
            </div>
          </SectionCard>

          <PortabilitySection />
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
        <li className="rounded-xl px-3 py-2 text-muted-foreground">Data & Integrations</li>
        <li className="rounded-xl px-3 py-2 text-muted-foreground">Account & Security</li>
      </ul>
    </nav>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <input className={fieldClassName} value={value} onChange={(event) => onChange(event.target.value)} />
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

function RangeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span className="flex items-center justify-between gap-3">
        {label}
        <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{value}/10</span>
      </span>
      <input
        aria-label={label}
        max={10}
        min={0}
        step={1}
        type="range"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}


function PortabilitySection() {
  const { mutate: mutateCache } = useSWRConfig();
  const [importSourceType, setImportSourceType] = useState<ImportSourceType>("csv");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBatch, setImportBatch] = useState<ImportBatch | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("json");
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [exportPreview, setExportPreview] = useState<string>("");
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [isExportLoading, setIsExportLoading] = useState(false);

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
      await mutateCache((key) => typeof key === "string" && (key.startsWith(API_ROUTES.mediaItems) || key === API_ROUTES.dashboardSummary));
    } catch (caught) {
      setImportError(caught instanceof Error ? caught.message : "Could not confirm import.");
    } finally {
      setIsImportLoading(false);
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

  const confirmDisabled = !importBatch || importBatch.invalidCount > 0 || importBatch.status === "confirmed" || isImportLoading;

  return (
    <SectionCard title="Import and export">
      <h2 className="text-xl font-semibold">Import and export</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Bring in existing media history, preview validation before any write, and export a backup before destructive account tools exist.
      </p>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border p-4">
          <h3 className="font-semibold">Import data</h3>
          <p className="mt-1 text-sm text-muted-foreground">Invalid rows block confirmation, so existing library data is not partially changed.</p>
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
          {importBatch ? <ImportPreviewTable batch={importBatch} /> : <EmptyState title="No import preview yet" message="Choose a file and preview it before committing records." />}
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
          {exportResult ? (
            <div className="mt-4 rounded-xl bg-muted p-3 text-sm">
              <p className="font-medium">{exportResult.filename}</p>
              <p className="text-muted-foreground">{exportResult.recordCount} records • {exportResult.status}</p>
            </div>
          ) : (
            <EmptyState title="No export requested yet" message="Request an export before downloading a backup." />
          )}
          {exportPreview ? (
            <pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-50">{exportPreview}</pre>
          ) : null}
        </section>
      </div>
    </SectionCard>
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
