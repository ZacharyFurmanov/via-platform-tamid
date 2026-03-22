"use client";

import Link from "next/link";
import type { ReactNode, MouseEvent } from "react";
import { trackStoreClick } from "@/app/lib/firebase-analytics";

type TrackedStoreLinkProps = {
  href: string;
  storeSlug: string;
  storeName: string;
  surface: string;
  className?: string;
  children: ReactNode;
  target?: string;
  rel?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export default function TrackedStoreLink({
  href,
  storeSlug,
  storeName,
  surface,
  className,
  children,
  target,
  rel,
  onClick,
}: TrackedStoreLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    trackStoreClick({
      storeSlug,
      storeName,
      surface,
      destinationPath: href,
    });
    onClick?.(event);
  };

  return (
    <Link
      href={href}
      className={className}
      target={target}
      rel={rel}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
}
