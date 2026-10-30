import type { ReactNode } from "react";
import type { Location } from "react-router-dom";

/**
 * PageTransition — wraps route content.
 *
 * It deliberately does NOT re-key or animate the route container. Re-keying
 * unmounted and rebuilt the whole page on every section change, and the
 * container-level fade replayed on top of it — together they read as a full
 * browser refresh on every navigation. Navigation is now a plain swap; pages
 * keep their own local animations.
 */
const PageTransition = ({
  children,
}: {
  children: ReactNode;
  location?: Location;
}) => {
  return <>{children}</>;
};

export default PageTransition;
