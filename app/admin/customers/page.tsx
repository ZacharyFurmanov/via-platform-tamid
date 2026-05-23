import { Suspense } from "react";
import CustomersClient from "./CustomersClient";

export default function CustomersPage() {
 return (
 <Suspense fallback={null}>
 <CustomersClient />
 </Suspense>
 );
}
