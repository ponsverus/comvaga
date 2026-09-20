import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID') ?? '';
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY') ?? '';
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function formatDateBR(raw: unknown): string {
  const s = String(raw ?? '');
  const [y, m, d] = s.slice(0, 10).split('-');
  if (!y || !m || !d) return s;
  return `${d}.${m}.${y}`;
}

function formatBRL(value: unknown): string {
  return Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const DARK_300 = '#000000';
const DARK_200 = '#0d0d0d';
const BORDER = '#1f2937';
const PRIMARY = '#FFD700';
const FONT_STACK = "'Roboto Condensed', -apple-system, 'Segoe UI', Roboto, sans-serif";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function baseLayout(accentColor: string, headerTitle: string, headerSub: string, badgeText: string, body: string): string {
  const safeHeaderTitle = escapeHtml(headerTitle);
  const safeHeaderSub = escapeHtml(headerSub);
  const safeBadgeText = escapeHtml(badgeText);

  return `<div style="font-family:${FONT_STACK};max-width:480px;margin:0 auto;background:${DARK_300};color:#fff;border-radius:3px;overflow:hidden;border:1px solid ${BORDER}">` +
    `<div style="background:${accentColor};padding:20px 24px">` +
    `<table role="presentation" style="width:100%;border-collapse:collapse"><tr>` +
    `<td style="vertical-align:middle"><h1 style="margin:0;font-size:18px;color:#000;font-weight:700;letter-spacing:0.3px">${safeHeaderTitle}</h1>` +
    `<p style="margin:2px 0 0;font-size:12px;color:#000;opacity:0.7;text-transform:uppercase">${safeHeaderSub}</p></td>` +
    `<td style="text-align:right;vertical-align:middle;white-space:nowrap">` +
    `<span style="display:inline-block;padding:4px 12px;border-radius:9999px;font-size:11px;font-weight:700;letter-spacing:0.5px;background:rgba(0,0,0,0.15);color:#000;border:1px solid rgba(0,0,0,0.3)">${safeBadgeText}</span>` +
    `</td></tr></table></div>` +
    `<div style="padding:28px 24px;background:${DARK_200}">${body}</div>` +
    `<div style="padding:14px 24px;background:${DARK_300};font-size:10px;color:#555;text-align:center;letter-spacing:1.5px">COMVAGA</div>` +
    `</div>`;
}

function strong(text: string): string {
  return `<strong style="color:${PRIMARY};font-weight:700">${escapeHtml(text)}</strong>`;
}

function paragraph(html: string): string {
  return `<p style="margin:0;font-size:15px;line-height:1.7;color:#e5e7eb">${html}</p>`;
}

function note(text: string): string {
  return `<p style="margin:18px 0 0;font-size:13px;color:#9ca3af;line-height:1.5">${escapeHtml(text)}</p>`;
}

type AgData = {
  dataBR: string;
  horario: string;
  clienteNome: string;
  profNome: string;
  entregaNome: string | null;
  negocioNome: string;
  valorStr: string;
};

async function updateNotificationState(
  supabase: ReturnType<typeof createClient>,
  logId: string | null,
  status: 'sent' | 'error',
  options: { errorMsg?: string; event?: string; agendamentoId?: string } = {}
) {
  const { errorMsg, event, agendamentoId } = options;

  if (logId) {
    await supabase
      .from('notifications_logs')
      .update({
        status,
        ...(status === 'sent' ? { sent_at: new Date().toISOString() } : {}),
        ...(errorMsg ? { error_msg: errorMsg } : {}),
      })
      .eq('id', logId);
  }

  if (status === 'sent' && event === 'lembrete_30min' && agendamentoId) {
    await supabase
      .from('agendamentos')
      .update({ lembrete_enviado: true })
      .eq('id', agendamentoId)
      .eq('lembrete_enviado', false);
  }
}

async function getEmailByUserId(supabase: ReturnType<typeof createClient>, userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null;
  const { data } = await supabase.auth.admin.getUserById(userId);
  return data?.user?.email ?? null;
}

async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; result: unknown }> {
  const res = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Key ${ONESIGNAL_API_KEY}` },
    body: JSON.stringify({ app_id: ONESIGNAL_APP_ID, email_subject: subject, email_body: html, include_email_tokens: [to] }),
  });
  const result = await res.json();
  return { ok: res.ok && !(result as Record<string, unknown>).errors?.length, result };
}

function tplNovoAgendamentoParaProfissional(d: AgData) {
  const body = paragraph(
    (d.entregaNome
      ? `Você tem um novo agendamento de ${strong(d.entregaNome)} `
      : `Você tem um novo agendamento `) +
    `com o cliente ${strong(d.clienteNome)}, marcado para o dia ${strong(d.dataBR)} às ${strong(d.horario)}. ` +
    `O valor é de ${strong(d.valorStr)}.`
  );
  return { subject: `Novo agendamento - ${d.dataBR} às ${d.horario}`, html: baseLayout(PRIMARY, 'Novo agendamento', d.negocioNome, 'NOVO', body) };
}

function tplNovoAgendamentoParaAdmin(d: AgData) {
  const body = paragraph(
    (d.entregaNome
      ? `O profissional ${strong(d.profNome)} tem um novo agendamento de ${strong(d.entregaNome)} `
      : `O profissional ${strong(d.profNome)} tem um novo agendamento `) +
    `com o cliente ${strong(d.clienteNome)}, marcado para o dia ${strong(d.dataBR)} às ${strong(d.horario)}. ` +
    `O valor é de ${strong(d.valorStr)}.`
  );
  return { subject: `Novo agendamento - ${d.dataBR} às ${d.horario}`, html: baseLayout(PRIMARY, 'Novo agendamento', d.negocioNome, 'NOVO', body) };
}

function tplCanceladoClienteParaProfissional(d: AgData) {
  const body = paragraph(
    d.entregaNome
      ? `O cliente ${strong(d.clienteNome)} cancelou o agendamento de ${strong(d.entregaNome)} que você tinha marcado para o dia ${strong(d.dataBR)} às ${strong(d.horario)}.`
      : `O cliente ${strong(d.clienteNome)} cancelou o agendamento que você tinha marcado para o dia ${strong(d.dataBR)} às ${strong(d.horario)}.`
  ) + note('O horário já está disponível novamente para novos agendamentos.');
  return { subject: `Agendamento cancelado pelo cliente - ${d.dataBR}`, html: baseLayout('#EF4444', 'Agendamento cancelado', d.negocioNome, 'CANCELADO', body) };
}

function tplCanceladoProfissional(d: AgData) {
  const body = paragraph(
    d.entregaNome
      ? `Seu agendamento de ${strong(d.entregaNome)} com ${strong(d.profNome)}, marcado para o dia ${strong(d.dataBR)} às ${strong(d.horario)}, foi cancelado pelo estabelecimento.`
      : `Seu agendamento com ${strong(d.profNome)}, marcado para o dia ${strong(d.dataBR)} às ${strong(d.horario)}, foi cancelado pelo estabelecimento.`
  ) + note('Entre em contato com o estabelecimento para reagendar, se desejar.');
  return { subject: `Seu agendamento foi cancelado - ${d.dataBR}`, html: baseLayout('#EF4444', 'Agendamento cancelado', d.negocioNome, 'CANCELADO', body) };
}

function tplLembrete(d: AgData) {
  const body = paragraph(
    d.entregaNome
      ? `Seu agendamento de ${strong(d.entregaNome)} com ${strong(d.profNome)} é hoje, dia ${strong(d.dataBR)}, às ${strong(d.horario)}.`
      : `Seu agendamento com ${strong(d.profNome)} é hoje, dia ${strong(d.dataBR)}, às ${strong(d.horario)}.`
  ) + note('Faltam aproximadamente 30 minutos. Não se atrase.');
  return { subject: `Lembrete: seu agendamento é em ${d.horario} - ${d.dataBR}`, html: baseLayout('#3B82F6', 'Lembrete de agendamento', d.negocioNome, 'LEMBRETE', body) };
}

Deno.serve(async (req: Request) => {
  const reqSecret = req.headers.get('x-webhook-secret') ?? '';
  if (!WEBHOOK_SECRET || reqSecret !== WEBHOOK_SECRET) return new Response('Unauthorized', { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return new Response('bad json', { status: 400 }); }

  const record = (body.record ?? body) as Record<string, unknown>;
  const logId = (body.log_id as string) ?? null;
  const rawEvent = (body.event as string) ?? record.status as string;
  const agendamentoId = record.id as string | undefined;

  if (!agendamentoId) return new Response('missing id', { status: 400 });

  const event = rawEvent === 'novo_agendamento' ? 'agendado' : rawEvent;
  const eventosValidos = ['agendado', 'cancelado_cliente', 'cancelado_profissional', 'lembrete_30min'];
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  if (!event || !eventosValidos.includes(event)) {
    await updateNotificationState(supabase, logId, 'error', { errorMsg: `evento_invalido:${String(rawEvent ?? '')}`, event, agendamentoId });
    return new Response('evento invalido', { status: 200 });
  }

  const { data: ag, error } = await supabase
    .from('agendamentos')
    .select(`id, data, horario_inicio, status, preco_final, entregas (nome, preco, preco_promocional), profissionais (id, nome, user_id, negocio_id), cliente:clientes!agendamentos_cliente_id_fkey (id, user_id, nome), negocios (id, owner_id, nome)`)
    .eq('id', agendamentoId)
    .single();

  if (error || !ag) {
    console.error('agendamento nao encontrado:', error);
    await updateNotificationState(supabase, logId, 'error', { errorMsg: `agendamento nao encontrado: ${error?.message ?? 'null'}`, event, agendamentoId });
    return new Response('not found', { status: 404 });
  }

  const profissional = ag.profissionais as Record<string, unknown>;
  const negocio = ag.negocios as Record<string, unknown>;
  const cliente = ag.cliente as Record<string, unknown>;
  const entrega = ag.entregas as Record<string, unknown>;

  const precoFinal = ag.preco_final == null ? null : Number(ag.preco_final);
  const valorReal = precoFinal != null && Number.isFinite(precoFinal)
    ? precoFinal
    : Number(entrega?.preco_promocional || entrega?.preco || 0);

  const entregaNomeRaw = (entrega?.nome as string | null | undefined) ?? null;

  const d: AgData = {
    dataBR: formatDateBR(ag.data),
    horario: String(ag.horario_inicio || '').slice(0, 5),
    clienteNome: (cliente?.nome as string) || 'Cliente',
    profNome: (profissional?.nome as string) || 'Profissional',
    entregaNome: entregaNomeRaw && entregaNomeRaw.trim() ? entregaNomeRaw.trim() : null,
    negocioNome: (negocio?.nome as string) || 'Negócio',
    valorStr: formatBRL(valorReal),
  };

  const profUserId = profissional?.user_id as string | null;
  const ownerUserId = negocio?.owner_id as string;
  const clienteUserId = cliente?.user_id as string | null;
  const eParceiro = !!profUserId && profUserId !== ownerUserId;

  const envios: { email: string; subject: string; html: string }[] = [];
  const erros: string[] = [];

  if (event === 'agendado') {
    if (eParceiro) {
      const emailParceiro = await getEmailByUserId(supabase, profUserId);
      if (emailParceiro) envios.push({ email: emailParceiro, ...tplNovoAgendamentoParaProfissional(d) });
      const emailAdmin = await getEmailByUserId(supabase, ownerUserId);
      if (emailAdmin) envios.push({ email: emailAdmin, ...tplNovoAgendamentoParaAdmin(d) });
    } else {
      const emailAdmin = await getEmailByUserId(supabase, ownerUserId);
      if (emailAdmin) envios.push({ email: emailAdmin, ...tplNovoAgendamentoParaProfissional(d) });
    }
  } else if (event === 'cancelado_cliente') {
    if (eParceiro) {
      const emailParceiro = await getEmailByUserId(supabase, profUserId);
      if (emailParceiro) envios.push({ email: emailParceiro, ...tplCanceladoClienteParaProfissional(d) });
    } else {
      const emailAdmin = await getEmailByUserId(supabase, ownerUserId);
      if (emailAdmin) envios.push({ email: emailAdmin, ...tplCanceladoClienteParaProfissional(d) });
    }
  } else if (event === 'cancelado_profissional') {
    const tpl = tplCanceladoProfissional(d);
    const emailCliente = await getEmailByUserId(supabase, clienteUserId);
    if (emailCliente) envios.push({ email: emailCliente, ...tpl });
  } else if (event === 'lembrete_30min') {
    const tpl = tplLembrete(d);
    const emailCliente = await getEmailByUserId(supabase, clienteUserId);
    if (emailCliente) envios.push({ email: emailCliente, ...tpl });
  }

  if (envios.length === 0) {
    console.warn('nenhum destino resolvido', agendamentoId, event);
    await updateNotificationState(supabase, logId, 'error', { errorMsg: 'nenhum e-mail destino encontrado', event, agendamentoId });
    return new Response('sem destino', { status: 200 });
  }

  for (const envio of envios) {
    const { ok, result } = await sendEmail(envio.email, envio.subject, envio.html);
    console.log('OneSignal', event, envio.email, JSON.stringify(result));
    if (!ok) erros.push(JSON.stringify((result as Record<string, unknown>).errors ?? result));
  }

  if (erros.length > 0) {
    await updateNotificationState(supabase, logId, 'error', { errorMsg: erros.join(' | '), event, agendamentoId });
  } else {
    await updateNotificationState(supabase, logId, 'sent', { event, agendamentoId });
  }

  return new Response(JSON.stringify({ ok: erros.length === 0, event, envios: envios.length }), { headers: { 'Content-Type': 'application/json' } });
});
