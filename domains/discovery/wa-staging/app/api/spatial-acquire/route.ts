import wheatbeltBoundary from "../../data/wheatbelt-boundary.json";
const STAC="https://planetarycomputer.microsoft.com/api/stac/v1/search",STATS="https://planetarycomputer.microsoft.com/api/data/v1/item/statistics",RED=[116.088,-31.84,116.112,-31.821],SPAN=5;
const EX={mean_ndvi:"(nir08-red)/(nir08+red)",mean_ndmi:"(nir08-swir16)/(nir08+swir16)",mean_ndwi:"(green-nir08)/(green+nir08)",mean_bare_soil_index:"((swir16+red)-(nir08+blue))/(swir16+red+nir08+blue)"} as const;
type P=[number,number]; type Metrics=Record<keyof typeof EX,number|null>; type Scene={id:string;properties:Record<string,unknown>;assets:Record<string,{href:string}>};
type Obs={scene_id:string;acquired_at:string|null;cloud_cover_percent:unknown;pixels_sampled:number;clear_pixels_used:number;metrics:Metrics};
type Tile={tile_id:string;bbox:number[];geometry_geojson:{type:"Polygon";coordinates:number[][][]};status:string;observation:Obs;baseline_observation:Obs;change:{days_between:number|null;classification:string;metrics:Metrics;review_note:string};scenes_qualified:number;preview_url:string};
const feature=(b:number[])=>({type:"Feature",properties:{},geometry:{type:"Polygon",coordinates:[[[b[0],b[1]],[b[2],b[1]],[b[2],b[3]],[b[0],b[3]],[b[0],b[1]]]]}});
const date=(s:Scene)=>typeof s.properties.datetime==="string"?new Date(s.properties.datetime):null;
const bounds=(p:P[])=>[Math.min(...p.map(x=>x[0])),Math.min(...p.map(x=>x[1])),Math.max(...p.map(x=>x[0])),Math.max(...p.map(x=>x[1]))];
function inside([x,y]:P,p:P[]){let yes=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [a,b]=p[i],[c,d]=p[j];if((b>y)!==(d>y)&&x<((c-a)*(y-b))/(d-b)+a)yes=!yes;}return yes}
function hit(p:P[],b:number[]){const [w,s,e,n]=b,c:P[]=[[w,s],[e,s],[e,n],[w,n]];return p.some(([x,y])=>x>=w&&x<=e&&y>=s&&y<=n)||c.some(x=>inside(x,p));}
function clip(p:P[],b:number[]){let out=p.slice();const edges=[{inside:(q:P)=>q[0]>=b[0],cross:(a:P,z:P)=>[b[0],a[1]+(z[1]-a[1])*(b[0]-a[0])/(z[0]-a[0])] as P},{inside:(q:P)=>q[0]<=b[2],cross:(a:P,z:P)=>[b[2],a[1]+(z[1]-a[1])*(b[2]-a[0])/(z[0]-a[0])] as P},{inside:(q:P)=>q[1]>=b[1],cross:(a:P,z:P)=>[a[0]+(z[0]-a[0])*(b[1]-a[1])/(z[1]-a[1]),b[1]] as P},{inside:(q:P)=>q[1]<=b[3],cross:(a:P,z:P)=>[a[0]+(z[0]-a[0])*(b[3]-a[1])/(z[1]-a[1]),b[3]] as P}];for(const edge of edges){const input=out;out=[];for(let i=0;i<input.length;i++){const a=input[(i+input.length-1)%input.length],z=input[i],ai=edge.inside(a),zi=edge.inside(z);if(zi){if(!ai)out.push(edge.cross(a,z));out.push(z)}else if(ai)out.push(edge.cross(a,z))}}if(out.length&&String(out[0])!==String(out.at(-1)))out.push([...out[0]] as P);return out}
const area=(p:P[])=>Math.abs(p.reduce((sum,[x,y],index)=>{const [nx,ny]=p[(index+1)%p.length];return sum+x*ny-nx*y},0))/2;
function tiles(p:P[]){const [w,s,e,n]=bounds(p),cols=Math.max(1,Math.ceil((e-w)/SPAN)),rows=Math.max(1,Math.ceil((n-s)/SPAN)),dx=(e-w)/cols,dy=(n-s)/rows,out:{tile_id:string;bbox:number[];geometry_geojson:{type:"Polygon";coordinates:number[][][]};boundary_coverage_percent:number}[]=[];for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const cell=[w+c*dx,s+r*dy,w+(c+1)*dx,s+(r+1)*dy],shape=clip(p,cell),coverage=shape.length>=4?area(shape)/(dx*dy)*100:0;if(coverage>=15){const b=bounds(shape);out.push({tile_id:`T${String(out.length+1).padStart(2,"0")}`,bbox:b,geometry_geojson:{type:"Polygon",coordinates:[shape]},boundary_coverage_percent:coverage})}}return out;}
async function observe(scene:Scene,f:object):Promise<Obs>{const u=new URL(STATS);u.searchParams.set("collection","landsat-c2-l2");u.searchParams.set("item",scene.id);u.searchParams.set("asset_as_band","true");u.searchParams.set("expression",Object.values(EX).join(";"));u.searchParams.set("max_size","128");const res=await fetch(u,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(f)});if(!res.ok)throw Error(`Pixel statistics HTTP ${res.status}`);const st=((await res.json()) as any).properties?.statistics??{},first=st[EX.mean_ndvi];if(!first?.valid_pixels)throw Error("No valid pixels");const m=(x:string)=>st[x]?.mean??null;return{scene_id:scene.id,acquired_at:typeof scene.properties.datetime==="string"?scene.properties.datetime:null,cloud_cover_percent:scene.properties["eo:cloud_cover"]??null,pixels_sampled:first.valid_pixels+first.masked_pixels,clear_pixels_used:first.valid_pixels,metrics:{mean_ndvi:m(EX.mean_ndvi),mean_ndmi:m(EX.mean_ndmi),mean_ndwi:m(EX.mean_ndwi),mean_bare_soil_index:m(EX.mean_bare_soil_index)}}}
const delta=(a:number|null,b:number|null)=>a==null||b==null?null:a-b;
function classify(m:Metrics){const v=Object.values(m).filter((x):x is number=>x!=null).map(Math.abs),max=v.length?Math.max(...v):0;return max<.03?"STABLE SPECTRAL SIGNAL":max>.1?"SIGNIFICANT SPECTRAL CHANGE":"MODERATE SPECTRAL CHANGE"}
async function process(t:{tile_id:string;bbox:number[];geometry_geojson:{type:"Polygon";coordinates:number[][][]}},start:Date,end:Date):Promise<Tile>{
  const res=await fetch(STAC,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({collections:["landsat-c2-l2"],bbox:t.bbox,datetime:`${start.toISOString()}/${end.toISOString()}`,limit:24,query:{"eo:cloud_cover":{lte:60}},sortby:[{field:"properties.datetime",direction:"desc"}]})});
  if(!res.ok)throw Error(`Catalogue HTTP ${res.status}`);
  const scenes=((await res.json()) as any).features as Scene[]??[];
  if(!scenes.length)throw Error("No qualifying scene");
  const governedShape={type:"Feature",properties:{tile_id:t.tile_id},geometry:t.geometry_geojson};
  let current:{scene:Scene;observation:Obs}|null=null,baseline:{scene:Scene;observation:Obs}|null=null,fallback:{scene:Scene;observation:Obs}|null=null,attempted=0;
  for(const scene of scenes){
    attempted++;
    try{
      const observation=await observe(scene,governedShape);
      if(!current){current={scene,observation};continue}
      fallback={scene,observation};
      const currentDate=date(current.scene),candidateDate=date(scene);
      if(currentDate&&candidateDate&&currentDate.getTime()-candidateDate.getTime()>=45*864e5){baseline=fallback;break}
    }catch{/* A catalogue hit may not contain usable pixels inside the exact governed polygon. */}
  }
  baseline??=fallback;
  if(!current)throw Error(`No valid pixels after checking ${attempted} qualified scenes`);
  if(!baseline||baseline.scene.id===current.scene.id)throw Error(`Comparison pixels unavailable after checking ${attempted} qualified scenes`);
  const a=current.observation,b=baseline.observation,latest=current.scene,base=baseline.scene,ld=date(latest),m={mean_ndvi:delta(a.metrics.mean_ndvi,b.metrics.mean_ndvi),mean_ndmi:delta(a.metrics.mean_ndmi,b.metrics.mean_ndmi),mean_ndwi:delta(a.metrics.mean_ndwi,b.metrics.mean_ndwi),mean_bare_soil_index:delta(a.metrics.mean_bare_soil_index,b.metrics.mean_bare_soil_index)};
  return{...t,status:"COMPUTED_UNVALIDATED",observation:a,baseline_observation:b,change:{days_between:ld&&date(base)?Math.round((ld.getTime()-(date(base) as Date).getTime())/864e5):null,classification:classify(m),metrics:m,review_note:"Requires expert attribution."},scenes_qualified:scenes.length,preview_url:latest.assets.rendered_preview?.href??""}
}
function weighted(ts:Tile[],field:"observation"|"baseline_observation"):Metrics{return Object.fromEntries((Object.keys(EX) as (keyof Metrics)[]).map(k=>{const use=ts.filter(t=>t[field].metrics[k]!=null),w=use.reduce((s,t)=>s+t[field].clear_pixels_used,0);return[k,w?use.reduce((s,t)=>s+(t[field].metrics[k] as number)*t[field].clear_pixels_used,0)/w:null]})) as Metrics}
export async function POST(req:Request){
  const origin=req.headers.get("origin"),host=req.headers.get("host");
  if(origin&&host&&new URL(origin).host!==host)return Response.json({error:"Cross-origin request rejected."},{status:403});
  try{
    const body=await req.json().catch(()=>({})) as any;
    const valid=(point:unknown):point is P=>Array.isArray(point)&&point.length===2&&point.every(Number.isFinite);
    const geometry=body.region_code==="WA-DPIRD-WHEATBELT"?wheatbeltBoundary:body.geometry_geojson;
    const rawPolygons:unknown[] = geometry?.type==="Polygon" ? [geometry.coordinates] : geometry?.type==="MultiPolygon" ? geometry.coordinates : [];
    const polygons:P[][]=rawPolygons.map((item:any)=>item?.[0]?.filter(valid)??[]).filter((ring:P[])=>ring.length>=4);
    if(geometry&&!polygons.length)return Response.json({error:"Invalid area geometry."},{status:400});
    if(!polygons.length)polygons.push(feature(RED).geometry.coordinates[0] as P[]);
    const allPoints=polygons.flat(),bb=bounds(allPoints);
    if(bb[0]<112.5||bb[2]>129.1||bb[1]<-35.3||bb[3]>-13.2)return Response.json({error:"Area falls outside the authorised Western Australia workspace."},{status:400});
    const end=new Date(),start=new Date(end.getTime()-365*864e5);
    const grid=polygons.flatMap(polygon=>tiles(polygon)).map((tile,index)=>({...tile,tile_id:`T${String(index+1).padStart(2,"0")}`}));
    if(body.mode==="plan")return Response.json({area:body.region_name??"Governed Western Australia area",bbox:bb,tile_summary:{total:grid.length},tiles:grid,method_version:"AAB-GOVERNED-REGION-PLAN-1.0"});
    const settled:PromiseSettledResult<Tile>[]=[];
    for(let i=0;i<grid.length;i+=4)settled.push(...await Promise.allSettled(grid.slice(i,i+4).map(t=>process(t,start,end))));
    const done=settled.filter((x):x is PromiseFulfilledResult<Tile>=>x.status==="fulfilled").map(x=>x.value);
    const failed=settled.map((x,i)=>x.status==="rejected"?{...grid[i],status:"FAILED",error:x.reason instanceof Error?x.reason.message:"Failed"}:null).filter(Boolean);
    if(!done.length)throw Error(failed[0]&&"error" in failed[0]?String(failed[0].error):"No tiles produced a valid pixel observation for this period.");
    const m=weighted(done,"observation"),bm=weighted(done,"baseline_observation"),change:Metrics={mean_ndvi:delta(m.mean_ndvi,bm.mean_ndvi),mean_ndmi:delta(m.mean_ndmi,bm.mean_ndmi),mean_ndwi:delta(m.mean_ndwi,bm.mean_ndwi),mean_bare_soil_index:delta(m.mean_bare_soil_index,bm.mean_bare_soil_index)},latest=done.reduce((a,b)=>(b.observation.acquired_at??"")>(a.observation.acquired_at??"")?b:a);
    return Response.json({source:"USGS Landsat Collection 2 Level-2 via Microsoft Planetary Computer",area:body.region_name??"Governed Western Australia area",bbox:bb,queried_at:end.toISOString(),tiled:grid.length>1,tile_summary:{total:grid.length,completed:done.length,failed:failed.length},tiles:[...done,...failed],scenes_qualified:done.reduce((s,t)=>s+t.scenes_qualified,0),observation:{scene_id:grid.length>1?`AAB-TILED-${end.toISOString()}`:latest.observation.scene_id,acquired_at:latest.observation.acquired_at,cloud_cover_percent:null,pixels_sampled:done.reduce((s,t)=>s+t.observation.pixels_sampled,0),clear_pixels_used:done.reduce((s,t)=>s+t.observation.clear_pixels_used,0),metrics:m,tiles:done},baseline_observation:{...latest.baseline_observation,metrics:bm},change:{days_between:latest.change.days_between,classification:classify(change),metrics:change,review_note:"Combined values are clear-pixel-weighted across completed tiles. Failed tiles remain visible for review."},preview_url:latest.preview_url,evidence_status:"COMPUTED_UNVALIDATED",method_version:"AAB-LANDSAT-SR-TILED-CHANGE-2.3-REGIONAL-JOBS",boundary:`AAB divided the authoritative geometry into ${grid.length} evidence tiles. ${done.length} completed and ${failed.length} failed. Results remain unvalidated.`});
  }catch(e){return Response.json({error:e instanceof Error?e.message:"Spatial processing failed"},{status:500})}
}
