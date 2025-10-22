export function withCORS(req?: Request) {
  // Basic CORS headers - can be extended based on req if needed
  const origin = req?.headers?.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
