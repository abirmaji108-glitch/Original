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
    // ✅ Your custom redirects plugin (KEPT!)
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
    // 🚀 Performance optimizations (using esbuild, not terser)
    target: 'esnext',
    minify: 'esbuild', // ✅ Changed to esbuild (built-in, no extra install)
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-toast'],
          'chart-vendor': ['recharts'],
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@radix-ui/react-dialog',
      'recharts',
    ],
  },
}));
