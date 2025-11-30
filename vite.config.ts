import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { writeFileSync, mkdirSync, existsSync } from "fs";

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
        const distPath = "./dist";
        const redirectsPath = "./dist/_redirects";
        const content = "/*    /index.html   200";
        
        try {
          if (!existsSync(distPath)) {
            mkdirSync(distPath, { recursive: true });
          }
          writeFileSync(redirectsPath, content);
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
