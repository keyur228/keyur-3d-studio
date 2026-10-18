import { profile } from '@/data/portfolioData'

export interface AssetRequest {
  name: string
  email: string
  requestType: string
  style: string
  platform: string
  referenceLink: string
  brief: string
  budget: string
  timeline: string
}

export type SubmitResult =
  | { status: 'sent'; provider: Provider }
  | { status: 'mailto'; reason: 'not-configured' | 'provider-failed'; error?: string }
  | { status: 'cooldown'; waitSeconds: number }

type Provider = 'web3forms' | 'formspree' | 'emailjs'

const env = import.meta.env
const TARGET_EMAIL = profile.email

// -- abuse hardening --------------------------------------------------------------------
// The form key is public in any client-side form (it ships in the page), so the real limits are server-side in the Web3Forms
// dashboard. These client-side guards stop accidents, naive bots and header/format injection before a request leaves the page.
const MAX = { name: 80, email: 120, requestType: 80, style: 80, platform: 80, referenceLink: 300, brief: 3000, budget: 80, timeline: 80 } as const
const COOLDOWN_MS = 60_000
const COOLDOWN_KEY = 'keyur:last-request'
const oneLine = (v: string, max: number) => v.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
const multiLine = (v: string, max: number) =>
  v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/\r\n?/g, '\n').trim().slice(0, max)

export function sanitizeRequest(req: AssetRequest): AssetRequest {
  return {
    name: oneLine(req.name, MAX.name),
    email: oneLine(req.email, MAX.email),
    requestType: oneLine(req.requestType, MAX.requestType),
    style: oneLine(req.style, MAX.style),
    platform: oneLine(req.platform, MAX.platform),
    referenceLink: oneLine(req.referenceLink, MAX.referenceLink),
    brief: multiLine(req.brief, MAX.brief),
    budget: oneLine(req.budget, MAX.budget),
    timeline: oneLine(req.timeline, MAX.timeline),
  }
}

function cooldownRemaining() {
  try {
    const last = Number(localStorage.getItem(COOLDOWN_KEY) || 0)
    return Math.max(0, COOLDOWN_MS - (Date.now() - last))
  } catch {
    return 0
  }
}

function markSent() {
  try {
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()))
  } catch {
    /* private mode: no cooldown, the server-side limits still apply */
  }
}

export function buildSubject(req: AssetRequest) {
  return `[3D Request] ${req.requestType} — ${req.name}`
}

export function buildBody(req: AssetRequest) {
  return [
    `Hi Keyur,`,
    ``,
    `I'd like to request custom 3D work.`,
    ``,
    `— CLIENT —`,
    `Name: ${req.name}`,
    `Email: ${req.email}`,
    ``,
    `— PROJECT —`,
    `Request Type: ${req.requestType}`,
    `Target Style: ${req.style}`,
    `Platform / Polycount Target: ${req.platform}`,
    `Budget: ${req.budget}`,
    `Timeline: ${req.timeline}`,
    `Reference: ${req.referenceLink || '—'}`,
    ``,
    `— BRIEF —`,
    req.brief,
    ``,
    `Sent from the KEYUR // 3D STUDIO request form`,
  ].join('\n')
}

export function buildMailto(req: AssetRequest) {
  const subject = encodeURIComponent(buildSubject(req))
  const body = encodeURIComponent(buildBody(req))
  return `mailto:${TARGET_EMAIL}?subject=${subject}&body=${body}`
}

function configuredProvider(): Provider | null {
  const p = (env.VITE_FORM_PROVIDER || '').trim().toLowerCase()
  if (p === 'web3forms' && env.VITE_WEB3FORMS_ACCESS_KEY) return 'web3forms'
  if (p === 'formspree' && env.VITE_FORMSPREE_FORM_ID) return 'formspree'
  if (p === 'emailjs' && env.VITE_EMAILJS_SERVICE_ID && env.VITE_EMAILJS_TEMPLATE_ID && env.VITE_EMAILJS_PUBLIC_KEY) return 'emailjs'
  return null
}

export function isEmailServiceConfigured() {
  return configuredProvider() !== null
}

async function postJSON(url: string, payload: unknown) {
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), 15_000)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
      referrerPolicy: 'strict-origin-when-cross-origin',
      credentials: 'omit',
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`${res.status} ${res.statusText} ${text}`.trim())
    }
    return res
  } finally {
    window.clearTimeout(timer)
  }
}

/** Web3Forms / Formspree report some rejections as HTTP 200 with `success: false`: treat those as failures too. */
async function assertAccepted(res: Response) {
  const body = (await res.clone().json().catch(() => null)) as { success?: boolean; ok?: boolean; message?: string } | null
  if (body && (body.success === false || body.ok === false)) throw new Error(body.message || 'rejected by the form service')
  return res
}

const senders: Record<Provider, (req: AssetRequest) => Promise<unknown>> = {
  web3forms: async (req) =>
    assertAccepted(await postJSON('https://api.web3forms.com/submit', {
      access_key: env.VITE_WEB3FORMS_ACCESS_KEY,
      subject: buildSubject(req),
      from_name: req.name,
      replyto: req.email,
      email: req.email,
      request_type: req.requestType,
      style: req.style,
      platform: req.platform,
      budget: req.budget,
      timeline: req.timeline,
      reference: req.referenceLink,
      message: buildBody(req),
      botcheck: '',
    })),
  formspree: async (req) =>
    assertAccepted(
      await postJSON(`https://formspree.io/f/${env.VITE_FORMSPREE_FORM_ID}`, {
        _subject: buildSubject(req),
        _replyto: req.email,
        ...req,
        message: buildBody(req),
      }),
    ),
  emailjs: (req) =>
    postJSON('https://api.emailjs.com/api/v1.0/email/send', {
      service_id: env.VITE_EMAILJS_SERVICE_ID,
      template_id: env.VITE_EMAILJS_TEMPLATE_ID,
      user_id: env.VITE_EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email: TARGET_EMAIL,
        subject: buildSubject(req),
        from_name: req.name,
        reply_to: req.email,
        message: buildBody(req),
        ...req,
      },
    }),
}

/**
 * Dual-action submit:
 *  1. If an email service is configured via env vars, send through it.
 *  2. Otherwise (or if the service fails) open a pre-filled mailto: link.
 * `honeypot` is the value of the hidden decoy field: real visitors never fill it, so a non-empty value is dropped silently
 * (the bot is told it worked). A 60 s per-browser cooldown stops accidental double sends and trivial scripted floods.
 */
export async function submitAssetRequest(input: AssetRequest, honeypot = ''): Promise<SubmitResult> {
  const provider = configuredProvider()
  if (honeypot.trim()) return { status: 'sent', provider: provider ?? 'web3forms' }
  const wait = cooldownRemaining()
  if (wait > 0) return { status: 'cooldown', waitSeconds: Math.ceil(wait / 1000) }
  const req = sanitizeRequest(input)
  if (provider) {
    try {
      await senders[provider](req)
      markSent()
      return { status: 'sent', provider }
    } catch (err) {
      openMailto(req)
      return { status: 'mailto', reason: 'provider-failed', error: err instanceof Error ? err.message : String(err) }
    }
  }
  openMailto(req)
  return { status: 'mailto', reason: 'not-configured' }
}

export function openMailto(req: AssetRequest) {
  const a = document.createElement('a')
  a.href = buildMailto(req)
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}
