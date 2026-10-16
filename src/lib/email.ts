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

type Provider = 'web3forms' | 'formspree' | 'emailjs'

const env = import.meta.env
const TARGET_EMAIL = profile.email

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
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${res.status} ${res.statusText} ${text}`.trim())
  }
  return res
}

const senders: Record<Provider, (req: AssetRequest) => Promise<unknown>> = {
  web3forms: (req) =>
    postJSON('https://api.web3forms.com/submit', {
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
    }),
  formspree: (req) =>
    postJSON(`https://formspree.io/f/${env.VITE_FORMSPREE_FORM_ID}`, {
      _subject: buildSubject(req),
      _replyto: req.email,
      ...req,
      message: buildBody(req),
    }),
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
 */
export async function submitAssetRequest(req: AssetRequest): Promise<SubmitResult> {
  const provider = configuredProvider()
  if (provider) {
    try {
      await senders[provider](req)
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
