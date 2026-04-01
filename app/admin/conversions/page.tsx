import { Suspense } from "react";
import ConversionsClient from "./ConversionsClient";

export default function ConversionsPage() {
  return (
    <Suspense fallback={null}>
      <ConversionsClient />
    </Suspense>
  );
}
