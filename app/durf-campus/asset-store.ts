export const photoKeys=["photo-09","photo-03","photo-02","photo-08","photo-05","photo-06","photo-10","photo-01","photo-07","photo-04"] as const;
const DB="durf-campus-asset-library";
const store="photos";
function openDb():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const q=indexedDB.open(DB,1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(store))q.result.createObjectStore(store)};q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}
export async function savePhoto(id:string,blob:Blob):Promise<void>{const db=await openDb();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(store,"readwrite");tx.objectStore(store).put(blob,id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}finally{db.close()}}
export async function loadPhotos():Promise<Record<string,string>>{const db=await openDb(),out:Record<string,string>={};try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(store,"readonly"),q=tx.objectStore(store).openCursor();q.onsuccess=()=>{const c=q.result;if(c){out[String(c.key)]=URL.createObjectURL(c.value as Blob);c.continue()}};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}finally{db.close()}return out}
export async function extractPhotos(file:File):Promise<Array<{name:string;blob:Blob}>>{
 const bytes=new Uint8Array(await file.arrayBuffer()),v=new DataView(bytes.buffer);let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){if(v.getUint32(i,true)===0x06054b50){end=i;break}}
 if(end<0)throw new Error("Invalid ZIP file");
 const n=v.getUint16(end+10,true);let p=v.getUint32(end+16,true);const out:Array<{name:string;blob:Blob}>=[];
 for(let i=0;i<n;i++){
  if(v.getUint32(p,true)!==0x02014b50)throw new Error("Invalid ZIP directory");
  const method=v.getUint16(p+10,true),size=v.getUint32(p+20,true),nameLen=v.getUint16(p+28,true),extra=v.getUint16(p+30,true),comment=v.getUint16(p+32,true),offset=v.getUint32(p+42,true);
  const name=new TextDecoder().decode(bytes.slice(p+46,p+46+nameLen));p+=46+nameLen+extra+comment;
  if(!/\.(jpe?g|png|webp)$/i.test(name)||/latest ref|screenshot/i.test(name.toLowerCase()))continue;
  if(v.getUint32(offset,true)!==0x04034b50)continue;
  const start=offset+30+v.getUint16(offset+26,true)+v.getUint16(offset+28,true),payload=bytes.slice(start,start+size);
  let raw:Uint8Array;
  if(method===0)raw=payload;
  else if(method===8){const stream=new Blob([payload as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));raw=new Uint8Array(await new Response(stream).arrayBuffer())}
  else continue;
  const mime=/\.png$/i.test(name)?"image/png":/\.webp$/i.test(name)?"image/webp":"image/jpeg";
  out.push({name,blob:new Blob([raw as BlobPart],{type:mime})});
 }
 return out;
}
