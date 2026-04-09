import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2"
        >
          <WifiOff size={16} />
          Você está offline. Alguns recursos podem estar indisponíveis.
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineBanner;
