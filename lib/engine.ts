import { categories, normalize, uid, type Settings, type Exercise, type Training, type Item, type Category, type Preferences } from './model';
export function interpret(s:Settings):Settings{
 const text=normalize(s.description+' '+s.details);
 const limits=new Set(s.restrictions);
 if(/brez (skok|poskok)|ne (zelimo )?skak/.test(text))limits.add('Brez skokov');
 if(/brez (opore|obremenitve).*zapest|brez opore na rok/.test(text))limits.add('Brez opore na zapestjih');
 if(/brez partner/.test(text))limits.add('Brez partnerskih vaj');
 const focus=new Set(s.focus);
 const words:Partial<Record<Category,RegExp>>={Tehnika:/tehnik|kick|spick|releve|passe|fokus/,Skoki:/skok|toe touch|jete|calypso|leap/,Obrati:/obrat|piruet/,Parter:/parter|gimnast|kolo/,Koreografija:/koreograf|mix|pesem/};
 for(const [c,re] of Object.entries(words))if(re.test(text))focus.add(c as Category);
 if(limits.has('Brez skokov'))focus.delete('Skoki');
 if(/brez obrat|brez piruet/.test(text))focus.delete('Obrati');
 if(/brez parter|brez gimnast/.test(text))focus.delete('Parter');
 const selectedGoals=new Set(s.goals);
 if(/usklajen|sinhron|ritem/.test(text))selectedGoals.add('Usklajenost');
 if(/moc|kondic/.test(text))selectedGoals.add('Moč');
 if(/gibljiv|raztez/.test(text))selectedGoals.add('Gibljivost');
 let intensity=s.intensity;
 if(/lahk|lazj|nizka intenziv/.test(text))intensity='Nizka';
 const eq=/brez opreme/.test(text)?[]:s.equipment.filter(e=>!new RegExp('brez '+normalize(e).slice(0,-1)).test(text));
 return {...s,focus:[...focus],goals:[...selectedGoals],restrictions:[...limits],equipment:eq,intensity};
}
export function eligible(e:Exercise,s:Settings){return e.performanceCheer!==false&&(!e.skill||((s.allowedSkills??[]).includes(e.skill)&&((s.techniquePercent??100)===100||(s.choreographySkills??[]).includes(e.skill))))&&e.levels.includes(s.level)&&e.equipment.every(x=>s.equipment.includes(x))&&
 !(s.restrictions.includes('Brez skokov')&&e.tags.includes('jump'))&&
 !(s.restrictions.includes('Brez opore na zapestjih')&&e.tags.includes('wrist'))&&
 !(s.restrictions.includes('Brez partnerskih vaj')&&e.tags.includes('partner'));}
