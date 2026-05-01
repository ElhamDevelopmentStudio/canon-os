import { api } from "@/lib/api";

export async function fetcher<T>(url: string): Promise<T> {
  const response = await api.get<T>(url);
  return response.data;
}
