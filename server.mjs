import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { PublicDirectoryStore, getPublicDirectoryResponse } from './baseline/src/server/public-directory/public-directory-service.mjs';
import { OrganisationStore, createOrganisation, reparentOrganisation } from './baseline/src/server/org/org-service.mjs';
import { PeopleStore, createPerson } from './baseline/src/server/people/people-service.mjs';
import { TimelineStore, appendAssignment } from './baseline/src/server/positions/timeline-service.mjs';
import { createSession } from './baseline/src/server/auth/session.mjs';
import { authorize } from './baseline/src/server/auth/authorize.mjs';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const ACTIONS=['directory:read','org:create','org:reparent','people:create','position:timeline:write','directory:publish'];
const TYPES=new Set(['SANGHA_UNIT','EDUCATION_UNIT','EXAMINATION_UNIT','SUPPORT_UNIT']);
const text=(v,name,max=240)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw Error(`INVALID_${name}`);return v.trim()};
const date=(v,name)=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(v)||!Number.isFinite(Date.parse(v)))throw Error(`INVALID_${name}`);return new Date(v).toISOString()};
const resource={id:'local-synthetic-portal',type:'Organisation',scopePath:'/SYN-GLOBAL'};
const safeEqual=(a,b)=>{const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&timingSafeEqual(x,y)};
function stores(state){
 const org=new OrganisationStore();org.orgs=new Map(state.organizations.map(o=>[o.id,o]));org.history=state.orgHistory;org.audit=state.audit;org.outbox=state.outbox;
 const people=new PeopleStore();people.people=new Map(state.people.map(p=>[p.id,p]));people.audit=state.audit;people.outbox=state.outbox;
 const timeline=new TimelineStore();timeline.assignments=state.assignments;timeline.events=state.assignmentEvents;timeline.audit=state.audit;timeline.outbox=state.outbox;
 return {org,people,timeline};
}
async function apply(state,actor,operation,input){
 const s=stores(state),now=new Date(),startAudit=state.audit.length;
 if(input?.isSynthetic!==true)throw Error('SYNTHETIC_ONLY');
 if(operation==='org:create'){
  const code=text(input.code,'CODE',100);if(state.organizations.some(o=>o.code===code))throw Error('DUPLICATE_CODE');
  if(!TYPES.has(input.type))throw Error('INVALID_ORGANISATION_TYPE');
  if(input.parentId&&!s.org.orgs.has(input.parentId))throw Error('UNKNOWN_PARENT');
  await createOrganisation({store:s.org,actor,resource,input:{id:randomUUID(),code,displayName:text(input.displayName,'NAME'),type:input.type,parentId:input.parentId||null,isSynthetic:true},now});
  state.organizations=[...s.org.orgs.values()];
 }else if(operation==='org:reparent'){
  await reparentOrganisation({store:s.org,actor,resource,id:text(input.id,'ID'),parentId:input.parentId||null,reason:text(input.reason,'REASON',1000),now});state.organizations=[...s.org.orgs.values()];
 }else if(operation==='people:create'){
  await createPerson({store:s.people,actor,resource,input:{id:randomUUID(),displayName:text(input.displayName,'NAME'),isSynthetic:true,contacts:[]},now});state.people=[...s.people.people.values()];
 }else if(operation==='assignment:add'){
  const org=state.organizations.find(x=>x.id===input.organizationId),person=state.people.find(x=>x.id===input.personId);if(!org||!person)throw Error('UNKNOWN_REFERENCE');
  const title=text(input.title,'TITLE');let pos=state.positionDefinitions.find(p=>p.organizationId===org.id&&p.title===title);if(!pos){pos={id:randomUUID(),organizationId:org.id,title};state.positionDefinitions.push(pos)}
  await appendAssignment({store:s.timeline,actor,resource,input:{id:randomUUID(),positionId:pos.id,personId:person.id,state:text(input.state,'STATE'),effectiveFrom:date(input.effectiveFrom,'START'),effectiveTo:input.effectiveTo?date(input.effectiveTo,'END'):null,documentRecordId:text(input.documentRecordId,'DOCUMENT'),isSynthetic:true},now});
 }else if(operation==='directory:publish'){
  authorize({actor,action:'directory:publish',resource,now});
  state.release={version:'SYN-LOCAL-'+(state.revision+1),released:true,entries:state.organizations.map(o=>{
   const positions=state.positionDefinitions.filter(p=>p.organizationId===o.id);return positions.length?positions.map(p=>({publicEntryId:'SYN-PUBLIC-'+p.id,organizationName:o.displayName,organizationType:o.type,positionTitle:p.title,releasedAssignments:state.assignments.filter(a=>a.positionId===p.id&&a.state!=='ENDED').map(a=>({displayName:state.people.find(v=>v.id===a.personId)?.displayName||'',effectiveFrom:a.effectiveFrom,effectiveTo:a.effectiveTo}))})):[{publicEntryId:'SYN-PUBLIC-'+o.id,organizationName:o.displayName,organizationType:o.type,positionTitle:'',releasedAssignments:[]}];
  }).flat()};
  state.audit.push({action:'directory:publish',entityId:state.release.version});state.outbox.push({type:'directory.published',aggregateId:state.release.version});
 }else throw Error('UNKNOWN_OPERATION');
 for(const event of state.audit.slice(startAudit))Object.assign(event,{actorId:actor.userId,at:now.toISOString(),requestId:randomUUID()});
 return state;
}
export async function startPortal({port=8082,dataFile=path.join(ROOT,'data/portal-state.json')}={}){
 let state;try{state=JSON.parse(await fs.readFile(dataFile,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e;state=JSON.parse(await fs.readFile(path.join(ROOT,'data/initial.json'),'utf8'))}
 const accessCode=randomBytes(12).toString('hex'),sessions=new Map();let queue=Promise.resolve();let loginCount=0,loginWindow=Date.now();
 const directory=new PublicDirectoryStore({activeRelease:state.release});
 const server=http.createServer(async(req,res)=>{
  const host=req.headers.host;
  const allowed=new Set([`127.0.0.1:${server.address().port}`,`localhost:${server.address().port}`]);
  const origin=req.headers.origin;
  const reply=(status,body,headers={})=>{const buffer=Buffer.isBuffer(body)?body:Buffer.from(JSON.stringify(body));res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':buffer.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",...headers});res.end(buffer)};
  if(!allowed.has(host))return reply(403,{error:'LOCAL_HOST_ONLY'});
  if(origin&&!allowed.has(origin.replace(/^http:\/\//,'')))return reply(403,{error:'LOCAL_ORIGIN_ONLY'});
  const url=new URL(req.url,`http://${host}`);
  const cookie=String(req.headers.cookie||'').match(/(?:^|;\s*)sangha_session=([a-f0-9]+)/)?.[1];let session=sessions.get(cookie);
  if(session&&new Date(session.actor.sessionExpiresAt)<=new Date()){sessions.delete(cookie);session=null}
  const auth=()=>{if(!session){const e=Error('UNAUTHENTICATED');e.status=401;throw e}return session.actor};
  const csrf=()=>{auth();if(origin!==`http://${host}`||!safeEqual(req.headers['x-csrf-token'],session.csrf)){const e=Error('FORBIDDEN');e.status=403;throw e}};
  const body=async()=>{if(!String(req.headers['content-type']).startsWith('application/json'))throw Error('JSON_REQUIRED');const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>65536){const e=Error('BODY_TOO_LARGE');e.status=413;throw e}chunks.push(chunk)}return JSON.parse(Buffer.concat(chunks).toString('utf8'))};
  try{
   if(req.method==='GET'&&['/','/index.html'].includes(url.pathname))return reply(200,await fs.readFile(path.join(ROOT,'index.html')),{'Content-Type':'text/html; charset=utf-8'});
   if(req.method==='GET'&&url.pathname==='/favicon.ico')return reply(204,Buffer.alloc(0));
   if(req.method==='GET'&&url.pathname==='/api/session')return reply(200,{authenticated:!!session,csrf:session?.csrf||null,expiresAt:session?.actor.sessionExpiresAt||null});
   if(req.method==='POST'&&url.pathname==='/api/login'){
    if(origin!==`http://${host}`)return reply(403,{error:'LOCAL_ORIGIN_ONLY'});
    if(Date.now()-loginWindow>60000){loginCount=0;loginWindow=Date.now()}if(++loginCount>10)return reply(429,{error:'LOGIN_RATE_LIMIT'},{'Retry-After':'60'});
    const v=await body();if(!safeEqual(v.code,accessCode))return reply(401,{error:'INVALID_ACCESS_CODE'});
    const now=new Date(),id=randomBytes(24).toString('hex');
    const actor=createSession({account:{id:'local-synthetic-editor',active:true},grants:ACTIONS.map(action=>({role:'DATA_STEWARD',action,scopePath:'/SYN-GLOBAL',validFrom:new Date(now.getTime()-60000).toISOString()})),now});
    const entry={actor,csrf:randomBytes(24).toString('hex')};sessions.set(id,entry);return reply(200,{authenticated:true,csrf:entry.csrf,expiresAt:actor.sessionExpiresAt},{'Set-Cookie':`sangha_session=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600`});
   }
   if(req.method==='POST'&&url.pathname==='/api/logout'){csrf();sessions.delete(cookie);return reply(200,{success:true},{'Set-Cookie':'sangha_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'})}
   if(req.method==='GET'&&url.pathname==='/api/admin/data'){authorize({actor:auth(),action:'directory:read',resource});return reply(200,state)}
   if(req.method==='GET'&&url.pathname==='/api/public/directory'){
    const asOf=url.searchParams.get('asOf')||new Date().toISOString();date(asOf,'ASOF');const query=url.searchParams.get('q')||'';if(query.length>240)throw Error('QUERY_TOO_LONG');
    const result=getPublicDirectoryResponse({store:directory,clientKey:req.socket.remoteAddress,query,organizationType:url.searchParams.get('type')||'',page:url.searchParams.get('page')||'1',pageSize:url.searchParams.get('pageSize')||'20',asOf});return reply(result.status,result.body,{...result.headers,'Cache-Control':'no-store'});
   }
   if(req.method==='POST'&&url.pathname==='/api/admin/mutate'){
    csrf();const payload=await body(),actor=auth();
    const task=queue.then(async()=>{
     if(payload.revision!==state.revision){const e=Error('REVISION_CONFLICT');e.status=409;throw e}
     const next=await apply(structuredClone(state),actor,payload.operation,payload.input);next.revision++;
     await fs.mkdir(path.dirname(dataFile),{recursive:true});const tmp=dataFile+'.'+randomUUID()+'.tmp';
     try{await fs.writeFile(tmp,JSON.stringify(next,null,2),{flag:'wx'});await fs.rename(tmp,dataFile)}catch(e){await fs.rm(tmp,{force:true});throw e}
     state=next;directory.publishReleasedProjection(state.release);return state;
    });queue=task.catch(()=>{});return reply(200,await task);
   }
   return reply(404,{error:'NOT_FOUND'});
  }catch(e){return reply(e.status||400,{error:e.code||e.message||'REQUEST_FAILED'})}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)});
 return {server,port:server.address().port,accessCode,dataFile,close:()=>new Promise(resolve=>server.close(resolve))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const arg=process.argv.indexOf('--port'),port=arg>=0?Number(process.argv[arg+1]):8082;
 const app=await startPortal({port});console.log(`Open http://127.0.0.1:${app.port}\nLocal editor access code: ${app.accessCode}\nSynthetic data only. Ctrl+C to stop.`);
}
