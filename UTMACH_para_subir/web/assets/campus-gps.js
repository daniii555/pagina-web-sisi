'use strict';
// Graph traced visually from the supplied 698 x 500 screenshot; NOT a surveyed pedestrian network.
(function(){
const nodes={entrada:[243,319],medicina:[111,110],sociales:[469,99],empresariales:[604,196],laboratorio:[595,136],civil:[509,384],plaza:[310,258],a:[111,156],b:[104,195],c:[190,225],d:[210,180],e:[265,53],f:[290,48],g:[400,92],h:[400,167],i:[400,198],j:[530,198],k:[530,109],l:[535,137],m:[650,198],n:[650,320],o:[530,323],p:[400,326],q:[250,325],r:[530,384],s:[365,199],t:[175,273],u:[310,232],v:[210,235],w:[400,254],x:[530,240]};
const edges=[['entrada','q'],['q','p'],['q','t'],['t','c'],['c','b'],['b','a'],['a','medicina'],['c','d'],['c','v'],['d','e'],['e','f'],['f','g'],['g','sociales'],['sociales','k'],['g','h'],['h','i'],['i','j'],['i','s'],['s','u'],['u','plaza'],['u','v'],['v','c'],['i','w'],['w','p'],['p','o'],['o','n'],['n','m'],['m','j'],['j','empresariales'],['empresariales','m'],['j','k'],['k','l'],['l','laboratorio'],['j','x'],['x','o'],['o','r'],['r','civil']];
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function nearest(p){let best=null;for(const [a,b] of edges){const A=nodes[a],B=nodes[b],dx=B[0]-A[0],dy=B[1]-A[1];const t=Math.max(0,Math.min(1,((p[0]-A[0])*dx+(p[1]-A[1])*dy)/(dx*dx+dy*dy)));const point=[A[0]+t*dx,A[1]+t*dy],d=distance(p,point);if(!best||d<best.distance)best={a,b,point,distance:d};}return best;}
function route(start,end){const n={...nodes},e=edges.map(x=>x.slice());let from=start;if(Array.isArray(start)){const s=nearest(start);if(!s||s.distance>45)return null;n.gps=s.point;from='gps';e.push(['gps',s.a],['gps',s.b]);}if(!n[from]||!n[end])return null;const d={[from]:0},prev={},todo=new Set(Object.keys(n));while(todo.size){const a=[...todo].reduce((x,y)=>(d[x]??Infinity)<=(d[y]??Infinity)?x:y);if(!Number.isFinite(d[a]))break;todo.delete(a);if(a===end)break;for(const [x,y] of e){const b=x===a?y:y===a?x:null;if(!b||!todo.has(b))continue;const v=d[a]+distance(n[a],n[b]);if(v<(d[b]??Infinity)){d[b]=v;prev[b]=a;}}}if(!Number.isFinite(d[end]))return null;const path=[];for(let k=end;k;k=prev[k]){path.unshift(n[k]);if(k===from)break;}return path;}
// Approximate similarity transform: public OSM building centroids aligned to visual centers.
// Mapcarta W161671748 (Sociales) and W161672598 (Empresariales). Verify in campus before real use.
const A={lat:-3.28532,lng:-79.91078,p:[430,135]},B={lat:-3.28615,lng:-79.90986,p:[590,265]};
const k=111320,cos=Math.cos(A.lat*Math.PI/180),u=(B.lng-A.lng)*k*cos,v=-(B.lat-A.lat)*k,dx=B.p[0]-A.p[0],dy=B.p[1]-A.p[1],den=u*u+v*v,aa=(dx*u+dy*v)/den,bb=(dy*u-dx*v)/den;
function project(lat,lng){const x=(lng-A.lng)*k*cos,y=-(lat-A.lat)*k;return [A.p[0]+aa*x-bb*y,A.p[1]+bb*x+aa*y];}
window.CAMPUS_GPS={nodes,route,nearest,project,pixelsPerMeter:Math.hypot(aa,bb),distance};
})();
