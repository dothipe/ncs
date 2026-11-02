import { useState, useEffect, useRef } from "react";

export const useOfflineSync = () => {
  const [networkStatus, setNetworkStatus] = useState<"online" | "offline" | null>(null);
  const [isFirebaseQuotaExceeded, setIsFirebaseQuotaExceeded] = useState(false);
  const [rawPendingWrites, setRawPendingWrites] = useState(false);
  const [dbHasPendingWrites, setDbHasPendingWrites] = useState(false);
  const pendingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (rawPendingWrites) {
      if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current);
      setDbHasPendingWrites(true);
    } else {
      if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = setTimeout(() => {
        setDbHasPendingWrites(false);
      }, 1000); // Smooth transition back to idle sync status
    }
    return () => {
      if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current);
    };
  }, [rawPendingWrites]);
  const onlineTimerRef = useRef<any>(null);

  useEffect(() => {
    const handleQuotaExceeded = () => {
      setIsFirebaseQuotaExceeded(true);
    };
    window.addEventListener("firebase_quota_exceeded", handleQuotaExceeded);
    return () => {
      window.removeEventListener("firebase_quota_exceeded", handleQuotaExceeded);
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      if (onlineTimerRef.current) clearTimeout(onlineTimerRef.current);
      setNetworkStatus("online");
      onlineTimerRef.current = setTimeout(() => {
        setNetworkStatus(null);
      }, 5000);
    };
    const handleOffline = () => {
      if (onlineTimerRef.current) clearTimeout(onlineTimerRef.current);
      setNetworkStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (onlineTimerRef.current) clearTimeout(onlineTimerRef.current);
    };
  }, []);

  return {
    networkStatus,
    setNetworkStatus,
    isFirebaseQuotaExceeded,
    setIsFirebaseQuotaExceeded,
    dbHasPendingWrites,
    setDbHasPendingWrites: setRawPendingWrites,
  };
};
