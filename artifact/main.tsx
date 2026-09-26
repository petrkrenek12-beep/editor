// Vstupní bod pro samostatnou verzi (živá ukázka bez serveru)
import React from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";

createRoot(document.getElementById("root")!).render(<App />);
