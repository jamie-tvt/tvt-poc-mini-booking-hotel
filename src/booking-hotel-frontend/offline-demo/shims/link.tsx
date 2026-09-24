/** Thay next/link: <a href="#/đường-dẫn"> + điều hướng phía client. */
import { forwardRef, type AnchorHTMLAttributes, type MouseEvent } from "react";
import { navigate } from "./navigation";

type Href = string | { pathname?: string; query?: Record<string, string | number | undefined> };

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: Href;
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean | null;
};

function toHref(href: Href): string {
  if (typeof href === "string") return href;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(href.query ?? {})) if (v !== undefined) qs.set(k, String(v));
  const s = qs.toString();
  return `${href.pathname ?? "/"}${s ? `?${s}` : ""}`;
}

const Link = forwardRef<HTMLAnchorElement, Props>(function Link(
  { href, replace, scroll, prefetch: _prefetch, onClick, target, ...rest },
  ref,
) {
  const url = toHref(href);
  const external = /^(https?:|mailto:|tel:)/.test(url);
  const inPage = url.startsWith("#");
  const shown = external || inPage ? url : `#${url}`;

  function handle(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented || external || inPage || target === "_blank") return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    navigate(url, { replace, scroll });
  }

  return <a ref={ref} href={shown} target={target} onClick={handle} {...rest} />;
});

export default Link;
