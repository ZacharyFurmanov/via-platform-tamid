import type { Metadata } from "next";
import InfrastructureClient from "./InfrastructureClient";

export const metadata: Metadata = {
  title: "VYA — The infrastructure for recommerce",
  description:
    "Every other platform is built for inventory that repeats. Yours sells once and never comes back. VYA is the storefront, the listing engine, and the marketplace — built for one-of-one.",
};

export default function InfrastructurePage() {
  return <InfrastructureClient />;
}
