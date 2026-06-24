import { redirect } from "next/navigation";

// La home solo encamina: si hay sesión, /dashboard decide (admin → /admin);
// si no, /dashboard rebota a /login.
export default function Home() {
  redirect("/dashboard");
}
