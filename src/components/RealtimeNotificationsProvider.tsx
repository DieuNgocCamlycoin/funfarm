import { useRealtimeNotifications, useGiftApprovalModal } from "@/hooks/useRealtimeNotifications";
import GiftApprovalModal from "@/components/wallet/GiftApprovalModal";

export const RealtimeNotificationsProvider = ({ children }: { children: React.ReactNode }) => {
  useRealtimeNotifications();
  const { isOpen, giftData, closeModal } = useGiftApprovalModal();

  return (
    <>
      {children}
      {giftData && (
        <GiftApprovalModal
          isOpen={isOpen}
          onClose={closeModal}
          giftData={giftData}
        />
      )}
    </>
  );
};
