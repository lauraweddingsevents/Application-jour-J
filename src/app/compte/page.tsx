import type { Metadata } from "next";
import { Compte } from "./Compte";

export const metadata: Metadata = { title: "Mon compte" };

export default function Page() {
  return <Compte />;
}
