"use server";

import * as XLSX from "xlsx";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAIL } from "@/lib/constants";

// Verifica que quien ejecuta la acción es el admin. Devuelve el cliente admin.
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect("/login");
  return createAdminClient();
}

function back(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  redirect(`/admin?${qs}`);
}

// ── Crear un usuario nuevo ──────────────────────────────────────────────────
export async function createUser(formData: FormData) {
  const admin = await requireAdmin();

  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const fullName = (formData.get("full_name") as string)?.trim();

  if (!email || !password) back({ error: "Email y contraseña son obligatorios." });

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // sin confirmación de email en la demo
    user_metadata: { full_name: fullName || null },
  });

  if (error) back({ error: error.message });

  revalidatePath("/admin");
  back({ ok: `Usuario ${email} creado.` });
}

// ── Subir un documento para un usuario ──────────────────────────────────────
export async function uploadDocument(formData: FormData) {
  const admin = await requireAdmin();

  const ownerId = formData.get("owner_id") as string;
  const file = formData.get("file") as File | null;

  if (!ownerId) back({ error: "Elige a qué usuario subirle el documento." });
  if (!file || file.size === 0) back({ error: "Selecciona un archivo." });

  const safeName = file!.name.replace(/[^\w.\-]+/g, "_");
  const path = `${ownerId}/${Date.now()}-${safeName}`;

  const { error: upErr } = await admin.storage
    .from("documents")
    .upload(path, file!, {
      contentType: file!.type || "application/octet-stream",
      upsert: false,
    });
  if (upErr) back({ error: `Error subiendo el archivo: ${upErr.message}` });

  const { error: dbErr } = await admin.from("documents").insert({
    owner_id: ownerId,
    file_path: path,
    file_name: file!.name,
  });
  if (dbErr) {
    // Limpia el archivo huérfano si falla el registro.
    await admin.storage.from("documents").remove([path]);
    back({ error: `Error guardando el registro: ${dbErr.message}` });
  }

  revalidatePath("/admin");
  back({ ok: `Documento "${file!.name}" subido.` });
}

// ── Subir un Excel de métricas para un usuario ──────────────────────────────
export async function uploadMetrics(formData: FormData) {
  const admin = await requireAdmin();

  const ownerId = formData.get("owner_id") as string;
  const file = formData.get("file") as File | null;

  if (!ownerId) back({ error: "Elige a qué usuario subirle las métricas." });
  if (!file || file.size === 0) back({ error: "Selecciona un archivo Excel." });

  // Parseamos el Excel a {headers, rows}. Ojo: redirect() lanza una excepción,
  // por eso solo llamamos a back() FUERA del try (si no, el catch lo atraparía).
  let headers: string[] = [];
  let rows: (string | number)[][] = [];
  let parseError = "";
  try {
    const buf = Buffer.from(await file!.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    const sheet = sheetName ? wb.Sheets[sheetName] : null;
    if (!sheet) {
      parseError = "El Excel no tiene ninguna hoja.";
    } else {
      const aoa = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        blankrows: false,
      }) as (string | number)[][];
      if (aoa.length === 0) {
        parseError = "El Excel está vacío.";
      } else {
        headers = (aoa[0] ?? []).map((h) => String(h ?? ""));
        rows = aoa
          .slice(1)
          .filter((r) => r.some((c) => c !== "" && c !== null && c !== undefined));
      }
    }
  } catch (e) {
    parseError = (e as Error).message;
  }
  if (parseError) back({ error: `No pude leer el Excel: ${parseError}` });

  const { error: dbErr } = await admin.from("metrics").insert({
    owner_id: ownerId,
    source_name: file!.name,
    headers,
    rows,
  });
  if (dbErr) back({ error: `Error guardando las métricas: ${dbErr.message}` });

  revalidatePath("/admin");
  back({ ok: `Métricas de "${file!.name}" subidas (${rows.length} filas).` });
}

// ── Borrar un conjunto de métricas ──────────────────────────────────────────
export async function deleteMetrics(formData: FormData) {
  const admin = await requireAdmin();
  const id = formData.get("id") as string;
  if (!id) back({ error: "Falta el id de las métricas." });

  const { error } = await admin.from("metrics").delete().eq("id", id);
  if (error) back({ error: `No pude borrar: ${error.message}` });

  revalidatePath("/admin");
  back({ ok: "Métricas borradas." });
}
