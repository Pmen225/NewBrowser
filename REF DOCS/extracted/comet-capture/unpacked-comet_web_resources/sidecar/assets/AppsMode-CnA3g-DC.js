import{R as i,j as n,r as a}from"./vendors-BAND5Q4O.js";import{bf as p}from"./platform-core-H3yLE1Sq.js";const w=o=>{const e=a.useRef(null),[r,t]=a.useState(1),s=a.useRef(null),c=a.useCallback(l=>{if(s.current&&(s.current.disconnect(),s.current=null),e.current=l,!l)return;const m=d=>{const h=d[0]?.contentRect.width??o,b=Math.min(1,h/o);t(b)};m([{contentRect:{width:l.clientWidth}}]);const u=new ResizeObserver(m);u.observe(l),s.current=u},[o]);return a.useEffect(()=>()=>{s.current&&s.current.disconnect()},[]),a.useMemo(()=>({scale:r,containerRef:c}),[r,c])},R=i.memo(function({url:e,height:r,iframeRef:t}){return!e||p(e)?null:n.jsx("div",{className:"scrollbar-subtle size-full",children:n.jsx("iframe",{ref:t,srcDoc:f(e),title:"Embedded App",sandbox:"allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms",referrerPolicy:"no-referrer",width:"100%",height:r?`${r}px`:"100%",loading:"eager",style:{colorScheme:"normal"}})})}),y=i.memo(function({app:e,onLoad:r,scale:t,originalWidth:s}){return!e.url||p(e.url)?null:n.jsx("iframe",{srcDoc:f(e.url),title:"Embedded App",sandbox:"allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms",referrerPolicy:"no-referrer",width:`${s}px`,height:`${s*(9/16)}px`,loading:"eager",className:"inert absolute left-0 top-0 origin-top-left",onLoad:r,style:{colorScheme:"normal",transform:`scale(${t})`}})}),v=i.memo(function({url:e,originalWidth:r=1200}){const{scale:t,containerRef:s}=w(r);if(!e||p(e))return null;const c=r*(16/9),l=c*t;return n.jsx("div",{ref:s,className:"scrollbar-subtle relative size-full overflow-auto",children:n.jsx("div",{style:{height:`${l}px`,minHeight:"100%"},children:n.jsx("iframe",{srcDoc:f(e),title:"Embedded Slides",sandbox:"allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms",referrerPolicy:"no-referrer",width:`${r}px`,height:`${c}px`,loading:"eager",className:"absolute left-0 top-0 origin-top-left",style:{colorScheme:"normal",transform:`scale(${t})`}})})})});function f(o){return`
  <!DOCTYPE html>
  <html>
    <head>
        <meta charset="UTF-8">
        <style>
            html, body, iframe { margin: 0; padding: 0; width: 100%; height: 100%; }
            iframe { display: block; border: none; }
        </style>
    </head>
    <body>
        <iframe
            src="${o}"
            title="Embedded App"
            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms"
            referrerpolicy="no-referrer"
            width="100%"
            height="100%"
            loading="eager"
            style="color-scheme: normal;"
        ></iframe>
    </body>
  </html>`}export{R as A,v as F,y as P,w as u};
//# sourceMappingURL=https://pplx-static-sourcemaps.perplexity.ai/_sidecar/assets/AppsMode-CnA3g-DC.js.map
