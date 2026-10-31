import { NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.API_PROXY_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://kalceria-backend.vercel.app/api';

async function handler(req, { params }) {
  const resolvedParams = await params;
  const path = resolvedParams?.path;
  const pathStr = Array.isArray(path) ? path.join('/') : path || '';

  const incomingUrl = new URL(req.url);
  const targetBase = BACKEND_URL.replace(/\/+$/, '');
  const targetUrl = `${targetBase}/${pathStr}${incomingUrl.search}`;

  const forwardHeaders = new Headers();
  req.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k !== 'host' && k !== 'connection' && k !== 'content-length') {
      forwardHeaders.set(key, value);
    }
  });

  // Always supply the canonical production frontend origin so backend CORS succeeds universally
  forwardHeaders.set('Origin', 'https://kalceria-frontend.vercel.app');
  forwardHeaders.set('Host', new URL(BACKEND_URL).host);

  const init = {
    method: req.method,
    headers: forwardHeaders,
    redirect: 'manual',
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer();
  }

  try {
    const backendRes = await fetch(targetUrl, init);

    const clientHeaders = new Headers();
    backendRes.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'set-cookie') {
        clientHeaders.set(key, value);
      }
    });

    const setCookies =
      typeof backendRes.headers.getSetCookie === 'function'
        ? backendRes.headers.getSetCookie()
        : backendRes.headers.get('set-cookie')
        ? [backendRes.headers.get('set-cookie')]
        : [];

    for (const cookie of setCookies) {
      clientHeaders.append('set-cookie', cookie);
    }

    const body = await backendRes.arrayBuffer();
    return new NextResponse(body, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: clientHeaders,
    });
  } catch (error) {
    console.error(`[API Proxy Error] ${req.method} ${targetUrl}:`, error);
    return NextResponse.json(
      { error: 'Backend gateway connection failed' },
      { status: 502 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
