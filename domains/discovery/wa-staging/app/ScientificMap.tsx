"use client";

import {useEffect,useRef,useState} from "react";
import * as maplibregl from "maplibre-gl";
import type {Map as MapLibreMap} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import ForensicExplorer from "./ForensicExplorer";

type Tile={tile_id:string;bbox:number[];measurement_bbox?:number[];display_context?:boolean;geometry_geojson?:{type:"Polygon";coordinates:number[][][]};status:string;change?:{classification?:string;metrics?:Record<string,number|null>}};
type Scene={scene_id:string;acquired_at:string|null;cloud_cover_percent:number|null;sensor:string;preview_url:string};
type TimelinePoint={year:number;scene:Scene|null;comparability:"SEASONALLY_MATCHED"|"MISSING_EVIDENCE"};
type DraftPoint={id:string;type:"ANNOTATION"|"SAMPLE";longitude:number;latitude:number;title:string;note:string;status:"DRAFT"|"READY_FOR_REVIEW"};
const polygon=(bbox:number[])=>[[bbox[0],bbox[1]],[bbox[2],bbox[1]],[bbox[2],bbox[3]],[bbox[0],bbox[3]],[bbox[0],bbox[1]]];
// Candidate comparisons share one minimum locality scale so a small premises is
// not enlarged into misleadingly large Landsat pixels. This affects display
// imagery only; measurement_bbox and geometry_geojson remain the governed site.
const CANDIDATE_CONTEXT_HALF_WIDTH=.04;
const CANDIDATE_CONTEXT_HALF_HEIGHT=.035;
const WA_STATE_RING=[[118.642,-15.2343],[129,-15.6285],[129,-33.5234],[126.9734,-33.5234],[125.6224,-34.5482],[122.8077,-35.1],[119.993,-34.4693],[117.9664,-33.208],[116.728,-31.3949],[115.2643,-30.3701],[114.5888,-28.7146],[115.0392,-27.0591],[114.251,-25.4825],[114.814,-23.827],[114.0259,-22.3292],[114.814,-20.8314],[113.9133,-19.1759],[112.9,-17.6781],[114.251,-16.338],[113.8007,-14.9978],[115.4895,-13.973],[117.0657,-13.5],[118.642,-15.2343]];
const pointInside=(point:number[],shape:number[][])=>{let inside=false;for(let i=0,j=shape.length-1;i<shape.length;j=i++){const [xi,yi]=shape[i],[xj,yj]=shape[j];if((yi>point[1])!==(yj>point[1])&&point[0]<(xj-xi)*(point[1]-yi)/(yj-yi)+xi)inside=!inside}return inside};
const labelPoint=(tile:Tile):[number,number]=>{const shape=tile.geometry_geojson?.coordinates?.[0]??polygon(tile.bbox),[w,s,e,n]=tile.bbox,centre=[(w+e)/2,(s+n)/2];if(pointInside(centre,shape))return centre as [number,number];let best=shape[0],bestDistance=-1;for(let row=1;row<10;row++)for(let col=1;col<10;col++){const candidate=[w+(e-w)*col/10,s+(n-s)*row/10];if(!pointInside(candidate,shape))continue;const distance=Math.min(candidate[0]-w,e-candidate[0],candidate[1]-s,n-candidate[1]);if(distance>bestDistance){best=candidate;bestDistance=distance}}return best as [number,number]};

