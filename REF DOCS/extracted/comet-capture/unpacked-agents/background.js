try {
  let e = typeof window < "u" ? window : typeof global < "u" ? global : typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : {}, t = new e.Error().stack;
  t && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[t] = "654ee926-7832-46d7-aae8-131e8845181b", e._sentryDebugIdIdentifier = "sentry-dbid-654ee926-7832-46d7-aae8-131e8845181b");
} catch {
}
const am = "entropy-agent-extension-main", cm = "__", Zl = "pplx-agent-", ed = "/mobilebasic", ie = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__, Tn = "8.47.0", ee = globalThis;
function Io(e, t, n) {
  const r = n || ee, s = r.__SENTRY__ = r.__SENTRY__ || {}, o = s[Tn] = s[Tn] || {};
  return o[e] || (o[e] = t());
}
const Dn = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__, um = "Sentry Logger ", Ui = [
  "debug",
  "info",
  "warn",
  "error",
  "log",
  "assert",
  "trace"
], ro = {};
function Un(e) {
  if (!("console" in ee))
    return e();
  const t = ee.console, n = {}, r = Object.keys(ro);
  r.forEach((s) => {
    const o = ro[s];
    n[s] = t[s], t[s] = o;
  });
  try {
    return e();
  } finally {
    r.forEach((s) => {
      t[s] = n[s];
    });
  }
}
function lm() {
  let e = !1;
  const t = {
    enable: () => {
      e = !0;
    },
    disable: () => {
      e = !1;
    },
    isEnabled: () => e
  };
  return Dn ? Ui.forEach((n) => {
    t[n] = (...r) => {
      e && Un(() => {
        ee.console[n](`${um}[${n}]:`, ...r);
      });
    };
  }) : Ui.forEach((n) => {
    t[n] = () => {
    };
  }), t;
}
const B = Io("logger", lm), td = 50, In = "?", Oc = /\(error: (.*)\)/, Lc = /captureMessage|captureException/;
function nd(...e) {
  const t = e.sort((n, r) => n[0] - r[0]).map((n) => n[1]);
  return (n, r = 0, s = 0) => {
    const o = [], i = n.split(`
`);
    for (let a = r; a < i.length; a++) {
      const c = i[a];
      if (c.length > 1024)
        continue;
      const u = Oc.test(c) ? c.replace(Oc, "$1") : c;
      if (!u.match(/\S*Error: /)) {
        for (const d of t) {
          const l = d(u);
          if (l) {
            o.push(l);
            break;
          }
        }
        if (o.length >= td + s)
          break;
      }
    }
    return fm(o.slice(s));
  };
}
function dm(e) {
  return Array.isArray(e) ? nd(...e) : e;
}
function fm(e) {
  if (!e.length)
    return [];
  const t = Array.from(e);
  return /sentryWrapped/.test(Ts(t).function || "") && t.pop(), t.reverse(), Lc.test(Ts(t).function || "") && (t.pop(), Lc.test(Ts(t).function || "") && t.pop()), t.slice(0, td).map((n) => ({
    ...n,
    filename: n.filename || Ts(t).filename,
    function: n.function || In
  }));
}
function Ts(e) {
  return e[e.length - 1] || {};
}
const ri = "<anonymous>";
function Jt(e) {
  try {
    return !e || typeof e != "function" ? ri : e.name || ri;
  } catch {
    return ri;
  }
}
function Nc(e) {
  const t = e.exception;
  if (t) {
    const n = [];
    try {
      return t.values.forEach((r) => {
        r.stacktrace.frames && n.push(...r.stacktrace.frames);
      }), n;
    } catch {
      return;
    }
  }
}
const Hs = {}, Mc = {};
function Fn(e, t) {
  Hs[e] = Hs[e] || [], Hs[e].push(t);
}
function $n(e, t) {
  if (!Mc[e]) {
    Mc[e] = !0;
    try {
      t();
    } catch (n) {
      Dn && B.error(`Error while instrumenting ${e}`, n);
    }
  }
}
function ct(e, t) {
  const n = e && Hs[e];
  if (n)
    for (const r of n)
      try {
        r(t);
      } catch (s) {
        Dn && B.error(
          `Error while triggering instrumentation handler.
Type: ${e}
Name: ${Jt(r)}
Error:`,
          s
        );
      }
}
let si = null;
function pm(e) {
  const t = "error";
  Fn(t, e), $n(t, hm);
}
function hm() {
  si = ee.onerror, ee.onerror = function(e, t, n, r, s) {
    return ct("error", {
      column: r,
      error: s,
      line: n,
      msg: e,
      url: t
    }), si ? si.apply(this, arguments) : !1;
  }, ee.onerror.__SENTRY_INSTRUMENTED__ = !0;
}
let oi = null;
function mm(e) {
  const t = "unhandledrejection";
  Fn(t, e), $n(t, gm);
}
function gm() {
  oi = ee.onunhandledrejection, ee.onunhandledrejection = function(e) {
    return ct("unhandledrejection", e), oi ? oi.apply(this, arguments) : !0;
  }, ee.onunhandledrejection.__SENTRY_INSTRUMENTED__ = !0;
}
function ko() {
  return La(ee), ee;
}
function La(e) {
  const t = e.__SENTRY__ = e.__SENTRY__ || {};
  return t.version = t.version || Tn, t[Tn] = t[Tn] || {};
}
const rd = Object.prototype.toString;
function Na(e) {
  switch (rd.call(e)) {
    case "[object Error]":
    case "[object Exception]":
    case "[object DOMException]":
    case "[object WebAssembly.Exception]":
      return !0;
    default:
      return kn(e, Error);
  }
}
function wr(e, t) {
  return rd.call(e) === `[object ${t}]`;
}
function sd(e) {
  return wr(e, "ErrorEvent");
}
function Pc(e) {
  return wr(e, "DOMError");
}
function ym(e) {
  return wr(e, "DOMException");
}
function At(e) {
  return wr(e, "String");
}
function Ma(e) {
  return typeof e == "object" && e !== null && "__sentry_template_string__" in e && "__sentry_template_values__" in e;
}
function Pa(e) {
  return e === null || Ma(e) || typeof e != "object" && typeof e != "function";
}
function lr(e) {
  return wr(e, "Object");
}
function Co(e) {
  return typeof Event < "u" && kn(e, Event);
}
function _m(e) {
  return typeof Element < "u" && kn(e, Element);
}
function bm(e) {
  return wr(e, "RegExp");
}
function Ao(e) {
  return !!(e && e.then && typeof e.then == "function");
}
function wm(e) {
  return lr(e) && "nativeEvent" in e && "preventDefault" in e && "stopPropagation" in e;
}
function kn(e, t) {
  try {
    return e instanceof t;
  } catch {
    return !1;
  }
}
function od(e) {
  return !!(typeof e == "object" && e !== null && (e.__isVue || e._isVue));
}
const Da = ee, Em = 80;
function id(e, t = {}) {
  if (!e)
    return "<unknown>";
  try {
    let n = e;
    const r = 5, s = [];
    let o = 0, i = 0;
    const a = " > ", c = a.length;
    let u;
    const d = Array.isArray(t) ? t : t.keyAttrs, l = !Array.isArray(t) && t.maxStringLength || Em;
    for (; n && o++ < r && (u = Sm(n, d), !(u === "html" || o > 1 && i + s.length * c + u.length >= l)); )
      s.push(u), i += u.length, n = n.parentNode;
    return s.reverse().join(a);
  } catch {
    return "<unknown>";
  }
}
function Sm(e, t) {
  const n = e, r = [];
  if (!n || !n.tagName)
    return "";
  if (Da.HTMLElement && n instanceof HTMLElement && n.dataset) {
    if (n.dataset.sentryComponent)
      return n.dataset.sentryComponent;
    if (n.dataset.sentryElement)
      return n.dataset.sentryElement;
  }
  r.push(n.tagName.toLowerCase());
  const s = t && t.length ? t.filter((i) => n.getAttribute(i)).map((i) => [i, n.getAttribute(i)]) : null;
  if (s && s.length)
    s.forEach((i) => {
      r.push(`[${i[0]}="${i[1]}"]`);
    });
  else {
    n.id && r.push(`#${n.id}`);
    const i = n.className;
    if (i && At(i)) {
      const a = i.split(/\s+/);
      for (const c of a)
        r.push(`.${c}`);
    }
  }
  const o = ["aria-label", "type", "name", "title", "alt"];
  for (const i of o) {
    const a = n.getAttribute(i);
    a && r.push(`[${i}="${a}"]`);
  }
  return r.join("");
}
function Tm() {
  try {
    return Da.document.location.href;
  } catch {
    return "";
  }
}
function vm(e) {
  if (!Da.HTMLElement)
    return null;
  let t = e;
  const n = 5;
  for (let r = 0; r < n; r++) {
    if (!t)
      return null;
    if (t instanceof HTMLElement) {
      if (t.dataset.sentryComponent)
        return t.dataset.sentryComponent;
      if (t.dataset.sentryElement)
        return t.dataset.sentryElement;
    }
    t = t.parentNode;
  }
  return null;
}
function or(e, t = 0) {
  return typeof e != "string" || t === 0 || e.length <= t ? e : `${e.slice(0, t)}...`;
}
function Dc(e, t) {
  if (!Array.isArray(e))
    return "";
  const n = [];
  for (let r = 0; r < e.length; r++) {
    const s = e[r];
    try {
      od(s) ? n.push("[VueViewModel]") : n.push(String(s));
    } catch {
      n.push("[value cannot be serialized]");
    }
  }
  return n.join(t);
}
function Im(e, t, n = !1) {
  return At(e) ? bm(t) ? t.test(e) : At(t) ? n ? e === t : e.includes(t) : !1 : !1;
}
function Ro(e, t = [], n = !1) {
  return t.some((r) => Im(e, r, n));
}
function Ke(e, t, n) {
  if (!(t in e))
    return;
  const r = e[t], s = n(r);
  typeof s == "function" && ad(s, r);
  try {
    e[t] = s;
  } catch {
    Dn && B.log(`Failed to replace method "${t}" in object`, e);
  }
}
function Cn(e, t, n) {
  try {
    Object.defineProperty(e, t, {
      // enumerable: false, // the default, so we can save on bundle size by not explicitly setting it
      value: n,
      writable: !0,
      configurable: !0
    });
  } catch {
    Dn && B.log(`Failed to add non-enumerable property "${t}" to object`, e);
  }
}
function ad(e, t) {
  try {
    const n = t.prototype || {};
    e.prototype = t.prototype = n, Cn(e, "__sentry_original__", t);
  } catch {
  }
}
function Ua(e) {
  return e.__sentry_original__;
}
function cd(e) {
  if (Na(e))
    return {
      message: e.message,
      name: e.name,
      stack: e.stack,
      ...Fc(e)
    };
  if (Co(e)) {
    const t = {
      type: e.type,
      target: Uc(e.target),
      currentTarget: Uc(e.currentTarget),
      ...Fc(e)
    };
    return typeof CustomEvent < "u" && kn(e, CustomEvent) && (t.detail = e.detail), t;
  } else
    return e;
}
function Uc(e) {
  try {
    return _m(e) ? id(e) : Object.prototype.toString.call(e);
  } catch {
    return "<unknown>";
  }
}
function Fc(e) {
  if (typeof e == "object" && e !== null) {
    const t = {};
    for (const n in e)
      Object.prototype.hasOwnProperty.call(e, n) && (t[n] = e[n]);
    return t;
  } else
    return {};
}
function km(e, t = 40) {
  const n = Object.keys(cd(e));
  n.sort();
  const r = n[0];
  if (!r)
    return "[object has no keys]";
  if (r.length >= t)
    return or(r, t);
  for (let s = n.length; s > 0; s--) {
    const o = n.slice(0, s).join(", ");
    if (!(o.length > t))
      return s === n.length ? o : or(o, t);
  }
  return "";
}
function Ye(e) {
  return Fi(e, /* @__PURE__ */ new Map());
}
function Fi(e, t) {
  if (Cm(e)) {
    const n = t.get(e);
    if (n !== void 0)
      return n;
    const r = {};
    t.set(e, r);
    for (const s of Object.getOwnPropertyNames(e))
      typeof e[s] < "u" && (r[s] = Fi(e[s], t));
    return r;
  }
  if (Array.isArray(e)) {
    const n = t.get(e);
    if (n !== void 0)
      return n;
    const r = [];
    return t.set(e, r), e.forEach((s) => {
      r.push(Fi(s, t));
    }), r;
  }
  return e;
}
function Cm(e) {
  if (!lr(e))
    return !1;
  try {
    const t = Object.getPrototypeOf(e).constructor.name;
    return !t || t === "Object";
  } catch {
    return !0;
  }
}
const ud = 1e3;
function is() {
  return Date.now() / ud;
}
function Am() {
  const { performance: e } = ee;
  if (!e || !e.now)
    return is;
  const t = Date.now() - e.now(), n = e.timeOrigin == null ? t : e.timeOrigin;
  return () => (n + e.now()) / ud;
}
const Rt = Am();
(() => {
  const { performance: e } = ee;
  if (!e || !e.now)
    return;
  const t = 3600 * 1e3, n = e.now(), r = Date.now(), s = e.timeOrigin ? Math.abs(e.timeOrigin + n - r) : t, o = s < t, i = e.timing && e.timing.navigationStart, c = typeof i == "number" ? Math.abs(i + n - r) : t, u = c < t;
  return o || u ? s <= c ? e.timeOrigin : i : r;
})();
function Qe() {
  const e = ee, t = e.crypto || e.msCrypto;
  let n = () => Math.random() * 16;
  try {
    if (t && t.randomUUID)
      return t.randomUUID().replace(/-/g, "");
    t && t.getRandomValues && (n = () => {
      const r = new Uint8Array(1);
      return t.getRandomValues(r), r[0];
    });
  } catch {
  }
  return ("10000000100040008000" + 1e11).replace(
    /[018]/g,
    (r) => (
      // eslint-disable-next-line no-bitwise
      (r ^ (n() & 15) >> r / 4).toString(16)
    )
  );
}
function ld(e) {
  return e.exception && e.exception.values ? e.exception.values[0] : void 0;
}
function Wt(e) {
  const { message: t, event_id: n } = e;
  if (t)
    return t;
  const r = ld(e);
  return r ? r.type && r.value ? `${r.type}: ${r.value}` : r.type || r.value || n || "<unknown>" : n || "<unknown>";
}
function $i(e, t, n) {
  const r = e.exception = e.exception || {}, s = r.values = r.values || [], o = s[0] = s[0] || {};
  o.value || (o.value = t || ""), o.type || (o.type = "Error");
}
function dr(e, t) {
  const n = ld(e);
  if (!n)
    return;
  const r = { type: "generic", handled: !0 }, s = n.mechanism;
  if (n.mechanism = { ...r, ...s, ...t }, t && "data" in t) {
    const o = { ...s && s.data, ...t.data };
    n.mechanism.data = o;
  }
}
function $c(e) {
  if (Rm(e))
    return !0;
  try {
    Cn(e, "__sentry_captured__", !0);
  } catch {
  }
  return !1;
}
function Rm(e) {
  try {
    return e.__sentry_captured__;
  } catch {
  }
}
var vt;
(function(e) {
  e[e.PENDING = 0] = "PENDING";
  const n = 1;
  e[e.RESOLVED = n] = "RESOLVED";
  const r = 2;
  e[e.REJECTED = r] = "REJECTED";
})(vt || (vt = {}));
function An(e) {
  return new qe((t) => {
    t(e);
  });
}
function so(e) {
  return new qe((t, n) => {
    n(e);
  });
}
class qe {
  constructor(t) {
    qe.prototype.__init.call(this), qe.prototype.__init2.call(this), qe.prototype.__init3.call(this), qe.prototype.__init4.call(this), this._state = vt.PENDING, this._handlers = [];
    try {
      t(this._resolve, this._reject);
    } catch (n) {
      this._reject(n);
    }
  }
  /** JSDoc */
  then(t, n) {
    return new qe((r, s) => {
      this._handlers.push([
        !1,
        (o) => {
          if (!t)
            r(o);
          else
            try {
              r(t(o));
            } catch (i) {
              s(i);
            }
        },
        (o) => {
          if (!n)
            s(o);
          else
            try {
              r(n(o));
            } catch (i) {
              s(i);
            }
        }
      ]), this._executeHandlers();
    });
  }
  /** JSDoc */
  catch(t) {
    return this.then((n) => n, t);
  }
  /** JSDoc */
  finally(t) {
    return new qe((n, r) => {
      let s, o;
      return this.then(
        (i) => {
          o = !1, s = i, t && t();
        },
        (i) => {
          o = !0, s = i, t && t();
        }
      ).then(() => {
        if (o) {
          r(s);
          return;
        }
        n(s);
      });
    });
  }
  /** JSDoc */
  __init() {
    this._resolve = (t) => {
      this._setResult(vt.RESOLVED, t);
    };
  }
  /** JSDoc */
  __init2() {
    this._reject = (t) => {
      this._setResult(vt.REJECTED, t);
    };
  }
  /** JSDoc */
  __init3() {
    this._setResult = (t, n) => {
      if (this._state === vt.PENDING) {
        if (Ao(n)) {
          n.then(this._resolve, this._reject);
          return;
        }
        this._state = t, this._value = n, this._executeHandlers();
      }
    };
  }
  /** JSDoc */
  __init4() {
    this._executeHandlers = () => {
      if (this._state === vt.PENDING)
        return;
      const t = this._handlers.slice();
      this._handlers = [], t.forEach((n) => {
        n[0] || (this._state === vt.RESOLVED && n[1](this._value), this._state === vt.REJECTED && n[2](this._value), n[0] = !0);
      });
    };
  }
}
function xm(e) {
  const t = Rt(), n = {
    sid: Qe(),
    init: !0,
    timestamp: t,
    started: t,
    duration: 0,
    status: "ok",
    errors: 0,
    ignoreDuration: !1,
    toJSON: () => Lm(n)
  };
  return e && fr(n, e), n;
}
function fr(e, t = {}) {
  if (t.user && (!e.ipAddress && t.user.ip_address && (e.ipAddress = t.user.ip_address), !e.did && !t.did && (e.did = t.user.id || t.user.email || t.user.username)), e.timestamp = t.timestamp || Rt(), t.abnormal_mechanism && (e.abnormal_mechanism = t.abnormal_mechanism), t.ignoreDuration && (e.ignoreDuration = t.ignoreDuration), t.sid && (e.sid = t.sid.length === 32 ? t.sid : Qe()), t.init !== void 0 && (e.init = t.init), !e.did && t.did && (e.did = `${t.did}`), typeof t.started == "number" && (e.started = t.started), e.ignoreDuration)
    e.duration = void 0;
  else if (typeof t.duration == "number")
    e.duration = t.duration;
  else {
    const n = e.timestamp - e.started;
    e.duration = n >= 0 ? n : 0;
  }
  t.release && (e.release = t.release), t.environment && (e.environment = t.environment), !e.ipAddress && t.ipAddress && (e.ipAddress = t.ipAddress), !e.userAgent && t.userAgent && (e.userAgent = t.userAgent), typeof t.errors == "number" && (e.errors = t.errors), t.status && (e.status = t.status);
}
function Om(e, t) {
  let n = {};
  e.status === "ok" && (n = { status: "exited" }), fr(e, n);
}
function Lm(e) {
  return Ye({
    sid: `${e.sid}`,
    init: e.init,
    // Make sure that sec is converted to ms for date constructor
    started: new Date(e.started * 1e3).toISOString(),
    timestamp: new Date(e.timestamp * 1e3).toISOString(),
    status: e.status,
    errors: e.errors,
    did: typeof e.did == "number" || typeof e.did == "string" ? `${e.did}` : void 0,
    duration: e.duration,
    abnormal_mechanism: e.abnormal_mechanism,
    attrs: {
      release: e.release,
      environment: e.environment,
      ip_address: e.ipAddress,
      user_agent: e.userAgent
    }
  });
}
function Bc() {
  return Qe();
}
function Bi() {
  return Qe().substring(16);
}
function xo(e, t, n = 2) {
  if (!t || typeof t != "object" || n <= 0)
    return t;
  if (e && t && Object.keys(t).length === 0)
    return e;
  const r = { ...e };
  for (const s in t)
    Object.prototype.hasOwnProperty.call(t, s) && (r[s] = xo(r[s], t[s], n - 1));
  return r;
}
const Vi = "_sentrySpan";
function Vc(e, t) {
  t ? Cn(e, Vi, t) : delete e[Vi];
}
function Wc(e) {
  return e[Vi];
}
const Nm = 100;
class Fa {
  /** Flag if notifying is happening. */
  /** Callback for client to receive scope changes. */
  /** Callback list that will be called during event processing. */
  /** Array of breadcrumbs. */
  /** User */
  /** Tags */
  /** Extra */
  /** Contexts */
  /** Attachments */
  /** Propagation Context for distributed tracing */
  /**
   * A place to stash data which is needed at some point in the SDK's event processing pipeline but which shouldn't get
   * sent to Sentry
   */
  /** Fingerprint */
  /** Severity */
  /**
   * Transaction Name
   *
   * IMPORTANT: The transaction name on the scope has nothing to do with root spans/transaction objects.
   * It's purpose is to assign a transaction to the scope that's added to non-transaction events.
   */
  /** Session */
  /** Request Mode Session Status */
  // eslint-disable-next-line deprecation/deprecation
  /** The client on this scope */
  /** Contains the last event id of a captured event.  */
  // NOTE: Any field which gets added here should get added not only to the constructor but also to the `clone` method.
  constructor() {
    this._notifyingListeners = !1, this._scopeListeners = [], this._eventProcessors = [], this._breadcrumbs = [], this._attachments = [], this._user = {}, this._tags = {}, this._extra = {}, this._contexts = {}, this._sdkProcessingMetadata = {}, this._propagationContext = {
      traceId: Bc(),
      spanId: Bi()
    };
  }
  /**
   * @inheritDoc
   */
  clone() {
    const t = new Fa();
    return t._breadcrumbs = [...this._breadcrumbs], t._tags = { ...this._tags }, t._extra = { ...this._extra }, t._contexts = { ...this._contexts }, this._contexts.flags && (t._contexts.flags = {
      values: [...this._contexts.flags.values]
    }), t._user = this._user, t._level = this._level, t._session = this._session, t._transactionName = this._transactionName, t._fingerprint = this._fingerprint, t._eventProcessors = [...this._eventProcessors], t._requestSession = this._requestSession, t._attachments = [...this._attachments], t._sdkProcessingMetadata = { ...this._sdkProcessingMetadata }, t._propagationContext = { ...this._propagationContext }, t._client = this._client, t._lastEventId = this._lastEventId, Vc(t, Wc(this)), t;
  }
  /**
   * @inheritDoc
   */
  setClient(t) {
    this._client = t;
  }
  /**
   * @inheritDoc
   */
  setLastEventId(t) {
    this._lastEventId = t;
  }
  /**
   * @inheritDoc
   */
  getClient() {
    return this._client;
  }
  /**
   * @inheritDoc
   */
  lastEventId() {
    return this._lastEventId;
  }
  /**
   * @inheritDoc
   */
  addScopeListener(t) {
    this._scopeListeners.push(t);
  }
  /**
   * @inheritDoc
   */
  addEventProcessor(t) {
    return this._eventProcessors.push(t), this;
  }
  /**
   * @inheritDoc
   */
  setUser(t) {
    return this._user = t || {
      email: void 0,
      id: void 0,
      ip_address: void 0,
      username: void 0
    }, this._session && fr(this._session, { user: t }), this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  getUser() {
    return this._user;
  }
  /**
   * @inheritDoc
   */
  // eslint-disable-next-line deprecation/deprecation
  getRequestSession() {
    return this._requestSession;
  }
  /**
   * @inheritDoc
   */
  // eslint-disable-next-line deprecation/deprecation
  setRequestSession(t) {
    return this._requestSession = t, this;
  }
  /**
   * @inheritDoc
   */
  setTags(t) {
    return this._tags = {
      ...this._tags,
      ...t
    }, this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  setTag(t, n) {
    return this._tags = { ...this._tags, [t]: n }, this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  setExtras(t) {
    return this._extra = {
      ...this._extra,
      ...t
    }, this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  setExtra(t, n) {
    return this._extra = { ...this._extra, [t]: n }, this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  setFingerprint(t) {
    return this._fingerprint = t, this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  setLevel(t) {
    return this._level = t, this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  setTransactionName(t) {
    return this._transactionName = t, this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  setContext(t, n) {
    return n === null ? delete this._contexts[t] : this._contexts[t] = n, this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  setSession(t) {
    return t ? this._session = t : delete this._session, this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  getSession() {
    return this._session;
  }
  /**
   * @inheritDoc
   */
  update(t) {
    if (!t)
      return this;
    const n = typeof t == "function" ? t(this) : t, [r, s] = n instanceof Qt ? (
      // eslint-disable-next-line deprecation/deprecation
      [n.getScopeData(), n.getRequestSession()]
    ) : lr(n) ? [t, t.requestSession] : [], { tags: o, extra: i, user: a, contexts: c, level: u, fingerprint: d = [], propagationContext: l } = r || {};
    return this._tags = { ...this._tags, ...o }, this._extra = { ...this._extra, ...i }, this._contexts = { ...this._contexts, ...c }, a && Object.keys(a).length && (this._user = a), u && (this._level = u), d.length && (this._fingerprint = d), l && (this._propagationContext = l), s && (this._requestSession = s), this;
  }
  /**
   * @inheritDoc
   */
  clear() {
    return this._breadcrumbs = [], this._tags = {}, this._extra = {}, this._user = {}, this._contexts = {}, this._level = void 0, this._transactionName = void 0, this._fingerprint = void 0, this._requestSession = void 0, this._session = void 0, Vc(this, void 0), this._attachments = [], this.setPropagationContext({ traceId: Bc() }), this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  addBreadcrumb(t, n) {
    const r = typeof n == "number" ? n : Nm;
    if (r <= 0)
      return this;
    const s = {
      timestamp: is(),
      ...t
    }, o = this._breadcrumbs;
    return o.push(s), this._breadcrumbs = o.length > r ? o.slice(-r) : o, this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  getLastBreadcrumb() {
    return this._breadcrumbs[this._breadcrumbs.length - 1];
  }
  /**
   * @inheritDoc
   */
  clearBreadcrumbs() {
    return this._breadcrumbs = [], this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  addAttachment(t) {
    return this._attachments.push(t), this;
  }
  /**
   * @inheritDoc
   */
  clearAttachments() {
    return this._attachments = [], this;
  }
  /** @inheritDoc */
  getScopeData() {
    return {
      breadcrumbs: this._breadcrumbs,
      attachments: this._attachments,
      contexts: this._contexts,
      tags: this._tags,
      extra: this._extra,
      user: this._user,
      level: this._level,
      fingerprint: this._fingerprint || [],
      eventProcessors: this._eventProcessors,
      propagationContext: this._propagationContext,
      sdkProcessingMetadata: this._sdkProcessingMetadata,
      transactionName: this._transactionName,
      span: Wc(this)
    };
  }
  /**
   * @inheritDoc
   */
  setSDKProcessingMetadata(t) {
    return this._sdkProcessingMetadata = xo(this._sdkProcessingMetadata, t, 2), this;
  }
  /**
   * @inheritDoc
   */
  setPropagationContext(t) {
    return this._propagationContext = {
      // eslint-disable-next-line deprecation/deprecation
      spanId: Bi(),
      ...t
    }, this;
  }
  /**
   * @inheritDoc
   */
  getPropagationContext() {
    return this._propagationContext;
  }
  /**
   * @inheritDoc
   */
  captureException(t, n) {
    const r = n && n.event_id ? n.event_id : Qe();
    if (!this._client)
      return B.warn("No client configured on scope - will not capture exception!"), r;
    const s = new Error("Sentry syntheticException");
    return this._client.captureException(
      t,
      {
        originalException: t,
        syntheticException: s,
        ...n,
        event_id: r
      },
      this
    ), r;
  }
  /**
   * @inheritDoc
   */
  captureMessage(t, n, r) {
    const s = r && r.event_id ? r.event_id : Qe();
    if (!this._client)
      return B.warn("No client configured on scope - will not capture message!"), s;
    const o = new Error(t);
    return this._client.captureMessage(
      t,
      n,
      {
        originalException: t,
        syntheticException: o,
        ...r,
        event_id: s
      },
      this
    ), s;
  }
  /**
   * @inheritDoc
   */
  captureEvent(t, n) {
    const r = n && n.event_id ? n.event_id : Qe();
    return this._client ? (this._client.captureEvent(t, { ...n, event_id: r }, this), r) : (B.warn("No client configured on scope - will not capture event!"), r);
  }
  /**
   * This will be called on every set call.
   */
  _notifyScopeListeners() {
    this._notifyingListeners || (this._notifyingListeners = !0, this._scopeListeners.forEach((t) => {
      t(this);
    }), this._notifyingListeners = !1);
  }
}
const Qt = Fa;
function Mm() {
  return Io("defaultCurrentScope", () => new Qt());
}
function Pm() {
  return Io("defaultIsolationScope", () => new Qt());
}
class Dm {
  constructor(t, n) {
    let r;
    t ? r = t : r = new Qt();
    let s;
    n ? s = n : s = new Qt(), this._stack = [{ scope: r }], this._isolationScope = s;
  }
  /**
   * Fork a scope for the stack.
   */
  withScope(t) {
    const n = this._pushScope();
    let r;
    try {
      r = t(n);
    } catch (s) {
      throw this._popScope(), s;
    }
    return Ao(r) ? r.then(
      (s) => (this._popScope(), s),
      (s) => {
        throw this._popScope(), s;
      }
    ) : (this._popScope(), r);
  }
  /**
   * Get the client of the stack.
   */
  getClient() {
    return this.getStackTop().client;
  }
  /**
   * Returns the scope of the top stack.
   */
  getScope() {
    return this.getStackTop().scope;
  }
  /**
   * Get the isolation scope for the stack.
   */
  getIsolationScope() {
    return this._isolationScope;
  }
  /**
   * Returns the topmost scope layer in the order domain > local > process.
   */
  getStackTop() {
    return this._stack[this._stack.length - 1];
  }
  /**
   * Push a scope to the stack.
   */
  _pushScope() {
    const t = this.getScope().clone();
    return this._stack.push({
      client: this.getClient(),
      scope: t
    }), t;
  }
  /**
   * Pop a scope from the stack.
   */
  _popScope() {
    return this._stack.length <= 1 ? !1 : !!this._stack.pop();
  }
}
function pr() {
  const e = ko(), t = La(e);
  return t.stack = t.stack || new Dm(Mm(), Pm());
}
function Um(e) {
  return pr().withScope(e);
}
function Fm(e, t) {
  const n = pr();
  return n.withScope(() => (n.getStackTop().scope = e, t(e)));
}
function Hc(e) {
  return pr().withScope(() => e(pr().getIsolationScope()));
}
function $m() {
  return {
    withIsolationScope: Hc,
    withScope: Um,
    withSetScope: Fm,
    withSetIsolationScope: (e, t) => Hc(t),
    getCurrentScope: () => pr().getScope(),
    getIsolationScope: () => pr().getIsolationScope()
  };
}
function $a(e) {
  const t = La(e);
  return t.acs ? t.acs : $m();
}
function Pt() {
  const e = ko();
  return $a(e).getCurrentScope();
}
function as() {
  const e = ko();
  return $a(e).getIsolationScope();
}
function Bm() {
  return Io("globalScope", () => new Qt());
}
function Vm(...e) {
  const t = ko(), n = $a(t);
  if (e.length === 2) {
    const [r, s] = e;
    return r ? n.withSetScope(r, s) : n.withScope(s);
  }
  return n.withScope(e[0]);
}
function xe() {
  return Pt().getClient();
}
function Wm(e) {
  const t = e.getPropagationContext(), { traceId: n, spanId: r, parentSpanId: s } = t;
  return Ye({
    trace_id: n,
    span_id: r,
    parent_span_id: s
  });
}
const Hm = "_sentryMetrics";
function Gm(e) {
  const t = e[Hm];
  if (!t)
    return;
  const n = {};
  for (const [, [r, s]] of t)
    (n[r] || (n[r] = [])).push(Ye(s));
  return n;
}
const zm = "sentry.source", Km = "sentry.sample_rate", jm = "sentry.op", qm = "sentry.origin", Xm = 0, Ym = 1, Jm = "sentry-", Qm = /^sentry-/;
function Zm(e) {
  const t = eg(e);
  if (!t)
    return;
  const n = Object.entries(t).reduce((r, [s, o]) => {
    if (s.match(Qm)) {
      const i = s.slice(Jm.length);
      r[i] = o;
    }
    return r;
  }, {});
  if (Object.keys(n).length > 0)
    return n;
}
function eg(e) {
  if (!(!e || !At(e) && !Array.isArray(e)))
    return Array.isArray(e) ? e.reduce((t, n) => {
      const r = Gc(n);
      return Object.entries(r).forEach(([s, o]) => {
        t[s] = o;
      }), t;
    }, {}) : Gc(e);
}
function Gc(e) {
  return e.split(",").map((t) => t.split("=").map((n) => decodeURIComponent(n.trim()))).reduce((t, [n, r]) => (n && r && (t[n] = r), t), {});
}
const tg = 1;
let zc = !1;
function ng(e) {
  const { spanId: t, traceId: n, isRemote: r } = e.spanContext(), s = r ? t : Ba(e).parent_span_id, o = r ? Bi() : t;
  return Ye({
    parent_span_id: s,
    span_id: o,
    trace_id: n
  });
}
function Kc(e) {
  return typeof e == "number" ? jc(e) : Array.isArray(e) ? e[0] + e[1] / 1e9 : e instanceof Date ? jc(e.getTime()) : Rt();
}
function jc(e) {
  return e > 9999999999 ? e / 1e3 : e;
}
function Ba(e) {
  if (sg(e))
    return e.getSpanJSON();
  try {
    const { spanId: t, traceId: n } = e.spanContext();
    if (rg(e)) {
      const { attributes: r, startTime: s, name: o, endTime: i, parentSpanId: a, status: c } = e;
      return Ye({
        span_id: t,
        trace_id: n,
        data: r,
        description: o,
        parent_span_id: a,
        start_timestamp: Kc(s),
        // This is [0,0] by default in OTEL, in which case we want to interpret this as no end time
        timestamp: Kc(i) || void 0,
        status: ig(c),
        op: r[jm],
        origin: r[qm],
        _metrics_summary: Gm(e)
      });
    }
    return {
      span_id: t,
      trace_id: n
    };
  } catch {
    return {};
  }
}
function rg(e) {
  const t = e;
  return !!t.attributes && !!t.startTime && !!t.name && !!t.endTime && !!t.status;
}
function sg(e) {
  return typeof e.getSpanJSON == "function";
}
function og(e) {
  const { traceFlags: t } = e.spanContext();
  return t === tg;
}
function ig(e) {
  if (!(!e || e.code === Xm))
    return e.code === Ym ? "ok" : e.message || "unknown_error";
}
const ag = "_sentryRootSpan";
function dd(e) {
  return e[ag] || e;
}
function cg() {
  zc || (Un(() => {
    console.warn(
      "[Sentry] Deprecation warning: Returning null from `beforeSendSpan` will be disallowed from SDK version 9.0.0 onwards. The callback will only support mutating spans. To drop certain spans, configure the respective integrations directly."
    );
  }), zc = !0);
}
function ug(e) {
  if (typeof __SENTRY_TRACING__ == "boolean" && !__SENTRY_TRACING__)
    return !1;
  const t = xe(), n = t && t.getOptions();
  return !!n && (n.enableTracing || "tracesSampleRate" in n || "tracesSampler" in n);
}
const Va = "production", lg = "_frozenDsc";
function fd(e, t) {
  const n = t.getOptions(), { publicKey: r } = t.getDsn() || {}, s = Ye({
    environment: n.environment || Va,
    release: n.release,
    public_key: r,
    trace_id: e
  });
  return t.emit("createDsc", s), s;
}
function dg(e, t) {
  const n = t.getPropagationContext();
  return n.dsc || fd(n.traceId, e);
}
function fg(e) {
  const t = xe();
  if (!t)
    return {};
  const n = dd(e), r = n[lg];
  if (r)
    return r;
  const s = n.spanContext().traceState, o = s && s.get("sentry.dsc"), i = o && Zm(o);
  if (i)
    return i;
  const a = fd(e.spanContext().traceId, t), c = Ba(n), u = c.data || {}, d = u[Km];
  d != null && (a.sample_rate = `${d}`);
  const l = u[zm], f = c.description;
  return l !== "url" && f && (a.transaction = f), ug() && (a.sampled = String(og(n))), t.emit("createDsc", a, n), a;
}
function pg(e) {
  if (typeof e == "boolean")
    return Number(e);
  const t = typeof e == "string" ? parseFloat(e) : e;
  if (typeof t != "number" || isNaN(t) || t < 0 || t > 1) {
    ie && B.warn(
      `[Tracing] Given sample rate is invalid. Sample rate must be a boolean or a number between 0 and 1. Got ${JSON.stringify(
        e
      )} of type ${JSON.stringify(typeof e)}.`
    );
    return;
  }
  return t;
}
const hg = /^(?:(\w+):)\/\/(?:(\w+)(?::(\w+)?)?@)([\w.-]+)(?::(\d+))?\/(.+)/;
function mg(e) {
  return e === "http" || e === "https";
}
function Oo(e, t = !1) {
  const { host: n, path: r, pass: s, port: o, projectId: i, protocol: a, publicKey: c } = e;
  return `${a}://${c}${t && s ? `:${s}` : ""}@${n}${o ? `:${o}` : ""}/${r && `${r}/`}${i}`;
}
function gg(e) {
  const t = hg.exec(e);
  if (!t) {
    Un(() => {
      console.error(`Invalid Sentry Dsn: ${e}`);
    });
    return;
  }
  const [n, r, s = "", o = "", i = "", a = ""] = t.slice(1);
  let c = "", u = a;
  const d = u.split("/");
  if (d.length > 1 && (c = d.slice(0, -1).join("/"), u = d.pop()), u) {
    const l = u.match(/^\d+/);
    l && (u = l[0]);
  }
  return pd({ host: o, pass: s, path: c, projectId: u, port: i, protocol: n, publicKey: r });
}
function pd(e) {
  return {
    protocol: e.protocol,
    publicKey: e.publicKey || "",
    pass: e.pass || "",
    host: e.host,
    port: e.port || "",
    path: e.path || "",
    projectId: e.projectId
  };
}
function yg(e) {
  if (!Dn)
    return !0;
  const { port: t, projectId: n, protocol: r } = e;
  return ["protocol", "publicKey", "host", "projectId"].find((i) => e[i] ? !1 : (B.error(`Invalid Sentry Dsn: ${i} missing`), !0)) ? !1 : n.match(/^\d+$/) ? mg(r) ? t && isNaN(parseInt(t, 10)) ? (B.error(`Invalid Sentry Dsn: Invalid port ${t}`), !1) : !0 : (B.error(`Invalid Sentry Dsn: Invalid protocol ${r}`), !1) : (B.error(`Invalid Sentry Dsn: Invalid projectId ${n}`), !1);
}
function _g(e) {
  const t = typeof e == "string" ? gg(e) : pd(e);
  if (!(!t || !yg(t)))
    return t;
}
function bg() {
  const e = typeof WeakSet == "function", t = e ? /* @__PURE__ */ new WeakSet() : [];
  function n(s) {
    if (e)
      return t.has(s) ? !0 : (t.add(s), !1);
    for (let o = 0; o < t.length; o++)
      if (t[o] === s)
        return !0;
    return t.push(s), !1;
  }
  function r(s) {
    if (e)
      t.delete(s);
    else
      for (let o = 0; o < t.length; o++)
        if (t[o] === s) {
          t.splice(o, 1);
          break;
        }
  }
  return [n, r];
}
function It(e, t = 100, n = 1 / 0) {
  try {
    return Wi("", e, t, n);
  } catch (r) {
    return { ERROR: `**non-serializable** (${r})` };
  }
}
function hd(e, t = 3, n = 100 * 1024) {
  const r = It(e, t);
  return Tg(r) > n ? hd(e, t - 1, n) : r;
}
function Wi(e, t, n = 1 / 0, r = 1 / 0, s = bg()) {
  const [o, i] = s;
  if (t == null || // this matches null and undefined -> eqeq not eqeqeq
  ["boolean", "string"].includes(typeof t) || typeof t == "number" && Number.isFinite(t))
    return t;
  const a = wg(e, t);
  if (!a.startsWith("[object "))
    return a;
  if (t.__sentry_skip_normalization__)
    return t;
  const c = typeof t.__sentry_override_normalization_depth__ == "number" ? t.__sentry_override_normalization_depth__ : n;
  if (c === 0)
    return a.replace("object ", "");
  if (o(t))
    return "[Circular ~]";
  const u = t;
  if (u && typeof u.toJSON == "function")
    try {
      const p = u.toJSON();
      return Wi("", p, c - 1, r, s);
    } catch {
    }
  const d = Array.isArray(t) ? [] : {};
  let l = 0;
  const f = cd(t);
  for (const p in f) {
    if (!Object.prototype.hasOwnProperty.call(f, p))
      continue;
    if (l >= r) {
      d[p] = "[MaxProperties ~]";
      break;
    }
    const h = f[p];
    d[p] = Wi(p, h, c - 1, r, s), l++;
  }
  return i(t), d;
}
function wg(e, t) {
  try {
    if (e === "domain" && t && typeof t == "object" && t._events)
      return "[Domain]";
    if (e === "domainEmitter")
      return "[DomainEmitter]";
    if (typeof global < "u" && t === global)
      return "[Global]";
    if (typeof window < "u" && t === window)
      return "[Window]";
    if (typeof document < "u" && t === document)
      return "[Document]";
    if (od(t))
      return "[VueViewModel]";
    if (wm(t))
      return "[SyntheticEvent]";
    if (typeof t == "number" && !Number.isFinite(t))
      return `[${t}]`;
    if (typeof t == "function")
      return `[Function: ${Jt(t)}]`;
    if (typeof t == "symbol")
      return `[${String(t)}]`;
    if (typeof t == "bigint")
      return `[BigInt: ${String(t)}]`;
    const n = Eg(t);
    return /^HTML(\w*)Element$/.test(n) ? `[HTMLElement: ${n}]` : `[object ${n}]`;
  } catch (n) {
    return `**non-serializable** (${n})`;
  }
}
function Eg(e) {
  const t = Object.getPrototypeOf(e);
  return t ? t.constructor.name : "null prototype";
}
function Sg(e) {
  return ~-encodeURI(e).split(/%..|./).length;
}
function Tg(e) {
  return Sg(JSON.stringify(e));
}
function cs(e, t = []) {
  return [e, t];
}
function vg(e, t) {
  const [n, r] = e;
  return [n, [...r, t]];
}
function qc(e, t) {
  const n = e[1];
  for (const r of n) {
    const s = r[0].type;
    if (t(r, s))
      return !0;
  }
  return !1;
}
function Hi(e) {
  return ee.__SENTRY__ && ee.__SENTRY__.encodePolyfill ? ee.__SENTRY__.encodePolyfill(e) : new TextEncoder().encode(e);
}
function Ig(e) {
  const [t, n] = e;
  let r = JSON.stringify(t);
  function s(o) {
    typeof r == "string" ? r = typeof o == "string" ? r + o : [Hi(r), o] : r.push(typeof o == "string" ? Hi(o) : o);
  }
  for (const o of n) {
    const [i, a] = o;
    if (s(`
${JSON.stringify(i)}
`), typeof a == "string" || a instanceof Uint8Array)
      s(a);
    else {
      let c;
      try {
        c = JSON.stringify(a);
      } catch {
        c = JSON.stringify(It(a));
      }
      s(c);
    }
  }
  return typeof r == "string" ? r : kg(r);
}
function kg(e) {
  const t = e.reduce((s, o) => s + o.length, 0), n = new Uint8Array(t);
  let r = 0;
  for (const s of e)
    n.set(s, r), r += s.length;
  return n;
}
function Cg(e) {
  const t = typeof e.data == "string" ? Hi(e.data) : e.data;
  return [
    Ye({
      type: "attachment",
      length: t.length,
      filename: e.filename,
      content_type: e.contentType,
      attachment_type: e.attachmentType
    }),
    t
  ];
}
const Ag = {
  session: "session",
  sessions: "session",
  attachment: "attachment",
  transaction: "transaction",
  event: "error",
  client_report: "internal",
  user_report: "default",
  profile: "profile",
  profile_chunk: "profile",
  replay_event: "replay",
  replay_recording: "replay",
  check_in: "monitor",
  feedback: "feedback",
  span: "span",
  statsd: "metric_bucket",
  raw_security: "security"
};
function Xc(e) {
  return Ag[e];
}
function md(e) {
  if (!e || !e.sdk)
    return;
  const { name: t, version: n } = e.sdk;
  return { name: t, version: n };
}
function Rg(e, t, n, r) {
  const s = e.sdkProcessingMetadata && e.sdkProcessingMetadata.dynamicSamplingContext;
  return {
    event_id: e.event_id,
    sent_at: (/* @__PURE__ */ new Date()).toISOString(),
    ...t && { sdk: t },
    ...!!n && r && { dsn: Oo(r) },
    ...s && {
      trace: Ye({ ...s })
    }
  };
}
function xg(e, t) {
  return t && (e.sdk = e.sdk || {}, e.sdk.name = e.sdk.name || t.name, e.sdk.version = e.sdk.version || t.version, e.sdk.integrations = [...e.sdk.integrations || [], ...t.integrations || []], e.sdk.packages = [...e.sdk.packages || [], ...t.packages || []]), e;
}
function Og(e, t, n, r) {
  const s = md(n), o = {
    sent_at: (/* @__PURE__ */ new Date()).toISOString(),
    ...s && { sdk: s },
    ...!!r && t && { dsn: Oo(t) }
  }, i = "aggregates" in e ? [{ type: "sessions" }, e] : [{ type: "session" }, e.toJSON()];
  return cs(o, [i]);
}
function Lg(e, t, n, r) {
  const s = md(n), o = e.type && e.type !== "replay_event" ? e.type : "event";
  xg(e, n && n.sdk);
  const i = Rg(e, s, r, t);
  return delete e.sdkProcessingMetadata, cs(i, [[{ type: o }, e]]);
}
function Gi(e, t, n, r = 0) {
  return new qe((s, o) => {
    const i = e[r];
    if (t === null || typeof i != "function")
      s(t);
    else {
      const a = i({ ...t }, n);
      ie && i.id && a === null && B.log(`Event processor "${i.id}" dropped event`), Ao(a) ? a.then((c) => Gi(e, c, n, r + 1).then(s)).then(null, o) : Gi(e, a, n, r + 1).then(s).then(null, o);
    }
  });
}
let vs, Yc, Is;
function Ng(e) {
  const t = ee._sentryDebugIds;
  if (!t)
    return {};
  const n = Object.keys(t);
  return Is && n.length === Yc || (Yc = n.length, Is = n.reduce((r, s) => {
    vs || (vs = {});
    const o = vs[s];
    if (o)
      r[o[0]] = o[1];
    else {
      const i = e(s);
      for (let a = i.length - 1; a >= 0; a--) {
        const c = i[a], u = c && c.filename, d = t[s];
        if (u && d) {
          r[u] = d, vs[s] = [u, d];
          break;
        }
      }
    }
    return r;
  }, {})), Is;
}
function Mg(e, t) {
  const { fingerprint: n, span: r, breadcrumbs: s, sdkProcessingMetadata: o } = t;
  Pg(e, t), r && Fg(e, r), $g(e, n), Dg(e, s), Ug(e, o);
}
function Jc(e, t) {
  const {
    extra: n,
    tags: r,
    user: s,
    contexts: o,
    level: i,
    sdkProcessingMetadata: a,
    breadcrumbs: c,
    fingerprint: u,
    eventProcessors: d,
    attachments: l,
    propagationContext: f,
    transactionName: p,
    span: h
  } = t;
  ks(e, "extra", n), ks(e, "tags", r), ks(e, "user", s), ks(e, "contexts", o), e.sdkProcessingMetadata = xo(e.sdkProcessingMetadata, a, 2), i && (e.level = i), p && (e.transactionName = p), h && (e.span = h), c.length && (e.breadcrumbs = [...e.breadcrumbs, ...c]), u.length && (e.fingerprint = [...e.fingerprint, ...u]), d.length && (e.eventProcessors = [...e.eventProcessors, ...d]), l.length && (e.attachments = [...e.attachments, ...l]), e.propagationContext = { ...e.propagationContext, ...f };
}
function ks(e, t, n) {
  e[t] = xo(e[t], n, 1);
}
function Pg(e, t) {
  const { extra: n, tags: r, user: s, contexts: o, level: i, transactionName: a } = t, c = Ye(n);
  c && Object.keys(c).length && (e.extra = { ...c, ...e.extra });
  const u = Ye(r);
  u && Object.keys(u).length && (e.tags = { ...u, ...e.tags });
  const d = Ye(s);
  d && Object.keys(d).length && (e.user = { ...d, ...e.user });
  const l = Ye(o);
  l && Object.keys(l).length && (e.contexts = { ...l, ...e.contexts }), i && (e.level = i), a && e.type !== "transaction" && (e.transaction = a);
}
function Dg(e, t) {
  const n = [...e.breadcrumbs || [], ...t];
  e.breadcrumbs = n.length ? n : void 0;
}
function Ug(e, t) {
  e.sdkProcessingMetadata = {
    ...e.sdkProcessingMetadata,
    ...t
  };
}
function Fg(e, t) {
  e.contexts = {
    trace: ng(t),
    ...e.contexts
  }, e.sdkProcessingMetadata = {
    dynamicSamplingContext: fg(t),
    ...e.sdkProcessingMetadata
  };
  const n = dd(t), r = Ba(n).description;
  r && !e.transaction && e.type === "transaction" && (e.transaction = r);
}
function $g(e, t) {
  e.fingerprint = e.fingerprint ? Array.isArray(e.fingerprint) ? e.fingerprint : [e.fingerprint] : [], t && (e.fingerprint = e.fingerprint.concat(t)), e.fingerprint && !e.fingerprint.length && delete e.fingerprint;
}
function Bg(e, t, n, r, s, o) {
  const { normalizeDepth: i = 3, normalizeMaxBreadth: a = 1e3 } = e, c = {
    ...t,
    event_id: t.event_id || n.event_id || Qe(),
    timestamp: t.timestamp || is()
  }, u = n.integrations || e.integrations.map((g) => g.name);
  Vg(c, e), Gg(c, u), s && s.emit("applyFrameMetadata", t), t.type === void 0 && Wg(c, e.stackParser);
  const d = Kg(r, n.captureContext);
  n.mechanism && dr(c, n.mechanism);
  const l = s ? s.getEventProcessors() : [], f = Bm().getScopeData();
  if (o) {
    const g = o.getScopeData();
    Jc(f, g);
  }
  if (d) {
    const g = d.getScopeData();
    Jc(f, g);
  }
  const p = [...n.attachments || [], ...f.attachments];
  p.length && (n.attachments = p), Mg(c, f);
  const h = [
    ...l,
    // Run scope event processors _after_ all other processors
    ...f.eventProcessors
  ];
  return Gi(h, c, n).then((g) => (g && Hg(g), typeof i == "number" && i > 0 ? zg(g, i, a) : g));
}
function Vg(e, t) {
  const { environment: n, release: r, dist: s, maxValueLength: o = 250 } = t;
  e.environment = e.environment || n || Va, !e.release && r && (e.release = r), !e.dist && s && (e.dist = s), e.message && (e.message = or(e.message, o));
  const i = e.exception && e.exception.values && e.exception.values[0];
  i && i.value && (i.value = or(i.value, o));
  const a = e.request;
  a && a.url && (a.url = or(a.url, o));
}
function Wg(e, t) {
  const n = Ng(t);
  try {
    e.exception.values.forEach((r) => {
      r.stacktrace.frames.forEach((s) => {
        n && s.filename && (s.debug_id = n[s.filename]);
      });
    });
  } catch {
  }
}
function Hg(e) {
  const t = {};
  try {
    e.exception.values.forEach((r) => {
      r.stacktrace.frames.forEach((s) => {
        s.debug_id && (s.abs_path ? t[s.abs_path] = s.debug_id : s.filename && (t[s.filename] = s.debug_id), delete s.debug_id);
      });
    });
  } catch {
  }
  if (Object.keys(t).length === 0)
    return;
  e.debug_meta = e.debug_meta || {}, e.debug_meta.images = e.debug_meta.images || [];
  const n = e.debug_meta.images;
  Object.entries(t).forEach(([r, s]) => {
    n.push({
      type: "sourcemap",
      code_file: r,
      debug_id: s
    });
  });
}
function Gg(e, t) {
  t.length > 0 && (e.sdk = e.sdk || {}, e.sdk.integrations = [...e.sdk.integrations || [], ...t]);
}
function zg(e, t, n) {
  if (!e)
    return null;
  const r = {
    ...e,
    ...e.breadcrumbs && {
      breadcrumbs: e.breadcrumbs.map((s) => ({
        ...s,
        ...s.data && {
          data: It(s.data, t, n)
        }
      }))
    },
    ...e.user && {
      user: It(e.user, t, n)
    },
    ...e.contexts && {
      contexts: It(e.contexts, t, n)
    },
    ...e.extra && {
      extra: It(e.extra, t, n)
    }
  };
  return e.contexts && e.contexts.trace && r.contexts && (r.contexts.trace = e.contexts.trace, e.contexts.trace.data && (r.contexts.trace.data = It(e.contexts.trace.data, t, n))), e.spans && (r.spans = e.spans.map((s) => ({
    ...s,
    ...s.data && {
      data: It(s.data, t, n)
    }
  }))), e.contexts && e.contexts.flags && r.contexts && (r.contexts.flags = It(e.contexts.flags, 3, n)), r;
}
function Kg(e, t) {
  if (!t)
    return e;
  const n = e ? e.clone() : new Qt();
  return n.update(t), n;
}
function jg(e) {
  if (e)
    return qg(e) ? { captureContext: e } : Yg(e) ? {
      captureContext: e
    } : e;
}
function qg(e) {
  return e instanceof Qt || typeof e == "function";
}
const Xg = [
  "user",
  "level",
  "extra",
  "contexts",
  "tags",
  "fingerprint",
  "requestSession",
  "propagationContext"
];
function Yg(e) {
  return Object.keys(e).some((t) => Xg.includes(t));
}
function gd(e, t) {
  return Pt().captureException(e, jg(t));
}
function yd(e, t) {
  return Pt().captureEvent(e, t);
}
function Qc(e) {
  const t = xe(), n = as(), r = Pt(), { release: s, environment: o = Va } = t && t.getOptions() || {}, { userAgent: i } = ee.navigator || {}, a = xm({
    release: s,
    environment: o,
    user: r.getUser() || n.getUser(),
    ...i && { userAgent: i },
    ...e
  }), c = n.getSession();
  return c && c.status === "ok" && fr(c, { status: "exited" }), _d(), n.setSession(a), r.setSession(a), a;
}
function _d() {
  const e = as(), t = Pt(), n = t.getSession() || e.getSession();
  n && Om(n), bd(), e.setSession(), t.setSession();
}
function bd() {
  const e = as(), t = Pt(), n = xe(), r = t.getSession() || e.getSession();
  r && n && n.captureSession(r);
}
function Zc(e = !1) {
  if (e) {
    _d();
    return;
  }
  bd();
}
const Jg = "7";
function Qg(e) {
  const t = e.protocol ? `${e.protocol}:` : "", n = e.port ? `:${e.port}` : "";
  return `${t}//${e.host}${n}${e.path ? `/${e.path}` : ""}/api/`;
}
function Zg(e) {
  return `${Qg(e)}${e.projectId}/envelope/`;
}
function ey(e, t) {
  const n = {
    sentry_version: Jg
  };
  return e.publicKey && (n.sentry_key = e.publicKey), t && (n.sentry_client = `${t.name}/${t.version}`), new URLSearchParams(n).toString();
}
function ty(e, t, n) {
  return t || `${Zg(e)}?${ey(e, n)}`;
}
const eu = [];
function ny(e) {
  const t = {};
  return e.forEach((n) => {
    const { name: r } = n, s = t[r];
    s && !s.isDefaultInstance && n.isDefaultInstance || (t[r] = n);
  }), Object.values(t);
}
function ry(e) {
  const t = e.defaultIntegrations || [], n = e.integrations;
  t.forEach((i) => {
    i.isDefaultInstance = !0;
  });
  let r;
  if (Array.isArray(n))
    r = [...t, ...n];
  else if (typeof n == "function") {
    const i = n(t);
    r = Array.isArray(i) ? i : [i];
  } else
    r = t;
  const s = ny(r), o = s.findIndex((i) => i.name === "Debug");
  if (o > -1) {
    const [i] = s.splice(o, 1);
    s.push(i);
  }
  return s;
}
function sy(e, t) {
  const n = {};
  return t.forEach((r) => {
    r && wd(e, r, n);
  }), n;
}
function tu(e, t) {
  for (const n of t)
    n && n.afterAllSetup && n.afterAllSetup(e);
}
function wd(e, t, n) {
  if (n[t.name]) {
    ie && B.log(`Integration skipped because it was already installed: ${t.name}`);
    return;
  }
  if (n[t.name] = t, eu.indexOf(t.name) === -1 && typeof t.setupOnce == "function" && (t.setupOnce(), eu.push(t.name)), t.setup && typeof t.setup == "function" && t.setup(e), typeof t.preprocessEvent == "function") {
    const r = t.preprocessEvent.bind(t);
    e.on("preprocessEvent", (s, o) => r(s, o, e));
  }
  if (typeof t.processEvent == "function") {
    const r = t.processEvent.bind(t), s = Object.assign((o, i) => r(o, i, e), {
      id: t.name
    });
    e.addEventProcessor(s);
  }
  ie && B.log(`Integration installed: ${t.name}`);
}
function oy(e, t, n) {
  const r = [
    { type: "client_report" },
    {
      timestamp: is(),
      discarded_events: e
    }
  ];
  return cs(t ? { dsn: t } : {}, [r]);
}
class ht extends Error {
  /** Display name of this error instance. */
  constructor(t, n = "warn") {
    super(t), this.message = t, this.name = new.target.prototype.constructor.name, Object.setPrototypeOf(this, new.target.prototype), this.logLevel = n;
  }
}
const nu = "Not capturing exception because it's already been captured.";
class iy {
  /** Options passed to the SDK. */
  /** The client Dsn, if specified in options. Without this Dsn, the SDK will be disabled. */
  /** Array of set up integrations. */
  /** Number of calls being processed */
  /** Holds flushable  */
  // eslint-disable-next-line @typescript-eslint/ban-types
  /**
   * Initializes this client instance.
   *
   * @param options Options for the client.
   */
  constructor(t) {
    if (this._options = t, this._integrations = {}, this._numProcessing = 0, this._outcomes = {}, this._hooks = {}, this._eventProcessors = [], t.dsn ? this._dsn = _g(t.dsn) : ie && B.warn("No DSN provided, client will not send events."), this._dsn) {
      const s = ty(
        this._dsn,
        t.tunnel,
        t._metadata ? t._metadata.sdk : void 0
      );
      this._transport = t.transport({
        tunnel: this._options.tunnel,
        recordDroppedEvent: this.recordDroppedEvent.bind(this),
        ...t.transportOptions,
        url: s
      });
    }
    const r = ["enableTracing", "tracesSampleRate", "tracesSampler"].find((s) => s in t && t[s] == null);
    r && Un(() => {
      console.warn(
        `[Sentry] Deprecation warning: \`${r}\` is set to undefined, which leads to tracing being enabled. In v9, a value of \`undefined\` will result in tracing being disabled.`
      );
    });
  }
  /**
   * @inheritDoc
   */
  captureException(t, n, r) {
    const s = Qe();
    if ($c(t))
      return ie && B.log(nu), s;
    const o = {
      event_id: s,
      ...n
    };
    return this._process(
      this.eventFromException(t, o).then(
        (i) => this._captureEvent(i, o, r)
      )
    ), o.event_id;
  }
  /**
   * @inheritDoc
   */
  captureMessage(t, n, r, s) {
    const o = {
      event_id: Qe(),
      ...r
    }, i = Ma(t) ? t : String(t), a = Pa(t) ? this.eventFromMessage(i, n, o) : this.eventFromException(t, o);
    return this._process(a.then((c) => this._captureEvent(c, o, s))), o.event_id;
  }
  /**
   * @inheritDoc
   */
  captureEvent(t, n, r) {
    const s = Qe();
    if (n && n.originalException && $c(n.originalException))
      return ie && B.log(nu), s;
    const o = {
      event_id: s,
      ...n
    }, a = (t.sdkProcessingMetadata || {}).capturedSpanScope;
    return this._process(this._captureEvent(t, o, a || r)), o.event_id;
  }
  /**
   * @inheritDoc
   */
  captureSession(t) {
    typeof t.release != "string" ? ie && B.warn("Discarded session because of missing or non-string release") : (this.sendSession(t), fr(t, { init: !1 }));
  }
  /**
   * @inheritDoc
   */
  getDsn() {
    return this._dsn;
  }
  /**
   * @inheritDoc
   */
  getOptions() {
    return this._options;
  }
  /**
   * @see SdkMetadata
   *
   * @return The metadata of the SDK
   */
  getSdkMetadata() {
    return this._options._metadata;
  }
  /**
   * @inheritDoc
   */
  getTransport() {
    return this._transport;
  }
  /**
   * @inheritDoc
   */
  flush(t) {
    const n = this._transport;
    return n ? (this.emit("flush"), this._isClientDoneProcessing(t).then((r) => n.flush(t).then((s) => r && s))) : An(!0);
  }
  /**
   * @inheritDoc
   */
  close(t) {
    return this.flush(t).then((n) => (this.getOptions().enabled = !1, this.emit("close"), n));
  }
  /** Get all installed event processors. */
  getEventProcessors() {
    return this._eventProcessors;
  }
  /** @inheritDoc */
  addEventProcessor(t) {
    this._eventProcessors.push(t);
  }
  /** @inheritdoc */
  init() {
    (this._isEnabled() || // Force integrations to be setup even if no DSN was set when we have
    // Spotlight enabled. This is particularly important for browser as we
    // don't support the `spotlight` option there and rely on the users
    // adding the `spotlightBrowserIntegration()` to their integrations which
    // wouldn't get initialized with the check below when there's no DSN set.
    this._options.integrations.some(({ name: t }) => t.startsWith("Spotlight"))) && this._setupIntegrations();
  }
  /**
   * Gets an installed integration by its name.
   *
   * @returns The installed integration or `undefined` if no integration with that `name` was installed.
   */
  getIntegrationByName(t) {
    return this._integrations[t];
  }
  /**
   * @inheritDoc
   */
  addIntegration(t) {
    const n = this._integrations[t.name];
    wd(this, t, this._integrations), n || tu(this, [t]);
  }
  /**
   * @inheritDoc
   */
  sendEvent(t, n = {}) {
    this.emit("beforeSendEvent", t, n);
    let r = Lg(t, this._dsn, this._options._metadata, this._options.tunnel);
    for (const o of n.attachments || [])
      r = vg(r, Cg(o));
    const s = this.sendEnvelope(r);
    s && s.then((o) => this.emit("afterSendEvent", t, o), null);
  }
  /**
   * @inheritDoc
   */
  sendSession(t) {
    const n = Og(t, this._dsn, this._options._metadata, this._options.tunnel);
    this.sendEnvelope(n);
  }
  /**
   * @inheritDoc
   */
  recordDroppedEvent(t, n, r) {
    if (this._options.sendClientReports) {
      const s = typeof r == "number" ? r : 1, o = `${t}:${n}`;
      ie && B.log(`Recording outcome: "${o}"${s > 1 ? ` (${s} times)` : ""}`), this._outcomes[o] = (this._outcomes[o] || 0) + s;
    }
  }
  // Keep on() & emit() signatures in sync with types' client.ts interface
  /* eslint-disable @typescript-eslint/unified-signatures */
  /** @inheritdoc */
  /** @inheritdoc */
  on(t, n) {
    const r = this._hooks[t] = this._hooks[t] || [];
    return r.push(n), () => {
      const s = r.indexOf(n);
      s > -1 && r.splice(s, 1);
    };
  }
  /** @inheritdoc */
  /** @inheritdoc */
  emit(t, ...n) {
    const r = this._hooks[t];
    r && r.forEach((s) => s(...n));
  }
  /**
   * @inheritdoc
   */
  sendEnvelope(t) {
    return this.emit("beforeEnvelope", t), this._isEnabled() && this._transport ? this._transport.send(t).then(null, (n) => (ie && B.error("Error while sending envelope:", n), n)) : (ie && B.error("Transport disabled"), An({}));
  }
  /* eslint-enable @typescript-eslint/unified-signatures */
  /** Setup integrations for this client. */
  _setupIntegrations() {
    const { integrations: t } = this._options;
    this._integrations = sy(this, t), tu(this, t);
  }
  /** Updates existing session based on the provided event */
  _updateSessionFromEvent(t, n) {
    let r = !1, s = !1;
    const o = n.exception && n.exception.values;
    if (o) {
      s = !0;
      for (const c of o) {
        const u = c.mechanism;
        if (u && u.handled === !1) {
          r = !0;
          break;
        }
      }
    }
    const i = t.status === "ok";
    (i && t.errors === 0 || i && r) && (fr(t, {
      ...r && { status: "crashed" },
      errors: t.errors || Number(s || r)
    }), this.captureSession(t));
  }
  /**
   * Determine if the client is finished processing. Returns a promise because it will wait `timeout` ms before saying
   * "no" (resolving to `false`) in order to give the client a chance to potentially finish first.
   *
   * @param timeout The time, in ms, after which to resolve to `false` if the client is still busy. Passing `0` (or not
   * passing anything) will make the promise wait as long as it takes for processing to finish before resolving to
   * `true`.
   * @returns A promise which will resolve to `true` if processing is already done or finishes before the timeout, and
   * `false` otherwise
   */
  _isClientDoneProcessing(t) {
    return new qe((n) => {
      let r = 0;
      const s = 1, o = setInterval(() => {
        this._numProcessing == 0 ? (clearInterval(o), n(!0)) : (r += s, t && r >= t && (clearInterval(o), n(!1)));
      }, s);
    });
  }
  /** Determines whether this SDK is enabled and a transport is present. */
  _isEnabled() {
    return this.getOptions().enabled !== !1 && this._transport !== void 0;
  }
  /**
   * Adds common information to events.
   *
   * The information includes release and environment from `options`,
   * breadcrumbs and context (extra, tags and user) from the scope.
   *
   * Information that is already present in the event is never overwritten. For
   * nested objects, such as the context, keys are merged.
   *
   * @param event The original event.
   * @param hint May contain additional information about the original exception.
   * @param currentScope A scope containing event metadata.
   * @returns A new event with more information.
   */
  _prepareEvent(t, n, r = Pt(), s = as()) {
    const o = this.getOptions(), i = Object.keys(this._integrations);
    return !n.integrations && i.length > 0 && (n.integrations = i), this.emit("preprocessEvent", t, n), t.type || s.setLastEventId(t.event_id || n.event_id), Bg(o, t, n, r, this, s).then((a) => {
      if (a === null)
        return a;
      a.contexts = {
        trace: Wm(r),
        ...a.contexts
      };
      const c = dg(this, r);
      return a.sdkProcessingMetadata = {
        dynamicSamplingContext: c,
        ...a.sdkProcessingMetadata
      }, a;
    });
  }
  /**
   * Processes the event and logs an error in case of rejection
   * @param event
   * @param hint
   * @param scope
   */
  _captureEvent(t, n = {}, r) {
    return this._processEvent(t, n, r).then(
      (s) => s.event_id,
      (s) => {
        if (ie) {
          const o = s;
          o.logLevel === "log" ? B.log(o.message) : B.warn(o);
        }
      }
    );
  }
  /**
   * Processes an event (either error or message) and sends it to Sentry.
   *
   * This also adds breadcrumbs and context information to the event. However,
   * platform specific meta data (such as the User's IP address) must be added
   * by the SDK implementor.
   *
   *
   * @param event The event to send to Sentry.
   * @param hint May contain additional information about the original exception.
   * @param currentScope A scope containing event metadata.
   * @returns A SyncPromise that resolves with the event or rejects in case event was/will not be send.
   */
  _processEvent(t, n, r) {
    const s = this.getOptions(), { sampleRate: o } = s, i = Sd(t), a = Ed(t), c = t.type || "error", u = `before send for type \`${c}\``, d = typeof o > "u" ? void 0 : pg(o);
    if (a && typeof d == "number" && Math.random() > d)
      return this.recordDroppedEvent("sample_rate", "error", t), so(
        new ht(
          `Discarding event because it's not included in the random sample (sampling rate = ${o})`,
          "log"
        )
      );
    const l = c === "replay_event" ? "replay" : c, p = (t.sdkProcessingMetadata || {}).capturedSpanIsolationScope;
    return this._prepareEvent(t, n, r, p).then((h) => {
      if (h === null)
        throw this.recordDroppedEvent("event_processor", l, t), new ht("An event processor returned `null`, will not send event.", "log");
      if (n.data && n.data.__sentry__ === !0)
        return h;
      const g = cy(this, s, h, n);
      return ay(g, u);
    }).then((h) => {
      if (h === null) {
        if (this.recordDroppedEvent("before_send", l, t), i) {
          const _ = 1 + (t.spans || []).length;
          this.recordDroppedEvent("before_send", "span", _);
        }
        throw new ht(`${u} returned \`null\`, will not send event.`, "log");
      }
      const m = r && r.getSession();
      if (!i && m && this._updateSessionFromEvent(m, h), i) {
        const y = h.sdkProcessingMetadata && h.sdkProcessingMetadata.spanCountBeforeProcessing || 0, _ = h.spans ? h.spans.length : 0, w = y - _;
        w > 0 && this.recordDroppedEvent("before_send", "span", w);
      }
      const g = h.transaction_info;
      if (i && g && h.transaction !== t.transaction) {
        const y = "custom";
        h.transaction_info = {
          ...g,
          source: y
        };
      }
      return this.sendEvent(h, n), h;
    }).then(null, (h) => {
      throw h instanceof ht ? h : (this.captureException(h, {
        data: {
          __sentry__: !0
        },
        originalException: h
      }), new ht(
        `Event processing pipeline threw an error, original event will not be sent. Details have been sent as a new event.
Reason: ${h}`
      ));
    });
  }
  /**
   * Occupies the client with processing and event
   */
  _process(t) {
    this._numProcessing++, t.then(
      (n) => (this._numProcessing--, n),
      (n) => (this._numProcessing--, n)
    );
  }
  /**
   * Clears outcomes on this client and returns them.
   */
  _clearOutcomes() {
    const t = this._outcomes;
    return this._outcomes = {}, Object.entries(t).map(([n, r]) => {
      const [s, o] = n.split(":");
      return {
        reason: s,
        category: o,
        quantity: r
      };
    });
  }
  /**
   * Sends client reports as an envelope.
   */
  _flushOutcomes() {
    ie && B.log("Flushing outcomes...");
    const t = this._clearOutcomes();
    if (t.length === 0) {
      ie && B.log("No outcomes to send");
      return;
    }
    if (!this._dsn) {
      ie && B.log("No dsn provided, will not send outcomes");
      return;
    }
    ie && B.log("Sending outcomes:", t);
    const n = oy(t, this._options.tunnel && Oo(this._dsn));
    this.sendEnvelope(n);
  }
  /**
   * @inheritDoc
   */
}
function ay(e, t) {
  const n = `${t} must return \`null\` or a valid event.`;
  if (Ao(e))
    return e.then(
      (r) => {
        if (!lr(r) && r !== null)
          throw new ht(n);
        return r;
      },
      (r) => {
        throw new ht(`${t} rejected with ${r}`);
      }
    );
  if (!lr(e) && e !== null)
    throw new ht(n);
  return e;
}
function cy(e, t, n, r) {
  const { beforeSend: s, beforeSendTransaction: o, beforeSendSpan: i } = t;
  if (Ed(n) && s)
    return s(n, r);
  if (Sd(n)) {
    if (n.spans && i) {
      const a = [];
      for (const c of n.spans) {
        const u = i(c);
        u ? a.push(u) : (cg(), e.recordDroppedEvent("before_send", "span"));
      }
      n.spans = a;
    }
    if (o) {
      if (n.spans) {
        const a = n.spans.length;
        n.sdkProcessingMetadata = {
          ...n.sdkProcessingMetadata,
          spanCountBeforeProcessing: a
        };
      }
      return o(n, r);
    }
  }
  return n;
}
function Ed(e) {
  return e.type === void 0;
}
function Sd(e) {
  return e.type === "transaction";
}
function uy(e, t) {
  t.debug === !0 && (ie ? B.enable() : Un(() => {
    console.warn("[Sentry] Cannot initialize SDK with `debug` option using a non-debug bundle.");
  })), Pt().update(t.initialScope);
  const r = new e(t);
  return ly(r), r.init(), r;
}
function ly(e) {
  Pt().setClient(e);
}
function dy(e) {
  const t = [];
  function n() {
    return e === void 0 || t.length < e;
  }
  function r(i) {
    return t.splice(t.indexOf(i), 1)[0] || Promise.resolve(void 0);
  }
  function s(i) {
    if (!n())
      return so(new ht("Not adding Promise because buffer limit was reached."));
    const a = i();
    return t.indexOf(a) === -1 && t.push(a), a.then(() => r(a)).then(
      null,
      () => r(a).then(null, () => {
      })
    ), a;
  }
  function o(i) {
    return new qe((a, c) => {
      let u = t.length;
      if (!u)
        return a(!0);
      const d = setTimeout(() => {
        i && i > 0 && a(!1);
      }, i);
      t.forEach((l) => {
        An(l).then(() => {
          --u || (clearTimeout(d), a(!0));
        }, c);
      });
    });
  }
  return {
    $: t,
    add: s,
    drain: o
  };
}
const fy = 60 * 1e3;
function py(e, t = Date.now()) {
  const n = parseInt(`${e}`, 10);
  if (!isNaN(n))
    return n * 1e3;
  const r = Date.parse(`${e}`);
  return isNaN(r) ? fy : r - t;
}
function hy(e, t) {
  return e[t] || e.all || 0;
}
function my(e, t, n = Date.now()) {
  return hy(e, t) > n;
}
function gy(e, { statusCode: t, headers: n }, r = Date.now()) {
  const s = {
    ...e
  }, o = n && n["x-sentry-rate-limits"], i = n && n["retry-after"];
  if (o)
    for (const a of o.trim().split(",")) {
      const [c, u, , , d] = a.split(":", 5), l = parseInt(c, 10), f = (isNaN(l) ? 60 : l) * 1e3;
      if (!u)
        s.all = r + f;
      else
        for (const p of u.split(";"))
          p === "metric_bucket" ? (!d || d.split(";").includes("custom")) && (s[p] = r + f) : s[p] = r + f;
    }
  else i ? s.all = r + py(i, r) : t === 429 && (s.all = r + 60 * 1e3);
  return s;
}
const yy = 64;
function _y(e, t, n = dy(
  e.bufferSize || yy
)) {
  let r = {};
  const s = (i) => n.drain(i);
  function o(i) {
    const a = [];
    if (qc(i, (l, f) => {
      const p = Xc(f);
      if (my(r, p)) {
        const h = ru(l, f);
        e.recordDroppedEvent("ratelimit_backoff", p, h);
      } else
        a.push(l);
    }), a.length === 0)
      return An({});
    const c = cs(i[0], a), u = (l) => {
      qc(c, (f, p) => {
        const h = ru(f, p);
        e.recordDroppedEvent(l, Xc(p), h);
      });
    }, d = () => t({ body: Ig(c) }).then(
      (l) => (l.statusCode !== void 0 && (l.statusCode < 200 || l.statusCode >= 300) && ie && B.warn(`Sentry responded with status code ${l.statusCode} to sent event.`), r = gy(r, l), l),
      (l) => {
        throw u("network_error"), l;
      }
    );
    return n.add(d).then(
      (l) => l,
      (l) => {
        if (l instanceof ht)
          return ie && B.error("Skipped sending event because buffer is full."), u("queue_overflow"), An({});
        throw l;
      }
    );
  }
  return {
    send: o,
    flush: s
  };
}
function ru(e, t) {
  if (!(t !== "event" && t !== "transaction"))
    return Array.isArray(e) ? e[1] : void 0;
}
function by(e, t, n = [t], r = "npm") {
  const s = e._metadata || {};
  s.sdk || (s.sdk = {
    name: `sentry.javascript.${t}`,
    packages: n.map((o) => ({
      name: `${r}:@sentry/${o}`,
      version: Tn
    })),
    version: Tn
  }), e._metadata = s;
}
const wy = 100;
function Rn(e, t) {
  const n = xe(), r = as();
  if (!n) return;
  const { beforeBreadcrumb: s = null, maxBreadcrumbs: o = wy } = n.getOptions();
  if (o <= 0) return;
  const a = { timestamp: is(), ...e }, c = s ? Un(() => s(a, t)) : a;
  c !== null && (n.emit && n.emit("beforeAddBreadcrumb", c, t), r.addBreadcrumb(c, o));
}
let su;
const Ey = "FunctionToString", ou = /* @__PURE__ */ new WeakMap(), Sy = (() => ({
  name: Ey,
  setupOnce() {
    su = Function.prototype.toString;
    try {
      Function.prototype.toString = function(...e) {
        const t = Ua(this), n = ou.has(xe()) && t !== void 0 ? t : this;
        return su.apply(n, e);
      };
    } catch {
    }
  },
  setup(e) {
    ou.set(e, !0);
  }
})), Ty = Sy, vy = [
  /^Script error\.?$/,
  /^Javascript error: Script error\.? on line 0$/,
  /^ResizeObserver loop completed with undelivered notifications.$/,
  // The browser logs this when a ResizeObserver handler takes a bit longer. Usually this is not an actual issue though. It indicates slowness.
  /^Cannot redefine property: googletag$/,
  // This is thrown when google tag manager is used in combination with an ad blocker
  "undefined is not an object (evaluating 'a.L')",
  // Random error that happens but not actionable or noticeable to end-users.
  `can't redefine non-configurable property "solana"`,
  // Probably a browser extension or custom browser (Brave) throwing this error
  "vv().getRestrictions is not a function. (In 'vv().getRestrictions(1,a)', 'vv().getRestrictions' is undefined)",
  // Error thrown by GTM, seemingly not affecting end-users
  "Can't find variable: _AutofillCallbackHandler",
  // Unactionable error in instagram webview https://developers.facebook.com/community/threads/320013549791141/
  /^Non-Error promise rejection captured with value: Object Not Found Matching Id:\d+, MethodName:simulateEvent, ParamCount:\d+$/
  // unactionable error from CEFSharp, a .NET library that embeds chromium in .NET apps
], Iy = "InboundFilters", ky = ((e = {}) => ({
  name: Iy,
  processEvent(t, n, r) {
    const s = r.getOptions(), o = Ay(e, s);
    return Ry(t, o) ? null : t;
  }
})), Cy = ky;
function Ay(e = {}, t = {}) {
  return {
    allowUrls: [...e.allowUrls || [], ...t.allowUrls || []],
    denyUrls: [...e.denyUrls || [], ...t.denyUrls || []],
    ignoreErrors: [
      ...e.ignoreErrors || [],
      ...t.ignoreErrors || [],
      ...e.disableErrorDefaults ? [] : vy
    ],
    ignoreTransactions: [...e.ignoreTransactions || [], ...t.ignoreTransactions || []],
    ignoreInternal: e.ignoreInternal !== void 0 ? e.ignoreInternal : !0
  };
}
function Ry(e, t) {
  return t.ignoreInternal && Py(e) ? (ie && B.warn(`Event dropped due to being internal Sentry Error.
Event: ${Wt(e)}`), !0) : xy(e, t.ignoreErrors) ? (ie && B.warn(
    `Event dropped due to being matched by \`ignoreErrors\` option.
Event: ${Wt(e)}`
  ), !0) : Uy(e) ? (ie && B.warn(
    `Event dropped due to not having an error message, error type or stacktrace.
Event: ${Wt(
      e
    )}`
  ), !0) : Oy(e, t.ignoreTransactions) ? (ie && B.warn(
    `Event dropped due to being matched by \`ignoreTransactions\` option.
Event: ${Wt(e)}`
  ), !0) : Ly(e, t.denyUrls) ? (ie && B.warn(
    `Event dropped due to being matched by \`denyUrls\` option.
Event: ${Wt(
      e
    )}.
Url: ${oo(e)}`
  ), !0) : Ny(e, t.allowUrls) ? !1 : (ie && B.warn(
    `Event dropped due to not being matched by \`allowUrls\` option.
Event: ${Wt(
      e
    )}.
Url: ${oo(e)}`
  ), !0);
}
function xy(e, t) {
  return e.type || !t || !t.length ? !1 : My(e).some((n) => Ro(n, t));
}
function Oy(e, t) {
  if (e.type !== "transaction" || !t || !t.length)
    return !1;
  const n = e.transaction;
  return n ? Ro(n, t) : !1;
}
function Ly(e, t) {
  if (!t || !t.length)
    return !1;
  const n = oo(e);
  return n ? Ro(n, t) : !1;
}
function Ny(e, t) {
  if (!t || !t.length)
    return !0;
  const n = oo(e);
  return n ? Ro(n, t) : !0;
}
function My(e) {
  const t = [];
  e.message && t.push(e.message);
  let n;
  try {
    n = e.exception.values[e.exception.values.length - 1];
  } catch {
  }
  return n && n.value && (t.push(n.value), n.type && t.push(`${n.type}: ${n.value}`)), t;
}
function Py(e) {
  try {
    return e.exception.values[0].type === "SentryError";
  } catch {
  }
  return !1;
}
function Dy(e = []) {
  for (let t = e.length - 1; t >= 0; t--) {
    const n = e[t];
    if (n && n.filename !== "<anonymous>" && n.filename !== "[native code]")
      return n.filename || null;
  }
  return null;
}
function oo(e) {
  try {
    let t;
    try {
      t = e.exception.values[0].stacktrace.frames;
    } catch {
    }
    return t ? Dy(t) : null;
  } catch {
    return ie && B.error(`Cannot extract url for event ${Wt(e)}`), null;
  }
}
function Uy(e) {
  return e.type || !e.exception || !e.exception.values || e.exception.values.length === 0 ? !1 : (
    // No top-level message
    !e.message && // There are no exception values that have a stacktrace, a non-generic-Error type or value
    !e.exception.values.some((t) => t.stacktrace || t.type && t.type !== "Error" || t.value)
  );
}
function Fy(e, t, n = 250, r, s, o, i) {
  if (!o.exception || !o.exception.values || !i || !kn(i.originalException, Error))
    return;
  const a = o.exception.values.length > 0 ? o.exception.values[o.exception.values.length - 1] : void 0;
  a && (o.exception.values = $y(
    zi(
      e,
      t,
      s,
      i.originalException,
      r,
      o.exception.values,
      a,
      0
    ),
    n
  ));
}
function zi(e, t, n, r, s, o, i, a) {
  if (o.length >= n + 1)
    return o;
  let c = [...o];
  if (kn(r[s], Error)) {
    iu(i, a);
    const u = e(t, r[s]), d = c.length;
    au(u, s, d, a), c = zi(
      e,
      t,
      n,
      r[s],
      s,
      [u, ...c],
      u,
      d
    );
  }
  return Array.isArray(r.errors) && r.errors.forEach((u, d) => {
    if (kn(u, Error)) {
      iu(i, a);
      const l = e(t, u), f = c.length;
      au(l, `errors[${d}]`, f, a), c = zi(
        e,
        t,
        n,
        u,
        s,
        [l, ...c],
        l,
        f
      );
    }
  }), c;
}
function iu(e, t) {
  e.mechanism = e.mechanism || { type: "generic", handled: !0 }, e.mechanism = {
    ...e.mechanism,
    ...e.type === "AggregateError" && { is_exception_group: !0 },
    exception_id: t
  };
}
function au(e, t, n, r) {
  e.mechanism = e.mechanism || { type: "generic", handled: !0 }, e.mechanism = {
    ...e.mechanism,
    type: "chained",
    source: t,
    exception_id: n,
    parent_id: r
  };
}
function $y(e, t) {
  return e.map((n) => (n.value && (n.value = or(n.value, t)), n));
}
function ii(e) {
  if (!e)
    return {};
  const t = e.match(/^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?$/);
  if (!t)
    return {};
  const n = t[6] || "", r = t[8] || "";
  return {
    host: t[4],
    path: t[5],
    protocol: t[2],
    search: n,
    hash: r,
    relative: t[5] + n + r
    // everything minus origin
  };
}
function By(e) {
  const t = "console";
  Fn(t, e), $n(t, Vy);
}
function Vy() {
  "console" in ee && Ui.forEach(function(e) {
    e in ee.console && Ke(ee.console, e, function(t) {
      return ro[e] = t, function(...n) {
        ct("console", { args: n, level: e });
        const s = ro[e];
        s && s.apply(ee.console, n);
      };
    });
  });
}
function Wy(e) {
  return e === "warn" ? "warning" : ["fatal", "error", "warning", "log", "info", "debug"].includes(e) ? e : "log";
}
const Hy = "Dedupe", Gy = (() => {
  let e;
  return {
    name: Hy,
    processEvent(t) {
      if (t.type)
        return t;
      try {
        if (Ky(t, e))
          return ie && B.warn("Event dropped due to being a duplicate of previously captured event."), null;
      } catch {
      }
      return e = t;
    }
  };
}), zy = Gy;
function Ky(e, t) {
  return t ? !!(jy(e, t) || qy(e, t)) : !1;
}
function jy(e, t) {
  const n = e.message, r = t.message;
  return !(!n && !r || n && !r || !n && r || n !== r || !vd(e, t) || !Td(e, t));
}
function qy(e, t) {
  const n = cu(t), r = cu(e);
  return !(!n || !r || n.type !== r.type || n.value !== r.value || !vd(e, t) || !Td(e, t));
}
function Td(e, t) {
  let n = Nc(e), r = Nc(t);
  if (!n && !r)
    return !0;
  if (n && !r || !n && r || (n = n, r = r, r.length !== n.length))
    return !1;
  for (let s = 0; s < r.length; s++) {
    const o = r[s], i = n[s];
    if (o.filename !== i.filename || o.lineno !== i.lineno || o.colno !== i.colno || o.function !== i.function)
      return !1;
  }
  return !0;
}
function vd(e, t) {
  let n = e.fingerprint, r = t.fingerprint;
  if (!n && !r)
    return !0;
  if (n && !r || !n && r)
    return !1;
  n = n, r = r;
  try {
    return n.join("") === r.join("");
  } catch {
    return !1;
  }
}
function cu(e) {
  return e.exception && e.exception.values && e.exception.values[0];
}
function Id(e) {
  if (e !== void 0)
    return e >= 400 && e < 500 ? "warning" : e >= 500 ? "error" : void 0;
}
const Ki = ee;
function kd() {
  if (!("fetch" in Ki))
    return !1;
  try {
    return new Headers(), new Request("http://www.example.com"), new Response(), !0;
  } catch {
    return !1;
  }
}
function ji(e) {
  return e && /^function\s+\w+\(\)\s+\{\s+\[native code\]\s+\}$/.test(e.toString());
}
function Xy() {
  if (typeof EdgeRuntime == "string")
    return !0;
  if (!kd())
    return !1;
  if (ji(Ki.fetch))
    return !0;
  let e = !1;
  const t = Ki.document;
  if (t && typeof t.createElement == "function")
    try {
      const n = t.createElement("iframe");
      n.hidden = !0, t.head.appendChild(n), n.contentWindow && n.contentWindow.fetch && (e = ji(n.contentWindow.fetch)), t.head.removeChild(n);
    } catch (n) {
      Dn && B.warn("Could not create sandbox iframe for pure fetch check, bailing to window.fetch: ", n);
    }
  return e;
}
function Yy(e, t) {
  const n = "fetch";
  Fn(n, e), $n(n, () => Jy(void 0, t));
}
function Jy(e, t = !1) {
  t && !Xy() || Ke(ee, "fetch", function(n) {
    return function(...r) {
      const s = new Error(), { method: o, url: i } = Qy(r), a = {
        args: r,
        fetchData: {
          method: o,
          url: i
        },
        startTimestamp: Rt() * 1e3,
        // // Adding the error to be able to fingerprint the failed fetch event in HttpClient instrumentation
        virtualError: s
      };
      return ct("fetch", {
        ...a
      }), n.apply(ee, r).then(
        async (c) => (ct("fetch", {
          ...a,
          endTimestamp: Rt() * 1e3,
          response: c
        }), c),
        (c) => {
          throw ct("fetch", {
            ...a,
            endTimestamp: Rt() * 1e3,
            error: c
          }), Na(c) && c.stack === void 0 && (c.stack = s.stack, Cn(c, "framesToPop", 1)), c;
        }
      );
    };
  });
}
function qi(e, t) {
  return !!e && typeof e == "object" && !!e[t];
}
function uu(e) {
  return typeof e == "string" ? e : e ? qi(e, "url") ? e.url : e.toString ? e.toString() : "" : "";
}
function Qy(e) {
  if (e.length === 0)
    return { method: "GET", url: "" };
  if (e.length === 2) {
    const [n, r] = e;
    return {
      url: uu(n),
      method: qi(r, "method") ? String(r.method).toUpperCase() : "GET"
    };
  }
  const t = e[0];
  return {
    url: uu(t),
    method: qi(t, "method") ? String(t.method).toUpperCase() : "GET"
  };
}
function Zy() {
  return "npm";
}
const Cs = ee;
function e_() {
  const e = Cs.chrome, t = e && e.app && e.app.runtime, n = "history" in Cs && !!Cs.history.pushState && !!Cs.history.replaceState;
  return !t && n;
}
const ae = ee;
let Xi = 0;
function Cd() {
  return Xi > 0;
}
function t_() {
  Xi++, setTimeout(() => {
    Xi--;
  });
}
function hr(e, t = {}) {
  function n(s) {
    return typeof s == "function";
  }
  if (!n(e))
    return e;
  try {
    const s = e.__sentry_wrapped__;
    if (s)
      return typeof s == "function" ? s : e;
    if (Ua(e))
      return e;
  } catch {
    return e;
  }
  const r = function(...s) {
    try {
      const o = s.map((i) => hr(i, t));
      return e.apply(this, o);
    } catch (o) {
      throw t_(), Vm((i) => {
        i.addEventProcessor((a) => (t.mechanism && ($i(a, void 0), dr(a, t.mechanism)), a.extra = {
          ...a.extra,
          arguments: s
        }, a)), gd(o);
      }), o;
    }
  };
  try {
    for (const s in e)
      Object.prototype.hasOwnProperty.call(e, s) && (r[s] = e[s]);
  } catch {
  }
  ad(r, e), Cn(e, "__sentry_wrapped__", r);
  try {
    Object.getOwnPropertyDescriptor(r, "name").configurable && Object.defineProperty(r, "name", {
      get() {
        return e.name;
      }
    });
  } catch {
  }
  return r;
}
const us = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__;
function Wa(e, t) {
  const n = Ha(e, t), r = {
    type: i_(t),
    value: a_(t)
  };
  return n.length && (r.stacktrace = { frames: n }), r.type === void 0 && r.value === "" && (r.value = "Unrecoverable error caught"), r;
}
function n_(e, t, n, r) {
  const s = xe(), o = s && s.getOptions().normalizeDepth, i = f_(t), a = {
    __serialized__: hd(t, o)
  };
  if (i)
    return {
      exception: {
        values: [Wa(e, i)]
      },
      extra: a
    };
  const c = {
    exception: {
      values: [
        {
          type: Co(t) ? t.constructor.name : r ? "UnhandledRejection" : "Error",
          value: l_(t, { isUnhandledRejection: r })
        }
      ]
    },
    extra: a
  };
  if (n) {
    const u = Ha(e, n);
    u.length && (c.exception.values[0].stacktrace = { frames: u });
  }
  return c;
}
function ai(e, t) {
  return {
    exception: {
      values: [Wa(e, t)]
    }
  };
}
function Ha(e, t) {
  const n = t.stacktrace || t.stack || "", r = s_(t), s = o_(t);
  try {
    return e(n, r, s);
  } catch {
  }
  return [];
}
const r_ = /Minified React error #\d+;/i;
function s_(e) {
  return e && r_.test(e.message) ? 1 : 0;
}
function o_(e) {
  return typeof e.framesToPop == "number" ? e.framesToPop : 0;
}
function Ad(e) {
  return typeof WebAssembly < "u" && typeof WebAssembly.Exception < "u" ? e instanceof WebAssembly.Exception : !1;
}
function i_(e) {
  const t = e && e.name;
  return !t && Ad(e) ? e.message && Array.isArray(e.message) && e.message.length == 2 ? e.message[0] : "WebAssembly.Exception" : t;
}
function a_(e) {
  const t = e && e.message;
  return t ? t.error && typeof t.error.message == "string" ? t.error.message : Ad(e) && Array.isArray(e.message) && e.message.length == 2 ? e.message[1] : t : "No error message";
}
function c_(e, t, n, r) {
  const s = n && n.syntheticException || void 0, o = Ga(e, t, s, r);
  return dr(o), o.level = "error", n && n.event_id && (o.event_id = n.event_id), An(o);
}
function u_(e, t, n = "info", r, s) {
  const o = r && r.syntheticException || void 0, i = Yi(e, t, o, s);
  return i.level = n, r && r.event_id && (i.event_id = r.event_id), An(i);
}
function Ga(e, t, n, r, s) {
  let o;
  if (sd(t) && t.error)
    return ai(e, t.error);
  if (Pc(t) || ym(t)) {
    const i = t;
    if ("stack" in t)
      o = ai(e, t);
    else {
      const a = i.name || (Pc(i) ? "DOMError" : "DOMException"), c = i.message ? `${a}: ${i.message}` : a;
      o = Yi(e, c, n, r), $i(o, c);
    }
    return "code" in i && (o.tags = { ...o.tags, "DOMException.code": `${i.code}` }), o;
  }
  return Na(t) ? ai(e, t) : lr(t) || Co(t) ? (o = n_(e, t, n, s), dr(o, {
    synthetic: !0
  }), o) : (o = Yi(e, t, n, r), $i(o, `${t}`), dr(o, {
    synthetic: !0
  }), o);
}
function Yi(e, t, n, r) {
  const s = {};
  if (r && n) {
    const o = Ha(e, n);
    o.length && (s.exception = {
      values: [{ value: t, stacktrace: { frames: o } }]
    }), dr(s, { synthetic: !0 });
  }
  if (Ma(t)) {
    const { __sentry_template_string__: o, __sentry_template_values__: i } = t;
    return s.logentry = {
      message: o,
      params: i
    }, s;
  }
  return s.message = t, s;
}
function l_(e, { isUnhandledRejection: t }) {
  const n = km(e), r = t ? "promise rejection" : "exception";
  return sd(e) ? `Event \`ErrorEvent\` captured as ${r} with message \`${e.message}\`` : Co(e) ? `Event \`${d_(e)}\` (type=${e.type}) captured as ${r}` : `Object captured as ${r} with keys: ${n}`;
}
function d_(e) {
  try {
    const t = Object.getPrototypeOf(e);
    return t ? t.constructor.name : void 0;
  } catch {
  }
}
function f_(e) {
  for (const t in e)
    if (Object.prototype.hasOwnProperty.call(e, t)) {
      const n = e[t];
      if (n instanceof Error)
        return n;
    }
}
function p_(e, {
  metadata: t,
  tunnel: n,
  dsn: r
}) {
  const s = {
    event_id: e.event_id,
    sent_at: (/* @__PURE__ */ new Date()).toISOString(),
    ...t && t.sdk && {
      sdk: {
        name: t.sdk.name,
        version: t.sdk.version
      }
    },
    ...!!n && !!r && { dsn: Oo(r) }
  }, o = h_(e);
  return cs(s, [o]);
}
function h_(e) {
  return [{
    type: "user_report"
  }, e];
}
class m_ extends iy {
  /**
   * Creates a new Browser SDK instance.
   *
   * @param options Configuration options for this SDK.
   */
  constructor(t) {
    const n = {
      // We default this to true, as it is the safer scenario
      parentSpanIsAlwaysRootSpan: !0,
      ...t
    }, r = ae.SENTRY_SDK_SOURCE || Zy();
    by(n, "browser", ["browser"], r), super(n), n.sendClientReports && ae.document && ae.document.addEventListener("visibilitychange", () => {
      ae.document.visibilityState === "hidden" && this._flushOutcomes();
    });
  }
  /**
   * @inheritDoc
   */
  eventFromException(t, n) {
    return c_(this._options.stackParser, t, n, this._options.attachStacktrace);
  }
  /**
   * @inheritDoc
   */
  eventFromMessage(t, n = "info", r) {
    return u_(this._options.stackParser, t, n, r, this._options.attachStacktrace);
  }
  /**
   * Sends user feedback to Sentry.
   *
   * @deprecated Use `captureFeedback` instead.
   */
  captureUserFeedback(t) {
    if (!this._isEnabled()) {
      us && B.warn("SDK not enabled, will not capture user feedback.");
      return;
    }
    const n = p_(t, {
      metadata: this.getSdkMetadata(),
      dsn: this.getDsn(),
      tunnel: this.getOptions().tunnel
    });
    this.sendEnvelope(n);
  }
  /**
   * @inheritDoc
   */
  _prepareEvent(t, n, r) {
    return t.platform = t.platform || "javascript", super._prepareEvent(t, n, r);
  }
}
const g_ = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__, Me = ee, y_ = 1e3;
let lu, Ji, Qi;
function __(e) {
  Fn("dom", e), $n("dom", b_);
}
function b_() {
  if (!Me.document)
    return;
  const e = ct.bind(null, "dom"), t = du(e, !0);
  Me.document.addEventListener("click", t, !1), Me.document.addEventListener("keypress", t, !1), ["EventTarget", "Node"].forEach((n) => {
    const s = Me[n], o = s && s.prototype;
    !o || !o.hasOwnProperty || !o.hasOwnProperty("addEventListener") || (Ke(o, "addEventListener", function(i) {
      return function(a, c, u) {
        if (a === "click" || a == "keypress")
          try {
            const d = this.__sentry_instrumentation_handlers__ = this.__sentry_instrumentation_handlers__ || {}, l = d[a] = d[a] || { refCount: 0 };
            if (!l.handler) {
              const f = du(e);
              l.handler = f, i.call(this, a, f, u);
            }
            l.refCount++;
          } catch {
          }
        return i.call(this, a, c, u);
      };
    }), Ke(
      o,
      "removeEventListener",
      function(i) {
        return function(a, c, u) {
          if (a === "click" || a == "keypress")
            try {
              const d = this.__sentry_instrumentation_handlers__ || {}, l = d[a];
              l && (l.refCount--, l.refCount <= 0 && (i.call(this, a, l.handler, u), l.handler = void 0, delete d[a]), Object.keys(d).length === 0 && delete this.__sentry_instrumentation_handlers__);
            } catch {
            }
          return i.call(this, a, c, u);
        };
      }
    ));
  });
}
function w_(e) {
  if (e.type !== Ji)
    return !1;
  try {
    if (!e.target || e.target._sentryId !== Qi)
      return !1;
  } catch {
  }
  return !0;
}
function E_(e, t) {
  return e !== "keypress" ? !1 : !t || !t.tagName ? !0 : !(t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
}
function du(e, t = !1) {
  return (n) => {
    if (!n || n._sentryCaptured)
      return;
    const r = S_(n);
    if (E_(n.type, r))
      return;
    Cn(n, "_sentryCaptured", !0), r && !r._sentryId && Cn(r, "_sentryId", Qe());
    const s = n.type === "keypress" ? "input" : n.type;
    w_(n) || (e({ event: n, name: s, global: t }), Ji = n.type, Qi = r ? r._sentryId : void 0), clearTimeout(lu), lu = Me.setTimeout(() => {
      Qi = void 0, Ji = void 0;
    }, y_);
  };
}
function S_(e) {
  try {
    return e.target;
  } catch {
    return null;
  }
}
let As;
function Rd(e) {
  const t = "history";
  Fn(t, e), $n(t, T_);
}
function T_() {
  if (!e_())
    return;
  const e = Me.onpopstate;
  Me.onpopstate = function(...n) {
    const r = Me.location.href, s = As;
    if (As = r, ct("history", { from: s, to: r }), e)
      try {
        return e.apply(this, n);
      } catch {
      }
  };
  function t(n) {
    return function(...r) {
      const s = r.length > 2 ? r[2] : void 0;
      if (s) {
        const o = As, i = String(s);
        As = i, ct("history", { from: o, to: i });
      }
      return n.apply(this, r);
    };
  }
  Ke(Me.history, "pushState", t), Ke(Me.history, "replaceState", t);
}
const Gs = {};
function v_(e) {
  const t = Gs[e];
  if (t)
    return t;
  let n = Me[e];
  if (ji(n))
    return Gs[e] = n.bind(Me);
  const r = Me.document;
  if (r && typeof r.createElement == "function")
    try {
      const s = r.createElement("iframe");
      s.hidden = !0, r.head.appendChild(s);
      const o = s.contentWindow;
      o && o[e] && (n = o[e]), r.head.removeChild(s);
    } catch (s) {
      g_ && B.warn(`Could not create sandbox iframe for ${e} check, bailing to window.${e}: `, s);
    }
  return n && (Gs[e] = n.bind(Me));
}
function fu(e) {
  Gs[e] = void 0;
}
const $r = "__sentry_xhr_v3__";
function I_(e) {
  Fn("xhr", e), $n("xhr", k_);
}
function k_() {
  if (!Me.XMLHttpRequest)
    return;
  const e = XMLHttpRequest.prototype;
  e.open = new Proxy(e.open, {
    apply(t, n, r) {
      const s = new Error(), o = Rt() * 1e3, i = At(r[0]) ? r[0].toUpperCase() : void 0, a = C_(r[1]);
      if (!i || !a)
        return t.apply(n, r);
      n[$r] = {
        method: i,
        url: a,
        request_headers: {}
      }, i === "POST" && a.match(/sentry_key/) && (n.__sentry_own_request__ = !0);
      const c = () => {
        const u = n[$r];
        if (u && n.readyState === 4) {
          try {
            u.status_code = n.status;
          } catch {
          }
          const d = {
            endTimestamp: Rt() * 1e3,
            startTimestamp: o,
            xhr: n,
            virtualError: s
          };
          ct("xhr", d);
        }
      };
      return "onreadystatechange" in n && typeof n.onreadystatechange == "function" ? n.onreadystatechange = new Proxy(n.onreadystatechange, {
        apply(u, d, l) {
          return c(), u.apply(d, l);
        }
      }) : n.addEventListener("readystatechange", c), n.setRequestHeader = new Proxy(n.setRequestHeader, {
        apply(u, d, l) {
          const [f, p] = l, h = d[$r];
          return h && At(f) && At(p) && (h.request_headers[f.toLowerCase()] = p), u.apply(d, l);
        }
      }), t.apply(n, r);
    }
  }), e.send = new Proxy(e.send, {
    apply(t, n, r) {
      const s = n[$r];
      if (!s)
        return t.apply(n, r);
      r[0] !== void 0 && (s.body = r[0]);
      const o = {
        startTimestamp: Rt() * 1e3,
        xhr: n
      };
      return ct("xhr", o), t.apply(n, r);
    }
  });
}
function C_(e) {
  if (At(e))
    return e;
  try {
    return e.toString();
  } catch {
  }
}
function A_(e, t = v_("fetch")) {
  let n = 0, r = 0;
  function s(o) {
    const i = o.body.length;
    n += i, r++;
    const a = {
      body: o.body,
      method: "POST",
      referrerPolicy: "origin",
      headers: e.headers,
      // Outgoing requests are usually cancelled when navigating to a different page, causing a "TypeError: Failed to
      // fetch" error and sending a "network_error" client-outcome - in Chrome, the request status shows "(cancelled)".
      // The `keepalive` flag keeps outgoing requests alive, even when switching pages. We want this since we're
      // frequently sending events right before the user is switching pages (eg. when finishing navigation transactions).
      // Gotchas:
      // - `keepalive` isn't supported by Firefox
      // - As per spec (https://fetch.spec.whatwg.org/#http-network-or-cache-fetch):
      //   If the sum of contentLength and inflightKeepaliveBytes is greater than 64 kibibytes, then return a network error.
      //   We will therefore only activate the flag when we're below that limit.
      // There is also a limit of requests that can be open at the same time, so we also limit this to 15
      // See https://github.com/getsentry/sentry-javascript/pull/7553 for details
      keepalive: n <= 6e4 && r < 15,
      ...e.fetchOptions
    };
    if (!t)
      return fu("fetch"), so("No fetch implementation available");
    try {
      return t(e.url, a).then((c) => (n -= i, r--, {
        statusCode: c.status,
        headers: {
          "x-sentry-rate-limits": c.headers.get("X-Sentry-Rate-Limits"),
          "retry-after": c.headers.get("Retry-After")
        }
      }));
    } catch (c) {
      return fu("fetch"), n -= i, r--, so(c);
    }
  }
  return _y(e, s);
}
const R_ = 30, x_ = 50;
function Zi(e, t, n, r) {
  const s = {
    filename: e,
    function: t === "<anonymous>" ? In : t,
    in_app: !0
    // All browser frames are considered in_app
  };
  return n !== void 0 && (s.lineno = n), r !== void 0 && (s.colno = r), s;
}
const O_ = /^\s*at (\S+?)(?::(\d+))(?::(\d+))\s*$/i, L_ = /^\s*at (?:(.+?\)(?: \[.+\])?|.*?) ?\((?:address at )?)?(?:async )?((?:<anonymous>|[-a-z]+:|.*bundle|\/)?.*?)(?::(\d+))?(?::(\d+))?\)?\s*$/i, N_ = /\((\S*)(?::(\d+))(?::(\d+))\)/, M_ = (e) => {
  const t = O_.exec(e);
  if (t) {
    const [, r, s, o] = t;
    return Zi(r, In, +s, +o);
  }
  const n = L_.exec(e);
  if (n) {
    if (n[2] && n[2].indexOf("eval") === 0) {
      const i = N_.exec(n[2]);
      i && (n[2] = i[1], n[3] = i[2], n[4] = i[3]);
    }
    const [s, o] = xd(n[1] || In, n[2]);
    return Zi(o, s, n[3] ? +n[3] : void 0, n[4] ? +n[4] : void 0);
  }
}, P_ = [R_, M_], D_ = /^\s*(.*?)(?:\((.*?)\))?(?:^|@)?((?:[-a-z]+)?:\/.*?|\[native code\]|[^@]*(?:bundle|\d+\.js)|\/[\w\-. /=]+)(?::(\d+))?(?::(\d+))?\s*$/i, U_ = /(\S+) line (\d+)(?: > eval line \d+)* > eval/i, F_ = (e) => {
  const t = D_.exec(e);
  if (t) {
    if (t[3] && t[3].indexOf(" > eval") > -1) {
      const o = U_.exec(t[3]);
      o && (t[1] = t[1] || "eval", t[3] = o[1], t[4] = o[2], t[5] = "");
    }
    let r = t[3], s = t[1] || In;
    return [s, r] = xd(s, r), Zi(r, s, t[4] ? +t[4] : void 0, t[5] ? +t[5] : void 0);
  }
}, $_ = [x_, F_], B_ = [P_, $_], V_ = nd(...B_), xd = (e, t) => {
  const n = e.indexOf("safari-extension") !== -1, r = e.indexOf("safari-web-extension") !== -1;
  return n || r ? [
    e.indexOf("@") !== -1 ? e.split("@")[0] : In,
    n ? `safari-extension:${t}` : `safari-web-extension:${t}`
  ] : [e, t];
}, Rs = 1024, W_ = "Breadcrumbs", H_ = ((e = {}) => {
  const t = {
    console: !0,
    dom: !0,
    fetch: !0,
    history: !0,
    sentry: !0,
    xhr: !0,
    ...e
  };
  return {
    name: W_,
    setup(n) {
      t.console && By(j_(n)), t.dom && __(K_(n, t.dom)), t.xhr && I_(q_(n)), t.fetch && Yy(X_(n)), t.history && Rd(Y_(n)), t.sentry && n.on("beforeSendEvent", z_(n));
    }
  };
}), G_ = H_;
function z_(e) {
  return function(n) {
    xe() === e && Rn(
      {
        category: `sentry.${n.type === "transaction" ? "transaction" : "event"}`,
        event_id: n.event_id,
        level: n.level,
        message: Wt(n)
      },
      {
        event: n
      }
    );
  };
}
function K_(e, t) {
  return function(r) {
    if (xe() !== e)
      return;
    let s, o, i = typeof t == "object" ? t.serializeAttribute : void 0, a = typeof t == "object" && typeof t.maxStringLength == "number" ? t.maxStringLength : void 0;
    a && a > Rs && (us && B.warn(
      `\`dom.maxStringLength\` cannot exceed ${Rs}, but a value of ${a} was configured. Sentry will use ${Rs} instead.`
    ), a = Rs), typeof i == "string" && (i = [i]);
    try {
      const u = r.event, d = J_(u) ? u.target : u;
      s = id(d, { keyAttrs: i, maxStringLength: a }), o = vm(d);
    } catch {
      s = "<unknown>";
    }
    if (s.length === 0)
      return;
    const c = {
      category: `ui.${r.name}`,
      message: s
    };
    o && (c.data = { "ui.component_name": o }), Rn(c, {
      event: r.event,
      name: r.name,
      global: r.global
    });
  };
}
function j_(e) {
  return function(n) {
    if (xe() !== e)
      return;
    const r = {
      category: "console",
      data: {
        arguments: n.args,
        logger: "console"
      },
      level: Wy(n.level),
      message: Dc(n.args, " ")
    };
    if (n.level === "assert")
      if (n.args[0] === !1)
        r.message = `Assertion failed: ${Dc(n.args.slice(1), " ") || "console.assert"}`, r.data.arguments = n.args.slice(1);
      else
        return;
    Rn(r, {
      input: n.args,
      level: n.level
    });
  };
}
function q_(e) {
  return function(n) {
    if (xe() !== e)
      return;
    const { startTimestamp: r, endTimestamp: s } = n, o = n.xhr[$r];
    if (!r || !s || !o)
      return;
    const { method: i, url: a, status_code: c, body: u } = o, d = {
      method: i,
      url: a,
      status_code: c
    }, l = {
      xhr: n.xhr,
      input: u,
      startTimestamp: r,
      endTimestamp: s
    }, f = Id(c);
    Rn(
      {
        category: "xhr",
        data: d,
        type: "http",
        level: f
      },
      l
    );
  };
}
function X_(e) {
  return function(n) {
    if (xe() !== e)
      return;
    const { startTimestamp: r, endTimestamp: s } = n;
    if (s && !(n.fetchData.url.match(/sentry_key/) && n.fetchData.method === "POST"))
      if (n.error) {
        const o = n.fetchData, i = {
          data: n.error,
          input: n.args,
          startTimestamp: r,
          endTimestamp: s
        };
        Rn(
          {
            category: "fetch",
            data: o,
            level: "error",
            type: "http"
          },
          i
        );
      } else {
        const o = n.response, i = {
          ...n.fetchData,
          status_code: o && o.status
        }, a = {
          input: n.args,
          response: o,
          startTimestamp: r,
          endTimestamp: s
        }, c = Id(i.status_code);
        Rn(
          {
            category: "fetch",
            data: i,
            type: "http",
            level: c
          },
          a
        );
      }
  };
}
function Y_(e) {
  return function(n) {
    if (xe() !== e)
      return;
    let r = n.from, s = n.to;
    const o = ii(ae.location.href);
    let i = r ? ii(r) : void 0;
    const a = ii(s);
    (!i || !i.path) && (i = o), o.protocol === a.protocol && o.host === a.host && (s = a.relative), o.protocol === i.protocol && o.host === i.host && (r = i.relative), Rn({
      category: "navigation",
      data: {
        from: r,
        to: s
      }
    });
  };
}
function J_(e) {
  return !!e && !!e.target;
}
const Q_ = [
  "EventTarget",
  "Window",
  "Node",
  "ApplicationCache",
  "AudioTrackList",
  "BroadcastChannel",
  "ChannelMergerNode",
  "CryptoOperation",
  "EventSource",
  "FileReader",
  "HTMLUnknownElement",
  "IDBDatabase",
  "IDBRequest",
  "IDBTransaction",
  "KeyOperation",
  "MediaController",
  "MessagePort",
  "ModalWindow",
  "Notification",
  "SVGElementInstance",
  "Screen",
  "SharedWorker",
  "TextTrack",
  "TextTrackCue",
  "TextTrackList",
  "WebSocket",
  "WebSocketWorker",
  "Worker",
  "XMLHttpRequest",
  "XMLHttpRequestEventTarget",
  "XMLHttpRequestUpload"
], Z_ = "BrowserApiErrors", eb = ((e = {}) => {
  const t = {
    XMLHttpRequest: !0,
    eventTarget: !0,
    requestAnimationFrame: !0,
    setInterval: !0,
    setTimeout: !0,
    ...e
  };
  return {
    name: Z_,
    // TODO: This currently only works for the first client this is setup
    // We may want to adjust this to check for client etc.
    setupOnce() {
      t.setTimeout && Ke(ae, "setTimeout", pu), t.setInterval && Ke(ae, "setInterval", pu), t.requestAnimationFrame && Ke(ae, "requestAnimationFrame", nb), t.XMLHttpRequest && "XMLHttpRequest" in ae && Ke(XMLHttpRequest.prototype, "send", rb);
      const n = t.eventTarget;
      n && (Array.isArray(n) ? n : Q_).forEach(sb);
    }
  };
}), tb = eb;
function pu(e) {
  return function(...t) {
    const n = t[0];
    return t[0] = hr(n, {
      mechanism: {
        data: { function: Jt(e) },
        handled: !1,
        type: "instrument"
      }
    }), e.apply(this, t);
  };
}
function nb(e) {
  return function(t) {
    return e.apply(this, [
      hr(t, {
        mechanism: {
          data: {
            function: "requestAnimationFrame",
            handler: Jt(e)
          },
          handled: !1,
          type: "instrument"
        }
      })
    ]);
  };
}
function rb(e) {
  return function(...t) {
    const n = this;
    return ["onload", "onerror", "onprogress", "onreadystatechange"].forEach((s) => {
      s in n && typeof n[s] == "function" && Ke(n, s, function(o) {
        const i = {
          mechanism: {
            data: {
              function: s,
              handler: Jt(o)
            },
            handled: !1,
            type: "instrument"
          }
        }, a = Ua(o);
        return a && (i.mechanism.data.handler = Jt(a)), hr(o, i);
      });
    }), e.apply(this, t);
  };
}
function sb(e) {
  const n = ae[e], r = n && n.prototype;
  !r || !r.hasOwnProperty || !r.hasOwnProperty("addEventListener") || (Ke(r, "addEventListener", function(s) {
    return function(o, i, a) {
      try {
        ob(i) && (i.handleEvent = hr(i.handleEvent, {
          mechanism: {
            data: {
              function: "handleEvent",
              handler: Jt(i),
              target: e
            },
            handled: !1,
            type: "instrument"
          }
        }));
      } catch {
      }
      return s.apply(this, [
        o,
        hr(i, {
          mechanism: {
            data: {
              function: "addEventListener",
              handler: Jt(i),
              target: e
            },
            handled: !1,
            type: "instrument"
          }
        }),
        a
      ]);
    };
  }), Ke(r, "removeEventListener", function(s) {
    return function(o, i, a) {
      try {
        const c = i.__sentry_wrapped__;
        c && s.call(this, o, c, a);
      } catch {
      }
      return s.call(this, o, i, a);
    };
  }));
}
function ob(e) {
  return typeof e.handleEvent == "function";
}
const ib = () => ({
  name: "BrowserSession",
  setupOnce() {
    if (typeof ae.document > "u") {
      us && B.warn("Using the `browserSessionIntegration` in non-browser environments is not supported.");
      return;
    }
    Qc({ ignoreDuration: !0 }), Zc(), Rd(({ from: e, to: t }) => {
      e !== void 0 && e !== t && (Qc({ ignoreDuration: !0 }), Zc());
    });
  }
}), ab = "GlobalHandlers", cb = ((e = {}) => {
  const t = {
    onerror: !0,
    onunhandledrejection: !0,
    ...e
  };
  return {
    name: ab,
    setupOnce() {
      Error.stackTraceLimit = 50;
    },
    setup(n) {
      t.onerror && (lb(n), hu("onerror")), t.onunhandledrejection && (db(n), hu("onunhandledrejection"));
    }
  };
}), ub = cb;
function lb(e) {
  pm((t) => {
    const { stackParser: n, attachStacktrace: r } = Od();
    if (xe() !== e || Cd())
      return;
    const { msg: s, url: o, line: i, column: a, error: c } = t, u = hb(
      Ga(n, c || s, void 0, r, !1),
      o,
      i,
      a
    );
    u.level = "error", yd(u, {
      originalException: c,
      mechanism: {
        handled: !1,
        type: "onerror"
      }
    });
  });
}
function db(e) {
  mm((t) => {
    const { stackParser: n, attachStacktrace: r } = Od();
    if (xe() !== e || Cd())
      return;
    const s = fb(t), o = Pa(s) ? pb(s) : Ga(n, s, void 0, r, !0);
    o.level = "error", yd(o, {
      originalException: s,
      mechanism: {
        handled: !1,
        type: "onunhandledrejection"
      }
    });
  });
}
function fb(e) {
  if (Pa(e))
    return e;
  try {
    if ("reason" in e)
      return e.reason;
    if ("detail" in e && "reason" in e.detail)
      return e.detail.reason;
  } catch {
  }
  return e;
}
function pb(e) {
  return {
    exception: {
      values: [
        {
          type: "UnhandledRejection",
          // String() is needed because the Primitive type includes symbols (which can't be automatically stringified)
          value: `Non-Error promise rejection captured with value: ${String(e)}`
        }
      ]
    }
  };
}
function hb(e, t, n, r) {
  const s = e.exception = e.exception || {}, o = s.values = s.values || [], i = o[0] = o[0] || {}, a = i.stacktrace = i.stacktrace || {}, c = a.frames = a.frames || [], u = r, d = n, l = At(t) && t.length > 0 ? t : Tm();
  return c.length === 0 && c.push({
    colno: u,
    filename: l,
    function: In,
    in_app: !0,
    lineno: d
  }), e;
}
function hu(e) {
  us && B.log(`Global Handler attached: ${e}`);
}
function Od() {
  const e = xe();
  return e && e.getOptions() || {
    stackParser: () => [],
    attachStacktrace: !1
  };
}
const mb = () => ({
  name: "HttpContext",
  preprocessEvent(e) {
    if (!ae.navigator && !ae.location && !ae.document)
      return;
    const t = e.request && e.request.url || ae.location && ae.location.href, { referrer: n } = ae.document || {}, { userAgent: r } = ae.navigator || {}, s = {
      ...e.request && e.request.headers,
      ...n && { Referer: n },
      ...r && { "User-Agent": r }
    }, o = { ...e.request, ...t && { url: t }, headers: s };
    e.request = o;
  }
}), gb = "cause", yb = 5, _b = "LinkedErrors", bb = ((e = {}) => {
  const t = e.limit || yb, n = e.key || gb;
  return {
    name: _b,
    preprocessEvent(r, s, o) {
      const i = o.getOptions();
      Fy(
        // This differs from the LinkedErrors integration in core by using a different exceptionFromError function
        Wa,
        i.stackParser,
        i.maxValueLength,
        n,
        t,
        r,
        s
      );
    }
  };
}), wb = bb;
function Eb(e) {
  const t = [
    Cy(),
    Ty(),
    tb(),
    G_(),
    ub(),
    wb(),
    zy(),
    mb()
  ];
  return e.autoSessionTracking !== !1 && t.push(ib()), t;
}
function Sb(e = {}) {
  const t = {
    defaultIntegrations: Eb(e),
    release: typeof __SENTRY_RELEASE__ == "string" ? __SENTRY_RELEASE__ : ae.SENTRY_RELEASE && ae.SENTRY_RELEASE.id ? ae.SENTRY_RELEASE.id : void 0,
    autoSessionTracking: !0,
    sendClientReports: !0
  };
  return e.defaultIntegrations == null && delete e.defaultIntegrations, { ...t, ...e };
}
function Tb() {
  const e = typeof ae.window < "u" && ae;
  if (!e)
    return !1;
  const t = e.chrome ? "chrome" : "browser", n = e[t], r = n && n.runtime && n.runtime.id, s = ae.location && ae.location.href || "", o = ["chrome-extension:", "moz-extension:", "ms-browser-extension:", "safari-web-extension:"], i = !!r && ae === ae.top && o.some((c) => s.startsWith(`${c}//`)), a = typeof e.nw < "u";
  return !!r && !i && !a;
}
function vb(e = {}) {
  const t = Sb(e);
  if (!t.skipBrowserExtensionCheck && Tb()) {
    Un(() => {
      console.error(
        "[Sentry] You cannot run Sentry this way in a browser extension, check: https://docs.sentry.io/platforms/javascript/best-practices/browser-extensions/"
      );
    });
    return;
  }
  us && (kd() || B.warn(
    "No Fetch API detected. The Sentry SDK requires a Fetch API compatible environment to send events. Please add a Fetch API polyfill."
  ));
  const n = {
    ...t,
    stackParser: dm(t.stackParser || V_),
    integrations: ry(t),
    transport: t.transport || A_
  };
  return uy(m_, n);
}
const Ib = () => {
  vb({
    dsn: "https://fb12ea0c434aa20ad37bf9cc9cff7e31@o4504136533147648.ingest.us.sentry.io/4508600749064192",
    integrations: [],
    release: chrome.runtime.getManifest?.().version ?? "offscreen",
    environment: "production"
  });
}, ge = {
  log: "log",
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error"
}, mt = console, un = {};
Object.keys(ge).forEach((e) => {
  un[e] = mt[e];
});
const Rr = "Datadog Browser SDK:", V = {
  debug: un.debug.bind(mt, Rr),
  log: un.log.bind(mt, Rr),
  info: un.info.bind(mt, Rr),
  warn: un.warn.bind(mt, Rr),
  error: un.error.bind(mt, Rr)
}, Lo = "https://docs.datadoghq.com", kb = `${Lo}/real_user_monitoring/browser/troubleshooting`, za = "More details:";
function Ld(e, t) {
  return (...n) => {
    try {
      return e(...n);
    } catch (r) {
      V.error(t, r);
    }
  };
}
function Kt(e) {
  return e !== 0 && Math.random() * 100 <= e;
}
function Hr(e, t) {
  return +e.toFixed(t);
}
function Cb(e) {
  return ls(e) && e >= 0 && e <= 100;
}
function ls(e) {
  return typeof e == "number";
}
const Re = 1e3, Fe = 60 * Re, Nd = 60 * Fe, Ab = 24 * Nd, Md = 365 * Ab;
function ds(e) {
  return { relative: e, timeStamp: xb(e) };
}
function Rb(e) {
  return { relative: No(e), timeStamp: e };
}
function xb(e) {
  const t = De() - performance.now();
  return t > fs() ? Math.round(Er(t, e)) : Ob(e);
}
function Pd() {
  return Math.round(De() - Er(fs(), performance.now()));
}
function K(e) {
  return ls(e) ? Hr(e * 1e6, 0) : e;
}
function De() {
  return (/* @__PURE__ */ new Date()).getTime();
}
function te() {
  return De();
}
function je() {
  return performance.now();
}
function pe() {
  return { relative: je(), timeStamp: te() };
}
function Ka() {
  return { relative: 0, timeStamp: fs() };
}
function le(e, t) {
  return t - e;
}
function Er(e, t) {
  return e + t;
}
function No(e) {
  return e - fs();
}
function Ob(e) {
  return Math.round(Er(fs(), e));
}
function Lb(e) {
  return e < Md;
}
let ci;
function fs() {
  var e, t;
  return ci === void 0 && (ci = (t = (e = performance.timing) === null || e === void 0 ? void 0 : e.navigationStart) !== null && t !== void 0 ? t : performance.timeOrigin), ci;
}
const xn = 1024, Dd = 1024 * xn, Nb = /[^\u0000-\u007F]/;
function Ud(e) {
  return Nb.test(e) ? window.TextEncoder !== void 0 ? new TextEncoder().encode(e).length : new Blob([e]).size : e.length;
}
function Mb(e) {
  const t = e.reduce((s, o) => s + o.length, 0), n = new Uint8Array(t);
  let r = 0;
  for (const s of e)
    n.set(s, r), r += s.length;
  return n;
}
function Zr(e) {
  return { ...e };
}
function io(e, t) {
  return Object.keys(e).some((n) => e[n] === t);
}
function Bn(e) {
  return Object.keys(e).length === 0;
}
function Fd(e, t) {
  const n = {};
  for (const r of Object.keys(e))
    n[r] = t(e[r]);
  return n;
}
function Ge() {
  if (typeof globalThis == "object")
    return globalThis;
  Object.defineProperty(Object.prototype, "_dd_temp_", {
    get() {
      return this;
    },
    configurable: !0
  });
  let e = _dd_temp_;
  return delete Object.prototype._dd_temp_, typeof e != "object" && (typeof self == "object" ? e = self : typeof window == "object" ? e = window : e = {}), e;
}
const ut = Ge(), On = "WorkerGlobalScope" in ut;
function Zt(e, t) {
  const n = Ge();
  let r;
  return n.Zone && typeof n.Zone.__symbol__ == "function" && (r = e[n.Zone.__symbol__(t)]), r || (r = e[t]), r;
}
let ao, $d = !1;
function Pb(e) {
  ao = e;
}
function Db(e) {
  $d = e;
}
function Ub(e, t, n) {
  const r = n.value;
  n.value = function(...s) {
    return (ao ? M(r) : r).apply(this, s);
  };
}
function M(e) {
  return function() {
    return xt(e, this, arguments);
  };
}
function xt(e, t, n) {
  try {
    return e.apply(t, n);
  } catch (r) {
    ot(r);
  }
}
function ot(e) {
  if (ea(e), ao)
    try {
      ao(e);
    } catch (t) {
      ea(t);
    }
}
function ea(...e) {
  $d && V.error("[MONITOR]", ...e);
}
function Ie(e, t) {
  return Zt(Ge(), "setTimeout")(M(e), t);
}
function Be(e) {
  Zt(Ge(), "clearTimeout")(e);
}
function Sr(e, t) {
  return Zt(Ge(), "setInterval")(M(e), t);
}
function Mo(e) {
  Zt(Ge(), "clearInterval")(e);
}
function mu(e) {
  var t;
  const n = (t = ut.queueMicrotask) === null || t === void 0 ? void 0 : t.bind(ut);
  typeof n == "function" ? n(M(e)) : Promise.resolve().then(M(e));
}
class Y {
  constructor(t) {
    this.onFirstSubscribe = t, this.observers = [];
  }
  subscribe(t) {
    return this.addObserver(t), {
      unsubscribe: () => this.removeObserver(t)
    };
  }
  notify(t) {
    this.observers.forEach((n) => n(t));
  }
  addObserver(t) {
    this.observers.push(t), this.observers.length === 1 && this.onFirstSubscribe && (this.onLastUnsubscribe = this.onFirstSubscribe(this) || void 0);
  }
  removeObserver(t) {
    this.observers = this.observers.filter((n) => t !== n), !this.observers.length && this.onLastUnsubscribe && this.onLastUnsubscribe();
  }
}
function Bd(...e) {
  return new Y((t) => {
    const n = e.map((r) => r.subscribe((s) => t.notify(s)));
    return () => n.forEach((r) => r.unsubscribe());
  });
}
class Vd extends Y {
  constructor(t) {
    super(), this.maxBufferSize = t, this.buffer = [];
  }
  notify(t) {
    this.buffer.push(t), this.buffer.length > this.maxBufferSize && this.buffer.shift(), super.notify(t);
  }
  subscribe(t) {
    let n = !1;
    const r = {
      unsubscribe: () => {
        n = !0, this.removeObserver(t);
      }
    };
    return mu(() => {
      for (const s of this.buffer) {
        if (n)
          return;
        t(s);
      }
      n || this.addObserver(t);
    }), r;
  }
  /**
   * Drop buffered data and don't buffer future data. This is to avoid leaking memory when it's not
   * needed anymore. This can be seen as a performance optimization, and things will work probably
   * even if this method isn't called, but still useful to clarify our intent and lowering our
   * memory impact.
   */
  unbuffer() {
    mu(() => {
      this.maxBufferSize = this.buffer.length = 0;
    });
  }
}
function nn(e, t, n) {
  const r = n && n.leading !== void 0 ? n.leading : !0, s = n && n.trailing !== void 0 ? n.trailing : !0;
  let o = !1, i, a;
  return {
    throttled: (...c) => {
      if (o) {
        i = c;
        return;
      }
      r ? e(...c) : i = c, o = !0, a = Ie(() => {
        s && i && e(...i), o = !1, i = void 0;
      }, t);
    },
    cancel: () => {
      Be(a), o = !1, i = void 0;
    }
  };
}
function q() {
}
function Oe(e) {
  return e ? (
    // eslint-disable-next-line  no-bitwise
    (parseInt(e, 10) ^ Math.random() * 16 >> parseInt(e, 10) / 4).toString(16)
  ) : `10000000-1000-4000-8000-${1e11}`.replace(/[018]/g, Oe);
}
const co = /([\w-]+)\s*=\s*([^;]+)/g;
function es(e, t) {
  for (co.lastIndex = 0; ; ) {
    const n = co.exec(e);
    if (n) {
      if (n[1] === t)
        return n[2];
    } else
      break;
  }
}
function Fb(e) {
  const t = /* @__PURE__ */ new Map();
  for (co.lastIndex = 0; ; ) {
    const n = co.exec(e);
    if (n)
      t.set(n[1], n[2]);
    else
      break;
  }
  return t;
}
function ja(e, t, n = "") {
  const r = e.charCodeAt(t - 1), o = r >= 55296 && r <= 56319 ? t + 1 : t;
  return e.length <= o ? e : `${e.slice(0, o)}${n}`;
}
function $b() {
  return Wd() === 0;
}
function Bb() {
  return Wd() === 1;
}
let xs;
function Wd() {
  return xs ?? (xs = Vb());
}
function Vb(e = window) {
  var t;
  const n = e.navigator.userAgent;
  return e.chrome || /HeadlessChrome/.test(n) ? 0 : (
    // navigator.vendor is deprecated, but it is the most resilient way we found to detect
    // "Apple maintained browsers" (AKA Safari). If one day it gets removed, we still have the
    // useragent test as a semi-working fallback.
    ((t = e.navigator.vendor) === null || t === void 0 ? void 0 : t.indexOf("Apple")) === 0 || /safari/i.test(n) && !/chrome|android/i.test(n) ? 1 : 2
  );
}
function qa(e) {
  return ps(e, location.href).href;
}
function Wb(e) {
  try {
    return !!ps(e);
  } catch {
    return !1;
  }
}
function Hb(e) {
  const t = ps(e).pathname;
  return t[0] === "/" ? t : `/${t}`;
}
function ps(e, t) {
  const { URL: n } = Gb();
  try {
    return t !== void 0 ? new n(e, t) : new n(e);
  } catch (r) {
    throw new Error(`Failed to construct URL: ${String(r)}`);
  }
}
let ui;
function Gb() {
  if (!ui) {
    let e, t;
    try {
      e = document.createElement("iframe"), e.style.display = "none", document.body.appendChild(e), t = e.contentWindow;
    } catch {
      t = ut;
    }
    ui = {
      URL: t.URL
    }, e?.remove();
  }
  return ui;
}
function Po(e, t, n = 0, r) {
  const s = /* @__PURE__ */ new Date();
  s.setTime(s.getTime() + n);
  const o = `expires=${s.toUTCString()}`, i = r && r.crossSite ? "none" : "strict", a = r && r.domain ? `;domain=${r.domain}` : "", c = r && r.secure ? ";secure" : "", u = r && r.partitioned ? ";partitioned" : "";
  document.cookie = `${e}=${t};${o};path=/;samesite=${i}${a}${c}${u}`;
}
function Do(e) {
  return es(document.cookie, e);
}
let li;
function jt(e) {
  return li || (li = Fb(document.cookie)), li.get(e);
}
function Hd(e, t) {
  Po(e, "", 0, t);
}
function zb(e) {
  if (document.cookie === void 0 || document.cookie === null)
    return !1;
  try {
    const t = `dd_cookie_test_${Oe()}`, n = "test";
    Po(t, n, Fe, e);
    const r = Do(t) === n;
    return Hd(t, e), r;
  } catch (t) {
    return V.error(t), !1;
  }
}
let di;
function Gd(e = location.hostname, t = document.referrer) {
  if (di === void 0) {
    const n = Kb(e, t);
    if (n) {
      const r = `dd_site_test_${Oe()}`, s = "test", o = n.split(".");
      let i = o.pop();
      for (; o.length && !Do(r); )
        i = `${o.pop()}.${i}`, Po(r, s, Re, { domain: i });
      Hd(r, { domain: i }), di = i;
    }
  }
  return di;
}
function Kb(e, t) {
  try {
    return e || ps(t).hostname;
  } catch {
  }
}
const en = "_dd_s";
function zd(e, t) {
  for (let n = e.length - 1; n >= 0; n -= 1) {
    const r = e[n];
    if (t(r, n, e))
      return r;
  }
}
function uo(e) {
  return Object.values(e);
}
function Xa(e) {
  return Object.entries(e);
}
const Vn = 4 * Nd, Kd = 15 * Fe, jb = Md, jd = "0", ts = {
  COOKIE: "cookie",
  LOCAL_STORAGE: "local-storage"
}, qd = /^([a-zA-Z]+)=([a-z0-9-]+)$/, Ya = "&";
function qb(e) {
  return !!e && (e.indexOf(Ya) !== -1 || qd.test(e));
}
const Xb = "1";
function ln(e, t) {
  const n = {
    isExpired: Xb
  };
  return t.trackAnonymousUser && (e?.anonymousId ? n.anonymousId = e?.anonymousId : n.anonymousId = Oe()), n;
}
function zs(e) {
  return Bn(e);
}
function Xd(e) {
  return !zs(e);
}
function Gr(e) {
  return e.isExpired !== void 0 || !Yb(e);
}
function Yb(e) {
  return (e.created === void 0 || De() - Number(e.created) < Vn) && (e.expire === void 0 || De() < Number(e.expire));
}
function Yd(e) {
  e.expire = String(De() + Kd);
}
function Jd(e) {
  return Xa(e).map(([t, n]) => t === "anonymousId" ? `aid=${n}` : `${t}=${n}`).join(Ya);
}
function Ja(e) {
  const t = {};
  return qb(e) && e.split(Ya).forEach((n) => {
    const r = qd.exec(n);
    if (r !== null) {
      const [, s, o] = r;
      s === "aid" ? t.anonymousId = o : t[s] = o;
    }
  }), t;
}
const Jb = "_dd", Qb = "_dd_r", Zb = "_dd_l", ew = "rum", tw = "logs";
function nw(e) {
  if (!jt(en)) {
    const n = jt(Jb), r = jt(Qb), s = jt(Zb), o = {};
    n && (o.id = n), s && /^[01]$/.test(s) && (o[tw] = s), r && /^[012]$/.test(r) && (o[ew] = r), Xd(o) && (Yd(o), e.persistSession(o));
  }
}
function gu(e) {
  const t = sw(e);
  return t && zb(t) ? { type: ts.COOKIE, cookieOptions: t } : void 0;
}
function rw(e, t) {
  const n = {
    /**
     * Lock strategy allows mitigating issues due to concurrent access to cookie.
     * This issue concerns only chromium browsers and enabling this on firefox increases cookie write failures.
     */
    isLockEnabled: $b(),
    persistSession: (r) => yu(t, e, r, Kd),
    retrieveSession: Qd,
    expireSession: (r) => yu(t, e, ln(r, e), Vn)
  };
  return nw(n), n;
}
function yu(e, t, n, r) {
  Po(en, Jd(n), t.trackAnonymousUser ? jb : r, e);
}
function Qd() {
  const e = Do(en);
  return Ja(e);
}
function sw(e) {
  const t = {};
  if (t.secure = !!e.useSecureSessionCookie || !!e.usePartitionedCrossSiteSessionCookie, t.crossSite = !!e.usePartitionedCrossSiteSessionCookie, t.partitioned = !!e.usePartitionedCrossSiteSessionCookie, e.trackSessionAcrossSubdomains) {
    const n = Gd();
    if (!n)
      return;
    t.domain = n;
  }
  return t;
}
const ow = "_dd_test_";
function _u() {
  try {
    const e = Oe(), t = `${ow}${e}`;
    localStorage.setItem(t, e);
    const n = localStorage.getItem(t);
    return localStorage.removeItem(t), e === n ? { type: ts.LOCAL_STORAGE } : void 0;
  } catch {
    return;
  }
}
function iw(e) {
  return {
    isLockEnabled: !1,
    persistSession: Zd,
    retrieveSession: aw,
    expireSession: (t) => cw(t, e)
  };
}
function Zd(e) {
  localStorage.setItem(en, Jd(e));
}
function aw() {
  const e = localStorage.getItem(en);
  return Ja(e);
}
function cw(e, t) {
  Zd(ln(e, t));
}
const uw = 10, lw = 100, dw = Re, ef = "--", tf = [];
let Ks;
function dn(e, t, n = 0) {
  var r;
  const { isLockEnabled: s, persistSession: o, expireSession: i } = t, a = (f) => o({ ...f, lock: u }), c = () => {
    const { lock: f, ...p } = t.retrieveSession();
    return {
      session: p,
      lock: f && !pw(f) ? f : void 0
    };
  };
  if (Ks || (Ks = e), e !== Ks) {
    tf.push(e);
    return;
  }
  if (s && n >= lw) {
    bu(t);
    return;
  }
  let u, d = c();
  if (s) {
    if (d.lock) {
      Os(e, t, n);
      return;
    }
    if (u = fw(), a(d.session), d = c(), d.lock !== u) {
      Os(e, t, n);
      return;
    }
  }
  let l = e.process(d.session);
  if (s && (d = c(), d.lock !== u)) {
    Os(e, t, n);
    return;
  }
  if (l && (Gr(l) ? i(l) : (Yd(l), s ? a(l) : o(l))), s && !(l && Gr(l))) {
    if (d = c(), d.lock !== u) {
      Os(e, t, n);
      return;
    }
    o(d.session), l = d.session;
  }
  (r = e.after) === null || r === void 0 || r.call(e, l || d.session), bu(t);
}
function Os(e, t, n) {
  Ie(() => {
    dn(e, t, n + 1);
  }, uw);
}
function bu(e) {
  Ks = void 0;
  const t = tf.shift();
  t && dn(t, e);
}
function fw() {
  return Oe() + ef + te();
}
function pw(e) {
  const [, t] = e.split(ef);
  return !t || le(Number(t), te()) > dw;
}
const wu = Re;
function hw(e) {
  switch (e.sessionPersistence) {
    case ts.COOKIE:
      return gu(e);
    case ts.LOCAL_STORAGE:
      return _u();
    case void 0: {
      let t = gu(e);
      return !t && e.allowFallbackToLocalStorage && (t = _u()), t;
    }
    default:
      V.error(`Invalid session persistence '${String(e.sessionPersistence)}'`);
  }
}
function mw(e, t) {
  return e.type === ts.COOKIE ? rw(t, e.cookieOptions) : iw(t);
}
function gw(e, t, n, r, s = mw(e, t)) {
  const o = new Y(), i = new Y(), a = new Y(), c = Sr(p, wu);
  let u;
  m();
  const { throttled: d, cancel: l } = nn(() => {
    dn({
      process: (b) => {
        if (zs(b))
          return;
        const T = h(b);
        return g(T), T;
      },
      after: (b) => {
        Xd(b) && !y() && E(b), u = b;
      }
    }, s);
  }, wu);
  function f() {
    dn({
      process: (b) => y() ? h(b) : void 0
    }, s);
  }
  function p() {
    const b = s.retrieveSession();
    Gr(b) ? dn({
      process: (T) => Gr(T) ? ln(T, t) : void 0,
      after: h
    }, s) : h(b);
  }
  function h(b) {
    return Gr(b) && (b = ln(b, t)), y() && (_(b) ? w() : (a.notify({ previousState: u, newState: b }), u = b)), b;
  }
  function m() {
    dn({
      process: (b) => {
        if (zs(b))
          return ln(b, t);
      },
      after: (b) => {
        u = b;
      }
    }, s);
  }
  function g(b) {
    if (zs(b))
      return !1;
    const T = r(b[n]);
    b[n] = T, delete b.isExpired, T !== jd && !b.id && (b.id = Oe(), b.created = String(De()));
  }
  function y() {
    return u?.[n] !== void 0;
  }
  function _(b) {
    return u.id !== b.id || u[n] !== b[n];
  }
  function w() {
    u = ln(u, t), i.notify();
  }
  function E(b) {
    u = b, o.notify();
  }
  function S(b) {
    dn({
      process: (T) => ({ ...T, ...b }),
      after: h
    }, s);
  }
  return {
    expandOrRenewSession: d,
    expandSession: f,
    getSession: () => u,
    renewObservable: o,
    expireObservable: i,
    sessionStateUpdateObservable: a,
    restartSession: m,
    expire: () => {
      l(), s.expireSession(u), h(ln(u, t));
    },
    stop: () => {
      Mo(c);
    },
    updateSessionState: S
  };
}
const ta = {
  GRANTED: "granted",
  NOT_GRANTED: "not-granted"
};
function nf(e) {
  const t = new Y();
  return {
    tryToInit(n) {
      e || (e = n);
    },
    update(n) {
      e = n, t.notify();
    },
    isGranted() {
      return e === ta.GRANTED;
    },
    observable: t
  };
}
function Wn(e) {
  return e === null ? "null" : Array.isArray(e) ? "array" : typeof e;
}
function ns(e) {
  const t = Wn(e);
  return t === "string" || t === "function" || e instanceof RegExp;
}
function Uo(e, t, n = !1) {
  return e.some((r) => {
    try {
      if (typeof r == "function")
        return r(t);
      if (r instanceof RegExp)
        return r.test(t);
      if (typeof r == "string")
        return n ? t.startsWith(r) : r === t;
    } catch (s) {
      V.error(s);
    }
    return !1;
  });
}
const rf = ["chrome-extension://", "moz-extension://"];
function Eu(e) {
  return rf.some((t) => e.includes(t));
}
function yw(e, t = "") {
  if (Eu(e))
    return !1;
  const r = t.split(`
`).filter((s) => {
    const o = s.trim();
    return o.length && /^at\s+|@/.test(o);
  })[1] || "";
  return Eu(r);
}
function _w(e = "") {
  for (const t of rf) {
    const n = e.match(new RegExp(`${t}[^/]+`));
    if (n)
      return n[0];
  }
}
function hs(e, t, n) {
  if (typeof e != "object" || e === null)
    return JSON.stringify(e);
  const r = er(Object.prototype), s = er(Array.prototype), o = er(Object.getPrototypeOf(e)), i = er(e);
  try {
    return JSON.stringify(e, t, n);
  } catch {
    return "<error: unable to serialize object>";
  } finally {
    r(), s(), o(), i();
  }
}
function er(e) {
  const t = e, n = t.toJSON;
  return n ? (delete t.toJSON, () => {
    t.toJSON = n;
  }) : q;
}
const bw = 220 * xn, ww = "$", Ew = 3;
function se(e, t = bw) {
  const n = er(Object.prototype), r = er(Array.prototype), s = [], o = /* @__PURE__ */ new WeakMap(), i = fi(e, ww, void 0, s, o), a = JSON.stringify(i);
  let c = a ? a.length : 0;
  if (c > t) {
    pi(t, "discarded", e);
    return;
  }
  for (; s.length > 0 && c < t; ) {
    const u = s.shift();
    let d = 0;
    if (Array.isArray(u.source))
      for (let l = 0; l < u.source.length; l++) {
        const f = fi(u.source[l], u.path, l, s, o);
        if (f !== void 0 ? c += JSON.stringify(f).length : c += 4, c += d, d = 1, c > t) {
          pi(t, "truncated", e);
          break;
        }
        u.target[l] = f;
      }
    else
      for (const l in u.source)
        if (Object.prototype.hasOwnProperty.call(u.source, l)) {
          const f = fi(u.source[l], u.path, l, s, o);
          if (f !== void 0 && (c += JSON.stringify(f).length + d + l.length + Ew, d = 1), c > t) {
            pi(t, "truncated", e);
            break;
          }
          u.target[l] = f;
        }
  }
  return n(), r(), i;
}
function fi(e, t, n, r, s) {
  const o = vw(e);
  if (!o || typeof o != "object")
    return Sw(o);
  const i = na(o);
  if (i !== "[Object]" && i !== "[Array]" && i !== "[Error]")
    return i;
  const a = e;
  if (s.has(a))
    return `[Reference seen at ${s.get(a)}]`;
  const c = n !== void 0 ? `${t}.${n}` : t, u = Array.isArray(o) ? [] : {};
  return s.set(a, c), r.push({ source: o, target: u, path: c }), u;
}
function Sw(e) {
  return typeof e == "bigint" ? `[BigInt] ${e.toString()}` : typeof e == "function" ? `[Function] ${e.name || "unknown"}` : typeof e == "symbol" ? `[Symbol] ${e.description || e.toString()}` : e;
}
function na(e) {
  try {
    if (e instanceof Event)
      return Tw(e);
    if (e instanceof RegExp)
      return `[RegExp] ${e.toString()}`;
    const n = Object.prototype.toString.call(e).match(/\[object (.*)\]/);
    if (n && n[1])
      return `[${n[1]}]`;
  } catch {
  }
  return "[Unserializable]";
}
function Tw(e) {
  return {
    type: e.type,
    isTrusted: e.isTrusted,
    currentTarget: e.currentTarget ? na(e.currentTarget) : null,
    target: e.target ? na(e.target) : null
  };
}
function vw(e) {
  const t = e;
  if (t && typeof t.toJSON == "function")
    try {
      return t.toJSON();
    } catch {
    }
  return e;
}
function pi(e, t, n) {
  V.warn(`The data provided has been ${t} as it is over the limit of ${e} characters:`, n);
}
const mr = "?";
function Tr(e) {
  var t, n;
  const r = [];
  let s = hi(e, "stack");
  const o = String(e);
  if (s && s.startsWith(o) && (s = s.slice(o.length)), s && s.split(`
`).forEach((i) => {
    const a = Cw(i) || Rw(i) || Ow(i) || Mw(i);
    a && (!a.func && a.line && (a.func = mr), r.push(a));
  }), r.length > 0 && Fw() && e instanceof Error) {
    const i = [];
    let a = e;
    for (; (a = Object.getPrototypeOf(a)) && of(a); ) {
      const c = ((t = a.constructor) === null || t === void 0 ? void 0 : t.name) || mr;
      i.push(c);
    }
    for (let c = i.length - 1; c >= 0 && ((n = r[0]) === null || n === void 0 ? void 0 : n.func) === i[c]; c--)
      r.shift();
  }
  return {
    message: hi(e, "message"),
    name: hi(e, "name"),
    stack: r
  };
}
const sf = "((?:file|https?|blob|chrome-extension|electron|native|eval|webpack|snippet|<anonymous>|\\w+\\.|\\/).*?)", gr = "(?::(\\d+))", Iw = new RegExp(`^\\s*at (.*?) ?\\(${sf}${gr}?${gr}?\\)?\\s*$`, "i"), kw = new RegExp(`\\((\\S*)${gr}${gr}\\)`);
function Cw(e) {
  const t = Iw.exec(e);
  if (!t)
    return;
  const n = t[2] && t[2].indexOf("native") === 0, r = t[2] && t[2].indexOf("eval") === 0, s = kw.exec(t[2]);
  return r && s && (t[2] = s[1], t[3] = s[2], t[4] = s[3]), {
    args: n ? [t[2]] : [],
    column: t[4] ? +t[4] : void 0,
    func: t[1] || mr,
    line: t[3] ? +t[3] : void 0,
    url: n ? void 0 : t[2]
  };
}
const Aw = new RegExp(`^\\s*at ?${sf}${gr}?${gr}??\\s*$`, "i");
function Rw(e) {
  const t = Aw.exec(e);
  if (t)
    return {
      args: [],
      column: t[3] ? +t[3] : void 0,
      func: mr,
      line: t[2] ? +t[2] : void 0,
      url: t[1]
    };
}
const xw = /^\s*at (?:((?:\[object object\])?.+) )?\(?((?:file|ms-appx|https?|webpack|blob):.*?):(\d+)(?::(\d+))?\)?\s*$/i;
function Ow(e) {
  const t = xw.exec(e);
  if (t)
    return {
      args: [],
      column: t[4] ? +t[4] : void 0,
      func: t[1] || mr,
      line: +t[3],
      url: t[2]
    };
}
const Lw = /^\s*(.*?)(?:\((.*?)\))?(?:(?:(?:^|@)((?:file|https?|blob|chrome|webpack|resource|capacitor|\[native).*?|[^@]*bundle|\[wasm code\])(?::(\d+))?(?::(\d+))?)|@)\s*$/i, Nw = /(\S+) line (\d+)(?: > eval line \d+)* > eval/i;
function Mw(e) {
  const t = Lw.exec(e);
  if (!t)
    return;
  const n = t[3] && t[3].indexOf(" > eval") > -1, r = Nw.exec(t[3]);
  return n && r && (t[3] = r[1], t[4] = r[2], t[5] = void 0), {
    args: t[2] ? t[2].split(",") : [],
    column: t[5] ? +t[5] : void 0,
    func: t[1] || mr,
    line: t[4] ? +t[4] : void 0,
    url: t[3]
  };
}
function hi(e, t) {
  if (typeof e != "object" || !e || !(t in e))
    return;
  const n = e[t];
  return typeof n == "string" ? n : void 0;
}
function Pw(e, t, n, r) {
  if (t === void 0)
    return;
  const { name: s, message: o } = Uw(e);
  return {
    name: s,
    message: o,
    stack: [{ url: t, column: r, line: n }]
  };
}
const Dw = /^(?:[Uu]ncaught (?:exception: )?)?(?:((?:Eval|Internal|Range|Reference|Syntax|Type|URI|)Error): )?([\s\S]*)$/;
function Uw(e) {
  let t, n;
  return {}.toString.call(e) === "[object String]" && ([, t, n] = Dw.exec(e)), { name: t, message: n };
}
function of(e) {
  return String(e.constructor).startsWith("class ");
}
let Ls;
function Fw() {
  if (Ls !== void 0)
    return Ls;
  class e extends Error {
    constructor() {
      super(), this.name = "Error";
    }
  }
  const [t, n] = [e, Error].map((r) => new r());
  return Ls = // If customError is not a class, it means that this was built with ES5 as target, converting the class to a normal object.
  // Thus, error constructors will be reported on all browsers, which is the expected behavior.
  of(Object.getPrototypeOf(t)) && // If the browser is correctly reporting the stacktrace, the normal error stacktrace should be the same as the custom error stacktrace
  n.stack !== t.stack, Ls;
}
function yr(e) {
  const n = new Error(e);
  n.name = "HandlingStack";
  let r;
  return xt(() => {
    const s = Tr(n);
    s.stack = s.stack.slice(2), r = vr(s);
  }), r;
}
function vr(e) {
  let t = af(e);
  return e.stack.forEach((n) => {
    const r = n.func === "?" ? "<anonymous>" : n.func, s = n.args && n.args.length > 0 ? `(${n.args.join(", ")})` : "", o = n.line ? `:${n.line}` : "", i = n.line && n.column ? `:${n.column}` : "";
    t += `
  at ${r}${s} @ ${n.url}${o}${i}`;
  }), t;
}
function af(e) {
  return `${e.name || "Error"}: ${e.message}`;
}
const cf = "No stack, consider using an instance of Error";
function Fo({ stackTrace: e, originalError: t, handlingStack: n, componentStack: r, startClocks: s, nonErrorPrefix: o, useFallbackStack: i = !0, source: a, handling: c }) {
  const u = Hn(t);
  return !e && u && (e = Tr(t)), {
    startClocks: s,
    source: a,
    handling: c,
    handlingStack: n,
    componentStack: r,
    originalError: t,
    type: e ? e.name : void 0,
    message: $w(e, u, o, t),
    stack: e ? vr(e) : i ? cf : void 0,
    causes: u ? Hw(t, a) : void 0,
    fingerprint: Bw(t),
    context: Vw(t)
  };
}
function $w(e, t, n, r) {
  return e?.message && e?.name ? e.message : t ? "Empty message" : `${n} ${hs(se(r))}`;
}
function Bw(e) {
  return Hn(e) && "dd_fingerprint" in e ? String(e.dd_fingerprint) : void 0;
}
function Vw(e) {
  if (e !== null && typeof e == "object" && "dd_context" in e)
    return e.dd_context;
}
function Ww(e) {
  var t;
  return (t = /@ (.+)/.exec(e)) === null || t === void 0 ? void 0 : t[1];
}
function Hn(e) {
  return e instanceof Error || Object.prototype.toString.call(e) === "[object Error]";
}
function Hw(e, t) {
  let n = e;
  const r = [];
  for (; Hn(n?.cause) && r.length < 10; ) {
    const s = Tr(n.cause);
    r.push({
      message: n.cause.message,
      source: t,
      type: s?.name,
      stack: s && vr(s)
    }), n = n.cause;
  }
  return r.length ? r : void 0;
}
var Lt;
(function(e) {
  e.TRACK_INTAKE_REQUESTS = "track_intake_requests", e.WRITABLE_RESOURCE_GRAPHQL = "writable_resource_graphql", e.USE_TREE_WALKER_FOR_ACTION_NAME = "use_tree_walker_for_action_name", e.GRAPHQL_TRACKING = "graphql_tracking", e.FEATURE_OPERATION_VITAL = "feature_operation_vital", e.SHORT_SESSION_INVESTIGATION = "short_session_investigation";
})(Lt || (Lt = {}));
const Qa = /* @__PURE__ */ new Set();
function uf(e) {
  Array.isArray(e) && Gw(e.filter((t) => io(Lt, t)));
}
function Gw(e) {
  e.forEach((t) => {
    Qa.add(t);
  });
}
function Ir(e) {
  return Qa.has(e);
}
function zw() {
  return Qa;
}
const Kw = 200;
function $o(e) {
  const { env: t, service: n, version: r, datacenter: s, sdkVersion: o, variant: i } = e, a = [on("sdk_version", o ?? "6.21.2")];
  return t && a.push(on("env", t)), n && a.push(on("service", n)), r && a.push(on("version", r)), s && a.push(on("datacenter", s)), i && a.push(on("variant", i)), a;
}
function on(e, t) {
  const n = t ? `${e}:${t}` : e;
  return (n.length > Kw || jw(n)) && V.warn(`Tag ${n} doesn't meet tag requirements and will be sanitized. ${za} ${Lo}/getting_started/tagging/#defining-tags`), lf(n);
}
function lf(e) {
  return e.replace(/,/g, "_");
}
function jw(e) {
  return qw() ? new RegExp("[^\\p{Ll}\\p{Lo}0-9_:./-]", "u").test(e) : !1;
}
function qw() {
  try {
    return new RegExp("[\\p{Ll}]", "u"), !0;
  } catch {
    return !1;
  }
}
const df = "datad0g.com", Xw = "dd0g-gov.com", _n = "datadoghq.com", Yw = "datadoghq.eu", Jw = "ddog-gov.com", Qw = "pci.browser-intake-datadoghq.com", Zw = ["ddsource", "dd-api-key", "dd-request-id"];
function Bo(e, t) {
  const n = ut.__ddBrowserSdkExtensionCallback;
  n && n({ type: e, payload: t });
}
function lo(e, t, n = eE()) {
  if (t === void 0)
    return e;
  if (typeof t != "object" || t === null)
    return t;
  if (t instanceof Date)
    return new Date(t.getTime());
  if (t instanceof RegExp) {
    const s = t.flags || // old browsers compatibility
    [
      t.global ? "g" : "",
      t.ignoreCase ? "i" : "",
      t.multiline ? "m" : "",
      t.sticky ? "y" : "",
      t.unicode ? "u" : ""
    ].join("");
    return new RegExp(t.source, s);
  }
  if (n.hasAlreadyBeenSeen(t))
    return;
  if (Array.isArray(t)) {
    const s = Array.isArray(e) ? e : [];
    for (let o = 0; o < t.length; ++o)
      s[o] = lo(s[o], t[o], n);
    return s;
  }
  const r = Wn(e) === "object" ? e : {};
  for (const s in t)
    Object.prototype.hasOwnProperty.call(t, s) && (r[s] = lo(r[s], t[s], n));
  return r;
}
function Vo(e) {
  return lo(void 0, e);
}
function Ze(...e) {
  let t;
  for (const n of e)
    n != null && (t = lo(t, n));
  return t;
}
function eE() {
  if (typeof WeakSet < "u") {
    const t = /* @__PURE__ */ new WeakSet();
    return {
      hasAlreadyBeenSeen(n) {
        const r = t.has(n);
        return r || t.add(n), r;
      }
    };
  }
  const e = [];
  return {
    hasAlreadyBeenSeen(t) {
      const n = e.indexOf(t) >= 0;
      return n || e.push(t), n;
    }
  };
}
function ff() {
  var e;
  const t = ut.navigator;
  return {
    status: t.onLine ? "connected" : "not_connected",
    interfaces: t.connection && t.connection.type ? [t.connection.type] : void 0,
    effective_type: (e = t.connection) === null || e === void 0 ? void 0 : e.effectiveType
  };
}
function pf(e) {
  return e >= 500;
}
function hf(e) {
  try {
    return e.clone();
  } catch {
    return;
  }
}
const ze = {
  AGENT: "agent",
  CONSOLE: "console",
  CUSTOM: "custom",
  LOGGER: "logger",
  NETWORK: "network",
  SOURCE: "source",
  REPORT: "report"
}, tE = 80 * xn, nE = 32, mf = 20 * Dd, rE = Fe, gf = Re;
function yf(e, t, n, r, s, o) {
  t.transportStatus === 0 && t.queuedPayloads.size() === 0 && t.bandwidthMonitor.canHandle(e) ? bf(e, t, n, o, {
    onSuccess: () => wf(0, t, n, r, s, o),
    onFailure: () => {
      t.queuedPayloads.enqueue(e) || o.notify({ type: "queue-full", bandwidth: t.bandwidthMonitor.stats(), payload: e }), _f(t, n, r, s, o);
    }
  }) : t.queuedPayloads.enqueue(e) || o.notify({ type: "queue-full", bandwidth: t.bandwidthMonitor.stats(), payload: e });
}
function _f(e, t, n, r, s) {
  e.transportStatus === 2 && Ie(() => {
    const o = e.queuedPayloads.first();
    bf(o, e, t, s, {
      onSuccess: () => {
        e.queuedPayloads.dequeue(), e.currentBackoffTime = gf, wf(1, e, t, n, r, s);
      },
      onFailure: () => {
        e.currentBackoffTime = Math.min(rE, e.currentBackoffTime * 2), _f(e, t, n, r, s);
      }
    });
  }, e.currentBackoffTime);
}
function bf(e, t, n, r, { onSuccess: s, onFailure: o }) {
  t.bandwidthMonitor.add(e), n(e, (i) => {
    t.bandwidthMonitor.remove(e), sE(i) ? (t.transportStatus = t.bandwidthMonitor.ongoingRequestCount > 0 ? 1 : 2, e.retry = {
      count: e.retry ? e.retry.count + 1 : 1,
      lastFailureStatus: i.status
    }, r.notify({ type: "failure", bandwidth: t.bandwidthMonitor.stats(), payload: e }), o()) : (t.transportStatus = 0, r.notify({ type: "success", bandwidth: t.bandwidthMonitor.stats(), payload: e }), s());
  });
}
function wf(e, t, n, r, s, o) {
  e === 0 && t.queuedPayloads.isFull() && !t.queueFullReported && (s({
    message: `Reached max ${r} events size queued for upload: ${mf / Dd}MiB`,
    source: ze.AGENT,
    startClocks: pe()
  }), t.queueFullReported = !0);
  const i = t.queuedPayloads;
  for (t.queuedPayloads = Ef(); i.size() > 0; )
    yf(i.dequeue(), t, n, r, s, o);
}
function sE(e) {
  return e.type !== "opaque" && (e.status === 0 && !navigator.onLine || e.status === 408 || e.status === 429 || pf(e.status));
}
function oE() {
  return {
    transportStatus: 0,
    currentBackoffTime: gf,
    bandwidthMonitor: iE(),
    queuedPayloads: Ef(),
    queueFullReported: !1
  };
}
function Ef() {
  const e = [];
  return {
    bytesCount: 0,
    enqueue(t) {
      return this.isFull() ? !1 : (e.push(t), this.bytesCount += t.bytesCount, !0);
    },
    first() {
      return e[0];
    },
    dequeue() {
      const t = e.shift();
      return t && (this.bytesCount -= t.bytesCount), t;
    },
    size() {
      return e.length;
    },
    isFull() {
      return this.bytesCount >= mf;
    }
  };
}
function iE() {
  return {
    ongoingRequestCount: 0,
    ongoingByteCount: 0,
    canHandle(e) {
      return this.ongoingRequestCount === 0 || this.ongoingByteCount + e.bytesCount <= tE && this.ongoingRequestCount < nE;
    },
    add(e) {
      this.ongoingRequestCount += 1, this.ongoingByteCount += e.bytesCount;
    },
    remove(e) {
      this.ongoingRequestCount -= 1, this.ongoingByteCount -= e.bytesCount;
    },
    stats() {
      return {
        ongoingByteCount: this.ongoingByteCount,
        ongoingRequestCount: this.ongoingRequestCount
      };
    }
  };
}
function Wo(e, t, n) {
  const r = new Y(), s = oE();
  return {
    observable: r,
    send: (o) => {
      for (const i of e)
        yf(o, s, (a, c) => uE(i, t, a, c), i.trackType, n, r);
    },
    /**
     * Since fetch keepalive behaves like regular fetch on Firefox,
     * keep using sendBeaconStrategy on exit
     */
    sendOnExit: (o) => {
      for (const i of e)
        aE(i, t, o);
    }
  };
}
function aE(e, t, n) {
  if (!!navigator.sendBeacon && n.bytesCount < t)
    try {
      const s = e.build("beacon", n);
      if (navigator.sendBeacon(s, n.data))
        return;
    } catch (s) {
      cE(s);
    }
  ra(e, n);
}
let Su = !1;
function cE(e) {
  Su || (Su = !0, ot(e));
}
function uE(e, t, n, r) {
  if (lE() && n.bytesCount < t) {
    const o = e.build("fetch-keepalive", n);
    fetch(o, { method: "POST", body: n.data, keepalive: !0, mode: "cors" }).then(M((i) => r?.({ status: i.status, type: i.type }))).catch(M(() => ra(e, n, r)));
  } else
    ra(e, n, r);
}
function ra(e, t, n) {
  const r = e.build("fetch", t);
  fetch(r, { method: "POST", body: t.data, mode: "cors" }).then(M((s) => n?.({ status: s.status, type: s.type }))).catch(M(() => n?.({ status: 0 })));
}
function lE() {
  try {
    return window.Request && "keepalive" in new Request("http://a");
  } catch {
    return !1;
  }
}
function Gn() {
  const e = dE();
  if (e)
    return {
      getCapabilities() {
        var t;
        return JSON.parse(((t = e.getCapabilities) === null || t === void 0 ? void 0 : t.call(e)) || "[]");
      },
      getPrivacyLevel() {
        var t;
        return (t = e.getPrivacyLevel) === null || t === void 0 ? void 0 : t.call(e);
      },
      getAllowedWebViewHosts() {
        return JSON.parse(e.getAllowedWebViewHosts());
      },
      send(t, n, r) {
        const s = r ? { id: r } : void 0;
        e.send(JSON.stringify({ eventType: t, event: n, view: s }));
      }
    };
}
function Sf(e) {
  const t = Gn();
  return !!t && t.getCapabilities().includes(e);
}
function Et(e) {
  var t;
  e === void 0 && (e = (t = Ge().location) === null || t === void 0 ? void 0 : t.hostname);
  const n = Gn();
  return !!n && n.getAllowedWebViewHosts().some((r) => e === r || e.endsWith(`.${r}`));
}
function dE() {
  return Ge().DatadogEventBridge;
}
function ce(e, t, n, r, s) {
  return He(e, t, [n], r, s);
}
function He(e, t, n, r, { once: s, capture: o, passive: i } = {}) {
  const a = M((f) => {
    !f.isTrusted && !f.__ddIsTrusted && !e.allowUntrustedEvents || (s && l(), r(f));
  }), c = i ? { capture: o, passive: i } : o, u = window.EventTarget && t instanceof EventTarget ? window.EventTarget.prototype : t, d = Zt(u, "addEventListener");
  n.forEach((f) => d.call(t, f, a, c));
  function l() {
    const f = Zt(u, "removeEventListener");
    n.forEach((p) => f.call(t, p, a, c));
  }
  return {
    stop: l
  };
}
const ir = {
  HIDDEN: "visibility_hidden",
  UNLOADING: "before_unload",
  PAGEHIDE: "page_hide",
  FROZEN: "page_frozen"
};
function Tf(e) {
  return new Y((t) => {
    const { stop: n } = He(e, window, [
      "visibilitychange",
      "freeze"
      /* DOM_EVENT.FREEZE */
    ], (s) => {
      s.type === "visibilitychange" && document.visibilityState === "hidden" ? t.notify({ reason: ir.HIDDEN }) : s.type === "freeze" && t.notify({ reason: ir.FROZEN });
    }, { capture: !0 }), r = ce(e, window, "beforeunload", () => {
      t.notify({ reason: ir.UNLOADING });
    }).stop;
    return () => {
      n(), r();
    };
  });
}
function vf(e) {
  return uo(ir).includes(e);
}
function Za({ encoder: e, request: t, flushController: n, messageBytesLimit: r }) {
  let s = {};
  const o = n.flushObservable.subscribe((l) => d(l));
  function i(l, f, p) {
    n.notifyBeforeAddMessage(f), p !== void 0 ? (s[p] = l, n.notifyAfterAddMessage()) : e.write(e.isEmpty ? l : `
${l}`, (h) => {
      n.notifyAfterAddMessage(h - f);
    });
  }
  function a(l) {
    return l !== void 0 && s[l] !== void 0;
  }
  function c(l) {
    const f = s[l];
    delete s[l];
    const p = e.estimateEncodedBytesCount(f);
    n.notifyAfterRemoveMessage(p);
  }
  function u(l, f) {
    const p = hs(l), h = e.estimateEncodedBytesCount(p);
    if (h >= r) {
      V.warn(`Discarded a message whose size was bigger than the maximum allowed size ${r}KB. ${za} ${kb}/#technical-limitations`);
      return;
    }
    a(f) && c(f), i(p, h, f);
  }
  function d(l) {
    const f = uo(s).join(`
`);
    s = {};
    const p = vf(l.reason), h = p ? t.sendOnExit : t.send;
    if (p && // Note: checking that the encoder is async is not strictly needed, but it's an optimization:
    // if the encoder is async we need to send two requests in some cases (one for encoded data
    // and the other for non-encoded data). But if it's not async, we don't have to worry about
    // it and always send a single request.
    e.isAsync) {
      const m = e.finishSync();
      m.outputBytesCount && h(Tu(m));
      const g = [m.pendingData, f].filter(Boolean).join(`
`);
      g && h({
        data: g,
        bytesCount: Ud(g)
      });
    } else
      f && e.write(e.isEmpty ? f : `
${f}`), e.finish((m) => {
        h(Tu(m));
      });
  }
  return {
    flushController: n,
    add: u,
    upsert: u,
    stop: o.unsubscribe
  };
}
function Tu(e) {
  let t;
  return typeof e.output == "string" ? t = e.output : t = new Blob([e.output], {
    // This will set the 'Content-Type: text/plain' header. Reasoning:
    // * The intake rejects the request if there is no content type.
    // * The browser will issue CORS preflight requests if we set it to 'application/json', which
    // could induce higher intake load (and maybe has other impacts).
    // * Also it's not quite JSON, since we are concatenating multiple JSON objects separated by
    // new lines.
    type: "text/plain"
  }), {
    data: t,
    bytesCount: e.outputBytesCount,
    encoding: e.encoding
  };
}
function ec({ messagesLimit: e, bytesLimit: t, durationLimit: n, pageMayExitObservable: r, sessionExpireObservable: s }) {
  const o = r.subscribe((h) => d(h.reason)), i = s.subscribe(() => d("session_expire")), a = new Y(() => () => {
    o.unsubscribe(), i.unsubscribe();
  });
  let c = 0, u = 0;
  function d(h) {
    if (u === 0)
      return;
    const m = u, g = c;
    u = 0, c = 0, p(), a.notify({
      reason: h,
      messagesCount: m,
      bytesCount: g
    });
  }
  let l;
  function f() {
    l === void 0 && (l = Ie(() => {
      d("duration_limit");
    }, n));
  }
  function p() {
    Be(l), l = void 0;
  }
  return {
    flushObservable: a,
    get messagesCount() {
      return u;
    },
    /**
     * Notifies that a message will be added to a pool of pending messages waiting to be flushed.
     *
     * This function needs to be called synchronously, right before adding the message, so no flush
     * event can happen after `notifyBeforeAddMessage` and before adding the message.
     *
     * @param estimatedMessageBytesCount - an estimation of the message bytes count once it is
     * actually added.
     */
    notifyBeforeAddMessage(h) {
      c + h >= t && d("bytes_limit"), u += 1, c += h, f();
    },
    /**
     * Notifies that a message *was* added to a pool of pending messages waiting to be flushed.
     *
     * This function can be called asynchronously after the message was added, but in this case it
     * should not be called if a flush event occurred in between.
     *
     * @param messageBytesCountDiff - the difference between the estimated message bytes count and
     * its actual bytes count once added to the pool.
     */
    notifyAfterAddMessage(h = 0) {
      c += h, u >= e ? d("messages_limit") : c >= t && d("bytes_limit");
    },
    /**
     * Notifies that a message was removed from a pool of pending messages waiting to be flushed.
     *
     * This function needs to be called synchronously, right after removing the message, so no flush
     * event can happen after removing the message and before `notifyAfterRemoveMessage`.
     *
     * @param messageBytesCount - the message bytes count that was added to the pool. Should
     * correspond to the sum of bytes counts passed to `notifyBeforeAddMessage` and
     * `notifyAfterAddMessage`.
     */
    notifyAfterRemoveMessage(h) {
      c -= h, u -= 1, u === 0 && p();
    }
  };
}
const lt = "DISCARDED", Ae = "SKIPPED";
function If() {
  const e = {};
  return {
    register(t, n) {
      return e[t] || (e[t] = []), e[t].push(n), {
        unregister: () => {
          e[t] = e[t].filter((r) => r !== n);
        }
      };
    },
    triggerHook(t, n) {
      const r = e[t] || [], s = [];
      for (const o of r) {
        const i = o(n);
        if (i === lt)
          return lt;
        i !== Ae && s.push(i);
      }
      return Ze(...s);
    }
  };
}
const Yt = {
  LOG: "log",
  CONFIGURATION: "configuration",
  USAGE: "usage"
}, fE = [
  "https://www.datadoghq-browser-agent.com",
  "https://www.datad0g-browser-agent.com",
  "https://d3uc069fcn7uxw.cloudfront.net",
  "https://d20xtzwzcl0ceb.cloudfront.net",
  "http://localhost",
  "<anonymous>"
], pE = 1, hE = [Jw];
let mi;
function kr() {
  return mi || (mi = new Vd(100)), mi;
}
function kf(e, t, n, r, s, o) {
  const i = new Y(), { stop: a } = gE(t, r, s, o, i), { enabled: c, metricsEnabled: u } = mE(e, t, n, i);
  return {
    stop: a,
    enabled: c,
    metricsEnabled: u
  };
}
function mE(e, t, n, r, s = pE) {
  const o = {}, i = !hE.includes(t.site) && Kt(t.telemetrySampleRate), a = {
    [Yt.LOG]: i,
    [Yt.CONFIGURATION]: i && Kt(t.telemetryConfigurationSampleRate),
    [Yt.USAGE]: i && Kt(t.telemetryUsageSampleRate),
    // not an actual "type" but using a single draw for all metrics
    metric: i && Kt(s)
  }, c = yE(), u = kr();
  return u.subscribe(({ rawEvent: l, metricName: f }) => {
    if (f && !a.metric || !a[l.type])
      return;
    const p = f || l.status || l.type;
    let h = o[p];
    if (h || (h = o[p] = /* @__PURE__ */ new Set()), h.size >= t.maxTelemetryEventsPerPage)
      return;
    const m = hs(l);
    if (h.has(m))
      return;
    const g = n.triggerHook(1, {
      startTime: pe().relative
    });
    if (g === lt)
      return;
    const y = d(g, e, l, c);
    r.notify(y), Bo("telemetry", y), h.add(m);
  }), u.unbuffer(), Pb(tc), {
    enabled: i,
    metricsEnabled: a.metric
  };
  function d(l, f, p, h) {
    const g = {
      type: "telemetry",
      date: pe().timeStamp,
      service: f,
      version: "6.21.2",
      source: "browser",
      _dd: {
        format_version: 2
      },
      telemetry: Ze(p, {
        runtime_env: h,
        connectivity: ff(),
        sdk_setup: "npm"
      }),
      ddtags: $o(t).join(","),
      experimental_features: Array.from(zw())
    };
    return Ze(g, l);
  }
}
function gE(e, t, n, r, s) {
  const o = [];
  if (Et()) {
    const i = Gn(), a = s.subscribe((c) => i.send("internal_telemetry", c));
    o.push(a.unsubscribe);
  } else {
    const i = [e.rumEndpointBuilder];
    e.replica && _E(e) && i.push(e.replica.rumEndpointBuilder);
    const a = Za({
      encoder: r(
        4
        /* DeflateEncoderStreamId.TELEMETRY */
      ),
      request: Wo(i, e.batchBytesLimit, t),
      flushController: ec({
        messagesLimit: e.batchMessagesLimit,
        bytesLimit: e.batchBytesLimit,
        durationLimit: e.flushTimeout,
        pageMayExitObservable: n,
        // We don't use an actual session expire observable here, to make telemetry collection
        // independent of the session. This allows to start and send telemetry events earlier.
        sessionExpireObservable: new Y()
      }),
      messageBytesLimit: e.messageBytesLimit
    });
    o.push(a.stop);
    const c = s.subscribe(a.add);
    o.push(c.unsubscribe);
  }
  return {
    stop: () => o.forEach((i) => i())
  };
}
function yE() {
  var e;
  return {
    is_local_file: ((e = ut.location) === null || e === void 0 ? void 0 : e.protocol) === "file:",
    is_worker: On
  };
}
function _E(e) {
  return e.site === df;
}
function Dt(e, t) {
  ea(ge.debug, e, t), kr().notify({
    rawEvent: {
      type: Yt.LOG,
      message: e,
      status: "debug",
      ...t
    }
  });
}
function tc(e, t) {
  kr().notify({
    rawEvent: {
      type: Yt.LOG,
      status: "error",
      ...bE(e),
      ...t
    }
  });
}
function Cf(e) {
  kr().notify({
    rawEvent: {
      type: Yt.CONFIGURATION,
      configuration: e
    }
  });
}
function ms(e, t) {
  kr().notify({
    rawEvent: {
      type: Yt.LOG,
      message: e,
      status: "debug",
      ...t
    },
    metricName: e
  });
}
function Ee(e) {
  kr().notify({
    rawEvent: {
      type: Yt.USAGE,
      usage: e
    }
  });
}
function bE(e) {
  if (Hn(e)) {
    const t = Tr(e);
    return {
      error: {
        kind: t.name,
        stack: vr(wE(t))
      },
      message: t.message
    };
  }
  return {
    error: {
      stack: cf
    },
    message: `Uncaught ${hs(e)}`
  };
}
function wE(e) {
  return e.stack = e.stack.filter((t) => !t.url || fE.some((n) => t.url.startsWith(n))), e;
}
const vu = "Running the Browser SDK in a Web extension content script is discouraged and will be forbidden in a future major release unless the `allowedTrackingOrigins` option is provided.", EE = "SDK initialized on a non-allowed domain.";
function SE(e, t, n = typeof location < "u" ? location.origin : "") {
  const r = e.allowedTrackingOrigins;
  if (!r) {
    if (yw(n, t)) {
      V.warn(vu);
      const o = _w(t);
      Dt(vu, {
        extensionUrl: o || "unknown"
      });
    }
    return !0;
  }
  const s = Uo(r, n);
  return s || V.error(EE), s;
}
function fn(e, t, n) {
  const r = TE(e, t);
  return {
    build(s, o) {
      const i = vE(e, t, s, o, n);
      return r(i);
    },
    trackType: t
  };
}
function TE(e, t) {
  const n = `/api/v2/${t}`, r = e.proxy;
  if (typeof r == "string") {
    const o = qa(r);
    return (i) => `${o}?ddforward=${encodeURIComponent(`${n}?${i}`)}`;
  }
  if (typeof r == "function")
    return (o) => r({ path: n, parameters: o });
  const s = Af(t, e);
  return (o) => `https://${s}${n}?${o}`;
}
function Af(e, t) {
  const { site: n = _n, internalAnalyticsSubdomain: r } = t;
  if (e === "logs" && t.usePciIntake && n === _n)
    return Qw;
  if (r && n === _n)
    return `${r}.${_n}`;
  if (n === Xw)
    return `http-intake.logs.${n}`;
  const s = n.split("."), o = s.pop();
  return `browser-intake-${s.join("-")}.${o}`;
}
function vE({ clientToken: e, internalAnalyticsSubdomain: t, source: n = "browser" }, r, s, { retry: o, encoding: i }, a = []) {
  const c = [
    `ddsource=${n}`,
    `dd-api-key=${e}`,
    `dd-evp-origin-version=${encodeURIComponent("6.21.2")}`,
    "dd-evp-origin=browser",
    `dd-request-id=${Oe()}`
  ].concat(a);
  return i && c.push(`dd-evp-encoding=${i}`), r === "rum" && (c.push(`batch_time=${te()}`, `_dd.api=${s}`), o && c.push(`_dd.retry_count=${o.count}`, `_dd.retry_after=${o.lastFailureStatus}`)), t && c.reverse(), c.join("&");
}
function IE(e) {
  const t = e.site || _n, n = kE(e.source), r = CE({ ...e, site: t, source: n });
  return {
    replica: AE({ ...e, site: t, source: n }),
    site: t,
    source: n,
    ...r
  };
}
function kE(e) {
  return e === "flutter" || e === "unity" ? e : "browser";
}
function CE(e) {
  return {
    logsEndpointBuilder: fn(e, "logs"),
    rumEndpointBuilder: fn(e, "rum"),
    profilingEndpointBuilder: fn(e, "profile"),
    sessionReplayEndpointBuilder: fn(e, "replay"),
    exposuresEndpointBuilder: fn(e, "exposures")
  };
}
function AE(e) {
  if (!e.replica)
    return;
  const t = {
    ...e,
    site: _n,
    clientToken: e.replica.clientToken
  };
  return {
    logsEndpointBuilder: fn(t, "logs"),
    rumEndpointBuilder: fn(t, "rum", [
      `application.id=${e.replica.applicationId}`
    ])
  };
}
function Rf(e) {
  return Zw.every((t) => e.includes(t));
}
const tr = {
  ALLOW: "allow",
  MASK: "mask",
  MASK_USER_INPUT: "mask-user-input",
  MASK_UNLESS_ALLOWLISTED: "mask-unless-allowlisted"
}, sa = {
  ALL: "all",
  SAMPLED: "sampled"
};
function gi(e, t) {
  return e != null && typeof e != "string" ? (V.error(`${t} must be defined as a string`), !1) : !0;
}
function RE(e) {
  return e && typeof e == "string" && !/(datadog|ddog|datad0g|dd0g)/.test(e) ? (V.error(`Site should be a valid Datadog site. ${za} ${Lo}/getting_started/site/.`), !1) : !0;
}
function nr(e, t) {
  return e !== void 0 && !Cb(e) ? (V.error(`${t} Sample Rate should be a number between 0 and 100`), !1) : !0;
}
function xf(e, t) {
  var n, r, s, o, i, a, c, u, d, l;
  if (!e || !e.clientToken) {
    V.error("Client Token is not configured, we will not send any data.");
    return;
  }
  if (e.allowedTrackingOrigins !== void 0 && !Array.isArray(e.allowedTrackingOrigins)) {
    V.error("Allowed Tracking Origins must be an array");
    return;
  }
  if (!(!RE(e.site) || !nr(e.sessionSampleRate, "Session") || !nr(e.telemetrySampleRate, "Telemetry") || !nr(e.telemetryConfigurationSampleRate, "Telemetry Configuration") || !nr(e.telemetryUsageSampleRate, "Telemetry Usage") || !gi(e.version, "Version") || !gi(e.env, "Env") || !gi(e.service, "Service") || !SE(e, t ?? ""))) {
    if (e.trackingConsent !== void 0 && !io(ta, e.trackingConsent)) {
      V.error('Tracking Consent should be either "granted" or "not-granted"');
      return;
    }
    return {
      beforeSend: e.beforeSend && Ld(e.beforeSend, "beforeSend threw an error:"),
      sessionStoreStrategyType: On ? void 0 : hw(e),
      sessionSampleRate: (n = e.sessionSampleRate) !== null && n !== void 0 ? n : 100,
      telemetrySampleRate: (r = e.telemetrySampleRate) !== null && r !== void 0 ? r : 20,
      telemetryConfigurationSampleRate: (s = e.telemetryConfigurationSampleRate) !== null && s !== void 0 ? s : 5,
      telemetryUsageSampleRate: (o = e.telemetryUsageSampleRate) !== null && o !== void 0 ? o : 5,
      service: (i = e.service) !== null && i !== void 0 ? i : void 0,
      env: (a = e.env) !== null && a !== void 0 ? a : void 0,
      version: (c = e.version) !== null && c !== void 0 ? c : void 0,
      datacenter: (u = e.datacenter) !== null && u !== void 0 ? u : void 0,
      silentMultipleInit: !!e.silentMultipleInit,
      allowUntrustedEvents: !!e.allowUntrustedEvents,
      trackingConsent: (d = e.trackingConsent) !== null && d !== void 0 ? d : ta.GRANTED,
      trackAnonymousUser: (l = e.trackAnonymousUser) !== null && l !== void 0 ? l : !0,
      storeContextsAcrossPages: !!e.storeContextsAcrossPages,
      /**
       * beacon payload max queue size implementation is 64kb
       * ensure that we leave room for logs, rum and potential other users
       */
      batchBytesLimit: 16 * xn,
      eventRateLimiterThreshold: 3e3,
      maxTelemetryEventsPerPage: 15,
      /**
       * flush automatically, aim to be lower than ALB connection timeout
       * to maximize connection reuse.
       */
      flushTimeout: 30 * Re,
      /**
       * Logs intake limit. When using the SDK in a Worker Environment, we
       * limit the batch size to 1 to ensure it can be sent in a single event.
       */
      batchMessagesLimit: On ? 1 : 50,
      messageBytesLimit: 256 * xn,
      /**
       * The source of the SDK, used for support plugins purposes.
       */
      variant: e.variant,
      sdkVersion: e.sdkVersion,
      ...IE(e)
    };
  }
}
function Of(e) {
  return {
    session_sample_rate: e.sessionSampleRate,
    telemetry_sample_rate: e.telemetrySampleRate,
    telemetry_configuration_sample_rate: e.telemetryConfigurationSampleRate,
    telemetry_usage_sample_rate: e.telemetryUsageSampleRate,
    use_before_send: !!e.beforeSend,
    use_partitioned_cross_site_session_cookie: e.usePartitionedCrossSiteSessionCookie,
    use_secure_session_cookie: e.useSecureSessionCookie,
    use_proxy: !!e.proxy,
    silent_multiple_init: e.silentMultipleInit,
    track_session_across_subdomains: e.trackSessionAcrossSubdomains,
    track_anonymous_user: e.trackAnonymousUser,
    session_persistence: e.sessionPersistence,
    allow_fallback_to_local_storage: !!e.allowFallbackToLocalStorage,
    store_contexts_across_pages: !!e.storeContextsAcrossPages,
    allow_untrusted_events: !!e.allowUntrustedEvents,
    tracking_consent: e.trackingConsent,
    use_allowed_tracking_origins: Array.isArray(e.allowedTrackingOrigins),
    source: e.source,
    sdk_version: e.sdkVersion,
    variant: e.variant
  };
}
function We(e, t, n, { computeHandlingStack: r } = {}) {
  let s = e[t];
  if (typeof s != "function")
    if (t in e && t.startsWith("on"))
      s = q;
    else
      return { stop: q };
  let o = !1;
  const i = function() {
    if (o)
      return s.apply(this, arguments);
    const a = Array.from(arguments);
    let c;
    xt(n, null, [
      {
        target: this,
        parameters: a,
        onPostCall: (d) => {
          c = d;
        },
        handlingStack: r ? yr("instrumented method") : void 0
      }
    ]);
    const u = s.apply(this, a);
    return c && xt(c, null, [u]), u;
  };
  return e[t] = i, {
    stop: () => {
      o = !0, e[t] === i && (e[t] = s);
    }
  };
}
function xr(e, t, n) {
  const r = Object.getOwnPropertyDescriptor(e, t);
  if (!r || !r.set || !r.configurable)
    return { stop: q };
  const s = q;
  let o = (a, c) => {
    Ie(() => {
      o !== s && n(a, c);
    }, 0);
  };
  const i = function(a) {
    r.set.call(this, a), o(this, a);
  };
  return Object.defineProperty(e, t, {
    set: i
  }), {
    stop: () => {
      var a;
      ((a = Object.getOwnPropertyDescriptor(e, t)) === null || a === void 0 ? void 0 : a.set) === i && Object.defineProperty(e, t, r), o = s;
    }
  };
}
function xE() {
  return new Y((e) => {
    const t = (s, o) => {
      const i = Fo({
        stackTrace: o,
        originalError: s,
        startClocks: pe(),
        nonErrorPrefix: "Uncaught",
        source: ze.SOURCE,
        handling: "unhandled"
      });
      e.notify(i);
    }, { stop: n } = OE(t), { stop: r } = LE(t);
    return () => {
      n(), r();
    };
  });
}
function OE(e) {
  return We(Ge(), "onerror", ({ parameters: [t, n, r, s, o] }) => {
    let i;
    Hn(o) || (i = Pw(t, n, r, s)), e(o ?? t, i);
  });
}
function LE(e) {
  return We(Ge(), "onunhandledrejection", ({ parameters: [t] }) => {
    e(t.reason || "Empty reason");
  });
}
function Lf(e) {
  const t = {
    version: "6.21.2",
    // This API method is intentionally not monitored, since the only thing executed is the
    // user-provided 'callback'.  All SDK usages executed in the callback should be monitored, and
    // we don't want to interfere with the user uncaught exceptions.
    onReady(n) {
      n();
    },
    ...e
  };
  return Object.defineProperty(t, "_setDebug", {
    get() {
      return Db;
    },
    enumerable: !1
  }), t;
}
function Nf(e, t, n) {
  const r = e[t];
  r && !r.q && r.version && V.warn("SDK is loaded more than once. This is unsupported and might have unexpected behavior."), e[t] = n, r && r.q && r.q.forEach((s) => Ld(s, "onReady callback threw an error:")());
}
function Ho(e, t) {
  t.silentMultipleInit || V.error(`${e} is already initialized.`);
}
const _r = {
  intervention: "intervention",
  deprecation: "deprecation",
  cspViolation: "csp_violation"
};
function Mf(e, t) {
  const n = [];
  t.includes(_r.cspViolation) && n.push(ME(e));
  const r = t.filter((s) => s !== _r.cspViolation);
  return r.length && n.push(NE(r)), Bd(...n);
}
function NE(e) {
  return new Y((t) => {
    if (!window.ReportingObserver)
      return;
    const n = M((s, o) => s.forEach((i) => t.notify(PE(i)))), r = new window.ReportingObserver(n, {
      types: e,
      buffered: !0
    });
    return r.observe(), () => {
      r.disconnect();
    };
  });
}
function ME(e) {
  return new Y((t) => {
    const { stop: n } = ce(e, document, "securitypolicyviolation", (r) => {
      t.notify(DE(r));
    });
    return n;
  });
}
function PE(e) {
  const { type: t, body: n } = e;
  return Pf({
    type: n.id,
    message: `${t}: ${n.message}`,
    originalError: e,
    stack: Df(n.id, n.message, n.sourceFile, n.lineNumber, n.columnNumber)
  });
}
function DE(e) {
  const t = `'${e.blockedURI}' blocked by '${e.effectiveDirective}' directive`;
  return Pf({
    type: e.effectiveDirective,
    message: `${_r.cspViolation}: ${t}`,
    originalError: e,
    csp: {
      disposition: e.disposition
    },
    stack: Df(e.effectiveDirective, e.originalPolicy ? `${t} of the policy "${ja(e.originalPolicy, 100, "...")}"` : "no policy", e.sourceFile, e.lineNumber, e.columnNumber)
  });
}
function Pf(e) {
  return {
    startClocks: pe(),
    source: ze.REPORT,
    handling: "unhandled",
    ...e
  };
}
function Df(e, t, n, r, s) {
  return n ? vr({
    name: e,
    message: t,
    stack: [
      {
        func: "?",
        url: n,
        line: r ?? void 0,
        column: s ?? void 0
      }
    ]
  }) : void 0;
}
function UE(e) {
  const t = /* @__PURE__ */ new Set();
  return e.forEach((n) => t.add(n)), Array.from(t);
}
function Uf(e, t) {
  const n = e.indexOf(t);
  n >= 0 && e.splice(n, 1);
}
function zr(e) {
  return Array.isArray(e) && e.length > 0;
}
const Ns = 1 / 0, FE = Fe;
let Or = null;
const js = /* @__PURE__ */ new Set();
function $E() {
  js.forEach((e) => e());
}
function Cr({ expireDelay: e, maxEntries: t }) {
  let n = [];
  Or || (Or = Sr(() => $E(), FE));
  const r = () => {
    const d = je() - e;
    for (; n.length > 0 && n[n.length - 1].endTime < d; )
      n.pop();
  };
  js.add(r);
  function s(d, l) {
    const f = {
      value: d,
      startTime: l,
      endTime: Ns,
      remove: () => {
        Uf(n, f);
      },
      close: (p) => {
        f.endTime = p;
      }
    };
    return t && n.length >= t && n.pop(), n.unshift(f), f;
  }
  function o(d = Ns, l = { returnInactive: !1 }) {
    for (const f of n)
      if (f.startTime <= d) {
        if (l.returnInactive || d <= f.endTime)
          return f.value;
        break;
      }
  }
  function i(d) {
    const l = n[0];
    l && l.endTime === Ns && l.close(d);
  }
  function a(d = Ns, l = 0) {
    const f = Er(d, l);
    return n.filter((p) => p.startTime <= f && d <= p.endTime).map((p) => p.value);
  }
  function c() {
    n = [];
  }
  function u() {
    js.delete(r), js.size === 0 && Or && (Mo(Or), Or = null);
  }
  return { add: s, find: o, closeActive: i, findAll: a, reset: c, stop: u };
}
const BE = "datadog-synthetics-public-id", VE = "datadog-synthetics-result-id", WE = "datadog-synthetics-injects-rum";
function Go() {
  return On ? !1 : !!(ut._DATADOG_SYNTHETICS_INJECTS_RUM || jt(WE));
}
function Ff() {
  const e = window._DATADOG_SYNTHETICS_PUBLIC_ID || jt(BE);
  return typeof e == "string" ? e : void 0;
}
function $f() {
  const e = window._DATADOG_SYNTHETICS_RESULT_ID || jt(VE);
  return typeof e == "string" ? e : void 0;
}
function Bf() {
  return !!(Ff() && $f());
}
const HE = Fe, GE = Vn;
function Vf(e, t, n, r) {
  const s = new Y(), o = new Y(), i = gw(e.sessionStoreStrategyType, e, t, n), a = Cr({
    expireDelay: GE
  });
  if (i.renewObservable.subscribe(() => {
    a.add(c(), je()), s.notify();
  }), i.expireObservable.subscribe(() => {
    o.notify(), a.closeActive(je());
  }), i.expandOrRenewSession(), a.add(c(), Ka().relative), Ir(Lt.SHORT_SESSION_INVESTIGATION)) {
    const u = i.getSession();
    u && XE(e, u);
  }
  r.observable.subscribe(() => {
    r.isGranted() ? i.expandOrRenewSession() : i.expire();
  }), zE(e, () => {
    r.isGranted() && i.expandOrRenewSession();
  }), KE(e, () => i.expandSession()), jE(e, () => i.restartSession());
  function c() {
    const u = i.getSession();
    return u ? {
      id: u.id,
      trackingType: u[t],
      isReplayForced: !!u.forcedReplay,
      anonymousId: u.anonymousId
    } : (qE().catch(() => {
    }), {
      id: "invalid",
      trackingType: jd,
      isReplayForced: !1,
      anonymousId: void 0
    });
  }
  return {
    findSession: (u, d) => a.find(u, d),
    renewObservable: s,
    expireObservable: o,
    sessionStateUpdateObservable: i.sessionStateUpdateObservable,
    expire: i.expire,
    updateSessionState: i.updateSessionState
  };
}
function zE(e, t) {
  const { stop: n } = He(e, window, [
    "click",
    "touchstart",
    "keydown",
    "scroll"
    /* DOM_EVENT.SCROLL */
  ], t, { capture: !0, passive: !0 });
}
function KE(e, t) {
  const n = () => {
    document.visibilityState === "visible" && t();
  }, { stop: r } = ce(e, document, "visibilitychange", n);
  Sr(n, HE);
}
function jE(e, t) {
  const { stop: n } = ce(e, window, "resume", t, { capture: !0 });
}
async function qE() {
  const e = Qd();
  Dt("Unexpected session state", {
    session: e,
    isSyntheticsTest: Bf(),
    createdTimestamp: e?.created,
    expireTimestamp: e?.expire,
    cookie: await Wf(),
    currentDomain: `${window.location.protocol}//${window.location.hostname}`
  });
}
function XE(e, t) {
  if (!window.cookieStore || !t.created)
    return;
  const n = Number(t.created), r = De(), { stop: s } = ce(e, cookieStore, "change", o);
  function o(i) {
    const a = zd(i.changed, (u) => u.name === en);
    if (!a)
      return;
    const c = De() - n;
    if (c > 14 * Fe)
      s();
    else {
      const u = Ja(a.value);
      if (u.id && u.id !== t.id) {
        s();
        const d = De() - r;
        Wf().then((l) => {
          Dt("Session cookie changed", {
            time: d,
            session_age: c,
            old: t,
            new: u,
            cookie: l
          });
        }).catch(ot);
      }
    }
  }
}
async function Wf() {
  let e;
  return "cookieStore" in window ? e = await window.cookieStore.getAll(en) : e = document.cookie.split(/\s*;\s*/).filter((t) => t.startsWith(en)), {
    count: e.length,
    domain: Gd() || "undefined",
    ...e
  };
}
function nc() {
  let e = "", t = 0;
  return {
    isAsync: !1,
    get isEmpty() {
      return !e;
    },
    write(n, r) {
      const s = Ud(n);
      t += s, e += n, r && r(s);
    },
    finish(n) {
      n(this.finishSync());
    },
    finishSync() {
      const n = {
        output: e,
        outputBytesCount: t,
        rawBytesCount: t,
        pendingData: ""
      };
      return e = "", t = 0, n;
    },
    estimateEncodedBytesCount(n) {
      return n.length;
    }
  };
}
class Hf {
  constructor() {
    this.callbacks = {};
  }
  notify(t, n) {
    const r = this.callbacks[t];
    r && r.forEach((s) => s(n));
  }
  subscribe(t, n) {
    return this.callbacks[t] || (this.callbacks[t] = []), this.callbacks[t].push(n), {
      unsubscribe: () => {
        this.callbacks[t] = this.callbacks[t].filter((r) => n !== r);
      }
    };
  }
}
function qs(e, t, n) {
  let r = 0, s = !1;
  return {
    isLimitReached() {
      if (r === 0 && Ie(() => {
        r = 0;
      }, Fe), r += 1, r <= t || s)
        return s = !1, !1;
      if (r === t + 1) {
        s = !0;
        try {
          n({
            message: `Reached max number of ${e}s by minute: ${t}`,
            source: ze.AGENT,
            startClocks: pe()
          });
        } finally {
          s = !1;
        }
      }
      return !0;
    }
  };
}
function rc(e, t, n) {
  return document.readyState === t || document.readyState === "complete" ? (n(), { stop: q }) : ce(e, window, t === "complete" ? "load" : "DOMContentLoaded", n, { once: !0 });
}
function YE(e, t) {
  return new Promise((n) => {
    rc(e, t, n);
  });
}
let yi;
const sc = /* @__PURE__ */ new WeakMap();
function Gf(e) {
  return yi || (yi = JE(e)), yi;
}
function JE(e) {
  return new Y((t) => {
    const { stop: n } = We(XMLHttpRequest.prototype, "open", QE), { stop: r } = We(XMLHttpRequest.prototype, "send", (o) => {
      ZE(o, e, t);
    }, { computeHandlingStack: !0 }), { stop: s } = We(XMLHttpRequest.prototype, "abort", eS);
    return () => {
      n(), r(), s();
    };
  });
}
function QE({ target: e, parameters: [t, n] }) {
  sc.set(e, {
    state: "open",
    method: String(t).toUpperCase(),
    url: qa(String(n))
  });
}
function ZE({ target: e, parameters: [t], handlingStack: n }, r, s) {
  const o = sc.get(e);
  if (!o)
    return;
  const i = o;
  i.state = "start", i.startClocks = pe(), i.isAborted = !1, i.xhr = e, i.handlingStack = n, i.body = t;
  let a = !1;
  const { stop: c } = We(e, "onreadystatechange", () => {
    e.readyState === XMLHttpRequest.DONE && u();
  }), u = () => {
    if (d(), c(), a)
      return;
    a = !0;
    const l = o;
    l.state = "complete", l.duration = le(i.startClocks.timeStamp, te()), l.status = e.status, s.notify(Zr(l));
  }, { stop: d } = ce(r, e, "loadend", u);
  s.notify(i);
}
function eS({ target: e }) {
  const t = sc.get(e);
  t && (t.isAborted = !0);
}
let _i;
function zo() {
  return _i || (_i = tS()), _i;
}
function tS() {
  return new Y((e) => {
    if (!ut.fetch)
      return;
    const { stop: t } = We(ut, "fetch", (n) => nS(n, e), {
      computeHandlingStack: !0
    });
    return t;
  });
}
function nS({ parameters: e, onPostCall: t, handlingStack: n }, r) {
  const [s, o] = e;
  let i = o && o.method;
  i === void 0 && s instanceof Request && (i = s.method);
  const a = i !== void 0 ? String(i).toUpperCase() : "GET", c = s instanceof Request ? s.url : qa(String(s)), u = pe(), d = {
    state: "start",
    init: o,
    input: s,
    method: a,
    startClocks: u,
    url: c,
    handlingStack: n
  };
  r.notify(d), e[0] = d.input, e[1] = d.init, t((l) => rS(r, l, d));
}
function rS(e, t, n) {
  const r = n;
  function s(o) {
    r.state = "resolve", Object.assign(r, o), e.notify(r);
  }
  t.then(M((o) => {
    s({
      response: o,
      responseType: o.type,
      status: o.status,
      isAborted: !1
    });
  }), M((o) => {
    var i, a;
    s({
      status: 0,
      isAborted: ((a = (i = r.init) === null || i === void 0 ? void 0 : i.signal) === null || a === void 0 ? void 0 : a.aborted) || o instanceof DOMException && o.code === DOMException.ABORT_ERR,
      error: o
    });
  }));
}
function zf(e, t) {
  if (window.requestIdleCallback && window.cancelIdleCallback) {
    const n = window.requestIdleCallback(M(e), t);
    return () => window.cancelIdleCallback(n);
  }
  return oS(e);
}
const sS = 50;
function oS(e) {
  const t = De(), n = Ie(() => {
    e({
      didTimeout: !1,
      timeRemaining: () => Math.max(0, sS - (De() - t))
    });
  }, 0);
  return () => Be(n);
}
const iS = Re, aS = 30;
function cS() {
  const e = [];
  function t(r) {
    let s;
    if (r.didTimeout) {
      const o = performance.now();
      s = () => aS - (performance.now() - o);
    } else
      s = r.timeRemaining.bind(r);
    for (; s() > 0 && e.length; )
      e.shift()();
    e.length && n();
  }
  function n() {
    zf(t, { timeout: iS });
  }
  return {
    push(r) {
      e.push(r) === 1 && n();
    },
    stop() {
      e.length = 0;
    }
  };
}
let bi = {};
function Kf(e) {
  const t = e.map((n) => (bi[n] || (bi[n] = uS(n)), bi[n]));
  return Bd(...t);
}
function uS(e) {
  return new Y((t) => {
    const n = mt[e];
    return mt[e] = (...r) => {
      n.apply(console, r);
      const s = yr("console error");
      xt(() => {
        t.notify(lS(r, e, s));
      });
    }, () => {
      mt[e] = n;
    };
  });
}
function lS(e, t, n) {
  const r = e.map((s) => dS(s)).join(" ");
  if (t === ge.error) {
    const s = e.find(Hn), o = Fo({
      originalError: s,
      handlingStack: n,
      startClocks: pe(),
      source: ze.CONSOLE,
      handling: "handled",
      nonErrorPrefix: "Provided",
      // if no good stack is computed from the error, let's not use the fallback stack message
      // advising the user to use an instance of Error, as console.error is commonly used without an
      // Error instance.
      useFallbackStack: !1
    });
    return o.message = r, {
      api: t,
      message: r,
      handlingStack: n,
      error: o
    };
  }
  return {
    api: t,
    message: r,
    error: void 0,
    handlingStack: n
  };
}
function dS(e) {
  return typeof e == "string" ? se(e) : Hn(e) ? af(Tr(e)) : hs(se(e), void 0, 2);
}
const fS = 500;
function jf() {
  const e = [];
  return {
    add: (s) => {
      e.push(s) > fS && e.splice(0, 1);
    },
    remove: (s) => {
      Uf(e, s);
    },
    drain: (s) => {
      e.forEach((o) => o(s)), e.length = 0;
    }
  };
}
function pS(e) {
  const t = Wn(e) === "object";
  return t || V.error("Unsupported context:", e), t;
}
function wi(e, t, n) {
  const r = { ...e };
  for (const [s, { required: o, type: i }] of Object.entries(t))
    i === "string" && !Iu(r[s]) && (r[s] = String(r[s])), o && Iu(r[s]) && V.warn(`The property ${s} of ${n} is required; context will not be sent to the intake.`);
  return r;
}
function Iu(e) {
  return e == null || e === "";
}
function gs(e = "", { propertiesConfig: t = {} } = {}) {
  let n = {};
  const r = new Y(), s = {
    getContext: () => Vo(n),
    setContext: (o) => {
      pS(o) ? n = se(wi(o, t, e)) : s.clearContext(), r.notify();
    },
    setContextProperty: (o, i) => {
      n = se(wi({ ...n, [o]: i }, t, e)), r.notify();
    },
    removeContextProperty: (o) => {
      delete n[o], wi(n, t, e), r.notify();
    },
    clearContext: () => {
      n = {}, r.notify();
    },
    changeObservable: r
  };
  return s;
}
function ne(e, t, n, r) {
  return M((...s) => (r && Ee({ feature: r }), e()[t][n](...s)));
}
function Ei(e, t, n) {
  e.changeObservable.subscribe(() => {
    const r = e.getContext();
    n.add((s) => s[t].setContext(r));
  });
}
const hS = "_dd_c", mS = [];
function oc(e, t, n, r) {
  const s = gS(n, r);
  mS.push(ce(e, window, "storage", ({ key: u }) => {
    s === u && i();
  })), t.changeObservable.subscribe(a);
  const o = Ze(c(), t.getContext());
  Bn(o) || t.setContext(o);
  function i() {
    t.setContext(c());
  }
  function a() {
    localStorage.setItem(s, JSON.stringify(t.getContext()));
  }
  function c() {
    const u = localStorage.getItem(s);
    return u ? JSON.parse(u) : {};
  }
}
function gS(e, t) {
  return `${hS}_${e}_${t}`;
}
function qf(e, t, n) {
  const r = ic();
  return t.storeContextsAcrossPages && oc(
    t,
    r,
    n,
    4
    /* CustomerDataType.Account */
  ), e.register(0, () => {
    const s = r.getContext();
    return Bn(s) || !s.id ? Ae : {
      account: s
    };
  }), r;
}
function ic() {
  return gs("account", {
    propertiesConfig: {
      id: { type: "string", required: !0 },
      name: { type: "string" }
    }
  });
}
function Xf(e, t, n, r) {
  const s = ac();
  return t.storeContextsAcrossPages && oc(
    t,
    s,
    n,
    2
    /* CustomerDataType.GlobalContext */
  ), e.register(0, () => {
    const o = s.getContext();
    return r ? { context: o } : o;
  }), s;
}
function ac() {
  return gs("global context");
}
function Yf(e, t, n, r) {
  const s = cc();
  return t.storeContextsAcrossPages && oc(
    t,
    s,
    r,
    1
    /* CustomerDataType.User */
  ), e.register(0, ({ eventType: o, startTime: i }) => {
    const a = s.getContext(), c = n.findTrackedSession(i);
    return c && c.anonymousId && !a.anonymous_id && t.trackAnonymousUser && (a.anonymous_id = c.anonymousId), Bn(a) ? Ae : {
      type: o,
      usr: a
    };
  }), e.register(1, ({ startTime: o }) => {
    var i;
    return {
      anonymous_id: (i = n.findTrackedSession(o)) === null || i === void 0 ? void 0 : i.anonymousId
    };
  }), s;
}
function cc() {
  return gs("user", {
    propertiesConfig: {
      id: { type: "string" },
      name: { type: "string" },
      email: { type: "string" }
    }
  });
}
const J = {
  userContext: "userContext",
  globalContext: "globalContext",
  accountContext: "accountContext"
}, re = {
  getContext: "getContext",
  setContext: "setContext",
  setContextProperty: "setContextProperty",
  removeContextProperty: "removeContextProperty",
  clearContext: "clearContext"
};
function Jf(e, t, n) {
  const r = e.getReader(), s = [];
  let o = 0;
  i();
  function i() {
    r.read().then(M((c) => {
      if (c.done) {
        a();
        return;
      }
      n.collectStreamBody && s.push(c.value), o += c.value.length, o > n.bytesLimit ? a() : i();
    }), M((c) => t(c)));
  }
  function a() {
    r.cancel().catch(
      // we don't care if cancel fails, but we still need to catch the error to avoid reporting it
      // as an unhandled rejection
      q
    );
    let c, u;
    if (n.collectStreamBody) {
      let d;
      if (s.length === 1)
        d = s[0];
      else {
        d = new Uint8Array(o);
        let l = 0;
        s.forEach((f) => {
          d.set(f, l), l += f.length;
        });
      }
      c = d.slice(0, n.bytesLimit), u = d.length > n.bytesLimit;
    }
    t(void 0, c, u);
  }
}
const Le = {
  DOCUMENT: "document",
  XHR: "xhr",
  BEACON: "beacon",
  FETCH: "fetch",
  CSS: "css",
  JS: "js",
  IMAGE: "image",
  FONT: "font",
  MEDIA: "media",
  OTHER: "other"
}, Ln = {
  FETCH: Le.FETCH,
  XHR: Le.XHR
}, yS = 500;
function Qf(e = xE) {
  const t = new Vd(yS), n = e().subscribe((r) => {
    t.notify({
      type: 0,
      error: r
    });
  });
  return {
    observable: t,
    stop: () => {
      n.unsubscribe();
    }
  };
}
function _S() {
  try {
    return new Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return;
  }
}
const H = {
  ACTION: "action",
  ERROR: "error",
  LONG_TASK: "long_task",
  VIEW: "view",
  RESOURCE: "resource",
  VITAL: "vital"
}, Zf = {
  LONG_TASK: "long-task",
  LONG_ANIMATION_FRAME: "long-animation-frame"
}, kt = {
  INITIAL_LOAD: "initial_load",
  ROUTE_CHANGE: "route_change",
  BF_CACHE: "bf_cache"
}, Ko = {
  CLICK: "click",
  CUSTOM: "custom"
}, Lr = {
  RAGE_CLICK: "rage_click",
  ERROR_CLICK: "error_click",
  DEAD_CLICK: "dead_click"
}, rs = {
  DURATION: "duration",
  OPERATION_STEP: "operation_step"
};
function bS() {
  return { vitalsByName: /* @__PURE__ */ new Map(), vitalsByReference: /* @__PURE__ */ new WeakMap() };
}
function wS(e, t, n) {
  function r(i) {
    return !t.wasInPageStateDuringPeriod("frozen", i.startClocks.relative, i.duration);
  }
  function s(i) {
    r(i) && e.notify(12, ku(i));
  }
  function o(i, a, c, u) {
    if (!Ir(Lt.FEATURE_OPERATION_VITAL))
      return;
    const { operationKey: d, context: l, description: f } = c || {}, p = {
      name: i,
      type: rs.OPERATION_STEP,
      operationKey: d,
      failureReason: u,
      stepType: a,
      startClocks: pe(),
      context: se(l),
      description: f
    };
    e.notify(12, ku(p));
  }
  return {
    addOperationStepVital: o,
    addDurationVital: s,
    startDurationVital: (i, a = {}) => ep(n, i, a),
    stopDurationVital: (i, a = {}) => {
      tp(s, n, i, a);
    }
  };
}
function ep({ vitalsByName: e, vitalsByReference: t }, n, r = {}) {
  const s = {
    name: n,
    startClocks: pe(),
    ...r
  }, o = { __dd_vital_reference: !0 };
  return e.set(n, s), t.set(o, s), o;
}
function tp(e, { vitalsByName: t, vitalsByReference: n }, r, s = {}) {
  const o = typeof r == "string" ? t.get(r) : n.get(r);
  o && (e(ES(o, o.startClocks, s, pe())), typeof r == "string" ? t.delete(r) : n.delete(r));
}
function ES(e, t, n, r) {
  var s;
  return {
    name: e.name,
    type: rs.DURATION,
    startClocks: t,
    duration: le(t.timeStamp, r.timeStamp),
    context: Ze(e.context, n.context),
    description: (s = n.description) !== null && s !== void 0 ? s : e.description
  };
}
function ku(e) {
  const { startClocks: t, type: n, name: r, description: s, context: o } = e, i = {
    id: Oe(),
    type: n,
    name: r,
    description: s,
    ...n === rs.DURATION ? { duration: K(e.duration) } : {
      step_type: e.stepType,
      operation_key: e.operationKey,
      failure_reason: e.failureReason
    }
  };
  return {
    rawRumEvent: {
      date: t.timeStamp,
      vital: i,
      type: H.VITAL,
      context: o
    },
    startTime: t.relative,
    duration: n === rs.DURATION ? e.duration : void 0,
    domainContext: {}
  };
}
function np(e, t, n) {
  if (e)
    for (const r of e) {
      const s = r[t];
      s && s(n);
    }
}
const Cu = /* @__PURE__ */ new Map();
function rp(e, t) {
  if (t === 100)
    return !0;
  if (t === 0)
    return !1;
  const n = Cu.get(t);
  if (n && e === n.sessionId)
    return n.decision;
  let r;
  return window.BigInt ? r = SS(BigInt(`0x${e.split("-")[4]}`), t) : r = Kt(t), Cu.set(t, { sessionId: e, decision: r }), r;
}
function SS(e, t) {
  const n = BigInt("1111111111111111111"), r = BigInt("0x10000000000000000"), s = e * n % r;
  return Number(s) <= t / 100 * Number(r);
}
function TS() {
  return op(64);
}
function sp() {
  return op(63);
}
function op(e) {
  const t = crypto.getRandomValues(new Uint32Array(2));
  return e === 63 && (t[t.length - 1] >>>= 1), {
    toString(n = 10) {
      let r = t[1], s = t[0], o = "";
      do {
        const i = r % n * 4294967296 + s;
        r = Math.floor(r / n), s = Math.floor(i / n), o = (i % n).toString(n) + o;
      } while (r || s);
      return o;
    }
  };
}
function Kn(e) {
  return e.toString(16).padStart(16, "0");
}
function vS(e) {
  const t = e;
  return Wn(t) === "object" && ns(t.match) && Array.isArray(t.propagatorTypes);
}
function IS(e) {
  e.status === 0 && !e.isAborted && (e.traceId = void 0, e.spanId = void 0, e.traceSampled = void 0);
}
function kS(e, t, n, r) {
  return {
    clearTracingIfNeeded: IS,
    traceFetch: (s) => Au(e, s, t, n, r, (o) => {
      var i;
      if (s.input instanceof Request && !(!((i = s.init) === null || i === void 0) && i.headers))
        s.input = new Request(s.input), Object.keys(o).forEach((a) => {
          s.input.headers.append(a, o[a]);
        });
      else {
        s.init = Zr(s.init);
        const a = [];
        s.init.headers instanceof Headers ? s.init.headers.forEach((c, u) => {
          a.push([u, c]);
        }) : Array.isArray(s.init.headers) ? s.init.headers.forEach((c) => {
          a.push(c);
        }) : s.init.headers && Object.keys(s.init.headers).forEach((c) => {
          a.push([c, s.init.headers[c]]);
        }), s.init.headers = a.concat(Xa(o));
      }
    }),
    traceXhr: (s, o) => Au(e, s, t, n, r, (i) => {
      Object.keys(i).forEach((a) => {
        o.setRequestHeader(a, i[a]);
      });
    })
  };
}
function Au(e, t, n, r, s, o) {
  const i = n.findTrackedSession();
  if (!i)
    return;
  const a = e.allowedTracingUrls.find((d) => Uo([d.match], t.url, !0));
  if (!a)
    return;
  const c = rp(i.id, e.traceSampleRate);
  (c || e.traceContextInjection === sa.ALL) && (t.traceSampled = c, t.traceId = TS(), t.spanId = sp(), o(CS(t.traceId, t.spanId, t.traceSampled, i.id, a.propagatorTypes, r, s, e)));
}
function CS(e, t, n, r, s, o, i, a) {
  const c = {};
  if (s.forEach((u) => {
    switch (u) {
      case "datadog": {
        Object.assign(c, {
          "x-datadog-origin": "rum",
          "x-datadog-parent-id": t.toString(),
          "x-datadog-sampling-priority": n ? "1" : "0",
          "x-datadog-trace-id": e.toString()
        });
        break;
      }
      // https://www.w3.org/TR/trace-context/
      case "tracecontext": {
        Object.assign(c, {
          traceparent: `00-0000000000000000${Kn(e)}-${Kn(t)}-0${n ? "1" : "0"}`,
          tracestate: `dd=s:${n ? "1" : "0"};o:rum`
        });
        break;
      }
      // https://github.com/openzipkin/b3-propagation
      case "b3": {
        Object.assign(c, {
          b3: `${Kn(e)}-${Kn(t)}-${n ? "1" : "0"}`
        });
        break;
      }
      case "b3multi": {
        Object.assign(c, {
          "X-B3-TraceId": Kn(e),
          "X-B3-SpanId": Kn(t),
          "X-B3-Sampled": n ? "1" : "0"
        });
        break;
      }
    }
  }), a.propagateTraceBaggage) {
    const u = {
      "session.id": r
    }, d = o.getContext().id;
    typeof d == "string" && (u["user.id"] = d);
    const l = i.getContext().id;
    typeof l == "string" && (u["account.id"] = l);
    const f = Object.entries(u).map(([p, h]) => `${p}=${encodeURIComponent(h)}`).join(",");
    f && (c.baggage = f);
  }
  return c;
}
const ip = ["tracecontext", "datadog"];
function AS(e, t) {
  var n, r, s, o, i, a, c;
  if (e.trackFeatureFlagsForEvents !== void 0 && !Array.isArray(e.trackFeatureFlagsForEvents) && V.warn("trackFeatureFlagsForEvents should be an array"), !e.applicationId) {
    V.error("Application ID is not configured, no RUM data will be collected.");
    return;
  }
  if (!nr(e.sessionReplaySampleRate, "Session Replay") || !nr(e.traceSampleRate, "Trace"))
    return;
  if (e.excludedActivityUrls !== void 0 && !Array.isArray(e.excludedActivityUrls)) {
    V.error("Excluded Activity Urls should be an array");
    return;
  }
  const u = RS(e);
  if (!u)
    return;
  const d = xf(e, t), l = OS(e);
  if (!d)
    return;
  const f = (n = e.sessionReplaySampleRate) !== null && n !== void 0 ? n : 0;
  return {
    applicationId: e.applicationId,
    actionNameAttribute: e.actionNameAttribute,
    sessionReplaySampleRate: f,
    startSessionReplayRecordingManually: e.startSessionReplayRecordingManually !== void 0 ? !!e.startSessionReplayRecordingManually : f === 0,
    traceSampleRate: (r = e.traceSampleRate) !== null && r !== void 0 ? r : 100,
    rulePsr: ls(e.traceSampleRate) ? e.traceSampleRate / 100 : void 0,
    allowedTracingUrls: u,
    excludedActivityUrls: (s = e.excludedActivityUrls) !== null && s !== void 0 ? s : [],
    workerUrl: e.workerUrl,
    compressIntakeRequests: !!e.compressIntakeRequests,
    trackUserInteractions: !!(!((o = e.trackUserInteractions) !== null && o !== void 0) || o),
    trackViewsManually: !!e.trackViewsManually,
    trackResources: !!(!((i = e.trackResources) !== null && i !== void 0) || i),
    trackLongTasks: !!(!((a = e.trackLongTasks) !== null && a !== void 0) || a),
    trackBfcacheViews: !!e.trackBfcacheViews,
    trackEarlyRequests: !!e.trackEarlyRequests,
    subdomain: e.subdomain,
    defaultPrivacyLevel: io(tr, e.defaultPrivacyLevel) ? e.defaultPrivacyLevel : tr.MASK,
    enablePrivacyForActionName: !!e.enablePrivacyForActionName,
    traceContextInjection: io(sa, e.traceContextInjection) ? e.traceContextInjection : sa.SAMPLED,
    plugins: e.plugins || [],
    trackFeatureFlagsForEvents: e.trackFeatureFlagsForEvents || [],
    profilingSampleRate: (c = e.profilingSampleRate) !== null && c !== void 0 ? c : 0,
    propagateTraceBaggage: !!e.propagateTraceBaggage,
    allowedGraphQlUrls: l,
    ...d
  };
}
function RS(e) {
  if (e.allowedTracingUrls === void 0)
    return [];
  if (!Array.isArray(e.allowedTracingUrls)) {
    V.error("Allowed Tracing URLs should be an array");
    return;
  }
  if (e.allowedTracingUrls.length !== 0 && e.service === void 0) {
    V.error("Service needs to be configured when tracing is enabled");
    return;
  }
  const t = [];
  return e.allowedTracingUrls.forEach((n) => {
    ns(n) ? t.push({ match: n, propagatorTypes: ip }) : vS(n) ? t.push(n) : V.warn("Allowed Tracing Urls parameters should be a string, RegExp, function, or an object. Ignoring parameter", n);
  }), t;
}
function xS(e) {
  const t = /* @__PURE__ */ new Set();
  return zr(e.allowedTracingUrls) && e.allowedTracingUrls.forEach((n) => {
    ns(n) ? ip.forEach((r) => t.add(r)) : Wn(n) === "object" && Array.isArray(n.propagatorTypes) && n.propagatorTypes.forEach((r) => t.add(r));
  }), Array.from(t);
}
function OS(e) {
  if (!e.allowedGraphQlUrls)
    return [];
  if (!Array.isArray(e.allowedGraphQlUrls))
    return V.warn("allowedGraphQlUrls should be an array"), [];
  const t = [];
  return e.allowedGraphQlUrls.forEach((n) => {
    ns(n) ? t.push({ match: n, trackPayload: !1 }) : n && typeof n == "object" && "match" in n && ns(n.match) && t.push({
      match: n.match,
      trackPayload: !!n.trackPayload
    });
  }), t;
}
function LS(e) {
  return zr(e) && e.some((t) => typeof t == "object" && "trackPayload" in t ? !!t.trackPayload : !1);
}
function NS(e) {
  var t;
  const n = Of(e);
  return {
    session_replay_sample_rate: e.sessionReplaySampleRate,
    start_session_replay_recording_manually: e.startSessionReplayRecordingManually,
    trace_sample_rate: e.traceSampleRate,
    trace_context_injection: e.traceContextInjection,
    propagate_trace_baggage: e.propagateTraceBaggage,
    action_name_attribute: e.actionNameAttribute,
    use_allowed_tracing_urls: zr(e.allowedTracingUrls),
    use_allowed_graph_ql_urls: zr(e.allowedGraphQlUrls),
    use_track_graph_ql_payload: LS(e.allowedGraphQlUrls),
    selected_tracing_propagators: xS(e),
    default_privacy_level: e.defaultPrivacyLevel,
    enable_privacy_for_action_name: e.enablePrivacyForActionName,
    use_excluded_activity_urls: zr(e.excludedActivityUrls),
    use_worker_url: !!e.workerUrl,
    compress_intake_requests: e.compressIntakeRequests,
    track_views_manually: e.trackViewsManually,
    track_user_interactions: e.trackUserInteractions,
    track_resources: e.trackResources,
    track_long_task: e.trackLongTasks,
    track_bfcache_views: e.trackBfcacheViews,
    track_early_requests: e.trackEarlyRequests,
    plugins: (t = e.plugins) === null || t === void 0 ? void 0 : t.map((r) => {
      var s;
      return {
        name: r.name,
        ...(s = r.getConfigurationTelemetry) === null || s === void 0 ? void 0 : s.call(r)
      };
    }),
    track_feature_flags_for_events: e.trackFeatureFlagsForEvents,
    remote_configuration_id: e.remoteConfigurationId,
    profiling_sample_rate: e.profilingSampleRate,
    use_remote_configuration_proxy: !!e.remoteConfigurationProxy,
    ...n
  };
}
function MS(e) {
  const t = [];
  let n = 0, r;
  const s = { quote: void 0, escapeSequence: void 0 };
  let o = "";
  for (const i of e) {
    if (r = Ru[n].find((a) => BS[a](i, s)), !r)
      return [];
    if (s.escapeSequence !== void 0 && r !== 12) {
      if (!HS(s.escapeSequence))
        return [];
      o += zS(s.escapeSequence), s.escapeSequence = void 0;
    }
    VS.includes(r) ? o += i : WS.includes(r) && o !== "" ? (t.push(o), o = "") : r === 12 ? s.escapeSequence = s.escapeSequence ? `${s.escapeSequence}${i}` : i : r === 8 ? s.quote = i : r === 9 && (s.quote = void 0), n = r;
  }
  return Ru[n].includes(
    1
    /* Token.END */
  ) ? (o !== "" && t.push(o), t) : [];
}
const PS = /[a-zA-Z_$]/, DS = /[a-zA-Z0-9_$]/, US = /[0-9]/, FS = /[a-fA-F0-9]/, $S = `'"`, BS = {
  // no char should match to START or END
  0: () => !1,
  1: () => !1,
  2: (e) => PS.test(e),
  3: (e) => DS.test(e),
  4: (e) => e === ".",
  5: (e) => e === "[",
  6: (e) => e === "]",
  7: (e) => US.test(e),
  8: (e) => $S.includes(e),
  9: (e, t) => e === t.quote,
  10: () => !0,
  // any char can be used in name selector
  11: (e) => e === "\\",
  12: (e, t) => t.escapeSequence === void 0 ? `${t.quote}/\\bfnrtu`.includes(e) : t.escapeSequence.startsWith("u") && t.escapeSequence.length < 5 ? FS.test(e) : !1
}, Ru = {
  0: [
    2,
    5
    /* Token.BRACKET_START */
  ],
  1: [],
  2: [
    3,
    4,
    5,
    1
    /* Token.END */
  ],
  3: [
    3,
    4,
    5,
    1
    /* Token.END */
  ],
  4: [
    2
    /* Token.NAME_SHORTHAND_FIRST_CHAR */
  ],
  5: [
    8,
    7
    /* Token.DIGIT */
  ],
  6: [
    4,
    5,
    1
    /* Token.END */
  ],
  7: [
    7,
    6
    /* Token.BRACKET_END */
  ],
  8: [
    11,
    9,
    10
    /* Token.NAME_SELECTOR_CHAR */
  ],
  9: [
    6
    /* Token.BRACKET_END */
  ],
  10: [
    11,
    9,
    10
    /* Token.NAME_SELECTOR_CHAR */
  ],
  11: [
    12
    /* Token.ESCAPE_SEQUENCE_CHAR */
  ],
  12: [
    12,
    11,
    9,
    10
    /* Token.NAME_SELECTOR_CHAR */
  ]
}, VS = [
  2,
  3,
  7,
  10
], WS = [
  4,
  5,
  6
  /* Token.BRACKET_END */
];
function HS(e) {
  return `"'/\\bfnrt`.includes(e) || e.startsWith("u") && e.length === 5;
}
const GS = {
  '"': '"',
  "'": "'",
  "/": "/",
  "\\": "\\",
  b: "\b",
  f: "\f",
  n: `
`,
  r: "\r",
  t: "	"
};
function zS(e) {
  return e.startsWith("u") ? String.fromCharCode(parseInt(e.slice(1), 16)) : GS[e];
}
const KS = "v1", jS = [
  "applicationId",
  "service",
  "env",
  "version",
  "sessionSampleRate",
  "sessionReplaySampleRate",
  "defaultPrivacyLevel",
  "enablePrivacyForActionName",
  "traceSampleRate",
  "trackSessionAcrossSubdomains",
  "allowedTracingUrls",
  "allowedTrackingOrigins"
];
async function qS(e, t) {
  let n;
  const r = YS(), s = await eT(e);
  return s.ok ? (r.increment("fetch", "success"), n = XS(e, s.value, t, r)) : (r.increment("fetch", "failure"), V.error(s.error)), ms("remote configuration metrics", { metrics: r.get() }), n;
}
function XS(e, t, n, r) {
  const s = { ...e };
  return jS.forEach((f) => {
    f in t && (s[f] = o(t[f]));
  }), Object.keys(n).forEach((f) => {
    t[f] !== void 0 && i(n[f], t[f]);
  }), s;
  function o(f) {
    if (Array.isArray(f))
      return f.map(o);
    if (JS(f)) {
      if (QS(f)) {
        const p = f.rcSerializedType;
        switch (p) {
          case "string":
            return f.value;
          case "regex":
            return ap(f.value);
          case "dynamic":
            return a(f);
          default:
            V.error(`Unsupported remote configuration: "rcSerializedType": "${p}"`);
            return;
        }
      }
      return Fd(f, o);
    }
    return f;
  }
  function i(f, p) {
    p.forEach(({ key: h, value: m }) => {
      f.setContextProperty(h, o(m));
    });
  }
  function a(f) {
    const p = f.strategy;
    let h;
    switch (p) {
      case "cookie":
        h = c(f);
        break;
      case "dom":
        h = u(f);
        break;
      case "js":
        h = l(f);
        break;
      default:
        V.error(`Unsupported remote configuration: "strategy": "${p}"`);
        return;
    }
    const m = f.extractor;
    return m !== void 0 && typeof h == "string" ? ZS(m, h) : h;
  }
  function c({ name: f }) {
    const p = Do(f);
    return r.increment("cookie", p !== void 0 ? "success" : "missing"), p;
  }
  function u({ selector: f, attribute: p }) {
    let h;
    try {
      h = document.querySelector(f);
    } catch {
      V.error(`Invalid selector in the remote configuration: '${f}'`), r.increment("dom", "failure");
      return;
    }
    if (!h) {
      r.increment("dom", "missing");
      return;
    }
    if (d(h, p)) {
      V.error(`Forbidden element selected by the remote configuration: '${f}'`), r.increment("dom", "failure");
      return;
    }
    const m = p !== void 0 ? h.getAttribute(p) : h.textContent;
    if (m === null) {
      r.increment("dom", "missing");
      return;
    }
    return r.increment("dom", "success"), m;
  }
  function d(f, p) {
    return f.getAttribute("type") === "password" && p === "value";
  }
  function l({ path: f }) {
    let p = window;
    const h = MS(f);
    if (h.length === 0) {
      V.error(`Invalid JSON path in the remote configuration: '${f}'`), r.increment("js", "failure");
      return;
    }
    for (const m of h) {
      if (!(m in p)) {
        r.increment("js", "missing");
        return;
      }
      try {
        p = p[m];
      } catch (g) {
        V.error(`Error accessing: '${f}'`, g), r.increment("js", "failure");
        return;
      }
    }
    return r.increment("js", "success"), p;
  }
}
function YS() {
  const e = { fetch: {} };
  return {
    get: () => e,
    increment: (t, n) => {
      e[t] || (e[t] = {}), e[t][n] || (e[t][n] = 0), e[t][n] = e[t][n] + 1;
    }
  };
}
function JS(e) {
  return typeof e == "object" && e !== null;
}
function QS(e) {
  return "rcSerializedType" in e;
}
function ap(e) {
  try {
    return new RegExp(e);
  } catch {
    V.error(`Invalid regex in the remote configuration: '${e}'`);
  }
}
function ZS(e, t) {
  const n = ap(e.value);
  if (n === void 0)
    return;
  const r = n.exec(t);
  if (r === null)
    return;
  const [s, o] = r;
  return o || s;
}
async function eT(e) {
  let t;
  try {
    t = await fetch(tT(e));
  } catch {
    t = void 0;
  }
  if (!t || !t.ok)
    return {
      ok: !1,
      error: new Error("Error fetching the remote configuration.")
    };
  const n = await t.json();
  return n.rum ? {
    ok: !0,
    value: n.rum
  } : {
    ok: !1,
    error: new Error("No remote configuration for RUM.")
  };
}
function tT(e) {
  return e.remoteConfigurationProxy ? e.remoteConfigurationProxy : `https://sdk-configuration.${Af("rum", e)}/${KS}/${encodeURIComponent(e.remoteConfigurationId)}.json`;
}
function nT({ ignoreInitIfSyntheticsWillInjectRum: e = !0, startDeflateWorker: t }, n, r, s) {
  const o = jf(), i = ac();
  Si(i, J.globalContext, o);
  const a = cc();
  Si(a, J.userContext, o);
  const c = ic();
  Si(c, J.accountContext, o);
  let u, d, l, f;
  const p = n.observable.subscribe(m), h = {};
  function m() {
    if (!l || !f || !n.isGranted())
      return;
    p.unsubscribe();
    let E;
    if (f.trackViewsManually) {
      if (!u)
        return;
      o.remove(u.callback), E = u.options;
    }
    const S = s(f, d, E);
    o.drain(S);
  }
  function g(E, S) {
    const b = Et();
    if (b && (E = rT(E)), l = E, Cf(NS(E)), f) {
      Ho("DD_RUM", E);
      return;
    }
    const T = AS(E, S);
    if (T) {
      if (!b && !T.sessionStoreStrategyType) {
        V.warn("No storage available for session. We will not send any data.");
        return;
      }
      T.compressIntakeRequests && !b && t && (d = t(
        T,
        "Datadog RUM",
        // Worker initialization can fail asynchronously, especially in Firefox where even CSP
        // issues are reported asynchronously. For now, the SDK will continue its execution even if
        // data won't be sent to Datadog. We could improve this behavior in the future.
        q
      ), !d) || (f = T, zo().subscribe(q), n.tryToInit(T.trackingConsent), m());
    }
  }
  const y = (E) => {
    o.add((S) => S.addDurationVital(E));
  };
  return {
    init(E, S, b) {
      if (!E) {
        V.error("Missing configuration");
        return;
      }
      uf(E.enableExperimentalFeatures), l = E, !(e && Go()) && (np(E.plugins, "onInit", { initConfiguration: E, publicApi: S }), E.remoteConfigurationId ? qS(E, { user: a, context: i }).then((T) => {
        T && g(T, b);
      }).catch(ot) : g(E, b));
    },
    get initConfiguration() {
      return l;
    },
    getInternalContext: q,
    stopSession: q,
    addTiming(E, S = te()) {
      o.add((b) => b.addTiming(E, S));
    },
    startView(E, S = pe()) {
      const b = (T) => {
        T.startView(E, S);
      };
      o.add(b), u || (u = { options: E, callback: b }, m());
    },
    setViewName(E) {
      o.add((S) => S.setViewName(E));
    },
    // View context APIs
    setViewContext(E) {
      o.add((S) => S.setViewContext(E));
    },
    setViewContextProperty(E, S) {
      o.add((b) => b.setViewContextProperty(E, S));
    },
    getViewContext: () => h,
    globalContext: i,
    userContext: a,
    accountContext: c,
    addAction(E) {
      o.add((S) => S.addAction(E));
    },
    addError(E) {
      o.add((S) => S.addError(E));
    },
    addFeatureFlagEvaluation(E, S) {
      o.add((b) => b.addFeatureFlagEvaluation(E, S));
    },
    startDurationVital(E, S) {
      return ep(r, E, S);
    },
    stopDurationVital(E, S) {
      tp(y, r, E, S);
    },
    addDurationVital: y,
    addOperationStepVital: (E, S, b, T) => {
      o.add((D) => D.addOperationStepVital(se(E), S, se(b), se(T)));
    }
  };
}
function rT(e) {
  var t, n;
  return {
    ...e,
    applicationId: "00000000-aaaa-0000-aaaa-000000000000",
    clientToken: "empty",
    sessionSampleRate: 100,
    defaultPrivacyLevel: (t = e.defaultPrivacyLevel) !== null && t !== void 0 ? t : (n = Gn()) === null || n === void 0 ? void 0 : n.getPrivacyLevel()
  };
}
function Si(e, t, n) {
  e.changeObservable.subscribe(() => {
    const r = e.getContext();
    n.add((s) => s[t].setContext(r));
  });
}
function sT(e, t, n, r = {}) {
  const s = nf(), o = bS(), i = Qf().observable;
  let a = nT(r, s, o, (l, f, p) => {
    const h = e(l, t, n, p, f && r.createDeflateEncoder ? (m) => r.createDeflateEncoder(l, f, m) : nc, s, o, i, r.sdkName);
    return t.onRumStart(h.lifeCycle, l, h.session, h.viewHistory, f, h.telemetry), n.onRumStart(h.lifeCycle, h.hooks, l, h.session, h.viewHistory), a = oT(a, h), np(l.plugins, "onRumStart", {
      strategy: a,
      // TODO: remove this in the next major release
      addEvent: h.addEvent
    }), h;
  });
  const c = () => a, u = M((l) => {
    const f = typeof l == "object" ? l : { name: l };
    a.startView(f), Ee({ feature: "start-view" });
  }), d = Lf({
    init: (l) => {
      const f = new Error().stack;
      xt(() => a.init(l, d, f));
    },
    setTrackingConsent: M((l) => {
      s.update(l), Ee({ feature: "set-tracking-consent", tracking_consent: l });
    }),
    setViewName: M((l) => {
      a.setViewName(l), Ee({ feature: "set-view-name" });
    }),
    setViewContext: M((l) => {
      a.setViewContext(l), Ee({ feature: "set-view-context" });
    }),
    setViewContextProperty: M((l, f) => {
      a.setViewContextProperty(l, f), Ee({ feature: "set-view-context-property" });
    }),
    getViewContext: M(() => (Ee({ feature: "set-view-context-property" }), a.getViewContext())),
    getInternalContext: M((l) => a.getInternalContext(l)),
    getInitConfiguration: M(() => Vo(a.initConfiguration)),
    addAction: (l, f) => {
      const p = yr("action");
      xt(() => {
        a.addAction({
          name: se(l),
          context: se(f),
          startClocks: pe(),
          type: Ko.CUSTOM,
          handlingStack: p
        }), Ee({ feature: "add-action" });
      });
    },
    addError: (l, f) => {
      const p = yr("error");
      xt(() => {
        a.addError({
          error: l,
          // Do not sanitize error here, it is needed unserialized by computeRawError()
          handlingStack: p,
          context: se(f),
          startClocks: pe()
        }), Ee({ feature: "add-error" });
      });
    },
    addTiming: M((l, f) => {
      a.addTiming(se(l), f);
    }),
    setGlobalContext: ne(c, J.globalContext, re.setContext, "set-global-context"),
    getGlobalContext: ne(c, J.globalContext, re.getContext, "get-global-context"),
    setGlobalContextProperty: ne(c, J.globalContext, re.setContextProperty, "set-global-context-property"),
    removeGlobalContextProperty: ne(c, J.globalContext, re.removeContextProperty, "remove-global-context-property"),
    clearGlobalContext: ne(c, J.globalContext, re.clearContext, "clear-global-context"),
    setUser: ne(c, J.userContext, re.setContext, "set-user"),
    getUser: ne(c, J.userContext, re.getContext, "get-user"),
    setUserProperty: ne(c, J.userContext, re.setContextProperty, "set-user-property"),
    removeUserProperty: ne(c, J.userContext, re.removeContextProperty, "remove-user-property"),
    clearUser: ne(c, J.userContext, re.clearContext, "clear-user"),
    setAccount: ne(c, J.accountContext, re.setContext, "set-account"),
    getAccount: ne(c, J.accountContext, re.getContext, "get-account"),
    setAccountProperty: ne(c, J.accountContext, re.setContextProperty, "set-account-property"),
    removeAccountProperty: ne(c, J.accountContext, re.removeContextProperty, "remove-account-property"),
    clearAccount: ne(c, J.accountContext, re.clearContext, "clear-account"),
    startView: u,
    stopSession: M(() => {
      a.stopSession(), Ee({ feature: "stop-session" });
    }),
    addFeatureFlagEvaluation: M((l, f) => {
      a.addFeatureFlagEvaluation(se(l), se(f)), Ee({ feature: "add-feature-flag-evaluation" });
    }),
    getSessionReplayLink: M(() => t.getSessionReplayLink()),
    startSessionReplayRecording: M((l) => {
      t.start(l), Ee({ feature: "start-session-replay-recording", force: l && l.force });
    }),
    stopSessionReplayRecording: M(() => t.stop()),
    addDurationVital: M((l, f) => {
      Ee({ feature: "add-duration-vital" }), a.addDurationVital({
        name: se(l),
        type: rs.DURATION,
        startClocks: Rb(f.startTime),
        duration: f.duration,
        context: se(f && f.context),
        description: se(f && f.description)
      });
    }),
    startDurationVital: M((l, f) => (Ee({ feature: "start-duration-vital" }), a.startDurationVital(se(l), {
      context: se(f && f.context),
      description: se(f && f.description)
    }))),
    stopDurationVital: M((l, f) => {
      Ee({ feature: "stop-duration-vital" }), a.stopDurationVital(typeof l == "string" ? se(l) : l, {
        context: se(f && f.context),
        description: se(f && f.description)
      });
    }),
    startFeatureOperation: M((l, f) => {
      Ee({ feature: "add-operation-step-vital", action_type: "start" }), a.addOperationStepVital(l, "start", f);
    }),
    succeedFeatureOperation: M((l, f) => {
      Ee({ feature: "add-operation-step-vital", action_type: "succeed" }), a.addOperationStepVital(l, "end", f);
    }),
    failFeatureOperation: M((l, f, p) => {
      Ee({ feature: "add-operation-step-vital", action_type: "fail" }), a.addOperationStepVital(l, "end", p, f);
    })
  });
  return d;
}
function oT(e, t) {
  return {
    init: (n) => {
      Ho("DD_RUM", n);
    },
    initConfiguration: e.initConfiguration,
    ...t
  };
}
function iT() {
  const e = cp();
  return new Y((t) => {
    if (!e)
      return;
    const n = new e(M((r) => t.notify(r)));
    return n.observe(document, {
      attributes: !0,
      characterData: !0,
      childList: !0,
      subtree: !0
    }), () => n.disconnect();
  });
}
function cp() {
  let e;
  const t = window;
  if (t.Zone && (e = Zt(t, "MutationObserver"), t.MutationObserver && e === t.MutationObserver)) {
    const n = new t.MutationObserver(q), r = Zt(n, "originalInstance");
    e = r && r.constructor;
  }
  return e || (e = t.MutationObserver), e;
}
function aT() {
  const e = new Y(), { stop: t } = We(window, "open", () => e.notify());
  return { observable: e, stop: t };
}
function cT(e, t, n, r, s) {
  return {
    get: (o) => {
      const i = n.findView(o), a = s.findUrl(o), c = t.findTrackedSession(o);
      if (c && i && a) {
        const u = r.findActionId(o);
        return {
          application_id: e,
          session_id: c.id,
          user_action: u ? { id: u } : void 0,
          view: { id: i.id, name: i.name, referrer: a.referrer, url: a.url }
        };
      }
    }
  };
}
const uT = Hf, lT = Vn;
function dT(e) {
  const t = Cr({ expireDelay: lT });
  e.subscribe(1, (r) => {
    t.add(n(r), r.startClocks.relative);
  }), e.subscribe(6, ({ endClocks: r }) => {
    t.closeActive(r.relative);
  }), e.subscribe(3, (r) => {
    const s = t.find(r.startClocks.relative);
    s && (r.name && (s.name = r.name), r.context && (s.context = r.context), s.sessionIsActive = r.sessionIsActive);
  }), e.subscribe(10, () => {
    t.reset();
  });
  function n(r) {
    return {
      service: r.service,
      version: r.version,
      context: r.context,
      id: r.id,
      name: r.name,
      startClocks: r.startClocks
    };
  }
  return {
    findView: (r) => t.find(r),
    stop: () => {
      t.stop();
    }
  };
}
const up = "initial_document", fT = [
  [Le.DOCUMENT, (e) => up === e],
  [Le.XHR, (e) => e === "xmlhttprequest"],
  [Le.FETCH, (e) => e === "fetch"],
  [Le.BEACON, (e) => e === "beacon"],
  [Le.CSS, (e, t) => /\.css$/i.test(t)],
  [Le.JS, (e, t) => /\.js$/i.test(t)],
  [
    Le.IMAGE,
    (e, t) => ["image", "img", "icon"].includes(e) || /\.(gif|jpg|jpeg|tiff|png|svg|ico)$/i.exec(t) !== null
  ],
  [Le.FONT, (e, t) => /\.(woff|eot|woff2|ttf)$/i.exec(t) !== null],
  [
    Le.MEDIA,
    (e, t) => ["audio", "video"].includes(e) || /\.(mp3|mp4)$/i.exec(t) !== null
  ]
];
function pT(e) {
  const t = e.name;
  if (!Wb(t))
    return Le.OTHER;
  const n = Hb(t);
  for (const [r, s] of fT)
    if (s(e.initiatorType, n))
      return r;
  return Le.OTHER;
}
function xu(...e) {
  for (let t = 1; t < e.length; t += 1)
    if (e[t - 1] > e[t])
      return !1;
  return !0;
}
function lp(e) {
  return e.initiatorType === "xmlhttprequest" || e.initiatorType === "fetch";
}
function hT(e) {
  const { duration: t, startTime: n, responseEnd: r } = e;
  return t === 0 && n < r ? le(n, r) : t;
}
function mT(e) {
  if (!fp(e))
    return;
  const { startTime: t, fetchStart: n, workerStart: r, redirectStart: s, redirectEnd: o, domainLookupStart: i, domainLookupEnd: a, connectStart: c, secureConnectionStart: u, connectEnd: d, requestStart: l, responseStart: f, responseEnd: p } = e, h = {
    download: sn(t, f, p),
    first_byte: sn(t, l, f)
  };
  return 0 < r && r < n && (h.worker = sn(t, r, n)), n < d && (h.connect = sn(t, c, d), c <= u && u <= d && (h.ssl = sn(t, u, d))), n < a && (h.dns = sn(t, i, a)), t < o && (h.redirect = sn(t, s, o)), h;
}
function dp(e) {
  return e.duration >= 0;
}
function fp(e) {
  const t = xu(e.startTime, e.fetchStart, e.domainLookupStart, e.domainLookupEnd, e.connectStart, e.connectEnd, e.requestStart, e.responseStart, e.responseEnd), n = gT(e) ? xu(e.startTime, e.redirectStart, e.redirectEnd, e.fetchStart) : !0;
  return t && n;
}
function gT(e) {
  return e.redirectEnd > e.startTime;
}
function sn(e, t, n) {
  if (e <= t && t <= n)
    return {
      duration: K(le(t, n)),
      start: K(le(e, t))
    };
}
function yT(e) {
  return e.nextHopProtocol === "" ? void 0 : e.nextHopProtocol;
}
function _T(e) {
  return e.deliveryType === "" ? "other" : e.deliveryType;
}
function bT(e) {
  if (e.startTime < e.responseStart) {
    const { encodedBodySize: t, decodedBodySize: n, transferSize: r } = e;
    return {
      size: n,
      encoded_body_size: t,
      decoded_body_size: n,
      transfer_size: r
    };
  }
  return {
    size: void 0,
    encoded_body_size: void 0,
    decoded_body_size: void 0,
    transfer_size: void 0
  };
}
function uc(e) {
  return e && (!Rf(e) || Ir(Lt.TRACK_INTAKE_REQUESTS));
}
const wT = /data:(.+)?(;base64)?,/g, ET = 24e3;
function pp(e, t = ET) {
  if (e.length <= t || !e.startsWith("data:"))
    return e;
  const n = e.substring(0, 100).match(wT);
  return n ? `${n[0]}[...]` : e;
}
let Ou = 1;
function ST(e, t, n, r, s) {
  const o = kS(t, n, r, s);
  TT(e, t, o), vT(e, o);
}
function TT(e, t, n) {
  const r = Gf(t).subscribe((s) => {
    const o = s;
    if (uc(o.url))
      switch (o.state) {
        case "start":
          n.traceXhr(o, o.xhr), o.requestIndex = hp(), e.notify(7, {
            requestIndex: o.requestIndex,
            url: o.url
          });
          break;
        case "complete":
          n.clearTracingIfNeeded(o), e.notify(8, {
            duration: o.duration,
            method: o.method,
            requestIndex: o.requestIndex,
            spanId: o.spanId,
            startClocks: o.startClocks,
            status: o.status,
            traceId: o.traceId,
            traceSampled: o.traceSampled,
            type: Ln.XHR,
            url: o.url,
            xhr: o.xhr,
            isAborted: o.isAborted,
            handlingStack: o.handlingStack,
            body: o.body
          });
          break;
      }
  });
  return { stop: () => r.unsubscribe() };
}
function vT(e, t) {
  const n = zo().subscribe((r) => {
    const s = r;
    if (uc(s.url))
      switch (s.state) {
        case "start":
          t.traceFetch(s), s.requestIndex = hp(), e.notify(7, {
            requestIndex: s.requestIndex,
            url: s.url
          });
          break;
        case "resolve":
          IT(s, (o) => {
            var i;
            t.clearTracingIfNeeded(s), e.notify(8, {
              duration: o,
              method: s.method,
              requestIndex: s.requestIndex,
              responseType: s.responseType,
              spanId: s.spanId,
              startClocks: s.startClocks,
              status: s.status,
              traceId: s.traceId,
              traceSampled: s.traceSampled,
              type: Ln.FETCH,
              url: s.url,
              response: s.response,
              init: s.init,
              input: s.input,
              isAborted: s.isAborted,
              handlingStack: s.handlingStack,
              body: (i = s.init) === null || i === void 0 ? void 0 : i.body
            });
          });
          break;
      }
  });
  return { stop: () => n.unsubscribe() };
}
function hp() {
  const e = Ou;
  return Ou += 1, e;
}
function IT(e, t) {
  const n = e.response && hf(e.response);
  !n || !n.body ? t(le(e.startClocks.timeStamp, te())) : Jf(n.body, () => {
    t(le(e.startClocks.timeStamp, te()));
  }, {
    bytesLimit: Number.POSITIVE_INFINITY,
    collectStreamBody: !1
  });
}
function mp(e) {
  return ls(e) && e < 0 ? void 0 : e;
}
function gp({ lifeCycle: e, isChildEvent: t, onChange: n = q }) {
  const r = {
    errorCount: 0,
    longTaskCount: 0,
    resourceCount: 0,
    actionCount: 0,
    frustrationCount: 0
  }, s = e.subscribe(13, (o) => {
    var i;
    if (!(o.type === "view" || o.type === "vital" || !t(o)))
      switch (o.type) {
        case H.ERROR:
          r.errorCount += 1, n();
          break;
        case H.ACTION:
          r.actionCount += 1, o.action.frustration && (r.frustrationCount += o.action.frustration.type.length), n();
          break;
        case H.LONG_TASK:
          r.longTaskCount += 1, n();
          break;
        case H.RESOURCE:
          !((i = o._dd) === null || i === void 0) && i.discarded || (r.resourceCount += 1, n());
          break;
      }
  });
  return {
    stop: () => {
      s.unsubscribe();
    },
    eventCounts: r
  };
}
function kT(e, t) {
  const n = De();
  let r = !1;
  const { stop: s } = He(e, window, [
    "click",
    "mousedown",
    "keydown",
    "touchstart",
    "pointerdown"
    /* DOM_EVENT.POINTER_DOWN */
  ], (a) => {
    if (!a.cancelable)
      return;
    const c = {
      entryType: "first-input",
      processingStart: je(),
      processingEnd: je(),
      startTime: a.timeStamp,
      duration: 0,
      // arbitrary value to avoid nullable duration and simplify INP logic
      name: "",
      cancelable: !1,
      target: null,
      toJSON: () => ({})
    };
    a.type === "pointerdown" ? o(e, c) : i(c);
  }, { passive: !0, capture: !0 });
  return { stop: s };
  function o(a, c) {
    He(a, window, [
      "pointerup",
      "pointercancel"
      /* DOM_EVENT.POINTER_CANCEL */
    ], (u) => {
      u.type === "pointerup" && i(c);
    }, { once: !0 });
  }
  function i(a) {
    if (!r) {
      r = !0, s();
      const c = a.processingStart - a.startTime;
      c >= 0 && c < De() - n && t(a);
    }
  }
}
var Q;
(function(e) {
  e.EVENT = "event", e.FIRST_INPUT = "first-input", e.LARGEST_CONTENTFUL_PAINT = "largest-contentful-paint", e.LAYOUT_SHIFT = "layout-shift", e.LONG_TASK = "longtask", e.LONG_ANIMATION_FRAME = "long-animation-frame", e.NAVIGATION = "navigation", e.PAINT = "paint", e.RESOURCE = "resource", e.VISIBILITY_STATE = "visibility-state";
})(Q || (Q = {}));
function St(e, t) {
  return new Y((n) => {
    if (!window.PerformanceObserver)
      return;
    const r = (c) => {
      const u = RT(c);
      u.length > 0 && n.notify(u);
    };
    let s, o = !0;
    const i = new PerformanceObserver(M((c) => {
      o ? s = Ie(() => r(c.getEntries())) : r(c.getEntries());
    }));
    try {
      i.observe(t);
    } catch {
      if ([
        Q.RESOURCE,
        Q.NAVIGATION,
        Q.LONG_TASK,
        Q.PAINT
      ].includes(t.type)) {
        t.buffered && (s = Ie(() => r(performance.getEntriesByType(t.type))));
        try {
          i.observe({ entryTypes: [t.type] });
        } catch {
          return;
        }
      }
    }
    o = !1, CT(e);
    let a;
    return !rn(Q.FIRST_INPUT) && t.type === Q.FIRST_INPUT && ({ stop: a } = kT(e, (c) => {
      r([c]);
    })), () => {
      i.disconnect(), a && a(), Be(s);
    };
  });
}
let Nr;
function CT(e) {
  return !Nr && AT() && "addEventListener" in performance && (Nr = ce(e, performance, "resourcetimingbufferfull", () => {
    performance.clearResourceTimings();
  })), () => {
    Nr?.stop();
  };
}
function AT() {
  return window.performance !== void 0 && "getEntries" in performance;
}
function rn(e) {
  return window.PerformanceObserver && PerformanceObserver.supportedEntryTypes !== void 0 && PerformanceObserver.supportedEntryTypes.includes(e);
}
function RT(e) {
  return e.filter((t) => !xT(t));
}
function xT(e) {
  return e.entryType === Q.RESOURCE && (!uc(e.name) || !dp(e));
}
function oa(e) {
  return e.nodeType === Node.TEXT_NODE;
}
function OT(e) {
  return e.nodeType === Node.COMMENT_NODE;
}
function Nt(e) {
  return e.nodeType === Node.ELEMENT_NODE;
}
function jo(e) {
  return Nt(e) && !!e.shadowRoot;
}
function lc(e) {
  const t = e;
  return !!t.host && t.nodeType === Node.DOCUMENT_FRAGMENT_NODE && Nt(t.host);
}
function LT(e) {
  return e.childNodes.length > 0 || jo(e);
}
function yp(e, t) {
  let n = e.firstChild;
  for (; n; )
    t(n), n = n.nextSibling;
  jo(e) && t(e.shadowRoot);
}
function qo(e) {
  return lc(e) ? e.host : e.parentNode;
}
const _p = 100, NT = 100, Lu = "data-dd-excluded-activity-mutations";
function dc(e, t, n, r, s, o) {
  const i = PT(e, t, n, r);
  return MT(i, s, o);
}
function MT(e, t, n) {
  let r, s = !1;
  const o = Ie(M(() => u({ hadActivity: !1 })), _p), i = n !== void 0 ? Ie(M(() => u({ hadActivity: !0, end: te() })), n) : void 0, a = e.subscribe(({ isBusy: d }) => {
    Be(o), Be(r);
    const l = te();
    d || (r = Ie(M(() => u({ hadActivity: !0, end: l })), NT));
  }), c = () => {
    s = !0, Be(o), Be(r), Be(i), a.unsubscribe();
  };
  function u(d) {
    s || (c(), t(d));
  }
  return { stop: c };
}
function PT(e, t, n, r) {
  return new Y((s) => {
    const o = [];
    let i, a = 0;
    return o.push(t.subscribe((u) => {
      u.every(DT) || c();
    }), n.subscribe(c), St(r, { type: Q.RESOURCE }).subscribe((u) => {
      u.some((d) => !Ti(r, d.name)) && c();
    }), e.subscribe(7, (u) => {
      Ti(r, u.url) || (i === void 0 && (i = u.requestIndex), a += 1, c());
    }), e.subscribe(8, (u) => {
      Ti(r, u.url) || i === void 0 || // If the request started before the tracking start, ignore it
      u.requestIndex < i || (a -= 1, c());
    })), () => {
      o.forEach((u) => u.unsubscribe());
    };
    function c() {
      s.notify({ isBusy: a > 0 });
    }
  });
}
function Ti(e, t) {
  return Uo(e.excludedActivityUrls, t);
}
function DT(e) {
  const t = e.type === "characterData" ? e.target.parentElement : e.target;
  return !!(t && Nt(t) && t.matches(`[${Lu}], [${Lu}] *`));
}
const Xo = "data-dd-action-name", UT = "Masked Element", bp = [
  Xo,
  // Common test attributes (list provided by google recorder)
  "data-testid",
  "data-test",
  "data-qa",
  "data-cy",
  "data-test-id",
  "data-qa-id",
  "data-testing",
  // FullStory decorator attributes:
  "data-component",
  "data-element",
  "data-source-file"
], FT = [Ep, BT], $T = [
  Ep,
  VT,
  WT
];
function ys(e, t) {
  if (!e.isConnected)
    return;
  let n, r = e;
  for (; r && r.nodeName !== "HTML"; ) {
    const s = Nu(r, FT, GT, t, n);
    if (s)
      return s;
    n = Nu(r, $T, zT, t, n) || Yo(HT(r), n), r = r.parentElement;
  }
  return n;
}
function wp(e) {
  return /[0-9]/.test(e);
}
function BT(e) {
  if (e.id && !wp(e.id))
    return `#${CSS.escape(e.id)}`;
}
function VT(e) {
  if (e.tagName === "BODY")
    return;
  const t = e.classList;
  for (let n = 0; n < t.length; n += 1) {
    const r = t[n];
    if (!wp(r))
      return `${CSS.escape(e.tagName)}.${CSS.escape(r)}`;
  }
}
function WT(e) {
  return CSS.escape(e.tagName);
}
function Ep(e, t) {
  if (t) {
    const r = n(t);
    if (r)
      return r;
  }
  for (const r of bp) {
    const s = n(r);
    if (s)
      return s;
  }
  function n(r) {
    if (e.hasAttribute(r))
      return `${CSS.escape(e.tagName)}[${r}="${CSS.escape(e.getAttribute(r))}"]`;
  }
}
function HT(e) {
  let t = e.parentElement.firstElementChild, n = 1;
  for (; t && t !== e; )
    t.tagName === e.tagName && (n += 1), t = t.nextElementSibling;
  return `${CSS.escape(e.tagName)}:nth-of-type(${n})`;
}
function Nu(e, t, n, r, s) {
  for (const o of t) {
    const i = o(e, r);
    if (i && n(e, i, s))
      return Yo(i, s);
  }
}
function GT(e, t, n) {
  return e.ownerDocument.querySelectorAll(Yo(t, n)).length === 1;
}
function zT(e, t, n) {
  let r;
  if (n === void 0)
    r = (i) => i.matches(t);
  else {
    const i = Yo(`${t}:scope`, n);
    r = (a) => a.querySelector(i) !== null;
  }
  let o = e.parentElement.firstElementChild;
  for (; o; ) {
    if (o !== e && r(o))
      return !1;
    o = o.nextElementSibling;
  }
  return !0;
}
function Yo(e, t) {
  return t ? `${e}>${t}` : e;
}
const P = {
  IGNORE: "ignore",
  HIDDEN: "hidden",
  ALLOW: tr.ALLOW,
  MASK: tr.MASK,
  MASK_USER_INPUT: tr.MASK_USER_INPUT,
  MASK_UNLESS_ALLOWLISTED: tr.MASK_UNLESS_ALLOWLISTED
}, fc = "data-dd-privacy", KT = "hidden", jT = "dd-privacy-", qt = "***", Mu = "data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==", qT = {
  INPUT: !0,
  OUTPUT: !0,
  TEXTAREA: !0,
  SELECT: !0,
  OPTION: !0,
  DATALIST: !0,
  OPTGROUP: !0
}, XT = "x";
function pn(e) {
  return `[${fc}="${e}"], .${jT}${e}`;
}
function dt(e, t, n) {
  if (n && n.has(e))
    return n.get(e);
  const r = qo(e), s = r ? dt(r, t, n) : t, o = Tp(e), i = Sp(o, s);
  return n && n.set(e, i), i;
}
function Sp(e, t) {
  switch (t) {
    // These values cannot be overridden
    case P.HIDDEN:
    case P.IGNORE:
      return t;
  }
  switch (e) {
    case P.ALLOW:
    case P.MASK:
    case P.MASK_USER_INPUT:
    case P.MASK_UNLESS_ALLOWLISTED:
    case P.HIDDEN:
    case P.IGNORE:
      return e;
    default:
      return t;
  }
}
function Tp(e) {
  if (Nt(e)) {
    if (e.tagName === "BASE")
      return P.ALLOW;
    if (e.tagName === "INPUT") {
      const t = e;
      if (t.type === "password" || t.type === "email" || t.type === "tel" || t.type === "hidden")
        return P.MASK;
      const n = t.getAttribute("autocomplete");
      if (n && (n.startsWith("cc-") || n.endsWith("-password")))
        return P.MASK;
    }
    if (e.matches(pn(P.HIDDEN)))
      return P.HIDDEN;
    if (e.matches(pn(P.MASK)))
      return P.MASK;
    if (e.matches(pn(P.MASK_UNLESS_ALLOWLISTED)))
      return P.MASK_UNLESS_ALLOWLISTED;
    if (e.matches(pn(P.MASK_USER_INPUT)))
      return P.MASK_USER_INPUT;
    if (e.matches(pn(P.ALLOW)))
      return P.ALLOW;
    if (YT(e))
      return P.IGNORE;
  }
}
function _s(e, t) {
  switch (t) {
    case P.MASK:
    case P.HIDDEN:
    case P.IGNORE:
      return !0;
    case P.MASK_UNLESS_ALLOWLISTED:
      return oa(e) ? Ms(e.parentNode) ? !0 : !kp(e.textContent || "") : Ms(e);
    case P.MASK_USER_INPUT:
      return oa(e) ? Ms(e.parentNode) : Ms(e);
    default:
      return !1;
  }
}
function Ms(e) {
  if (!e || e.nodeType !== e.ELEMENT_NODE)
    return !1;
  const t = e;
  if (t.tagName === "INPUT")
    switch (t.type) {
      case "button":
      case "color":
      case "reset":
      case "submit":
        return !1;
    }
  return !!qT[t.tagName];
}
const vp = (e) => e.replace(/\S/g, XT);
function Ip(e, t, n) {
  var r;
  const s = (r = e.parentElement) === null || r === void 0 ? void 0 : r.tagName;
  let o = e.textContent || "";
  if (t && !o.trim())
    return;
  const i = n;
  if (s === "SCRIPT")
    o = qt;
  else if (i === P.HIDDEN)
    o = qt;
  else if (_s(e, i))
    if (
      // Scrambling the child list breaks text nodes for DATALIST/SELECT/OPTGROUP
      s === "DATALIST" || s === "SELECT" || s === "OPTGROUP"
    ) {
      if (!o.trim())
        return;
    } else s === "OPTION" ? o = qt : i === P.MASK_UNLESS_ALLOWLISTED ? o = JT(o) : o = vp(o);
  return o;
}
function YT(e) {
  if (e.nodeName === "SCRIPT")
    return !0;
  if (e.nodeName === "LINK") {
    const n = t("rel");
    return (
      // Link as script - Ignore only when rel=preload, modulepreload or prefetch
      /preload|prefetch/i.test(n) && t("as") === "script" || // Favicons
      n === "shortcut icon" || n === "icon"
    );
  }
  if (e.nodeName === "META") {
    const n = t("name"), r = t("rel"), s = t("property");
    return (
      // Favicons
      /^msapplication-tile(image|color)$/.test(n) || n === "application-name" || r === "icon" || r === "apple-touch-icon" || r === "shortcut icon" || // Description
      n === "keywords" || n === "description" || // Social
      /^(og|twitter|fb):/.test(s) || /^(og|twitter):/.test(n) || n === "pinterest" || // Robots
      n === "robots" || n === "googlebot" || n === "bingbot" || // Http headers. Ex: X-UA-Compatible, Content-Type, Content-Language, cache-control,
      // X-Translated-By
      e.hasAttribute("http-equiv") || // Authorship
      n === "author" || n === "generator" || n === "framework" || n === "publisher" || n === "progid" || /^article:/.test(s) || /^product:/.test(s) || // Verification
      n === "google-site-verification" || n === "yandex-verification" || n === "csrf-token" || n === "p:domain_verify" || n === "verify-v1" || n === "verification" || n === "shopify-checkout-api-token"
    );
  }
  function t(n) {
    return (e.getAttribute(n) || "").toLowerCase();
  }
  return !1;
}
function kp(e) {
  var t;
  return !e || !e.trim() ? !0 : ((t = window.$DD_ALLOW) === null || t === void 0 ? void 0 : t.has(e.toLocaleLowerCase())) || !1;
}
function JT(e, t) {
  return kp(e) ? e : t || vp(e);
}
const Cp = Re, QT = 100;
function ZT(e, t) {
  const n = [];
  let r = 0, s;
  o(e);
  function o(c) {
    c.stopObservable.subscribe(i), n.push(c), Be(s), s = Ie(a, Cp);
  }
  function i() {
    r === 1 && n.every((c) => c.isStopped()) && (r = 2, t(n));
  }
  function a() {
    Be(s), r === 0 && (r = 1, i());
  }
  return {
    tryAppend: (c) => r !== 0 ? !1 : n.length > 0 && !ev(n[n.length - 1].event, c.event) ? (a(), !1) : (o(c), !0),
    stop: () => {
      a();
    }
  };
}
function ev(e, t) {
  return e.target === t.target && tv(e, t) <= QT && e.timeStamp - t.timeStamp <= Cp;
}
function tv(e, t) {
  return Math.sqrt(Math.pow(e.clientX - t.clientX, 2) + Math.pow(e.clientY - t.clientY, 2));
}
function nv(e, t, n = P.ALLOW) {
  const { actionNameAttribute: r } = t, s = Pu(e, Xo) || r && Pu(e, r);
  return s ? {
    name: s,
    nameSource: "custom_attribute"
    /* ActionNameSource.CUSTOM_ATTRIBUTE */
  } : n === P.MASK ? {
    name: UT,
    nameSource: "mask_placeholder"
    /* ActionNameSource.MASK_PLACEHOLDER */
  } : Du(e, rv, t) || Du(e, sv, t) || {
    name: "",
    nameSource: "blank"
  };
}
function Pu(e, t) {
  const n = e.closest(`[${t}]`);
  if (!n)
    return;
  const r = n.getAttribute(t);
  return Rp(Ap(r.trim()));
}
const rv = [
  // associated LABEL text
  (e, t) => {
    if ("labels" in e && e.labels && e.labels.length > 0)
      return Xs(e.labels[0], t);
  },
  // INPUT button (and associated) value
  (e) => {
    if (e.nodeName === "INPUT") {
      const t = e, n = t.getAttribute("type");
      if (n === "button" || n === "submit" || n === "reset")
        return {
          name: t.value,
          nameSource: "text_content"
          /* ActionNameSource.TEXT_CONTENT */
        };
    }
  },
  // BUTTON, LABEL or button-like element text
  (e, t) => {
    if (e.nodeName === "BUTTON" || e.nodeName === "LABEL" || e.getAttribute("role") === "button")
      return Xs(e, t);
  },
  (e) => Mr(e, "aria-label"),
  // associated element text designated by the aria-labelledby attribute
  (e, t) => {
    const n = e.getAttribute("aria-labelledby");
    if (n)
      return {
        name: n.split(/\s+/).map((r) => iv(e, r)).filter((r) => !!r).map((r) => xp(r, t)).join(" "),
        nameSource: "text_content"
      };
  },
  (e) => Mr(e, "alt"),
  (e) => Mr(e, "name"),
  (e) => Mr(e, "title"),
  (e) => Mr(e, "placeholder"),
  // SELECT first OPTION text
  (e, t) => {
    if ("options" in e && e.options.length > 0)
      return Xs(e.options[0], t);
  }
], sv = [
  (e, t) => Xs(e, t)
], ov = 10;
function Du(e, t, n) {
  let r = e, s = 0;
  for (; s <= ov && r && r.nodeName !== "BODY" && r.nodeName !== "HTML" && r.nodeName !== "HEAD"; ) {
    for (const o of t) {
      const i = o(r, n);
      if (i) {
        const { name: a, nameSource: c } = i, u = a && a.trim();
        if (u)
          return { name: Rp(Ap(u)), nameSource: c };
      }
    }
    if (r.nodeName === "FORM")
      break;
    r = r.parentElement, s += 1;
  }
}
function Ap(e) {
  return e.replace(/\s+/g, " ");
}
function Rp(e) {
  return e.length > 100 ? `${ja(e, 100)} [...]` : e;
}
function iv(e, t) {
  return e.ownerDocument ? e.ownerDocument.getElementById(t) : null;
}
function Mr(e, t) {
  return {
    name: e.getAttribute(t) || "",
    nameSource: "standard_attribute"
  };
}
function Xs(e, t) {
  return {
    name: xp(e, t) || "",
    nameSource: "text_content"
  };
}
function xp(e, t) {
  if (e.isContentEditable)
    return;
  const { enablePrivacyForActionName: n, actionNameAttribute: r, defaultPrivacyLevel: s } = t;
  if (Ir(Lt.USE_TREE_WALKER_FOR_ACTION_NAME))
    return av(e, r, n, s);
  if ("innerText" in e) {
    let o = e.innerText;
    const i = (a) => {
      const c = e.querySelectorAll(a);
      for (let u = 0; u < c.length; u += 1) {
        const d = c[u];
        if ("innerText" in d) {
          const l = d.innerText;
          l && l.trim().length > 0 && (o = o.replace(l, ""));
        }
      }
    };
    return i(`[${Xo}]`), r && i(`[${r}]`), n && i(`${pn(P.HIDDEN)}, ${pn(P.MASK)}`), o;
  }
  return e.textContent;
}
function av(e, t, n, r) {
  const s = /* @__PURE__ */ new Map(), o = document.createTreeWalker(
    e,
    // eslint-disable-next-line no-bitwise
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    a
  );
  let i = "";
  for (; o.nextNode(); ) {
    const c = o.currentNode;
    if (Nt(c)) {
      // Following InnerText rendering spec https://html.spec.whatwg.org/multipage/dom.html#rendered-text-collection-steps
      (c.nodeName === "BR" || c.nodeName === "P" || ["block", "flex", "grid", "list-item", "table", "table-caption"].includes(getComputedStyle(c).display)) && (i += " ");
      continue;
    }
    i += c.textContent || "";
  }
  return i.replace(/\s+/g, " ").trim();
  function a(c) {
    const u = dt(c, r, s);
    if (n && u && _s(c, u))
      return NodeFilter.FILTER_REJECT;
    if (Nt(c)) {
      if (c.hasAttribute(Xo) || t && c.hasAttribute(t))
        return NodeFilter.FILTER_REJECT;
      const d = getComputedStyle(c);
      if (d.visibility !== "visible" || d.display === "none" || d.contentVisibility && d.contentVisibility !== "visible")
        return NodeFilter.FILTER_REJECT;
    }
    return NodeFilter.FILTER_ACCEPT;
  }
}
function cv(e, { onPointerDown: t, onPointerUp: n }) {
  let r, s = {
    selection: !1,
    input: !1,
    scroll: !1
  }, o;
  const i = [
    ce(e, window, "pointerdown", (a) => {
      Fu(a) && (r = Uu(), s = {
        selection: !1,
        input: !1,
        scroll: !1
      }, o = t(a));
    }, { capture: !0 }),
    ce(e, window, "selectionchange", () => {
      (!r || !Uu()) && (s.selection = !0);
    }, { capture: !0 }),
    ce(e, window, "scroll", () => {
      s.scroll = !0;
    }, { capture: !0, passive: !0 }),
    ce(e, window, "pointerup", (a) => {
      if (Fu(a) && o) {
        const c = s;
        n(o, a, () => c), o = void 0;
      }
    }, { capture: !0 }),
    ce(e, window, "input", () => {
      s.input = !0;
    }, { capture: !0 })
  ];
  return {
    stop: () => {
      i.forEach((a) => a.stop());
    }
  };
}
function Uu() {
  const e = window.getSelection();
  return !e || e.isCollapsed;
}
function Fu(e) {
  return e.target instanceof Element && // Only consider 'primary' pointer events for now. Multi-touch support could be implemented in
  // the future.
  e.isPrimary !== !1;
}
const $u = 3;
function uv(e, t) {
  if (lv(e))
    return t.addFrustration(Lr.RAGE_CLICK), e.some(Bu) && t.addFrustration(Lr.DEAD_CLICK), t.hasError && t.addFrustration(Lr.ERROR_CLICK), { isRage: !0 };
  const n = e.some((r) => r.getUserActivity().selection);
  return e.forEach((r) => {
    r.hasError && r.addFrustration(Lr.ERROR_CLICK), Bu(r) && // Avoid considering clicks part of a double-click or triple-click selections as dead clicks
    !n && r.addFrustration(Lr.DEAD_CLICK);
  }), { isRage: !1 };
}
function lv(e) {
  if (e.some((t) => t.getUserActivity().selection || t.getUserActivity().scroll))
    return !1;
  for (let t = 0; t < e.length - ($u - 1); t += 1)
    if (e[t + $u - 1].event.timeStamp - e[t].event.timeStamp <= Re)
      return !0;
  return !1;
}
const dv = (
  // inputs that don't trigger a meaningful event like "input" when clicked, including textual
  // inputs (using a negative selector is shorter here)
  'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="range"]),textarea,select,[contenteditable],[contenteditable] *,canvas,a[href],a[href] *'
);
function Bu(e) {
  if (e.hasPageActivity || e.getUserActivity().input || e.getUserActivity().scroll)
    return !1;
  let t = e.event.target;
  return t.tagName === "LABEL" && t.hasAttribute("for") && (t = document.getElementById(t.getAttribute("for"))), !t || !t.matches(dv);
}
const Op = 10 * Re, Kr = /* @__PURE__ */ new Map();
function fv(e) {
  const t = Kr.get(e);
  return Kr.delete(e), t;
}
function Lp(e, t) {
  Kr.set(e, t), Kr.forEach((n, r) => {
    le(r, je()) > Op && Kr.delete(r);
  });
}
const pv = 5 * Fe;
function hv(e, t, n, r) {
  const s = Cr({ expireDelay: pv }), o = new Y();
  let i;
  e.subscribe(10, () => {
    s.reset();
  }), e.subscribe(5, d), e.subscribe(11, (l) => {
    l.reason === ir.UNLOADING && d();
  });
  const { stop: a } = cv(r, {
    onPointerDown: (l) => mv(r, e, t, l, n),
    onPointerUp: ({ clickActionBase: l, hadActivityOnPointerDown: f }, p, h) => {
      gv(r, e, t, n, s, o, u, l, p, h, f);
    }
  });
  return {
    stop: () => {
      d(), o.notify(), a();
    },
    actionContexts: {
      findActionId: (l) => s.findAll(l)
    }
  };
  function u(l) {
    if (!i || !i.tryAppend(l)) {
      const f = l.clone();
      i = ZT(l, (p) => {
        _v(p, f);
      });
    }
  }
  function d() {
    i && i.stop();
  }
}
function mv(e, t, n, r, s) {
  let o;
  if (e.enablePrivacyForActionName ? o = dt(r.target, e.defaultPrivacyLevel) : o = P.ALLOW, o === P.HIDDEN)
    return;
  const i = yv(r, o, e);
  let a = !1;
  return dc(
    t,
    n,
    s,
    e,
    (c) => {
      a = c.hadActivity;
    },
    // We don't care about the activity duration, we just want to know whether an activity did happen
    // within the "validation delay" or not. Limit the duration so the callback is called sooner.
    _p
  ), { clickActionBase: i, hadActivityOnPointerDown: () => a };
}
function gv(e, t, n, r, s, o, i, a, c, u, d) {
  var l;
  const f = Np(t, s, u, a, c);
  i(f);
  const p = (l = a?.target) === null || l === void 0 ? void 0 : l.selector;
  p && Lp(c.timeStamp, p);
  const { stop: h } = dc(t, n, r, e, (y) => {
    y.hadActivity && y.end < f.startClocks.timeStamp ? f.discard() : y.hadActivity ? f.stop(y.end) : d() ? f.stop(
      // using the click start as activity end, so the click will have some activity but its
      // duration will be 0 (as the activity started before the click start)
      f.startClocks.timeStamp
    ) : f.stop();
  }, Op), m = t.subscribe(5, ({ endClocks: y }) => {
    f.stop(y.timeStamp);
  }), g = o.subscribe(() => {
    f.stop();
  });
  f.stopObservable.subscribe(() => {
    m.unsubscribe(), h(), g.unsubscribe();
  });
}
function yv(e, t, n) {
  const r = e.target.getBoundingClientRect(), s = ys(e.target, n.actionNameAttribute);
  s && Lp(e.timeStamp, s);
  const { name: o, nameSource: i } = nv(e.target, n, t);
  return {
    type: Ko.CLICK,
    target: {
      width: Math.round(r.width),
      height: Math.round(r.height),
      selector: s
    },
    position: {
      // Use clientX and Y because for SVG element offsetX and Y are relatives to the <svg> element
      x: Math.round(e.clientX - r.left),
      y: Math.round(e.clientY - r.top)
    },
    name: o,
    nameSource: i
  };
}
function Np(e, t, n, r, s) {
  const o = Oe(), i = pe(), a = t.add(o, i.relative), c = gp({
    lifeCycle: e,
    isChildEvent: (h) => h.action !== void 0 && (Array.isArray(h.action.id) ? h.action.id.includes(o) : h.action.id === o)
  });
  let u = 0, d;
  const l = [], f = new Y();
  function p(h) {
    u === 0 && (d = h, u = 1, d ? a.close(No(d)) : a.remove(), c.stop(), f.notify());
  }
  return {
    event: s,
    stop: p,
    stopObservable: f,
    get hasError() {
      return c.eventCounts.errorCount > 0;
    },
    get hasPageActivity() {
      return d !== void 0;
    },
    getUserActivity: n,
    addFrustration: (h) => {
      l.push(h);
    },
    startClocks: i,
    isStopped: () => u === 1 || u === 2,
    clone: () => Np(e, t, n, r, s),
    validate: (h) => {
      if (p(), u !== 1)
        return;
      const { resourceCount: m, errorCount: g, longTaskCount: y } = c.eventCounts, _ = {
        duration: d && le(i.timeStamp, d),
        startClocks: i,
        id: o,
        frustrationTypes: l,
        counts: {
          resourceCount: m,
          errorCount: g,
          longTaskCount: y
        },
        events: h ?? [s],
        event: s,
        ...r
      };
      e.notify(0, _), u = 2;
    },
    discard: () => {
      p(), u = 2;
    }
  };
}
function _v(e, t) {
  const { isRage: n } = uv(e, t);
  n ? (e.forEach((r) => r.discard()), t.stop(te()), t.validate(e.map((r) => r.event))) : (t.discard(), e.forEach((r) => r.validate()));
}
function bv(e, t, n, r, s) {
  const { unsubscribe: o } = e.subscribe(0, (c) => {
    e.notify(12, Vu(c));
  });
  t.register(0, ({ startTime: c, eventType: u }) => {
    if (u !== H.ERROR && u !== H.RESOURCE && u !== H.LONG_TASK)
      return Ae;
    const d = i.findActionId(c);
    return d ? {
      type: u,
      action: { id: d }
    } : Ae;
  }), t.register(1, ({ startTime: c }) => ({
    action: { id: i.findActionId(c) }
  }));
  let i = { findActionId: q }, a = q;
  return s.trackUserInteractions && ({ actionContexts: i, stop: a } = hv(e, n, r, s)), {
    addAction: (c) => {
      e.notify(12, Vu(c));
    },
    actionContexts: i,
    stop: () => {
      o(), a();
    }
  };
}
function Vu(e) {
  const t = vi(e) ? {
    action: {
      id: e.id,
      loading_time: mp(K(e.duration)),
      frustration: {
        type: e.frustrationTypes
      },
      error: {
        count: e.counts.errorCount
      },
      long_task: {
        count: e.counts.longTaskCount
      },
      resource: {
        count: e.counts.resourceCount
      }
    },
    _dd: {
      action: {
        target: e.target,
        position: e.position,
        name_source: e.nameSource
      }
    }
  } : {
    context: e.context
  }, n = Ze({
    action: { id: Oe(), target: { name: e.name }, type: e.type },
    date: e.startClocks.timeStamp,
    type: H.ACTION
  }, t), r = vi(e) ? e.duration : void 0, s = vi(e) ? { events: e.events } : { handlingStack: e.handlingStack };
  return {
    rawRumEvent: n,
    duration: r,
    startTime: e.startClocks.relative,
    domainContext: s
  };
}
function vi(e) {
  return e.type !== Ko.CUSTOM;
}
function wv(e) {
  const t = Kf([ge.error]).subscribe((n) => e.notify(n.error));
  return {
    stop: () => {
      t.unsubscribe();
    }
  };
}
function Ev(e, t) {
  const n = Mf(e, [
    _r.cspViolation,
    _r.intervention
  ]).subscribe((r) => t.notify(r));
  return {
    stop: () => {
      n.unsubscribe();
    }
  };
}
function Sv(e, t, n) {
  const r = new Y();
  return n.subscribe((s) => {
    s.type === 0 && r.notify(s.error);
  }), wv(r), Ev(t, r), r.subscribe((s) => e.notify(14, { error: s })), Tv(e);
}
function Tv(e) {
  return e.subscribe(14, ({ error: t }) => {
    e.notify(12, vv(t));
  }), {
    addError: ({ error: t, handlingStack: n, componentStack: r, startClocks: s, context: o }) => {
      const i = Fo({
        originalError: t,
        handlingStack: n,
        componentStack: r,
        startClocks: s,
        nonErrorPrefix: "Provided",
        source: ze.CUSTOM,
        handling: "handled"
      });
      i.context = Ze(i.context, o), e.notify(14, { error: i });
    }
  };
}
function vv(e) {
  const t = {
    date: e.startClocks.timeStamp,
    error: {
      id: Oe(),
      message: e.message,
      source: e.source,
      stack: e.stack,
      handling_stack: e.handlingStack,
      component_stack: e.componentStack,
      type: e.type,
      handling: e.handling,
      causes: e.causes,
      source_type: "browser",
      fingerprint: e.fingerprint,
      csp: e.csp
    },
    type: H.ERROR,
    context: e.context
  }, n = {
    error: e.originalError,
    handlingStack: e.handlingStack
  };
  return {
    rawRumEvent: t,
    startTime: e.startClocks.relative,
    domainContext: n
  };
}
const Wu = /* @__PURE__ */ new WeakSet();
function Iv(e) {
  if (!performance || !("getEntriesByName" in performance))
    return;
  const t = performance.getEntriesByName(e.url, "resource");
  if (!t.length || !("toJSON" in t[0]))
    return;
  const n = t.filter((r) => !Wu.has(r)).filter((r) => dp(r) && fp(r)).filter((r) => kv(r, e.startClocks.relative, Mp({ startTime: e.startClocks.relative, duration: e.duration })));
  if (n.length === 1)
    return Wu.add(n[0]), n[0].toJSON();
}
function Mp(e) {
  return Er(e.startTime, e.duration);
}
function kv(e, t, n) {
  return e.startTime >= t - 1 && Mp(e) <= Er(n, 1);
}
const Cv = 2 * Fe;
function Av(e) {
  const t = Rv(e) || xv(e);
  if (!(!t || t.traceTime <= De() - Cv))
    return t.traceId;
}
function Rv(e) {
  const t = e.querySelector("meta[name=dd-trace-id]"), n = e.querySelector("meta[name=dd-trace-time]");
  return Pp(t && t.content, n && n.content);
}
function xv(e) {
  const t = Ov(e);
  if (t)
    return Pp(es(t, "trace-id"), es(t, "trace-time"));
}
function Pp(e, t) {
  const n = t && Number(t);
  if (!(!e || !n))
    return {
      traceId: e,
      traceTime: n
    };
}
function Ov(e) {
  for (let t = 0; t < e.childNodes.length; t += 1) {
    const n = Hu(e.childNodes[t]);
    if (n)
      return n;
  }
  if (e.body)
    for (let t = e.body.childNodes.length - 1; t >= 0; t -= 1) {
      const n = e.body.childNodes[t], r = Hu(n);
      if (r)
        return r;
      if (!oa(n))
        break;
    }
}
function Hu(e) {
  if (e && OT(e)) {
    const t = /^\s*DATADOG;(.*?)\s*$/.exec(e.data);
    if (t)
      return t[1];
  }
}
function Dp() {
  if (rn(Q.NAVIGATION)) {
    const n = performance.getEntriesByType(Q.NAVIGATION)[0];
    if (n)
      return n;
  }
  const e = Lv(), t = {
    entryType: Q.NAVIGATION,
    initiatorType: "navigation",
    name: window.location.href,
    startTime: 0,
    duration: e.loadEventEnd,
    decodedBodySize: 0,
    encodedBodySize: 0,
    transferSize: 0,
    workerStart: 0,
    toJSON: () => ({ ...t, toJSON: void 0 }),
    ...e
  };
  return t;
}
function Lv() {
  const e = {}, t = performance.timing;
  for (const n in t)
    if (ls(t[n])) {
      const r = n, s = t[r];
      e[r] = s === 0 ? 0 : No(s);
    }
  return e;
}
function Nv(e, t, n = Dp) {
  rc(e, "interactive", () => {
    const r = n(), s = Object.assign(r.toJSON(), {
      entryType: Q.RESOURCE,
      initiatorType: up,
      // The ResourceTiming duration entry should be `responseEnd - startTime`. With
      // NavigationTiming entries, `startTime` is always 0, so set it to `responseEnd`.
      duration: r.responseEnd,
      traceId: Av(document),
      toJSON: () => ({ ...s, toJSON: void 0 })
    });
    t(s);
  });
}
const Mv = 1e3;
function Pv(e) {
  const t = /* @__PURE__ */ new Set(), n = e.subscribe(8, (r) => {
    t.add(r), t.size > Mv && (Dt("Too many requests"), t.delete(t.values().next().value));
  });
  return {
    getMatchingRequest(r) {
      let s = 1 / 0, o;
      for (const i of t) {
        const a = r.startTime - i.startClocks.relative;
        0 <= a && a < s && i.url === r.name && (s = Math.abs(a), o = i);
      }
      return o && t.delete(o), o;
    },
    stop() {
      n.unsubscribe();
    }
  };
}
const Dv = 32 * xn;
function Uv(e, t) {
  return t.allowedGraphQlUrls.find((n) => Uo([n.match], e));
}
function Fv(e, t = !1) {
  if (!e || typeof e != "string")
    return;
  let n;
  try {
    n = JSON.parse(e);
  } catch {
    return;
  }
  if (!n || !n.query)
    return;
  const r = n.query.trim(), s = $v(r), o = n.operationName;
  if (!s)
    return;
  let i;
  return n.variables && (i = JSON.stringify(n.variables)), {
    operationType: s,
    operationName: o,
    variables: i,
    payload: t ? ja(r, Dv, "...") : void 0
  };
}
function $v(e) {
  var t;
  return (t = e.match(/^\s*(query|mutation|subscription)\b/i)) === null || t === void 0 ? void 0 : t[1];
}
function Bv(e, t, n, r = cS(), s = Nv) {
  let o;
  const i = t.trackEarlyRequests;
  i ? o = Pv(e) : e.subscribe(8, (u) => {
    c(() => Vv(u, t, n));
  });
  const a = St(t, {
    type: Q.RESOURCE,
    buffered: !0
  }).subscribe((u) => {
    for (const d of u)
      (i || !lp(d)) && c(() => Gu(d, t, n, o));
  });
  s(t, (u) => {
    c(() => Gu(u, t, n, o));
  });
  function c(u) {
    r.push(() => {
      const d = u();
      d && e.notify(12, d);
    });
  }
  return {
    stop: () => {
      r.stop(), a.unsubscribe();
    }
  };
}
function Vv(e, t, n) {
  const r = Iv(e);
  return Up(r, e, n, t);
}
function Gu(e, t, n, r) {
  const s = lp(e) && r ? r.getMatchingRequest(e) : void 0;
  return Up(e, s, n, t);
}
function Up(e, t, n, r) {
  if (!e && !t)
    return;
  const s = t ? zv(t, r) : Kv(e, r);
  if (!r.trackResources && !s)
    return;
  const o = e ? ds(e.startTime) : t.startClocks, i = e ? hT(e) : jv(n, o, t.duration), a = t && Wv(t, r), c = Ze({
    date: o.timeStamp,
    resource: {
      id: Oe(),
      duration: K(i),
      // TODO: in the future when `entry` is required, we can probably only rely on `computeResourceEntryType`
      type: t ? t.type === Ln.XHR ? Le.XHR : Le.FETCH : pT(e),
      method: t ? t.method : void 0,
      status_code: t ? t.status : qv(e.responseStatus),
      url: t ? pp(t.url) : e.name,
      protocol: e && yT(e),
      delivery_type: e && _T(e),
      graphql: a
    },
    type: H.RESOURCE,
    _dd: {
      discarded: !r.trackResources
    }
  }, s, e && Gv(e));
  return {
    startTime: o.relative,
    duration: i,
    rawRumEvent: c,
    domainContext: Hv(e, t)
  };
}
function Wv(e, t) {
  if (!Ir(Lt.GRAPHQL_TRACKING))
    return;
  const n = Uv(e.url, t);
  if (n)
    return Fv(e.body, n.trackPayload);
}
function Hv(e, t) {
  if (t) {
    const n = {
      performanceEntry: e,
      isAborted: t.isAborted,
      handlingStack: t.handlingStack
    };
    return t.type === Ln.XHR ? {
      xhr: t.xhr,
      ...n
    } : {
      requestInput: t.input,
      requestInit: t.init,
      response: t.response,
      error: t.error,
      ...n
    };
  }
  return {
    // Currently, at least one of `entry` or `request` must be defined when calling this function.
    // So `entry` is guaranteed to be defined here. In the future, when `entry` is required, we can
    // remove the `!` assertion.
    performanceEntry: e
  };
}
function Gv(e) {
  const { renderBlockingStatus: t } = e;
  return {
    resource: {
      render_blocking_status: t,
      ...bT(e),
      ...mT(e)
    }
  };
}
function zv(e, t) {
  if (e.traceSampled && e.traceId && e.spanId)
    return {
      _dd: {
        span_id: e.spanId.toString(),
        trace_id: e.traceId.toString(),
        rule_psr: t.rulePsr
      }
    };
}
function Kv(e, t) {
  if (e.traceId)
    return {
      _dd: {
        trace_id: e.traceId,
        span_id: sp().toString(),
        rule_psr: t.rulePsr
      }
    };
}
function jv(e, t, n) {
  return e.wasInPageStateDuringPeriod("frozen", t.relative, n) ? void 0 : n;
}
function qv(e) {
  return e === 0 ? void 0 : e;
}
function Xv(e, t, n) {
  const { stop: r, eventCounts: s } = gp({
    lifeCycle: e,
    isChildEvent: (o) => o.view.id === t,
    onChange: n
  });
  return {
    stop: r,
    eventCounts: s
  };
}
const Yv = 10 * Fe;
function Jv(e, t, n) {
  return {
    stop: St(e, {
      type: Q.PAINT,
      buffered: !0
    }).subscribe((s) => {
      const o = s.find((i) => i.name === "first-contentful-paint" && i.startTime < t.timeStamp && i.startTime < Yv);
      o && n(o.startTime);
    }).unsubscribe
  };
}
function Qv(e, t) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      t(le(e, je()));
    });
  });
}
function Zv(e, t, n) {
  const r = St(e, {
    type: Q.FIRST_INPUT,
    buffered: !0
  }).subscribe((s) => {
    const o = s.find((i) => i.startTime < t.timeStamp);
    if (o) {
      const i = le(o.startTime, o.processingStart);
      let a;
      o.target && Nt(o.target) && (a = ys(o.target, e.actionNameAttribute)), n({
        // Ensure firstInputDelay to be positive, see
        // https://bugs.chromium.org/p/chromium/issues/detail?id=1185815
        delay: i >= 0 ? i : 0,
        time: o.startTime,
        targetSelector: a
      });
    }
  });
  return {
    stop: () => {
      r.unsubscribe();
    }
  };
}
function eI(e, t, n = Dp) {
  return rI(e, () => {
    const r = n();
    nI(r) || t(tI(r));
  });
}
function tI(e) {
  return {
    domComplete: e.domComplete,
    domContentLoaded: e.domContentLoadedEventEnd,
    domInteractive: e.domInteractive,
    loadEvent: e.loadEventEnd,
    // In some cases the value reported is negative or is larger
    // than the current page time. Ignore these cases:
    // https://github.com/GoogleChrome/web-vitals/issues/137
    // https://github.com/GoogleChrome/web-vitals/issues/162
    firstByte: e.responseStart >= 0 && e.responseStart <= je() ? e.responseStart : void 0
  };
}
function nI(e) {
  return e.loadEventEnd <= 0;
}
function rI(e, t) {
  let n;
  const { stop: r } = rc(e, "complete", () => {
    n = Ie(() => t());
  });
  return {
    stop: () => {
      r(), Be(n);
    }
  };
}
const sI = 10 * Fe;
function oI(e, t, n, r) {
  let s = 1 / 0;
  const { stop: o } = He(e, n, [
    "pointerdown",
    "keydown"
    /* DOM_EVENT.KEY_DOWN */
  ], (c) => {
    s = c.timeStamp;
  }, { capture: !0, once: !0 });
  let i = 0;
  const a = St(e, {
    type: Q.LARGEST_CONTENTFUL_PAINT,
    buffered: !0
  }).subscribe((c) => {
    const u = zd(c, (d) => d.entryType === Q.LARGEST_CONTENTFUL_PAINT && d.startTime < s && d.startTime < t.timeStamp && d.startTime < sI && // Ensure to get the LCP entry with the biggest size, see
    // https://bugs.chromium.org/p/chromium/issues/detail?id=1516655
    d.size > i);
    if (u) {
      let d;
      u.element && (d = ys(u.element, e.actionNameAttribute)), r({
        value: u.startTime,
        targetSelector: d,
        resourceUrl: iI(u)
      }), i = u.size;
    }
  });
  return {
    stop: () => {
      o(), a.unsubscribe();
    }
  };
}
function iI(e) {
  return e.url === "" ? void 0 : e.url;
}
function Fp(e, t, n = window) {
  if (document.visibilityState === "hidden")
    return { timeStamp: 0, stop: q };
  if (rn(Q.VISIBILITY_STATE)) {
    const o = performance.getEntriesByType(Q.VISIBILITY_STATE).filter((i) => i.name === "hidden").find((i) => i.startTime >= t.relative);
    if (o)
      return { timeStamp: o.startTime, stop: q };
  }
  let r = 1 / 0;
  const { stop: s } = He(e, n, [
    "pagehide",
    "visibilitychange"
    /* DOM_EVENT.VISIBILITY_CHANGE */
  ], (o) => {
    (o.type === "pagehide" || document.visibilityState === "hidden") && (r = o.timeStamp, s());
  }, { capture: !0 });
  return {
    get timeStamp() {
      return r;
    },
    stop: s
  };
}
function aI(e, t, n, r) {
  const s = {}, { stop: o } = eI(e, (l) => {
    n(l.loadEvent), s.navigationTimings = l, r();
  }), i = Fp(e, t), { stop: a } = Jv(e, i, (l) => {
    s.firstContentfulPaint = l, r();
  }), { stop: c } = oI(e, i, window, (l) => {
    s.largestContentfulPaint = l, r();
  }), { stop: u } = Zv(e, i, (l) => {
    s.firstInput = l, r();
  });
  function d() {
    o(), a(), c(), u(), i.stop();
  }
  return {
    stop: d,
    initialViewMetrics: s
  };
}
const ia = (e, t) => e * t, cI = (e, t) => {
  const n = Math.max(e.left, t.left), r = Math.max(e.top, t.top), s = Math.min(e.right, t.right), o = Math.min(e.bottom, t.bottom);
  return n >= s || r >= o ? 0 : ia(s - n, o - r);
}, zu = (e) => {
  const t = ia(e.previousRect.width, e.previousRect.height), n = ia(e.currentRect.width, e.currentRect.height), r = cI(e.previousRect, e.currentRect);
  return t + n - r;
};
function uI(e, t, n) {
  if (!hI())
    return {
      stop: q
    };
  let r = 0, s;
  n({
    value: 0
  });
  const o = pI(), i = St(e, {
    type: Q.LAYOUT_SHIFT,
    buffered: !0
  }).subscribe((a) => {
    var c;
    for (const u of a) {
      if (u.hadRecentInput || u.startTime < t)
        continue;
      const { cumulatedValue: d, isMaxValue: l } = o.update(u);
      if (l) {
        const f = lI(u.sources);
        s = {
          target: f?.node ? new WeakRef(f.node) : void 0,
          time: le(t, u.startTime),
          previousRect: f?.previousRect,
          currentRect: f?.currentRect,
          devicePixelRatio: window.devicePixelRatio
        };
      }
      if (d > r) {
        r = d;
        const f = (c = s?.target) === null || c === void 0 ? void 0 : c.deref();
        n({
          value: Hr(r, 4),
          targetSelector: f && ys(f, e.actionNameAttribute),
          time: s?.time,
          previousRect: s?.previousRect ? Ku(s.previousRect) : void 0,
          currentRect: s?.currentRect ? Ku(s.currentRect) : void 0,
          devicePixelRatio: s?.devicePixelRatio
        });
      }
    }
  });
  return {
    stop: () => {
      i.unsubscribe();
    }
  };
}
function lI(e) {
  let t;
  for (const n of e)
    if (n.node && Nt(n.node)) {
      const r = zu(n);
      (!t || zu(t) < r) && (t = n);
    }
  return t;
}
function Ku({ x: e, y: t, width: n, height: r }) {
  return { x: e, y: t, width: n, height: r };
}
const dI = 5 * Re, fI = Re;
function pI() {
  let e = 0, t, n, r = 0;
  return {
    update: (s) => {
      const o = t === void 0 || s.startTime - n >= fI || s.startTime - t >= dI;
      let i;
      return o ? (t = n = s.startTime, r = e = s.value, i = !0) : (e += s.value, n = s.startTime, i = s.value > r, i && (r = s.value)), {
        cumulatedValue: e,
        isMaxValue: i
      };
    }
  };
}
function hI() {
  return rn(Q.LAYOUT_SHIFT) && "WeakRef" in window;
}
let Ys, $p = 0, Ii = 1 / 0, ki = 0;
function mI() {
  "interactionCount" in performance || Ys || (Ys = new window.PerformanceObserver(M((e) => {
    e.getEntries().forEach((t) => {
      const n = t;
      n.interactionId && (Ii = Math.min(Ii, n.interactionId), ki = Math.max(ki, n.interactionId), $p = (ki - Ii) / 7 + 1);
    });
  })), Ys.observe({ type: "event", buffered: !0, durationThreshold: 0 }));
}
const ju = () => Ys ? $p : window.performance.interactionCount || 0, qu = 10, gI = 1 * Fe;
function yI(e, t, n) {
  if (!wI())
    return {
      getInteractionToNextPaint: () => {
      },
      setViewEnd: q,
      stop: q
    };
  const { getViewInteractionCount: r, stopViewInteractionCount: s } = bI(n);
  let o = 1 / 0;
  const i = _I(r);
  let a = -1, c, u;
  function d(p) {
    for (const m of p)
      m.interactionId && // Check the entry start time is inside the view bounds because some view interactions can be reported after the view end (if long duration).
      m.startTime >= t && m.startTime <= o && i.process(m);
    const h = i.estimateP98Interaction();
    h && h.duration !== a && (a = h.duration, u = le(t, h.startTime), c = fv(h.startTime), !c && h.target && Nt(h.target) && (c = ys(h.target, e.actionNameAttribute)));
  }
  const l = St(e, {
    type: Q.FIRST_INPUT,
    buffered: !0
  }).subscribe(d), f = St(e, {
    type: Q.EVENT,
    // durationThreshold only impact PerformanceEventTiming entries used for INP computation which requires a threshold at 40 (default is 104ms)
    // cf: https://github.com/GoogleChrome/web-vitals/blob/3806160ffbc93c3c4abf210a167b81228172b31c/src/onINP.ts#L202-L210
    durationThreshold: 40,
    buffered: !0
  }).subscribe(d);
  return {
    getInteractionToNextPaint: () => {
      if (a >= 0)
        return {
          value: Math.min(a, gI),
          targetSelector: c,
          time: u
        };
      if (r())
        return {
          value: 0
        };
    },
    setViewEnd: (p) => {
      o = p, s();
    },
    stop: () => {
      f.unsubscribe(), l.unsubscribe();
    }
  };
}
function _I(e) {
  const t = [];
  function n() {
    t.sort((r, s) => s.duration - r.duration).splice(qu);
  }
  return {
    /**
     * Process the performance entry:
     * - if its duration is long enough, add the performance entry to the list of worst interactions
     * - if an entry with the same interaction id exists and its duration is lower than the new one, then replace it in the list of worst interactions
     */
    process(r) {
      const s = t.findIndex((i) => r.interactionId === i.interactionId), o = t[t.length - 1];
      s !== -1 ? r.duration > t[s].duration && (t[s] = r, n()) : (t.length < qu || r.duration > o.duration) && (t.push(r), n());
    },
    /**
     * Compute the p98 longest interaction.
     * For better performance the computation is based on 10 longest interactions and the interaction count of the current view.
     */
    estimateP98Interaction() {
      const r = Math.min(t.length - 1, Math.floor(e() / 50));
      return t[r];
    }
  };
}
function bI(e) {
  mI();
  const t = e === kt.INITIAL_LOAD ? 0 : ju();
  let n = { stopped: !1 };
  function r() {
    return ju() - t;
  }
  return {
    getViewInteractionCount: () => n.stopped ? n.interactionCount : r(),
    stopViewInteractionCount: () => {
      n = { stopped: !0, interactionCount: r() };
    }
  };
}
function wI() {
  return rn(Q.EVENT) && window.PerformanceEventTiming && "interactionId" in PerformanceEventTiming.prototype;
}
function EI(e, t, n, r, s, o, i) {
  let a = s === kt.INITIAL_LOAD, c = !0;
  const u = [], d = Fp(r, o);
  function l() {
    if (!c && !a && u.length > 0) {
      const p = Math.max(...u);
      p < d.timeStamp - o.relative && i(p);
    }
  }
  const { stop: f } = dc(e, t, n, r, (p) => {
    c && (c = !1, p.hadActivity && u.push(le(o.timeStamp, p.end)), l());
  });
  return {
    stop: () => {
      f(), d.stop();
    },
    setLoadEvent: (p) => {
      a && (a = !1, u.push(p), l());
    }
  };
}
function Bp() {
  let e;
  const t = window.visualViewport;
  return t ? e = t.pageLeft - t.offsetLeft : window.scrollX !== void 0 ? e = window.scrollX : e = window.pageXOffset || 0, Math.round(e);
}
function pc() {
  let e;
  const t = window.visualViewport;
  return t ? e = t.pageTop - t.offsetTop : window.scrollY !== void 0 ? e = window.scrollY : e = window.pageYOffset || 0, Math.round(e);
}
let Ci;
function Vp(e) {
  return Ci || (Ci = SI(e)), Ci;
}
function SI(e) {
  return new Y((t) => {
    const { throttled: n } = nn(() => {
      t.notify(Jo());
    }, 200);
    return ce(e, window, "resize", n, { capture: !0, passive: !0 }).stop;
  });
}
function Jo() {
  const e = window.visualViewport;
  return e ? {
    width: Number(e.width * e.scale),
    height: Number(e.height * e.scale)
  } : {
    width: Number(window.innerWidth || 0),
    height: Number(window.innerHeight || 0)
  };
}
const TI = Re;
function vI(e, t, n, r = kI(e)) {
  let s = 0, o = 0, i = 0;
  const a = r.subscribe(({ scrollDepth: c, scrollTop: u, scrollHeight: d }) => {
    let l = !1;
    if (c > s && (s = c, l = !0), d > o) {
      o = d;
      const f = je();
      i = le(t.relative, f), l = !0;
    }
    l && n({
      maxDepth: Math.min(s, o),
      maxDepthScrollTop: u,
      maxScrollHeight: o,
      maxScrollHeightTime: i
    });
  });
  return {
    stop: () => a.unsubscribe()
  };
}
function II() {
  const e = pc(), { height: t } = Jo(), n = Math.round((document.scrollingElement || document.documentElement).scrollHeight), r = Math.round(t + e);
  return {
    scrollHeight: n,
    scrollDepth: r,
    scrollTop: e
  };
}
function kI(e, t = TI) {
  return new Y((n) => {
    function r() {
      n.notify(II());
    }
    if (window.ResizeObserver) {
      const s = nn(r, t, {
        leading: !1,
        trailing: !0
      }), o = document.scrollingElement || document.documentElement, i = new ResizeObserver(M(s.throttled));
      o && i.observe(o);
      const a = ce(e, window, "scroll", s.throttled, {
        passive: !0
      });
      return () => {
        s.cancel(), i.disconnect(), a.stop();
      };
    }
  });
}
function CI(e, t, n, r, s, o, i) {
  const a = {}, { stop: c, setLoadEvent: u } = EI(e, t, n, r, o, i, (m) => {
    a.loadingTime = m, s();
  }), { stop: d } = vI(r, i, (m) => {
    a.scroll = m;
  }), { stop: l } = uI(r, i.relative, (m) => {
    a.cumulativeLayoutShift = m, s();
  }), { stop: f, getInteractionToNextPaint: p, setViewEnd: h } = yI(r, i.relative, o);
  return {
    stop: () => {
      c(), l(), d();
    },
    stopINPTracking: f,
    setLoadEvent: u,
    setViewEnd: h,
    getCommonViewMetrics: () => (a.interactionToNextPaint = p(), a)
  };
}
function AI(e, t) {
  const { stop: n } = ce(e, window, "pageshow", (r) => {
    r.persisted && t(r);
  }, { capture: !0 });
  return n;
}
function RI(e, t, n) {
  Qv(e.relative, (r) => {
    t.firstContentfulPaint = r, t.largestContentfulPaint = { value: r }, n();
  });
}
const xI = 3e3, OI = 5 * Fe, LI = 5 * Fe;
function NI(e, t, n, r, s, o, i, a) {
  const c = /* @__PURE__ */ new Set();
  let u = f(kt.INITIAL_LOAD, Ka(), a), d;
  p();
  let l;
  i && (l = h(o), s.trackBfcacheViews && (d = AI(s, (m) => {
    u.end();
    const g = ds(m.timeStamp);
    u = f(kt.BF_CACHE, g, void 0);
  })));
  function f(m, g, y) {
    const _ = MI(t, n, r, s, e, m, g, y);
    return c.add(_), _.stopObservable.subscribe(() => {
      c.delete(_);
    }), _;
  }
  function p() {
    t.subscribe(10, () => {
      u = f(kt.ROUTE_CHANGE, void 0, {
        name: u.name,
        service: u.service,
        version: u.version,
        context: u.contextManager.getContext()
      });
    }), t.subscribe(9, () => {
      u.end({ sessionIsActive: !1 });
    });
  }
  function h(m) {
    return m.subscribe(({ oldLocation: g, newLocation: y }) => {
      DI(g, y) && (u.end(), u = f(kt.ROUTE_CHANGE));
    });
  }
  return {
    addTiming: (m, g = te()) => {
      u.addTiming(m, g);
    },
    startView: (m, g) => {
      u.end({ endClocks: g }), u = f(kt.ROUTE_CHANGE, g, m);
    },
    setViewContext: (m) => {
      u.contextManager.setContext(m);
    },
    setViewContextProperty: (m, g) => {
      u.contextManager.setContextProperty(m, g);
    },
    setViewName: (m) => {
      u.setViewName(m);
    },
    getViewContext: () => u.contextManager.getContext(),
    stop: () => {
      l && l.unsubscribe(), d && d(), u.end(), c.forEach((m) => m.stop());
    }
  };
}
function MI(e, t, n, r, s, o, i = pe(), a) {
  const c = Oe(), u = new Y(), d = {};
  let l = 0, f;
  const p = Zr(s), h = gs();
  let m = !0, g = a?.name;
  const y = a?.service || r.service, _ = a?.version || r.version, w = a?.context;
  w && h.setContext(w);
  const E = {
    id: c,
    name: g,
    startClocks: i,
    service: y,
    version: _,
    context: w
  };
  e.notify(1, E), e.notify(2, E);
  const { throttled: S, cancel: b } = nn(O, xI, {
    leading: !1
  }), { setLoadEvent: T, setViewEnd: D, stop: k, stopINPTracking: I, getCommonViewMetrics: A } = CI(e, t, n, r, ue, o, i), { stop: F, initialViewMetrics: C } = o === kt.INITIAL_LOAD ? aI(r, i, T, ue) : { stop: q, initialViewMetrics: {} };
  o === kt.BF_CACHE && RI(i, C, ue);
  const { stop: v, eventCounts: R } = Xv(e, c, ue), x = Sr(O, OI), j = e.subscribe(11, (L) => {
    L.reason === ir.UNLOADING && O();
  });
  O(), h.changeObservable.subscribe(ue);
  function $() {
    e.notify(3, {
      id: c,
      name: g,
      context: h.getContext(),
      startClocks: i,
      sessionIsActive: m
    });
  }
  function ue() {
    $(), S();
  }
  function O() {
    b(), $(), l += 1;
    const L = f === void 0 ? te() : f.timeStamp;
    e.notify(4, {
      customTimings: d,
      documentVersion: l,
      id: c,
      name: g,
      service: y,
      version: _,
      context: h.getContext(),
      loadingType: o,
      location: p,
      startClocks: i,
      commonViewMetrics: A(),
      initialViewMetrics: C,
      duration: le(i.timeStamp, L),
      isActive: f === void 0,
      sessionIsActive: m,
      eventCounts: R
    });
  }
  return {
    get name() {
      return g;
    },
    service: y,
    version: _,
    contextManager: h,
    stopObservable: u,
    end(L = {}) {
      var z, ve;
      f || (f = (z = L.endClocks) !== null && z !== void 0 ? z : pe(), m = (ve = L.sessionIsActive) !== null && ve !== void 0 ? ve : !0, e.notify(5, { endClocks: f }), e.notify(6, { endClocks: f }), Mo(x), D(f.relative), k(), j.unsubscribe(), O(), Ie(() => {
        this.stop();
      }, LI));
    },
    stop() {
      F(), v(), I(), u.notify();
    },
    addTiming(L, z) {
      if (f)
        return;
      const ve = Lb(z) ? z : le(i.timeStamp, z);
      d[PI(L)] = ve, ue();
    },
    setViewName(L) {
      g = L, O();
    }
  };
}
function PI(e) {
  const t = e.replace(/[^a-zA-Z0-9-_.@$]/g, "_");
  return t !== e && V.warn(`Invalid timing name: ${e}, sanitized to: ${t}`), t;
}
function DI(e, t) {
  return e.pathname !== t.pathname || !UI(t.hash) && Xu(t.hash) !== Xu(e.hash);
}
function UI(e) {
  const t = e.substring(1);
  return t !== "" && !!document.getElementById(t);
}
function Xu(e) {
  const t = e.indexOf("?");
  return t < 0 ? e : e.slice(0, t);
}
function FI(e, t, n, r, s, o, i, a, c, u) {
  return e.subscribe(4, (d) => e.notify(12, $I(d, n, a))), t.register(0, ({ startTime: d, eventType: l }) => {
    const f = c.findView(d);
    return f ? {
      type: l,
      service: f.service,
      version: f.version,
      context: f.context,
      view: {
        id: f.id,
        name: f.name
      }
    } : lt;
  }), t.register(1, ({ startTime: d }) => {
    var l;
    return {
      view: {
        id: (l = c.findView(d)) === null || l === void 0 ? void 0 : l.id
      }
    };
  }), NI(r, e, s, o, n, i, !n.trackViewsManually, u);
}
function $I(e, t, n) {
  var r, s, o, i, a, c, u, d, l, f, p, h, m, g, y, _, w, E;
  const S = n.getReplayStats(e.id), b = (s = (r = e.commonViewMetrics) === null || r === void 0 ? void 0 : r.cumulativeLayoutShift) === null || s === void 0 ? void 0 : s.devicePixelRatio, T = {
    _dd: {
      document_version: e.documentVersion,
      replay_stats: S,
      cls: b ? {
        device_pixel_ratio: b
      } : void 0,
      configuration: {
        start_session_replay_recording_manually: t.startSessionReplayRecordingManually
      }
    },
    date: e.startClocks.timeStamp,
    type: H.VIEW,
    view: {
      action: {
        count: e.eventCounts.actionCount
      },
      frustration: {
        count: e.eventCounts.frustrationCount
      },
      cumulative_layout_shift: (o = e.commonViewMetrics.cumulativeLayoutShift) === null || o === void 0 ? void 0 : o.value,
      cumulative_layout_shift_time: K((i = e.commonViewMetrics.cumulativeLayoutShift) === null || i === void 0 ? void 0 : i.time),
      cumulative_layout_shift_target_selector: (a = e.commonViewMetrics.cumulativeLayoutShift) === null || a === void 0 ? void 0 : a.targetSelector,
      first_byte: K((c = e.initialViewMetrics.navigationTimings) === null || c === void 0 ? void 0 : c.firstByte),
      dom_complete: K((u = e.initialViewMetrics.navigationTimings) === null || u === void 0 ? void 0 : u.domComplete),
      dom_content_loaded: K((d = e.initialViewMetrics.navigationTimings) === null || d === void 0 ? void 0 : d.domContentLoaded),
      dom_interactive: K((l = e.initialViewMetrics.navigationTimings) === null || l === void 0 ? void 0 : l.domInteractive),
      error: {
        count: e.eventCounts.errorCount
      },
      first_contentful_paint: K(e.initialViewMetrics.firstContentfulPaint),
      first_input_delay: K((f = e.initialViewMetrics.firstInput) === null || f === void 0 ? void 0 : f.delay),
      first_input_time: K((p = e.initialViewMetrics.firstInput) === null || p === void 0 ? void 0 : p.time),
      first_input_target_selector: (h = e.initialViewMetrics.firstInput) === null || h === void 0 ? void 0 : h.targetSelector,
      interaction_to_next_paint: K((m = e.commonViewMetrics.interactionToNextPaint) === null || m === void 0 ? void 0 : m.value),
      interaction_to_next_paint_time: K((g = e.commonViewMetrics.interactionToNextPaint) === null || g === void 0 ? void 0 : g.time),
      interaction_to_next_paint_target_selector: (y = e.commonViewMetrics.interactionToNextPaint) === null || y === void 0 ? void 0 : y.targetSelector,
      is_active: e.isActive,
      name: e.name,
      largest_contentful_paint: K((_ = e.initialViewMetrics.largestContentfulPaint) === null || _ === void 0 ? void 0 : _.value),
      largest_contentful_paint_target_selector: (w = e.initialViewMetrics.largestContentfulPaint) === null || w === void 0 ? void 0 : w.targetSelector,
      load_event: K((E = e.initialViewMetrics.navigationTimings) === null || E === void 0 ? void 0 : E.loadEvent),
      loading_time: mp(K(e.commonViewMetrics.loadingTime)),
      loading_type: e.loadingType,
      long_task: {
        count: e.eventCounts.longTaskCount
      },
      performance: BI(e.commonViewMetrics, e.initialViewMetrics),
      resource: {
        count: e.eventCounts.resourceCount
      },
      time_spent: K(e.duration)
    },
    display: e.commonViewMetrics.scroll ? {
      scroll: {
        max_depth: e.commonViewMetrics.scroll.maxDepth,
        max_depth_scroll_top: e.commonViewMetrics.scroll.maxDepthScrollTop,
        max_scroll_height: e.commonViewMetrics.scroll.maxScrollHeight,
        max_scroll_height_time: K(e.commonViewMetrics.scroll.maxScrollHeightTime)
      }
    } : void 0,
    privacy: {
      replay_level: t.defaultPrivacyLevel
    },
    device: {
      locale: navigator.language,
      locales: navigator.languages,
      time_zone: _S()
    }
  };
  return Bn(e.customTimings) || (T.view.custom_timings = Fd(e.customTimings, K)), {
    rawRumEvent: T,
    startTime: e.startClocks.relative,
    duration: e.duration,
    domainContext: {
      location: e.location
    }
  };
}
function BI({ cumulativeLayoutShift: e, interactionToNextPaint: t }, { firstContentfulPaint: n, firstInput: r, largestContentfulPaint: s }) {
  return {
    cls: e && {
      score: e.value,
      timestamp: K(e.time),
      target_selector: e.targetSelector,
      previous_rect: e.previousRect,
      current_rect: e.currentRect
    },
    fcp: n && { timestamp: K(n) },
    fid: r && {
      duration: K(r.delay),
      timestamp: K(r.time),
      target_selector: r.targetSelector
    },
    inp: t && {
      duration: K(t.value),
      timestamp: K(t.time),
      target_selector: t.targetSelector
    },
    lcp: s && {
      timestamp: K(s.value),
      target_selector: s.targetSelector,
      resource_url: s.resourceUrl
    }
  };
}
const VI = "rum";
function WI(e, t, n) {
  const r = Vf(e, VI, (s) => GI(e, s), n);
  return r.expireObservable.subscribe(() => {
    t.notify(
      9
      /* LifeCycleEventType.SESSION_EXPIRED */
    );
  }), r.renewObservable.subscribe(() => {
    t.notify(
      10
      /* LifeCycleEventType.SESSION_RENEWED */
    );
  }), r.sessionStateUpdateObservable.subscribe(({ previousState: s, newState: o }) => {
    if (!s.forcedReplay && o.forcedReplay) {
      const i = r.findSession();
      i && (i.isReplayForced = !0);
    }
  }), {
    findTrackedSession: (s) => {
      const o = r.findSession(s);
      if (!(!o || o.trackingType === "0"))
        return {
          id: o.id,
          sessionReplay: o.trackingType === "1" ? 1 : o.isReplayForced ? 2 : 0,
          anonymousId: o.anonymousId
        };
    },
    expire: r.expire,
    expireObservable: r.expireObservable,
    setForcedReplay: () => r.updateSessionState({ forcedReplay: "1" })
  };
}
function HI() {
  const e = {
    id: "00000000-aaaa-0000-aaaa-000000000000",
    sessionReplay: Sf(
      "records"
      /* BridgeCapability.RECORDS */
    ) ? 1 : 0
  };
  return {
    findTrackedSession: () => e,
    expire: q,
    expireObservable: new Y(),
    setForcedReplay: q
  };
}
function GI(e, t) {
  return zI(t) ? t : Kt(e.sessionSampleRate) ? Kt(e.sessionReplaySampleRate) ? "1" : "2" : "0";
}
function zI(e) {
  return e === "0" || e === "1" || e === "2";
}
function KI(e, t, n, r, s, o) {
  const i = [e.rumEndpointBuilder];
  e.replica && i.push(e.replica.rumEndpointBuilder);
  const a = Za({
    encoder: o(
      2
      /* DeflateEncoderStreamId.RUM */
    ),
    request: Wo(i, e.batchBytesLimit, n),
    flushController: ec({
      messagesLimit: e.batchMessagesLimit,
      bytesLimit: e.batchBytesLimit,
      durationLimit: e.flushTimeout,
      pageMayExitObservable: r,
      sessionExpireObservable: s
    }),
    messageBytesLimit: e.messageBytesLimit
  });
  return t.subscribe(13, (c) => {
    c.type === H.VIEW ? a.upsert(c, c.view.id) : a.add(c);
  }), a;
}
function jI(e) {
  const t = Gn();
  e.subscribe(13, (n) => {
    t.send("rum", n);
  });
}
const qI = Vn;
function XI(e, t, n, r) {
  const s = Cr({ expireDelay: qI });
  let o;
  e.subscribe(1, ({ startClocks: c }) => {
    const u = r.href;
    s.add(a({
      url: u,
      referrer: o || document.referrer
    }), c.relative), o = u;
  }), e.subscribe(6, ({ endClocks: c }) => {
    s.closeActive(c.relative);
  });
  const i = n.subscribe(({ newLocation: c }) => {
    const u = s.find();
    if (u) {
      const d = je();
      s.closeActive(d), s.add(a({
        url: c.href,
        referrer: u.referrer
      }), d);
    }
  });
  function a({ url: c, referrer: u }) {
    return {
      url: c,
      referrer: u
    };
  }
  return t.register(0, ({ startTime: c, eventType: u }) => {
    const d = s.find(c);
    return d ? {
      type: u,
      view: {
        url: d.url,
        referrer: d.referrer
      }
    } : lt;
  }), {
    findUrl: (c) => s.find(c),
    stop: () => {
      i.unsubscribe(), s.stop();
    }
  };
}
function YI(e, t) {
  let n = Zr(t);
  return new Y((r) => {
    const { stop: s } = JI(e, i), { stop: o } = QI(e, i);
    function i() {
      if (n.href === t.href)
        return;
      const a = Zr(t);
      r.notify({
        newLocation: a,
        oldLocation: n
      }), n = a;
    }
    return () => {
      s(), o();
    };
  });
}
function JI(e, t) {
  const { stop: n } = We(Yu("pushState"), "pushState", ({ onPostCall: o }) => {
    o(t);
  }), { stop: r } = We(Yu("replaceState"), "replaceState", ({ onPostCall: o }) => {
    o(t);
  }), { stop: s } = ce(e, window, "popstate", t);
  return {
    stop: () => {
      n(), r(), s();
    }
  };
}
function QI(e, t) {
  return ce(e, window, "hashchange", t);
}
function Yu(e) {
  return Object.prototype.hasOwnProperty.call(history, e) ? history : History.prototype;
}
const ZI = Vn;
function ek(e, t, n) {
  const r = Cr({
    expireDelay: ZI
  });
  return e.subscribe(1, ({ startClocks: s }) => {
    r.add({}, s.relative);
  }), e.subscribe(6, ({ endClocks: s }) => {
    r.closeActive(s.relative);
  }), t.register(0, ({ startTime: s, eventType: o }) => {
    if (!n.trackFeatureFlagsForEvents.concat([
      H.VIEW,
      H.ERROR
    ]).includes(o))
      return Ae;
    const a = r.find(s);
    return !a || Bn(a) ? Ae : {
      type: o,
      feature_flags: a
    };
  }), {
    addFeatureFlagEvaluation: (s, o) => {
      const i = r.find();
      i && (i[s] = o);
    }
  };
}
const tk = 10 * Re;
let ar, Ps;
function nk(e, t, n) {
  e.metricsEnabled && (Wp(), Ps = !1, t.subscribe(13, () => {
    Ps = !0;
  }), n.subscribe(({ bytesCount: r, messagesCount: s }) => {
    Ps && (Ps = !1, ar.batchCount += 1, Qu(ar.batchBytesCount, r), Qu(ar.batchMessagesCount, s));
  }), Sr(rk, tk));
}
function rk() {
  ar.batchCount !== 0 && (ms("Customer data measures", ar), Wp());
}
function Ju() {
  return { min: 1 / 0, max: 0, sum: 0 };
}
function Qu(e, t) {
  e.sum += t, e.min = Math.min(e.min, t), e.max = Math.max(e.max, t);
}
function Wp() {
  ar = {
    batchCount: 0,
    batchBytesCount: Ju(),
    batchMessagesCount: Ju()
  };
}
const sk = 4e3, ok = 500, ik = Vn;
function ak(e, t, n = ok) {
  const r = Cr({
    expireDelay: ik,
    maxEntries: sk
  });
  let s;
  rn(Q.VISIBILITY_STATE) && performance.getEntriesByType(Q.VISIBILITY_STATE).forEach((u) => {
    const d = u.name === "hidden" ? "hidden" : "active";
    i(d, u.startTime);
  }), i(Hp(), je());
  const { stop: o } = He(t, window, [
    "pageshow",
    "focus",
    "blur",
    "visibilitychange",
    "resume",
    "freeze",
    "pagehide"
  ], (c) => {
    i(uk(c), c.timeStamp);
  }, { capture: !0 });
  function i(c, u = je()) {
    c !== s && (s = c, r.closeActive(u), r.add({ state: s, startTime: u }, u));
  }
  function a(c, u, d) {
    return r.findAll(u, d).some((l) => l.state === c);
  }
  return e.register(0, ({ startTime: c, duration: u = 0, eventType: d }) => {
    if (d === H.VIEW) {
      const l = r.findAll(c, u);
      return {
        type: d,
        _dd: { page_states: ck(l, c, n) }
      };
    }
    return d === H.ACTION || d === H.ERROR ? {
      type: d,
      view: { in_foreground: a("active", c, 0) }
    } : Ae;
  }), {
    wasInPageStateDuringPeriod: a,
    addPageState: i,
    stop: () => {
      o(), r.stop();
    }
  };
}
function ck(e, t, n) {
  if (e.length !== 0)
    return e.slice(-n).reverse().map(({ state: r, startTime: s }) => ({
      state: r,
      start: K(le(t, s))
    }));
}
function uk(e) {
  return e.type === "freeze" ? "frozen" : e.type === "pagehide" ? e.persisted ? "frozen" : "terminated" : Hp();
}
function Hp() {
  return document.visibilityState === "hidden" ? "hidden" : document.hasFocus() ? "active" : "passive";
}
function lk(e, t) {
  let n;
  const r = requestAnimationFrame(M(() => {
    n = Jo();
  })), s = Vp(t).subscribe((o) => {
    n = o;
  }).unsubscribe;
  return e.register(0, ({ eventType: o }) => ({
    type: o,
    display: n ? { viewport: n } : void 0
  })), {
    stop: () => {
      s(), r && cancelAnimationFrame(r);
    }
  };
}
function dk(e, t) {
  const n = window.cookieStore ? fk(e) : hk;
  return new Y((r) => n(t, (s) => r.notify(s)));
}
function fk(e) {
  return (t, n) => ce(e, window.cookieStore, "change", (s) => {
    const o = s.changed.find((i) => i.name === t) || s.deleted.find((i) => i.name === t);
    o && n(o.value);
  }).stop;
}
const pk = Re;
function hk(e, t) {
  const n = es(document.cookie, e), r = Sr(() => {
    const s = es(document.cookie, e);
    s !== n && t(s);
  }, pk);
  return () => {
    Mo(r);
  };
}
const Zu = "datadog-ci-visibility-test-execution-id";
function mk(e, t, n = dk(e, Zu)) {
  var r;
  let s = jt(Zu) || ((r = window.Cypress) === null || r === void 0 ? void 0 : r.env("traceId"));
  const o = n.subscribe((i) => {
    s = i;
  });
  return t.register(0, ({ eventType: i }) => typeof s != "string" ? Ae : {
    type: i,
    session: {
      type: "ci_test"
    },
    ci_test: {
      test_execution_id: s
    }
  }), {
    stop: () => {
      o.unsubscribe();
    }
  };
}
function gk(e, t) {
  const n = St(t, {
    type: Q.LONG_ANIMATION_FRAME,
    buffered: !0
  }).subscribe((r) => {
    for (const s of r) {
      const o = ds(s.startTime), i = {
        date: o.timeStamp,
        long_task: {
          id: Oe(),
          entry_type: Zf.LONG_ANIMATION_FRAME,
          duration: K(s.duration),
          blocking_duration: K(s.blockingDuration),
          first_ui_event_timestamp: K(s.firstUIEventTimestamp),
          render_start: K(s.renderStart),
          style_and_layout_start: K(s.styleAndLayoutStart),
          start_time: K(s.startTime),
          scripts: s.scripts.map((a) => ({
            duration: K(a.duration),
            pause_duration: K(a.pauseDuration),
            forced_style_and_layout_duration: K(a.forcedStyleAndLayoutDuration),
            start_time: K(a.startTime),
            execution_start: K(a.executionStart),
            source_url: a.sourceURL,
            source_function_name: a.sourceFunctionName,
            source_char_position: a.sourceCharPosition,
            invoker: a.invoker,
            invoker_type: a.invokerType,
            window_attribution: a.windowAttribution
          }))
        },
        type: H.LONG_TASK,
        _dd: {
          discarded: !1
        }
      };
      e.notify(12, {
        rawRumEvent: i,
        startTime: o.relative,
        duration: s.duration,
        domainContext: { performanceEntry: s }
      });
    }
  });
  return { stop: () => n.unsubscribe() };
}
function yk(e, t) {
  const n = St(t, {
    type: Q.LONG_TASK,
    buffered: !0
  }).subscribe((r) => {
    for (const s of r) {
      if (s.entryType !== Q.LONG_TASK || !t.trackLongTasks)
        break;
      const o = ds(s.startTime), i = {
        date: o.timeStamp,
        long_task: {
          id: Oe(),
          entry_type: Zf.LONG_TASK,
          duration: K(s.duration)
        },
        type: H.LONG_TASK,
        _dd: {
          discarded: !1
        }
      };
      e.notify(12, {
        rawRumEvent: i,
        startTime: o.relative,
        duration: s.duration,
        domainContext: { performanceEntry: s }
      });
    }
  });
  return {
    stop() {
      n.unsubscribe();
    }
  };
}
function _k(e) {
  e.register(0, ({ eventType: t }) => {
    if (!Bf())
      return Ae;
    const n = Ff(), r = $f();
    return {
      type: t,
      session: {
        type: "synthetics"
      },
      synthetics: {
        test_id: n,
        result_id: r,
        injected: Go()
      }
    };
  });
}
function bk(e, t, n) {
  const r = Vo(e), s = n(r);
  return Xa(t).forEach(([o, i]) => (
    // Traverse both object and clone simultaneously up to the path and apply the modification from the clone to the original object when the type is valid
    aa(e, r, o.split(/\.|(?=\[\])/), i)
  )), s;
}
function aa(e, t, n, r) {
  const [s, ...o] = n;
  if (s === "[]") {
    Array.isArray(e) && Array.isArray(t) && e.forEach((i, a) => aa(i, t[a], o, r));
    return;
  }
  if (!(!el(e) || !el(t))) {
    if (o.length > 0)
      return aa(e[s], t[s], o, r);
    wk(e, s, t[s], r);
  }
}
function wk(e, t, n, r) {
  const s = Wn(n);
  s === r ? e[t] = se(n) : r === "object" && (s === "undefined" || s === "null") && (e[t] = {});
}
function el(e) {
  return Wn(e) === "object";
}
const jn = {
  "view.name": "string",
  "view.url": "string",
  "view.referrer": "string"
}, qn = {
  context: "object"
}, Xn = {
  service: "string",
  version: "string"
};
let Gp;
function Ek(e, t, n, r) {
  Gp = {
    [H.VIEW]: {
      "view.performance.lcp.resource_url": "string",
      ...qn,
      ...jn,
      ...Xn
    },
    [H.ERROR]: {
      "error.message": "string",
      "error.stack": "string",
      "error.resource.url": "string",
      "error.fingerprint": "string",
      ...qn,
      ...jn,
      ...Xn
    },
    [H.RESOURCE]: {
      "resource.url": "string",
      ...Ir(Lt.WRITABLE_RESOURCE_GRAPHQL) ? { "resource.graphql": "object" } : {},
      ...qn,
      ...jn,
      ...Xn
    },
    [H.ACTION]: {
      "action.target.name": "string",
      ...qn,
      ...jn,
      ...Xn
    },
    [H.LONG_TASK]: {
      "long_task.scripts[].source_url": "string",
      "long_task.scripts[].invoker": "string",
      ...qn,
      ...jn,
      ...Xn
    },
    [H.VITAL]: {
      ...qn,
      ...jn,
      ...Xn
    }
  };
  const s = {
    [H.ERROR]: qs(H.ERROR, e.eventRateLimiterThreshold, r),
    [H.ACTION]: qs(H.ACTION, e.eventRateLimiterThreshold, r),
    [H.VITAL]: qs(H.VITAL, e.eventRateLimiterThreshold, r)
  };
  t.subscribe(12, ({ startTime: o, duration: i, rawRumEvent: a, domainContext: c }) => {
    const u = n.triggerHook(0, {
      eventType: a.type,
      startTime: o,
      duration: i
    });
    if (u === lt)
      return;
    const d = Ze(u, a, {
      ddtags: $o(e).join(",")
    });
    Sk(d, e.beforeSend, c, s) && (Bn(d.context) && delete d.context, t.notify(13, d));
  });
}
function Sk(e, t, n, r) {
  var s;
  if (t) {
    const i = bk(e, Gp[e.type], (a) => t(a, n));
    if (i === !1 && e.type !== H.VIEW)
      return !1;
    i === !1 && V.warn("Can't dismiss view events using beforeSend!");
  }
  return !((s = r[e.type]) === null || s === void 0 ? void 0 : s.isLimitReached());
}
function Tk(e, t, n, r) {
  e.register(0, ({ eventType: s, startTime: o }) => {
    const i = t.findTrackedSession(o), a = r.findView(o);
    if (!i || !a)
      return lt;
    let c, u, d;
    return s === H.VIEW ? (c = n.getReplayStats(a.id) ? !0 : void 0, u = i.sessionReplay === 1, d = a.sessionIsActive ? void 0 : !1) : c = n.isRecording() ? !0 : void 0, {
      type: s,
      session: {
        id: i.id,
        type: "user",
        has_replay: c,
        sampled_for_replay: u,
        is_active: d
      }
    };
  }), e.register(1, ({ startTime: s }) => {
    const o = t.findTrackedSession(s);
    return o ? {
      session: {
        id: o.id
      }
    } : Ae;
  });
}
function vk(e) {
  e.register(0, ({ eventType: t }) => ({
    type: t,
    connectivity: ff()
  }));
}
function Ik(e, t, n) {
  e.register(0, ({ eventType: r }) => {
    const s = t.source;
    return {
      type: r,
      _dd: {
        format_version: 2,
        drift: Pd(),
        configuration: {
          session_sample_rate: Hr(t.sessionSampleRate, 3),
          session_replay_sample_rate: Hr(t.sessionReplaySampleRate, 3),
          profiling_sample_rate: Hr(t.profilingSampleRate, 3)
        },
        browser_sdk_version: Et() ? "6.21.2" : void 0,
        sdk_name: n
      },
      application: {
        id: t.applicationId
      },
      date: te(),
      source: s
    };
  }), e.register(1, () => ({
    application: { id: t.applicationId }
  }));
}
function kk(e, t) {
  e.register(1, () => t.isGranted() ? Ae : lt);
}
const Ck = If, Ak = [
  H.ACTION,
  H.ERROR,
  H.LONG_TASK,
  H.RESOURCE,
  H.VITAL
];
function Rk(e) {
  return {
    addEvent: (t, n, r, s) => {
      Ak.includes(n.type) && e.notify(12, {
        startTime: t,
        rawRumEvent: n,
        domainContext: r,
        duration: s
      });
    }
  };
}
function xk(e, t) {
  if (!t.metricsEnabled)
    return { stop: q };
  const { unsubscribe: n } = e.subscribe(4, ({ initialViewMetrics: r }) => {
    !r.largestContentfulPaint || !r.navigationTimings || (ms("Initial view metrics", {
      metrics: Ok(r.largestContentfulPaint, r.navigationTimings)
    }), n());
  });
  return {
    stop: n
  };
}
function Ok(e, t) {
  return {
    lcp: {
      value: e.value
    },
    navigation: {
      domComplete: t.domComplete,
      domContentLoaded: t.domContentLoaded,
      domInteractive: t.domInteractive,
      firstByte: t.firstByte,
      loadEvent: t.loadEvent
    }
  };
}
function Lk(e, t, n, r, s, o, i, a, c) {
  const u = [], d = new uT(), l = Ck();
  d.subscribe(13, (he) => Bo("rum", he));
  const f = (he) => {
    d.notify(14, { error: he }), Dt("Error reported to customer", { "error.message": he.message });
  }, p = Tf(e), h = p.subscribe((he) => {
    d.notify(11, he);
  });
  u.push(() => h.unsubscribe());
  const m = kf("browser-rum-sdk", e, l, f, p, s);
  u.push(m.stop);
  const g = Et() ? HI() : WI(e, d, o);
  if (Et())
    jI(d);
  else {
    const he = KI(e, d, f, p, g.expireObservable, s);
    u.push(() => he.stop()), nk(m, d, he.flushController.flushObservable);
  }
  const y = iT(), _ = YI(e, location), { observable: w, stop: E } = aT();
  u.push(E), Ik(l, e, c);
  const S = ak(l, e), b = dT(d);
  u.push(() => b.stop());
  const T = XI(d, l, _, location);
  u.push(() => T.stop());
  const D = ek(d, l, e);
  Tk(l, g, t, b), vk(l), kk(l, o);
  const k = Xf(l, e, "rum", !0), I = Yf(l, e, g, "rum"), A = qf(l, e, "rum"), { actionContexts: F, addAction: C, addEvent: v, stop: R } = Nk(d, l, e, S, y, w, f);
  u.push(R);
  const { addTiming: x, startView: j, setViewName: $, setViewContext: ue, setViewContextProperty: O, getViewContext: L, stop: z } = FI(d, l, e, location, y, w, _, t, b, r);
  u.push(z);
  const { stop: ve } = xk(d, m);
  u.push(ve);
  const { stop: ke } = Bv(d, e, S);
  if (u.push(ke), e.trackLongTasks)
    if (rn(Q.LONG_ANIMATION_FRAME)) {
      const { stop: he } = gk(d, e);
      u.push(he);
    } else
      yk(d, e);
  const { addError: N } = Sv(d, e, a);
  a.unbuffer(), ST(d, e, g, I, A);
  const me = wS(d, S, i), oe = cT(e.applicationId, g, b, F, T);
  return u.push(() => n.stop()), {
    addAction: C,
    addEvent: v,
    addError: N,
    addTiming: x,
    addFeatureFlagEvaluation: D.addFeatureFlagEvaluation,
    startView: j,
    setViewContext: ue,
    setViewContextProperty: O,
    getViewContext: L,
    setViewName: $,
    lifeCycle: d,
    viewHistory: b,
    session: g,
    stopSession: () => g.expire(),
    getInternalContext: oe.get,
    startDurationVital: me.startDurationVital,
    stopDurationVital: me.stopDurationVital,
    addDurationVital: me.addDurationVital,
    addOperationStepVital: me.addOperationStepVital,
    globalContext: k,
    userContext: I,
    accountContext: A,
    telemetry: m,
    stop: () => {
      u.forEach((he) => he());
    },
    hooks: l
  };
}
function Nk(e, t, n, r, s, o, i) {
  const a = bv(e, t, s, o, n), c = Rk(e), u = lk(t, n), d = mk(n, t);
  return _k(t), Ek(n, e, t, i), {
    pageStateHistory: r,
    addAction: a.addAction,
    addEvent: c.addEvent,
    actionContexts: a.actionContexts,
    stop: () => {
      a.stop(), d.stop(), u.stop(), r.stop();
    }
  };
}
function Mk(e, { session: t, viewContext: n, errorType: r }) {
  const s = t ? t.id : "no-session-id", o = [];
  r !== void 0 && o.push(`error-type=${r}`), n && (o.push(`seed=${n.id}`), o.push(`from=${n.startClocks.timeStamp}`));
  const i = Pk(e), a = `/rum/replay/sessions/${s}`;
  return `${i}${a}?${o.join("&")}`;
}
function Pk(e) {
  const t = e.site, n = e.subdomain || Dk(e);
  return `https://${n ? `${n}.` : ""}${t}`;
}
function Dk(e) {
  switch (e.site) {
    case _n:
    case Yw:
      return "app";
    case df:
      return "dd";
    default:
      return;
  }
}
const Uk = 1e3;
let Xe;
function Fk(e) {
  return Qo(e).segments_count;
}
function $k(e) {
  Qo(e).segments_count += 1;
}
function Bk(e) {
  Qo(e).records_count += 1;
}
function Vk(e, t) {
  Qo(e).segments_total_raw_size += t;
}
function Wk(e) {
  return Xe?.get(e);
}
function Qo(e) {
  Xe || (Xe = /* @__PURE__ */ new Map());
  let t;
  return Xe.has(e) ? t = Xe.get(e) : (t = {
    records_count: 0,
    segments_count: 0,
    segments_total_raw_size: 0
  }, Xe.set(e, t), Xe.size > Uk && Hk()), t;
}
function Hk() {
  if (!Xe)
    return;
  const e = Xe.keys().next().value;
  e && Xe.delete(e);
}
function zp(e, t, n) {
  let r = 0, s = [], o, i = !0, a = 0;
  const c = [], { stop: u } = ce(e, t, "message", ({ data: f }) => {
    if (f.type !== "wrote" || f.streamId !== n)
      return;
    const p = c[0];
    p && (p.id === f.id ? (c.shift(), r += f.additionalBytesCount, s.push(f.result), o = f.trailer, p.writeCallback ? p.writeCallback(f.result.byteLength) : p.finishCallback && p.finishCallback()) : p.id < f.id && u());
  });
  function d() {
    const f = s.length === 0 ? new Uint8Array(0) : Mb(s.concat(o)), p = {
      rawBytesCount: r,
      output: f,
      outputBytesCount: f.byteLength,
      encoding: "deflate"
    };
    return r = 0, s = [], p;
  }
  function l() {
    i || (t.postMessage({
      action: "reset",
      streamId: n
    }), i = !0);
  }
  return {
    isAsync: !0,
    get isEmpty() {
      return i;
    },
    write(f, p) {
      t.postMessage({
        action: "write",
        id: a,
        data: f,
        streamId: n
      }), c.push({
        id: a,
        writeCallback: p,
        data: f
      }), i = !1, a += 1;
    },
    finish(f) {
      l(), c.length ? (c.forEach((p) => {
        delete p.writeCallback;
      }), c[c.length - 1].finishCallback = () => f(d())) : f(d());
    },
    finishSync() {
      l();
      const f = c.map((p) => p.data).join("");
      return c.length = 0, { ...d(), pendingData: f };
    },
    estimateEncodedBytesCount(f) {
      return f.length / 8;
    },
    stop() {
      u();
    }
  };
}
function hc({ configuredUrl: e, error: t, source: n, scriptType: r }) {
  if (V.error(`${n} failed to start: an error occurred while initializing the ${r}:`, t), t instanceof Event || t instanceof Error && Gk(t.message)) {
    let s;
    e ? s = `Please make sure the ${r} URL ${e} is correct and CSP is correctly configured.` : s = "Please make sure CSP is correctly configured.", V.error(`${s} See documentation at ${Lo}/integrations/content_security_policy_logs/#use-csp-with-real-user-monitoring-and-session-replay`);
  } else r === "worker" && tc(t);
}
function Gk(e) {
  return e.includes("Content Security Policy") || // Related to `require-trusted-types-for` CSP: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/require-trusted-types-for
  e.includes("requires 'TrustedScriptURL'");
}
const zk = 30 * Re;
function Kp(e) {
  return new Worker(e.workerUrl || URL.createObjectURL(new Blob(['(()=>{function t(t){const e=t.reduce((t,e)=>t+e.length,0),a=new Uint8Array(e);let n=0;for(const e of t)a.set(e,n),n+=e.length;return a}function e(t){for(var e=t.length;--e>=0;)t[e]=0}var a=new Uint8Array([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0]),n=new Uint8Array([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13]),r=new Uint8Array([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7]),i=new Uint8Array([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),s=Array(576);e(s);var h=Array(60);e(h);var l=Array(512);e(l);var _=Array(256);e(_);var o=Array(29);e(o);var d,u,f,c=Array(30);function p(t,e,a,n,r){this.static_tree=t,this.extra_bits=e,this.extra_base=a,this.elems=n,this.max_length=r,this.has_stree=t&&t.length}function g(t,e){this.dyn_tree=t,this.max_code=0,this.stat_desc=e}e(c);var v=function(t){return t<256?l[t]:l[256+(t>>>7)]},w=function(t,e){t.pending_buf[t.pending++]=255&e,t.pending_buf[t.pending++]=e>>>8&255},m=function(t,e,a){t.bi_valid>16-a?(t.bi_buf|=e<<t.bi_valid&65535,w(t,t.bi_buf),t.bi_buf=e>>16-t.bi_valid,t.bi_valid+=a-16):(t.bi_buf|=e<<t.bi_valid&65535,t.bi_valid+=a)},b=function(t,e,a){m(t,a[2*e],a[2*e+1])},y=function(t,e){var a=0;do{a|=1&t,t>>>=1,a<<=1}while(--e>0);return a>>>1},z=function(t,e,a){var n,r,i=Array(16),s=0;for(n=1;n<=15;n++)i[n]=s=s+a[n-1]<<1;for(r=0;r<=e;r++){var h=t[2*r+1];0!==h&&(t[2*r]=y(i[h]++,h))}},k=function(t){var e;for(e=0;e<286;e++)t.dyn_ltree[2*e]=0;for(e=0;e<30;e++)t.dyn_dtree[2*e]=0;for(e=0;e<19;e++)t.bl_tree[2*e]=0;t.dyn_ltree[512]=1,t.opt_len=t.static_len=0,t.last_lit=t.matches=0},x=function(t){t.bi_valid>8?w(t,t.bi_buf):t.bi_valid>0&&(t.pending_buf[t.pending++]=t.bi_buf),t.bi_buf=0,t.bi_valid=0},A=function(t,e,a,n){var r=2*e,i=2*a;return t[r]<t[i]||t[r]===t[i]&&n[e]<=n[a]},U=function(t,e,a){for(var n=t.heap[a],r=a<<1;r<=t.heap_len&&(r<t.heap_len&&A(e,t.heap[r+1],t.heap[r],t.depth)&&r++,!A(e,n,t.heap[r],t.depth));)t.heap[a]=t.heap[r],a=r,r<<=1;t.heap[a]=n},B=function(t,e,r){var i,s,h,l,d=0;if(0!==t.last_lit)do{i=t.pending_buf[t.d_buf+2*d]<<8|t.pending_buf[t.d_buf+2*d+1],s=t.pending_buf[t.l_buf+d],d++,0===i?b(t,s,e):(h=_[s],b(t,h+256+1,e),0!==(l=a[h])&&(s-=o[h],m(t,s,l)),i--,h=v(i),b(t,h,r),0!==(l=n[h])&&(i-=c[h],m(t,i,l)))}while(d<t.last_lit);b(t,256,e)},I=function(t,e){var a,n,r,i=e.dyn_tree,s=e.stat_desc.static_tree,h=e.stat_desc.has_stree,l=e.stat_desc.elems,_=-1;for(t.heap_len=0,t.heap_max=573,a=0;a<l;a++)0!==i[2*a]?(t.heap[++t.heap_len]=_=a,t.depth[a]=0):i[2*a+1]=0;for(;t.heap_len<2;)i[2*(r=t.heap[++t.heap_len]=_<2?++_:0)]=1,t.depth[r]=0,t.opt_len--,h&&(t.static_len-=s[2*r+1]);for(e.max_code=_,a=t.heap_len>>1;a>=1;a--)U(t,i,a);r=l;do{a=t.heap[1],t.heap[1]=t.heap[t.heap_len--],U(t,i,1),n=t.heap[1],t.heap[--t.heap_max]=a,t.heap[--t.heap_max]=n,i[2*r]=i[2*a]+i[2*n],t.depth[r]=(t.depth[a]>=t.depth[n]?t.depth[a]:t.depth[n])+1,i[2*a+1]=i[2*n+1]=r,t.heap[1]=r++,U(t,i,1)}while(t.heap_len>=2);t.heap[--t.heap_max]=t.heap[1],function(t,e){var a,n,r,i,s,h,l=e.dyn_tree,_=e.max_code,o=e.stat_desc.static_tree,d=e.stat_desc.has_stree,u=e.stat_desc.extra_bits,f=e.stat_desc.extra_base,c=e.stat_desc.max_length,p=0;for(i=0;i<=15;i++)t.bl_count[i]=0;for(l[2*t.heap[t.heap_max]+1]=0,a=t.heap_max+1;a<573;a++)(i=l[2*l[2*(n=t.heap[a])+1]+1]+1)>c&&(i=c,p++),l[2*n+1]=i,n>_||(t.bl_count[i]++,s=0,n>=f&&(s=u[n-f]),h=l[2*n],t.opt_len+=h*(i+s),d&&(t.static_len+=h*(o[2*n+1]+s)));if(0!==p){do{for(i=c-1;0===t.bl_count[i];)i--;t.bl_count[i]--,t.bl_count[i+1]+=2,t.bl_count[c]--,p-=2}while(p>0);for(i=c;0!==i;i--)for(n=t.bl_count[i];0!==n;)(r=t.heap[--a])>_||(l[2*r+1]!==i&&(t.opt_len+=(i-l[2*r+1])*l[2*r],l[2*r+1]=i),n--)}}(t,e),z(i,_,t.bl_count)},E=function(t,e,a){var n,r,i=-1,s=e[1],h=0,l=7,_=4;for(0===s&&(l=138,_=3),e[2*(a+1)+1]=65535,n=0;n<=a;n++)r=s,s=e[2*(n+1)+1],++h<l&&r===s||(h<_?t.bl_tree[2*r]+=h:0!==r?(r!==i&&t.bl_tree[2*r]++,t.bl_tree[32]++):h<=10?t.bl_tree[34]++:t.bl_tree[36]++,h=0,i=r,0===s?(l=138,_=3):r===s?(l=6,_=3):(l=7,_=4))},C=function(t,e,a){var n,r,i=-1,s=e[1],h=0,l=7,_=4;for(0===s&&(l=138,_=3),n=0;n<=a;n++)if(r=s,s=e[2*(n+1)+1],!(++h<l&&r===s)){if(h<_)do{b(t,r,t.bl_tree)}while(0!==--h);else 0!==r?(r!==i&&(b(t,r,t.bl_tree),h--),b(t,16,t.bl_tree),m(t,h-3,2)):h<=10?(b(t,17,t.bl_tree),m(t,h-3,3)):(b(t,18,t.bl_tree),m(t,h-11,7));h=0,i=r,0===s?(l=138,_=3):r===s?(l=6,_=3):(l=7,_=4)}},D=!1,M=function(t,e,a,n){m(t,0+(n?1:0),3),function(t,e,a){x(t),w(t,a),w(t,~a),t.pending_buf.set(t.window.subarray(e,e+a),t.pending),t.pending+=a}(t,e,a)},j=M,L=function(t,e,a,n){for(var r=65535&t,i=t>>>16&65535,s=0;0!==a;){a-=s=a>2e3?2e3:a;do{i=i+(r=r+e[n++]|0)|0}while(--s);r%=65521,i%=65521}return r|i<<16},S=new Uint32Array(function(){for(var t,e=[],a=0;a<256;a++){t=a;for(var n=0;n<8;n++)t=1&t?3988292384^t>>>1:t>>>1;e[a]=t}return e}()),T=function(t,e,a,n){var r=S,i=n+a;t^=-1;for(var s=n;s<i;s++)t=t>>>8^r[255&(t^e[s])];return-1^t},O={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"},q=j,F=function(t,e,a){return t.pending_buf[t.d_buf+2*t.last_lit]=e>>>8&255,t.pending_buf[t.d_buf+2*t.last_lit+1]=255&e,t.pending_buf[t.l_buf+t.last_lit]=255&a,t.last_lit++,0===e?t.dyn_ltree[2*a]++:(t.matches++,e--,t.dyn_ltree[2*(_[a]+256+1)]++,t.dyn_dtree[2*v(e)]++),t.last_lit===t.lit_bufsize-1},G=-2,H=258,J=262,K=103,N=113,P=666,Q=function(t,e){return t.msg=O[e],e},R=function(t){return(t<<1)-(t>4?9:0)},V=function(t){for(var e=t.length;--e>=0;)t[e]=0},W=function(t,e,a){return(e<<t.hash_shift^a)&t.hash_mask},X=function(t){var e=t.state,a=e.pending;a>t.avail_out&&(a=t.avail_out),0!==a&&(t.output.set(e.pending_buf.subarray(e.pending_out,e.pending_out+a),t.next_out),t.next_out+=a,e.pending_out+=a,t.total_out+=a,t.avail_out-=a,e.pending-=a,0===e.pending&&(e.pending_out=0))},Y=function(t,e){(function(t,e,a,n){var r,l,_=0;t.level>0?(2===t.strm.data_type&&(t.strm.data_type=function(t){var e,a=4093624447;for(e=0;e<=31;e++,a>>>=1)if(1&a&&0!==t.dyn_ltree[2*e])return 0;if(0!==t.dyn_ltree[18]||0!==t.dyn_ltree[20]||0!==t.dyn_ltree[26])return 1;for(e=32;e<256;e++)if(0!==t.dyn_ltree[2*e])return 1;return 0}(t)),I(t,t.l_desc),I(t,t.d_desc),_=function(t){var e;for(E(t,t.dyn_ltree,t.l_desc.max_code),E(t,t.dyn_dtree,t.d_desc.max_code),I(t,t.bl_desc),e=18;e>=3&&0===t.bl_tree[2*i[e]+1];e--);return t.opt_len+=3*(e+1)+5+5+4,e}(t),r=t.opt_len+3+7>>>3,(l=t.static_len+3+7>>>3)<=r&&(r=l)):r=l=a+5,a+4<=r&&-1!==e?M(t,e,a,n):4===t.strategy||l===r?(m(t,2+(n?1:0),3),B(t,s,h)):(m(t,4+(n?1:0),3),function(t,e,a,n){var r;for(m(t,e-257,5),m(t,a-1,5),m(t,n-4,4),r=0;r<n;r++)m(t,t.bl_tree[2*i[r]+1],3);C(t,t.dyn_ltree,e-1),C(t,t.dyn_dtree,a-1)}(t,t.l_desc.max_code+1,t.d_desc.max_code+1,_+1),B(t,t.dyn_ltree,t.dyn_dtree)),k(t),n&&x(t)})(t,t.block_start>=0?t.block_start:-1,t.strstart-t.block_start,e),t.block_start=t.strstart,X(t.strm)},Z=function(t,e){t.pending_buf[t.pending++]=e},$=function(t,e){t.pending_buf[t.pending++]=e>>>8&255,t.pending_buf[t.pending++]=255&e},tt=function(t,e,a,n){var r=t.avail_in;return r>n&&(r=n),0===r?0:(t.avail_in-=r,e.set(t.input.subarray(t.next_in,t.next_in+r),a),1===t.state.wrap?t.adler=L(t.adler,e,r,a):2===t.state.wrap&&(t.adler=T(t.adler,e,r,a)),t.next_in+=r,t.total_in+=r,r)},et=function(t,e){var a,n,r=t.max_chain_length,i=t.strstart,s=t.prev_length,h=t.nice_match,l=t.strstart>t.w_size-J?t.strstart-(t.w_size-J):0,_=t.window,o=t.w_mask,d=t.prev,u=t.strstart+H,f=_[i+s-1],c=_[i+s];t.prev_length>=t.good_match&&(r>>=2),h>t.lookahead&&(h=t.lookahead);do{if(_[(a=e)+s]===c&&_[a+s-1]===f&&_[a]===_[i]&&_[++a]===_[i+1]){i+=2,a++;do{}while(_[++i]===_[++a]&&_[++i]===_[++a]&&_[++i]===_[++a]&&_[++i]===_[++a]&&_[++i]===_[++a]&&_[++i]===_[++a]&&_[++i]===_[++a]&&_[++i]===_[++a]&&i<u);if(n=H-(u-i),i=u-H,n>s){if(t.match_start=e,s=n,n>=h)break;f=_[i+s-1],c=_[i+s]}}}while((e=d[e&o])>l&&0!==--r);return s<=t.lookahead?s:t.lookahead},at=function(t){var e,a,n,r,i,s=t.w_size;do{if(r=t.window_size-t.lookahead-t.strstart,t.strstart>=s+(s-J)){t.window.set(t.window.subarray(s,s+s),0),t.match_start-=s,t.strstart-=s,t.block_start-=s,e=a=t.hash_size;do{n=t.head[--e],t.head[e]=n>=s?n-s:0}while(--a);e=a=s;do{n=t.prev[--e],t.prev[e]=n>=s?n-s:0}while(--a);r+=s}if(0===t.strm.avail_in)break;if(a=tt(t.strm,t.window,t.strstart+t.lookahead,r),t.lookahead+=a,t.lookahead+t.insert>=3)for(i=t.strstart-t.insert,t.ins_h=t.window[i],t.ins_h=W(t,t.ins_h,t.window[i+1]);t.insert&&(t.ins_h=W(t,t.ins_h,t.window[i+3-1]),t.prev[i&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=i,i++,t.insert--,!(t.lookahead+t.insert<3)););}while(t.lookahead<J&&0!==t.strm.avail_in)},nt=function(t,e){for(var a,n;;){if(t.lookahead<J){if(at(t),t.lookahead<J&&0===e)return 1;if(0===t.lookahead)break}if(a=0,t.lookahead>=3&&(t.ins_h=W(t,t.ins_h,t.window[t.strstart+3-1]),a=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart),0!==a&&t.strstart-a<=t.w_size-J&&(t.match_length=et(t,a)),t.match_length>=3)if(n=F(t,t.strstart-t.match_start,t.match_length-3),t.lookahead-=t.match_length,t.match_length<=t.max_lazy_match&&t.lookahead>=3){t.match_length--;do{t.strstart++,t.ins_h=W(t,t.ins_h,t.window[t.strstart+3-1]),a=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart}while(0!==--t.match_length);t.strstart++}else t.strstart+=t.match_length,t.match_length=0,t.ins_h=t.window[t.strstart],t.ins_h=W(t,t.ins_h,t.window[t.strstart+1]);else n=F(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++;if(n&&(Y(t,!1),0===t.strm.avail_out))return 1}return t.insert=t.strstart<2?t.strstart:2,4===e?(Y(t,!0),0===t.strm.avail_out?3:4):t.last_lit&&(Y(t,!1),0===t.strm.avail_out)?1:2},rt=function(t,e){for(var a,n,r;;){if(t.lookahead<J){if(at(t),t.lookahead<J&&0===e)return 1;if(0===t.lookahead)break}if(a=0,t.lookahead>=3&&(t.ins_h=W(t,t.ins_h,t.window[t.strstart+3-1]),a=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart),t.prev_length=t.match_length,t.prev_match=t.match_start,t.match_length=2,0!==a&&t.prev_length<t.max_lazy_match&&t.strstart-a<=t.w_size-J&&(t.match_length=et(t,a),t.match_length<=5&&(1===t.strategy||3===t.match_length&&t.strstart-t.match_start>4096)&&(t.match_length=2)),t.prev_length>=3&&t.match_length<=t.prev_length){r=t.strstart+t.lookahead-3,n=F(t,t.strstart-1-t.prev_match,t.prev_length-3),t.lookahead-=t.prev_length-1,t.prev_length-=2;do{++t.strstart<=r&&(t.ins_h=W(t,t.ins_h,t.window[t.strstart+3-1]),a=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart)}while(0!==--t.prev_length);if(t.match_available=0,t.match_length=2,t.strstart++,n&&(Y(t,!1),0===t.strm.avail_out))return 1}else if(t.match_available){if((n=F(t,0,t.window[t.strstart-1]))&&Y(t,!1),t.strstart++,t.lookahead--,0===t.strm.avail_out)return 1}else t.match_available=1,t.strstart++,t.lookahead--}return t.match_available&&(n=F(t,0,t.window[t.strstart-1]),t.match_available=0),t.insert=t.strstart<2?t.strstart:2,4===e?(Y(t,!0),0===t.strm.avail_out?3:4):t.last_lit&&(Y(t,!1),0===t.strm.avail_out)?1:2};function it(t,e,a,n,r){this.good_length=t,this.max_lazy=e,this.nice_length=a,this.max_chain=n,this.func=r}var st=[new it(0,0,0,0,function(t,e){var a=65535;for(a>t.pending_buf_size-5&&(a=t.pending_buf_size-5);;){if(t.lookahead<=1){if(at(t),0===t.lookahead&&0===e)return 1;if(0===t.lookahead)break}t.strstart+=t.lookahead,t.lookahead=0;var n=t.block_start+a;if((0===t.strstart||t.strstart>=n)&&(t.lookahead=t.strstart-n,t.strstart=n,Y(t,!1),0===t.strm.avail_out))return 1;if(t.strstart-t.block_start>=t.w_size-J&&(Y(t,!1),0===t.strm.avail_out))return 1}return t.insert=0,4===e?(Y(t,!0),0===t.strm.avail_out?3:4):(t.strstart>t.block_start&&(Y(t,!1),t.strm.avail_out),1)}),new it(4,4,8,4,nt),new it(4,5,16,8,nt),new it(4,6,32,32,nt),new it(4,4,16,16,rt),new it(8,16,32,32,rt),new it(8,16,128,128,rt),new it(8,32,128,256,rt),new it(32,128,258,1024,rt),new it(32,258,258,4096,rt)];function ht(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=8,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new Uint16Array(1146),this.dyn_dtree=new Uint16Array(122),this.bl_tree=new Uint16Array(78),V(this.dyn_ltree),V(this.dyn_dtree),V(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new Uint16Array(16),this.heap=new Uint16Array(573),V(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new Uint16Array(573),V(this.depth),this.l_buf=0,this.lit_bufsize=0,this.last_lit=0,this.d_buf=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}for(var lt=function(t){var e,i=function(t){if(!t||!t.state)return Q(t,G);t.total_in=t.total_out=0,t.data_type=2;var e=t.state;return e.pending=0,e.pending_out=0,e.wrap<0&&(e.wrap=-e.wrap),e.status=e.wrap?42:N,t.adler=2===e.wrap?0:1,e.last_flush=0,function(t){D||(function(){var t,e,i,g,v,w=Array(16);for(i=0,g=0;g<28;g++)for(o[g]=i,t=0;t<1<<a[g];t++)_[i++]=g;for(_[i-1]=g,v=0,g=0;g<16;g++)for(c[g]=v,t=0;t<1<<n[g];t++)l[v++]=g;for(v>>=7;g<30;g++)for(c[g]=v<<7,t=0;t<1<<n[g]-7;t++)l[256+v++]=g;for(e=0;e<=15;e++)w[e]=0;for(t=0;t<=143;)s[2*t+1]=8,t++,w[8]++;for(;t<=255;)s[2*t+1]=9,t++,w[9]++;for(;t<=279;)s[2*t+1]=7,t++,w[7]++;for(;t<=287;)s[2*t+1]=8,t++,w[8]++;for(z(s,287,w),t=0;t<30;t++)h[2*t+1]=5,h[2*t]=y(t,5);d=new p(s,a,257,286,15),u=new p(h,n,0,30,15),f=new p([],r,0,19,7)}(),D=!0),t.l_desc=new g(t.dyn_ltree,d),t.d_desc=new g(t.dyn_dtree,u),t.bl_desc=new g(t.bl_tree,f),t.bi_buf=0,t.bi_valid=0,k(t)}(e),0}(t);return 0===i&&((e=t.state).window_size=2*e.w_size,V(e.head),e.max_lazy_match=st[e.level].max_lazy,e.good_match=st[e.level].good_length,e.nice_match=st[e.level].nice_length,e.max_chain_length=st[e.level].max_chain,e.strstart=0,e.block_start=0,e.lookahead=0,e.insert=0,e.match_length=e.prev_length=2,e.match_available=0,e.ins_h=0),i},_t=function(t,e){var a,n;if(!t||!t.state||e>5||e<0)return t?Q(t,G):G;var r=t.state;if(!t.output||!t.input&&0!==t.avail_in||r.status===P&&4!==e)return Q(t,0===t.avail_out?-5:G);r.strm=t;var i=r.last_flush;if(r.last_flush=e,42===r.status)if(2===r.wrap)t.adler=0,Z(r,31),Z(r,139),Z(r,8),r.gzhead?(Z(r,(r.gzhead.text?1:0)+(r.gzhead.hcrc?2:0)+(r.gzhead.extra?4:0)+(r.gzhead.name?8:0)+(r.gzhead.comment?16:0)),Z(r,255&r.gzhead.time),Z(r,r.gzhead.time>>8&255),Z(r,r.gzhead.time>>16&255),Z(r,r.gzhead.time>>24&255),Z(r,9===r.level?2:r.strategy>=2||r.level<2?4:0),Z(r,255&r.gzhead.os),r.gzhead.extra&&r.gzhead.extra.length&&(Z(r,255&r.gzhead.extra.length),Z(r,r.gzhead.extra.length>>8&255)),r.gzhead.hcrc&&(t.adler=T(t.adler,r.pending_buf,r.pending,0)),r.gzindex=0,r.status=69):(Z(r,0),Z(r,0),Z(r,0),Z(r,0),Z(r,0),Z(r,9===r.level?2:r.strategy>=2||r.level<2?4:0),Z(r,3),r.status=N);else{var h=8+(r.w_bits-8<<4)<<8;h|=(r.strategy>=2||r.level<2?0:r.level<6?1:6===r.level?2:3)<<6,0!==r.strstart&&(h|=32),h+=31-h%31,r.status=N,$(r,h),0!==r.strstart&&($(r,t.adler>>>16),$(r,65535&t.adler)),t.adler=1}if(69===r.status)if(r.gzhead.extra){for(a=r.pending;r.gzindex<(65535&r.gzhead.extra.length)&&(r.pending!==r.pending_buf_size||(r.gzhead.hcrc&&r.pending>a&&(t.adler=T(t.adler,r.pending_buf,r.pending-a,a)),X(t),a=r.pending,r.pending!==r.pending_buf_size));)Z(r,255&r.gzhead.extra[r.gzindex]),r.gzindex++;r.gzhead.hcrc&&r.pending>a&&(t.adler=T(t.adler,r.pending_buf,r.pending-a,a)),r.gzindex===r.gzhead.extra.length&&(r.gzindex=0,r.status=73)}else r.status=73;if(73===r.status)if(r.gzhead.name){a=r.pending;do{if(r.pending===r.pending_buf_size&&(r.gzhead.hcrc&&r.pending>a&&(t.adler=T(t.adler,r.pending_buf,r.pending-a,a)),X(t),a=r.pending,r.pending===r.pending_buf_size)){n=1;break}n=r.gzindex<r.gzhead.name.length?255&r.gzhead.name.charCodeAt(r.gzindex++):0,Z(r,n)}while(0!==n);r.gzhead.hcrc&&r.pending>a&&(t.adler=T(t.adler,r.pending_buf,r.pending-a,a)),0===n&&(r.gzindex=0,r.status=91)}else r.status=91;if(91===r.status)if(r.gzhead.comment){a=r.pending;do{if(r.pending===r.pending_buf_size&&(r.gzhead.hcrc&&r.pending>a&&(t.adler=T(t.adler,r.pending_buf,r.pending-a,a)),X(t),a=r.pending,r.pending===r.pending_buf_size)){n=1;break}n=r.gzindex<r.gzhead.comment.length?255&r.gzhead.comment.charCodeAt(r.gzindex++):0,Z(r,n)}while(0!==n);r.gzhead.hcrc&&r.pending>a&&(t.adler=T(t.adler,r.pending_buf,r.pending-a,a)),0===n&&(r.status=K)}else r.status=K;if(r.status===K&&(r.gzhead.hcrc?(r.pending+2>r.pending_buf_size&&X(t),r.pending+2<=r.pending_buf_size&&(Z(r,255&t.adler),Z(r,t.adler>>8&255),t.adler=0,r.status=N)):r.status=N),0!==r.pending){if(X(t),0===t.avail_out)return r.last_flush=-1,0}else if(0===t.avail_in&&R(e)<=R(i)&&4!==e)return Q(t,-5);if(r.status===P&&0!==t.avail_in)return Q(t,-5);if(0!==t.avail_in||0!==r.lookahead||0!==e&&r.status!==P){var l=2===r.strategy?function(t,e){for(var a;;){if(0===t.lookahead&&(at(t),0===t.lookahead)){if(0===e)return 1;break}if(t.match_length=0,a=F(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++,a&&(Y(t,!1),0===t.strm.avail_out))return 1}return t.insert=0,4===e?(Y(t,!0),0===t.strm.avail_out?3:4):t.last_lit&&(Y(t,!1),0===t.strm.avail_out)?1:2}(r,e):3===r.strategy?function(t,e){for(var a,n,r,i,s=t.window;;){if(t.lookahead<=H){if(at(t),t.lookahead<=H&&0===e)return 1;if(0===t.lookahead)break}if(t.match_length=0,t.lookahead>=3&&t.strstart>0&&(n=s[r=t.strstart-1])===s[++r]&&n===s[++r]&&n===s[++r]){i=t.strstart+H;do{}while(n===s[++r]&&n===s[++r]&&n===s[++r]&&n===s[++r]&&n===s[++r]&&n===s[++r]&&n===s[++r]&&n===s[++r]&&r<i);t.match_length=H-(i-r),t.match_length>t.lookahead&&(t.match_length=t.lookahead)}if(t.match_length>=3?(a=F(t,1,t.match_length-3),t.lookahead-=t.match_length,t.strstart+=t.match_length,t.match_length=0):(a=F(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++),a&&(Y(t,!1),0===t.strm.avail_out))return 1}return t.insert=0,4===e?(Y(t,!0),0===t.strm.avail_out?3:4):t.last_lit&&(Y(t,!1),0===t.strm.avail_out)?1:2}(r,e):st[r.level].func(r,e);if(3!==l&&4!==l||(r.status=P),1===l||3===l)return 0===t.avail_out&&(r.last_flush=-1),0;if(2===l&&(1===e?function(t){m(t,2,3),b(t,256,s),function(t){16===t.bi_valid?(w(t,t.bi_buf),t.bi_buf=0,t.bi_valid=0):t.bi_valid>=8&&(t.pending_buf[t.pending++]=255&t.bi_buf,t.bi_buf>>=8,t.bi_valid-=8)}(t)}(r):5!==e&&(q(r,0,0,!1),3===e&&(V(r.head),0===r.lookahead&&(r.strstart=0,r.block_start=0,r.insert=0))),X(t),0===t.avail_out))return r.last_flush=-1,0}return 4!==e?0:r.wrap<=0?1:(2===r.wrap?(Z(r,255&t.adler),Z(r,t.adler>>8&255),Z(r,t.adler>>16&255),Z(r,t.adler>>24&255),Z(r,255&t.total_in),Z(r,t.total_in>>8&255),Z(r,t.total_in>>16&255),Z(r,t.total_in>>24&255)):($(r,t.adler>>>16),$(r,65535&t.adler)),X(t),r.wrap>0&&(r.wrap=-r.wrap),0!==r.pending?0:1)},ot=function(t){if(!t||!t.state)return G;var e=t.state.status;return 42!==e&&69!==e&&73!==e&&91!==e&&e!==K&&e!==N&&e!==P?Q(t,G):(t.state=null,e===N?Q(t,-3):0)},dt=new Uint8Array(256),ut=0;ut<256;ut++)dt[ut]=ut>=252?6:ut>=248?5:ut>=240?4:ut>=224?3:ut>=192?2:1;dt[254]=dt[254]=1;var ft=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0},ct=Object.prototype.toString;function pt(){this.options={level:-1,method:8,chunkSize:16384,windowBits:15,memLevel:8,strategy:0};var t=this.options;t.raw&&t.windowBits>0?t.windowBits=-t.windowBits:t.gzip&&t.windowBits>0&&t.windowBits<16&&(t.windowBits+=16),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new ft,this.strm.avail_out=0;var e,a,n=function(t,e,a,n,r,i){if(!t)return G;var s=1;if(-1===e&&(e=6),n<0?(s=0,n=-n):n>15&&(s=2,n-=16),r<1||r>9||8!==a||n<8||n>15||e<0||e>9||i<0||i>4)return Q(t,G);8===n&&(n=9);var h=new ht;return t.state=h,h.strm=t,h.wrap=s,h.gzhead=null,h.w_bits=n,h.w_size=1<<h.w_bits,h.w_mask=h.w_size-1,h.hash_bits=r+7,h.hash_size=1<<h.hash_bits,h.hash_mask=h.hash_size-1,h.hash_shift=~~((h.hash_bits+3-1)/3),h.window=new Uint8Array(2*h.w_size),h.head=new Uint16Array(h.hash_size),h.prev=new Uint16Array(h.w_size),h.lit_bufsize=1<<r+6,h.pending_buf_size=4*h.lit_bufsize,h.pending_buf=new Uint8Array(h.pending_buf_size),h.d_buf=1*h.lit_bufsize,h.l_buf=3*h.lit_bufsize,h.level=e,h.strategy=i,h.method=a,lt(t)}(this.strm,t.level,t.method,t.windowBits,t.memLevel,t.strategy);if(0!==n)throw Error(O[n]);if(t.header&&(e=this.strm,a=t.header,e&&e.state&&(2!==e.state.wrap||(e.state.gzhead=a))),t.dictionary){var r;if(r="[object ArrayBuffer]"===ct.call(t.dictionary)?new Uint8Array(t.dictionary):t.dictionary,0!==(n=function(t,e){var a=e.length;if(!t||!t.state)return G;var n=t.state,r=n.wrap;if(2===r||1===r&&42!==n.status||n.lookahead)return G;if(1===r&&(t.adler=L(t.adler,e,a,0)),n.wrap=0,a>=n.w_size){0===r&&(V(n.head),n.strstart=0,n.block_start=0,n.insert=0);var i=new Uint8Array(n.w_size);i.set(e.subarray(a-n.w_size,a),0),e=i,a=n.w_size}var s=t.avail_in,h=t.next_in,l=t.input;for(t.avail_in=a,t.next_in=0,t.input=e,at(n);n.lookahead>=3;){var _=n.strstart,o=n.lookahead-2;do{n.ins_h=W(n,n.ins_h,n.window[_+3-1]),n.prev[_&n.w_mask]=n.head[n.ins_h],n.head[n.ins_h]=_,_++}while(--o);n.strstart=_,n.lookahead=2,at(n)}return n.strstart+=n.lookahead,n.block_start=n.strstart,n.insert=n.lookahead,n.lookahead=0,n.match_length=n.prev_length=2,n.match_available=0,t.next_in=h,t.input=l,t.avail_in=s,n.wrap=r,0}(this.strm,r)))throw Error(O[n]);this._dict_set=!0}}function gt(t,e,a){try{t.postMessage({type:"errored",error:e,streamId:a})}catch(n){t.postMessage({type:"errored",error:e+"",streamId:a})}}function vt(t){const e=t.strm.adler;return new Uint8Array([3,0,e>>>24&255,e>>>16&255,e>>>8&255,255&e])}pt.prototype.push=function(t,e){var a,n,r=this.strm,i=this.options.chunkSize;if(this.ended)return!1;for(n=e===~~e?e:!0===e?4:0,"[object ArrayBuffer]"===ct.call(t)?r.input=new Uint8Array(t):r.input=t,r.next_in=0,r.avail_in=r.input.length;;)if(0===r.avail_out&&(r.output=new Uint8Array(i),r.next_out=0,r.avail_out=i),(2===n||3===n)&&r.avail_out<=6)this.onData(r.output.subarray(0,r.next_out)),r.avail_out=0;else{if(1===(a=_t(r,n)))return r.next_out>0&&this.onData(r.output.subarray(0,r.next_out)),a=ot(this.strm),this.onEnd(a),this.ended=!0,0===a;if(0!==r.avail_out){if(n>0&&r.next_out>0)this.onData(r.output.subarray(0,r.next_out)),r.avail_out=0;else if(0===r.avail_in)break}else this.onData(r.output)}return!0},pt.prototype.onData=function(t){this.chunks.push(t)},pt.prototype.onEnd=function(t){0===t&&(this.result=function(t){for(var e=0,a=0,n=t.length;a<n;a++)e+=t[a].length;for(var r=new Uint8Array(e),i=0,s=0,h=t.length;i<h;i++){var l=t[i];r.set(l,s),s+=l.length}return r}(this.chunks)),this.chunks=[],this.err=t,this.msg=this.strm.msg},function(e=self){try{const a=new Map;e.addEventListener("message",n=>{try{const r=function(e,a){switch(a.action){case"init":return{type:"initialized",version:"6.21.2"};case"write":{let n=e.get(a.streamId);n||(n=new pt,e.set(a.streamId,n));const r=n.chunks.length,i=function(t){if("function"==typeof TextEncoder&&TextEncoder.prototype.encode)return(new TextEncoder).encode(t);let e,a,n,r,i,s=t.length,h=0;for(r=0;r<s;r++)a=t.charCodeAt(r),55296==(64512&a)&&r+1<s&&(n=t.charCodeAt(r+1),56320==(64512&n)&&(a=65536+(a-55296<<10)+(n-56320),r++)),h+=a<128?1:a<2048?2:a<65536?3:4;for(e=new Uint8Array(h),i=0,r=0;i<h;r++)a=t.charCodeAt(r),55296==(64512&a)&&r+1<s&&(n=t.charCodeAt(r+1),56320==(64512&n)&&(a=65536+(a-55296<<10)+(n-56320),r++)),a<128?e[i++]=a:a<2048?(e[i++]=192|a>>>6,e[i++]=128|63&a):a<65536?(e[i++]=224|a>>>12,e[i++]=128|a>>>6&63,e[i++]=128|63&a):(e[i++]=240|a>>>18,e[i++]=128|a>>>12&63,e[i++]=128|a>>>6&63,e[i++]=128|63&a);return e}(a.data);return n.push(i,2),{type:"wrote",id:a.id,streamId:a.streamId,result:t(n.chunks.slice(r)),trailer:vt(n),additionalBytesCount:i.length}}case"reset":e.delete(a.streamId)}}(a,n.data);r&&e.postMessage(r)}catch(t){gt(e,t,n.data&&"streamId"in n.data?n.data.streamId:void 0)}})}catch(t){gt(e,t)}}()})();'])));
}
let ye = {
  status: 0
  /* DeflateWorkerStatus.Nil */
};
function jp(e, t, n, r = Kp) {
  switch (ye.status === 0 && Kk(e, t, r), ye.status) {
    case 1:
      return ye.initializationFailureCallbacks.push(n), ye.worker;
    case 3:
      return ye.worker;
  }
}
function tl() {
  return ye.status;
}
function Kk(e, t, n = Kp) {
  try {
    const r = n(e), { stop: s } = ce(e, r, "error", (a) => {
      Ai(e, t, a);
    }), { stop: o } = ce(e, r, "message", ({ data: a }) => {
      a.type === "errored" ? Ai(e, t, a.error, a.streamId) : a.type === "initialized" && qk(a.version);
    });
    r.postMessage({ action: "init" }), Ie(() => jk(t), zk), ye = { status: 1, worker: r, stop: () => {
      s(), o();
    }, initializationFailureCallbacks: [] };
  } catch (r) {
    Ai(e, t, r);
  }
}
function jk(e) {
  ye.status === 1 && (V.error(`${e} failed to start: a timeout occurred while initializing the Worker`), ye.initializationFailureCallbacks.forEach((t) => t()), ye = {
    status: 2
    /* DeflateWorkerStatus.Error */
  });
}
function qk(e) {
  ye.status === 1 && (ye = { status: 3, worker: ye.worker, stop: ye.stop, version: e });
}
function Ai(e, t, n, r) {
  ye.status === 1 || ye.status === 0 ? (hc({
    configuredUrl: e.workerUrl,
    error: n,
    source: t,
    scriptType: "worker"
  }), ye.status === 1 && ye.initializationFailureCallbacks.forEach((s) => s()), ye = {
    status: 2
    /* DeflateWorkerStatus.Error */
  }) : tc(n, {
    worker_version: ye.status === 3 && ye.version,
    stream_id: r
  });
}
function qp() {
  return (
    // Array.from is a bit less supported by browsers than CSSSupportsRule, but has higher chances
    // to be polyfilled. Test for both to be more confident. We could add more things if we find out
    // this test is not sufficient.
    typeof Array.from == "function" && typeof CSSSupportsRule == "function" && typeof URL.createObjectURL == "function" && "forEach" in NodeList.prototype
  );
}
function Xk(e, t, n, r) {
  const s = t.findTrackedSession(), o = Yk(s, r), i = n.findView();
  return Mk(e, {
    viewContext: i,
    errorType: o,
    session: s
  });
}
function Yk(e, t) {
  if (!qp())
    return "browser-not-supported";
  if (!e)
    return "rum-not-tracked";
  if (e.sessionReplay === 0)
    return "incorrect-session-plan";
  if (!t)
    return "replay-not-started";
}
function Jk(e, t) {
  if (!e.metricsEnabled)
    return { stop: q };
  let n, r, s;
  const { unsubscribe: o } = t.subscribe((i) => {
    switch (i.type) {
      case "start":
        n = { forced: i.forced, timestamp: te() }, r = void 0, s = void 0;
        break;
      case "document-ready":
        n && (r = le(n.timestamp, te()));
        break;
      case "recorder-settled":
        n && (s = le(n.timestamp, te()));
        break;
      case "aborted":
      case "deflate-encoder-load-failed":
      case "recorder-load-failed":
      case "succeeded":
        o(), n && ms("Recorder init metrics", {
          metrics: Qk(n.forced, s, le(n.timestamp, te()), i.type, r)
        });
        break;
    }
  });
  return { stop: o };
}
function Qk(e, t, n, r, s) {
  return {
    forced: e,
    loadRecorderModuleDuration: t,
    recorderInitDuration: n,
    result: r,
    waitForDocReadyDuration: s
  };
}
function Zk(e, t, n, r, s, o, i) {
  let a = 0, c;
  t.subscribe(9, () => {
    (a === 2 || a === 3) && (f(), a = 1);
  }), t.subscribe(10, () => {
    a === 1 && l();
  });
  const u = new Y();
  Jk(i, u);
  const d = async (p) => {
    u.notify({ type: "start", forced: p });
    const [h] = await Promise.all([
      nl(u, { type: "recorder-settled" }, s()),
      nl(u, { type: "document-ready" }, YE(e, "interactive"))
    ]);
    if (a !== 2) {
      u.notify({ type: "aborted" });
      return;
    }
    if (!h) {
      a = 0, u.notify({ type: "recorder-load-failed" });
      return;
    }
    const m = o();
    if (!m) {
      a = 0, u.notify({ type: "deflate-encoder-load-failed" });
      return;
    }
    ({ stop: c } = h(t, e, n, r, m, i)), a = 3, u.notify({ type: "succeeded" });
  };
  function l(p) {
    const h = n.findTrackedSession();
    if (eC(h, p)) {
      a = 1;
      return;
    }
    if (tC(a))
      return;
    a = 2;
    const m = nC(h, p) || !1;
    d(m).catch(ot), m && n.setForcedReplay();
  }
  function f() {
    a === 3 && c?.(), a = 0;
  }
  return {
    start: l,
    stop: f,
    getSessionReplayLink() {
      return Xk(
        e,
        n,
        r,
        a !== 0
        /* RecorderStatus.Stopped */
      );
    },
    isRecording: () => a === 3
  };
}
function eC(e, t) {
  return !e || e.sessionReplay === 0 && (!t || !t.force);
}
function tC(e) {
  return e === 2 || e === 3;
}
function nC(e, t) {
  return t && t.force && e.sessionReplay === 0;
}
async function nl(e, t, n) {
  try {
    return await n;
  } finally {
    e.notify(t);
  }
}
function rC() {
  let e = 0;
  return {
    strategy: {
      start() {
        e = 1;
      },
      stop() {
        e = 2;
      },
      isRecording: () => !1,
      getSessionReplayLink: q
    },
    shouldStartImmediately(t) {
      return e === 1 || e === 0 && !t.startSessionReplayRecordingManually;
    }
  };
}
function sC(e, t) {
  if (Et() && !Sf(
    "records"
    /* BridgeCapability.RECORDS */
  ) || !qp())
    return {
      start: q,
      stop: q,
      getReplayStats: () => {
      },
      onRumStart: q,
      isRecording: () => !1,
      getSessionReplayLink: () => {
      }
    };
  let { strategy: n, shouldStartImmediately: r } = rC();
  return {
    start: (o) => n.start(o),
    stop: () => n.stop(),
    getSessionReplayLink: () => n.getSessionReplayLink(),
    onRumStart: s,
    isRecording: () => (
      // The worker is started optimistically, meaning we could have started to record but its
      // initialization fails a bit later. This could happen when:
      // * the worker URL (blob or plain URL) is blocked by CSP in Firefox only (Chromium and Safari
      // throw an exception when instantiating the worker, and IE doesn't care about CSP)
      // * the browser fails to load the worker in case the workerUrl is used
      // * an unexpected error occurs in the Worker before initialization, ex:
      //   * a runtime exception collected by monitor()
      //   * a syntax error notified by the browser via an error event
      // * the worker is unresponsive for some reason and timeouts
      //
      // It is not expected to happen often. Nonetheless, the "replayable" status on RUM events is
      // an important part of the Datadog App:
      // * If we have a false positive (we set has_replay: true even if no replay data is present),
      // we might display broken links to the Session Replay player.
      // * If we have a false negative (we don't set has_replay: true even if replay data is
      // available), it is less noticeable because no link will be displayed.
      //
      // Thus, it is better to have false negative, so let's make sure the worker is correctly
      // initialized before advertizing that we are recording.
      //
      // In the future, when the compression worker will also be used for RUM data, this will be
      // less important since no RUM event will be sent when the worker fails to initialize.
      tl() === 3 && n.isRecording()
    ),
    getReplayStats: (o) => tl() === 3 ? Wk(o) : void 0
  };
  function s(o, i, a, c, u, d) {
    let l;
    function f() {
      return l || (u ?? (u = jp(i, "Datadog Session Replay", () => {
        n.stop();
      }, t)), u && (l = zp(
        i,
        u,
        1
        /* DeflateEncoderStreamId.REPLAY */
      ))), l;
    }
    n = Zk(i, o, a, c, e, f, d), r(i) && n.start();
  }
}
async function oC(e = iC) {
  try {
    return await e();
  } catch (t) {
    hc({
      error: t,
      source: "Recorder",
      scriptType: "module"
    });
  }
}
async function iC() {
  return (await Promise.resolve().then(() => oL)).startRecording;
}
function aC() {
  return Ge().Profiler !== void 0;
}
const cC = (e) => {
  let t = {
    status: "starting"
  };
  return e.register(0, ({ eventType: n }) => n !== H.VIEW && n !== H.LONG_TASK ? Ae : {
    type: n,
    _dd: {
      profiling: t
    }
  }), {
    get: () => t,
    set: (n) => {
      t = n;
    }
  };
};
async function uC(e = lC) {
  try {
    return await e();
  } catch (t) {
    hc({
      error: t,
      source: "Profiler",
      scriptType: "module"
    });
  }
}
async function lC() {
  return (await Promise.resolve().then(() => wL)).createRumProfiler;
}
function dC() {
  let e;
  function t(n, r, s, o, i) {
    const a = o.findTrackedSession();
    if (!a || !rp(a.id, s.profilingSampleRate))
      return;
    const c = cC(r);
    if (!aC()) {
      c.set({
        status: "error",
        error_reason: "not-supported-by-browser"
      });
      return;
    }
    uC().then((u) => {
      if (!u) {
        Dt("[DD_RUM] Failed to lazy load the RUM Profiler"), c.set({ status: "error", error_reason: "failed-to-lazy-load" });
        return;
      }
      e = u(s, n, o, c), e.start(i.findView());
    }).catch(ot);
  }
  return {
    onRumStart: t,
    stop: () => {
      e?.stop().catch(ot);
    }
  };
}
const fC = sC(oC), pC = dC(), mc = sT(Lk, fC, pC, {
  startDeflateWorker: jp,
  createDeflateEncoder: zp,
  sdkName: "rum"
});
Nf(Ge(), "DD_RUM", mc);
function fo(e, t, n) {
  const r = n.getHandler(), s = Array.isArray(r) ? r : [r];
  return rl[e] >= rl[n.getLevel()] && s.includes(t);
}
const G = {
  ok: "ok",
  debug: "debug",
  info: "info",
  notice: "notice",
  warn: "warn",
  error: "error",
  critical: "critical",
  alert: "alert",
  emerg: "emerg"
}, rl = {
  [G.ok]: 0,
  [G.debug]: 1,
  [G.info]: 2,
  [G.notice]: 4,
  [G.warn]: 5,
  [G.error]: 6,
  [G.critical]: 7,
  [G.alert]: 8,
  [G.emerg]: 9
};
function Zo(e, {
  /**
   * Set this to `true` to include the error message in the error field. In most cases, the error
   * message is already included in the log message, so we don't need to include it again.
   */
  includeMessage: t = !1
} = {}) {
  return {
    stack: e.stack,
    kind: e.type,
    message: t ? e.message : void 0,
    causes: e.causes,
    fingerprint: e.fingerprint,
    handling: e.handling
  };
}
var hC = function(e, t, n, r) {
  var s = arguments.length, o = s < 3 ? t : r === null ? r = Object.getOwnPropertyDescriptor(t, n) : r, i;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") o = Reflect.decorate(e, t, n, r);
  else for (var a = e.length - 1; a >= 0; a--) (i = e[a]) && (o = (s < 3 ? i(o) : s > 3 ? i(t, n, o) : i(t, n)) || o);
  return s > 3 && o && Object.defineProperty(t, n, o), o;
};
const ss = {
  console: "console",
  http: "http"
}, mC = Object.keys(G);
class et {
  constructor(t, n, r = ss.http, s = G.debug, o = {}) {
    this.handleLogStrategy = t, this.handlerType = r, this.level = s, this.contextManager = gs("logger"), this.tags = [], this.contextManager.setContext(o), n && this.contextManager.setContextProperty("logger", { name: n });
  }
  logImplementation(t, n, r = G.info, s, o) {
    const i = se(n);
    let a;
    if (s != null) {
      const c = Fo({
        originalError: s,
        nonErrorPrefix: "Provided",
        source: ze.LOGGER,
        handling: "handled",
        startClocks: pe()
      });
      a = Ze({
        error: Zo(c, { includeMessage: !0 })
      }, c.context, i);
    } else
      a = i;
    this.handleLogStrategy({
      message: se(t),
      context: a,
      status: r
    }, this, o);
  }
  log(t, n, r = G.info, s) {
    let o;
    fo(r, ss.http, this) && (o = yr("log")), this.logImplementation(t, n, r, s, o);
  }
  setContext(t) {
    this.contextManager.setContext(t);
  }
  getContext() {
    return this.contextManager.getContext();
  }
  setContextProperty(t, n) {
    this.contextManager.setContextProperty(t, n);
  }
  removeContextProperty(t) {
    this.contextManager.removeContextProperty(t);
  }
  clearContext() {
    this.contextManager.clearContext();
  }
  addTag(t, n) {
    this.tags.push(on(t, n));
  }
  removeTagsWithKey(t) {
    const n = lf(t);
    this.tags = this.tags.filter((r) => r !== n && !r.startsWith(`${n}:`));
  }
  getTags() {
    return this.tags.slice();
  }
  setHandler(t) {
    this.handlerType = t;
  }
  getHandler() {
    return this.handlerType;
  }
  setLevel(t) {
    this.level = t;
  }
  getLevel() {
    return this.level;
  }
}
hC([
  Ub
], et.prototype, "logImplementation", null);
et.prototype.ok = Ut(G.ok);
et.prototype.debug = Ut(G.debug);
et.prototype.info = Ut(G.info);
et.prototype.notice = Ut(G.notice);
et.prototype.warn = Ut(G.warn);
et.prototype.error = Ut(G.error);
et.prototype.critical = Ut(G.critical);
et.prototype.alert = Ut(G.alert);
et.prototype.emerg = Ut(G.emerg);
function Ut(e) {
  return function(t, n, r) {
    let s;
    fo(e, ss.http, this) && (s = yr("log")), this.logImplementation(t, n, e, r, s);
  };
}
function sl() {
  return On ? {} : {
    view: {
      referrer: document.referrer,
      url: window.location.href
    }
  };
}
const gC = 32 * xn;
function yC(e, t) {
  e.usePciIntake === !0 && e.site && e.site !== "datadoghq.com" && V.warn("PCI compliance for Logs is only available for Datadog organizations in the US1 site. Default intake will be used.");
  const n = xf(e, t), r = ol(e.forwardConsoleLogs, uo(ge), "Forward Console Logs"), s = ol(e.forwardReports, uo(_r), "Forward Reports");
  if (!(!n || !r || !s))
    return e.forwardErrorsToLogs && !r.includes(ge.error) && r.push(ge.error), {
      forwardErrorsToLogs: e.forwardErrorsToLogs !== !1,
      forwardConsoleLogs: r,
      forwardReports: s,
      requestErrorResponseLengthLimit: gC,
      ...n
    };
}
function ol(e, t, n) {
  if (e === void 0)
    return [];
  if (!(e === "all" || Array.isArray(e) && e.every((r) => t.includes(r)))) {
    V.error(`${n} should be "all" or an array with allowed values "${t.join('", "')}"`);
    return;
  }
  return e === "all" ? t : UE(e);
}
function _C(e) {
  const t = Of(e);
  return {
    forward_errors_to_logs: e.forwardErrorsToLogs,
    forward_console_logs: e.forwardConsoleLogs,
    forward_reports: e.forwardReports,
    use_pci_intake: e.usePciIntake,
    ...t
  };
}
function bC(e, t, n) {
  const r = jf(), s = ac();
  Ei(s, J.globalContext, r);
  const o = ic();
  Ei(o, J.accountContext, r);
  const i = cc();
  Ei(i, J.userContext, r);
  let a, c;
  const u = t.observable.subscribe(d);
  function d() {
    if (!c || !a || !t.isGranted())
      return;
    u.unsubscribe();
    const l = n(a, c);
    r.drain(l);
  }
  return {
    init(l, f) {
      if (!l) {
        V.error("Missing configuration");
        return;
      }
      if (uf(l.enableExperimentalFeatures), Et() && (l = wC(l)), a = l, Cf(_C(l)), c) {
        Ho("DD_LOGS", l);
        return;
      }
      const p = yC(l, f);
      p && (c = p, zo().subscribe(q), t.tryToInit(p.trackingConsent), d());
    },
    get initConfiguration() {
      return a;
    },
    globalContext: s,
    accountContext: o,
    userContext: i,
    getInternalContext: q,
    handleLog(l, f, p, h = e(), m = te()) {
      r.add((g) => g.handleLog(l, f, p, h, m));
    }
  };
}
function wC(e) {
  return { ...e, clientToken: "empty" };
}
function EC(e) {
  const t = nf(), n = Qf().observable;
  let r = bC(sl, t, (a, c) => {
    const u = e(c, sl, t, n);
    return r = SC(a, u), u;
  });
  const s = () => r, o = {}, i = new et((...a) => r.handleLog(...a));
  return Lf({
    logger: i,
    init: (a) => {
      const c = new Error().stack;
      xt(() => r.init(a, c));
    },
    setTrackingConsent: M((a) => {
      t.update(a), Ee({ feature: "set-tracking-consent", tracking_consent: a });
    }),
    getGlobalContext: ne(s, J.globalContext, re.getContext),
    setGlobalContext: ne(s, J.globalContext, re.setContext),
    setGlobalContextProperty: ne(s, J.globalContext, re.setContextProperty),
    removeGlobalContextProperty: ne(s, J.globalContext, re.removeContextProperty),
    clearGlobalContext: ne(s, J.globalContext, re.clearContext),
    createLogger: M((a, c = {}) => (o[a] = new et((...u) => r.handleLog(...u), se(a), c.handler, c.level, se(c.context)), o[a])),
    getLogger: M((a) => o[a]),
    getInitConfiguration: M(() => Vo(r.initConfiguration)),
    getInternalContext: M((a) => r.getInternalContext(a)),
    setUser: ne(s, J.userContext, re.setContext),
    getUser: ne(s, J.userContext, re.getContext),
    setUserProperty: ne(s, J.userContext, re.setContextProperty),
    removeUserProperty: ne(s, J.userContext, re.removeContextProperty),
    clearUser: ne(s, J.userContext, re.clearContext),
    setAccount: ne(s, J.accountContext, re.setContext),
    getAccount: ne(s, J.accountContext, re.getContext),
    setAccountProperty: ne(s, J.accountContext, re.setContextProperty),
    removeAccountProperty: ne(s, J.accountContext, re.removeContextProperty),
    clearAccount: ne(s, J.accountContext, re.clearContext)
  });
}
function SC(e, t) {
  return {
    init: (n) => {
      Ho("DD_LOGS", n);
    },
    initConfiguration: e,
    ...t
  };
}
const TC = "logs";
function vC(e, t) {
  const n = Vf(e, TC, (r) => Xp(e, r), t);
  return {
    findTrackedSession: (r, s = { returnInactive: !1 }) => {
      const o = n.findSession(r, s);
      return o && o.trackingType === "1" ? {
        id: o.id,
        anonymousId: o.anonymousId
      } : void 0;
    },
    expireObservable: n.expireObservable
  };
}
function IC(e) {
  const n = Xp(e) === "1" ? {} : void 0;
  return {
    findTrackedSession: () => n,
    expireObservable: new Y()
  };
}
function Xp(e, t) {
  return kC(t) ? t : Kt(e.sessionSampleRate) ? "1" : "0";
}
function kC(e) {
  return e === "0" || e === "1";
}
function CC(e, t, n, r, s) {
  const o = mC.concat(["custom"]), i = {};
  o.forEach((a) => {
    i[a] = qs(a, e.eventRateLimiterThreshold, s);
  }), t.subscribe(0, ({ rawLogsEvent: a, messageContext: c = void 0, savedCommonContext: u = void 0, domainContext: d, ddtags: l = [] }) => {
    var f, p;
    const h = No(a.date), m = u || r(), g = n.triggerHook(0, {
      startTime: h
    });
    if (g === lt)
      return;
    const y = $o(e), _ = Ze({
      view: m.view
    }, g, a, c, {
      ddtags: y.concat(l).join(",")
    });
    ((f = e.beforeSend) === null || f === void 0 ? void 0 : f.call(e, _, d)) === !1 || _.origin !== ze.AGENT && ((p = i[_.status]) !== null && p !== void 0 ? p : i.custom).isLimitReached() || t.notify(1, _);
  });
}
const AC = {
  [ge.log]: G.info,
  [ge.debug]: G.debug,
  [ge.info]: G.info,
  [ge.warn]: G.warn,
  [ge.error]: G.error
};
function RC(e, t) {
  const n = Kf(e.forwardConsoleLogs).subscribe((r) => {
    var s;
    const o = {
      rawLogsEvent: {
        date: te(),
        message: r.message,
        origin: ze.CONSOLE,
        error: r.error && Zo(r.error),
        status: AC[r.api]
      },
      messageContext: (s = r.error) === null || s === void 0 ? void 0 : s.context,
      domainContext: {
        handlingStack: r.handlingStack
      }
    };
    t.notify(0, o);
  });
  return {
    stop: () => {
      n.unsubscribe();
    }
  };
}
function xC(e, t) {
  const n = Mf(e, e.forwardReports).subscribe((r) => {
    let s = r.message, o;
    const i = r.originalError.type === "deprecation" ? G.warn : G.error;
    i === G.error ? o = Zo(r) : r.stack && (s += ` Found in ${Ww(r.stack)}`), t.notify(0, {
      rawLogsEvent: {
        date: te(),
        message: s,
        origin: ze.REPORT,
        error: o,
        status: i
      }
    });
  });
  return {
    stop: () => {
      n.unsubscribe();
    }
  };
}
function OC(e, t) {
  if (!e.forwardErrorsToLogs)
    return { stop: q };
  const n = (On ? new Y() : Gf(e)).subscribe((o) => {
    o.state === "complete" && s(Ln.XHR, o);
  }), r = zo().subscribe((o) => {
    o.state === "resolve" && s(Ln.FETCH, o);
  });
  function s(o, i) {
    !Rf(i.url) && (PC(i) || pf(i.status)) && ("xhr" in i ? LC(i.xhr, e, a) : i.response ? MC(i.response, e, a) : i.error && NC(i.error, e, a));
    function a(c) {
      const u = {
        isAborted: i.isAborted,
        handlingStack: i.handlingStack
      };
      t.notify(0, {
        rawLogsEvent: {
          message: `${DC(o)} error ${i.method} ${i.url}`,
          date: i.startClocks.timeStamp,
          error: {
            stack: c || "Failed to load",
            // We don't know if the error was handled or not, so we set it to undefined
            handling: void 0
          },
          http: {
            method: i.method,
            // Cast resource method because of case mismatch cf issue RUMF-1152
            status_code: i.status,
            url: i.url
          },
          status: G.error,
          origin: ze.NETWORK
        },
        domainContext: u
      });
    }
  }
  return {
    stop: () => {
      n.unsubscribe(), r.unsubscribe();
    }
  };
}
function LC(e, t, n) {
  typeof e.response == "string" ? n(gc(e.response, t)) : n(e.response);
}
function NC(e, t, n) {
  n(gc(vr(Tr(e)), t));
}
function MC(e, t, n) {
  const r = hf(e);
  !r || !r.body ? n() : window.TextDecoder ? UC(r.body, t.requestErrorResponseLengthLimit, (s, o) => {
    n(s ? `Unable to retrieve response: ${s}` : o);
  }) : r.text().then(M((s) => n(gc(s, t))), M((s) => n(`Unable to retrieve response: ${s}`)));
}
function PC(e) {
  return e.status === 0 && e.responseType !== "opaque";
}
function gc(e, t) {
  return e.length > t.requestErrorResponseLengthLimit ? `${e.substring(0, t.requestErrorResponseLengthLimit)}...` : e;
}
function DC(e) {
  return Ln.XHR === e ? "XHR" : "Fetch";
}
function UC(e, t, n) {
  Jf(e, (r, s, o) => {
    if (r)
      n(r);
    else {
      let i = new TextDecoder().decode(s);
      o && (i += "..."), n(void 0, i);
    }
  }, {
    bytesLimit: t,
    collectStreamBody: !0
  });
}
function FC(e, t, n) {
  if (!e.forwardErrorsToLogs)
    return { stop: q };
  const r = n.subscribe((s) => {
    if (s.type === 0) {
      const o = s.error;
      t.notify(0, {
        rawLogsEvent: {
          message: o.message,
          date: o.startClocks.timeStamp,
          error: Zo(o),
          origin: ze.SOURCE,
          status: G.error
        },
        messageContext: o.context
      });
    }
  });
  return {
    stop: () => {
      r.unsubscribe();
    }
  };
}
const $C = Hf;
function BC(e) {
  function t(n, r, s, o, i) {
    const a = Ze(r.getContext(), n.context);
    if (fo(n.status, ss.console, r) && WC(n, a), fo(n.status, ss.http, r)) {
      const c = {
        rawLogsEvent: {
          date: i || te(),
          message: n.message,
          status: n.status,
          origin: ze.LOGGER
        },
        messageContext: a,
        savedCommonContext: o,
        ddtags: r.getTags()
      };
      s && (c.domainContext = { handlingStack: s }), e.notify(0, c);
    }
  }
  return {
    handleLog: t
  };
}
const VC = {
  [G.ok]: ge.debug,
  [G.debug]: ge.debug,
  [G.info]: ge.info,
  [G.notice]: ge.info,
  [G.warn]: ge.warn,
  [G.error]: ge.error,
  [G.critical]: ge.error,
  [G.alert]: ge.error,
  [G.emerg]: ge.error
};
function WC({ status: e, message: t }, n) {
  un[VC[e]].call(mt, t, n);
}
function HC(e, t, n, r, s) {
  const o = [e.logsEndpointBuilder];
  e.replica && o.push(e.replica.logsEndpointBuilder);
  const i = Za({
    encoder: nc(),
    request: Wo(o, e.batchBytesLimit, n),
    flushController: ec({
      messagesLimit: e.batchMessagesLimit,
      bytesLimit: e.batchBytesLimit,
      durationLimit: e.flushTimeout,
      pageMayExitObservable: r,
      sessionExpireObservable: s.expireObservable
    }),
    messageBytesLimit: e.messageBytesLimit
  });
  return t.subscribe(1, (a) => {
    i.add(a);
  }), i;
}
function GC(e) {
  const t = Gn();
  e.subscribe(1, (n) => {
    t.send("log", n);
  });
}
function zC(e) {
  return {
    get: (t) => {
      const n = e.findTrackedSession(t);
      if (n)
        return {
          session_id: n.id
        };
    }
  };
}
function KC(e) {
  return (t) => {
    e.notify(0, {
      rawLogsEvent: {
        message: t.message,
        date: t.startClocks.timeStamp,
        origin: ze.AGENT,
        status: G.error
      }
    }), Dt("Error reported to customer", { "error.message": t.message });
  };
}
const jC = If;
function qC(e) {
  const t = ut;
  e.register(0, ({ startTime: s }) => {
    const o = n(s);
    return o || Ae;
  }), e.register(1, ({ startTime: s }) => {
    var o, i;
    const a = n(s);
    return a ? {
      application: { id: a.application_id },
      view: { id: (o = a.view) === null || o === void 0 ? void 0 : o.id },
      action: { id: (i = a.user_action) === null || i === void 0 ? void 0 : i.id }
    } : Ae;
  });
  function n(s) {
    const i = Go() ? t.DD_RUM_SYNTHETICS : t.DD_RUM, a = r(s, i);
    if (a)
      return a;
  }
  function r(s, o) {
    if (o && o.getInternalContext)
      return o.getInternalContext(s);
  }
}
function XC(e, t, n) {
  e.register(0, ({ startTime: r }) => {
    const s = n.findTrackedSession(r);
    return n.findTrackedSession(r, { returnInactive: !0 }) ? {
      service: t.service,
      session_id: s ? s.id : void 0,
      session: s ? { id: s.id } : void 0
    } : lt;
  }), e.register(1, ({ startTime: r }) => {
    const s = n.findTrackedSession(r);
    return !s || !s.id ? Ae : {
      session: { id: s.id }
    };
  });
}
function YC(e, t) {
  function n() {
    return t.isGranted() ? Ae : lt;
  }
  e.register(0, n), e.register(1, n);
}
const Ri = "logs";
function JC(e, t, n, r) {
  const s = new $C(), o = jC(), i = [];
  s.subscribe(1, (g) => Bo("logs", g));
  const a = KC(s), c = On ? new Y() : Tf(e), u = kf("browser-logs-sdk", e, o, a, c, nc);
  i.push(u.stop);
  const d = e.sessionStoreStrategyType && !Et() && !Go() ? vC(e, n) : IC(e);
  YC(o, n), XC(o, e, d);
  const l = qf(o, e, Ri), f = Yf(o, e, d, Ri), p = Xf(o, e, Ri, !1);
  qC(o), OC(e, s), FC(e, s, r), r.unbuffer(), RC(e, s), xC(e, s);
  const { handleLog: h } = BC(s);
  if (CC(e, s, o, t, a), Et())
    GC(s);
  else {
    const { stop: g } = HC(e, s, a, c, d);
    i.push(() => g());
  }
  const m = zC(d);
  return {
    handleLog: h,
    getInternalContext: m.get,
    accountContext: l,
    globalContext: p,
    userContext: f,
    stop: () => {
      i.forEach((g) => g());
    }
  };
}
const hn = EC(JC);
Nf(Ge(), "DD_LOGS", hn);
const Mt = Symbol.for("@ts-pattern/matcher"), QC = Symbol.for("@ts-pattern/isVariadic"), po = "@ts-pattern/anonymous-select-key", ca = (e) => !!(e && typeof e == "object"), Js = (e) => e && !!e[Mt], gt = (e, t, n) => {
  if (Js(e)) {
    const r = e[Mt](), { matched: s, selections: o } = r.match(t);
    return s && o && Object.keys(o).forEach((i) => n(i, o[i])), s;
  }
  if (ca(e)) {
    if (!ca(t)) return !1;
    if (Array.isArray(e)) {
      if (!Array.isArray(t)) return !1;
      let r = [], s = [], o = [];
      for (const i of e.keys()) {
        const a = e[i];
        Js(a) && a[QC] ? o.push(a) : o.length ? s.push(a) : r.push(a);
      }
      if (o.length) {
        if (o.length > 1) throw new Error("Pattern error: Using `...P.array(...)` several times in a single pattern is not allowed.");
        if (t.length < r.length + s.length) return !1;
        const i = t.slice(0, r.length), a = s.length === 0 ? [] : t.slice(-s.length), c = t.slice(r.length, s.length === 0 ? 1 / 0 : -s.length);
        return r.every((u, d) => gt(u, i[d], n)) && s.every((u, d) => gt(u, a[d], n)) && (o.length === 0 || gt(o[0], c, n));
      }
      return e.length === t.length && e.every((i, a) => gt(i, t[a], n));
    }
    return Object.keys(e).every((r) => {
      const s = e[r];
      return (r in t || Js(o = s) && o[Mt]().matcherType === "optional") && gt(s, t[r], n);
      var o;
    });
  }
  return Object.is(t, e);
}, tn = (e) => {
  var t, n, r;
  return ca(e) ? Js(e) ? (t = (n = (r = e[Mt]()).getSelectionKeys) == null ? void 0 : n.call(r)) != null ? t : [] : Array.isArray(e) ? os(e, tn) : os(Object.values(e), tn) : [];
}, os = (e, t) => e.reduce((n, r) => n.concat(t(r)), []);
function tt(e) {
  return Object.assign(e, { optional: () => ZC(e), and: (t) => fe(e, t), or: (t) => eA(e, t), select: (t) => t === void 0 ? il(e) : il(t, e) });
}
function ZC(e) {
  return tt({ [Mt]: () => ({ match: (t) => {
    let n = {};
    const r = (s, o) => {
      n[s] = o;
    };
    return t === void 0 ? (tn(e).forEach((s) => r(s, void 0)), { matched: !0, selections: n }) : { matched: gt(e, t, r), selections: n };
  }, getSelectionKeys: () => tn(e), matcherType: "optional" }) });
}
function fe(...e) {
  return tt({ [Mt]: () => ({ match: (t) => {
    let n = {};
    const r = (s, o) => {
      n[s] = o;
    };
    return { matched: e.every((s) => gt(s, t, r)), selections: n };
  }, getSelectionKeys: () => os(e, tn), matcherType: "and" }) });
}
function eA(...e) {
  return tt({ [Mt]: () => ({ match: (t) => {
    let n = {};
    const r = (s, o) => {
      n[s] = o;
    };
    return os(e, tn).forEach((s) => r(s, void 0)), { matched: e.some((s) => gt(s, t, r)), selections: n };
  }, getSelectionKeys: () => os(e, tn), matcherType: "or" }) });
}
function Z(e) {
  return { [Mt]: () => ({ match: (t) => ({ matched: !!e(t) }) }) };
}
function il(...e) {
  const t = typeof e[0] == "string" ? e[0] : void 0, n = e.length === 2 ? e[1] : typeof e[0] == "string" ? void 0 : e[0];
  return tt({ [Mt]: () => ({ match: (r) => {
    let s = { [t ?? po]: r };
    return { matched: n === void 0 || gt(n, r, (o, i) => {
      s[o] = i;
    }), selections: s };
  }, getSelectionKeys: () => [t ?? po].concat(n === void 0 ? [] : tn(n)) }) });
}
function ft(e) {
  return typeof e == "number";
}
function Ft(e) {
  return typeof e == "string";
}
function $t(e) {
  return typeof e == "bigint";
}
tt(Z(function(e) {
  return !0;
}));
const Bt = (e) => Object.assign(tt(e), { startsWith: (t) => {
  return Bt(fe(e, (n = t, Z((r) => Ft(r) && r.startsWith(n)))));
  var n;
}, endsWith: (t) => {
  return Bt(fe(e, (n = t, Z((r) => Ft(r) && r.endsWith(n)))));
  var n;
}, minLength: (t) => Bt(fe(e, ((n) => Z((r) => Ft(r) && r.length >= n))(t))), length: (t) => Bt(fe(e, ((n) => Z((r) => Ft(r) && r.length === n))(t))), maxLength: (t) => Bt(fe(e, ((n) => Z((r) => Ft(r) && r.length <= n))(t))), includes: (t) => {
  return Bt(fe(e, (n = t, Z((r) => Ft(r) && r.includes(n)))));
  var n;
}, regex: (t) => {
  return Bt(fe(e, (n = t, Z((r) => Ft(r) && !!r.match(n)))));
  var n;
} });
Bt(Z(Ft));
const pt = (e) => Object.assign(tt(e), { between: (t, n) => pt(fe(e, ((r, s) => Z((o) => ft(o) && r <= o && s >= o))(t, n))), lt: (t) => pt(fe(e, ((n) => Z((r) => ft(r) && r < n))(t))), gt: (t) => pt(fe(e, ((n) => Z((r) => ft(r) && r > n))(t))), lte: (t) => pt(fe(e, ((n) => Z((r) => ft(r) && r <= n))(t))), gte: (t) => pt(fe(e, ((n) => Z((r) => ft(r) && r >= n))(t))), int: () => pt(fe(e, Z((t) => ft(t) && Number.isInteger(t)))), finite: () => pt(fe(e, Z((t) => ft(t) && Number.isFinite(t)))), positive: () => pt(fe(e, Z((t) => ft(t) && t > 0))), negative: () => pt(fe(e, Z((t) => ft(t) && t < 0))) });
pt(Z(ft));
const Vt = (e) => Object.assign(tt(e), { between: (t, n) => Vt(fe(e, ((r, s) => Z((o) => $t(o) && r <= o && s >= o))(t, n))), lt: (t) => Vt(fe(e, ((n) => Z((r) => $t(r) && r < n))(t))), gt: (t) => Vt(fe(e, ((n) => Z((r) => $t(r) && r > n))(t))), lte: (t) => Vt(fe(e, ((n) => Z((r) => $t(r) && r <= n))(t))), gte: (t) => Vt(fe(e, ((n) => Z((r) => $t(r) && r >= n))(t))), positive: () => Vt(fe(e, Z((t) => $t(t) && t > 0))), negative: () => Vt(fe(e, Z((t) => $t(t) && t < 0))) });
Vt(Z($t));
tt(Z(function(e) {
  return typeof e == "boolean";
}));
tt(Z(function(e) {
  return typeof e == "symbol";
}));
tt(Z(function(e) {
  return e == null;
}));
tt(Z(function(e) {
  return e != null;
}));
const ua = { matched: !1, value: void 0 };
function Yp(e) {
  return new ho(e, ua);
}
class ho {
  constructor(t, n) {
    this.input = void 0, this.state = void 0, this.input = t, this.state = n;
  }
  with(...t) {
    if (this.state.matched) return this;
    const n = t[t.length - 1], r = [t[0]];
    let s;
    t.length === 3 && typeof t[1] == "function" ? s = t[1] : t.length > 2 && r.push(...t.slice(1, t.length - 1));
    let o = !1, i = {};
    const a = (u, d) => {
      o = !0, i[u] = d;
    }, c = !r.some((u) => gt(u, this.input, a)) || s && !s(this.input) ? ua : { matched: !0, value: n(o ? po in i ? i[po] : i : this.input, this.input) };
    return new ho(this.input, c);
  }
  when(t, n) {
    if (this.state.matched) return this;
    const r = !!t(this.input);
    return new ho(this.input, r ? { matched: !0, value: n(this.input, this.input) } : ua);
  }
  otherwise(t) {
    return this.state.matched ? this.state.value : t(this.input);
  }
  exhaustive() {
    if (this.state.matched) return this.state.value;
    let t;
    try {
      t = JSON.stringify(this.input);
    } catch {
      t = this.input;
    }
    throw new Error(`Pattern matching error: no pattern matches value ${t}`);
  }
  run() {
    return this.exhaustive();
  }
  returnType() {
    return this;
  }
}
const tA = [
  "chrome132",
  "safari17",
  "edge139",
  "firefox146",
  "ios17"
], nA = /([a-zA-Z]+)(\d+)/, Jp = [
  { pattern: /edg(?:e|ios|a)?\/([\d.]+)/i, name: "Edge" },
  { pattern: /firefox\/([\d.]+)/i, name: "Firefox" },
  { pattern: /opr\/([\d.]+)/i, name: "Opera" },
  { pattern: /trident.*rv[: ]([\d.]+)/i, name: "IE" },
  { pattern: / wv\).+chrome\/([\d.]+)/i, name: "Chrome WebView" },
  { pattern: /(?:chrome|crios|crmo)\/([\d.]+)/i, name: "Chrome" },
  { pattern: /version\/([\d.]+).*mobile.*safari/i, name: "Mobile Safari" },
  { pattern: /version\/([\d.]+).*safari/i, name: "Safari" }
];
function rA(e) {
  if (e) {
    for (const { pattern: t, name: n } of Jp)
      if (t.test(e))
        return n;
  }
}
function sA(e) {
  if (e)
    for (const { pattern: t } of Jp) {
      const n = e.match(t);
      if (n?.[1])
        return n[1];
    }
}
const oA = tA.reduce((e, t) => {
  const n = t.match(nA);
  return n && (e[n[1]] = +n[2]), e;
}, {});
function iA(e) {
  const t = e.toLowerCase();
  if (t === "chrome" || t === "chromium" || t === "chrome webview")
    return "chrome";
  if (t === "safari")
    return "safari";
  if (t === "mobile safari")
    return "ios";
  if (t === "edge")
    return "edge";
  if (t === "firefox")
    return "firefox";
}
function aA(e) {
  try {
    const t = rA(e);
    if (!t)
      return !0;
    const n = iA(t);
    if (!n)
      return !0;
    const r = oA[n];
    if (!r)
      return !0;
    const s = sA(e);
    if (!s)
      return !0;
    const o = s.split(".")[0];
    if (!o)
      return !0;
    const i = parseInt(o);
    return isNaN(i) ? !0 : i >= r;
  } catch {
    return !0;
  }
}
class ei extends Error {
  code;
  details;
  constructor(t, { message: n, cause: r, details: s = {} } = {}) {
    super(n ? `[${t}] ${n}` : `[${t}]`, { cause: r }), this.code = t, this.code = t, this.details = s, this.name = "PplxError", "captureStackTrace" in Error && typeof Error.captureStackTrace == "function" && Error.captureStackTrace(this, ei);
  }
}
function Pr(...e) {
  let t;
  const n = {}, r = [];
  e.filter(Boolean).forEach((o) => {
    o instanceof ei ? (t = o, r.push(o.message), o.details && Object.assign(n, {
      pplx_error_code: o.code,
      ...o.details
    })) : o instanceof Error ? (t = o, r.push(o.message)) : typeof o == "object" ? Object.assign(n, o) : r.push(o);
  });
  const s = r.join(" ");
  return t ? {
    message: s,
    error: t,
    extra: n
  } : {
    message: s,
    extra: n
  };
}
function Dr(e, { message: t, error: n, extra: r }) {
  const s = [t, r, n];
  Yp(e).with("error", () => {
    hn.logger.error(...s);
    try {
      mc.addError(n, { message: t, extra: r });
    } catch {
    }
  }).with("warn", () => hn.logger.warn(...s)).with("log", () => hn.logger.info(...s)).with("debug", () => hn.logger.debug(...s)).with("info", () => hn.logger.info(...s)).exhaustive();
}
const Nn = {
  log: (...e) => {
    Dr("debug", Pr(...e));
  },
  error: (...e) => {
    Dr("error", Pr(...e));
  },
  warn: (...e) => {
    Dr("warn", Pr(...e));
  },
  debug: (...e) => {
    Dr("debug", Pr(...e));
  },
  info: (...e) => {
    Dr("info", Pr(...e));
  }
};
function cA({ clientToken: e, version: t, env: n, debug: r, sessionSampleRate: s, service: o = "web-nextjs" }) {
  const i = aA(navigator.userAgent);
  hn.init({
    clientToken: e,
    // `site` refers to the Datadog site parameter of your organization
    // see https://docs.datadoghq.com/getting_started/site/
    site: "datadoghq.com",
    service: o,
    env: n,
    version: t,
    sessionSampleRate: s,
    forwardErrorsToLogs: !0,
    forwardConsoleLogs: ["warn", "error", "info"],
    silentMultipleInit: r,
    beforeSend: (a) => !i || a.http?.url.includes("reddit.com") || (a.http?.status_code === 0 && (a.status = "warn"), a.error?.handling === "unhandled" && a.message?.includes("Script error.") && !a.error?.cause) ? !1 : a.status === "error" || a.status === "warn" || a.status === "info"
  });
}
const Qp = "web.custom_metrics";
function uA(e, t, n) {
  Nn.info(Qp, {
    metricName: e,
    duration: t,
    ...n
  });
}
function lA(e = {}, { transport: t = uA, nowFromTimeOrigin: n = performance.now(), getTimeOrigin: r = () => performance.timeOrigin } = {}) {
  const s = { ...e }, o = /* @__PURE__ */ new Set(), i = [];
  function a(u, d = {}) {
    const l = performance.now() - n, f = {
      metricName: u,
      duration: l
    };
    return i.push(f), t(u, l, {
      ...s,
      ...d,
      // Store the start time of the timer
      startTime: n + r()
    }), f;
  }
  function c(u, d) {
    return o.has(u) ? i.find((l) => l.metricName === u) : (o.add(u), a(u, d));
  }
  return {
    addTimingOnce: c,
    addTiming: a,
    getEvents() {
      return i;
    },
    setGlobalContext(u) {
      Object.assign(s, u);
    },
    getStartTimeFromTimeOrigin() {
      return n;
    },
    getAbsoluteStartTime() {
      return n + r();
    }
  };
}
function al(e = {}, t = {}) {
  const n = (t.nowFromTimeOrigin ?? performance.now()) + cl();
  return lA(e, {
    ...t,
    transport: (r, s, o) => {
      performance.mark(r), mc.addDurationVital(r, {
        startTime: n,
        duration: s,
        context: o
      });
    },
    getTimeOrigin: cl
  });
}
function rr(e, t = {}) {
  Nn.info(Qp, {
    metricName: e,
    ...t
  });
}
function cl() {
  return performance.timeOrigin;
}
const Te = /* @__PURE__ */ new Map(), Zp = /* @__PURE__ */ new Set(), bt = /* @__PURE__ */ new Map(), ul = [
  "blue",
  "cyan",
  "green",
  "grey",
  "orange",
  "pink",
  "purple",
  "red",
  "yellow"
];
let Ds = -1;
const dA = () => (Ds++, Ds >= ul.length && (Ds = 0), ul[Ds] ?? "blue"), xi = /* @__PURE__ */ new Set(), Ue = typeof chrome < "u" && !!chrome && "perplexity" in chrome, ti = typeof chrome < "u" && !!chrome.perplexity?.system, bs = Ue && !!chrome.perplexity.mcp, eh = Ue && !!chrome.perplexity.dxt, fA = bs && !!chrome.perplexity.mcp.onStdioServerChanged, pA = bs && !!chrome.perplexity.mcp.onPersistedStdioServersLoaded, hA = bs && !!chrome.perplexity.mcp.onStdioServerAdded, mA = bs && !!chrome.perplexity.mcp.onStdioServerRemoved, gA = eh && !!chrome.perplexity.dxt.Permission;
ti && chrome.perplexity.system.getCurrentTheme;
const mo = "comet", yc = (async () => !ti || typeof chrome > "u" ? navigator.userAgent.match(/Chrome\/([\d.]+)/)?.[1] ?? "0.0.0.0" : chrome.perplexity.system.getProductVersion())(), ll = yc.then((e) => Number(e.split(".").at(0))), yA = yc.then((e) => Number(e.split(".").at(-1))), _c = (async () => Ue && typeof chrome < "u" && !!chrome.perplexity?.views?.createWebOverlay ? await ll > 141 || await ll === 141 && await yA >= 23205 : !1)(), _A = Ue && !!chrome.perplexity.pdf;
function bA(e) {
  return !!"perplexity.ai,localhost".split(",").some((t) => e === t || e.endsWith("." + t));
}
const Ce = ({ error: e, logger: t, context: n = void 0 }) => {
  t.error(e, n), gd(e, n);
}, go = (e) => async (...t) => {
  try {
    await e(...t);
  } catch (n) {
    throw Ce({ error: n, logger: W }), n;
  }
}, yo = {
  version: typeof chrome < "u" ? chrome.runtime.getManifest().version : "0.0.0",
  is_comet: Ue,
  device_id: void 0,
  browser_version: void 0,
  partner_build: !1
};
function th(e, ...t) {
  const n = [...t, yo];
  Nn[e](...n);
}
function nh(e = th) {
  return {
    error: (...t) => e("error", ...t),
    warn: (...t) => e("warn", ...t),
    info: (...t) => e("info", ...t),
    debug: (...t) => e("debug", ...t),
    exception: (t, n, ...r) => (e("error", t, n, ...r), new Error(t, { cause: n }))
  };
}
const W = nh();
Ue && (typeof chrome < "u" && !!chrome.perplexity?.system?.getMachineId ? chrome.perplexity.system.getMachineId().then((t) => {
  yo.device_id = t;
}).catch((t) => {
  Ce({
    error: "Failed to get Machine ID",
    logger: W,
    context: {
      err: t instanceof Error ? t.message : String(t)
    }
  });
}) : Ce({
  error: "Machine ID API not available",
  logger: W
}), yc.then((t) => {
  yo.browser_version = t;
}).catch((t) => {
  Ce({
    error: "Failed to get Browser Version",
    logger: W,
    context: {
      err: t instanceof Error ? t.message : String(t)
    }
  });
}));
function Ne(e) {
  return nh((...n) => {
    const r = {
      ...e,
      request_id: e.request_id ?? e.requestId ?? e["X-Request-ID"],
      step_uuid: e.step_uuid,
      "dd.trace_id": e["x-datadog-trace-id"],
      "dd.parent_id": e["x-datadog-parent-id"],
      "dd.origin": e["x-datadog-origin"],
      "dd.tags": e["x-datadog-tags"]
    };
    return th.apply(null, [...n, r]);
  });
}
const wA = "agent.custom_metrics";
function vn(e, t = {}) {
  Nn.info(wA, {
    metricName: e,
    ...t,
    ...yo
    // not all of this will be in tags
  });
}
const rh = "2.18", sh = "default", EA = "server", SA = "mweb", TA = "windowsapp", vA = "X-Perplexity-Request-Reason", IA = "X-App-Domain";
var kA = Object.defineProperty, CA = (e, t, n) => t in e ? kA(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n, Us = (e, t, n) => CA(e, typeof t != "symbol" ? t + "" : t, n);
class dl extends Error {
  constructor(t, n) {
    super(t), Us(this, "type"), Us(this, "field"), Us(this, "value"), Us(this, "line"), this.name = "ParseError", this.type = n.type, this.field = n.field, this.value = n.value, this.line = n.line;
  }
}
function Oi(e) {
}
function AA(e) {
  const { onEvent: t = Oi, onError: n = Oi, onRetry: r = Oi, onComment: s } = e;
  let o = "", i = !0, a, c = "", u = "";
  function d(m) {
    const g = i ? m.replace(/^\xEF\xBB\xBF/, "") : m, [y, _] = RA(`${o}${g}`);
    for (const w of y)
      l(w);
    o = _, i = !1;
  }
  function l(m) {
    if (m === "") {
      p();
      return;
    }
    if (m.startsWith(":")) {
      s && s(m.slice(m.startsWith(": ") ? 2 : 1));
      return;
    }
    const g = m.indexOf(":");
    if (g !== -1) {
      const y = m.slice(0, g), _ = m[g + 1] === " " ? 2 : 1, w = m.slice(g + _);
      f(y, w, m);
      return;
    }
    f(m, "", m);
  }
  function f(m, g, y) {
    switch (m) {
      case "event":
        u = g;
        break;
      case "data":
        c = `${c}${g}
`;
        break;
      case "id":
        a = g.includes("\0") ? void 0 : g;
        break;
      case "retry":
        /^\d+$/.test(g) ? r(parseInt(g, 10)) : n(
          new dl(`Invalid \`retry\` value: "${g}"`, {
            type: "invalid-retry",
            value: g,
            line: y
          })
        );
        break;
      default:
        n(
          new dl(
            `Unknown field "${m.length > 20 ? `${m.slice(0, 20)}…` : m}"`,
            { type: "unknown-field", field: m, value: g, line: y }
          )
        );
        break;
    }
  }
  function p() {
    c.length > 0 && t({
      id: a,
      event: u || void 0,
      // If the data buffer's last character is a U+000A LINE FEED (LF) character,
      // then remove the last character from the data buffer.
      data: c.endsWith(`
`) ? c.slice(0, -1) : c
    }), a = void 0, c = "", u = "";
  }
  function h(m = {}) {
    o && m.consume && l(o), a = void 0, c = "", u = "", o = "";
  }
  return { feed: d, reset: h };
}
function RA(e) {
  const t = [];
  let n = "";
  const r = e.length;
  for (let s = 0; s < r; s++) {
    const o = e[s];
    o === "\r" && e[s + 1] === `
` ? (t.push(n), n = "", s++) : o === "\r" || o === `
` ? (t.push(n), n = "") : n += o;
  }
  return [t, n];
}
class fl extends Event {
  /**
   * Constructs a new `ErrorEvent` instance. This is typically not called directly,
   * but rather emitted by the `EventSource` object when an error occurs.
   *
   * @param type - The type of the event (should be "error")
   * @param errorEventInitDict - Optional properties to include in the error event
   */
  constructor(t, n) {
    var r, s;
    super(t), this.code = (r = n?.code) != null ? r : void 0, this.message = (s = n?.message) != null ? s : void 0;
  }
  /**
   * Node.js "hides" the `message` and `code` properties of the `ErrorEvent` instance,
   * when it is `console.log`'ed. This makes it harder to debug errors. To ease debugging,
   * we explicitly include the properties in the `inspect` method.
   *
   * This is automatically called by Node.js when you `console.log` an instance of this class.
   *
   * @param _depth - The current depth
   * @param options - The options passed to `util.inspect`
   * @param inspect - The inspect function to use (prevents having to import it from `util`)
   * @returns A string representation of the error
   */
  [Symbol.for("nodejs.util.inspect.custom")](t, n, r) {
    return r(pl(this), n);
  }
  /**
   * Deno "hides" the `message` and `code` properties of the `ErrorEvent` instance,
   * when it is `console.log`'ed. This makes it harder to debug errors. To ease debugging,
   * we explicitly include the properties in the `inspect` method.
   *
   * This is automatically called by Deno when you `console.log` an instance of this class.
   *
   * @param inspect - The inspect function to use (prevents having to import it from `util`)
   * @param options - The options passed to `Deno.inspect`
   * @returns A string representation of the error
   */
  [Symbol.for("Deno.customInspect")](t, n) {
    return t(pl(this), n);
  }
}
function xA(e) {
  const t = globalThis.DOMException;
  return typeof t == "function" ? new t(e, "SyntaxError") : new SyntaxError(e);
}
function la(e) {
  return e instanceof Error ? "errors" in e && Array.isArray(e.errors) ? e.errors.map(la).join(", ") : "cause" in e && e.cause instanceof Error ? `${e}: ${la(e.cause)}` : e.message : `${e}`;
}
function pl(e) {
  return {
    type: e.type,
    message: e.message,
    code: e.code,
    defaultPrevented: e.defaultPrevented,
    cancelable: e.cancelable,
    timeStamp: e.timeStamp
  };
}
var oh = (e) => {
  throw TypeError(e);
}, bc = (e, t, n) => t.has(e) || oh("Cannot " + n), X = (e, t, n) => (bc(e, t, "read from private field"), n ? n.call(e) : t.get(e)), we = (e, t, n) => t.has(e) ? oh("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, n), de = (e, t, n, r) => (bc(e, t, "write to private field"), t.set(e, n), n), Tt = (e, t, n) => (bc(e, t, "access private method"), n), $e, mn, Yn, Qs, _o, jr, sr, qr, Gt, Jn, cr, Qn, Br, nt, da, fa, pa, hl, ha, ma, Vr, ga, ya;
class Zs extends EventTarget {
  constructor(t, n) {
    var r, s;
    super(), we(this, nt), this.CONNECTING = 0, this.OPEN = 1, this.CLOSED = 2, we(this, $e), we(this, mn), we(this, Yn), we(this, Qs), we(this, _o), we(this, jr), we(this, sr), we(this, qr, null), we(this, Gt), we(this, Jn), we(this, cr, null), we(this, Qn, null), we(this, Br, null), we(this, fa, async (o) => {
      var i;
      X(this, Jn).reset();
      const { body: a, redirected: c, status: u, headers: d } = o;
      if (u === 204) {
        Tt(this, nt, Vr).call(this, "Server sent HTTP 204, not reconnecting", 204), this.close();
        return;
      }
      if (c ? de(this, Yn, new URL(o.url)) : de(this, Yn, void 0), u !== 200) {
        Tt(this, nt, Vr).call(this, `Non-200 status code (${u})`, u);
        return;
      }
      if (!(d.get("content-type") || "").startsWith("text/event-stream")) {
        Tt(this, nt, Vr).call(this, 'Invalid content type, expected "text/event-stream"', u);
        return;
      }
      if (X(this, $e) === this.CLOSED)
        return;
      de(this, $e, this.OPEN);
      const l = new Event("open");
      if ((i = X(this, Br)) == null || i.call(this, l), this.dispatchEvent(l), typeof a != "object" || !a || !("getReader" in a)) {
        Tt(this, nt, Vr).call(this, "Invalid response body, expected a web ReadableStream", u), this.close();
        return;
      }
      const f = new TextDecoder(), p = a.getReader();
      let h = !0;
      do {
        const { done: m, value: g } = await p.read();
        g && X(this, Jn).feed(f.decode(g, { stream: !m })), m && (h = !1, X(this, Jn).reset(), Tt(this, nt, ga).call(this));
      } while (h);
    }), we(this, pa, (o) => {
      de(this, Gt, void 0), !(o.name === "AbortError" || o.type === "aborted") && Tt(this, nt, ga).call(this, la(o));
    }), we(this, ha, (o) => {
      typeof o.id == "string" && de(this, qr, o.id);
      const i = new MessageEvent(o.event || "message", {
        data: o.data,
        origin: X(this, Yn) ? X(this, Yn).origin : X(this, mn).origin,
        lastEventId: o.id || ""
      });
      X(this, Qn) && (!o.event || o.event === "message") && X(this, Qn).call(this, i), this.dispatchEvent(i);
    }), we(this, ma, (o) => {
      de(this, jr, o);
    }), we(this, ya, () => {
      de(this, sr, void 0), X(this, $e) === this.CONNECTING && Tt(this, nt, da).call(this);
    });
    try {
      if (t instanceof URL)
        de(this, mn, t);
      else if (typeof t == "string")
        de(this, mn, new URL(t, OA()));
      else
        throw new Error("Invalid URL");
    } catch {
      throw xA("An invalid or illegal string was specified");
    }
    de(this, Jn, AA({
      onEvent: X(this, ha),
      onRetry: X(this, ma)
    })), de(this, $e, this.CONNECTING), de(this, jr, 3e3), de(this, _o, (r = n?.fetch) != null ? r : globalThis.fetch), de(this, Qs, (s = n?.withCredentials) != null ? s : !1), Tt(this, nt, da).call(this);
  }
  /**
   * Returns the state of this EventSource object's connection. It can have the values described below.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/readyState)
   *
   * Note: typed as `number` instead of `0 | 1 | 2` for compatibility with the `EventSource` interface,
   * defined in the TypeScript `dom` library.
   *
   * @public
   */
  get readyState() {
    return X(this, $e);
  }
  /**
   * Returns the URL providing the event stream.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/url)
   *
   * @public
   */
  get url() {
    return X(this, mn).href;
  }
  /**
   * Returns true if the credentials mode for connection requests to the URL providing the event stream is set to "include", and false otherwise.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/withCredentials)
   */
  get withCredentials() {
    return X(this, Qs);
  }
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/error_event) */
  get onerror() {
    return X(this, cr);
  }
  set onerror(t) {
    de(this, cr, t);
  }
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/message_event) */
  get onmessage() {
    return X(this, Qn);
  }
  set onmessage(t) {
    de(this, Qn, t);
  }
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/open_event) */
  get onopen() {
    return X(this, Br);
  }
  set onopen(t) {
    de(this, Br, t);
  }
  addEventListener(t, n, r) {
    const s = n;
    super.addEventListener(t, s, r);
  }
  removeEventListener(t, n, r) {
    const s = n;
    super.removeEventListener(t, s, r);
  }
  /**
   * Aborts any instances of the fetch algorithm started for this EventSource object, and sets the readyState attribute to CLOSED.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/close)
   *
   * @public
   */
  close() {
    X(this, sr) && clearTimeout(X(this, sr)), X(this, $e) !== this.CLOSED && (X(this, Gt) && X(this, Gt).abort(), de(this, $e, this.CLOSED), de(this, Gt, void 0));
  }
}
$e = /* @__PURE__ */ new WeakMap(), mn = /* @__PURE__ */ new WeakMap(), Yn = /* @__PURE__ */ new WeakMap(), Qs = /* @__PURE__ */ new WeakMap(), _o = /* @__PURE__ */ new WeakMap(), jr = /* @__PURE__ */ new WeakMap(), sr = /* @__PURE__ */ new WeakMap(), qr = /* @__PURE__ */ new WeakMap(), Gt = /* @__PURE__ */ new WeakMap(), Jn = /* @__PURE__ */ new WeakMap(), cr = /* @__PURE__ */ new WeakMap(), Qn = /* @__PURE__ */ new WeakMap(), Br = /* @__PURE__ */ new WeakMap(), nt = /* @__PURE__ */ new WeakSet(), /**
* Connect to the given URL and start receiving events
*
* @internal
*/
da = function() {
  de(this, $e, this.CONNECTING), de(this, Gt, new AbortController()), X(this, _o)(X(this, mn), Tt(this, nt, hl).call(this)).then(X(this, fa)).catch(X(this, pa));
}, fa = /* @__PURE__ */ new WeakMap(), pa = /* @__PURE__ */ new WeakMap(), /**
* Get request options for the `fetch()` request
*
* @returns The request options
* @internal
*/
hl = function() {
  var e;
  const t = {
    // [spec] Let `corsAttributeState` be `Anonymous`…
    // [spec] …will have their mode set to "cors"…
    mode: "cors",
    redirect: "follow",
    headers: { Accept: "text/event-stream", ...X(this, qr) ? { "Last-Event-ID": X(this, qr) } : void 0 },
    cache: "no-store",
    signal: (e = X(this, Gt)) == null ? void 0 : e.signal
  };
  return "window" in globalThis && (t.credentials = this.withCredentials ? "include" : "same-origin"), t;
}, ha = /* @__PURE__ */ new WeakMap(), ma = /* @__PURE__ */ new WeakMap(), /**
* Handles the process referred to in the EventSource specification as "failing a connection".
*
* @param error - The error causing the connection to fail
* @param code - The HTTP status code, if available
* @internal
*/
Vr = function(e, t) {
  var n;
  X(this, $e) !== this.CLOSED && de(this, $e, this.CLOSED);
  const r = new fl("error", { code: t, message: e });
  (n = X(this, cr)) == null || n.call(this, r), this.dispatchEvent(r);
}, /**
* Schedules a reconnection attempt against the EventSource endpoint.
*
* @param message - The error causing the connection to fail
* @param code - The HTTP status code, if available
* @internal
*/
ga = function(e, t) {
  var n;
  if (X(this, $e) === this.CLOSED)
    return;
  de(this, $e, this.CONNECTING);
  const r = new fl("error", { code: t, message: e });
  (n = X(this, cr)) == null || n.call(this, r), this.dispatchEvent(r), de(this, sr, setTimeout(X(this, ya), X(this, jr)));
}, ya = /* @__PURE__ */ new WeakMap(), /**
* ReadyState representing an EventSource currently trying to connect
*
* @public
*/
Zs.CONNECTING = 0, /**
* ReadyState representing an EventSource connection that is open (eg connected)
*
* @public
*/
Zs.OPEN = 1, /**
* ReadyState representing an EventSource connection that is closed (eg disconnected)
*
* @public
*/
Zs.CLOSED = 2;
function OA() {
  const e = "document" in globalThis ? globalThis.document : void 0;
  return e && typeof e == "object" && "baseURI" in e && typeof e.baseURI == "string" ? e.baseURI : void 0;
}
class st extends ei {
  name = "FetcherError";
  constructor(t, n = {}) {
    super(t, n);
  }
}
const ih = /* @__PURE__ */ new WeakMap(), LA = "TimeoutError", ml = 2, ah = 1250, ch = 1e4, uh = 15e3, NA = (e) => {
  const t = typeof window > "u", n = new URL(e), r = n.searchParams;
  return r.get("version") || r.set("version", rh), r.get("source") || r.set("source", t ? EA : sh), n;
};
function MA(e, t) {
  const n = Math.max(typeof window < "u" ? t === "GET" ? ch : uh : ah, e);
  try {
    const r = globalThis.navigator.userAgent.includes("Mobile") && !globalThis.navigator.userAgent.includes("iPad");
    let s = "unknown", o = 10;
    return globalThis.navigator.connection && (s = globalThis.navigator.connection.type, o = globalThis.navigator.connection.downlink), r || o < 1 || s === "cellular" ? n * 2 : n;
  } catch {
    return n;
  }
}
const PA = (e) => {
  switch (e) {
    // Our Python Client Error Codes we CANNOT retry
    case 400:
    // Bad Request - Used for invalid request parameters or malformed requests
    case 403:
    // Forbidden - Used when access is denied
    case 404:
      return !1;
    // Our Python Client Error Codes we CAN retry
    /**
     * 401 Unauthorized - This can happen if we cannot look up the user in our
     * backend DB, possibly due to a read replica delay or just the DB being
     * unresponsive.
     */
    case 401:
    case 409:
      return !0;
    // Our Python Server Error Codes we CAN retry
    case 500:
    // Internal Server Error - Used for unexpected server errors
    case 502:
    // Bad Gateway - Used for unexpected server errors
    case 429:
      return !0;
    default:
      return !1;
  }
}, DA = (e) => {
  if (!e)
    return 0;
  const t = parseInt(e, 10);
  if (!isNaN(t))
    return Math.max(0, t * 1e3);
  const r = new Date(e).getTime();
  return isNaN(r) ? 0 : Math.max(0, r - Date.now());
}, UA = (e, t, n) => n + e * Math.pow(2, t), FA = async ({ resource: e, options: t = {}, method: n = "GET", timeoutMs: r = typeof window < "u" ? n === "GET" ? ch : uh : ah, body: s, numRetries: o = 0, backOffTime: i = 1e3, normalizedPath: a, reason: c, appDomain: u }) => {
  const d = {
    ...t,
    method: n,
    body: s
  }, l = new Headers(d.headers);
  l.set(vA, c), u && l.set(IA, u);
  let f = () => null;
  if (r) {
    const _ = MA(r, n);
    f = () => {
      const w = new DOMException(`fetch ${e} timed out (${_}ms)`, LA), E = new AbortController();
      return d.signal = E.signal, setTimeout(() => E.abort(w), _);
    };
  }
  if (o > ml) {
    const _ = new st("FETCHER_MAX_RETRIES_EXCEEDED", {
      details: {
        resource: e,
        numRetries: o,
        maxRetries: ml
      }
    });
    Nn.error(_);
  }
  let p = null, h, m = i, g = 0, y = 0;
  do {
    o > 0 && y > 0 && await new Promise((w) => setTimeout(w, m));
    const _ = f();
    g = 0, h = void 0;
    try {
      if (l.set("X-Perplexity-Request-Try-Number", String(y + 1)), l.set("X-Perplexity-Request-Endpoint", String(e)), p = await fetch(e, {
        ...d,
        headers: l
      }), clearTimeout(_), !p.ok && PA(p.status))
        g = DA(p.headers.get("Retry-After"));
      else
        break;
    } catch (w) {
      h = new st("FETCHER_NO_STATUS_CODE_ERROR", {
        message: w?.message,
        cause: w?.cause
      });
    }
    clearTimeout(_), m = UA(i, y, g), ++y;
  } while (y <= o);
  try {
    p && ih.set(p, a);
  } catch {
  }
  if (!h && !p.ok)
    if (p.status === 403 && p.headers.get("cf-mitigated")?.includes("challenge"))
      h = new st("FETCHER_CLOUDFLARE_403_ERROR");
    else {
      const _ = (await p.clone().text()).trimStart();
      (_.startsWith("<!DOCTYPE html") || _.startsWith("<html")) && (h = new st("FETCHER_HTML_STATUS_CODE_ERROR"));
    }
  if (h)
    throw Nn.log(`${d.method} ${e} exception`, h), h._fetchMethod = d.method, h._fetchResource = e, h;
  return p;
}, $A = 600 * 1e3;
async function BA({ url: e, normalizedPath: t, params: n, handlers: r, legacyEvents: s = {}, headers: o = {}, signal: i, metrics: a = {}, timer: c }) {
  const u = s.message ?? "message", d = s.endOfStream ?? "end_of_stream", l = s.message && s.endOfStream, { now: f, ...p } = a;
  c ? c.setGlobalContext({
    normalizedPath: t,
    ...p
  }) : c = al({
    normalizedPath: t,
    ...p
  }, { nowFromTimeOrigin: performance.now() });
  const { addTiming: h, addTimingOnce: m } = c;
  return h("web.sse.start"), new Promise((g, y) => {
    const _ = new Zs(e, {
      withCredentials: !0,
      fetch: (v, R) => fetch(v, {
        ...R,
        method: "POST",
        body: n ? JSON.stringify(n) : void 0,
        credentials: "include",
        signal: i,
        headers: {
          "content-type": "application/json",
          ...R?.headers ?? {},
          ...o
        }
      }).then((x) => {
        try {
          x && ih.set(x, t);
        } catch {
        }
        return x;
      })
    });
    let w, E;
    function S() {
      E ? E = void 0 : E = al({
        normalizedPath: t,
        ...p
      });
    }
    function b() {
      clearTimeout(w), w = setTimeout(() => {
        try {
          _.close();
        } catch {
        } finally {
          C();
        }
        y(new st("FETCHER_SSE_CHUNK_TIMEOUT", {
          details: {
            submitParams: n
          }
        }));
      }, $A);
    }
    function T(v) {
      clearTimeout(w);
      try {
        _.close();
      } catch {
      } finally {
        C();
      }
      v instanceof st ? y(v) : y(new st("FETCHER_SSE_ERROR", {
        cause: v,
        message: "An error occurred while streaming",
        details: {
          submitParams: n
        }
      }));
    }
    const D = (v) => {
      const R = () => !navigator.onLine || v.message === "network error";
      let x = "FETCHER_SSE_ERROR";
      R() ? x = "FETCHER_SSE_OFFLINE_ERROR" : v.code ? v.code === 403 && (x = "FETCHER_SSE_CLOUDFLARE_403_ERROR") : x = "FETCHER_SSE_NO_STATUS_CODE_ERROR", T(new st(x, {
        cause: v,
        details: {
          code: x,
          message: v.message,
          type: v.type,
          submitParams: n
        }
      }));
    }, k = () => {
      b(), h("web.sse.connection_opened"), r.open?.();
    }, I = (v) => {
      let R;
      try {
        m("web.sse.first_message_seen"), S(), b(), R = JSON.parse(v.data);
      } catch (x) {
        return T(new st("FETCHER_SSE_CHUNK_PROCESSING_ERROR", {
          cause: x,
          details: {
            submitParams: n
          }
        }));
      }
      r.message(R);
    }, A = (v) => {
      let R;
      try {
        m("web.sse.first_message_seen"), S(), clearTimeout(w);
        try {
          _.close();
        } catch {
        } finally {
          C();
        }
        R = JSON.parse(v.data);
      } catch (x) {
        return T(new st("FETCHER_SSE_EOS_ERROR", {
          cause: x,
          details: {
            submitParams: n
          }
        }));
      }
      l && r.message(R), h("web.sse.end_of_stream"), g();
    }, F = (v) => {
      let R;
      try {
        R = JSON.parse(v.data);
      } catch (x) {
        return T(new st("FETCHER_SSE_INFO_CHUNK_PARSE_ERROR", {
          cause: x,
          details: {
            submitParams: n
          }
        }));
      }
      r.info?.(R);
    };
    _.addEventListener("error", D), _.addEventListener("open", k), _.addEventListener(u, I), _.addEventListener(d, A), _.addEventListener("info", F);
    const C = () => {
      _.removeEventListener("error", D), _.removeEventListener("open", k), _.removeEventListener(u, I), _.removeEventListener(d, A), _.removeEventListener("info", F);
    };
    b();
  }).catch((g) => {
    throw g instanceof Error && (g.cause?.code ?? 0) > 0 || Nn.error("SSE error", g, {
      normalizedPath: t
    }), g;
  });
}
const gl = (e, t) => {
  const n = e.replace(/\/+$/, ""), r = t.replace(/^\/+/, "");
  return new URL(r, n).toString();
}, VA = (e, t) => e ? SA : t ? TA : sh, WA = ({ clientHeaders: e, isMobile: t, isWindowsApp: n }) => {
  const r = VA(t, n), s = e instanceof Headers ? new Headers(e) : new Headers(Object.entries(e ?? {}).filter((i) => i[1] !== void 0).map(([i, a]) => [i, Array.isArray(a) ? a.join(", ") : a])), o = new Headers({
    "X-App-ApiClient": r,
    "X-App-ApiVersion": rh
  });
  return s.forEach((i, a) => {
    o.set(a, i);
  }), o;
};
async function HA({ urlPath: e, timeoutMs: t, method: n, body: r, headers: s, baseUrlOverride: o, includeCredentials: i, redirect: a, numRetries: c, backOffTime: u, reason: d, normalizedPath: l, shouldNotAddSourceVersionQueryParams: f, appDomain: p }) {
  const h = navigator.userAgent.includes("Mobile"), m = navigator.userAgent.includes("WindowsApp"), y = {
    headers: WA({
      clientHeaders: s,
      isMobile: h,
      isWindowsApp: m
    }),
    redirect: a,
    credentials: i ? "include" : "same-origin"
  }, _ = o ?? window.location.origin, w = f ? gl(_, e) : NA(gl(_, e));
  return FA({
    resource: w,
    options: y,
    timeoutMs: t,
    method: n,
    body: r,
    numRetries: c,
    backOffTime: u,
    reason: d,
    normalizedPath: l,
    appDomain: p
  });
}
async function GA({ url: e, headers: t, ...n }) {
  const r = new URL(e, window.location.origin);
  return BA({
    url: r,
    headers: t,
    ...n
  });
}
const an = "X-Perplexity-Request-Reason", lh = (e, t) => {
  const n = e({
    baseUrl: `https://${crypto.randomUUID()}.com`,
    // We will throw this away for whatever restAsyncServerFetch uses
    fetch: async (r) => {
      const s = new URL(r.url), o = s.pathname, i = s.searchParams, a = await r.text(), c = r.headers.get(an) ?? "typedRestAsyncClient";
      return HA({
        urlPath: i.size > 0 ? `${o}?${i.toString()}` : o,
        method: r.method,
        body: a || void 0,
        headers: r.headers,
        timeoutMs: r.timeoutMs,
        numRetries: r.numRetries,
        backOffTime: r.backOffTime,
        reason: c,
        normalizedPath: r.normalizedPath ?? o,
        baseUrlOverride: r.baseUrlOverride,
        includeCredentials: r.includeCredentials,
        shouldNotAddSourceVersionQueryParams: r.shouldNotAddSourceVersionQueryParams,
        redirect: r.redirect,
        appDomain: t?.appDomain
      });
    }
  });
  return {
    GET: ((r, s, o) => n.GET(r, {
      ...o || {},
      normalizedPath: r,
      ...o || {},
      headers: {
        ...o?.headers || {},
        [an]: s
      }
    })),
    POST: ((r, s, o) => n.POST(r, {
      ...o || {},
      normalizedPath: r,
      headers: {
        ...o?.headers || {},
        [an]: s
      }
    })),
    PUT: ((r, s, o) => n.PUT(r, {
      ...o || {},
      normalizedPath: r,
      headers: {
        ...o?.headers || {},
        [an]: s
      }
    })),
    PATCH: ((r, s, o) => n.PATCH(r, {
      ...o || {},
      normalizedPath: r,
      headers: {
        ...o?.headers || {},
        [an]: s
      }
    })),
    DELETE: ((r, s, o) => n.DELETE(r, {
      ...o || {},
      normalizedPath: r,
      headers: {
        ...o?.headers || {},
        [an]: s
      }
    })),
    SSE: zA
  };
};
function zA(e, t, { path: n, ...r }) {
  return GA({
    url: Object.entries(n ?? {}).reduce((s, [o, i]) => s.replace(`{${o}}`, String(i)), e),
    normalizedPath: e,
    ...r || {},
    headers: {
      ...r?.headers || {},
      [an]: t
    }
  });
}
const KA = /\{[^{}]+\}/g, jA = () => typeof process == "object" && Number.parseInt(process?.versions?.node?.substring(0, 2)) >= 18 && process.versions.undici;
function qA() {
  return Math.random().toString(36).slice(2, 11);
}
function XA(e) {
  let {
    baseUrl: t = "",
    Request: n = globalThis.Request,
    fetch: r = globalThis.fetch,
    querySerializer: s,
    bodySerializer: o,
    headers: i,
    requestInitExt: a = void 0,
    ...c
  } = { ...e };
  a = jA() ? a : void 0, t = _l(t);
  const u = [];
  async function d(l, f) {
    const {
      baseUrl: p,
      fetch: h = r,
      Request: m = n,
      headers: g,
      params: y = {},
      parseAs: _ = "json",
      querySerializer: w,
      bodySerializer: E = o ?? JA,
      body: S,
      ...b
    } = f || {};
    p && (t = _l(p));
    let T = typeof s == "function" ? s : yl(s);
    w && (T = typeof w == "function" ? w : yl({
      ...typeof s == "object" ? s : {},
      ...w
    }));
    const D = S === void 0 ? void 0 : E(S), k = (
      // with no body, we should not to set Content-Type
      D === void 0 || // if serialized body is FormData; browser will correctly set Content-Type & boundary expression
      D instanceof FormData ? {} : {
        "Content-Type": "application/json"
      }
    ), I = {
      redirect: "follow",
      ...c,
      ...b,
      body: D,
      headers: ZA(k, i, g, y.header)
    };
    let A, F, C = new n(QA(l, { baseUrl: t, params: y, querySerializer: T }), I), v;
    for (const x in b)
      x in C || (C[x] = b[x]);
    if (u.length) {
      A = qA(), F = Object.freeze({
        baseUrl: t,
        fetch: h,
        parseAs: _,
        querySerializer: T,
        bodySerializer: E
      });
      for (const x of u)
        if (x && typeof x == "object" && typeof x.onRequest == "function") {
          const j = await x.onRequest({
            request: C,
            schemaPath: l,
            params: y,
            options: F,
            id: A
          });
          if (j)
            if (j instanceof n)
              C = j;
            else if (j instanceof Response) {
              v = j;
              break;
            } else
              throw new Error("onRequest: must return new Request() or Response() when modifying the request");
        }
    }
    if (!v) {
      try {
        v = await h(C, a);
      } catch (x) {
        let j = x;
        if (u.length)
          for (let $ = u.length - 1; $ >= 0; $--) {
            const ue = u[$];
            if (ue && typeof ue == "object" && typeof ue.onError == "function") {
              const O = await ue.onError({
                request: C,
                error: j,
                schemaPath: l,
                params: y,
                options: F,
                id: A
              });
              if (O) {
                if (O instanceof Response) {
                  j = void 0, v = O;
                  break;
                }
                if (O instanceof Error) {
                  j = O;
                  continue;
                }
                throw new Error("onError: must return new Response() or instance of Error");
              }
            }
          }
        if (j)
          throw j;
      }
      if (u.length)
        for (let x = u.length - 1; x >= 0; x--) {
          const j = u[x];
          if (j && typeof j == "object" && typeof j.onResponse == "function") {
            const $ = await j.onResponse({
              request: C,
              response: v,
              schemaPath: l,
              params: y,
              options: F,
              id: A
            });
            if ($) {
              if (!($ instanceof Response))
                throw new Error("onResponse: must return new Response() when modifying the response");
              v = $;
            }
          }
        }
    }
    if (v.status === 204 || v.headers.get("Content-Length") === "0")
      return v.ok ? { data: void 0, response: v } : { error: void 0, response: v };
    if (v.ok)
      return _ === "stream" ? { data: v.body, response: v } : { data: await v[_](), response: v };
    let R = await v.text();
    try {
      R = JSON.parse(R);
    } catch {
    }
    return { error: R, response: v };
  }
  return {
    request(l, f, p) {
      return d(f, { ...p, method: l.toUpperCase() });
    },
    /** Call a GET endpoint */
    GET(l, f) {
      return d(l, { ...f, method: "GET" });
    },
    /** Call a PUT endpoint */
    PUT(l, f) {
      return d(l, { ...f, method: "PUT" });
    },
    /** Call a POST endpoint */
    POST(l, f) {
      return d(l, { ...f, method: "POST" });
    },
    /** Call a DELETE endpoint */
    DELETE(l, f) {
      return d(l, { ...f, method: "DELETE" });
    },
    /** Call a OPTIONS endpoint */
    OPTIONS(l, f) {
      return d(l, { ...f, method: "OPTIONS" });
    },
    /** Call a HEAD endpoint */
    HEAD(l, f) {
      return d(l, { ...f, method: "HEAD" });
    },
    /** Call a PATCH endpoint */
    PATCH(l, f) {
      return d(l, { ...f, method: "PATCH" });
    },
    /** Call a TRACE endpoint */
    TRACE(l, f) {
      return d(l, { ...f, method: "TRACE" });
    },
    /** Register middleware */
    use(...l) {
      for (const f of l)
        if (f) {
          if (typeof f != "object" || !("onRequest" in f || "onResponse" in f || "onError" in f))
            throw new Error("Middleware must be an object with one of `onRequest()`, `onResponse() or `onError()`");
          u.push(f);
        }
    },
    /** Unregister middleware */
    eject(...l) {
      for (const f of l) {
        const p = u.indexOf(f);
        p !== -1 && u.splice(p, 1);
      }
    }
  };
}
function ni(e, t, n) {
  if (t == null)
    return "";
  if (typeof t == "object")
    throw new Error(
      "Deeply-nested arrays/objects aren’t supported. Provide your own `querySerializer()` to handle these."
    );
  return `${e}=${n?.allowReserved === !0 ? t : encodeURIComponent(t)}`;
}
function dh(e, t, n) {
  if (!t || typeof t != "object")
    return "";
  const r = [], s = {
    simple: ",",
    label: ".",
    matrix: ";"
  }[n.style] || "&";
  if (n.style !== "deepObject" && n.explode === !1) {
    for (const a in t)
      r.push(a, n.allowReserved === !0 ? t[a] : encodeURIComponent(t[a]));
    const i = r.join(",");
    switch (n.style) {
      case "form":
        return `${e}=${i}`;
      case "label":
        return `.${i}`;
      case "matrix":
        return `;${e}=${i}`;
      default:
        return i;
    }
  }
  for (const i in t) {
    const a = n.style === "deepObject" ? `${e}[${i}]` : i;
    r.push(ni(a, t[i], n));
  }
  const o = r.join(s);
  return n.style === "label" || n.style === "matrix" ? `${s}${o}` : o;
}
function fh(e, t, n) {
  if (!Array.isArray(t))
    return "";
  if (n.explode === !1) {
    const o = { form: ",", spaceDelimited: "%20", pipeDelimited: "|" }[n.style] || ",", i = (n.allowReserved === !0 ? t : t.map((a) => encodeURIComponent(a))).join(o);
    switch (n.style) {
      case "simple":
        return i;
      case "label":
        return `.${i}`;
      case "matrix":
        return `;${e}=${i}`;
      // case "spaceDelimited":
      // case "pipeDelimited":
      default:
        return `${e}=${i}`;
    }
  }
  const r = { simple: ",", label: ".", matrix: ";" }[n.style] || "&", s = [];
  for (const o of t)
    n.style === "simple" || n.style === "label" ? s.push(n.allowReserved === !0 ? o : encodeURIComponent(o)) : s.push(ni(e, o, n));
  return n.style === "label" || n.style === "matrix" ? `${r}${s.join(r)}` : s.join(r);
}
function yl(e) {
  return function(n) {
    const r = [];
    if (n && typeof n == "object")
      for (const s in n) {
        const o = n[s];
        if (o != null) {
          if (Array.isArray(o)) {
            if (o.length === 0)
              continue;
            r.push(
              fh(s, o, {
                style: "form",
                explode: !0,
                ...e?.array,
                allowReserved: e?.allowReserved || !1
              })
            );
            continue;
          }
          if (typeof o == "object") {
            r.push(
              dh(s, o, {
                style: "deepObject",
                explode: !0,
                ...e?.object,
                allowReserved: e?.allowReserved || !1
              })
            );
            continue;
          }
          r.push(ni(s, o, e));
        }
      }
    return r.join("&");
  };
}
function YA(e, t) {
  let n = e;
  for (const r of e.match(KA) ?? []) {
    let s = r.substring(1, r.length - 1), o = !1, i = "simple";
    if (s.endsWith("*") && (o = !0, s = s.substring(0, s.length - 1)), s.startsWith(".") ? (i = "label", s = s.substring(1)) : s.startsWith(";") && (i = "matrix", s = s.substring(1)), !t || t[s] === void 0 || t[s] === null)
      continue;
    const a = t[s];
    if (Array.isArray(a)) {
      n = n.replace(r, fh(s, a, { style: i, explode: o }));
      continue;
    }
    if (typeof a == "object") {
      n = n.replace(r, dh(s, a, { style: i, explode: o }));
      continue;
    }
    if (i === "matrix") {
      n = n.replace(r, `;${ni(s, a)}`);
      continue;
    }
    n = n.replace(r, i === "label" ? `.${encodeURIComponent(a)}` : encodeURIComponent(a));
  }
  return n;
}
function JA(e) {
  return e instanceof FormData ? e : JSON.stringify(e);
}
function QA(e, t) {
  let n = `${t.baseUrl}${e}`;
  t.params?.path && (n = YA(n, t.params.path));
  let r = t.querySerializer(t.params.query ?? {});
  return r.startsWith("?") && (r = r.substring(1)), r && (n += `?${r}`), n;
}
function ZA(...e) {
  const t = new Headers();
  for (const n of e) {
    if (!n || typeof n != "object")
      continue;
    const r = n instanceof Headers ? n.entries() : Object.entries(n);
    for (const [s, o] of r)
      if (o === null)
        t.delete(s);
      else if (Array.isArray(o))
        for (const i of o)
          t.append(s, i);
      else o !== void 0 && t.set(s, o);
  }
  return t;
}
function _l(e) {
  return e.endsWith("/") ? e.substring(0, e.length - 1) : e;
}
function ph(e) {
  return XA(e);
}
const e0 = lh(ph);
lh(ph, { appDomain: "api-console" });
const t0 = {
  MEDIUM: 5e3
}, n0 = [
  "http:",
  "https:",
  // So we're not blocking our own extensions
  "chrome-extension:",
  // WebSockets are fine
  "ws:",
  "wss:",
  // Files & inline data are fine
  "file:",
  "data:"
], _a = /* @__PURE__ */ new Map(), Mn = async (e) => {
  const t = { tabId: e };
  async function n(s, o, i) {
    if (s.tabId === e && o === "Fetch.requestPaused" && i) {
      const a = i, { requestId: c, request: u } = a, d = new URL(u.url);
      try {
        n0.includes(d.protocol) ? await U(s, "Fetch.continueRequest", {
          requestId: c
        }, "attachDebugger") : await U(s, "Fetch.failRequest", {
          requestId: c,
          errorReason: "BlockedByClient"
        }, "attachDebugger");
      } catch {
      }
    }
  }
  try {
    await chrome.debugger.attach(t, "1.3"), await Promise.all([
      U(t, "DOM.enable", void 0, "attachDebugger"),
      U(t, "Page.enable", void 0, "attachDebugger"),
      U(t, "Network.enable", void 0, "attachDebugger"),
      U(t, "DOMSnapshot.enable", void 0, "attachDebugger"),
      U(t, "Accessibility.enable", void 0, "attachDebugger"),
      U(t, "Page.setLifecycleEventsEnabled", {
        enabled: !0
      }, "attachDebugger"),
      U(t, "Emulation.setFocusEmulationEnabled", {
        enabled: !0
      }, "attachDebugger"),
      U(t, "Fetch.enable", {
        patterns: [{ urlPattern: "*://*/*" }]
      }, "attachDebugger"),
      U(t, "Page.setInterceptFileChooserDialog", {
        enabled: !0
      }, "attachDebugger")
    ]), chrome.debugger.onEvent.addListener(n);
  } catch (s) {
    if (!(s instanceof Error) || !(s.message.includes("Already attached") || s.message.includes("Another debugger")))
      throw s;
  }
  const r = async () => {
    _a.delete(e), chrome.debugger.onEvent.removeListener(n);
    try {
      await chrome.debugger.detach({ tabId: e });
    } catch (s) {
      if (s instanceof Error && s.message.includes("No tab with given id"))
        return;
      throw s;
    }
  };
  return _a.set(e, r), r;
}, bl = async (e) => {
  const t = _a.get(e);
  if (!t)
    throw new Error("Debugger not attached");
  await t();
};
async function r0(e) {
  try {
    return (await chrome.debugger.sendCommand(e, "Runtime.evaluate", {
      expression: "document.readyState",
      returnByValue: !0
    })).result?.value;
  } catch {
    return null;
  }
}
async function s0(e, t) {
  const n = performance.now(), r = 200;
  for (; performance.now() - n < t; )
    if (await Promise.race([
      new Promise((o) => {
        r0(e).then((i) => {
          i && i !== "loading" && o(!0);
        });
      }),
      new Promise((o) => setTimeout(() => o(!1), r))
    ]))
      return;
  throw new zn(`Document ready timeout after ${t}ms`);
}
async function U(e, t, n, r, s = 1e4, o = W) {
  const i = performance.now();
  return t === "Page.captureScreenshot" && (await s0(e, s), s = s - (performance.now() - i)), new Promise((a, c) => {
    let u = !1;
    const d = setTimeout(() => {
      if (u)
        return;
      u = !0;
      const l = t.startsWith("Fetch."), f = performance.now() - i;
      l || o.error("[Debugger] Command timed out", {
        method: t,
        reason: r,
        ...e,
        duration: `${f.toFixed(2)}ms`
      }), c(new zn(`Debugger command timed out: ${t}`));
    }, s);
    chrome.debugger.sendCommand(e, t, n).then((l) => {
      u || (u = !0, clearTimeout(d), a(l));
    }).catch((l) => {
      u || (u = !0, clearTimeout(d), c(l));
    });
  });
}
function o0(e, t, n = !1) {
  let r;
  return function(...s) {
    const o = n && !r;
    r && clearTimeout(r), r = setTimeout(() => {
      r = null, n || e(...s);
    }, t), o && e(...s);
  };
}
function i0(e, t) {
  return new Promise((n) => {
    setTimeout(() => n(t), e);
  });
}
const gn = (e = "") => {
  let t = e, n = "";
  try {
    const r = new URL(e);
    t = e && r.hostname, n = r.protocol;
  } catch {
  }
  return {
    domain: t,
    protocol: n,
    url: e
  };
}, a0 = (e, t = !1) => {
  const n = [
    {
      id: wl(),
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
        responseHeaders: [
          {
            header: "Content-Disposition",
            operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE
          }
        ]
      },
      condition: {
        tabIds: [e],
        urlFilter: "*",
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME]
      }
    }
  ];
  return t && n.push({
    id: wl(),
    priority: 1,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.BLOCK
    },
    condition: {
      tabIds: [e],
      urlFilter: "*",
      resourceTypes: [
        chrome.declarativeNetRequest.ResourceType.OBJECT,
        chrome.declarativeNetRequest.ResourceType.MEDIA,
        chrome.declarativeNetRequest.ResourceType.FONT,
        chrome.declarativeNetRequest.ResourceType.IMAGE
      ]
    }
  }), chrome.declarativeNetRequest.updateSessionRules({
    addRules: n
  });
}, c0 = async (e, t) => {
  const { tabId: n, scopedLogger: r } = e;
  let s = t;
  try {
    s = new URL(s).toString();
  } catch (o) {
    const i = await Pe(n);
    if (!i) {
      r.error(`Failed to navigate to removed tab: ${n}`);
      return;
    }
    const a = new URL(i.pendingUrl ?? i.url ?? "");
    s = new URL(t, a.origin).toString(), r.warn(`Trying to execute relative URL: ${t}, replaced with ${s}, ${o}`);
  }
  await chrome.tabs.update(n, {
    url: s
  });
}, hh = 100, u0 = 2 ** 31 - 1 - hh, l0 = Math.floor(Date.now() / 1e3);
let d0 = hh + l0 % u0;
const wl = () => d0++, f0 = (e) => e instanceof Error ? e.message.match(/Unexpected property: '([^']+)'/)?.[1] ?? null : null, mh = async (e, t) => {
  const r = (await chrome.debugger.getTargets()).find((o) => o.id === e);
  if (!r)
    throw new Error("Target not found for frame ID: " + e);
  const s = {
    targetId: r.id
  };
  try {
    await chrome.debugger.attach(s, "1.3");
  } catch (o) {
    o instanceof Error && o.message.includes("Another debugger is already attached") || t?.warn("Failed to attach debugger to iframe", {
      error: o instanceof Error ? o.message : o
    });
  }
  try {
    await U(s, "Accessibility.enable", void 0, "attachDebuggerIframe");
  } catch (o) {
    t?.warn("Failed to enable Accessibility or DOM for iframe", {
      error: o instanceof Error ? o.message : o
    });
  }
  return s;
};
async function ba(e, t, n, r, s) {
  return (await U(t, "Runtime.callFunctionOn", {
    objectId: n,
    functionDeclaration: `function (...args) {return (${r.toString()}).apply(this, [this, ...args]);}`,
    returnByValue: !0,
    awaitPromise: !0,
    arguments: s?.map((i) => ({ value: i })) ?? []
  }, e)).result?.value;
}
async function Xr(e, t, n, r) {
  const s = r ? r.map((i) => JSON.stringify(i)).join(", ") : "", o = await U(t, "Runtime.evaluate", {
    expression: `(${n.toString()})(${s})`,
    returnByValue: !0,
    awaitPromise: !0
  }, e);
  if (o.exceptionDetails)
    throw new Error(`Failed to evaluate function: ${JSON.stringify(o.exceptionDetails)}`);
  return o.result.value;
}
const gh = "ref_", wa = ":", Ea = (e) => {
  const t = e.replace(gh, "");
  if (t.includes(wa)) {
    const [r, s] = t.split(wa), o = Number(s);
    return {
      targetId: r,
      backendNodeId: o
    };
  }
  return {
    backendNodeId: Number(t)
  };
}, p0 = (e) => `[ref=${gh}${e.targetId ? e.targetId + wa : ""}${e.backendNodeId}]`, h0 = async (e) => {
  if (e && !(!chrome.perplexity || !("inlineAssistant" in chrome.perplexity) || !("getBubbleInfoForTab" in chrome.perplexity.inlineAssistant)))
    try {
      return await chrome.perplexity.inlineAssistant.getBubbleInfoForTab(e);
    } catch {
      return;
    }
}, wc = (e = 5e3) => (t) => function(...n) {
  const r = new zn(`Timed out after ${e}ms`), s = yt(e, r, !0), o = t.apply(this, n);
  return Promise.race([o, s]);
}, yt = (e, t, n = !1) => new Promise((r, s) => setTimeout(n ? s : r, e, t));
class zn extends Error {
  constructor(t) {
    super(t), this.name = "TimeoutError";
  }
}
let m0 = class extends Error {
  constructor(t) {
    super(t), this.name = "AssertionError";
  }
};
function Sa(e, t) {
  if (!e)
    throw new m0(t);
}
const bn = (e) => e.replace("chrome://", `${mo}://`), yh = (e) => e.replace(`${mo}://`, "chrome://");
let Fs;
const _h = async () => {
  if (Fs)
    return Fs;
  const { os: e } = await chrome.runtime.getPlatformInfo();
  return Fs = e, Fs;
}, bh = async (e, t) => ti ? U(e, "Input.pasteFromString", {
  text: t
}, "tryPasteFromString").then(() => !0).catch(() => !1) : !1, g0 = (e) => {
  if (!e)
    return e;
  try {
    return new URL(e), e;
  } catch {
    return `https://${e}`;
  }
}, bo = (e, t = {}) => {
  const n = {
    ...e,
    url: g0(e.url)
  };
  return Ue ? chrome.tabs.create({
    ...n,
    ...t
  }) : chrome.tabs.create(n);
}, ws = (e, t = {}) => Ue ? chrome.tabs.query({
  ...e,
  ...t
}) : chrome.tabs.query(e), it = (e) => (
  // ast-grep-ignore: no-chrome-tabs-get
  chrome.tabs.get(e)
), Pe = async (e) => {
  try {
    return await chrome.tabs.get(e);
  } catch (t) {
    if (t instanceof Error && t.message.includes("No tab with id"))
      return;
    throw t;
  }
}, Li = async (e, t) => {
  if (Ue)
    try {
      await chrome.tabs.update(e, t);
    } catch {
    }
}, Ot = async (e, t, n = {}) => {
  if (!Ue)
    return chrome.tabs.update(e, t);
  try {
    return await chrome.tabs.update(e, {
      ...t,
      ...n
    });
  } catch (r) {
    const s = f0(r);
    if (s && s in n) {
      const { [s]: o, ...i } = n;
      return Ot(e, t, i);
    }
    throw r;
  }
}, Zn = async (e, t) => {
  if (!Ue)
    return;
  const n = await Pe(e);
  if (!n)
    return;
  const r = n.payload ? JSON.parse(n.payload) : {}, s = JSON.stringify({
    ...r,
    ...t.opened !== void 0 && {
      wasSidecarOpened: t.opened === "opened"
    },
    ...t.autoOpened !== void 0 && { auto_opened: t.autoOpened }
  });
  await Ot(n.id, {}, {
    payload: s
  });
}, wo = async (e) => e.splitId ? (await chrome.tabs.query({
  windowId: e.windowId
})).filter((r) => r.id !== e.id && r.splitId === e.splitId)[0] : void 0, y0 = 5e3, _0 = [
  "injectEventsScript",
  "injectContentScript",
  "injectGoogleDocsScript"
];
async function be(e, t, n = y0, r = W) {
  const s = performance.now(), o = e.target.tabId;
  try {
    return await wc(n)(() => (
      // ast-grep-ignore: no-chrome-scripting-executeScript
      chrome.scripting.executeScript(e)
    ))();
  } catch (i) {
    const a = performance.now() - s;
    throw i instanceof zn && !_0.includes(t) && r.error("[executeScript] Script execution timed out", {
      reason: t,
      tabId: o,
      tab: await Pe(o).catch(() => {
      }),
      duration: `${a.toFixed(2)}ms`
    }), i;
  }
}
class b0 {
  constructor(t) {
    this.deps = t;
  }
  async onScreenshotCaptured(t, n, r) {
    const s = await this.getSidecarBroadcastingPorts();
    if (!s.length) return;
    const o = {
      type: "BROWSER_TASK_PROGRESS_SCREENSHOT",
      payload: {
        taskUuid: n,
        screenshot: t,
        entryId: this.deps.payload.entryId,
        tabId: r
      }
    };
    for (const i of s)
      try {
        i.postMessage(o);
      } catch (a) {
        this.deps.logger.error("[task/loop] Failed to send screenshot", a);
      }
  }
  async onTabAdded(t) {
    if (this.deps.payload.skip_sidecar) return;
    const n = await this.getSidecarBroadcastingPorts();
    if (!n.length) return;
    const r = {
      type: "MOVE_THREAD_TO_SIDECAR",
      payload: {
        entry_id: this.deps.payload.entryId,
        task_tab_ids: [t.id],
        url: "/search/" + this.deps.payload.thread_url_slug,
        reason: "agent-task-tab-added",
        thread_url_slug: this.deps.payload.thread_url_slug
      }
    };
    for (const s of n)
      s.postMessage(r);
    await Zn(t.id, { opened: "opened" }), t?.active && await chrome.perplexity.sidecar.open({
      windowId: this.deps.taskContextPayload.windowId,
      animate: !0,
      takeFocus: !0
      // if tab is active - we want to focus sidecar instead of omnibox url which is default focus
    });
  }
  async shouldCloseInitialSenderTab() {
    const t = await this.getSidecarPort();
    return t ? t.sender?.tab?.id !== this.deps.payload.mainPort?.sender?.tab?.id : !1;
  }
  async onTaskFailure(t) {
    const n = await this.getTargetPorts();
    if (!n.length) return;
    const r = {
      type: "AGENT_TASK_FAILURE",
      payload: {
        taskUuid: this.deps.payload.taskId,
        error: t,
        extraHeaders: this.deps.payload.extra_headers
      }
    };
    for (const s of n)
      s.postMessage(r);
  }
  async onTaskStop() {
    const t = await this.getTargetPorts();
    if (!t.length) return;
    const n = {
      type: "BROWSER_TASK_STOP",
      payload: {
        entryId: this.deps.payload.entryId,
        taskUuid: this.deps.payload.taskId
      }
    };
    for (const r of t)
      r.postMessage(n);
  }
  async onTaskComplete(t) {
    const n = await this.getTargetPorts();
    if (!n.length) return;
    const r = {
      type: "BROWSER_TASK_COMPLETE",
      payload: {
        taskUuid: this.deps.payload.taskId,
        result: { success: !0, message: t || "Task completed" }
      }
    };
    for (const s of n)
      s.postMessage(r);
  }
  async onActionStarted(t, n) {
    const r = await this.getTargetPorts(), s = {
      type: "ACTION_STARTED",
      payload: { taskUuid: this.deps.payload.taskId, uuid: t, action: n }
    };
    for (const o of r)
      try {
        o.postMessage(s);
      } catch (i) {
        this.deps.logger.error("[task/loop] Failed to send action to ui", i);
      }
  }
  async getTargetPorts() {
    return this.deps.payload.skip_sidecar ? this.deps.payload.mainPort ? [this.deps.payload.mainPort] : [] : this.getSidecarBroadcastingPorts();
  }
  async getSidecarBroadcastingPorts() {
    const t = await this.getSidecarPort();
    return t ? [t] : [];
  }
  async getSidecarPort() {
    const t = await this.tryGetSidecarTabId();
    if (!t) {
      this.deps.logger.warn("[task/external] No sidecar tab id found");
      return;
    }
    const n = Te.get(t);
    return n || this.deps.logger.warn("[task/external] No sidecar port found for tab id", t), n;
  }
  async tryGetSidecarTabId() {
    if (this.sidecarTabId) return this.sidecarTabId;
    const t = await chrome.windows.get(this.deps.taskContextPayload.windowId);
    if (t.sidecarTabId)
      return this.sidecarTabId = t.sidecarTabId, this.sidecarTabId;
  }
}
const wn = {}, w0 = async ({
  tabId: e,
  sidecarId: t,
  taskId: n = "",
  isPaused: r = !1,
  simpleMode: s = !1
}) => {
  if (await _c) {
    if (!(await chrome.perplexity.views.listWebOverlays(e)).length && wn[e] && delete wn[e], wn[e]) return;
    const c = `?params=${encodeURIComponent(JSON.stringify({
      sidecarId: t,
      isPaused: r,
      simpleMode: s,
      tabId: e,
      taskId: n
    }))}`, u = chrome.runtime.getURL("overlay.html" + c), d = await chrome.perplexity.views.createWebOverlay(e, {
      visible: !0,
      mode: chrome.perplexity.views.WebOverlayMode.FULLSCREEN
    });
    chrome.perplexity.views.loadUrlInWebOverlay(d, u), wn[e] = { id: d, enabled: !r };
    return;
  }
  await chrome.tabs.sendMessage(e, {
    type: "START_OVERLAY",
    payload: { sidecarTabId: t, isPaused: r, simpleMode: !0 }
  });
}, E0 = async (e) => {
  if (await _c) {
    (await chrome.perplexity.views.listWebOverlays(e)).forEach(({ id: t }) => {
      try {
        chrome.perplexity.views.disableWebOverlayForwardEventsToTab(t);
      } catch {
      }
      try {
        chrome.perplexity.views.setWebOverlayFocus(t, !1);
      } catch {
      }
      chrome.perplexity.views.destroyWebOverlay(t);
    }), delete wn[e];
    return;
  }
  await chrome.tabs.sendMessage(e, {
    type: "STOP_OVERLAY"
  });
}, S0 = (e) => {
  if (e.type !== "BUTTON_RECT_CHANGE") return !1;
  const t = e.payload, n = wn[e.payload.tabId];
  if (!n)
    return W.warn("Overlay state is not found", t), !0;
  if (n.buttonRect = t.rect, n.enabled) return !0;
  try {
    chrome.perplexity.views.enableWebOverlayForwardEventsToTab(n.id, !1, [t.rect]);
  } catch (r) {
    W.warn("Failed to enable overlay", { error: r, payload: t });
  }
  return !0;
}, T0 = (e) => {
  delete wn[e];
}, cn = "mission_control_status", wh = "perplexity.client_context_domains_blacklist";
class v0 {
  constructor() {
    this.isSearchEnabled = () => this.#e("perplexity.history_search_enabled", !0);
  }
  async getManagedBlockedDomains() {
    try {
      return (await chrome.storage.managed.get(
        "BlockedDomains"
        /* BlockedDomains */
      )).BlockedDomains ?? [];
    } catch {
      return [];
    }
  }
  async getManagedOrganizationUUID() {
    try {
      return (await chrome.storage.managed.get(
        "OrganizationUUID"
        /* OrganizationUUID */
      )).OrganizationUUID;
    } catch {
      return;
    }
  }
  async isUrlBlockedByAdmin(t) {
    const n = await this.getManagedBlockedDomains();
    if (n.length === 0)
      return !1;
    const r = El(t);
    return n.some((s) => r === s || r.endsWith(`.${s}`));
  }
  /**
   * Extension cannot scrape or manipulate internal pages
   */
  isInternalPage(t) {
    return !!(t.startsWith("chrome://") || t.startsWith(`${mo}://`) || t.startsWith("chrome-extension://") || t.startsWith(`${mo}-extension://`));
  }
  async isUrlBlocked(t) {
    if (this.isInternalPage(t))
      return !0;
    const n = [
      // Documents
      ".pdf",
      ".docx",
      ".xlsx",
      ".pptx",
      // Images
      ".png",
      ".jpg",
      ".jpeg",
      ".webp",
      ".svg",
      ".gif",
      ".bmp",
      ".ico",
      // Web/Markdown
      ".html",
      ".htm",
      ".md",
      ".markdown",
      // Media
      ".mp4",
      ".mov",
      ".avi",
      ".mp3",
      ".wav"
    ];
    if ((t.startsWith("file://") || t.startsWith("view-source:file://")) && !n.some((o) => t.endsWith(o)) || await this.isUrlBlockedByAdmin(t))
      return !0;
    if (!Ue)
      return !1;
    if (chrome.perplexity.blacklist) {
      const o = El(t);
      return chrome.perplexity.blacklist.isDomainInBlacklist(
        o,
        chrome.perplexity.blacklist.BlacklistSource.ALL
      );
    }
    const r = await chrome.settingsPrivate.getPref(
      wh
    );
    return Sa(
      r.type === chrome.settingsPrivate.PrefType.LIST,
      "client_context_domains_blacklist is not a list."
    ), r.value.some((o) => t.startsWith(o));
  }
  async getBackendUrl() {
    if (!Ue && !process.env.NEXT_PUBLIC_REST_ASYNC_SERVER_URL)
      throw new Error("NEXT_PUBLIC_REST_ASYNC_SERVER_URL is not set");
    return chrome.settingsPrivate.getPerplexityBackendUrl() || process.env.NEXT_PUBLIC_REST_ASYNC_SERVER_URL;
  }
  async getRestAsyncServerUrl() {
    const t = await this.getBackendUrl();
    return t.includes("localhost") ? "http://localhost:5056" : t;
  }
  async #e(t, n) {
    if (!Ue)
      return n;
    try {
      const r = await chrome.settingsPrivate.getPref(t);
      return Sa(
        r.type === chrome.settingsPrivate.PrefType.BOOLEAN,
        `${t} is not a boolean.`
      ), r.value;
    } catch {
      return n;
    }
  }
}
const _e = new v0(), El = (e) => {
  try {
    return new URL(e).hostname;
  } catch {
    return e;
  }
};
var Eh;
const Sh = async (e, t, n, r = !1) => {
  const s = await bo(
    {
      url: "about:blank",
      active: !1,
      windowId: n
    },
    {
      hidden: !0,
      historical: !1,
      payload: JSON.stringify({
        type: "agents",
        task_uuid: e
      })
    }
  );
  return chrome.tabs.update(s.id, { muted: !0 }).catch((o) => Ce({ error: o, logger: t })), await a0(s.id, r).catch(
    (o) => Ce({ error: o, logger: t })
  ), s;
}, zt = async (e) => {
  const t = e?.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT, n = t === -1 ? chrome.windows.WINDOW_ID_CURRENT : t, [r] = await ws({
    active: !0,
    windowId: n
  });
  if (!r)
    throw new Error("No active tab found in window");
  return r;
}, I0 = ["YW1hem9u", "LmNvbSxh", "bWF6b24u", "Y28udWss", "YW1hem9u"], k0 = ["LmRlLGFt", "YXpvbi5m", "cixhbWF6", "b24uaXQs", "YW1hem9u"], C0 = ["LmVzLGFt", "YXpvbi5j", "YSxhbWF6", "b24uY29t", "LmF1LGFt"], A0 = ["YXpvbi5j", "by5qcCxh", "bWF6b24u", "aW4sYW1h", "em9uLmNv"], R0 = ["bS5icixh", "bWF6b24u", "Y29tLm14", "LGFtYXpv", "bi5ubCxh"], x0 = ["bWF6b24u", "c2UsYW1h", "em9uLnBs", "LGFtYXpv", "bi5jb20u"], O0 = ["dHIsYW1h", "em9uLmFl", "LGFtYXpv", "bi5zYQ=="], Ta = atob(
  [...I0, ...k0, ...C0, ...A0, ...R0, ...x0, ...O0].join("")
).split(","), L0 = async (e) => {
  const t = await Pe(e), n = t?.pendingUrl ?? t?.url;
  if (!n) return !1;
  try {
    const s = new URL(n).hostname.toLowerCase();
    return Ta.some((o) => s.includes(o));
  } catch {
    return !1;
  }
}, N0 = async (e) => {
  const t = await it(e), n = t?.pendingUrl ?? t?.url ?? "";
  return n ? _e.isUrlBlocked(n) : !1;
}, M0 = [
  // amzn-ctxv-id
  atob("YW16bi1jdHh2LWlk"),
  // _bvstr
  atob("X2J2c3Ry")
];
async function P0() {
  try {
    let e = !1;
    for (const t of Ta) {
      const n = [`https://${t}`, `https://www.${t}`];
      for (const r of n)
        for (const s of M0)
          try {
            const o = await chrome.cookies.get({
              url: r,
              name: s
            });
            o && (await chrome.cookies.remove({
              url: r,
              name: s,
              storeId: o.storeId
            }), e = !0);
          } catch {
          }
    }
    if (e)
      try {
        const n = (await chrome.tabs.query({})).filter((r) => {
          if (!r.url) return !1;
          try {
            const s = new URL(r.url).hostname.toLowerCase();
            return Ta.some((o) => s?.includes(o));
          } catch {
            return !1;
          }
        });
        for (const r of n)
          if (r.id)
            try {
              await chrome.tabs.reload(r.id);
            } catch {
            }
      } catch {
      }
  } catch {
  }
}
Eh = Symbol.toStringTag;
class va {
  constructor() {
    this[Eh] = "[object Future]", this.then = (r, s) => this.promise.then(r, s), this.catch = (r) => this.promise.catch(r), this.finally = (r) => this.promise.finally(r);
    let t = () => {
    }, n = () => {
    };
    this.promise = new Promise((r, s) => {
      t = r, n = s;
    }), this.resolve = t, this.reject = n;
  }
}
const Ia = async (e) => {
  const r = (await chrome.tabs.query({ windowId: e })).filter(
    (f) => f && f.id && (f.url?.includes("/b/mission-control") || f.url?.includes("/b/assistants"))
  )[0], s = chrome.perplexity && "mission_control" in chrome.perplexity;
  if (r === void 0) {
    s && (chrome.perplexity.mission_control.hideBadge(e), chrome.perplexity.mission_control.setAgentWorking(e, !1));
    return;
  }
  const o = await chrome.storage.local.get(cn);
  if (!o[cn] || typeof o[cn].numThreadsActive != "number" || typeof o[cn].numThreadsBlocked != "number" || typeof o[cn].numThreadsForReview != "number")
    return;
  const { numThreadsActive: i, numThreadsBlocked: a, numThreadsForReview: c } = o[cn], u = i > 0, d = a > 0;
  let l;
  a > 0 ? l = `${a}` : c > 0 && (l = `${c}`), r.id && s && (chrome.perplexity.mission_control.setAgentWorking(r.windowId, u), chrome.perplexity.mission_control.setBadgeNeedsAttention(
    r.windowId,
    d
  ), l === void 0 ? chrome.perplexity.mission_control.hideBadge(r.windowId) : chrome.perplexity.mission_control.setBadgeText(r.windowId, l));
}, Sl = (e) => {
  if (!e.id)
    return;
  const t = {
    type: "ACTIVE_TAB_CHANGED",
    payload: {
      tabId: e.id,
      url: e.url ?? "",
      title: e.title ?? "",
      windowId: e.windowId
    }
  };
  Te.forEach((n) => n.postMessage(t));
}, Th = async (e) => {
  if (!e)
    return;
  const [t] = await chrome.tabs.query({
    active: !0,
    windowId: e
  });
  if (t?.id && t.url) {
    const n = {
      type: "VOICE_ASSISTANT_ASSOCIATED_WINDOW_CHANGED",
      payload: {
        windowId: e,
        activeTab: {
          tabId: t.id,
          url: t.url ?? "",
          title: t.title ?? ""
        }
      }
    };
    Te.forEach((r) => r.postMessage(n));
  }
}, D0 = async (e, t, n, r) => {
  const o = (e ? await chrome.windows.get(e) : void 0)?.sidecarTabId ?? t.sidecarTabId;
  if (!o)
    return r.error("[BROWSER_TASK_STOP] No sidecarTabId found to send stop message", { payload: t }), !1;
  const i = Te.get(o), a = {
    ...t,
    reason: n
  };
  return i ? (i?.postMessage({
    type: "BROWSER_TASK_STOP",
    payload: t
  }), r.info("[BROWSER_TASK_STOP] Browser task stop sent", a), !0) : (r.warn("[BROWSER_TASK_STOP] Sidecar port not found, cannot send stop message", a), !1);
};
class U0 {
  constructor(t) {
    this.deps = t;
  }
  async onTabAttach(t, n) {
    const r = await _c, s = !r && await L0(t), o = await N0(t);
    (!n || r) && !s && !o && await w0({
      tabId: t,
      sidecarId: -1,
      taskId: this.deps.taskId,
      isPaused: !1,
      simpleMode: !0
    }).catch((a) => {
      this.deps.logger.warn("[overlayManager#onTabAttach] Failed to start overlay", a, {
        tabId: t
      });
    }), await Li(t, {
      agent_is_working: !0
    });
  }
  async onTabDetach(t) {
    await E0(t).catch((n) => {
      this.deps.logger.warn("[overlayManager#onTabDetach] Failed to stop overlay", n, {
        tabId: t
      });
    }), await Li(t, {
      agent_is_working: !1
    }), await Li(t, {
      has_badge: !0
    });
  }
  async onAction(t, n) {
    const r = {
      type: "OVERLAY_TASK_STATUS_UPDATE",
      payload: {
        status: n,
        tabId: t
      }
    };
    await chrome.runtime.sendMessage(r);
  }
  async onClickAction(t, n, r) {
    const s = {
      type: "OVERLAY_CLICK_FEEDBACK",
      payload: {
        tabId: t,
        x: n,
        y: r
      }
    };
    await chrome.runtime.sendMessage(s);
  }
}
const vh = "Failed to execute action";
class Se extends Error {
  constructor(t, n) {
    super(t, n), this.name = "ToolError";
  }
}
const Tl = 45e3;
class F0 {
  constructor(t) {
    this.deps = t;
  }
  async dispatchRpcRequest({ request_id: t, method: n, request: r }) {
    const s = this.deps.logger.exception.bind(this.deps.logger);
    if (!t)
      throw s("[dispatch rpc] request_id field is required", r);
    if (!r)
      throw s("[dispatch rpc] request field is required", r);
    if (!n || !(n in this || n in this.deps.browserTools))
      throw s(`[dispatch rpc] unknown method: ${n}`, r);
    this.deps.logger.info("[dispatch rpc] request received", {
      method: n,
      request: r
    });
    const o = (h) => typeof h == "object" && h !== null && "tab_id" in h && typeof h.tab_id == "number", i = performance.now();
    let a, c = !1;
    const u = async (h = !1) => {
      try {
        const m = n, g = JSON.parse(r);
        if (o(g)) {
          a = g.tab_id;
          const y = await Pe(a);
          if (!y?.id) throw new Se("No tab with provided ID");
          await this.deps.agentTabsManager.maybeFocusTab(y).catch((b) => {
            this.deps.logger.warn("[agent/maybeFocusTab] Error while focusing", b);
          });
          const _ = y.pendingUrl ?? y.url ?? "", w = m === "Navigate";
          if (!w && _e.isInternalPage(_))
            throw new Se(
              "This tab is an internal page, you cannot see or manipulate with it. You must navigate to another url or stop the task"
            );
          if (!w && await _e.isUrlBlocked(_))
            throw new Se(
              "Url on this tab is restricted by user or system. You must navigate to another url or stop the task"
            );
        }
        return m === "CreateSubagent" ? await this.CreateSubagent(g) : await this.deps.browserTools[m](g);
      } catch (m) {
        try {
          const g = a && await Pe(a);
          if (!(g && !h && !c && !this.deps.abortController?.signal.aborted))
            return this.deps.browserTools.handleError(m, a);
          if (m instanceof Error && ["Debugger is not attached to the tab with id", "Detached while handling command"].some(
            (E) => m.message.includes(E)
          ))
            return this.deps.logger.warn("[dispatch rpc] Trying to retry after debugger error", m, {
              tabId: a,
              tab: g
            }), await Mn(a), u(!0);
          if (m instanceof zn && m.message.startsWith("Debugger command timed out:"))
            return this.deps.logger.warn("[dispatch rpc] Trying to retry after debugger timeout", m, {
              tabId: a,
              tab: g
            }), await chrome.tabs.reload(a), await Mn(a), u(!0);
        } catch (g) {
          this.deps.logger.warn("[dispatch rpc] Unsuccessful retry on action", g, {
            tabId: a
          });
        }
        return this.deps.browserTools.handleError(m, a);
      }
    };
    let d;
    try {
      d = await wc(Tl)(u)();
    } catch {
      c = !0, d = await this.deps.browserTools.handleError(
        new Se(`Request timed out after ${Tl / 1e3} seconds`),
        a
      );
    }
    const l = Math.round(performance.now() - i), f = JSON.stringify(d), p = {
      method: n,
      request: r,
      response: {
        message: "message" in d ? d.message : void 0,
        error: d.error,
        tab_context: d.tab_context
      },
      duration: l,
      size_mb: Number((f.length / (1024 * 1024)).toFixed(2))
    };
    if (!this.deps.abortController?.signal.aborted) {
      this.deps.logger.info("[dispatch rpc] request processed", p);
      const h = d.error ? c ? "timeout" : d.error.startsWith(vh) ? "tool_error" : "unexpected_tool_error" : "success";
      vn("agent.client_loop.action_duration_ms", {
        duration: l,
        method: n,
        result: h
      });
    }
    return { request_id: t, response: f };
  }
  async CreateSubagent(t) {
    if (!this.deps.initialPayload)
      throw new Error("Initial payload is not set");
    let n = {};
    try {
      n = JSON.parse(t.extra_headers ?? "{}");
    } catch {
      return {
        tab_context: void 0,
        error: "Invalid request parameters."
      };
    }
    try {
      await Dh(
        {
          query: t.prompt || "",
          taskId: t.task_uuid || "",
          start_url: t.start_url || "",
          source: "create_subagent_tool",
          extra_headers: n,
          mainPort: Te.get(this.deps.initialPayload.senderTabId ?? -1),
          entryId: this.deps.initialPayload.entryId,
          base_url: this.deps.initialPayload.base_url,
          senderTabId: this.deps.initialPayload.senderTabId,
          senderWindowId: this.deps.initialPayload.senderWindowId,
          is_subagent: !0
        },
        {
          windowId: this.deps.initialPayload.senderWindowId ?? chrome.windows.WINDOW_ID_CURRENT
        }
      );
    } catch (r) {
      return {
        tab_context: void 0,
        error: `Failed to start subagent: ${r instanceof Error ? r.message : String(r)}`
      };
    }
    return {
      tab_context: void 0
    };
  }
  async getTabContext(t, n) {
    return this.deps.browserTools.getTabContext(t, n);
  }
}
const Ni = "about:blank";
class $0 {
  constructor(t) {
    this.deps = t, this.tabRegistry = /* @__PURE__ */ new Set(), this.minTabsSizeToGroup = 2, this.initialTabContainsTabGroup = !1, this.unsubscribeFns = [], this.isHidden = !1, this.isInitialized = !1;
    const n = t.initialPayload?.query ?? "", r = n.split(" ").filter((s) => s.length > 0);
    this.groupTitle = r.length > 2 ? `${r.slice(0, 2).join(" ")}...` : n, (this.deps.initialPayload?.is_subagent || this.deps.initialPayload?.is_mission_control) && (this.isHidden = !0), this.windowId = this.deps.taskContextPayload?.windowId ?? chrome.windows.WINDOW_ID_CURRENT;
  }
  setupListeners() {
    this.unsubscribeFns.length && (this.unsubscribeFns.forEach((a) => a()), this.unsubscribeFns = []);
    const t = (a, c, u) => {
      if (!(!a.tabId || !this.tabRegistry.has(a.tabId)) && c === "Page.javascriptDialogOpening") {
        const d = u;
        this.deps.logger.info("[tabsManager] Dialog opened, accepting", {
          params: d,
          tabId: a.tabId
        }), U(
          a,
          "Page.handleJavaScriptDialog",
          {
            accept: !0
          },
          "handleDialog",
          1e3,
          this.deps.logger
        ).catch((l) => {
          this.deps.logger.error(
            "[tabsManager] Error while handling JS dialog",
            {
              params: d
            },
            l
          );
        });
      }
    }, n = this.handleTabUpdate.bind(this), r = this.handleTabRemove.bind(this), s = this.handleTabCreated.bind(this), o = this.handleTabGroupClose.bind(this), i = this.handleWindowRemoved.bind(this);
    chrome.tabs.onUpdated.addListener(n), chrome.tabs.onRemoved.addListener(r), chrome.tabs.onCreated.addListener(s), chrome.tabGroups.onRemoved.addListener(o), chrome.windows.onRemoved.addListener(i), chrome.debugger.onEvent.addListener(t), this.unsubscribeFns.push(
      () => chrome.tabs.onUpdated.removeListener(n),
      () => chrome.tabs.onRemoved.removeListener(r),
      () => chrome.tabs.onCreated.removeListener(s),
      () => chrome.tabGroups.onRemoved.removeListener(o),
      () => chrome.windows.onRemoved.removeListener(i),
      () => chrome.debugger.onEvent.removeListener(t)
    );
  }
  async getTaskTabs() {
    return (await Promise.all([...this.tabRegistry].map(Pe))).filter(
      (t) => t !== void 0
    );
  }
  async addTabToTask(t = Ni) {
    const n = await bo(
      {
        url: t,
        active: !1,
        windowId: this.windowId
      },
      {
        hidden: this.isHidden
      }
    );
    if (await this.addTabToState(n), this.tabRegistry.size === 1)
      try {
        await this.tryCloseInitialTab(n.id);
      } catch (r) {
        this.deps.logger.warn("[tabsManager] Error while closing initial tab", {
          error: r
        });
      }
    return n;
  }
  async init(t) {
    if (this.isInitialized) return;
    this.isInitialized = !0, this.setupListeners();
    const n = t ?? this.deps.initialPayload?.tab_id, r = this.deps.initialPayload?.mainPort?.sender?.tab;
    if (n && n > 0) {
      const s = await Pe(n);
      if (s?.id) {
        await this.addTabToState(s), s.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE && (this.tabGroupId = s.groupId, this.initialTabContainsTabGroup = !0);
        const o = await wo(s);
        o?.id && (this.minTabsSizeToGroup = 3, await this.addTabToState(o));
      }
    } else r?.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE && (this.tabGroupId = r?.groupId, this.initialTabContainsTabGroup = !0);
    if (this.tabGroupId !== void 0 && this.tabGroupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
      const s = await chrome.tabs.query({ groupId: this.tabGroupId });
      await Promise.all(
        s.map((o) => {
          if (!this.tabRegistry.has(o.id))
            return this.addTabToState(o);
        })
      );
    } else
      this.tabGroupId = void 0;
    this.tabRegistry.size === 0 && this.deps.initialPayload?.start_url && await this.addTabToTask(this.deps.initialPayload.start_url);
  }
  makeVisible() {
    this.isHidden = !1;
  }
  async destroy() {
    this.retryTabGroupsTimeout && clearTimeout(this.retryTabGroupsTimeout), this.unsubscribeFns.forEach((t) => t()), this.unsubscribeFns = [], await Promise.allSettled(
      [...this.tabRegistry].map(async (t) => {
        this.tabRegistry.delete(t), xi.delete(t), this.deps.overlayManager?.onTabDetach(t);
        try {
          await bl(t);
        } catch {
        }
        this.isHidden && this.deps.initialPayload?.is_subagent && chrome.tabs.remove(t);
      })
    );
  }
  async maybeFocusTab(t) {
    if (!t.id) return;
    const n = this.lastUsedTabId;
    if (this.lastUsedTabId = t.id, n !== t.id) {
      if (n) {
        if ((await Pe(n))?.active !== !0) return;
      } else {
        const [r] = await ws({
          windowId: t.windowId,
          active: !0
        });
        if (!r?.id || !this.tabRegistry.has(r?.id)) return;
      }
      t.hidden || await Ot(t.id, {
        active: !0
      });
    }
  }
  async addTabToState(t) {
    const n = t.id;
    if (n === this.deps.initialPayload?.mainPort?.sender?.tab?.id)
      return;
    if (xi.has(n)) {
      this.tabRegistry.has(n) ? this.deps.logger.warn(
        "[tabsManager] Trying to add tab while its already in context, ignoring",
        {
          tabId: n
        }
      ) : this.deps.logger.warn(
        "[tabsManager] Trying to add tab from another task into context, ignoring",
        {
          tabId: n
        }
      );
      return;
    }
    if (t.discarded || t.height === 0 && t.width === 0 && t.status === "complete") {
      const [i] = await Promise.all([
        bo(
          {
            windowId: t.windowId,
            url: t.pendingUrl ?? t.url ?? Ni,
            active: t.active,
            openerTabId: t.id,
            index: t.index,
            pinned: t.pinned
          },
          {
            hidden: this.isHidden
          }
        ),
        chrome.tabs.remove(n)
      ]);
      this.deps.logger.info("[tabsManager] Recreating the tab, because discarded or empty size", {
        oldTabId: t.id,
        newTabId: i.id,
        tab: t
      });
      return;
    }
    const s = t.pendingUrl ?? t.url ?? "", o = s === Ni;
    xi.add(n);
    try {
      await Mn(n);
    } catch (i) {
      _e.isInternalPage(s) || this.deps.logger.warn("[TabsManager#addTabToState] Error while attaching debugger", {
        error: i
      });
    }
    this.tabRegistry.add(n), this.deps.externalMessagesManager?.onTabAdded(t).finally(() => {
      this.deps.overlayManager?.onTabAttach(n, o);
    }), await this.tryGroupTabs();
  }
  handleTabUpdate(t, n, r) {
    if (!this.tabRegistry.has(t)) {
      this.tabGroupId && n.groupId === this.tabGroupId && (this.deps.logger.info("[tabsManager] External tab added to tab group", {
        tabId: t
      }), this.addTabToState(r));
      return;
    }
    n.status === "complete" && this.deps.overlayManager?.onTabAttach(t), n.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE && (this.deps.logger.info("[tabsManager] Tab removed from tab group", {
      tabId: t
    }), this.tabRegistry.delete(t), bl(t), this.deps.overlayManager?.onTabDetach(t));
  }
  handleTabRemove(t, n) {
    this.tabRegistry.has(t) && (this.tabRegistry.delete(t), this.deps.logger.info("[tabsManager] Tab closed", {
      tabId: t
    }), this.tabRegistry.size === 0 && (this.deps.logger.warn("[tabsManager] Last agent tab was closed"), this.deps.abortController?.abort("AGENT_TAB_CLOSED")));
  }
  async handleTabCreated(t) {
    !t.id || this.tabRegistry.has(t.id) || !(t.openerTabId && this.tabRegistry.has(t.openerTabId)) || t.pendingUrl === "chrome://newtab/" || t.url === "chrome://newtab/" || (t.windowId !== this.windowId && await chrome.tabs.move(t.id, {
      windowId: this.windowId,
      index: ((await Pe(t.openerTabId))?.index ?? 0) + 1
    }), this.isHidden && await Ot(t.id, { active: !1 }, { hidden: !0 }), await this.addTabToState(t), this.deps.logger.info("[tabsManager] New tab added because of opener", {
      openerId: t.openerTabId,
      tabId: t.id
    }));
  }
  async handleTabGroupClose(t) {
    t.id === this.tabGroupId && (this.tabGroupId = void 0, this.deps.logger.warn("[tabsManager] Tab group with agent tabs was closed"), this.deps.abortController?.abort("TAB_GROUP_CLOSED"));
  }
  handleWindowRemoved(t) {
    t === this.windowId && (this.deps.logger.warn("[tabsManager] Window with agent tabs was closed"), this.deps.abortController?.abort("WINDOW_CLOSED"));
  }
  async tryGroupTabs() {
    if (!(this.tabRegistry.size < this.minTabsSizeToGroup))
      try {
        this.tabGroupId === void 0 ? (this.tabGroupId = await chrome.tabs.group({
          tabIds: [...this.tabRegistry],
          groupId: this.tabGroupId,
          createProperties: {
            windowId: this.windowId
          }
        }), await chrome.tabGroups.update(this.tabGroupId, {
          collapsed: !1,
          color: dA(),
          title: this.groupTitle
        })) : this.tabGroupId = await chrome.tabs.group({
          tabIds: [...this.tabRegistry],
          groupId: this.tabGroupId
        });
      } catch (t) {
        if (t instanceof Error && t.message.includes("Tabs cannot be edited right now (user may be dragging a tab)")) {
          this.retryTabGroupsTimeout || (this.retryTabGroupsTimeout = setTimeout(() => {
            this.deps.logger.warn("[tabsManager] Cannot group because of DnD inprogress, retrying"), this.tryGroupTabs(), this.retryTabGroupsTimeout = void 0;
          }, 250));
          return;
        }
        throw t;
      }
  }
  async tryCloseInitialTab(t) {
    this.initialTabContainsTabGroup || this.deps.initialPayload?.is_mission_control || this.deps.initialPayload?.is_subagent || !this.deps.initialPayload?.mainPort?.sender?.tab?.id || !await this.deps.externalMessagesManager?.shouldCloseInitialSenderTab() || (await chrome.tabs.remove(this.deps.initialPayload.mainPort.sender.tab.id), await chrome.tabs.update(t, {
      active: !0
    }));
  }
}
const vl = 15e3, B0 = 2e4;
class V0 {
  constructor(t, n) {
    this.baseUrl = t, this.agentSocketMetrics = n, this.reconnectPromise = null, this.isClosed = !1, this.tasksMap = /* @__PURE__ */ new Map(), this.logger = W, this.handleRpcMessage = async (r) => {
      const s = JSON.parse(r.data);
      await Promise.allSettled(
        [...this.tasksMap.values()].map((o) => o.onMessage(s))
      );
    };
  }
  async connect() {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      if (this.socket?.readyState === WebSocket.CLOSED || this.socket?.readyState === WebSocket.CLOSING)
        throw new Error("Socket already closed");
      return this.reconnectPromise ? this.reconnectPromise : (this.reconnectPromise = go(async () => {
        if (this.socket?.readyState === WebSocket.OPEN)
          throw new Error("Socket already connected");
        const t = this.getSocketUrl();
        this.logger.info(`[socket] Connecting to ${t}`), await this.setupSocketConnection(t), this.logger.info(`[socket] Connected to ${t}`), this.tryCloseSocket(!0);
      })().finally(() => {
        this.reconnectPromise = null;
      }), this.reconnectPromise);
    }
  }
  getSocketUrl() {
    return this.baseUrl + "/agent";
  }
  async setupSocketConnection(t, n = Date.now()) {
    if (Date.now() - n >= vl) {
      const r = "timeout";
      throw await Promise.allSettled(
        [...this.tasksMap.values()].map((s) => s.onClose(r))
      ), new Error(`WebSocket connection failed after ${vl}ms`);
    }
    this.socket = new WebSocket(t);
    try {
      await new Promise((r, s) => {
        this.socket.onclose = (o) => {
          const i = o.reason || "empty reason";
          Promise.allSettled(
            [...this.tasksMap.values()].map((a) => a.onClose(i))
          ), s(new Error(`[${o.code}]: ${i}`));
        }, this.socket.onopen = () => {
          this.setupKeepAlive(), r();
        };
      });
    } catch (r) {
      return this.isClosed ? void 0 : (this.logger.warn("[socket] Websocket connection failed, retrying", r), await new Promise((s) => setTimeout(s, 100)), this.setupSocketConnection(t, n));
    }
    this.socket.onclose = (r) => {
      const s = r.reason || "empty reason";
      this.logger.info(`[socket] WebSocket closed. [${r.code}] ${s}`), Promise.allSettled(
        [...this.tasksMap.values()].map((o) => o.onClose(s))
      );
    }, this.socket.onmessage = go(this.handleRpcMessage);
  }
  setupKeepAlive() {
    const t = { keep_alive: {} }, n = setInterval(() => this.send({ message: t }), B0);
    this.socket.addEventListener("close", () => clearInterval(n));
  }
  send({ message: t, abortSignal: n, onSend: r }) {
    const s = JSON.stringify(t);
    this.connect().then(() => {
      if (n?.aborted || this.isClosed) {
        r?.({ aborted: !0 });
        return;
      }
      this.socket.send(s), r?.({ aborted: !1 });
    });
  }
  async recordSpan({
    name: t,
    traceHeaders: n,
    wrappedFn: r,
    extraTags: s = {}
  }) {
    const o = crypto.randomUUID(), i = chrome.runtime.getManifest().version;
    this.send({
      message: {
        start_span: {
          trace_headers: n,
          resource_name: "extension." + t,
          uuid: o,
          tags_json: JSON.stringify({
            agent_version: i,
            ...s
          })
        }
      }
    });
    try {
      return await r();
    } finally {
      this.send({
        message: {
          stop_span: { uuid: o }
        }
      });
    }
  }
  registerTask({ taskId: t, onMessage: n, onClose: r }) {
    this.tasksMap.set(t, { onMessage: n, onClose: r }), this.agentSocketMetrics.onTaskStart(t, { enableReconnect: !1 });
  }
  unregisterTask({ taskId: t }) {
    this.agentSocketMetrics.onTaskEnd(t), this.tasksMap.delete(t), this.tryCloseSocket();
  }
  tryCloseSocket(t = !1) {
    this.tasksMap.size || (this.isClosed = !0, this.socket?.close(1e3, t ? "Task canceled before connection" : "No more tasks"), this.socket = void 0, this.agentSocketMetrics.destroy());
  }
}
const W0 = 5e3, H0 = [
  { value: 36e5, metric: "activity_gap_60min" },
  { value: 12e5, metric: "activity_gap_20min" },
  { value: 6e5, metric: "activity_gap_10min" },
  { value: 3e5, metric: "activity_gap_5min" },
  { value: 6e4, metric: "activity_gap_1min" },
  { value: 2e4, metric: "activity_gap_20s" },
  { value: 15e3, metric: "activity_gap_15s" },
  { value: 1e4, metric: "activity_gap_10s" }
];
class G0 {
  constructor(t, n) {
    this.reportMetric = t, this.logger = n, this.pendingTasks = /* @__PURE__ */ new Map(), this.pendingRequests = /* @__PURE__ */ new Map(), this.metricPrefix = "agent_engine.extension.", this.taskScopedLoggers = /* @__PURE__ */ new Map(), this.watchPendingTasks();
  }
  getMetricName(t) {
    return this.metricPrefix + t;
  }
  watchPendingTasks() {
    this.watchInterval = setInterval(() => {
      const t = performance.now();
      for (const [n, r] of this.pendingTasks) {
        if (r.isPaused) continue;
        const s = t - r.latestActivity.time;
        for (const { value: o, metric: i } of H0)
          if (s > o) {
            this.checkAndReportThreshold(r, n, s, o, i);
            break;
          }
      }
    }, W0);
  }
  checkAndReportThreshold(t, n, r, s, o) {
    r > s && !t.reportedThresholds.has(s) && (t.reportedThresholds.add(s), this.reportMetric(this.getMetricName(o), {
      task_id: n,
      agent_engine: t.useAgentEngine,
      enable_reconnect: t.enableReconnect
    }));
  }
  onRpcRequestReceived(t, n, r = {}) {
    const s = performance.now(), o = this.pendingTasks.get(n);
    if (!o) {
      this.logger.warn(`[AgentSocketMetrics] Skip RPC request for unknown task: ${n}`);
      return;
    }
    if (typeof r.useAgentEngine == "boolean" && (o.useAgentEngine = r.useAgentEngine), o.firstRpcRequestTime === null) {
      const i = s - o.startTime;
      this.reportMetric(this.getMetricName("first_rpc_request"), {
        task_id: n,
        duration: i,
        agent_engine: o.useAgentEngine,
        enable_reconnect: o.enableReconnect
      }), o.firstRpcRequestTime = s;
    }
    o.pendingRequestIds.add(t), this.pendingRequests.set(t, { startTime: s, taskId: n }), o.latestActivity.time = s, o.reportedThresholds.clear();
  }
  onRpcResponseSent(t) {
    const n = performance.now(), r = this.pendingRequests.get(t);
    if (!r) {
      this.logger.warn(`[AgentSocketMetrics] Skip RPC response for unknown request: ${t}`);
      return;
    }
    const s = this.pendingTasks.get(r.taskId);
    if (!s) {
      this.logger.warn(
        `[AgentSocketMetrics] Skip RPC response for unknown task: ${r.taskId}`
      );
      return;
    }
    const o = n - r.startTime;
    this.reportMetric(this.getMetricName("request_latency"), {
      task_id: r.taskId,
      request_id: t,
      duration: o,
      agent_engine: s.useAgentEngine,
      enable_reconnect: s.enableReconnect
    }), s.latestActivity.time = n, s.reportedThresholds.clear(), s.pendingRequestIds.delete(t), this.pendingRequests.delete(t);
  }
  onTaskStart(t, { enableReconnect: n }) {
    if (this.pendingTasks.has(t)) return;
    const s = performance.now();
    this.pendingTasks.set(t, {
      startTime: s,
      pendingRequestIds: /* @__PURE__ */ new Set(),
      latestActivity: { time: s },
      isPaused: !1,
      reportedThresholds: /* @__PURE__ */ new Set(),
      useAgentEngine: void 0,
      enableReconnect: n,
      firstRpcRequestTime: null
    }), this.reportMetric(this.getMetricName("agent_start"), {
      task_id: t,
      enable_reconnect: n
    });
  }
  onTaskEnd(t) {
    const n = performance.now(), r = this.pendingTasks.get(t);
    if (!r) {
      this.logger.warn(`[AgentSocketMetrics] Skip agent end for unknown task: ${t}`);
      return;
    }
    this.pendingTasks.delete(t);
    const s = n - r.startTime;
    this.reportMetric(this.getMetricName("agent_end"), {
      task_id: t,
      duration: s,
      agent_engine: r.useAgentEngine,
      enable_reconnect: r.enableReconnect
    });
    const o = this.taskScopedLoggers.get(t);
    this.taskScopedLoggers.delete(t);
    const i = Array.from(r.pendingRequestIds);
    for (const a of i) {
      const c = this.pendingRequests.get(a);
      if (c) {
        this.pendingRequests.delete(a);
        const u = n - c.startTime;
        o && o.info(
          `[AgentSocketMetrics] Unfinished request ${a} running for ${u}ms (agent_engine: ${r.useAgentEngine})`
        );
      }
    }
  }
  onTaskPause(t) {
    const n = performance.now(), r = this.pendingTasks.get(t);
    if (!r) {
      this.logger.warn(`[AgentSocketMetrics] Skip task pause for unknown task: ${t}`);
      return;
    }
    r.isPaused = !0, r.latestActivity.time = n, this.reportMetric(this.getMetricName("task_paused"), {
      task_id: t,
      agent_engine: r.useAgentEngine,
      enable_reconnect: r.enableReconnect
    });
    const s = this.taskScopedLoggers.get(t);
    s && s.info(
      `[AgentSocketMetrics] Task paused with ${r.pendingRequestIds.size} pending requests.`
    );
  }
  onTaskResume(t) {
    const n = performance.now(), r = this.pendingTasks.get(t);
    if (!r) {
      this.logger.warn(`[AgentSocketMetrics] Skip task resume for unknown task: ${t}`);
      return;
    }
    r.isPaused = !1, r.latestActivity.time = n, r.reportedThresholds.clear(), this.reportMetric(this.getMetricName("task_resumed"), {
      task_id: t,
      agent_engine: r.useAgentEngine,
      enable_reconnect: r.enableReconnect
    });
    const s = this.taskScopedLoggers.get(t);
    s && s.info(
      `[AgentSocketMetrics] Task resumed with ${r.pendingRequestIds.size} pending requests.`
    );
  }
  destroy() {
    this.watchInterval && (clearInterval(this.watchInterval), this.watchInterval = void 0);
  }
  setTaskLogger(t, n) {
    this.taskScopedLoggers.set(t, n);
  }
}
const z0 = { keep_alive: {} }, K0 = (e) => new Promise((t) => setTimeout(t, e));
class j0 {
  constructor(t) {
    this.socket = null, this.keepAliveIntervalId = null, this.logPrefix = "ReconnectingAgentSocket", this.connectPromise = null, this.sharedLogger = t.sharedLogger, this.pendingTasks = /* @__PURE__ */ new Map(), this.socketUrl = `${t.baseUrl}${t.endpoint}`, this.keepAliveInterval = t.keepAliveInterval, this.maxReconnectRetries = t.maxReconnectRetries, this.agentSocketMetrics = t.agentSocketMetrics, this.retryAttempt = 0, this.generateUuid = t.generateUuid, this.log("debug", "Initialized");
  }
  /**
   * Connect to the WebSocket with automatic retry and exponential backoff.
   * - If already connected, this is a no-op.
   * - If already connecting, returns the existing connection promise.
   * - If not connected the socket will attempt to connect
   * - After successfully connecting, automatic reconnect is enabled if the
   *   socket closes while there are pending tasks.
   * - If there are no pending tasks when the socket closes, it will not
   *   attempt to reconnect.
   */
  async connect({ reconnect: t }) {
    if (this.getSocketState() !== WebSocket.OPEN) {
      if (this.connectPromise)
        return this.connectPromise;
      this.connectPromise = new va();
      try {
        this.log(
          "info",
          t ? `Reconnecting to ${this.socketUrl}` : `Connecting to ${this.socketUrl}`
        ), await this.establishConnection(), this.log(
          "info",
          t ? `Reconnected to ${this.socketUrl}` : `Connected to ${this.socketUrl}`
        ), t && (await this.sendTaskReconnectMessages(), this.onReconnectSuccess()), this.connectPromise.resolve();
      } catch (n) {
        this.notifyPendingTasksOfConnectionFailure(n), this.connectPromise.reject(n);
      } finally {
        this.connectPromise = null;
      }
    }
  }
  /**
   * When reconnecting, send a reconnect message for each pending task
   * so the backend can re-associate the task with this socket
   */
  async sendTaskReconnectMessages() {
    if (!this.socket) {
      this.log("warn", "Cannot send reconnect messages: socket is null");
      return;
    }
    for (const t of this.pendingTasks.values()) {
      let n = {};
      if (t.getReconnectData)
        try {
          n = await t.getReconnectData();
        } catch (s) {
          this.log("warn", "Failed to get reconnect data", {
            error: s,
            task_id: t.taskId
          });
        }
      const r = {
        reconnect_agent: {
          task_uuid: t.taskId,
          extra_headers: t.extraHeaders,
          ...n
        }
      };
      this.socket.send(JSON.stringify(r));
    }
  }
  /**
   * If we can't reconnect after the max attempts, notify all tasks of
   * the failure so they can handle it appropriately
   * @param error
   */
  notifyPendingTasksOfConnectionFailure(t) {
    for (const n of this.pendingTasks.values())
      n.onClose(t instanceof Error ? t.message : "Unknown error");
  }
  /**
   * Recursively attempt to establish a WebSocket connection with
   * exponential backoff until successful or max retries reached.
   * Each attempt creates a new WebSocket instance.
   * On successful connection, sets up event handlers and starts
   * the keep-alive ping interval.
   * If the connection fails, waits for a backoff period and retries.
   * If max retries are reached, throws an error.
   */
  async establishConnection() {
    if (this.retryAttempt > this.maxReconnectRetries) {
      const n = `Max reconnect attempts reached (${this.retryAttempt})`;
      throw this.log("warn", n), this.onMaxRetriesExceeded(), new Error(n);
    }
    const t = new va();
    this.socket = new WebSocket(this.socketUrl), this.socket.onopen = () => t.resolve(), this.socket.onclose = () => t.reject(new Error("Socket closed before connection was established"));
    try {
      await t, this.socket.onclose = (n) => this.onSocketClose(n), this.socket.onmessage = (n) => this.onReceiveMessage(n), this.startKeepAlive(), this.retryAttempt = 0;
    } catch (n) {
      this.retryAttempt++;
      const r = this.getReconnectBackoffTime(this.retryAttempt);
      return this.log("warn", `Connection failed, retrying in ${r}ms`, {
        error: n
      }), this.onBeforeReconnect({
        attempt: this.retryAttempt,
        backoffMs: r
      }), await K0(r), this.establishConnection();
    }
  }
  /**
   * Socket close handler added after an initial successful connection.
   * If there are pending tasks, attempt to reconnect.
   * If there are no pending tasks, do not reconnect and clean up the socket.
   */
  onSocketClose(t) {
    this.stopKeepAlive(), this.pendingTasks.size ? (this.log(
      "info",
      `Socket closed with ${this.pendingTasks.size} task${this.pendingTasks.size === 1 ? "" : "s"} pending, attempting to reconnect…`,
      { reason: t.reason, code: t.code }
    ), this.connect({ reconnect: !0 })) : (this.socket = null, this.log("info", "Socket closed with no pending tasks, not reconnecting.", {
      reason: t.reason,
      code: t.code
    }));
  }
  /**
   * Calculate exponential backoff time in milliseconds based on the
   * number of retry attempts, capped at 30 seconds.
   */
  getReconnectBackoffTime(t) {
    return Math.min(100 * 2 ** t, 3e4);
  }
  /**
   * Get the current WebSocket readyState, or null if no socket exists.
   */
  getSocketState() {
    return this.socket ? this.socket.readyState : null;
  }
  /**
   * Event handler for incoming WebSocket messages.
   * Parses the message and broadcasts it to all registered tasks.
   * Catches and logs any errors during message handling.
   */
  async onReceiveMessage(t) {
    try {
      const n = JSON.parse(t.data), r = [...this.pendingTasks.values()].map((s) => s.onMessage(n));
      await Promise.allSettled(r);
    } catch (n) {
      this.log("error", "Error handling incoming message", n);
    }
  }
  /**
   * Start the keep-alive ping interval to send periodic
   * keep-alive messages to maintain the WebSocket connection.
   */
  startKeepAlive() {
    this.stopKeepAlive(), this.keepAliveIntervalId = setInterval(
      () => this.send({ message: z0 }),
      this.keepAliveInterval
    );
  }
  /**
   * Stop the keep-alive ping interval if it is running.
   */
  stopKeepAlive() {
    this.keepAliveIntervalId && (clearInterval(this.keepAliveIntervalId), this.keepAliveIntervalId = null);
  }
  /**
   * Wait for any ongoing connection attempt and then close
   * the socket if there are no pending tasks… No tasks will
   * prevent automatic reconnect attempts.
   *
   * This method handles the race condition where:
   * 1. Socket closes → reconnect starts
   * 2. Task gets unregistered during reconnection
   * 3. We want to avoid closing a socket that is still CONNECTING
   */
  async closeConnectionIfAllTasksComplete() {
    if (this.connectPromise)
      try {
        await this.connectPromise;
      } catch (r) {
        this.log("warn", "Connection failed during task cleanup, nothing to close", {
          error: r instanceof Error ? r.message : "Unknown error",
          socketState: this.getSocketState()
        });
        return;
      }
    const t = this.pendingTasks.size > 0, n = this.getSocketState();
    !t && this.socket?.readyState === WebSocket.OPEN ? (this.stopKeepAlive(), this.log("info", "Closing socket - no pending tasks remain"), this.socket.close()) : !t && this.socket && n !== WebSocket.OPEN && this.log("info", "Skipping socket close - socket not in OPEN state", {
      socketState: n
    });
  }
  /** Logging util */
  log(t, n, r = {}) {
    this.sharedLogger[t](`[${this.logPrefix}] ${n}`, r);
  }
  /**
   * Synchronous wrapper to send a message via the WebSocket.
   * Ensure the socket is connected before send
   * If the socket cannot connect and it throws, capture and
   * log the error but do not throw
   */
  send({ message: t, abortSignal: n, onSend: r }) {
    this.connect({ reconnect: !1 }).then(() => {
      if (n?.aborted)
        r?.({ aborted: !0 });
      else if (this.socket) {
        const s = JSON.stringify(t);
        this.socket.send(s), r?.({ aborted: !1 });
      } else
        this.log("warn", "Attempted to send message but socket is null"), r?.({ aborted: !0 });
    }).catch((s) => {
      this.log("error", "Failed to send message", s);
    });
  }
  /**
   * Add a task to be managed by this socket.
   */
  registerTask({
    taskId: t,
    onMessage: n,
    onClose: r,
    extraHeaders: s,
    getReconnectData: o
  }) {
    this.pendingTasks.set(t, {
      taskId: t,
      onMessage: n,
      onClose: r,
      extraHeaders: s,
      getReconnectData: o
    }), this.agentSocketMetrics.onTaskStart(t, { enableReconnect: !0 }), this.log("debug", `Registering task ${t}`);
  }
  /**
   * Dissociate a task from this socket and check if
   * we should close the connection if there are none
   */
  unregisterTask({ taskId: t }) {
    this.pendingTasks.delete(t), this.agentSocketMetrics.onTaskEnd(t), this.log("debug", `Unregistering task ${t}`), this.closeConnectionIfAllTasksComplete();
  }
  /**
   * Wrapper around send to capture timings of async
   * operations (wrappedFn) for performance monitoring
   */
  async recordSpan({
    name: t,
    traceHeaders: n,
    wrappedFn: r,
    extraTags: s = {}
  }) {
    const o = this.generateUuid(), i = chrome.runtime.getManifest().version;
    this.send({
      message: {
        start_span: {
          trace_headers: n,
          resource_name: "extension." + t,
          uuid: o,
          tags_json: JSON.stringify({
            agent_version: i,
            ...s
          })
        }
      }
    });
    try {
      return await r();
    } finally {
      this.send({
        message: {
          stop_span: { uuid: o }
        }
      });
    }
  }
  /**
   * Lifecycle hooks for testing/monitoring.
   * Override these in subclasses to observe connection events.
   */
  onBeforeReconnect(t) {
  }
  onReconnectSuccess() {
  }
  onMaxRetriesExceeded() {
  }
}
const Il = /* @__PURE__ */ new Set(["hidden", "scroll", "auto", "clip", "overlay"]), q0 = (e) => {
  if (!e || e.length < 4)
    return;
  const [t, n, r, s] = e;
  if (![t, n, r, s].some((o) => !Number.isFinite(o)) && !(r <= 0 || s <= 0))
    return [t, n, r, s];
}, X0 = (e, t) => {
  const n = Math.max(e[0], t[0]), r = Math.max(e[1], t[1]), s = Math.min(e[0] + e[2], t[0] + t[2]), o = Math.min(e[1] + e[3], t[1] + t[3]), i = s - n, a = o - r;
  return i <= 0 || a <= 0 ? null : [n, r, i, a];
}, Y0 = (e, t, n, r) => {
  let s = e[0], o = e[1], i = e[0] + e[2], a = e[1] + e[3];
  n && (s = Math.max(s, t[0]), i = Math.min(i, t[0] + t[2])), r && (o = Math.max(o, t[1]), a = Math.min(a, t[1] + t[3]));
  const c = i - s, u = a - o;
  return c <= 0 || u <= 0 ? null : [s, o, c, u];
}, J0 = ({ firstDoc: e, getStyle: t }) => {
  const n = /* @__PURE__ */ new Map();
  if (!e)
    return n;
  const { nodes: r, layout: s, scrollOffsetX: o, scrollOffsetY: i } = e, a = /* @__PURE__ */ new Map(), c = o ?? 0, u = i ?? 0, d = s.bounds?.[0]?.[2] ?? 1920, l = s.bounds?.[0]?.[3] ?? 1080, f = [c, u, d, l], p = /* @__PURE__ */ new Map();
  s.nodeIndex.forEach((_, w) => {
    p.set(_, w);
  });
  const h = (_) => q0(s.bounds?.[_]), m = (_) => typeof _ == "number" && _ >= 0, g = (_) => {
    if (a.has(_))
      return a.get(_) ?? null;
    const w = r.parentIndex?.[_];
    if (!m(w))
      return a.set(_, f), f;
    const E = g(w);
    if (!E)
      return a.set(_, null), null;
    let S = E;
    const b = p.get(w);
    if (b !== void 0) {
      const T = t(e, b, "overflow-x"), D = t(e, b, "overflow-y"), k = Il.has(T), I = Il.has(D);
      if (k || I) {
        const A = h(b);
        A && (S = Y0(S, A, k, I));
      }
    }
    return a.set(_, S), S;
  };
  s.nodeIndex.forEach((_, w) => {
    const E = r.backendNodeId?.[_];
    if (E === void 0)
      return;
    const S = h(w), b = g(_);
    if (S && b) {
      const T = X0(S, b) !== null;
      n.set(E, T);
    }
  });
  const y = (_) => {
    const w = r.backendNodeId?.[_];
    if (w === void 0)
      return;
    if (n.has(w))
      return n.get(w);
    const E = r.parentIndex?.[_];
    if (!m(E))
      return;
    const S = y(E);
    return S !== void 0 && n.set(w, S), S;
  };
  return r.backendNodeId?.forEach((_, w) => {
    y(w);
  }), n;
}, $s = {
  ELEMENT_NODE: 1,
  TEXT_NODE: 3,
  DOCUMENT_FRAGMENT_NODE: 11
}, Q0 = (e, t, n, r, s, o, i, a, c, u) => {
  const d = t.nodes.nodeType?.[e];
  if (!(d === $s.ELEMENT_NODE || d === $s.TEXT_NODE || d === $s.DOCUMENT_FRAGMENT_NODE))
    return;
  const l = t.nodes.nodeName?.[e], f = t.nodes.nodeValue?.[e], p = t.nodes.backendNodeId?.[e], h = t.nodes.parentIndex?.[e], m = t.nodes.attributes?.[e];
  let g = n.get(e) ?? -1;
  if (d === $s.TEXT_NODE && g === -1 && (g = t.textBoxes.layoutIndex[e], g === void 0))
    return;
  const y = a.has(e), _ = c.has(e), w = u.has(e), E = r.get(e), S = s.get(e), b = o.get(e), T = i.get(e);
  return {
    attributes: m,
    nodeType: d,
    nodeName: l,
    nodeValue: f,
    backendNodeId: p,
    parentIndex: h,
    optionSelected: y,
    isClickable: _,
    inputChecked: w,
    shadowRootType: T,
    inputValue: S,
    textValue: E,
    contentDocumentIndex: b,
    layoutIndex: g
  };
}, Ih = (e) => {
  const t = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map();
  e.nodes.textValue?.index.forEach((l, f) => {
    r.set(l, e.nodes.textValue.value[f]);
  });
  const s = /* @__PURE__ */ new Map();
  e.nodes.inputValue?.index.forEach((l, f) => {
    s.set(l, e.nodes.inputValue.value[f]);
  });
  const o = /* @__PURE__ */ new Map();
  e.nodes.contentDocumentIndex?.index.forEach((l, f) => {
    o.set(l, e.nodes.contentDocumentIndex.value[f]);
  });
  const i = /* @__PURE__ */ new Map();
  e.nodes.shadowRootType?.index.forEach((l, f) => {
    i.set(l, e.nodes.shadowRootType.value[f]);
  });
  const a = new Set(e.nodes.optionSelected?.index), c = new Set(e.nodes.isClickable?.index), u = new Set(e.nodes.inputChecked?.index), d = /* @__PURE__ */ new Map();
  return e.layout.nodeIndex.forEach((l, f) => {
    d.set(l, f);
  }), e.nodes.parentIndex?.forEach((l, f) => {
    const p = Q0(f, e, d, r, s, o, i, a, c, u);
    if (!p || (t.set(f, p), l < 0))
      return;
    const h = n.get(l) ?? [];
    h.push(f), n.set(l, h);
  }), { nodeMap: t, childrenMap: n };
}, Ec = (e, t) => {
  const n = /* @__PURE__ */ new Map(), r = t?.attributes ?? [];
  for (let s = 0; s < r.length; s += 2) {
    const o = r[s], i = r[s + 1], a = e.strings[o]?.toLowerCase() ?? "", c = e.strings[i] ?? "";
    n.set(a, c);
  }
  return n;
}, kh = (e) => {
  const t = {
    includeDOMRects: !1,
    computedStyles: ["cursor"]
  };
  return e.filter === "VIEWPORT" ? {
    includeDOMRects: !1,
    // Keep 'cursor' first to preserve existing style indexing.
    // Include overflow styles for clipping computation.
    computedStyles: ["cursor", "overflow-x", "overflow-y"]
  } : t;
}, Z0 = (e, t) => {
  const n = new Map(t.computedStyles.map((c, u) => [c, u])), r = (c) => c === void 0 ? "" : e.strings[c] || "", s = (c, u, d) => {
    const l = n.get(d);
    if (l === void 0)
      return "";
    const f = c.layout.styles?.[u]?.[l];
    return f === void 0 ? "" : e.strings[f] || "";
  }, o = e.documents[0], { nodeMap: i, childrenMap: a } = o ? Ih(o) : { nodeMap: /* @__PURE__ */ new Map(), childrenMap: /* @__PURE__ */ new Map() };
  return {
    snapshot: e,
    firstDoc: o,
    nodeMap: i,
    childrenMap: a,
    styleIndexByName: n,
    getString: r,
    getStyle: s
  };
}, eR = ({ snapshot: e, firstDoc: t, nodeMap: n, childrenMap: r, getString: s }, o) => {
  if (!t)
    return {
      isPdf: o.mimeType === "application/pdf",
      meta: {}
    };
  const i = () => {
    const c = r.get(0)?.[0];
    if (!c)
      return !1;
    const u = r.get(c)?.[1];
    if (!u)
      return !1;
    const d = r.get(u)?.[0];
    if (!d)
      return !1;
    const l = n.get(d);
    if (!l)
      return !1;
    const f = l.attributes?.map(s);
    return (f?.includes("application/pdf") || f?.includes("application/x-pdf") || f?.includes("application/x-google-chrome-pdf")) ?? !1;
  }, a = () => {
    const c = {}, u = r.get(0)?.[0];
    if (!u)
      return c;
    const d = r.get(u)?.[0];
    if (!d)
      return c;
    const l = r.get(d);
    if (!l?.length)
      return c;
    for (const f of l) {
      const p = n.get(f);
      if (!p || s(p.nodeName).toUpperCase() !== "META")
        continue;
      const m = Ec(e, p), g = m.get("property")?.toLowerCase(), y = m.get("name")?.toLowerCase(), _ = m.get("content");
      if ((g?.startsWith("og:") || y === "description") && _) {
        const E = g?.replace("og:", "") ?? y;
        E && (c[E] = _);
      }
    }
    return c;
  };
  return {
    isPdf: i() ?? !1,
    meta: a()
  };
}, tR = ({ snapshot: e, firstDoc: t, nodeMap: n, getStyle: r }) => {
  if (!t)
    return /* @__PURE__ */ new Map();
  const s = /* @__PURE__ */ new Map();
  return e.documents.forEach((o) => {
    const { nodes: i, layout: a } = o, c = /* @__PURE__ */ new Set();
    a.nodeIndex.forEach((u, d) => {
      const l = i.backendNodeId?.[u], f = (e.strings[i.nodeName[u]] ?? "div").toLocaleLowerCase(), p = n.get(u), h = Ec(e, p), m = h.get("type") === "submit" && f === "button", g = h.get("id")?.startsWith(Zl);
      if (m && s.set(l, {
        tag: f,
        isSubmitButton: m,
        isPartOfOverlay: g
      }), r(o, d, "cursor") !== "pointer")
        return;
      c.add(l);
      const _ = i.parentIndex[u] !== void 0 ? i.backendNodeId?.[i.parentIndex[u]] : void 0;
      c.has(_) || s.set(l, {
        cursorPointer: !0,
        tag: f,
        isSubmitButton: m,
        isPartOfOverlay: g
      });
    });
  }), s;
}, nR = (e, t) => {
  if (!e)
    return {
      isPdf: t.mimeType === "application/pdf",
      meta: {},
      nodesMetadata: /* @__PURE__ */ new Map(),
      visibility: void 0
    };
  const n = kh(t), r = Z0(e, n), { isPdf: s, meta: o } = eR(r, t), i = tR(r), a = t.filter === "VIEWPORT" ? J0(r) : void 0;
  return { isPdf: s, meta: o, nodesMetadata: i, visibility: a };
}, rR = "node", ka = {
  // Interactive
  link: "a",
  checkbox: "input",
  radio: "input",
  textbox: "input",
  searchbox: "input",
  combobox: "select",
  switch: "input",
  slider: "input",
  spinbutton: "input",
  // Structure
  heading: "h2",
  paragraph: "p",
  list: "ul",
  listitem: "li",
  row: "tr",
  cell: "td",
  columnheader: "th",
  rowheader: "th",
  default: "div",
  WebRoot: "body",
  RootWebArea: "body",
  MenuListPopup: "menu",
  dialog: "div",
  radiogroup: "fieldset",
  WebArea: "iframe",
  Iframe: "iframe",
  generic: "div",
  // Landmarks
  banner: "header",
  navigation: "nav",
  contentinfo: "footer",
  complementary: "aside",
  // Content
  region: "section",
  search: "div",
  image: "img",
  separator: "hr",
  LabelText: "label",
  strong: "b",
  DisclosureTriangle: "details"
}, Ca = /* @__PURE__ */ new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]), sR = async (e, t = {}) => {
  const { tabId: n } = e, r = performance.now(), s = await U({ tabId: n }, "Accessibility.getRootAXNode", {}, "getHtmlAXTree"), o = [
    "StaticText",
    "link"
    //  'button', 'heading' // disabled for now
  ], i = await Promise.all(o.map((f) => U({ tabId: n }, "Accessibility.queryAXTree", {
    role: f,
    backendNodeId: s.node.backendDOMNodeId
  }, "getHtmlAXTree"))), a = [
    s.node,
    ...i.flatMap((f) => f.nodes).sort((f, p) => f.backendDOMNodeId - p.backendDOMNodeId)
    // we need to sort everything to have parents before children
  ], c = performance.now() - r, u = performance.now(), d = await Eo(e, t, a, /* @__PURE__ */ new Map(), void 0), l = performance.now() - u;
  return {
    html: d,
    snapshot: a,
    meta: {},
    fetchTime: c,
    parseTime: l
  };
}, Ch = async (e, t = {}) => {
  const { tabId: n } = e, { computedStyles: r, includeDOMRects: s } = kh(t), o = performance.now(), [i, a] = await Promise.all([
    // We only need this for cursor pointer nodes
    t.excludeDomMeta ? void 0 : U({ tabId: n }, "DOMSnapshot.captureSnapshot", {
      computedStyles: r,
      includePaintOrder: !1,
      includeDOMRects: s,
      includeBlendedBackgroundColors: !1,
      includeTextColorOpacities: !1
    }, "getHtmlAXTree"),
    U({ tabId: n }, "Accessibility.getFullAXTree", {}, "getHtmlAXTree")
  ]), { isPdf: c, meta: u, nodesMetadata: d, visibility: l } = nR(i, t), f = performance.now() - o, p = performance.now(), h = await Eo(e, t, a.nodes, d, l), m = performance.now() - p;
  return { html: h, fetchTime: f, parseTime: m, snapshot: a.nodes, meta: u, isPdf: c };
};
async function Eo(e, t, n, r, s, o) {
  const i = n.find((f) => !f.parentId);
  if (!i)
    return "";
  const a = /* @__PURE__ */ new Set(), c = /* @__PURE__ */ new Map();
  for (const f of n) {
    const p = f.parentId;
    if (p && !c.get(p)) {
      a.add(f.nodeId), c.set(f.nodeId, {
        ...f,
        parentId: i.nodeId
      });
      continue;
    }
    c.set(f.nodeId, f);
  }
  c.get(i.nodeId)?.childIds?.push(...a);
  const u = /* @__PURE__ */ new Map();
  async function d(f) {
    if (u.has(f.nodeId))
      return "";
    u.set(f.nodeId, f);
    const p = Ht(f.role);
    if (t.filter === "VIEWPORT" && s?.get(f.backendDOMNodeId) === !1)
      return await l(f);
    if (p === "StaticText")
      return Ht(f.name) || "";
    const h = r.get(f.backendDOMNodeId);
    if (h?.isPartOfOverlay)
      return "";
    const m = h?.cursorPointer ? h.tag : void 0, y = [
      "LayoutTable",
      "LayoutTableRow",
      "LayoutTableCell",
      "LineBreak",
      "InlineTextBox",
      "presentation",
      "none"
    ].includes(p);
    if (En(f, "hidden") === "true")
      return "";
    if (!m && (y || f.ignored))
      return await l(f);
    if (["ListMarker"].includes(p))
      return Ht(f.name);
    const _ = f.parentId ? u.get(f.parentId) : void 0, w = [];
    aR(f, w, _);
    const E = p === "generic" || p === "group";
    if (E && w.length === 0 && !Ht(f.name))
      return await l(f);
    const S = m ?? (y ? "div" : oR(p, f, _));
    if (S === "input" && (p === "checkbox" || p === "switch" ? w.push('type="checkbox"') : p === "radio" ? w.push('type="radio"') : p === "searchbox" ? w.push('type="search"') : p === "slider" ? w.push('type="range"') : p === "spinbutton" && w.push('type="number"')), f.value !== void 0 && S !== "textarea" && S !== "div") {
      const A = Ht(f.value);
      A && w.push(`value="${Yr(A)}"`);
    }
    !y && !E && p && iR(S, p) && w.push(`role="${p}"`);
    let b = "";
    S === "iframe" ? b = await uR(e, t, f, r, s) || "" : b = await l(f);
    const T = Ht(f.name);
    T && (!b && !Ca.has(S) ? b = T : cR(S, T, b) && (S === "img" ? w.push(`alt="${Yr(T)}"`) : w.push(`aria-label="${Yr(T)}"`)));
    const D = h?.isSubmitButton;
    if (D && w.push('type="submit"'), En(f, "focusable") === "true" || m || D) {
      const A = o ? `${o}:${f.nodeId}` : f.nodeId;
      w.push(`${rR}="${A}"`);
    }
    if (!b && !w.length)
      return "";
    const k = w.length ? ` ${w.join(" ")}` : "";
    return Ca.has(S) ? `<${S}${k}/>` : S === "iframe" && b ? b : `<${S}${k}>${b}</${S}>`;
  }
  async function l(f) {
    if (!f.childIds?.length)
      return "";
    const p = [];
    let h = !1;
    for (const m of f.childIds) {
      const g = c.get(m);
      if (g) {
        const y = await d(g);
        if (y) {
          const _ = !y.startsWith("<");
          _ && h && p.length > 0 && p.push("<br>"), p.push(y), h = _;
        }
      }
    }
    return p.join("");
  }
  return await d(i);
}
function Ht(e) {
  return !e || e.type === "valueUndefined" ? "" : String(e.value || "");
}
function En(e, t) {
  if (!e.properties)
    return "";
  const n = e.properties.find((r) => r.name === t);
  return n ? Ht(n.value) : "";
}
function oR(e, t, n) {
  if (ka[e]) {
    let r = ka[e];
    if (e === "heading") {
      const i = En(t, "level"), a = parseInt(i) || 2;
      a >= 1 && a <= 6 && (r = `h${a}`);
    }
    const s = n && En(n, "editable"), o = En(t, "editable");
    return !s && o ? o === "richtext" ? "div" : En(t, "multiline") ? "textarea" : "input" : r;
  }
  return e || "div";
}
function iR(e, t) {
  return !(t === e || ka[t] === e || e === "select" && t === "combobox" || e === "textarea" && t === "textbox" || ["h1", "h2", "h3", "h4", "h5", "h6"].includes(e) && t === "heading");
}
function aR(e, t, n) {
  if (e.properties)
    for (const r of e.properties) {
      const s = r.name, o = Ht(r.value);
      switch (s) {
        // Html boolean attributes
        case "disabled":
        case "readonly":
        case "required":
        case "checked":
        case "selected":
          o === "true" && t.push(s);
          break;
        // Aria boolean attributes
        case "busy":
        case "invalid":
        case "atomic":
        case "multiselectable":
        case "expanded":
        case "modal":
        case "pressed":
          o === "true" && t.push(`aria-${s}="true"`);
          break;
        // Aria literal values
        // @ts-expect-error - placeholder not listed in the protocol
        case "placeholder":
        case "keyshortcuts":
        case "roledescription":
        case "live":
        case "relevant":
        case "autocomplete":
        case "hasPopup":
        case "valuemin":
        case "valuemax":
        case "valuetext":
        case "errormessage":
          o && t.push(`aria-${s.toLowerCase()}="${o}"`);
          break;
        // Special cases
        case "focused":
          o === "true" && t.push('focused="true"');
          break;
        case "url":
          if (o && !o.startsWith("data:") && // too big to be referenced
          !o.startsWith("blob:") && // cannot be referenced
          !o.startsWith("file:")) {
            let i = o;
            i.startsWith("javascript:") && (i = "#"), e.role?.value === "image" ? t.push(`src="${Yr(i)}"`) : t.push(`href="${Yr(i)}"`);
          }
          break;
        case "editable":
          o === "richtext" && (n && En(n, "editable") || t.push('contenteditable="true"'));
          break;
        case "hiddenRoot":
          o === "true" && t.push('aria-hidden="true"');
          break;
        // No-op - handled elsewhere or ignored
        case "focusable":
        case "root":
        case "level":
        case "hidden":
        case "multiline":
        case "settable":
        // Implied
        case "orientation":
          break;
        // Refer to element ids which we don't keep
        case "actions":
        case "describedby":
        case "activedescendant":
        case "controls":
        case "details":
        case "labelledby":
        case "owns":
        case "flowto":
          break;
        default:
          throw new Error(`Unknown AXNode property: ${s}`);
      }
    }
}
function cR(e, t, n) {
  if (Ca.has(e))
    return !0;
  const r = n.replace(/<[^>]*>/g, "").replace(/\s+/g, "").toLowerCase(), s = /(aria-label|alt)="([^"]*)"/g, o = (n.match(s) || []).map((a) => a.replace(s, "$2")).join("").replace(/\s+/g, "").toLowerCase(), i = t.replace(/\s+/g, "").toLowerCase();
  return !r.includes(i) && !o.includes(i);
}
function Yr(e) {
  return e.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
async function uR(e, t, n, r, s) {
  if (!n.backendDOMNodeId)
    return null;
  try {
    const o = await U({ tabId: e.tabId }, "DOM.describeNode", {
      backendNodeId: n.backendDOMNodeId,
      depth: -1
    }, "getHtmlAXTree");
    if (!o.node.frameId)
      return e.scopedLogger.info("Skipping iframe without frameId to prevent recursion", o), null;
    try {
      const i = await U({ tabId: e.tabId }, "Accessibility.getFullAXTree", {
        frameId: o.node.frameId
      }, "getHtmlAXTree");
      return await Eo(e, t, i.nodes, r, s);
    } catch (i) {
      const a = o.node.attributes?.findIndex((l) => l === "src"), c = a !== void 0 && a !== -1 ? o.node.attributes?.[a + 1] : void 0;
      if (c?.startsWith("chrome-extension://"))
        return "";
      e.scopedLogger.info("Switched to new target for iframe:", i, c, o.node);
      const u = await mh(o.node.frameId, e.scopedLogger), d = await U(u, "Accessibility.getFullAXTree", {}, "getHtmlAXTree");
      return await Eo(e, t, d.nodes, r, s, u.targetId);
    }
  } catch (o) {
    e.scopedLogger.error("Error describing iframe node:", o, n);
  }
  return null;
}
const lR = 350, Ah = 15e3;
function ur(e) {
  return dR(e, {
    idleTimeout: 500,
    concurrency: 0
  });
}
function dR({ tabContext: e, config: t, onFirstPaint: n }, r) {
  const s = performance.now();
  let o = () => {
  }, i = () => {
  }, a = null, c = !1;
  const u = [], d = /* @__PURE__ */ new Set();
  let l;
  const f = /* @__PURE__ */ new Map(), p = /* @__PURE__ */ new Map();
  let h = !1, m = null, g = "text/html", y = null, _ = null;
  const w = () => {
    _ && clearTimeout(_);
  }, E = (O = 500) => {
    w(), _ = setTimeout(() => {
      p.size || o(!0);
    }, O);
  };
  let S = null;
  const b = () => {
    S && clearTimeout(S);
  }, T = (O = 500) => {
    b(), S = setTimeout(() => {
      i();
    }, O);
  };
  let D = !1;
  const k = (O, L) => {
    const z = t.waitForFCP ? D : !0;
    L === "Accessibility.loadComplete" ? (D = !0, T(350)) : L === "Accessibility.nodesUpdated" && z && T(250);
  };
  function I(O) {
    const L = [], z = [
      "https://mail.google.com/",
      "https://www.amazon.com/",
      "https://music.amazon.com/"
    ];
    return L.some((N) => O.startsWith(N)) ? null : z.some((N) => O.startsWith(N)) ? k : null;
  }
  chrome.debugger.onEvent.addListener(A);
  function A(O, L, z) {
    if (!(!(p.has(O.targetId ?? "") || O.tabId === e.tabId) || !z)) {
      if (a?.(O, L, z), L === "Page.frameAttached" && p.set(z.frameId, void 0), L === "Page.frameDetached") {
        const N = z.frameId, me = p.get(N);
        p.delete(N), me && (d.delete(me), o());
      }
      if (L === "Page.navigatedWithinDocument" && z.navigationType === "historyApi" && t.useExperimentalEvents && (m = !0, u.push(L), w()), L === "Page.domContentEventFired" && (m = m || !1), L === "Page.lifecycleEvent" && ["networkAlmostIdle", "networkIdle"].includes(z.name) && t.useExperimentalEvents && w(), m === !1 && ["Accessibility.loadComplete", "Accessibility.nodesUpdated"].includes(L) && t.useExperimentalEvents && E(L === "Accessibility.nodesUpdated" ? 250 : 350), L.startsWith("Accessibility.") && u.push(L), (L === "Page.lifecycleEvent" || L === "Page.navigatedWithinDocument") && (u.push(z.name), z.name === "firstContentfulPaint" && (h = !0, n?.(), o())), L === "Network.requestWillBeSent") {
        const N = z, me = N.request.method, oe = ["Fetch", "XHR", "WebSocket", "EventSource", "Document"].includes(N.type ?? ""), he = ["GET", "OPTIONS", "HEAD", "POST"].includes(me);
        if (!oe || !he || N.request.initialPriority === "VeryLow" || N.request.initialPriority === "Low")
          return;
        if (N.type === "Document")
          !c && N.initiator.type === "other" ? (c = !0, d.add(N.requestId), y = N.requestId, a || (a = I(N.documentURL))) : (N.frameId && p.has(N.frameId) && p.set(N.frameId, N.requestId), d.add(N.requestId));
        else {
          if (me !== "POST") {
            F(N.requestId);
            return;
          }
          if (N.request.url.includes("browser-intake-datadoghq.com"))
            return;
          // custom amazon protocol for music.amazon.com
          N.request.headers?.["Content-Type"]?.includes("text/plain") || N.request.postData?.includes('"query":"{') || // Graphql
          N.request.postData?.includes('"jsonrpc"') || // JSON-RPC
          N.request.postData?.includes('"persistedquery"') ? d.add(N.requestId) : F(N.requestId);
          return;
        }
      }
      if (d.has(z.requestId)) {
        if (["Network.loadingFailed", "Network.loadingFinished"].includes(L)) {
          const N = z;
          [...p.entries()].find(([me, oe]) => oe !== N.requestId ? !1 : (p.delete(me), !0)), C(z.requestId);
          return;
        }
        if (L === "Network.responseReceived") {
          const N = z;
          if (N.requestId === y && (g = N.response.mimeType, ["text/html", "application/xhtml+xml"].includes(g) || (h = !0, o(), u.push("OverrideFCP:" + g))), N.response.mimeType === "text/css") {
            C(z.requestId);
            return;
          }
        }
        if ([
          "Network.dataReceived",
          "Network.responseReceived",
          "Network.responseReceivedExtraInfo",
          "Network.requestWillBeSentExtraInfo"
        ].includes(L)) {
          f.get(z.requestId)?.();
          return;
        }
      }
    }
  }
  function F(O) {
    d.add(O), f.set(O, o0(() => C(O), 250)), setTimeout(() => {
      f.get(O)?.();
    }, 500);
  }
  function C(O) {
    d.delete(O), f.delete(O), o();
  }
  function v(O, L, z) {
    !R(L) || t.waitForFCP && !h || (l && clearTimeout(l), l = setTimeout(() => {
      R(L) && x(z);
    }, O));
  }
  function R(O) {
    return d.size <= O;
  }
  function x(O) {
    j(), O();
  }
  function j() {
    chrome.debugger.onEvent.removeListener(A);
  }
  const $ = (O) => {
    const L = performance.now() - s;
    it(e.tabId).then((z) => {
      const ve = z.pendingUrl || z.url, ke = gn(ve);
      e.scopedLogger.info("networkIdle", {
        result: O,
        time: L,
        ...t,
        ...ke,
        mainDocumentMimeType: g,
        lifecycleEventItems: u,
        inprogressRequests: d.size,
        inprogressFrames: p.size
      });
    }).catch((z) => Ce({ error: z, logger: e.scopedLogger }));
  };
  return {
    wait: async () => {
      const O = new Promise((ke) => {
        const N = () => {
          ke("defaultIdle");
        };
        o = (me) => {
          if (me) {
            x(N);
            return;
          }
          v(r.idleTimeout, r.concurrency, N);
        }, v(lR, 0, () => {
          ke("initialCheckIdle");
        });
      }), L = new Promise((ke) => {
        i = () => {
          x(() => {
            ke("customIdle");
          });
        }, it(e.tabId).then((N) => {
          if (a)
            return;
          const me = N.pendingUrl || N.url;
          me && (a = I(me));
        }).catch((N) => Ce({ error: N, logger: e.scopedLogger }));
      }), z = i0(t.maxWaitingTimeoutMs ?? Ah, "timeout"), ve = await Promise.race([O, L, z]);
      return $(ve), {
        result: ve,
        mimeType: g
      };
    }
  };
}
const kl = 250, fR = async (e, t) => {
  const n = performance.now();
  for (; performance.now() - n < t; ) {
    const { result: r } = await U({ tabId: e.tabId }, "Runtime.evaluate", {
      expression: "document.readyState",
      returnByValue: !0
    }, "waitForDocumentReady");
    if (r.value === "complete")
      return !0;
    await yt(200);
  }
  return !1;
}, pR = async (e, t, n) => {
  const { tabId: r, scopedLogger: s } = e, o = await n(e, t);
  if (!o)
    throw s.exception("Failed to get HTML");
  if (o.isPdf || t.mimeType && !["text/html", "application/xhtml+xml"].includes(t.mimeType) || o.html && o.html.length >= kl)
    return o;
  const a = o.html.length <= kl, c = await Pe(r);
  if (!c)
    throw s.exception("Failed to get tab");
  const u = c.pendingUrl || c.url, d = gn(u);
  s.warn(`${a ? "Short HTML" : "Empty HTML"} for url ${u}, retrying...`, d);
  const l = Ah / 2, f = performance.now(), p = ur({
    tabContext: e,
    config: {
      action: "GET_HTML_RETRY",
      waitForFCP: !1,
      maxWaitingTimeoutMs: l
    }
  }), h = await fR(e, l);
  return s.info(`Wait for document ready finished in ${performance.now() - f}ms, timeout: ${!h}`, d), await p.wait(), n(e, t);
};
async function Sc(e, t = {}) {
  return pR(e, t, Ch);
}
const Bs = 100, hR = (e, t, n) => {
  const r = e.documents[0];
  if (!r)
    throw new Error("No documents in snapshot");
  const { nodeMap: s } = Ih(r), o = /* @__PURE__ */ new Map(), i = r.layout.bounds?.[0]?.[2] || 1920, a = r.layout.bounds?.[0]?.[3] || 1080;
  return e.documents.forEach(({ nodes: c, layout: u, scrollOffsetX: d, scrollOffsetY: l }) => {
    const f = d || 0, p = l || 0;
    u.nodeIndex.forEach((h, m) => {
      const g = c.backendNodeId?.[h], y = (e.strings[c.nodeName[h]] ?? "div").toLocaleLowerCase(), _ = s.get(h), w = Ec(e, _), E = w.get("type") === "submit" && y === "button", S = w.get("id"), b = S?.startsWith(Zl);
      let T, D, k = !1;
      const I = u.bounds?.[m];
      if (I && Array.isArray(I) && I.length >= 4 && // bounds has [x, y, width, height]
      typeof I[0] == "number" && typeof I[1] == "number") {
        const C = I[2], v = I[3], R = (I[0] - f) / t * n, x = (I[1] - p) / t * n, j = C / t * n, $ = v / t * n, ue = Math.round(R + j / 2), O = Math.round(x + $ / 2);
        T = [ue, O], D = [R, x], k = x < a && // top < window.innerHeight
        x + $ > 0 && // bottom > 0
        R < i && // left < window.innerWidth
        R + j > 0;
      }
      const A = u.styles[m][0], F = e.strings[A] === "pointer";
      o.set(g, {
        cursorPointer: F,
        tag: y,
        attr_id: S,
        isSubmitButton: E,
        isPartOfOverlay: b,
        isInViewport: k,
        coords: T,
        offset: D
      });
    });
  }), o;
}, mR = (e, t) => `(x=${Math.round(e)},y=${Math.round(t)})`, gR = {
  // Interactive
  link: "a",
  checkbox: "input",
  radio: "input",
  textbox: "input",
  searchbox: "input",
  combobox: "select",
  switch: "input",
  slider: "input",
  spinbutton: "input",
  // Structure
  heading: "h2",
  paragraph: "p",
  list: "ul",
  listitem: "li",
  row: "tr",
  cell: "td",
  columnheader: "th",
  rowheader: "th",
  default: "div",
  WebRoot: "body",
  RootWebArea: "body",
  MenuListPopup: "menu",
  dialog: "div",
  radiogroup: "fieldset",
  WebArea: "iframe",
  Iframe: "iframe",
  generic: "div",
  // Landmarks
  banner: "header",
  navigation: "nav",
  contentinfo: "footer",
  complementary: "aside",
  // Content
  region: "section",
  search: "div",
  image: "img",
  separator: "hr",
  LabelText: "label",
  strong: "b",
  DisclosureTriangle: "details"
}, Rh = async (e) => {
  const { debuggee: t, scaleMultiplier: n } = e, [r, s, o, i] = await Promise.all([
    U(t, "Runtime.evaluate", {
      expression: "window.devicePixelRatio || 1"
    }, "getPageStructure"),
    U(t, "DOMSnapshot.captureSnapshot", {
      computedStyles: ["cursor"],
      includePaintOrder: !1,
      includeDOMRects: !1,
      includeBlendedBackgroundColors: !1,
      includeTextColorOpacities: !1
    }, "getPageStructure"),
    U(t, "Accessibility.getFullAXTree", {}, "getPageStructure"),
    U(t, "Runtime.evaluate", {
      expression: "window.location.origin"
    }, "getPageStructure")
  ]), a = r.result?.value || 1, c = i.result?.value || "", u = hR(s, a, n);
  return { output: await xh(e, o.nodes, u, e.debuggee.targetId ?? void 0, 0, c) };
}, xh = async (e, t, n, r, s = 0, o) => {
  let i = t.find((p) => !p.parentId);
  if (!i)
    return "";
  if (e.ref) {
    const { backendNodeId: p, targetId: h } = e.ref;
    if (h ? r === h : !r) {
      const g = t.find((y) => y.backendDOMNodeId === p);
      if (!g) {
        const y = h ? ` in target '${h}'` : "";
        throw new Se(`Element with ref '${p}'${y} not found. It may have been removed from the page. Use without ref to get the current page state.`);
      }
      i = g;
    } else if (r)
      return "";
  }
  const a = /* @__PURE__ */ new Set(), c = /* @__PURE__ */ new Map();
  for (const p of t) {
    const h = p.parentId;
    if (h && !c.get(h)) {
      a.add(p.nodeId), c.set(p.nodeId, {
        ...p,
        parentId: i.nodeId
      });
      continue;
    }
    c.set(p.nodeId, p);
  }
  c.get(i.nodeId)?.childIds?.push(...a);
  const u = /* @__PURE__ */ new Map();
  async function d(p, h = 0, m = !1) {
    if (u.has(p.nodeId))
      return "";
    u.set(p.nodeId, p);
    const g = e.depth ?? 15;
    if (h > g)
      return "";
    const y = yn(p.role), _ = n.get(p.backendDOMNodeId), w = _?.tag === "select" || m;
    if (_?.isPartOfOverlay)
      return "";
    const E = _?.tag, S = e.ref !== void 0 && h === 0;
    if (e.ref?.targetId && !r && !S && E !== "iframe")
      return await l(p, h, w);
    const D = [
      "LayoutTable",
      "LayoutTableRow",
      "LayoutTableCell",
      "LineBreak",
      "InlineTextBox",
      "presentation",
      "sectionheader",
      "ListMarker",
      "none"
    ].includes(y), k = Xt(p, "hidden") === "true", I = Xt(p, "focusable") === "true", A = _?.cursorPointer, F = [
      "textbox",
      "checkbox",
      "radio",
      "button",
      "combobox",
      "searchbox",
      "slider",
      "spinbutton",
      "switch",
      "option"
    ].includes(y), C = y === "link", v = Xt(p, "actions")?.includes("click"), R = _?.isSubmitButton, x = I || A || F || C || v || R;
    if (!S) {
      if (e.filter === "VIEWPORT" && (!_?.isInViewport && !m || k))
        return "";
      if (e.filter === "INTERACTIVE" && !x)
        return _?.tag !== "iframe" ? l(p, h, w) : await Cl(e, p, n, o) || "";
      if (D || p.ignored || k || !_?.coords && !m)
        return await l(p, h, w);
    }
    const j = p.parentId ? c.get(p.parentId) : void 0, $ = [];
    if (y === "StaticText") {
      const oe = yn(p.name).trim();
      if (!oe || j && oe === yn(j.name).trim())
        return "";
      const he = oe.length > Bs ? oe.substring(0, Bs) + "..." : oe;
      $.push(`"${he}"`);
    }
    if ((x || e.filter === "ALL") && y !== "option" && $.push(p0({
      targetId: r,
      // we assume that nodeId is equal to backendNodeId, which is true for all local tests
      backendNodeId: p.backendDOMNodeId ?? p.nodeId
    })), _?.coords && _.isInViewport) {
      const [oe, he] = e.offset ?? [0, 0];
      $.push(mR(_.coords[0] + oe, _.coords[1] + he));
    }
    R && $.push('type="submit"'), _?.attr_id && $.push(`id="${_.attr_id}"`), _R(p, $, j, o);
    const ue = "  ".repeat(h);
    if (y === "StaticText") {
      const oe = $.length ? ` ${$.join(" ")}` : "";
      return `${ue}- generic${oe}
`;
    }
    const O = E ?? (D ? "div" : yR(y, p, j));
    if (O === "input" && (y === "checkbox" || y === "switch" ? $.push('type="checkbox"') : y === "radio" ? $.push('type="radio"') : y === "searchbox" ? $.push('type="search"') : y === "slider" ? $.push('type="range"') : y === "spinbutton" && $.push('type="number"')), p.value !== void 0 && O !== "textarea" && O !== "div") {
      const oe = yn(p.value);
      if (oe) {
        const he = oe.length > 50 ? oe.substring(0, 50) + "..." : oe;
        $.push(`value="${he}"`);
      }
    }
    let L = yn(p.name).trim();
    if (y === "image" && !L) {
      const oe = Xt(p, "url");
      oe && !oe.startsWith("data:") && !oe.startsWith("blob:") && (L = `Image: ${oe.split("/").pop()?.split("?")[0] || "image"}`);
    }
    L && (L.length > Bs && (L = L.substring(0, Bs) + "..."), $.unshift(`"${L}"`));
    const z = $.length > 2, ve = (
      // isGenericNode && // not sure about this condition
      !L.length && !z
    );
    let ke = "";
    if (O === "iframe")
      ke = await Cl(e, p, n, o) || "";
    else {
      const oe = ve ? h : h + 1;
      ke = await l(p, oe, w);
    }
    if (ve)
      return ke;
    const N = $.length ? ` ${$.join(" ")}` : "", me = y === "none" || y === "RootWebArea" ? "generic" : y;
    return ke ? `${ue}- ${me}${N}
${ke}` : `${ue}- ${me}${N}
`;
  }
  async function l(p, h, m) {
    if (!p.childIds?.length)
      return "";
    const g = [];
    for (const y of p.childIds) {
      const _ = c.get(y);
      if (!_)
        continue;
      const w = await d(_, h, m);
      w && g.push(w);
    }
    return g.join("");
  }
  return await d(i, 0);
};
function yn(e) {
  return !e || e.type === "valueUndefined" ? "" : String(e.value || "");
}
function Xt(e, t) {
  if (!e.properties)
    return "";
  const n = e.properties.find((r) => r.name === t);
  return n ? yn(n.value) : "";
}
function yR(e, t, n) {
  const r = gR[e];
  if (!r)
    return e || "div";
  const s = n && Xt(n, "editable"), o = Xt(t, "editable");
  return !s && o ? o === "richtext" ? "div" : Xt(t, "multiline") ? "textarea" : "input" : r;
}
function _R(e, t, n, r) {
  if (e.properties)
    for (const s of e.properties) {
      const o = s.name, i = yn(s.value);
      switch (o) {
        // Html boolean attributes
        case "disabled":
        case "readonly":
        case "required":
        case "checked":
        case "selected":
          i === "true" && t.push(o);
          break;
        // Aria boolean attributes
        case "busy":
        case "invalid":
        case "atomic":
        case "multiselectable":
        case "expanded":
        case "modal":
        case "pressed":
          i === "true" && t.push(`aria-${o}="true"`);
          break;
        // Aria literal values
        // @ts-expect-error - placeholder not listed in the protocol
        case "placeholder":
        case "keyshortcuts":
        case "roledescription":
        case "live":
        case "relevant":
        case "autocomplete":
        case "hasPopup":
        case "valuemin":
        case "valuemax":
        case "valuetext":
        case "errormessage":
          i && t.push(`aria-${o.toLowerCase()}="${i}"`);
          break;
        // Special cases
        case "focused":
          i === "true" && t.push('aria-current="true"');
          break;
        case "url":
          if (i && !i.startsWith("data:") && // too big to be referenced
          !i.startsWith("blob:") && // cannot be referenced
          !i.startsWith("file:")) {
            let a = i;
            a.startsWith("javascript:") && (a = "#"), r && a.startsWith(r) && (a = a.substring(r.length)), e.role?.value === "image" || t.push(`href="${a}"`);
          }
          break;
        case "editable":
          i === "richtext" && (n && Xt(n, "editable") || t.push('contenteditable="true"'));
          break;
        case "hiddenRoot":
          i === "true" && t.push('aria-hidden="true"');
          break;
        // No-op - handled elsewhere or ignored
        case "focusable":
        case "root":
        case "level":
        case "hidden":
        case "multiline":
        case "settable":
        // Implied
        case "orientation":
          break;
        // Refer to element ids which we don't keep
        case "actions":
        case "describedby":
        case "activedescendant":
        case "controls":
        case "details":
        case "labelledby":
        case "owns":
        case "flowto":
          break;
        default:
          throw new Error(`Unknown AXNode property: ${o}`);
      }
    }
}
async function Cl(e, t, n, r) {
  if (!t.backendDOMNodeId)
    return null;
  let s = n.get(t.backendDOMNodeId)?.offset;
  e.offset && (s = [(s?.[0] ?? 0) + e.offset[0], (s?.[1] ?? 0) + e.offset[1]]);
  const o = {
    ...e,
    offset: s
  };
  e.ref?.backendNodeId === t.backendDOMNodeId && (o.ref = void 0);
  const { debuggee: i } = e;
  try {
    const a = await U(i, "DOM.describeNode", {
      backendNodeId: t.backendDOMNodeId,
      depth: -1
    }, "getIframeHtml");
    if (!a.node.frameId)
      return null;
    try {
      const c = await U(i, "Accessibility.getFullAXTree", {
        frameId: a.node.frameId
      }, "getIframeHtml");
      return await xh(o, c.nodes, n, void 0, 0, r);
    } catch {
      const c = a.node.attributes?.findIndex((l) => l === "src");
      if ((c !== void 0 && c !== -1 ? a.node.attributes?.[c + 1] : void 0)?.startsWith("chrome-extension://"))
        return "";
      const d = await mh(a.node.frameId);
      return (await Rh({
        ...o,
        debuggee: d
      })).output;
    }
  } catch {
  }
  return null;
}
let Ur;
async function bR() {
  const e = chrome.runtime.getURL("offscreen.html");
  (await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [e]
  })).length > 0 || (Ur ? await Ur : (Ur = chrome.offscreen.createDocument({
    url: e,
    // TODO: This might not be the best reason since we use it for more generic tasks like logging
    reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
    justification: "parse pdfs"
  }), await Ur, Ur = void 0));
}
const Sn = new Proxy({}, {
  get(e, t) {
    return async (...n) => {
      await bR();
      const r = crypto.randomUUID(), s = {
        type: "OFFSCREEN_REQUEST",
        requestId: r,
        method: t,
        args: n
      }, o = new Promise((a) => {
        const c = (u) => {
          u.requestId === r && (chrome.runtime.onMessage.removeListener(c), a(u));
        };
        chrome.runtime.onMessage.addListener(c);
      });
      await chrome.runtime.sendMessage(s);
      const i = await o;
      if ("error" in i) {
        const { type: a, message: c, stack: u } = i.error;
        throw new wR(a, c, u);
      }
      return i.result;
    };
  }
});
class wR extends Error {
  type;
  stack;
  constructor(t, n, r) {
    super(n), this.type = t, this.stack = r, this.name = "OffscreenError";
  }
}
const Jr = async ({ tab: e, html: t, isPdf: n, logger: r, overrideUrl: s }) => {
  const o = e.id ?? -1, i = new URL(s ?? e.pendingUrl ?? e.url ?? "");
  if (n) {
    try {
      if (_A) {
        const c = await chrome.perplexity.pdf.getPageCount(e.id), u = new Array(c).fill("");
        return {
          markdown: (await Promise.all(u.map(async (f, p) => {
            const h = p + 1, m = await chrome.perplexity.pdf.getText(o, p);
            return `# Page: ${h}
` + m + `
`;
          }))).join(""),
          type: "pdf-fast"
        };
      }
    } catch (c) {
      r.error("[parseMarkdown] Error while parsing PDF with new API, fallback to fetch", c);
    }
    const a = await Sn.parsePdf(i.toString());
    return a.length === 0 && r.warn("Empty content from PDF", {
      htmlLength: t.length,
      url: i.toString()
    }), {
      markdown: a,
      type: "pdf"
    };
  }
  if (Tc(i))
    return ER(o, i, t, r);
  if (Oh(i)) {
    const a = (await Sn.parseGoogleSheets(i.toString())).trim();
    if (a.length > 0)
      return {
        markdown: a,
        type: "google_sheets_fetch"
      };
    const c = await Sn.transformToMarkdown(t);
    return (c.length > 1e3 ? r.info : r.warn)("Empty content from Google Sheets", {
      markdownFromHtmlLength: c.length,
      url: i.toString()
    }), {
      markdown: c,
      type: "google_sheets_html"
    };
  }
  return {
    markdown: await Sn.transformToMarkdown(t),
    type: "html"
  };
}, ER = async (e, t, n, r) => {
  if (t.pathname.endsWith(ed))
    try {
      return {
        markdown: await Sn.parseGoogleDocs(t.toString()),
        type: "google_docs_basic"
      };
    } catch (u) {
      r.warn("Failed to parse GoogleDocs mobile basic version", {
        url: t,
        error: u instanceof Error ? u.message : String(u)
      });
    }
  const [s] = await be({
    target: { tabId: e },
    func: () => Array.from(document.querySelectorAll("div.kix-canvas-tile-content > svg > g")).map((d) => Array.from(d.querySelectorAll("rect:not(:has(*))")).map((l) => l.ariaLabel).join(" ")).join(`
`)
  }, "parseMarkdown", 5e3), o = (s?.result ?? "").trim();
  if (o.length)
    return {
      markdown: o,
      type: "google_docs_svg"
    };
  const i = (await Sn.parseGoogleDocs(t.toString())).trim();
  if (i.length)
    return {
      markdown: i,
      type: "google_docs_state"
    };
  const a = await Sn.transformToMarkdown(n);
  return (a.length > 1e3 ? r.info : r.warn)("Empty content from Google Docs", {
    markdownFromHtmlLength: a.length,
    url: t.toString()
  }), {
    markdown: a,
    type: "google_docs_html"
  };
}, Tc = (e) => e.hostname === "docs.google.com" && e.pathname.startsWith(Lh), Oh = (e) => e.hostname === "docs.google.com" && e.pathname.startsWith("/spreadsheets/d/"), Lh = "/document/d/", Nh = (e, t) => {
  try {
    const n = new URL(e);
    if (!Tc(n))
      return e;
    const r = n.pathname.split("/"), s = r.indexOf("d") + 1;
    if (s > 0 && s < r.length) {
      const o = r[s];
      return `https://${n.hostname}${Lh}${o}${ed}`;
    }
  } catch (n) {
    t.error("Failed to convert Google Docs URL to mobile basic version", {
      url: e
    }, n);
  }
  return e;
};
var So;
(function(e) {
  e.keypadLocation = 3, e.USKeyboardLayout = {
    // Functions row
    Escape: { keyCode: 27, key: "Escape" },
    F1: { keyCode: 112, key: "F1" },
    F2: { keyCode: 113, key: "F2" },
    F3: { keyCode: 114, key: "F3" },
    F4: { keyCode: 115, key: "F4" },
    F5: { keyCode: 116, key: "F5" },
    F6: { keyCode: 117, key: "F6" },
    F7: { keyCode: 118, key: "F7" },
    F8: { keyCode: 119, key: "F8" },
    F9: { keyCode: 120, key: "F9" },
    F10: { keyCode: 121, key: "F10" },
    F11: { keyCode: 122, key: "F11" },
    F12: { keyCode: 123, key: "F12" },
    // Numbers row
    Backquote: { keyCode: 192, shiftKey: "~", key: "`" },
    Digit1: { keyCode: 49, shiftKey: "!", key: "1" },
    Digit2: { keyCode: 50, shiftKey: "@", key: "2" },
    Digit3: { keyCode: 51, shiftKey: "#", key: "3" },
    Digit4: { keyCode: 52, shiftKey: "$", key: "4" },
    Digit5: { keyCode: 53, shiftKey: "%", key: "5" },
    Digit6: { keyCode: 54, shiftKey: "^", key: "6" },
    Digit7: { keyCode: 55, shiftKey: "&", key: "7" },
    Digit8: { keyCode: 56, shiftKey: "*", key: "8" },
    Digit9: { keyCode: 57, shiftKey: "(", key: "9" },
    Digit0: { keyCode: 48, shiftKey: ")", key: "0" },
    Minus: { keyCode: 189, shiftKey: "_", key: "-" },
    Equal: { keyCode: 187, shiftKey: "+", key: "=" },
    Backslash: { keyCode: 220, shiftKey: "|", key: "\\" },
    Backspace: { keyCode: 8, key: "Backspace" },
    // First row
    Tab: { keyCode: 9, key: "Tab" },
    KeyQ: { keyCode: 81, shiftKey: "Q", key: "q" },
    KeyW: { keyCode: 87, shiftKey: "W", key: "w" },
    KeyE: { keyCode: 69, shiftKey: "E", key: "e" },
    KeyR: { keyCode: 82, shiftKey: "R", key: "r" },
    KeyT: { keyCode: 84, shiftKey: "T", key: "t" },
    KeyY: { keyCode: 89, shiftKey: "Y", key: "y" },
    KeyU: { keyCode: 85, shiftKey: "U", key: "u" },
    KeyI: { keyCode: 73, shiftKey: "I", key: "i" },
    KeyO: { keyCode: 79, shiftKey: "O", key: "o" },
    KeyP: { keyCode: 80, shiftKey: "P", key: "p" },
    BracketLeft: { keyCode: 219, shiftKey: "{", key: "[" },
    BracketRight: { keyCode: 221, shiftKey: "}", key: "]" },
    // Second row
    CapsLock: { keyCode: 20, key: "CapsLock" },
    KeyA: { keyCode: 65, shiftKey: "A", key: "a" },
    KeyS: { keyCode: 83, shiftKey: "S", key: "s" },
    KeyD: { keyCode: 68, shiftKey: "D", key: "d" },
    KeyF: { keyCode: 70, shiftKey: "F", key: "f" },
    KeyG: { keyCode: 71, shiftKey: "G", key: "g" },
    KeyH: { keyCode: 72, shiftKey: "H", key: "h" },
    KeyJ: { keyCode: 74, shiftKey: "J", key: "j" },
    KeyK: { keyCode: 75, shiftKey: "K", key: "k" },
    KeyL: { keyCode: 76, shiftKey: "L", key: "l" },
    Semicolon: { keyCode: 186, shiftKey: ":", key: ";" },
    Quote: { keyCode: 222, shiftKey: '"', key: "'" },
    Enter: { keyCode: 13, key: "Enter", text: "\r" },
    // Third row
    ShiftLeft: { keyCode: 160, keyCodeWithoutLocation: 16, key: "Shift", location: 1 },
    KeyZ: { keyCode: 90, shiftKey: "Z", key: "z" },
    KeyX: { keyCode: 88, shiftKey: "X", key: "x" },
    KeyC: { keyCode: 67, shiftKey: "C", key: "c" },
    KeyV: { keyCode: 86, shiftKey: "V", key: "v" },
    KeyB: { keyCode: 66, shiftKey: "B", key: "b" },
    KeyN: { keyCode: 78, shiftKey: "N", key: "n" },
    KeyM: { keyCode: 77, shiftKey: "M", key: "m" },
    Comma: { keyCode: 188, shiftKey: "<", key: "," },
    Period: { keyCode: 190, shiftKey: ">", key: "." },
    Slash: { keyCode: 191, shiftKey: "?", key: "/" },
    ShiftRight: { keyCode: 161, keyCodeWithoutLocation: 16, key: "Shift", location: 2 },
    // Last row
    ControlLeft: { keyCode: 162, keyCodeWithoutLocation: 17, key: "Control", location: 1 },
    MetaLeft: { keyCode: 91, key: "Meta", location: 1 },
    AltLeft: { keyCode: 164, keyCodeWithoutLocation: 18, key: "Alt", location: 1 },
    Space: { keyCode: 32, key: " " },
    AltRight: { keyCode: 165, keyCodeWithoutLocation: 18, key: "Alt", location: 2 },
    AltGraph: { keyCode: 225, key: "AltGraph" },
    MetaRight: { keyCode: 92, key: "Meta", location: 2 },
    ContextMenu: { keyCode: 93, key: "ContextMenu" },
    ControlRight: { keyCode: 163, keyCodeWithoutLocation: 17, key: "Control", location: 2 },
    // Center block
    PrintScreen: { keyCode: 44, key: "PrintScreen" },
    ScrollLock: { keyCode: 145, key: "ScrollLock" },
    Pause: { keyCode: 19, key: "Pause" },
    PageUp: { keyCode: 33, key: "PageUp" },
    PageDown: { keyCode: 34, key: "PageDown" },
    Insert: { keyCode: 45, key: "Insert" },
    Delete: { keyCode: 46, key: "Delete" },
    Home: { keyCode: 36, key: "Home" },
    End: { keyCode: 35, key: "End" },
    ArrowLeft: { keyCode: 37, key: "ArrowLeft" },
    ArrowUp: { keyCode: 38, key: "ArrowUp" },
    ArrowRight: { keyCode: 39, key: "ArrowRight" },
    ArrowDown: { keyCode: 40, key: "ArrowDown" },
    // Numpad
    NumLock: { keyCode: 144, key: "NumLock" },
    NumpadDivide: { keyCode: 111, key: "/", location: 3 },
    NumpadMultiply: { keyCode: 106, key: "*", location: 3 },
    NumpadSubtract: { keyCode: 109, key: "-", location: 3 },
    Numpad7: { keyCode: 36, shiftKeyCode: 103, key: "Home", shiftKey: "7", location: 3 },
    Numpad8: { keyCode: 38, shiftKeyCode: 104, key: "ArrowUp", shiftKey: "8", location: 3 },
    Numpad9: { keyCode: 33, shiftKeyCode: 105, key: "PageUp", shiftKey: "9", location: 3 },
    Numpad4: { keyCode: 37, shiftKeyCode: 100, key: "ArrowLeft", shiftKey: "4", location: 3 },
    Numpad5: { keyCode: 12, shiftKeyCode: 101, key: "Clear", shiftKey: "5", location: 3 },
    Numpad6: { keyCode: 39, shiftKeyCode: 102, key: "ArrowRight", shiftKey: "6", location: 3 },
    NumpadAdd: { keyCode: 107, key: "+", location: 3 },
    Numpad1: { keyCode: 35, shiftKeyCode: 97, key: "End", shiftKey: "1", location: 3 },
    Numpad2: { keyCode: 40, shiftKeyCode: 98, key: "ArrowDown", shiftKey: "2", location: 3 },
    Numpad3: { keyCode: 34, shiftKeyCode: 99, key: "PageDown", shiftKey: "3", location: 3 },
    Numpad0: { keyCode: 45, shiftKeyCode: 96, key: "Insert", shiftKey: "0", location: 3 },
    NumpadDecimal: { keyCode: 46, shiftKeyCode: 110, key: "\0", shiftKey: ".", location: 3 },
    NumpadEnter: { keyCode: 13, key: "Enter", text: "\r", location: 3 }
  };
})(So || (So = {}));
const Al = ["Alt", "Control", "Meta", "Shift"];
class SR {
  _os;
  _pressedModifiers = /* @__PURE__ */ new Set();
  _pressedKeys = /* @__PURE__ */ new Set();
  _raw;
  // @pplx-start — added os param
  constructor(t, n) {
    this._os = n, this._raw = t;
  }
  // @pplx-start — added return type
  async down(t) {
    const n = this._keyDescriptionForString(t), r = this._pressedKeys.has(n.code);
    this._pressedKeys.add(n.code), Al.includes(n.key) && this._pressedModifiers.add(n.key), await this._raw.keydown(this._pressedModifiers, t, n, r);
  }
  _keyDescriptionForString(t) {
    const n = TR(t, this._os);
    let r = xl.get(n);
    return Mh(r, `Unknown key: "${n}"`), r = this._pressedModifiers.has("Shift") && r.shifted ? r.shifted : r, this._pressedModifiers.size > 1 || !this._pressedModifiers.has("Shift") && this._pressedModifiers.size === 1 ? { ...r, text: "" } : r;
  }
  // @pplx-start — added return type
  async up(t) {
    const n = this._keyDescriptionForString(t);
    Al.includes(n.key) && this._pressedModifiers.delete(n.key), this._pressedKeys.delete(n.code), await this._raw.keyup(this._pressedModifiers, t, n);
  }
  // @pplx-start — added return type
  async insertText(t) {
    await this._raw.sendText(t);
  }
  // @pplx-start — added return type
  async type(t, n) {
    const r = n && n.delay || void 0;
    for (const s of t)
      xl.has(s) ? await this.press(s, { delay: r }) : (r && await new Promise((o) => setTimeout(o, r)), await this.insertText(s));
  }
  // @pplx-start — added return type
  async press(t, n = {}) {
    function r(o) {
      const i = [];
      let a = "";
      for (const c of o)
        c === "+" && a ? (i.push(a), a = "") : a += c;
      return i.push(a), i;
    }
    const s = r(t);
    t = s[s.length - 1];
    for (let o = 0; o < s.length - 1; ++o)
      await this.down(s[o]);
    await this.down(t), n.delay && await new Promise((o) => setTimeout(o, n.delay)), await this.up(t);
    for (let o = s.length - 2; o >= 0; --o)
      await this.up(s[o]);
  }
  // @pplx-start
  // Removed ensureModifiers
  // @pplx-end
  _modifiers() {
    return this._pressedModifiers;
  }
}
function TR(e, t) {
  return e === "ControlOrMeta" ? t === "mac" ? "Meta" : "Control" : e;
}
class vR {
  _keyboard;
  _x = 0;
  _y = 0;
  _lastButton = "none";
  _buttons = /* @__PURE__ */ new Set();
  _raw;
  // @pplx-start
  // private _page: Page;
  // constructor(raw: RawMouse, page: Page) {
  constructor(t, n) {
    this._raw = t, this._keyboard = n;
  }
  // @pplx-start
  // async move(x: number, y: number, options: { steps?: number, forClick?: boolean } = {}, metadata?: CallMetadata) {
  //   if (metadata)
  //     metadata.point = { x, y };
  async move(t, n, r = {}) {
    const { steps: s = 1 } = r, o = this._x, i = this._y;
    this._x = t, this._y = n;
    for (let a = 1; a <= s; a++) {
      const c = o + (t - o) * (a / s), u = i + (n - i) * (a / s);
      await this._raw.move(c, u, this._lastButton, this._buttons, this._keyboard._modifiers(), !!r.forClick);
    }
  }
  // @pplx-start
  // async down(options: { button?: types.MouseButton, clickCount?: number } = {}, metadata?: CallMetadata) {
  //   if (metadata)
  //     metadata.point = { x: this._x, y: this._y };
  async down(t = {}) {
    const { button: n = "left", clickCount: r = 1 } = t;
    this._lastButton = n, this._buttons.add(n), await this._raw.down(this._x, this._y, this._lastButton, this._buttons, this._keyboard._modifiers(), r);
  }
  // @pplx-start
  // async up(options: { button?: types.MouseButton, clickCount?: number } = {}, metadata?: CallMetadata) {
  //   if (metadata)
  //     metadata.point = { x: this._x, y: this._y };
  async up(t = {}) {
    const { button: n = "left", clickCount: r = 1 } = t;
    this._lastButton = "none", this._buttons.delete(n), await this._raw.up(this._x, this._y, n, this._buttons, this._keyboard._modifiers(), r);
  }
  // @pplx-start
  // async click(x: number, y: number, options: { delay?: number, button?: types.MouseButton, clickCount?: number } = {}, metadata?: CallMetadata) {
  //   if (metadata)
  //     metadata.point = { x, y };
  async click(t, n, r = {}) {
    const { delay: s = null, clickCount: o = 1 } = r;
    if (s) {
      this.move(t, n, { forClick: !0 });
      for (let i = 1; i <= o; ++i)
        await this.down({ ...r, clickCount: i }), await new Promise((a) => setTimeout(a, s)), await this.up({ ...r, clickCount: i }), i < o && await new Promise((a) => setTimeout(a, s));
    } else {
      const i = [];
      i.push(this.move(t, n, { forClick: !0 }));
      for (let a = 1; a <= o; ++a)
        i.push(this.down({ ...r, clickCount: a })), i.push(this.up({ ...r, clickCount: a }));
      await Promise.all(i);
    }
  }
  // @pplx-start — added return type
  async dblclick(t, n, r = {}) {
    await this.click(t, n, { ...r, clickCount: 2 });
  }
  // @pplx-start — added return type
  async wheel(t, n) {
    await this._raw.wheel(this._x, this._y, this._buttons, this._keyboard._modifiers(), t, n);
  }
}
const Rl = /* @__PURE__ */ new Map([
  ["ShiftLeft", ["Shift"]],
  ["ControlLeft", ["Control"]],
  ["AltLeft", ["Alt"]],
  ["MetaLeft", ["Meta"]],
  ["Enter", [`
`, "\r"]]
]), xl = IR(So.USKeyboardLayout);
function IR(e) {
  const t = /* @__PURE__ */ new Map();
  for (const n in e) {
    const r = e[n], s = {
      key: r.key || "",
      keyCode: r.keyCode || 0,
      keyCodeWithoutLocation: r.keyCodeWithoutLocation || r.keyCode || 0,
      code: n,
      text: r.text || "",
      location: r.location || 0
    };
    r.key.length === 1 && (s.text = s.key);
    let o;
    if (r.shiftKey && (Mh(r.shiftKey.length === 1), o = { ...s }, o.key = r.shiftKey, o.text = r.shiftKey, r.shiftKeyCode && (o.keyCode = r.shiftKeyCode)), t.set(n, { ...s, shifted: o }), Rl.has(n))
      for (const i of Rl.get(n))
        t.set(i, s);
    r.location || (s.key.length === 1 && t.set(s.key, s), o && t.set(o.key, { ...o, shifted: void 0 }));
  }
  return t;
}
function Mh(e, t) {
  if (!e)
    throw new kR(t || "Assertion failed");
}
class kR extends Error {
  constructor(t) {
    super(t), this.name = "AssertionError";
  }
}
const Ct = (e) => {
  let t = 0;
  return e.has("Alt") && (t |= 1), e.has("Control") && (t |= 2), e.has("Meta") && (t |= 4), e.has("Shift") && (t |= 8), t;
}, Mi = (e) => {
  let t = 0;
  return e.has("left") && (t |= 1), e.has("right") && (t |= 2), e.has("middle") && (t |= 4), t;
}, eo = (e, t) => {
  const n = new CR(e, t);
  return new SR(n, t);
};
class CR {
  debuggee;
  os;
  constructor(t, n) {
    this.debuggee = t, this.os = n;
  }
  async keydown(t, n, r, s) {
    const { code: o, key: i, location: a, text: c } = r;
    let u = [];
    this.os === "mac" && (u = this.commandsForCode(o, t)), await U(this.debuggee, "Input.dispatchKeyEvent", {
      type: c ? "keyDown" : "rawKeyDown",
      modifiers: Ct(t),
      windowsVirtualKeyCode: r.keyCodeWithoutLocation,
      code: o,
      commands: u,
      key: i,
      text: c,
      unmodifiedText: c,
      autoRepeat: s,
      location: a,
      isKeypad: a === So.keypadLocation
    }, "keydown");
  }
  async keyup(t, n, r) {
    const { code: s, key: o, location: i } = r;
    await U(this.debuggee, "Input.dispatchKeyEvent", {
      type: "keyUp",
      modifiers: Ct(t),
      key: o,
      windowsVirtualKeyCode: r.keyCodeWithoutLocation,
      code: s,
      location: i
    }, "keyup");
  }
  async sendText(t) {
    await U(this.debuggee, "Input.insertText", {
      text: t
    }, "sendText");
  }
  commandsForCode(t, n) {
    const r = [];
    for (const i of ["Shift", "Control", "Alt", "Meta"])
      n.has(i) && r.push(i);
    r.push(t);
    const s = r.join("+");
    let o = AR[s] || [];
    return typeof o == "string" && (o = [o]), o = o.filter((i) => !i.startsWith("insert")), o.map((i) => i.substring(0, i.length - 1));
  }
}
const AR = {
  Backspace: "deleteBackward:",
  Enter: "insertNewline:",
  NumpadEnter: "insertNewline:",
  Escape: "cancelOperation:",
  ArrowUp: "moveUp:",
  ArrowDown: "moveDown:",
  ArrowLeft: "moveLeft:",
  ArrowRight: "moveRight:",
  F5: "complete:",
  Delete: "deleteForward:",
  Home: "scrollToBeginningOfDocument:",
  End: "scrollToEndOfDocument:",
  PageUp: "scrollPageUp:",
  PageDown: "scrollPageDown:",
  "Shift+Backspace": "deleteBackward:",
  "Shift+Enter": "insertNewline:",
  "Shift+NumpadEnter": "insertNewline:",
  "Shift+Escape": "cancelOperation:",
  "Shift+ArrowUp": "moveUpAndModifySelection:",
  "Shift+ArrowDown": "moveDownAndModifySelection:",
  "Shift+ArrowLeft": "moveLeftAndModifySelection:",
  "Shift+ArrowRight": "moveRightAndModifySelection:",
  "Shift+F5": "complete:",
  "Shift+Delete": "deleteForward:",
  "Shift+Home": "moveToBeginningOfDocumentAndModifySelection:",
  "Shift+End": "moveToEndOfDocumentAndModifySelection:",
  "Shift+PageUp": "pageUpAndModifySelection:",
  "Shift+PageDown": "pageDownAndModifySelection:",
  "Shift+Numpad5": "delete:",
  "Control+Tab": "selectNextKeyView:",
  "Control+Enter": "insertLineBreak:",
  "Control+NumpadEnter": "insertLineBreak:",
  "Control+Quote": "insertSingleQuoteIgnoringSubstitution:",
  "Control+KeyA": "moveToBeginningOfParagraph:",
  "Control+KeyB": "moveBackward:",
  "Control+KeyD": "deleteForward:",
  "Control+KeyE": "moveToEndOfParagraph:",
  "Control+KeyF": "moveForward:",
  "Control+KeyH": "deleteBackward:",
  "Control+KeyK": "deleteToEndOfParagraph:",
  "Control+KeyL": "centerSelectionInVisibleArea:",
  "Control+KeyN": "moveDown:",
  "Control+KeyO": ["insertNewlineIgnoringFieldEditor:", "moveBackward:"],
  "Control+KeyP": "moveUp:",
  "Control+KeyT": "transpose:",
  "Control+KeyV": "pageDown:",
  "Control+KeyY": "yank:",
  "Control+Backspace": "deleteBackwardByDecomposingPreviousCharacter:",
  "Control+ArrowUp": "scrollPageUp:",
  "Control+ArrowDown": "scrollPageDown:",
  "Control+ArrowLeft": "moveToLeftEndOfLine:",
  "Control+ArrowRight": "moveToRightEndOfLine:",
  "Shift+Control+Enter": "insertLineBreak:",
  "Shift+Control+NumpadEnter": "insertLineBreak:",
  "Shift+Control+Tab": "selectPreviousKeyView:",
  "Shift+Control+Quote": "insertDoubleQuoteIgnoringSubstitution:",
  "Shift+Control+KeyA": "moveToBeginningOfParagraphAndModifySelection:",
  "Shift+Control+KeyB": "moveBackwardAndModifySelection:",
  "Shift+Control+KeyE": "moveToEndOfParagraphAndModifySelection:",
  "Shift+Control+KeyF": "moveForwardAndModifySelection:",
  "Shift+Control+KeyN": "moveDownAndModifySelection:",
  "Shift+Control+KeyP": "moveUpAndModifySelection:",
  "Shift+Control+KeyV": "pageDownAndModifySelection:",
  "Shift+Control+Backspace": "deleteBackwardByDecomposingPreviousCharacter:",
  "Shift+Control+ArrowUp": "scrollPageUp:",
  "Shift+Control+ArrowDown": "scrollPageDown:",
  "Shift+Control+ArrowLeft": "moveToLeftEndOfLineAndModifySelection:",
  "Shift+Control+ArrowRight": "moveToRightEndOfLineAndModifySelection:",
  "Alt+Backspace": "deleteWordBackward:",
  "Alt+Enter": "insertNewlineIgnoringFieldEditor:",
  "Alt+NumpadEnter": "insertNewlineIgnoringFieldEditor:",
  "Alt+Escape": "complete:",
  "Alt+ArrowUp": ["moveBackward:", "moveToBeginningOfParagraph:"],
  "Alt+ArrowDown": ["moveForward:", "moveToEndOfParagraph:"],
  "Alt+ArrowLeft": "moveWordLeft:",
  "Alt+ArrowRight": "moveWordRight:",
  "Alt+Delete": "deleteWordForward:",
  "Alt+PageUp": "pageUp:",
  "Alt+PageDown": "pageDown:",
  "Shift+Alt+Backspace": "deleteWordBackward:",
  "Shift+Alt+Enter": "insertNewlineIgnoringFieldEditor:",
  "Shift+Alt+NumpadEnter": "insertNewlineIgnoringFieldEditor:",
  "Shift+Alt+Escape": "complete:",
  "Shift+Alt+ArrowUp": "moveParagraphBackwardAndModifySelection:",
  "Shift+Alt+ArrowDown": "moveParagraphForwardAndModifySelection:",
  "Shift+Alt+ArrowLeft": "moveWordLeftAndModifySelection:",
  "Shift+Alt+ArrowRight": "moveWordRightAndModifySelection:",
  "Shift+Alt+Delete": "deleteWordForward:",
  "Shift+Alt+PageUp": "pageUp:",
  "Shift+Alt+PageDown": "pageDown:",
  "Control+Alt+KeyB": "moveWordBackward:",
  "Control+Alt+KeyF": "moveWordForward:",
  "Control+Alt+Backspace": "deleteWordBackward:",
  "Shift+Control+Alt+KeyB": "moveWordBackwardAndModifySelection:",
  "Shift+Control+Alt+KeyF": "moveWordForwardAndModifySelection:",
  "Shift+Control+Alt+Backspace": "deleteWordBackward:",
  "Meta+NumpadSubtract": "cancel:",
  "Meta+Backspace": "deleteToBeginningOfLine:",
  "Meta+ArrowUp": "moveToBeginningOfDocument:",
  "Meta+ArrowDown": "moveToEndOfDocument:",
  "Meta+ArrowLeft": "moveToLeftEndOfLine:",
  "Meta+ArrowRight": "moveToRightEndOfLine:",
  "Shift+Meta+NumpadSubtract": "cancel:",
  "Shift+Meta+Backspace": "deleteToBeginningOfLine:",
  "Shift+Meta+ArrowUp": "moveToBeginningOfDocumentAndModifySelection:",
  "Shift+Meta+ArrowDown": "moveToEndOfDocumentAndModifySelection:",
  "Shift+Meta+ArrowLeft": "moveToLeftEndOfLineAndModifySelection:",
  "Shift+Meta+ArrowRight": "moveToRightEndOfLineAndModifySelection:",
  "Meta+KeyA": "selectAll:",
  "Meta+KeyC": "copy:",
  "Meta+KeyX": "cut:",
  "Meta+KeyV": "paste:",
  "Meta+KeyZ": "undo:",
  "Shift+Meta+KeyZ": "redo:"
}, Ol = (e, t) => {
  const n = new RR(e);
  return new vR(n, t);
};
class RR {
  debuggee;
  _dragManager;
  constructor(t) {
    this.debuggee = t, this._dragManager = new xR(t);
  }
  async move(t, n, r, s, o, i) {
    const a = async () => {
      await U(this.debuggee, "Input.dispatchMouseEvent", {
        type: "mouseMoved",
        button: r,
        buttons: Mi(s),
        x: t,
        y: n,
        modifiers: Ct(o)
      }, "move");
    };
    if (i)
      return a();
    await this._dragManager.interceptDragCausedByMove(t, n, r, s, o, a);
  }
  async down(t, n, r, s, o, i) {
    this._dragManager.isDragging() || await U(this.debuggee, "Input.dispatchMouseEvent", {
      type: "mousePressed",
      button: r,
      buttons: Mi(s),
      x: t,
      y: n,
      modifiers: Ct(o),
      clickCount: i
    }, "down");
  }
  async up(t, n, r, s, o, i) {
    if (this._dragManager.isDragging()) {
      await this._dragManager.drop(t, n, o);
      return;
    }
    await U(this.debuggee, "Input.dispatchMouseEvent", {
      type: "mouseReleased",
      button: r,
      buttons: Mi(s),
      x: t,
      y: n,
      modifiers: Ct(o),
      clickCount: i
    }, "up");
  }
  async wheel(t, n, r, s, o, i) {
    await U(this.debuggee, "Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: t,
      y: n,
      modifiers: Ct(s),
      deltaX: o,
      deltaY: i
    }, "wheel");
  }
}
class xR {
  debuggee;
  _dragState = null;
  _lastPosition = { x: 0, y: 0 };
  constructor(t) {
    this.debuggee = t;
  }
  async cancelDrag() {
    return this._dragState ? (await U(this.debuggee, "Input.dispatchDragEvent", {
      type: "dragCancel",
      x: this._lastPosition.x,
      y: this._lastPosition.y,
      data: {
        items: [],
        dragOperationsMask: 65535
      }
    }, "cancelDrag"), this._dragState = null, !0) : !1;
  }
  async interceptDragCausedByMove(t, n, r, s, o, i) {
    if (this._lastPosition = { x: t, y: n }, this._dragState) {
      await U(this.debuggee, "Input.dispatchDragEvent", {
        type: "dragOver",
        x: t,
        y: n,
        data: this._dragState,
        modifiers: Ct(o)
      }, "interceptDragCausedByMove");
      return;
    }
    if (r !== "left")
      return i();
    if (!("tabId" in this.debuggee))
      return;
    let a;
    const c = new Promise((p) => a = p), u = (p, h, m) => {
      if (!("tabId" in this.debuggee))
        return;
      p.tabId === this.debuggee.tabId && h === "Input.dragIntercepted" && a(m);
    };
    function d() {
      let p = Promise.resolve(!1), h = null;
      const m = (y) => h = y, g = () => {
        p = new Promise((y) => {
          window.addEventListener("dragstart", m, {
            once: !0,
            capture: !0
          }), setTimeout(() => y(h ? !h.defaultPrevented : !1), 0);
        });
      };
      window.addEventListener("mousemove", g, {
        once: !0,
        capture: !0
      }), window.__cleanupDrag = async () => {
        const y = await p;
        return window.removeEventListener("mousemove", g, {
          capture: !0
        }), window.removeEventListener("dragstart", m, {
          capture: !0
        }), delete window.__cleanupDrag, y;
      };
    }
    await be({
      target: { tabId: this.debuggee.tabId, allFrames: !0 },
      func: d,
      world: "MAIN"
    }, "setupDragListeners", 1e3), chrome.debugger.onEvent.addListener(u), await U(this.debuggee, "Input.setInterceptDrags", {
      enabled: !0
    }, "dragListener"), await i();
    const f = (await be({
      target: { tabId: this.debuggee.tabId, allFrames: !0 },
      func: () => window.__cleanupDrag?.(),
      world: "MAIN"
    }, "cleanupDragListeners", 1e3)).some((p) => p.result === !0);
    this._dragState = f ? (await c).data : null, chrome.debugger.onEvent.removeListener(u), await U(this.debuggee, "Input.setInterceptDrags", {
      enabled: !1
    }, "dragListener"), this._dragState && await U(this.debuggee, "Input.dispatchDragEvent", {
      type: "dragEnter",
      x: t,
      y: n,
      data: this._dragState,
      modifiers: Ct(o)
    }, "dragListener");
  }
  isDragging() {
    return !!this._dragState;
  }
  async drop(t, n, r) {
    Sa(this._dragState, "missing drag state"), await U(this.debuggee, "Input.dispatchDragEvent", {
      type: "drop",
      x: t,
      y: n,
      data: this._dragState,
      modifiers: Ct(r)
    }, "drop"), this._dragState = null;
  }
}
const Ll = 1.15 * 10 ** 6, Vs = 1568, Aa = async (e, t, n, r, s = 1e4) => {
  const o = await it(e), i = o?.pendingUrl ?? o?.url ?? "";
  if (await n.isUrlBlocked(i))
    throw new Error("Screenshot of this page is blocked by the user's settings or their organization's settings.");
  const c = performance.now(), u = { tabId: e }, d = "jpeg", l = await U(u, "Page.captureScreenshot", {
    format: d,
    quality: 75,
    fromSurface: !0,
    optimizeForSpeed: !0,
    screenshotNewSurface: !0
  }, "screenshotAndResize", s, t);
  vn("agent.screenshot.capture_time_ms", {
    duration: performance.now() - c
  });
  const f = performance.now(), p = await to(e, t), h = (g, y, _, w) => new Promise((E, S) => {
    const b = new Image();
    b.onerror = () => S(new Error("Failed to load screenshot image")), b.onload = () => {
      const { screenshotWidth: T, screenshotHeight: D, viewportWidth: k } = y, I = document.createElement("canvas");
      I.width = T, I.height = D;
      const A = I.getContext("2d");
      A?.drawImage(b, 0, 0, I.width, I.height);
      const [F, C] = _;
      if (typeof F == "number" && typeof C == "number" && A) {
        const R = Math.round(20 * (T / k));
        A.fillStyle = "oklch(71.92% 0.112 205.51)", A.beginPath(), A.arc(F, C, R, 0, 2 * Math.PI), A.fill();
      }
      const v = I.toDataURL("image/png").split(",")[1];
      E(v);
    }, b.src = `data:image/${w};base64,${g}`, setTimeout(() => S(new Error("Screenshot timed out")), 5e3);
  });
  let m;
  try {
    m = (await be({
      target: { tabId: e },
      func: h,
      args: [l.data, p, r ?? [], d]
    }, "screenshotAndResize", 5e3))[0]?.result;
  } catch {
    m = await Xr("screenshotAndResize", u, h, [
      l.data,
      p,
      r ?? [],
      d
    ]);
  }
  if (vn("agent.screenshot.resize_time_ms", {
    duration: performance.now() - f
  }), !m)
    throw new Error("Failed to resize screenshot");
  return [m, "png", p];
}, to = async (e, t) => {
  const r = await Xr("getViewportInfo", { tabId: e }, () => {
    if (!window.visualViewport)
      return null;
    let d = 0, l = 0, f = null;
    try {
      const m = document.createElement("div"), g = -2147483647 + Math.floor(Math.random() * 1e3), y = (1e-3 + Math.random() * 1e-3).toFixed(6), _ = [
        "position: fixed",
        "top: 0",
        "right: 0",
        "bottom: 0",
        "left: 0",
        `z-index: ${g}`,
        "pointer-events: none",
        `opacity: ${y}`
      ];
      for (let S = _.length - 1; S > 0; S--) {
        const b = Math.floor(Math.random() * (S + 1)), T = _[S];
        _[S] = _[b], _[b] = T;
      }
      m.style.cssText = _.join("; "), document.documentElement.appendChild(m);
      const w = m.clientWidth, E = m.clientHeight;
      d = window.innerWidth - w, l = window.innerHeight - E, m.remove();
    } catch (m) {
      f = {
        error_message: m instanceof Error ? m.message : String(m),
        document_ready_state: document.readyState
      };
    }
    const p = window.visualViewport.width, h = window.visualViewport.height;
    return {
      viewportWidth: Math.round(p + d),
      viewportHeight: Math.round(h + l),
      error: f
    };
  });
  if (!r)
    throw new Error("Failed to get viewport info: visualViewport not available");
  r.error && t.warn("[getViewportInfo] Error while calculating offset", {
    ...r.error,
    tabId: e
  });
  let { viewportWidth: s, viewportHeight: o } = r;
  const i = s * o, a = i > Ll ? Math.sqrt(Ll / i) : s > Vs ? Vs / s : o > Vs ? Vs / o : 1, c = Math.round(s * a), u = Math.round(o * a);
  return { viewportWidth: s, viewportHeight: o, screenshotWidth: c, screenshotHeight: u };
}, Nl = 100, OR = 200, LR = 1e3, NR = "Unexpected client error";
class MR {
  deps;
  lastViewport;
  constructor(t) {
    this.deps = t;
  }
  async ComputerBatch(t) {
    const n = t.tab_id ?? -1, r = t.actions ?? [], s = this.deps.externalMessagesManager, o = await to(n, this.deps.logger), i = [
      "LEFT_CLICK",
      "RIGHT_CLICK",
      "DOUBLE_CLICK",
      "TRIPLE_CLICK"
    ], a = [...i, "SCROLL", "LEFT_CLICK_DRAG"], c = WR(this.lastViewport, o);
    if (r.some(({ action: D }) => D && a.includes(D)) && c) {
      const { screenshotUuid: D, base64_image: k, newViewportInfo: I } = await this.takeScreenshot(n);
      return {
        tab_context: await this.getTabContext(n, I),
        error: "Actions were not executed as viewport dimensions have been changed. Previous screenshots and coordinates are no longer valid. Use the new screenshot provided to continue.",
        base64_image: k,
        screenshot_uuid: D
      };
    }
    const d = { tabId: n }, l = await _h(), f = r.map(({ action: D }) => D ?? "UNKNOWN").join(", "), p = ur({
      tabContext: { tabId: n, scopedLogger: this.deps.logger, mainTabId: -1 },
      config: {
        action: `ComputerBatch(${f})`,
        waitForFCP: !1,
        maxWaitingTimeoutMs: 2500
      }
    }), h = [], m = crypto.randomUUID(), g = r.findLast((D) => D.action && i.includes(D.action)), y = g && r.indexOf(g);
    let _, w, E;
    for (const [D, k] of r.entries()) {
      if (this.deps.abortController?.signal.aborted)
        break;
      if (!k.action)
        continue;
      const I = performance.now();
      t.uuid && s?.onActionStarted(t.uuid, k), this.deps.overlayManager?.onAction(n, k.action.toLowerCase());
      const A = await Yp(k.action).with("SCREENSHOT", async () => "Successfully captured screenshot scaled to viewport dimensions").with("WAIT", async () => (DR(k), await yt(k.duration * 1e3), `Waited for ${k.duration} second(s)`)).with("LEFT_CLICK", "RIGHT_CLICK", "DOUBLE_CLICK", "TRIPLE_CLICK", async () => {
        const C = await HR(n, o, k);
        Pi(C), await zR(n).catch((N) => {
          this.deps.logger.warn("[ComputerBatch] Error while expecting select open", {
            error: N,
            tabId: n
          });
        });
        const v = { DOUBLE_CLICK: 2, TRIPLE_CLICK: 3 }, [R, x] = Ws(C.coordinate, o), j = C.action === "RIGHT_CLICK" ? "right" : "left", $ = (C.action && v[C.action]) ?? 1;
        this.deps.overlayManager?.onClickAction(n, R, x).catch(() => {
        }), D === y && (_ = C.coordinate, w = performance.now());
        const ue = k.ref ? Ea(k.ref).targetId : void 0, O = ue ? { targetId: ue } : { tabId: n }, L = eo(O, l);
        return await Ol(O, L).click(R, x, { button: j, clickCount: $ }), ((await KR(n).catch((N) => (this.deps.logger.warn("[ComputerBatch] Error while clearing select open", {
          error: N,
          tabId: n
        }), !1)) || "") && `<system-reminder>Native select picker was opened. Screenshot may not include the picker. To interact use "ref" attribute with "form_input" action.</system-reminder>
`) + `${C.action === "LEFT_CLICK" || C.action === "RIGHT_CLICK" ? "Clicked" : C.action === "DOUBLE_CLICK" ? "Double-clicked" : "Triple-clicked"} on tab ${n}`;
      }).with("TYPE", async () => (Ml(k), await Pl(d, k.text, !1), `Typed "${k.text}" on tab ${n}`)).with("KEY", async () => (Ml(k), await eo(d, l).press(k.text), `Pressed ${k.text.split("+").length} key(s): ${k.text}`)).with("SCROLL", async () => {
        Pi(k);
        const [C, v] = Ws(k.coordinate, o), R = k.scroll_parameters;
        if (!R)
          throw new Se("Cannot scroll, scroll_parameters are not provided");
        return `Scrolled in the ${(await this.doScroll(n, R, C, v)).toLowerCase()} direction`;
      }).with("LEFT_CLICK_DRAG", async () => {
        PR(k), Pi(k);
        const [C, v] = Ws(k.start_coordinate, o), [R, x] = Ws(k.coordinate, o), j = eo(d, l), $ = Ol(d, j);
        return await $.move(C, v), await $.down(), await $.move(R, x), await $.up(), "Dragged from the start coordinate to the end coordinate.";
      }).with("SCROLL_TO", async () => {
        UR(k);
        const { object: C, debuggee: v } = await Ra(n, k.ref).catch((R) => {
          throw new Se(`[SCROLL_TO] No element found with reference: "${k.ref}". The element may have been removed from the page`, { cause: R });
        });
        return await Ph(v, C.objectId), `Scrolled to element with reference: ${k.ref}`;
      }).otherwise(() => {
        throw new Se(`Unsupported action ${k.action?.toLowerCase() ?? "unknown"}, valid actions are: "left_click", "right_click", "double_click", "triple_click", "type", "key", "screenshot", "wait", "scroll", "left_click_drag"`);
      }).catch((C) => {
        const v = `Successful action results: ${JSON.stringify(h)}.
Failed action: ${k.action?.toLowerCase() ?? "unknown"}, index: ${D}.
Error: ${C.message ?? String(C)}`, R = C instanceof Error ? C : new Error();
        throw R.message = v, R;
      }).finally(() => {
        vn("agent.client_loop.batch_action_duration", {
          duration: Math.round(performance.now() - I),
          action: k.action ?? "unknown"
        });
      });
      if (h.push(A), D === y)
        try {
          ({ base64_image: E } = await this.takeScreenshot(n, {
            screenshotUuid: m,
            clickCoordinate: _,
            timeout: 1e3
            // fast screenshot before click
          }));
        } catch {
        }
      const F = Math.floor(Math.random() * (OR - Nl + 1)) + Nl;
      D !== r.length - 1 && await yt(F);
    }
    await p.wait();
    const S = !!E && !!w && performance.now() - w < LR, { base64_image: b, newViewportInfo: T } = await this.takeScreenshot(n, {
      screenshotUuid: m,
      dontSaveToStorage: S,
      clickCoordinate: S ? _ : void 0,
      timeout: 1e4
    });
    return {
      tab_context: await this.getTabContext(n, T),
      message: JSON.stringify(h),
      base64_image: b,
      screenshot_uuid: m,
      click_screenshot: E,
      hide_final_screenshot: S
    };
  }
  async FormInput(t) {
    const n = t.tab_id ?? -1, r = t.ref ?? "", s = t.value ?? "";
    this.deps.overlayManager?.onAction(n, "form_input");
    const { object: o, debuggee: i } = await Ra(n, r).catch((l) => {
      throw new Se(`No element found with reference: "${r}". The element may have been removed from the page`, { cause: l });
    }), a = await ba("FormInput", i, o.objectId, FR);
    if (["hidden", "readonly"].includes(a)) {
      const l = a;
      throw new Se(`Element type "${l}" is not a supported form input`);
    }
    if (a && BR.includes(a)) {
      const l = await ba("FormInput", i, o.objectId, $R, [a, s]);
      if (!l)
        throw new Error("Syntheticall input execution failed");
      return {
        tab_context: await this.getTabContext(n),
        error: "error" in l ? l.error : void 0,
        message: "message" in l ? l.message : void 0
      };
    }
    await Pl({ tabId: n }, s, !0);
    const { screenshotUuid: c, base64_image: u, newViewportInfo: d } = await this.takeScreenshot(n);
    return {
      tab_context: await this.getTabContext(n, d),
      message: `Input set to "${s}"`,
      base64_image: u,
      screenshot_uuid: c
    };
  }
  async GetPageText(t) {
    const n = t.tab_id ?? -1;
    this.deps.overlayManager?.onAction(n, "get_page_text");
    const r = {
      tabId: n,
      scopedLogger: this.deps.logger,
      mainTabId: -1
    }, s = await it(n), o = await Sc(r), i = await Jr({
      tab: s,
      html: o.html,
      isPdf: o.isPdf,
      logger: this.deps.logger
    });
    return {
      tab_context: await this.getTabContext(n),
      markdown: i.markdown
    };
  }
  async Navigate(t) {
    const n = t.tab_id ?? -1;
    this.deps.overlayManager?.onAction(n, "navigate");
    const r = t.url ?? "", s = ur({
      tabContext: { tabId: n, scopedLogger: this.deps.logger, mainTabId: -1 },
      config: {
        action: "Navigate",
        waitForFCP: !1,
        maxWaitingTimeoutMs: 5e3
      }
    });
    let o = "";
    if (r === "forward") {
      await chrome.tabs.goForward(n);
      const u = await it(n);
      o = `Navigated forward to ${u.pendingUrl ?? u.url}`;
    } else if (r === "back") {
      await chrome.tabs.goBack(n);
      const u = await it(n);
      o = `Navigated back to ${u.pendingUrl ?? u.url}`;
    } else {
      const u = yh(r.includes("://") ? r : `https://${r}`);
      if (await this.deps.preferences.isUrlBlocked(u))
        throw new Se("This url is restricted by user or system. You cannot navigate to this url.");
      await chrome.tabs.update(n, { url: u });
      const l = await it(n);
      o = `Navigated to ${l.pendingUrl ?? l.url}`;
    }
    await s.wait();
    const { screenshotUuid: i, base64_image: a, newViewportInfo: c } = await this.takeScreenshot(n);
    return {
      tab_context: await this.getTabContext(n, c),
      message: o,
      base64_image: a,
      screenshot_uuid: i
    };
  }
  async ReadPage(t) {
    const n = t.tab_id ?? -1;
    this.deps.overlayManager?.onAction(n, "read_page");
    const r = await to(n, this.deps.logger), s = r.screenshotWidth / r.viewportWidth, o = {
      interactive: "INTERACTIVE",
      all: "ALL",
      viewport: "VIEWPORT"
    }, a = (await Rh({
      debuggee: { tabId: n },
      filter: o[t.filter ?? "unknown"] ?? o.viewport,
      mode: "YAML",
      scaleMultiplier: s,
      ref: t.ref_id ? Ea(t.ref_id) : void 0,
      depth: t.depth
    })).output.replace(/\\u[dD][89a-fA-F][0-9a-fA-F]{2}(?!\\u[dD][89a-fA-F][0-9a-fA-F]{2})/g, "");
    return {
      tab_context: await this.getTabContext(n, r),
      result: a
    };
  }
  async TabsCreate(t) {
    const n = await this.deps.tabsManager.addTabToTask();
    if (await this.deps.tabsManager.maybeFocusTab(n).catch((i) => {
      this.deps.logger.warn("[agent/maybeFocusTab] Error while focusing", i);
    }), t.url) {
      const i = ur({
        tabContext: {
          tabId: n.id,
          scopedLogger: this.deps.logger,
          mainTabId: -1
        },
        config: {
          action: "TabsCreate",
          waitForFCP: !0,
          maxWaitingTimeoutMs: 5e3
        }
      });
      await Ot(n.id, { url: t.url }), await i.wait();
    }
    const { screenshotUuid: r, base64_image: s, newViewportInfo: o } = await this.takeScreenshot(n.id);
    return {
      tab_context: await this.getTabContext(n.id, o),
      message: `Created new tab. Tab ID: ${n.id}`,
      tab_id: n.id,
      base64_image: s,
      screenshot_uuid: r
    };
  }
  async handleError(t, n) {
    const r = await this.getTabContext(n);
    return t instanceof Se ? (this.deps.abortController?.signal.aborted || this.deps.logger.warn("[handleRpcError] ToolError", t), {
      tab_context: r,
      error: `${vh}: ${t.message}`
    }) : (this.deps.abortController?.signal.aborted || this.deps.logger.error("[handleRpcError] Unexpected error", t), {
      tab_context: r,
      error: `${NR}: ${t instanceof Error ? t.message : String(t)}`
    });
  }
  async getTabContext(t, n) {
    try {
      n && (this.lastViewport = n);
      const r = await this.deps.tabsManager.getTaskTabs();
      let s = r[0]?.id ?? -1;
      const o = r.map((a) => (a.active && (s = a.id), {
        tab_id: a.id,
        title: a.title ?? "",
        url: bn(a.pendingUrl ?? a.url ?? "")
      })), i = t ?? s;
      return {
        current_tab_id: i,
        executed_on_tab_id: i,
        available_tabs: o,
        tab_count: r.length
      };
    } catch (r) {
      return this.deps.logger.error("[getTabContext] Failed to get tab context", r), {
        current_tab_id: t ?? -1,
        executed_on_tab_id: t ?? -1,
        available_tabs: [],
        tab_count: 0
      };
    }
  }
  async dispatchScrollFallback(t, n, r, s, o) {
    await U(t, "Input.dispatchMouseEvent", { type: "mouseWheel", x: n, y: r, deltaX: s, deltaY: o }, "dispatchScrollFallback", 5e3, this.deps.logger), await yt(250);
  }
  async doScroll(t, n, r, s) {
    const o = { UP: -1, LEFT: -1 }, i = { RIGHT: "x", LEFT: "x" }, a = n?.scroll_direction ?? "DOWN", c = o[a] ?? 1, u = i[a] ?? "y";
    let d = !1, l;
    n?.scroll_maximum || n?.viewports_to_scroll ? l = n?.viewports_to_scroll ?? 99 : (l = (n?.scroll_amount || 3) * 100, d = !0);
    const f = await to(t, this.deps.logger), p = { tabId: t };
    try {
      await be({
        target: { tabId: t, allFrames: !0 },
        args: [u, l * c, d],
        func: (h, m, g) => {
          window.__pplxScrollTriggered = !1;
          const y = (_) => {
            if (!_.target)
              return;
            window.removeEventListener("scroll", y, !0);
            const w = _.target;
            if (w === document || w === document.documentElement || w === document.body) {
              const S = h === "y" ? window.innerHeight : window.innerWidth, b = g ? m - Math.sign(m) : S * m - Math.sign(m);
              window.scrollBy({
                top: h === "y" ? b : 0,
                left: h === "x" ? b : 0
              }), window.__pplxScrollTriggered = !0;
            } else if ("scrollBy" in w) {
              const S = w, b = h === "y" ? S.clientHeight : S.clientWidth, T = g ? m - Math.sign(m) : b * m - Math.sign(m);
              S.scrollBy({
                top: h === "y" ? T : 0,
                left: h === "x" ? T : 0
              }), window.__pplxScrollTriggered = !0;
            }
          };
          window.addEventListener("scroll", y, !0), window.__pplxScrollListener = y;
        }
      }, "doScroll", 1e3), await U(p, "Input.dispatchMouseEvent", {
        type: "mouseWheel",
        x: r,
        y: s,
        deltaX: u === "x" ? c : 0,
        deltaY: u === "y" ? c : 0
      }, "doScroll", 5e3, this.deps.logger), await yt(250);
    } finally {
      if (!(await be({
        target: { tabId: t, allFrames: !0 },
        func: () => {
          const g = window.__pplxScrollTriggered, y = window.__pplxScrollListener;
          return delete window.__pplxScrollListener, delete window.__pplxScrollTriggered, y && window.removeEventListener("scroll", y, !0), g;
        }
      }, "doScroll", 1e3)).some((g) => g?.result)) {
        this.deps.logger.warn("[doScroll] Listener did not trigger, applying fallback dispatch");
        const g = u === "y" ? f.viewportHeight : f.viewportWidth, y = d ? l * c : g * l * c;
        await this.dispatchScrollFallback(p, r, s, u === "x" ? y : 0, u === "y" ? y : 0);
      }
    }
    return a;
  }
  async takeScreenshot(t, n) {
    const r = n?.screenshotUuid ?? crypto.randomUUID(), [s, o, i] = await Aa(t, this.deps.logger, this.deps.preferences, n?.clickCoordinate ?? void 0, n?.timeout ?? 1e4);
    return n?.dontSaveToStorage || this.deps.externalMessagesManager?.onScreenshotCaptured(`data:image/${o};base64,${s}`, r, t), {
      screenshotUuid: r,
      base64_image: s,
      newViewportInfo: i
    };
  }
}
function Pi(e) {
  const t = ["LEFT_CLICK", "RIGHT_CLICK"], n = e.action?.toLowerCase() ?? "unknown";
  if (!e.coordinate || e.coordinate.length < 2)
    throw new Se(e.action && t.includes(e.action) ? `Either coordinate or ref parameter is required for ${n} action` : `coordinate parameter is required for ${n} action`);
}
function PR(e) {
  if (!e.start_coordinate || e.start_coordinate.length < 2)
    throw new Se(`start_coordinate parameter is required for ${e.action?.toLowerCase() ?? "unknown"} action`);
}
function Ml(e) {
  if (!e.text)
    throw new Se(`text parameter is required for ${e.action?.toLowerCase() ?? "unknown"} action`);
}
function DR(e) {
  if (!e.duration || e.duration < 0)
    throw new Se("duration parameter is required and must be positive");
  if (e.duration > 30)
    throw new Se("duration parameter must be positive int between 0 and 30");
}
function UR(e) {
  if (!e.ref)
    throw new Se(`ref parameter is required for ${e.action?.toLowerCase() ?? "unknown"} action`);
}
const Pl = async (e, t, n, r = null) => {
  const s = await _h(), o = eo(e, s);
  if (n && await o.press("ControlOrMeta+KeyA"), t === "") {
    await o.press("Backspace");
    return;
  }
  !r && await bh(e, t) || (await Xr("paste", e, async () => {
    try {
      window._savedClipboard = await navigator.clipboard.read();
    } catch {
    }
  }), await Xr("paste", e, async (a, c) => {
    const u = new ClipboardItem({
      "text/plain": a,
      ...c && { [c]: a }
    });
    await navigator.clipboard.write([u]);
  }, [t, r]), await o.press("ControlOrMeta+KeyV"), await Xr("paste", e, async () => {
    const a = window._savedClipboard;
    if (a)
      try {
        await navigator.clipboard.write(a);
      } finally {
        delete window._savedClipboard;
      }
  }));
}, Ra = async (e, t) => {
  const { targetId: n, backendNodeId: r } = Ea(t), s = n ? { targetId: n } : { tabId: e };
  await U(s, "DOM.getDocument", {
    depth: 1,
    pierce: !0
  }, "resolveRef");
  const { object: o } = await U(s, "DOM.resolveNode", {
    backendNodeId: r
  }, "resolveRef"), { nodeId: i } = await U(s, "DOM.requestNode", {
    objectId: o.objectId
  }, "resolveRef");
  return { nodeId: i, object: o, debuggee: s };
}, FR = (e) => {
  const t = (i) => {
    const a = i.nodeName.toLowerCase();
    if (a === "select")
      return "select";
    if (a !== "input")
      return null;
    const c = i;
    return c.readOnly ? "readonly" : c.type.toLowerCase();
  }, r = !e.matches("input, textarea, select") && !e.isContentEditable && e.closest("button, [role=button], [role=checkbox], [role=radio]") || e;
  if (!r.matches("a, input, textarea, button, select, [role=link], [role=button], [role=checkbox], [role=radio]") && !r.isContentEditable) {
    const i = e.closest("label"), a = i?.control;
    if (a)
      return a.focus(), a.scrollIntoView({ behavior: "smooth", block: "center" }), t(i.control);
  }
  return r?.focus(), r.scrollIntoView({ behavior: "smooth", block: "center" }), t(r);
}, $R = (e, t, n) => {
  const r = (i) => {
    i.dispatchEvent(new Event("input", { bubbles: !0, composed: !0 })), i.dispatchEvent(new Event("change", { bubbles: !0 }));
  };
  if (t === "select") {
    const i = n.split(",").map((f) => f.trim()), a = document.activeElement, c = a.value, u = [...a.options];
    let d = !1;
    if (u.forEach((f) => {
      if (!i.includes(f.value) && !i.includes(f.text)) {
        f.selected = !1;
        return;
      }
      d || (a.value = ""), d = !0, f.selected = !0;
    }), r(a), d)
      return {
        message: `Selected option(s) "${n}" (previous: "${c}")`
      };
    const l = u.map((f) => `"${f.text}" (value: "${f.value}")`).join(", ");
    return {
      error: `Option(s) "${n}" not found. Available options: ${l}`
    };
  }
  if (t === "checkbox") {
    if (!["true", "false"].includes(n.toLowerCase()))
      return {
        error: `Checkbox requires a boolean value (true/false), got "${n.toLowerCase()}"`
      };
    const i = n.toLowerCase() === "true", a = document.activeElement, c = a.checked;
    return a.checked = i, r(a), { message: `Checkbox ${n} (previous: "${c}")` };
  }
  if (t === "radio") {
    const i = document.activeElement;
    return i.checked = !0, r(i), { message: `Radio button selected in group "${i.name}"` };
  }
  if (t === "range") {
    if (isNaN(Number(n)))
      return { error: `Range input requires a numeric value, got "${n}"` };
    const i = document.activeElement;
    return i.value = n, r(i), {
      message: `Range set to "${n}" (min: ${i.min}, max: ${i.max})`
    };
  }
  const s = document.activeElement, o = s.value;
  return s.value = n, r(s), {
    message: `Input "${t}" set to "${n}" (previous: "${o}")`
  };
}, BR = [
  "color",
  "date",
  "time",
  "datetime-local",
  "month",
  "range",
  "week",
  "select",
  "checkbox",
  "radio"
], VR = (e) => e.viewportWidth / e.screenshotWidth, Ws = (e, t) => {
  const n = VR(t);
  return [e[0] * n, e[1] * n];
}, WR = (e, t) => !!e && (e.viewportWidth !== t.viewportWidth || e.viewportHeight !== t.viewportHeight), HR = async (e, t, n) => {
  const r = ["LEFT_CLICK", "RIGHT_CLICK"];
  if (!n.action || !r.includes(n.action) || !n.ref)
    return n;
  const { object: s, debuggee: o, nodeId: i } = await Ra(e, n.ref).catch((c) => {
    throw new Se(`[normalizeAction] No element found with reference: "${n.ref}". The element may have been removed from the page`, { cause: c });
  });
  await Ph(o, s.objectId);
  const a = await GR(o, i);
  return {
    ...n,
    // We need to "scale" coordinates down to match LLM scaled output
    // After this we can scale it back to normal for ref_id similar to [x,y] from model
    coordinate: [
      Math.round(t.screenshotWidth / t.viewportWidth * a[0]),
      Math.round(t.screenshotHeight / t.viewportHeight * a[1])
    ]
  };
}, Ph = async (e, t) => {
  await ba("scrollTo", e, t, (n) => {
    let r;
    n.nodeType === Node.ELEMENT_NODE ? r = n : n.parentElement && (r = n.parentElement), r?.scrollIntoView({
      behavior: "instant",
      block: "center",
      inline: "center"
    });
  });
}, GR = async (e, t) => {
  const n = await U(e, "DOM.getBoxModel", {
    nodeId: t
  }, "getCoordinate"), { model: r } = n;
  if (!r?.content)
    throw new Error("Failed to get box model");
  const s = r.content, o = (s[0] + s[2]) / 2, i = (s[1] + s[5]) / 2;
  return [o, i];
}, zR = async (e) => {
  await be({
    target: { tabId: e, allFrames: !0 },
    func: () => {
      const t = "_selectOpen", n = document.createElement("style");
      n.textContent = `
        @keyframes ${t} { from {opacity:1} to {opacity:1} }
        select:open { animation: ${t} 1ms linear; }
      `;
      const r = (a) => {
        a.animationName === "_selectOpen" && (o.wasOpened = !0);
      }, o = {
        style: n,
        wasOpened: !1,
        listener: r,
        clean: () => {
          n.remove(), document.removeEventListener("animationstart", r, !0), i._selectMeta === o && delete i._selectMeta;
        }
      }, i = window;
      i._selectMeta = o, document.documentElement.append(n), document.addEventListener("animationstart", r, !0), setTimeout(o.clean, 2e3);
    }
  }, "expectSelectOpen", 2500);
}, KR = async (e) => (await be({
  target: { tabId: e, allFrames: !0 },
  func: () => {
    const n = window._selectMeta;
    return n ? (n.clean(), n.wasOpened) : !1;
  }
}, "clearSelectOpen", 1e3)).some((n) => n?.result), Dh = async (e, t) => {
  const n = Ne({
    taskId: e.taskId,
    entryId: e.entryId,
    ...e.extra_headers,
    // @ts-expect-error OMIT fields
    secret_headers: void 0,
    baggage: void 0
  });
  if (Zp.has(e.taskId)) {
    n.warn("Task with given uuid already exists, ignoring");
    return;
  }
  const r = new G0(rr, W);
  r.setTaskLogger(e.taskId, n);
  const s = new AbortController();
  let o;
  e.enable_reconnect ? o = new j0({
    baseUrl: e.base_url,
    endpoint: "/agent",
    agentSocketMetrics: r,
    sharedLogger: W,
    keepAliveInterval: 2e4,
    maxReconnectRetries: 4,
    captureError: Ce,
    generateUuid: () => crypto.randomUUID()
  }) : o = new V0(e.base_url, r);
  const i = new b0({
    logger: n,
    payload: e,
    taskContextPayload: t
  }), a = new U0({
    logger: n,
    taskId: e.taskId
  }), c = new $0({
    initialPayload: e,
    overlayManager: a,
    externalMessagesManager: i,
    logger: n,
    taskContextPayload: t,
    abortController: s
  }), u = new MR({
    logger: n,
    tabsManager: c,
    preferences: _e,
    externalMessagesManager: i,
    overlayManager: a,
    abortController: s
  }), d = new F0({
    logger: n,
    browserTools: u,
    agentTabsManager: c,
    initialPayload: e,
    abortController: s
  });
  return new jR({
    initialPayload: e,
    logger: n,
    socket: o,
    tabManager: c,
    externalMessagesManager: i,
    rpcService: d,
    abortController: s
  }).startTaskWrapper();
};
class jR {
  constructor(t) {
    this.deps = t, this.isCleanedUp = !1, this.startTime = 0, this.cleanAbortHandler = void 0, bt.set(this.deps.initialPayload.taskId, this), Zp.add(this.deps.initialPayload.taskId);
  }
  get entryId() {
    return this.deps.initialPayload.entryId;
  }
  get taskId() {
    return this.deps.initialPayload.taskId;
  }
  async getTaskTabs() {
    return this.deps.tabManager.getTaskTabs();
  }
  makeVisible() {
    return this.deps.tabManager.makeVisible();
  }
  async startTaskWrapper() {
    this.startTask().catch((t) => {
      this.deps.logger.error("[task] Failed to start agent task", t), this.cleanup("AGENT_TASK_FAILED_TO_START"), this.deps.externalMessagesManager.onTaskFailure("unhandled");
    });
  }
  async startTask() {
    vn("agent.client_loop.start", {
      duration: 0
    }), this.startTime = performance.now();
    const t = JSON.stringify({
      ...this.deps.initialPayload.extra_headers,
      unified_flag: !0
    }), n = this.handleAbortController.bind(this);
    if (this.deps.abortController.signal.addEventListener("abort", n), this.cleanAbortHandler = () => {
      this.deps.abortController.signal.removeEventListener("abort", n);
    }, this.deps.socket.registerTask({
      extraHeaders: t,
      taskId: this.deps.initialPayload.taskId,
      onClose: (u) => {
        this.cleanup(`AGENT_SOCKET_FAILED_${u}`);
      },
      onMessage: async (u) => {
        if (u.task_uuid !== this.deps.initialPayload.taskId) return;
        if (u.method === "ReportTaskComplete") {
          try {
            const l = u.request ? JSON.parse(u.request) : {};
            this.deps.externalMessagesManager.onTaskComplete(l.message);
          } catch {
            this.deps.externalMessagesManager.onTaskComplete();
          }
          this.cleanup("AGENT_TASK_COMPLETED");
          return;
        }
        if (u.method === "ReportTaskProgress")
          return;
        const d = await this.deps.rpcService.dispatchRpcRequest(u);
        this.isCleanedUp || this.deps.socket.send({
          message: { rpc_response: d },
          onSend: () => {
          }
        });
      },
      getReconnectData: async () => {
        const u = await this.deps.rpcService.getTabContext();
        let d;
        if (u.current_tab_id)
          try {
            d = (await Aa(u.current_tab_id, this.deps.logger, _e))[0];
          } catch (l) {
            this.deps.logger.warn("[reconnect] Failed to capture screenshot", l, {
              tab_id: this.deps.initialPayload.tab_id
            });
          }
        return {
          tabs_context: u,
          current_tab_base64_image: d
        };
      }
    }), this.isCleanedUp) return;
    try {
      await this.deps.tabManager.init();
    } catch (u) {
      this.deps.logger.warn("[tabsManager/init] Failed to init tabs", u);
    }
    const r = await this.deps.rpcService.getTabContext(), s = r.current_tab_id ?? -1;
    let o;
    if (s > 0)
      try {
        o = (await Aa(s, this.deps.logger, _e, null, 2e3))[0];
      } catch (u) {
        this.deps.logger.warn("[task] Failed to capture initial sidecar screenshot", u, {
          tab_id: s
        });
      }
    if (this.isCleanedUp) return;
    const i = Math.round(performance.now() - this.startTime), a = !!o, c = {
      start_agent: {
        task: this.deps.initialPayload.query,
        task_uuid: this.deps.initialPayload.taskId,
        extension_version: chrome.runtime.getManifest().version,
        url: this.deps.initialPayload.url ?? "",
        tab_id: this.deps.initialPayload.tab_id ?? -1,
        page_state: void 0,
        attachments: [],
        tabs_context: r,
        extra_headers: t,
        client_start_time_ms: i,
        supported_features: ["computer_batch", "computer_ref", "create_subagent"],
        current_tab_base64_image: o
      }
    };
    this.deps.socket.send({
      onSend: () => {
        const u = JSON.stringify(c);
        this.deps.logger.info("[task] Agent task started", {
          duration: i,
          entryId: this.deps.initialPayload.entryId,
          enable_reconnect: this.deps.initialPayload.enable_reconnect,
          is_mission_control: this.deps.initialPayload.is_mission_control,
          is_subagent: this.deps.initialPayload.is_subagent,
          query: this.deps.initialPayload.query,
          start_url: this.deps.initialPayload.start_url,
          tabs_context: r,
          has_initial_screenshot: a,
          size_mb: Number((u.length / (1024 * 1024)).toFixed(2))
        }), vn("agent.client_loop.start_duration", {
          duration: i,
          has_initial_screenshot: a
        });
      },
      message: c
    });
  }
  handleAbortController() {
    this.cleanup(`ABORTED_BY_${this.deps.abortController.signal.reason}`);
  }
  /**
   * Determines if a stop_agent message should be sent based on the cleanup reason.
   * For reconnect-enabled tasks, avoid sending stop for socket failures (transient disconnections).
   */
  shouldSendStopAgent(t) {
    return !t.startsWith("AGENT_SOCKET_FAILED_");
  }
  async cleanup(t) {
    if (this.isCleanedUp) return;
    this.isCleanedUp = !0, bt.delete(this.deps.initialPayload.taskId), vn("agent.client_loop.total_duration_ms", {
      duration: performance.now() - this.startTime,
      reason: t
    }), this.cleanAbortHandler?.(), this.deps.abortController.abort("cleanup_" + t);
    const n = this.deps.initialPayload.enable_reconnect && this.shouldSendStopAgent(t);
    if (this.deps.logger.debug("[task/cleanup] Cleanup initiated", {
      reason: t,
      enable_reconnect: this.deps.initialPayload.enable_reconnect,
      shouldSendStop: n
    }), n) {
      const r = new va();
      this.deps.socket.send({
        message: { stop_agent: { task_uuid: this.deps.initialPayload.taskId } },
        onSend: ({ aborted: s }) => s ? r.reject() : r.resolve()
      });
      try {
        await r;
      } catch (s) {
        this.deps.logger.error("[task/cleanup] Failed to send stop_agent", s);
      }
    } else
      this.deps.logger.info("[task/cleanup] Skipping stop_agent for transient disconnection", {
        reason: t
      });
    this.deps.socket.unregisterTask({
      taskId: this.deps.initialPayload.taskId
    }), this.deps.tabManager.destroy().catch((r) => {
      this.deps.logger.warn("[task/cleanup] Failed to destroy tabManager", {
        error: r
      });
    }), this.deps.logger.info("[task/cleanup] Agent task cleanup done", {
      reason: t,
      is_new_agent: !0,
      duration: performance.now() - this.startTime
    });
  }
  stopTask(t, n = !1) {
    n && this.deps.externalMessagesManager.onTaskStop(), this.cleanup(t).catch((r) => {
      this.deps.logger.error(
        "[task#stopTask] Error on stopTask cleanup",
        {
          reason: t
        },
        r
      );
    });
  }
}
const qR = async (e, t) => {
  await be(
    {
      target: { tabId: e },
      func: (n) => {
        window.__PPLX_CONTENT_SCRIPT__.setupScreenshotTool(n);
      },
      args: [t]
    },
    "captureVisibleScreenshot",
    1e3
  );
}, XR = async (e) => {
  await be(
    {
      target: { tabId: e },
      func: () => {
        window.__PPLX_CONTENT_SCRIPT__.deactivateScreenshotTool();
      }
    },
    "deactivateScreenshotTool",
    1e3
  );
}, Dl = async (e) => await chrome.tabs.captureVisibleTab(e, {
  format: "png"
}), vc = (e) => {
  try {
    const t = new URL(e);
    return bA(t.hostname);
  } catch {
    return !1;
  }
}, Ul = (e) => {
  try {
    const n = new URL(e).pathname.startsWith("/sidecar");
    return vc(e) && n;
  } catch {
    return !1;
  }
}, YR = (e) => {
  try {
    const n = new URL(e).pathname.startsWith("/inline-assistant");
    return vc(e) && n;
  } catch {
    return !1;
  }
}, Fl = (e) => {
  try {
    const n = new URL(e).pathname.startsWith("/voice-assistant");
    return vc(e) && n;
  } catch {
    return !1;
  }
};
async function JR(e, t, n) {
  switch (e.type) {
    case "CAPTURE_FULL_SCREENSHOT": {
      const r = t.tab?.windowId, s = t.tab?.id, i = (r ? await chrome.windows.get(r) : void 0)?.sidecarTabId ?? e.payload.sidecarTabId;
      if (!r || !s || !i)
        return n({
          error: "Tab not found"
        });
      const a = Ne({ tabId: s });
      a.info("Capturing fullscreen screenshot", s);
      const c = await Dl(r);
      a.debug("Sending screenshot to sidecar", i);
      const u = Te.get(i);
      return u ? (u.postMessage({
        type: "SCREENSHOT_CAPTURED",
        payload: {
          screenshot: c
        }
      }), n({ success: !0 })) : (a.error("Sidecar port not found", i), n({
        error: "Sidecar port not found"
      }));
    }
    case "CAPTURE_VISIBLE_TAB": {
      const r = t.tab?.windowId, s = t.tab?.id, i = (r ? await chrome.windows.get(r) : void 0)?.sidecarTabId ?? e.payload.sidecarTabId;
      if (!r || !s || !i)
        return n({
          error: "Tab not found"
        });
      const a = Ne({ tabId: s });
      a.info("Capturing visible tab screenshot", s);
      const c = await Dl(r);
      return a.debug("Sending screenshot back to content script"), n({
        success: !0,
        response: {
          screenshot: c
        }
      });
    }
    case "CAPTURE_PARTIAL_SCREENSHOT": {
      const r = t.tab?.windowId, s = t.tab?.id, i = (r ? await chrome.windows.get(r) : void 0)?.sidecarTabId ?? e.payload.sidecarTabId;
      if (!r || !s || !i)
        return n({
          error: "Tab not found"
        });
      const a = Ne({ tabId: s });
      a.debug("Sending screenshot to sidecar", i);
      const c = Te.get(i);
      return c ? (c.postMessage({
        type: "SCREENSHOT_CAPTURED",
        payload: {
          screenshot: e.payload.screenshot
        }
      }), n({ success: !0 })) : (a.error("Sidecar port not found", i), n({
        error: "Sidecar port not found"
      }));
    }
    case "BROWSER_TASK_STOP": {
      const r = t.tab?.windowId, s = t.tab?.id, o = Ne({ tabId: s });
      o.info("[BROWSER_TASK_STOP] Stopping browser task", { tabId: s });
      const i = await D0(
        r ?? chrome.windows.WINDOW_ID_CURRENT,
        {
          sidecarTabId: e.payload.sidecarTabId,
          taskUuid: e.payload.taskUuid,
          entryId: e.payload.entryId
        },
        "user-action",
        o
      );
      return n({
        success: i
      });
    }
    case "USER_SELECTION_CAPTURED": {
      if (t && t.tab && t.tab.url && (Ul(t.tab.url) || YR(t.tab.url) || Fl(t.tab.url)))
        return;
      const r = t.tab?.windowId;
      if (!r || r === chrome.windows.WINDOW_ID_NONE)
        return n({
          error: "Window not found"
        });
      const o = (await chrome.windows.get(r)).sidecarTabId, i = (await h0(t.tab?.id))?.bubbleTabId, a = e.payload?.selection, c = [o, i].filter(Boolean);
      let u = c.map((l) => Te.get(l ?? -1)).filter(Boolean);
      if (u.length !== c.length) {
        const l = Array.from(Te.values()).filter(
          (f) => f && f.sender && f.sender.url && Ul(f.sender.url)
        );
        u = [...u, ...l];
      }
      const d = Array.from(Te.values()).filter(
        (l) => l && l.sender && l.sender.url && Fl(l.sender.url)
      );
      return u = [...u, ...d], u.length ? (u.forEach((l) => {
        l && l.postMessage({
          type: "USER_SELECTION_CAPTURED",
          payload: {
            selection: a
          }
        });
      }), n({ success: !0 })) : n({
        error: "No ports found"
      });
    }
    case "OVERLAY_TASK_STOP": {
      const r = e.payload.taskId, s = bt.get(r);
      if (!s) {
        W.error("[OVERLAY_TASK_STOP] Task not found for stop", {
          taskId: r
        });
        return;
      }
      s.stopTask("EXTERNAL_AGENT_STOP_overlay_stop_btn", !0);
      return;
    }
  }
}
const QR = async (e) => {
  const t = Ne({}), r = (await Sh("test-idle", t, chrome.windows.WINDOW_ID_CURRENT)).id, s = await Mn(r), o = {
    tabId: r,
    isVisibleAgent: !1,
    scopedLogger: t,
    mainTabId: -1
  }, i = ur({
    config: {
      action: "DOM_SNAPSHOT_TEST",
      waitForFCP: !0
    },
    tabContext: o
  }), a = performance.now();
  await c0(o, e), await i.wait();
  const c = performance.now() - a, u = await Sc(o), d = performance.now(), l = await Jr({
    tab: await it(r),
    html: u.html,
    isPdf: u.isPdf,
    logger: o.scopedLogger
  }), f = performance.now() - d;
  return await s(), await chrome.tabs.remove(r), {
    snapshotAxTree: {
      html: u.html,
      meta: u.meta,
      fetchTime: u.fetchTime,
      parseTime: u.parseTime,
      isPdf: u.isPdf
    },
    idleTime: c,
    markdown: {
      time: f,
      content: l.markdown,
      type: l.type
    }
  };
};
async function ZR(e) {
  const [t] = await be(
    {
      target: { tabId: e },
      func: () => window.__PPLX_CONTENT_SCRIPT__?.getCursorContext?.() ?? null
    },
    "getCursorContextSnapshot",
    1e3
  );
  return t?.result ?? null;
}
async function ex(e) {
  await be(
    {
      target: { tabId: e },
      func: () => {
        window.__PPLX_CONTENT_SCRIPT__?.activateCursorContextTool?.();
      }
    },
    "activateCursorContextTool",
    1e3
  );
}
async function tx(e) {
  await be(
    {
      target: { tabId: e },
      func: () => {
        window.__PPLX_CONTENT_SCRIPT__?.deactivateCursorContextTool?.();
      }
    },
    "deactivateCursorContextTool",
    1e3
  );
}
const $l = async (e) => {
  if (e) {
    const n = bt.get(e);
    return n ? await n.getTaskTabs() : [];
  }
  const t = [];
  for (const n of bt.values()) {
    const r = await n.getTaskTabs();
    t.push(...r);
  }
  return t;
}, nx = async (e) => {
  const t = [];
  for (const n of e) {
    const r = Date.now() - 6048e5;
    if (!n.payload) continue;
    const s = JSON.parse(n.payload).task_uuid;
    if (n.lastAccessed && r > n.lastAccessed && n.hidden && s) {
      W.debug("Removing completed, hidden tab that is older than 7 days", {
        tabId: n.id,
        taskUuid: s
      });
      try {
        await chrome.tabs.remove(n.id);
      } catch (o) {
        W.error(
          "Error removing completed, hidden tab",
          {
            tabId: n.id,
            taskUuid: s
          },
          o
        );
      }
    } else
      t.push(n);
  }
  return t;
}, rx = "MCP is not supported", sx = "DXT is not supported", ox = ["Local MCP is not enabled", "DXT is not enabled"], Uh = async ({
  type: e,
  tag: t,
  payload: n,
  context: r,
  handler: s
}) => {
  const o = performance.now(), i = Ne(r ?? {});
  i.debug(`${t}(${e}): request`, { _payload: n });
  try {
    const a = await s(n);
    return i.debug(`${t}(${e}): response`, {
      _payload: a,
      duration: performance.now() - o
    }), { success: !0, response: a };
  } catch (a) {
    return a instanceof Error && ox.includes(a.message) ? (i.debug(`${t}(${e}): feature is disabled`), { success: !1, error: a.message }) : (i.error(
      `${t}(${e}): error`,
      {
        duration: performance.now() - o
      },
      a
    ), {
      success: !1,
      error: a instanceof Error ? a.message : "Unknown error"
    });
  }
}, Ar = async ({
  type: e,
  payload: t,
  context: n,
  handler: r
}) => bs ? Uh({
  type: e,
  tag: "MCP",
  payload: t,
  context: n,
  handler: r
}) : { success: !1, error: rx }, Es = async ({
  type: e,
  payload: t,
  context: n,
  handler: r
}) => eh ? Uh({
  type: e,
  tag: "DXT",
  payload: t,
  context: n,
  handler: r
}) : { success: !1, error: sx }, ix = async (e, t) => Ar({
  type: e.type,
  payload: e.payload,
  context: {},
  handler: async (n) => (await chrome.perplexity.mcp.getTools(n.serverName)).map((s) => ({
    id: `${e.payload.serverName}${cm}${s.name}`,
    tool: {
      name: s.name,
      description: s.description,
      input_schema: s.schema
      // annotations: {},
      // server_provided_metadata: {},
    }
  }))
}), ax = async (e, t) => Ar({
  type: e.type,
  payload: e.payload,
  context: e.context,
  handler: async ({ mcpServerName: n, toolName: r, toolArgs: s }) => await chrome.perplexity.mcp.callTool(n, r, s)
}), cx = async (e, t) => Ar({
  type: e.type,
  payload: void 0,
  context: {},
  handler: () => chrome.perplexity.mcp.getStdioServers()
}), ux = async (e, t) => Ar({
  type: e.type,
  payload: e.payload,
  context: {},
  handler: ({ name: n, command: r, env: s }) => chrome.perplexity.mcp.addStdioServer(n, r, s)
}), lx = async (e, t) => Ar({
  type: e.type,
  payload: e.payload,
  context: {},
  handler: ({ existingServerName: n, updates: r }) => chrome.perplexity.mcp.updateStdioServer(n, r)
}), dx = async (e, t) => Ar({
  type: e.type,
  payload: e.payload,
  context: {},
  handler: ({ name: n }) => chrome.perplexity.mcp.removeStdioServer(n)
}), fx = async (e, t) => Es({
  type: e.type,
  payload: e.payload,
  context: {},
  handler: ({ url: n }) => chrome.perplexity.dxt.install(n)
}), px = async (e, t) => Es({
  type: e.type,
  payload: e.payload,
  context: {},
  handler: ({ name: n }) => chrome.perplexity.dxt.uninstall(n)
}), hx = async (e, t) => Es({
  type: e.type,
  payload: void 0,
  context: {},
  handler: () => chrome.perplexity.dxt.getInstalledPackages()
}), Fh = (e) => {
  if (!gA)
    return null;
  const t = e;
  return Object.values(chrome.perplexity.dxt.Permission).includes(t) ? t : null;
}, mx = async (e, t) => Es({
  type: e.type,
  payload: e.payload,
  context: {},
  handler: async ({ permission: n }) => {
    const r = Fh(n);
    return r ? chrome.perplexity.dxt.hasPermission(r) : null;
  }
}), gx = async (e, t) => Es({
  type: e.type,
  payload: e.payload,
  context: {},
  handler: async ({ permission: n }) => {
    const r = Fh(n);
    return r ? chrome.perplexity.dxt.requestPermission(r) : null;
  }
}), $h = "__pplxAbortExtraction", no = /* @__PURE__ */ new Map();
async function yx(e, t, n, r) {
  try {
    const s = `${$h}_${t}`, o = await be(
      {
        target: { tabId: e },
        func: (a, c) => {
          const u = ({
            selector: h,
            attribute: m = "textContent",
            textExtractionRegex: g
          }) => {
            if (!h)
              return null;
            try {
              const y = document.querySelector(h);
              if (!y)
                return null;
              let _ = null;
              if (m === "textContent")
                _ = y.textContent?.trim() ?? null;
              else {
                const w = y.getAttribute(m);
                w && (_ = new URL(w, window.location.href).href);
              }
              if (_ && g)
                try {
                  const E = new RegExp(g).exec(_);
                  E && (_ = E.slice(1).find((b) => b !== void 0) ?? E[0]);
                } catch {
                }
              return _;
            } catch {
              return null;
            }
          }, d = (h) => Array.isArray(h), l = async () => {
            const h = {};
            for (const [m, g] of Object.entries(c)) {
              let y;
              if (d(g)) {
                y = [];
                for (const _ of g) {
                  const w = u(_);
                  if (w === null && !_.optional)
                    return null;
                  y.push(w);
                }
              } else if (y = u(g), y === null && !g.optional)
                return null;
              h[m] = y;
            }
            return h;
          }, f = new Promise((h, m) => {
            globalThis[a] = () => {
              m(new Error("Extraction aborted"));
            };
          }), p = Promise.race([l(), f]).catch(() => null);
          return p.finally(() => {
            delete globalThis[a];
          }), p;
        },
        args: [s, r]
      },
      "startExtractionTask",
      1e3
    );
    if (!o.length)
      return null;
    const i = o[0]?.result;
    return i || null;
  } catch (s) {
    return W.error("Error extracting data from DOM", { tabId: e, url: n }, s), null;
  }
}
function _x(e) {
  no.delete(e.tabId);
  const t = `${$h}_${e.taskId}`;
  be(
    {
      target: { tabId: e.tabId },
      func: (n) => {
        globalThis[n]?.();
      },
      args: [t]
    },
    "stopExtractionTask",
    1e3
  );
}
function bx({
  tabId: e,
  url: t,
  config: n
}) {
  const r = no.get(e);
  if (r) {
    if (r.url === t)
      return r.promise;
    _x(r);
  }
  const s = crypto.randomUUID(), o = {
    taskId: s,
    tabId: e,
    url: t,
    promise: yx(e, s, t, n)
  };
  return no.set(e, o), o.promise.finally(() => {
    no.delete(e);
  }), o.promise;
}
const Bl = /^www\./, wx = {
  brand_name: "product_brand",
  image: "product_image_url",
  product_name: "product_name",
  price: "product_price",
  compare_at_price: "compare_at_price",
  additional_search_filters: "additional_search_filters"
}, Vl = ["brand_name", "compare_at_price", "price"], Wl = ["image"];
async function Ex() {
  const e = await e0.GET(
    "/rest/shopping/assistant/browser-config",
    "browser_agent",
    {
      timeoutMs: t0.MEDIUM,
      retries: 2,
      includeCredentials: !0,
      baseUrlOverride: await _e.getRestAsyncServerUrl()
    }
  );
  if (e.error || !e.data)
    throw new Error(`Failed to get shopping assistant config: ${JSON.stringify(e)}`);
  return e.data;
}
let Fr = null;
async function Sx() {
  return Fr || (Fr = Ex(), Fr.catch(() => {
    Fr = null;
  })), Fr;
}
async function Tx(e) {
  const t = await Sx();
  if (!t) return null;
  let n = null;
  try {
    n = new URL(e);
  } catch {
    return null;
  }
  if (!n.protocol.startsWith("http")) return null;
  const r = n.hostname.replace(Bl, ""), s = n.pathname, o = t.sites.find((i) => {
    const a = i.merchant_domain.replace(Bl, "");
    return r === a || r.endsWith(`.${a}`);
  });
  if (!o) return null;
  for (const i of o.product_details_extraction_patterns)
    try {
      if (new RegExp(i.path).test(s))
        return i;
    } catch (a) {
      W.error(
        "Error matching URL pattern",
        {
          path: i.path
        },
        a
      );
    }
  return null;
}
function vx(e) {
  return wx[e];
}
function Bh(e, ...t) {
  return Object.fromEntries(
    Object.entries(e).filter(([n]) => !t.includes(n))
  );
}
function Ix(e, t) {
  const n = Object.entries(e).map(([r, s]) => [t(r), s]).filter(([r]) => r !== void 0);
  return Object.fromEntries(n);
}
function kx(e) {
  const t = {}, n = Bh(e, "path");
  return Object.entries(n).forEach(([r, s]) => {
    if (s.static) return;
    let o;
    s.css_selector && (o = {
      selector: s.css_selector,
      ...Vl.includes(r) ? { optional: !0 } : {},
      ...Wl.includes(r) ? { attribute: "src" } : {},
      ...s.text_extraction_regex ? { textExtractionRegex: s.text_extraction_regex } : {}
    }), s.css_selectors && (o = s.css_selectors.map((i) => ({
      selector: i,
      ...Vl.includes(r) ? { optional: !0 } : {},
      ...Wl.includes(r) ? { attribute: "src" } : {},
      ...s.text_extraction_regex ? { textExtractionRegex: s.text_extraction_regex } : {}
    }))), o && (t[r] = o);
  }), t;
}
function Cx(e) {
  const t = {}, n = Bh(e, "path");
  return Object.entries(n).forEach(([r, s]) => {
    s.static && (t[r] = s.static);
  }), t;
}
async function Ax({
  tabId: e,
  url: t
}) {
  const n = await Tx(t);
  if (!n) return;
  const r = kx(n), s = await bx({ tabId: e, url: t, config: r });
  if (!s) return;
  const o = {
    path: t,
    ...s,
    ...Cx(n)
  };
  return Ix(
    o,
    (a) => vx(a)
  );
}
const Vh = /* @__PURE__ */ new Set([
  "fetch_opened_tabs",
  "explore-assistant-check",
  "initial-history-summary"
]), Rx = [
  "efaidnbmnnnibpcajpcglclefindmkaj",
  "kdpelmjpfafjppnhbloffcjpeomlnpah",
  "oemmndcbldboiebfnladdacbdfmadadm"
], Wh = (e) => {
  try {
    const t = new URL(e);
    if (t.protocol !== "chrome-extension:")
      return e;
    const n = t.hostname;
    return Rx.includes(n) ? t.pathname.match(/^\/([\w-]+:\/\/.+)$/)?.[1] ?? e : e;
  } catch {
    return e;
  }
}, br = (e) => ({
  tab_id: e.id,
  url: bn(e.pendingUrl ?? e.url ?? ""),
  title: e.title ?? "",
  is_current_tab: e.active ?? !1,
  last_accessed: e.lastAccessed ?? Date.now(),
  visit_count: 1,
  group_id: e.groupId === -1 ? void 0 : e.groupId
});
function Hh(e) {
  const t = e.url.toLowerCase(), n = e.title.toLowerCase();
  if (e.searchTerms.length > 0 && !e.searchTerms.some((s) => n.includes(s) || t.includes(s)))
    return !1;
  const r = e.lastAccessed;
  return !(r !== void 0 && (e.timeFilter?.startTime !== void 0 && r < Date.now() - e.timeFilter.startTime || e.timeFilter?.endTime !== void 0 && r > Date.now() - e.timeFilter.endTime));
}
const Di = async (e) => (await ws(
  {
    windowId: e
  },
  {
    hidden: !1
  }
)).reduce(
  (r, s) => r.set(s.id ?? -1, br(s)),
  /* @__PURE__ */ new Map()
), xx = 3600 * 1e3;
class Ox {
  #e = /* @__PURE__ */ new Map();
  #t = null;
  #n = !1;
  get isInitialized() {
    return this.#n;
  }
  get cacheWindowCount() {
    return this.#e.size;
  }
  get cacheTotalTabs() {
    let t = 0;
    for (const n of this.#e.values())
      t += n.size;
    return t;
  }
  async init() {
    this.#n || (this.#t = this.#s(), await this.#t, this.#n = !0, this.#i(), setInterval(() => this.#s(), xx));
  }
  async query(t) {
    !this.#n && this.#t && await this.#t;
    const n = this.#e.get(t.windowId);
    if (!n) return [];
    const r = [...n.values()].filter(
      (s) => this.#r(s.raw, t.searchTerms, {
        startTime: t.startTime,
        endTime: t.endTime
      })
    ).map((s) => s.model);
    return r.sort((s, o) => o.last_accessed - s.last_accessed), t.maxResults ? r.slice(0, t.maxResults) : r;
  }
  #r(t, n, r) {
    return Hh({
      url: t.url ?? t.pendingUrl ?? "",
      title: t.title ?? "",
      lastAccessed: t.lastAccessed,
      searchTerms: n,
      timeFilter: r
    });
  }
  async #s() {
    const t = await chrome.windows.getAll({ windowTypes: ["normal"] }), n = /* @__PURE__ */ new Map();
    await Promise.all(
      t.map(async (r) => {
        if (r.id === void 0) return;
        const s = await ws(
          { windowId: r.id, windowType: "normal" },
          { hidden: !1 }
        ), o = /* @__PURE__ */ new Map();
        await Promise.all(
          s.map(async (i) => {
            if (i.id === void 0) return;
            const a = (i.url ?? i.pendingUrl ?? "").toLowerCase();
            await _e.isUrlBlocked(a) || o.set(i.id, { raw: i, model: br(i) });
          })
        ), n.set(r.id, o);
      })
    ), this.#e = n;
  }
  #i() {
    chrome.tabs.onUpdated.addListener(async (t, n, r) => {
      const s = r;
      if (!n.url && !n.title || s.windowId === void 0) return;
      const o = (s.url ?? s.pendingUrl ?? "").toLowerCase();
      if (s.hidden || await _e.isUrlBlocked(o)) {
        this.#o(s.windowId, s.id);
        return;
      }
      this.#a(s.windowId, { raw: s, model: br(s) });
    }), chrome.tabs.onRemoved.addListener((t, n) => {
      this.#o(n.windowId, t);
    }), chrome.windows.onRemoved.addListener((t) => {
      this.#e.delete(t);
    }), chrome.settingsPrivate?.onPrefsChanged && chrome.settingsPrivate.onPrefsChanged.addListener((t) => {
      t.some(
        (r) => r.key === wh
      ) && this.#s();
    });
  }
  #a(t, n) {
    let r = this.#e.get(t);
    r || (r = /* @__PURE__ */ new Map(), this.#e.set(t, r)), r.set(n.raw.id, n);
  }
  #o(t, n) {
    const r = this.#e.get(t);
    r && (r.delete(n), r.size === 0 && this.#e.delete(t));
  }
}
const Qr = new Ox();
class Lx {
  async search(t) {
    const n = {
      history_results: [],
      open_tabs_results: [],
      closed_tabs_results: [],
      metadata: {
        history_results_ms: 0,
        open_tabs_results_ms: 0,
        closed_tabs_results_ms: 0
      },
      allSourcesFailed: !1
    }, r = [...new Set(t.sources)].map(async (o) => {
      const i = performance.now();
      try {
        if (o === "HISTORY") {
          n.history_results = await this.#e(t), n.metadata.history_results_ms = performance.now() - i, t.metricsEnabled && rr("search_browser.history", {
            request_id: t.requestId,
            duration: n.metadata.history_results_ms,
            results: n.history_results.length
          });
          return;
        }
        if (o === "OPEN_TABS") {
          n.open_tabs_results = await this.#t(t), n.metadata.open_tabs_results_ms = performance.now() - i, t.metricsEnabled && rr("search_browser.open_tabs", {
            request_id: t.requestId,
            duration: n.metadata.open_tabs_results_ms,
            results: n.open_tabs_results.length
          });
          return;
        }
        if (o === "RECENTLY_CLOSED_TABS") {
          n.closed_tabs_results = await this.#n(t), n.metadata.closed_tabs_results_ms = performance.now() - i, t.metricsEnabled && rr("search_browser.recently_closed_tabs", {
            request_id: t.requestId,
            duration: n.metadata.closed_tabs_results_ms,
            results: n.closed_tabs_results.length
          });
          return;
        }
      } catch (a) {
        const c = a;
        throw rr("search_browser.source_fail", {
          request_id: t.requestId,
          source: o,
          duration: performance.now() - i,
          error: c.message
        }), Ce({
          error: `[SearchService.search][${o}] Error: ${c.message}`,
          logger: t.logger,
          context: {
            request_id: t.requestId,
            key: t.key,
            source: o,
            time: performance.now() - i,
            error: {
              message: c.message,
              stack: c.stack,
              name: c.name
            }
          }
        }), a;
      }
    }), s = await Promise.allSettled(r);
    return n.allSourcesFailed = s.every((o) => o.status === "rejected"), n;
  }
  async searchTabGroups(t) {
    const n = t.queries.map((i) => i.toLowerCase()), r = await chrome.tabGroups.query({}), s = n.length ? r.filter((i) => {
      const a = (i.title ?? "").toLowerCase();
      return n.some((c) => a.includes(c));
    }) : r, o = [];
    for (const i of s) {
      const a = await chrome.tabs.query({ groupId: i.id });
      o.push({
        id: i.id,
        title: i.title,
        color: i.color,
        collapsed: i.collapsed,
        tabs: (await Promise.all(a.map((c) => this.#r(c, [])))).filter(
          (c) => c !== void 0
        )
      });
    }
    return { tab_groups: o };
  }
  async #e(t) {
    const n = Array.isArray(t.queries) && t.queries.length > 0 ? t.queries : [""], r = {
      startTime: void 0,
      endTime: void 0
    };
    t.startTime !== void 0 && (r.startTime = Date.now() - t.startTime), t.endTime !== void 0 && (r.endTime = Date.now() - t.endTime);
    const s = n.map(
      (u) => chrome.history.search({
        text: u,
        maxResults: t.historyMaxResults,
        ...r
      })
    ), o = (await Promise.all(s)).flat(), i = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Set(), c = o.map(async (u) => {
      if (a.has(u.id) || (a.add(u.id), await _e.isUrlBlocked(u.url ?? ""))) return;
      let d = bn(u.url ?? "");
      if (d.endsWith("/") && (d = d.slice(0, -1)), !d) return;
      const l = i.get(d);
      i.set(d, {
        url: d,
        title: l?.title ?? u.title ?? "",
        is_current_tab: !1,
        last_accessed: Math.max(l?.last_accessed ?? 0, u.lastVisitTime ?? Date.now()),
        visit_count: (l?.visit_count ?? 0) + (u?.visitCount ?? 1)
      });
    });
    return await Promise.all(c), [...i.values()];
  }
  async #t(t) {
    const n = t.sender.tab?.windowId ?? (await chrome.windows.getLastFocused({ windowTypes: ["normal"] })).id;
    return Qr.query({
      searchTerms: t.queries?.map((r) => r.toLowerCase()) ?? [],
      startTime: t.startTime,
      endTime: t.endTime,
      maxResults: t.openTabsMaxResults,
      windowId: n
    });
  }
  async #n(t) {
    const n = await chrome.sessions.getRecentlyClosed({
      maxResults: Math.min(
        t.closedTabsMaxResults ?? chrome.sessions.MAX_SESSION_RESULTS,
        chrome.sessions.MAX_SESSION_RESULTS
      )
    }), r = t.queries?.map((o) => o.toLowerCase()) ?? [], s = n.map((o) => {
      if (o.tab)
        return this.#r(o.tab, r, {
          startTime: t.startTime,
          endTime: t.endTime
        });
    });
    return (await Promise.all(s)).filter((o) => o !== void 0);
  }
  async #r(t, n, r, s) {
    const o = t.url ?? t.pendingUrl ?? "";
    if (!await _e.isUrlBlocked(o.toLowerCase()) && Hh({
      url: o,
      title: t.title ?? "",
      lastAccessed: s ?? t.lastAccessed,
      searchTerms: n,
      timeFilter: r
    }))
      return br(t);
  }
}
const Hl = new Lx();
function Nx() {
  const e = () => {
    const s = document.contentType;
    if (s && (s.includes("application/pdf") || s.includes("application/x-pdf") || s.includes("application/x-google-chrome-pdf")))
      return { isPDF: !0, method: "mimeType", value: s };
    function o() {
      return [
        'embed[type="application/pdf"]',
        'object[type="application/pdf"]',
        'iframe[src*=".pdf"]',
        'embed[src*=".pdf"]',
        'object[data*=".pdf"]'
      ].some((c) => document.querySelector(c) !== null);
    }
    return /\.pdf(\?|#|$)/i.test(window.location.href) ? { isPDF: !0, method: "url", value: window.location.href } : document.querySelector("#viewer") && document.querySelector(".pdfViewer") ? { isPDF: !0, method: "pdfjs" } : document.querySelector('embed[type="application/pdf"]') && document.body.children.length === 1 ? { isPDF: !0, method: "chrome-viewer" } : o() ? { isPDF: !0, method: "embedded" } : { isPDF: !1 };
  }, t = () => {
    const s = {}, o = document.head || document.querySelector("head");
    return o && o.querySelectorAll('meta[property^="og:"]').forEach((a) => {
      const c = a.getAttribute("property")?.toLowerCase(), u = a.getAttribute("content");
      if (c && u && c.startsWith("og:")) {
        const d = c.replace("og:", "");
        s[d] = u;
      }
    }), s;
  }, { isPDF: n } = e(), r = t();
  return { isPDF: n, meta: r };
}
const Gh = 11e3, Ic = Gh - 1e3, Mx = 6500, Gl = 1e4, Px = Ic - 1e3;
class Dx {
  constructor(t, n) {
    this.scopedLogger = t, this.sender = n, this.GetContent = wc(Gh)(this.GetContent);
  }
  getWindowId() {
    return this.sender.tab?.windowId === chrome.windows.WINDOW_ID_NONE ? chrome.windows.WINDOW_ID_CURRENT : this.sender.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT;
  }
  async GetContent(t) {
    if (!await _e.isSearchEnabled())
      throw new Wr("Personal search is disabled.");
    const r = t.filter ?? "ALL", s = {
      contents: new Array()
    }, i = (t.pages ?? []).map(async (u) => {
      const d = u.url ?? "", l = performance.now();
      if (await _e.isUrlBlocked(d)) {
        this.scopedLogger.info(
          `[ToolService.GetContent.GetContent] Blocked by user or system: ${d}`
        );
        return;
      }
      const p = await Ux(u, this.scopedLogger, this.sender), h = await Mn(p.id), m = {
        tabId: p.id,
        scopedLogger: this.scopedLogger,
        mainTabId: this.sender.tab?.id ?? -1
      }, g = performance.now() - l;
      try {
        const y = performance.now();
        p.type === "HIDDEN" && await Fx(m, p);
        const _ = performance.now() - y, w = await it(p.id), E = `${w.title}`, S = this.extractProductDataSafely({
          tabId: p.id,
          url: p.url
        }), { html: b, meta: T, isPdf: D, fetchTime: k, parseTime: I } = await Sc(m, { filter: r }), A = performance.now(), { markdown: F, type: C } = await Jr({
          tab: w,
          html: b,
          isPdf: D,
          logger: this.scopedLogger
        }), v = performance.now() - A, { result: R, parseTime: x } = await S, j = {
          ...u,
          title: E,
          html: "",
          markdown: F,
          og_meta: T,
          pdp_data: R
        };
        return s.contents.push({
          ...gn(u.url),
          tabType: p.type,
          htmlLength: b.length,
          markdownLength: F.length,
          markdownParserType: C,
          tabReadyTime: g,
          idleTime: _,
          fetchTime: k,
          parseTime: I,
          parseMdTime: v,
          parsePdpTime: x,
          isSplitView: !!w?.splitId,
          wasTimeout: !1
        }), j;
      } finally {
        h().catch((y) => Ce({ error: y, logger: this.scopedLogger })), p.type === "HIDDEN" && chrome.tabs.remove(p.id).catch((y) => Ce({ error: y, logger: this.scopedLogger }));
      }
    }).map((u) => Promise.race([u, yt(Ic)]).catch((l) => Ce({ error: l, logger: this.scopedLogger }))), a = (u) => !!u;
    return { contents: (await Promise.all(i)).filter(a), _dataToLog: s };
  }
  async GetSidecarContext() {
    const t = performance.now(), n = await zt(this.sender), r = [n];
    if (n.splitId) {
      const c = await wo(n);
      c && r.push(c);
    }
    const s = performance.now() - t, [o, i] = await Promise.all(
      r.map((c) => Promise.race([
        this.GetSidecarPageContent({
          url: c?.pendingUrl ?? c.url ?? "",
          id: c?.id
        }),
        yt(Mx, void 0)
      ]))
    );
    return {
      _dataToLog: {
        contents: [o?.metadata, i?.metadata].filter((c) => !!c),
        timeToGetTabs: s
      },
      content: o?.content,
      contents: [o?.content, i?.content].filter((c) => !!c)
    };
  }
  async SearchBrowser(t) {
    const n = performance.now(), r = await _e.isSearchEnabled(), s = performance.now() - n;
    if (!r)
      throw new Wr("Personal search is disabled.");
    const o = performance.now(), i = !Vh.has(t.key ?? ""), a = t.sources?.length ? t.sources : ["RECENTLY_CLOSED_TABS", "HISTORY", "OPEN_TABS"], c = await Promise.race([
      Hl.search({
        sources: a,
        queries: t.queries,
        historyMaxResults: t.history_max_results,
        openTabsMaxResults: t.open_tabs_max_results,
        closedTabsMaxResults: t.closed_tabs_max_results,
        startTime: t.start_time,
        endTime: t.end_time,
        sender: this.sender,
        requestId: t.request_id,
        key: t.key,
        metricsEnabled: i,
        logger: this.scopedLogger
      }),
      yt(Gl, "timeout")
    ]);
    if (typeof c == "string")
      throw this.scopedLogger.error("[ToolService.SearchBrowser] Search browser timed out", {
        request_id: t.request_id,
        key: t.key,
        sw_uptime_ms: Math.round(performance.now()),
        is_search_enabled_ms: Math.round(s),
        is_initialized: Qr.isInitialized,
        cache_window_count: Qr.cacheWindowCount,
        cache_total_tabs: Qr.cacheTotalTabs,
        sender_window_id: this.sender.tab?.windowId
      }), new zn(`Timed out after ${Gl}ms`);
    if (c.allSourcesFailed)
      throw rr("search_browser.all_sources_failed", {
        request_id: t.request_id,
        duration: performance.now() - o
      }), Error("All sources failed to search");
    return {
      open_tabs_results: c.open_tabs_results,
      history_results: c.history_results,
      closed_tabs_results: c.closed_tabs_results,
      _dataToLog: {
        open_tabs_results: c.open_tabs_results?.length ?? 0,
        closed_tabs_results: c.closed_tabs_results?.length ?? 0,
        history_results: c.history_results?.length ?? 0,
        ...c.metadata
      }
    };
  }
  async GetVisibleTabScreenshot(t) {
    const n = await zt(this.sender), r = n.pendingUrl ?? n.url ?? "";
    if (await _e.isUrlBlocked(r))
      throw this.scopedLogger.info(`[ToolService.GetVisibleTabScreenshot] Blocked by user: ${r}`), new Wr(
        "Screenshot of this page is blocked by the user's settings or their organization's settings."
      );
    return {
      data_url: await chrome.tabs.captureVisibleTab(
        this.sender.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT,
        {
          format: t.format ?? "png",
          quality: t.quality ?? 100
        }
      ),
      _dataToLog: {
        format: t.format ?? "png",
        quality: t.quality ?? 100
      }
    };
  }
  async OpenTab(t) {
    const n = this.getWindowId(), r = t.tab_id ? await Pe(t.tab_id) : void 0, s = r?.id, o = yh(t.url ?? ""), i = (l, f) => {
      const p = (h) => h.replace(/\/+$/, "");
      return p(l) === p(f);
    }, a = s;
    let c = r;
    a || (c = (await ws(
      {
        windowId: n
      },
      {
        hidden: !1
      }
    )).find((f) => i(f.url ?? "", o)));
    const u = c?.id;
    if (u) {
      const f = {
        active: !0,
        ...!i(c?.url ?? "", o) ? { url: o } : {}
      }, p = {
        ...t.navigation_history !== void 0 && {
          navigation_history: t.navigation_history
        }
      }, h = await Ot(u, f, p);
      return { tab: br(h) };
    }
    const d = await chrome.tabs.create({
      url: o,
      active: !0,
      windowId: n
    });
    return { tab: br(d) };
  }
  async CloseTabs(t) {
    const n = this.getWindowId(), r = await Di(n), s = t.tab_ids ?? [];
    return { tabs: (await Promise.all(
      s.map(async (i) => {
        const a = r.get(i);
        if (!a)
          return this.scopedLogger.info("[ToolService.CloseTabs] Tab not found", {
            tabId: i
          }), null;
        if (a.is_current_tab)
          return {
            ...a,
            error: "Cannot close current tab"
          };
        try {
          await chrome.tabs.remove(i);
        } catch (c) {
          return this.scopedLogger.warn("[ToolService.CloseTabs] Failed to remove tab", {
            tabId: i,
            error: c instanceof Error ? c.message : String(c)
          }), null;
        }
        return a;
      })
    )).filter((i) => i !== null) };
  }
  async GroupTabs(t) {
    const n = this.getWindowId(), r = await Di(n), s = (t.tab_ids ?? []).filter((c) => r.has(c)), o = t.group_id ? { groupId: t.group_id } : { createProperties: { windowId: n } }, i = await chrome.tabs.group({
      ...o,
      tabIds: s
    });
    return {
      tab_group: {
        ...await chrome.tabGroups.update(i, {
          collapsed: t.collapsed,
          color: t.color,
          title: t.title
        }),
        tabs: s.map((c) => r.get(c)).filter((c) => c !== void 0)
      }
    };
  }
  async UngroupTabs(t) {
    const n = this.getWindowId(), r = await Di(n), s = t.tab_ids ?? [], o = t.group_ids ?? [], i = [];
    return await Promise.allSettled(
      [...r.values()].map(async (a) => {
        const c = s.includes(a.tab_id), u = o.includes(a.group_id);
        !c && !u || (await chrome.tabs.ungroup(a.tab_id), i.push(a));
      })
    ), {
      ungrouped_tabs: i
    };
  }
  async SearchTabGroups(t) {
    if (!await _e.isSearchEnabled())
      throw new Wr("Personal search is disabled.");
    return Hl.searchTabGroups({ queries: t.queries ?? [] });
  }
  async GetSidecarPageContent(t) {
    let n = performance.now();
    const r = t.url ?? "", s = {
      ...gn(r),
      tabReadyTime: 0,
      fetchTime: 0,
      parseTime: 0,
      debuggerTime: 0,
      parseMdTime: 0,
      parsePdpTime: 0,
      markdownParserType: "",
      isSplitView: !1,
      htmlLength: 0,
      htmlNodes: 0,
      markdownLength: 0,
      mode: "regular",
      lowQualityHtml: !1
    };
    if (await _e.isUrlBlocked(r))
      return this.scopedLogger.info(
        `[ToolService.GetSidecarPageContent] Blocked by system preferences: ${r}`
      ), {
        metadata: { ...s, blockedByUser: !0 },
        content: {
          html: "",
          markdown: "Content blocked by the user's settings or their organization's settings.",
          og_meta: {},
          id: t.id,
          title: "",
          url: r
        }
      };
    let i = Nh(r, this.scopedLogger);
    const a = Wh(i);
    if (a !== i) {
      const y = gn(a);
      this.scopedLogger.info("[GetSidecarPageContent] Detected PDF extension URL, overriding", {
        newUrl: y,
        oldUrl: gn(i)
      }), i = a;
      const w = (await this.GetContent({
        pages: [{ url: i }],
        key: "get-sidecar-context"
      })).contents?.[0];
      if (!w)
        throw new Error("Failed to scrape content from PDF extension URL");
      const E = w.markdown ?? "";
      return {
        metadata: {
          ...s,
          ...y,
          mode: "overridden-pdf-extension-scrape",
          markdownLength: E.length,
          parseMdTime: performance.now() - n,
          markdownParserType: "get-content-markdown"
        },
        content: {
          html: w.html ?? "",
          markdown: E,
          title: w.title ?? "",
          id: t.id,
          url: bn(i),
          og_meta: w.og_meta ?? {}
        }
      };
    }
    const u = new URL(i), d = t.id, l = await it(d);
    if (_e.isInternalPage(i))
      return this.scopedLogger.warn(
        "[GetSidecarPageContent] Trying to fetch internal page",
        gn(t.url)
      ), {
        metadata: s,
        content: {
          html: "",
          markdown: "Content of internal pages is not available.",
          og_meta: {},
          id: l.id,
          title: l.title ?? "",
          url: bn(l?.url ?? "")
        }
      };
    let p = !1, h = {};
    try {
      const y = await be(
        {
          target: { tabId: d },
          func: Nx
        },
        "getMetadata",
        1e3
      );
      p = y[0]?.result?.isPDF ?? !1, h = y[0]?.result?.meta ?? {};
    } catch (y) {
      this.scopedLogger.warn("[GetSidecarPageContent] Error while getting metadata", {
        error: y
      });
    }
    const m = `${l.title}`;
    if (s.tabReadyTime = performance.now() - n, s.isSplitView = !!l?.splitId, n = performance.now(), Tc(u) || Oh(u) || i.endsWith(".pdf") || p) {
      s.mode = "markdown_only";
      const y = "<empty>", { markdown: _, type: w } = await Jr({
        tab: l,
        html: y,
        isPdf: p,
        logger: this.scopedLogger,
        overrideUrl: i
      });
      return s.parseMdTime = performance.now() - n, s.markdownParserType = w, s.markdownLength = _.length, {
        metadata: s,
        content: {
          html: y,
          markdown: _,
          title: m,
          id: d,
          url: bn(l.url ?? ""),
          og_meta: h
        }
      };
    }
    n = performance.now();
    const g = await Mn(d);
    try {
      s.debuggerTime = performance.now() - n, n = performance.now();
      const y = u.toString(), _ = ["https://www.youtube.com/watch"].some(
        (v) => y.startsWith(v)
      );
      _ && (s.mode = "optimized_html", s.lowQualityHtml = !0);
      const w = {
        tabId: d,
        isVisibleAgent: !1,
        scopedLogger: this.scopedLogger,
        mainTabId: this.sender.tab?.id ?? -1
      }, E = _ ? sR : Ch, S = this.extractProductDataSafely({
        tabId: d,
        url: y
      }), { html: b, fetchTime: T, parseTime: D, snapshot: k } = await E(w, {
        excludeDomMeta: !0
        // we have meta from injection
      });
      s.fetchTime = T, s.parseTime = D, s.htmlNodes = k?.length ?? 0, s.htmlLength = b.length, n = performance.now();
      const { markdown: I, type: A } = await Jr({
        tab: l,
        html: b,
        isPdf: p,
        logger: this.scopedLogger,
        overrideUrl: i
      });
      s.parseMdTime = performance.now() - n, s.markdownParserType = A, s.markdownLength = I.length;
      const { result: F, parseTime: C } = await S;
      return s.parsePdpTime = C, {
        content: {
          title: m,
          html: "",
          markdown: I,
          og_meta: h,
          id: d,
          url: bn(l.url ?? ""),
          pdp_data: F
        },
        metadata: s
      };
    } finally {
      g().catch((y) => Ce({ error: y, logger: this.scopedLogger }));
    }
  }
  async extractProductDataSafely({
    tabId: t,
    url: n
  }) {
    const r = Px, s = performance.now(), o = new Error("Timeout while extracting product data");
    try {
      return await Promise.race([
        yt(r).then(() => {
          throw o;
        }),
        Ax({ tabId: t, url: n }).then((i) => ({
          result: i,
          parseTime: performance.now() - s
        }))
      ]);
    } catch (i) {
      return i === o ? this.scopedLogger.warn("[GetSidecarPageContent] Timeout while extracting product data", {
        url: n,
        timeout: r
      }) : this.scopedLogger.error(
        "[GetSidecarPageContent] Failed to extract product data",
        { url: n },
        i
      ), {
        result: void 0,
        parseTime: performance.now() - s
      };
    }
  }
}
const Ux = async (e, t, n) => {
  const { id: r } = e, s = e.url ?? "";
  let o = Nh(s, t);
  const i = Wh(o), a = i !== o;
  if (o = i, r && !a)
    try {
      if ((await Pe(r))?.status !== "unloaded" && o === s)
        return { type: "OPEN", id: r, url: o };
    } catch (u) {
      t.warn(`[ToolService.getTab] Error getting tab ${r}: ${u}`);
    }
  return { type: "HIDDEN", id: (await Sh(
    "tool-call",
    t,
    n.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT,
    !0
  )).id, url: o };
}, Fx = async (e, { id: t, url: n }) => {
  const r = ur({
    tabContext: e,
    config: {
      action: "GET_CONTENT",
      waitForFCP: !0,
      useExperimentalEvents: !0,
      maxWaitingTimeoutMs: Ic - 1e3
    }
  });
  await chrome.tabs.update(t, { url: n }), await r.wait();
};
class Wr extends Error {
  constructor(t) {
    super(t), this.name = "BlockedByUserError";
  }
}
class zh extends Error {
  constructor(t) {
    super(t), this.name = "SchemaError";
  }
}
const xa = "CALL_TOOL", $x = async (e, t) => {
  const n = performance.now(), r = Ne({
    request_id: e.request.request_id,
    step_uuid: e.request.key
  }), s = new Dx(r, t), { method: o, request: i } = e;
  try {
    if (!o || !s[o] || !i)
      throw new zh("Schema error.");
    const a = await s[o](i), c = i.key ?? "";
    return Vh.has(c) || (r.info(`${xa}(${o}): response`, {
      _payload: a?._dataToLog ?? a,
      request: {
        request_id: i.request_id,
        key: i.key
      },
      duration: performance.now() - n
    }), delete a?._dataToLog), { success: !0, response: a };
  } catch (a) {
    return r.error(
      `${xa}(${o}): error`,
      {
        request: {
          request_id: i.request_id,
          key: i.key
        },
        duration: performance.now() - n
      },
      a
    ), { success: !1, response: Bx(a) };
  }
}, Bx = (e) => e instanceof zn ? { errorType: "timeout", errorMsg: "Action timeout" } : e instanceof Wr ? {
  errorType: "blocked-by-user",
  errorMsg: "Search is blocked by user"
} : e instanceof zh ? {
  errorType: "schema-error",
  errorMsg: "Something wrong while parse a message"
} : { errorType: "unhandled", errorMsg: "Unhandled error" }, Vx = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/, zl = (e) => e.match(Vx)?.[1] ?? null, Wx = (e) => {
  try {
    const t = new URL(e).searchParams.get("t");
    return t ? parseInt(t, 10) : 0;
  } catch {
    return 0;
  }
}, Hx = async (e) => {
  const { request: t, sender: n, sendResponse: r } = e, { url: s } = t.payload, o = zl(s);
  if (!o)
    return r({ success: !1, error: "Invalid YouTube URL" });
  const i = Wx(s);
  try {
    const a = await zt(n);
    return (a.url ? zl(a.url) : null) === o && a.id ? (await be(
      {
        target: { tabId: a.id },
        func: (u) => {
          const d = document.querySelector("video");
          d && (d.currentTime = u, d.play()), window.scrollTo({ top: 0, behavior: "smooth" });
        },
        args: [i]
      },
      "OPEN_YOUTUBE_VIDEO_SEEK"
    ), r({ success: !0 })) : (await bo({ url: s }), r({ success: !0 }));
  } catch (a) {
    return W.error("[OPEN_YOUTUBE_VIDEO] Failed", a), r({ success: !1, error: "Failed to open video" });
  }
};
let Kh = performance.now();
const Gx = async (e, t, n) => {
  if (Kh = performance.now(), e.type === xa)
    return n(await $x(e, t));
  if (e.type === "CLEANUP_AGENT_TASKS") {
    const r = e.payload.entryId, s = e.payload.reason ?? "undefined";
    return bt.forEach((o) => {
      o.entryId === r && o.stopTask(`EXTERNAL_AGENT_STOP_${s}`);
    }), n({
      success: !0
    });
  }
  if (e.type === "START_AGENT") {
    const r = e;
    let s, o = !1, i = !1;
    try {
      const u = JSON.parse(r.extra_headers ?? "{}");
      s = u.source, o = u.enable_reconnect, i = u.skip_sidecar === !0;
    } catch {
    }
    const a = t?.tab?.id ?? -1, c = t?.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT;
    return Dh(
      {
        query: r.task ?? "",
        taskId: r.uuid ?? "",
        ...r,
        base_url: r.base_url ?? "",
        extra_headers: JSON.parse(r.extra_headers ?? "{}"),
        mainPort: Te.get(t?.tab?.id ?? -1),
        senderTabId: a,
        senderWindowId: c,
        source: s,
        enable_reconnect: o,
        skip_sidecar: i
      },
      {
        windowId: t.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT
      }
    ), n({ success: !0 });
  }
  if (e.type === "RUN_IDLE_TEST") {
    const r = e.message, s = await QR(r.url);
    return n({
      response: s
    });
  }
  if (e.type === "COMET_OPEN_SIDECAR")
    return await chrome.perplexity.sidecar.open(), n({ success: !0 });
  if (e.type === "COMET_CLOSE_SIDECAR")
    return await chrome.perplexity.sidecar.close(), n({ success: !0 });
  if (e.type === "CAPTURE_SCREENSHOT_V2") {
    let r = e.payload.tabId;
    const s = t.tab?.id;
    if (!s)
      return n({ error: "Sidecar tab not found" });
    if (e.payload.tabId === void 0) {
      const i = (await zt(t))?.id;
      if (!i)
        return n({ error: "Tab not found" });
      r = i;
    }
    return Ne({ tabId: r }).info("Capturing screenshot", r), await qR(r, s), n({ success: !0 });
  }
  if (e.type === "GET_CURSOR_CONTEXT") {
    let r = e.payload.tabId;
    if (e.payload.tabId === void 0) {
      const i = (await zt(t))?.id;
      if (!i)
        return n({ error: "Tab not found" });
      r = i;
    }
    Ne({ tabId: r }).debug("Fetching cursor context", r);
    const o = await ZR(r);
    return n({
      success: !0,
      response: {
        cursor_context: o
      }
    });
  }
  if (e.type === "ACTIVATE_CURSOR_CONTEXT") {
    let r = e.payload.tabId;
    if (e.payload.tabId === void 0) {
      const o = (await zt(t))?.id;
      if (!o)
        return n({ error: "Tab not found" });
      r = o;
    }
    return Ne({ tabId: r }).info("Activating cursor context", r), await ex(r), n({ success: !0 });
  }
  if (e.type === "DEACTIVATE_CURSOR_CONTEXT") {
    let r = e.payload.tabId;
    if (e.payload.tabId === void 0) {
      const o = (await zt(t))?.id;
      if (!o)
        return n({ error: "Tab not found" });
      r = o;
    }
    return Ne({ tabId: r }).info("Deactivating cursor context", r), await tx(r), n({ success: !0 });
  }
  if (e.type == "DEACTIVATE_SCREENSHOT_TOOL") {
    let r = e.payload.tabId;
    if (e.payload.tabId === void 0) {
      const o = (await zt(t))?.id;
      if (!o)
        return n({ error: "Tab not found" });
      r = o;
    }
    return Ne({ tabId: r }).info("Canceling screenshot", r), await XR(r), n({ success: !0 });
  }
  if (e.type === "MOVE_THREAD_TO_SIDECAR") {
    const r = t.tab?.id, {
      active_task_uuid: s,
      is_mission_control: o,
      is_subagent: i,
      entry_id: a,
      thread_url_slug: c,
      reason: u,
      animate: d,
      take_focus: l,
      auto_opened: f = !0
      // TODO: Refactor in favor of match and general typecast by message type
    } = e.payload;
    W.info("[MOVE_THREAD_TO_SIDECAR] Request received", {
      tabId: r,
      activeTaskUuid: s,
      entryId: a,
      threadUrlSlug: c,
      reason: u,
      windowId: t.tab?.windowId,
      isSubagent: i
    });
    const p = (await chrome.windows.get(t.tab?.windowId ?? -1)).sidecarTabId, h = t.tab;
    if (!h)
      return W.warn("[MOVE_THREAD_TO_SIDECAR] Sender tab not found, cannot move thread", {
        tabId: r,
        activeTaskUuid: s,
        reason: u
      }), n({
        success: !1,
        error: "No sender tab found"
      });
    const { index: m, splitId: g, tabType: y = "normal" } = h, _ = Te.get(p);
    if (!_)
      return W.warn("[MOVE_THREAD_TO_SIDECAR] Sidecar port not found, cannot move thread", {
        tabId: r,
        activeTaskUuid: s,
        reason: u
      }), n({
        success: !1,
        error: "No sidecar port found"
      });
    const w = await $l(s);
    if (s && w.length === 0)
      return W.warn("[MOVE_THREAD_TO_SIDECAR] No task tabs found, cannot move thread", {
        tabId: r,
        activeTaskUuid: s,
        reason: u
      }), n({
        success: !1,
        error: "No task tabs found"
      });
    const E = w.map((b) => b.id);
    await Promise.all(
      E.map((b) => Zn(b, { opened: "opened" }))
    );
    let S = t.tab?.url;
    o && (S = new URL(
      `/search/${c}`,
      t.tab?.url || "https://www.perplexity.ai"
    ).toString());
    try {
      if (!o && (await chrome.perplexity.sidecar.open({
        windowId: t.tab?.windowId,
        animate: d,
        takeFocus: l
      }), r && y === "normal")) {
        const b = await Pe(r), T = b ? await wo(b) : void 0;
        await Zn(r, { opened: "opened", autoOpened: f }), T?.id && await Zn(T.id, {
          opened: "opened",
          autoOpened: f
        });
      }
      _?.postMessage({
        type: "MOVE_THREAD_TO_SIDECAR",
        payload: {
          url: S,
          task_tab_ids: E,
          sidecar_url: e.payload.sidecar_url,
          auto_opened: f,
          thread_id: r?.toString(),
          thread_url_slug: c
        }
      });
    } catch (b) {
      return W.error("[MOVE_THREAD_TO_SIDECAR] Failed to open sidecar", b, {
        tabId: r,
        activeTaskUuid: s,
        reason: u
      }), n({
        success: !1,
        error: "Failed to open sidecar"
      });
    }
    return await Promise.all(
      w.map(async (b) => {
        const T = t.tab?.windowId;
        o || i ? await Ot(
          b.id,
          {
            active: !0,
            muted: !1
          },
          {
            hidden: !1
          }
        ) : (g || await Ot(
          r,
          {
            active: !1
          },
          {
            hidden: !0
          }
        ), chrome.tabs.move(b.id, {
          index: m,
          windowId: T
        }).then(() => {
          g && chrome.tabs.update(r, {
            hidden: !0,
            active: !1
          });
        }));
      })
    ), s && bt.get(s)?.makeVisible(), W.info("[MOVE_THREAD_TO_SIDECAR] Request processed", {
      tabId: r,
      activeTaskUuid: s,
      reason: u
    }), n({
      success: !0
    });
  }
  if (e.type === "MOVE_SIDECAR_TO_THREAD") {
    const r = t.tab?.id, { tab_id: s } = e.payload, o = Ne({ tabId: r });
    o.info("[MOVE_SIDECAR_TO_THREAD] Request received", {
      targetTabId: s
    });
    try {
      const i = t.tab?.url ?? "", c = new URL(i).pathname.replace(/^\/sidecar/, ""), u = new URL(i);
      u.pathname = c;
      const d = await Pe(s);
      if (d) {
        await Zn(s, {
          opened: "closed",
          autoOpened: !1
        });
        const l = await wo(d);
        l?.id && await Zn(l.id, {
          opened: "closed",
          autoOpened: !1
        });
      }
      await Ot(
        s,
        {
          url: u.toString(),
          active: !0,
          muted: !1
        },
        { hidden: !1, navigation_history: !0 }
      );
      try {
        await chrome.perplexity.sidecar.close();
      } catch (l) {
        o.warn("[MOVE_SIDECAR_TO_THREAD] Failed to close sidecar", l);
      }
      return o.info("[MOVE_SIDECAR_TO_THREAD] Request processed", {
        targetTabId: s
      }), n({ success: !0 });
    } catch (i) {
      return o.error("[MOVE_SIDECAR_TO_THREAD] Failed", i, {
        targetTabId: s
      }), n({
        success: !1,
        error: "Failed to move sidecar to thread"
      });
    }
  }
  if (e.type === "GET_SIDECAR_AUTO_OPENED") {
    const r = Ne({ tabId: t.tab?.id });
    let s = !1, o;
    if (t.tab?.windowId) {
      const i = await chrome.tabs.query({
        windowId: t.tab.windowId
      });
      for (const a of i)
        if (!(!a.id || !a.payload))
          try {
            const c = JSON.parse(a.payload);
            if (c.auto_opened !== void 0) {
              o = a.id, s = c.auto_opened ?? !1;
              break;
            }
          } catch {
          }
    }
    return r.info("[GET_SIDECAR_AUTO_OPENED] Read from source tab payload", {
      sidecarTabId: t.tab?.id,
      sourceTabId: o,
      autoOpened: s
    }), n({
      success: !0,
      auto_opened: s
    });
  }
  if (e.type === "GET_TASK_TABS") {
    try {
      const r = await $l(), o = (await nx(r)).map((i) => {
        try {
          const a = i.payload ? JSON.parse(i.payload) : {};
          return i.id && i.url && i.lastAccessed && a.task_uuid ? {
            tabId: i.id,
            taskUuid: a.task_uuid,
            url: i.url,
            timestamp: i.lastAccessed
          } : null;
        } catch (a) {
          return W.debug("Failed to parse task tab payload", {
            tabId: i.id,
            error: a instanceof Error ? a.message : String(a)
          }), null;
        }
      }).filter((i) => i !== null);
      W.debug("Sending task tabs to frontend", {
        tabId: t.tab?.id,
        count: o.length
      }), t.tab?.id && Te.get(t.tab?.id)?.postMessage({
        type: "GET_TASK_TABS",
        payload: {
          tabs: o
        }
      });
    } catch (r) {
      return W.debug("Failed to send task tabs", {
        tabId: t.tab?.id,
        error: r instanceof Error ? r.message : String(r)
      }), n({
        success: !1,
        error: "Failed to send task tabs"
      });
    }
    return n({
      success: !0
    });
  }
  if (e.type === "MISSION_CONTROL_STATUS") {
    try {
      const r = e.payload;
      W.debug("[MISSION_CONTROL_STATUS] Processing request", {
        castedPayload: r
      }), await chrome.storage.local.set({
        [cn]: {
          numThreadsActive: r.num_threads_active,
          numThreadsBlocked: r.num_threads_blocked,
          numThreadsForReview: r.num_threads_for_review
        }
      }), t.tab?.windowId && Ia(t.tab?.windowId);
    } catch (r) {
      return W.debug("Failed to update mission control status", {
        error: r instanceof Error ? r.message : String(r)
      }), n({
        success: !1,
        error: "Failed to update mission control status"
      });
    }
    return n({
      success: !0
    });
  }
  if (e.type === "GET_MCP_TOOLS")
    return n(await ix(e));
  if (e.type === "CALL_MCP_TOOL")
    return n(await ax(e));
  if (e.type === "GET_STDIO_MCP_SERVERS")
    return n(await cx(e));
  if (e.type === "ADD_STDIO_MCP_SERVER")
    return n(await ux(e));
  if (e.type === "UPDATE_STDIO_MCP_SERVER")
    return n(await lx(e));
  if (e.type === "REMOVE_STDIO_MCP_SERVER")
    return n(await dx(e));
  if (e.type === "INSTALL_DXT")
    return n(await fx(e));
  if (e.type === "UNINSTALL_DXT")
    return n(await px(e));
  if (e.type === "GET_INSTALLED_DXT")
    return n(await hx(e));
  if (e.type === "HAS_PERMISSION")
    return n(await mx(e));
  if (e.type === "REQUEST_PERMISSION")
    return n(await gx(e));
  if (e.type === "GET_MANAGED_ORGANIZATION_UUID") {
    const r = await _e.getManagedOrganizationUUID();
    return n({
      success: !0,
      response: r ?? null
    });
  }
  if (e.type === "INSERT_INLINE_TEXT") {
    if (!t.tab?.id)
      return n({
        success: !1,
        error: "No sender tab found"
      });
    const { text: s } = e.payload, o = (await chrome.tabs.query({ active: !0, windowId: t.tab?.windowId }))[0]?.id;
    if (!o)
      return n({ success: !0, error: "No active tab id" });
    const i = await Mn(o);
    try {
      const c = await bh({ tabId: o }, s);
      return n({ success: c });
    } catch (a) {
      return W.error("[INSERT_INLINE_TEXT] Failed to insert text", a), n({ success: !1, error: a });
    } finally {
      await i();
    }
  }
  if (e.type === "OPEN_YOUTUBE_VIDEO")
    return Hx({ request: e, sender: t, sendResponse: n });
  if (e.type === "GET_ALL_COOKIES")
    try {
      const r = await chrome.cookies.getAll({});
      return n({
        success: !0,
        cookies: r
      });
    } catch (r) {
      return W.error("[GET_ALL_COOKIES] Failed to get cookies", r), n({
        success: !1,
        error: r instanceof Error ? r.message : "Failed to get cookies"
      });
    }
  return Ce({
    error: new Error(`Unknown request type: ${e.type}`),
    logger: W
  }), n({
    success: !1,
    response: {
      errorType: "unhandled",
      errorMessage: `Unknown request type: ${e.type}`
    }
  });
}, zx = "0.0.176", Kx = "pub4ecf63e3fd1ad28de1a9027c01181601", jx = 100;
function qx() {
  cA({
    clientToken: Kx,
    version: zx,
    env: "production",
    debug: !1,
    sessionSampleRate: jx,
    service: "agent-extension"
  });
}
Ib();
qx();
Qr.init().catch((e) => {
  Ce({ error: e, logger: W });
});
chrome.runtime.onMessageExternal.addListener(
  // Called from Perplexity Ask page
  (e, t, n) => (go(Gx)(e, t, n), !0)
);
chrome.runtime.onMessage.addListener((e, t, n) => {
  if ([
    "CAPTURE_FULL_SCREENSHOT",
    "CAPTURE_VISIBLE_TAB",
    "CAPTURE_PARTIAL_SCREENSHOT",
    "BROWSER_TASK_STOP",
    "USER_SELECTION_CAPTURED",
    "OVERLAY_TASK_STOP",
    "BUTTON_RECT_CHANGE"
  ].includes(e.type) && !S0(e))
    return JR(e, t, n).catch((r) => {
      Ce({ error: r, logger: W }), n({
        error: r instanceof Error ? r.message : "Unknown error"
      });
    }), !0;
});
async function Xx(e) {
  if (!e.sender || !e.sender.url || !e.sender.tab?.id || e.name !== am)
    return !1;
  const t = e.sender.tab?.id;
  return Te.set(t, e), e.onDisconnect.addListener(() => {
    Te.delete(t);
  }), !0;
}
async function Yx(e) {
  try {
    const t = e.sender?.tab?.windowId, [n] = t ? await chrome.tabs.query({ active: !0, windowId: t }) : await chrome.tabs.query({ active: !0, lastFocusedWindow: !0 });
    if (n?.id && n.url) {
      e.postMessage({
        type: "ACTIVE_TAB_CHANGED",
        payload: {
          tabId: n.id,
          url: n.url,
          title: n.title ?? "",
          windowId: n.windowId
        }
      });
      const r = await chrome.perplexity?.voiceAssistant?.getVoiceAssistantAssociatedWindowId();
      await Th(r);
    }
  } catch (t) {
    W.debug("Failed to send initial active tab", {
      tabId: e.sender.tab?.id,
      error: t instanceof Error ? t.message : String(t)
    });
  }
}
chrome.runtime.onConnectExternal.addListener(
  go(async (e) => {
    await Xx(e) && await Yx(e);
  })
);
if (Ue) {
  if (chrome.runtime.onInstalled.addListener(async (t) => {
    W.info("[Update] Extension installed/updated", t);
    const n = t.reason === "update";
    if (t.reason, !n) return;
    P0(), (await chrome.tabs.query({})).filter(
      (s) => (
        // If tab's discarded, we can't inject
        !s.discarded && // Only inject in web pages and not internal pages or file:// or random urls
        (s.url?.startsWith("http://") || s.url?.startsWith("https://"))
      )
    ).forEach((s) => {
      const o = s.url, i = o.match(/https:\/\/(.*\.)?perplexity\.ai\/sidecar.*/) || o.match(/http:\/\/localhost:.*\/sidecar.*/), a = o.startsWith("https://docs.google.com/document"), c = (u) => {
        u instanceof Error && u.message.includes("Cannot access contents of the page") || W.warn("[content-script] Re-injection failed", u, {
          tabId: s.id,
          url: s.url
        });
      };
      i || (be(
        {
          target: { tabId: s.id },
          files: ["content.js"],
          injectImmediately: !0
        },
        "injectContentScript"
      ).catch(c), chrome.scripting.insertCSS({
        target: { tabId: s.id },
        files: ["content.css"]
      }).catch(c), be(
        {
          target: { tabId: s.id, allFrames: !0 },
          files: ["events.js"],
          injectImmediately: !0
        },
        "injectEventsScript"
      ).catch(c)), a && be(
        {
          target: { tabId: s.id, allFrames: !0 },
          files: ["google_docs_cs.js"],
          injectImmediately: !0
        },
        "injectGoogleDocsScript"
      ).catch(c);
    });
  }), ti)
    try {
      chrome.perplexity.system.onPing.addListener(() => {
        chrome.perplexity.system.pong().catch(() => {
          W.warn("[comet] Failed to send pong response");
        });
      });
    } catch (t) {
      W.error("[comet] Failed to register system ping listener", t);
    }
  fA && chrome.perplexity.mcp.onStdioServerChanged.addListener((t, n, r) => {
    const s = {
      type: "MCP_STDIO_SERVER_CHANGED",
      payload: { serverName: t, changes: n, server: r }
    };
    Te.forEach((o) => o.postMessage(s));
  }), pA && chrome.perplexity.mcp.onPersistedStdioServersLoaded.addListener(() => {
    const t = {
      type: "MCP_PERSISTED_STDIO_SERVERS_LOADED",
      payload: void 0
    };
    Te.forEach((n) => n.postMessage(t));
  }), hA && chrome.perplexity.mcp.onStdioServerAdded.addListener((t) => {
    const n = {
      type: "MCP_STDIO_SERVER_ADDED",
      payload: { server: t }
    };
    Te.forEach((r) => r.postMessage(n));
  }), mA && chrome.perplexity.mcp.onStdioServerRemoved.addListener((t) => {
    const n = {
      type: "MCP_STDIO_SERVER_REMOVED",
      payload: { serverName: t }
    };
    Te.forEach((r) => r.postMessage(n));
  }), chrome.runtime.onSuspend.addListener(() => {
    W.info("[Update] Extension suspend");
  }), chrome.runtime.onSuspendCanceled.addListener(() => {
    W.info("[Update] Extension suspend canceled");
  });
  let e = !1;
  chrome.runtime.onUpdateAvailable.addListener((t) => {
    W.info("[Update] Extension update available", t), e = !0, bt.size === 0 && chrome.runtime.reload();
  }), setInterval(() => {
    if (e && bt.size === 0) {
      chrome.runtime.reload();
      return;
    }
    const t = performance.now() - Kh, n = 1800 * 1e3;
    if (t >= n && bt.size === 0) {
      setTimeout(() => {
        chrome.runtime.reload();
      }, 1e3);
      return;
    }
    chrome.runtime.getPlatformInfo().catch((r) => W.error("Failed to ping platform info", r));
  }, 25e3), chrome.tabs.onActivated.addListener(async (t) => {
    try {
      Ia(t.windowId), Sl(await chrome.tabs.get(t.tabId));
    } catch (n) {
      W.error("[Mission Control] Failed to update badge on tab switch", n);
    }
  }), chrome.tabs.onUpdated.addListener((t, { url: n, title: r }, s) => {
    try {
      if (!n && !r) return;
      s.active && Sl(s);
    } catch (o) {
      W.error("[Active Tab] Failed to broadcast tab update", o);
    }
  }), chrome.tabs.onRemoved.addListener(async (t, n) => {
    T0(t);
    try {
      Ia(n.windowId);
    } catch (r) {
      W.error("[Mission Control] Failed to update badge on tab close", r);
    }
  }), chrome.perplexity?.voiceAssistant?.onAssociatedWindowChanged?.addListener(
    Th
  );
}
const kc = /* @__PURE__ */ new WeakMap();
function wt(e) {
  return kc.has(e);
}
function Jx(e) {
  let t = e;
  for (; t; ) {
    if (!wt(t) && !lc(t))
      return !1;
    t = qo(t);
  }
  return !0;
}
function Ve(e) {
  return kc.get(e);
}
function Qx(e, t) {
  kc.set(e, t);
}
function Cc(e, t) {
  const n = e.tagName, r = e.value;
  if (_s(e, t)) {
    const s = e.type;
    return n === "INPUT" && (s === "button" || s === "submit" || s === "reset") ? r : !r || n === "OPTION" ? void 0 : qt;
  }
  if (n === "OPTION" || n === "SELECT")
    return e.value;
  if (!(n !== "INPUT" && n !== "TEXTAREA"))
    return r;
}
const Zx = /url\((?:(')([^']*)'|(")([^"]*)"|([^)]*))\)/gm, eO = /^[A-Za-z]+:|^\/\//, tO = /^["']?data:.*,/i;
function nO(e, t) {
  return e.replace(Zx, (n, r, s, o, i, a) => {
    const c = s || i || a;
    if (!t || !c || eO.test(c) || tO.test(c))
      return n;
    const u = r || o || "";
    return `url(${u}${rO(c, t)}${u})`;
  });
}
function rO(e, t) {
  try {
    return ps(e, t).href;
  } catch {
    return e;
  }
}
const sO = /[^a-z1-6-_]/;
function jh(e) {
  const t = e.toLowerCase().trim();
  return sO.test(t) ? "div" : t;
}
function Kl(e, t) {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${e}' height='${t}' style='background-color:silver'%3E%3C/svg%3E`;
}
const _t = {
  FullSnapshot: 2,
  IncrementalSnapshot: 3,
  Meta: 4,
  Focus: 6,
  ViewEnd: 7,
  VisualViewport: 8,
  FrustrationRecord: 9
}, Pn = {
  Document: 0,
  DocumentType: 1,
  Element: 2,
  Text: 3,
  CDATA: 4,
  DocumentFragment: 11
}, Je = {
  Mutation: 0,
  MouseMove: 1,
  MouseInteraction: 2,
  Scroll: 3,
  ViewportResize: 4,
  Input: 5,
  TouchMove: 6,
  MediaInteraction: 7,
  StyleSheetRule: 8
  // CanvasMutation : 9,
  // Font : 10,
}, rt = {
  MouseUp: 0,
  MouseDown: 1,
  Click: 2,
  ContextMenu: 3,
  DblClick: 4,
  Focus: 5,
  Blur: 6,
  TouchStart: 7,
  TouchEnd: 9
}, jl = {
  Play: 0,
  Pause: 1
};
function qh(e) {
  if (!(e === void 0 || e.length === 0))
    return e.map((t) => {
      const n = t.cssRules || t.rules;
      return {
        cssRules: Array.from(n, (o) => o.cssText),
        disabled: t.disabled || void 0,
        media: t.media.length > 0 ? Array.from(t.media) : void 0
      };
    });
}
const oO = 1e6;
function Xh(e, t, n, r) {
  if (t === P.HIDDEN)
    return null;
  const s = e.getAttribute(n);
  if (t === P.MASK && n !== fc && !bp.includes(n) && n !== r.actionNameAttribute) {
    const o = e.tagName;
    switch (n) {
      // Mask Attribute text content
      case "title":
      case "alt":
      case "placeholder":
        return qt;
    }
    if (o === "IMG" && (n === "src" || n === "srcset")) {
      const i = e;
      if (i.naturalWidth > 0)
        return Kl(i.naturalWidth, i.naturalHeight);
      const { width: a, height: c } = e.getBoundingClientRect();
      return a > 0 || c > 0 ? Kl(a, c) : Mu;
    }
    if (o === "SOURCE" && (n === "src" || n === "srcset"))
      return Mu;
    if (o === "A" && n === "href" || s && n.startsWith("data-") || o === "IFRAME" && n === "srcdoc")
      return qt;
  }
  return !s || typeof s != "string" ? s : pp(s, oO);
}
function Ac() {
  return {
    cssText: {
      count: 0,
      max: 0,
      sum: 0
    },
    serializationDuration: {
      count: 0,
      max: 0,
      sum: 0
    }
  };
}
function To(e, t, n) {
  e[t].count += 1, e[t].max = Math.max(e[t].max, n), e[t].sum += n;
}
function iO(e, t) {
  for (const n of ["cssText", "serializationDuration"])
    e[n].count += t[n].count, e[n].max = Math.max(e[n].max, t[n].max), e[n].sum += t[n].sum;
}
function aO(e, t, n) {
  if (t === P.HIDDEN)
    return {};
  const r = {}, s = jh(e.tagName), o = e.ownerDocument;
  for (let d = 0; d < e.attributes.length; d += 1) {
    const f = e.attributes.item(d).name, p = Xh(e, t, f, n.configuration);
    p !== null && (r[f] = p);
  }
  if (e.value && (s === "textarea" || s === "select" || s === "option" || s === "input")) {
    const d = Cc(e, t);
    d !== void 0 && (r.value = d);
  }
  if (s === "option" && t === P.ALLOW) {
    const d = e;
    d.selected && (r.selected = d.selected);
  }
  if (s === "link") {
    const d = Array.from(o.styleSheets).find((f) => f.href === e.href), l = Oa(d);
    l && d && (To(n.serializationContext.serializationStats, "cssText", l.length), r._cssText = l);
  }
  if (s === "style" && e.sheet) {
    const d = Oa(e.sheet);
    d && (To(n.serializationContext.serializationStats, "cssText", d.length), r._cssText = d);
  }
  const i = e;
  if (s === "input" && (i.type === "radio" || i.type === "checkbox") && (t === P.ALLOW ? r.checked = !!i.checked : _s(i, t) && delete r.checked), s === "audio" || s === "video") {
    const d = e;
    r.rr_mediaState = d.paused ? "paused" : "played";
  }
  let a, c;
  const u = n.serializationContext;
  switch (u.status) {
    case 0:
      a = Math.round(e.scrollTop), c = Math.round(e.scrollLeft), (a || c) && u.elementsScrollPositions.set(e, { scrollTop: a, scrollLeft: c });
      break;
    case 1:
      u.elementsScrollPositions.has(e) && ({ scrollTop: a, scrollLeft: c } = u.elementsScrollPositions.get(e));
      break;
  }
  return c && (r.rr_scrollLeft = c), a && (r.rr_scrollTop = a), r;
}
function Oa(e) {
  if (!e)
    return null;
  let t;
  try {
    t = e.rules || e.cssRules;
  } catch {
  }
  if (!t)
    return null;
  const n = Array.from(t, Bb() ? cO : Yh).join("");
  return nO(n, e.href);
}
function cO(e) {
  if (lO(e) && e.selectorText.includes(":")) {
    const t = /(\[[\w-]+[^\\])(:[^\]]+\])/g;
    return e.cssText.replace(t, "$1\\$2");
  }
  return Yh(e);
}
function Yh(e) {
  return uO(e) && Oa(e.styleSheet) || e.cssText;
}
function uO(e) {
  return "styleSheet" in e;
}
function lO(e) {
  return "selectorText" in e;
}
function Rc(e, t) {
  const n = pO(e, t);
  if (!n)
    return null;
  const r = Ve(e) || fO(), s = n;
  return s.id = r, Qx(e, r), t.serializedNodeIds && t.serializedNodeIds.add(r), s;
}
let dO = 1;
function fO() {
  return dO++;
}
function xc(e, t) {
  const n = [];
  return yp(e, (r) => {
    const s = Rc(r, t);
    s && n.push(s);
  }), n;
}
function pO(e, t) {
  switch (e.nodeType) {
    case e.DOCUMENT_NODE:
      return hO(e, t);
    case e.DOCUMENT_FRAGMENT_NODE:
      return mO(e, t);
    case e.DOCUMENT_TYPE_NODE:
      return gO(e);
    case e.ELEMENT_NODE:
      return yO(e, t);
    case e.TEXT_NODE:
      return bO(e, t);
    case e.CDATA_SECTION_NODE:
      return wO();
  }
}
function hO(e, t) {
  return {
    type: Pn.Document,
    childNodes: xc(e, t),
    adoptedStyleSheets: qh(e.adoptedStyleSheets)
  };
}
function mO(e, t) {
  const n = lc(e);
  return n && t.serializationContext.shadowRootsController.addShadowRoot(e), {
    type: Pn.DocumentFragment,
    childNodes: xc(e, t),
    isShadowRoot: n,
    adoptedStyleSheets: n ? qh(e.adoptedStyleSheets) : void 0
  };
}
function gO(e) {
  return {
    type: Pn.DocumentType,
    name: e.name,
    publicId: e.publicId,
    systemId: e.systemId
  };
}
function yO(e, t) {
  const n = jh(e.tagName), r = _O(e) || void 0, s = Sp(Tp(e), t.parentNodePrivacyLevel);
  if (s === P.HIDDEN) {
    const { width: a, height: c } = e.getBoundingClientRect();
    return {
      type: Pn.Element,
      tagName: n,
      attributes: {
        rr_width: `${a}px`,
        rr_height: `${c}px`,
        [fc]: KT
      },
      childNodes: [],
      isSVG: r
    };
  }
  if (s === P.IGNORE)
    return;
  const o = aO(e, s, t);
  let i = [];
  if (LT(e) && // Do not serialize style children as the css rules are already in the _cssText attribute
  n !== "style") {
    let a;
    t.parentNodePrivacyLevel === s && t.ignoreWhiteSpace === (n === "head") ? a = t : a = {
      ...t,
      parentNodePrivacyLevel: s,
      ignoreWhiteSpace: n === "head"
    }, i = xc(e, a);
  }
  return {
    type: Pn.Element,
    tagName: n,
    attributes: o,
    childNodes: i,
    isSVG: r
  };
}
function _O(e) {
  return e.tagName === "svg" || e instanceof SVGElement;
}
function bO(e, t) {
  const n = Ip(e, t.ignoreWhiteSpace || !1, t.parentNodePrivacyLevel);
  if (n !== void 0)
    return {
      type: Pn.Text,
      textContent: n
    };
}
function wO() {
  return {
    type: Pn.CDATA,
    textContent: ""
  };
}
function EO(e, t, n) {
  const r = te(), s = Rc(e, {
    serializationContext: n,
    parentNodePrivacyLevel: t.defaultPrivacyLevel,
    configuration: t
  });
  return To(n.serializationStats, "serializationDuration", le(r, te())), s;
}
function Jh(e) {
  return !!e.changedTouches;
}
function Ss(e) {
  return e.composed === !0 && jo(e.target) ? e.composedPath()[0] : e.target;
}
const ql = 25;
function SO(e) {
  return Math.abs(e.pageTop - e.offsetTop - window.scrollY) > ql || Math.abs(e.pageLeft - e.offsetLeft - window.scrollX) > ql;
}
const TO = (e, t) => {
  const n = window.visualViewport, r = {
    layoutViewportX: e,
    layoutViewportY: t,
    visualViewportX: e,
    visualViewportY: t
  };
  if (n)
    SO(n) ? (r.layoutViewportX = Math.round(e + n.offsetLeft), r.layoutViewportY = Math.round(t + n.offsetTop)) : (r.visualViewportX = Math.round(e - n.offsetLeft), r.visualViewportY = Math.round(t - n.offsetTop));
  else return r;
  return r;
}, Qh = (e) => ({
  scale: e.scale,
  offsetLeft: e.offsetLeft,
  offsetTop: e.offsetTop,
  pageLeft: e.pageLeft,
  pageTop: e.pageTop,
  height: e.height,
  width: e.width
});
function at(e, t) {
  return {
    data: {
      source: e,
      ...t
    },
    type: _t.IncrementalSnapshot,
    timestamp: te()
  };
}
const vO = 50;
function IO(e, t) {
  const { throttled: n, cancel: r } = nn((o) => {
    const i = Ss(o);
    if (wt(i)) {
      const a = Zh(o);
      if (!a)
        return;
      const c = {
        id: Ve(i),
        timeOffset: 0,
        x: a.x,
        y: a.y
      };
      t(at(Jh(o) ? Je.TouchMove : Je.MouseMove, { positions: [c] }));
    }
  }, vO, {
    trailing: !1
  }), { stop: s } = He(e, document, [
    "mousemove",
    "touchmove"
    /* DOM_EVENT.TOUCH_MOVE */
  ], n, {
    capture: !0,
    passive: !0
  });
  return {
    stop: () => {
      s(), r();
    }
  };
}
function Zh(e) {
  let { clientX: t, clientY: n } = Jh(e) ? e.changedTouches[0] : e;
  if (window.visualViewport) {
    const { visualViewportX: r, visualViewportY: s } = TO(t, n);
    t = r, n = s;
  }
  if (!(!Number.isFinite(t) || !Number.isFinite(n)))
    return { x: t, y: n };
}
const Xl = {
  // Listen for pointerup DOM events instead of mouseup for MouseInteraction/MouseUp records. This
  // allows to reference such records from Frustration records.
  //
  // In the context of supporting Mobile Session Replay, we introduced `PointerInteraction` records
  // used by the Mobile SDKs in place of `MouseInteraction`. In the future, we should replace
  // `MouseInteraction` by `PointerInteraction` in the Browser SDK so we have an uniform way to
  // convey such interaction. This would cleanly solve the issue since we would have
  // `PointerInteraction/Up` records that we could reference from `Frustration` records.
  pointerup: rt.MouseUp,
  mousedown: rt.MouseDown,
  click: rt.Click,
  contextmenu: rt.ContextMenu,
  dblclick: rt.DblClick,
  focus: rt.Focus,
  blur: rt.Blur,
  touchstart: rt.TouchStart,
  touchend: rt.TouchEnd
};
function kO(e, t, n) {
  const r = (s) => {
    const o = Ss(s);
    if (dt(o, e.defaultPrivacyLevel) === P.HIDDEN || !wt(o))
      return;
    const i = Ve(o), a = Xl[s.type];
    let c;
    if (a !== rt.Blur && a !== rt.Focus) {
      const d = Zh(s);
      if (!d)
        return;
      c = { id: i, type: a, x: d.x, y: d.y };
    } else
      c = { id: i, type: a };
    const u = {
      id: n.getIdForEvent(s),
      ...at(Je.MouseInteraction, c)
    };
    t(u);
  };
  return He(e, document, Object.keys(Xl), r, {
    capture: !0,
    passive: !0
  });
}
const CO = 100;
function em(e, t, n, r = document) {
  const { throttled: s, cancel: o } = nn((a) => {
    const c = Ss(a);
    if (!c || dt(c, e.defaultPrivacyLevel) === P.HIDDEN || !wt(c))
      return;
    const u = Ve(c), d = c === document ? {
      scrollTop: pc(),
      scrollLeft: Bp()
    } : {
      scrollTop: Math.round(c.scrollTop),
      scrollLeft: Math.round(c.scrollLeft)
    };
    n.set(c, d), t(at(Je.Scroll, {
      id: u,
      x: d.scrollLeft,
      y: d.scrollTop
    }));
  }, CO), { stop: i } = ce(e, r, "scroll", s, {
    capture: !0,
    passive: !0
  });
  return {
    stop: () => {
      i(), o();
    }
  };
}
const AO = 200;
function RO(e, t) {
  const n = Vp(e).subscribe((r) => {
    t(at(Je.ViewportResize, r));
  });
  return {
    stop: () => {
      n.unsubscribe();
    }
  };
}
function xO(e, t) {
  const n = window.visualViewport;
  if (!n)
    return { stop: q };
  const { throttled: r, cancel: s } = nn(() => {
    t({
      data: Qh(n),
      type: _t.VisualViewport,
      timestamp: te()
    });
  }, AO, {
    trailing: !1
  }), { stop: o } = He(e, n, [
    "resize",
    "scroll"
    /* DOM_EVENT.SCROLL */
  ], r, {
    capture: !0,
    passive: !0
  });
  return {
    stop: () => {
      o(), s();
    }
  };
}
function OO(e, t) {
  return He(e, document, [
    "play",
    "pause"
    /* DOM_EVENT.PAUSE */
  ], (n) => {
    const r = Ss(n);
    !r || dt(r, e.defaultPrivacyLevel) === P.HIDDEN || !wt(r) || t(at(Je.MediaInteraction, {
      id: Ve(r),
      type: n.type === "play" ? jl.Play : jl.Pause
    }));
  }, {
    capture: !0,
    passive: !0
  });
}
function LO(e) {
  function t(s, o) {
    s && wt(s.ownerNode) && o(Ve(s.ownerNode));
  }
  const n = [
    We(CSSStyleSheet.prototype, "insertRule", ({ target: s, parameters: [o, i] }) => {
      t(s, (a) => e(at(Je.StyleSheetRule, {
        id: a,
        adds: [{ rule: o, index: i }]
      })));
    }),
    We(CSSStyleSheet.prototype, "deleteRule", ({ target: s, parameters: [o] }) => {
      t(s, (i) => e(at(Je.StyleSheetRule, {
        id: i,
        removes: [{ index: o }]
      })));
    })
  ];
  typeof CSSGroupingRule < "u" ? r(CSSGroupingRule) : (r(CSSMediaRule), r(CSSSupportsRule));
  function r(s) {
    n.push(We(s.prototype, "insertRule", ({ target: o, parameters: [i, a] }) => {
      t(o.parentStyleSheet, (c) => {
        const u = Yl(o);
        u && (u.push(a || 0), e(at(Je.StyleSheetRule, {
          id: c,
          adds: [{ rule: i, index: u }]
        })));
      });
    }), We(s.prototype, "deleteRule", ({ target: o, parameters: [i] }) => {
      t(o.parentStyleSheet, (a) => {
        const c = Yl(o);
        c && (c.push(i), e(at(Je.StyleSheetRule, {
          id: a,
          removes: [{ index: c }]
        })));
      });
    }));
  }
  return {
    stop: () => {
      n.forEach((s) => s.stop());
    }
  };
}
function Yl(e) {
  const t = [];
  let n = e;
  for (; n.parentRule; ) {
    const i = Array.from(n.parentRule.cssRules).indexOf(n);
    t.unshift(i), n = n.parentRule;
  }
  if (!n.parentStyleSheet)
    return;
  const s = Array.from(n.parentStyleSheet.cssRules).indexOf(n);
  return t.unshift(s), t;
}
function NO(e, t) {
  return He(e, window, [
    "focus",
    "blur"
    /* DOM_EVENT.BLUR */
  ], () => {
    t({
      data: { has_focus: document.hasFocus() },
      type: _t.Focus,
      timestamp: te()
    });
  });
}
function MO(e, t, n) {
  const r = e.subscribe(12, (s) => {
    var o, i;
    s.rawRumEvent.type === H.ACTION && s.rawRumEvent.action.type === Ko.CLICK && (!((i = (o = s.rawRumEvent.action.frustration) === null || o === void 0 ? void 0 : o.type) === null || i === void 0) && i.length) && "events" in s.domainContext && s.domainContext.events && s.domainContext.events.length && t({
      timestamp: s.rawRumEvent.date,
      type: _t.FrustrationRecord,
      data: {
        frustrationTypes: s.rawRumEvent.action.frustration.type,
        recordIds: s.domainContext.events.map((a) => n.getIdForEvent(a))
      }
    });
  });
  return {
    stop: () => {
      r.unsubscribe();
    }
  };
}
function PO(e, t) {
  const n = e.subscribe(5, () => {
    t({
      timestamp: te(),
      type: _t.ViewEnd
    });
  });
  return {
    stop: () => {
      n.unsubscribe();
    }
  };
}
function tm(e, t, n = document) {
  const r = e.defaultPrivacyLevel, s = /* @__PURE__ */ new WeakMap(), o = n !== document, { stop: i } = He(
    e,
    n,
    // The 'input' event bubbles across shadow roots, so we don't have to listen for it on shadow
    // roots since it will be handled by the event listener that we did add to the document. Only
    // the 'change' event is blocked and needs to be handled on shadow roots.
    o ? [
      "change"
      /* DOM_EVENT.CHANGE */
    ] : [
      "input",
      "change"
      /* DOM_EVENT.CHANGE */
    ],
    (d) => {
      const l = Ss(d);
      (l instanceof HTMLInputElement || l instanceof HTMLTextAreaElement || l instanceof HTMLSelectElement) && c(l);
    },
    {
      capture: !0,
      passive: !0
    }
  );
  let a;
  if (o)
    a = q;
  else {
    const d = [
      xr(HTMLInputElement.prototype, "value", c),
      xr(HTMLInputElement.prototype, "checked", c),
      xr(HTMLSelectElement.prototype, "value", c),
      xr(HTMLTextAreaElement.prototype, "value", c),
      xr(HTMLSelectElement.prototype, "selectedIndex", c)
    ];
    a = () => {
      d.forEach((l) => l.stop());
    };
  }
  return {
    stop: () => {
      a(), i();
    }
  };
  function c(d) {
    const l = dt(d, r);
    if (l === P.HIDDEN)
      return;
    const f = d.type;
    let p;
    if (f === "radio" || f === "checkbox") {
      if (_s(d, l))
        return;
      p = { isChecked: d.checked };
    } else {
      const m = Cc(d, l);
      if (m === void 0)
        return;
      p = { text: m };
    }
    u(d, p);
    const h = d.name;
    f === "radio" && h && d.checked && document.querySelectorAll(`input[type="radio"][name="${CSS.escape(h)}"]`).forEach((m) => {
      m !== d && u(m, { isChecked: !1 });
    });
  }
  function u(d, l) {
    if (!wt(d))
      return;
    const f = s.get(d);
    (!f || f.text !== l.text || f.isChecked !== l.isChecked) && (s.set(d, l), t(at(Je.Input, {
      id: Ve(d),
      ...l
    })));
  }
}
const DO = 100, UO = 16;
function FO(e) {
  let t = q, n = [];
  function r() {
    t(), e(n), n = [];
  }
  const { throttled: s, cancel: o } = nn(r, UO, {
    leading: !1
  });
  return {
    addMutations: (i) => {
      n.length === 0 && (t = zf(s, { timeout: DO })), n.push(...i);
    },
    flush: r,
    stop: () => {
      t(), o();
    }
  };
}
function nm(e, t, n, r) {
  const s = cp();
  if (!s)
    return { stop: q, flush: q };
  const o = FO((a) => {
    $O(a.concat(i.takeRecords()), e, t, n);
  }), i = new s(M(o.addMutations));
  return i.observe(r, {
    attributeOldValue: !0,
    attributes: !0,
    characterData: !0,
    characterDataOldValue: !0,
    childList: !0,
    subtree: !0
  }), {
    stop: () => {
      i.disconnect(), o.stop();
    },
    flush: () => {
      o.flush();
    }
  };
}
function $O(e, t, n, r) {
  const s = /* @__PURE__ */ new Map();
  e.filter((f) => f.type === "childList").forEach((f) => {
    f.removedNodes.forEach((p) => {
      rm(p, r.removeShadowRoot);
    });
  });
  const o = e.filter((f) => f.target.isConnected && Jx(f.target) && dt(f.target, n.defaultPrivacyLevel, s) !== P.HIDDEN), i = Ac(), { adds: a, removes: c, hasBeenSerialized: u } = BO(o.filter((f) => f.type === "childList"), n, i, r, s), d = VO(o.filter((f) => f.type === "characterData" && !u(f.target)), n, s), l = WO(o.filter((f) => f.type === "attributes" && !u(f.target)), n, s);
  !d.length && !l.length && !c.length && !a.length || t(at(Je.Mutation, { adds: a, removes: c, texts: d, attributes: l }), i);
}
function BO(e, t, n, r, s) {
  const o = /* @__PURE__ */ new Set(), i = /* @__PURE__ */ new Map();
  for (const h of e)
    h.addedNodes.forEach((m) => {
      o.add(m);
    }), h.removedNodes.forEach((m) => {
      o.has(m) || i.set(m, h.target), o.delete(m);
    });
  const a = Array.from(o);
  HO(a);
  const c = /* @__PURE__ */ new Set(), u = {
    status: 2,
    serializationStats: n,
    shadowRootsController: r
  }, d = [];
  for (const h of a) {
    if (f(h))
      continue;
    const m = dt(h.parentNode, t.defaultPrivacyLevel, s);
    if (m === P.HIDDEN || m === P.IGNORE)
      continue;
    const g = te(), y = Rc(h, {
      serializedNodeIds: c,
      parentNodePrivacyLevel: m,
      serializationContext: u,
      configuration: t
    });
    if (To(n, "serializationDuration", le(g, te())), !y)
      continue;
    const _ = qo(h);
    d.push({
      nextId: p(h),
      parentId: Ve(_),
      node: y
    });
  }
  const l = [];
  return i.forEach((h, m) => {
    wt(m) && l.push({
      parentId: Ve(h),
      id: Ve(m)
    });
  }), { adds: d, removes: l, hasBeenSerialized: f };
  function f(h) {
    return wt(h) && c.has(Ve(h));
  }
  function p(h) {
    let m = h.nextSibling;
    for (; m; ) {
      if (wt(m))
        return Ve(m);
      m = m.nextSibling;
    }
    return null;
  }
}
function VO(e, t, n) {
  var r;
  const s = [], o = /* @__PURE__ */ new Set(), i = e.filter((a) => o.has(a.target) ? !1 : (o.add(a.target), !0));
  for (const a of i) {
    if (a.target.textContent === a.oldValue)
      continue;
    const u = dt(qo(a.target), t.defaultPrivacyLevel, n);
    u === P.HIDDEN || u === P.IGNORE || s.push({
      id: Ve(a.target),
      // TODO: pass a valid "ignoreWhiteSpace" argument
      value: (r = Ip(a.target, !1, u)) !== null && r !== void 0 ? r : null
    });
  }
  return s;
}
function WO(e, t, n) {
  const r = [], s = /* @__PURE__ */ new Map(), o = e.filter((a) => {
    const c = s.get(a.target);
    return c && c.has(a.attributeName) ? !1 : (c ? c.add(a.attributeName) : s.set(a.target, /* @__PURE__ */ new Set([a.attributeName])), !0);
  }), i = /* @__PURE__ */ new Map();
  for (const a of o) {
    if (a.target.getAttribute(a.attributeName) === a.oldValue)
      continue;
    const u = dt(a.target, t.defaultPrivacyLevel, n), d = Xh(a.target, u, a.attributeName, t);
    let l;
    if (a.attributeName === "value") {
      const p = Cc(a.target, u);
      if (p === void 0)
        continue;
      l = p;
    } else typeof d == "string" ? l = d : l = null;
    let f = i.get(a.target);
    f || (f = {
      id: Ve(a.target),
      attributes: {}
    }, r.push(f), i.set(a.target, f)), f.attributes[a.attributeName] = l;
  }
  return r;
}
function HO(e) {
  e.sort((t, n) => {
    const r = t.compareDocumentPosition(n);
    return r & Node.DOCUMENT_POSITION_CONTAINED_BY ? -1 : r & Node.DOCUMENT_POSITION_CONTAINS || r & Node.DOCUMENT_POSITION_FOLLOWING ? 1 : r & Node.DOCUMENT_POSITION_PRECEDING ? -1 : 0;
  });
}
function rm(e, t) {
  jo(e) && t(e.shadowRoot), yp(e, (n) => rm(n, t));
}
function GO() {
  const e = /* @__PURE__ */ new WeakMap();
  return {
    set(t, n) {
      t === document && !document.scrollingElement || e.set(t === document ? document.scrollingElement : t, n);
    },
    get(t) {
      return e.get(t);
    },
    has(t) {
      return e.has(t);
    }
  };
}
const zO = (e, t, n) => {
  const r = /* @__PURE__ */ new Map(), s = {
    addShadowRoot: (o) => {
      if (r.has(o))
        return;
      const i = nm(t, e, s, o), a = tm(e, t, o), c = em(e, t, n, o);
      r.set(o, {
        flush: () => i.flush(),
        stop: () => {
          i.stop(), a.stop(), c.stop();
        }
      });
    },
    removeShadowRoot: (o) => {
      const i = r.get(o);
      i && (i.stop(), r.delete(o));
    },
    stop: () => {
      r.forEach(({ stop: o }) => o());
    },
    flush: () => {
      r.forEach(({ flush: o }) => o());
    }
  };
  return s;
};
function KO(e, t, n, r, s, o) {
  const i = (c, u) => {
    const { width: d, height: l } = Jo();
    o({
      data: {
        height: l,
        href: window.location.href,
        width: d
      },
      type: _t.Meta,
      timestamp: c
    }), o({
      data: {
        has_focus: document.hasFocus()
      },
      type: _t.Focus,
      timestamp: c
    });
    const f = Ac();
    o({
      data: {
        node: EO(document, r, {
          status: u,
          elementsScrollPositions: e,
          serializationStats: f,
          shadowRootsController: t
        }),
        initialOffset: {
          left: Bp(),
          top: pc()
        }
      },
      type: _t.FullSnapshot,
      timestamp: c
    }, f), window.visualViewport && o({
      data: Qh(window.visualViewport),
      type: _t.VisualViewport,
      timestamp: c
    });
  };
  i(
    te(),
    0
    /* SerializationContextStatus.INITIAL_FULL_SNAPSHOT */
  );
  const { unsubscribe: a } = n.subscribe(2, (c) => {
    s(), i(
      c.startClocks.timeStamp,
      1
      /* SerializationContextStatus.SUBSEQUENT_FULL_SNAPSHOT */
    );
  });
  return {
    stop: a
  };
}
function jO() {
  const e = /* @__PURE__ */ new WeakMap();
  let t = 1;
  return {
    getIdForEvent(n) {
      return e.has(n) || e.set(n, t++), e.get(n);
    }
  };
}
function qO(e) {
  const { emit: t, configuration: n, lifeCycle: r } = e;
  if (!t)
    throw new Error("emit function is required");
  const s = (f, p) => {
    t(f, p), Bo("record", { record: f });
    const h = e.viewHistory.findView();
    Bk(h.id);
  }, o = GO(), i = zO(n, s, o), { stop: a } = KO(o, i, r, n, c, s);
  function c() {
    i.flush(), d.flush();
  }
  const u = jO(), d = nm(s, n, i, document), l = [
    d,
    IO(n, s),
    kO(n, s, u),
    em(n, s, o, document),
    RO(n, s),
    tm(n, s),
    OO(n, s),
    LO(s),
    NO(n, s),
    xO(n, s),
    MO(r, s, u),
    PO(r, (f) => {
      c(), s(f);
    })
  ];
  return {
    stop: () => {
      i.stop(), l.forEach((f) => f.stop()), a();
    },
    flushMutations: c,
    shadowRootsController: i
  };
}
function XO(e, t, n, r) {
  const s = new FormData();
  s.append("segment", new Blob([e], {
    type: "application/octet-stream"
  }), `${t.session.id}-${t.start}`);
  const o = {
    raw_segment_size: r,
    compressed_segment_size: e.byteLength,
    ...t
  }, i = JSON.stringify(o);
  return s.append("event", new Blob([i], { type: "application/json" })), {
    data: s,
    bytesCount: e.byteLength,
    cssText: n.cssText,
    isFullSnapshot: t.index_in_view === 0,
    rawSize: r,
    recordCount: t.records_count,
    serializationDuration: n.serializationDuration
  };
}
function YO({ context: e, creationReason: t, encoder: n }) {
  let r = 0;
  const s = e.view.id, o = Fk(s), i = {
    start: 1 / 0,
    end: -1 / 0,
    creation_reason: t,
    records_count: 0,
    has_full_snapshot: !1,
    index_in_view: o,
    source: "browser",
    ...e
  }, a = Ac();
  $k(s);
  function c(d, l, f) {
    i.start = Math.min(i.start, d.timestamp), i.end = Math.max(i.end, d.timestamp), i.records_count += 1, i.has_full_snapshot || (i.has_full_snapshot = d.type === _t.FullSnapshot), l && iO(a, l);
    const p = n.isEmpty ? '{"records":[' : ",";
    n.write(p + JSON.stringify(d), (h) => {
      r += h, f(r);
    });
  }
  function u(d) {
    if (n.isEmpty)
      throw new Error("Empty segment flushed");
    n.write(`],${JSON.stringify(i).slice(1)}
`), n.finish((l) => {
      Vk(i.view.id, l.rawBytesCount), d(i, a, l);
    });
  }
  return { addRecord: c, flush: u };
}
const JO = 5 * Re;
let sm = 6e4;
function QO(e, t, n, r, s, o) {
  return ZO(e, () => eL(t.applicationId, n, r), s, o);
}
function ZO(e, t, n, r) {
  let s = {
    status: 0,
    nextSegmentCreationReason: "init"
  };
  const { unsubscribe: o } = e.subscribe(2, () => {
    a("view_change");
  }), { unsubscribe: i } = e.subscribe(11, (c) => {
    a(c.reason);
  });
  function a(c) {
    s.status === 1 && (s.segment.flush((u, d, l) => {
      const f = XO(l.output, u, d, l.rawBytesCount);
      vf(c) ? n.sendOnExit(f) : n.send(f);
    }), Be(s.expirationTimeoutId)), c !== "stop" ? s = {
      status: 0,
      nextSegmentCreationReason: c
    } : s = {
      status: 2
    };
  }
  return {
    addRecord: (c, u) => {
      if (s.status !== 2) {
        if (s.status === 0) {
          const d = t();
          if (!d)
            return;
          s = {
            status: 1,
            segment: YO({ encoder: r, context: d, creationReason: s.nextSegmentCreationReason }),
            expirationTimeoutId: Ie(() => {
              a("segment_duration_limit");
            }, JO)
          };
        }
        s.segment.addRecord(c, u, (d) => {
          d > sm && a("segment_bytes_limit");
        });
      }
    },
    stop: () => {
      a("stop"), o(), i();
    }
  };
}
function eL(e, t, n) {
  const r = t.findTrackedSession(), s = n.findView();
  if (!(!r || !s))
    return {
      application: {
        id: e
      },
      session: {
        id: r.id
      },
      view: {
        id: s.id
      }
    };
}
function tL(e, t) {
  if (!e.metricsEnabled)
    return { stop: q };
  const { unsubscribe: n } = t.subscribe((r) => {
    if (r.type === "failure" || r.type === "queue-full" || r.type === "success" && r.payload.isFullSnapshot) {
      const s = nL(r.type, r.bandwidth, r.payload);
      ms("Segment network request metrics", { metrics: s });
    }
  });
  return {
    stop: n
  };
}
function nL(e, t, n) {
  return {
    cssText: {
      count: n.cssText.count,
      max: n.cssText.max,
      sum: n.cssText.sum
    },
    isFullSnapshot: n.isFullSnapshot,
    ongoingRequests: {
      count: t.ongoingRequestCount,
      totalSize: t.ongoingByteCount
    },
    recordCount: n.recordCount,
    result: e,
    serializationDuration: {
      count: n.serializationDuration.count,
      max: n.serializationDuration.max,
      sum: n.serializationDuration.sum
    },
    size: {
      compressed: n.bytesCount,
      raw: n.rawSize
    }
  };
}
function rL(e) {
  const t = Gn();
  return {
    addRecord: (n) => {
      const r = e.findView();
      t.send("record", n, r.id);
    }
  };
}
function sL(e, t, n, r, s, o, i) {
  const a = [], c = (f) => {
    e.notify(14, { error: f }), Dt("Error reported to customer", { "error.message": f.message });
  }, u = i || Wo([t.sessionReplayEndpointBuilder], sm, c);
  let d;
  if (Et())
    ({ addRecord: d } = rL(r));
  else {
    const f = QO(e, t, n, r, u, s);
    d = f.addRecord, a.push(f.stop);
    const p = tL(o, u.observable);
    a.push(p.stop);
  }
  const { stop: l } = qO({
    emit: d,
    configuration: t,
    lifeCycle: e,
    viewHistory: r
  });
  return a.push(l), {
    stop: () => {
      a.forEach((f) => f());
    }
  };
}
const oL = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  startRecording: sL
}, Symbol.toStringTag, { value: "Module" }));
function iL(e) {
  let t = 0;
  for (const n of e)
    n.stackId !== void 0 && t++;
  return t;
}
const vo = /* @__PURE__ */ new Map();
function aL(e, t) {
  vo.set(t, e);
}
function cL(e) {
  return vo.get(e);
}
function Jl(e) {
  for (const t of vo.keys())
    t < e && vo.delete(t);
}
function uL({ rawRumEvent: e, startTime: t }) {
  if (e.type !== H.LONG_TASK)
    return;
  const n = e.long_task.id;
  aL(n, t);
}
function lL(e, t, n) {
  const r = {
    application: {
      id: t
    }
  };
  n && (r.session = {
    id: n
  });
  const { ids: s, names: o } = dL(e.views);
  s.length && (r.view = {
    id: s,
    name: o
  });
  const i = e.longTasks.map((a) => a.id).filter((a) => a !== void 0);
  return i.length && (r.long_task = { id: i }), r;
}
function dL(e) {
  const t = { ids: [], names: [] };
  for (const n of e)
    t.ids.push(n.viewId), n.viewName && t.names.push(n.viewName);
  return t.names = Array.from(new Set(t.names)), t;
}
const fL = (e, t, n) => {
  const { profilingEndpointBuilder: r, applicationId: s } = t, o = pL(e, t, n), i = mL(e, o), a = r.build("fetch", i);
  return Dt("Sending profile to public profiling intake", { profilingIntakeURL: a, applicationId: s, sessionId: n }), fetch(a, {
    body: i.data,
    method: "POST"
  });
};
function pL(e, t, n) {
  const r = $o(t), s = lL(e, t.applicationId, n), o = hL(r);
  return {
    ...s,
    attachments: ["wall-time.json"],
    start: new Date(e.startClocks.timeStamp).toISOString(),
    end: new Date(e.endClocks.timeStamp).toISOString(),
    family: "chrome",
    runtime: "chrome",
    format: "json",
    version: 4,
    // Ingestion event version (not the version application tag)
    tags_profiler: o.join(","),
    _dd: {
      clock_drift: Pd()
    }
  };
}
function hL(e) {
  return e.concat(["language:javascript", "runtime:chrome", "family:chrome", "host:browser"]);
}
function mL(e, t) {
  const n = new Blob([JSON.stringify(e)], {
    type: "application/json"
  }), r = new FormData();
  return r.append("event", new Blob([JSON.stringify(t)], { type: "application/json" }), "event.json"), r.append("wall-time.json", n, "wall-time.json"), { data: r, bytesCount: 0 };
}
const gL = {
  sendProfile: fL
}, yL = /\/(?![vV]\d{1,2}\/)([^/\d?]*\d+[^/?]*)/g;
function _L(e) {
  return e ? e.replace(yL, "/?") : "/";
}
const Ql = (e, t) => e || _L(t), om = {
  sampleIntervalMs: 10,
  // Sample stack trace every 10ms
  collectIntervalMs: 6e4,
  // Collect data every minute
  minProfileDurationMs: 5e3,
  // Require at least 5 seconds of profile data to reduce noise and cost
  minNumberOfSamples: 50
  // Require at least 50 samples (~500 ms) to report a profile to reduce noise and cost
};
function bL(e, t, n, r, s = om) {
  const o = rn(Q.LONG_ANIMATION_FRAME);
  let i;
  const a = [];
  let c = { state: "stopped" };
  function u(I) {
    c.state !== "running" && (i = I ? {
      startClocks: I.startClocks,
      viewId: I.id,
      viewName: Ql(I.name, document.location.pathname)
    } : void 0, a.push(ce(e, window, "visibilitychange", E).stop, ce(e, window, "beforeunload", S).stop), f());
  }
  async function d() {
    await h("stopped"), a.forEach((I) => I()), Jl(pe().relative), r.set({ status: "stopped", error_reason: void 0 });
  }
  function l(I) {
    if (I.state === "running")
      return {
        cleanupTasks: I.cleanupTasks,
        observer: I.observer
      };
    const A = [];
    let F;
    if (e.trackLongTasks) {
      F = new PerformanceObserver(_), F.observe({
        entryTypes: [b()]
      });
      const v = t.subscribe(12, (R) => {
        uL(R);
      });
      A.push(() => F?.disconnect()), A.push(v.unsubscribe);
    }
    const C = t.subscribe(2, (v) => {
      const R = {
        viewId: v.id,
        // Note: `viewName` is only filled when users use manual view creation via `startView` method.
        viewName: Ql(v.name, document.location.pathname),
        startClocks: v.startClocks
      };
      m(R), i = R;
    });
    return A.push(C.unsubscribe), {
      cleanupTasks: A,
      observer: F
    };
  }
  function f() {
    const I = Ge().Profiler;
    if (!I)
      throw r.set({ status: "error", error_reason: "not-supported-by-browser" }), new Error("RUM Profiler is not supported in this browser.");
    p(c).catch(ot);
    const { cleanupTasks: A, observer: F } = l(c);
    let C;
    try {
      C = new I({
        sampleInterval: s.sampleIntervalMs,
        // Keep buffer size at 1.5 times of minimum required to collect data for a profiling instance
        maxBufferSize: Math.round(s.collectIntervalMs * 1.5 / s.sampleIntervalMs)
      });
    } catch (v) {
      v instanceof Error && v.message.includes("disabled by Document Policy") ? (V.warn("[DD_RUM] Profiler startup failed. Ensure your server includes the `Document-Policy: js-profiling` response header when serving HTML pages.", v), r.set({ status: "error", error_reason: "missing-document-policy-header" })) : r.set({ status: "error", error_reason: "unexpected-exception" });
      return;
    }
    r.set({ status: "running", error_reason: void 0 }), c = {
      state: "running",
      startClocks: pe(),
      profiler: C,
      timeoutId: Ie(f, s.collectIntervalMs),
      longTasks: [],
      views: [],
      cleanupTasks: A,
      observer: F
    }, m(i), C.addEventListener("samplebufferfull", y);
  }
  async function p(I) {
    var A, F;
    if (I.state !== "running")
      return;
    w((F = (A = I.observer) === null || A === void 0 ? void 0 : A.takeRecords()) !== null && F !== void 0 ? F : []), Be(I.timeoutId), I.profiler.removeEventListener("samplebufferfull", y);
    const { startClocks: C, longTasks: v, views: R } = I, x = pe();
    await I.profiler.stop().then((j) => {
      const $ = pe(), ue = v.length > 0, O = le(C.timeStamp, $.timeStamp) < s.minProfileDurationMs, L = iL(j.samples) < s.minNumberOfSamples;
      !ue && (O || L) || (g(
        // Enrich trace with time and instance data
        Object.assign(j, {
          startClocks: C,
          endClocks: $,
          clocksOrigin: Ka(),
          longTasks: v,
          views: R,
          sampleInterval: s.sampleIntervalMs
        })
      ), Jl(x.relative));
    }).catch(ot);
  }
  async function h(I) {
    c.state === "running" && (c.cleanupTasks.forEach((A) => A()), await p(c), c = { state: I });
  }
  function m(I) {
    c.state !== "running" || !I || c.views.push(I);
  }
  function g(I) {
    var A;
    const F = (A = n.findTrackedSession()) === null || A === void 0 ? void 0 : A.id;
    gL.sendProfile(I, e, F).catch(ot);
  }
  function y() {
    f();
  }
  function _(I) {
    w(I.getEntries());
  }
  function w(I) {
    if (c.state === "running")
      for (const A of I) {
        if (A.duration < s.sampleIntervalMs)
          continue;
        const F = ds(A.startTime), C = cL(F.relative);
        c.longTasks.push({
          id: C,
          duration: A.duration,
          entryType: A.entryType,
          startClocks: F
        });
      }
  }
  function E() {
    document.visibilityState === "hidden" && c.state === "running" ? h("paused").catch(ot) : document.visibilityState === "visible" && c.state === "paused" && f();
  }
  function S() {
    f();
  }
  function b() {
    return o ? "long-animation-frame" : "longtask";
  }
  function T() {
    return c.state === "stopped";
  }
  function D() {
    return c.state === "running";
  }
  function k() {
    return c.state === "paused";
  }
  return { start: u, stop: d, isStopped: T, isRunning: D, isPaused: k };
}
const wL = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  DEFAULT_RUM_PROFILER_CONFIGURATION: om,
  createRumProfiler: bL
}, Symbol.toStringTag, { value: "Module" }));
//# sourceMappingURL=background.js.map
