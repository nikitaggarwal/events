"use client";

import { OperationsProvider, OperationsBanner } from "@/lib/operations";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <OperationsProvider>
      {children}
      <OperationsBanner />
    </OperationsProvider>
  );
}
