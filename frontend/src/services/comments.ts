// React Query client wrapper for comments.
import { api } from "./api";
import type { Comment } from "./types";

export const commentApi = {
  list: (taskId: number) =>
    api.get<Comment[]>(`/api/v1/tasks/${taskId}/comments/`),

  create: (taskId: number, content: string) =>
    api.post<Comment>(`/api/v1/tasks/${taskId}/comments/`, { content }),

  delete: (id: number) => api.delete<void>(`/api/v1/comments/${id}/`),
};
