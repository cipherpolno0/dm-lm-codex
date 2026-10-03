import { authorize } from '../auth/authorize.mjs';
const STATES=new Set(['ACTING','APPOINTED','ENDED']);
export class TimelineStore { constructor(){this.assignments=[];this.events=[];this.audit=[];this.outbox=[];} async transaction(fn){return fn(this);} }
const end=(value)=>value?new Date(value).getTime():Infinity;
const overlaps=(a,b)=>new Date(a.effectiveFrom).getTime()<end(b.effectiveTo)&&new Date(b.effectiveFrom).getTime()<end(a.effectiveTo);
export async function appendAssignment({store,actor,resource,input,now=new Date()}){
 authorize({actor,action:'position:timeline:write',resource,now}); if(!STATES.has(input.state)||!input.documentRecordId||new Date(input.effectiveFrom)>=end(input.effectiveTo))throw Error('INVALID_TIMELINE');
 if(store.assignments.some(x=>x.positionId===input.positionId&&overlaps(x,input)))throw Error('OVERLAPPING_ASSIGNMENT');
 return store.transaction(async tx=>{const row={...input,createdAt:now.toISOString()};tx.assignments.push(row);tx.events.push({id:`${input.id}:event`,assignmentId:input.id,state:input.state,effectiveAt:input.effectiveFrom});tx.audit.push({action:'position:timeline:append',entityId:input.id});tx.outbox.push({type:'position.timeline.appended',aggregateId:input.positionId});return row;});
}
export function effectiveAssignments(store,at){const t=new Date(at).getTime();return store.assignments.filter(x=>new Date(x.effectiveFrom).getTime()<=t&&t<end(x.effectiveTo));}
export function secretaryLinks(store,principalAssignmentId){return store.assignments.filter(x=>x.secretaryForAssignmentId===principalAssignmentId);}
