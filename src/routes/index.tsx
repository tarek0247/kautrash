import { createFileRoute } from "@tanstack/react-router";
import { useAppActions } from "@/components/app-shell";
import { HomeView } from "@/components/home-view";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { openAddress, openGuide } = useAppActions();
  return <HomeView onChangeAddress={openAddress} onOpenGuide={openGuide} />;
}