export default function ScientificMap({tiles,selectedTileId,onSelectTile,scope="regional"}:{tiles:Tile[];selectedTileId:string;onSelectTile:(id:string)=>void;scope?:"regional"|"candidate"}){
  const node=useRef<HTMLDivElement|null>(null),map=useRef<MapLibreMap|null>(null);
  const markers=useRef<maplibregl.Marker[]>([]);
  const draftMarkers=useRef<maplibregl.Marker[]>([]),modeRef=useRef<"explore"|"annotate"|"sample">("explore");
  const [year,setYear]=useState(new Date().getUTCFullYear()),[history,setHistory]=useState<Scene[]>([]),[historyState,setHistoryState]=useState<"idle"|"loading"|"done"|"error">("idle");
  const [activeScene,setActiveScene]=useState<Scene|null>(null),[mapMode,setMapMode]=useState<"explore"|"annotate"|"sample">("explore");
  const [draftPoints,setDraftPoints]=useState<DraftPoint[]>([]),[activeDraftId,setActiveDraftId]=useState<string|null>(null);
  const [explorerOpen,setExplorerOpen]=useState(false),[startYear,setStartYear]=useState(1982),[endYear,setEndYear]=useState(2006),[windowStart,setWindowStart]=useState("06-01"),[windowEnd,setWindowEnd]=useState("07-31");
  const [stateExplorerOpen,setStateExplorerOpen]=useState(false);
  const [timeline,setTimeline]=useState<TimelinePoint[]>([]),[timelineState,setTimelineState]=useState<"idle"|"loading"|"done"|"error">("idle"),[timelineScene,setTimelineScene]=useState<Scene|null>(null),[refreshCadence,setRefreshCadence]=useState<3|6|12>(6);
  const [question,setQuestion]=useState("what_changed");
  const selected=tiles.find(tile=>tile.tile_id===selectedTileId)??tiles[0];
  const explorerTile=selected&&scope==="candidate"?(()=>{const [w,s,e,n]=selected.bbox,cx=(w+e)/2,cy=(s+n)/2,halfWidth=Math.max((e-w)*1.2,CANDIDATE_CONTEXT_HALF_WIDTH),halfHeight=Math.max((n-s)*1.2,CANDIDATE_CONTEXT_HALF_HEIGHT);return{...selected,measurement_bbox:selected.bbox,bbox:[cx-halfWidth,cy-halfHeight,cx+halfWidth,cy+halfHeight],display_context:true}})():selected;

  useEffect(()=>{
    if(!node.current||map.current)return;
    const instance=new maplibregl.Map({container:node.current,style:{version:8,sources:{osm:{type:"raster",tiles:["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],tileSize:256,attribution:"© OpenStreetMap contributors"}},layers:[{id:"osm",type:"raster",source:"osm"}]},center:selected?[(selected.bbox[0]+selected.bbox[2])/2,(selected.bbox[1]+selected.bbox[3])/2]:[116,-31],zoom:5});
    instance.addControl(new maplibregl.NavigationControl({showCompass:true}),"top-right");map.current=instance;
    instance.on("click",event=>{if(modeRef.current==="explore")return;setDraftPoints(current=>{const point:DraftPoint={id:`${modeRef.current==="sample"?"S":"A"}${String(current.length+1).padStart(2,"0")}`,type:modeRef.current==="sample"?"SAMPLE":"ANNOTATION",longitude:event.lngLat.lng,latitude:event.lngLat.lat,title:"",note:"",status:"DRAFT"};setActiveDraftId(point.id);return [...current,point]})});
    return()=>{markers.current.forEach(marker=>marker.remove());draftMarkers.current.forEach(marker=>marker.remove());instance.remove();map.current=null};
  },[]);

  useEffect(()=>{modeRef.current=mapMode;if(map.current)map.current.getCanvas().style.cursor=mapMode==="explore"?"":"crosshair"},[mapMode]);

  useEffect(()=>{const instance=map.current;if(!instance)return;draftMarkers.current.forEach(marker=>marker.remove());draftMarkers.current=draftPoints.map(point=>{const dot=document.createElement("button");dot.className=`draftMapPoint ${point.type.toLowerCase()} ${point.id===activeDraftId?"active":""}`;dot.textContent=point.id;dot.title=`Open ${point.type.toLowerCase()} ${point.id}`;dot.onclick=event=>{event.stopPropagation();setActiveDraftId(point.id)};return new maplibregl.Marker({element:dot,anchor:"center"}).setLngLat([point.longitude,point.latitude]).addTo(instance)})},[draftPoints,activeDraftId]);

  useEffect(()=>{
    const instance=map.current;if(!instance||!selected)return;
    const update=()=>{
      const data={type:"FeatureCollection",features:tiles.map(tile=>({type:"Feature",properties:{id:tile.tile_id,selected:tile.tile_id===selectedTileId?1:0,status:tile.status},geometry:tile.geometry_geojson??{type:"Polygon",coordinates:[polygon(tile.bbox)]}}))} as any;
      const source=instance.getSource("aab-tiles") as maplibregl.GeoJSONSource|undefined;
      if(source)source.setData(data);else{
        instance.addSource("aab-tiles",{type:"geojson",data});
        instance.addLayer({id:"aab-tile-fill",type:"fill",source:"aab-tiles",paint:{"fill-color":["case",["==",["get","selected"],1],"#55c995","#d8aa54"],"fill-opacity":["case",["==",["get","selected"],1],.25,.08]}});
        instance.addLayer({id:"aab-tile-line",type:"line",source:"aab-tiles",paint:{"line-color":["case",["==",["get","selected"],1],"#55c995","#d8aa54"],"line-width":["case",["==",["get","selected"],1],3,1.4]}});
        instance.on("click","aab-tile-fill",event=>{const id=event.features?.[0]?.properties?.id;if(id)onSelectTile(String(id))});
        instance.on("mouseenter","aab-tile-fill",()=>instance.getCanvas().style.cursor="pointer");instance.on("mouseleave","aab-tile-fill",()=>instance.getCanvas().style.cursor="");
      }
      markers.current.forEach(marker=>marker.remove());
      markers.current=tiles.map(tile=>{const label=document.createElement("button");label.className=`aabMapTileLabel ${tile.tile_id===selectedTileId?"active":""}`;label.textContent=tile.tile_id;label.title=`Open ${tile.tile_id} scientific investigation`;label.onclick=()=>onSelectTile(tile.tile_id);return new maplibregl.Marker({element:label,anchor:"center"}).setLngLat(labelPoint(tile)).addTo(instance)});
      const bounds=tiles.reduce((value,tile)=>[Math.min(value[0],tile.bbox[0]),Math.min(value[1],tile.bbox[1]),Math.max(value[2],tile.bbox[2]),Math.max(value[3],tile.bbox[3])] as number[],[Infinity,Infinity,-Infinity,-Infinity]);
      instance.fitBounds([[bounds[0],bounds[1]],[bounds[2],bounds[3]]],{padding:42,maxZoom:9,duration:500});
    };
    instance.loaded()?update():instance.once("load",update);
  },[tiles,selectedTileId]);

  async function searchHistory(){if(!selected)return;setHistoryState("loading");setActiveScene(null);try{const response=await fetch("/api/spatial-history",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({bbox:selected.bbox,year})}),payload=await response.json();if(!response.ok)throw new Error(payload.error);setHistory(payload.scenes??[]);setActiveScene(payload.scenes?.[0]??null);setHistoryState("done");}catch{setHistoryState("error")}}
  async function exploreTimeline(){if(!selected)return;setTimelineState("loading");setTimelineScene(null);try{const response=await fetch("/api/spatial-history",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mode:"timeline",bbox:selected.bbox,start_year:startYear,end_year:endYear,window_start:windowStart,window_end:windowEnd})}),payload=await response.json();if(!response.ok)throw new Error(payload.error);setTimeline(payload.timeline??[]);setTimelineScene(payload.timeline?.find((point:TimelinePoint)=>point.scene)?.scene??null);setTimelineState("done")}catch{setTimelineState("error")}}

  const activeDraft=draftPoints.find(point=>point.id===activeDraftId)??null;
  const updateDraft=(change:Partial<DraftPoint>)=>setDraftPoints(current=>current.map(point=>point.id===activeDraftId?{...point,...change}:point));

  const strongest=selected?Object.entries(selected.change?.metrics??{}).filter((entry):entry is [string,number]=>typeof entry[1]==="number").sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]))[0]:undefined;
  const answers:Record<string,string>={
    what_changed:strongest?`${selected.tile_id}'s strongest measured index change is ${strongest[0].replaceAll("_"," ")} at ${strongest[1]>=0?"+":""}${strongest[1].toFixed(3)}. This is an observation, not a confirmed cause.`:"No complete change metric is available for this tile.",
    unknown:"Material identity, physical quantity, cause, ownership, safety and potential use remain unknown until field and laboratory evidence is reviewed.",
    sample:"Start with geolocated inspection points across the strongest-change zone and an unchanged control location. A scientist must approve the design before collection.",
    compare:`Compare ${selected?.tile_id??"this tile"} with an adjacent tile and the same season in an earlier year. Rainfall, fire, land use and site operations must be checked before attribution.`,
  };

  return <section className="scientificMapWorkspace">
    <div className="mapWorkspaceHead"><div><small>{scope==="candidate"?"CANDIDATE-LOCAL EVIDENCE MAP":"GEOGRAPHIC SCIENTIFIC MEMORY"}</small><strong>{selected?.tile_id} · {scope==="candidate"?"exact governed site envelope":"permanent governed location"}</strong><span>{selected?`${selected.bbox[1].toFixed(4)}° to ${selected.bbox[3].toFixed(4)}° latitude · ${selected.bbox[0].toFixed(4)}° to ${selected.bbox[2].toFixed(4)}° longitude`:"Tile unavailable"}</span></div><div>{scope==="regional"&&<button className="stateTimelineLaunch" onClick={()=>setStateExplorerOpen(true)}>Full state timeline</button>}{(scope==="candidate"?["explore"] as const:["explore","annotate","sample"] as const).map(mode=><button className={mapMode===mode?"active":""} onClick={()=>setMapMode(mode)} key={mode}>{mode==="explore"?"Explore":mode==="annotate"?"Annotate":"Plan samples"}</button>)}</div></div>
    <div className="scientificMap" ref={node}/>
    <div className="mapModeNotice"><b>{scope==="candidate"?"SITE-ONLY MEASUREMENT":mapMode.toUpperCase()}</b><span>{scope==="candidate"?"The outlined candidate premises envelope is the only measured area. Surrounding roads and places are orientation context only and are excluded from every pixel result.":mapMode==="explore"?"Click any labelled tile to open its governed evidence.":mapMode==="annotate"?"Click the map to place a draft scientific annotation.":"Click the map to place proposed sampling points. A scientist must approve the field plan."}</span></div>
    {draftPoints.length>0&&<><div className="draftPointLedger"><div><small>DRAFT FIELD PLAN · NOT YET GOVERNED</small><strong>{draftPoints.length} mapped {draftPoints.length===1?"point":"points"}</strong></div><div>{draftPoints.map(point=><button className={point.id===activeDraftId?"active":""} key={point.id} onClick={()=>setActiveDraftId(point.id)}><b>{point.id} · {point.type}</b><span>{point.title||"Add scientific note"}</span></button>)}</div><button className="clearDrafts" onClick={()=>{setDraftPoints([]);setActiveDraftId(null)}}>Clear draft plan</button></div>{activeDraft&&<div className="annotationEditor"><div><small>{activeDraft.id} · {activeDraft.type} · EXACT LOCATION</small><strong>{activeDraft.latitude.toFixed(5)}, {activeDraft.longitude.toFixed(5)}</strong></div><label>Title<input value={activeDraft.title} onChange={event=>updateDraft({title:event.target.value})} placeholder="What was observed here?"/></label><label>Scientific annotation<textarea value={activeDraft.note} onChange={event=>updateDraft({note:event.target.value})} placeholder="Record the observation, possible explanations and what remains unknown."/></label><div><button onClick={()=>updateDraft({status:"READY_FOR_REVIEW"})} disabled={!activeDraft.title.trim()||!activeDraft.note.trim()}>Mark ready for review</button><button onClick={()=>{setDraftPoints(current=>current.filter(point=>point.id!==activeDraft.id));setActiveDraftId(null)}}>Delete point</button><span>{activeDraft.status.replaceAll("_"," ")} · saved in this workspace only until governed memory submission is connected</span></div></div>}</>}
    {scope==="regional"&&<><div className="timeTravel"><div><small>TIME TRAVEL · COMPARABLE LANDSAT RECORD</small><strong>{year}</strong><span>Surface-reflectance comparison: 1982–present · archival imagery extension: 1972–1981</span></div><input type="range" min="1982" max={new Date().getUTCFullYear()} value={year} onChange={event=>setYear(Number(event.target.value))} aria-label="Historical Landsat year"/><div><button onClick={searchHistory} disabled={historyState==="loading"}>{historyState==="loading"?"Searching archive…":"Search this tile"}</button><button className="explorerLaunch" onClick={()=>setExplorerOpen(true)}>Open Time Travel Explorer ↗</button></div></div>{historyState!=="idle"&&<div className="historyResults"><div className="historyScenes"><b>{historyState==="done"?`${history.length} qualifying scenes in ${year}`:historyState==="error"?"Archive search unavailable":"Searching…"}</b>{history.map(scene=><button className={activeScene?.scene_id===scene.scene_id?"active":""} onClick={()=>setActiveScene(scene)} key={scene.scene_id}>{scene.acquired_at?new Date(scene.acquired_at).toLocaleDateString("en-AU"):"Unknown date"}<small>{scene.cloud_cover_percent==null?"Cloud unknown":`${Number(scene.cloud_cover_percent).toFixed(1)}% cloud`}</small></button>)}</div>{activeScene&&<figure><img src={activeScene.preview_url} alt={`Historical Landsat view from ${activeScene.acquired_at}`}/><figcaption>{activeScene.sensor} · {activeScene.acquired_at?new Date(activeScene.acquired_at).toLocaleDateString("en-AU"):"Unknown date"} · archive observation only</figcaption></figure>}</div>}</>}
    <div className="askPlace"><div><small>ASK AAB ABOUT THIS PLACE</small><strong>Governed, tile-aware scientific reasoning</strong></div><div>{[["what_changed","What changed?"],["unknown","What is unknown?"],["sample","Plan verification"],["compare","How should I compare it?"]].map(([id,label])=><button className={question===id?"active":""} onClick={()=>setQuestion(id)} key={id}>{label}</button>)}</div><p><b>OBSERVATION / GUIDANCE</b>{answers[question]}</p><span>AAB separates measured evidence, possible explanations and verified conclusions.</span></div>
    <div className="mapCapabilityRail">{(scope==="candidate"?["Exact site envelope · LIVE","Roads + places · CONTEXT ONLY","QA-screened pixels · SITE ONLY","Weather · NEXT CONNECTOR","Fire + flood · AUTHORITATIVE SOURCE REQUIRED","Groundwater + drainage · SOURCE REQUIRED"]:["Roads + places · LIVE","Permanent tile IDs · LIVE","Time Travel · LIVE","Annotations · WORKSPACE READY","Sampling plan · WORKSPACE READY","Weather · CONNECTOR REQUIRED","Fire history · CONNECTOR REQUIRED","Soil + geology · CONNECTOR REQUIRED","Radar + thermal · CONNECTOR REQUIRED","GIS export · NEXT GOVERNED ACTION"]).map(item=><span key={item}>{item}</span>)}</div>
    {explorerOpen&&explorerTile&&<ForensicExplorer tile={explorerTile} onClose={()=>setExplorerOpen(false)}/>} 
    {stateExplorerOpen&&<ForensicExplorer tile={{tile_id:"WA-STATE",bbox:[112.9,-35.1,129,-13.5],geometry_geojson:{type:"Polygon",coordinates:[WA_STATE_RING]}}} onClose={()=>setStateExplorerOpen(false)}/>} 
  </section>
}
