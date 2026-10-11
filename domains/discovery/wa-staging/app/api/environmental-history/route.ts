const ARCHIVE="https://archive-api.open-meteo.com/v1/archive";
const validDay=(value:unknown,fallback:string)=>/^\d{2}-\d{2}$/.test(String(value))?String(value):fallback;
const CACHE_TTL_MS=12*60*60*1000;
const archiveCache=new Map<string,{expires:number;payload:unknown}>();
const wait=(milliseconds:number)=>new Promise(resolve=>setTimeout(resolve,milliseconds));

async function readArchive(url:string){
  const cached=archiveCache.get(url);
  if(cached&&cached.expires>Date.now())return cached.payload;
  let lastStatus=0;
  for(let attempt=0;attempt<3;attempt+=1){
    const response=await fetch(url,{headers:{accept:"application/json"}});
    if(response.ok){const payload=await response.json();archiveCache.set(url,{expires:Date.now()+CACHE_TTL_MS,payload});return payload}
    lastStatus=response.status;
    if(response.status!==429)break;
    const retryAfter=Number(response.headers.get("retry-after"));
    await wait(Number.isFinite(retryAfter)&&retryAfter>0?Math.min(retryAfter*1000,5000):900*(attempt+1));
  }
  throw new Error(lastStatus===429?"Climate archive is temporarily busy. The last successful record remains visible; please wait a moment and try the year again.":`Climate archive returned HTTP ${lastStatus}`);
}

type DailyArchive={
  time:string[];
  precipitation_sum:(number|null)[];
  temperature_2m_min:(number|null)[];
  temperature_2m_mean:(number|null)[];
  temperature_2m_max:(number|null)[];
};

export async function POST(request:Request){
  const origin=request.headers.get("origin"),host=request.headers.get("host");
  if(origin&&host&&new URL(origin).host!==host)return Response.json({error:"Cross-origin request rejected."},{status:403});
  try{
    const body=await request.json() as {bbox?:number[];start_year?:number;end_year?:number;window_start?:string;window_end?:string};
    const bbox=body.bbox;
    if(!Array.isArray(bbox)||bbox.length!==4||!bbox.every(Number.isFinite))return Response.json({error:"Valid tile bounds required."},{status:400});
    if(bbox[0]<112.5||bbox[2]>129.1||bbox[1]<-35.3||bbox[3]>-13.2)return Response.json({error:"Environmental history is locked to Western Australia."},{status:400});
    const currentYear=new Date().getUTCFullYear(),start=Math.max(1940,Math.min(currentYear,Number(body.start_year)||1982)),end=Math.max(start,Math.min(currentYear,Number(body.end_year)||currentYear));
    if(end-start>44)return Response.json({error:"Choose a period of 45 years or less."},{status:400});
    const windowStart=validDay(body.window_start,"06-01"),windowEnd=validDay(body.window_end,"07-31");
    const latitude=(bbox[1]+bbox[3])/2,longitude=(bbox[0]+bbox[2])/2;
    const params=new URLSearchParams({latitude:String(latitude),longitude:String(longitude),start_date:`${start}-${windowStart}`,end_date:`${end}-${windowEnd}`,daily:"precipitation_sum,temperature_2m_min,temperature_2m_mean,temperature_2m_max",timezone:"Australia/Perth"});
    const payload=await readArchive(`${ARCHIVE}?${params}`) as {daily?:DailyArchive;generationtime_ms?:number;latitude?:number;longitude?:number;elevation?:number};
    const daily=payload.daily;
    if(!daily?.time?.length)return Response.json({error:"No gridded climate records were returned for this period."},{status:422});
    const rows=Array.from({length:end-start+1},(_,index)=>{
      const year=start+index,indices=daily.time.map((date,i)=>date.startsWith(`${year}-`)?i:-1).filter(i=>i>=0);
      const numbers=(values:(number|null)[])=>indices.map(i=>values[i]).filter((value):value is number=>typeof value==="number"&&Number.isFinite(value));
      const rain=numbers(daily.precipitation_sum),mins=numbers(daily.temperature_2m_min),means=numbers(daily.temperature_2m_mean),maxs=numbers(daily.temperature_2m_max),expected=indices.length;
      const sum=(values:number[])=>values.reduce((total,value)=>total+value,0),mean=(values:number[])=>values.length?sum(values)/values.length:null;
      return {year,days_expected:expected,days_available:Math.min(rain.length,mins.length,means.length,maxs.length),rainfall_mm:rain.length?sum(rain):null,temperature_c:{minimum:mins.length?Math.min(...mins):null,mean:mean(means),maximum:maxs.length?Math.max(...maxs):null},temperature_threshold_days:{maximum_above_40c:maxs.filter(value=>value>40).length,maximum_above_43c:maxs.filter(value=>value>43).length,maximum_above_45c:maxs.filter(value=>value>45).length,minimum_below_15c:mins.filter(value=>value<15).length},frost_temperature_days:{at_or_below_2c:mins.filter(value=>value<=2).length,at_or_below_0c:mins.filter(value=>value<=0).length,at_or_below_minus_2c:mins.filter(value=>value<=-2).length},lowest_temperature_date:mins.length?daily.time[indices[mins.indexOf(Math.min(...mins))]]:null,status:expected>0&&rain.length===expected&&mins.length===expected&&maxs.length===expected?"COMPLETE":"PARTIAL"};
    });
    const rainfallValues=rows.map(row=>row.rainfall_mm).filter((value):value is number=>value!=null),selectedPeriodMean=rainfallValues.length?rainfallValues.reduce((sum,value)=>sum+value,0)/rainfallValues.length:null;
    return Response.json({method_version:"AAB-ENVIRONMENTAL-FACTS-1.0",evidence_status:"GRIDDED_REANALYSIS_RECORD",location:{latitude:payload.latitude??latitude,longitude:payload.longitude??longitude,elevation_m:payload.elevation??null,method:"TILE_BBOX_CENTRE"},period:{start_year:start,end_year:end,window_start:windowStart,window_end:windowEnd},selected_period_rainfall_mean_mm:selectedPeriodMean,records:rows,unconnected_layers:[{name:"Fire history",status:"AUTHORITATIVE_BOUNDARY_SOURCE_NOT_CONNECTED"},{name:"Flood history",status:"AUTHORITATIVE_INUNDATION_SOURCE_NOT_CONNECTED"}],source:{provider:"Open-Meteo Historical Weather API",dataset:"ERA5 / ERA5-Land gridded reanalysis",url:"https://open-meteo.com/en/docs/historical-weather-api",licence_note:"Source attribution and model-selection details are supplied by the provider. Values represent a model grid cell, not a local weather station."}},{headers:{"cache-control":"public, max-age=21600"}});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Environmental history unavailable"},{status:500})}
}
