import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
import { getCorsHeaders, jsonResponse } from '../_shared/cors.ts';

type AuthHookPayload = {
  user?: {
    id?: string;
    email?: string;
    new_email?: string;
  };
  email_data?: {
    token?: string;
    token_hash?: string;
    redirect_to?: string;
    email_action_type?: string;
    site_url?: string;
    token_new?: string;
    token_hash_new?: string;
    old_email?: string;
    provider?: string;
    factor_type?: string;
  };
};

type EmailMessage = {
  to: string;
  action: string;
  subject: string;
  preheader: string;
  html: string;
  dedupeKey?: string;
};

const ONESIGNAL_EMAIL_ENDPOINT = 'https://onesignal.com/api/v1/notifications';
const DEFAULT_FROM_NAME = 'Comvaga';

function requiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

function optionalEnv(name: string) {
  return Deno.env.get(name)?.trim() || null;
}

function hookSecret() {
  return requiredEnv('SEND_EMAIL_HOOK_SECRET').replace(/^v1,whsec_/, '');
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function providerErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || fallback);
  }
  return fallback;
}

function verifyTypeFor(action: string) {
  if (action === 'signup' || action === 'email') return 'email';
  if (action === 'email_change_new') return 'email_change';
  if (['recovery', 'magiclink', 'invite', 'email_change'].includes(action)) return action;
  return action || 'email';
}

function buildVerifyUrl(emailData: NonNullable<AuthHookPayload['email_data']>, action: string, tokenHash: string) {
  const supabaseUrl = optionalEnv('SUPABASE_URL') || text(emailData.site_url);
  if (!supabaseUrl) throw new Error('missing_supabase_url');
  const redirectTo = text(emailData.redirect_to);
  const url = new URL('/auth/v1/verify', supabaseUrl);
  url.searchParams.set('token', tokenHash);
  url.searchParams.set('type', verifyTypeFor(action));
  if (redirectTo) url.searchParams.set('redirect_to', redirectTo);
  return url.toString();
}

function button(label: string, href: string) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr>
        <td style="border-radius:6px;background:#111827;">
          <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 18px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>
  `;
}

function authEmailHtml(title: string, body: string, actionLabel: string | null, actionUrl: string | null, code?: string) {
  const safeUrl = actionUrl ? escapeHtml(actionUrl) : '';
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;">
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 18px;font-size:14px;font-weight:700;color:#111827;">Comvaga</p>
                <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;color:#111827;">${escapeHtml(title)}</h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">${escapeHtml(body)}</p>
                ${code ? `<p style="margin:22px 0;font-size:28px;letter-spacing:4px;font-weight:700;color:#111827;">${escapeHtml(code)}</p>` : ''}
                ${actionLabel && actionUrl ? button(actionLabel, actionUrl) : ''}
                ${actionUrl ? `<p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#6b7280;">Clique ou copie e cole este link no navegador:<br><a href="${safeUrl}" style="color:#2563eb;word-break:break-all;">${safeUrl}</a></p>` : ''}
                <p style="margin:26px 0 0;font-size:12px;line-height:1.5;color:#6b7280;">Este e-mail foi enviado para autenticar sua conta na Comvaga.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function notificationHtml(title: string, body: string) {
  return authEmailHtml(title, body, null, null);
}

function withDedupe(message: EmailMessage, value: string) {
  return { ...message, dedupeKey: value || crypto.randomUUID() };
}

