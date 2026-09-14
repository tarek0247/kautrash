import { createFileRoute } from "@tanstack/react-router";
import { CalendarView } from "@/components/calendar-view";

export const Route = createFileRoute("/calendar")({
  component: CalendarPage,
});

function CalendarPage() {
  return <CalendarView />;
}
