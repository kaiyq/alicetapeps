export async function onRequest(context) {
  const { request, env, params } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, Notion-Version',
      },
    });
  }

  const path = params.path ? params.path.join('/') : '';
  const url = `https://api.notion.com/${path}`;

  const headers = new Headers();
  headers.set('Authorization', `Bearer ${env.NOTION_API_KEY}`);
  headers.set('Content-Type', 'application/json');
  headers.set('Notion-Version', '2022-06-28');

  const body = request.method !== 'GET' ? await request.text() : undefined;

  const response = await fetch(url, {
    method: request.method,
    headers,
    body,
  });

  const data = await response.text();

  return new Response(data, {
    status: response.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
