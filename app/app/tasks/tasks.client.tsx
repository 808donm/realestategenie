"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Check,
  Clock,
  AlertCircle,
  Calendar,
  ChevronDown,
  Trash2,
  CheckCheck,
  AlarmClock,
  Filter,
  Phone,
  Mail,
  MessageSquare,
  Repeat,
  MoreHorizontal,
  CircleDot,
  User,
  Home,
  UserCheck,
  Link as LinkIcon,
} from "lucide-react";
import ExportToolbar from "../components/export-toolbar";
import type { ExportColumn } from "../components/export-toolbar";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed" | "snoozed" | "cancelled";
  priority: "urgent" | "high" | "medium" | "low";
  due_date: string | null;
  due_time: string | null;
  completed_at: string | null;
  snoozed_until: string | null;
  linked_lead_id: string | null;
  linked_contact_id: string | null;
  linked_open_house_id: string | null;
  linked_transaction_id: string | null;
  assigned_to: string | null;
  task_type: string;
  is_recurring: boolean;
  recurrence_rule: string | null;
  created_at: string;
}

interface EntityOption {
  id: string;
  label: string;
  heat_score?: number;
  date?: string;
}

type TabFilter = "all" | "overdue" | "today" | "upcoming" | "completed";

const PRIORITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  urgent: { bg: "#fef2f2", text: "#dc2626", label: "Urgent" },
  high: { bg: "#fff7ed", text: "#ea580c", label: "High" },
  medium: { bg: "#eff6ff", text: "#2563eb", label: "Medium" },
  low: { bg: "#f0fdf4", text: "#16a34a", label: "Low" },
};

const TASK_TYPES = [
  { value: "general", label: "General" },
  { value: "follow_up", label: "Follow Up" },
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "showing", label: "Showing" },
  { value: "document", label: "Document" },
  { value: "closing", label: "Closing" },
];

const RECURRENCE_OPTIONS = [
  { value: "", label: "No recurrence" },
  { value: "FREQ=DAILY;INTERVAL=1", label: "Daily" },
  { value: "FREQ=WEEKLY;INTERVAL=1", label: "Weekly" },
  { value: "FREQ=WEEKLY;INTERVAL=2", label: "Every 2 weeks" },
  { value: "FREQ=MONTHLY;INTERVAL=1", label: "Monthly" },
  { value: "FREQ=MONTHLY;INTERVAL=3", label: "Quarterly" },
];

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "title", label: "Title", width: 3 },
  { key: "priority", label: "Priority", width: 1 },
  { key: "status", label: "Status", width: 1 },
  { key: "due_date", label: "Due Date", width: 1.5 },
  { key: "task_type", label: "Type", width: 1 },
  { key: "linked_to", label: "Linked To", width: 2 },
  { key: "assigned_to", label: "Assigned To", width: 1.5 },
  { key: "recurrence", label: "Recurring", width: 1 },
];

