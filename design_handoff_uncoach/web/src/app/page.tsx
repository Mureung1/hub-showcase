import { AppStateProvider } from "@/lib/client/store";
import AppShell from "@/components/AppShell";

export default function Page() {
  return (
    <AppStateProvider>
      <AppShell />
    </AppStateProvider>
  );
}
