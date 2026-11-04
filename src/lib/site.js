// Base path used by GitHub Pages (the repo name). Defined once in next.config.mjs.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
/** Resolve a file inside /public to a URL that works on GitHub Pages. */
export const asset = (file) => `${BASE_PATH}/${String(file).replace(/^\/+/, "")}`;
