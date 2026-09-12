// Dashboard page — shows stats + recent tasks.
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import type { DashboardStats, Task } from "../services/types";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    todo: "bg-gray-100 text-gray-700",
    in_progress: "bg-blue-100 text-blue-700",
    done: "bg-green-100 text-green-700",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-700"}`}
    >
      {status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();

  const { data, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/api/v1/dashboard/").then((r) => r.data),
  });

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Failed to load dashboard.</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600">
            Welcome back, {user?.first_name ?? "there"}
          </p>
        </div>
        <button
          onClick={logout}
          className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
        >
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Projects"
          value={data?.total_projects ?? 0}
          color="bg-blue-50 border-blue-200 text-blue-700"
        />
        <StatCard
          label="Boards"
          value={data?.total_boards ?? 0}
          color="bg-purple-50 border-purple-200 text-purple-700"
        />
        <StatCard
          label="My Tasks"
          value={data?.my_assigned_tasks?.total ?? 0}
          color="bg-amber-50 border-amber-200 text-amber-700"
        />
        <StatCard
          label="Overdue"
          value={data?.overdue_tasks ?? 0}
          color="bg-red-50 border-red-200 text-red-700"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">
              Tasks by Status
            </h2>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-400 rounded-full"
                  style={{
                    width: `${
                      ((data?.tasks_by_status?.todo ?? 0) /
                        Math.max(
                          1,
                          data?.tasks_by_status?.todo +
                            data?.tasks_by_status?.in_progress +
                            data?.tasks_by_status?.done,
                        )) *
                      100
                    }%`,
                  }}
                />
              </div>
              <span className="text-sm text-gray-600 whitespace-nowrap">
                To Do: {data?.tasks_by_status?.todo ?? 0}
              </span>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-400 rounded-full"
                  style={{
                    width: `${
                      ((data?.tasks_by_status?.in_progress ?? 0) /
                        Math.max(
                          1,
                          data?.tasks_by_status?.todo +
                            data?.tasks_by_status?.in_progress +
                            data?.tasks_by_status?.done,
                        )) *
                      100
                    }%`,
                  }}
                />
              </div>
              <span className="text-sm text-gray-600 whitespace-nowrap">
                In Progress: {data?.tasks_by_status?.in_progress ?? 0}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-400 rounded-full"
                  style={{
                    width: `${
                      ((data?.tasks_by_status?.done ?? 0) /
                        Math.max(
                          1,
                          data?.tasks_by_status?.todo +
                            data?.tasks_by_status?.in_progress +
                            data?.tasks_by_status?.done,
                        )) *
                      100
                    }%`,
                  }}
                />
              </div>
              <span className="text-sm text-gray-600 whitespace-nowrap">
                Done: {data?.tasks_by_status?.done ?? 0}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">
              Recently Created
            </h2>
          </div>
          <div className="p-6">
            {(!data?.recent_tasks || data.recent_tasks.length === 0) ? (
              <p className="text-gray-500 text-sm">No tasks yet.</p>
            ) : (
              <ul className="space-y-3">
                {data.recent_tasks.map((task: Task) => (
                  <li key={task.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          task.status === "todo"
                            ? "bg-gray-400"
                            : task.status === "in_progress"
                            ? "bg-blue-400"
                            : "bg-green-400"
                        }`}
                      />
                      <span className="text-gray-700 truncate text-sm">
                        {task.title}
                      </span>
                    </div>
                    <StatusBadge status={task.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className={`bg-white rounded-lg shadow p-6 border ${color.split(" ").slice(-2).join(" ")}`}
    >
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
