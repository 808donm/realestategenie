import TasksClient from "./tasks.client";
import PageHelp from "../components/page-help";

export const metadata = { title: "Tasks | The Real Estate Genie" };

export default function TasksPage() {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>Tasks</h1>
        <PageHelp
          title="Tasks"
          description="Manage your to-do list with tasks linked to leads, contacts, and open houses. Set priorities, due dates, and recurring schedules."
          tips={[
            "Use the + button to create a new task",
            "Link tasks to leads or contacts for context",
            "Set recurring rules for weekly check-ins",
            "Select multiple tasks for bulk complete or snooze",
          ]}
        />
      </div>
      <p style={{ color: "hsl(var(--muted-foreground))", marginBottom: 24, fontSize: 14 }}>
        Stay on top of follow-ups, calls, and deadlines.
      </p>
      <TasksClient />
    </div>
  );
}
