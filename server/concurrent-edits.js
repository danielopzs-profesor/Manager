import {randomUUID} from 'node:crypto';
import {sheets} from './academic-excel.js';
import {assignmentPermission,isAdmin} from './permissions.js';
export const concurrentCollections=['ofertas','participaciones','coordinaciones','sesiones'];
const project=(collection,item)=>item?Object.fromEntries(sheets[collection].map(k=>[k,item[k]??''])):null;
export function canRebase(a,req,collection,item){
 if(!concurrentCollections.includes(collection)||!Object.hasOwn(req.body,'baseItem'))return false;
 const current=a[collection].find(r=>r.id===item.id);
 return JSON.stringify(project(collection,current))===JSON.stringify(project(collection,req.body.baseItem));
}
export function queueEdit(a,req,collection,item){
 assignmentPermission(a,req.session,collection,item,a[collection].find(r=>r.id===item.id));
 a.pendingEdits ||= [];
 const old=isAdmin(req.session.role)?a.pendingEdits.find(p=>p.id===req.body.pendingId&&p.collection===collection&&p.item.id===item.id):null;
 if(a.pendingEdits.length>=500&&!old)throw Error('Hay 500 ediciones pendientes. Revisa algunas antes de guardar otra versión.');
 const pending={id:old?.id||randomUUID(),collection,item:structuredClone(item),actor:req.session.adminId||req.session.nomina,fecha:new Date().toISOString(),baseRevision:req.body.revision};
 if(old)Object.assign(old,pending);else a.pendingEdits.push(pending);
 return pending.id;
}
export const pendingOffer=p=>p.collection==='ofertas'?p.item.id:p.item.oferta;
