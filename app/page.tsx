"use client";
import dynamic from "next/dynamic";

// Celá aplikace běží v prohlížeči (canvas, IndexedDB) – bez SSR.
const App = dynamic(() => import("@/App"), { ssr: false });

export default function Page() {
  return <App />;
}
