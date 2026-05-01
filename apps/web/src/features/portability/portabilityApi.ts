import type { ExportFormat, ExportResult, ImportBatch, ImportSourceType } from "@canonos/contracts";

import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/apiRouteConstants";

export async function previewImportFile(file: File, sourceType: ImportSourceType): Promise<ImportBatch> {
  const formData = new FormData();
  formData.append("sourceType", sourceType);
  formData.append("file", file);
  const response = await api.post<ImportBatch>(API_ROUTES.importPreview, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function confirmImportBatch(batchId: string): Promise<ImportBatch> {
  const response = await api.post<ImportBatch>(`/imports/${batchId}/confirm/`);
  return response.data;
}

export async function requestExport(format: ExportFormat): Promise<ExportResult> {
  const response = await api.post<ExportResult>(API_ROUTES.exportRequest, { format });
  return response.data;
}

export async function downloadExportText(exportId: string): Promise<string> {
  const response = await api.get<string>(`/exports/${exportId}/download/`, { responseType: "text" });
  return response.data;
}
