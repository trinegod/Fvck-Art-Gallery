import type { Metadata } from "next";
import YourSpace from "./your-space";

export const metadata: Metadata = { title: "You — NODEINE", description: "Your saved artwork, conversations, activity, and creator profile." };

export default function YouPage() { return <YourSpace />; }
