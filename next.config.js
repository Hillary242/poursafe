/** @type {import('next').NextConfig} */

/**
 * PourSafe's own security headers. The page may talk to this site, Supabase
 * (data, sign-in, private storage for photos) and Google Fonts — nothing else.
 */
function csp() {
  const supa = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const ws = supa.replace(/^http/, "ws");
  const dev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    // Photos are shown from Supabase's signed links and, once filed, Drive.
    `img-src 'self' data: blob: ${supa} https:`.trim(),
    `connect-src 'self' ${supa} ${ws}`.trim(),
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com https://*.supabase.co",
    "object-src 'none'",
  ].join("; ");
}

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: csp() },
  // camera=(self): Android Chrome applies this to the photo picker too — with
  // camera=() its "Take photo" option disappeared and crews could only pick
  // from the library (first field test, 15 Nov).
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig = {
  reactStrictMode: true,
  /*
   * The signed PDF copies are built on the server with the Liberation Sans
   * fonts read from public/fonts. On Vercel public/ is served from the CDN and
   * is NOT in the server function's bundle, so they have to be named here or
   * the read fails with ENOENT (found live, 14 Nov).
   */
  outputFileTracingIncludes: {
    "/": ["./public/fonts/**/*"],
    "/**/*": ["./public/fonts/**/*"],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};
module.exports = nextConfig;
