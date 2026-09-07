import { database } from '@/lib/database';
import { initialGroups } from '@/lib/model';
import { readGroup, readExercise, readTraining } from '@/lib/compatibility';
import { catalog } from '@/lib/catalog';
import { validateExercise,validateGroup,validateTraining,validatePreference } from '@/lib/validation';
export async function GET(){try{
 const db=database();const [g,e,t,p]=await Promise.all([db.prepare('SELECT * FROM groups').all(),db.prepare('SELECT data FROM exercises').all<{data:string}>(),db.prepare('SELECT data FROM trainings ORDER BY updated_at DESC LIMIT 500').all<{data:string}>(),db.prepare('SELECT exercise_id,mode FROM exercise_preferences').all<{exercise_id:string;mode:string}>()]);
 const merged=new Map(initialGroups.map(x=>[x.id,x]));for(const x of g.results)merged.set(x.id as string,readGroup(x));
 return Response.json({groups:[...merged.values()],exercises:[...catalog,...e.results.map(x=>readExercise(JSON.parse(x.data)))],trainings:t.results.map(x=>readTraining(JSON.parse(x.data))),preferences:Object.fromEntries(p.results.map(x=>[x.exercise_id,x.mode]))},{headers:{'Cache-Control':'no-store'}});
 }catch(error){console.error('Read failed',error);return Response.json({error:'Shranjevanja ni bilo mogoče naložiti. Poskusi znova.'},{status:503});}}
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Zahteva ni dovoljena.'},{status:403});
 let body:any;try{const raw=await request.text();if(raw.length>1500000)throw new Error('Trening je prevelik.');body=JSON.parse(raw);if(body.kind==='preference')validatePreference(body.data);else if(body.kind==='group')validateGroup(body.data);else if(body.kind==='exercise'){validateExercise(body.data);if(catalog.some(e=>e.id===body.data.id))throw new Error('Osnovne vaje ni mogoče prepisati. Shrani svojo različico.');}else if(body.kind==='training')validateTraining(body.data);else throw new Error('Neznana vrsta zapisa.');}catch(error){return Response.json({error:error instanceof Error?error.message:'Neveljavni podatki.'},{status:400});}
 try{const db=database(),d=body.data;
 if(body.kind==='preference'){
  if(d.mode!=='off'&&!catalog.some(e=>e.id===d.id)&&!await db.prepare('SELECT id FROM exercises WHERE id=?').bind(d.id).first())return Response.json({error:'Vaja ni več v knjižnici. Najprej shrani svojo različico.'},{status:404});
  if(d.mode==='off')await db.prepare('DELETE FROM exercise_preferences WHERE exercise_id=?').bind(d.id).run();
  else await db.prepare('INSERT INTO exercise_preferences (exercise_id,mode) VALUES (?,?) ON CONFLICT(exercise_id) DO UPDATE SET mode=excluded.mode').bind(d.id,d.mode).run();
  return Response.json({data:{id:d.id,mode:d.mode}});
 }
 if(body.kind==='group')await db.prepare('INSERT INTO groups (id,name,level,members,notes,profile) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,level=excluded.level,members=excluded.members,notes=excluded.notes,profile=excluded.profile').bind(d.id,d.name,d.level,d.members,d.notes,JSON.stringify({sessionsPerWeek:d.sessionsPerWeek??1,defaultDuration:d.defaultDuration??60,allowedSkills:d.allowedSkills??[],choreographySkills:d.choreographySkills??[]})).run();
 if(body.kind==='exercise')await db.prepare('INSERT INTO exercises (id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').bind(d.id,JSON.stringify({...d,custom:true})).run();
 if(body.kind==='training'){
  const saved={...d,revision:d.revision+1,updatedAt:new Date().toISOString()};let result;
  if(d.revision===0)result=await db.prepare('INSERT INTO trainings (id,title,date,data,revision,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(saved.id,saved.title,saved.date,JSON.stringify(saved),saved.revision,saved.updatedAt).run();
  else result=await db.prepare('UPDATE trainings SET title=?,date=?,data=?,revision=?,updated_at=? WHERE id=? AND revision=?').bind(saved.title,saved.date,JSON.stringify(saved),saved.revision,saved.updatedAt,saved.id,d.revision).run();
  if(result.meta.changes!==1)return Response.json({error:'Trening je bil medtem spremenjen. Odpri zadnjo shranjeno različico ali shrani kopijo.'},{status:409});
  return Response.json({data:saved});
 }
 return Response.json({data:{...d,...(body.kind==='exercise'?{custom:true}:{})}});
 }catch(error){console.error('Save failed',error);return Response.json({error:'Shranjevanje ni uspelo. Tvoje spremembe ostajajo v odprtem načrtu; poskusi znova.'},{status:503});}
}
