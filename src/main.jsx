import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/styles/globals.css";
import Router from "./router.jsx";
import { Toaster } from "@/components/ui/toaster";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Router />
    <Toaster />
  </StrictMode>
);
