import { createFileRoute } from "@tanstack/react-router";
import { useAppActions } from "@/components/app-shell";
import { SettingsView } from "@/components/settings-view";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { openAddress } = useAppActions();
  return <SettingsView onChangeAddress={openAddress} />;
}
