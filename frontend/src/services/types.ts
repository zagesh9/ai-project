// Shared type definitions for the API.
//
// These mirror the backend serializers. Frontend code imports from here
// so that backend and frontend types stay in sync.

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  owner: User;
  created_at: string;
  updated_at: string;
}

export interface Board {
  id: number;
  name: string;
  project: Project;
  position: number;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assignee: User | null;
  board: Board;
  created_by: User;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  content: string;
  task: Task;
  author: User;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_projects: number;
  total_boards: number;
  tasks_by_status: Record<TaskStatus, number>;
  my_assigned_tasks: {
    total: number;
    by_status: Record<TaskStatus, number>;
  };
  overdue_tasks: number;
  recent_tasks: Task[];
}
