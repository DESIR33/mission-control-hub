import { useState, useEffect } from "react";

export function useCsrf() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) {
      setCsrfToken(meta.getAttribute("content"));
    }
  }, []);

  return { csrfToken };
}
