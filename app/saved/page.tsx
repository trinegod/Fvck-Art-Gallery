import type { Metadata } from "next";
import SavedArtworkView from "./saved-artwork-view";

export const metadata: Metadata = {
  title: "Saved Artwork — NODEINE",
  description: "Your private collection of saved artwork on NODEINE.",
};

export default function SavedPage() {
  return <SavedArtworkView />;
}
