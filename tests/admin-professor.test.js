import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../server/store.js';
import { fixture } from './fixtures.js';
import { createApp } from '../server/app.js';

test('administrador docente: vinculación, respuestas propias, cambio de vínculo y prohibición de autoaprobar', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'arte-dual-'));
  const file = path.join(dir, 'book.xlsx');
  const store = new Store(file); await store.init(); await store.mutate(() => fixture());
  const runtime = await createApp({env: { EXCEL_PATH: file, ADMIN_PASSWORD: 'initial-password', PUBLIC_URL: 'http://localhost' }});
  const server = runtime.app.listen(0); await new Promise(r => server.once('listening', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/api';
  let cookie;
  const req = (url, body, c = cookie) => fetch(base + url, {method: body ? 'POST' : 'GET', headers: {'Content-Type': 'application/json', ...(c ? {cookie:c} : {})}, body: body ? JSON.stringify(body) : undefined});
  const data = async () => (await req('/academic')).json();
  const change = async (url, body) => req(url, {...body, revision: (await data()).revision});
  try {
    const login = await req('/login', {password:'initial-password'}); cookie = login.headers.get('set-cookie').split(';')[0];
    assert.equal((await change('/academic/admin', {id:'admin.docente', nombre:'Docente', password:'personal-password-123', profesor:'L001'})).status, 200);
    assert.equal((await data()).miProfesor, 'L001');
    assert.equal((await (await req('/me')).json()).nomina, 'L001');
    assert.equal((await change('/academic/admin', {id:'duplicate', nombre:'Duplicado', password:'personal-password-456', profesor:'L001'})).status, 400);
    assert.equal((await change('/academic/admin', {id:'invalid', nombre:'Inválido', password:'personal-password-456', profesor:'missing'})).status, 400);
    assert.equal((await change('/academic/approve', {profesor:'L001', semestre:'FJ27', motivo:'Propia'})).status, 403);
    assert.equal((await change('/academic/respond', {ids:['R1'], estatus:'Aceptada'})).status, 400, 'No responder borradores');
    assert.equal((await change('/academic/publish', {id:'O1'})).status, 200);
    assert.equal((await change('/academic/respond', {ids:['R1'], estatus:'Aceptada'})).status, 200);
    assert.equal((await change('/academic/respond', {ids:['R2'], estatus:'Aceptada'})).status, 400, 'No responder por otros docentes');
    const again = await req('/login', {identifier:'admin.docente', password:'personal-password-123'});
    cookie = again.headers.get('set-cookie').split(';')[0];
    const identity = await again.json(); assert.equal(identity.role, 'admin'); assert.equal(identity.nomina,'L001');
    assert.equal((await change('/academic/admin', {id:'admin.docente', nombre:'Docente', profesor:''})).status,200);
    assert.equal((await data()).miProfesor, null);
    assert.equal((await change('/academic/respond', {ids:['R1'], estatus:'Aceptada'})).status,403);
    assert.equal((await req('/me', null, again.headers.get('set-cookie').split(';')[0]).then(r=>r.json())).nomina, undefined);
  } finally { await new Promise(r=>server.close(r)); await runtime.close(); await rm(dir,{recursive:true,force:true}); }
});
