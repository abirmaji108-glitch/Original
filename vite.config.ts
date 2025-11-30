import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // ✅ Plugin to create _redirects file after build
    {
      name: "create-redirects",
      closeBundle() {
        const fs = require("fs");
        const path = require("path");
        const distPath = path.resolve(__dirname, "dist");
        const redirectsPath = path.join(distPath, "_redirects");
        const content = "/*    /index.html   200";
        
        try {
          if (!fs.existsSync(distPath)) {
            fs.mkdirSync(distPath, { recursive: true });
          }
          fs.writeFileSync(redirectsPath, content);
          console.log("✅ _redirects file created successfully!");
        } catch (error) {
          console.error("❌ Error creating _redirects:", error);
        }
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
}));
