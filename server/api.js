import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { ApiError, authorize, checkOrigin, cookies, cookieNames, seal, setCookie, unseal, verifyCode } from './security.js';
import { askAI } from './ai.js';
import { exchangeToken, fetchInvoices, freeeConfigured, saveFreee } from './freee.js';

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { if (Buffer.byteLength(req.body) > 3300000) throw new ApiError(413,'画像は2枚までに分けて送ってください。'); return JSON.parse(req.body); }
  let data = '';
  for await (const chunk of req) { data += chunk; if (Buffer.byteLength(data) > 3300000) throw new ApiError(413,'画像は2枚までに分けて送ってください。'); }
  return data ? JSON.parse(data) : {};
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control','no-store'); res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options','nosniff');
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const path = url.pathname.replace(/^\/api/, '');
  const json = (status, body) => { res.statusCode=status; res.end(JSON.stringify(body)); };
  try {
    if (path === '/status' && req.method === 'GET') {
      const loggedIn = Boolean(unseal(cookies(req)[cookieNames.session],'session'));
      return json(200,{ api:true, aiConfigured:Boolean(process.env.OPENAI_API_KEY), freeeConfigured:freeeConfigured(), loggedIn, freeeConnected:loggedIn && Boolean(unseal(cookies(req)[cookieNames.freee],'freee')) });
    }
    if (path === '/freee/callback' && req.method === 'GET') {
      authorize(req);
      const expected = unseal(cookies(req)[cookieNames.state],'oauth');
      setCookie(req,res,cookieNames.state,'',0);
      if (!expected || expected.state !== url.searchParams.get('state') || !url.searchParams.get('code') || url.searchParams.has('error')) throw new ApiError(400,'freeeの連携を完了できませんでした。設定からもう一度連携してください。');
      const token=await exchangeToken({grant_type:'authorization_code',code:url.searchParams.get('code'),redirect_uri:process.env.FREEE_REDIRECT_URI});
      saveFreee(req,res,token); res.statusCode=302; res.setHeader('Location','/?freee=connected'); return res.end();
    }
    checkOrigin(req);
    if (path === '/session' && req.method === 'POST') {
      const body = await readBody(req);
      if (!verifyCode(body.code)) throw new ApiError(401,'接続用コードを確認してください。');
      setCookie(req,res,cookieNames.session,seal({purpose:'session'},7*86400),7*86400); return json(200,{ok:true});
    }
    authorize(req);
    if (path === '/session' && req.method === 'DELETE') { for(const name of Object.values(cookieNames)) setCookie(req,res,name,'',0); return json(200,{ok:true}); }
    if (path === '/chat' && req.method === 'POST') return json(200,await askAI(await readBody(req)));
    if (path === '/freee/connect' && req.method === 'POST') {
      if (!freeeConfigured()) throw new ApiError(503,'freeeの接続設定が必要です。');
      const state=randomBytes(32).toString('hex'); setCookie(req,res,cookieNames.state,seal({purpose:'oauth',state},600),600);
      const params=new URLSearchParams({client_id:process.env.FREEE_CLIENT_ID,redirect_uri:process.env.FREEE_REDIRECT_URI,response_type:'code',scope:'read',state,prompt:'select_company'});
      return json(200,{url:'https://accounts.secure.freee.co.jp/public_api/authorize?' + params});
    }
    if (path === '/freee/invoices' && req.method === 'GET') return json(200,await fetchInvoices(req,res,url.searchParams.get('month')));
    throw new ApiError(404,'この機能は利用できません。');
  } catch(error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return json(400,{error:'入力内容を確認してください。記録は変更していません。'});
    return json(error.status || 500,{error:error instanceof ApiError ? error.message : '接続に失敗しました。もう一度お試しください。'});
  }
}
