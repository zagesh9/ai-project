// Task + comment API calls.
import { api } from "./api";
import type { Task, Comment } from "./types";

export const taskApi = {
  list: (boardId: number) =>
    api.get<Task[]>("/api/v1/tasks/", { params: { board_id: boardId } }),

  get: (id: number) => api.get<Task>(`/api/v1/tasks/${id}/`),

  create: (
    data: {
      title: string;
      description?: string;
      status?: string;
      priority?: string;
      due_date?: string;
      assignee_id?: number;
      board_id: number;
    },
  ) => api.post<Task>("/api/v1/tasks/", data),

  update: (id: number, data: Partial<Task>) =>
    api.patch<Task>(`/api/v1/tasks/${id}/`, data),

  delete: (id: number) => api.delete<void>(`/api/v1/tasks/${id}/`),
};

export const commentApi = {
  list: (taskId: number) =>
    api.get<Comment[]>(`/api/v1/tasks/${taskId}/comments/`),

  create: (taskId: number, content: string) =>
    api.post<Comment>(`/api/v1/tasks/${taskId}/comments/`, { content }),

  delete: (id: number) => api.delete<void>(`/api/v1/comments/${id}/`),
};
