// Module-level cache — persists across requests within the same Next.js server process
let cached: { value: string; expiresAt: number } | null = null;

export async function getIBMAccessToken(): Promise<string> {
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.value;

  const apiKey = process.env.IBM_QUANTUM_TOKEN;
  if (!apiKey) throw new Error('IBM_QUANTUM_TOKEN no configurado en .env.local');

  const res = await fetch('https://iam.cloud.ibm.com/identity/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
      apikey: apiKey,
    }),
  });

  const data = await res.json() as { access_token?: string; expires_in?: number; errorMessage?: string };
  if (!data.access_token) {
    throw new Error('IBM IAM auth falló: ' + (data.errorMessage ?? JSON.stringify(data)));
  }

  cached = { value: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return cached.value;
}
