// A build guard, not a general secret scanner: unknown/encoded credentials
// cannot be guaranteed detectable. Never include matched text in diagnostics.
const credentialNames = ['RESEND_API_KEY', 'CLOUDFLARE_API_TOKEN', 'CF_API_TOKEN', 'OPENAI_API_KEY', 'GITHUB_TOKEN'];
const placeholder = /(?:^|[\s_-])(?:SYNTHETIC|DUMMY)(?:$|[\s_-])/i;
const credentialFormats = [
  ['Resend', /(?<![A-Za-z0-9_-])re_[A-Za-z0-9_-]{24,128}(?![A-Za-z0-9_-])/g],
  ['OpenAI', /(?<![A-Za-z0-9_-])sk-(?:(?:proj-|svcacct-)[A-Za-z0-9_-]{40,256}|[A-Za-z0-9]{48})(?![A-Za-z0-9_-])/g],
  ['GitHub', /(?<![A-Za-z0-9_-])(?:gh[pousr]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9]{22}_[A-Za-z0-9]{59})(?![A-Za-z0-9_-])/g],
];
const privateKey = /-----BEGIN ((?:(?:RSA|EC|DSA|OPENSSH|ENCRYPTED) )?PRIVATE KEY)-----([\s\S]*?)-----END \1-----/g;

export function assertNoPublicAssetSecrets(text, env = process.env) {
  for (const name of credentialNames) {
    const configured = env[name];
    // Exact server configuration always wins over the illustrative markers
    // used to exempt unconfigured examples from the format heuristics below.
    if (typeof configured !== 'string' || !configured.trim()) continue;
    const values = [configured, configured.trim()];
    if (values.some(value => text.includes(value) || text.includes(JSON.stringify(value).slice(1, -1)))) {
      throw new Error('Secret serveur détecté dans un fichier public.');
    }
  }
  for (const [provider, pattern] of credentialFormats) {
    for (const match of text.matchAll(pattern)) if (!placeholder.test(match[0])) {
      throw new Error(`Secret au format ${provider} détecté dans un fichier public.`);
    }
  }
  for (const match of text.matchAll(privateKey)) if (!placeholder.test(match[2].replace(/\\[nr]/g, '\n'))) {
    throw new Error('Une clé privée est présente dans un fichier public.');
  }
}
