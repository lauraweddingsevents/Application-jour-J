import type { Metadata } from "next";
import { Coquille } from "@/components/Coquille";
import { Administration } from "./Administration";

export const metadata: Metadata = { title: "Administration" };

export default function PageAdmin() {
  return (
    <Coquille admin>
      <Administration />
    </Coquille>
  );
}
