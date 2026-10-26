import {workload} from './academic.js';
export function reportPDF(a,semester) {
 const objects=[];const add=s=>(objects.push(s),objects.length);const font=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');const pagesId=add('');const kids=[];
 let commands=[],y=790;
 const esc=s=>String(s).replace(/[^\x20-\xFF]/g,'-').replace(/([\\()])/g,'\\$1');
 const flush=()=>{if(!commands.length)return;const stream=commands.join('\n');const content=add(`<< /Length ${Buffer.byteLength(stream,'latin1')} >>\nstream\n${stream}\nendstream`);const page=add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${content} 0 R >>`);kids.push(page);commands=[];y=790;};
 const text=(s,size=11)=>{if(y<55)flush();commands.push(`0.06 0.12 0.22 rg BT /F1 ${size} Tf 40 ${y} Td (${esc(s)}) Tj ET`);y-=size+9;};
 const offers=a.ofertas.filter(o=>o.semestre===semester);text('Programación Académica - Reporte semestral',20);text(a.semestres.find(s=>s.id===semester)?.nombre||semester,15);text('Generado: '+new Date().toISOString().slice(0,10));text(`${a.profesores.length} profesores | ${offers.length} grupos | ${(a.salones||[]).length} salones`);text(`Publicados: ${offers.filter(o=>o.estado==='Publicada').length} | Borradores: ${offers.filter(o=>o.estado!=='Publicada').length}`);
 text('Distribución por contrato',15);
 for(const type of ['Planta','Cátedra','Cátedra interna','Préstamo','Por clasificar']){const count=a.profesores.filter(p=>p.tipo===type).length;text(`${type}: ${count}`);commands.push(`0.08 0.38 0.8 rg 40 ${y} ${440*count/Math.max(1,a.profesores.length)} 10 re f`);y-=24;}
 const ids=new Set(offers.map(o=>o.id));const parts=a.participaciones.filter(p=>ids.has(p.oferta));text(`Responsabilidades aceptadas: ${parts.filter(p=>p.estatus==='Aceptada').length} de ${parts.length}`);text('Distribución de UDC semestrales',15);
 const loads=a.profesores.map(p=>workload(a,p.id,semester));const buckets=[['Docencia','docencia'],['Intensivas','intensivas'],['Coordinación','coordinacion'],['Préstamos a otras áreas','prestamos']].map(([label,key])=>[label,loads.reduce((n,w)=>n+w[key],0)]);const sum=buckets.reduce((n,b)=>n+b[1],0);
 for(const [label,value] of buckets){text(`${label}: ${Math.round(value*100)/100} UDC`);commands.push(`0.1 0.55 0.4 rg 40 ${y} ${440*value/Math.max(1,sum)} 10 re f`);y-=24;}
 text('Carga semestral por profesor (UDC)',15);
 for(const p of a.profesores){const w=workload(a,p.id,semester);text(`${p.nombre.slice(0,32)} | ${p.tipo} | Total ${w.total} / ${w.max??'sin definir'} | Préstamos ${w.prestamos}`,9);}
 text('Grupos',15);for(const o of offers){text(`${a.ufs.find(u=>u.id===o.uf)?.nombre.slice(0,42)||o.uf} | Grupo ${o.grupo} | ${o.periodos} | ${o.udc} UDC`);}
 flush();objects[pagesId-1]=`<< /Type /Pages /Kids [${kids.map(k=>k+' 0 R').join(' ')}] /Count ${kids.length} >>`;const root=add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);let out='%PDF-1.4\n';const offsets=[0];objects.forEach((s,i)=>{offsets.push(Buffer.byteLength(out,'latin1'));out+=`${i+1} 0 obj\n${s}\nendobj\n`;});const xref=Buffer.byteLength(out,'latin1');out+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objects.length+1} /Root ${root} 0 R >>\nstartxref\n${xref}\n%%EOF`;
 return Buffer.from(out,'latin1');
}
