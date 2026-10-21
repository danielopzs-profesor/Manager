const split = (s) => String(s || '').split(',').filter(Boolean);
export function acceptanceMetrics(a, semester) {
 const published = new Set(a.ofertas.filter(o=>o.semestre===semester && o.estado==='Publicada').map(o=>o.id));
 const parts=a.participaciones.filter(p=>published.has(p.oferta));
 const ids=[...new Set(parts.map(p=>p.profesor))];
 const accepted=ids.filter(id=>parts.filter(p=>p.profesor===id).every(p=>p.estatus==='Aceptada'));
 return {ids,accepted,pending:ids.filter(id=>!accepted.includes(id)),percent:ids.length?Math.round(accepted.length/ids.length*100):0};
}
const minutes = t => Number(t.slice(0,2))*60+Number(t.slice(3,5));
export function roomUtilization(a,semester,segment) {
 const ids=new Set(a.ofertas.filter(o=>o.semestre===semester).map(o=>o.id));
 return (a.salones || []).map(r=>{
  const start=minutes(r.horario.slice(0,5)),end=minutes(r.horario.slice(6));
  const days=split(r.dias); let used=0;
  for(const day of days){
   const ranges=a.sesiones.filter(s=>s.aula===r.id && ids.has(s.oferta) && split(s.segmentos).includes(segment) && split(s.dias).includes(day))
    .filter(s=>typeof s.horario==='string' && /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(s.horario) && s.horario.slice(0,5)<s.horario.slice(6))
    .map(s=>[Math.max(start,minutes(s.horario.slice(0,5))),Math.min(end,minutes(s.horario.slice(6)))])
    .filter(([s,e])=>s<e).sort((a,b)=>a[0]-b[0]);
   let last=start;for(const [s,e] of ranges){used+=Math.max(0,e-Math.max(s,last));last=Math.max(last,e);}
  }
  const capacity=(end-start)*days.length;
  return {id:r.id,nombre:r.nombre,totalHours:capacity/60,usedHours:used/60,freeHours:Math.max(0,capacity-used)/60,percent:capacity?Math.round(used/capacity*100):0};
 });
}
