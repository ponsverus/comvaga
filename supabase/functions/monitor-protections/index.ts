import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPPORT_EMAIL = "suporte@comvaga.com.br";
const RULE_LABELS: Record<string, string> = {
  billing_worker_transport_timeout: "Chamada do worker de cobrança expirou no pg_net",
  billing_worker_http_error: "Worker de cobrança respondeu com erro HTTP",
  billing_worker_no_http_result: "Chamada do worker de cobrança sem resposta HTTP",
  billing_worker_unconfirmed: "Worker de cobrança respondeu, mas deixou de registrar o término",
  billing_event_dead_letter: "Evento de cobrança esgotou 8 tentativas",
  provider_sync_failed: "Sincronia da assinatura esgotou 8 tentativas",
  notification_error: "Falha no envio de email de aviso",
  auth_email_error: "Falha no envio de email de login",
  reactivation_pending_twice: "Retomada pendente após 2 conferências",
  cancel_pending_twice: "Cancelamento pendente após 2 conferências",
  cancel_db_sync_failed: "Asaas confirmou cancelamento; sincronia local falhou",
  reactivation_verification_unavailable: "Foi impossível verificar a retomada no Asaas em 2 tentativas",
  cancel_verification_unavailable: "Foi impossível verificar o cancelamento no Asaas em 2 tentativas",
  reactivation_failed: "Retomada encerrada sem ser finalizada; conferir causa",
  reactivation_reconciliation_failed: "Retomada: falha local de acerto em 2 tentativas",
  cancel_reconciliation_failed: "Cancelamento: falha local de acerto em 2 tentativas",
};
const SAFE_ACTIONS: Record<string, string> = {
  billing_worker_transport_timeout: "Verifique o estado final da rodada e dos eventos; nunca repita a cobrança automaticamente.",
  billing_worker_http_error: "Confira o código HTTP, os logs da rotina e os eventos pendentes antes de uma nova tentativa.",
  billing_worker_no_http_result: "Confira se a rotina rodou e o estado dos eventos; nunca repita a cobrança automaticamente.",
  billing_worker_unconfirmed: "Confira o resumo da rotina e o registro da rodada antes de uma nova tentativa.",
  reactivation_verification_unavailable: "Verifique disponibilidade e credenciais do Asaas; consulte a assinatura no painel e refaça a conferência. Nunca force o estado no banco.",
  cancel_verification_unavailable: "Verifique disponibilidade e credenciais do Asaas; confirme a assinatura no painel e refaça a conferência. Nunca force o cancelamento no banco.",
  reactivation_failed: "Confira a causa e as cobranças no Asaas; após corrigir, inicie uma nova retomada pelo fluxo próprio.",
  reactivation_reconciliation_failed: "Confira o erro no banco e o estado confirmado no Asaas; repita o acerto pelo fluxo validado, sem editar o status diretamente.",
  cancel_reconciliation_failed: "Confira o erro no banco e confirme o estado no Asaas antes de repetir o acerto pelo fluxo validado.",
  cancel_db_sync_failed: "Confirme no Asaas que a assinatura foi removida e use o acerto validado para atualizar o banco.",
};
type Occurrence = {
  occurrence_id: string;
  claim_token: string;
  email_idempotency_key: string;
  rule_code: string;
  negocio_id: string | null;
  evidence: Record<string, unknown>;
  opened_at: string;
};
function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error("missing_" + name.toLowerCase());
  return value;
}
function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function emailText(item: Occurrence): string {
  const lines = [
    "Comvaga - salvaguarda para conferência humana",
    "",
    "Motivo: " + (RULE_LABELS[item.rule_code] || item.rule_code),
    "Negócio: " + (item.negocio_id || "inaplicável"),
    "Ocorrência: " + item.occurrence_id,
    "Detectado em: " + item.opened_at,
    ...(SAFE_ACTIONS[item.rule_code] ? ["Medida segura: " + SAFE_ACTIONS[item.rule_code]] : []),
  ];
  for (const [key, value] of Object.entries(item.evidence || {})) {
    if (value !== null && value !== undefined && value !== "") {
      lines.push(key + ": " + String(value).slice(0, 200));
    }
  }
  lines.push("", "Conferir a ocorrência e os registros de origem antes de qualquer medida.");
  return lines.join("\n");
}
function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  return String(error);
}
function hasErrors(errors: unknown): boolean {
  if (!errors) return false;
  if (Array.isArray(errors)) return errors.length > 0;
  if (typeof errors === "string") return errors.trim().length > 0;
  if (typeof errors === "object") return Object.keys(errors).length > 0;
  return Boolean(errors);
}
async function sendAlert(item: Occurrence): Promise<string> {
  if (!item.email_idempotency_key) throw new Error('monitor_idempotency_key_missing');
  const body = {
    app_id: requiredEnv("ONESIGNAL_APP_ID"),
    email_to: [SUPPORT_EMAIL],
    email_subject: "[Comvaga] Salvaguarda requer conferência: " +
      (RULE_LABELS[item.rule_code] || item.rule_code),
    email_preheader: "Ocorrência " + item.occurrence_id,
    email_body: "<pre style=\"font:14px/1.5 sans-serif;white-space:pre-wrap\">" +
      escapeHtml(emailText(item)) + "</pre>",
    include_unsubscribed: true,
    disable_email_click_tracking: true,
    idempotency_key: item.email_idempotency_key,
  };
  const response = await fetch("https://api.onesignal.com/notifications?c=email", {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: "Key " + requiredEnv("ONESIGNAL_API_KEY"),
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const result = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok || hasErrors(result.errors) || typeof result.id !== "string" || !result.id) {
    throw new Error("onesignal_rejected_" + response.status + ": " +
      JSON.stringify(result.errors || result).slice(0, 300));
  }
  return result.id;
}
Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  const workerSecret = request.headers.get("x-billing-worker-secret")?.trim() || "";
  if (!workerSecret) return new Response("Unauthorized", { status: 401 });
  try {
    const admin = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let accepted = 0;
    let failed = 0;
    for (let index = 0; index < 10; index++) {
      const { data: item, error: claimError } = await admin.rpc("claim_monitor_email", {
        p_worker_secret: workerSecret,
      }).maybeSingle();
      if (claimError) {
        if (claimError.message?.includes("invalid_worker_secret")) {
          return new Response("Unauthorized", { status: 401 });
        }
        throw claimError;
      }
      if (!item) break;
      const occurrence = item as Occurrence;
      let providerId: string | null = null;
      let sendError: string | null = null;
      try {
        providerId = await sendAlert(occurrence);
        accepted++;
      } catch (error) {
        sendError = errorMessage(error).slice(0, 500);
        failed++;
      }
      const { data: finished, error: finishError } = await admin.rpc("finish_monitor_email", {
        p_occurrence_id: occurrence.occurrence_id,
        p_claim_token: occurrence.claim_token,
        p_provider_id: providerId,
        p_error: sendError,
      });
      if (finishError || !finished) {
        throw new Error("monitor_email_finish_failed: " + errorMessage(finishError || "claim_expired"));
      }
    }
    return Response.json({ accepted, failed });
  } catch (error) {
    console.error("monitor protection dispatch failed:", errorMessage(error));
    return Response.json({ error: "monitor_dispatch_failed" }, { status: 500 });
  }
});
