const BRAND = {
  green: '#063F32',
  purple: '#2D183F',
  cream: '#F8F3E8',
  gold: '#B49A48',
  ink: '#17372F',
  muted: '#66736F',
} as const

export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

interface EmailFrameOptions {
  logoUrl: string
  preheader: string
  eyebrow: string
  title: string
  introduction: string
  content: string
  footer: string
}

function buildEmailFrame(options: EmailFrameOptions) {
  const logoUrl = escapeHtml(options.logoUrl)

  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(options.title)}</title></head>
  <body style="margin:0;padding:0;background:${BRAND.cream};color:${BRAND.ink};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(options.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:${BRAND.cream};">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;border:1px solid #D9CEB5;border-radius:20px;overflow:hidden;background:#FFFFFF;box-shadow:0 16px 40px rgba(45,24,63,.12);">
          <tr><td align="center" style="padding:32px 24px 26px;background:${BRAND.green};border-bottom:4px solid ${BRAND.gold};">
            <img src="${logoUrl}" width="112" height="112" alt="South Rally crest" style="display:block;width:112px;height:112px;margin:0 auto 14px;border-radius:50%;object-fit:contain;background:${BRAND.cream};border:3px solid ${BRAND.gold};" />
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:25px;line-height:1.2;letter-spacing:5px;color:${BRAND.cream};">SOUTH RALLY</div>
            <div style="width:144px;height:1px;margin:14px auto 0;background:${BRAND.gold};"></div>
          </td></tr>
          <tr><td style="padding:36px 36px 32px;">
            <div style="font-family:Arial,sans-serif;font-size:12px;font-weight:700;line-height:1.4;letter-spacing:2px;text-align:center;text-transform:uppercase;color:${BRAND.gold};">${escapeHtml(options.eyebrow)}</div>
            <h1 style="margin:10px 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:500;line-height:1.2;text-align:center;color:${BRAND.green};">${escapeHtml(options.title)}</h1>
            <p style="margin:0 auto 26px;max-width:460px;font-family:Arial,sans-serif;font-size:15px;line-height:1.7;text-align:center;color:${BRAND.muted};">${escapeHtml(options.introduction)}</p>
            ${options.content}
            <p style="margin:26px 0 0;font-family:Arial,sans-serif;font-size:12px;line-height:1.6;text-align:center;color:#7A827F;">${escapeHtml(options.footer)}</p>
          </td></tr>
          <tr><td align="center" style="padding:18px 24px;background:${BRAND.purple};font-family:Arial,sans-serif;font-size:11px;line-height:1.5;letter-spacing:.4px;color:#EDE7F0;">Your court. Your community. Your rally.</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

interface OtpEmailOptions {
  logoUrl: string
  code: string
  purpose: 'login' | 'signup'
}

export function buildSouthRallyOtpEmail(options: OtpEmailOptions) {
  const isLogin = options.purpose === 'login'

  return buildEmailFrame({
    logoUrl: options.logoUrl,
    preheader: `Your South Rally verification code is ${options.code}.`,
    eyebrow: isLogin ? 'Secure sign-in' : 'Email verification',
    title: isLogin ? 'Welcome back to the rally.' : 'Welcome to South Rally.',
    introduction: isLogin
      ? 'Use this one-time code to complete your secure administrator or staff sign-in.'
      : 'Confirm your email address to finish creating your account and join the community.',
    content: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:${BRAND.purple};border:1px solid ${BRAND.gold};border-radius:14px;"><tr><td align="center" style="padding:24px 16px;"><div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#D7C58C;">Your verification code</div><div style="margin-top:9px;font-family:'Courier New',monospace;font-size:38px;font-weight:700;line-height:1.2;letter-spacing:9px;color:#FFFFFF;">${escapeHtml(options.code)}</div></td></tr></table>`,
    footer: 'This code expires in 15 minutes. If you did not request it, you can safely ignore this email.',
  })
}

interface PasswordResetEmailOptions {
  logoUrl: string
  resetLink: string
}

export function buildSouthRallyPasswordResetEmail(options: PasswordResetEmailOptions) {
  const safeResetLink = escapeHtml(options.resetLink)

  return buildEmailFrame({
    logoUrl: options.logoUrl,
    preheader: 'Reset your South Rally account password.',
    eyebrow: 'Account security',
    title: 'Reset your password.',
    introduction: 'Choose a new password using the secure link below. Your current password remains active until you complete the reset.',
    content: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:4px 0 20px;"><a href="${safeResetLink}" style="display:inline-block;padding:14px 30px;border-radius:10px;background:${BRAND.green};border:1px solid ${BRAND.gold};font-family:Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;color:#FFFFFF;">Reset Password</a></td></tr><tr><td style="padding:16px;border-radius:10px;background:#F3EFE5;font-family:Arial,sans-serif;font-size:11px;line-height:1.6;word-break:break-all;color:${BRAND.muted};">If the button does not work, copy this address into your browser:<br /><a href="${safeResetLink}" style="color:${BRAND.green};">${safeResetLink}</a></td></tr></table>`,
    footer: 'This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.',
  })
}
