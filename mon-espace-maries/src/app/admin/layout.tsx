import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CoquilleAdmin } from "@/components/CoquilleAdmin";

export const metadata: Metadata = { title: "Administration" };

export default function LayoutAdmin({ children }: { children: ReactNode }) {
  return <CoquilleAdmin>{children}</CoquilleAdmin>;
}
