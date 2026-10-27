"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dbBatch, dbGet, dbRun } from "@/lib/db";
import { hashPassword, verifyPassword, validatePasswordStrength } from "@/lib/password";
import { getSession, requireAdmin } from "@/lib/session";
import { changePasswordSchema, fieldErrors } from "@/lib/validation";
import type { PasswordState } from "@/lib/forms";

export async function updateMessageStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!id || !["new", "read", "archived"].includes(status)) {
    redirect("/admin/messages?error=invalid");
  }

  try {
    await dbRun("UPDATE contact_messages SET status = ? WHERE id = ?", [status, id]);
  } catch (error) {
    console.error("Failed to update contact message.", error);
    redirect("/admin/messages?error=update");
  }

  revalidatePath("/admin/messages");
  revalidatePath("/admin");
  redirect("/admin/messages?updated=1");
}

export async function deleteMessageAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/messages?error=invalid");

  try {
    await dbRun("DELETE FROM contact_messages WHERE id = ?", [id]);
  } catch (error) {
    console.error("Failed to delete contact message.", error);
    redirect("/admin/messages?error=delete");
  }

  revalidatePath("/admin/messages");
  revalidatePath("/admin");
  redirect("/admin/messages?deleted=1");
}

export async function updateReportStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!id || !["open", "resolved"].includes(status)) {
    redirect("/admin/reports?error=invalid");
  }

  try {
    await dbRun("UPDATE job_reports SET status = ? WHERE id = ?", [status, id]);
  } catch (error) {
    console.error("Failed to update job report.", error);
    redirect("/admin/reports?error=update");
  }

  revalidatePath("/admin/reports");
  revalidatePath("/admin");
  redirect("/admin/reports?updated=1");
}

export async function deleteReportAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/reports?error=invalid");

  try {
    await dbRun("DELETE FROM job_reports WHERE id = ?", [id]);
  } catch (error) {
    console.error("Failed to delete job report.", error);
    redirect("/admin/reports?error=delete");
  }

  revalidatePath("/admin/reports");
  revalidatePath("/admin");
  redirect("/admin/reports?deleted=1");
}

export async function changePasswordAction(
  _previousState: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const session = await getSession();
  if (!session) {
    return {
      ok: false,
      message: "Your session has expired. Please sign in again.",
      errors: {},
    };
  }

  const parsed = changePasswordSchema.safeParse({
    current_password: formData.get("current_password"),
    new_password: formData.get("new_password"),
    confirm_password: formData.get("confirm_password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      errors: fieldErrors(parsed.error),
    };
  }

  const strength = validatePasswordStrength(parsed.data.new_password);
  if (strength) {
    return {
      ok: false,
      message: "Choose a stronger password.",
      errors: { new_password: strength },
    };
  }

  const admin = await dbGet<{ password_hash: string }>(
    "SELECT password_hash FROM admins WHERE id = ?",
    [session.id],
  );

  if (!admin || !verifyPassword(parsed.data.current_password, admin.password_hash)) {
    return {
      ok: false,
      message: "Your current password is incorrect.",
      errors: { current_password: "Your current password is incorrect." },
    };
  }

  try {
    await dbBatch([
      {
        sql: "UPDATE admins SET password_hash = ?, updated_at = ? WHERE id = ?",
        args: [hashPassword(parsed.data.new_password), new Date().toISOString(), session.id],
      },
      // Sign out every other session; keep the current one active.
      {
        sql: "DELETE FROM sessions WHERE admin_id = ? AND id != ?",
        args: [session.id, session.sessionId],
      },
    ]);
  } catch (error) {
    console.error("Failed to change password.", error);
    return {
      ok: false,
      message: "Your password could not be updated. Please try again.",
      errors: {},
    };
  }

  revalidatePath("/admin/account");
  return {
    ok: true,
    message: "Your password has been updated. Other sessions have been signed out.",
    errors: {},
  };
}
