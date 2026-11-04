// Base path used by GitHub Pages (repo name). Keep in sync with next.config.mjs.
export const BASE_PATH = "/souvik-mandol";
/** Resolve a file inside /public to a URL that works on GitHub Pages. */
export const asset = (file) => `${BASE_PATH}/${String(file).replace(/^\/+/, "")}`;
