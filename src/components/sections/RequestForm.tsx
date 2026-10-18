import { useState, type FormEvent, type ReactNode } from 'react'
import { ArrowRight, Check, Copy, Loader2 } from 'lucide-react'
import { profile, requestOptions } from '@/data/portfolioData'
import { copyToClipboard, isEmailServiceConfigured, submitAssetRequest, type AssetRequest } from '@/lib/email'
import { useStore } from '@/store/useStore'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Reveal } from '@/components/ui/Reveal'

const initial: AssetRequest = {
  name: '',
  email: '',
  requestType: requestOptions.types[0],
  style: requestOptions.styles[0],
  platform: requestOptions.platforms[0],
  referenceLink: '',
  brief: '',
  budget: requestOptions.budgets[1],
  timeline: requestOptions.timelines[2],
}

type Errors = Partial<Record<keyof AssetRequest, string>>

function validate(v: AssetRequest): Errors {
  const e: Errors = {}
  if (v.name.trim().length < 2) e.name = 'Please enter your name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) e.email = 'Please enter a valid email.'
  if (v.referenceLink && !/^https?:\/\/\S+\.\S+/.test(v.referenceLink.trim())) e.referenceLink = 'Links should start with http:// or https://'
  if (v.brief.trim().length < 20) e.brief = 'A couple of sentences helps me quote accurately (20+ characters).'
  return e
}

function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor?: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
          {label}
        </label>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>
      <div className="mt-2">{children}</div>
      {error && <p className="mt-1.5 text-sm text-red-700">{error}</p>}
    </div>
  )
}

