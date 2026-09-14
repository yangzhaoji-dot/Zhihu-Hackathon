import { getPlanetLaw } from "./law-catalog";
import { SCIENTIFIC_LAWS } from "./scientific-law-additions";
import { DEMO_GRAPHS } from "../cognitive-galaxy/demo";
import { getCuratedDemoLawPreset } from "../cognitive-galaxy/demo-law-curation";
const find=(id:string)=>getPlanetLaw(id)??SCIENTIFIC_LAWS.find(x=>x.id===id)??null;
export function resolveDemoLaw(title:string){for(const g of Object.values(DEMO_GRAPHS)){const o=g.opinions.find(x=>x.title===title);if(!o)continue;const p=getCuratedDemoLawPreset(o.id,o.title),law=p?find(p.lawId):null;if(p&&law)return{law,match:{...p,quality:p.confidence>=.72?"strong":p.confidence>=.48?"plausible":"exploratory",source:"fallback",model:"authored-demo"}};}return null;}