export function alternatives(item:Item,s:Settings,library:Exercise[],used:string[]=[]){
 const effective=interpret(s);
 return library.filter(e=>e.id!==item.id&&!used.includes(e.id)&&eligible(e,effective)&&e.category===item.category&&e.intensity===item.intensity&&item.goals.every(g=>e.goals.includes(g))&&e.equipment.length===item.equipment.length&&e.equipment.every(x=>item.equipment.includes(x))&&Math.abs(e.duration-item.duration)<=Math.max(3,item.duration*.5));
}
export function makeItem(e:Exercise,duration=e.duration):Item{return {...structuredClone(e),instanceId:uid(),duration,notes:''};}
export function weightedOrder(exercises:Exercise[],s:Settings,preferences:Preferences,random:()=>number=Math.random){
 return exercises.map(e=>({e,score:-Math.log(Math.max(Number.EPSILON,Math.min(1-Number.EPSILON,random())))/((preferences[e.id]==='favorite'?4:1)*(1+e.goals.filter(g=>s.goals.includes(g)).length))})).sort((a,b)=>a.score-b.score).map(x=>x.e);
}
export function generate(settings:Settings,library:Exercise[],preferences:Preferences={},random:()=>number=Math.random):Training{
 const s=interpret(settings),warnings:string[]=[];
 const percent=s.techniquePercent??100;
 const choreography=percent<100;
 const selectedSkills=choreography?(s.choreographySkills??[]).filter(k=>(s.allowedSkills??[]).includes(k)):(s.allowedSkills??[]);
 const effective={...s,allowedSkills:selectedSkills};
 if(!(s.allowedSkills??[]).length)warnings.push('Skupina še nima dovoljenih elementov. Na zavihku Skupine označi skoke, obrate in gimnastične elemente, ki jih lahko vadi. Do takrat načrt vsebuje predpriprave in plesno tehniko.');
 if(choreography&&!(s.choreographySkills??[]).length)warnings.push('Elementi koreografije še niso izbrani. Dodaj jih pri skupini; do takrat vadi predpriprave ter korake in označevanje koreografije.');
 const retired=Object.keys(preferences).filter(id=>preferences[id]!=='off'&&!library.some(e=>e.id===id));
 if(retired.length)warnings.push('Oznake iz prejšnje knjižnice ne veljajo za nove vaje. V Knjižnici vaj ponovno izberi priljubljene oziroma obvezne vaje.');
 const warm=Math.max(4,Math.round(s.duration*.17)),stretch=Math.max(3,Math.round(s.duration*.14)),cool=Math.max(2,Math.round(s.duration*.06));
 const main=s.duration-warm-stretch-cool,tech=Math.round(main*percent/100),dance=main-tech;
 const pool=(category:Category)=>library.filter(e=>e.category===category&&eligible(e,effective)&&e.intensity===((category==='Razteg telesa'||category==='Zaključni razteg')?'Nizka':s.intensity));
 const skillCategories:Category[]=['Skoki','Obrati','Parter'];
 const selected=skillCategories.filter(c=>(choreography||s.focus.includes(c))&&pool(c).length);
 // General technique precedes specific elements. Conditioning is part of technical preparation.
 const prep=Math.max(1,Math.round(tech*(selected.length?.45:1)));
 const schedule:{category:Category;time:number;exercises:Exercise[]}[]=[{category:'Ogrevanje',time:warm,exercises:pool('Ogrevanje')},{category:'Razteg telesa',time:stretch,exercises:pool('Razteg telesa')},{category:'Tehnika',time:prep,exercises:[...pool('Tehnika'),...pool('Kondicija')]}];
 const specific=tech-prep;
 selected.forEach((category,i)=>schedule.push({category,time:Math.floor(specific/selected.length)+(i<specific%selected.length?1:0),exercises:pool(category)}));
 if(dance)schedule.push({category:'Koreografija',time:dance,exercises:pool('Koreografija')});
 schedule.push({category:'Zaključni razteg',time:cool,exercises:pool('Zaključni razteg')});
 for(const e of library.filter(e=>preferences[e.id]==='always'))if(!schedule.some(p=>p.time>0&&p.exercises.some(x=>x.id===e.id)))warnings.push('Vedno vključi: »'+e.name+'« ne ustreza skupini, tipu treninga, izbranim elementom, opremi, intenzivnosti ali omejitvam.');
 const blocks=schedule.filter(p=>p.time>0).map(p=>{
  if(!p.exercises.length)throw new Error('Za sklop '+p.category+' ni ustreznih vaj. Preveri pogoje ali dodaj svojo vajo.');
  const fixed=p.category==='Razteg telesa'||p.category==='Zaključni razteg';
  if(fixed)return {id:uid(),category:p.category,items:[makeItem(p.exercises[0],p.time)]};
  let remaining=p.time;const items:Item[]=[];
  for(const e of p.exercises.filter(e=>preferences[e.id]==='always')){if(e.duration<=remaining){items.push(makeItem(e));remaining-=e.duration;}else warnings.push('Vedno vključi: za »'+e.name+'« v tem sklopu ni dovolj časa. Podaljšaj trening ali prilagodi delež tehnike.');}
  const others=p.exercises.filter(e=>preferences[e.id]!=='always');
  if(remaining&&!others.length)throw new Error('Obvezne vaje presegajo čas sklopa. Podaljšaj trening ali prilagodi delež.');
  let ranked=weightedOrder(others,s,preferences,random);
  if(p.category==='Ogrevanje'&&!s.varyWarmup&&!others.some(e=>preferences[e.id]==='favorite')){const preferred=['pc-tek-','pc-plank-','pc-deadbug-warm-','pc-squat-warm-','pc-toe-warm-'];const rank=(e:Exercise)=>preferred.findIndex(k=>e.id.startsWith(k))<0?99:preferred.findIndex(k=>e.id.startsWith(k));ranked=[...others].sort((a,b)=>rank(a)-rank(b));}
  if(skillCategories.includes(p.category)){
   const first=ranked.filter((e,i)=>ranked.findIndex(x=>x.skill===e.skill)===i);
   ranked=[...first,...ranked.filter(e=>!first.includes(e))];
  }
  const distinct=new Set(ranked.filter(e=>e.skill).map(e=>e.skill)).size;
  const count=Math.min(remaining,Math.max(Math.ceil(remaining/8),Math.min(distinct,Math.floor(remaining/2))));
  for(let i=0;i<count;i++)items.push(makeItem(ranked[i%ranked.length],Math.floor(remaining/count)+(i<remaining%count?1:0)));
  for(const e of items){
   e.notes=e.skill&&choreography?'Element iz koreografije: najprej posamezni poskusi, nato z vhodom in izhodom na vašo glasbo.':'Čas vključuje razlago, izvedbo, odmore in popravke.';
   if(e.id.startsWith('pc-routine-')){
    const allowed=library.filter(x=>x.skill&&eligible(x,effective)&&x.intensity===s.intensity);
    const names=[...new Set(allowed.map(x=>x.skill!))];
    e.notes='Polna izvedba: '+(names.join(', ')||'brez elementov; označi jih in vadi plesne korake')+'. Vse ostale elemente označi.';
    e.tags=[...new Set(allowed.flatMap(x=>x.tags))];
   }
  }
  return {id:uid(),category:p.category,items};
 });
 const practiced=new Set(blocks.flatMap(b=>b.items.map(e=>e.skill)).filter(Boolean));
 const missing=selectedSkills.filter(k=>!practiced.has(k));
 if(missing.length)warnings.push('V samostojni drill niso vključeni: '+missing.join(', ')+'. Preveri izbrane sklope, čas, opremo in omejitve; po potrebi povečaj delež tehnike.');
 const title=percent===100?'Tehnični trening':percent<=30?'Koreografski trening':'Mešani trening';
 return {id:uid(),title,date:new Date().toLocaleDateString('en-CA'),settings:s,blocks,warnings:warnings.slice(0,50),revision:0,updatedAt:new Date().toISOString()};
}
export function blank(s:Settings):Training{return {id:uid(),title:'Moj trening',date:new Date().toLocaleDateString('en-CA'),settings:interpret(s),blocks:categories.filter(c=>['Ogrevanje','Razteg telesa','Tehnika','Koreografija','Zaključni razteg'].includes(c)).map(category=>({id:uid(),category,items:[]})),warnings:[],revision:0,updatedAt:new Date().toISOString()};}