export default function TasksClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  // Entity options for linking
  const [leadOptions, setLeadOptions] = useState<EntityOption[]>([]);
  const [openHouseOptions, setOpenHouseOptions] = useState<EntityOption[]>([]);
  const [teamMemberOptions, setTeamMemberOptions] = useState<EntityOption[]>([]);
  const [optionsLoaded, setOptionsLoaded] = useState(false);

  // Create form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newDueDate, setNewDueDate] = useState("");
  const [newDueTime, setNewDueTime] = useState("");
  const [newTaskType, setNewTaskType] = useState("general");
  const [newRecurrence, setNewRecurrence] = useState("");
  const [newLinkedLeadId, setNewLinkedLeadId] = useState("");
  const [newLinkedOpenHouseId, setNewLinkedOpenHouseId] = useState("");
  const [newAssignedTo, setNewAssignedTo] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Snooze dropdown
  const [snoozeDropdownId, setSnoozeDropdownId] = useState<string | null>(null);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Build lookup maps from options
  const leadMap = new Map(leadOptions.map((l) => [l.id, l.label]));
  const openHouseMap = new Map(openHouseOptions.map((oh) => [oh.id, oh.label]));
  const memberMap = new Map(teamMemberOptions.map((m) => [m.id, m.label]));

  // Fetch entity options when create form is opened
  useEffect(() => {
    if (showCreateForm && !optionsLoaded) {
      fetch("/api/tasks/options")
        .then((r) => r.json())
        .then((data) => {
          setLeadOptions(data.leads || []);
          setOpenHouseOptions(data.openHouses || []);
          setTeamMemberOptions(data.teamMembers || []);
          setOptionsLoaded(true);
        })
        .catch(() => {});
    }
  }, [showCreateForm, optionsLoaded]);

  // Also load options on mount for task list entity labels
  useEffect(() => {
    fetch("/api/tasks/options")
      .then((r) => r.json())
      .then((data) => {
        setLeadOptions(data.leads || []);
        setOpenHouseOptions(data.openHouses || []);
        setTeamMemberOptions(data.teamMembers || []);
        setOptionsLoaded(true);
      })
      .catch(() => {});
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeTab === "completed") params.set("status", "completed");
      else if (activeTab === "overdue") params.set("due", "overdue");
      else if (activeTab === "today") params.set("due", "today");
      else if (activeTab === "upcoming") params.set("due", "upcoming");

      const res = await fetch(`/api/tasks?${params}`);
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch {
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setIsLoading(true);
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async () => {
    if (!newTitle.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription || null,
          priority: newPriority,
          due_date: newDueDate || null,
          due_time: newDueTime || null,
          task_type: newTaskType,
          is_recurring: !!newRecurrence,
          recurrence_rule: newRecurrence || null,
          linked_lead_id: newLinkedLeadId || null,
          linked_open_house_id: newLinkedOpenHouseId || null,
          assigned_to: newAssignedTo || null,
        }),
      });
      if (res.ok) {
        showToastMsg("Task created");
        setNewTitle("");
        setNewDescription("");
        setNewPriority("medium");
        setNewDueDate("");
        setNewDueTime("");
        setNewTaskType("general");
        setNewRecurrence("");
        setNewLinkedLeadId("");
        setNewLinkedOpenHouseId("");
        setNewAssignedTo("");
        setShowCreateForm(false);
        fetchTasks();
      }
    } catch {
    } finally {
      setIsCreating(false);
    }
  };

  const updateTaskStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchTasks();
    } catch {}
  };

  const snoozeTask = async (id: string, days: number) => {
    const snoozed_until = new Date(Date.now() + days * 86400000).toISOString();
    setSnoozeDropdownId(null);
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "snoozed", snoozed_until }),
      });
      if (res.ok) {
        showToastMsg(`Snoozed for ${days} day${days > 1 ? "s" : ""}`);
        fetchTasks();
      }
    } catch {}
  };

  const deleteTask = async (id: string) => {
    try {
      await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      fetchTasks();
    } catch {}
  };

  const bulkAction = async (action: "complete" | "snooze" | "delete") => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    try {
      await fetch("/api/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          task_ids: ids,
          ...(action === "snooze" ? { snoozed_until: new Date(Date.now() + 86400000).toISOString() } : {}),
        }),
      });
      showToastMsg(
        `${ids.length} task${ids.length > 1 ? "s" : ""} ${action === "complete" ? "completed" : action === "snooze" ? "snoozed" : "deleted"}`,
      );
      setSelectedIds(new Set());
      fetchTasks();
    } catch {}
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === tasks.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(tasks.map((t) => t.id)));
  };

  const today = new Date().toISOString().slice(0, 10);
  const overdueTasks = tasks.filter((t) => t.due_date && t.due_date < today && t.status !== "completed");
  const todayTasks = tasks.filter((t) => t.due_date === today && t.status !== "completed");

  const tabs: { key: TabFilter; label: string; count?: number }[] = [
    { key: "all", label: "All" },
    { key: "overdue", label: "Overdue", count: overdueTasks.length },
    { key: "today", label: "Today", count: todayTasks.length },
    { key: "upcoming", label: "Upcoming" },
    { key: "completed", label: "Completed" },
  ];

  const getLinkedLabel = (task: Task): string | null => {
    if (task.linked_lead_id) return leadMap.get(task.linked_lead_id) || "Lead";
    if (task.linked_open_house_id) return openHouseMap.get(task.linked_open_house_id) || "Open House";
    return null;
  };

  const getExportData = () =>
    tasks.map((t) => ({
      title: t.title,
      priority: PRIORITY_COLORS[t.priority]?.label || t.priority,
      status: t.status,
      due_date: t.due_date || "No date",
      task_type: TASK_TYPES.find((tt) => tt.value === t.task_type)?.label || t.task_type,
      linked_to: getLinkedLabel(t) || "—",
      assigned_to: (t.assigned_to && memberMap.get(t.assigned_to)) || "Me",
      recurrence: t.is_recurring ? "Yes" : "No",
    }));

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 px-5 py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg shadow-lg text-sm font-semibold">
          {toast}
        </div>
      )}

      {/* Toolbar: Tabs + Actions */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === tab.key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-red-100 text-red-600 rounded-full font-bold">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">{selectedIds.size} selected</span>
            <button
              onClick={() => bulkAction("complete")}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Complete
            </button>
            <button
              onClick={() => bulkAction("snooze")}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100"
            >
              <AlarmClock className="w-3.5 h-3.5" />
              Snooze 1d
            </button>
            <button
              onClick={() => bulkAction("delete")}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        )}

        <ExportToolbar title="Tasks" columns={EXPORT_COLUMNS} getData={getExportData} compact />

        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Task
        </button>
      </div>

      {/* Create Task Form */}
      {showCreateForm && (
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Create New Task</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Task title..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div className="sm:col-span-2">
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Priority</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
              <select
                value={newTaskType}
                onChange={(e) => setNewTaskType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              >
                {TASK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Due Date</label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Due Time</label>
              <input
                type="time"
                value={newDueTime}
                onChange={(e) => setNewDueTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Recurrence</label>
              <select
                value={newRecurrence}
                onChange={(e) => setNewRecurrence(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              >
                {RECURRENCE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Assign To</label>
              <select
                value={newAssignedTo}
                onChange={(e) => setNewAssignedTo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              >
                <option value="">Me (default)</option>
                {teamMemberOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Entity Linking */}
            <div className="sm:col-span-2 pt-2 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                <LinkIcon className="w-3 h-3" /> Link to Entity (optional)
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Lead</label>
                  <select
                    value={newLinkedLeadId}
                    onChange={(e) => setNewLinkedLeadId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                  >
                    <option value="">No lead linked</option>
                    {leadOptions.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label} {l.heat_score !== undefined ? `(${l.heat_score})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Open House</label>
                  <select
                    value={newLinkedOpenHouseId}
                    onChange={(e) => setNewLinkedOpenHouseId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                  >
                    <option value="">No open house linked</option>
                    {openHouseOptions.map((oh) => (
                      <option key={oh.id} value={oh.id}>
                        {oh.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={createTask}
              disabled={isCreating || !newTitle.trim()}
              className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Create Task"}
            </button>
          </div>
        </div>
      )}

      {/* Task List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No tasks found</p>
          <p className="text-gray-400 text-sm mt-1">Create your first task to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Select All */}
          <div className="flex items-center gap-2 px-3 py-1">
            <input
              type="checkbox"
              checked={selectedIds.size === tasks.length && tasks.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-xs text-gray-400">Select all</span>
          </div>

          {tasks.map((task) => {
            const pri = PRIORITY_COLORS[task.priority];
            const isOverdue = task.due_date && task.due_date < today && task.status !== "completed";
            const isToday = task.due_date === today;
            const isSelected = selectedIds.has(task.id);
            const linkedLabel = getLinkedLabel(task);
            const assignedName = task.assigned_to ? memberMap.get(task.assigned_to) : null;
            return (
              <div
                key={task.id}
                className={`flex items-start gap-3 px-4 py-3 bg-white border rounded-xl transition-all ${
                  isSelected ? "border-indigo-300 bg-indigo-50/30" : "border-gray-200"
                } ${task.status === "completed" ? "opacity-60" : ""}`}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(task.id)}
                  className="w-4 h-4 rounded border-gray-300 mt-1 flex-shrink-0"
                />

                {/* Complete button */}
                <button
                  onClick={() => updateTaskStatus(task.id, task.status === "completed" ? "pending" : "completed")}
                  className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    task.status === "completed"
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-gray-300 hover:border-green-400"
                  }`}
                >
                  {task.status === "completed" && <Check className="w-3 h-3" />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm font-semibold ${task.status === "completed" ? "line-through text-gray-400" : "text-gray-900"}`}
                    >
                      {task.title}
                    </span>
                    <span
                      className="px-1.5 py-0.5 text-[10px] font-bold rounded"
                      style={{ background: pri.bg, color: pri.text }}
                    >
                      {pri.label}
                    </span>
                    {task.is_recurring && (
                      <span title="Recurring">
                        <Repeat className="w-3 h-3 text-purple-500" />
                      </span>
                    )}
                    {task.status === "snoozed" && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-50 text-amber-600">
                        Snoozed
                      </span>
                    )}
                  </div>
                  {task.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{task.description}</p>}
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400 flex-wrap">
                    {task.due_date && (
                      <span
                        className={`flex items-center gap-0.5 ${isOverdue ? "text-red-500 font-semibold" : isToday ? "text-blue-600 font-semibold" : ""}`}
                      >
                        <Calendar className="w-3 h-3" />
                        {isOverdue ? "Overdue: " : isToday ? "Today " : ""}
                        {task.due_date}
                        {task.due_time && ` at ${task.due_time}`}
                      </span>
                    )}
                    <span className="capitalize">{task.task_type.replace("_", " ")}</span>
                    {task.is_recurring && task.recurrence_rule && (
                      <span>
                        {RECURRENCE_OPTIONS.find((r) => r.value === task.recurrence_rule)?.label || "Recurring"}
                      </span>
                    )}
                    {linkedLabel && (
                      <span className="flex items-center gap-0.5 text-indigo-500">
                        <LinkIcon className="w-3 h-3" />
                        {linkedLabel}
                      </span>
                    )}
                    {assignedName && (
                      <span className="flex items-center gap-0.5 text-teal-600">
                        <UserCheck className="w-3 h-3" />
                        {assignedName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0 relative">
                  {task.status !== "completed" && (
                    <>
                      <div className="relative">
                        <button
                          onClick={() => setSnoozeDropdownId(snoozeDropdownId === task.id ? null : task.id)}
                          title="Snooze"
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <AlarmClock className="w-3.5 h-3.5" />
                        </button>
                        {snoozeDropdownId === task.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setSnoozeDropdownId(null)} />
                            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1 min-w-[120px]">
                              {[
                                { days: 1, label: "1 day" },
                                { days: 3, label: "3 days" },
                                { days: 7, label: "1 week" },
                                { days: 14, label: "2 weeks" },
                                { days: 30, label: "1 month" },
                              ].map((opt) => (
                                <button
                                  key={opt.days}
                                  onClick={() => snoozeTask(task.id, opt.days)}
                                  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-amber-50 hover:text-amber-700"
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )}
                  <button
                    onClick={() => deleteTask(task.id)}
                    title="Delete"
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
