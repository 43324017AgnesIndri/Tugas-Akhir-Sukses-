import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";

async function WaitForRequest({ children }: { children: ReactNode }) {
  await connection();
  return children;
}

export function RequestTimeRender({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <WaitForRequest>{children}</WaitForRequest>
    </Suspense>
  );
}
