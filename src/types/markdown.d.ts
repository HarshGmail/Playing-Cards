/**
 * `.md` files are bundled as raw strings by the webpack rule in next.config.js,
 * which lets docs/ stay the single source of truth for content we also render
 * in-app. Without this declaration TypeScript rejects the import.
 */
declare module '*.md' {
  const content: string;
  export default content;
}
