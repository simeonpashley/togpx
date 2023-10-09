import { XMLBuilder } from "fast-xml-parser";
import { GeoJSON } from "geojson";

const USE_GARMIN_COLOURS = true;

type GarminColour =
  | "Black"
  | "DarkRed"
  | "DarkGreen"
  | "DarkYellow"
  | "DarkBlue"
  | "DarkMagenta"
  | "DarkCyan"
  | "LightGray"
  | "DarkGray"
  | "Red"
  | "Green"
  | "Yellow"
  | "Blue"
  | "Magenta"
  | "Cyan"
  | "White"
  | "Transparent";

type GpxPoint = {
  "@lat": number;
  "@lon": number;
  name?: string;
  desc?: string;
  ele?: number;
  time?: number;
  src?: string;
  link?: { "@href"?: string }; // link type
  sym?: string;
  fix?: string; //fix type
  sat?: number;
  extensions?: any; // extensions type
};

type GpxTrackSegment = {
  trkpt: GpxPoint[];
};

type GpxTrack = {
  name?: string;
  cmt?: string;
  desc?: string;
  src?: string;
  link?: { "@href"?: string };
  type?: string;
  trkseg?: GpxTrackSegment[];
  extensions?: {
    "gpxx:TrackExtension"?: {
      "gpxx:DisplayColor"?: GarminColour;
    };
  };
};
type FeatureProps = { [key: string]: string };

type GpxRoot = {
  gpx: {
    "@xmlns": string;
    "@version": "1.1";
    "@xmlns:xsi"?: string;
    "@xsi:schemaLocation"?: string;
    "@xmlns:gpxx"?: string;
    "@xmlns:gpxtpx"?: string;
    "@xmlns:wptx1"?: string;
    "@xmlns:gpxtrx"?: string;
    "@xmlns:trp"?: string;
    "@xmlns:adv"?: string;
    "@xmlns:prs"?: string;
    "@xmlns:tmd"?: string;
    "@xmlns:vptm"?: string;
    "@xmlns:gpxacc"?: string;
    "@xmlns:vidx1"?: string;
    "@xmlns:gpxpx"?: string;
    "@xmlns:ctx"?: string;
    "@creator"?: string;
    metadata?: null | {
      name?: string;
      desc?: string;
      author?: string;
      copyright?: string;
      time?: string;
    };
    wpt: GpxPoint[];
    trk: GpxTrack[];
  };
};

function sanitise(v: string): string {
  let s = v.replace("\r", " ");
  s = s.replace(`&lt;`, "<");
  s = s.replace(`<br>`, " ");
  s = s.replace("&amp;", "&");
  s = s.replace(/,$/g, ""); // comma at end of phrase
  s = s.replace(/\s+/, " "); //collapse double space
  return s.trim();
}
function gpxTitle(v: string): string {
  let s = v;
  s = s.replace("USRN NA", "");
  s = s.replace("No USRN", "");
  s = s.replace("NO USRN", "");
  s = s.replace("or LA name", "");
  // s = s.replace("TRO:", "");
  // s = s.replace(/UCR U\d{5}/, "");
  // s = s.replace(/UCR U\d{4}/, "");
  // s = s.replace(/USRN\s?\d{8}/, "");
  // s = s.replace(/USRN\s?\d{7}/, "");
  // s = s.replace(/URN\s?\d{8}/, "");
  // s = s.replace(/URN\s?\d{7}/, "");
  // s = s.replace(/U\d+_\d+_\d+/, "");
  // s = s.replace(/U\d+_\d+/, "");
  // s = s.replace(/U\d+/, "");
  let r = sanitise(s);
  r = r.replace(/\-\s$/g, ""); //terminating "- "
  r = r.replace(/\-$/g, ""); //terminating "- "
  r = r.trim();
  // if (v.length !== r.length) {
  //   console.error(`[${v}]=>[${r}]`);
  // }
  return r;
}

