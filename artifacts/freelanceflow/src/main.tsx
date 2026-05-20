import { createRoot } from "react-dom/client";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

setAuthTokenGetter(async () => {
  try {
    const w = window as unknown as { Clerk?: { session?: { getToken: () => Promise<string | null> } } };
    return (await w.Clerk?.session?.getToken?.()) ?? null;
  } catch {
    return null;
  }
});

createRoot(document.getElementById("root")!).render(<App />);
