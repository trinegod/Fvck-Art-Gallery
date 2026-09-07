import WorldLoadingScreen from "./components/world-loading-screen";

/** Root fallback for route segments without a more specific skeleton. */
export default function Loading() {
  return <WorldLoadingScreen label="Opening NODEINE…" showWordmark />;
}