function togpx(geojson: GeoJSON, o?: any) {
  const options = (function (defaults: any, options: any) {
    for (var k in defaults) {
      if (options.hasOwnProperty(k)) defaults[k] = options[k];
    }
    return defaults;
  })(
    {
      metadata: undefined,
      featureLink: undefined,
    },
    o || {}
  );

  function get_feature_title(props: null | FeatureProps): string {
    const titleSeq = [/* "ha",  "har", */ "county", "name"];

    // a simple default heuristic to determine a title for a given feature
    // uses a nested `tags` object or the feature's `properties` if present
    // and then searchs for the following properties to construct a title:
    // `name`, `ref`, `id`
    if (!props) return "";
    if (typeof props.tags === "object") {
      var tags_title = get_feature_title(props.tags);
      if (tags_title !== "") return tags_title;
    }
    if (props.ref) return props.ref;
    if (props.id) return props.id;

    var res = "";
    for (const k of titleSeq) {
      let output = "";
      if (typeof props[k] === "object") continue;
      const v = sanitise(props[k].toString());
      if (!v.length) continue;
      switch (k) {
        case "name": // this has a dedicated prop
          output = v;
          break;
        case "type":
        case "no_through_route":
        case "membermessage":
        case "desc":
        case "historical":
        case "grmuid":
        case "usrn":
        case "ha":
          output = v;
          break;
        case "har":
          output = v;
          break;
        case "county":
          output = v;
          break;
        case "color":
        case "length":
          // ignore these
          break;
        default:
          output = `${k}=${v}`;
          console.error(`Unknown key ${k}=${v}`);
          break;
      }
      if (output.length > 0) {
        if (res.length > 0) {
          res = `${res} | ${output}`;
        } else {
          res = `${output}`;
        }
      }
    }
    return gpxTitle(res);
  }

  function get_feature_colour(
    props: null | FeatureProps
  ): undefined | GarminColour {
    if (!USE_GARMIN_COLOURS) {
      return undefined;
    }
    if (!props) return undefined;
    for (var k in props) {
      if (typeof props[k] === "object") continue;
      if (k === "color") {
        const v = props[k].toString().trim();
        switch (v) {
          case "green":
            return "Green";
          case "red":
            return "Red";
          case "blue":
            return "Blue";
          case "grey":
            return "LightGray";
          default:
            console.error(`Unknown color ${v}`);
            return undefined;
        }
      }
    }
    return undefined;
  }

  function get_feature_description(props: null | FeatureProps) {
    // constructs a description for a given feature
    // uses a nested `tags` object or the feature's `properties` if present
    // and then concatenates all properties to construct a description.
    if (!props) return "";
    if (typeof props.tags === "object")
      return get_feature_description(props.tags);
    var res = "";
    for (var k in props) {
      let output = "";
      if (typeof props[k] === "object") continue;
      const v = sanitise(props[k].toString());
      if (!v.length) continue;
      switch (k) {
        case "name": // this has a dedicated prop
          // output = `${v}`;
          break;
        case "type":
          if (v !== "2") {
            output = `${k}=${v}`;
            console.error(`Unknown type ${v}`);
          }
          break;
        case "no_through_route":
          if (v === "1") {
            output = `No Through Route`;
          }
          break;
        case "membermessage":
          if (v !== "Message for members map") {
            output = `${v}`;
          }
          break;
        case "desc":
          if (v !== "Demo testing one.") {
            output = `${v}`;
          }
          break;
        case "class":
          switch (v) {
            case "disputed":
              output = `**DISPUTED**`;
              break;
            case "temporary_tro":
              output = `**TEMPORARY TRO**`;
              break;
            case "full-access":
              // this is assumed -  output = `Full Access\n`;
              break;
            case "partial-access":
              output = `Partial Access`;
              break;
            case "restricted":
              output = `Restricted`;
              break;
            case "link_road_with_access":
              output = `Link road with access`;
              break;
            default:
              output = `${k}=${v}\n`;
              console.error(`Unknown class ${v}`);
              break;
          }
          break;
        case "historical":
          output = `Known as ${v}`;
          break;
        case "grmuid":
        case "usrn":
        case "ha":
        case "har":
        case "county":
        case "color":
        case "length":
          // ignore these
          break;
        default:
          output = `${k}=${v}`;
          console.error(`Unknown key ${k}=${v}`);
          break;
      }
      if (output.length > 0) {
        if (res.length > 0) {
          res = `${res}. ${output}`;
        } else {
          res = `${output}`;
        }
      }
    }
    return `${res}`;
  }
  function get_feature_coord_times(feature: GeoJSON.Feature) {
    if (!feature.properties) return null;
    return feature.properties.times || feature.properties.coordTimes || null;
  }
  function add_feature_link(o: GpxTrack, f: GeoJSON.Feature) {
    if (options.featureLink)
      o.link = { "@href": options.featureLink(f.properties) };
  }

  function getFeatureProps(f: GeoJSON.Feature): GpxTrack {
    const color = get_feature_colour(f.properties);
    // Order of these is important for export time, trkseg MUST be last
    const o: GpxTrack = {
      name: get_feature_title(f.properties),
      desc: get_feature_description(f.properties),
      src: "TRF Green Roadmap - 2023-10-03",
      link: { "@href": "https://beta.greenroadmap.org.uk/" },
    };
    if (color) {
      o.extensions = {
        "gpxx:TrackExtension": {
          "gpxx:DisplayColor": color,
        },
      };
    }
    o.trkseg = []; // TRK seg must be last
    return o;
  }

  // make gpx object

  var gpx: GpxRoot = {
    gpx: {
      // from Basecamp export - 2023-10-09
      "@xmlns:gpxx": "http://www.garmin.com/xmlschemas/GpxExtensions/v3",
      "@xmlns": "http://www.topografix.com/GPX/1/1",
      "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
      "@xmlns:wptx1": "http://www.garmin.com/xmlschemas/WaypointExtension/v1",
      "@xmlns:gpxtrx": "http://www.garmin.com/xmlschemas/GpxExtensions/v3",
      "@xmlns:gpxtpx":
        "http://www.garmin.com/xmlschemas/TrackPointExtension/v1",
      "@xmlns:trp": "http://www.garmin.com/xmlschemas/TripExtensions/v1",
      "@xmlns:adv": "http://www.garmin.com/xmlschemas/AdventuresExtensions/v1",
      "@xmlns:prs": "http://www.garmin.com/xmlschemas/PressureExtension/v1",
      "@xmlns:tmd":
        "http://www.garmin.com/xmlschemas/TripMetaDataExtensions/v1",
      "@xmlns:vptm":
        "http://www.garmin.com/xmlschemas/ViaPointTransportationModeExtensions/v1",
      "@xmlns:ctx": "http://www.garmin.com/xmlschemas/CreationTimeExtension/v1",
      "@xmlns:gpxacc":
        "http://www.garmin.com/xmlschemas/AccelerationExtension/v1",
      "@xmlns:gpxpx": "http://www.garmin.com/xmlschemas/PowerExtension/v1",
      "@xmlns:vidx1": "http://www.garmin.com/xmlschemas/VideoExtension/v1",
      "@xsi:schemaLocation":
        "http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/WaypointExtension/v1 http://www8.garmin.com/xmlschemas/WaypointExtensionv1.xsd http://www.garmin.com/xmlschemas/TrackPointExtension/v1 http://www.garmin.com/xmlschemas/TrackPointExtensionv1.xsd http://www.garmin.com/xmlschemas/GpxExtensions/v3 http://www8.garmin.com/xmlschemas/GpxExtensionsv3.xsd http://www.garmin.com/xmlschemas/ActivityExtension/v1 http://www8.garmin.com/xmlschemas/ActivityExtensionv1.xsd http://www.garmin.com/xmlschemas/AdventuresExtensions/v1 http://www8.garmin.com/xmlschemas/AdventuresExtensionv1.xsd http://www.garmin.com/xmlschemas/PressureExtension/v1 http://www.garmin.com/xmlschemas/PressureExtensionv1.xsd http://www.garmin.com/xmlschemas/TripExtensions/v1 http://www.garmin.com/xmlschemas/TripExtensionsv1.xsd http://www.garmin.com/xmlschemas/TripMetaDataExtensions/v1 http://www.garmin.com/xmlschemas/TripMetaDataExtensionsv1.xsd http://www.garmin.com/xmlschemas/ViaPointTransportationModeExtensions/v1 http://www.garmin.com/xmlschemas/ViaPointTransportationModeExtensionsv1.xsd http://www.garmin.com/xmlschemas/CreationTimeExtension/v1 http://www.garmin.com/xmlschemas/CreationTimeExtensionsv1.xsd http://www.garmin.com/xmlschemas/AccelerationExtension/v1 http://www.garmin.com/xmlschemas/AccelerationExtensionv1.xsd http://www.garmin.com/xmlschemas/PowerExtension/v1 http://www.garmin.com/xmlschemas/PowerExtensionv1.xsd http://www.garmin.com/xmlschemas/VideoExtension/v1 http://www.garmin.com/xmlschemas/VideoExtensionv1.xsd",
      "@creator": "Garmin Desktop App",
      "@version": "1.1",

      metadata: null,
      wpt: [],
      trk: [],
    },
  };

  if (options.creator) gpx.gpx["@creator"] = options.creator;
  if (options.metadata) gpx.gpx["metadata"] = options.metadata;
  else delete options.metadata;

  var features: GeoJSON.Feature[];
  if (geojson.type === "FeatureCollection") features = geojson.features;
  else if (geojson.type === "Feature") features = [geojson];
  else features = [{ type: "Feature", properties: {}, geometry: geojson }];

  // let count = 0;
  features.forEach(function mapFeature(f) {
    // count = count + 1;
    // if (count > 1) {
    //   return;
    // }
    switch (f.geometry.type) {
      // POIs
      case "Point":
      case "MultiPoint":
        {
          let coords: GeoJSON.Position[];
          if (f.geometry.type == "Point") {
            coords = [f.geometry.coordinates as GeoJSON.Position];
          } else {
            coords = f.geometry.coordinates;
          }
          coords.forEach(function (coordinates) {
            const o: GpxPoint = {
              "@lat": coordinates[1],
              "@lon": coordinates[0],
              name: get_feature_title(f.properties),
              desc: get_feature_description(f.properties),
            };
            if (coordinates[2] !== undefined) {
              o.ele = coordinates[2];
            }
            add_feature_link(o, f);
            gpx.gpx.wpt.push(o);
          });
        }
        break;
      // LineStrings
      case "LineString":
      case "MultiLineString":
        {
          let coords: GeoJSON.Position[][];
          var times = get_feature_coord_times(f);
          if (f.geometry.type == "LineString")
            coords = [f.geometry.coordinates];
          else {
            coords = f.geometry.coordinates;
          }

          const o: GpxTrack = getFeatureProps(f);
          add_feature_link(o, f);
          coords.forEach(function (coordinates) {
            var seg: GpxTrackSegment = { trkpt: [] };
            coordinates.forEach(function (c, i) {
              const o: GpxPoint = {
                "@lat": c[1],
                "@lon": c[0],
              };
              if (c[2] !== undefined) {
                o.ele = c[2];
              }
              if (times && times[i]) {
                o.time = times[i];
              }
              seg.trkpt.push(o);
            });
            o.trkseg?.push(seg);
          });
          gpx.gpx.trk.push(o);
        }
        break;
      // Polygons / Multipolygons
      case "Polygon":
      case "MultiPolygon":
        {
          const o: GpxTrack = getFeatureProps(f);
          add_feature_link(o, f);
          var times = get_feature_coord_times(f);
          let coords: GeoJSON.Position[][][];

          if (f.geometry.type == "Polygon") {
            coords = [f.geometry.coordinates];
          } else {
            coords = f.geometry.coordinates;
          }
          coords.forEach(function (poly) {
            poly.forEach(function (ring) {
              var seg: any = { trkpt: [] };
              var i = 0;
              ring.forEach(function (c: any) {
                const o: GpxPoint = {
                  "@lat": c[1],
                  "@lon": c[0],
                };
                if (c[2] !== undefined) {
                  o.ele = c[2];
                }
                if (times && times[i]) {
                  o.time = times[i];
                }
                i++;
                seg.trkpt.push(o);
              });
              o.trkseg?.push(seg);
            });
          });
          gpx.gpx.trk.push(o);
        }
        break;
      case "GeometryCollection":
        f.geometry.geometries.forEach(function (geometry) {
          var pseudo_feature: GeoJSON.Feature = {
            type: "Feature",
            properties: f.properties,
            geometry: geometry,
          };
          mapFeature(pseudo_feature);
        });
        break;
      default:
        console.log(
          "warning: unsupported geometry type: " + (f.geometry as any).type
        );
    }
  });
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "@",
    format: true,
  });
  const xmlContent = builder.build(gpx);
  return xmlContent;
}

export default togpx;
