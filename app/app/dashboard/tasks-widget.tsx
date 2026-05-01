"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, AlertCircle, Calendar, Clock, ListTodo, ChevronRight } from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  task_type: string;
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: "#dc2626",
  high: "#ea580c",
  medium: "#2563eb",
  low: "#16a34a",
};

export default function TasksWidget() {
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/tasks?due=overdue").then((r) => r.json()),
      fetch("/api/tasks?due=today").then((r) => r.json()),
      fetch("/api/tasks?due=upcoming").then((r) => r.json()),
    ])
      .then(([overdueData, todayData, upcomingData]) => {
        setOverdueTasks((overdueData.tasks || []).slice(0, 3));
        setTodayTasks((todayData.tasks || []).slice(0, 3));
        setUpcomingTasks((upcomingData.tasks || []).slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const markComplete = async (id: string) => {
    try {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      // Remove from lists
      setOverdueTasks((prev) => prev.filter((t) => t.id !== id));
      setTodayTasks((prev) => prev.filter((t) => t.id !== id));
      setUpcomingTasks((prev) => prev.filter((t) => t.id !== id));
    } catch {}
  };

  const totalCount = overdueTasks.length + todayTasks.length + upcomingTasks.length;

  if (isLoading) return null;
  if (totalCount === 0) return null;

  const renderSection = (title: string, tasks: Task[], icon: React.ReactNode, textColor: string) => {
    if (tasks.length === 0) return null;
    return (
      <div className="mb-3 last:mb-0">
        <div className={`flex items-center gap-1.5 mb-1.5 text-xs font-semibold ${textColor}`}>
          {icon}
          {title} ({tasks.length})
        </div>
        <div className="space-y-1">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-2 px-2 py-1.5 bg-muted rounded-lg group">
              <button
                onClick={() => markComplete(task.id)}
                className="flex-shrink-0 w-4 h-4 rounded-full border-2 border-border hover:border-green-400 transition-colors"
                title="Mark complete"
              />
              <span
                className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                style={{ background: PRIORITY_DOT[task.priority] || "#2563eb" }}
              />
              <span className="text-xs text-foreground font-medium truncate flex-1">{task.title}</span>
              {task.due_date && (
                <span className="text-[10px] text-muted-foreground flex-shrink-0">{task.due_date}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ListTodo className="w-4 h-4" />
            Tasks
          </CardTitle>
          <Link
            href="/app/tasks"
            className="text-xs text-primary hover:opacity-80 flex items-center gap-0.5 no-underline"
          >
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {renderSection("Overdue", overdueTasks, <AlertCircle className="w-3 h-3" />, "text-red-600 dark:text-red-400")}
        {renderSection("Today", todayTasks, <Calendar className="w-3 h-3" />, "text-primary")}
        {renderSection("Upcoming", upcomingTasks, <Clock className="w-3 h-3" />, "text-muted-foreground")}
      </CardContent>
    </Card>
  );
}
