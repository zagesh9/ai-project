// React Query client wrapper for boards.
import { api } from "./api";
import type { Board } from "./types";

export const boardApi = {
  list: (projectId: number) =>
    api.get<Board[]>("/api/v1/boards/", { params: { project_id: projectId } }),

  get: (id: number) => api.get<Board>(`/api/v1/boards/${id}/`),

  create: (data: { name: string; project_id: number; position?: number }) =>
    api.post<Board>("/api/v1/boards/", data),

  update: (id: number, data: { name?: string }) =>
    api.patch<Board>(`/api/v1/boards/${id}/`, data),

  delete: (id: number) => api.delete<void>(`/api/v1/boards/${id}/`),
};
