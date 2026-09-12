// Boards list + Kanban view for a project.
import React, { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { boardApi } from "../services/boards";
import { taskApi, type TaskCreateData } from "../services/tasks";
import type { Board, Task, TaskStatus, TaskPriority } from "../services/types";

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

export default function BoardsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const projectIdNum = Number(projectId);

  const { data: boardsResponse, isLoading: boardsLoading } = useQuery({
    queryKey: ["boards", projectIdNum],
    queryFn: () =>
      boardApi.list(projectIdNum).then((r) => r.data.results ?? r.data),
  });

  const [activeBoardId, setActiveBoardId] = useState<number | null>(
    boardsResponse?.[0]?.id ?? null,
  );

  const tasksQuery = activeBoardId
    ? useQuery({
        queryKey: ["tasks", activeBoardId],
        queryFn: () =>
          taskApi.list(activeBoardId).then((r) => r.data.results ?? r.data),
      })
    : null;

  const isTasksLoading = tasksQuery?.isLoading ?? false;
  const tasks = tasksQuery?.data ?? [];
  const tasksError = tasksQuery?.error;

  const createBoardMutation = useMutation({
    mutationFn: (name: string) =>
      boardApi.create({ name, project_id: projectIdNum }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards", projectIdNum] });
    },
  });

  const deleteBoardMutation = useMutation({
    mutationFn: (id: number) => boardApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards", projectIdNum] });
      if (activeBoardId === id) setActiveBoardId(null);
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: TaskCreateData) =>
      taskApi.create(activeBoardId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", activeBoardId] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<Task> & { id: number }) =>
      taskApi.update(id, data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", activeBoardId] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => taskApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", activeBoardId] });
    },
  });

  // Sidebar board list
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState<TaskCreateData>({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    due_date: "",
    assignee_id: null,
  });

  const activeBoard = boardsResponse?.find((b: Board) => b.id === activeBoardId);

  if (boardsLoading) return <div className="p-8">Loading boards...</div>;
  if (!boardsResponse?.length) {
    return (
      <div className="p-8">
        <div className="text-center py-12 bg-white rounded-lg shadow border">
          <p className="text-gray-500 mb-4">No boards yet.</p>
          <button
            onClick={() => setShowNewBoard(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Create your first board
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`bg-white border-r transition-all duration-200 ${
          sidebarOpen ? "w-64" : "w-16"
        }`}
      >
        <div className="p-3 border-b flex items-center justify-between">
          {sidebarOpen && (
            <h2 className="font-semibold text-gray-800">Boards</h2>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <span className="text-gray-500">{sidebarOpen ? "〈" : "〉"}</span>
          </button>
        </div>
        <div className="p-2">
          {boardsResponse?.map((board: Board) => (
            <div
              key={board.id}
              className={`group flex items-center gap-2 p-2 rounded-md cursor-pointer mb-1 ${
                activeBoardId === board.id
                  ? "bg-blue-50 border-l-2 border-blue-500"
                  : "hover:bg-gray-50 border-l-2 border-transparent"
              }`}
              onClick={() => setActiveBoardId(board.id)}
            >
              <div
                className={`w-3 h-3 rounded-full ${
                  activeBoardId === board.id ? "bg-blue-500" : "bg-gray-300"
                }`}
              />
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-sm font-medium text-gray-700 truncate">
                    {board.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        confirm(`Delete "${board.name}"?`)
                      )
                        deleteBoardMutation.mutate(board.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 text-sm"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        {sidebarOpen && (
          <div className="p-2 border-t">
            {showNewBoard ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newBoardName.trim()) {
                      createBoardMutation.mutate(newBoardName.trim());
                      setNewBoardName("");
                      setShowNewBoard(false);
                    }
                    if (e.key === "Escape") {
                      setShowNewBoard(false);
                      setNewBoardName("");
                    }
                  }}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Board name"
                />
                <button
                  onClick={() => {
                    if (newBoardName.trim())
                      createBoardMutation.mutate(newBoardName.trim());
                    setNewBoardName("");
                    setShowNewBoard(false);
                  }}
                  className="bg-blue-600 text-white px-2 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowNewBoard(false);
                    setNewBoardName("");
                  }}
                  className="text-gray-500 text-sm px-1"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNewBoard(true)}
                className="w-full text-sm text-blue-600 hover:text-blue-800 py-1"
              >
                + New Board
              </button>
            )}
          </div>
        )}
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Board header */}
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <div>
            {activeBoard && (
              <h1 className="text-lg font-semibold text-gray-800">
                {activeBoard.name}
              </h1>
            )}
          </div>
          <button
            onClick={() => setShowNewTask(true)}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-700"
          >
            + Add Task
          </button>
        </div>

        {/* Kanban columns */}
        {tasksError ? (
          <div className="flex-1 p-8 text-red-600">Failed to load tasks.</div>
        ) : isTasksLoading ? (
          <div className="flex-1 p-8">Loading tasks...</div>
        ) : (
          <div className="flex-1 overflow-x-auto p-4">
            <div className="flex gap-4 h-full">
              {COLUMNS.map((col) => {
                const colTasks = tasks.filter(
                  (t: Task) => t.status === col.key,
                );
                return (
                  <div
                    key={col.key}
                    className="flex-1 min-w-[280px] bg-gray-50 rounded-lg p-3 flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-700 text-sm">
                        {col.label}
                      </h3>
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                        {colTasks.length}
                      </span>
                    </div>
                    <div className="flex-1 space-y-2 overflow-y-auto">
                      {colTasks.map((task: Task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onUpdate={(data) =>
                            updateTaskMutation.mutate({ id: task.id, ...data })
                          }
                          onDelete={() =>
                            deleteTaskMutation.mutate(task.id)
                          }
                        />
                      ))}
                      {colTasks.length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                          No tasks
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* New task modal */}
      {showNewTask && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">New Task</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  autoFocus
                  value={newTask.title}
                  onChange={(e) =>
                    setNewTask((p) => ({ ...p, title: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Task title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) =>
                    setNewTask((p) => ({ ...p, description: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={newTask.status}
                    onChange={(e) =>
                      setNewTask((p) => ({
                        ...p,
                        status: e.target.value as TaskStatus,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) =>
                      setNewTask((p) => ({
                        ...p,
                        priority: e.target.value as TaskPriority,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowNewTask(false);
                    setNewTask({
                      title: "",
                      description: "",
                      status: "todo",
                      priority: "medium",
                      due_date: "",
                      assignee_id: null,
                    });
                  }}
                  className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!newTask.title.trim()) return;
                    createTaskMutation.mutate(newTask);
                    setShowNewTask(false);
                    setNewTask({
                      title: "",
                      description: "",
                      status: "todo",
                      priority: "medium",
                      due_date: "",
                      assignee_id: null,
                    });
                  }}
                  disabled={!newTask.title.trim() || createTaskMutation.isPending}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {createTaskMutation.isPending ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task,
  onUpdate,
  onDelete,
}: {
  task: Task;
  onUpdate: (data: Partial<Task>) => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const priorityColors: Record<string, string> = {
    low: "bg-gray-100 text-gray-600",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-red-100 text-red-700",
  };

  return (
    <div className="bg-white rounded-md shadow-sm border border-gray-200 p-3 group">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded"
          >
            <span className="text-gray-400 text-sm">⋮</span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white shadow rounded-md border z-10 min-w-[140px]">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onUpdate({ status: "in_progress" });
                }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100"
              >
                Move to In Progress
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onUpdate({ status: "done" });
                }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100"
              >
                Move to Done
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
                className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs px-1.5 py-0.5 rounded capitalize">
          {task.priority}
        </span>
        <span
          className={`text-xs px-1.5 py-0.5 rounded ${
            task.status === "todo"
              ? "bg-gray-100 text-gray-600"
              : task.status === "in_progress"
              ? "bg-blue-100 text-blue-600"
              : "bg-green-100 text-green-600"
          }`}
        >
          {task.status.replace("_", " ")}
        </span>
      </div>
    </div>
  );
}
