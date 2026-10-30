/** The app is hosted at the origin root; never read Next.js env in browser code. */
export const withBase = (path: string) => path;
