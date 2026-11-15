import type { Metadata } from "next";
import { Administration } from "./Administration";

export const metadata: Metadata = { title: "Administration", robots: { index: false } };

export default function Page() {
  return <Administration />;
}
