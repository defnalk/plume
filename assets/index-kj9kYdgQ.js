import{r as i,u as O,j as e,a as I,C as H,O as U,c as E,R as z}from"./r3f-NNkJmjUM.js";import{k as T,D,l as G,m as $,n as S,o as W,p as q,q as K,I as Y,r as V,A as J,s as X,t as Z,f as Q,U as ee,u as L,v as k}from"./three-D_dc7VwP.js";(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))s(t);new MutationObserver(t=>{for(const o of t)if(o.type==="childList")for(const u of o.addedNodes)u.tagName==="LINK"&&u.rel==="modulepreload"&&s(u)}).observe(document,{childList:!0,subtree:!0});function n(t){const o={};return t.integrity&&(o.integrity=t.integrity),t.referrerPolicy&&(o.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?o.credentials="include":t.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function s(t){if(t.ep)return;t.ep=!0;const o=n(t);fetch(t.href,o)}})();const te=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,ae=`
precision highp float;

varying vec2 vUv;
uniform float uTime;
uniform float uIntensity;
uniform float uReducedMotion;
uniform vec3 uColorHot;
uniform vec3 uColorCool;

// 2D hash + value noise + fbm — small and fast, good enough for shimmer
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  // uv (0,0) bottom — left, (1,1) top — right. We want intensity to peak just
  // below the outlet and dissipate downward and outward.
  vec2 p = vUv;
  float t = uTime * (1.0 - uReducedMotion * 0.95);

  // Vertical rise + slight horizontal sway
  vec2 q = vec2(p.x * 3.0, (1.0 - p.y) * 5.0 - t * 0.45);
  float n = fbm(q + vec2(fbm(q * 1.7) * 0.5, t * 0.2));

  // Fade horizontally (column-shaped) and vertically (peaks at top, dies at bottom)
  float horiz = smoothstep(0.5, 0.0, abs(p.x - 0.5));
  float vert = smoothstep(0.0, 0.4, p.y) * (1.0 - smoothstep(0.7, 1.0, p.y));
  float mask = horiz * vert;

  // Distort the mask with noise to break up the column shape
  float warped = n * mask;
  float core = pow(warped, 2.4) * uIntensity;

  vec3 col = mix(uColorCool, uColorHot, smoothstep(0.0, 0.6, n));
  float alpha = clamp(core * 0.55, 0.0, 0.45);

  gl_FragColor = vec4(col, alpha);
}
`;function se({position:r,width:a,height:n,intensity:s,reducedMotion:t}){const o=i.useRef(null),u=i.useMemo(()=>({uTime:{value:0},uIntensity:{value:s},uReducedMotion:{value:t?1:0},uColorHot:{value:new T("#fbbf24")},uColorCool:{value:new T("#7dd3fc")}}),[]);return O(d=>{o.current&&(o.current.uniforms.uTime.value=d.clock.elapsedTime,o.current.uniforms.uIntensity.value=s,o.current.uniforms.uReducedMotion.value=t?1:0)}),e.jsxs("mesh",{position:r,children:[e.jsx("planeGeometry",{args:[a,n,1,1]}),e.jsx("shaderMaterial",{ref:o,uniforms:u,vertexShader:te,fragmentShader:ae,transparent:!0,depthWrite:!1,blending:G,side:D})]})}const ne=`
precision highp float;

attribute float aSeed;
attribute float aSpeed;

uniform float uTime;
uniform float uTopY;
uniform float uBottomY;
uniform float uTSpeed;
uniform float uReducedMotion;
uniform float uPointSize;
uniform float uPixelRatio;
uniform float uColumnHalfWidth;
uniform sampler2D uLut;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec3 pos = position;

  // Axial flow: cycle each particle from top to bottom over time
  float height = uTopY - uBottomY;
  float baseY = mod(pos.y - uTime * uTSpeed * aSpeed * (1.0 - uReducedMotion * 0.85), height);
  if (baseY < 0.0) baseY += height;
  float y = uTopY - baseY;

  // Mild lateral wobble inside the column, dampened by reduced motion
  float wobble = sin(uTime * 0.6 + aSeed * 6.2831) * 0.06;
  float x = pos.x + wobble * (1.0 - uReducedMotion);
  // Snug to the column walls at the entrance and exit (hourglass-ish flow)
  float taper = 1.0 - smoothstep(0.0, 1.0, abs((y - 0.5 * (uTopY + uBottomY)) / (0.5 * height)));
  x *= mix(0.4, 1.0, taper);

  vec3 wpos = vec3(x * uColumnHalfWidth, y, pos.z);

  vec4 mv = modelViewMatrix * vec4(wpos, 1.0);
  gl_Position = projectionMatrix * mv;

  // LUT lookup: 0 = bottom (outlet), 1 = top (inlet)
  float u = clamp((y - uBottomY) / max(height, 1e-3), 0.0, 1.0);
  vColor = texture2D(uLut, vec2(u, 0.5)).rgb;

  // Fade particles near the very top + bottom so they don't pop in
  float edgeFade = smoothstep(0.0, 0.05, u) * (1.0 - smoothstep(0.95, 1.0, u));
  vAlpha = edgeFade;

  // Mild perspective scaling so closer particles read slightly larger,
  // but keep an absolute ceiling — otherwise a 200px monster particle
  // smears across the entire column.
  float depthScale = clamp(40.0 / max(-mv.z, 1.0), 0.6, 1.6);
  gl_PointSize = uPointSize * uPixelRatio * depthScale;
}
`,oe=`
precision highp float;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  float d = length(c);
  if (d > 0.5) discard;
  // Soft falloff with a tiny core highlight. Kept conservative because we
  // additive-blend ~hundreds of these — too much per-particle alpha and the
  // column saturates to white.
  // Soft circular falloff with a small bright pip. Modest alpha so a
  // dense field reads as a colored mist rather than saturating to white.
  float falloff = pow(1.0 - d * 2.0, 1.6);
  float alpha = falloff * 0.45 * vAlpha;
  vec3 col = vColor * (1.0 + 0.4 * pow(falloff, 3.0));
  gl_FragColor = vec4(col, alpha);
}
`;function re({topY:r,bottomY:a,columnHalfWidth:n,count:s,lut:t,reducedMotion:o,flowSpeed:u}){const d=i.useRef(null),{gl:p}=I(),h=p.getPixelRatio(),l=i.useMemo(()=>{const m=new $,g=new Float32Array(s*3),w=new Float32Array(s),y=new Float32Array(s),j=r-a;for(let c=0;c<s;c++)g[c*3+0]=Math.random()*2-1,g[c*3+1]=a+Math.random()*j,g[c*3+2]=(Math.random()*2-1)*.05,w[c]=Math.random(),y[c]=.7+Math.random()*.6;return m.setAttribute("position",new S(g,3)),m.setAttribute("aSeed",new S(w,1)),m.setAttribute("aSpeed",new S(y,1)),m},[s,r,a]),f=i.useMemo(()=>({uTime:{value:0},uTopY:{value:r},uBottomY:{value:a},uTSpeed:{value:u},uReducedMotion:{value:o?1:0},uPointSize:{value:8},uPixelRatio:{value:h},uColumnHalfWidth:{value:n},uLut:{value:t}}),[r,a,u,o,h,n,t]);return i.useEffect(()=>{d.current&&(d.current.uniforms.uReducedMotion.value=o?1:0,d.current.uniforms.uTSpeed.value=u,d.current.uniforms.uLut.value=t,d.current.uniformsNeedUpdate=!0)},[o,u,t]),O(m=>{d.current&&(d.current.uniforms.uTime.value=m.clock.elapsedTime)}),e.jsx("points",{geometry:l,frustumCulled:!1,children:e.jsx("shaderMaterial",{ref:d,uniforms:f,vertexShader:ne,fragmentShader:oe,transparent:!0,depthWrite:!1,blending:W})})}function ie({topY:r,bottomY:a,columnHalfWidth:n}){const s=r-a,t=.05,o=i.useMemo(()=>{const h=[],m=a+.6,g=r-.6,w=28,y=5;for(let j=0;j<w;j++)for(let c=0;c<y;c++){const x=((c+.5)/y*2-1)*(n-.12),_=m+(j+.5)/w*(g-m),b=(Math.random()-.5)*.18,M=(Math.random()-.5)*.22,B=(Math.random()-.5)*.12;h.push([x+b,_+M,B])}return h},[r,a,n]),u=i.useMemo(()=>new q(.06,12,12),[]),d=i.useMemo(()=>new K({color:"#1f2937",metalness:.4,roughness:.55,emissive:"#0b1220"}),[]),p=i.useMemo(()=>{const h=new Y(u,d,o.length),l=new V;return o.forEach((f,m)=>{l.makeTranslation(f[0],f[1],f[2]),h.setMatrixAt(m,l)}),h.instanceMatrix.needsUpdate=!0,h},[o,u,d]);return e.jsxs("group",{children:[e.jsxs("mesh",{position:[n+t*.5,0,0],children:[e.jsx("boxGeometry",{args:[t,s,.3]}),e.jsx("meshStandardMaterial",{color:"#52525b",metalness:.7,roughness:.3})]}),e.jsxs("mesh",{position:[-(n+t*.5),0,0],children:[e.jsx("boxGeometry",{args:[t,s,.3]}),e.jsx("meshStandardMaterial",{color:"#52525b",metalness:.7,roughness:.3})]}),e.jsxs("mesh",{position:[0,r,0],children:[e.jsx("torusGeometry",{args:[n,.06,12,32,Math.PI]}),e.jsx("meshStandardMaterial",{color:"#71717a",metalness:.6,roughness:.4})]}),e.jsxs("mesh",{position:[0,r+.45,0],rotation:[0,0,0],children:[e.jsx("cylinderGeometry",{args:[.12,.12,.9,16]}),e.jsx("meshStandardMaterial",{color:"#3f3f46",metalness:.6,roughness:.45})]}),e.jsxs("mesh",{position:[0,a,0],rotation:[0,0,Math.PI],children:[e.jsx("torusGeometry",{args:[n,.06,12,32,Math.PI]}),e.jsx("meshStandardMaterial",{color:"#71717a",metalness:.6,roughness:.4})]}),e.jsxs("mesh",{position:[0,a-.45,0],children:[e.jsx("cylinderGeometry",{args:[.12,.12,.9,16]}),e.jsx("meshStandardMaterial",{color:"#3f3f46",metalness:.6,roughness:.45})]}),e.jsx("primitive",{object:p}),e.jsxs("mesh",{position:[0,0,-.4],children:[e.jsx("planeGeometry",{args:[n*2.6,s+.4]}),e.jsx("meshBasicMaterial",{color:"#0a0a0f"})]})]})}const A=4.5,N=-4.5,F=.85,le=600,ce=i.forwardRef(function({T:a,lut:n,reducedMotion:s},t){const o=i.useRef(null),u=i.useRef(null),d=i.useRef(null);i.useImperativeHandle(t,()=>({takeScreenshot:()=>{const l=o.current,f=u.current,m=d.current;return!l||!f||!m?null:(l.render(f,m),l.domElement.toDataURL("image/png"))}}));const p=.6+(a-380)/280*1.6,h=.35+Math.max(0,(a-380)/280)*1.4;return e.jsxs(H,{dpr:[1,2],camera:{position:[3.5,.5,7.5],fov:45},gl:{antialias:!0,alpha:!0,preserveDrawingBuffer:!0},onCreated:l=>{o.current=l.gl,u.current=l.scene,d.current=l.camera,l.gl.setClearColor(new T("#08080d"),1),l.gl.toneMapping=J,l.gl.toneMappingExposure=.95,l.gl.outputColorSpace=X},children:[e.jsx("ambientLight",{intensity:.35}),e.jsx("directionalLight",{position:[6,8,5],intensity:.55,color:"#fef3c7"}),e.jsx("directionalLight",{position:[-4,-2,3],intensity:.25,color:"#7dd3fc"}),e.jsx(ie,{topY:A,bottomY:N,columnHalfWidth:F}),n&&e.jsx(re,{topY:A,bottomY:N,columnHalfWidth:F,count:le,lut:n,reducedMotion:s,flowSpeed:p}),e.jsx(se,{position:[0,N-1.6,.1],width:3,height:2.4,intensity:h,reducedMotion:s}),e.jsx(U,{enablePan:!1,enableZoom:!0,minDistance:4,maxDistance:14,minPolarAngle:Math.PI*.2,maxPolarAngle:Math.PI*.8,enableDamping:!0,dampingFactor:.08})]})}),P="s";function ue(){if(typeof window>"u")return{};const r=window.location.hash.replace(/^#/,"");if(!r)return{};try{const n=new URLSearchParams(r).get(P);if(!n)return{};const s=JSON.parse(atob(n));if(typeof s!="object"||s===null)return{};const t={};return typeof s.T=="number"&&Number.isFinite(s.T)&&(t.T=s.T),t}catch{return{}}}function de(r){if(typeof window>"u")return;const a=btoa(JSON.stringify(r)),n=new URLSearchParams;n.set(P,a);const s=`#${n.toString()}`;window.location.hash!==s&&history.replaceState(null,"",`${window.location.pathname}${window.location.search}${s}`)}function me(r){if(typeof window>"u")return"";const a=btoa(JSON.stringify(r)),n=new URLSearchParams;return n.set(P,a),`${window.location.origin}${window.location.pathname}#${n.toString()}`}const R=380,C=660;function he({T:r,onTChange:a,conversion:n,selectivity:s,reducedMotion:t,solving:o,onScreenshot:u}){const[d,p]=i.useState("Share state"),h=async()=>{const l=me({T:r});try{await navigator.clipboard.writeText(l),p("Copied!")}catch{window.prompt("Copy share URL:",l),p("Share state");return}setTimeout(()=>p("Share state"),1500)};return e.jsxs("aside",{className:"side-panel","aria-label":"Reactor controls",children:[e.jsxs("header",{className:"side-panel__header",children:[e.jsx("h1",{className:"side-panel__title",children:"Plume"}),e.jsx("p",{className:"side-panel__tagline",children:"Watch a reactor breathe."})]}),e.jsxs("section",{className:"side-panel__section",children:[e.jsxs("label",{htmlFor:"t-inlet",className:"control-label",children:["Inlet temperature",e.jsxs("span",{className:"control-value",children:[Math.round(r)," K"]})]}),e.jsx("input",{id:"t-inlet",type:"range",min:R,max:C,step:1,value:r,onChange:l=>a(Number(l.target.value)),"aria-valuemin":R,"aria-valuemax":C,"aria-valuenow":r}),e.jsxs("div",{className:"control-scale","aria-hidden":!0,children:[e.jsxs("span",{children:[R," K"]}),e.jsxs("span",{children:[C," K"]})]})]}),e.jsxs("section",{className:"side-panel__section side-panel__metrics",children:[e.jsxs("div",{className:"metric",children:[e.jsx("div",{className:"metric__label",children:"CH₃OH conversion"}),e.jsxs("div",{className:"metric__value",children:[(n*100).toFixed(1),e.jsx("span",{className:"metric__unit",children:"%"})]}),e.jsx("div",{className:"metric__bar","aria-hidden":!0,children:e.jsx("div",{className:"metric__bar-fill metric__bar-fill--conversion",style:{width:`${Math.min(100,n*100)}%`}})})]}),e.jsxs("div",{className:"metric",children:[e.jsx("div",{className:"metric__label",children:"HCHO selectivity"}),e.jsxs("div",{className:"metric__value",children:[(s*100).toFixed(1),e.jsx("span",{className:"metric__unit",children:"%"})]}),e.jsx("div",{className:"metric__bar","aria-hidden":!0,children:e.jsx("div",{className:"metric__bar-fill metric__bar-fill--selectivity",style:{width:`${Math.min(100,s*100)}%`}})})]})]}),e.jsxs("section",{className:"side-panel__section side-panel__buttons",children:[e.jsx("button",{type:"button",onClick:u,className:"btn",children:"Screenshot"}),e.jsx("button",{type:"button",onClick:h,className:"btn btn--ghost",children:d})]}),e.jsxs("section",{className:"side-panel__legend","aria-label":"Species legend",children:[e.jsxs("div",{className:"legend__row",children:[e.jsx("span",{className:"legend__swatch",style:{background:"#7dd3fc"}}),"CH₃OH (methanol)"]}),e.jsxs("div",{className:"legend__row",children:[e.jsx("span",{className:"legend__swatch",style:{background:"#9ef09e"}}),"O₂"]}),e.jsxs("div",{className:"legend__row",children:[e.jsx("span",{className:"legend__swatch",style:{background:"#fbbf24"}}),"HCHO (formaldehyde)"]}),e.jsxs("div",{className:"legend__row",children:[e.jsx("span",{className:"legend__swatch",style:{background:"#c4c4eb"}}),"H₂O"]}),e.jsxs("div",{className:"legend__row",children:[e.jsx("span",{className:"legend__swatch",style:{background:"#f25c5c"}}),"CO"]})]}),e.jsxs("footer",{className:"side-panel__footer",children:[e.jsxs("p",{children:["LHHW kinetics · RK4 in worker ·"," ",e.jsx("a",{href:"https://github.com/defnalk/plume",target:"_blank",rel:"noreferrer",children:"source"})]}),e.jsx("p",{className:"side-panel__status",children:o?"Solving…":t?"Reduced motion: on":"Live"})]})]})}function pe(){const[r,a]=i.useState(()=>typeof window>"u"||!window.matchMedia?!1:window.matchMedia("(prefers-reduced-motion: reduce)").matches);return i.useEffect(()=>{if(typeof window>"u"||!window.matchMedia)return;const n=window.matchMedia("(prefers-reduced-motion: reduce)"),s=t=>a(t.matches);return n.addEventListener("change",s),()=>n.removeEventListener("change",s)},[]),r}function fe(r){return new Worker("/plume/assets/kinetics.worker-B98MXBHb.js",{type:"module",name:r?.name})}const ve=430;function ge(){const r=i.useMemo(()=>ue(),[]),[a,n]=i.useState(r.T??ve),[s,t]=i.useState(0),[o,u]=i.useState(0),[d,p]=i.useState(!0),[h,l]=i.useState(null),f=pe(),m=i.useRef(null),g=i.useRef(null),w=i.useRef(0),y=i.useRef(-1);i.useEffect(()=>{const c=new fe;return g.current=c,c.onmessage=v=>{const x=v.data;if(x.type!=="result"||x.id<y.current)return;y.current=x.id,t(x.conversion),u(x.selectivity),p(!1);const _=new Uint8Array(x.lut.length);_.set(x.lut);const b=new Z(_,x.lutWidth,1,Q,ee);b.minFilter=L,b.magFilter=L,b.wrapS=k,b.wrapT=k,b.needsUpdate=!0,l(M=>(M?.dispose(),b))},()=>{c.terminate(),g.current=null}},[]),i.useEffect(()=>{let c=0;return c=requestAnimationFrame(()=>{const v=g.current;v&&(w.current+=1,p(!0),v.postMessage({type:"solve",id:w.current,T:a}))}),de({T:a}),()=>cancelAnimationFrame(c)},[a]);const j=()=>{const c=m.current?.takeScreenshot();if(!c)return;const v=document.createElement("a");v.href=c,v.download=`plume-${Math.round(a)}K.png`,document.body.appendChild(v),v.click(),document.body.removeChild(v)};return e.jsxs("div",{className:"app",children:[e.jsx("main",{className:"canvas-wrap","aria-label":"Reactor visualization",children:e.jsx(ce,{T:a,lut:h,reducedMotion:f,ref:m})}),e.jsx(he,{T:a,onTChange:n,conversion:s,selectivity:o,reducedMotion:f,solving:d,onScreenshot:j})]})}E.createRoot(document.getElementById("root")).render(e.jsx(z.StrictMode,{children:e.jsx(ge,{})}));
