"use client";
// A component that only renders its children on the client side
// to avoid hydration mismatches.
import { PropsWithChildren, useEffect, useState } from "react";

export function ClientOnly({ children }: PropsWithChildren) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return <>{children}</>;
}
