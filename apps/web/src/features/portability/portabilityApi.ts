import type {
  ExportFormat,
  ExportRestoreDryRunResult,
  ExportResult,
  ImportBatch,
  ImportRollbackResult,
  ImportSourceType,
} from "@canonos/contracts";
import useSWR, { mutate as globalMutate } from "swr";

import { api } from "@/lib/api";
import { fetcher } from "@/lib/swr";
import { API_ROUTES } from "@/lib/apiRouteConstants";

export function useImportBatches() {
  return useSWR<ImportBatch[]>(API_ROUTES.importBatches, fetcher<ImportBatch[]>);
}

export function useExportJobs() {
  return useSWR<ExportResult[]>(API_ROUTES.exportRequest, fetcher<ExportResult[]>);
}

export async function previewImportFile(file: File, sourceType: ImportSourceType): Promise<ImportBatch> {
  const formData = new FormData();
  formData.append("sourceType", sourceType);
  formData.append("file", file);
  const response = await api.post<ImportBatch>(API_ROUTES.importPreview, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  await globalMutate(API_ROUTES.importBatches);
  return response.data;
}

export async function confirmImportBatch(batchId: string): Promise<ImportBatch> {
  const response = await api.post<ImportBatch>(`/imports/${batchId}/confirm/`);
  await globalMutate(API_ROUTES.importBatches);
  return response.data;
}

export async function rollbackImportBatch(batchId: string): Promise<ImportRollbackResult> {
  const response = await api.post<ImportRollbackResult>(`/imports/${batchId}/rollback/`);
  await globalMutate(API_ROUTES.importBatches);
  return response.data;
}

export async function requestExport(format: ExportFormat): Promise<ExportResult> {
  const response = await api.post<ExportResult>(API_ROUTES.exportRequest, { format });
  await globalMutate(API_ROUTES.exportRequest);
  return response.data;
}

export async function downloadExportText(exportId: string): Promise<string> {
  const response = await api.get<string>(`/exports/${exportId}/download/`, { responseType: "text" });
  return response.data;
}

export async function dryRunExportRestore(file: File): Promise<ExportRestoreDryRunResult> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post<ExportRestoreDryRunResult>(API_ROUTES.exportRestoreDryRun, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}
