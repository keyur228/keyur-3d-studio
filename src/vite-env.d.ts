/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FORM_PROVIDER?: string
  readonly VITE_WEB3FORMS_ACCESS_KEY?: string
  readonly VITE_FORMSPREE_FORM_ID?: string
  readonly VITE_EMAILJS_SERVICE_ID?: string
  readonly VITE_EMAILJS_TEMPLATE_ID?: string
  readonly VITE_EMAILJS_PUBLIC_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
