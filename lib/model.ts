export const categories = ['Ogrevanje','Razteg telesa','Tehnika','Skoki','Obrati','Parter','Koreografija','Kondicija','Zaključni razteg'] as const;
export type Category = typeof categories[number];
export const goals = ['Tehnika','Usklajenost','Moč','Gibljivost','Vzdržljivost'] as const;
export const equipment = ['Blazine','Elastike','Stožci','Pomponi','Uteži 0,5 kg','Ščitniki za kolena'] as const;
export const restrictions = ['Brez skokov','Brez opore na zapestjih','Brez partnerskih vaj'] as const;
export const intensityNames = ['Nizka','Srednja','Visoka'] as const;
export type Intensity = typeof intensityNames[number];
export type PreferenceMode = 'off' | 'favorite' | 'always';
export type Preferences = Record<string, PreferenceMode>;
export const skills = ['Svinčnik','X-skok','Toe touch','Jeté','Split leap','Dvojni toe touch','Calypso','Switch leap','Tilt jump','Delni obrati','Enojna pirueta','Dvojna pirueta','Kolo','Kolo z eno roko','Kolo brez rok'] as const;
export type Skill = typeof skills[number];
export type Group = { id:string; name:string; level:number; members:number; notes:string; sessionsPerWeek?:number; defaultDuration?:number; allowedSkills?:Skill[]; choreographySkills?:Skill[] };
export type Exercise = { id:string; name:string; category:Category; levels:number[]; duration:number; intensity:Intensity; equipment:string[]; goals:string[]; tags:string[]; instructions:string; custom?:boolean; performanceCheer?:boolean; skill?:Skill };
export type Settings = { groupId:string; level:number; duration:number; focus:Category[]; goals:string[]; intensity:Intensity; equipment:string[]; restrictions:string[]; description:string; details:string; techniquePercent?:number; varyWarmup?:boolean; allowedSkills?:Skill[]; choreographySkills?:Skill[] };
export type Item = Exercise & { instanceId:string; notes:string };
export type Block = { id:string; category:Category; items:Item[] };
export type Training = { id:string; title:string; date:string; settings:Settings; blocks:Block[]; warnings:string[]; revision:number; updatedAt:string };
export const initialGroups:Group[] = [
 {id:'osnovnosolska',name:'Osnovnošolska skupina',level:1,members:12,sessionsPerWeek:1,defaultDuration:45,allowedSkills:[],choreographySkills:[],notes:'1× tedensko po 45 minut. Osnove plesne tehnike in priprave. Pred prvim sestavljanjem označi elemente, ki jih skupina lahko vadi.'},
 {id:'mladinci',name:'Mladinska skupina',level:2,members:16,sessionsPerWeek:2,defaultDuration:90,allowedSkills:[],choreographySkills:[],notes:'2× tedensko; mešana pripravljenost od novih mladink do plesalk s člansko tehniko. Označi skupni nabor elementov. Zahtevnejše različice dodaj ločeno za pripravljene plesalke. 90 min je začetni predlog trajanja.'},
];
export const defaultSettings:Settings = {groupId:'mladinci',level:2,duration:90,focus:['Tehnika','Skoki','Obrati'],goals:['Tehnika','Usklajenost'],intensity:'Srednja',equipment:['Blazine'],restrictions:[],description:'',details:'',techniquePercent:100,allowedSkills:[],choreographySkills:[]};
export const settingsForGroup=(s:Settings,g:Group):Settings=>({...s,groupId:g.id,level:g.level,duration:g.defaultDuration??s.duration,allowedSkills:[...(g.allowedSkills??[])],choreographySkills:[...(g.choreographySkills??[])]});
export const uid=()=>crypto.randomUUID();
export const totalMinutes=(t:Training)=>t.blocks.reduce((n,b)=>n+b.items.reduce((s,e)=>s+e.duration,0),0);
export const normalize=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
