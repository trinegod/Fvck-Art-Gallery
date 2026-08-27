import type { Metadata } from "next";
import ForgeLab from "./forge-lab";

export const metadata: Metadata = {
  title: "Forge Lab — NODEINE",
  description:
    "Measure the visual DNA of your NODEINE artwork and translate it into an explainable creation recipe.",
};

export default function ForgePage() {
  return <ForgeLab />;
}
