import { Suspense } from "react";
import SourcingClient from "./SourcingClient";

export default function SourcingPage() {
  return (
    <Suspense fallback={null}>
      <SourcingClient />
    </Suspense>
  );
}
