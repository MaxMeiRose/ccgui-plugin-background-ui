import { defineConfig } from "vite";
import { resolve } from "node:path";

/**
 * CC GUI 从仓库根目录加载插件。构建时直接生成 main.js / styles.css，
 * manifest.json 保持与二者同级，便于本地安装和 Release 上传。
 */
export default defineConfig({
  esbuild: {
    jsx: "transform",
    jsxFactory: "React.createElement",
    jsxFragment: "React.Fragment",
  },
  build: {
    outDir: ".",
    emptyOutDir: false,
    cssCodeSplit: false,
    lib: {
      entry: resolve(__dirname, "src/index.tsx"),
      formats: ["es"],
      fileName: () => "main.js",
    },
    rollupOptions: {
      external: [],
      output: {
        inlineDynamicImports: true,
        entryFileNames: "main.js",
        assetFileNames: (asset) =>
          asset.name?.endsWith(".css") ? "styles.css" : (asset.name ?? "asset"),
      },
    },
  },
});