async function uuidFromText(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes.slice(0, 16), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function messageForAction(
  emailData: NonNullable<AuthHookPayload['email_data']>,
  to: string,
  action: string,
  tokenHash: string,
  token: string,
): EmailMessage {
  const url = tokenHash ? buildVerifyUrl(emailData, action, tokenHash) : null;

  if (action === 'signup' || action === 'email') {
    return {
      to,
      action,
      subject: 'Confirme seu e-mail no Comvaga',
      preheader: 'Confirme seu cadastro para acessar sua conta.',
      html: authEmailHtml(
        'Confirme seu e-mail',
        'Clique no link abaixo para confirmar seu cadastro e acessar sua conta.',
        'Confirmar e-mail',
        url,
        token,
      ),
    };
  }

  if (action === 'recovery') {
    return {
      to,
      action,
      subject: 'Redefina sua senha na Comvaga',
      preheader: 'Use este link para criar uma nova senha.',
      html: authEmailHtml(
        'Redefina sua senha',
        'Recebemos seu pedido para redefinir sua senha. Se foi você, clique no link abaixo. Caso contrário, pode ignorar esta mensagem.',
        'Redefinir senha',
        url,
        token,
      ),
    };
  }

  if (action === 'magiclink') {
    return {
      to,
      action,
      subject: 'Seu link de acesso ao Comvaga',
      preheader: 'Use este link ou código para acessar sua conta.',
      html: authEmailHtml(
        'Acesse sua conta',
        'Use o link abaixo para entrar na sua conta. Este link é de uso único.',
        'Entrar no Comvaga',
        url,
        token,
      ),
    };
  }

  if (action === 'invite') {
    return {
      to,
      action,
      subject: 'Você foi convidado para o Comvaga',
      preheader: 'Aceite o convite para criar sua conta.',
      html: authEmailHtml(
        'Aceite seu convite',
        'Você recebeu um convite para acessar o Comvaga. Clique no link abaixo para continuar.',
        'Aceitar convite',
        url,
        token,
      ),
    };
  }

  if (action === 'email_change') {
    return {
      to,
      action,
      subject: 'Confirme seu e-mail',
      preheader: 'Confirme que você solicitou a troca do e-mail da conta.',
      html: authEmailHtml(
        'Confirme a troca de e-mail',
        'Para concluir a troca de e-mail da sua conta, clique no link abaixo.',
        'Confirmar',
        url,
        token,
      ),
    };
  }

  if (action === 'email_change_new') {
    return {
      to,
      action,
      subject: 'Confirme seu novo e-mail',
      preheader: 'Confirme o novo e-mail da sua conta Comvaga.',
      html: authEmailHtml(
        'Confirme seu novo e-mail',
        'Para concluir a troca de e-mail da sua conta, clique no link abaixo.',
        'Confirmar novo e-mail',
        url,
        token,
      ),
    };
  }

  if (action === 'reauthentication') {
    return {
      to,
      action,
      subject: `${token || 'Codigo'} é seu código de acesso`,
      preheader: 'Use este código para confirmar sua identidade.',
      html: authEmailHtml(
        'Código de acesso',
        'Use o código abaixo para confirmar sua identidade no Comvaga.',
        null,
        null,
        token,
      ),
    };
  }

  const notificationSubjects: Record<string, string> = {
    password_changed_notification: 'Sua senha foi alterada',
    email_changed_notification: 'Seu e-mail foi alterado',
    phone_changed_notification: 'Seu telefone foi alterado',
    identity_linked_notification: 'Um método de acesso foi vinculado',
    identity_unlinked_notification: 'Um método de acesso foi removido',
    mfa_factor_enrolled_notification: 'Uma nova etapa de acesso foi adicionada.',
    mfa_factor_unenrolled_notification: 'Uma etapa de acesso foi removida.',
  };

  const subject = notificationSubjects[action] || 'Importante: novos ajustes aplicados à sua conta';
  return {
    to,
    action,
    subject,
    preheader: 'Informamos sobre novos ajustes na sua conta Comvaga.',
    html: notificationHtml(subject, 'Comunicamos um novo ajuste no seu perfil. Se isso é estranho para você, troque sua senha imediatamente.'),
  };
}

function buildMessages(payload: AuthHookPayload) {
  const user = payload.user || {};
  const emailData = payload.email_data || {};
  const action = text(emailData.email_action_type);
  const currentEmail = text(user.email);
  const newEmail = text(user.new_email);
  const token = text(emailData.token);
  const tokenHash = text(emailData.token_hash);
  const tokenNew = text(emailData.token_new);
  const tokenHashNew = text(emailData.token_hash_new);

  if (!action) throw new Error('missing_email_action_type');

  if (action === 'email_change') {
    const messages: EmailMessage[] = [];

    if (currentEmail && token && tokenHashNew) {
      messages.push(withDedupe(messageForAction(emailData, currentEmail, 'email_change', tokenHashNew, token), tokenHashNew || token));
    }

    if (newEmail && tokenNew && tokenHash) {
      messages.push(withDedupe(messageForAction(emailData, newEmail, 'email_change_new', tokenHash, tokenNew), tokenHash || tokenNew));
    }

    if (!messages.length && newEmail && tokenHash) {
      messages.push(withDedupe(messageForAction(emailData, newEmail, 'email_change_new', tokenHash, token || tokenNew), tokenHash || token || tokenNew));
    }

    if (!messages.length) throw new Error('missing_email_change_fields');
    return messages;
  }

  const recipient = newEmail && action === 'email_change_new' ? newEmail : currentEmail;
  if (!recipient) throw new Error('missing_recipient_email');

  return [withDedupe(messageForAction(emailData, recipient, action, tokenHash || tokenHashNew, token || tokenNew), tokenHash || tokenHashNew || token || tokenNew)];
}

async function sendWithOneSignal(message: EmailMessage, _idempotencyKey: string) {
  const appId = requiredEnv('ONESIGNAL_APP_ID');
  const apiKey = requiredEnv('ONESIGNAL_API_KEY');

  if (!isEmail(message.to)) throw new Error('invalid_recipient_email');

  const body = {
    app_id: appId,
    include_email_tokens: [message.to],
    email_subject: message.subject,
    email_body: message.html,
    disable_email_click_tracking: true,
  };

  const response = await fetch(ONESIGNAL_EMAIL_ENDPOINT, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: `Key ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text().catch(() => '');
  let notificationId: unknown = null;
  let oneSignalErrors: unknown = null;
  try {
    const responseBody = responseText ? JSON.parse(responseText) as Record<string, unknown> : {};
    notificationId = responseBody.id || null;
    oneSignalErrors = responseBody.errors || null;
  } catch {
    notificationId = null;
    oneSignalErrors = null;
  }

  if (!response.ok || oneSignalErrors) {
    console.error('onesignal auth email failed:', {
      action: message.action,
      status: response.status,
      hasErrors: Boolean(oneSignalErrors),
    });
    throw new Error(`onesignal_email_failed_${response.status}`);
  }

  console.info('onesignal auth email sent:', {
    action: message.action,
    notificationId,
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(req) });
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405, req);

  try {
    const payloadText = await req.text();
    const headers = Object.fromEntries(req.headers);
    const webhook = new Webhook(hookSecret());
    let payload: AuthHookPayload;
    try {
      payload = webhook.verify(payloadText, headers) as AuthHookPayload;
    } catch {
      console.error('auth-send-email-onesignal invalid signature');
      return jsonResponse({
        error: {
          http_code: 401,
          message: 'Assinatura inválida.',
        },
      }, 401, req);
    }
    const messages = buildMessages(payload);
    const userId = text(payload.user?.id) || crypto.randomUUID();
    const action = text(payload.email_data?.email_action_type) || 'auth';

    await Promise.all(messages.map(async (message, index) => {
      const idempotencyKey = await uuidFromText(`${userId}:${action}:${index}:${message.dedupeKey || crypto.randomUUID()}`);
      return sendWithOneSignal(message, idempotencyKey);
    }));

    return jsonResponse({}, 200, req);
  } catch (error) {
    console.error('auth-send-email-onesignal failed:', providerErrorMessage(error, 'auth_email_failed'));
    return jsonResponse({
      error: {
        http_code: 500,
        message: 'Ocorreu um problema no envio da mensagem de acesso.',
      },
    }, 500, req);
  }
});
