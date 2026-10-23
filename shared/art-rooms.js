export function isArtBuilding(value){return ['atli','escueladearte','escuelaarte'].includes(String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,''));}
export const artRoomCode=number=>String(number||'').trim()?`A-EA-${String(number).trim()}`:'';
export function roomCodeOptions(building,catalog){if(!isArtBuilding(building))return catalog;return [...new Map(catalog.filter(r=>r.codigo.startsWith('A-EA-')).map(r=>{const codigo=r.codigo.replace(/^A-EA-\s*/,'A-EA-');return [codigo,{...r,codigo}];})).values()];}
export const validRoomCode=value=>/^A-EA-[^\s,\r\n]+$/.test(value)||/^A-[A-Z0-9]+(?:- | )[^,\r\n]+$/.test(value);
