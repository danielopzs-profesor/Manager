export function downloadCard(title,lines) {
 const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');canvas.width=1200;
 ctx.font='28px Arial';const wrapped=[];
 for(const line of lines){let current='';for(const word of String(line||'').split(' ')){if(ctx.measureText(current+' '+word).width>1020){wrapped.push(current);current=word;}else current+=(current?' ':'')+word;}wrapped.push(current);}
 canvas.height=220+wrapped.length*46;ctx.fillStyle='#f2f5fa';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#10294c';ctx.fillRect(0,0,1200,20);ctx.font='bold 38px Arial';ctx.fillText('PROGRAMACIÓN ACADÉMICA',70,85);ctx.font='bold 32px Arial';ctx.fillText(String(title).slice(0,55),70,145);ctx.font='28px Arial';
 wrapped.forEach((line,i)=>ctx.fillText(line,70,210+i*46));const a=document.createElement('a');a.download=title.replace(/[^a-zA-Z0-9áéíóúñ -]/g,'').slice(0,80)+'.jpg';a.href=canvas.toDataURL('image/jpeg',.94);a.click();
}
