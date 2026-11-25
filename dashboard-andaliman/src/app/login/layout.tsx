import type { ReactNode } from "react";
import { RequestTimeRender } from "@/components/RequestTimeRender";

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <RequestTimeRender>{children}</RequestTimeRender>;
}
