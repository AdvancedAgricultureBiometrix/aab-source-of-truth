import boundary from "../../../data/wheatbelt-boundary.json";
const SOURCE = "https://public-services.slip.wa.gov.au/public/rest/services/SLIP_Public_Services/Boundaries/MapServer/29/query?where=1%3D1&outFields=%2A&returnGeometry=true&f=geojson";

export async function GET() {
  try {
    if (!boundary.coordinates.length) throw new Error("Official Wheatbelt geometry was empty");
    return Response.json({
      region_code: "WA-DPIRD-WHEATBELT",
      region_name: "Wheatbelt of Western Australia",
      geometry_geojson: boundary,
      provenance: {
        publisher: "State of Western Australia · Department of Primary Industries and Regional Development",
        dataset: "Wheatbelt of WA (DPIRD-024)",
        service_layer: "SLIP Public Boundaries MapServer/29",
        source_url: SOURCE,
        licence: "Creative Commons Attribution 4.0",
        geometry_note: "Locally retained, topology-preserving simplified snapshot of the official service geometry",
      },
    }, { headers: { "cache-control": "public, max-age=86400" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Official Wheatbelt boundary unavailable" }, { status: 502 });
  }
}
