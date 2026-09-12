// React Query client wrapper for projects.
import { api } from "./api";
import type { Project } from "./types";

export const projectApi = {
  list: (params?: { name__icontains?: string }) =>
    api.get<Project[]>("/api/v1/projects/", { params }),

  get: (id: number) => api.get<Project>(`/api/v1/projects/${id}/`),

  create: (data: { name: string; description?: string }) =>
    api.post<Project>("/api/v1/projects/", data),

  update: (id: number, data: { name?: string; description?: string }) =>
    api.patch<Project>(`/api/v1/projects/${id}/`, data),

  delete: (id: number) => api.delete<void>(`/api/v1/projects/${id}/`),
};
