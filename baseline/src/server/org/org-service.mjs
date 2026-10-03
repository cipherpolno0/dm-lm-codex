import { authorize } from '../auth/authorize.mjs';

const PARENTS = Object.freeze({ SANGHA_UNIT: [null, 'SANGHA_UNIT'], EDUCATION_UNIT: ['SANGHA_UNIT'], EXAMINATION_UNIT: ['EDUCATION_UNIT'], SUPPORT_UNIT: ['SANGHA_UNIT', 'EDUCATION_UNIT'] });
export class OrganisationStore { constructor(){ this.orgs=new Map(); this.history=[]; this.audit=[]; this.outbox=[]; } async transaction(fn){ return fn(this); } }
function allowed(type, parent){ return (PARENTS[type] ?? []).includes(parent?.type ?? null); }
function cycle(store,id,parentId){ for(let cursor=parentId; cursor; cursor=store.orgs.get(cursor)?.parentId) if(cursor===id) return true; return false; }
export async function createOrganisation({store,actor,resource,input,now=new Date()}) {
  authorize({actor,action:'org:create',resource,now}); const parent=input.parentId?store.orgs.get(input.parentId):null;
  if(!input.isSynthetic || !allowed(input.type,parent) || cycle(store,input.id,input.parentId)) throw new Error('INVALID_ORGANISATION_HIERARCHY');
  return store.transaction(async tx=>{ if(tx.orgs.has(input.id)) throw new Error('DUPLICATE_ORGANISATION'); const row={...input,createdAt:now.toISOString()}; tx.orgs.set(row.id,row); tx.history.push({type:'CREATED',orgId:row.id,at:row.createdAt}); tx.audit.push({action:'org:create',entityId:row.id}); tx.outbox.push({type:'org.created',aggregateId:row.id}); return row; });
}
export async function reparentOrganisation({store,actor,resource,id,parentId,reason,now=new Date()}) {
  authorize({actor,action:'org:reparent',resource,now}); const org=store.orgs.get(id), parent=parentId?store.orgs.get(parentId):null;
  if(!org || (parentId && !parent) || !reason || !allowed(org.type,parent) || cycle(store,id,parentId)) throw new Error('INVALID_REPARENT');
  return store.transaction(async tx=>{ const previousParentId=org.parentId??null; org.parentId=parentId??null; tx.history.push({type:'REPARENTED',orgId:id,previousParentId,parentId:org.parentId,reason,at:now.toISOString()}); tx.audit.push({action:'org:reparent',entityId:id}); tx.outbox.push({type:'org.reparented',aggregateId:id}); return org; });
}
export function searchOrganisations(store,{q='',type,parentId}={}){ const needle=q.toLowerCase(); return [...store.orgs.values()].filter(o=>(!type||o.type===type)&&(!parentId||o.parentId===parentId)&&(!needle||o.code.toLowerCase().includes(needle)||o.displayName.toLowerCase().includes(needle))); }
