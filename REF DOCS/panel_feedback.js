var F=Object.defineProperty;var c=(o,e)=>{for(var t in e)F(o,t,{get:e[t],enumerable:!0})};var y={};c(y,{FeedbackButton:()=>n});import*as w from"./../../../core/host/host.js";import*as h from"./../../../core/i18n/i18n.js";import*as S from"./../../../core/platform/platform.js";import*as p from"./../helpers/helpers.js";import{html as C,render as E}from"./../../lit/lit.js";import"./../buttons/buttons.js";var $={feedback:"Feedback"},H=h.i18n.registerUIStrings("ui/components/panel_feedback/FeedbackButton.ts",$),P=h.i18n.getLocalizedString.bind(void 0,H),n=class extends HTMLElement{#o=this.attachShadow({mode:"open"});#e={feedbackUrl:S.DevToolsPath.EmptyUrlString};set data(e){this.#e=e,p.ScheduledRender.scheduleRender(this,this.#i)}#t(){w.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(this.#e.feedbackUrl)}#i(){if(!p.ScheduledRender.isScheduledRender(this))throw new Error("FeedbackButton render was not scheduled");E(C`
      <devtools-button
          @click=${this.#t}
          .iconName=${"review"}
          .variant=${"outlined"}
          .jslogContext=${"feedback"}
      >${P($.feedback)}</devtools-button>
      `,this.#o,{host:this})}};customElements.define("devtools-feedback-button",n);var U={};c(U,{PanelFeedback:()=>s});import"./../../legacy/legacy.js";import*as f from"./../../../core/i18n/i18n.js";import*as m from"./../../../core/platform/platform.js";import*as k from"./../helpers/helpers.js";import{html as I,render as _}from"./../../lit/lit.js";import*as x from"./../../visual_logging/visual_logging.js";var L=`:host{display:block}.preview{padding:12px 16px;border:1px solid var(--sys-color-divider);color:var(--sys-color-on-surface);font-size:13px;line-height:20px;border-radius:12px;margin:42px 0;letter-spacing:0.01em}h2{color:var(--sys-color-primary);font-size:13px;line-height:20px;letter-spacing:0.01em;margin:9px 0 14px;display:flex;align-items:center;gap:5px;font-weight:normal}h3{font-size:13px;line-height:20px;letter-spacing:0.04em;color:var(--sys-color-on-surface);margin-bottom:2px;font-weight:normal}.preview p{margin-bottom:24px}.thumbnail{height:92px}.video{display:flex;flex-flow:row wrap;gap:20px}x-link{color:var(--sys-color-primary);text-decoration-line:underline}x-link.quick-start-link{font-size:14px;line-height:22px;letter-spacing:0.04em}.video-description{min-width:min-content;flex-basis:min-content;flex-grow:1}@media (forced-colors: active){x-link{color:linktext}}
/*# sourceURL=${import.meta.resolve("./panelFeedback.css")} */`;var i={previewText:"Our team is actively working on this feature and we would love to know what you think.",previewTextFeedbackLink:"Send us your feedback.",previewFeature:"Preview feature",videoAndDocumentation:"Video and documentation"},M=f.i18n.registerUIStrings("ui/components/panel_feedback/PanelFeedback.ts",i),r=f.i18n.getLocalizedString.bind(void 0,M),q=new URL("../../../Images/preview_feature_video_thumbnail.svg",import.meta.url).toString(),s=class extends HTMLElement{#o=this.attachShadow({mode:"open"});#e={feedbackUrl:m.DevToolsPath.EmptyUrlString,quickStartUrl:m.DevToolsPath.EmptyUrlString,quickStartLinkText:""};set data(e){this.#e=e,k.ScheduledRender.scheduleRender(this,this.#t)}#t(){if(!k.ScheduledRender.isScheduledRender(this))throw new Error("PanelFeedback render was not scheduled");_(I`
      <style>${L}</style>
      <div class="preview">
        <h2 class="flex">
          <devtools-icon name="experiment" class="extra-large" style="color: var(--icon-primary);"></devtools-icon> ${r(i.previewFeature)}
        </h2>
        <p>${r(i.previewText)} <x-link href=${this.#e.feedbackUrl} jslog=${x.link("feedback").track({click:!0})}>${r(i.previewTextFeedbackLink)}</x-link></p>
        <div class="video">
          <div class="thumbnail">
            <img src=${q} role="presentation" />
          </div>
          <div class="video-description">
            <h3>${r(i.videoAndDocumentation)}</h3>
            <x-link class="quick-start-link" href=${this.#e.quickStartUrl} jslog=${x.link("css-overview.quick-start").track({click:!0})}>${this.#e.quickStartLinkText}</x-link>
          </div>
        </div>
      </div>
      `,this.#o,{host:this})}};customElements.define("devtools-panel-feedback",s);var R={};c(R,{PreviewToggle:()=>d});import"./../../legacy/legacy.js";import*as b from"./../../../core/i18n/i18n.js";import*as u from"./../../../core/root/root.js";import{html as l,nothing as v,render as z}from"./../../lit/lit.js";var T=`:host{display:block}.container{display:flex;flex-wrap:wrap;padding:4px}.feedback,
.learn-more{display:flex;align-items:center}.helper{flex-basis:100%;text-align:center;font-style:italic}.spacer{flex:1}.x-link{color:var(--sys-color-primary);text-decoration-line:underline;margin:0 4px}.feedback .x-link{color:var(--sys-color-token-subtle)}
/*# sourceURL=${import.meta.resolve("./previewToggle.css")} */`;var a={previewTextFeedbackLink:"Send us your feedback.",shortFeedbackLink:"Send feedback",learnMoreLink:"Learn More"},D=b.i18n.registerUIStrings("ui/components/panel_feedback/PreviewToggle.ts",a),g=b.i18n.getLocalizedString.bind(void 0,D),d=class extends HTMLElement{#o=this.attachShadow({mode:"open"});#e="";#t=null;#i=null;#n;#r="";#s;set data(e){this.#e=e.name,this.#t=e.helperText,this.#i=e.feedbackURL,this.#n=e.learnMoreURL,this.#r=e.experiment,this.#s=e.onChangeCallback,this.#l()}#l(){let e=u.Runtime.experiments.isEnabled(this.#r);z(l`
      <style>${T}</style>
      <div class="container">
          <devtools-checkbox
            ?checked=${e}
            @change=${this.#a}
            aria-label=${this.#e} >
            <devtools-icon name="experiment" class="medium">
          </devtools-icon>${this.#e}
          </devtools-checkbox>
        <div class="spacer"></div>
        ${this.#i&&!this.#t?l`<div class="feedback"><x-link class="x-link" href=${this.#i}>${g(a.shortFeedbackLink)}</x-link></div>`:v}
        ${this.#n?l`<div class="learn-more"><x-link class="x-link" href=${this.#n}>${g(a.learnMoreLink)}</x-link></div>`:v}
        <div class="helper">
          ${this.#t&&this.#i?l`<p>${this.#t} <x-link class="x-link" href=${this.#i}>${g(a.previewTextFeedbackLink)}</x-link></p>`:v}
        </div>
      </div>`,this.#o,{host:this})}#a(e){let t=e.target.checked;u.Runtime.experiments.setEnabled(this.#r,t),this.#s?.(t)}};customElements.define("devtools-preview-toggle",d);export{y as FeedbackButton,U as PanelFeedback,R as PreviewToggle};
//# sourceMappingURL=panel_feedback.js.map
