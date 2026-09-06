import type { Metadata } from "next";
import CreateWorkspace from "./create-workspace";

export const metadata: Metadata = {
  title: "Create — NODEINE",
  description: "Start something new or return to your private World Thread drafts.",
  robots: { index: false, follow: false },
};

export default function CreatePage() {
  return <CreateWorkspace />;
}
