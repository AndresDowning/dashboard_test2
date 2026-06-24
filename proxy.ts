import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Convención "proxy" de Next.js 16 (antes "middleware").
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Excluye estáticos e imágenes; corre en todo lo demás.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
