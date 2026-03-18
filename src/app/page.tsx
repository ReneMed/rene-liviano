import { AppLayout } from "@/shared/components/AppLayout";
import { RecorderScreen } from "@/features/recorder/RecorderScreen";

export default function Home() {
  return (
    <AppLayout>
      <RecorderScreen />
    </AppLayout>
  );
}
