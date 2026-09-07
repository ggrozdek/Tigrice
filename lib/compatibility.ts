import { categories, type Category, type Exercise, type Group, type Training, initialGroups } from './model';
const aliases:Record<string,Category>={Stunt:'Tehnika',Tumbling:'Parter',Jumps:'Skoki',Dance:'Koreografija',Raztezanje:'Zaključni razteg'};
const category=(value:string):Category=>aliases[value]??value as Category;
export function readExercise<T extends Exercise>(value:T):T {
 return {...value,category:category(value.category),performanceCheer:value.performanceCheer??false};
}
export function readTraining(value:Training):Training {
 const t=structuredClone(value);
 t.settings.focus=[...new Set(t.settings.focus.map(category))].filter(c=>categories.includes(c));
 t.settings.techniquePercent??=100;t.settings.allowedSkills??=[];t.settings.choreographySkills??=[];
 t.blocks=t.blocks.map(b=>({...b,category:category(b.category),items:b.items.map(readExercise)}));
 if(t.blocks.some(b=>b.items.some(e=>!e.performanceCheer))&&!t.warnings.some(w=>w.startsWith('Starejši trening:')))
  t.warnings=['Starejši trening: prvotne vaje so ohranjene kot zgodovina. Pred ponovno uporabo jih preglej za performance cheer; nov trening sestavi iz nove knjižnice.',...t.warnings].slice(0,50);
 return t;
}
export function readGroup(row:any):Group {
 const defaults=initialGroups.find(g=>g.id===row.id);
 const profile=row.profile?JSON.parse(row.profile):{};
 const {profile:_,...fields}=row;
 return {...defaults,...fields,...profile,allowedSkills:profile.allowedSkills??[],choreographySkills:profile.choreographySkills??[]};
}
