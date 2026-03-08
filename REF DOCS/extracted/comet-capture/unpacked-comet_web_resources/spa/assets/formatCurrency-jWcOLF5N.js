const o=(r,t)=>{try{return new Intl.NumberFormat(t,{style:"currency",currency:r.toUpperCase(),currencyDisplay:"symbol"}).format(0).replace(/[0-9.,\s]/g,"").trim()||"$"}catch{return"$"}};export{o as g};
//# sourceMappingURL=https://pplx-static-sourcemaps.perplexity.ai/_spa/assets/formatCurrency-jWcOLF5N.js.map
