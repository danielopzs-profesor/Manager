import namedPolicy from '../config/access-policy.json' with {type:'json'};
import {createHash,randomUUID} from 'node:crypto';
export const isAdmin = role => ['admin','superadmin'].includes(role);
export const accountRole = account => account?.role || 'consulta';
const ids = value => String(value||'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
export async function applyRolePolicy(store,env) {
 const enabled=env.ENFORCE_NAMED_ROLES==='1'||!!env.SUPERADMIN_IDS;
 if(!enabled)return false;
 const supers=ids(env.SUPERADMIN_IDS||namedPolicy.superadmins.join(',')),admins=ids(env.ADMIN_IDS||namedPolicy.admins.join(','));
 if(!supers.length)return false;
 if(supers.length!==2||new Set(supers).size!==2||admins.length!==4)throw Error('Configura SUPERADMIN_IDS con las dos identidades y ADMIN_IDS con las cuatro identidades verificadas, separadas por comas.');
 const policy=createHash('sha256').update(JSON.stringify([supers,admins])).digest('hex');
 if ((await store.read()).academic?.rolePolicy===policy) return true;
 await store.mutate(db=>{
  const a=db.academic;if(a.rolePolicy===policy)return;
  const resolve=id=>{
   let account=a.admins.find(x=>x.id.toLowerCase()===id);
   const professor=a.profesores.find(p=>p.id.toLowerCase()===id||p.correo.toLowerCase()===id);
   if(!account&&professor)account=a.admins.find(x=>x.profesor===professor.id);
   if(!account&&professor)account=professor;
   if(!account)throw Error(`No se pudo verificar la cuenta ${id}. Configura primero su acceso y vuelve a aplicar la política.`);
   if(professor&&account!==professor&&!account.profesor)account.profesor=professor.id;
   return account;
  };
  const protectedAccounts=supers.map(resolve),allowed=admins.map(resolve);
  if(new Set(protectedAccounts.map(a=>a.id)).size!==2||new Set(allowed.map(a=>a.id)).size!==4)throw Error('Las identidades deben corresponder a personas distintas dentro de cada lista.');
  for(const p of a.profesores){
   if(p.protectedAccess&&!protectedAccounts.includes(p))throw Error('No se puede retirar la protección de un superadministrador existente.');
   p.accessRole=protectedAccounts.includes(p)?'superadmin':allowed.includes(p)?'admin':'profesor';p.protectedAccess=protectedAccounts.includes(p);
  }
  for(const account of a.admins){
   if(account.protegido&&!protectedAccounts.includes(account))throw Error('No se puede retirar la protección de un superadministrador existente.');
   account.role=protectedAccounts.includes(account)?'superadmin':allowed.includes(account)?'admin':account.profesor?'profesor':'consulta';
   account.protegido=protectedAccounts.includes(account);
  }
  a.auditoria.push({id:randomUUID(),fecha:new Date().toISOString(),actor:"Sistema",accion:"Aplicar política de roles verificados",categoria:"seguridad",detalle:"Dos superadministradores protegidos; cuatro identidades administrativas verificadas; se retiraron los privilegios administrativos restantes."});
  a.rolePolicy=policy;
  a.revision++;
 });return true;
}
export function canAssign(a,session,offerId){return isAdmin(session.role)||!!session.nomina&&a.coordinaciones.some(c=>c.oferta===offerId&&c.profesor===session.nomina);}
export function assignmentPermission(a,session,collection,item,old){
 if(isAdmin(session.role))return;
 if(collection!=='participaciones'||!canAssign(a,session,item?.oferta||old?.oferta)||(old&&!canAssign(a,session,old.oferta))){const e=Error('Solo puedes asignar profesores en los grupos que coordinas.');e.status=403;throw e;}
}

export function protectIdentities(before,after){
 for(const old of before.admins.filter(a=>a.protegido||a.role==='superadmin')){const next=after.admins.find(a=>a.id===old.id);if(!next||next.role!=='superadmin'||!next.protegido)throw Error('No se puede eliminar ni degradar un superadministrador protegido');}
 for(const old of before.profesores.filter(p=>p.protectedAccess)){const next=after.profesores.find(p=>p.id===old.id);if(!next||next.accessRole!=='superadmin'||!next.protectedAccess)throw Error('No se puede eliminar ni degradar al profesor superadministrador');}
}
