"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useSignUp } from "./SignUpProvider";

interface AuthProductLinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
}

export default function AuthProductLink({ href, className, children }: AuthProductLinkProps) {
  const { data: session } = useSession();
  const { openModal } = useSignUp();

  function handleClick(e: React.MouseEvent) {
    if (!session) {
      e.preventDefault();
      openModal();
    }
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
