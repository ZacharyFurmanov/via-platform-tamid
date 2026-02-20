"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSignUp } from "./SignUpProvider";

interface AuthProductLinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
}

export default function AuthProductLink({ href, className, children }: AuthProductLinkProps) {
  const { data: session } = useSession();
  const { openModal } = useSignUp();
  const router = useRouter();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (session) {
      router.push(href);
    } else {
      openModal(href);
    }
  }

  return (
    <a href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}
