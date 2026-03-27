"use client";

import { useState } from "react";
import { Plus, X, Calendar, Phone, Mail, MessageSquare } from "lucide-react";

interface AddFollowUpButtonProps {
  /** One of these should be provided to link the task */
  leadId?: string;
  contactId?: string;
  openHouseId?: string;
  /** Name of the entity for display */
  entityName?: string;
  /** Compact mode — smaller button */
  compact?: boolean;
}

const QUICK_TYPES = [
  { value: "follow_up", label: "Follow Up", icon: Calendar },
  { value: "call", label: "Call", icon: Phone },
  { value: "email", label: "Email", icon: Mail },
  { value: "meeting", label: "Meeting", icon: MessageSquare },
];

export default function AddFollowUpButton({
  leadId,
  contactId,
  openHouseId,
  entityName,
  compact,
}: AddFollowUpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [taskType, setTaskType] = useState("follow_up");
  const [priority, setPriority] = useState("medium");
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleCreate = async () => {
    const finalTitle = title.trim() || `Follow up with ${entityName || "contact"}`;
    setIsCreating(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: finalTitle,
          priority,
          due_date: dueDate || new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          task_type: taskType,
          linked_lead_id: leadId || null,
          linked_contact_id: contactId || null,
          linked_open_house_id: openHouseId || null,
        }),
      });
      if (res.ok) {
        setToast("Follow-up created!");
        setTimeout(() => setToast(null), 2500);
        setTitle("");
        setDueDate("");
        setTaskType("follow_up");
        setPriority("medium");
        setIsOpen(false);
      }
    } catch {
    } finally {
      setIsCreating(false);
    }
  };

  const btnStyle = compact
    ? "flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 rounded-md hover:bg-purple-100 transition-colors"
    : "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors";

  return (
    <div className="relative inline-block noprint" onClick={(e) => e.stopPropagation()}>
      {toast && (
        <div className="fixed top-5 right-5 z-[100] px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg shadow-lg text-xs font-semibold">
          {toast}
        </div>
      )}

      <button onClick={() => setIsOpen(!isOpen)} className={btnStyle}>
        <Plus className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
        {compact ? "Follow-up" : "Add Follow-up"}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-gray-700">Quick Follow-Up</h4>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick type selector */}
            <div className="flex gap-1.5 mb-2">
              {QUICK_TYPES.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.value}
                    onClick={() => setTaskType(t.value)}
                    className={`flex-1 flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                      taskType === t.value
                        ? "bg-purple-100 text-purple-700"
                        : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Follow up with ${entityName || "contact"}...`}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg mb-2 focus:outline-none focus:ring-1 focus:ring-purple-200"
            />

            <div className="flex gap-2 mb-2">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
              />
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-20 px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="w-full px-3 py-1.5 text-xs font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Create Follow-up"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
