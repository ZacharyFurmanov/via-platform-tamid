import { Suspense } from "react";
import LoginErrorClient from "./LoginErrorClient";

export default function LoginErrorPage() {
 return (
 <Suspense fallback={null}>
 <LoginErrorClient />
 </Suspense>
 );
}
