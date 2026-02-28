import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*.png"],
      manifest: {
        name: "Trail Safe",
        short_name: "TrailSafe",
        description: "Hike safety & emergency dispatch",
        theme_color: "#16A34A",
        background_color: "#F0FDF4",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        runtimeCaching: [
          { urlPattern: /^https:\/\/firestore\.googleapis\.com/, handler: "NetworkFirst" }
        ]
      }
    })
  ],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
