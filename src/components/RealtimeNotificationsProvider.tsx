import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

export const RealtimeNotificationsProvider = ({ children }: { children: React.ReactNode }) => {
  useRealtimeNotifications();
  return <>{children}</>;
};
