import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@db": path.resolve(__dirname, "./db"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React runtime
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/") || id.includes("node_modules/react-router")) {
            return "vendor-react";
          }
          // Data layer
          if (id.includes("@tanstack/react-query")) return "vendor-query";
          if (id.includes("@supabase/")) return "vendor-supabase";
          // NOTE: recharts and its transitive deps (d3-*, victory-vendor, etc.) are intentionally
          // NOT manually chunked here. They have circular imports that cause TDZ crashes
          // ("Cannot access 'X' before initialization") when forced into a single chunk.
          // Rollup handles their ordering correctly when left to auto-chunk.
          // Animation
          if (id.includes("node_modules/framer-motion")) return "vendor-motion";
          // Date utilities
          if (id.includes("node_modules/date-fns")) return "vendor-date";
          // PDF / export — must stay lazy, never in core bundle
          if (id.includes("node_modules/jspdf")) return "vendor-pdf";
          if (id.includes("node_modules/jszip")) return "vendor-zip";
          // Markdown rendering — lazy-loaded
          if (id.includes("node_modules/react-markdown") || id.includes("node_modules/remark-") || id.includes("node_modules/rehype-") || id.includes("node_modules/unified") || id.includes("node_modules/mdast") || id.includes("node_modules/micromark")) {
            return "vendor-markdown";
          }
          // Social icons — only used in a few pages
          if (id.includes("node_modules/react-icons")) return "vendor-icons";
          // DOMPurify — inbox only
          if (id.includes("node_modules/dompurify")) return "vendor-sanitize";
          // Radix UI primitives
          if (id.includes("node_modules/@radix-ui/")) return "vendor-ui";
          // Forms
          if (id.includes("node_modules/react-hook-form") || id.includes("node_modules/@hookform/") || id.includes("node_modules/zod")) {
            return "vendor-forms";
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
    sourcemap: false,
    target: "es2020",
    cssMinify: true,
  },
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
}));
