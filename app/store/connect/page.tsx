import { redirect } from "next/navigation";

// Merged into the single "Connect store" page.
export default function ConnectRedirect() {
 redirect("/store/import");
}
