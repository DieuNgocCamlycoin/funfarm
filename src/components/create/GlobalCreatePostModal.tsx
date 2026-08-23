// 🌱 Global create-post modal triggered by MobileBottomNav action sheet
import { useEffect, useState } from "react";
import CreatePostModal from "@/components/feed/CreatePostModal";

export const GlobalCreatePostModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [kind, setKind] = useState("post");
  const [selling, setSelling] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      setKind(detail.postKind || "post");
      setSelling(!!detail.isSelling);
      setIsOpen(true);
    };
    window.addEventListener("open-create-post", handler);
    return () => window.removeEventListener("open-create-post", handler);
  }, []);

  const handlePost = () => {
    window.dispatchEvent(new CustomEvent("refresh-feed"));
    setIsOpen(false);
  };

  return (
    <CreatePostModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onPost={handlePost}
      initialTab={kind}
      isSelling={selling}
    />
  );
};

export default GlobalCreatePostModal;
