// /lib/cors.ts
export function withCORS(req: Request, headers = new Headers()) {
  const origin = req.headers.get('origin') ?? '';
  const allowed = ['https://www.ocaso.be', 'https://ocaso.be'];

  if (allowed.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  }
  return headers;
}