function Choice({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink">{label}</legend>
      <div role="radiogroup" aria-label={label} className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value === o
          return (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o)}
              className={`h-10 rounded-full px-4 text-sm transition-colors ${on ? 'bg-ink text-paper' : 'border border-line-strong text-ink-2 hover:border-ink hover:text-ink'}`}
            >
              {o}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

const inputCls =
  'w-full rounded-xl border border-line-strong bg-paper px-4 text-[0.9375rem] text-ink placeholder:text-muted/70 outline-none transition-[border-color,box-shadow] focus:border-ink focus:ring-4 focus:ring-accent-soft aria-[invalid=true]:border-red-700'

export function RequestForm() {
  const [values, setValues] = useState<AssetRequest>(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [decoy, setDecoy] = useState('') // honeypot: hidden from people, filled in by naive bots
  const pushToast = useStore((s) => s.pushToast)
  const serviceReady = isEmailServiceConfigured()

  const set = <K extends keyof AssetRequest>(k: K, v: AssetRequest[K]) => {
    setValues((s) => ({ ...s, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const copyEmail = async () => {
    const ok = await copyToClipboard(profile.email)
    setCopied(ok)
    pushToast(ok ? { tone: 'success', title: 'Email copied', description: profile.email } : { tone: 'error', title: 'Could not copy', description: profile.email })
    window.setTimeout(() => setCopied(false), 2200)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const errs = validate(values)
    setErrors(errs)
    if (Object.keys(errs).length) {
      pushToast({ tone: 'error', title: 'A few fields need attention', description: Object.values(errs)[0] })
      return
    }
    setSending(true)
    try {
      const res = await submitAssetRequest(values, decoy)
      if (res.status === 'cooldown') {
        pushToast({ tone: 'info', title: 'Request already sent', description: `Please wait ${res.waitSeconds}s before sending another one.` })
      } else if (res.status === 'sent') {
        pushToast({ tone: 'success', title: 'Request sent', description: `Thanks ${values.name.split(' ')[0]} — I'll reply to ${values.email} within 24–48 hours.` })
        setValues(initial)
      } else {
        pushToast({
          tone: res.reason === 'provider-failed' ? 'error' : 'info',
          title: res.reason === 'provider-failed' ? 'Couldn’t send directly — opened your email app' : 'Opening your email app…',
          description: `Your brief is pre-filled to ${profile.email}; just press send. If nothing opened, copy the address instead.`,
        })
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <section id="request" className="section">
      <div className="container-page">
        <SectionHeading
          index="04"
          eyebrow="Request an asset"
          title={
            <>
              Have a project <em className="text-accent">in mind?</em>
            </>
          }
          description="Tell me what you're building — a single hero prop, a modular pack or an animated scene. Game studios, indie developers and brands welcome."
        />

        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Contact details */}
          <Reveal as="aside" className="space-y-10 lg:col-span-4">
            <div>
              <p className="eyebrow">Email</p>
              <a href={`mailto:${profile.email}`} className="link-underline mt-3 inline-block break-all text-xl text-ink">
                {profile.email}
              </a>
              <button type="button" onClick={copyEmail} className="mt-4 flex items-center gap-2 text-sm text-ink-2 transition-colors hover:text-ink">
                {copied ? <Check className="h-4 w-4 text-ok" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy email address'}
              </button>
            </div>
            <div>
              <p className="eyebrow">Availability</p>
              <p className="mt-3 flex items-center gap-2 text-ink">
                <span className="status-dot h-2 w-2 rounded-full bg-ok" /> {profile.availability}
              </p>
              <p className="mt-1 text-ink-2">{profile.responseTime}</p>
            </div>
            <div>
              <p className="eyebrow">Every delivery includes</p>
              <ul className="mt-3 space-y-2 text-ink-2">
                {['Clean, quad-based topology', 'UVs with baked PBR or stylized textures', '.BLEND, .FBX, .OBJ and .GLB exports', 'Turntable and beauty renders', 'Revisions until it fits your pipeline'].map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-accent" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* Form */}
          <Reveal className="lg:col-span-8">
            <form onSubmit={onSubmit} noValidate className="surface relative space-y-8 p-6 shadow-[var(--shadow-soft)] md:p-10">
              {/* honeypot: off-screen, not focusable, ignored by assistive tech */}
              <input
                type="text"
                name="contact_url_2"
                value={decoy}
                onChange={(e) => setDecoy(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="pointer-events-none absolute -left-[9999px] top-0 h-0 w-0 opacity-0"
              />
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Your name" htmlFor="rq-name" error={errors.name}>
                  <input id="rq-name" className={`${inputCls} h-12`} value={values.name} onChange={(e) => set('name', e.target.value)} placeholder="Alex Rivera" autoComplete="name" aria-invalid={!!errors.name} />
                </Field>
                <Field label="Email" htmlFor="rq-email" error={errors.email}>
                  <input id="rq-email" className={`${inputCls} h-12`} type="email" value={values.email} onChange={(e) => set('email', e.target.value)} placeholder="alex@studio.com" autoComplete="email" aria-invalid={!!errors.email} />
                </Field>
              </div>

              <Choice label="What do you need?" options={requestOptions.types} value={values.requestType} onChange={(v) => set('requestType', v)} />
              <Choice label="Target style" options={requestOptions.styles} value={values.style} onChange={(v) => set('style', v)} />
              <Choice label="Platform / polycount target" options={requestOptions.platforms} value={values.platform} onChange={(v) => set('platform', v)} />

              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Budget" htmlFor="rq-budget">
                  <select id="rq-budget" className={`${inputCls} h-12`} value={values.budget} onChange={(e) => set('budget', e.target.value)}>
                    {requestOptions.budgets.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Timeline" htmlFor="rq-timeline">
                  <select id="rq-timeline" className={`${inputCls} h-12`} value={values.timeline} onChange={(e) => set('timeline', e.target.value)}>
                    {requestOptions.timelines.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Reference link" htmlFor="rq-ref" hint="Optional" error={errors.referenceLink}>
                <input id="rq-ref" className={`${inputCls} h-12`} type="url" value={values.referenceLink} onChange={(e) => set('referenceLink', e.target.value)} placeholder="https://artstation.com/…" aria-invalid={!!errors.referenceLink} />
              </Field>

              <Field label="Project brief" htmlFor="rq-brief" error={errors.brief}>
                <textarea
                  id="rq-brief"
                  className={`${inputCls} min-h-[160px] resize-y py-3 leading-relaxed`}
                  value={values.brief}
                  onChange={(e) => set('brief', e.target.value)}
                  placeholder="What are you building? Describe the asset(s), quantity, where they'll be used, and any technical limits like tri budget, texture size or engine."
                  aria-invalid={!!errors.brief}
                  data-lenis-prevent
                />
              </Field>

              <div className="flex flex-col-reverse gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted">{serviceReady ? 'Sent securely to my inbox.' : 'Opens your email app with everything pre-filled.'}</p>
                <button type="submit" disabled={sending} className="btn btn-primary h-12 px-6 disabled:opacity-60">
                  {sending ? 'Sending…' : 'Send request'}
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
