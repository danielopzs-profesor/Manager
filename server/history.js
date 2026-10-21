import {randomUUID} from 'node:crypto';
export function historyCategory(action='') {
 if (/^Inicio de sesión|^Cierre de sesión|sign-in/i.test(action)) return 'accesos';
 if (/error|rechaz|denegad/i.test(action)) return 'errores';
 if (/respuesta/i.test(action)) return 'respuestas';
 if (/aprobar|sobrecarga/i.test(action)) return 'aprobaciones';
 if (/import|restaur|respaldo|export|historial/i.test(action)) return 'datos';
 if (/administrador|cuenta|rol|contraseña/i.test(action)) return 'seguridad';
 return 'cambios';
}
export const redact = value => String(value||'').replace(/postgres(?:ql)?:\/\/\S+/gi,'[conexión privada]').replace(/(password|token|secret)=([^\s&]+)/gi,'$1=[oculto]').slice(0,1000);
export async function recordEvent(store,event) {
 try {await store.mutate(db=>{if(!db.academic)return;const a=db.academic;a.auditoria ||= [];a.auditoria.push({id:randomUUID(),fecha:new Date().toISOString(),actor:redact(event.actor||'No autenticado'),accion:event.accion,categoria:event.categoria||historyCategory(event.accion),detalle:redact(event.detalle),resultado:event.resultado||'ok'}); if(a.auditoria.length>10000)a.auditoria=a.auditoria.slice(-10000);},{snapshot:false});}catch{console.error('No se pudo registrar un evento de historial');}
}
export function historyText(rows) {return '\uFEFF'+rows.map(r=>`[${r.fecha}] [${r.categoria||historyCategory(r.accion)}] ${r.actor} | ${r.accion}\n${r.detalle||''}${r.cambios?.length?'\n'+JSON.stringify(r.cambios,null,2):''}\n`).join('\n');}
