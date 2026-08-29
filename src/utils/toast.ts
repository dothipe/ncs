/**
 * Utility to trigger toast notifications across the application
 */
export const showToast = (message: string) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("show-toast", { detail: { message } }));
  }
};
