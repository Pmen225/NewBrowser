import"./vendors-BAND5Q4O.js";import"./vite-CuyfC2og.js";var Mi="0.3.8",Ir=`bippy-${Mi}`,so=Object.defineProperty,Fi=Object.prototype.hasOwnProperty,On=()=>{},ga=e=>{try{Function.prototype.toString.call(e).indexOf("^_^")>-1&&setTimeout(()=>{throw new Error("React is running in production mode, but dead code elimination has not been applied. Read how to correctly configure React for production: https://reactjs.org/link/perf-use-production-build")})}catch{}},va=(e=nt())=>"getFiberRoots"in e,wa=!1,lo=void 0,sr=(e=nt())=>wa?!0:(typeof e.inject=="function"&&(lo=e.inject.toString()),!!lo?.includes("(injected)")),ln=new Set,Ri=e=>{const t=new Map;let n=0,r={checkDCE:ga,supportsFiber:!0,supportsFlight:!0,hasUnsupportedRendererAttached:!1,renderers:t,onCommitFiberRoot:On,onCommitFiberUnmount:On,onPostCommitFiberRoot:On,inject(o){const i=++n;return t.set(i,o),r._instrumentationIsActive||(r._instrumentationIsActive=!0,ln.forEach(s=>s())),i},_instrumentationSource:Ir,_instrumentationIsActive:!1};try{so(globalThis,"__REACT_DEVTOOLS_GLOBAL_HOOK__",{get(){return r},set(s){if(s&&typeof s=="object"){const l=r.renderers;r=s,l.size>0&&(l.forEach((c,d)=>{s.renderers.set(d,c)}),lr(e))}},configurable:!0,enumerable:!0});const o=window.hasOwnProperty;let i=!1;so(window,"hasOwnProperty",{value:function(){try{return!i&&arguments[0]==="__REACT_DEVTOOLS_GLOBAL_HOOK__"?(globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__=void 0,i=!0,-0):o.apply(this,arguments)}catch{return o.apply(this,arguments)}},configurable:!0,writable:!0})}catch{lr(e)}return r},lr=e=>{e&&ln.add(e);try{const t=globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!t)return;if(!t._instrumentationSource){if(t.checkDCE=ga,t.supportsFiber=!0,t.supportsFlight=!0,t.hasUnsupportedRendererAttached=!1,t._instrumentationSource=Ir,t._instrumentationIsActive=!1,t.renderers.size){t._instrumentationIsActive=!0,ln.forEach(r=>r());return}const n=t.inject;sr(t)&&!va()&&(wa=!0,t.inject({scheduleRefresh(){}})&&(t._instrumentationIsActive=!0)),t.inject=r=>{const o=n(r);return t._instrumentationIsActive=!0,ln.forEach(i=>i()),o}}(t.renderers.size||t._instrumentationIsActive||sr())&&e?.()}catch{}},$i=()=>Fi.call(globalThis,"__REACT_DEVTOOLS_GLOBAL_HOOK__"),nt=e=>$i()?(lr(e),globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__):Ri(e),Di=()=>!!(typeof window<"u"&&(window.document?.createElement||window.navigator?.product==="ReactNative")),Pi=()=>{try{Di()&&nt()}catch{}},zn=0,at=1,ba=3,Oi=5,Li=6,ji=7,Wi=9,An=11,In=13,Vt=14,Yt=15,Hi=18,Ui=22,Vi=23,Yi=26,Bi=27,Xi=60111,qi="Symbol(react.concurrent_mode)",Gi="Symbol(react.async_mode)",co=1,Ji=2,Ki=4096,Zi=4,uo=8,Qi=16,es=32,ts=1024,ns=8192,po=Ji|Zi|Qi|es|Ki|ns|ts,Rt=e=>{switch(e.tag){case Oi:case Yi:case Bi:return!0;default:return typeof e.type=="string"}},Mn=e=>{switch(e.tag){case zn:case at:case Yt:case Vt:case An:return!0;default:return!1}},rs=(e,t)=>{try{const n=e.dependencies,r=e.alternate?.dependencies;if(!n||!r||typeof n!="object"||!("firstContext"in n)||typeof r!="object"||!("firstContext"in r))return!1;let o=n.firstContext,i=r.firstContext;for(;o&&typeof o=="object"&&"memoizedValue"in o||i&&typeof i=="object"&&"memoizedValue"in i;){if(t(o,i)===!0)return!0;o=o?.next,i=i?.next}}catch{}return!1},Mr=e=>{const t=e.memoizedProps,n=e.alternate?.memoizedProps||{},r=e.flags??e.effectTag??0;switch(e.tag){case at:case zn:case Wi:case An:case Vt:case Yt:return(r&co)===co;default:return e.alternate?n!==t||e.alternate.memoizedState!==e.memoizedState||e.alternate.ref!==e.ref:!0}},Fr=e=>(e.flags&(po|uo))!==0||(e.subtreeFlags&(po|uo))!==0,os=e=>{const t=[],n=[e];for(;n.length;){const r=n.pop();r&&(Rt(r)&&Fr(r)&&Mr(r)&&t.push(r),r.child&&n.push(r.child),r.sibling&&n.push(r.sibling))}return t},Rr=e=>{switch(e.tag){case Hi:return!0;case Li:case ji:case Vi:case Ui:return!0;case ba:return!1;default:{const t=typeof e.type=="object"&&e.type!==null?e.type.$$typeof:e.type;switch(typeof t=="symbol"?t.toString():t){case Xi:case qi:case Gi:return!0;default:return!1}}}},as=e=>{const t=[],n=[];for(Rt(e)?t.push(e):e.child&&n.push(e.child);n.length;){const r=n.pop();if(!r)break;Rt(r)?t.push(r):r.child&&n.push(r.child),r.sibling&&n.push(r.sibling)}return t},$r=(e,t,n=!1)=>{if(!e)return null;if(t(e)===!0)return e;let r=n?e.return:e.child;for(;r;){const o=$r(r,t,n);if(o)return o;r=n?null:r.sibling}return null},Ze=e=>{const t=e?.actualDuration??0;let n=t,r=e?.child??null;for(;t>0&&r!=null;)n-=r.actualDuration??0,r=r.sibling;return{selfTime:n,totalTime:t}},$t=e=>!!e.updateQueue?.memoCache,it=e=>{const t=e;return typeof t=="function"?t:typeof t=="object"&&t?it(t.type||t.render):null},ge=e=>{const t=e;if(typeof t=="string")return t;if(typeof t!="function"&&!(typeof t=="object"&&t))return null;const n=t.displayName||t.name||null;if(n)return n;const r=it(t);return r&&(r.displayName||r.name)||null},is=e=>{try{if(typeof e.version=="string"&&e.bundleType>0)return"development"}catch{}return"production"},ss=()=>!!nt()._instrumentationIsActive||va()||sr(),xa=0,xt=new WeakMap,ls=(e,t=xa++)=>{xt.set(e,t)},Be=e=>{let t=xt.get(e);return!t&&e.alternate&&(t=xt.get(e.alternate)),t||(t=xa++,ls(e,t)),t},Ye=(e,t,n)=>{let r=t;for(;r!=null;){if(xt.has(r)||Be(r),!Rr(r)&&Mr(r)&&e(r,"mount"),r.tag===In)if(r.memoizedState!==null){const s=r.child,l=s?s.sibling:null;if(l){const c=l.child;c!==null&&Ye(e,c,!1)}}else{let s=null;r.child!==null&&(s=r.child.child),s!==null&&Ye(e,s,!1)}else r.child!=null&&Ye(e,r.child,!0);r=n?r.sibling:null}},cr=(e,t,n,r)=>{if(xt.has(t)||Be(t),!n)return;xt.has(n)||Be(n);const o=t.tag===In;!Rr(t)&&Mr(t)&&e(t,"update");const s=o&&n.memoizedState!==null,l=o&&t.memoizedState!==null;if(s&&l){const c=t.child?.sibling??null,d=n.child?.sibling??null;c!==null&&d!==null&&cr(e,c,d)}else if(s&&!l){const c=t.child;c!==null&&Ye(e,c,!0)}else if(!s&&l){ya(e,n);const c=t.child?.sibling??null;c!==null&&Ye(e,c,!0)}else if(t.child!==n.child){let c=t.child;for(;c;){if(c.alternate){const d=c.alternate;cr(e,c,d)}else Ye(e,c,!1);c=c.sibling}}},dr=(e,t)=>{(t.tag===ba||!Rr(t))&&e(t,"unmount")},ya=(e,t)=>{const n=t.tag===In&&t.memoizedState!==null;let r=t.child;for(n&&(r=(t.child?.sibling??null)?.child??null);r!==null;)r.return!==null&&(dr(e,r),ya(e,r)),r=r.sibling},cs=0,ho=new WeakMap,ds=(e,t)=>{const n="current"in e?e.current:e;let r=ho.get(e);r||(r={prevFiber:null,id:cs++},ho.set(e,r));const{prevFiber:o}=r;if(!n)dr(t,n);else if(o!==null){const i=o&&o.memoizedState!=null&&o.memoizedState.element!=null&&o.memoizedState.isDehydrated!==!0,s=n.memoizedState!=null&&n.memoizedState.element!=null&&n.memoizedState.isDehydrated!==!0;!i&&s?Ye(t,n,!1):i&&s?cr(t,n,n.alternate):i&&!s&&dr(t,n)}else Ye(t,n,!0);r.prevFiber=n},us=e=>nt(()=>{const t=nt();e.onActive?.(),t._instrumentationSource=e.name??Ir;const n=t.onCommitFiberRoot;e.onCommitFiberRoot&&(t.onCommitFiberRoot=(i,s,l)=>{n&&n(i,s,l),e.onCommitFiberRoot?.(i,s,l)});const r=t.onCommitFiberUnmount;e.onCommitFiberUnmount&&(t.onCommitFiberUnmount=(i,s)=>{r&&r(i,s),e.onCommitFiberUnmount?.(i,s)});const o=t.onPostCommitFiberRoot;e.onPostCommitFiberRoot&&(t.onPostCommitFiberRoot=(i,s)=>{o&&o(i,s),e.onPostCommitFiberRoot?.(i,s)})});Pi();var Fn,P,ka,_a,Ke,fo,Ca,Sa,Ta,Dr,ur,pr,Na,Dt={},Ea=[],ps=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,Bt=Array.isArray;function Le(e,t){for(var n in t)e[n]=t[n];return e}function Pr(e){e&&e.parentNode&&e.parentNode.removeChild(e)}function rt(e,t,n){var r,o,i,s={};for(i in t)i=="key"?r=t[i]:i=="ref"?o=t[i]:s[i]=t[i];if(arguments.length>2&&(s.children=arguments.length>3?Fn.call(arguments,2):n),typeof e=="function"&&e.defaultProps!=null)for(i in e.defaultProps)s[i]===void 0&&(s[i]=e.defaultProps[i]);return cn(e,s,r,o,null)}function cn(e,t,n,r,o){var i={type:e,props:t,key:n,ref:r,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:o??++ka,__i:-1,__u:0};return o==null&&P.vnode!=null&&P.vnode(i),i}function Y(e){return e.children}function Ne(e,t){this.props=e,this.context=t}function yt(e,t){if(t==null)return e.__?yt(e.__,e.__i+1):null;for(var n;t<e.__k.length;t++)if((n=e.__k[t])!=null&&n.__e!=null)return n.__e;return typeof e.type=="function"?yt(e):null}function za(e){var t,n;if((e=e.__)!=null&&e.__c!=null){for(e.__e=e.__c.base=null,t=0;t<e.__k.length;t++)if((n=e.__k[t])!=null&&n.__e!=null){e.__e=e.__c.base=n.__e;break}return za(e)}}function hr(e){(!e.__d&&(e.__d=!0)&&Ke.push(e)&&!mn.__r++||fo!==P.debounceRendering)&&((fo=P.debounceRendering)||Ca)(mn)}function mn(){for(var e,t,n,r,o,i,s,l=1;Ke.length;)Ke.length>l&&Ke.sort(Sa),e=Ke.shift(),l=Ke.length,e.__d&&(n=void 0,o=(r=(t=e).__v).__e,i=[],s=[],t.__P&&((n=Le({},r)).__v=r.__v+1,P.vnode&&P.vnode(n),Or(t.__P,n,r,t.__n,t.__P.namespaceURI,32&r.__u?[o]:null,i,o??yt(r),!!(32&r.__u),s),n.__v=r.__v,n.__.__k[n.__i]=n,Ma(i,n,s),n.__e!=o&&za(n)));mn.__r=0}function Aa(e,t,n,r,o,i,s,l,c,d,p){var u,h,f,v,x,y,m=r&&r.__k||Ea,b=t.length;for(c=hs(n,t,m,c,b),u=0;u<b;u++)(f=n.__k[u])!=null&&(h=f.__i===-1?Dt:m[f.__i]||Dt,f.__i=u,y=Or(e,f,h,o,i,s,l,c,d,p),v=f.__e,f.ref&&h.ref!=f.ref&&(h.ref&&Lr(h.ref,null,f),p.push(f.ref,f.__c||v,f)),x==null&&v!=null&&(x=v),4&f.__u||h.__k===f.__k?c=Ia(f,c,e):typeof f.type=="function"&&y!==void 0?c=y:v&&(c=v.nextSibling),f.__u&=-7);return n.__e=x,c}function hs(e,t,n,r,o){var i,s,l,c,d,p=n.length,u=p,h=0;for(e.__k=new Array(o),i=0;i<o;i++)(s=t[i])!=null&&typeof s!="boolean"&&typeof s!="function"?(c=i+h,(s=e.__k[i]=typeof s=="string"||typeof s=="number"||typeof s=="bigint"||s.constructor==String?cn(null,s,null,null,null):Bt(s)?cn(Y,{children:s},null,null,null):s.constructor===void 0&&s.__b>0?cn(s.type,s.props,s.key,s.ref?s.ref:null,s.__v):s).__=e,s.__b=e.__b+1,l=null,(d=s.__i=fs(s,n,c,u))!==-1&&(u--,(l=n[d])&&(l.__u|=2)),l==null||l.__v===null?(d==-1&&(o>p?h--:o<p&&h++),typeof s.type!="function"&&(s.__u|=4)):d!=c&&(d==c-1?h--:d==c+1?h++:(d>c?h--:h++,s.__u|=4))):e.__k[i]=null;if(u)for(i=0;i<p;i++)(l=n[i])!=null&&(2&l.__u)==0&&(l.__e==r&&(r=yt(l)),Ra(l,l));return r}function Ia(e,t,n){var r,o;if(typeof e.type=="function"){for(r=e.__k,o=0;r&&o<r.length;o++)r[o]&&(r[o].__=e,t=Ia(r[o],t,n));return t}e.__e!=t&&(t&&e.type&&!n.contains(t)&&(t=yt(e)),n.insertBefore(e.__e,t||null),t=e.__e);do t=t&&t.nextSibling;while(t!=null&&t.nodeType==8);return t}function gn(e,t){return t=t||[],e==null||typeof e=="boolean"||(Bt(e)?e.some(function(n){gn(n,t)}):t.push(e)),t}function fs(e,t,n,r){var o,i,s=e.key,l=e.type,c=t[n];if(c===null&&e.key==null||c&&s==c.key&&l===c.type&&(2&c.__u)==0)return n;if(r>(c!=null&&(2&c.__u)==0?1:0))for(o=n-1,i=n+1;o>=0||i<t.length;){if(o>=0){if((c=t[o])&&(2&c.__u)==0&&s==c.key&&l===c.type)return o;o--}if(i<t.length){if((c=t[i])&&(2&c.__u)==0&&s==c.key&&l===c.type)return i;i++}}return-1}function mo(e,t,n){t[0]=="-"?e.setProperty(t,n??""):e[t]=n==null?"":typeof n!="number"||ps.test(t)?n:n+"px"}function Zt(e,t,n,r,o){var i;e:if(t=="style")if(typeof n=="string")e.style.cssText=n;else{if(typeof r=="string"&&(e.style.cssText=r=""),r)for(t in r)n&&t in n||mo(e.style,t,"");if(n)for(t in n)r&&n[t]===r[t]||mo(e.style,t,n[t])}else if(t[0]=="o"&&t[1]=="n")i=t!=(t=t.replace(Ta,"$1")),t=t.toLowerCase()in e||t=="onFocusOut"||t=="onFocusIn"?t.toLowerCase().slice(2):t.slice(2),e.l||(e.l={}),e.l[t+i]=n,n?r?n.t=r.t:(n.t=Dr,e.addEventListener(t,i?pr:ur,i)):e.removeEventListener(t,i?pr:ur,i);else{if(o=="http://www.w3.org/2000/svg")t=t.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if(t!="width"&&t!="height"&&t!="href"&&t!="list"&&t!="form"&&t!="tabIndex"&&t!="download"&&t!="rowSpan"&&t!="colSpan"&&t!="role"&&t!="popover"&&t in e)try{e[t]=n??"";break e}catch{}typeof n=="function"||(n==null||n===!1&&t[4]!="-"?e.removeAttribute(t):e.setAttribute(t,t=="popover"&&n==1?"":n))}}function go(e){return function(t){if(this.l){var n=this.l[t.type+e];if(t.u==null)t.u=Dr++;else if(t.u<n.t)return;return n(P.event?P.event(t):t)}}}function Or(e,t,n,r,o,i,s,l,c,d){var p,u,h,f,v,x,y,m,b,C,S,T,I,V,q,O,B,L=t.type;if(t.constructor!==void 0)return null;128&n.__u&&(c=!!(32&n.__u),i=[l=t.__e=n.__e]),(p=P.__b)&&p(t);e:if(typeof L=="function")try{if(m=t.props,b="prototype"in L&&L.prototype.render,C=(p=L.contextType)&&r[p.__c],S=p?C?C.props.value:p.__:r,n.__c?y=(u=t.__c=n.__c).__=u.__E:(b?t.__c=u=new L(m,S):(t.__c=u=new Ne(m,S),u.constructor=L,u.render=gs),C&&C.sub(u),u.props=m,u.state||(u.state={}),u.context=S,u.__n=r,h=u.__d=!0,u.__h=[],u._sb=[]),b&&u.__s==null&&(u.__s=u.state),b&&L.getDerivedStateFromProps!=null&&(u.__s==u.state&&(u.__s=Le({},u.__s)),Le(u.__s,L.getDerivedStateFromProps(m,u.__s))),f=u.props,v=u.state,u.__v=t,h)b&&L.getDerivedStateFromProps==null&&u.componentWillMount!=null&&u.componentWillMount(),b&&u.componentDidMount!=null&&u.__h.push(u.componentDidMount);else{if(b&&L.getDerivedStateFromProps==null&&m!==f&&u.componentWillReceiveProps!=null&&u.componentWillReceiveProps(m,S),!u.__e&&(u.shouldComponentUpdate!=null&&u.shouldComponentUpdate(m,u.__s,S)===!1||t.__v==n.__v)){for(t.__v!=n.__v&&(u.props=m,u.state=u.__s,u.__d=!1),t.__e=n.__e,t.__k=n.__k,t.__k.some(function($){$&&($.__=t)}),T=0;T<u._sb.length;T++)u.__h.push(u._sb[T]);u._sb=[],u.__h.length&&s.push(u);break e}u.componentWillUpdate!=null&&u.componentWillUpdate(m,u.__s,S),b&&u.componentDidUpdate!=null&&u.__h.push(function(){u.componentDidUpdate(f,v,x)})}if(u.context=S,u.props=m,u.__P=e,u.__e=!1,I=P.__r,V=0,b){for(u.state=u.__s,u.__d=!1,I&&I(t),p=u.render(u.props,u.state,u.context),q=0;q<u._sb.length;q++)u.__h.push(u._sb[q]);u._sb=[]}else do u.__d=!1,I&&I(t),p=u.render(u.props,u.state,u.context),u.state=u.__s;while(u.__d&&++V<25);u.state=u.__s,u.getChildContext!=null&&(r=Le(Le({},r),u.getChildContext())),b&&!h&&u.getSnapshotBeforeUpdate!=null&&(x=u.getSnapshotBeforeUpdate(f,v)),O=p,p!=null&&p.type===Y&&p.key==null&&(O=Fa(p.props.children)),l=Aa(e,Bt(O)?O:[O],t,n,r,o,i,s,l,c,d),u.base=t.__e,t.__u&=-161,u.__h.length&&s.push(u),y&&(u.__E=u.__=null)}catch($){if(t.__v=null,c||i!=null)if($.then){for(t.__u|=c?160:128;l&&l.nodeType==8&&l.nextSibling;)l=l.nextSibling;i[i.indexOf(l)]=null,t.__e=l}else for(B=i.length;B--;)Pr(i[B]);else t.__e=n.__e,t.__k=n.__k;P.__e($,t,n)}else i==null&&t.__v==n.__v?(t.__k=n.__k,t.__e=n.__e):l=t.__e=ms(n.__e,t,n,r,o,i,s,c,d);return(p=P.diffed)&&p(t),128&t.__u?void 0:l}function Ma(e,t,n){for(var r=0;r<n.length;r++)Lr(n[r],n[++r],n[++r]);P.__c&&P.__c(t,e),e.some(function(o){try{e=o.__h,o.__h=[],e.some(function(i){i.call(o)})}catch(i){P.__e(i,o.__v)}})}function Fa(e){return typeof e!="object"||e==null?e:Bt(e)?e.map(Fa):Le({},e)}function ms(e,t,n,r,o,i,s,l,c){var d,p,u,h,f,v,x,y=n.props,m=t.props,b=t.type;if(b=="svg"?o="http://www.w3.org/2000/svg":b=="math"?o="http://www.w3.org/1998/Math/MathML":o||(o="http://www.w3.org/1999/xhtml"),i!=null){for(d=0;d<i.length;d++)if((f=i[d])&&"setAttribute"in f==!!b&&(b?f.localName==b:f.nodeType==3)){e=f,i[d]=null;break}}if(e==null){if(b==null)return document.createTextNode(m);e=document.createElementNS(o,b,m.is&&m),l&&(P.__m&&P.__m(t,i),l=!1),i=null}if(b===null)y===m||l&&e.data===m||(e.data=m);else{if(i=i&&Fn.call(e.childNodes),y=n.props||Dt,!l&&i!=null)for(y={},d=0;d<e.attributes.length;d++)y[(f=e.attributes[d]).name]=f.value;for(d in y)if(f=y[d],d!="children"){if(d=="dangerouslySetInnerHTML")u=f;else if(!(d in m)){if(d=="value"&&"defaultValue"in m||d=="checked"&&"defaultChecked"in m)continue;Zt(e,d,null,f,o)}}for(d in m)f=m[d],d=="children"?h=f:d=="dangerouslySetInnerHTML"?p=f:d=="value"?v=f:d=="checked"?x=f:l&&typeof f!="function"||y[d]===f||Zt(e,d,f,y[d],o);if(p)l||u&&(p.__html===u.__html||p.__html===e.innerHTML)||(e.innerHTML=p.__html),t.__k=[];else if(u&&(e.innerHTML=""),Aa(t.type==="template"?e.content:e,Bt(h)?h:[h],t,n,r,b=="foreignObject"?"http://www.w3.org/1999/xhtml":o,i,s,i?i[0]:n.__k&&yt(n,0),l,c),i!=null)for(d=i.length;d--;)Pr(i[d]);l||(d="value",b=="progress"&&v==null?e.removeAttribute("value"):v!==void 0&&(v!==e[d]||b=="progress"&&!v||b=="option"&&v!==y[d])&&Zt(e,d,v,y[d],o),d="checked",x!==void 0&&x!==e[d]&&Zt(e,d,x,y[d],o))}return e}function Lr(e,t,n){try{if(typeof e=="function"){var r=typeof e.__u=="function";r&&e.__u(),r&&t==null||(e.__u=e(t))}else e.current=t}catch(o){P.__e(o,n)}}function Ra(e,t,n){var r,o;if(P.unmount&&P.unmount(e),(r=e.ref)&&(r.current&&r.current!==e.__e||Lr(r,null,t)),(r=e.__c)!=null){if(r.componentWillUnmount)try{r.componentWillUnmount()}catch(i){P.__e(i,t)}r.base=r.__P=null}if(r=e.__k)for(o=0;o<r.length;o++)r[o]&&Ra(r[o],t,n||typeof e.type!="function");n||Pr(e.__e),e.__c=e.__=e.__e=void 0}function gs(e,t,n){return this.constructor(e,n)}function At(e,t,n){var r,o,i,s;t==document&&(t=document.documentElement),P.__&&P.__(e,t),o=(r=!1)?null:t.__k,i=[],s=[],Or(t,e=t.__k=rt(Y,null,[e]),o||Dt,Dt,t.namespaceURI,o?null:t.firstChild?Fn.call(t.childNodes):null,i,o?o.__e:t.firstChild,r,s),Ma(i,e,s)}function $a(e){function t(n){var r,o;return this.getChildContext||(r=new Set,(o={})[t.__c]=this,this.getChildContext=function(){return o},this.componentWillUnmount=function(){r=null},this.shouldComponentUpdate=function(i){this.props.value!==i.value&&r.forEach(function(s){s.__e=!0,hr(s)})},this.sub=function(i){r.add(i);var s=i.componentWillUnmount;i.componentWillUnmount=function(){r&&r.delete(i),s&&s.call(i)}}),n.children}return t.__c="__cC"+Na++,t.__=e,t.Provider=t.__l=(t.Consumer=function(n,r){return n.children(r)}).contextType=t,t}Fn=Ea.slice,P={__e:function(e,t,n,r){for(var o,i,s;t=t.__;)if((o=t.__c)&&!o.__)try{if((i=o.constructor)&&i.getDerivedStateFromError!=null&&(o.setState(i.getDerivedStateFromError(e)),s=o.__d),o.componentDidCatch!=null&&(o.componentDidCatch(e,r||{}),s=o.__d),s)return o.__E=o}catch(l){e=l}throw e}},ka=0,_a=function(e){return e!=null&&e.constructor==null},Ne.prototype.setState=function(e,t){var n;n=this.__s!=null&&this.__s!==this.state?this.__s:this.__s=Le({},this.state),typeof e=="function"&&(e=e(Le({},n),this.props)),e&&Le(n,e),e!=null&&this.__v&&(t&&this._sb.push(t),hr(this))},Ne.prototype.forceUpdate=function(e){this.__v&&(this.__e=!0,e&&this.__h.push(e),hr(this))},Ne.prototype.render=Y,Ke=[],Ca=typeof Promise=="function"?Promise.prototype.then.bind(Promise.resolve()):setTimeout,Sa=function(e,t){return e.__v.__b-t.__v.__b},mn.__r=0,Ta=/(PointerCapture)$|Capture$/i,Dr=0,ur=go(!1),pr=go(!0),Na=0;var ot,re,Ln,vo,Pt=0,Da=[],se=P,wo=se.__b,bo=se.__r,xo=se.diffed,yo=se.__c,ko=se.unmount,_o=se.__;function Xt(e,t){se.__h&&se.__h(re,e,Pt||t),Pt=0;var n=re.__H||(re.__H={__:[],__h:[]});return e>=n.__.length&&n.__.push({}),n.__[e]}function U(e){return Pt=1,vs(Pa,e)}function vs(e,t,n){var r=Xt(ot++,2);if(r.t=e,!r.__c&&(r.__=[n?n(t):Pa(void 0,t),function(l){var c=r.__N?r.__N[0]:r.__[0],d=r.t(c,l);c!==d&&(r.__N=[d,r.__[1]],r.__c.setState({}))}],r.__c=re,!re.__f)){var o=function(l,c,d){if(!r.__c.__H)return!0;var p=r.__c.__H.__.filter(function(h){return!!h.__c});if(p.every(function(h){return!h.__N}))return!i||i.call(this,l,c,d);var u=r.__c.props!==l;return p.forEach(function(h){if(h.__N){var f=h.__[0];h.__=h.__N,h.__N=void 0,f!==h.__[0]&&(u=!0)}}),i&&i.call(this,l,c,d)||u};re.__f=!0;var i=re.shouldComponentUpdate,s=re.componentWillUpdate;re.componentWillUpdate=function(l,c,d){if(this.__e){var p=i;i=void 0,o(l,c,d),i=p}s&&s.call(this,l,c,d)},re.shouldComponentUpdate=o}return r.__N||r.__}function H(e,t){var n=Xt(ot++,3);!se.__s&&Hr(n.__H,t)&&(n.__=e,n.u=t,re.__H.__h.push(n))}function jr(e,t){var n=Xt(ot++,4);!se.__s&&Hr(n.__H,t)&&(n.__=e,n.u=t,re.__h.push(n))}function M(e){return Pt=5,Me(function(){return{current:e}},[])}function Me(e,t){var n=Xt(ot++,7);return Hr(n.__H,t)&&(n.__=e(),n.__H=t,n.__h=e),n.__}function ie(e,t){return Pt=8,Me(function(){return e},t)}function Wr(e){var t=re.context[e.__c],n=Xt(ot++,9);return n.c=e,t?(n.__==null&&(n.__=!0,t.sub(re)),t.props.value):e.__}function ws(){for(var e;e=Da.shift();)if(e.__P&&e.__H)try{e.__H.__h.forEach(dn),e.__H.__h.forEach(fr),e.__H.__h=[]}catch(t){e.__H.__h=[],se.__e(t,e.__v)}}se.__b=function(e){re=null,wo&&wo(e)},se.__=function(e,t){e&&t.__k&&t.__k.__m&&(e.__m=t.__k.__m),_o&&_o(e,t)},se.__r=function(e){bo&&bo(e),ot=0;var t=(re=e.__c).__H;t&&(Ln===re?(t.__h=[],re.__h=[],t.__.forEach(function(n){n.__N&&(n.__=n.__N),n.u=n.__N=void 0})):(t.__h.forEach(dn),t.__h.forEach(fr),t.__h=[],ot=0)),Ln=re},se.diffed=function(e){xo&&xo(e);var t=e.__c;t&&t.__H&&(t.__H.__h.length&&(Da.push(t)!==1&&vo===se.requestAnimationFrame||((vo=se.requestAnimationFrame)||bs)(ws)),t.__H.__.forEach(function(n){n.u&&(n.__H=n.u),n.u=void 0})),Ln=re=null},se.__c=function(e,t){t.some(function(n){try{n.__h.forEach(dn),n.__h=n.__h.filter(function(r){return!r.__||fr(r)})}catch(r){t.some(function(o){o.__h&&(o.__h=[])}),t=[],se.__e(r,n.__v)}}),yo&&yo(e,t)},se.unmount=function(e){ko&&ko(e);var t,n=e.__c;n&&n.__H&&(n.__H.__.forEach(function(r){try{dn(r)}catch(o){t=o}}),n.__H=void 0,t&&se.__e(t,n.__v))};var Co=typeof requestAnimationFrame=="function";function bs(e){var t,n=function(){clearTimeout(r),Co&&cancelAnimationFrame(t),setTimeout(e)},r=setTimeout(n,100);Co&&(t=requestAnimationFrame(n))}function dn(e){var t=re,n=e.__c;typeof n=="function"&&(e.__c=void 0,n()),re=t}function fr(e){var t=re;e.__c=e.__(),re=t}function Hr(e,t){return!e||e.length!==t.length||t.some(function(n,r){return n!==e[r]})}function Pa(e,t){return typeof t=="function"?t(e):t}var xs=Symbol.for("preact-signals");function Ur(){if(mt>1)mt--;else{for(var e,t=!1;It!==void 0;){var n=It;for(It=void 0,mr++;n!==void 0;){var r=n.o;if(n.o=void 0,n.f&=-3,!(8&n.f)&&La(n))try{n.c()}catch(o){t||(e=o,t=!0)}n=r}}if(mr=0,mt--,t)throw e}}var K=void 0;function Ot(e){var t=K;K=void 0;try{return e()}finally{K=t}}var It=void 0,mt=0,mr=0,vn=0;function Oa(e){if(K!==void 0){var t=e.n;if(t===void 0||t.t!==K)return t={i:0,S:e,p:K.s,n:void 0,t:K,e:void 0,x:void 0,r:t},K.s!==void 0&&(K.s.n=t),K.s=t,e.n=t,32&K.f&&e.S(t),t;if(t.i===-1)return t.i=0,t.n!==void 0&&(t.n.p=t.p,t.p!==void 0&&(t.p.n=t.n),t.p=K.s,t.n=void 0,K.s.n=t,K.s=t),t}}function be(e,t){this.v=e,this.i=0,this.n=void 0,this.t=void 0,this.W=t?.watched,this.Z=t?.unwatched,this.name=t?.name}be.prototype.brand=xs;be.prototype.h=function(){return!0};be.prototype.S=function(e){var t=this,n=this.t;n!==e&&e.e===void 0&&(e.x=n,this.t=e,n!==void 0?n.e=e:Ot(function(){var r;(r=t.W)==null||r.call(t)}))};be.prototype.U=function(e){var t=this;if(this.t!==void 0){var n=e.e,r=e.x;n!==void 0&&(n.x=r,e.e=void 0),r!==void 0&&(r.e=n,e.x=void 0),e===this.t&&(this.t=r,r===void 0&&Ot(function(){var o;(o=t.Z)==null||o.call(t)}))}};be.prototype.subscribe=function(e){var t=this;return Rn(function(){var n=t.value,r=K;K=void 0;try{e(n)}finally{K=r}},{name:"sub"})};be.prototype.valueOf=function(){return this.value};be.prototype.toString=function(){return this.value+""};be.prototype.toJSON=function(){return this.value};be.prototype.peek=function(){var e=K;K=void 0;try{return this.value}finally{K=e}};Object.defineProperty(be.prototype,"value",{get:function(){var e=Oa(this);return e!==void 0&&(e.i=this.i),this.v},set:function(e){if(e!==this.v){if(mr>100)throw new Error("Cycle detected");this.v=e,this.i++,vn++,mt++;try{for(var t=this.t;t!==void 0;t=t.x)t.t.N()}finally{Ur()}}}});function de(e,t){return new be(e,t)}function La(e){for(var t=e.s;t!==void 0;t=t.n)if(t.S.i!==t.i||!t.S.h()||t.S.i!==t.i)return!0;return!1}function ja(e){for(var t=e.s;t!==void 0;t=t.n){var n=t.S.n;if(n!==void 0&&(t.r=n),t.S.n=t,t.i=-1,t.n===void 0){e.s=t;break}}}function Wa(e){for(var t=e.s,n=void 0;t!==void 0;){var r=t.p;t.i===-1?(t.S.U(t),r!==void 0&&(r.n=t.n),t.n!==void 0&&(t.n.p=r)):n=t,t.S.n=t.r,t.r!==void 0&&(t.r=void 0),t=r}e.s=n}function st(e,t){be.call(this,void 0),this.x=e,this.s=void 0,this.g=vn-1,this.f=4,this.W=t?.watched,this.Z=t?.unwatched,this.name=t?.name}st.prototype=new be;st.prototype.h=function(){if(this.f&=-3,1&this.f)return!1;if((36&this.f)==32||(this.f&=-5,this.g===vn))return!0;if(this.g=vn,this.f|=1,this.i>0&&!La(this))return this.f&=-2,!0;var e=K;try{ja(this),K=this;var t=this.x();(16&this.f||this.v!==t||this.i===0)&&(this.v=t,this.f&=-17,this.i++)}catch(n){this.v=n,this.f|=16,this.i++}return K=e,Wa(this),this.f&=-2,!0};st.prototype.S=function(e){if(this.t===void 0){this.f|=36;for(var t=this.s;t!==void 0;t=t.n)t.S.S(t)}be.prototype.S.call(this,e)};st.prototype.U=function(e){if(this.t!==void 0&&(be.prototype.U.call(this,e),this.t===void 0)){this.f&=-33;for(var t=this.s;t!==void 0;t=t.n)t.S.U(t)}};st.prototype.N=function(){if(!(2&this.f)){this.f|=6;for(var e=this.t;e!==void 0;e=e.x)e.t.N()}};Object.defineProperty(st.prototype,"value",{get:function(){if(1&this.f)throw new Error("Cycle detected");var e=Oa(this);if(this.h(),e!==void 0&&(e.i=this.i),16&this.f)throw this.v;return this.v}});function lt(e,t){return new st(e,t)}function Ha(e){var t=e.u;if(e.u=void 0,typeof t=="function"){mt++;var n=K;K=void 0;try{t()}catch(r){throw e.f&=-2,e.f|=8,Vr(e),r}finally{K=n,Ur()}}}function Vr(e){for(var t=e.s;t!==void 0;t=t.n)t.S.U(t);e.x=void 0,e.s=void 0,Ha(e)}function ys(e){if(K!==this)throw new Error("Out-of-order effect");Wa(this),K=e,this.f&=-2,8&this.f&&Vr(this),Ur()}function kt(e,t){this.x=e,this.u=void 0,this.s=void 0,this.o=void 0,this.f=32,this.name=t?.name}kt.prototype.c=function(){var e=this.S();try{if(8&this.f||this.x===void 0)return;var t=this.x();typeof t=="function"&&(this.u=t)}finally{e()}};kt.prototype.S=function(){if(1&this.f)throw new Error("Cycle detected");this.f|=1,this.f&=-9,Ha(this),ja(this),mt++;var e=K;return K=this,ys.bind(this,e)};kt.prototype.N=function(){2&this.f||(this.f|=2,this.o=It,It=this)};kt.prototype.d=function(){this.f|=8,1&this.f||Vr(this)};kt.prototype.dispose=function(){this.d()};function Rn(e,t){var n=new kt(e,t);try{n.c()}catch(o){throw n.d(),o}var r=n.d.bind(n);return r[Symbol.dispose]=r,r}var jn;function _t(e,t){P[e]=t.bind(null,P[e]||function(){})}function wn(e){jn&&jn(),jn=e&&e.S()}function Ua(e){var t=this,n=e.data,r=_s(n);r.value=n;var o=Me(function(){for(var i=t.__v;i=i.__;)if(i.__c){i.__c.__$f|=4;break}return t.__$u.c=function(){var s,l=t.__$u.S(),c=o.value;l(),_a(c)||((s=t.base)==null?void 0:s.nodeType)!==3?(t.__$f|=1,t.setState({})):t.base.data=c},lt(function(){var s=r.value.value;return s===0?0:s===!0?"":s||""})},[]);return o.value}Ua.displayName="_st";Object.defineProperties(be.prototype,{constructor:{configurable:!0,value:void 0},type:{configurable:!0,value:Ua},props:{configurable:!0,get:function(){return{data:this}}},__b:{configurable:!0,value:1}});_t("__b",function(e,t){if(typeof t.type=="string"){var n,r=t.props;for(var o in r)if(o!=="children"){var i=r[o];i instanceof be&&(n||(t.__np=n={}),n[o]=i,r[o]=i.peek())}}e(t)});_t("__r",function(e,t){wn();var n,r=t.__c;r&&(r.__$f&=-2,(n=r.__$u)===void 0&&(r.__$u=n=(function(o){var i;return Rn(function(){i=this}),i.c=function(){r.__$f|=1,r.setState({})},i})())),wn(n),e(t)});_t("__e",function(e,t,n,r){wn(),e(t,n,r)});_t("diffed",function(e,t){wn();var n;if(typeof t.type=="string"&&(n=t.__e)){var r=t.__np,o=t.props;if(r){var i=n.U;if(i)for(var s in i){var l=i[s];l!==void 0&&!(s in r)&&(l.d(),i[s]=void 0)}else n.U=i={};for(var c in r){var d=i[c],p=r[c];d===void 0?(d=ks(n,c,p,o),i[c]=d):d.o(p,o)}}}e(t)});function ks(e,t,n,r){var o=t in e&&e.ownerSVGElement===void 0,i=de(n);return{o:function(s,l){i.value=s,r=l},d:Rn(function(){var s=i.value.value;r[t]!==s&&(r[t]=s,o?e[t]=s:s?e.setAttribute(t,s):e.removeAttribute(t))})}}_t("unmount",function(e,t){if(typeof t.type=="string"){var n=t.__e;if(n){var r=n.U;if(r){n.U=void 0;for(var o in r){var i=r[o];i&&i.d()}}}}else{var s=t.__c;if(s){var l=s.__$u;l&&(s.__$u=void 0,l.d())}}e(t)});_t("__h",function(e,t,n,r){(r<3||r===9)&&(t.__$f|=2),e(t,n,r)});Ne.prototype.shouldComponentUpdate=function(e,t){var n=this.__$u,r=n&&n.s!==void 0;for(var o in t)return!0;if(this.__f||typeof this.u=="boolean"&&this.u===!0){if(!(r||2&this.__$f||4&this.__$f)||1&this.__$f)return!0}else if(!(r||4&this.__$f)||3&this.__$f)return!0;for(var i in e)if(i!=="__source"&&e[i]!==this.props[i])return!0;for(var s in this.props)if(!(s in e))return!0;return!1};function _s(e){return Me(function(){return de(e)},[])}function Lt(e){var t=M(e);t.current=e,H(function(){return Rn(function(){return t.current()})},[])}function Va(e,t){for(var n in t)e[n]=t[n];return e}function gr(e,t){for(var n in e)if(n!=="__source"&&!(n in t))return!0;for(var r in t)if(r!=="__source"&&e[r]!==t[r])return!0;return!1}function Cs(e,t){var n=t(),r=U({t:{__:n,u:t}}),o=r[0].t,i=r[1];return jr(function(){o.__=n,o.u=t,Wn(o)&&i({t:o})},[e,n,t]),H(function(){return Wn(o)&&i({t:o}),e(function(){Wn(o)&&i({t:o})})},[e]),n}function Wn(e){var t,n,r=e.u,o=e.__;try{var i=r();return!((t=o)===(n=i)&&(t!==0||1/t==1/n)||t!=t&&n!=n)}catch{return!0}}function So(e,t){this.props=e,this.context=t}function $n(e,t){function n(o){var i=this.props.ref,s=i==o.ref;return!s&&i&&(i.call?i(null):i.current=null),t?!t(this.props,o)||!s:gr(this.props,o)}function r(o){return this.shouldComponentUpdate=n,rt(e,o)}return r.displayName="Memo("+(e.displayName||e.name)+")",r.prototype.isReactComponent=!0,r.__f=!0,r}(So.prototype=new Ne).isPureReactComponent=!0,So.prototype.shouldComponentUpdate=function(e,t){return gr(this.props,e)||gr(this.state,t)};var To=P.__b;P.__b=function(e){e.type&&e.type.__f&&e.ref&&(e.props.ref=e.ref,e.ref=null),To&&To(e)};var Ss=typeof Symbol<"u"&&Symbol.for&&Symbol.for("react.forward_ref")||3911;function Yr(e){function t(n){var r=Va({},n);return delete r.ref,e(r,n.ref||null)}return t.$$typeof=Ss,t.render=t,t.prototype.isReactComponent=t.__f=!0,t.displayName="ForwardRef("+(e.displayName||e.name)+")",t}var Ts=P.__e;P.__e=function(e,t,n,r){if(e.then){for(var o,i=t;i=i.__;)if((o=i.__c)&&o.__c)return t.__e==null&&(t.__e=n.__e,t.__k=n.__k),o.__c(e,t)}Ts(e,t,n,r)};var No=P.unmount;function Ya(e,t,n){return e&&(e.__c&&e.__c.__H&&(e.__c.__H.__.forEach(function(r){typeof r.__c=="function"&&r.__c()}),e.__c.__H=null),(e=Va({},e)).__c!=null&&(e.__c.__P===n&&(e.__c.__P=t),e.__c=null),e.__k=e.__k&&e.__k.map(function(r){return Ya(r,t,n)})),e}function Ba(e,t,n){return e&&n&&(e.__v=null,e.__k=e.__k&&e.__k.map(function(r){return Ba(r,t,n)}),e.__c&&e.__c.__P===t&&(e.__e&&n.appendChild(e.__e),e.__c.__e=!0,e.__c.__P=n)),e}function Hn(){this.__u=0,this.o=null,this.__b=null}function Xa(e){var t=e.__.__c;return t&&t.__a&&t.__a(e)}function Qt(){this.i=null,this.l=null}P.unmount=function(e){var t=e.__c;t&&t.__R&&t.__R(),t&&32&e.__u&&(e.type=null),No&&No(e)},(Hn.prototype=new Ne).__c=function(e,t){var n=t.__c,r=this;r.o==null&&(r.o=[]),r.o.push(n);var o=Xa(r.__v),i=!1,s=function(){i||(i=!0,n.__R=null,o?o(l):l())};n.__R=s;var l=function(){if(!--r.__u){if(r.state.__a){var c=r.state.__a;r.__v.__k[0]=Ba(c,c.__c.__P,c.__c.__O)}var d;for(r.setState({__a:r.__b=null});d=r.o.pop();)d.forceUpdate()}};r.__u++||32&t.__u||r.setState({__a:r.__b=r.__v.__k[0]}),e.then(s,s)},Hn.prototype.componentWillUnmount=function(){this.o=[]},Hn.prototype.render=function(e,t){if(this.__b){if(this.__v.__k){var n=document.createElement("div"),r=this.__v.__k[0].__c;this.__v.__k[0]=Ya(this.__b,n,r.__O=r.__P)}this.__b=null}var o=t.__a&&rt(Y,null,e.fallback);return o&&(o.__u&=-33),[rt(Y,null,t.__a?null:e.children),o]};var Eo=function(e,t,n){if(++n[1]===n[0]&&e.l.delete(t),e.props.revealOrder&&(e.props.revealOrder[0]!=="t"||!e.l.size))for(n=e.i;n;){for(;n.length>3;)n.pop()();if(n[1]<n[0])break;e.i=n=n[2]}};function Ns(e){return this.getChildContext=function(){return e.context},e.children}function Es(e){var t=this,n=e.h;t.componentWillUnmount=function(){At(null,t.v),t.v=null,t.h=null},t.h&&t.h!==n&&t.componentWillUnmount(),t.v||(t.h=n,t.v={nodeType:1,parentNode:n,childNodes:[],contains:function(){return!0},appendChild:function(r){this.childNodes.push(r),t.h.appendChild(r)},insertBefore:function(r,o){this.childNodes.push(r),t.h.insertBefore(r,o)},removeChild:function(r){this.childNodes.splice(this.childNodes.indexOf(r)>>>1,1),t.h.removeChild(r)}}),At(rt(Ns,{context:t.context},e.__v),t.v)}function zs(e,t){var n=rt(Es,{__v:e,h:t});return n.containerInfo=t,n}(Qt.prototype=new Ne).__a=function(e){var t=this,n=Xa(t.__v),r=t.l.get(e);return r[0]++,function(o){var i=function(){t.props.revealOrder?(r.push(o),Eo(t,e,r)):o()};n?n(i):i()}},Qt.prototype.render=function(e){this.i=null,this.l=new Map;var t=gn(e.children);e.revealOrder&&e.revealOrder[0]==="b"&&t.reverse();for(var n=t.length;n--;)this.l.set(t[n],this.i=[1,0,this.i]);return e.children},Qt.prototype.componentDidUpdate=Qt.prototype.componentDidMount=function(){var e=this;this.l.forEach(function(t,n){Eo(e,n,t)})};var As=typeof Symbol<"u"&&Symbol.for&&Symbol.for("react.element")||60103,Is=/^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/,Ms=/^on(Ani|Tra|Tou|BeforeInp|Compo)/,Fs=/[A-Z0-9]/g,Rs=typeof document<"u",$s=function(e){return(typeof Symbol<"u"&&typeof Symbol()=="symbol"?/fil|che|rad/:/fil|che|ra/).test(e)};Ne.prototype.isReactComponent={},["componentWillMount","componentWillReceiveProps","componentWillUpdate"].forEach(function(e){Object.defineProperty(Ne.prototype,e,{configurable:!0,get:function(){return this["UNSAFE_"+e]},set:function(t){Object.defineProperty(this,e,{configurable:!0,writable:!0,value:t})}})});var zo=P.event;function Ds(){}function Ps(){return this.cancelBubble}function Os(){return this.defaultPrevented}P.event=function(e){return zo&&(e=zo(e)),e.persist=Ds,e.isPropagationStopped=Ps,e.isDefaultPrevented=Os,e.nativeEvent=e};var Ls={enumerable:!1,configurable:!0,get:function(){return this.class}},Ao=P.vnode;P.vnode=function(e){typeof e.type=="string"&&(function(t){var n=t.props,r=t.type,o={},i=r.indexOf("-")===-1;for(var s in n){var l=n[s];if(!(s==="value"&&"defaultValue"in n&&l==null||Rs&&s==="children"&&r==="noscript"||s==="class"||s==="className")){var c=s.toLowerCase();s==="defaultValue"&&"value"in n&&n.value==null?s="value":s==="download"&&l===!0?l="":c==="translate"&&l==="no"?l=!1:c[0]==="o"&&c[1]==="n"?c==="ondoubleclick"?s="ondblclick":c!=="onchange"||r!=="input"&&r!=="textarea"||$s(n.type)?c==="onfocus"?s="onfocusin":c==="onblur"?s="onfocusout":Ms.test(s)&&(s=c):c=s="oninput":i&&Is.test(s)?s=s.replace(Fs,"-$&").toLowerCase():l===null&&(l=void 0),c==="oninput"&&o[s=c]&&(s="oninputCapture"),o[s]=l}}r=="select"&&o.multiple&&Array.isArray(o.value)&&(o.value=gn(n.children).forEach(function(d){d.props.selected=o.value.indexOf(d.props.value)!=-1})),r=="select"&&o.defaultValue!=null&&(o.value=gn(n.children).forEach(function(d){d.props.selected=o.multiple?o.defaultValue.indexOf(d.props.value)!=-1:o.defaultValue==d.props.value})),n.class&&!n.className?(o.class=n.class,Object.defineProperty(o,"className",Ls)):(n.className&&!n.class||n.class&&n.className)&&(o.class=o.className=n.className),t.props=o})(e),e.$$typeof=As,Ao&&Ao(e)};var Io=P.__r;P.__r=function(e){Io&&Io(e),e.__c};var Mo=P.diffed;P.diffed=function(e){Mo&&Mo(e);var t=e.props,n=e.__e;n!=null&&e.type==="textarea"&&"value"in t&&t.value!==n.value&&(n.value=t.value==null?"":t.value)};var js=0;function a(e,t,n,r,o,i){t||(t={});var s,l,c=t;if("ref"in c)for(l in c={},t)l=="ref"?s=t[l]:c[l]=t[l];var d={type:e,props:c,key:n,ref:s,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:--js,__i:-1,__u:0,__source:o,__self:i};if(typeof e=="function"&&(s=e.defaultProps))for(l in s)c[l]===void 0&&(c[l]=s[l]);return P.vnode&&P.vnode(d),d}Array.prototype.toSorted||Object.defineProperty(Array.prototype,"toSorted",{value:function(e){return[...this].sort(e)},writable:!0,configurable:!0});function Ws(e,t){return t-e}function Hs(e){let t=e[0].name;const n=e.length,r=Math.min(4,n);for(let o=1;o<r;o++)t+=`, ${e[o].name}`;return t}function Us(e){let t=e[0].time;for(let n=1,r=e.length;n<r;n++)t+=e[n].time;return t}function Vs(e){for(let t=0,n=e.length;t<n;t++)if(e[t].forget)return!0;return!1}var Ys=e=>{let t="";const n=new Map;for(const s of e){const{forget:l,time:c,aggregatedCount:d,name:p}=s;n.has(d)||n.set(d,[]);const u=n.get(d);u&&u.push({name:p,forget:l,time:c??0})}const r=Array.from(n.keys()).sort(Ws),o=[];let i=0;for(const s of r){const l=n.get(s);if(!l)continue;let c=Hs(l);const d=Us(l),p=Vs(l);i+=d,l.length>4&&(c+="…"),s>1&&(c+=` × ${s}`),p&&(c=`✨${c}`),o.push(c)}return t=o.join(", "),t.length?(t.length>40&&(t=`${t.slice(0,40)}…`),i>=.01&&(t+=` (${Number(i.toFixed(2))}ms)`),t):null};function Xe(e,t){return e===t||e!==e&&t!==t}var Br=e=>{const t=e.createOscillator(),n=e.createGain();t.connect(n),n.connect(e.destination);const r={type:"sine",freq:[392,600],duration:.3,gain:.12},o=r.freq,i=r.duration/o.length;o.forEach((s,l)=>{t.frequency.setValueAtTime(s,e.currentTime+l*i)}),t.type=r.type,n.gain.setValueAtTime(r.gain,e.currentTime),n.gain.setTargetAtTime(0,e.currentTime+r.duration*.7,.05),t.start(),t.stop(e.currentTime+r.duration)},Bs=e=>new Promise(t=>{const n=new Map,r=new IntersectionObserver(o=>{for(const i of o){const s=i.target,l=i.boundingClientRect;n.set(s,l)}r.disconnect(),t(n)});for(const o of e)r.observe(o)}),Xs={mount:1,update:2,unmount:4},oe=Yr(({size:e=15,name:t,fill:n="currentColor",stroke:r="currentColor",className:o,externalURL:i="",style:s},l)=>{const c=Array.isArray(e)?e[0]:e,d=Array.isArray(e)?e[1]||e[0]:e,p=`${i}#${t}`;return a("svg",{ref:l,width:`${c}px`,height:`${d}px`,fill:n,stroke:r,className:o,style:{...s,minWidth:`${c}px`,maxWidth:`${c}px`,minHeight:`${d}px`,maxHeight:`${d}px`},children:[a("title",{children:t}),a("use",{href:p})]})}),D=24,ce={width:550,height:350,initialHeight:400},Ae=240,je="react-scan-widget-settings-v2",un="react-scan-widget-collapsed-v1",ct="react-scan-widget-last-view-v1",De=typeof window<"u";function qa(e){var t,n,r="";if(typeof e=="string"||typeof e=="number")r+=e;else if(typeof e=="object")if(Array.isArray(e)){var o=e.length;for(t=0;t<o;t++)e[t]&&(n=qa(e[t]))&&(r&&(r+=" "),r+=n)}else for(n in e)e[n]&&(r&&(r+=" "),r+=n);return r}function qs(){for(var e,t,n=0,r="",o=arguments.length;n<o;n++)(e=arguments[n])&&(t=qa(e))&&(r&&(r+=" "),r+=t);return r}var Xr="-",Gs=e=>{const t=Ks(e),{conflictingClassGroups:n,conflictingClassGroupModifiers:r}=e;return{getClassGroupId:s=>{const l=s.split(Xr);return l[0]===""&&l.length!==1&&l.shift(),Ga(l,t)||Js(s)},getConflictingClassGroupIds:(s,l)=>{const c=n[s]||[];return l&&r[s]?[...c,...r[s]]:c}}},Ga=(e,t)=>{if(e.length===0)return t.classGroupId;const n=e[0],r=t.nextPart.get(n),o=r?Ga(e.slice(1),r):void 0;if(o)return o;if(t.validators.length===0)return;const i=e.join(Xr);return t.validators.find(({validator:s})=>s(i))?.classGroupId},Fo=/^\[(.+)\]$/,Js=e=>{if(Fo.test(e)){const t=Fo.exec(e)[1],n=t?.substring(0,t.indexOf(":"));if(n)return"arbitrary.."+n}},Ks=e=>{const{theme:t,prefix:n}=e,r={nextPart:new Map,validators:[]};return Qs(Object.entries(e.classGroups),n).forEach(([i,s])=>{vr(s,r,i,t)}),r},vr=(e,t,n,r)=>{e.forEach(o=>{if(typeof o=="string"){const i=o===""?t:Ro(t,o);i.classGroupId=n;return}if(typeof o=="function"){if(Zs(o)){vr(o(r),t,n,r);return}t.validators.push({validator:o,classGroupId:n});return}Object.entries(o).forEach(([i,s])=>{vr(s,Ro(t,i),n,r)})})},Ro=(e,t)=>{let n=e;return t.split(Xr).forEach(r=>{n.nextPart.has(r)||n.nextPart.set(r,{nextPart:new Map,validators:[]}),n=n.nextPart.get(r)}),n},Zs=e=>e.isThemeGetter,Qs=(e,t)=>t?e.map(([n,r])=>{const o=r.map(i=>typeof i=="string"?t+i:typeof i=="object"?Object.fromEntries(Object.entries(i).map(([s,l])=>[t+s,l])):i);return[n,o]}):e,el=e=>{if(e<1)return{get:()=>{},set:()=>{}};let t=0,n=new Map,r=new Map;const o=(i,s)=>{n.set(i,s),t++,t>e&&(t=0,r=n,n=new Map)};return{get(i){let s=n.get(i);if(s!==void 0)return s;if((s=r.get(i))!==void 0)return o(i,s),s},set(i,s){n.has(i)?n.set(i,s):o(i,s)}}},Ja="!",tl=e=>{const{separator:t,experimentalParseClassName:n}=e,r=t.length===1,o=t[0],i=t.length,s=l=>{const c=[];let d=0,p=0,u;for(let y=0;y<l.length;y++){let m=l[y];if(d===0){if(m===o&&(r||l.slice(y,y+i)===t)){c.push(l.slice(p,y)),p=y+i;continue}if(m==="/"){u=y;continue}}m==="["?d++:m==="]"&&d--}const h=c.length===0?l:l.substring(p),f=h.startsWith(Ja),v=f?h.substring(1):h,x=u&&u>p?u-p:void 0;return{modifiers:c,hasImportantModifier:f,baseClassName:v,maybePostfixModifierPosition:x}};return n?l=>n({className:l,parseClassName:s}):s},nl=e=>{if(e.length<=1)return e;const t=[];let n=[];return e.forEach(r=>{r[0]==="["?(t.push(...n.sort(),r),n=[]):n.push(r)}),t.push(...n.sort()),t},rl=e=>({cache:el(e.cacheSize),parseClassName:tl(e),...Gs(e)}),ol=/\s+/,al=(e,t)=>{const{parseClassName:n,getClassGroupId:r,getConflictingClassGroupIds:o}=t,i=[],s=e.trim().split(ol);let l="";for(let c=s.length-1;c>=0;c-=1){const d=s[c],{modifiers:p,hasImportantModifier:u,baseClassName:h,maybePostfixModifierPosition:f}=n(d);let v=!!f,x=r(v?h.substring(0,f):h);if(!x){if(!v){l=d+(l.length>0?" "+l:l);continue}if(x=r(h),!x){l=d+(l.length>0?" "+l:l);continue}v=!1}const y=nl(p).join(":"),m=u?y+Ja:y,b=m+x;if(i.includes(b))continue;i.push(b);const C=o(x,v);for(let S=0;S<C.length;++S){const T=C[S];i.push(m+T)}l=d+(l.length>0?" "+l:l)}return l};function il(){let e=0,t,n,r="";for(;e<arguments.length;)(t=arguments[e++])&&(n=Ka(t))&&(r&&(r+=" "),r+=n);return r}var Ka=e=>{if(typeof e=="string")return e;let t,n="";for(let r=0;r<e.length;r++)e[r]&&(t=Ka(e[r]))&&(n&&(n+=" "),n+=t);return n};function sl(e,...t){let n,r,o,i=s;function s(c){const d=t.reduce((p,u)=>u(p),e());return n=rl(d),r=n.cache.get,o=n.cache.set,i=l,l(c)}function l(c){const d=r(c);if(d)return d;const p=al(c,n);return o(c,p),p}return function(){return i(il.apply(null,arguments))}}var te=e=>{const t=n=>n[e]||[];return t.isThemeGetter=!0,t},Za=/^\[(?:([a-z-]+):)?(.+)\]$/i,ll=/^\d+\/\d+$/,cl=new Set(["px","full","screen"]),dl=/^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/,ul=/\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/,pl=/^(rgba?|hsla?|hwb|(ok)?(lab|lch))\(.+\)$/,hl=/^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/,fl=/^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/,Pe=e=>gt(e)||cl.has(e)||ll.test(e),He=e=>Ct(e,"length",kl),gt=e=>!!e&&!Number.isNaN(Number(e)),Un=e=>Ct(e,"number",gt),St=e=>!!e&&Number.isInteger(Number(e)),ml=e=>e.endsWith("%")&&gt(e.slice(0,-1)),W=e=>Za.test(e),Ue=e=>dl.test(e),gl=new Set(["length","size","percentage"]),vl=e=>Ct(e,gl,Qa),wl=e=>Ct(e,"position",Qa),bl=new Set(["image","url"]),xl=e=>Ct(e,bl,Cl),yl=e=>Ct(e,"",_l),Tt=()=>!0,Ct=(e,t,n)=>{const r=Za.exec(e);return r?r[1]?typeof t=="string"?r[1]===t:t.has(r[1]):n(r[2]):!1},kl=e=>ul.test(e)&&!pl.test(e),Qa=()=>!1,_l=e=>hl.test(e),Cl=e=>fl.test(e),Sl=()=>{const e=te("colors"),t=te("spacing"),n=te("blur"),r=te("brightness"),o=te("borderColor"),i=te("borderRadius"),s=te("borderSpacing"),l=te("borderWidth"),c=te("contrast"),d=te("grayscale"),p=te("hueRotate"),u=te("invert"),h=te("gap"),f=te("gradientColorStops"),v=te("gradientColorStopPositions"),x=te("inset"),y=te("margin"),m=te("opacity"),b=te("padding"),C=te("saturate"),S=te("scale"),T=te("sepia"),I=te("skew"),V=te("space"),q=te("translate"),O=()=>["auto","contain","none"],B=()=>["auto","hidden","clip","visible","scroll"],L=()=>["auto",W,t],$=()=>[W,t],le=()=>["",Pe,He],ue=()=>["auto",gt,W],me=()=>["bottom","center","left","left-bottom","left-top","right","right-bottom","right-top","top"],g=()=>["solid","dashed","dotted","double","none"],k=()=>["normal","multiply","screen","overlay","darken","lighten","color-dodge","color-burn","hard-light","soft-light","difference","exclusion","hue","saturation","color","luminosity"],_=()=>["start","end","center","between","around","evenly","stretch"],N=()=>["","0",W],A=()=>["auto","avoid","all","avoid-page","page","left","right","column"],F=()=>[gt,W];return{cacheSize:500,separator:":",theme:{colors:[Tt],spacing:[Pe,He],blur:["none","",Ue,W],brightness:F(),borderColor:[e],borderRadius:["none","","full",Ue,W],borderSpacing:$(),borderWidth:le(),contrast:F(),grayscale:N(),hueRotate:F(),invert:N(),gap:$(),gradientColorStops:[e],gradientColorStopPositions:[ml,He],inset:L(),margin:L(),opacity:F(),padding:$(),saturate:F(),scale:F(),sepia:N(),skew:F(),space:$(),translate:$()},classGroups:{aspect:[{aspect:["auto","square","video",W]}],container:["container"],columns:[{columns:[Ue]}],"break-after":[{"break-after":A()}],"break-before":[{"break-before":A()}],"break-inside":[{"break-inside":["auto","avoid","avoid-page","avoid-column"]}],"box-decoration":[{"box-decoration":["slice","clone"]}],box:[{box:["border","content"]}],display:["block","inline-block","inline","flex","inline-flex","table","inline-table","table-caption","table-cell","table-column","table-column-group","table-footer-group","table-header-group","table-row-group","table-row","flow-root","grid","inline-grid","contents","list-item","hidden"],float:[{float:["right","left","none","start","end"]}],clear:[{clear:["left","right","both","none","start","end"]}],isolation:["isolate","isolation-auto"],"object-fit":[{object:["contain","cover","fill","none","scale-down"]}],"object-position":[{object:[...me(),W]}],overflow:[{overflow:B()}],"overflow-x":[{"overflow-x":B()}],"overflow-y":[{"overflow-y":B()}],overscroll:[{overscroll:O()}],"overscroll-x":[{"overscroll-x":O()}],"overscroll-y":[{"overscroll-y":O()}],position:["static","fixed","absolute","relative","sticky"],inset:[{inset:[x]}],"inset-x":[{"inset-x":[x]}],"inset-y":[{"inset-y":[x]}],start:[{start:[x]}],end:[{end:[x]}],top:[{top:[x]}],right:[{right:[x]}],bottom:[{bottom:[x]}],left:[{left:[x]}],visibility:["visible","invisible","collapse"],z:[{z:["auto",St,W]}],basis:[{basis:L()}],"flex-direction":[{flex:["row","row-reverse","col","col-reverse"]}],"flex-wrap":[{flex:["wrap","wrap-reverse","nowrap"]}],flex:[{flex:["1","auto","initial","none",W]}],grow:[{grow:N()}],shrink:[{shrink:N()}],order:[{order:["first","last","none",St,W]}],"grid-cols":[{"grid-cols":[Tt]}],"col-start-end":[{col:["auto",{span:["full",St,W]},W]}],"col-start":[{"col-start":ue()}],"col-end":[{"col-end":ue()}],"grid-rows":[{"grid-rows":[Tt]}],"row-start-end":[{row:["auto",{span:[St,W]},W]}],"row-start":[{"row-start":ue()}],"row-end":[{"row-end":ue()}],"grid-flow":[{"grid-flow":["row","col","dense","row-dense","col-dense"]}],"auto-cols":[{"auto-cols":["auto","min","max","fr",W]}],"auto-rows":[{"auto-rows":["auto","min","max","fr",W]}],gap:[{gap:[h]}],"gap-x":[{"gap-x":[h]}],"gap-y":[{"gap-y":[h]}],"justify-content":[{justify:["normal",..._()]}],"justify-items":[{"justify-items":["start","end","center","stretch"]}],"justify-self":[{"justify-self":["auto","start","end","center","stretch"]}],"align-content":[{content:["normal",..._(),"baseline"]}],"align-items":[{items:["start","end","center","baseline","stretch"]}],"align-self":[{self:["auto","start","end","center","stretch","baseline"]}],"place-content":[{"place-content":[..._(),"baseline"]}],"place-items":[{"place-items":["start","end","center","baseline","stretch"]}],"place-self":[{"place-self":["auto","start","end","center","stretch"]}],p:[{p:[b]}],px:[{px:[b]}],py:[{py:[b]}],ps:[{ps:[b]}],pe:[{pe:[b]}],pt:[{pt:[b]}],pr:[{pr:[b]}],pb:[{pb:[b]}],pl:[{pl:[b]}],m:[{m:[y]}],mx:[{mx:[y]}],my:[{my:[y]}],ms:[{ms:[y]}],me:[{me:[y]}],mt:[{mt:[y]}],mr:[{mr:[y]}],mb:[{mb:[y]}],ml:[{ml:[y]}],"space-x":[{"space-x":[V]}],"space-x-reverse":["space-x-reverse"],"space-y":[{"space-y":[V]}],"space-y-reverse":["space-y-reverse"],w:[{w:["auto","min","max","fit","svw","lvw","dvw",W,t]}],"min-w":[{"min-w":[W,t,"min","max","fit"]}],"max-w":[{"max-w":[W,t,"none","full","min","max","fit","prose",{screen:[Ue]},Ue]}],h:[{h:[W,t,"auto","min","max","fit","svh","lvh","dvh"]}],"min-h":[{"min-h":[W,t,"min","max","fit","svh","lvh","dvh"]}],"max-h":[{"max-h":[W,t,"min","max","fit","svh","lvh","dvh"]}],size:[{size:[W,t,"auto","min","max","fit"]}],"font-size":[{text:["base",Ue,He]}],"font-smoothing":["antialiased","subpixel-antialiased"],"font-style":["italic","not-italic"],"font-weight":[{font:["thin","extralight","light","normal","medium","semibold","bold","extrabold","black",Un]}],"font-family":[{font:[Tt]}],"fvn-normal":["normal-nums"],"fvn-ordinal":["ordinal"],"fvn-slashed-zero":["slashed-zero"],"fvn-figure":["lining-nums","oldstyle-nums"],"fvn-spacing":["proportional-nums","tabular-nums"],"fvn-fraction":["diagonal-fractions","stacked-fractions"],tracking:[{tracking:["tighter","tight","normal","wide","wider","widest",W]}],"line-clamp":[{"line-clamp":["none",gt,Un]}],leading:[{leading:["none","tight","snug","normal","relaxed","loose",Pe,W]}],"list-image":[{"list-image":["none",W]}],"list-style-type":[{list:["none","disc","decimal",W]}],"list-style-position":[{list:["inside","outside"]}],"placeholder-color":[{placeholder:[e]}],"placeholder-opacity":[{"placeholder-opacity":[m]}],"text-alignment":[{text:["left","center","right","justify","start","end"]}],"text-color":[{text:[e]}],"text-opacity":[{"text-opacity":[m]}],"text-decoration":["underline","overline","line-through","no-underline"],"text-decoration-style":[{decoration:[...g(),"wavy"]}],"text-decoration-thickness":[{decoration:["auto","from-font",Pe,He]}],"underline-offset":[{"underline-offset":["auto",Pe,W]}],"text-decoration-color":[{decoration:[e]}],"text-transform":["uppercase","lowercase","capitalize","normal-case"],"text-overflow":["truncate","text-ellipsis","text-clip"],"text-wrap":[{text:["wrap","nowrap","balance","pretty"]}],indent:[{indent:$()}],"vertical-align":[{align:["baseline","top","middle","bottom","text-top","text-bottom","sub","super",W]}],whitespace:[{whitespace:["normal","nowrap","pre","pre-line","pre-wrap","break-spaces"]}],break:[{break:["normal","words","all","keep"]}],hyphens:[{hyphens:["none","manual","auto"]}],content:[{content:["none",W]}],"bg-attachment":[{bg:["fixed","local","scroll"]}],"bg-clip":[{"bg-clip":["border","padding","content","text"]}],"bg-opacity":[{"bg-opacity":[m]}],"bg-origin":[{"bg-origin":["border","padding","content"]}],"bg-position":[{bg:[...me(),wl]}],"bg-repeat":[{bg:["no-repeat",{repeat:["","x","y","round","space"]}]}],"bg-size":[{bg:["auto","cover","contain",vl]}],"bg-image":[{bg:["none",{"gradient-to":["t","tr","r","br","b","bl","l","tl"]},xl]}],"bg-color":[{bg:[e]}],"gradient-from-pos":[{from:[v]}],"gradient-via-pos":[{via:[v]}],"gradient-to-pos":[{to:[v]}],"gradient-from":[{from:[f]}],"gradient-via":[{via:[f]}],"gradient-to":[{to:[f]}],rounded:[{rounded:[i]}],"rounded-s":[{"rounded-s":[i]}],"rounded-e":[{"rounded-e":[i]}],"rounded-t":[{"rounded-t":[i]}],"rounded-r":[{"rounded-r":[i]}],"rounded-b":[{"rounded-b":[i]}],"rounded-l":[{"rounded-l":[i]}],"rounded-ss":[{"rounded-ss":[i]}],"rounded-se":[{"rounded-se":[i]}],"rounded-ee":[{"rounded-ee":[i]}],"rounded-es":[{"rounded-es":[i]}],"rounded-tl":[{"rounded-tl":[i]}],"rounded-tr":[{"rounded-tr":[i]}],"rounded-br":[{"rounded-br":[i]}],"rounded-bl":[{"rounded-bl":[i]}],"border-w":[{border:[l]}],"border-w-x":[{"border-x":[l]}],"border-w-y":[{"border-y":[l]}],"border-w-s":[{"border-s":[l]}],"border-w-e":[{"border-e":[l]}],"border-w-t":[{"border-t":[l]}],"border-w-r":[{"border-r":[l]}],"border-w-b":[{"border-b":[l]}],"border-w-l":[{"border-l":[l]}],"border-opacity":[{"border-opacity":[m]}],"border-style":[{border:[...g(),"hidden"]}],"divide-x":[{"divide-x":[l]}],"divide-x-reverse":["divide-x-reverse"],"divide-y":[{"divide-y":[l]}],"divide-y-reverse":["divide-y-reverse"],"divide-opacity":[{"divide-opacity":[m]}],"divide-style":[{divide:g()}],"border-color":[{border:[o]}],"border-color-x":[{"border-x":[o]}],"border-color-y":[{"border-y":[o]}],"border-color-s":[{"border-s":[o]}],"border-color-e":[{"border-e":[o]}],"border-color-t":[{"border-t":[o]}],"border-color-r":[{"border-r":[o]}],"border-color-b":[{"border-b":[o]}],"border-color-l":[{"border-l":[o]}],"divide-color":[{divide:[o]}],"outline-style":[{outline:["",...g()]}],"outline-offset":[{"outline-offset":[Pe,W]}],"outline-w":[{outline:[Pe,He]}],"outline-color":[{outline:[e]}],"ring-w":[{ring:le()}],"ring-w-inset":["ring-inset"],"ring-color":[{ring:[e]}],"ring-opacity":[{"ring-opacity":[m]}],"ring-offset-w":[{"ring-offset":[Pe,He]}],"ring-offset-color":[{"ring-offset":[e]}],shadow:[{shadow:["","inner","none",Ue,yl]}],"shadow-color":[{shadow:[Tt]}],opacity:[{opacity:[m]}],"mix-blend":[{"mix-blend":[...k(),"plus-lighter","plus-darker"]}],"bg-blend":[{"bg-blend":k()}],filter:[{filter:["","none"]}],blur:[{blur:[n]}],brightness:[{brightness:[r]}],contrast:[{contrast:[c]}],"drop-shadow":[{"drop-shadow":["","none",Ue,W]}],grayscale:[{grayscale:[d]}],"hue-rotate":[{"hue-rotate":[p]}],invert:[{invert:[u]}],saturate:[{saturate:[C]}],sepia:[{sepia:[T]}],"backdrop-filter":[{"backdrop-filter":["","none"]}],"backdrop-blur":[{"backdrop-blur":[n]}],"backdrop-brightness":[{"backdrop-brightness":[r]}],"backdrop-contrast":[{"backdrop-contrast":[c]}],"backdrop-grayscale":[{"backdrop-grayscale":[d]}],"backdrop-hue-rotate":[{"backdrop-hue-rotate":[p]}],"backdrop-invert":[{"backdrop-invert":[u]}],"backdrop-opacity":[{"backdrop-opacity":[m]}],"backdrop-saturate":[{"backdrop-saturate":[C]}],"backdrop-sepia":[{"backdrop-sepia":[T]}],"border-collapse":[{border:["collapse","separate"]}],"border-spacing":[{"border-spacing":[s]}],"border-spacing-x":[{"border-spacing-x":[s]}],"border-spacing-y":[{"border-spacing-y":[s]}],"table-layout":[{table:["auto","fixed"]}],caption:[{caption:["top","bottom"]}],transition:[{transition:["none","all","","colors","opacity","shadow","transform",W]}],duration:[{duration:F()}],ease:[{ease:["linear","in","out","in-out",W]}],delay:[{delay:F()}],animate:[{animate:["none","spin","ping","pulse","bounce",W]}],transform:[{transform:["","gpu","none"]}],scale:[{scale:[S]}],"scale-x":[{"scale-x":[S]}],"scale-y":[{"scale-y":[S]}],rotate:[{rotate:[St,W]}],"translate-x":[{"translate-x":[q]}],"translate-y":[{"translate-y":[q]}],"skew-x":[{"skew-x":[I]}],"skew-y":[{"skew-y":[I]}],"transform-origin":[{origin:["center","top","top-right","right","bottom-right","bottom","bottom-left","left","top-left",W]}],accent:[{accent:["auto",e]}],appearance:[{appearance:["none","auto"]}],cursor:[{cursor:["auto","default","pointer","wait","text","move","help","not-allowed","none","context-menu","progress","cell","crosshair","vertical-text","alias","copy","no-drop","grab","grabbing","all-scroll","col-resize","row-resize","n-resize","e-resize","s-resize","w-resize","ne-resize","nw-resize","se-resize","sw-resize","ew-resize","ns-resize","nesw-resize","nwse-resize","zoom-in","zoom-out",W]}],"caret-color":[{caret:[e]}],"pointer-events":[{"pointer-events":["none","auto"]}],resize:[{resize:["none","y","x",""]}],"scroll-behavior":[{scroll:["auto","smooth"]}],"scroll-m":[{"scroll-m":$()}],"scroll-mx":[{"scroll-mx":$()}],"scroll-my":[{"scroll-my":$()}],"scroll-ms":[{"scroll-ms":$()}],"scroll-me":[{"scroll-me":$()}],"scroll-mt":[{"scroll-mt":$()}],"scroll-mr":[{"scroll-mr":$()}],"scroll-mb":[{"scroll-mb":$()}],"scroll-ml":[{"scroll-ml":$()}],"scroll-p":[{"scroll-p":$()}],"scroll-px":[{"scroll-px":$()}],"scroll-py":[{"scroll-py":$()}],"scroll-ps":[{"scroll-ps":$()}],"scroll-pe":[{"scroll-pe":$()}],"scroll-pt":[{"scroll-pt":$()}],"scroll-pr":[{"scroll-pr":$()}],"scroll-pb":[{"scroll-pb":$()}],"scroll-pl":[{"scroll-pl":$()}],"snap-align":[{snap:["start","end","center","align-none"]}],"snap-stop":[{snap:["normal","always"]}],"snap-type":[{snap:["none","x","y","both"]}],"snap-strictness":[{snap:["mandatory","proximity"]}],touch:[{touch:["auto","none","manipulation"]}],"touch-x":[{"touch-pan":["x","left","right"]}],"touch-y":[{"touch-pan":["y","up","down"]}],"touch-pz":["touch-pinch-zoom"],select:[{select:["none","text","all","auto"]}],"will-change":[{"will-change":["auto","scroll","contents","transform",W]}],fill:[{fill:[e,"none"]}],"stroke-w":[{stroke:[Pe,He,Un]}],stroke:[{stroke:[e,"none"]}],sr:["sr-only","not-sr-only"],"forced-color-adjust":[{"forced-color-adjust":["auto","none"]}]},conflictingClassGroups:{overflow:["overflow-x","overflow-y"],overscroll:["overscroll-x","overscroll-y"],inset:["inset-x","inset-y","start","end","top","right","bottom","left"],"inset-x":["right","left"],"inset-y":["top","bottom"],flex:["basis","grow","shrink"],gap:["gap-x","gap-y"],p:["px","py","ps","pe","pt","pr","pb","pl"],px:["pr","pl"],py:["pt","pb"],m:["mx","my","ms","me","mt","mr","mb","ml"],mx:["mr","ml"],my:["mt","mb"],size:["w","h"],"font-size":["leading"],"fvn-normal":["fvn-ordinal","fvn-slashed-zero","fvn-figure","fvn-spacing","fvn-fraction"],"fvn-ordinal":["fvn-normal"],"fvn-slashed-zero":["fvn-normal"],"fvn-figure":["fvn-normal"],"fvn-spacing":["fvn-normal"],"fvn-fraction":["fvn-normal"],"line-clamp":["display","overflow"],rounded:["rounded-s","rounded-e","rounded-t","rounded-r","rounded-b","rounded-l","rounded-ss","rounded-se","rounded-ee","rounded-es","rounded-tl","rounded-tr","rounded-br","rounded-bl"],"rounded-s":["rounded-ss","rounded-es"],"rounded-e":["rounded-se","rounded-ee"],"rounded-t":["rounded-tl","rounded-tr"],"rounded-r":["rounded-tr","rounded-br"],"rounded-b":["rounded-br","rounded-bl"],"rounded-l":["rounded-tl","rounded-bl"],"border-spacing":["border-spacing-x","border-spacing-y"],"border-w":["border-w-s","border-w-e","border-w-t","border-w-r","border-w-b","border-w-l"],"border-w-x":["border-w-r","border-w-l"],"border-w-y":["border-w-t","border-w-b"],"border-color":["border-color-s","border-color-e","border-color-t","border-color-r","border-color-b","border-color-l"],"border-color-x":["border-color-r","border-color-l"],"border-color-y":["border-color-t","border-color-b"],"scroll-m":["scroll-mx","scroll-my","scroll-ms","scroll-me","scroll-mt","scroll-mr","scroll-mb","scroll-ml"],"scroll-mx":["scroll-mr","scroll-ml"],"scroll-my":["scroll-mt","scroll-mb"],"scroll-p":["scroll-px","scroll-py","scroll-ps","scroll-pe","scroll-pt","scroll-pr","scroll-pb","scroll-pl"],"scroll-px":["scroll-pr","scroll-pl"],"scroll-py":["scroll-pt","scroll-pb"],touch:["touch-x","touch-y","touch-pz"],"touch-x":["touch"],"touch-y":["touch"],"touch-pz":["touch"]},conflictingClassGroupModifiers:{"font-size":["leading"]}}},Tl=sl(Sl),w=(...e)=>Tl(qs(e));typeof navigator<"u"&&navigator.userAgent.includes("Firefox");var ei=(e,t)=>{let n=0;return r=>{const o=Date.now();if(o-n>=t)return n=o,e(r)}},We=e=>{if(!De)return null;try{const t=localStorage.getItem(e);return t?JSON.parse(t):null}catch{return null}},ke=(e,t)=>{if(De)try{window.localStorage.setItem(e,JSON.stringify(t))}catch{}},$o=e=>{if(De)try{window.localStorage.removeItem(e)}catch{}},Nl=24,El=12,jt=e=>{if(!e)return{name:"Unknown",wrappers:[],wrapperTypes:[]};const{tag:t,type:n,elementType:r}=e;let o=ge(n);const i=[],s=[];if($t(e)||t===Yt||t===Vt||n?.$$typeof===Symbol.for("react.memo")||r?.$$typeof===Symbol.for("react.memo")){const l=$t(e);s.push({type:"memo",title:l?"This component has been auto-memoized by the React Compiler.":"Memoized component that skips re-renders if props are the same",compiler:l})}if(t===Nl&&s.push({type:"lazy",title:"Lazily loaded component that supports code splitting"}),t===In&&s.push({type:"suspense",title:"Component that can suspend while content is loading"}),t===El&&s.push({type:"profiler",title:"Component that measures rendering performance"}),typeof o=="string"){const l=/^(\w+)\((.*)\)$/;let c=o;for(;l.test(c);){const d=c.match(l);if(d?.[1]&&d?.[2])i.unshift(d[1]),c=d[2];else break}o=c}return{name:o||"Unknown",wrappers:i,wrapperTypes:s}},Dn=de(!1),wr=de(null),Fe={corner:"bottom-right",dimensions:{isFullWidth:!1,isFullHeight:!1,width:ce.width,height:ce.height,position:{x:D,y:D}},lastDimensions:{isFullWidth:!1,isFullHeight:!1,width:ce.width,height:ce.height,position:{x:D,y:D}},componentsTree:{width:Ae}},zl=()=>{const e=We(je);return e?{corner:e.corner??Fe.corner,dimensions:e.dimensions??Fe.dimensions,lastDimensions:e.lastDimensions??e.dimensions??Fe.lastDimensions,componentsTree:e.componentsTree??Fe.componentsTree}:(ke(je,{corner:Fe.corner,dimensions:Fe.dimensions,lastDimensions:Fe.lastDimensions,componentsTree:Fe.componentsTree}),Fe)},z=de(zl()),Vn=()=>{if(!De)return;const{dimensions:e}=z.value,{width:t,height:n,position:r}=e;z.value={...z.value,dimensions:{isFullWidth:t>=window.innerWidth-D*2,isFullHeight:n>=window.innerHeight-D*2,width:t,height:n,position:r}}},Q=de({view:"none"}),Al=We(un),Ce=de(Al??null);function Il(){return!1}function qr(e){function t(n){return this.shouldComponentUpdate=Il,rt(e,n)}return t.displayName=`Memo(${e.displayName||e.name})`,t.prototype.isReactComponent=!0,t._forwarded=!0,t}var Ml=e=>{const{count:t,getScrollElement:n,estimateSize:r,overscan:o=5}=e,[i,s]=U(0),[l,c]=U(0),d=M(),p=M(null),u=M(null),h=r(),f=ie(m=>{if(!p.current)return;const b=m?.[0]?.contentRect.height??p.current.getBoundingClientRect().height;c(b)},[]),v=ie(()=>{u.current!==null&&cancelAnimationFrame(u.current),u.current=requestAnimationFrame(()=>{f(),u.current=null})},[f]);H(()=>{const m=n();if(!m)return;p.current=m;const b=()=>{p.current&&s(p.current.scrollTop)};f(),d.current||(d.current=new ResizeObserver(()=>{v()})),d.current.observe(m),m.addEventListener("scroll",b,{passive:!0});const C=new MutationObserver(v);return C.observe(m,{attributes:!0,childList:!0,subtree:!0}),()=>{m.removeEventListener("scroll",b),d.current&&d.current.disconnect(),C.disconnect(),u.current!==null&&cancelAnimationFrame(u.current)}},[n,f,v]);const x=Me(()=>{const m=Math.floor(i/h),b=Math.ceil(l/h);return{start:Math.max(0,m-o),end:Math.min(t,m+b+o)}},[i,h,l,t,o]);return{virtualItems:Me(()=>{const m=[];for(let b=x.start;b<x.end;b++)m.push({key:b,index:b,start:b*h});return m},[x,h]),totalSize:t*h,scrollTop:i,containerHeight:l}};We("react-scann-pinned");var Fl=e=>{const t=[];let n=e;for(;n;){const r=n.elementType,o=typeof r=="function"?r.displayName||r.name:typeof r=="string"?r:"Unknown",i=n.index!==void 0?`[${n.index}]`:"";t.unshift(`${o}${i}`),n=n.return??null}return t.join("::")},qe=new WeakMap,Rl=(e,t)=>{const n=t.bind(null,e);return document.addEventListener("scroll",n,{passive:!0,capture:!0}),()=>{document.removeEventListener("scroll",n,{capture:!0})}},$l={activeFlashes:new Map,create(e){const t=e.querySelector(".react-scan-flash-overlay"),n=t instanceof HTMLElement?t:(()=>{const o=document.createElement("div");o.className="react-scan-flash-overlay",e.appendChild(o);const i=Rl(e,()=>{e.querySelector(".react-scan-flash-overlay")&&this.create(e)});return this.activeFlashes.set(e,{element:e,overlay:o,scrollCleanup:i}),o})(),r=qe.get(n);r&&(clearTimeout(r),qe.delete(n)),requestAnimationFrame(()=>{n.style.transition="none",n.style.opacity="0.9";const o=setTimeout(()=>{n.style.transition="opacity 150ms ease-out",n.style.opacity="0";const i=setTimeout(()=>{n.parentNode&&n.parentNode.removeChild(n);const s=this.activeFlashes.get(e);s?.scrollCleanup&&s.scrollCleanup(),this.activeFlashes.delete(e),qe.delete(n)},150);qe.set(n,i)},300);qe.set(n,o)})},cleanup(e){const t=this.activeFlashes.get(e);if(t){const n=qe.get(t.overlay);n&&(clearTimeout(n),qe.delete(t.overlay)),t.overlay.parentNode&&t.overlay.parentNode.removeChild(t.overlay),t.scrollCleanup&&t.scrollCleanup(),this.activeFlashes.delete(e)}},cleanupAll(){for(const[,e]of this.activeFlashes)this.cleanup(e.element)}},Do=1e3,ti={updates:[],currentFiber:null,totalUpdates:0,windowOffset:0,currentIndex:0,isViewingHistory:!1,latestFiber:null,isVisible:!1,playbackSpeed:1},ye=de(ti),Gr=de(0),Qe=[],Ge=null,Dl=()=>{if(Qe.length===0)return;const e=[...Qe],{updates:t,totalUpdates:n,currentIndex:r,isViewingHistory:o}=ye.value,i=[...t];let s=n;for(const{update:p}of e)i.length>=Do&&i.shift(),i.push(p),s++;const l=Math.max(0,s-Do);let c;o?r===n-1?c=i.length-1:r===0?c=0:l===0?c=r:c=r-1:c=i.length-1;const d=e[e.length-1];ye.value={...ye.value,latestFiber:d.fiber,updates:i,totalUpdates:s,windowOffset:l,currentIndex:c,isViewingHistory:o},Qe=Qe.slice(e.length)},ni={showTimeline:()=>{ye.value={...ye.value,isVisible:!0}},hideTimeline:()=>{ye.value={...ye.value,isVisible:!1,currentIndex:ye.value.updates.length-1}},updateFrame:(e,t)=>{ye.value={...ye.value,currentIndex:e,isViewingHistory:t}},updatePlaybackSpeed:e=>{ye.value={...ye.value,playbackSpeed:e}},addUpdate:(e,t)=>{if(Qe.push({update:e,fiber:t}),!Ge){const n=()=>{Dl(),Ge=null,Qe.length>0&&(Ge=setTimeout(n,96))};Ge=setTimeout(n,96)}},reset:()=>{Ge&&(clearTimeout(Ge),Ge=null),Qe=[],ye.value=ti}},xe=de({query:"",matches:[],currentMatchIndex:-1}),Yn=de(!1),ri=(e,t=0,n=null)=>e.reduce((r,o,i)=>{const s=o.element?Fl(o.fiber):`${n}-${i}`,l=o.fiber?.type?mi(o.fiber):void 0,c={...o,depth:t,nodeId:s,parentId:n,fiber:o.fiber,renderData:l};return r.push(c),o.children?.length&&r.push(...ri(o.children,t+1,s)),r},[]),Pl=e=>e.reduce((t,n)=>Math.max(t,n.depth),0),Ol=(e,t)=>{if(t<=0)return 24;const i=Math.max(0,e-Ae);if(i<24)return 0;const l=Math.min(i*.3,t*24)/t;return Math.max(0,Math.min(24,l))},Ll=["memo","forwardRef","lazy","suspense"],oi=e=>{const t=e.match(/\[(.*?)\]/);if(!t)return null;const n=[],r=t[1].split(",");for(const o of r){const i=o.trim().toLowerCase();i&&n.push(i)}return n},jl=e=>{if(e.length===0)return!1;for(const t of e){let n=!1;for(const r of Ll)if(r.toLowerCase().includes(t)){n=!0;break}if(!n)return!1}return!0},ai=(e,t)=>{if(e.length===0)return!0;if(!t.length)return!1;for(const n of e){let r=!1;for(const o of t)if(o.type.toLowerCase().includes(n)){r=!0;break}if(!r)return!1}return!0},Wl=(e,t)=>Me(()=>{const{query:n,matches:r}=t,o=r.some(d=>d.nodeId===e.nodeId),i=oi(n)||[],s=n?n.replace(/\[.*?\]/,"").trim():"";if(!n||!o)return{highlightedText:a("span",{className:"truncate",children:e.label}),typeHighlight:!1};let l=!0;if(i.length>0)if(!e.fiber)l=!1;else{const{wrapperTypes:d}=jt(e.fiber);l=ai(i,d)}let c=a("span",{className:"truncate",children:e.label});if(s)try{if(s.startsWith("/")&&s.endsWith("/")){const d=s.slice(1,-1),p=new RegExp(`(${d})`,"i"),u=e.label.split(p);c=a("span",{className:"tree-node-search-highlight",children:u.map((h,f)=>p.test(h)?a("span",{className:w("regex",{start:p.test(h)&&f===0,middle:p.test(h)&&f%2===1,end:p.test(h)&&f===u.length-1,"!ml-0":f===1}),children:h},`${e.nodeId}-${h}`):h)})}else{const d=e.label.toLowerCase(),p=s.toLowerCase(),u=d.indexOf(p);u>=0&&(c=a("span",{className:"tree-node-search-highlight",children:[e.label.slice(0,u),a("span",{className:"single",children:e.label.slice(u,u+s.length)}),e.label.slice(u+s.length)]}))}}catch{}return{highlightedText:c,typeHighlight:l&&i.length>0}},[e.label,e.nodeId,e.fiber,t]),Po=e=>e>0?e<.1-Number.EPSILON?"< 0.1":e<1e3?Number(e.toFixed(1)).toString():`${(e/1e3).toFixed(1)}k`:"0",Hl=({node:e,nodeIndex:t,hasChildren:n,isCollapsed:r,handleTreeNodeClick:o,handleTreeNodeToggle:i,searchValue:s})=>{const l=M(null),c=M(e.renderData?.renderCount??0),{highlightedText:d,typeHighlight:p}=Wl(e,s);H(()=>{const f=e.renderData?.renderCount,v=l.current;!v||!c.current||!f||c.current===f||(v.classList.remove("count-flash"),v.offsetWidth,v.classList.add("count-flash"),c.current=f)},[e.renderData?.renderCount]);const u=Me(()=>{if(!e.renderData)return null;const{selfTime:f,totalTime:v,renderCount:x}=e.renderData;return x?a("span",{className:w("flex items-center gap-x-0.5 ml-1.5","text-[10px] text-neutral-400"),children:a("span",{ref:l,title:`Self time: ${Po(f)}ms
Total time: ${Po(v)}ms`,className:"count-badge",children:["×",x]})}):null},[e.renderData]),h=Me(()=>{if(!e.fiber)return null;const{wrapperTypes:f}=jt(e.fiber),v=f[0];return a("span",{className:w("flex items-center gap-x-1","text-[10px] text-neutral-400 tracking-wide","overflow-hidden"),children:[v&&a(Y,{children:[a("span",{title:v?.title,className:w("rounded py-[1px] px-1","bg-neutral-700 text-neutral-300","truncate",v.type==="memo"&&"bg-[#8e61e3] text-white",p&&"bg-yellow-300 text-black"),children:v.type},v.type),v.compiler&&a("span",{className:"text-yellow-300 ml-1",children:"✨"})]}),f.length>1&&`×${f.length}`,u]})},[e.fiber,p,u]);return a("button",{type:"button",title:e.title,"data-index":t,className:w("flex items-center gap-x-1","pl-1 pr-2","w-full h-7","text-left","rounded","cursor-pointer select-none"),onClick:o,children:[a("button",{type:"button","data-index":t,onClick:i,className:w("w-6 h-6 flex items-center justify-center","text-left"),children:n&&a(oe,{name:"icon-chevron-right",size:12,className:w("transition-transform",!r&&"rotate-90")})}),d,h]})},Ul=()=>{const e=M(null),t=M(null),n=M(null),r=M(null),o=M(null),i=M(0),s=M(!1),l=M(!1),c=M(null),[d,p]=U([]),[u,h]=U(new Set),[f,v]=U(void 0),[x,y]=U(xe.value),m=Me(()=>{const g=[],k=d,_=new Map(k.map(N=>[N.nodeId,N]));for(const N of k){let A=!0,F=N;for(;F.parentId;){const R=_.get(F.parentId);if(!R)break;if(u.has(R.nodeId)){A=!1;break}F=R}A&&g.push(N)}return g},[u,d]),b=28,{virtualItems:C,totalSize:S}=Ml({count:m.length,getScrollElement:()=>e.current,estimateSize:()=>b,overscan:5}),T=ie(g=>{s.current=!0,r.current?.blur(),Yn.value=!0;const{parentCompositeFiber:k}=et(g);if(!k)return;E.inspectState.value={kind:"focused",focusedDomElement:g,fiber:k};const _=m.findIndex(N=>N.element===g);if(_!==-1){v(_);const N=_*b,A=e.current;if(A){const F=A.clientHeight,R=A.scrollTop;(N<R||N+b>R+F)&&A.scrollTo({top:Math.max(0,N-F/2),behavior:"instant"})}}},[m]),I=ie(g=>{const k=g.currentTarget,_=Number(k.dataset.index);if(Number.isNaN(_))return;const N=m[_].element;N&&T(N)},[m,T]),V=ie(g=>{h(k=>{const _=new Set(k);return _.has(g)?_.delete(g):_.add(g),_})},[]),q=ie(g=>{g.stopPropagation();const k=g.target,_=Number(k.dataset.index);if(Number.isNaN(_))return;const N=m[_].nodeId;V(N)},[m,V]),O=ie(g=>{n.current?.classList.remove("!border-red-500");const k=[];if(!g){xe.value={query:g,matches:k,currentMatchIndex:-1};return}if(g.includes("[")&&!g.includes("]")&&g.length>g.indexOf("[")+1){n.current?.classList.add("!border-red-500");return}const _=oi(g)||[];if(g.includes("[")&&!jl(_)){n.current?.classList.add("!border-red-500");return}const N=g.replace(/\[.*?\]/,"").trim(),A=/^\/.*\/$/.test(N);let F=R=>!1;if(N.startsWith("/")&&!A&&N.length>1){n.current?.classList.add("!border-red-500");return}if(A)try{const R=N.slice(1,-1),j=new RegExp(R,"i");F=J=>j.test(J)}catch{n.current?.classList.add("!border-red-500");return}else if(N){const R=N.toLowerCase();F=j=>j.toLowerCase().includes(R)}for(const R of d){let j=!0;if(N&&(j=F(R.label)),j&&_.length>0)if(!R.fiber)j=!1;else{const{wrapperTypes:J}=jt(R.fiber);j=ai(_,J)}j&&k.push(R)}if(xe.value={query:g,matches:k,currentMatchIndex:k.length>0?0:-1},k.length>0){const R=k[0],j=m.findIndex(J=>J.nodeId===R.nodeId);if(j!==-1){const J=j*b,G=e.current;if(G){const ee=G.clientHeight;G.scrollTo({top:Math.max(0,J-ee/2),behavior:"instant"})}}}},[d,m]),B=ie(g=>{const k=g.currentTarget;k&&O(k.value)},[O]),L=ie(g=>{const{matches:k,currentMatchIndex:_}=xe.value;if(k.length===0)return;const N=g==="next"?(_+1)%k.length:(_-1+k.length)%k.length;xe.value={...xe.value,currentMatchIndex:N};const A=k[N],F=m.findIndex(R=>R.nodeId===A.nodeId);if(F!==-1){v(F);const R=F*b,j=e.current;if(j){const J=j.clientHeight;j.scrollTo({top:Math.max(0,R-J/2),behavior:"instant"})}}},[m]),$=ie(g=>{if(t.current&&(t.current.style.width=`${g}px`),e.current){e.current.style.width=`${g}px`;const k=Ol(g,i.current);e.current.style.setProperty("--indentation-size",`${k}px`)}},[]),le=ie(g=>{if(!c.current)return;const k=z.value.dimensions.width,_=Math.floor(k-Ae/2);c.current.classList.remove("cursor-ew-resize","cursor-w-resize","cursor-e-resize"),g<=Ae?c.current.classList.add("cursor-w-resize"):g>=_?c.current.classList.add("cursor-e-resize"):c.current.classList.add("cursor-ew-resize")},[]),ue=ie(g=>{if(g.preventDefault(),g.stopPropagation(),!e.current)return;e.current.style.setProperty("pointer-events","none"),l.current=!0;const k=g.clientX,_=e.current.offsetWidth,N=z.value.dimensions.width,A=Math.floor(N-Ae/2);le(_);const F=j=>{const J=k-j.clientX,G=_+J;le(G);const ee=Math.min(A,Math.max(Ae,G));$(ee)},R=()=>{e.current&&(e.current.style.removeProperty("pointer-events"),document.removeEventListener("pointermove",F),document.removeEventListener("pointerup",R),z.value={...z.value,componentsTree:{...z.value.componentsTree,width:e.current.offsetWidth}},ke(je,z.value),l.current=!1)};document.addEventListener("pointermove",F),document.addEventListener("pointerup",R)},[$,le]);H(()=>{if(!e.current)return;const g=e.current.offsetWidth;return le(g),z.subscribe(()=>{e.current&&le(e.current.offsetWidth)})},[le]);const me=ie(()=>{s.current=!1},[]);return H(()=>{let g=!0;const k=R=>{const j=new Map,J=[];for(const{element:G,name:ee,fiber:pe}of R){if(!G)continue;let we=ee;const{name:he,wrappers:_e}=jt(pe);he&&(_e.length>0?we=`${_e.join("(")}(${he})${")".repeat(_e.length)}`:we=he),j.set(G,{label:he||ee,title:we,children:[],element:G,fiber:pe})}for(const{element:G,depth:ee}of R){if(!G)continue;const pe=j.get(G);if(pe)if(ee===0)J.push(pe);else{let we=G.parentElement;for(;we;){const he=j.get(we);if(he){he.children=he.children||[],he.children.push(pe);break}we=we.parentElement}}}return J},_=()=>{const R=o.current;if(!R)return;const j=cc(),J=k(j);if(J.length>0){const G=ri(J),ee=Pl(G);if(i.current=ee,$(z.value.componentsTree.width),p(G),g){g=!1;const pe=G.findIndex(we=>we.element===R);if(pe!==-1){const we=pe*b,he=e.current;he&&setTimeout(()=>{he.scrollTo({top:we,behavior:"instant"})},96)}}}},N=E.inspectState.subscribe(R=>{if(R.kind==="focused"){if(Yn.value)return;O(""),o.current=R.focusedDomElement,_()}});let A=0;const F=Gr.subscribe(()=>{if(E.inspectState.value.kind==="focused"){if(cancelAnimationFrame(A),l.current)return;A=requestAnimationFrame(()=>{Yn.value=!1,_()})}});return()=>{N(),F(),xe.value={query:"",matches:[],currentMatchIndex:-1}}},[]),H(()=>{const g=k=>{if(s.current&&f)switch(k.key){case"ArrowUp":{if(k.preventDefault(),k.stopPropagation(),f>0){const _=m[f-1];_?.element&&T(_.element)}return}case"ArrowDown":{if(k.preventDefault(),k.stopPropagation(),f<m.length-1){const _=m[f+1];_?.element&&T(_.element)}return}case"ArrowLeft":{k.preventDefault(),k.stopPropagation();const _=m[f];_?.nodeId&&V(_.nodeId);return}case"ArrowRight":{k.preventDefault(),k.stopPropagation();const _=m[f];_?.nodeId&&V(_.nodeId);return}}};return document.addEventListener("keydown",g),()=>{document.removeEventListener("keydown",g)}},[f,m,T,V]),H(()=>xe.subscribe(y),[]),H(()=>z.subscribe(k=>{t.current?.style.setProperty("transition","width 0.1s"),$(k.componentsTree.width),setTimeout(()=>{t.current?.style.removeProperty("transition")},500)}),[]),a("div",{className:"react-scan-components-tree flex",children:[a("div",{ref:c,onPointerDown:ue,className:"relative resize-v-line",children:a("span",{children:a(oe,{name:"icon-ellipsis",size:18})})}),a("div",{ref:t,className:"flex flex-col h-full",children:[a("div",{className:"p-2 border-b border-[#1e1e1e]",children:a("div",{ref:n,title:`Search components by:

• Name (e.g., "Button") — Case insensitive, matches any part

• Regular Expression (e.g., "/^Button/") — Use forward slashes

• Wrapper Type (e.g., "[memo,forwardRef]"):
   - Available types: memo, forwardRef, lazy, suspense
   - Matches any part of type name (e.g., "mo" matches "memo")
   - Use commas for multiple types

• Combined Search:
   - Mix name/regex with type: "button [for]"
   - Will match components satisfying both conditions

• Navigation:
   - Enter → Next match
   - Shift + Enter → Previous match
   - Cmd/Ctrl + Enter → Select and focus match
`,className:w("relative","flex items-center gap-x-1 px-2","rounded","border border-transparent","focus-within:border-[#454545]","bg-[#1e1e1e] text-neutral-300","transition-colors","whitespace-nowrap","overflow-hidden"),children:[a(oe,{name:"icon-search",size:12,className:" text-neutral-500"}),a("div",{className:"relative flex-1 h-7 overflow-hidden",children:a("input",{ref:r,type:"text",value:xe.value.query,onClick:g=>{g.stopPropagation(),g.currentTarget.focus()},onPointerDown:g=>{g.stopPropagation()},onKeyDown:g=>{g.key==="Escape"&&g.currentTarget.blur(),xe.value.matches.length&&(g.key==="Enter"&&g.shiftKey?L("prev"):g.key==="Enter"&&(g.metaKey||g.ctrlKey?(g.preventDefault(),g.stopPropagation(),T(xe.value.matches[xe.value.currentMatchIndex].element),g.currentTarget.focus()):L("next")))},onChange:B,className:"absolute inset-y-0 inset-x-1",placeholder:"Component name, /regex/, or [type]"})}),xe.value.query?a(Y,{children:[a("span",{className:"flex items-center gap-x-0.5 text-xs text-neutral-500",children:[xe.value.currentMatchIndex+1,"|",xe.value.matches.length]}),!!xe.value.matches.length&&a(Y,{children:[a("button",{type:"button",onClick:g=>{g.stopPropagation(),L("prev")},className:"button rounded w-4 h-4 flex items-center justify-center text-neutral-400 hover:text-neutral-300",children:a(oe,{name:"icon-chevron-right",className:"-rotate-90",size:12})}),a("button",{type:"button",onClick:g=>{g.stopPropagation(),L("next")},className:"button rounded w-4 h-4 flex items-center justify-center text-neutral-400 hover:text-neutral-300",children:a(oe,{name:"icon-chevron-right",className:"rotate-90",size:12})})]}),a("button",{type:"button",onClick:g=>{g.stopPropagation(),O("")},className:"button rounded w-4 h-4 flex items-center justify-center text-neutral-400 hover:text-neutral-300",children:a(oe,{name:"icon-close",size:12})})]}):!!d.length&&a("span",{className:"text-xs text-neutral-500",children:d.length})]})}),a("div",{className:"flex-1 overflow-hidden",children:a("div",{ref:e,onPointerLeave:me,className:"tree h-full overflow-auto will-change-transform",children:a("div",{className:"relative w-full",style:{height:S},children:C.map(g=>{const k=m[g.index];if(!k)return null;const _=E.inspectState.value.kind==="focused"&&k.element===E.inspectState.value.focusedDomElement,N=g.index===f;return a("div",{className:w("absolute left-0 w-full overflow-hidden","text-neutral-400 hover:text-neutral-300","bg-transparent hover:bg-[#5f3f9a]/20",(_||N)&&"text-neutral-300 bg-[#5f3f9a]/40 hover:bg-[#5f3f9a]/40"),style:{top:g.start,height:b},children:a("div",{className:"w-full h-full",style:{paddingLeft:`calc(${k.depth} * var(--indentation-size))`},children:a(Hl,{node:k,nodeIndex:g.index,hasChildren:!!k.children?.length,isCollapsed:u.has(k.nodeId),handleTreeNodeClick:I,handleTreeNodeToggle:q,searchValue:x})})},k.nodeId)})})})})]})]})},bn=$n(({text:e,children:t,onCopy:n,className:r,iconSize:o=14})=>{const[i,s]=U(!1);H(()=>{if(i){const d=setTimeout(()=>s(!1),600);return()=>{clearTimeout(d)}}},[i]);const l=ie(d=>{d.preventDefault(),d.stopPropagation(),navigator.clipboard.writeText(e).then(()=>{s(!0),n?.(!0,e)},()=>{n?.(!1,e)})},[e,n]),c=a("button",{onClick:l,type:"button",className:w("z-10","flex items-center justify-center","hover:text-dev-pink-400","transition-colors duration-200 ease-in-out","cursor-pointer",`size-[${o}px]`,r),children:a(oe,{name:`icon-${i?"check":"copy"}`,size:[o],className:w(i&&"text-green-500")})});return t?t({ClipboardIcon:c,onClick:l}):c}),Vl=({length:e,expanded:t,onToggle:n,isNegative:r})=>a("div",{className:"flex items-center gap-1",children:[a("button",{type:"button",onClick:n,className:"flex items-center p-0 opacity-50",children:a(oe,{name:"icon-chevron-right",size:12,className:w("transition-[color,transform]",r?"text-[#f87171]":"text-[#4ade80]",t&&"rotate-90")})}),a("span",{children:["Array(",e,")"]})]}),br=({value:e,path:t,isNegative:n})=>{const[r,o]=U(!1);if(!(e!==null&&typeof e=="object"&&!(e instanceof Date)))return a("div",{className:"flex items-center gap-1",children:[a("span",{className:"text-gray-500",children:[t,":"]}),a("span",{className:"truncate",children:_n(e)})]});const s=Object.entries(e);return a("div",{className:"flex flex-col",children:[a("div",{className:"flex items-center gap-1",children:[a("button",{type:"button",onClick:()=>o(!r),className:"flex items-center p-0 opacity-50",children:a(oe,{name:"icon-chevron-right",size:12,className:w("transition-[color,transform]",n?"text-[#f87171]":"text-[#4ade80]",r&&"rotate-90")})}),a("span",{className:"text-gray-500",children:[t,":"]}),!r&&a("span",{className:"truncate",children:e instanceof Date?_n(e):`{${Object.keys(e).join(", ")}}`})]}),r&&a("div",{className:"pl-5 border-l border-[#333] mt-0.5 ml-1 flex flex-col gap-0.5",children:s.map(([l,c])=>a(br,{value:c,path:l,isNegative:n},l))})]})},xn=({value:e,expanded:t,onToggle:n,isNegative:r})=>{const{value:o,error:i}=pc(e);return i?a("span",{className:"text-gray-500 font-italic",children:i}):o!==null&&typeof o=="object"&&!(o instanceof Promise)?Array.isArray(o)?a("div",{className:"flex flex-col gap-1 relative",children:[a(Vl,{length:o.length,expanded:t,onToggle:n,isNegative:r}),t&&a("div",{className:"pl-2 border-l border-[#333] mt-0.5 ml-1 flex flex-col gap-0.5",children:o.map((l,c)=>a(br,{value:l,path:c.toString(),isNegative:r},c.toString()))}),a(bn,{text:Ho(o),className:"absolute top-0.5 right-0.5 opacity-0 transition-opacity group-hover:opacity-100 self-end",children:({ClipboardIcon:l})=>a(Y,{children:l})})]}):a("div",{className:"flex items-start gap-1 relative",children:[a("button",{type:"button",onClick:n,className:w("flex items-center","p-0 mt-0.5 mr-1","opacity-50"),children:a(oe,{name:"icon-chevron-right",size:12,className:w("transition-[color,transform]",r?"text-[#f87171]":"text-[#4ade80]",t&&"rotate-90")})}),a("div",{className:"flex-1",children:t?a("div",{className:"pl-2 border-l border-[#333] mt-0.5 ml-1 flex flex-col gap-0.5",children:Object.entries(o).map(([l,c])=>a(br,{value:c,path:l,isNegative:r},l))}):a("span",{children:_n(o)})}),a(bn,{text:Ho(o),className:"absolute top-0.5 right-0.5 opacity-0 transition-opacity group-hover:opacity-100 self-end",children:({ClipboardIcon:l})=>a(Y,{children:l})})]}):a("span",{children:_n(o)})},Yl=50;de({fiber:null,fiberProps:{current:[],changes:new Set},fiberState:{current:[],changes:new Set},fiberContext:{current:[],changes:new Set}});var xr=e=>{switch(e.kind){case"initialized":return e.changes.currentValue;case"partially-initialized":return e.value}},Oo=(e,t)=>{for(const n of e){const r=t.get(n.name);if(r){t.set(r.name,{count:r.count+1,currentValue:n.value,id:r.name,lastUpdated:Date.now(),name:r.name,previousValue:n.prevValue});continue}t.set(n.name,{count:1,currentValue:n.value,id:n.name,lastUpdated:Date.now(),name:n.name,previousValue:n.prevValue})}},Bl=(e,t)=>{for(const n of e){const r=t.contextChanges.get(n.contextType);if(r){if(Xe(xr(r),n.value))continue;if(r.kind==="partially-initialized"){t.contextChanges.set(n.contextType,{kind:"initialized",changes:{count:1,currentValue:n.value,id:n.contextType.toString(),lastUpdated:Date.now(),name:n.name,previousValue:r.value}});continue}t.contextChanges.set(n.contextType,{kind:"initialized",changes:{count:r.changes.count+1,currentValue:n.value,id:n.contextType.toString(),lastUpdated:Date.now(),name:n.name,previousValue:r.changes.currentValue}});continue}t.contextChanges.set(n.contextType,{kind:"partially-initialized",id:n.contextType.toString(),lastUpdated:Date.now(),name:n.name,value:n.value})}},Xl=e=>{const t={contextChanges:new Map,propsChanges:new Map,stateChanges:new Map};return e.forEach(n=>{Bl(n.contextChanges,t),Oo(n.stateChanges,t.stateChanges),Oo(n.propsChanges,t.propsChanges)}),t},Lo=(e,t)=>{const n=new Map;return e.forEach((r,o)=>{n.set(o,r)}),t.forEach((r,o)=>{const i=n.get(o);if(!i){n.set(o,r);return}n.set(o,{count:i.count+r.count,currentValue:r.currentValue,id:r.id,lastUpdated:r.lastUpdated,name:r.name,previousValue:r.previousValue})}),n},ql=(e,t)=>{const n=new Map;return e.contextChanges.forEach((r,o)=>{n.set(o,r)}),t.contextChanges.forEach((r,o)=>{const i=n.get(o);if(!i){n.set(o,r);return}if(xr(r)!==xr(i))switch(i.kind){case"initialized":switch(r.kind){case"initialized":{n.set(o,{kind:"initialized",changes:{...r.changes,count:r.changes.count+i.changes.count+1,currentValue:r.changes.currentValue,previousValue:r.changes.previousValue}});return}case"partially-initialized":{n.set(o,{kind:"initialized",changes:{count:i.changes.count+1,currentValue:r.value,id:r.id,lastUpdated:r.lastUpdated,name:r.name,previousValue:i.changes.currentValue}});return}}case"partially-initialized":switch(r.kind){case"initialized":{n.set(o,{kind:"initialized",changes:{count:r.changes.count+1,currentValue:r.changes.currentValue,id:r.changes.id,lastUpdated:r.changes.lastUpdated,name:r.changes.name,previousValue:i.value}});return}case"partially-initialized":{n.set(o,{kind:"initialized",changes:{count:1,currentValue:r.value,id:r.id,lastUpdated:r.lastUpdated,name:r.name,previousValue:i.value}});return}}}}),n},Gl=(e,t)=>{const n=ql(e,t),r=Lo(e.propsChanges,t.propsChanges),o=Lo(e.stateChanges,t.stateChanges);return{contextChanges:n,propsChanges:r,stateChanges:o}},yr=e=>Array.from(e.propsChanges.values()).reduce((t,n)=>t+n.count,0)+Array.from(e.stateChanges.values()).reduce((t,n)=>t+n.count,0)+Array.from(e.contextChanges.values()).filter(t=>t.kind==="initialized").reduce((t,n)=>t+n.changes.count,0),Jl=e=>{const t=M({queue:[]}),[n,r]=U({propsChanges:new Map,stateChanges:new Map,contextChanges:new Map}),o=E.inspectState.value.kind==="focused"?E.inspectState.value.fiber:null,i=o?Be(o):null;return H(()=>{const s=setInterval(()=>{t.current.queue.length!==0&&(r(l=>{const c=Xl(t.current.queue),d=Gl(l,c);return yr(l),yr(d),d}),t.current.queue=[])},Yl);return()=>{clearInterval(s)}},[o]),H(()=>{if(!i)return;const s=c=>{t.current?.queue.push(c)};let l=E.changesListeners.get(i);return l||(l=[],E.changesListeners.set(i,l)),l.push(s),()=>{r({propsChanges:new Map,stateChanges:new Map,contextChanges:new Map}),t.current.queue=[],E.changesListeners.set(i,E.changesListeners.get(i)?.filter(c=>c!==s)??[])}},[i]),H(()=>()=>{r({propsChanges:new Map,stateChanges:new Map,contextChanges:new Map}),t.current.queue=[]},[i]),n},yn=e=>{if(e==null)return{value:e};if(typeof e=="function")return{value:e};if(typeof e!="object")return{value:e};if(wt(e))return{value:"Promise"};try{const t=Object.getPrototypeOf(e);return t===Promise.prototype||t?.constructor?.name==="Promise"?{value:"Promise"}:{value:e}}catch{return{value:null,error:"Error accessing value"}}},Kl=$n(()=>{const[e,t]=U(!0),n=Jl(),[r,o]=U(!1),i=yr(n)>0;H(()=>{if(!r&&i){const c=setTimeout(()=>{o(!0),requestAnimationFrame(()=>{t(!0)})},0);return()=>clearTimeout(c)}},[r,i]);const s=new Map(Array.from(n.contextChanges.entries()).filter(([,c])=>c.kind==="initialized").map(([c,d])=>[c,d.kind==="partially-initialized"?null:d.changes])),l=E.inspectState.value.kind==="focused"?E.inspectState.value.fiber:null;if(l)return a(Y,{children:[a(Ql,{}),a("div",{className:"overflow-hidden h-full flex flex-col gap-y-2",children:[a("div",{className:"flex flex-col gap-2 px-3 pt-2",children:[a("span",{className:"text-sm font-medium text-[#888]",children:["Why did"," ",a("span",{className:"text-[#A855F7]",children:ge(l)})," ","render?"]}),!i&&a("div",{className:"text-sm text-[#737373] bg-[#1E1E1E] rounded-md p-4 flex flex-col gap-4",children:[a("div",{children:"No changes detected since selecting"}),a("div",{children:"The props, state, and context changes within your component will be reported here"})]})]}),a("div",{className:w("flex flex-col gap-y-2 pl-3 relative overflow-y-auto h-full"),children:[a(Bn,{changes:n.propsChanges,title:"Changed Props",isExpanded:e}),a(Bn,{renderName:c=>Zl(c,ge(it(l))??"Unknown Component"),changes:n.stateChanges,title:"Changed State",isExpanded:e}),a(Bn,{changes:s,title:"Changed Context",isExpanded:e})]})]})]})}),Zl=(e,t)=>{if(Number.isNaN(Number(e)))return e;const n=Number.parseInt(e);return a("span",{className:"truncate",children:[a("span",{className:"text-white",children:[n,(o=>{const i=o%10,s=o%100;if(s>=11&&s<=13)return"th";switch(i){case 1:return"st";case 2:return"nd";case 3:return"rd";default:return"th"}})(n)," hook"," "]}),a("span",{style:{color:"#666"},children:["called in ",a("i",{className:"text-[#A855F7] truncate",children:t})]})]})},Ql=$n(()=>{const e=M(null),t=M(null),n=M(null),r=M({isPropsChanged:!1,isStateChanged:!1,isContextChanged:!1});return H(()=>{const o=ei(()=>{const s=[];e.current?.dataset.flash==="true"&&s.push(e.current),t.current?.dataset.flash==="true"&&s.push(t.current),n.current?.dataset.flash==="true"&&s.push(n.current);for(const l of s)l.classList.remove("count-flash-white"),l.offsetWidth,l.classList.add("count-flash-white")},400);return ye.subscribe(s=>{if(!e.current||!t.current||!n.current)return;const{currentIndex:l,updates:c}=s,d=c[l];!d||l===0||(o(),r.current={isPropsChanged:(d.props?.changes?.size??0)>0,isStateChanged:(d.state?.changes?.size??0)>0,isContextChanged:(d.context?.changes?.size??0)>0},e.current.dataset.flash!=="true"&&(e.current.dataset.flash=r.current.isPropsChanged.toString()),t.current.dataset.flash!=="true"&&(t.current.dataset.flash=r.current.isStateChanged.toString()),n.current.dataset.flash!=="true"&&(n.current.dataset.flash=r.current.isContextChanged.toString()))})},[]),a("button",{type:"button",className:w("react-section-header","overflow-hidden","max-h-0","transition-[max-height]"),children:a("div",{className:w("flex-1 react-scan-expandable"),children:a("div",{className:"overflow-hidden",children:a("div",{className:"flex items-center whitespace-nowrap",children:[a("div",{className:"flex items-center gap-x-2",children:"What changed?"}),a("div",{className:w("ml-auto","change-scope","transition-opacity duration-300 delay-150"),children:[a("div",{ref:e,children:"props"}),a("div",{ref:t,children:"state"}),a("div",{ref:n,children:"context"})]})]})})})})}),ec=e=>e,Bn=$n(({title:e,changes:t,renderName:n=ec})=>{const[r,o]=U(new Set),[i,s]=U(new Set),l=Array.from(t.entries());return t.size===0?null:a("div",{children:[a("div",{className:"text-xs text-[#888] mb-1.5",children:e}),a("div",{className:"flex flex-col gap-2",children:l.map(([c,d])=>{const p=i.has(String(c)),{value:u,error:h}=yn(d.previousValue),{value:f,error:v}=yn(d.currentValue),x=ci(u,f);return a("div",{children:[a("button",{onClick:()=>{s(y=>{const m=new Set(y);return m.has(String(c))?m.delete(String(c)):m.add(String(c)),m})},className:"flex items-center gap-2 w-full bg-transparent border-none p-0 cursor-pointer text-white text-xs",children:a("div",{className:"flex items-center gap-1.5 flex-1",children:[a(oe,{name:"icon-chevron-right",size:12,className:w("text-[#666] transition-transform duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]",{"rotate-90":p})}),a("div",{className:"whitespace-pre-wrap break-words text-left font-medium flex items-center gap-x-1.5",children:[n(d.name),a(oc,{count:d.count,isFunction:typeof d.currentValue=="function",showWarning:x.changes.length===0,forceFlash:!0})]})]})}),a("div",{className:w("react-scan-expandable",{"react-scan-expanded":p}),children:a("div",{className:"pl-3 text-xs font-mono border-l-1 border-[#333]",children:a("div",{className:"flex flex-col gap-0.5",children:h||v?a(tc,{currError:v,prevError:h}):x.changes.length>0?a(nc,{change:d,diff:x,expandedFns:r,renderName:n,setExpandedFns:o,title:e}):a(rc,{currValue:f,entryKey:c,expandedFns:r,prevValue:u,setExpandedFns:o})})})})]},c)})})]})}),tc=({prevError:e,currError:t})=>a(Y,{children:[e&&a("div",{className:"text-[#f87171] bg-[#2a1515] pr-1.5 py-[3px] rounded italic",children:e}),t&&a("div",{className:"text-[#4ade80] bg-[#1a2a1a] pr-1.5 py-[3px] rounded italic mt-0.5",children:t})]}),nc=({diff:e,title:t,renderName:n,change:r,expandedFns:o,setExpandedFns:i})=>e.changes.map((s,l)=>{const{value:c,error:d}=yn(s.prevValue),{value:p,error:u}=yn(s.currentValue),h=typeof c=="function"||typeof p=="function";let f;return t==="Props"&&(f=s.path.length>0?`${n(String(r.name))}.${Ee(s.path)}`:void 0),t==="State"&&s.path.length>0&&(f=`state.${Ee(s.path)}`),f||(f=Ee(s.path)),a("div",{className:w("flex flex-col gap-y-1",l<e.changes.length-1&&"mb-4"),children:[f&&a("div",{className:"text-[#666] text-[10px]",children:f}),a("button",{type:"button",className:w("group","flex items-start","py-[3px] px-1.5","text-left text-[#f87171] bg-[#2a1515]","rounded","overflow-hidden break-all",h&&"cursor-pointer"),onClick:h?()=>{const v=`${Ee(s.path)}-prev`;i(x=>{const y=new Set(x);return y.has(v)?y.delete(v):y.add(v),y})}:void 0,children:[a("span",{className:"w-3 flex items-center justify-center opacity-50",children:"-"}),a("span",{className:"flex-1 whitespace-nowrap font-mono",children:d?a("span",{className:"italic text-[#f87171]",children:d}):h?a("div",{className:"flex gap-1 items-start flex-col",children:[a("div",{className:"flex gap-1 items-start w-full",children:[a("span",{className:"flex-1 max-h-40",children:_r(c,o.has(`${Ee(s.path)}-prev`))}),typeof c=="function"&&a(bn,{text:c.toString(),className:"opacity-0 transition-opacity group-hover:opacity-100",children:({ClipboardIcon:v})=>a(Y,{children:v})})]}),c?.toString()===p?.toString()&&a("div",{className:"text-[10px] text-[#666] italic",children:"Function reference changed"})]}):a(xn,{value:c,expanded:o.has(`${Ee(s.path)}-prev`),onToggle:()=>{const v=`${Ee(s.path)}-prev`;i(x=>{const y=new Set(x);return y.has(v)?y.delete(v):y.add(v),y})},isNegative:!0})})]}),a("button",{type:"button",className:w("group","flex items-start","py-[3px] px-1.5","text-left text-[#4ade80] bg-[#1a2a1a]","rounded","overflow-hidden break-all",h&&"cursor-pointer"),onClick:h?()=>{const v=`${Ee(s.path)}-current`;i(x=>{const y=new Set(x);return y.has(v)?y.delete(v):y.add(v),y})}:void 0,children:[a("span",{className:"w-3 flex items-center justify-center opacity-50",children:"+"}),a("span",{className:"flex-1 whitespace-pre-wrap font-mono",children:u?a("span",{className:"italic text-[#4ade80]",children:u}):h?a("div",{className:"flex gap-1 items-start flex-col",children:[a("div",{className:"flex gap-1 items-start w-full",children:[a("span",{className:"flex-1",children:_r(p,o.has(`${Ee(s.path)}-current`))}),typeof p=="function"&&a(bn,{text:p.toString(),className:"opacity-0 transition-opacity group-hover:opacity-100",children:({ClipboardIcon:v})=>a(Y,{children:v})})]}),c?.toString()===p?.toString()&&a("div",{className:"text-[10px] text-[#666] italic",children:"Function reference changed"})]}):a(xn,{value:p,expanded:o.has(`${Ee(s.path)}-current`),onToggle:()=>{const v=`${Ee(s.path)}-current`;i(x=>{const y=new Set(x);return y.has(v)?y.delete(v):y.add(v),y})},isNegative:!1})})]})]},`${f}-${r.name}-${l}`)}),rc=({prevValue:e,currValue:t,entryKey:n,expandedFns:r,setExpandedFns:o})=>a(Y,{children:[a("div",{className:"group flex gap-0.5 items-start text-[#f87171] bg-[#2a1515] py-[3px] px-1.5 rounded",children:[a("span",{className:"w-3 flex items-center justify-center opacity-50",children:"-"}),a("span",{className:"flex-1 overflow-hidden whitespace-pre-wrap font-mono",children:a(xn,{value:e,expanded:r.has(`${String(n)}-prev`),onToggle:()=>{const i=`${String(n)}-prev`;o(s=>{const l=new Set(s);return l.has(i)?l.delete(i):l.add(i),l})},isNegative:!0})})]}),a("div",{className:"group flex gap-0.5 items-start text-[#4ade80] bg-[#1a2a1a] py-[3px] px-1.5 rounded mt-0.5",children:[a("span",{className:"w-3 flex items-center justify-center opacity-50",children:"+"}),a("span",{className:"flex-1 overflow-hidden whitespace-pre-wrap font-mono",children:a(xn,{value:t,expanded:r.has(`${String(n)}-current`),onToggle:()=>{const i=`${String(n)}-current`;o(s=>{const l=new Set(s);return l.has(i)?l.delete(i):l.add(i),l})},isNegative:!1})})]}),typeof t=="object"&&t!==null&&a("div",{className:"text-[#666] text-[10px] italic mt-1 flex items-center gap-x-1",children:[a(oe,{name:"icon-triangle-alert",className:"text-yellow-500 mb-px",size:14}),a("span",{children:"Reference changed but objects are structurally the same"})]})]}),oc=({count:e,forceFlash:t,isFunction:n,showWarning:r})=>{const o=M(!0),i=M(null),s=M(e);return H(()=>{const l=i.current;!l||s.current===e||(l.classList.remove("count-flash"),l.offsetWidth,l.classList.add("count-flash"),s.current=e)},[e]),H(()=>{if(o.current){o.current=!1;return}if(t){let l=setTimeout(()=>{i.current?.classList.add("count-flash-white"),l=setTimeout(()=>{i.current?.classList.remove("count-flash-white")},300)},500);return()=>{clearTimeout(l)}}},[t]),a("div",{ref:i,className:"count-badge",children:[r&&a(oe,{name:"icon-triangle-alert",className:"text-yellow-500 mb-px",size:14}),n&&a(oe,{name:"icon-function",className:"text-[#A855F7] mb-px",size:14}),"x",e]})},Ve={lastRendered:new Map,expandedPaths:new Set,cleanup:()=>{Ve.lastRendered.clear(),Ve.expandedPaths.clear(),$l.cleanupAll(),gc(),ni.reset()}},ii=class extends Ne{constructor(){super(...arguments),this.state={hasError:!1,error:null},this.handleReset=()=>{this.setState({hasError:!1,error:null}),Ve.cleanup()}}static getDerivedStateFromError(e){return{hasError:!0,error:e}}render(){return this.state.hasError?a("div",{className:"p-4 bg-red-950/50 h-screen backdrop-blur-sm",children:[a("div",{className:"flex items-center gap-2 mb-3 text-red-400 font-medium",children:[a(oe,{name:"icon-flame",className:"text-red-500",size:16}),"Something went wrong in the inspector"]}),a("div",{className:"p-3 bg-black/40 rounded font-mono text-xs text-red-300 mb-4 break-words",children:this.state.error?.message||JSON.stringify(this.state.error)}),a("button",{type:"button",onClick:this.handleReset,className:"px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2",children:"Reset Inspector"})]}):this.props.children}},ac=lt(()=>w("react-scan-inspector","flex-1","opacity-0","overflow-y-auto overflow-x-hidden","transition-opacity delay-0","pointer-events-none",!Dn.value&&"opacity-100 delay-300 pointer-events-auto")),ic=qr(()=>{const e=M(null),t=n=>{if(!n)return;e.current=n;const{data:r,shouldUpdate:o}=wc(n);if(o){const i={timestamp:Date.now(),fiberInfo:hc(n),props:r.fiberProps,state:r.fiberState,context:r.fiberContext,stateNames:mc(n)};ni.addUpdate(i,n)}};return Lt(()=>{const n=E.inspectState.value;Ot(()=>{if(n.kind!=="focused"||!n.focusedDomElement){e.current=null,Ve.cleanup();return}n.kind==="focused"&&(Dn.value=!1);const{parentCompositeFiber:r}=Wo(n.focusedDomElement,n.fiber);if(!r){E.inspectState.value={kind:"inspect-off"},Q.value={view:"none"};return}e.current?.type!==r.type&&(e.current=r,Ve.cleanup(),t(r))})}),Lt(()=>{Gr.value,Ot(()=>{const n=E.inspectState.value;if(n.kind!=="focused"||!n.focusedDomElement){e.current=null,Ve.cleanup();return}const{parentCompositeFiber:r}=Wo(n.focusedDomElement,n.fiber);if(!r){E.inspectState.value={kind:"inspect-off"},Q.value={view:"none"};return}t(r),n.focusedDomElement.isConnected||(e.current=null,Ve.cleanup(),E.inspectState.value={kind:"inspecting",hoveredDomElement:null})})}),H(()=>()=>{Ve.cleanup()},[]),a(ii,{children:a("div",{className:ac,children:a("div",{className:"w-full h-full",children:a(Kl,{})})})})}),sc=qr(()=>E.inspectState.value.kind!=="focused"?null:a(ii,{children:[a(ic,{}),a(Ul,{})]})),si=e=>{if("__REACT_DEVTOOLS_GLOBAL_HOOK__"in window){const t=window.__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!t?.renderers)return null;for(const[,n]of Array.from(t.renderers))try{const r=n.findFiberByHostInstance?.(e);if(r)return r}catch{}}if("_reactRootContainer"in e)return e._reactRootContainer?._internalRoot?.current?.child??null;for(const t in e)if(t.startsWith("__reactInternalInstance$")||t.startsWith("__reactFiber"))return e[t];return null},Jr=e=>{let t=e;for(;t;){if(t.stateNode instanceof Element)return t.stateNode;if(!t.child)break;t=t.child}for(;t;){if(t.stateNode instanceof Element)return t.stateNode;if(!t.return)break;t=t.return}return null},Kr=e=>{if(!e)return null;try{const t=si(e);if(!t)return null;const n=vt(t);return n?n[0]:null}catch{return null}},vt=e=>{let t=e,n=null;for(;t;){if(Mn(t))return[t,n];Rt(t)&&!n&&(n=t),t=t.return}return null},jo=(e,t)=>!!$r(t,r=>r===e),lc=async e=>{const t=Kr(e);if(!t)return null;const n=Jr(t);if(!n)return null;const r=(await Bs([n])).get(n);return r||null},et=e=>{const t=Kr(e);if(!t)return{};if(!Jr(t))return{};const r=vt(t);if(!r)return{};const[o]=r;return{parentCompositeFiber:o}},Wo=(e,t)=>{if(!e.isConnected)return{};let n=t??Kr(e);if(!n)return{};let r=n,o=null,i=null;for(;r;){if(!r.stateNode){r=r.return;continue}if(X.instrumentation?.fiberRoots.has(r.stateNode)){o=r,i=r.stateNode.current;break}r=r.return}if(!o||!i)return{};if(n=jo(n,i)?n:n.alternate??n,!n)return{};if(!Jr(n))return{};const s=vt(n)?.[0];return s?{parentCompositeFiber:jo(s,i)?s:s.alternate??s}:{}},li=e=>{const t=e.memoizedProps??{},n=e.alternate?.memoizedProps??{},r=[];for(const o in t){if(o==="children")continue;const i=t[o],s=n[o];Xe(i,s)||r.push({name:o,value:i,prevValue:s,type:1})}return r},kr=new Set(["HTML","HEAD","META","TITLE","BASE","SCRIPT","SCRIPT","STYLE","LINK","NOSCRIPT","SOURCE","TRACK","EMBED","OBJECT","PARAM","TEMPLATE","PORTAL","SLOT","AREA","XML","DOCTYPE","COMMENT"]),kn=(e,t=!0)=>{if(e.stateNode&&"nodeType"in e.stateNode){const r=e.stateNode;return t&&r.tagName&&kr.has(r.tagName.toLowerCase())?null:r}let n=e.child;for(;n;){const r=kn(n,t);if(r)return r;n=n.sibling}return null},cc=(e=document.body)=>{const t=[],n=o=>{if(!o)return null;const{parentCompositeFiber:i}=et(o);return i&&kn(i)===o?o:null},r=(o,i=0)=>{const s=n(o);if(s){const{parentCompositeFiber:l}=et(s);if(!l)return;t.push({element:s,depth:i,name:ge(l.type)??"Unknown",fiber:l})}for(const l of Array.from(o.children))r(l,s?i+1:i)};return r(e),t},Ho=e=>{try{if(e===null)return"null";if(e===void 0)return"undefined";if(wt(e))return"Promise";if(typeof e=="function"){const t=e.toString();try{return t.replace(/\s+/g," ").replace(/{\s+/g,`{
  `).replace(/;\s+/g,`;
  `).replace(/}\s*$/g,`
}`).replace(/\(\s+/g,"(").replace(/\s+\)/g,")").replace(/,\s+/g,", ")}catch{return t}}switch(!0){case e instanceof Date:return e.toISOString();case e instanceof RegExp:return e.toString();case e instanceof Error:return`${e.name}: ${e.message}`;case e instanceof Map:return JSON.stringify(Array.from(e.entries()),null,2);case e instanceof Set:return JSON.stringify(Array.from(e),null,2);case e instanceof DataView:return JSON.stringify(Array.from(new Uint8Array(e.buffer)),null,2);case e instanceof ArrayBuffer:return JSON.stringify(Array.from(new Uint8Array(e)),null,2);case(ArrayBuffer.isView(e)&&"length"in e):return JSON.stringify(Array.from(e),null,2);case Array.isArray(e):return JSON.stringify(e,null,2);case typeof e=="object":return JSON.stringify(e,null,2);default:return String(e)}}catch{return String(e)}},dc=(e,t)=>{try{return typeof e!="function"||typeof t!="function"?!1:e.toString()===t.toString()}catch{return!1}},ci=(e,t,n=[],r=new WeakSet)=>{if(e===t)return{type:"primitive",changes:[],hasDeepChanges:!1};if(typeof e=="function"&&typeof t=="function"){const d=dc(e,t);return{type:"primitive",changes:[{path:n,prevValue:e,currentValue:t,sameFunction:d}],hasDeepChanges:!d}}if(e===null||t===null||e===void 0||t===void 0||typeof e!="object"||typeof t!="object")return{type:"primitive",changes:[{path:n,prevValue:e,currentValue:t}],hasDeepChanges:!0};if(r.has(e)||r.has(t))return{type:"object",changes:[{path:n,prevValue:"[Circular]",currentValue:"[Circular]"}],hasDeepChanges:!1};r.add(e),r.add(t);const o=e,i=t,s=new Set([...Object.keys(o),...Object.keys(i)]),l=[];let c=!1;for(const d of s){const p=o[d],u=i[d];if(p!==u)if(typeof p=="object"&&typeof u=="object"&&p!==null&&u!==null){const h=ci(p,u,[...n,d],r);l.push(...h.changes),h.hasDeepChanges&&(c=!0)}else l.push({path:[...n,d],prevValue:p,currentValue:u}),c=!0}return{type:"object",changes:l,hasDeepChanges:c}},Ee=e=>e.length===0?"":e.reduce((t,n,r)=>/^\d+$/.test(n)?`${t}[${n}]`:r===0?n:`${t}.${n}`,"");function uc(e){const t=e.replace(/\s+/g," ").trim(),n=[];let r="";for(let m=0;m<t.length;m++){const b=t[m];if(b==="="&&t[m+1]===">"){r.trim()&&n.push(r.trim()),n.push("=>"),r="",m++;continue}/[(){}[\];,<>:\?!]/.test(b)?(r.trim()&&n.push(r.trim()),n.push(b),r=""):/\s/.test(b)?(r.trim()&&n.push(r.trim()),r=""):r+=b}r.trim()&&n.push(r.trim());const o=[];for(let m=0;m<n.length;m++){const b=n[m],C=n[m+1];b==="("&&C===")"||b==="["&&C==="]"||b==="{"&&C==="}"||b==="<"&&C===">"?(o.push(b+C),m++):o.push(b)}const i=new Set,s=new Set;function l(m,b,C){let S=0;for(let T=C;T<o.length;T++){const I=o[T];if(I===m)S++;else if(I===b&&(S--,S===0))return T}return-1}for(let m=0;m<o.length;m++)if(o[m]==="("){const C=l("(",")",m);if(C!==-1&&o[C+1]==="=>")for(let S=m;S<=C;S++)i.add(S)}for(let m=1;m<o.length;m++){const b=o[m-1],C=o[m];if(/^[a-zA-Z0-9_$]+$/.test(b)&&C==="<"){const S=l("<",">",m);if(S!==-1)for(let T=m;T<=S;T++)s.add(T)}}let c=0;const d="  ",p=[];let u="";function h(){u.trim()&&p.push(u.replace(/\s+$/,"")),u=""}function f(){h(),u=d.repeat(c)}const v=[];function x(){return v.length?v[v.length-1]:null}function y(m,b=!1){u.trim()?b||/^[),;:\].}>]$/.test(m)?u+=m:u+=` ${m}`:u+=m}for(let m=0;m<o.length;m++){const b=o[m],C=o[m+1]||"";if(["(","{","[","<"].includes(b)){if(y(b),v.push(b),b==="{")c++,f();else if((b==="("||b==="["||b==="<")&&!(i.has(m)&&b==="("||s.has(m)&&b==="<")){const S={"(":")","[":"]","<":">"}[b];C!==S&&C!=="()"&&C!=="[]"&&C!=="<>"&&(c++,f())}}else if([")","}","]",">"].includes(b)){const S=x();b===")"&&S==="("||b==="]"&&S==="["||b===">"&&S==="<"?!(i.has(m)&&b===")")&&!(s.has(m)&&b===">")&&(c=Math.max(c-1,0),f()):b==="}"&&S==="{"&&(c=Math.max(c-1,0),f()),v.pop(),y(b),b==="}"&&f()}else if(/^\(\)|\[\]|\{\}|\<\>$/.test(b))y(b);else if(b==="=>")y(b);else if(b===";")y(b,!0),f();else if(b===","){y(b,!0);const S=x();!(i.has(m)&&S==="(")&&!(s.has(m)&&S==="<")&&S&&["{","[","(","<"].includes(S)&&f()}else y(b)}return h(),p.join(`
`).replace(/\n\s*\n+/g,`
`).trim()}var _r=(e,t=!1)=>{try{const n=e.toString(),r=n.match(/(?:function\s*)?(?:\(([^)]*)\)|([^=>\s]+))\s*=>?/);if(!r)return"ƒ";const i=(r[1]||r[2]||"").replace(/\s+/g,"");return t?uc(n):`ƒ (${i}) => ...`}catch{return"ƒ"}},_n=e=>{if(e===null)return"null";if(e===void 0)return"undefined";if(typeof e=="string")return`"${e.length>150?`${e.slice(0,20)}...`:e}"`;if(typeof e=="number"||typeof e=="boolean")return String(e);if(typeof e=="function")return _r(e);if(Array.isArray(e))return`Array(${e.length})`;if(e instanceof Map)return`Map(${e.size})`;if(e instanceof Set)return`Set(${e.size})`;if(e instanceof Date)return e.toISOString();if(e instanceof RegExp)return e.toString();if(e instanceof Error)return`${e.name}: ${e.message}`;if(typeof e=="object"){const t=Object.keys(e);return`{${t.length>2?`${t.slice(0,2).join(", ")}, ...`:t.join(", ")}}`}return String(e)},pc=e=>{if(e==null)return{value:e};if(typeof e=="function")return{value:e};if(typeof e!="object")return{value:e};if(e instanceof Promise)return{value:"Promise"};try{const t=Object.getPrototypeOf(e);return t===Promise.prototype||t?.constructor?.name==="Promise"?{value:"Promise"}:{value:e}}catch{return{value:null,error:"Error accessing value"}}},wt=e=>!!e&&(e instanceof Promise||typeof e=="object"&&"then"in e),hc=e=>{const t=Ze(e);return{displayName:ge(e)||"Unknown",type:e.type,key:e.key,id:e.index,selfTime:t?.selfTime??null,totalTime:t?.totalTime??null}},Zr=new Map,di=new Map,Qr=new Map,Cr=null,fc=/\[(?<name>\w+),\s*set\w+\]/g,mc=e=>{const t=e.type?.toString?.()||"";return t?Array.from(t.matchAll(fc),n=>n.groups?.name??""):[]},gc=()=>{Zr.clear(),di.clear(),Qr.clear(),Cr=null},vc=e=>{const t=e.type!==Cr;return Cr=e.type,t},Xn=(e,t,n,r)=>{const o=e.get(t),i=e===Zr||e===Qr,s=!Xe(n,r);if(!o)return e.set(t,{count:s&&i?1:0,currentValue:n,previousValue:r,lastUpdated:Date.now()}),{hasChanged:s,count:s&&i?1:i?0:1};if(!Xe(o.currentValue,n)){const l=o.count+1;return e.set(t,{count:l,currentValue:n,previousValue:o.currentValue,lastUpdated:Date.now()}),{hasChanged:!0,count:l}}return{hasChanged:!1,count:o.count}},Uo=e=>{if(!e)return{};if(e.tag===zn||e.tag===An||e.tag===Yt||e.tag===Vt){let t=e.memoizedState;const n={};let r=0;for(;t;)t.queue&&t.memoizedState!==void 0&&(n[r]=t.memoizedState),t=t.next,r++;return n}return e.tag===at?e.memoizedState||{}:{}},eo=e=>{const t=e.memoizedProps||{},n=e.alternate?.memoizedProps||{},r={},o={},i=Object.keys(t);for(const l of i)l in t&&(r[l]=t[l],o[l]=n[l]);const s=li(e).map(l=>({name:l.name,value:l.value,prevValue:l.prevValue}));return{current:r,prev:o,changes:s}},to=e=>{const t=Uo(e),n=e.alternate?Uo(e.alternate):{},r=[];for(const[o,i]of Object.entries(t)){const s=e.tag===at?o:Number(o);e.alternate&&!Xe(n[o],i)&&r.push({name:s,value:i,prevValue:n[o]})}return{current:t,prev:n,changes:r}},no=e=>{const t=Yo(e),n=e.alternate?Yo(e.alternate):new Map,r={},o={},i=[],s=new Set;for(const[l,c]of t){const d=c.displayName,p=l;if(s.has(p))continue;s.add(p),r[d]=c.value;const u=n.get(l);u&&(o[d]=u.value,Xe(u.value,c.value)||i.push({name:d,value:c.value,prevValue:u.value,contextType:l}))}return{current:r,prev:o,changes:i}},wc=e=>{const t=()=>({current:[],changes:new Set,changesCounts:new Map});if(!e)return{data:{fiberProps:t(),fiberState:t(),fiberContext:t()},shouldUpdate:!1};let n=!1;const r=vc(e),o=t();if(e.memoizedProps){const{current:u,changes:h}=eo(e);for(const[f,v]of Object.entries(u))o.current.push({name:f,value:wt(v)?{type:"promise",displayValue:"Promise"}:v});for(const f of h){const{hasChanged:v,count:x}=Xn(Zr,f.name,f.value,f.prevValue);v&&(n=!0,o.changes.add(f.name),o.changesCounts.set(f.name,x))}}const i=t(),{current:s,changes:l}=to(e);for(const[u,h]of Object.entries(s)){const f=e.tag===at?u:Number(u);i.current.push({name:f,value:h})}for(const u of l){const{hasChanged:h,count:f}=Xn(di,u.name,u.value,u.prevValue);h&&(n=!0,i.changes.add(u.name),i.changesCounts.set(u.name,f))}const c=t(),{current:d,changes:p}=no(e);for(const[u,h]of Object.entries(d))c.current.push({name:u,value:h});if(!r)for(const u of p){const{hasChanged:h,count:f}=Xn(Qr,u.name,u.value,u.prevValue);h&&(n=!0,c.changes.add(u.name),c.changesCounts.set(u.name,f))}return!n&&!r&&(o.changes.clear(),i.changes.clear(),c.changes.clear()),{data:{fiberProps:o,fiberState:i,fiberContext:c},shouldUpdate:n||r}},Vo=new WeakMap,Yo=e=>{if(!e)return new Map;const t=Vo.get(e);if(t)return t;const n=new Map;let r=e;for(;r;){const o=r.dependencies;if(o?.firstContext){let i=o.firstContext;for(;i;){const s=i.memoizedValue,l=i.context?.displayName;if(n.has(s)||n.set(i.context,{value:s,displayName:l??"UnnamedContext",contextType:null}),i===i.next)break;i=i.next}}r=r.return}return Vo.set(e,n),n},Bo=e=>{const t=()=>({current:[],changes:new Set,changesCounts:new Map});if(!e)return{fiberProps:t(),fiberState:t(),fiberContext:t()};const n=t();if(e.memoizedProps){const{current:l,changes:c}=eo(e);for(const[d,p]of Object.entries(l))n.current.push({name:d,value:wt(p)?{type:"promise",displayValue:"Promise"}:p});for(const d of c)n.changes.add(d.name),n.changesCounts.set(d.name,1)}const r=t();if(e.memoizedState){const{current:l,changes:c}=to(e);for(const[d,p]of Object.entries(l))r.current.push({name:d,value:wt(p)?{type:"promise",displayValue:"Promise"}:p});for(const d of c)r.changes.add(d.name),r.changesCounts.set(d.name,1)}const o=t(),{current:i,changes:s}=no(e);for(const[l,c]of Object.entries(i))o.current.push({name:l,value:wt(c)?{type:"promise",displayValue:"Promise"}:c});for(const l of s)o.changes.add(l.name),o.changesCounts.set(l.name,1);return{fiberProps:n,fiberState:r,fiberContext:o}},Sr=0,Xo=performance.now(),qn=0,qo=!1,ui=()=>{qn++;const e=performance.now();e-Xo>=1e3&&(Sr=qn,qn=0,Xo=e),requestAnimationFrame(ui)},pi=()=>(qo||(qo=!0,ui(),Sr=60),Sr),bc=e=>{if(!e)return[];const t=[];if(e.tag===zn||e.tag===An||e.tag===Yt||e.tag===Vt){let n=e.memoizedState,r=e.alternate?.memoizedState,o=0;for(;n;){if(n.queue&&n.memoizedState!==void 0){const i={type:2,name:o.toString(),value:n.memoizedState,prevValue:r?.memoizedState};Xe(i.prevValue,i.value)||t.push(i)}n=n.next,r=r?.next,o++}return t}if(e.tag===at){const n={type:3,name:"state",value:e.memoizedState,prevValue:e.alternate?.memoizedState};return Xe(n.prevValue,n.value)||t.push(n),t}return t},Gn=0,Go=new WeakMap,xc=e=>{const t=Go.get(e);return t||(Gn++,Go.set(e,Gn),Gn)};function yc(e,t){if(!e||!t)return;const n=e.memoizedValue,r={type:4,name:e.context.displayName??"Context.Provider",value:n,contextType:xc(e.context)};this.push(r)}var kc=e=>{const t=[];return rs(e,yc.bind(t)),t},hi=new Map,Jo=!1,Jn=()=>Array.from(hi.values()),_c=16,Tr=new WeakMap;function fi(e){return String(Be(e))}function mi(e){const t=fi(e),n=Tr.get(it(e));if(n)return n.get(t)}function Cc(e,t){const n=it(e.type),r=fi(e);let o=Tr.get(n);o||(o=new Map,Tr.set(n,o)),o.set(r,t)}var Sc=(e,t,n,r,o)=>{const i=Date.now(),s=mi(e);if((r||o)&&(!s||i-(s.lastRenderTimestamp||0)>_c)){const l=s||{selfTime:0,totalTime:0,renderCount:0,lastRenderTimestamp:i};l.renderCount=(l.renderCount||0)+1,l.selfTime=t||0,l.totalTime=n||0,l.lastRenderTimestamp=i,Cc(e,{...l})}},Tc=(e,t)=>{const n={isPaused:de(!X.options.value.enabled),fiberRoots:new WeakSet};return hi.set(e,{key:e,config:t,instrumentation:n}),Jo||(Jo=!0,us({name:"react-scan",onActive:t.onActive,onCommitFiberRoot(r,o){n.fiberRoots.add(o);const i=Jn();for(const s of i)s.config.onCommitStart();ds(o.current,(s,l)=>{const c=it(s.type);if(!c)return null;const d=Jn(),p=[];for(let b=0,C=d.length;b<C;b++)d[b].config.isValidFiber(s)&&p.push(b);if(!p.length)return null;const u=[];if(d.some(b=>b.config.trackChanges)){const b=eo(s).changes,C=to(s).changes,S=no(s).changes;u.push.apply(null,b.map(T=>({type:1,name:T.name,value:T.value})));for(const T of C)s.tag===at?u.push({type:3,name:T.name.toString(),value:T.value}):u.push({type:2,name:T.name.toString(),value:T.value});u.push.apply(null,S.map(T=>({type:4,name:T.name,value:T.value,contextType:Number(T.contextType)})))}const{selfTime:h,totalTime:f}=Ze(s),v=pi(),x={phase:Xs[l],componentName:ge(c),count:1,changes:u,time:h,forget:$t(s),unnecessary:null,didCommit:Fr(s),fps:v},y=u.length>0,m=os(s).length>0;l==="update"&&Sc(s,h,f,y,m);for(let b=0,C=p.length;b<C;b++){const S=p[b];d[S].config.onRender(s,[x])}});for(const s of i)s.config.onCommitFinish()},onPostCommitFiberRoot(){const r=Jn();for(const o of r)o.config.onPostCommitFiberRoot()}})),n},Nc=e=>{const t=new Map;for(let n=0,r=e.length;n<r;n++){const o=e[n];if(!o.componentName)continue;const i=t.get(o.componentName)??[],s=Ys([{aggregatedCount:1,computedKey:null,name:o.componentName,frame:null,...o,changes:{type:o.changes.reduce((d,p)=>d|p.type,0),unstable:o.changes.some(d=>d.unstable)},phase:o.phase,computedCurrent:null}]);if(!s)continue;let l=null,c=null;if(o.changes)for(let d=0,p=o.changes.length;d<p;d++){const{name:u,prevValue:h,nextValue:f,unstable:v,type:x}=o.changes[d];x===1?(l??={},c??={},l[`${v?"⚠️":""}${u} (prev)`]=h,c[`${v?"⚠️":""}${u} (next)`]=f):i.push({prev:h,next:f,type:x===4?"context":"state",unstable:v??!1})}l&&c&&i.push({prev:l,next:c,type:"props",unstable:!1}),t.set(s,i)}for(const[n,r]of Array.from(t.entries())){console.group(`%c${n}`,"background: hsla(0,0%,70%,.3); border-radius:3px; padding: 0 2px;");for(const{type:o,prev:i,next:s,unstable:l}of r)console.log(`${o}:`,l?"⚠️":"",i,"!==",s);console.groupEnd()}},Ec=()=>{if(window.hideIntro){window.hideIntro=void 0;return}console.log("%c[·] %cReact Scan","font-weight:bold;color:#7a68e8;font-size:20px;","font-weight:bold;font-size:14px;"),console.log("Try React Scan Monitoring to target performance issues in production: https://react-scan.com/monitoring")},Ko=7,zc="Menlo,Consolas,Monaco,Liberation Mono,Lucida Console,monospace",Ac=.1,en=(e,t)=>Math.floor(e+(t-e)*Ac),Ic=4,Cn=40,Kn=45,Zn="115,97,230";function Mc(e,t){return t[0]-e[0]}function Fc(e){return[...e.entries()].sort(Mc)}function Zo([e,t]){let n=`${t.slice(0,Ic).join(", ")} ×${e}`;return n.length>Cn&&(n=`${n.slice(0,Cn)}…`),n}var Qo=e=>{const t=new Map;for(const{name:i,count:s}of e)t.set(i,(t.get(i)||0)+s);const n=new Map;for(const[i,s]of t){const l=n.get(s);l?l.push(i):n.set(s,[i])}const r=Fc(n);let o=Zo(r[0]);for(let i=1,s=r.length;i<s;i++)o+=", "+Zo(r[i]);return o.length>Cn?`${o.slice(0,Cn)}…`:o},ea=e=>{let t=0;for(const n of e)t+=n.width*n.height;return t},Rc=(e,t)=>{for(const{id:n,name:r,count:o,x:i,y:s,width:l,height:c,didCommit:d}of t){const p={id:n,name:r,count:o,x:i,y:s,width:l,height:c,frame:0,targetX:i,targetY:s,targetWidth:l,targetHeight:c,didCommit:d},u=String(p.id),h=e.get(u);h?(h.count++,h.frame=0,h.targetX=i,h.targetY=s,h.targetWidth=l,h.targetHeight=c,h.didCommit=d):e.set(u,p)}},$c=(e,t,n)=>{for(const r of e.values()){const o=r.x-t,i=r.y-n;r.targetX=o,r.targetY=i}},Dc=(e,t)=>{const n=e.getContext("2d",{alpha:!0});return n&&n.scale(t,t),n},Pc=(e,t,n,r)=>{e.clearRect(0,0,t.width/n,t.height/n);const o=new Map,i=new Map;for(const c of r.values()){const{x:d,y:p,width:u,height:h,targetX:f,targetY:v,targetWidth:x,targetHeight:y,frame:m}=c;f!==d&&(c.x=en(d,f)),v!==p&&(c.y=en(p,v)),x!==u&&(c.width=en(u,x)),y!==h&&(c.height=en(h,y));const b=`${f??d},${v??p}`,C=`${b},${x??u},${y??h}`,S=o.get(b);S?S.push(c):o.set(b,[c]);const T=1-m/Kn;c.frame++;const I=i.get(C)||{x:d,y:p,width:u,height:h,alpha:T};T>I.alpha&&(I.alpha=T),i.set(C,I)}for(const{x:c,y:d,width:p,height:u,alpha:h}of i.values())e.strokeStyle=`rgba(${Zn},${h})`,e.lineWidth=1,e.beginPath(),e.rect(c,d,p,u),e.stroke(),e.fillStyle=`rgba(${Zn},${h*.1})`,e.fill();e.font=`11px ${zc}`;const s=new Map;e.textRendering="optimizeSpeed";for(const c of o.values()){const d=c[0],{x:p,y:u,frame:h}=d,f=1-h/Kn,v=Qo(c),{width:x}=e.measureText(v);if(s.set(`${p},${u},${x},${v}`,{text:v,width:x,height:11,alpha:f,x:p,y:u,outlines:c}),h>Kn)for(const m of c)r.delete(String(m.id))}const l=Array.from(s.entries()).sort(([c,d],[p,u])=>ea(u.outlines)-ea(d.outlines));for(const[c,d]of l)if(s.has(c))for(const[p,u]of s.entries()){if(c===p)continue;const{x:h,y:f,width:v,height:x}=d,{x:y,y:m,width:b,height:C}=u;h+v>y&&y+b>h&&f+x>m&&m+C>f&&(d.text=Qo(d.outlines.concat(u.outlines)),d.width=e.measureText(d.text).width,s.delete(p))}for(const c of s.values()){const{x:d,y:p,alpha:u,width:h,height:f,text:v}=c;let x=p-f-4;x<0&&(x=0),e.fillStyle=`rgba(${Zn},${u})`,e.fillRect(d,x,h+4,f+4),e.fillStyle=`rgba(255,255,255,${u})`,e.fillText(v,d+2,x+f)}return r.size>0},Oc='"use strict";(()=>{var D="Menlo,Consolas,Monaco,Liberation Mono,Lucida Console,monospace";var M=(t,i)=>Math.floor(t+(i-t)*.1);var _="115,97,230";function F(t,i){return i[0]-t[0]}function I(t){return[...t.entries()].sort(F)}function $([t,i]){let o=`${i.slice(0,4).join(", ")} \\xD7${t}`;return o.length>40&&(o=`${o.slice(0,40)}\\u2026`),o}var S=t=>{let i=new Map;for(let{name:e,count:u}of t)i.set(e,(i.get(e)||0)+u);let o=new Map;for(let[e,u]of i){let A=o.get(u);A?A.push(e):o.set(u,[e])}let h=I(o),s=$(h[0]);for(let e=1,u=h.length;e<u;e++)s+=", "+$(h[e]);return s.length>40?`${s.slice(0,40)}\\u2026`:s},X=t=>{let i=0;for(let o of t)i+=o.width*o.height;return i};var N=(t,i)=>{let o=t.getContext("2d",{alpha:!0});return o&&o.scale(i,i),o},Y=(t,i,o,h)=>{t.clearRect(0,0,i.width/o,i.height/o);let s=new Map,e=new Map;for(let n of h.values()){let{x:r,y:c,width:a,height:g,targetX:l,targetY:d,targetWidth:f,targetHeight:p,frame:O}=n;l!==r&&(n.x=M(r,l)),d!==c&&(n.y=M(c,d)),f!==a&&(n.width=M(a,f)),p!==g&&(n.height=M(g,p));let w=`${l??r},${d??c}`,y=`${w},${f??a},${p??g}`,v=s.get(w);v?v.push(n):s.set(w,[n]);let E=1-O/45;n.frame++;let x=e.get(y)||{x:r,y:c,width:a,height:g,alpha:E};E>x.alpha&&(x.alpha=E),e.set(y,x)}for(let{x:n,y:r,width:c,height:a,alpha:g}of e.values())t.strokeStyle=`rgba(${_},${g})`,t.lineWidth=1,t.beginPath(),t.rect(n,r,c,a),t.stroke(),t.fillStyle=`rgba(${_},${g*.1})`,t.fill();t.font=`11px ${D}`;let u=new Map;t.textRendering="optimizeSpeed";for(let n of s.values()){let r=n[0],{x:c,y:a,frame:g}=r,l=1-g/45,d=S(n),{width:f}=t.measureText(d),p=11;u.set(`${c},${a},${f},${d}`,{text:d,width:f,height:p,alpha:l,x:c,y:a,outlines:n});let O=a-p-4;if(O<0&&(O=0),g>45)for(let w of n)h.delete(String(w.id))}let A=Array.from(u.entries()).sort(([n,r],[c,a])=>X(a.outlines)-X(r.outlines));for(let[n,r]of A)if(u.has(n))for(let[c,a]of u.entries()){if(n===c)continue;let{x:g,y:l,width:d,height:f}=r,{x:p,y:O,width:w,height:y}=a;g+d>p&&p+w>g&&l+f>O&&O+y>l&&(r.text=S(r.outlines.concat(a.outlines)),r.width=t.measureText(r.text).width,u.delete(c))}for(let n of u.values()){let{x:r,y:c,alpha:a,width:g,height:l,text:d}=n,f=c-l-4;f<0&&(f=0),t.fillStyle=`rgba(${_},${a})`,t.fillRect(r,f,g+4,l+4),t.fillStyle=`rgba(255,255,255,${a})`,t.fillText(d,r+2,f+l)}return h.size>0};var m=null,L=null,b=1,T=new Map,C=null,R=()=>{if(!L||!m)return;Y(L,m,b,T)?C=requestAnimationFrame(R):C=null};self.onmessage=t=>{let{type:i}=t.data;if(i==="init"&&(m=t.data.canvas,b=t.data.dpr,m&&(m.width=t.data.width,m.height=t.data.height,L=N(m,b))),!(!m||!L)){if(i==="resize"){b=t.data.dpr,m.width=t.data.width*b,m.height=t.data.height*b,L.resetTransform(),L.scale(b,b),R();return}if(i==="draw-outlines"){let{data:o,names:h}=t.data,s=new Float32Array(o);for(let e=0;e<s.length;e+=7){let u=s[e+2],A=s[e+3],n=s[e+4],r=s[e+5],c=s[e+6],a={id:s[e],name:h[e/7],count:s[e+1],x:u,y:A,width:n,height:r,frame:0,targetX:u,targetY:A,targetWidth:n,targetHeight:r,didCommit:c},g=String(a.id),l=T.get(g);l?(l.count++,l.frame=0,l.targetX=u,l.targetY=A,l.targetWidth=n,l.targetHeight=r,l.didCommit=c):T.set(g,a)}C||(C=requestAnimationFrame(R));return}if(i==="scroll"){let{deltaX:o,deltaY:h}=t.data;for(let s of T.values()){let e=s.x-o,u=s.y-h;s.targetX=e,s.targetY=u}}}};})();\n',$e=null,Sn=null,tt=null,Te=1,Tn=null,ro=new Map,Mt=new Map,ft=new Set,Lc=e=>{if(!Mn(e))return;const t=typeof e.type=="string"?e.type:ge(e);if(!t)return;const n=Mt.get(e),r=as(e),o=Fr(e);n?n.count++:(Mt.set(e,{name:t,count:1,elements:r.map(i=>i.stateNode),didCommit:o?1:0}),ft.add(e))},jc=e=>{const t=e[0];if(e.length===1)return t;let n,r,o,i;for(let s=0,l=e.length;s<l;s++){const c=e[s];n=n==null?c.x:Math.min(n,c.x),r=r==null?c.y:Math.min(r,c.y),o=o==null?c.x+c.width:Math.max(o,c.x+c.width),i=i==null?c.y+c.height:Math.max(i,c.y+c.height)}return n==null||r==null||o==null||i==null?e[0]:new DOMRect(n,r,o-n,i-r)};function Wc(e,t){const n=[];for(const r of e){const o=r.target;this.seenElements.has(o)||(this.seenElements.add(o),n.push(r))}n.length>0&&this.resolveNext&&(this.resolveNext(n),this.resolveNext=null),this.seenElements.size===this.uniqueElements.size&&(t.disconnect(),this.done=!0,this.resolveNext&&this.resolveNext([]))}var gi=async function*(e){const t={uniqueElements:new Set(e),seenElements:new Set,resolveNext:null,done:!1},n=new IntersectionObserver(Wc.bind(t));for(const r of t.uniqueElements)n.observe(r);for(;!t.done;){const r=await new Promise(o=>{t.resolveNext=o});r.length>0&&(yield r)}},Hc=typeof SharedArrayBuffer<"u"?SharedArrayBuffer:ArrayBuffer,Uc=async()=>{const e=[];for(const n of ft){const r=Mt.get(n);if(r)for(let o=0;o<r.elements.length;o++)r.elements[o]instanceof Element&&e.push(r.elements[o])}const t=new Map;for await(const n of gi(e)){for(const s of n){const l=s.target,c=s.intersectionRect;s.isIntersecting&&c.width&&c.height&&t.set(l,c)}const r=[],o=[],i=[];for(const s of ft){const l=Mt.get(s);if(!l)continue;const c=[];for(let d=0;d<l.elements.length;d++){const p=l.elements[d],u=t.get(p);u&&c.push(u)}c.length&&(r.push(l),o.push(jc(c)),i.push(Be(s)))}if(r.length>0){const s=new Hc(r.length*Ko*4),l=new Float32Array(s),c=new Array(r.length);let d;for(let p=0,u=r.length;p<u;p++){const h=r[p],f=i[p],{x:v,y:x,width:y,height:m}=o[p],{count:b,name:C,didCommit:S}=h;if($e){const T=p*Ko;l[T]=f,l[T+1]=b,l[T+2]=v,l[T+3]=x,l[T+4]=y,l[T+5]=m,l[T+6]=S,c[p]=C}else d||=new Array(r.length),d[p]={id:f,name:C,count:b,x:v,y:x,width:y,height:m,didCommit:S}}$e?$e.postMessage({type:"draw-outlines",data:s,names:c}):Sn&&tt&&d&&(Rc(ro,d),Tn||(Tn=requestAnimationFrame(oo)))}}for(const n of ft)Mt.delete(n),ft.delete(n)},oo=()=>{if(!tt||!Sn)return;Pc(tt,Sn,Te,ro)?Tn=requestAnimationFrame(oo):Tn=null},Vc=typeof OffscreenCanvas<"u"&&typeof Worker<"u",ta=()=>Math.min(window.devicePixelRatio||1,2),Yc=()=>{Bc();const e=document.createElement("div");e.setAttribute("data-react-scan","true");const t=e.attachShadow({mode:"open"}),n=document.createElement("canvas");if(n.style.position="fixed",n.style.top="0",n.style.left="0",n.style.pointerEvents="none",n.style.zIndex="2147483646",n.setAttribute("aria-hidden","true"),t.appendChild(n),!n)return null;Te=ta(),Sn=n;const{innerWidth:r,innerHeight:o}=window;n.style.width=`${r}px`,n.style.height=`${o}px`;const i=r*Te,s=o*Te;if(n.width=i,n.height=s,Vc&&!window.__REACT_SCAN_EXTENSION__)try{$e=new Worker(URL.createObjectURL(new Blob([Oc],{type:"application/javascript"})));const u=n.transferControlToOffscreen();$e?.postMessage({type:"init",canvas:u,width:n.width,height:n.height,dpr:Te},[u])}catch(u){console.warn("Failed to initialize OffscreenCanvas worker:",u)}$e||(tt=Dc(n,Te));let l=!1;window.addEventListener("resize",()=>{l||(l=!0,setTimeout(()=>{const u=window.innerWidth,h=window.innerHeight;Te=ta(),n.style.width=`${u}px`,n.style.height=`${h}px`,$e?$e.postMessage({type:"resize",width:u,height:h,dpr:Te}):(n.width=u*Te,n.height=h*Te,tt&&(tt.resetTransform(),tt.scale(Te,Te)),oo()),l=!1}))});let c=window.scrollX,d=window.scrollY,p=!1;return window.addEventListener("scroll",()=>{p||(p=!0,setTimeout(()=>{const{scrollX:u,scrollY:h}=window,f=u-c,v=h-d;c=u,d=h,$e?$e.postMessage({type:"scroll",deltaX:f,deltaY:v}):requestAnimationFrame($c.bind(null,ro,f,v)),p=!1},32))}),setInterval(()=>{ft.size&&requestAnimationFrame(Uc)},32),t.appendChild(n),e},na=()=>globalThis.__REACT_SCAN_STOP__,Bc=()=>{const e=document.querySelector("[data-react-scan]");e&&e.remove()},Xc=e=>{if(Mn(e)&&X.options.value.showToolbar!==!1&&E.inspectState.value.kind==="focused"){const t=e,{selfTime:n}=Ze(e),r=ge(e.type),o=Be(t),i=E.reportData.get(o),s=i?.count??0,l=i?.time??0,c=[],d=E.changesListeners.get(Be(e));if(d?.length){const u=li(e).map(x=>({type:1,name:x.name,value:x.value,prevValue:x.prevValue,unstable:!1})),h=bc(e),v=kc(e).map(x=>({name:x.name,type:4,value:x.value,contextType:x.contextType}));d.forEach(x=>{x({propsChanges:u,stateChanges:h,contextChanges:v})})}const p={count:s+1,time:l+n||0,renders:[],displayName:r,type:it(e.type)||null,changes:c};E.reportData.set(o,p),Nr=!0}},Nr=!1,ra,qc=()=>{clearInterval(ra),ra=setInterval(()=>{Nr&&(E.lastReportTime.value=Date.now(),Nr=!1)},50)},Gc=e=>!Lu.has(e.memoizedProps),Jc=e=>{if(na())return;let t,n=!1;const r=()=>{n||(t&&cancelAnimationFrame(t),t=requestAnimationFrame(()=>{n=!0;const i=Yc();i&&document.documentElement.appendChild(i),e()}))},o=Tc("react-scan-devtools-0.1.0",{onCommitStart:()=>{X.options.value.onCommitStart?.()},onActive:()=>{na()||(r(),window.__REACT_SCAN_EXTENSION__||(globalThis.__REACT_SCAN__={ReactScanInternals:X}),qc(),Ec())},onError:()=>{},isValidFiber:Gc,onRender:(i,s)=>{Mn(i)&&E.interactionListeningForRenders?.(i,s);const l=X.instrumentation?.isPaused.value,c=E.inspectState.value.kind==="inspect-off"||E.inspectState.value.kind==="uninitialized";l&&c||(l||Lc(i),X.options.value.log&&Nc(s),E.inspectState.value.kind==="focused"&&(Gr.value=Date.now()),c||Xc(i),X.options.value.onRender?.(i,s))},onCommitFinish:()=>{r(),X.options.value.onCommitFinish?.()},onPostCommitFiberRoot(){r()},trackChanges:!1});X.instrumentation=o},Kc=`*, ::before, ::after {
  --tw-border-spacing-x: 0;
  --tw-border-spacing-y: 0;
  --tw-translate-x: 0;
  --tw-translate-y: 0;
  --tw-rotate: 0;
  --tw-skew-x: 0;
  --tw-skew-y: 0;
  --tw-scale-x: 1;
  --tw-scale-y: 1;
  --tw-pan-x:  ;
  --tw-pan-y:  ;
  --tw-pinch-zoom:  ;
  --tw-scroll-snap-strictness: proximity;
  --tw-gradient-from-position:  ;
  --tw-gradient-via-position:  ;
  --tw-gradient-to-position:  ;
  --tw-ordinal:  ;
  --tw-slashed-zero:  ;
  --tw-numeric-figure:  ;
  --tw-numeric-spacing:  ;
  --tw-numeric-fraction:  ;
  --tw-ring-inset:  ;
  --tw-ring-offset-width: 0px;
  --tw-ring-offset-color: #fff;
  --tw-ring-color: rgb(59 130 246 / 0.5);
  --tw-ring-offset-shadow: 0 0 #0000;
  --tw-ring-shadow: 0 0 #0000;
  --tw-shadow: 0 0 #0000;
  --tw-shadow-colored: 0 0 #0000;
  --tw-blur:  ;
  --tw-brightness:  ;
  --tw-contrast:  ;
  --tw-grayscale:  ;
  --tw-hue-rotate:  ;
  --tw-invert:  ;
  --tw-saturate:  ;
  --tw-sepia:  ;
  --tw-drop-shadow:  ;
  --tw-backdrop-blur:  ;
  --tw-backdrop-brightness:  ;
  --tw-backdrop-contrast:  ;
  --tw-backdrop-grayscale:  ;
  --tw-backdrop-hue-rotate:  ;
  --tw-backdrop-invert:  ;
  --tw-backdrop-opacity:  ;
  --tw-backdrop-saturate:  ;
  --tw-backdrop-sepia:  ;
  --tw-contain-size:  ;
  --tw-contain-layout:  ;
  --tw-contain-paint:  ;
  --tw-contain-style:  ;
}

::backdrop {
  --tw-border-spacing-x: 0;
  --tw-border-spacing-y: 0;
  --tw-translate-x: 0;
  --tw-translate-y: 0;
  --tw-rotate: 0;
  --tw-skew-x: 0;
  --tw-skew-y: 0;
  --tw-scale-x: 1;
  --tw-scale-y: 1;
  --tw-pan-x:  ;
  --tw-pan-y:  ;
  --tw-pinch-zoom:  ;
  --tw-scroll-snap-strictness: proximity;
  --tw-gradient-from-position:  ;
  --tw-gradient-via-position:  ;
  --tw-gradient-to-position:  ;
  --tw-ordinal:  ;
  --tw-slashed-zero:  ;
  --tw-numeric-figure:  ;
  --tw-numeric-spacing:  ;
  --tw-numeric-fraction:  ;
  --tw-ring-inset:  ;
  --tw-ring-offset-width: 0px;
  --tw-ring-offset-color: #fff;
  --tw-ring-color: rgb(59 130 246 / 0.5);
  --tw-ring-offset-shadow: 0 0 #0000;
  --tw-ring-shadow: 0 0 #0000;
  --tw-shadow: 0 0 #0000;
  --tw-shadow-colored: 0 0 #0000;
  --tw-blur:  ;
  --tw-brightness:  ;
  --tw-contrast:  ;
  --tw-grayscale:  ;
  --tw-hue-rotate:  ;
  --tw-invert:  ;
  --tw-saturate:  ;
  --tw-sepia:  ;
  --tw-drop-shadow:  ;
  --tw-backdrop-blur:  ;
  --tw-backdrop-brightness:  ;
  --tw-backdrop-contrast:  ;
  --tw-backdrop-grayscale:  ;
  --tw-backdrop-hue-rotate:  ;
  --tw-backdrop-invert:  ;
  --tw-backdrop-opacity:  ;
  --tw-backdrop-saturate:  ;
  --tw-backdrop-sepia:  ;
  --tw-contain-size:  ;
  --tw-contain-layout:  ;
  --tw-contain-paint:  ;
  --tw-contain-style:  ;
}/*
! tailwindcss v3.4.17 | MIT License | https://tailwindcss.com
*//*
1. Prevent padding and border from affecting element width. (https://github.com/mozdevs/cssremedy/issues/4)
2. Allow adding a border to an element by just adding a border-width. (https://github.com/tailwindcss/tailwindcss/pull/116)
*/

*,
::before,
::after {
  box-sizing: border-box; /* 1 */
  border-width: 0; /* 2 */
  border-style: solid; /* 2 */
  border-color: #e5e7eb; /* 2 */
}

::before,
::after {
  --tw-content: '';
}

/*
1. Use a consistent sensible line-height in all browsers.
2. Prevent adjustments of font size after orientation changes in iOS.
3. Use a more readable tab size.
4. Use the user's configured \`sans\` font-family by default.
5. Use the user's configured \`sans\` font-feature-settings by default.
6. Use the user's configured \`sans\` font-variation-settings by default.
7. Disable tap highlights on iOS
*/

html,
:host {
  line-height: 1.5; /* 1 */
  -webkit-text-size-adjust: 100%; /* 2 */
  -moz-tab-size: 4; /* 3 */
  -o-tab-size: 4;
     tab-size: 4; /* 3 */
  font-family: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"; /* 4 */
  font-feature-settings: normal; /* 5 */
  font-variation-settings: normal; /* 6 */
  -webkit-tap-highlight-color: transparent; /* 7 */
}

/*
1. Remove the margin in all browsers.
2. Inherit line-height from \`html\` so users can set them as a class directly on the \`html\` element.
*/

body {
  margin: 0; /* 1 */
  line-height: inherit; /* 2 */
}

/*
1. Add the correct height in Firefox.
2. Correct the inheritance of border color in Firefox. (https://bugzilla.mozilla.org/show_bug.cgi?id=190655)
3. Ensure horizontal rules are visible by default.
*/

hr {
  height: 0; /* 1 */
  color: inherit; /* 2 */
  border-top-width: 1px; /* 3 */
}

/*
Add the correct text decoration in Chrome, Edge, and Safari.
*/

abbr:where([title]) {
  -webkit-text-decoration: underline dotted;
          text-decoration: underline dotted;
}

/*
Remove the default font size and weight for headings.
*/

h1,
h2,
h3,
h4,
h5,
h6 {
  font-size: inherit;
  font-weight: inherit;
}

/*
Reset links to optimize for opt-in styling instead of opt-out.
*/

a {
  color: inherit;
  text-decoration: inherit;
}

/*
Add the correct font weight in Edge and Safari.
*/

b,
strong {
  font-weight: bolder;
}

/*
1. Use the user's configured \`mono\` font-family by default.
2. Use the user's configured \`mono\` font-feature-settings by default.
3. Use the user's configured \`mono\` font-variation-settings by default.
4. Correct the odd \`em\` font sizing in all browsers.
*/

code,
kbd,
samp,
pre {
  font-family: Menlo, Consolas, Monaco, Liberation Mono, Lucida Console, monospace; /* 1 */
  font-feature-settings: normal; /* 2 */
  font-variation-settings: normal; /* 3 */
  font-size: 1em; /* 4 */
}

/*
Add the correct font size in all browsers.
*/

small {
  font-size: 80%;
}

/*
Prevent \`sub\` and \`sup\` elements from affecting the line height in all browsers.
*/

sub,
sup {
  font-size: 75%;
  line-height: 0;
  position: relative;
  vertical-align: baseline;
}

sub {
  bottom: -0.25em;
}

sup {
  top: -0.5em;
}

/*
1. Remove text indentation from table contents in Chrome and Safari. (https://bugs.chromium.org/p/chromium/issues/detail?id=999088, https://bugs.webkit.org/show_bug.cgi?id=201297)
2. Correct table border color inheritance in all Chrome and Safari. (https://bugs.chromium.org/p/chromium/issues/detail?id=935729, https://bugs.webkit.org/show_bug.cgi?id=195016)
3. Remove gaps between table borders by default.
*/

table {
  text-indent: 0; /* 1 */
  border-color: inherit; /* 2 */
  border-collapse: collapse; /* 3 */
}

/*
1. Change the font styles in all browsers.
2. Remove the margin in Firefox and Safari.
3. Remove default padding in all browsers.
*/

button,
input,
optgroup,
select,
textarea {
  font-family: inherit; /* 1 */
  font-feature-settings: inherit; /* 1 */
  font-variation-settings: inherit; /* 1 */
  font-size: 100%; /* 1 */
  font-weight: inherit; /* 1 */
  line-height: inherit; /* 1 */
  letter-spacing: inherit; /* 1 */
  color: inherit; /* 1 */
  margin: 0; /* 2 */
  padding: 0; /* 3 */
}

/*
Remove the inheritance of text transform in Edge and Firefox.
*/

button,
select {
  text-transform: none;
}

/*
1. Correct the inability to style clickable types in iOS and Safari.
2. Remove default button styles.
*/

button,
input:where([type='button']),
input:where([type='reset']),
input:where([type='submit']) {
  -webkit-appearance: button; /* 1 */
  background-color: transparent; /* 2 */
  background-image: none; /* 2 */
}

/*
Use the modern Firefox focus style for all focusable elements.
*/

:-moz-focusring {
  outline: auto;
}

/*
Remove the additional \`:invalid\` styles in Firefox. (https://github.com/mozilla/gecko-dev/blob/2f9eacd9d3d995c937b4251a5557d95d494c9be1/layout/style/res/forms.css#L728-L737)
*/

:-moz-ui-invalid {
  box-shadow: none;
}

/*
Add the correct vertical alignment in Chrome and Firefox.
*/

progress {
  vertical-align: baseline;
}

/*
Correct the cursor style of increment and decrement buttons in Safari.
*/

::-webkit-inner-spin-button,
::-webkit-outer-spin-button {
  height: auto;
}

/*
1. Correct the odd appearance in Chrome and Safari.
2. Correct the outline style in Safari.
*/

[type='search'] {
  -webkit-appearance: textfield; /* 1 */
  outline-offset: -2px; /* 2 */
}

/*
Remove the inner padding in Chrome and Safari on macOS.
*/

::-webkit-search-decoration {
  -webkit-appearance: none;
}

/*
1. Correct the inability to style clickable types in iOS and Safari.
2. Change font properties to \`inherit\` in Safari.
*/

::-webkit-file-upload-button {
  -webkit-appearance: button; /* 1 */
  font: inherit; /* 2 */
}

/*
Add the correct display in Chrome and Safari.
*/

summary {
  display: list-item;
}

/*
Removes the default spacing and border for appropriate elements.
*/

blockquote,
dl,
dd,
h1,
h2,
h3,
h4,
h5,
h6,
hr,
figure,
p,
pre {
  margin: 0;
}

fieldset {
  margin: 0;
  padding: 0;
}

legend {
  padding: 0;
}

ol,
ul,
menu {
  list-style: none;
  margin: 0;
  padding: 0;
}

/*
Reset default styling for dialogs.
*/
dialog {
  padding: 0;
}

/*
Prevent resizing textareas horizontally by default.
*/

textarea {
  resize: vertical;
}

/*
1. Reset the default placeholder opacity in Firefox. (https://github.com/tailwindlabs/tailwindcss/issues/3300)
2. Set the default placeholder color to the user's configured gray 400 color.
*/

input::-moz-placeholder, textarea::-moz-placeholder {
  opacity: 1; /* 1 */
  color: #9ca3af; /* 2 */
}

input::placeholder,
textarea::placeholder {
  opacity: 1; /* 1 */
  color: #9ca3af; /* 2 */
}

/*
Set the default cursor for buttons.
*/

button,
[role="button"] {
  cursor: pointer;
}

/*
Make sure disabled buttons don't get the pointer cursor.
*/
:disabled {
  cursor: default;
}

/*
1. Make replaced elements \`display: block\` by default. (https://github.com/mozdevs/cssremedy/issues/14)
2. Add \`vertical-align: middle\` to align replaced elements more sensibly by default. (https://github.com/jensimmons/cssremedy/issues/14#issuecomment-634934210)
   This can trigger a poorly considered lint error in some tools but is included by design.
*/

img,
svg,
video,
canvas,
audio,
iframe,
embed,
object {
  display: block; /* 1 */
  vertical-align: middle; /* 2 */
}

/*
Constrain images and videos to the parent width and preserve their intrinsic aspect ratio. (https://github.com/mozdevs/cssremedy/issues/14)
*/

img,
video {
  max-width: 100%;
  height: auto;
}

/* Make elements with the HTML hidden attribute stay hidden by default */
[hidden]:where(:not([hidden="until-found"])) {
  display: none;
}
.\\!container {
  width: 100% !important;
}
.container {
  width: 100%;
}
@media (min-width: 640px) {

  .\\!container {
    max-width: 640px !important;
  }

  .container {
    max-width: 640px;
  }
}
@media (min-width: 768px) {

  .\\!container {
    max-width: 768px !important;
  }

  .container {
    max-width: 768px;
  }
}
@media (min-width: 1024px) {

  .\\!container {
    max-width: 1024px !important;
  }

  .container {
    max-width: 1024px;
  }
}
@media (min-width: 1280px) {

  .\\!container {
    max-width: 1280px !important;
  }

  .container {
    max-width: 1280px;
  }
}
@media (min-width: 1536px) {

  .\\!container {
    max-width: 1536px !important;
  }

  .container {
    max-width: 1536px;
  }
}
.pointer-events-none {
  pointer-events: none;
}
.pointer-events-auto {
  pointer-events: auto;
}
.visible {
  visibility: visible;
}
.static {
  position: static;
}
.fixed {
  position: fixed;
}
.absolute {
  position: absolute;
}
.relative {
  position: relative;
}
.sticky {
  position: sticky;
}
.inset-0 {
  inset: 0px;
}
.inset-x-1 {
  left: 4px;
  right: 4px;
}
.inset-y-0 {
  top: 0px;
  bottom: 0px;
}
.-right-1 {
  right: -4px;
}
.-right-2\\.5 {
  right: -10px;
}
.-top-1 {
  top: -4px;
}
.-top-2\\.5 {
  top: -10px;
}
.bottom-0 {
  bottom: 0px;
}
.bottom-4 {
  bottom: 16px;
}
.left-0 {
  left: 0px;
}
.left-3 {
  left: 12px;
}
.right-0 {
  right: 0px;
}
.right-0\\.5 {
  right: 2px;
}
.right-2 {
  right: 8px;
}
.right-4 {
  right: 16px;
}
.top-0 {
  top: 0px;
}
.top-0\\.5 {
  top: 2px;
}
.top-1\\/2 {
  top: 50%;
}
.top-2 {
  top: 8px;
}
.z-10 {
  z-index: 10;
}
.z-100 {
  z-index: 100;
}
.z-50 {
  z-index: 50;
}
.z-\\[124124124124\\] {
  z-index: 124124124124;
}
.z-\\[214748365\\] {
  z-index: 214748365;
}
.z-\\[214748367\\] {
  z-index: 214748367;
}
.m-\\[2px\\] {
  margin: 2px;
}
.mx-0\\.5 {
  margin-left: 2px;
  margin-right: 2px;
}
.\\!ml-0 {
  margin-left: 0px !important;
}
.mb-1\\.5 {
  margin-bottom: 6px;
}
.mb-2 {
  margin-bottom: 8px;
}
.mb-3 {
  margin-bottom: 12px;
}
.mb-4 {
  margin-bottom: 16px;
}
.mb-px {
  margin-bottom: 1px;
}
.ml-1 {
  margin-left: 4px;
}
.ml-1\\.5 {
  margin-left: 6px;
}
.ml-auto {
  margin-left: auto;
}
.mr-0\\.5 {
  margin-right: 2px;
}
.mr-1 {
  margin-right: 4px;
}
.mr-1\\.5 {
  margin-right: 6px;
}
.mr-16 {
  margin-right: 64px;
}
.mr-auto {
  margin-right: auto;
}
.mt-0\\.5 {
  margin-top: 2px;
}
.mt-1 {
  margin-top: 4px;
}
.mt-4 {
  margin-top: 16px;
}
.block {
  display: block;
}
.inline {
  display: inline;
}
.flex {
  display: flex;
}
.table {
  display: table;
}
.hidden {
  display: none;
}
.aspect-square {
  aspect-ratio: 1 / 1;
}
.h-1 {
  height: 4px;
}
.h-1\\.5 {
  height: 6px;
}
.h-10 {
  height: 40px;
}
.h-12 {
  height: 48px;
}
.h-4 {
  height: 16px;
}
.h-4\\/5 {
  height: 80%;
}
.h-6 {
  height: 24px;
}
.h-7 {
  height: 28px;
}
.h-8 {
  height: 32px;
}
.h-\\[150px\\] {
  height: 150px;
}
.h-\\[235px\\] {
  height: 235px;
}
.h-\\[28px\\] {
  height: 28px;
}
.h-\\[48px\\] {
  height: 48px;
}
.h-\\[50px\\] {
  height: 50px;
}
.h-\\[calc\\(100\\%-150px\\)\\] {
  height: calc(100% - 150px);
}
.h-\\[calc\\(100\\%-200px\\)\\] {
  height: calc(100% - 200px);
}
.h-\\[calc\\(100\\%-25px\\)\\] {
  height: calc(100% - 25px);
}
.h-\\[calc\\(100\\%-40px\\)\\] {
  height: calc(100% - 40px);
}
.h-\\[calc\\(100\\%-48px\\)\\] {
  height: calc(100% - 48px);
}
.h-fit {
  height: -moz-fit-content;
  height: fit-content;
}
.h-full {
  height: 100%;
}
.h-screen {
  height: 100vh;
}
.max-h-0 {
  max-height: 0px;
}
.max-h-40 {
  max-height: 160px;
}
.max-h-9 {
  max-height: 36px;
}
.min-h-9 {
  min-height: 36px;
}
.min-h-\\[48px\\] {
  min-height: 48px;
}
.min-h-fit {
  min-height: -moz-fit-content;
  min-height: fit-content;
}
.w-1 {
  width: 4px;
}
.w-1\\/2 {
  width: 50%;
}
.w-1\\/3 {
  width: 33.333333%;
}
.w-2\\/4 {
  width: 50%;
}
.w-3 {
  width: 12px;
}
.w-4 {
  width: 16px;
}
.w-4\\/5 {
  width: 80%;
}
.w-6 {
  width: 24px;
}
.w-80 {
  width: 320px;
}
.w-\\[20px\\] {
  width: 20px;
}
.w-\\[72px\\] {
  width: 72px;
}
.w-\\[90\\%\\] {
  width: 90%;
}
.w-\\[calc\\(100\\%-200px\\)\\] {
  width: calc(100% - 200px);
}
.w-fit {
  width: -moz-fit-content;
  width: fit-content;
}
.w-full {
  width: 100%;
}
.w-px {
  width: 1px;
}
.w-screen {
  width: 100vw;
}
.min-w-0 {
  min-width: 0px;
}
.min-w-\\[200px\\] {
  min-width: 200px;
}
.min-w-fit {
  min-width: -moz-fit-content;
  min-width: fit-content;
}
.max-w-md {
  max-width: 448px;
}
.flex-1 {
  flex: 1 1 0%;
}
.shrink-0 {
  flex-shrink: 0;
}
.grow {
  flex-grow: 1;
}
.-translate-y-1\\/2 {
  --tw-translate-y: -50%;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}
.-translate-y-\\[200\\%\\] {
  --tw-translate-y: -200%;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}
.translate-y-0 {
  --tw-translate-y: 0px;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}
.translate-y-1 {
  --tw-translate-y: 4px;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}
.-rotate-90 {
  --tw-rotate: -90deg;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}
.rotate-0 {
  --tw-rotate: 0deg;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}
.rotate-180 {
  --tw-rotate: 180deg;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}
.rotate-90 {
  --tw-rotate: 90deg;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}
.scale-110 {
  --tw-scale-x: 1.1;
  --tw-scale-y: 1.1;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}
.transform {
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}
@keyframes fadeIn {

  0% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
}
.animate-fade-in {
  animation: fadeIn ease-in forwards;
}
.cursor-default {
  cursor: default;
}
.cursor-e-resize {
  cursor: e-resize;
}
.cursor-ew-resize {
  cursor: ew-resize;
}
.cursor-move {
  cursor: move;
}
.cursor-nesw-resize {
  cursor: nesw-resize;
}
.cursor-ns-resize {
  cursor: ns-resize;
}
.cursor-nwse-resize {
  cursor: nwse-resize;
}
.cursor-pointer {
  cursor: pointer;
}
.cursor-w-resize {
  cursor: w-resize;
}
.select-none {
  -webkit-user-select: none;
     -moz-user-select: none;
          user-select: none;
}
.resize {
  resize: both;
}
.appearance-none {
  -webkit-appearance: none;
     -moz-appearance: none;
          appearance: none;
}
.flex-col {
  flex-direction: column;
}
.items-start {
  align-items: flex-start;
}
.items-end {
  align-items: flex-end;
}
.items-center {
  align-items: center;
}
.items-stretch {
  align-items: stretch;
}
.justify-start {
  justify-content: flex-start;
}
.justify-end {
  justify-content: flex-end;
}
.justify-center {
  justify-content: center;
}
.justify-between {
  justify-content: space-between;
}
.gap-0\\.5 {
  gap: 2px;
}
.gap-1 {
  gap: 4px;
}
.gap-1\\.5 {
  gap: 6px;
}
.gap-2 {
  gap: 8px;
}
.gap-4 {
  gap: 16px;
}
.gap-x-0\\.5 {
  -moz-column-gap: 2px;
       column-gap: 2px;
}
.gap-x-1 {
  -moz-column-gap: 4px;
       column-gap: 4px;
}
.gap-x-1\\.5 {
  -moz-column-gap: 6px;
       column-gap: 6px;
}
.gap-x-2 {
  -moz-column-gap: 8px;
       column-gap: 8px;
}
.gap-x-3 {
  -moz-column-gap: 12px;
       column-gap: 12px;
}
.gap-x-4 {
  -moz-column-gap: 16px;
       column-gap: 16px;
}
.gap-y-0\\.5 {
  row-gap: 2px;
}
.gap-y-1 {
  row-gap: 4px;
}
.gap-y-2 {
  row-gap: 8px;
}
.gap-y-4 {
  row-gap: 16px;
}
.space-y-1\\.5 > :not([hidden]) ~ :not([hidden]) {
  --tw-space-y-reverse: 0;
  margin-top: calc(6px * calc(1 - var(--tw-space-y-reverse)));
  margin-bottom: calc(6px * var(--tw-space-y-reverse));
}
.divide-y > :not([hidden]) ~ :not([hidden]) {
  --tw-divide-y-reverse: 0;
  border-top-width: calc(1px * calc(1 - var(--tw-divide-y-reverse)));
  border-bottom-width: calc(1px * var(--tw-divide-y-reverse));
}
.divide-zinc-800 > :not([hidden]) ~ :not([hidden]) {
  --tw-divide-opacity: 1;
  border-color: rgb(39 39 42 / var(--tw-divide-opacity, 1));
}
.place-self-center {
  place-self: center;
}
.self-end {
  align-self: flex-end;
}
.overflow-auto {
  overflow: auto;
}
.overflow-hidden {
  overflow: hidden;
}
.\\!overflow-visible {
  overflow: visible !important;
}
.overflow-x-auto {
  overflow-x: auto;
}
.overflow-y-auto {
  overflow-y: auto;
}
.overflow-x-hidden {
  overflow-x: hidden;
}
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.whitespace-nowrap {
  white-space: nowrap;
}
.whitespace-pre-wrap {
  white-space: pre-wrap;
}
.text-wrap {
  text-wrap: wrap;
}
.break-words {
  overflow-wrap: break-word;
}
.break-all {
  word-break: break-all;
}
.rounded {
  border-radius: 4px;
}
.rounded-full {
  border-radius: 9999px;
}
.rounded-lg {
  border-radius: 8px;
}
.rounded-md {
  border-radius: 6px;
}
.rounded-sm {
  border-radius: 2px;
}
.rounded-l-md {
  border-top-left-radius: 6px;
  border-bottom-left-radius: 6px;
}
.rounded-l-sm {
  border-top-left-radius: 2px;
  border-bottom-left-radius: 2px;
}
.rounded-r-md {
  border-top-right-radius: 6px;
  border-bottom-right-radius: 6px;
}
.rounded-r-sm {
  border-top-right-radius: 2px;
  border-bottom-right-radius: 2px;
}
.rounded-t-lg {
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}
.rounded-t-sm {
  border-top-left-radius: 2px;
  border-top-right-radius: 2px;
}
.rounded-bl-lg {
  border-bottom-left-radius: 8px;
}
.rounded-br-lg {
  border-bottom-right-radius: 8px;
}
.rounded-tl-lg {
  border-top-left-radius: 8px;
}
.rounded-tr-lg {
  border-top-right-radius: 8px;
}
.border {
  border-width: 1px;
}
.border-4 {
  border-width: 4px;
}
.border-b {
  border-bottom-width: 1px;
}
.border-l {
  border-left-width: 1px;
}
.border-l-0 {
  border-left-width: 0px;
}
.border-l-1 {
  border-left-width: 1px;
}
.border-r {
  border-right-width: 1px;
}
.border-t {
  border-top-width: 1px;
}
.border-none {
  border-style: none;
}
.\\!border-red-500 {
  --tw-border-opacity: 1 !important;
  border-color: rgb(239 68 68 / var(--tw-border-opacity, 1)) !important;
}
.border-\\[\\#1e1e1e\\] {
  --tw-border-opacity: 1;
  border-color: rgb(30 30 30 / var(--tw-border-opacity, 1));
}
.border-\\[\\#222\\] {
  --tw-border-opacity: 1;
  border-color: rgb(34 34 34 / var(--tw-border-opacity, 1));
}
.border-\\[\\#27272A\\] {
  --tw-border-opacity: 1;
  border-color: rgb(39 39 42 / var(--tw-border-opacity, 1));
}
.border-\\[\\#333\\] {
  --tw-border-opacity: 1;
  border-color: rgb(51 51 51 / var(--tw-border-opacity, 1));
}
.border-transparent {
  border-color: transparent;
}
.border-zinc-800 {
  --tw-border-opacity: 1;
  border-color: rgb(39 39 42 / var(--tw-border-opacity, 1));
}
.bg-\\[\\#0A0A0A\\] {
  --tw-bg-opacity: 1;
  background-color: rgb(10 10 10 / var(--tw-bg-opacity, 1));
}
.bg-\\[\\#141414\\] {
  --tw-bg-opacity: 1;
  background-color: rgb(20 20 20 / var(--tw-bg-opacity, 1));
}
.bg-\\[\\#18181B\\] {
  --tw-bg-opacity: 1;
  background-color: rgb(24 24 27 / var(--tw-bg-opacity, 1));
}
.bg-\\[\\#18181B\\]\\/50 {
  background-color: rgb(24 24 27 / 0.5);
}
.bg-\\[\\#1D3A66\\] {
  --tw-bg-opacity: 1;
  background-color: rgb(29 58 102 / var(--tw-bg-opacity, 1));
}
.bg-\\[\\#1E1E1E\\] {
  --tw-bg-opacity: 1;
  background-color: rgb(30 30 30 / var(--tw-bg-opacity, 1));
}
.bg-\\[\\#1a2a1a\\] {
  --tw-bg-opacity: 1;
  background-color: rgb(26 42 26 / var(--tw-bg-opacity, 1));
}
.bg-\\[\\#1e1e1e\\] {
  --tw-bg-opacity: 1;
  background-color: rgb(30 30 30 / var(--tw-bg-opacity, 1));
}
.bg-\\[\\#214379d4\\] {
  background-color: #214379d4;
}
.bg-\\[\\#27272A\\] {
  --tw-bg-opacity: 1;
  background-color: rgb(39 39 42 / var(--tw-bg-opacity, 1));
}
.bg-\\[\\#2a1515\\] {
  --tw-bg-opacity: 1;
  background-color: rgb(42 21 21 / var(--tw-bg-opacity, 1));
}
.bg-\\[\\#412162\\] {
  --tw-bg-opacity: 1;
  background-color: rgb(65 33 98 / var(--tw-bg-opacity, 1));
}
.bg-\\[\\#44444a\\] {
  --tw-bg-opacity: 1;
  background-color: rgb(68 68 74 / var(--tw-bg-opacity, 1));
}
.bg-\\[\\#4b4b4b\\] {
  --tw-bg-opacity: 1;
  background-color: rgb(75 75 75 / var(--tw-bg-opacity, 1));
}
.bg-\\[\\#5f3f9a\\] {
  --tw-bg-opacity: 1;
  background-color: rgb(95 63 154 / var(--tw-bg-opacity, 1));
}
.bg-\\[\\#5f3f9a\\]\\/40 {
  background-color: rgb(95 63 154 / 0.4);
}
.bg-\\[\\#6a369e\\] {
  --tw-bg-opacity: 1;
  background-color: rgb(106 54 158 / var(--tw-bg-opacity, 1));
}
.bg-\\[\\#7521c8\\] {
  --tw-bg-opacity: 1;
  background-color: rgb(117 33 200 / var(--tw-bg-opacity, 1));
}
.bg-\\[\\#8e61e3\\] {
  --tw-bg-opacity: 1;
  background-color: rgb(142 97 227 / var(--tw-bg-opacity, 1));
}
.bg-\\[\\#EFD81A\\] {
  --tw-bg-opacity: 1;
  background-color: rgb(239 216 26 / var(--tw-bg-opacity, 1));
}
.bg-\\[\\#b77116\\] {
  --tw-bg-opacity: 1;
  background-color: rgb(183 113 22 / var(--tw-bg-opacity, 1));
}
.bg-\\[\\#b94040\\] {
  --tw-bg-opacity: 1;
  background-color: rgb(185 64 64 / var(--tw-bg-opacity, 1));
}
.bg-\\[\\#d36cff\\] {
  --tw-bg-opacity: 1;
  background-color: rgb(211 108 255 / var(--tw-bg-opacity, 1));
}
.bg-\\[\\#efd81a6b\\] {
  background-color: #efd81a6b;
}
.bg-black {
  --tw-bg-opacity: 1;
  background-color: rgb(0 0 0 / var(--tw-bg-opacity, 1));
}
.bg-black\\/40 {
  background-color: rgb(0 0 0 / 0.4);
}
.bg-gray-200 {
  --tw-bg-opacity: 1;
  background-color: rgb(229 231 235 / var(--tw-bg-opacity, 1));
}
.bg-green-500\\/50 {
  background-color: rgb(34 197 94 / 0.5);
}
.bg-green-500\\/60 {
  background-color: rgb(34 197 94 / 0.6);
}
.bg-neutral-700 {
  --tw-bg-opacity: 1;
  background-color: rgb(64 64 64 / var(--tw-bg-opacity, 1));
}
.bg-purple-500 {
  --tw-bg-opacity: 1;
  background-color: rgb(168 85 247 / var(--tw-bg-opacity, 1));
}
.bg-purple-500\\/90 {
  background-color: rgb(168 85 247 / 0.9);
}
.bg-purple-800 {
  --tw-bg-opacity: 1;
  background-color: rgb(107 33 168 / var(--tw-bg-opacity, 1));
}
.bg-red-500 {
  --tw-bg-opacity: 1;
  background-color: rgb(239 68 68 / var(--tw-bg-opacity, 1));
}
.bg-red-500\\/90 {
  background-color: rgb(239 68 68 / 0.9);
}
.bg-red-950\\/50 {
  background-color: rgb(69 10 10 / 0.5);
}
.bg-transparent {
  background-color: transparent;
}
.bg-white {
  --tw-bg-opacity: 1;
  background-color: rgb(255 255 255 / var(--tw-bg-opacity, 1));
}
.bg-yellow-300 {
  --tw-bg-opacity: 1;
  background-color: rgb(253 224 71 / var(--tw-bg-opacity, 1));
}
.bg-zinc-800 {
  --tw-bg-opacity: 1;
  background-color: rgb(39 39 42 / var(--tw-bg-opacity, 1));
}
.bg-zinc-900\\/30 {
  background-color: rgb(24 24 27 / 0.3);
}
.bg-zinc-900\\/50 {
  background-color: rgb(24 24 27 / 0.5);
}
.p-0 {
  padding: 0px;
}
.p-1 {
  padding: 4px;
}
.p-2 {
  padding: 8px;
}
.p-3 {
  padding: 12px;
}
.p-4 {
  padding: 16px;
}
.p-5 {
  padding: 20px;
}
.p-6 {
  padding: 24px;
}
.px-1 {
  padding-left: 4px;
  padding-right: 4px;
}
.px-1\\.5 {
  padding-left: 6px;
  padding-right: 6px;
}
.px-2 {
  padding-left: 8px;
  padding-right: 8px;
}
.px-2\\.5 {
  padding-left: 10px;
  padding-right: 10px;
}
.px-3 {
  padding-left: 12px;
  padding-right: 12px;
}
.px-4 {
  padding-left: 16px;
  padding-right: 16px;
}
.py-0\\.5 {
  padding-top: 2px;
  padding-bottom: 2px;
}
.py-1 {
  padding-top: 4px;
  padding-bottom: 4px;
}
.py-1\\.5 {
  padding-top: 6px;
  padding-bottom: 6px;
}
.py-2 {
  padding-top: 8px;
  padding-bottom: 8px;
}
.py-3 {
  padding-top: 12px;
  padding-bottom: 12px;
}
.py-4 {
  padding-top: 16px;
  padding-bottom: 16px;
}
.py-\\[1px\\] {
  padding-top: 1px;
  padding-bottom: 1px;
}
.py-\\[3px\\] {
  padding-top: 3px;
  padding-bottom: 3px;
}
.py-\\[5px\\] {
  padding-top: 5px;
  padding-bottom: 5px;
}
.pb-2 {
  padding-bottom: 8px;
}
.pl-1 {
  padding-left: 4px;
}
.pl-2 {
  padding-left: 8px;
}
.pl-2\\.5 {
  padding-left: 10px;
}
.pl-3 {
  padding-left: 12px;
}
.pl-5 {
  padding-left: 20px;
}
.pl-6 {
  padding-left: 24px;
}
.pr-1 {
  padding-right: 4px;
}
.pr-1\\.5 {
  padding-right: 6px;
}
.pr-2 {
  padding-right: 8px;
}
.pr-2\\.5 {
  padding-right: 10px;
}
.pt-0 {
  padding-top: 0px;
}
.pt-2 {
  padding-top: 8px;
}
.pt-5 {
  padding-top: 20px;
}
.text-left {
  text-align: left;
}
.font-mono {
  font-family: Menlo, Consolas, Monaco, Liberation Mono, Lucida Console, monospace;
}
.text-\\[10px\\] {
  font-size: 10px;
}
.text-\\[11px\\] {
  font-size: 11px;
}
.text-\\[13px\\] {
  font-size: 13px;
}
.text-\\[14px\\] {
  font-size: 14px;
}
.text-\\[17px\\] {
  font-size: 17px;
}
.text-\\[8px\\] {
  font-size: 8px;
}
.text-sm {
  font-size: 14px;
  line-height: 20px;
}
.text-xs {
  font-size: 12px;
  line-height: 16px;
}
.font-bold {
  font-weight: 700;
}
.font-medium {
  font-weight: 500;
}
.font-semibold {
  font-weight: 600;
}
.uppercase {
  text-transform: uppercase;
}
.lowercase {
  text-transform: lowercase;
}
.capitalize {
  text-transform: capitalize;
}
.italic {
  font-style: italic;
}
.leading-6 {
  line-height: 24px;
}
.leading-none {
  line-height: 1;
}
.tracking-wide {
  letter-spacing: 0.025em;
}
.text-\\[\\#4ade80\\] {
  --tw-text-opacity: 1;
  color: rgb(74 222 128 / var(--tw-text-opacity, 1));
}
.text-\\[\\#5a5a5a\\] {
  --tw-text-opacity: 1;
  color: rgb(90 90 90 / var(--tw-text-opacity, 1));
}
.text-\\[\\#65656D\\] {
  --tw-text-opacity: 1;
  color: rgb(101 101 109 / var(--tw-text-opacity, 1));
}
.text-\\[\\#666\\] {
  --tw-text-opacity: 1;
  color: rgb(102 102 102 / var(--tw-text-opacity, 1));
}
.text-\\[\\#6E6E77\\] {
  --tw-text-opacity: 1;
  color: rgb(110 110 119 / var(--tw-text-opacity, 1));
}
.text-\\[\\#6F6F78\\] {
  --tw-text-opacity: 1;
  color: rgb(111 111 120 / var(--tw-text-opacity, 1));
}
.text-\\[\\#7346a0\\] {
  --tw-text-opacity: 1;
  color: rgb(115 70 160 / var(--tw-text-opacity, 1));
}
.text-\\[\\#737373\\] {
  --tw-text-opacity: 1;
  color: rgb(115 115 115 / var(--tw-text-opacity, 1));
}
.text-\\[\\#888\\] {
  --tw-text-opacity: 1;
  color: rgb(136 136 136 / var(--tw-text-opacity, 1));
}
.text-\\[\\#8E61E3\\] {
  --tw-text-opacity: 1;
  color: rgb(142 97 227 / var(--tw-text-opacity, 1));
}
.text-\\[\\#999\\] {
  --tw-text-opacity: 1;
  color: rgb(153 153 153 / var(--tw-text-opacity, 1));
}
.text-\\[\\#A1A1AA\\] {
  --tw-text-opacity: 1;
  color: rgb(161 161 170 / var(--tw-text-opacity, 1));
}
.text-\\[\\#A855F7\\] {
  --tw-text-opacity: 1;
  color: rgb(168 85 247 / var(--tw-text-opacity, 1));
}
.text-\\[\\#E4E4E7\\] {
  --tw-text-opacity: 1;
  color: rgb(228 228 231 / var(--tw-text-opacity, 1));
}
.text-\\[\\#d36cff\\] {
  --tw-text-opacity: 1;
  color: rgb(211 108 255 / var(--tw-text-opacity, 1));
}
.text-\\[\\#f87171\\] {
  --tw-text-opacity: 1;
  color: rgb(248 113 113 / var(--tw-text-opacity, 1));
}
.text-black {
  --tw-text-opacity: 1;
  color: rgb(0 0 0 / var(--tw-text-opacity, 1));
}
.text-gray-100 {
  --tw-text-opacity: 1;
  color: rgb(243 244 246 / var(--tw-text-opacity, 1));
}
.text-gray-300 {
  --tw-text-opacity: 1;
  color: rgb(209 213 219 / var(--tw-text-opacity, 1));
}
.text-gray-400 {
  --tw-text-opacity: 1;
  color: rgb(156 163 175 / var(--tw-text-opacity, 1));
}
.text-gray-500 {
  --tw-text-opacity: 1;
  color: rgb(107 114 128 / var(--tw-text-opacity, 1));
}
.text-green-500 {
  --tw-text-opacity: 1;
  color: rgb(34 197 94 / var(--tw-text-opacity, 1));
}
.text-neutral-300 {
  --tw-text-opacity: 1;
  color: rgb(212 212 212 / var(--tw-text-opacity, 1));
}
.text-neutral-400 {
  --tw-text-opacity: 1;
  color: rgb(163 163 163 / var(--tw-text-opacity, 1));
}
.text-neutral-500 {
  --tw-text-opacity: 1;
  color: rgb(115 115 115 / var(--tw-text-opacity, 1));
}
.text-purple-400 {
  --tw-text-opacity: 1;
  color: rgb(192 132 252 / var(--tw-text-opacity, 1));
}
.text-red-300 {
  --tw-text-opacity: 1;
  color: rgb(252 165 165 / var(--tw-text-opacity, 1));
}
.text-red-400 {
  --tw-text-opacity: 1;
  color: rgb(248 113 113 / var(--tw-text-opacity, 1));
}
.text-red-500 {
  --tw-text-opacity: 1;
  color: rgb(239 68 68 / var(--tw-text-opacity, 1));
}
.text-white {
  --tw-text-opacity: 1;
  color: rgb(255 255 255 / var(--tw-text-opacity, 1));
}
.text-white\\/30 {
  color: rgb(255 255 255 / 0.3);
}
.text-white\\/70 {
  color: rgb(255 255 255 / 0.7);
}
.text-yellow-300 {
  --tw-text-opacity: 1;
  color: rgb(253 224 71 / var(--tw-text-opacity, 1));
}
.text-yellow-500 {
  --tw-text-opacity: 1;
  color: rgb(234 179 8 / var(--tw-text-opacity, 1));
}
.text-zinc-200 {
  --tw-text-opacity: 1;
  color: rgb(228 228 231 / var(--tw-text-opacity, 1));
}
.text-zinc-400 {
  --tw-text-opacity: 1;
  color: rgb(161 161 170 / var(--tw-text-opacity, 1));
}
.text-zinc-500 {
  --tw-text-opacity: 1;
  color: rgb(113 113 122 / var(--tw-text-opacity, 1));
}
.text-zinc-600 {
  --tw-text-opacity: 1;
  color: rgb(82 82 91 / var(--tw-text-opacity, 1));
}
.opacity-0 {
  opacity: 0;
}
.opacity-100 {
  opacity: 1;
}
.opacity-50 {
  opacity: 0.5;
}
.shadow-lg {
  --tw-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --tw-shadow-colored: 0 10px 15px -3px var(--tw-shadow-color), 0 4px 6px -4px var(--tw-shadow-color);
  box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
}
.outline {
  outline-style: solid;
}
.ring-1 {
  --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
}
.ring-white\\/\\[0\\.08\\] {
  --tw-ring-color: rgb(255 255 255 / 0.08);
}
.blur {
  --tw-blur: blur(8px);
  filter: var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow);
}
.\\!filter {
  filter: var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow) !important;
}
.filter {
  filter: var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow);
}
.backdrop-blur-sm {
  --tw-backdrop-blur: blur(4px);
  -webkit-backdrop-filter: var(--tw-backdrop-blur) var(--tw-backdrop-brightness) var(--tw-backdrop-contrast) var(--tw-backdrop-grayscale) var(--tw-backdrop-hue-rotate) var(--tw-backdrop-invert) var(--tw-backdrop-opacity) var(--tw-backdrop-saturate) var(--tw-backdrop-sepia);
  backdrop-filter: var(--tw-backdrop-blur) var(--tw-backdrop-brightness) var(--tw-backdrop-contrast) var(--tw-backdrop-grayscale) var(--tw-backdrop-hue-rotate) var(--tw-backdrop-invert) var(--tw-backdrop-opacity) var(--tw-backdrop-saturate) var(--tw-backdrop-sepia);
}
.transition {
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, -webkit-backdrop-filter;
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter, -webkit-backdrop-filter;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
.transition-\\[border-radius\\] {
  transition-property: border-radius;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
.transition-\\[color\\2c transform\\] {
  transition-property: color,transform;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
.transition-\\[max-height\\] {
  transition-property: max-height;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
.transition-\\[opacity\\] {
  transition-property: opacity;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
.transition-colors {
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
.transition-none {
  transition-property: none;
}
.transition-opacity {
  transition-property: opacity;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
.transition-transform {
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
.delay-0 {
  transition-delay: 0s;
}
.delay-150 {
  transition-delay: 150ms;
}
.delay-300 {
  transition-delay: 300ms;
}
.\\!duration-0 {
  transition-duration: 0s !important;
}
.duration-0 {
  transition-duration: 0s;
}
.duration-200 {
  transition-duration: 200ms;
}
.duration-300 {
  transition-duration: 300ms;
}
.ease-\\[cubic-bezier\\(0\\.23\\2c 1\\2c 0\\.32\\2c 1\\)\\] {
  transition-timing-function: cubic-bezier(0.23,1,0.32,1);
}
.ease-\\[cubic-bezier\\(0\\.25\\2c 0\\.1\\2c 0\\.25\\2c 1\\)\\] {
  transition-timing-function: cubic-bezier(0.25,0.1,0.25,1);
}
.ease-in-out {
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
.ease-out {
  transition-timing-function: cubic-bezier(0, 0, 0.2, 1);
}
.will-change-transform {
  will-change: transform;
}
.animation-duration-300 {
  animation-duration: .3s;
}
.animation-delay-300 {
  animation-delay: .3s;
}
.\\[touch-action\\:none\\] {
  touch-action: none;
}

* {
  outline: none !important;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  backface-visibility: hidden;

  /* WebKit (Chrome, Safari, Edge) specific scrollbar styles */
  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    border-radius: 10px;
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.3);
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.4);
  }

  &::-webkit-scrollbar-corner {
    background: transparent;
  }
}

@-moz-document url-prefix() {
  * {
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.4) transparent;
    scrollbar-width: 6px;
  }
}

button:hover {
  background-image: none;
}

button {
  outline: 2px solid transparent;
  outline-offset: 2px;
  border-style: none;
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
  transition-timing-function: linear;
  cursor: pointer;
}

input {
  border-style: none;
  background-color: transparent;
  background-image: none;
  outline: 2px solid transparent;
  outline-offset: 2px;
}

input::-moz-placeholder {
  font-size: 12px;
  line-height: 16px;
  font-style: italic;
  --tw-text-opacity: 1;
  color: rgb(115 115 115 / var(--tw-text-opacity, 1));
}

input::placeholder {
  font-size: 12px;
  line-height: 16px;
  font-style: italic;
  --tw-text-opacity: 1;
  color: rgb(115 115 115 / var(--tw-text-opacity, 1));
}

input:-moz-placeholder-shown {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

input:placeholder-shown {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

svg {
  height: auto;
  width: auto;
  pointer-events: none;
}

/*
  Using CSS content with data attributes is more performant than:
  1. React re-renders with JSX text content
  2. Direct DOM manipulation methods:
     - element.textContent (creates/updates text nodes, triggers repaint)
     - element.innerText (triggers reflow by computing styles & layout)
     - element.innerHTML (heavy parsing, triggers reflow, security risks)
  3. Multiple data attributes with complex CSS concatenation

  This approach:
  - Avoids React reconciliation
  - Uses browser's native CSS engine (optimized content updates)
  - Minimizes main thread work
  - Reduces DOM operations
  - Avoids forced reflows (layout recalculation)
  - Only triggers necessary repaints
  - Keeps pseudo-element updates in render layer
*/
.with-data-text {
  overflow: hidden;
  &::before {
    content: attr(data-text);
  }
  &::before {
    display: block;
  }
  &::before {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

#react-scan-toolbar {
  position: fixed;
  left: 0px;
  top: 0px;
  display: flex;
  flex-direction: column;
  --tw-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --tw-shadow-colored: 0 10px 15px -3px var(--tw-shadow-color), 0 4px 6px -4px var(--tw-shadow-color);
  box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
  font-family: Menlo, Consolas, Monaco, Liberation Mono, Lucida Console, monospace;
  font-size: 13px;
  --tw-text-opacity: 1;
  color: rgb(255 255 255 / var(--tw-text-opacity, 1));
  --tw-bg-opacity: 1;
  background-color: rgb(0 0 0 / var(--tw-bg-opacity, 1));
  -webkit-user-select: none;
     -moz-user-select: none;
          user-select: none;
  cursor: move;
  opacity: 0;
  z-index: 2147483678;
}

@keyframes fadeIn {

  0% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
}

#react-scan-toolbar {
  animation: fadeIn ease-in forwards;
  animation-duration: .3s;
  animation-delay: .3s;
  --tw-shadow: 0 4px 12px rgba(0,0,0,0.2);
  --tw-shadow-colored: 0 4px 12px var(--tw-shadow-color);
  box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
  place-self: start;

  /* [CURSOR GENERATED] Anti-blur fixes:
   * We removed will-change-transform and replaced it with these properties
   * because will-change was causing stacking context issues and inconsistent
   * text rendering. The new properties work together to force proper
   * GPU acceleration without z-index side effects:
   */
  transform: translate3d(
    0,
    0,
    0
  ); /* Forces GPU acceleration without causing stacking issues */
  backface-visibility: hidden; /* Prevents blurry text during transforms */
  perspective: 1000; /* Creates proper 3D context for crisp text */ /* Ensures consistent text rendering across browsers */
  transform-style: preserve-3d;
}

.button {
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  &:active {
    background: rgba(255, 255, 255, 0.15);
  }
}

.resize-line-wrapper {
  position: absolute;
  overflow: hidden;
}

.resize-line {
  position: absolute;
  inset: 0px;
  overflow: hidden;
  --tw-bg-opacity: 1;
  background-color: rgb(0 0 0 / var(--tw-bg-opacity, 1));
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;

  svg {
    position: absolute;
  }

  svg {
    top: 50%;
  }

  svg {
    left: 50%;
  }

  svg {
    --tw-translate-x: -50%;
    transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
  }

  svg {
    --tw-translate-y: -50%;
    transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
  }
}

.resize-right,
.resize-left {
  top: 0px;
  bottom: 0px;
  width: 24px;
  cursor: ew-resize;

  .resize-line-wrapper {
    top: 0px;
    bottom: 0px;
  }

  .resize-line-wrapper {
    width: 50%;
  }

  &:hover {
    .resize-line {
      --tw-translate-x: 0px;
      transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
    }
  }
}
.resize-right {
  right: 0px;
  --tw-translate-x: 50%;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));

  .resize-line-wrapper {
    right: 0px;
  }
  .resize-line {
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
  }
  .resize-line {
    --tw-translate-x: -100%;
    transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
  }
}

.resize-left {
  left: 0px;
  --tw-translate-x: -50%;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));

  .resize-line-wrapper {
    left: 0px;
  }
  .resize-line {
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
  }
  .resize-line {
    --tw-translate-x: 100%;
    transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
  }
}

.resize-top,
.resize-bottom {
  left: 0px;
  right: 0px;
  height: 24px;
  cursor: ns-resize;

  .resize-line-wrapper {
    left: 0px;
    right: 0px;
  }

  .resize-line-wrapper {
    height: 50%;
  }

  &:hover {
    .resize-line {
      --tw-translate-y: 0px;
      transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
    }
  }
}
.resize-top {
  top: 0px;
  --tw-translate-y: -50%;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));

  .resize-line-wrapper {
    top: 0px;
  }
  .resize-line {
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
  }
  .resize-line {
    --tw-translate-y: 100%;
    transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
  }
}

.resize-bottom {
  bottom: 0px;
  --tw-translate-y: 50%;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));

  .resize-line-wrapper {
    bottom: 0px;
  }
  .resize-line {
    border-bottom-right-radius: 8px;
    border-bottom-left-radius: 8px;
  }
  .resize-line {
    --tw-translate-y: -100%;
    transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
  }
}

.react-scan-header {
  display: flex;
  align-items: center;
  -moz-column-gap: 8px;
       column-gap: 8px;
  padding-left: 12px;
  padding-right: 8px;
  min-height: 36px;
  border-bottom-width: 1px;
  --tw-border-opacity: 1;
  border-color: rgb(34 34 34 / var(--tw-border-opacity, 1));
  overflow: hidden;
  white-space: nowrap;
}

.react-scan-replay-button,
.react-scan-close-button {
  display: flex;
  align-items: center;
  padding: 4px;
  min-width: -moz-fit-content;
  min-width: fit-content;
  border-radius: 4px;
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}

.react-scan-replay-button {
  position: relative;
  overflow: hidden;
  background-color: rgb(168 85 247 / 0.5) !important;

  &:hover {
    background-color: rgb(168 85 247 / 0.25);
  }

  &.disabled {
    opacity: 0.5;
  }

  &.disabled {
    pointer-events: none;
  }

  &:before {
    content: "";
  }

  &:before {
    position: absolute;
  }

  &:before {
    inset: 0px;
  }

  &:before {
    --tw-translate-x: -100%;
    transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
  }

  &:before {
    animation: shimmer 2s infinite;
    background: linear-gradient(
      to right,
      transparent,
      rgba(142, 97, 227, 0.3),
      transparent
    );
  }
}

.react-scan-close-button {
  background-color: rgb(255 255 255 / 0.1);

  &:hover {
    background-color: rgb(255 255 255 / 0.15);
  }
}

@keyframes shimmer {
  100% {
    --tw-translate-x: 100%;
    transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
  }
}

.react-section-header {
  position: sticky;
  z-index: 100;
  display: flex;
  align-items: center;
  -moz-column-gap: 8px;
       column-gap: 8px;
  padding-left: 12px;
  padding-right: 12px;
  height: 28px;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  --tw-text-opacity: 1;
  color: rgb(136 136 136 / var(--tw-text-opacity, 1));
  border-bottom-width: 1px;
  --tw-border-opacity: 1;
  border-color: rgb(34 34 34 / var(--tw-border-opacity, 1));
  --tw-bg-opacity: 1;
  background-color: rgb(10 10 10 / var(--tw-bg-opacity, 1));
}

.react-scan-section {
  display: flex;
  flex-direction: column;
  padding-left: 8px;
  padding-right: 8px;
  --tw-text-opacity: 1;
  color: rgb(136 136 136 / var(--tw-text-opacity, 1));
}

.react-scan-section::before {
  --tw-text-opacity: 1;
  color: rgb(107 114 128 / var(--tw-text-opacity, 1));
  --tw-content: attr(data-section);
  content: var(--tw-content);
}

.react-scan-section {
  font-size: 12px;
  line-height: 16px;

  > .react-scan-property {
    margin-left: -14px;
  }
}

.react-scan-property {
  position: relative;
  display: flex;
  flex-direction: column;
  padding-left: 32px;
  border-left-width: 1px;
  border-color: transparent;
  overflow: hidden;
}

.react-scan-property-content {
  display: flex;
  flex: 1 1 0%;
  flex-direction: column;
  min-height: 28px;
  max-width: 100%;
  overflow: hidden;
}

.react-scan-string {
  color: #9ecbff;
}

.react-scan-number {
  color: #79c7ff;
}

.react-scan-boolean {
  color: #56b6c2;
}

.react-scan-key {
  width: -moz-fit-content;
  width: fit-content;
  max-width: 240px;
  white-space: nowrap;
  --tw-text-opacity: 1;
  color: rgb(255 255 255 / var(--tw-text-opacity, 1));
}

.react-scan-input {
  --tw-text-opacity: 1;
  color: rgb(255 255 255 / var(--tw-text-opacity, 1));
  --tw-bg-opacity: 1;
  background-color: rgb(0 0 0 / var(--tw-bg-opacity, 1));
}

@keyframes blink {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

.react-scan-arrow {
  position: absolute;
  top: 0px;
  left: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  height: 28px;
  width: 24px;
  --tw-translate-x: -100%;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
  z-index: 10;

  > svg {
    transition-property: transform;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }
}

.react-scan-expandable {
  display: grid;
  grid-template-rows: 0fr;
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 75ms;

  &.react-scan-expanded {
    grid-template-rows: 1fr;
  }

  &.react-scan-expanded {
    transition-duration: 100ms;
  }
}

.react-scan-nested {
  position: relative;
  overflow: hidden;

  &:before {
    content: "";
  }

  &:before {
    position: absolute;
  }

  &:before {
    top: 0px;
  }

  &:before {
    left: 0px;
  }

  &:before {
    height: 100%;
  }

  &:before {
    width: 1px;
  }

  &:before {
    background-color: rgb(107 114 128 / 0.3);
  }
}

.react-scan-settings {
  position: absolute;
  inset: 0px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 8px;
  padding-bottom: 8px;
  padding-left: 16px;
  padding-right: 16px;
  --tw-text-opacity: 1;
  color: rgb(136 136 136 / var(--tw-text-opacity, 1));

  > div {
    display: flex;
  }

  > div {
    align-items: center;
  }

  > div {
    justify-content: space-between;
  }

  > div {
    transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }

  > div {
    transition-duration: 300ms;
  }
}

.react-scan-preview-line {
  position: relative;
  display: flex;
  min-height: 28px;
  align-items: center;
  -moz-column-gap: 8px;
       column-gap: 8px;
}

.react-scan-flash-overlay {
  position: absolute;
  inset: 0px;
  opacity: 0;
  z-index: 50;
  pointer-events: none;
  transition-property: opacity;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
  mix-blend-mode: multiply;
  background-color: rgb(168 85 247 / 0.9);
}

.react-scan-toggle {
  position: relative;
  display: inline-flex;
  height: 24px;
  width: 40px;

  input {
    position: absolute;
  }

  input {
    inset: 0px;
  }

  input {
    z-index: 20;
  }

  input {
    opacity: 0;
  }

  input {
    cursor: pointer;
  }

  input {
    height: 100%;
  }

  input {
    width: 100%;
  }

  input:checked {
    + div {
      --tw-bg-opacity: 1;
      background-color: rgb(95 63 154 / var(--tw-bg-opacity, 1));
    }
    + div {

      &::before {
        --tw-translate-x: 100%;
        transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
      }

      &::before {
        left: auto;
      }

      &::before {
        --tw-border-opacity: 1;
        border-color: rgb(95 63 154 / var(--tw-border-opacity, 1));
      }
    }
  }

  > div {
    position: absolute;
  }

  > div {
    inset: 4px;
  }

  > div {
    --tw-bg-opacity: 1;
    background-color: rgb(64 64 64 / var(--tw-bg-opacity, 1));
  }

  > div {
    border-radius: 9999px;
  }

  > div {
    pointer-events: none;
  }

  > div {
    transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }

  > div {
    transition-duration: 300ms;
  }

  > div {

    &:before {
      --tw-content: '';
      content: var(--tw-content);
    }

    &:before {
      position: absolute;
    }

    &:before {
      top: 50%;
    }

    &:before {
      left: 0px;
    }

    &:before {
      --tw-translate-y: -50%;
      transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
    }

    &:before {
      height: 16px;
    }

    &:before {
      width: 16px;
    }

    &:before {
      --tw-bg-opacity: 1;
      background-color: rgb(255 255 255 / var(--tw-bg-opacity, 1));
    }

    &:before {
      border-width: 2px;
    }

    &:before {
      --tw-border-opacity: 1;
      border-color: rgb(64 64 64 / var(--tw-border-opacity, 1));
    }

    &:before {
      border-radius: 9999px;
    }

    &:before {
      --tw-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
      --tw-shadow-colored: 0 1px 2px 0 var(--tw-shadow-color);
      box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
    }

    &:before {
      transition-property: all;
      transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      transition-duration: 150ms;
    }

    &:before {
      transition-duration: 300ms;
    }
  }
}

.react-scan-flash-active {
  opacity: 0.4;
  transition-property: opacity;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}

.react-scan-inspector-overlay {
  display: flex;
  flex-direction: column;
  opacity: 0;
  transition-property: opacity;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;

  &.fade-out {
    opacity: 0;
  }

  &.fade-in {
    opacity: 1;
  }
}

.react-scan-what-changed {
  ul {
    list-style-type: disc;
  }
  ul {
    padding-left: 16px;
  }

  li {
    white-space: nowrap;
  }

  li {
    > div {
      display: flex;
    }
    > div {
      align-items: center;
    }
    > div {
      justify-content: space-between;
    }
    > div {
      -moz-column-gap: 8px;
           column-gap: 8px;
    }
  }
}

.count-badge {
  display: flex;
  align-items: center;
  -moz-column-gap: 8px;
       column-gap: 8px;
  padding-left: 6px;
  padding-right: 6px;
  padding-top: 2px;
  padding-bottom: 2px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 16px;
  font-weight: 500;
  --tw-numeric-spacing: tabular-nums;
  font-variant-numeric: var(--tw-ordinal) var(--tw-slashed-zero) var(--tw-numeric-figure) var(--tw-numeric-spacing) var(--tw-numeric-fraction);
  --tw-text-opacity: 1;
  color: rgb(168 85 247 / var(--tw-text-opacity, 1));
  background-color: rgb(168 85 247 / 0.1);
  transform-origin: center;
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: 150ms;
  transition-duration: 300ms;
}

@keyframes countFlash {

  0% {
    background-color: rgba(168, 85, 247, 0.3);
    transform: scale(1.05);
  }

  100% {
    background-color: rgba(168, 85, 247, 0.1);
    transform: scale(1);
  }
}

.count-flash {
  animation: countFlash .3s ease-out forwards;
}

@keyframes countFlashShake {

  0% {
    transform: translateX(0);
  }

  25% {
    transform: translateX(-5px);
  }

  50% {
    transform: translateX(5px) scale(1.1);
  }

  75% {
    transform: translateX(-5px);
  }

  100% {
    transform: translateX(0);
  }
}

.count-flash-white {
  animation: countFlashShake .3s ease-out forwards;
  transition-delay: 500ms !important;
}

.change-scope {
  display: flex;
  align-items: center;
  -moz-column-gap: 4px;
       column-gap: 4px;
  --tw-text-opacity: 1;
  color: rgb(102 102 102 / var(--tw-text-opacity, 1));
  font-size: 12px;
  line-height: 16px;
  font-family: Menlo, Consolas, Monaco, Liberation Mono, Lucida Console, monospace;

  > div {
    padding-left: 6px;
    padding-right: 6px;
  }

  > div {
    padding-top: 2px;
    padding-bottom: 2px;
  }

  > div {
    transform-origin: center;
  }

  > div {
    border-radius: 4px;
  }

  > div {
    font-size: 12px;
    line-height: 16px;
  }

  > div {
    font-weight: 500;
  }

  > div {
    --tw-numeric-spacing: tabular-nums;
    font-variant-numeric: var(--tw-ordinal) var(--tw-slashed-zero) var(--tw-numeric-figure) var(--tw-numeric-spacing) var(--tw-numeric-fraction);
  }

  > div {
    transform-origin: center;
  }

  > div {
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }

  > div {
    transition-delay: 150ms;
  }

  > div {
    transition-duration: 300ms;
  }

  > div {

    &[data-flash="true"] {
      background-color: rgb(168 85 247 / 0.1);
    }

    &[data-flash="true"] {
      --tw-text-opacity: 1;
      color: rgb(168 85 247 / var(--tw-text-opacity, 1));
    }
  }
}

.react-scan-slider {
  position: relative;
  min-height: 24px;

  > input {
    position: absolute;
  }

  > input {
    inset: 0px;
  }

  > input {
    opacity: 0;
  }

  &:before {
    --tw-content: '';
    content: var(--tw-content);
  }

  &:before {
    position: absolute;
  }

  &:before {
    left: 0px;
    right: 0px;
  }

  &:before {
    top: 50%;
  }

  &:before {
    --tw-translate-y: -50%;
    transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
  }

  &:before {
    height: 6px;
  }

  &:before {
    background-color: rgb(142 97 227 / 0.4);
  }

  &:before {
    border-radius: 8px;
  }

  &:before {
    pointer-events: none;
  }

  &:after {
    --tw-content: '';
    content: var(--tw-content);
  }

  &:after {
    position: absolute;
  }

  &:after {
    left: 0px;
    right: 0px;
  }

  &:after {
    top: -8px;
    bottom: -8px;
  }

  &:after {
    z-index: -10;
  }

  span {
    position: absolute;
  }

  span {
    left: 0px;
  }

  span {
    top: 50%;
  }

  span {
    --tw-translate-y: -50%;
    transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
  }

  span {
    height: 10px;
  }

  span {
    width: 10px;
  }

  span {
    border-radius: 8px;
  }

  span {
    --tw-bg-opacity: 1;
    background-color: rgb(142 97 227 / var(--tw-bg-opacity, 1));
  }

  span {
    pointer-events: none;
  }

  span {
    transition-property: transform;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }

  span {
    transition-duration: 75ms;
  }
}

.resize-v-line {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 4px;
  max-width: 4px;
  height: 100%;
  width: 100%;
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;

  &:hover,
  &:active {
    > span {
      --tw-bg-opacity: 1;
      background-color: rgb(34 34 34 / var(--tw-bg-opacity, 1));
    }

    svg {
      opacity: 1;
    }
  }

  &::before {
    --tw-content: "";
    content: var(--tw-content);
  }

  &::before {
    position: absolute;
  }

  &::before {
    inset: 0px;
  }

  &::before {
    left: 50%;
  }

  &::before {
    --tw-translate-x: -50%;
    transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
  }

  &::before {
    width: 1px;
  }

  &::before {
    --tw-bg-opacity: 1;
    background-color: rgb(34 34 34 / var(--tw-bg-opacity, 1));
  }

  &::before {
    transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }

  > span {
    position: absolute;
  }

  > span {
    left: 50%;
  }

  > span {
    top: 50%;
  }

  > span {
    --tw-translate-x: -50%;
    transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
  }

  > span {
    --tw-translate-y: -50%;
    transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
  }

  > span {
    height: 18px;
  }

  > span {
    width: 6px;
  }

  > span {
    border-radius: 4px;
  }

  > span {
    transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }

  svg {
    position: absolute;
  }

  svg {
    left: 50%;
  }

  svg {
    top: 50%;
  }

  svg {
    --tw-translate-x: -50%;
    transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
  }

  svg {
    --tw-translate-y: -50%;
    transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
  }

  svg {
    --tw-rotate: 90deg;
    transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
  }

  svg {
    --tw-text-opacity: 1;
    color: rgb(163 163 163 / var(--tw-text-opacity, 1));
  }

  svg {
    opacity: 0;
  }

  svg {
    transition-property: opacity;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }

  svg {
    z-index: 50;
  }
}

.tree-node-search-highlight {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  span {
    padding-top: 1px;
    padding-bottom: 1px;
  }

  span {
    border-radius: 2px;
  }

  span {
    --tw-bg-opacity: 1;
    background-color: rgb(253 224 71 / var(--tw-bg-opacity, 1));
  }

  span {
    font-weight: 500;
  }

  span {
    --tw-text-opacity: 1;
    color: rgb(0 0 0 / var(--tw-text-opacity, 1));
  }

  .single {
    margin-right: 1px;
  }

  .single {
    padding-left: 2px;
    padding-right: 2px;
  }

  .regex {
    padding-left: 2px;
    padding-right: 2px;
  }

  .start {
    margin-left: 1px;
  }

  .start {
    border-top-left-radius: 2px;
    border-bottom-left-radius: 2px;
  }

  .end {
    margin-right: 1px;
  }

  .end {
    border-top-right-radius: 2px;
    border-bottom-right-radius: 2px;
  }

  .middle {
    margin-left: 1px;
    margin-right: 1px;
  }

  .middle {
    border-radius: 2px;
  }
}

.react-scan-toolbar-notification {
  position: absolute;
  left: 0px;
  right: 0px;
  display: flex;
  align-items: center;
  -moz-column-gap: 8px;
       column-gap: 8px;
  padding: 4px;
  padding-left: 8px;
  font-size: 10px;
  --tw-text-opacity: 1;
  color: rgb(212 212 212 / var(--tw-text-opacity, 1));
  background-color: rgb(0 0 0 / 0.9);
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;

  &:before {
    --tw-content: '';
    content: var(--tw-content);
  }

  &:before {
    position: absolute;
  }

  &:before {
    left: 0px;
    right: 0px;
  }

  &:before {
    --tw-bg-opacity: 1;
    background-color: rgb(0 0 0 / var(--tw-bg-opacity, 1));
  }

  &:before {
    height: 8px;
  }

  &.position-top {
    top: 100%;
  }

  &.position-top {
    --tw-translate-y: -100%;
    transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
  }

  &.position-top {
    border-bottom-right-radius: 8px;
    border-bottom-left-radius: 8px;
  }

  &.position-top {

    &::before {
      top: 0px;
    }

    &::before {
      --tw-translate-y: -100%;
      transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
    }
  }

  &.position-bottom {
    bottom: 100%;
  }

  &.position-bottom {
    --tw-translate-y: 100%;
    transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
  }

  &.position-bottom {
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
  }

  &.position-bottom {

    &::before {
      bottom: 0px;
    }

    &::before {
      --tw-translate-y: 100%;
      transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
    }
  }

  &.is-open {
    --tw-translate-y: 0px;
    transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
  }
}

.react-scan-header-item {
  position: absolute;
  inset: 0px;
  --tw-translate-y: -200%;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;

  &.is-visible {
    --tw-translate-y: 0px;
    transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
  }
}

.react-scan-components-tree:has(.resize-v-line:hover, .resize-v-line:active)
  .tree {
  overflow: hidden;
}

.react-scan-expandable {
  display: grid;
  grid-template-rows: 0fr;
  overflow: hidden;
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 75ms;
  transition-timing-function: ease-out;

  > * {
    min-height: 0;
  }

  &.react-scan-expanded {
    grid-template-rows: 1fr;
    transition-duration: 100ms;
  }
}

.after\\:absolute::after {
  content: var(--tw-content);
  position: absolute;
}

.after\\:inset-0::after {
  content: var(--tw-content);
  inset: 0px;
}

.after\\:left-1\\/2::after {
  content: var(--tw-content);
  left: 50%;
}

.after\\:top-\\[100\\%\\]::after {
  content: var(--tw-content);
  top: 100%;
}

.after\\:h-\\[6px\\]::after {
  content: var(--tw-content);
  height: 6px;
}

.after\\:w-\\[10px\\]::after {
  content: var(--tw-content);
  width: 10px;
}

.after\\:-translate-x-1\\/2::after {
  content: var(--tw-content);
  --tw-translate-x: -50%;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

@keyframes fadeOut {

  0% {
    content: var(--tw-content);
    opacity: 1;
  }

  100% {
    content: var(--tw-content);
    opacity: 0;
  }
}

.after\\:animate-\\[fadeOut_1s_ease-out_forwards\\]::after {
  content: var(--tw-content);
  animation: fadeOut 1s ease-out forwards;
}

.after\\:border-l-\\[5px\\]::after {
  content: var(--tw-content);
  border-left-width: 5px;
}

.after\\:border-r-\\[5px\\]::after {
  content: var(--tw-content);
  border-right-width: 5px;
}

.after\\:border-t-\\[6px\\]::after {
  content: var(--tw-content);
  border-top-width: 6px;
}

.after\\:border-l-transparent::after {
  content: var(--tw-content);
  border-left-color: transparent;
}

.after\\:border-r-transparent::after {
  content: var(--tw-content);
  border-right-color: transparent;
}

.after\\:border-t-white::after {
  content: var(--tw-content);
  --tw-border-opacity: 1;
  border-top-color: rgb(255 255 255 / var(--tw-border-opacity, 1));
}

.after\\:bg-purple-500\\/30::after {
  content: var(--tw-content);
  background-color: rgb(168 85 247 / 0.3);
}

.after\\:content-\\[\\"\\"\\]::after {
  --tw-content: "";
  content: var(--tw-content);
}

.focus-within\\:border-\\[\\#454545\\]:focus-within {
  --tw-border-opacity: 1;
  border-color: rgb(69 69 69 / var(--tw-border-opacity, 1));
}

.hover\\:bg-\\[\\#0f0f0f\\]:hover {
  --tw-bg-opacity: 1;
  background-color: rgb(15 15 15 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-\\[\\#18181B\\]:hover {
  --tw-bg-opacity: 1;
  background-color: rgb(24 24 27 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-\\[\\#34343b\\]:hover {
  --tw-bg-opacity: 1;
  background-color: rgb(52 52 59 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-\\[\\#5f3f9a\\]\\/20:hover {
  background-color: rgb(95 63 154 / 0.2);
}

.hover\\:bg-\\[\\#5f3f9a\\]\\/40:hover {
  background-color: rgb(95 63 154 / 0.4);
}

.hover\\:bg-red-600:hover {
  --tw-bg-opacity: 1;
  background-color: rgb(220 38 38 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-zinc-700:hover {
  --tw-bg-opacity: 1;
  background-color: rgb(63 63 70 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-zinc-800\\/50:hover {
  background-color: rgb(39 39 42 / 0.5);
}

.hover\\:text-neutral-300:hover {
  --tw-text-opacity: 1;
  color: rgb(212 212 212 / var(--tw-text-opacity, 1));
}

.hover\\:text-white:hover {
  --tw-text-opacity: 1;
  color: rgb(255 255 255 / var(--tw-text-opacity, 1));
}

.group:hover .group-hover\\:bg-\\[\\#21437982\\] {
  background-color: #21437982;
}

.group:hover .group-hover\\:bg-\\[\\#5b2d89\\] {
  --tw-bg-opacity: 1;
  background-color: rgb(91 45 137 / var(--tw-bg-opacity, 1));
}

.group:hover .group-hover\\:bg-\\[\\#6a6a6a\\] {
  --tw-bg-opacity: 1;
  background-color: rgb(106 106 106 / var(--tw-bg-opacity, 1));
}

.group:hover .group-hover\\:bg-\\[\\#efda1a2f\\] {
  background-color: #efda1a2f;
}

.group:hover .group-hover\\:opacity-100 {
  opacity: 1;
}

.peer\\/bottom:hover ~ .peer-hover\\/bottom\\:rounded-b-none {
  border-bottom-right-radius: 0px;
  border-bottom-left-radius: 0px;
}

.peer\\/left:hover ~ .peer-hover\\/left\\:rounded-l-none {
  border-top-left-radius: 0px;
  border-bottom-left-radius: 0px;
}

.peer\\/right:hover ~ .peer-hover\\/right\\:rounded-r-none {
  border-top-right-radius: 0px;
  border-bottom-right-radius: 0px;
}

.peer\\/top:hover ~ .peer-hover\\/top\\:rounded-t-none {
  border-top-left-radius: 0px;
  border-top-right-radius: 0px;
}
`,Zc=(e,t,n=t)=>{const[r,o]=U(e);return H(()=>{if(e===r)return;const s=setTimeout(()=>o(e),e?t:n);return()=>clearTimeout(s)},[e,t,n]),r},Qc=lt(()=>w("absolute inset-0 flex items-center gap-x-2","translate-y-0","transition-transform duration-300",Dn.value&&"-translate-y-[200%]")),ed=()=>{const e=M(null),t=M(null),[n,r]=U(null);Lt(()=>{const i=E.inspectState.value;i.kind==="focused"&&r(i.fiber)}),Lt(()=>{const i=ye.value;Ot(()=>{if(E.inspectState.value.kind!=="focused"||!e.current||!t.current)return;const{totalUpdates:s,currentIndex:l,updates:c,isVisible:d,windowOffset:p}=i,u=Math.max(0,s-1),h=d?`#${p+l} Re-render`:u>0?`×${u}`:"";let f;if(u>0&&l>=0&&l<c.length){const v=c[l]?.fiberInfo?.selfTime;f=v>0?v<.1-Number.EPSILON?"< 0.1ms":`${Number(v.toFixed(1))}ms`:void 0}e.current.dataset.text=h?` • ${h}`:"",t.current.dataset.text=f?` • ${f}`:""})});const o=Me(()=>{if(!n)return null;const{name:i,wrappers:s,wrapperTypes:l}=jt(n),c=s.length?`${s.join("(")}(${i})${")".repeat(s.length)}`:i??"",d=l[0];return a("span",{title:c,className:"flex items-center gap-x-1",children:[i??"Unknown",a("span",{title:d?.title,className:"flex items-center gap-x-1 text-[10px] text-purple-400",children:!!d&&a(Y,{children:[a("span",{className:w("rounded py-[1px] px-1","truncate",d.compiler&&"bg-purple-800 text-neutral-400",!d.compiler&&"bg-neutral-700 text-neutral-300",d.type==="memo"&&"bg-[#5f3f9a] text-white"),children:d.type},d.type),d.compiler&&a("span",{className:"text-yellow-300",children:"✨"})]})}),l.length>1&&a("span",{className:"text-[10px] text-neutral-400",children:["×",l.length-1]})]})},[n]);return a("div",{className:Qc,children:[o,a("div",{className:"flex items-center gap-x-2 mr-auto text-xs text-[#888]",children:[a("span",{ref:e,className:"with-data-text cursor-pointer !overflow-visible",title:"Click to toggle between rerenders and total renders"}),a("span",{ref:t,className:"with-data-text !overflow-visible"})]})]})},td=()=>{const e=Zc(E.inspectState.value.kind==="focused",150,0),t=()=>{Q.value={view:"none"},E.inspectState.value={kind:"inspect-off"}};if(Q.value.view!=="notifications")return a("div",{className:"react-scan-header",children:[a("div",{className:"relative flex-1 h-full",children:a("div",{className:w("react-scan-header-item is-visible",!e&&"!duration-0"),children:a(ed,{})})}),a("button",{type:"button",title:"Close",className:"react-scan-close-button",onClick:t,children:a(oe,{name:"icon-close"})})]})},nd=({className:e,...t})=>a("div",{className:w("react-scan-toggle",e),children:[a("input",{type:"checkbox",...t}),a("div",{})]}),rd=({fps:e})=>{const t=n=>n<30?"#EF4444":n<50?"#F59E0B":"rgb(214,132,245)";return a("div",{className:w("flex items-center gap-x-1 px-2 w-full","h-6","rounded-md","font-mono leading-none","bg-[#141414]","ring-1 ring-white/[0.08]"),children:[a("div",{style:{color:t(e)},className:"text-sm font-semibold tracking-wide transition-colors ease-in-out w-full flex justify-center items-center",children:e}),a("span",{className:"text-white/30 text-[11px] font-medium tracking-wide ml-auto min-w-fit",children:"FPS"})]})},od=()=>{const[e,t]=U(null);return H(()=>{const n=setInterval(()=>{t(pi())},200);return()=>clearInterval(n)},[]),a("div",{className:w("flex items-center justify-end gap-x-2 px-1 ml-1 w-[72px]","whitespace-nowrap text-sm text-white"),children:e===null?a(Y,{children:"️"}):a(rd,{fps:e})})},ze=()=>De?(window.reactScanIdCounter===void 0&&(window.reactScanIdCounter=0),`${++window.reactScanIdCounter}`):"0",Ie=e=>e(),fe=class vi extends Array{constructor(t=25){super(),this.capacity=t}push(...t){const n=super.push(...t);for(;this.length>this.capacity;)this.shift();return n}static fromArray(t,n){const r=new vi(n);return r.push(...t),r}},ad=class{constructor(e){this.subscribers=new Set,this.currentValue=e}subscribe(e){return this.subscribers.add(e),e(this.currentValue),()=>{this.subscribers.delete(e)}}setState(e){this.currentValue=e,this.subscribers.forEach(t=>t(e))}getCurrentState(){return this.currentValue}},wi=150,oa=new ad(new fe(wi)),Re=50,id=class{constructor(){this.channels={}}publish(e,t,n=!0){const r=this.channels[t];if(!r){if(!n)return;this.channels[t]={callbacks:new fe(Re),state:new fe(Re)},this.channels[t].state.push(e);return}r.state.push(e),r.callbacks.forEach(o=>o(e))}getAvailableChannels(){return fe.fromArray(Object.keys(this.channels),Re)}subscribe(e,t,n=!1){const r=()=>(n||this.channels[e].state.forEach(i=>{t(i)}),()=>{const i=this.channels[e].callbacks.filter(s=>s!==t);this.channels[e].callbacks=fe.fromArray(i,Re)}),o=this.channels[e];return o?(o.callbacks.push(t),r()):(this.channels[e]={callbacks:new fe(Re),state:new fe(Re)},this.channels[e].callbacks.push(t),r())}updateChannelState(e,t,n=!0){const r=this.channels[e];if(!r){if(!n)return;const o=new fe(Re),i={callbacks:new fe(Re),state:o};this.channels[e]=i,i.state=t(o);return}r.state=t(r.state)}getChannelState(e){return this.channels[e].state??new fe(Re)}},Nn=new id,bi={skipProviders:!0,skipHocs:!0,skipContainers:!0,skipMinified:!0,skipUtilities:!0,skipBoundaries:!0},Nt={providers:[/Provider$/,/^Provider$/,/^Context$/],hocs:[/^with[A-Z]/,/^forward(?:Ref)?$/i,/^Forward(?:Ref)?\(/],containers:[/^(?:App)?Container$/,/^Root$/,/^ReactDev/],utilities:[/^Fragment$/,/^Suspense$/,/^ErrorBoundary$/,/^Portal$/,/^Consumer$/,/^Layout$/,/^Router/,/^Hydration/],boundaries:[/^Boundary$/,/Boundary$/,/^Provider$/,/Provider$/]},sd=(e,t=bi)=>{const n=[];return t.skipProviders&&n.push(...Nt.providers),t.skipHocs&&n.push(...Nt.hocs),t.skipContainers&&n.push(...Nt.containers),t.skipUtilities&&n.push(...Nt.utilities),t.skipBoundaries&&n.push(...Nt.boundaries),!n.some(r=>r.test(e))},aa=[/^[a-z]$/,/^[a-z][0-9]$/,/^_+$/,/^[A-Za-z][_$]$/,/^[a-z]{1,2}$/],ld=e=>{for(let i=0;i<aa.length;i++)if(aa[i].test(e))return!0;const t=!/[aeiou]/i.test(e),n=(e.match(/\d/g)?.length??0)>e.length/2,r=/^[a-z]+$/.test(e),o=/[$_]{2,}/.test(e);return Number(t)+Number(n)+Number(r)+Number(o)>=2},cd=(e,t=bi)=>{if(!e)return[];if(!ge(e.type))return[];const r=new Array;let o=e;for(;o.return;){const s=dd(o.type);s&&!ld(s)&&sd(s,t)&&s.toLowerCase()!==s&&r.push(s),o=o.return}const i=new Array(r.length);for(let s=0;s<r.length;s++)i[s]=r[r.length-s-1];return i},dd=e=>{const t=ge(e);return t?t.replace(/^(?:Memo|Forward(?:Ref)?|With.*?)\((?<inner>.*?)\)$/,"$<inner>"):""},ud=(e,t=()=>!0)=>{let n=e;for(;n;){const r=ge(n.type);if(r&&t(r))return r;n=n.return}return null},ia,Er="never-hidden",pd=()=>{ia?.();const e=()=>{document.hidden&&(Er=Date.now())};document.addEventListener("visibilitychange",e),ia=()=>{document.removeEventListener("visibilitychange",e)}},hd=e=>["pointerup","click"].includes(e)?"pointer":(e.includes("key"),["keydown","keyup"].includes(e)?"keyboard":null),Qn=null,fd=e=>{pd();const t=new Map,n=new Map,r=i=>{if(!i.interactionId)return;if(i.interactionId&&i.target&&!n.has(i.interactionId)&&n.set(i.interactionId,i.target),i.target){let l=i.target;for(;l;){if(l.id==="react-scan-toolbar-root"||l.id==="react-scan-root")return;l=l.parentElement}}const s=t.get(i.interactionId);if(s)i.duration>s.latency?(s.entries=[i],s.latency=i.duration):i.duration===s.latency&&i.startTime===s.entries[0].startTime&&s.entries.push(i);else{const l=hd(i.name);if(!l)return;const c={id:i.interactionId,latency:i.duration,entries:[i],target:i.target,type:l,startTime:i.startTime,endTime:Date.now(),processingStart:i.processingStart,processingEnd:i.processingEnd,duration:i.duration,inputDelay:i.processingStart-i.startTime,processingDuration:i.processingEnd-i.processingStart,presentationDelay:i.duration-(i.processingEnd-i.startTime),timestamp:Date.now(),timeSinceTabInactive:Er==="never-hidden"?"never-hidden":Date.now()-Er,visibilityState:document.visibilityState,timeOrigin:performance.timeOrigin,referrer:document.referrer};t.set(c.id,c),Qn||(Qn=requestAnimationFrame(()=>{requestAnimationFrame(()=>{e(t.get(c.id)),Qn=null})}))}},o=new PerformanceObserver(i=>{const s=i.getEntries();for(let l=0,c=s.length;l<c;l++){const d=s[l];r(d)}});try{o.observe({type:"event",buffered:!0,durationThreshold:16}),o.observe({type:"first-input",buffered:!0})}catch{}return()=>o.disconnect()},md=()=>fd(e=>{Nn.publish({kind:"entry-received",entry:e},"recording")}),pn=25,Oe=new fe(pn),gd=(e,t)=>{let n=null;for(const r of t){if(r.type!==e.type)continue;if(n===null){n=r;continue}const o=(i,s)=>Math.abs(i.startDateTime)-(s.startTime+s.timeOrigin);o(r,e)<o(n,e)&&(n=r)}return n},vd=e=>Nn.subscribe("recording",n=>{const r=n.kind==="auto-complete-race"?Oe.find(i=>i.interactionUUID===n.interactionUUID):gd(n.entry,Oe);if(!r)return;const o=r.completeInteraction(n);e(o)}),wd=({onMicroTask:e,onRAF:t,onTimeout:n,abort:r})=>{queueMicrotask(()=>{r?.()!==!0&&e()&&requestAnimationFrame(()=>{r?.()!==!0&&t()&&setTimeout(()=>{r?.()!==!0&&n()},0)})})},bd=e=>{const t=si(e);if(!t)return;let n=t?ge(t?.type):"N/A";return n||(n=ud(t,o=>o.length>2)??"N/A"),n?{componentPath:cd(t),childrenTree:{},componentName:n,elementFiber:t}:void 0},sa=(e,t)=>{let n=null;const r=c=>{switch(e){case"pointer":return c.phase==="start"?"pointerup":c.target instanceof HTMLInputElement||c.target instanceof HTMLSelectElement?"change":"click";case"keyboard":return c.phase==="start"?"keydown":"change"}},o={current:{kind:"uninitialized-stage",interactionUUID:ze(),stageStart:Date.now(),interactionType:e}},i=c=>{if(c.composedPath().some(x=>x instanceof Element&&x.id==="react-scan-toolbar-root")||(Date.now()-o.current.stageStart>2e3&&(o.current={kind:"uninitialized-stage",interactionUUID:ze(),stageStart:Date.now(),interactionType:e}),o.current.kind!=="uninitialized-stage"))return;const p=performance.now();t?.onStart?.(o.current.interactionUUID);const u=bd(c.target);if(!u){t?.onError?.(o.current.interactionUUID);return}const h={},f=xi(h);o.current={...o.current,interactionType:e,blockingTimeStart:Date.now(),childrenTree:u.childrenTree,componentName:u.componentName,componentPath:u.componentPath,fiberRenders:h,kind:"interaction-start",interactionStartDetail:p,stopListeningForRenders:f};const v=r({phase:"end",target:c.target});document.addEventListener(v,s,{once:!0}),requestAnimationFrame(()=>{document.removeEventListener(v,s)})};document.addEventListener(r({phase:"start"}),i,{capture:!0});const s=(c,d,p)=>{if(o.current.kind!=="interaction-start"&&d===n){if(e==="pointer"&&c.target instanceof HTMLSelectElement){o.current={kind:"uninitialized-stage",interactionUUID:ze(),stageStart:Date.now(),interactionType:e};return}t?.onError?.(o.current.interactionUUID),o.current={kind:"uninitialized-stage",interactionUUID:ze(),stageStart:Date.now(),interactionType:e};return}n=d,wd({abort:p,onMicroTask:()=>o.current.kind==="uninitialized-stage"?!1:(o.current={...o.current,kind:"js-end-stage",jsEndDetail:performance.now()},!0),onRAF:()=>o.current.kind!=="js-end-stage"&&o.current.kind!=="raf-stage"?(t?.onError?.(o.current.interactionUUID),o.current={kind:"uninitialized-stage",interactionUUID:ze(),stageStart:Date.now(),interactionType:e},!1):(o.current={...o.current,kind:"raf-stage",rafStart:performance.now()},!0),onTimeout:()=>{if(o.current.kind!=="raf-stage"){t?.onError?.(o.current.interactionUUID),o.current={kind:"uninitialized-stage",interactionUUID:ze(),stageStart:Date.now(),interactionType:e};return}const u=Date.now(),h=Object.freeze({...o.current,kind:"timeout-stage",blockingTimeEnd:u,commitEnd:performance.now()});o.current={kind:"uninitialized-stage",interactionUUID:ze(),stageStart:u,interactionType:e};let f=!1;const v=y=>{f=!0;const m=y.kind==="auto-complete-race"?y.detailedTiming.commitEnd-y.detailedTiming.interactionStartDetail:y.entry.latency,b={detailedTiming:h,latency:m,completedAt:Date.now(),flushNeeded:!0};t?.onComplete?.(h.interactionUUID,b,y);const C=Oe.filter(S=>S.interactionUUID!==h.interactionUUID);return Oe=fe.fromArray(C,pn),b},x={completeInteraction:v,endDateTime:Date.now(),startDateTime:h.blockingTimeStart,type:e,interactionUUID:h.interactionUUID};if(Oe.push(x),xd())setTimeout(()=>{if(f)return;v({kind:"auto-complete-race",detailedTiming:h,interactionUUID:h.interactionUUID});const y=Oe.filter(m=>m.interactionUUID!==h.interactionUUID);Oe=fe.fromArray(y,pn)},1e3);else{const y=Oe.filter(m=>m.interactionUUID!==h.interactionUUID);Oe=fe.fromArray(y,pn),v({kind:"auto-complete-race",detailedTiming:h,interactionUUID:h.interactionUUID})}}})},l=c=>{const d=ze();s(c,d,()=>d!==n)};return e==="keyboard"&&document.addEventListener("keypress",l),()=>{document.removeEventListener(r({phase:"start"}),i,{capture:!0}),document.removeEventListener("keypress",l)}},la=e=>$r(e,t=>{if(Rt(t))return!0})?.stateNode,xd=()=>"PerformanceEventTiming"in globalThis,xi=e=>{const t=n=>{const r=ge(n.type);if(!r)return;const o=e[r];if(!o){const p=new Set,u=n.return&&vt(n.return),h=u&&ge(u[0]);h&&p.add(h);const{selfTime:f,totalTime:v}=Ze(n),x=Bo(n),y={current:[],changes:new Set,changesCounts:new Map},m={fiberProps:x.fiberProps||y,fiberState:x.fiberState||y,fiberContext:x.fiberContext||y};e[r]={renderCount:1,hasMemoCache:$t(n),wasFiberRenderMount:ca(n),parents:p,selfTime:f,totalTime:v,nodeInfo:[{element:la(n),name:ge(n.type)??"Unknown",selfTime:Ze(n).selfTime}],changes:m};return}if(vt(n)?.[0]?.type){const p=n.return&&vt(n.return),u=p&&ge(p[0]);u&&o.parents.add(u)}const{selfTime:s,totalTime:l}=Ze(n),c=Bo(n);if(!c)return;const d={current:[],changes:new Set,changesCounts:new Map};o.wasFiberRenderMount=o.wasFiberRenderMount||ca(n),o.hasMemoCache=o.hasMemoCache||$t(n),o.changes={fiberProps:er(o.changes?.fiberProps||d,c.fiberProps||d),fiberState:er(o.changes?.fiberState||d,c.fiberState||d),fiberContext:er(o.changes?.fiberContext||d,c.fiberContext||d)},o.renderCount+=1,o.selfTime+=s,o.totalTime+=l,o.nodeInfo.push({element:la(n),name:ge(n.type)??"Unknown",selfTime:Ze(n).selfTime})};return E.interactionListeningForRenders=t,()=>{E.interactionListeningForRenders===t&&(E.interactionListeningForRenders=null)}},er=(e,t)=>{const n={current:[...e.current],changes:new Set,changesCounts:new Map};for(const r of t.current)n.current.some(o=>o.name===r.name)||n.current.push(r);for(const r of t.changes)if(typeof r=="string"||typeof r=="number"){n.changes.add(r);const o=e.changesCounts.get(r)||0,i=t.changesCounts.get(r)||0;n.changesCounts.set(r,o+i)}return n},ca=e=>{if(!e.alternate)return!0;const t=e.alternate,n=t&&t.memoizedState!=null&&t.memoizedState.element!=null&&t.memoizedState.isDehydrated!==!0,r=e.memoizedState!=null&&e.memoizedState.element!=null&&e.memoizedState.isDehydrated!==!0;return!n&&r},da=e=>{let t;const n=new Set,r=(d,p)=>{const u=typeof d=="function"?d(t):d;if(!Object.is(u,t)){const h=t;t=p??(typeof u!="object"||u===null)?u:Object.assign({},t,u),n.forEach(f=>f(t,h))}},o=()=>t,l={setState:r,getState:o,getInitialState:()=>c,subscribe:(d,p)=>{let u,h;p?(u=d,h=p):h=d;let f=u?u(t):void 0;const v=(x,y)=>{if(u){const m=u(x),b=u(y);Object.is(f,m)||(f=m,h(m,b))}else h(x,y)};return n.add(v),()=>n.delete(v)}},c=t=e(r,o,l);return l},yi=e=>e?da(e):da,tn=null;yi()(e=>({state:{events:[]},actions:{addEvent:t=>{e(n=>({state:{events:[...n.state.events,t]}}))},clear:()=>{e({state:{events:[]}})}}}));var tr=200,Wt=yi()((e,t)=>{const n=new Set;return{state:{events:new fe(tr)},actions:{addEvent:r=>{n.forEach(c=>c(r));const o=[...t().state.events,r],i=(c,d)=>{const p=o.find(u=>{if(u.kind!=="long-render"&&u.id!==c.id&&(c.data.startAt<=u.data.startAt&&c.data.endAt<=u.data.endAt&&c.data.endAt>=u.data.startAt||u.data.startAt<=c.data.startAt&&u.data.endAt>=c.data.startAt||c.data.startAt<=u.data.startAt&&c.data.endAt>=u.data.endAt))return!0});p&&d(p)},s=new Set;o.forEach(c=>{c.kind!=="interaction"&&i(c,()=>{s.add(c.id)})});const l=o.filter(c=>!s.has(c.id));e(()=>({state:{events:fe.fromArray(l,tr)}}))},addListener:r=>(n.add(r),()=>{n.delete(r)}),clear:()=>{e({state:{events:new fe(tr)}})}}}}),yd=()=>Cs(Wt.subscribe,Wt.getState),hn=null,fn=null,nr=null,zr,kd=()=>{const e=t=>{zr=t.composedPath().map(n=>n.id).filter(Boolean).includes("react-scan-toolbar")};return document.addEventListener("mouseover",e),nr=e,()=>{nr&&document.removeEventListener("mouseover",nr)}},_d=()=>{const e=()=>{hn=performance.now(),fn=performance.timeOrigin};return document.addEventListener("visibilitychange",e),()=>{document.removeEventListener("visibilitychange",e)}},ki=150,rr=[];function Cd(){let e,t;function n(){let o=null;tn=null,tn={},o=xi(tn);const i=performance.timeOrigin,s=performance.now();return e=requestAnimationFrame(()=>{t=setTimeout(()=>{const l=performance.now(),c=l-s,d=performance.timeOrigin;rr.push(l+d);const p=rr.filter(v=>l+d-v<=1e3),u=p.length;rr=p;const h=hn!==null&&fn!==null?l+d-(fn+hn)<100:null,f=zr!==null&&zr;if(c>ki&&!h&&document.visibilityState==="visible"&&!f){const v=d+l,x=s+i;Wt.getState().actions.addEvent({kind:"long-render",id:ze(),data:{endAt:v,startAt:x,meta:{fiberRenders:tn,latency:c,fps:u}}})}hn=null,fn=null,o?.(),n()},0)}),o}const r=n();return()=>{r(),cancelAnimationFrame(e),clearTimeout(t)}}var Sd=()=>{const e=md(),t=kd(),n=_d(),r=Cd(),o=async(c,d,p)=>{Wt.getState().actions.addEvent({kind:"interaction",id:ze(),data:{startAt:d.detailedTiming.blockingTimeStart,endAt:performance.now()+performance.timeOrigin,meta:{...d,kind:p.kind}}});const u=Nn.getChannelState("recording");d.detailedTiming.stopListeningForRenders(),u.length&&Nn.updateChannelState("recording",()=>new fe(Re))},i=sa("pointer",{onComplete:o}),s=sa("keyboard",{onComplete:o}),l=vd(c=>{oa.setState(fe.fromArray(oa.getCurrentState().concat(c),wi))});return()=>{t(),n(),r(),e(),i(),l(),s()}},Ht=e=>{const t=e.filter(n=>n.length>2);return t.length===0?e.at(-1)??"Unknown":t.at(-1)},ve=e=>{switch(e.kind){case"interaction":{const{renderTime:t,otherJSTime:n,framePreparation:r,frameConstruction:o,frameDraw:i}=e;return t+n+r+o+(i??0)}case"dropped-frames":return e.otherTime+e.renderTime}},Td=e=>e.wasFiberRenderMount||e.hasMemoCache?!1:e.changes.context.length===0&&e.changes.props.length===0&&e.changes.state.length===0,qt=e=>{const t=ve(e.timing);switch(e.kind){case"interaction":return t<200?"low":t<500?"needs-improvement":"high";case"dropped-frames":return t<50?"low":t<ki?"needs-improvement":"high"}},Se=()=>Wr(_i),_i=$a(null),Ci=({size:e=24,className:t})=>a("svg",{xmlns:"http://www.w3.org/2000/svg",width:e,height:e,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",className:w(["lucide lucide-chevron-right",t]),children:a("path",{d:"m9 18 6-6-6-6"})}),Nd=({className:e="",size:t=24,events:n=[]})=>{const r=n.includes(!0),o=n.filter(l=>l).length,i=o>99?">99":o,s=r?Math.max(t*.6,14):Math.max(t*.4,6);return a("div",{className:"relative",children:[a("svg",{xmlns:"http://www.w3.org/2000/svg",width:t,height:t,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",className:`lucide lucide-bell ${e}`,children:[a("path",{d:"M10.268 21a2 2 0 0 0 3.464 0"}),a("path",{d:"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"})]}),n.length>0&&o>0&&X.options.value.showNotificationCount&&a("div",{className:w(["absolute",r?"-top-2.5 -right-2.5":"-top-1 -right-1","rounded-full","flex items-center justify-center","text-[8px] font-medium text-white","aspect-square",r?"bg-red-500/90":"bg-purple-500/90"]),style:{width:`${s}px`,height:`${s}px`,padding:r?"0.5px":"0"},children:r&&i})]})},En=({className:e="",size:t=24})=>a("svg",{xmlns:"http://www.w3.org/2000/svg",width:t,height:t,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",className:e,children:[a("path",{d:"M18 6 6 18"}),a("path",{d:"m6 6 12 12"})]}),Ed=({className:e="",size:t=24})=>a("svg",{xmlns:"http://www.w3.org/2000/svg",width:t,height:t,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",className:e,children:[a("path",{d:"M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"}),a("path",{d:"M16 9a5 5 0 0 1 0 6"}),a("path",{d:"M19.364 18.364a9 9 0 0 0 0-12.728"})]}),zd=({className:e="",size:t=24})=>a("svg",{xmlns:"http://www.w3.org/2000/svg",width:t,height:t,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",className:e,children:[a("path",{d:"M16 9a5 5 0 0 1 .95 2.293"}),a("path",{d:"M19.364 5.636a9 9 0 0 1 1.889 9.96"}),a("path",{d:"m2 2 20 20"}),a("path",{d:"m7 7-.587.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298V11"}),a("path",{d:"M9.828 4.172A.686.686 0 0 1 11 4.657v.686"})]}),Ad=({size:e=24,className:t})=>a("svg",{xmlns:"http://www.w3.org/2000/svg",width:e,height:e,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",className:w(["lucide lucide-arrow-left",t]),children:[a("path",{d:"m12 19-7-7 7-7"}),a("path",{d:"M19 12H5"})]}),Id=({className:e="",size:t=24})=>a("svg",{xmlns:"http://www.w3.org/2000/svg",width:t,height:t,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",className:e,children:[a("path",{d:"M14 4.1 12 6"}),a("path",{d:"m5.1 8-2.9-.8"}),a("path",{d:"m6 12-1.9 2"}),a("path",{d:"M7.2 2.2 8 5.1"}),a("path",{d:"M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z"})]}),Md=({className:e="",size:t=24})=>a("svg",{xmlns:"http://www.w3.org/2000/svg",width:t,height:t,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",className:e,children:[a("path",{d:"M10 8h.01"}),a("path",{d:"M12 12h.01"}),a("path",{d:"M14 8h.01"}),a("path",{d:"M16 12h.01"}),a("path",{d:"M18 8h.01"}),a("path",{d:"M6 8h.01"}),a("path",{d:"M7 16h10"}),a("path",{d:"M8 12h.01"}),a("rect",{width:"20",height:"16",x:"2",y:"4",rx:"2"})]}),Fd=({className:e="",size:t=24})=>a("svg",{xmlns:"http://www.w3.org/2000/svg",width:t,height:t,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",className:e,style:{transform:"rotate(180deg)"},children:[a("circle",{cx:"12",cy:"12",r:"10"}),a("path",{d:"m4.9 4.9 14.2 14.2"})]}),Rd=({className:e="",size:t=24})=>a("svg",{xmlns:"http://www.w3.org/2000/svg",width:t,height:t,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",className:e,children:[a("polyline",{points:"22 17 13.5 8.5 8.5 13.5 2 7"}),a("polyline",{points:"16 17 22 17 22 11"})]}),Si=({children:e,triggerContent:t,wrapperProps:n})=>{const[r,o]=U("closed"),[i,s]=U(null),[l,c]=U({width:window.innerWidth,height:window.innerHeight}),d=M(null),p=M(null),u=Wr(ao),h=M(!1);H(()=>{const m=()=>{c({width:window.innerWidth,height:window.innerHeight}),f()};return window.addEventListener("resize",m),()=>window.removeEventListener("resize",m)},[]);const f=()=>{if(d.current&&u){const m=d.current.getBoundingClientRect(),b=u.getBoundingClientRect(),C=m.left+m.width/2,S=m.top,T=new DOMRect(C-b.left,S-b.top,m.width,m.height);s(T)}};H(()=>{f()},[d.current]),H(()=>{if(r==="opening"){const m=setTimeout(()=>o("open"),120);return()=>clearTimeout(m)}else if(r==="closing"){const m=setTimeout(()=>o("closed"),120);return()=>clearTimeout(m)}},[r]),H(()=>{const m=setInterval(()=>{!h.current&&r!=="closed"&&o("closing")},1e3);return()=>clearInterval(m)},[r]);const v=()=>{h.current=!0,f(),o("opening")},x=()=>{h.current=!1,f(),o("closing")},y=()=>{if(!i||!u)return{top:0,left:0};const m=u.getBoundingClientRect(),b=175,C=p.current?.offsetHeight||40,S=5,T=i.x+m.left,I=i.y+m.top;let V=T,q=I-4;return V-b/2<S?V=S+b/2:V+b/2>l.width-S&&(V=l.width-S-b/2),q-C<S&&(q=I+i.height+4),{top:q-m.top,left:V-m.left}};return a(Y,{children:[u&&i&&r!=="closed"&&zs(a("div",{ref:p,className:w(["absolute z-100 bg-white text-black rounded-lg px-3 py-2 shadow-lg","transform transition-all duration-120 ease-[cubic-bezier(0.23,1,0.32,1)]",'after:content-[""] after:absolute after:top-[100%]',"after:left-1/2 after:-translate-x-1/2","after:w-[10px] after:h-[6px]","after:border-l-[5px] after:border-l-transparent","after:border-r-[5px] after:border-r-transparent","after:border-t-[6px] after:border-t-white","pointer-events-none",r==="opening"||r==="closing"?"opacity-0 translate-y-1":"opacity-100 translate-y-0"]),style:{top:y().top+"px",left:y().left+"px",transform:"translate(-50%, -100%)",minWidth:"175px"},children:e}),u),a("div",{ref:d,onMouseEnter:v,onMouseLeave:x,...n,children:t})]})},$d=({selectedEvent:e})=>{const{notificationState:t,setNotificationState:n,setRoute:r}=Se();return a("div",{className:w(["flex w-full justify-between items-center px-3 py-2 text-xs"]),children:[a("div",{className:w(["bg-[#18181B] flex items-center gap-x-1 p-1 rounded-sm"]),children:[a("button",{onClick:()=>{r({route:"render-visualization",routeMessage:null})},className:w(["w-1/2 flex items-center justify-center whitespace-nowrap py-[5px] px-1 gap-x-1",t.route==="render-visualization"||t.route==="render-explanation"?"text-white bg-[#7521c8] rounded-sm":"text-[#6E6E77] bg-[#18181B] rounded-sm"]),children:"Ranked"}),a("button",{onClick:()=>{r({route:"other-visualization",routeMessage:null})},className:w(["w-1/2 flex items-center justify-center whitespace-nowrap py-[5px] px-1 gap-x-1",t.route==="other-visualization"?"text-white bg-[#7521c8] rounded-sm":"text-[#6E6E77] bg-[#18181B] rounded-sm"]),children:"Overview"}),a("button",{onClick:()=>{r({route:"optimize",routeMessage:null})},className:w(["w-1/2 flex items-center justify-center whitespace-nowrap py-[5px] px-1 gap-x-1",t.route==="optimize"?"text-white bg-[#7521c8] rounded-sm":"text-[#6E6E77] bg-[#18181B] rounded-sm"]),children:a("span",{children:"Prompts"})})]}),a(Si,{triggerContent:a("button",{onClick:()=>{n(o=>{o.audioNotificationsOptions.enabled&&o.audioNotificationsOptions.audioContext.state!=="closed"&&o.audioNotificationsOptions.audioContext.close();const i=o.audioNotificationsOptions.enabled;localStorage.setItem("react-scan-notifications-audio",String(!i));const s=new AudioContext;return o.audioNotificationsOptions.enabled||Br(s),i&&s.close(),{...o,audioNotificationsOptions:i?{audioContext:null,enabled:!1}:{audioContext:s,enabled:!0}}})},className:"ml-auto",children:a("div",{className:w(["flex gap-x-2 justify-center items-center text-[#6E6E77]"]),children:[a("span",{children:"Alerts"}),t.audioNotificationsOptions.enabled?a(Ed,{size:16,className:"text-[#6E6E77]"}):a(zd,{size:16,className:"text-[#6E6E77]"})]})}),children:a(Y,{children:"Play a chime when a slowdown is recorded"})})]})},dt=e=>{let t="";return e.toSorted((r,o)=>o.totalTime-r.totalTime).slice(0,30).filter(r=>r.totalTime>5).forEach(r=>{let o="";o+="Component Name:",o+=r.name,o+=`
`,o+=`Rendered: ${r.count} times
`,o+=`Sum of self times for ${r.name} is ${r.totalTime.toFixed(0)}ms
`,r.changes.props.length>0&&(o+=`Changed props for all ${r.name} instances ("name:count" pairs)
`,r.changes.props.forEach(i=>{o+=`${i.name}:${i.count}x
`})),r.changes.state.length>0&&(o+=`Changed state for all ${r.name} instances ("hook index:count" pairs)
`,r.changes.state.forEach(i=>{o+=`${i.index}:${i.count}x
`})),r.changes.context.length>0&&(o+=`Changed context for all ${r.name} instances ("context display name (if exists):count" pairs)
`,r.changes.context.forEach(i=>{o+=`${i.name}:${i.count}x
`})),t+=o,t+=`
`}),t},Dd=({renderTime:e,eHandlerTimeExcludingRenders:t,toRafTime:n,commitTime:r,framePresentTime:o,formattedReactData:i})=>`I will provide you with a set of high level, and low level performance data about an interaction in a React App:
### High level
- react component render time: ${e.toFixed(0)}ms
- how long it took to run javascript event handlers (EXCLUDING REACT RENDERS): ${t.toFixed(0)}ms
- how long it took from the last event handler time, to the last request animation frame: ${n.toFixed(0)}ms
	- things like prepaint, style recalculations, layerization, async web API's like observers may occur during this time
- how long it took from the last request animation frame to when the dom was committed: ${r.toFixed(0)}ms
	- during this period you will see paint, commit, potential style recalcs, and other misc browser activity. Frequently high times here imply css that makes the browser do a lot of work, or mutating expensive dom properties during the event handler stage. This can be many things, but it narrows the problem scope significantly when this is high
${o===null?"":`- how long it took from dom commit for the frame to be presented: ${o.toFixed(0)}ms. This is when information about how to paint the next frame is sent to the compositor threads, and when the GPU does work. If this is high, look for issues that may be a bottleneck for operations occurring during this time`}

### Low level
We also have lower level information about react components, such as their render time, and which props/state/context changed when they re-rendered.
${i}`,Pd=({interactionType:e,name:t,componentPath:n,time:r,renderTime:o,eHandlerTimeExcludingRenders:i,toRafTime:s,commitTime:l,framePresentTime:c,formattedReactData:d})=>`You will attempt to implement a performance improvement to a user interaction in a React app. You will be provided with data about the interaction, and the slow down.

Your should split your goals into 2 parts:
- identifying the problem
- fixing the problem
	- it is okay to implement a fix even if you aren't 100% sure the fix solves the performance problem. When you aren't sure, you should tell the user to try repeating the interaction, and feeding the "Formatted Data" in the React Scan notifications optimize tab. This allows you to start a debugging flow with the user, where you attempt a fix, and observe the result. The user may make a mistake when they pass you the formatted data, so must make sure, given the data passed to you, that the associated data ties to the same interaction you were trying to debug.


Make sure to check if the user has the react compiler enabled (project dependent, configured through build tool), so you don't unnecessarily memoize components. If it is, you do not need to worry about memoizing user components

One challenge you may face is the performance problem lies in a node_module, not in user code. If you are confident the problem originates because of a node_module, there are multiple strategies, which are context dependent:
- you can try to work around the problem, knowing which module is slow
- you can determine if its possible to resolve the problem in the node_module by modifying non node_module code
- you can monkey patch the node_module to experiment and see if it's really the problem (you can modify a functions properties to hijack the call for example)
- you can determine if it's feasible to replace whatever node_module is causing the problem with a performant option (this is an extreme)

The interaction was a ${e} on the component named ${t}. This component has the following ancestors ${n}. This is the path from the component, to the root. This should be enough information to figure out where this component is in the user's code base

This path is the component that was clicked, so it should tell you roughly where component had an event handler that triggered a state change.

Please note that the leaf node of this path might not be user code (if they use a UI library), and they may contain many wrapper components that just pass through children that aren't relevant to the actual click. So make you sure analyze the path and understand what the user code is doing

We have a set of high level, and low level data about the performance issue.

The click took ${r.toFixed(0)}ms from interaction start, to when a new frame was presented to a user.

We also provide you with a breakdown of what the browser spent time on during the period of interaction start to frame presentation.

- react component render time: ${o.toFixed(0)}ms
- how long it took to run javascript event handlers (EXCLUDING REACT RENDERS): ${i.toFixed(0)}ms
- how long it took from the last event handler time, to the last request animation frame: ${s.toFixed(0)}ms
	- things like prepaint, style recalculations, layerization, async web API's like observers may occur during this time
- how long it took from the last request animation frame to when the dom was committed: ${l.toFixed(0)}ms
	- during this period you will see paint, commit, potential style recalcs, and other misc browser activity. Frequently high times here imply css that makes the browser do a lot of work, or mutating expensive dom properties during the event handler stage. This can be many things, but it narrows the problem scope significantly when this is high
${c===null?"":`- how long it took from dom commit for the frame to be presented: ${c.toFixed(0)}ms. This is when information about how to paint the next frame is sent to the compositor threads, and when the GPU does work. If this is high, look for issues that may be a bottleneck for operations occurring during this time`}


We also have lower level information about react components, such as their render time, and which props/state/context changed when they re-rendered.

${d}

You may notice components have many renders, but much fewer props/state/context changes. This normally implies most of the components could of been memoized to avoid computation

It's also important to remember if a component had no props/state/context change, and it was memoized, it would not render. So the flow should be:
- find the most expensive components
- see what's causing them to render
- determine how you can make those state/props/context not change for a large set of the renders
- once there are no more changes left, you can memoize the component so it no longer unnecessarily re-renders. 

An important thing to note is that if you see a lot of react renders (some components with very high render counts), but javascript excluding renders is much higher than render time, it is possible that the components with lots of renders run hooks like useEffect/useLayoutEffect, which run during the JS event handler period.

It's also good to note that react profiles hook times in development, and if many hooks are called (lets say 5,000 components all called a useEffect), it will have to profile every single one. And it may also be the case the comparison of the hooks dependency can be expensive, and that would not be tracked in render time.

If a node_module is the component with high renders, you can experiment to see if that component is the root issue (because of hooks). You should use the same instructions for node_module debugging mentioned previously.

`,Od=({renderTime:e,otherTime:t,formattedReactData:n})=>`You will attempt to implement a performance improvement to a large slowdown in a react app

Your should split your goals into 2 parts:
- identifying the problem
- fixing the problem
	- it is okay to implement a fix even if you aren't 100% sure the fix solves the performance problem. When you aren't sure, you should tell the user to try repeating the interaction, and feeding the "Formatted Data" in the React Scan notifications optimize tab. This allows you to start a debugging flow with the user, where you attempt a fix, and observe the result. The user may make a mistake when they pass you the formatted data, so must make sure, given the data passed to you, that the associated data ties to the same interaction you were trying to debug.

Make sure to check if the user has the react compiler enabled (project dependent, configured through build tool), so you don't unnecessarily memoize components. If it is, you do not need to worry about memoizing user components

One challenge you may face is the performance problem lies in a node_module, not in user code. If you are confident the problem originates because of a node_module, there are multiple strategies, which are context dependent:
- you can try to work around the problem, knowing which module is slow
- you can determine if its possible to resolve the problem in the node_module by modifying non node_module code
- you can monkey patch the node_module to experiment and see if it's really the problem (you can modify a functions properties to hijack the call for example)
- you can determine if it's feasible to replace whatever node_module is causing the problem with a performant option (this is an extreme)


We have the high level time of how much react spent rendering, and what else the browser spent time on during this slowdown

- react component render time: ${e.toFixed(0)}ms
- other time: ${t}ms


We also have lower level information about react components, such as their render time, and which props/state/context changed when they re-rendered.

${n}

You may notice components have many renders, but much fewer props/state/context changes. This normally implies most of the components could of been memoized to avoid computation

It's also important to remember if a component had no props/state/context change, and it was memoized, it would not render. So the flow should be:
- find the most expensive components
- see what's causing them to render
- determine how you can make those state/props/context not change for a large set of the renders
- once there are no more changes left, you can memoize the component so it no longer unnecessarily re-renders. 

An important thing to note is that if you see a lot of react renders (some components with very high render counts), but other time is much higher than render time, it is possible that the components with lots of renders run hooks like useEffect/useLayoutEffect, which run outside of what we profile (just react render time).

It's also good to note that react profiles hook times in development, and if many hooks are called (lets say 5,000 components all called a useEffect), it will have to profile every single one. And it may also be the case the comparison of the hooks dependency can be expensive, and that would not be tracked in render time.

If a node_module is the component with high renders, you can experiment to see if that component is the root issue (because of hooks). You should use the same instructions for node_module debugging mentioned previously.

If renders don't seem to be the problem, see if there are any expensive CSS properties being added/mutated, or any expensive DOM Element mutations/new elements being created that could cause this slowdown. 
`,Ld=({renderTime:e,otherTime:t,formattedReactData:n})=>`Your goal will be to help me find the source of a performance problem in a React App. I collected a large dataset about this specific performance problem.

We have the high level time of how much react spent rendering, and what else the browser spent time on during this slowdown

- react component render time: ${e.toFixed(0)}ms
- other time (other JavaScript, hooks like useEffect, style recalculations, layerization, paint & commit and everything else the browser might do to draw a new frame after javascript mutates the DOM): ${t}ms


We also have lower level information about react components, such as their render time, and which props/state/context changed when they re-rendered.

${n}

You may notice components have many renders, but much fewer props/state/context changes. This normally implies most of the components could of been memoized to avoid computation

It's also important to remember if a component had no props/state/context change, and it was memoized, it would not render. So a flow we can go through is:
- find the most expensive components
- see what's causing them to render
- determine how you can make those state/props/context not change for a large set of the renders
- once there are no more changes left, you can memoize the component so it no longer unnecessarily re-renders. 


An important thing to note is that if you see a lot of react renders (some components with very high render counts), but other time is much higher than render time, it is possible that the components with lots of renders run hooks like useEffect/useLayoutEffect, which run outside of what we profile (just react render time).

It's also good to note that react profiles hook times in development, and if many hooks are called (lets say 5,000 components all called a useEffect), it will have to profile every single one, and this can add significant overhead when thousands of effects ran.

If it's not possible to explain the root problem from this data, please ask me for more data explicitly, and what we would need to know to find the source of the performance problem.
`,jd=({renderTime:e,otherTime:t,formattedReactData:n})=>`I will provide you with a set of high level, and low level performance data about a large frame drop in a React App:
### High level
- react component render time: ${e.toFixed(0)}ms
- how long it took to run everything else (other JavaScript, hooks like useEffect, style recalculations, layerization, paint & commit and everything else the browser might do to draw a new frame after javascript mutates the DOM): ${t}ms

### Low level
We also have lower level information about react components, such as their render time, and which props/state/context changed when they re-rendered.
${n}`,Wd=({interactionType:e,name:t,time:n,renderTime:r,eHandlerTimeExcludingRenders:o,toRafTime:i,commitTime:s,framePresentTime:l,formattedReactData:c})=>`Your goal will be to help me find the source of a performance problem. I collected a large dataset about this specific performance problem.

There was a ${e} on a component named ${t}. This means, roughly, the component that handled the ${e} event was named ${t}.

We have a set of high level, and low level data about the performance issue.

The click took ${n.toFixed(0)}ms from interaction start, to when a new frame was presented to a user.

We also provide you with a breakdown of what the browser spent time on during the period of interaction start to frame presentation.

- react component render time: ${r.toFixed(0)}ms
- how long it took to run javascript event handlers (EXCLUDING REACT RENDERS): ${o.toFixed(0)}ms
- how long it took from the last event handler time, to the last request animation frame: ${i.toFixed(0)}ms
	- things like prepaint, style recalculations, layerization, async web API's like observers may occur during this time
- how long it took from the last request animation frame to when the dom was committed: ${s.toFixed(0)}ms
	- during this period you will see paint, commit, potential style recalcs, and other misc browser activity. Frequently high times here imply css that makes the browser do a lot of work, or mutating expensive dom properties during the event handler stage. This can be many things, but it narrows the problem scope significantly when this is high
${l===null?"":`- how long it took from dom commit for the frame to be presented: ${l.toFixed(0)}ms. This is when information about how to paint the next frame is sent to the compositor threads, and when the GPU does work. If this is high, look for issues that may be a bottleneck for operations occurring during this time`}

We also have lower level information about react components, such as their render time, and which props/state/context changed when they re-rendered.

${c}


You may notice components have many renders, but much fewer props/state/context changes. This normally implies most of the components could of been memoized to avoid computation

It's also important to remember if a component had no props/state/context change, and it was memoized, it would not render. So a flow we can go through is:
- find the most expensive components
- see what's causing them to render
- determine how you can make those state/props/context not change for a large set of the renders
- once there are no more changes left, you can memoize the component so it no longer unnecessarily re-renders. 


An important thing to note is that if you see a lot of react renders (some components with very high render counts), but javascript excluding renders is much higher than render time, it is possible that the components with lots of renders run hooks like useEffect/useLayoutEffect, which run during the JS event handler period.

It's also good to note that react profiles hook times in development, and if many hooks are called (lets say 5,000 components all called a useEffect), it will have to profile every single one. And it may also be the case the comparison of the hooks dependency can be expensive, and that would not be tracked in render time.

If it's not possible to explain the root problem from this data, please ask me for more data explicitly, and what we would need to know to find the source of the performance problem.
`,Ar=(e,t)=>Ie(()=>{switch(e){case"data":switch(t.kind){case"dropped-frames":return jd({formattedReactData:dt(t.groupedFiberRenders),renderTime:t.groupedFiberRenders.reduce((n,r)=>n+r.totalTime,0),otherTime:t.timing.otherTime});case"interaction":return Dd({commitTime:t.timing.frameConstruction,eHandlerTimeExcludingRenders:t.timing.otherJSTime,formattedReactData:dt(t.groupedFiberRenders),framePresentTime:t.timing.frameDraw,renderTime:t.groupedFiberRenders.reduce((n,r)=>n+r.totalTime,0),toRafTime:t.timing.framePreparation})}case"explanation":switch(t.kind){case"dropped-frames":return Ld({formattedReactData:dt(t.groupedFiberRenders),renderTime:t.groupedFiberRenders.reduce((n,r)=>n+r.totalTime,0),otherTime:t.timing.otherTime});case"interaction":return Wd({commitTime:t.timing.frameConstruction,eHandlerTimeExcludingRenders:t.timing.otherJSTime,formattedReactData:dt(t.groupedFiberRenders),framePresentTime:t.timing.frameDraw,interactionType:t.type,name:Ht(t.componentPath),renderTime:t.groupedFiberRenders.reduce((n,r)=>n+r.totalTime,0),time:ve(t.timing),toRafTime:t.timing.framePreparation})}case"fix":switch(t.kind){case"dropped-frames":return Od({formattedReactData:dt(t.groupedFiberRenders),renderTime:t.groupedFiberRenders.reduce((n,r)=>n+r.totalTime,0),otherTime:t.timing.otherTime});case"interaction":return Pd({commitTime:t.timing.frameConstruction,componentPath:t.componentPath.join(">"),eHandlerTimeExcludingRenders:t.timing.otherJSTime,formattedReactData:dt(t.groupedFiberRenders),framePresentTime:t.timing.frameDraw,interactionType:t.type,name:Ht(t.componentPath),renderTime:t.groupedFiberRenders.reduce((n,r)=>n+r.totalTime,0),time:ve(t.timing),toRafTime:t.timing.framePreparation})}}}),Hd=({selectedEvent:e})=>{const[t,n]=U("fix"),[r,o]=U(!1);return a("div",{className:w(["w-full h-full"]),children:[a("div",{className:w(["border border-[#27272A] rounded-sm h-4/5 text-xs overflow-hidden"]),children:[a("div",{className:w(["bg-[#18181B] p-1 rounded-t-sm"]),children:a("div",{className:w(["flex items-center gap-x-1"]),children:[a("button",{onClick:()=>n("fix"),className:w(["flex items-center justify-center whitespace-nowrap py-1.5 px-3 rounded-sm",t==="fix"?"text-white bg-[#7521c8]":"text-[#6E6E77] hover:text-white"]),children:"Fix"}),a("button",{onClick:()=>n("explanation"),className:w(["flex items-center justify-center whitespace-nowrap py-1.5 px-3 rounded-sm",t==="explanation"?"text-white bg-[#7521c8]":"text-[#6E6E77] hover:text-white"]),children:"Explanation"}),a("button",{onClick:()=>n("data"),className:w(["flex items-center justify-center whitespace-nowrap py-1.5 px-3 rounded-sm",t==="data"?"text-white bg-[#7521c8]":"text-[#6E6E77] hover:text-white"]),children:"Data"})]})}),a("div",{className:w(["overflow-y-auto h-full"]),children:a("pre",{className:w(["p-2 h-full","whitespace-pre-wrap break-words","text-gray-300 font-mono "]),children:Ar(t,e)})})]}),a("button",{onClick:async()=>{const i=Ar(t,e);await navigator.clipboard.writeText(i),o(!0),setTimeout(()=>o(!1),1e3)},className:w(["mt-4 px-4 py-2 bg-[#18181B] text-[#6E6E77] rounded-sm","hover:text-white transition-colors duration-200","flex items-center justify-center gap-x-2 text-xs"]),children:[a("span",{children:r?"Copied!":"Copy Prompt"}),a("svg",{xmlns:"http://www.w3.org/2000/svg",width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",className:w(["transition-transform duration-200",r&&"scale-110"]),children:r?a("path",{d:"M20 6L9 17l-5-5"}):a(Y,{children:[a("rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2"}),a("path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"})]})})]})]})},Ud=(e,t)=>{switch(e.kind){case"dropped-frames":return[...t?[{name:"Total Processing Time",time:ve(e.timing),color:"bg-red-500",kind:"total-processing-time"}]:[{name:"Renders",time:e.timing.renderTime,color:"bg-purple-500",kind:"render"},{name:"JavaScript, DOM updates, Draw Frame",time:e.timing.otherTime,color:"bg-[#4b4b4b]",kind:"other-frame-drop"}]];case"interaction":return[...t?[]:[{name:"Renders",time:e.timing.renderTime,color:"bg-purple-500",kind:"render"}],{name:t?"React Renders, Hooks, Other JavaScript":"JavaScript/React Hooks ",time:e.timing.otherJSTime,color:"bg-[#EFD81A]",kind:"other-javascript"},{name:"Update DOM and Draw New Frame",time:ve(e.timing)-e.timing.renderTime-e.timing.otherJSTime,color:"bg-[#1D3A66]",kind:"other-not-javascript"}]}},Vd=({selectedEvent:e})=>{const[t]=U(Pn()??!1),{notificationState:n}=Se(),[r,o]=U(n.routeMessage?.name?[n.routeMessage.name]:[]),i=Ud(e,t),s=Wr(ao);H(()=>{if(n.routeMessage?.name){const c=s?.querySelector("#overview-scroll-container"),d=s?.querySelector(`#react-scan-overview-bar-${n.routeMessage.name}`);if(c&&d){const p=d.getBoundingClientRect().top,u=c.getBoundingClientRect().top,h=p-u;c.scrollTop=c.scrollTop+h}}},[n.route]),H(()=>{n.route==="other-visualization"&&o(c=>n.routeMessage?.name?[n.routeMessage.name]:c)},[n.route]);const l=i.reduce((c,d)=>c+d.time,0);return a("div",{className:"rounded-sm border border-zinc-800 text-xs",children:[a("div",{className:"p-2 border-b border-zinc-800 bg-zinc-900/50",children:a("div",{className:"flex items-center justify-between",children:[a("h3",{className:"text-xs font-medium",children:"What was time spent on?"}),a("span",{className:"text-xs text-zinc-400",children:["Total: ",l.toFixed(0),"ms"]})]})}),a("div",{className:"divide-y divide-zinc-800",children:i.map(c=>{const d=r.includes(c.kind);return a("div",{id:`react-scan-overview-bar-${c.kind}`,children:[a("button",{onClick:()=>o(p=>p.includes(c.kind)?p.filter(u=>u!==c.kind):[...p,c.kind]),className:"w-full px-3 py-2 flex items-center gap-4 hover:bg-zinc-800/50 transition-colors",children:a("div",{className:"flex-1",children:[a("div",{className:"flex items-center justify-between mb-2",children:[a("div",{className:"flex items-center gap-0.5",children:[a("svg",{className:`h-4 w-4 text-zinc-400 transition-transform ${d?"rotate-90":""}`,fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:a("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M9 5l7 7-7 7"})}),a("span",{className:"font-medium flex items-center text-left",children:c.name})]}),a("span",{className:" text-zinc-400",children:[c.time.toFixed(0),"ms"]})]}),a("div",{className:"h-1 bg-zinc-800 rounded-full overflow-hidden",children:a("div",{className:`h-full ${c.color} transition-all`,style:{width:`${c.time/l*100}%`}})})]})}),d&&a("div",{className:"bg-zinc-900/30 border-t border-zinc-800 px-2.5 py-3",children:a("p",{className:" text-zinc-400 mb-4 text-xs",children:Ie(()=>{switch(e.kind){case"interaction":switch(c.kind){case"render":return a(ut,{input:Bd(e)});case"other-javascript":return a(ut,{input:Xd(e)});case"other-not-javascript":return a(ut,{input:Yd(e)})}case"dropped-frames":switch(c.kind){case"total-processing-time":return a(ut,{input:{kind:"total-processing",data:{time:ve(e.timing)}}});case"render":return a(Y,{children:a(ut,{input:{kind:"render",data:{topByTime:e.groupedFiberRenders.toSorted((p,u)=>u.totalTime-p.totalTime).slice(0,3).map(p=>({name:p.name,percentage:p.totalTime/ve(e.timing)}))}}})});case"other-frame-drop":return a(ut,{input:{kind:"other"}})}}})})})]},c.kind)})})]})},Yd=e=>{const t=e.groupedFiberRenders.reduce((i,s)=>i+s.count,0),n=e.timing.renderTime,r=ve(e.timing),o=n/r*100;return t>100?{kind:"high-render-count-update-dom-draw-frame",data:{count:t,percentageOfTotal:o,copyButton:a(ua,{})}}:{kind:"update-dom-draw-frame",data:{copyButton:a(ua,{})}}},ua=()=>{const[e,t]=U(!1),{notificationState:n}=Se();return a("button",{onClick:async()=>{n.selectedEvent&&(await navigator.clipboard.writeText(Ar("explanation",n.selectedEvent)),t(!0),setTimeout(()=>t(!1),1e3))},className:"bg-zinc-800 flex hover:bg-zinc-700 text-zinc-200 px-2 py-1 rounded gap-x-3",children:[a("span",{children:e?"Copied!":"Copy Prompt"}),a("svg",{xmlns:"http://www.w3.org/2000/svg",width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",className:w(["transition-transform duration-200",e&&"scale-110"]),children:e?a("path",{d:"M20 6L9 17l-5-5"}):a(Y,{children:[a("rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2"}),a("path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"})]})})]})},Bd=e=>e.timing.renderTime/ve(e.timing)>.3?{kind:"render",data:{topByTime:e.groupedFiberRenders.toSorted((t,n)=>n.totalTime-t.totalTime).slice(0,3).map(t=>({percentage:t.totalTime/ve(e.timing),name:t.name}))}}:{kind:"other"},Xd=e=>{const t=e.groupedFiberRenders.reduce((n,r)=>n+r.count,0);return e.timing.otherJSTime/ve(e.timing)<.2?{kind:"js-explanation-base"}:e.groupedFiberRenders.find(n=>n.count>200)||e.groupedFiberRenders.reduce((n,r)=>n+r.count,0)>500?{kind:"high-render-count-high-js",data:{renderCount:t,topByCount:e.groupedFiberRenders.filter(n=>n.count>100).toSorted((n,r)=>r.count-n.count).slice(0,3)}}:e.timing.otherJSTime/ve(e.timing)>.3?e.timing.renderTime>.2?{kind:"js-explanation-base"}:{kind:"low-render-count-high-js",data:{renderCount:t}}:{kind:"js-explanation-base"}},ut=({input:e})=>{switch(e.kind){case"total-processing":return a("div",{className:w(["text-[#E4E4E7] text-[10px] leading-6 flex flex-col gap-y-2"]),children:[a("p",{children:["This is the time it took to draw the entire frame that was presented to the user. To be at 60FPS, this number needs to be ","<=16ms"]}),a("p",{children:'To debug the issue, check the "Ranked" tab to see if there are significant component renders'}),a("p",{children:"On a production React build, React Scan can't access the time it took for component to render. To get that information, run React Scan on a development build"}),a("p",{children:["To understand precisely what caused the slowdown while in production, use the ",a("strong",{children:"Chrome profiler"})," and analyze the function call times."]}),a("p",{})]});case"render":return a("div",{className:w(["text-[#E4E4E7] text-[10px] leading-6 flex flex-col gap-y-2"]),children:[a("p",{children:"This is the time it took React to run components, and internal logic to handle the output of your component."}),a("div",{className:w(["flex flex-col"]),children:[a("p",{children:"The slowest components for this time period were:"}),e.data.topByTime.map(t=>a("div",{children:[a("strong",{children:t.name}),":"," ",(t.percentage*100).toFixed(0),"% of total"]},t.name))]}),a("p",{children:'To view the render times of all your components, and what caused them to render, go to the "Ranked" tab'}),a("p",{children:'The "Ranked" tab shows the render times of every component.'}),a("p",{children:"The render times of the same components are grouped together into one bar."}),a("p",{children:"Clicking the component will show you what props, state, or context caused the component to re-render."})]});case"js-explanation-base":return a("div",{className:w(["text-[#E4E4E7] text-[10px] leading-6 flex flex-col gap-y-2"]),children:[a("p",{children:"This is the period when JavaScript hooks and other JavaScript outside of React Renders run."}),a("p",{children:["The most common culprit for high JS time is expensive hooks, like expensive callbacks inside of ",a("code",{children:"useEffect"}),"'s or a large number of useEffect's called, but this can also be JavaScript event handlers (",a("code",{children:"'onclick'"}),", ",a("code",{children:"'onchange'"}),") that performed expensive computation."]}),a("p",{children:"If you have lots of components rendering that call hooks, like useEffect, it can add significant overhead even if the callbacks are not expensive. If this is the case, you can try optimizing the renders of those components to avoid the hook from having to run."}),a("p",{children:["You should profile your app using the"," ",a("strong",{children:"Chrome DevTools profiler"})," to learn exactly which functions took the longest to execute."]})]});case"high-render-count-high-js":return a("div",{className:w(["text-[#E4E4E7] text-[10px] leading-6 flex flex-col gap-y-2"]),children:[a("p",{children:"This is the period when JavaScript hooks and other JavaScript outside of React Renders run."}),e.data.renderCount===0?a(Y,{children:[a("p",{children:"There were no renders, which means nothing related to React caused this slowdown. The most likely cause of the slowdown is a slow JavaScript event handler, or code related to a Web API"}),a("p",{children:["You should try to reproduce the slowdown while profiling your website with the",a("strong",{children:"Chrome DevTools profiler"})," to see exactly what functions took the longest to execute."]})]}):a(Y,{children:[" ",a("p",{children:["There were ",a("strong",{children:e.data.renderCount})," renders, which could have contributed to the high JavaScript/Hook time if they ran lots of hooks, like ",a("code",{children:"useEffects"}),"."]}),a("div",{className:w(["flex flex-col"]),children:[a("p",{children:"You should try optimizing the renders of:"}),e.data.topByCount.map(t=>a("div",{children:["- ",a("strong",{children:t.name})," (rendered ",t.count,"x)"]},t.name))]}),"and then checking if the problem still exists.",a("p",{children:["You can also try profiling your app using the"," ",a("strong",{children:"Chrome DevTools profiler"})," to see exactly what functions took the longest to execute."]})]})]});case"low-render-count-high-js":return a("div",{className:w(["text-[#E4E4E7] text-[10px] leading-6 flex flex-col gap-y-2"]),children:[a("p",{children:"This is the period when JavaScript hooks and other JavaScript outside of React Renders run."}),a("p",{children:["There were only ",a("strong",{children:e.data.renderCount})," renders detected, which means either you had very expensive hooks like"," ",a("code",{children:"useEffect"}),"/",a("code",{children:"useLayoutEffect"}),", or there is other JavaScript running during this interaction that took up the majority of the time."]}),a("p",{children:["To understand precisely what caused the slowdown, use the"," ",a("strong",{children:"Chrome profiler"})," and analyze the function call times."]})]});case"high-render-count-update-dom-draw-frame":return a("div",{className:w(["text-[#E4E4E7] text-[10px] leading-6 flex flex-col gap-y-2"]),children:[a("p",{children:"These are the calculations the browser is forced to do in response to the JavaScript that ran during the interaction."}),a("p",{children:"This can be caused by CSS updates/CSS recalculations, or new DOM elements/DOM mutations."}),a("p",{children:["During this interaction, there were"," ",a("strong",{children:e.data.count})," renders, which was"," ",a("strong",{children:[e.data.percentageOfTotal.toFixed(0),"%"]})," of the time spent processing"]}),a("p",{children:"The work performed as a result of the renders may have forced the browser to spend a lot of time to draw the next frame."}),a("p",{children:'You can try optimizing the renders to see if the performance problem still exists using the "Ranked" tab.'}),a("p",{children:"If you use an AI-based code editor, you can export the performance data collected as a prompt."}),a("p",{children:e.data.copyButton}),a("p",{children:"Provide this formatted data to the model and ask it to find, or fix, what could be causing this performance problem."}),a("p",{children:'For a larger selection of prompts, try the "Prompts" tab'})]});case"update-dom-draw-frame":return a("div",{className:w(["text-[#E4E4E7] text-[10px] leading-6 flex flex-col gap-y-2"]),children:[a("p",{children:"These are the calculations the browser is forced to do in response to the JavaScript that ran during the interaction."}),a("p",{children:"This can be caused by CSS updates/CSS recalculations, or new DOM elements/DOM mutations."}),a("p",{children:"If you use an AI-based code editor, you can export the performance data collected as a prompt."}),a("p",{children:e.data.copyButton}),a("p",{children:"Provide this formatted data to the model and ask it to find, or fix, what could be causing this performance problem."}),a("p",{children:'For a larger selection of prompts, try the "Prompts" tab'})]});case"other":return a("div",{className:w(["text-[#E4E4E7] text-[10px] leading-6 flex flex-col gap-y-2"]),children:[a("p",{children:["This is the time it took to run everything other than React renders. This can be hooks like ",a("code",{children:"useEffect"}),", other JavaScript not part of React, or work the browser has to do to update the DOM and draw the next frame."]}),a("p",{children:["To get a better picture of what happened, profile your app using the"," ",a("strong",{children:"Chrome profiler"})," when the performance problem arises."]})]})}},ne=null,ae=null,Z=de({kind:"idle",current:null}),or=null,bt=()=>{or&&cancelAnimationFrame(or),or=requestAnimationFrame(()=>{if(!ne||!ae)return;ae.clearRect(0,0,ne.width,ne.height);const e="hsl(271, 76%, 53%)",t=Z.value,{alpha:n,current:r}=Ie(()=>{switch(t.kind){case"transition":{const o=t.current?.alpha&&t.current.alpha>0?t.current:t.transitionTo;return{alpha:o?o.alpha:0,current:o}}case"move-out":return{alpha:t.current?.alpha??0,current:t.current};case"idle":return{alpha:1,current:t.current}}});switch(r?.rects.forEach(o=>{ae&&(ae.shadowColor=e,ae.shadowBlur=6,ae.strokeStyle=e,ae.lineWidth=2,ae.globalAlpha=n,ae.beginPath(),ae.rect(o.left,o.top,o.width,o.height),ae.stroke(),ae.shadowBlur=0,ae.beginPath(),ae.rect(o.left,o.top,o.width,o.height),ae.stroke())}),t.kind){case"move-out":{if(t.current.alpha===0){Z.value={kind:"idle",current:null};return}t.current.alpha<=.01&&(t.current.alpha=0),t.current.alpha=Math.max(0,t.current.alpha-.03),bt();return}case"transition":{if(t.current&&t.current.alpha>0){t.current.alpha=Math.max(0,t.current.alpha-.03),bt();return}if(t.transitionTo.alpha===1){Z.value={kind:"idle",current:t.transitionTo};return}t.transitionTo.alpha=Math.min(t.transitionTo.alpha+.03,1),bt()}case"idle":return}})},ar=null,qd=e=>{if(ne=document.createElement("canvas"),ae=ne.getContext("2d",{alpha:!0}),!ae)return null;const t=window.devicePixelRatio||1,{innerWidth:n,innerHeight:r}=window;ne.style.width=`${n}px`,ne.style.height=`${r}px`,ne.width=n*t,ne.height=r*t,ne.style.position="fixed",ne.style.left="0",ne.style.top="0",ne.style.pointerEvents="none",ne.style.zIndex="2147483600",ae.scale(t,t),e.appendChild(ne),ar&&window.removeEventListener("resize",ar);const o=()=>{if(!ne||!ae)return;const i=window.devicePixelRatio||1,{innerWidth:s,innerHeight:l}=window;ne.style.width=`${s}px`,ne.style.height=`${l}px`,ne.width=s*i,ne.height=l*i,ae.scale(i,i),bt()};return ar=o,window.addEventListener("resize",o),Z.subscribe(()=>{requestAnimationFrame(()=>{bt()})}),Gd};function Gd(){ne?.parentNode&&ne.parentNode.removeChild(ne),ne=null,ae=null}var zt=()=>{const e=Z.value.current?Z.value.current:Z.value.kind==="transition"?Z.value.transitionTo:null;if(e){if(Z.value.kind==="transition"){Z.value={kind:"move-out",current:Z.value.current?.alpha===0?Z.value.transitionTo:Z.value.current??Z.value.transitionTo};return}Z.value={kind:"move-out",current:{alpha:0,...e}}}},Jd=({selectedEvent:e})=>{const t=ve(e.timing),n=t-e.timing.renderTime,[r]=U(Pn()),i=e.groupedFiberRenders.map(d=>({event:d,kind:"render",totalTime:r?d.count:d.totalTime})),s=Ie(()=>{switch(e.kind){case"dropped-frames":return e.timing.renderTime/t<.1;case"interaction":return(e.timing.otherJSTime+e.timing.renderTime)/t<.2}});e.kind==="interaction"&&!r&&i.push({kind:"other-javascript",totalTime:e.timing.otherJSTime}),s&&!r&&(e.kind==="interaction"?i.push({kind:"other-not-javascript",totalTime:ve(e.timing)-e.timing.renderTime-e.timing.otherJSTime}):i.push({kind:"other-frame-drop",totalTime:n}));const l=M({lastCallAt:null,timer:null}),c=i.reduce((d,p)=>d+p.totalTime,0);return a("div",{className:w(["flex flex-col h-full w-full gap-y-1"]),children:[Ie(()=>{if(r&&i.length===0)return a("div",{className:"flex flex-col items-center justify-center h-full text-zinc-400",children:[a("p",{className:"text-sm w-full text-left text-white mb-1.5",children:"No data available"}),a("p",{className:"text-x w-full text-lefts",children:"No data was collected during this period"})]});if(i.length===0)return a("div",{className:"flex flex-col items-center justify-center h-full text-zinc-400",children:[a("p",{className:"text-sm w-full text-left text-white mb-1.5",children:"No renders collected"}),a("p",{className:"text-x w-full text-lefts",children:"There were no renders during this period"})]})}),i.toSorted((d,p)=>p.totalTime-d.totalTime).map(d=>a(Ti,{bars:i,bar:d,debouncedMouseEnter:l,totalBarTime:c,isProduction:r},d.kind==="render"?d.event.id:d.kind))]})},Kd=e=>e.current&&e.current.alpha>0?"fading-out":"fading-in",Ti=({bar:e,debouncedMouseEnter:t,totalBarTime:n,isProduction:r,bars:o,depth:i=0})=>{const{setNotificationState:s,setRoute:l}=Se(),[c,d]=U(!1),p=e.kind==="render"?e.event.parents.size===0:!0,u=o.filter(v=>v.kind==="render"&&e.kind==="render"?e.event.parents.has(v.event.name)&&v.event.name!==e.event.name:!1),h=e.kind==="render"?Array.from(e.event.parents).filter(v=>!o.some(x=>x.kind==="render"&&x.event.name===v)):[],f=()=>{e.kind==="render"?(s(v=>({...v,selectedFiber:e.event})),l({route:"render-explanation",routeMessage:null})):l({route:"other-visualization",routeMessage:{kind:"auto-open-overview-accordion",name:e.kind}})};return a("div",{className:"w-full",children:[a("div",{className:w(["w-full flex items-center relative text-xs min-w-0"]),children:[a("button",{onMouseLeave:()=>{t.current.timer&&clearTimeout(t.current.timer),zt()},onMouseEnter:async()=>{const v=async()=>{if(t.current.lastCallAt=Date.now(),e.kind!=="render"){const C=Z.value.current?Z.value.current:Z.value.kind==="transition"?Z.value.transitionTo:null;if(!C){Z.value={kind:"idle",current:null};return}Z.value={kind:"move-out",current:{alpha:0,...C}};return}const x=Z.value,y=Ie(()=>{switch(x.kind){case"transition":return x.transitionTo;case"idle":case"move-out":return x.current}}),m=[];if(x.kind==="transition"){const C=Kd(x);Ie(()=>{switch(C){case"fading-in":{Z.value={kind:"transition",current:x.transitionTo,transitionTo:{rects:m,alpha:0,name:e.event.name}};return}case"fading-out":{Z.value={kind:"transition",current:Z.value.current?{alpha:0,...Z.value.current}:null,transitionTo:{rects:m,alpha:0,name:e.event.name}};return}}})}else Z.value={kind:"transition",transitionTo:{rects:m,alpha:0,name:e.event.name},current:y?{alpha:0,...y}:null};const b=e.event.elements.filter(C=>C instanceof Element);for await(const C of gi(b))C.forEach(({boundingClientRect:S})=>{m.push(S)}),bt()};if(t.current.lastCallAt&&Date.now()-t.current.lastCallAt<200){t.current.timer&&clearTimeout(t.current.timer),t.current.timer=setTimeout(()=>{v()},200);return}v()},onClick:f,className:w(["h-full w-[90%] flex items-center hover:bg-[#0f0f0f] rounded-l-md min-w-0 relative"]),children:[a("div",{style:{minWidth:"fit-content",width:`${e.totalTime/n*100}%`},className:w(["flex items-center rounded-sm text-white text-xs h-[28px] shrink-0",e.kind==="render"&&"bg-[#412162] group-hover:bg-[#5b2d89]",e.kind==="other-frame-drop"&&"bg-[#44444a] group-hover:bg-[#6a6a6a]",e.kind==="other-javascript"&&"bg-[#efd81a6b] group-hover:bg-[#efda1a2f]",e.kind==="other-not-javascript"&&"bg-[#214379d4] group-hover:bg-[#21437982]"])}),a("div",{className:w(["absolute inset-0 flex items-center px-2","min-w-0"]),children:a("div",{className:"flex items-center gap-x-2 min-w-0 w-full",children:[a("span",{className:w(["truncate"]),children:Ie(()=>{switch(e.kind){case"other-frame-drop":return"JavaScript, DOM updates, Draw Frame";case"other-javascript":return"JavaScript/React Hooks";case"other-not-javascript":return"Update DOM and Draw New Frame";case"render":return e.event.name}})}),e.kind==="render"&&Td(e.event)&&a("div",{style:{lineHeight:"10px"},className:w(["px-1 py-0.5 bg-[#6a369e] flex items-center rounded-sm font-semibold text-[8px] shrink-0"]),children:"Memoizable"})]})})]}),a("button",{onClick:()=>e.kind==="render"&&!p&&d(!c),className:w(["flex items-center min-w-fit shrink-0 rounded-r-md h-[28px]",!p&&"hover:bg-[#0f0f0f]",e.kind==="render"&&!p?"cursor-pointer":"cursor-default"]),children:[a("div",{className:"w-[20px] flex items-center justify-center",children:e.kind==="render"&&!p&&a(Ci,{className:w("transition-transform",c&&"rotate-90"),size:16})}),a("div",{style:{minWidth:p?"fit-content":r?"30px":"60px"},className:"flex items-center justify-end gap-x-1",children:[e.kind==="render"&&a("span",{className:w(["text-[10px]"]),children:["x",e.event.count]}),(e.kind!=="render"||!r)&&a("span",{className:"text-[10px] text-[#7346a0] pr-1",children:[e.totalTime<1?"<1":e.totalTime.toFixed(0),"ms"]})]})]}),i===0&&a("div",{className:w(["absolute right-0 top-1/2 transition-none -translate-y-1/2 bg-white text-black px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity mr-16","pointer-events-none"]),children:"Click to learn more"})]}),c&&(u.length>0||h.length>0)&&a("div",{className:"pl-3 flex flex-col gap-y-1 mt-1",children:[u.toSorted((v,x)=>x.totalTime-v.totalTime).map((v,x)=>a(Ti,{depth:i+1,bar:v,debouncedMouseEnter:t,totalBarTime:n,isProduction:r,bars:o},x)),h.map(v=>a("div",{className:"w-full",children:a("div",{className:"w-full flex items-center relative text-xs",children:a("div",{className:"h-full w-full flex items-center relative",children:[a("div",{className:"flex items-center rounded-sm text-white text-xs h-[28px] w-full"}),a("div",{className:"absolute inset-0 flex items-center px-2",children:a("span",{className:"truncate whitespace-nowrap text-white/70 w-full",children:v})})]})})},v))]})]})},Zd=({selectedEvent:e,selectedFiber:t})=>{const{setRoute:n}=Se(),[r,o]=U(!0),[i]=U(Pn());jr(()=>{const l=localStorage.getItem("react-scan-tip-shown"),c=l==="true"?!0:l==="false"?!1:null;if(c===null){o(!0),localStorage.setItem("react-scan-tip-is-shown","true");return}c||o(!1)},[]);const s=t.changes.context.length===0&&t.changes.props.length===0&&t.changes.state.length===0;return a("div",{className:w(["w-full min-h-fit h-full flex flex-col py-4 pt-0 rounded-sm"]),children:[a("div",{className:w(["flex items-start gap-x-4 "]),children:[a("button",{onClick:()=>{n({route:"render-visualization",routeMessage:null})},className:w(["text-white hover:bg-[#34343b] flex gap-x-1 justify-center items-center mb-4 w-fit px-2.5 py-1.5 text-xs rounded-sm bg-[#18181B]"]),children:[a(Ad,{size:14})," ",a("span",{children:"Overview"})]}),a("div",{className:w(["flex flex-col gap-y-1"]),children:[a("div",{className:w(["text-sm font-bold text-white overflow-x-hidden"]),children:a("div",{className:"flex items-center gap-x-2 truncate",children:t.name})}),a("div",{className:w(["flex gap-x-2"]),children:[!i&&a(Y,{children:a("div",{className:w(["text-xs text-gray-400"]),children:["• Render time: ",t.totalTime.toFixed(0),"ms"]})}),a("div",{className:w(["text-xs text-gray-400 mb-4"]),children:["• Renders: ",t.count,"x"]})]})]})]}),r&&!s&&a("div",{className:w(["w-full mb-4 bg-[#0A0A0A] border border-[#27272A] rounded-sm overflow-hidden flex relative"]),children:[a("button",{onClick:()=>{o(!1),localStorage.setItem("react-scan-tip-shown","false")},className:w(["absolute right-2 top-2 rounded-sm p-1 hover:bg-[#18181B]"]),children:a(En,{size:12})}),a("div",{className:w(["w-1 bg-[#d36cff]"])}),a("div",{className:w(["flex-1"]),children:[a("div",{className:w(["px-3 py-2 text-gray-100 text-xs font-semibold"]),children:"How to stop renders"}),a("div",{className:w(["px-3 pb-2 text-gray-400 text-[10px]"]),children:"Stop the following props, state and context from changing between renders, and wrap the component in React.memo if not already"})]})]}),s&&a("div",{className:w(["w-full mb-4 bg-[#0A0A0A] border border-[#27272A] rounded-sm overflow-hidden flex"]),children:[a("div",{className:w(["w-1 bg-[#d36cff]"])}),a("div",{className:w(["flex-1"]),children:[a("div",{className:w(["px-3 py-2 text-gray-100 text-sm font-semibold"]),children:"No changes detected"}),a("div",{className:w(["px-3 pb-2 text-gray-400 text-xs"]),children:"This component would not of rendered if it was memoized"})]})]}),a("div",{className:w(["flex w-full"]),children:[a("div",{className:w(["flex flex-col border border-[#27272A] rounded-l-sm overflow-hidden w-1/3"]),children:[a("div",{className:w(["text-[14px] font-semibold px-2 py-2 bg-[#18181B] text-white flex justify-center"]),children:"Changed Props"}),t.changes.props.length>0?t.changes.props.toSorted((l,c)=>c.count-l.count).map(l=>a("div",{className:w(["flex flex-col justify-between items-center border-t overflow-x-auto border-[#27272A] px-1 py-1 text-wrap bg-[#0A0A0A] text-[10px]"]),children:[a("span",{className:w(["text-white "]),children:l.name}),a("div",{className:w([" text-[8px]  text-[#d36cff] pl-1 py-1 "]),children:[l.count,"/",t.count,"x"]})]},l.name)):a("div",{className:w(["flex items-center justify-center h-full bg-[#0A0A0A] text-[#A1A1AA] border-t border-[#27272A]"]),children:"No changes"})]}),a("div",{className:w(["flex flex-col border border-[#27272A] border-l-0 overflow-hidden w-1/3"]),children:[a("div",{className:w([" text-[14px] font-semibold px-2 py-2 bg-[#18181B] text-white flex justify-center"]),children:"Changed State"}),t.changes.state.length>0?t.changes.state.toSorted((l,c)=>c.count-l.count).map(l=>a("div",{className:w(["flex flex-col justify-between items-center border-t overflow-x-auto border-[#27272A] px-1 py-1 text-wrap bg-[#0A0A0A] text-[10px]"]),children:[a("span",{className:w(["text-white "]),children:["index ",l.index]}),a("div",{className:w(["rounded-full  text-[#d36cff] pl-1 py-1 text-[8px]"]),children:[l.count,"/",t.count,"x"]})]},l.index)):a("div",{className:w(["flex items-center justify-center h-full bg-[#0A0A0A] text-[#A1A1AA] border-t border-[#27272A]"]),children:"No changes"})]}),a("div",{className:w(["flex flex-col border border-[#27272A] border-l-0 rounded-r-sm overflow-hidden w-1/3"]),children:[a("div",{className:w([" text-[14px] font-semibold px-2 py-2 bg-[#18181B] text-white flex justify-center"]),children:"Changed Context"}),t.changes.context.length>0?t.changes.context.toSorted((l,c)=>c.count-l.count).map(l=>a("div",{className:w(["flex flex-col justify-between items-center border-t  border-[#27272A] px-1 py-1 bg-[#0A0A0A] text-[10px] overflow-x-auto"]),children:[a("span",{className:w(["text-white "]),children:l.name}),a("div",{className:w(["rounded-full text-[#d36cff] pl-1 py-1 text-[8px] text-wrap"]),children:[l.count,"/",t.count,"x"]})]},l.name)):a("div",{className:w(["flex items-center justify-center h-full bg-[#0A0A0A] text-[#A1A1AA] border-t border-[#27272A] py-2"]),children:"No changes"})]})]})]})},Qd=()=>{const{notificationState:e,setNotificationState:t}=Se(),[n,r]=U("..."),o=M(null);if(H(()=>{const i=setInterval(()=>{r(s=>s==="..."?"":s+".")},500);return()=>clearInterval(i)},[]),!e.selectedEvent)return a("div",{ref:o,className:w(["h-full w-full flex flex-col items-center justify-center relative py-2 px-4"]),children:[a("div",{className:w(["p-2 flex justify-center items-center border-[#27272A] absolute top-0 right-0"]),children:a("button",{onClick:()=>{Q.value={view:"none"}},children:a(En,{size:18,className:"text-[#6F6F78]"})})}),a("div",{className:w(["flex flex-col items-start pt-5 bg-[#0A0A0A] p-5 rounded-sm max-w-md"," shadow-lg"]),children:a("div",{className:w(["flex flex-col items-start gap-y-4"]),children:[a("div",{className:w(["flex items-center"]),children:a("span",{className:w(["text-zinc-400 font-medium text-[17px]"]),children:["Scanning for slowdowns",n]})}),e.events.length!==0&&a("p",{className:w(["text-xs"]),children:["Click on an item in the"," ",a("span",{className:w(["text-purple-400"]),children:"History"})," list to get started"]}),a("p",{className:w(["text-zinc-600 text-xs"]),children:"You don't need to keep this panel open for React Scan to record slowdowns"}),a("p",{className:w(["text-zinc-600 text-xs"]),children:"Enable audio alerts to hear a delightful ding every time a large slowdown is recorded"}),a("button",{onClick:()=>{if(e.audioNotificationsOptions.enabled){t(s=>(s.audioNotificationsOptions.audioContext?.state!=="closed"&&s.audioNotificationsOptions.audioContext?.close(),localStorage.setItem("react-scan-notifications-audio","false"),{...s,audioNotificationsOptions:{audioContext:null,enabled:!1}}));return}localStorage.setItem("react-scan-notifications-audio","true");const i=new AudioContext;Br(i),t(s=>({...s,audioNotificationsOptions:{enabled:!0,audioContext:i}}))},className:w(["px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-sm w-full"," text-sm flex items-center gap-x-2 justify-center"]),children:e.audioNotificationsOptions.enabled?a(Y,{children:a("span",{className:"flex items-center gap-x-1",children:"Disable audio alerts"})}):a(Y,{children:a("span",{className:"flex items-center gap-x-1",children:"Enable audio alerts"})})})]})})]});switch(e.route){case"render-visualization":return a(nn,{children:a(Jd,{selectedEvent:e.selectedEvent})});case"render-explanation":{if(!e.selectedFiber)throw new Error("Invariant: must have selected fiber when viewing render explanation");return a(nn,{children:a(Zd,{selectedFiber:e.selectedFiber,selectedEvent:e.selectedEvent})})}case"other-visualization":return a(nn,{children:a("div",{className:w(["flex w-full h-full flex-col overflow-y-auto"]),id:"overview-scroll-container",children:a(Vd,{selectedEvent:e.selectedEvent})})});case"optimize":return a(nn,{children:a(Hd,{selectedEvent:e.selectedEvent})})}e.route},nn=({children:e})=>{const{notificationState:t}=Se();if(!t.selectedEvent)throw new Error("Invariant: d must have selected event when viewing render explanation");return a("div",{className:w(["w-full h-full flex flex-col gap-y-2"]),children:[a("div",{className:w(["h-[50px] w-full"]),children:a($d,{selectedEvent:t.selectedEvent})}),a("div",{className:w(["h-calc(100%-50px) flex flex-col overflow-y-auto px-3"]),children:e})]})},eu=({selectedEvent:e})=>{const t=qt(e);switch(e.kind){case"interaction":return a("div",{className:w(["w-full flex border-b border-[#27272A] min-h-[48px]"]),children:a("div",{className:w(["min-w-fit w-full justify-start flex items-center border-r border-[#27272A] pl-5 pr-2 text-sm gap-x-4"]),children:[a("div",{className:w(["flex items-center gap-x-2 "]),children:[a("span",{className:w(["text-[#5a5a5a] mr-0.5"]),children:e.type==="click"?"Clicked ":"Typed in "}),a("span",{children:Ht(e.componentPath)}),a("div",{className:w(["w-fit flex items-center justify-center h-fit text-white px-1 rounded-sm font-semibold text-[10px] whitespace-nowrap",t==="low"&&"bg-green-500/50",t==="needs-improvement"&&"bg-[#b77116]",t==="high"&&"bg-[#b94040]"]),children:[ve(e.timing).toFixed(0),"ms processing time"]})]}),a("div",{className:w(["flex items-center gap-x-2  justify-end ml-auto"]),children:a("div",{className:w(["p-2 flex justify-center items-center border-[#27272A]"]),children:a("button",{onClick:()=>{Q.value={view:"none"}},title:"Close",children:a(En,{size:18,className:"text-[#6F6F78]"})})})})]})});case"dropped-frames":return a("div",{className:w(["w-full flex border-b border-[#27272A] min-h-[48px]"]),children:a("div",{className:w(["min-w-fit w-full justify-start flex items-center border-r border-[#27272A] pl-5 pr-2 text-sm gap-x-4"]),children:[a("div",{className:w(["flex items-center gap-x-2 "]),children:["FPS Drop",a("div",{className:w(["w-fit flex items-center justify-center h-fit text-white px-1 rounded-sm font-semibold text-[10px] whitespace-nowrap",t==="low"&&"bg-green-500/50",t==="needs-improvement"&&"bg-[#b77116]",t==="high"&&"bg-[#b94040]"]),children:["dropped to ",e.fps," FPS"]})]}),a("div",{className:w(["flex items-center gap-x-2 w-2/4 justify-end ml-auto"]),children:a("div",{className:w(["p-2 flex justify-center items-center border-[#27272A]"]),children:a("button",{onClick:()=>{Q.value={view:"none"}},children:a(En,{size:18,className:"text-[#6F6F78]"})})})})]})})}},tu=({flashingItemsCount:e,totalEvents:t})=>{const[n,r]=U(!1),o=M(0),i=M(0);return H(()=>{if(o.current>=t)return;const s=Date.now(),l=250,c=s-i.current;if(c>=l){r(!1);const d=setTimeout(()=>{o.current=t,i.current=Date.now(),r(!0),setTimeout(()=>{r(!1)},2e3)},50);return()=>clearTimeout(d)}else{const d=l-c,p=setTimeout(()=>{r(!1),setTimeout(()=>{o.current=t,i.current=Date.now(),r(!0),setTimeout(()=>{r(!1)},2e3)},50)},d);return()=>clearTimeout(p)}},[e]),n},pa=({item:e,shouldFlash:t})=>{const[n,r]=U(!1),o=e.events.map(qt).reduce((l,c)=>{switch(c){case"high":return"high";case"needs-improvement":return l==="high"?"high":"needs-improvement";case"low":return l}},"low"),i=e.events.reduce((l,c)=>t(c.id)?l+1:l,0),s=tu({flashingItemsCount:i,totalEvents:e.events.length});return a("div",{className:w(["flex flex-col gap-y-0.5"]),children:[a("button",{onClick:()=>r(l=>!l),className:w(["pl-2 py-1.5  text-sm flex items-center rounded-sm hover:bg-[#18181B] relative overflow-hidden",s&&!n&&"after:absolute after:inset-0 after:bg-purple-500/30 after:animate-[fadeOut_1s_ease-out_forwards]"]),children:[a("div",{className:w(["w-4/5 flex items-center justify-start h-full text-xs truncate gap-x-1.5"]),children:[a("span",{className:w(["min-w-fit"]),children:a(Ci,{className:w(["text-[#A1A1AA] transition-transform",n?"rotate-90":""]),size:14},`chevron-${e.timestamp}`)}),a("span",{className:w(["text-xs"]),children:e.kind==="collapsed-frame-drops"?"FPS Drops":Ht(e.events.at(0)?.componentPath??[])})]}),a("div",{className:w(["ml-auto min-w-fit flex justify-end items-center"]),children:a("div",{style:{lineHeight:"10px"},className:w(["w-fit flex items-center text-[10px] justify-center h-full text-white px-1 py-1 rounded-sm font-semibold",o==="low"&&"bg-green-500/60",o==="needs-improvement"&&"bg-[#b77116] text-[10px]",o==="high"&&"bg-[#b94040]"]),children:["x",e.events.length]})})]}),n&&a(nu,{children:e.events.toSorted((l,c)=>c.timestamp-l.timestamp).map(l=>a(Ni,{event:l,shouldFlash:t(l.id)}))})]})},nu=({children:e})=>a("div",{className:"relative pl-6 flex flex-col gap-y-1",children:[a("div",{className:"absolute left-3 top-0 bottom-0 w-px bg-[#27272A]"}),e]}),ru=e=>{const t=M([]),[n,r]=U(new Set),o=M(!0);return H(()=>{if(o.current){o.current=!1,t.current=e;return}const i=new Set(e.map(c=>c.id)),s=new Set(t.current.map(c=>c.id)),l=new Set;i.forEach(c=>{s.has(c)||l.add(c)}),l.size>0&&(r(l),setTimeout(()=>{r(new Set)},2e3)),t.current=e},[e]),i=>n.has(i)},ou=({shouldFlash:e})=>{const[t,n]=U(e);return H(()=>{if(e){n(!0);const r=setTimeout(()=>{n(!1)},1e3);return()=>clearTimeout(r)}},[e]),t},Ni=({event:e,shouldFlash:t})=>{const{notificationState:n,setNotificationState:r}=Se(),o=qt(e),i=ou({shouldFlash:t});switch(e.kind){case"interaction":return a("button",{onClick:()=>{r(s=>({...s,selectedEvent:e,route:"render-visualization",selectedFiber:null}))},className:w(["pl-2 py-1.5  text-sm flex w-full items-center rounded-sm hover:bg-[#18181B] relative overflow-hidden",e.id===n.selectedEvent?.id&&"bg-[#18181B]",i&&"after:absolute after:inset-0 after:bg-purple-500/30 after:animate-[fadeOut_1s_ease-out_forwards]"]),children:[a("div",{className:w(["w-4/5 flex items-center justify-start h-full gap-x-1.5"]),children:[a("span",{className:w(["min-w-fit text-xs"]),children:Ie(()=>{switch(e.type){case"click":return a(Id,{size:14});case"keyboard":return a(Md,{size:14})}})}),a("span",{className:w(["text-xs pr-1 truncate"]),children:Ht(e.componentPath)})]}),a("div",{className:w([" min-w-fit flex justify-end items-center ml-auto"]),children:a("div",{style:{lineHeight:"10px"},className:w(["gap-x-0.5 w-fit flex items-end justify-center h-full text-white px-1 py-1 rounded-sm font-semibold text-[10px]",o==="low"&&"bg-green-500/50",o==="needs-improvement"&&"bg-[#b77116] text-[10px]",o==="high"&&"bg-[#b94040]"]),children:a("div",{style:{lineHeight:"10px"},className:w(["text-[10px] text-white flex items-end"]),children:[ve(e.timing).toFixed(0),"ms"]})})})]});case"dropped-frames":return a("button",{onClick:()=>{r(s=>({...s,selectedEvent:e,route:"render-visualization",selectedFiber:null}))},className:w(["pl-2 py-1.5  w-full text-sm flex items-center rounded-sm hover:bg-[#18181B] relative overflow-hidden",e.id===n.selectedEvent?.id&&"bg-[#18181B]",i&&"after:absolute after:inset-0 after:bg-purple-500/30 after:animate-[fadeOut_1s_ease-out_forwards]"]),children:[a("div",{className:w(["w-4/5 flex items-center justify-start h-full text-xs truncate"]),children:[a(Rd,{size:14,className:"mr-1.5"})," FPS Drop"]}),a("div",{className:w([" min-w-fit flex justify-end items-center ml-auto"]),children:a("div",{style:{lineHeight:"10px"},className:w(["w-fit flex items-center justify-center h-full text-white px-1 py-1 rounded-sm text-[10px] font-bold",o==="low"&&"bg-green-500/60",o==="needs-improvement"&&"bg-[#b77116] text-[10px]",o==="high"&&"bg-[#b94040]"]),children:[e.fps," FPS"]})})]})}},au=e=>e.reduce((n,r)=>{const o=n.at(-1);if(!o)return[{kind:"single",event:r,timestamp:r.timestamp}];switch(o.kind){case"collapsed-keyboard":return r.kind==="interaction"&&r.type==="keyboard"&&r.componentPath.join("-")===o.events[0].componentPath.join("-")?[...n.filter(s=>s!==o),{kind:"collapsed-keyboard",events:[...o.events,r],timestamp:Math.max(...[...o.events,r].map(s=>s.timestamp))}]:[...n,{kind:"single",event:r,timestamp:r.timestamp}];case"single":return o.event.kind==="interaction"&&o.event.type==="keyboard"&&r.kind==="interaction"&&r.type==="keyboard"&&o.event.componentPath.join("-")===r.componentPath.join("-")?[...n.filter(s=>s!==o),{kind:"collapsed-keyboard",events:[o.event,r],timestamp:Math.max(o.event.timestamp,r.timestamp)}]:o.event.kind==="dropped-frames"&&r.kind==="dropped-frames"?[...n.filter(s=>s!==o),{kind:"collapsed-frame-drops",events:[o.event,r],timestamp:Math.max(o.event.timestamp,r.timestamp)}]:[...n,{kind:"single",event:r,timestamp:r.timestamp}];case"collapsed-frame-drops":return r.kind==="dropped-frames"?[...n.filter(s=>s!==o),{kind:"collapsed-frame-drops",events:[...o.events,r],timestamp:Math.max(...[...o.events,r].map(s=>s.timestamp))}]:[...n,{kind:"single",event:r,timestamp:r.timestamp}]}},[]),Ei=(e=150)=>{const{notificationState:t}=Se(),[n,r]=U(t.events);return H(()=>{setTimeout(()=>{r(t.events)},e)},[t.events]),[n,r]},iu=()=>{const{notificationState:e,setNotificationState:t}=Se(),n=ru(e.events),[r,o]=Ei(),i=au(r).toSorted((s,l)=>l.timestamp-s.timestamp);return a("div",{className:w(["w-full h-full gap-y-2 flex flex-col border-r border-[#27272A] overflow-y-auto"]),children:[a("div",{className:w(["text-sm text-[#65656D] pl-3 pr-1 w-full flex items-center justify-between"]),children:[a("span",{children:"History"}),a(Si,{wrapperProps:{className:"h-full flex items-center justify-center ml-auto"},triggerContent:a("button",{className:w(["hover:bg-[#18181B] rounded-full p-2"]),title:"Clear all events",onClick:()=>{Wt.getState().actions.clear(),t(s=>({...s,selectedEvent:null,selectedFiber:null,route:s.route==="other-visualization"?"other-visualization":"render-visualization"})),o([])},children:a(Fd,{className:w([""]),size:16})}),children:a("div",{className:w(["w-full flex justify-center"]),children:"Clear all events"})})]}),a("div",{className:w(["flex flex-col px-1 gap-y-1"]),children:[i.length===0&&a("div",{className:w(["flex items-center justify-center text-zinc-500 text-sm py-4"]),children:"No Events"}),i.map(s=>Ie(()=>{switch(s.kind){case"collapsed-keyboard":return a(pa,{shouldFlash:n,item:s});case"single":return a(Ni,{event:s.event,shouldFlash:n(s.event.id)},s.event.id);case"collapsed-frame-drops":return a(pa,{shouldFlash:n,item:s})}}))]})]})},su=e=>Object.values(e).map(n=>({id:ze(),totalTime:n.nodeInfo.reduce((r,o)=>r+o.selfTime,0),count:n.nodeInfo.length,name:n.nodeInfo[0].name,deletedAll:!1,parents:n.parents,hasMemoCache:n.hasMemoCache,wasFiberRenderMount:n.wasFiberRenderMount,elements:n.nodeInfo.map(r=>r.element),changes:{context:n.changes.fiberContext.current.filter(r=>n.changes.fiberContext.changesCounts.get(r.name)).map(r=>({name:String(r.name),count:n.changes.fiberContext.changesCounts.get(r.name)??0})),props:n.changes.fiberProps.current.filter(r=>n.changes.fiberProps.changesCounts.get(r.name)).map(r=>({name:String(r.name),count:n.changes.fiberProps.changesCounts.get(r.name)??0})),state:n.changes.fiberState.current.filter(r=>n.changes.fiberState.changesCounts.get(Number(r.name))).map(r=>({index:r.name,count:n.changes.fiberState.changesCounts.get(Number(r.name))??0}))}})),lu=e=>{H(()=>{const n=setInterval(()=>{e.forEach(r=>{r.groupedFiberRenders&&r.groupedFiberRenders.forEach(o=>{if(o.deletedAll)return;if(!o.elements||o.elements.length===0){o.deletedAll=!0;return}const i=o.elements.length;o.elements=o.elements.filter(s=>s&&s.isConnected),o.elements.length===0&&i>0&&(o.deletedAll=!0)})})},5e3);return()=>{clearInterval(n)}},[e])},zi=()=>{const e=yd(),t=[];return lu(t),e.state.events.forEach(n=>{const r=n.kind==="interaction"?n.data.meta.detailedTiming.fiberRenders:n.data.meta.fiberRenders,o=su(r),i=o.reduce((s,l)=>s+l.totalTime,0);switch(n.kind){case"interaction":{const{commitEnd:s,jsEndDetail:l,interactionStartDetail:c,rafStart:d}=n.data.meta.detailedTiming,p=Math.max(0,l-c-i),u=Math.max(n.data.meta.latency-(s-c),0);t.push({componentPath:n.data.meta.detailedTiming.componentPath,groupedFiberRenders:o,id:n.id,kind:"interaction",memory:null,timestamp:n.data.startAt,type:n.data.meta.detailedTiming.interactionType==="keyboard"?"keyboard":"click",timing:{renderTime:i,kind:"interaction",otherJSTime:p,framePreparation:d-l,frameConstruction:s-d,frameDraw:u}});return}case"long-render":{t.push({kind:"dropped-frames",id:n.id,memory:null,timing:{kind:"dropped-frames",renderTime:i,otherTime:n.data.meta.latency},groupedFiberRenders:o,timestamp:n.data.startAt,fps:n.data.meta.fps});return}}}),t},cu=1e3,du=()=>{const{notificationState:e,setNotificationState:t}=Se(),n=M(null),r=M(null),o=M(0),[i]=Ei(),s=i.filter(l=>qt(l)==="high").length;return H(()=>{const l=localStorage.getItem("react-scan-notifications-audio");if(l!=="false"&&l!=="true"){localStorage.setItem("react-scan-notifications-audio","false");return}if(l!=="false"){t(d=>d.audioNotificationsOptions.enabled?d:{...d,audioNotificationsOptions:{enabled:!0,audioContext:new AudioContext}});return}},[]),H(()=>{const{audioNotificationsOptions:l}=e;if(!l.enabled||s===0||n.current&&n.current>=s)return;r.current&&clearTimeout(r.current);const d=Date.now()-o.current,p=Math.max(0,cu-d);r.current=setTimeout(()=>{Br(l.audioContext),n.current=s,o.current=Date.now(),r.current=null},p)},[s]),H(()=>{s===0&&(n.current=null)},[s]),H(()=>()=>{r.current&&clearTimeout(r.current)},[]),null},uu=Yr((e,t)=>{const n=zi(),[r,o]=U({detailsExpanded:!1,events:n,filterBy:"latest",moreInfoExpanded:!1,route:"render-visualization",selectedEvent:n.toSorted((i,s)=>i.timestamp-s.timestamp).at(-1)??null,selectedFiber:null,routeMessage:null,audioNotificationsOptions:{enabled:!1,audioContext:null}});return r.events=n,a(_i.Provider,{value:{notificationState:r,setNotificationState:o,setRoute:({route:i,routeMessage:s})=>{o(l=>{const c={...l,route:i,routeMessage:s};switch(i){case"render-visualization":return zt(),{...c,selectedFiber:null};case"optimize":return zt(),{...c,selectedFiber:null};case"other-visualization":return zt(),{...c,selectedFiber:null};case"render-explanation":return zt(),c}})}},children:[a(du,{}),a(pu,{ref:t})]})}),pu=Yr((e,t)=>{const{notificationState:n}=Se();return a("div",{ref:t,className:w(["h-full w-full flex flex-col"]),children:[n.selectedEvent&&a("div",{className:w(["w-full h-[48px] flex flex-col",n.moreInfoExpanded&&"h-[235px]",n.moreInfoExpanded&&n.selectedEvent.kind==="dropped-frames"&&"h-[150px]"]),children:[a(eu,{selectedEvent:n.selectedEvent}),n.moreInfoExpanded&&a(hu,{})]}),a("div",{className:w(["flex ",n.selectedEvent?"h-[calc(100%-48px)]":"h-full",n.moreInfoExpanded&&"h-[calc(100%-200px)]",n.moreInfoExpanded&&n.selectedEvent?.kind==="dropped-frames"&&"h-[calc(100%-150px)]"]),children:[a("div",{className:w(["h-full min-w-[200px]"]),children:a(iu,{})}),a("div",{className:w(["w-[calc(100%-200px)] h-full overflow-y-auto"]),children:a(Qd,{})})]})]})}),hu=()=>{const{notificationState:e}=Se();if(!e.selectedEvent)throw new Error("Invariant must have selected event for more info");const t=e.selectedEvent;return a("div",{className:w(["px-4 py-2 border-b border-[#27272A] bg-[#18181B]/50 h-[calc(100%-40px)]",t.kind==="dropped-frames"&&"h-[calc(100%-25px)]"]),children:a("div",{className:w(["flex flex-col gap-y-4 h-full"]),children:Ie(()=>{switch(t.kind){case"interaction":return a(Y,{children:[a("div",{className:w(["flex items-center gap-x-3"]),children:[a("span",{className:"text-[#6F6F78] text-xs font-medium",children:t.type==="click"?"Clicked component location":"Typed in component location"}),a("div",{className:"font-mono text-[#E4E4E7] flex items-center bg-[#27272A] pl-2 py-1 rounded-sm overflow-x-auto",children:t.componentPath.toReversed().map((n,r)=>a(Y,{children:[a("span",{style:{lineHeight:"14px"},className:"text-[10px] whitespace-nowrap",children:n},n),r<t.componentPath.length-1&&a("span",{className:"text-[#6F6F78] mx-0.5",children:"‹"})]}))})]}),a("div",{className:w(["flex items-center gap-x-3"]),children:[a("span",{className:"text-[#6F6F78] text-xs font-medium",children:"Total Time"}),a("span",{className:"text-[#E4E4E7] bg-[#27272A] px-1.5 py-1 rounded-sm text-xs",children:[ve(t.timing).toFixed(0),"ms"]})]}),a("div",{className:w(["flex items-center gap-x-3"]),children:[a("span",{className:"text-[#6F6F78] text-xs font-medium",children:"Occurred"}),a("span",{className:"text-[#E4E4E7] bg-[#27272A] px-1.5 py-1 rounded-sm text-xs",children:`${((Date.now()-t.timestamp)/1e3).toFixed(0)}s ago`})]})]});case"dropped-frames":return a(Y,{children:[a("div",{className:w(["flex items-center gap-x-3"]),children:[a("span",{className:"text-[#6F6F78] text-xs font-medium",children:"Total Time"}),a("span",{className:"text-[#E4E4E7] bg-[#27272A] px-1.5 py-1 rounded-sm text-xs",children:[ve(t.timing).toFixed(0),"ms"]})]}),a("div",{className:w(["flex items-center gap-x-3"]),children:[a("span",{className:"text-[#6F6F78] text-xs font-medium",children:"Occurred"}),a("span",{className:"text-[#E4E4E7] bg-[#27272A] px-1.5 py-1 rounded-sm text-xs",children:`${((Date.now()-t.timestamp)/1e3).toFixed(0)}s ago`})]})]})}})})})},fu=qr(()=>{const e=zi(),[t,n]=U(e);H(()=>{const h=setTimeout(()=>{n(e)},600);return()=>{clearTimeout(h)}},[e]);const r=E.inspectState,o=r.value.kind==="inspecting",i=r.value.kind==="focused",[s,l]=U([]),c=ie(()=>{switch(E.inspectState.value.kind){case"inspecting":{Q.value={view:"none"},E.inspectState.value={kind:"inspect-off"};return}case"focused":{Q.value={view:"inspector"},E.inspectState.value={kind:"inspecting",hoveredDomElement:null};return}case"inspect-off":{Q.value={view:"none"},E.inspectState.value={kind:"inspecting",hoveredDomElement:null};return}case"uninitialized":return}},[]),d=ie(h=>{if(h.preventDefault(),h.stopPropagation(),!X.instrumentation)return;const f=!X.instrumentation.isPaused.value;X.instrumentation.isPaused.value=f;const v=We("react-scan-options");ke("react-scan-options",{...v,enabled:!f})},[]);Lt(()=>{E.inspectState.value.kind==="uninitialized"&&(E.inspectState.value={kind:"inspect-off"})});let p=null,u="#999";return o?(p=a(oe,{name:"icon-inspect"}),u="#8e61e3"):i?(p=a(oe,{name:"icon-focus"}),u="#8e61e3"):(p=a(oe,{name:"icon-inspect"}),u="#999"),jr(()=>{if(Q.value.view!=="notifications")return;const h=new Set(e.map(f=>f.id));l([...h.values()])},[e.length,Q.value.view]),a("div",{className:"flex max-h-9 min-h-9 flex-1 items-stretch overflow-hidden",children:[a("div",{className:"h-full flex items-center min-w-fit",children:a("button",{type:"button",id:"react-scan-inspect-element",title:"Inspect element",onClick:c,className:"button flex items-center justify-center h-full w-full pl-3 pr-2.5",style:{color:u},children:p})}),a("div",{className:"h-full flex items-center justify-center",children:a("button",{type:"button",id:"react-scan-notifications",title:"Notifications",onClick:()=>{switch(E.inspectState.value.kind!=="inspect-off"&&(E.inspectState.value={kind:"inspect-off"}),Q.value.view){case"inspector":{E.inspectState.value={kind:"inspect-off"};const h=new Set(e.map(f=>f.id));l([...h.values()]),Q.value={view:"notifications"};return}case"notifications":{Q.value={view:"none"};return}case"none":{const h=new Set(e.map(f=>f.id));l([...h.values()]),Q.value={view:"notifications"};return}}},className:"button flex items-center justify-center h-full pl-2.5 pr-2.5",style:{color:u},children:a(Nd,{events:t.filter(h=>!s.includes(h.id)).map(h=>qt(h)==="high"),size:16,className:w(["text-[#999]",Q.value.view==="notifications"&&"text-[#8E61E3]"])})})}),a(nd,{checked:!X.instrumentation?.isPaused.value,onChange:d,className:"place-self-center",title:"Outline Re-renders"}),X.options.value.showFPS&&a(od,{})]})}),mu=lt(()=>E.inspectState.value.kind==="inspecting"),gu=lt(()=>w("relative","flex-1","flex flex-col","rounded-t-lg","overflow-hidden","opacity-100","transition-[opacity]",mu.value&&"opacity-0 duration-0 delay-0")),vu=lt(()=>Q.value.view==="inspector"),wu=lt(()=>Q.value.view==="notifications"),bu=()=>a("div",{className:w("flex flex-1 flex-col","overflow-hidden z-10","rounded-lg","bg-black","opacity-100","transition-[border-radius]","peer-hover/left:rounded-l-none","peer-hover/right:rounded-r-none","peer-hover/top:rounded-t-none","peer-hover/bottom:rounded-b-none"),children:[a("div",{className:gu,children:[a(td,{}),a("div",{className:w("relative","flex-1 flex","text-white","bg-[#0A0A0A]","transition-opacity delay-150","overflow-hidden","border-b border-[#222]"),children:[a(ha,{isOpen:vu,children:a(sc,{})}),a(ha,{isOpen:wu,children:a(uu,{})})]})]}),a(fu,{})]}),ha=({isOpen:e,children:t})=>a("div",{className:w("flex-1","opacity-0","overflow-y-auto overflow-x-hidden","transition-opacity delay-0","pointer-events-none",e.value&&"opacity-100 delay-150 pointer-events-auto"),children:a("div",{className:"absolute inset-0 flex",children:t})}),rn=(e,t,n)=>e+(t-e)*n,ir={frameInterval:1e3/60,speeds:{fast:.51,slow:.1,off:0}},pt=De&&window.devicePixelRatio||1,xu=()=>{const e=M(null),t=M(null),n=M(null),r=M(null),o=M(null),i=M(0),s=M(),l=M(new Map),c=M(!1),d=M(0),p=(g,k,_,N)=>{g.save(),g.strokeStyle="white",g.fillStyle="white",g.lineWidth=1.5;const A=N*.6,F=N*.5,R=k+(N-A)/2,j=_;g.beginPath(),g.arc(R+A/2,j+F/2,A/2,Math.PI,0,!1),g.stroke();const J=N*.8,G=N*.5,ee=k+(N-J)/2,pe=_+F/2;g.fillRect(ee,pe,J,G),g.restore()},u=(g,k,_,N)=>{if(!N)return;const A=24,F=8,j=(N?.type&&ge(N.type))??"Unknown";g.save(),g.font="12px system-ui, -apple-system, sans-serif";const G=g.measureText(j).width,ee=_==="locked"?14:0,pe=_==="locked"?6:0,we=G+F*2+ee+pe,he=k.left,_e=k.top-A-4;if(g.fillStyle="rgb(37, 37, 38, .75)",g.beginPath(),g.roundRect(he,_e,we,A,3),g.fill(),_==="locked"){const Jt=he+F,Kt=_e+(A-ee)/2+2;p(g,Jt,Kt,ee),r.current={x:Jt,y:Kt,width:ee,height:ee}}else r.current=null;g.fillStyle="white",g.textBaseline="middle";const Gt=he+F+(_==="locked"?ee+pe:0);g.fillText(j,Gt,_e+A/2),g.restore()},h=(g,k,_,N)=>{if(!n.current)return;const A=n.current;k.clearRect(0,0,g.width,g.height),k.strokeStyle="rgba(142, 97, 227, 0.5)",k.fillStyle="rgba(173, 97, 230, 0.10)",_==="locked"?k.setLineDash([]):k.setLineDash([4]),k.lineWidth=1,k.fillRect(A.left,A.top,A.width,A.height),k.strokeRect(A.left,A.top,A.width,A.height),u(k,A,_,N)},f=(g,k,_,N,A,F)=>{const R=X.options.value.animationSpeed,j=ir.speeds[R]??ir.speeds.off,J=G=>{if(G-d.current<ir.frameInterval){i.current=requestAnimationFrame(J);return}if(d.current=G,!n.current){cancelAnimationFrame(i.current);return}n.current={left:rn(n.current.left,_.left,j),top:rn(n.current.top,_.top,j),width:rn(n.current.width,_.width,j),height:rn(n.current.height,_.height,j)},h(g,k,N,A),Math.abs(n.current.left-_.left)>.1||Math.abs(n.current.top-_.top)>.1||Math.abs(n.current.width-_.width)>.1||Math.abs(n.current.height-_.height)>.1?i.current=requestAnimationFrame(J):(n.current=_,h(g,k,N,A),cancelAnimationFrame(i.current),k.restore())};cancelAnimationFrame(i.current),clearTimeout(s.current),i.current=requestAnimationFrame(J),s.current=setTimeout(()=>{cancelAnimationFrame(i.current),n.current=_,h(g,k,N,A),k.restore()},1e3)},v=(g,k,_,N,A)=>{if(k.save(),!n.current){n.current=_,h(g,k,N,A),k.restore();return}f(g,k,_,N,A)},x=async(g,k,_,N)=>{if(!g||!k||!_)return;const{parentCompositeFiber:A}=et(g),F=await lc(g);!A||!F||v(k,_,F,N,A)},y=()=>{for(const g of l.current.values())g?.()},m=g=>{const k=g.getContext("2d");k&&k.clearRect(0,0,g.width,g.height),n.current=null,r.current=null,o.current=null,g.classList.remove("fade-in"),c.current=!1},b=g=>{if(!e.current||c.current)return;const k=N=>{!e.current||N.propertyName!=="opacity"||!c.current||(e.current.removeEventListener("transitionend",k),m(e.current),g?.())},_=l.current.get("fade-out");_&&(_(),l.current.delete("fade-out")),e.current.addEventListener("transitionend",k),l.current.set("fade-out",()=>{e.current?.removeEventListener("transitionend",k)}),c.current=!0,e.current.classList.remove("fade-in"),requestAnimationFrame(()=>{e.current?.classList.add("fade-out")})},C=()=>{e.current&&(c.current=!1,e.current.classList.remove("fade-out"),requestAnimationFrame(()=>{e.current?.classList.add("fade-in")}))},S=g=>{g!==o.current&&(o.current=g,kr.has(g.tagName)?b():C(),E.inspectState.value={kind:"inspecting",hoveredDomElement:g})},T=()=>{!n.current||!e.current||c.current||b()},I=ei(g=>{if(E.inspectState.peek().kind!=="inspecting"||!t.current)return;t.current.style.pointerEvents="none";const _=document.elementFromPoint(g?.clientX??0,g?.clientY??0);if(t.current.style.removeProperty("pointer-events"),clearTimeout(s.current),_&&_!==e.current){const{parentCompositeFiber:N}=et(_);if(N){const A=kn(N);if(A){S(A);return}}}T()},32),V=(g,k)=>{const _=r.current;if(!_)return!1;const N=k.getBoundingClientRect(),A=k.width/N.width,F=k.height/N.height,R=(g.clientX-N.left)*A,j=(g.clientY-N.top)*F,J=R/pt,G=j/pt;return J>=_.x&&J<=_.x+_.width&&G>=_.y&&G<=_.y+_.height},q=g=>{g.kind==="focused"&&(E.inspectState.value={kind:"inspecting",hoveredDomElement:g.focusedDomElement})},O=g=>{const k=["react-scan-inspect-element","react-scan-power"];if(g.target instanceof HTMLElement&&k.includes(g.target.id))return;const _=o.current?.tagName;if(_&&kr.has(_))return;g.preventDefault(),g.stopPropagation();const N=o.current??document.elementFromPoint(g.clientX,g.clientY);if(!N)return;const A=g.composedPath().at(0);if(A instanceof HTMLElement&&k.includes(A.id)){const j=new MouseEvent(g.type,g);j.__reactScanSyntheticEvent=!0,A.dispatchEvent(j);return}const{parentCompositeFiber:F}=et(N);if(!F)return;const R=kn(F);if(!R){o.current=null,E.inspectState.value={kind:"inspect-off"};return}E.inspectState.value={kind:"focused",focusedDomElement:R,fiber:F}},B=g=>{if(g.__reactScanSyntheticEvent)return;const k=E.inspectState.peek(),_=e.current;if(!(!_||!t.current)){if(V(g,_)){g.preventDefault(),g.stopPropagation(),q(k);return}k.kind==="inspecting"&&O(g)}},L=g=>{if(g.key!=="Escape")return;const k=E.inspectState.peek();if(e.current&&document.activeElement?.id!=="react-scan-root"&&(Q.value={view:"none"},k.kind==="focused"||k.kind==="inspecting"))switch(g.preventDefault(),g.stopPropagation(),k.kind){case"focused":{C(),n.current=null,o.current=k.focusedDomElement,E.inspectState.value={kind:"inspecting",hoveredDomElement:k.focusedDomElement};break}case"inspecting":{b(()=>{Dn.value=!1,E.inspectState.value={kind:"inspect-off"}});break}}},$=(g,k,_)=>{l.current.get(g.kind)?.(),t.current&&g.kind!=="inspecting"&&(t.current.style.pointerEvents="none"),i.current&&cancelAnimationFrame(i.current);let N;switch(g.kind){case"inspect-off":b();return;case"inspecting":x(g.hoveredDomElement,k,_,"inspecting");break;case"focused":if(!g.focusedDomElement)return;o.current!==g.focusedDomElement&&(o.current=g.focusedDomElement),Q.value={view:"inspector"},x(g.focusedDomElement,k,_,"locked"),N=E.lastReportTime.subscribe(()=>{if(i.current&&n.current){const{parentCompositeFiber:A}=et(g.focusedDomElement);A&&x(g.focusedDomElement,k,_,"locked")}}),N&&l.current.set(g.kind,N);break}},le=(g,k)=>{const _=g.getBoundingClientRect();g.width=_.width*pt,g.height=_.height*pt,k.scale(pt,pt),k.save()},ue=()=>{const g=E.inspectState.peek(),k=e.current;if(!k)return;const _=k?.getContext("2d");_&&(cancelAnimationFrame(i.current),clearTimeout(s.current),le(k,_),n.current=null,g.kind==="focused"&&g.focusedDomElement?x(g.focusedDomElement,k,_,"locked"):g.kind==="inspecting"&&g.hoveredDomElement&&x(g.hoveredDomElement,k,_,"inspecting"))},me=g=>{const k=E.inspectState.peek(),_=e.current;_&&(k.kind==="inspecting"||V(g,_))&&(g.preventDefault(),g.stopPropagation(),g.stopImmediatePropagation())};return H(()=>{const g=e.current;if(!g)return;const k=g?.getContext("2d");if(!k)return;le(g,k);const _=E.inspectState.subscribe(N=>{$(N,g,k)});return window.addEventListener("scroll",ue,{passive:!0}),window.addEventListener("resize",ue,{passive:!0}),document.addEventListener("pointermove",I,{passive:!0,capture:!0}),document.addEventListener("pointerdown",me,{capture:!0}),document.addEventListener("click",B,{capture:!0}),document.addEventListener("keydown",L,{capture:!0}),()=>{y(),_(),window.removeEventListener("scroll",ue),window.removeEventListener("resize",ue),document.removeEventListener("pointermove",I,{capture:!0}),document.removeEventListener("click",B,{capture:!0}),document.removeEventListener("pointerdown",me,{capture:!0}),document.removeEventListener("keydown",L,{capture:!0}),i.current&&cancelAnimationFrame(i.current),clearTimeout(s.current)}},[]),a(Y,{children:[a("div",{ref:t,className:w("fixed top-0 left-0 w-screen h-screen","z-[214748365]"),style:{pointerEvents:"none"}}),a("canvas",{ref:e,dir:"ltr",className:w("react-scan-inspector-overlay","fixed top-0 left-0 w-screen h-screen","pointer-events-none","z-[214748367]")})]})},yu=class{constructor(e,t){this.width=e,this.height=t,this.maxWidth=e-D*2,this.maxHeight=t-D*2}rightEdge(e){return this.width-e-D}bottomEdge(e){return this.height-e-D}isFullWidth(e){return e>=this.maxWidth}isFullHeight(e){return e>=this.maxHeight}},ht,Ut=()=>{const e=window.innerWidth,t=window.innerHeight;return ht&&ht.width===e&&ht.height===t||(ht=new yu(e,t)),ht},ku=(e,t,n,r,o)=>{if(n){if(e==="top-left")return"bottom-right";if(e==="top-right")return"bottom-left";if(e==="bottom-left")return"top-right";if(e==="bottom-right")return"top-left";const[i,s]=t.split("-");if(e==="left")return`${i}-right`;if(e==="right")return`${i}-left`;if(e==="top")return`bottom-${s}`;if(e==="bottom")return`top-${s}`}if(r){if(e==="left")return`${t.split("-")[0]}-right`;if(e==="right")return`${t.split("-")[0]}-left`}if(o){if(e==="top")return`bottom-${t.split("-")[1]}`;if(e==="bottom")return`top-${t.split("-")[1]}`}return t},Ft=(e,t,n)=>{const r=getComputedStyle(document.body).direction==="rtl",o=window.innerWidth,i=window.innerHeight,s=t===ce.width,l=s?t:Math.min(t,o-D*2),c=s?n:Math.min(n,i-D*2);let d,p,u=D,h=o-l-D,f=D,v=i-c-D;switch(e){case"top-right":d=r?-u:h,p=f;break;case"bottom-right":d=r?-u:h,p=v;break;case"bottom-left":d=r?-h:u,p=v;break;case"top-left":d=r?-h:u,p=f;break;default:d=u,p=f;break}return s&&(r?d=Math.min(-u,Math.max(d,-h)):d=Math.max(u,Math.min(d,h)),p=Math.max(f,Math.min(p,v))),{x:d,y:p}},_u=(e,t)=>{const[n,r]=t.split("-");return e!==n&&e!==r},Cu=(e,t,n,r)=>n&&r?!0:!n&&!r?_u(e,t):n?e!==t.split("-")[0]:r?e!==t.split("-")[1]:!1,on=(e,t,n)=>{const r=n?ce.width:ce.initialHeight,o=n?Ut().maxWidth:Ut().maxHeight,i=e+t;return Math.min(Math.max(r,i),o)},Su=(e,t,n,r,o)=>{const i=getComputedStyle(document.body).direction==="rtl",s=window.innerWidth-D*2,l=window.innerHeight-D*2;let c=t.width,d=t.height,p=n.x,u=n.y;if(i&&e.includes("right")){const y=-n.x+t.width-D,m=Math.min(t.width+r,y);c=Math.min(s,Math.max(ce.width,m)),p=n.x+(c-t.width)}if(i&&e.includes("left")){const y=window.innerWidth-n.x-D,m=Math.min(t.width-r,y);c=Math.min(s,Math.max(ce.width,m))}if(!i&&e.includes("right")){const y=window.innerWidth-n.x-D,m=Math.min(t.width+r,y);c=Math.min(s,Math.max(ce.width,m))}if(!i&&e.includes("left")){const y=n.x+t.width-D,m=Math.min(t.width-r,y);c=Math.min(s,Math.max(ce.width,m)),p=n.x-(c-t.width)}if(e.includes("bottom")){const y=window.innerHeight-n.y-D,m=Math.min(t.height+o,y);d=Math.min(l,Math.max(ce.initialHeight,m))}if(e.includes("top")){const y=n.y+t.height-D,m=Math.min(t.height-o,y);d=Math.min(l,Math.max(ce.initialHeight,m)),u=n.y-(d-t.height)}let h=D,f=window.innerWidth-D-c,v=D,x=window.innerHeight-D-d;return i?p=Math.min(-h,Math.max(p,-f)):p=Math.max(h,Math.min(p,f)),u=Math.max(v,Math.min(u,x)),{newSize:{width:c,height:d},newPosition:{x:p,y:u}}},Tu=e=>{const t=Ut(),n={"top-left":Math.hypot(e.x,e.y),"top-right":Math.hypot(t.maxWidth-e.x,e.y),"bottom-left":Math.hypot(e.x,t.maxHeight-e.y),"bottom-right":Math.hypot(t.maxWidth-e.x,t.maxHeight-e.y)};let r="top-left";for(const o in n)n[o]<n[r]&&(r=o);return r},Nu=(e,t,n,r,o=100)=>{const i=n!==void 0?e-n:0,s=r!==void 0?t-r:0,l=window.innerWidth/2,c=window.innerHeight/2,d=i>o,p=i<-o,u=s>o,h=s<-o;if(d||p){const f=t>c;return d?f?"bottom-right":"top-right":f?"bottom-left":"top-left"}if(u||h){const f=e>l;return u?f?"bottom-right":"bottom-left":f?"top-right":"top-left"}return e>l?t>c?"bottom-right":"top-right":t>c?"bottom-left":"top-left"},an=({position:e})=>{const t=M(null),n=M(null),r=M(null),o=M(null);H(()=>{const l=t.current;if(!l)return;const c=()=>{l.classList.remove("pointer-events-none");const u=E.inspectState.value.kind==="focused",h=Q.value.view!=="none";(u||h)&&Cu(e,z.value.corner,z.value.dimensions.isFullWidth,z.value.dimensions.isFullHeight)?l.classList.remove("hidden","pointer-events-none","opacity-0"):l.classList.add("hidden","pointer-events-none","opacity-0")},d=z.subscribe(u=>{n.current!==null&&r.current!==null&&o.current!==null&&u.dimensions.width===n.current&&u.dimensions.height===r.current&&u.corner===o.current||(c(),n.current=u.dimensions.width,r.current=u.dimensions.height,o.current=u.corner)}),p=E.inspectState.subscribe(()=>{c()});return()=>{d(),p(),n.current=null,r.current=null,o.current=null}},[]);const i=ie(l=>{l.preventDefault(),l.stopPropagation();const c=wr.value;if(!c)return;const d=c.style,{dimensions:p}=z.value,u=l.clientX,h=l.clientY,f=p.width,v=p.height,x=p.position;z.value={...z.value,dimensions:{...p,isFullWidth:!1,isFullHeight:!1,width:f,height:v,position:x}};let y=null;const m=C=>{y||(d.transition="none",y=requestAnimationFrame(()=>{const{newSize:S,newPosition:T}=Su(e,{width:f,height:v},x,C.clientX-u,C.clientY-h);d.transform=`translate3d(${T.x}px, ${T.y}px, 0)`,d.width=`${S.width}px`,d.height=`${S.height}px`;const I=Math.floor(S.width-Ae/2),V=z.value.componentsTree.width,q=Math.min(I,Math.max(Ae,V));z.value={...z.value,dimensions:{isFullWidth:!1,isFullHeight:!1,width:S.width,height:S.height,position:T},componentsTree:{...z.value.componentsTree,width:q}},y=null}))},b=()=>{y&&(cancelAnimationFrame(y),y=null),document.removeEventListener("pointermove",m),document.removeEventListener("pointerup",b);const{dimensions:C,corner:S}=z.value,T=Ut(),I=T.isFullWidth(C.width),V=T.isFullHeight(C.height),q=I&&V;let O=S;(q||I||V)&&(O=Tu(C.position));const B=Ft(O,C.width,C.height),L=()=>{c.removeEventListener("transitionend",L)};c.addEventListener("transitionend",L),d.transform=`translate3d(${B.x}px, ${B.y}px, 0)`,z.value={...z.value,corner:O,dimensions:{isFullWidth:I,isFullHeight:V,width:C.width,height:C.height,position:B},lastDimensions:{isFullWidth:I,isFullHeight:V,width:C.width,height:C.height,position:B}},ke(je,{corner:O,dimensions:z.value.dimensions,lastDimensions:z.value.lastDimensions,componentsTree:z.value.componentsTree})};document.addEventListener("pointermove",m,{passive:!0}),document.addEventListener("pointerup",b)},[]),s=ie(l=>{l.preventDefault(),l.stopPropagation();const c=wr.value;if(!c)return;const d=c.style,{dimensions:p,corner:u}=z.value,h=Ut(),f=h.isFullWidth(p.width),v=h.isFullHeight(p.height),x=f&&v,y=(f||v)&&!x;let m=p.width,b=p.height;const C=ku(e,u,x,f,v);e==="left"||e==="right"?(m=f?p.width:h.maxWidth,y&&(m=f?ce.width:h.maxWidth)):(b=v?p.height:h.maxHeight,y&&(b=v?ce.initialHeight:h.maxHeight)),x&&(e==="left"||e==="right"?m=ce.width:b=ce.initialHeight);const S=Ft(C,m,b),T={isFullWidth:h.isFullWidth(m),isFullHeight:h.isFullHeight(b),width:m,height:b,position:S},I=Math.floor(m-ce.width/2),V=z.value.componentsTree.width,q=Math.floor(m*.3),O=f?Ae:(e==="left"||e==="right")&&!f?Math.min(I,Math.max(Ae,q)):Math.min(I,Math.max(Ae,V));requestAnimationFrame(()=>{z.value={corner:C,dimensions:T,lastDimensions:p,componentsTree:{...z.value.componentsTree,width:O}},d.transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",d.width=`${m}px`,d.height=`${b}px`,d.transform=`translate3d(${S.x}px, ${S.y}px, 0)`}),ke(je,{corner:C,dimensions:T,lastDimensions:p,componentsTree:{...z.value.componentsTree,width:O}})},[]);return a("div",{ref:t,onPointerDown:i,onDblClick:s,className:w("absolute z-50","flex items-center justify-center","group","transition-colors select-none","peer",{"resize-left peer/left":e==="left","resize-right peer/right z-10":e==="right","resize-top peer/top":e==="top","resize-bottom peer/bottom":e==="bottom"}),children:a("span",{className:"resize-line-wrapper",children:a("span",{className:"resize-line",children:a(oe,{name:"icon-ellipsis",size:18,className:w("text-neutral-400",(e==="left"||e==="right")&&"rotate-90")})})})})},fa={horizontal:{width:20,height:48},vertical:{width:48,height:20}},Eu=()=>{const e=M(null),t=M(!1),n=M(0),r=M(0),o=M(!1),i=ie((h=!0)=>{if(!e.current)return;const{corner:f}=z.value;let v,x;if(Ce.value){const O=Ce.value.orientation||"horizontal",B=fa[O];v=B.width,x=B.height}else if(t.current){const O=z.value.lastDimensions;v=on(O.width,0,!0),x=on(O.height,0,!1),o.current&&(o.current=!1)}else v=n.current,x=r.current;let m=Ft(f,v,x);if(Ce.value){const{corner:O,orientation:B="horizontal"}=Ce.value,L=fa[B];switch(O){case"top-left":m=B==="horizontal"?{x:-1,y:D}:{x:D,y:-1};break;case"bottom-left":m=B==="horizontal"?{x:-1,y:window.innerHeight-L.height-D}:{x:D,y:window.innerHeight-L.height+1};break;case"top-right":m=B==="horizontal"?{x:window.innerWidth-L.width+1,y:D}:{x:window.innerWidth-L.width-D,y:-1};break;case"bottom-right":default:m=B==="horizontal"?{x:window.innerWidth-L.width+1,y:window.innerHeight-L.height-D}:{x:window.innerWidth-L.width-D,y:window.innerHeight-L.height+1};break}}const b=v<ce.width||x<ce.initialHeight,C=h&&!b,S=e.current,T=S.style;let I=null;const V=()=>{Vn(),S.removeEventListener("transitionend",V),I&&(cancelAnimationFrame(I),I=null)};S.addEventListener("transitionend",V),T.transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",I=requestAnimationFrame(()=>{T.width=`${v}px`,T.height=`${x}px`,T.transform=`translate3d(${m.x}px, ${m.y}px, 0)`,I=null});const q={isFullWidth:v>=window.innerWidth-D*2,isFullHeight:x>=window.innerHeight-D*2,width:v,height:x,position:m};z.value={corner:f,dimensions:q,lastDimensions:t?z.value.lastDimensions:v>n.current?q:z.value.lastDimensions,componentsTree:z.value.componentsTree},C&&ke(je,{corner:z.value.corner,dimensions:z.value.dimensions,lastDimensions:z.value.lastDimensions,componentsTree:z.value.componentsTree}),Vn()},[]),s=ie(h=>{if(h.preventDefault(),!e.current||h.target.closest("button"))return;const f=e.current,v=f.style,{dimensions:x}=z.value,y=h.clientX,m=h.clientY,b=x.position.x,C=x.position.y;let S=b,T=C,I=null,V=!1,q=y,O=m;const B=$=>{I||(V=!0,q=$.clientX,O=$.clientY,I=requestAnimationFrame(()=>{const le=q-y,ue=O-m;S=Number(b)+le,T=Number(C)+ue,v.transition="none",v.transform=`translate3d(${S}px, ${T}px, 0)`;const me=S+x.width,g=T+x.height,k=Math.max(0,-S),_=Math.max(0,me-window.innerWidth),N=Math.max(0,-T),A=Math.max(0,g-window.innerHeight),F=Math.min(x.width,k+_),R=Math.min(x.height,N+A),j=F*x.height+R*x.width-F*R,J=x.width*x.height;let G=j>J*.35;if(!G&&X.options.value.showFPS){const ee=S+x.width,pe=ee-100;G=ee<=0||pe>=window.innerWidth||T+x.height<=0||T>=window.innerHeight}if(G){const ee=S+x.width/2,pe=T+x.height/2,we=window.innerWidth/2,he=window.innerHeight/2;let _e;ee<we?_e=pe<he?"top-left":"bottom-left":_e=pe<he?"top-right":"bottom-right";let Gt;const Jt=Math.max(k,_),Kt=Math.max(N,A);Gt=Jt>Kt?"horizontal":"vertical",z.value={...z.value,corner:_e,lastDimensions:{...x,position:Ft(_e,x.width,x.height)}};const io={corner:_e,orientation:Gt};Ce.value=io,ke(un,io),ke(je,z.value),i(!1),document.removeEventListener("pointermove",B),document.removeEventListener("pointerup",L),I&&(cancelAnimationFrame(I),I=null)}I=null}))},L=()=>{if(!f)return;I&&(cancelAnimationFrame(I),I=null),document.removeEventListener("pointermove",B),document.removeEventListener("pointerup",L);const $=Math.abs(q-y),le=Math.abs(O-m),ue=Math.sqrt($*$+le*le);if(!V||ue<60)return;const me=Nu(q,O,y,m,E.inspectState.value.kind==="focused"?80:40);if(me===z.value.corner){v.transition="transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)";const _=z.value.dimensions.position;requestAnimationFrame(()=>{v.transform=`translate3d(${_.x}px, ${_.y}px, 0)`});return}const g=Ft(me,x.width,x.height);if(S===b&&T===C)return;const k=()=>{v.transition="none",Vn(),f.removeEventListener("transitionend",k),I&&(cancelAnimationFrame(I),I=null)};f.addEventListener("transitionend",k),v.transition="transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",requestAnimationFrame(()=>{v.transform=`translate3d(${g.x}px, ${g.y}px, 0)`}),z.value={corner:me,dimensions:{isFullWidth:x.isFullWidth,isFullHeight:x.isFullHeight,width:x.width,height:x.height,position:g},lastDimensions:z.value.lastDimensions,componentsTree:z.value.componentsTree},ke(je,{corner:me,dimensions:z.value.dimensions,lastDimensions:z.value.lastDimensions,componentsTree:z.value.componentsTree})};document.addEventListener("pointermove",B),document.addEventListener("pointerup",L)},[]),l=ie(h=>{if(h.preventDefault(),!e.current||!Ce.value)return;const{corner:f,orientation:v="horizontal"}=Ce.value,x=h.clientX,y=h.clientY;let m=null,b=!1;const C=50,S=I=>{if(b||m)return;const V=I.clientX-x,q=I.clientY-y;let O=!1;if(v==="horizontal"?(f.endsWith("left")&&V>C||f.endsWith("right")&&V<-C)&&(O=!0):(f.startsWith("top")&&q>C||f.startsWith("bottom")&&q<-C)&&(O=!0),O){if(b=!0,Ce.value=null,ke(un,null),n.current===0&&e.current)requestAnimationFrame(()=>{if(e.current){e.current.style.width="min-content";const B=e.current.offsetWidth;n.current=B||300;const L=z.value.lastDimensions,$=on(L.width,0,!0),le=on(L.height,0,!1);let ue=I.clientX-$/2,me=I.clientY-le/2;ue=Math.max(D,Math.min(ue,window.innerWidth-$-D)),me=Math.max(D,Math.min(me,window.innerHeight-le-D)),z.value={...z.value,dimensions:{...z.value.dimensions,position:{x:ue,y:me}}},i(!0);const g=We(ct);Q.value=g||{view:"none"},setTimeout(()=>{if(e.current){const k=new PointerEvent("pointerdown",{clientX:I.clientX,clientY:I.clientY,pointerId:I.pointerId,bubbles:!0});e.current.dispatchEvent(k)}},100)}});else{i(!0);const B=We(ct);Q.value=B||{view:"none"}}document.removeEventListener("pointermove",S),document.removeEventListener("pointerup",T)}},T=()=>{document.removeEventListener("pointermove",S),document.removeEventListener("pointerup",T)};document.addEventListener("pointermove",S),document.addEventListener("pointerup",T)},[]);H(()=>{if(!e.current)return;$o(ct),Ce.value?(r.current=36,n.current=0):(e.current.style.width="min-content",r.current=36,n.current=e.current.offsetWidth),e.current.style.maxWidth=`calc(100vw - ${D*2}px)`,e.current.style.maxHeight=`calc(100vh - ${D*2}px)`,i(),E.inspectState.value.kind!=="focused"&&!Ce.value&&!o.current&&(z.value={...z.value,dimensions:{isFullWidth:!1,isFullHeight:!1,width:n.current,height:r.current,position:z.value.dimensions.position}}),wr.value=e.current;const h=z.subscribe(y=>{if(!e.current)return;const{x:m,y:b}=y.dimensions.position,{width:C,height:S}=y.dimensions,T=e.current;requestAnimationFrame(()=>{T.style.transform=`translate3d(${m}px, ${b}px, 0)`,T.style.width=`${C}px`,T.style.height=`${S}px`})}),f=Q.subscribe(y=>{t.current=y.view!=="none",i(),Ce.value||(y.view!=="none"?ke(ct,y):$o(ct))}),v=E.inspectState.subscribe(y=>{t.current=y.kind==="focused",i()}),x=()=>{i(!0)};return window.addEventListener("resize",x,{passive:!0}),()=>{window.removeEventListener("resize",x),f(),v(),h(),ke(je,{...Fe,corner:z.value.corner})}},[]);const[c,d]=U(!1);H(()=>{d(!0)},[]);const p=Ce.value;let u="";if(p){const{orientation:h="horizontal",corner:f}=p;h==="horizontal"?u=f?.endsWith("right")?"rotate-180":"":u=f?.startsWith("bottom")?"-rotate-90":"rotate-90"}return a(Y,{children:[a(xu,{}),a(ao.Provider,{value:e.current,children:a("div",{id:"react-scan-toolbar",dir:"ltr",ref:e,onPointerDown:p?l:s,className:w("fixed inset-0",p?(()=>{const{orientation:h="horizontal",corner:f}=p;return h==="horizontal"?f?.endsWith("right")?"rounded-tl-lg rounded-bl-lg shadow-lg":"rounded-tr-lg rounded-br-lg shadow-lg":f?.startsWith("bottom")?"rounded-tl-lg rounded-tr-lg shadow-lg":"rounded-bl-lg rounded-br-lg shadow-lg"})():"rounded-lg shadow-lg","flex flex-col","font-mono text-[13px]","user-select-none","opacity-0",p?"cursor-pointer":"cursor-move","z-[124124124124]","animate-fade-in animation-duration-300 animation-delay-300","will-change-transform","[touch-action:none]"),children:p?a("button",{type:"button",onClick:()=>{Ce.value=null,ke(un,null),n.current===0&&e.current&&requestAnimationFrame(()=>{if(e.current){e.current.style.width="min-content";const f=e.current.offsetWidth;n.current=f||300,i(!0)}});const h=We(ct);Q.value=h||{view:"none"}},className:"flex items-center justify-center w-full h-full text-white",title:"Expand toolbar",children:a(oe,{name:"icon-chevron-right",size:16,className:w("transition-transform",u)})}):a(Y,{children:[a(an,{position:"top"}),a(an,{position:"bottom"}),a(an,{position:"left"}),a(an,{position:"right"}),a(bu,{})]})})})]})},ao=$a(null),zu=()=>a("svg",{xmlns:"http://www.w3.org/2000/svg",style:"display: none;",children:[a("title",{children:"React Scan Icons"}),a("symbol",{id:"icon-inspect",viewBox:"0 0 24 24",fill:"none","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",children:[a("path",{d:"M12.034 12.681a.498.498 0 0 1 .647-.647l9 3.5a.5.5 0 0 1-.033.943l-3.444 1.068a1 1 0 0 0-.66.66l-1.067 3.443a.5.5 0 0 1-.943.033z"}),a("path",{d:"M5 3a2 2 0 0 0-2 2"}),a("path",{d:"M19 3a2 2 0 0 1 2 2"}),a("path",{d:"M5 21a2 2 0 0 1-2-2"}),a("path",{d:"M9 3h1"}),a("path",{d:"M9 21h2"}),a("path",{d:"M14 3h1"}),a("path",{d:"M3 9v1"}),a("path",{d:"M21 9v2"}),a("path",{d:"M3 14v1"})]}),a("symbol",{id:"icon-focus",viewBox:"0 0 24 24",fill:"none","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",children:[a("path",{d:"M12.034 12.681a.498.498 0 0 1 .647-.647l9 3.5a.5.5 0 0 1-.033.943l-3.444 1.068a1 1 0 0 0-.66.66l-1.067 3.443a.5.5 0 0 1-.943.033z"}),a("path",{d:"M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"})]}),a("symbol",{id:"icon-next",viewBox:"0 0 24 24",fill:"none","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",children:a("path",{d:"M6 9h6V5l7 7-7 7v-4H6V9z"})}),a("symbol",{id:"icon-previous",viewBox:"0 0 24 24",fill:"none","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",children:a("path",{d:"M18 15h-6v4l-7-7 7-7v4h6v6z"})}),a("symbol",{id:"icon-close",viewBox:"0 0 24 24",fill:"none","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",children:[a("line",{x1:"18",y1:"6",x2:"6",y2:"18"}),a("line",{x1:"6",y1:"6",x2:"18",y2:"18"})]}),a("symbol",{id:"icon-replay",viewBox:"0 0 24 24",fill:"none","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",children:[a("path",{d:"M3 7V5a2 2 0 0 1 2-2h2"}),a("path",{d:"M17 3h2a2 2 0 0 1 2 2v2"}),a("path",{d:"M21 17v2a2 2 0 0 1-2 2h-2"}),a("path",{d:"M7 21H5a2 2 0 0 1-2-2v-2"}),a("circle",{cx:"12",cy:"12",r:"1"}),a("path",{d:"M18.944 12.33a1 1 0 0 0 0-.66 7.5 7.5 0 0 0-13.888 0 1 1 0 0 0 0 .66 7.5 7.5 0 0 0 13.888 0"})]}),a("symbol",{id:"icon-ellipsis",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",children:[a("circle",{cx:"12",cy:"12",r:"1"}),a("circle",{cx:"19",cy:"12",r:"1"}),a("circle",{cx:"5",cy:"12",r:"1"})]}),a("symbol",{id:"icon-copy",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",children:[a("rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2"}),a("path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"})]}),a("symbol",{id:"icon-check",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",children:a("path",{d:"M20 6 9 17l-5-5"})}),a("symbol",{id:"icon-chevron-right",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",children:a("path",{d:"m9 18 6-6-6-6"})}),a("symbol",{id:"icon-settings",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",children:[a("path",{d:"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"}),a("circle",{cx:"12",cy:"12",r:"3"})]}),a("symbol",{id:"icon-flame",viewBox:"0 0 24 24",children:a("path",{d:"M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"})}),a("symbol",{id:"icon-function",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",children:[a("rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}),a("path",{d:"M9 17c2 0 2.8-1 2.8-2.8V10c0-2 1-3.3 3.2-3"}),a("path",{d:"M9 11.2h5.7"})]}),a("symbol",{id:"icon-triangle-alert",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",children:[a("path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"}),a("path",{d:"M12 9v4"}),a("path",{d:"M12 17h.01"})]}),a("symbol",{id:"icon-gallery-horizontal-end",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",children:[a("path",{d:"M2 7v10"}),a("path",{d:"M6 5v14"}),a("rect",{width:"12",height:"18",x:"10",y:"3",rx:"2"})]}),a("symbol",{id:"icon-search",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",children:[a("circle",{cx:"11",cy:"11",r:"8"}),a("line",{x1:"21",y1:"21",x2:"16.65",y2:"16.65"})]}),a("symbol",{id:"icon-lock",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",children:[a("rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2"}),a("path",{d:"M7 11V7a5 5 0 0 1 10 0v4"})]}),a("symbol",{id:"icon-lock-open",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",children:[a("rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2"}),a("path",{d:"M7 11V7a5 5 0 0 1 9.9-1"})]}),a("symbol",{id:"icon-sanil",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",children:[a("path",{d:"M2 13a6 6 0 1 0 12 0 4 4 0 1 0-8 0 2 2 0 0 0 4 0"}),a("circle",{cx:"10",cy:"13",r:"8"}),a("path",{d:"M2 21h12c4.4 0 8-3.6 8-8V7a2 2 0 1 0-4 0v6"}),a("path",{d:"M18 3 19.1 5.2"})]})]}),Au=class extends Ne{constructor(){super(...arguments),this.state={hasError:!1,error:null},this.handleReset=()=>{this.setState({hasError:!1,error:null})}}static getDerivedStateFromError(e){return{hasError:!0,error:e}}render(){return this.state.hasError?a("div",{className:"fixed bottom-4 right-4 z-[124124124124]",children:a("div",{className:"p-3 bg-black rounded-lg shadow-lg w-80",children:[a("div",{className:"flex items-center gap-2 mb-2 text-red-400 text-sm font-medium",children:[a(oe,{name:"icon-flame",className:"text-red-500",size:14}),"React Scan ran into a problem"]}),a("div",{className:"p-2 bg-black rounded font-mono text-xs text-red-300 mb-3 break-words",children:this.state.error?.message||JSON.stringify(this.state.error)}),a("button",{type:"button",onClick:this.handleReset,className:"px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5",children:"Restart"})]})}):this.props.children}},Iu=e=>{const t=document.createElement("div");t.id="react-scan-toolbar-root",window.__REACT_SCAN_TOOLBAR_CONTAINER__=t,e.appendChild(t),At(a(Au,{children:a(Y,{children:[a(zu,{}),a(Eu,{})]})}),t);const n=t.remove.bind(t);return t.remove=()=>{window.__REACT_SCAN_TOOLBAR_CONTAINER__=void 0,t.hasChildNodes()&&(At(null,t),At(null,t)),n()},t},Mu={version:"0.4.3"},Je=null,Et=null,Fu=()=>{if(Je&&Et)return{rootContainer:Je,shadowRoot:Et};Je=document.createElement("div"),Je.id="react-scan-root",Et=Je.attachShadow({mode:"open"});const e=document.createElement("style");return e.textContent=Kc,Et.appendChild(e),document.documentElement.appendChild(Je),{rootContainer:Je,shadowRoot:Et}},E={wasDetailsOpen:de(!0),isInIframe:de(De&&window.self!==window.top),inspectState:de({kind:"uninitialized"}),monitor:de(null),fiberRoots:new Set,reportData:new Map,legacyReportData:new Map,lastReportTime:de(0),interactionListeningForRenders:null,changesListeners:new Map},X={instrumentation:null,componentAllowList:null,options:de({enabled:!0,log:!1,showToolbar:!0,animationSpeed:"fast",dangerouslyForceRunInProduction:!1,showFPS:!0,showNotificationCount:!0,allowInIframe:!1}),runInAllEnvironments:!1,onRender:null,scheduledOutlines:new Map,activeOutlines:new Map,Store:E,version:Mu.version};De&&window.__REACT_SCAN_EXTENSION__&&(window.__REACT_SCAN_VERSION__=X.version);function Ru(e){return e in X.options.value}var Ai=e=>{const t=[],n={};for(const r in e){if(!Ru(r))continue;const o=e[r];switch(r){case"enabled":case"log":case"showToolbar":case"showNotificationCount":case"dangerouslyForceRunInProduction":case"showFPS":case"allowInIframe":typeof o!="boolean"?t.push(`- ${r} must be a boolean. Got "${o}"`):n[r]=o;break;case"animationSpeed":["slow","fast","off"].includes(o)?n[r]=o:t.push(`- Invalid animation speed "${o}". Using default "fast"`);break;case"onCommitStart":typeof o!="function"?t.push(`- ${r} must be a function. Got "${o}"`):n.onCommitStart=o;break;case"onCommitFinish":typeof o!="function"?t.push(`- ${r} must be a function. Got "${o}"`):n.onCommitFinish=o;break;case"onRender":typeof o!="function"?t.push(`- ${r} must be a function. Got "${o}"`):n.onRender=o;break;case"onPaintStart":case"onPaintFinish":typeof o!="function"?t.push(`- ${r} must be a function. Got "${o}"`):n[r]=o;break;default:t.push(`- Unknown option "${r}"`)}}return t.length>0&&console.warn(`[React Scan] Invalid options:
${t.join(`
`)}`),n},$u=e=>{try{const t=Ai(e);if(Object.keys(t).length===0)return;const n="showToolbar"in t&&t.showToolbar!==void 0,r={...X.options.value,...t},{instrumentation:o}=X;o&&"enabled"in t&&(o.isPaused.value=t.enabled===!1),X.options.value=r;try{const i=We("react-scan-options")?.enabled;typeof i=="boolean"&&(r.enabled=i)}catch(i){X.options.value._debug==="verbose"&&console.error("[React Scan Internal Error]","Failed to create notifications outline canvas",i)}return ke("react-scan-options",r),n&&Ii(!!r.showToolbar),r}catch(t){X.options.value._debug==="verbose"&&console.error("[React Scan Internal Error]","Failed to create notifications outline canvas",t)}},Du=()=>X.options,sn=null,ma,Pn=()=>{if(sn!==null)return sn;ma??=nt();for(const e of ma.renderers.values())is(e)==="production"&&(sn=!0);return sn},Pu=()=>{try{if(!De||!X.runInAllEnvironments&&Pn()&&!X.options.value.dangerouslyForceRunInProduction)return;const e=We("react-scan-options");if(e){const n=Ai(e);Object.keys(n).length>0&&(X.options.value={...X.options.value,...n})}const t=Du();Jc(()=>{Ii(!!t.value.showToolbar)}),!E.monitor.value&&De&&setTimeout(()=>{ss()||console.error("[React Scan] Failed to load. Must import React Scan before React runs.")},5e3)}catch(e){X.options.value._debug==="verbose"&&console.error("[React Scan Internal Error]","Failed to create notifications outline canvas",e)}},Ii=e=>{window.reactScanCleanupListeners?.();const t=Sd(),n=Ou();window.reactScanCleanupListeners=()=>{t(),n?.()};const r=window.__REACT_SCAN_TOOLBAR_CONTAINER__;if(!e){r?.remove();return}r?.remove();const{shadowRoot:o}=Fu();Iu(o)},Ou=()=>{try{const e=document.documentElement;return qd(e)}catch(e){X.options.value._debug==="verbose"&&console.error("[React Scan Internal Error]","Failed to create notifications outline canvas",e)}},Hu=(e={})=>{$u(e),!(E.isInIframe.value&&!X.options.value.allowInIframe&&!X.runInAllEnvironments)&&(e.enabled===!1&&e.showToolbar!==!0||Pu())},Lu=new WeakSet;export{X as ReactScanInternals,E as Store,Pn as getIsProduction,Du as getOptions,Lu as ignoredProps,Hu as scan,$u as setOptions,Pu as start};
//# sourceMappingURL=https://pplx-static-sourcemaps.perplexity.ai/_sidecar/assets/index-CRW6sVvJ.js.map
