import{m as f}from"./ask-input-bElm95Z5.js";import{s as g,l as y,a as b}from"./platform-core-CZ-8UOca.js";import{Q as l,u as w}from"./react-query-DghsyKOG.js";import{b as c,a as p}from"./ProtectedSettingsPageGate-BqHhFCYp.js";import{u as v}from"./experimentation-AW3antsu.js";import{a as e}from"./i18n-Bsk3q6Ci.js";const E=t=>l.makeQueryKey("/rest/user/get_user_pro_perk",t),k=()=>l.makeQueryKey("/rest/user/get_all_active_perks"),P=async({headers:t,reason:r})=>{const{data:o,error:i,response:s}=await g.GET("/rest/user/get_all_active_perks",r,{headers:t,timeoutMs:1e4});if(i)throw y.error("Failed to get all active perks",i),new b("API_CLIENTS_ERROR",{message:"Failed to get all active perks",cause:i,status:s.status??0});return o??[]},x=({reason:t,enabled:r})=>w({queryKey:k(),queryFn:async()=>await P({reason:t}),enabled:r}),M={type:"unauthorized",redirectTo:"/account/details"},n={type:"unauthorized",redirectTo:"/account/pro-perks"};function u({userOrgData:t}){const r=!!t.isEnterprise,o=t.organization?.uuid??"",i=v({flag:"pro-perks-settings-flag",defaultValue:!1,subjectType:"user_nextauth_id",extraAttributes:{isEnterprise:r??!1,orgUUID:o}});return t.isLoading||i.loading?c:i.value?p:M}function D({userOrgData:t}){return u({userOrgData:t})}function I({userOrgData:t,perkName:r}){const o=u({userOrgData:t}),{hasAccessToProFeatures:i}=f(),{data:s,isLoading:d}=x({enabled:o.type==="authorized",reason:"pro-perks-detail-access"});if(o.type!=="authorized")return o;if(d)return c;const h=r.toUpperCase();return!(s?.some(m=>m.perk_type===h)??!1)||(r==="oura"||r==="function")&&!i?n:p}const G={chase:"jpmc"},T={TURBOTAX:{imageSrc:"https://r2cdn.perplexity.ai/turbotax.svg",perkURL:"https://turbotax.intuit.com/lp/ppc/perplexity/?priorityCode=6099001501",supportURL:"https://turbotax.intuit.com/support/",perkName:"turbotax",partnerHomePageUrl:"https://turbotax.intuit.com/"},THUMBTACK:{imageSrc:"https://r2cdn.perplexity.ai/thumbtack.svg",perkURL:"https://www.thumbtack.com/content/perplexity/?utm_medium=partnership&utm_source=cma-perplexity",supportURL:"https://help.thumbtack.com/",perkName:"thumbtack",partnerHomePageUrl:"https://www.thumbtack.com/"},OURA:{imageSrc:"https://r2cdn.perplexity.ai/oura.svg",perkURL:"https://ouraring.com/perplexity",supportURL:"https://support.ouraring.com/",perkName:"oura",partnerHomePageUrl:"https://ouraring.com/"},LEGALZOOM:{imageSrc:"https://r2cdn.perplexity.ai/legalzoom.svg",perkURL:"https://legalzoomcominc.pxf.io/PPLX_PRO",supportURL:"https://www.legalzoom.com/support",perkName:"legalzoom",partnerHomePageUrl:"https://legalzoomcominc.pxf.io/PPLX_FREE",proPartnerPageUrl:"https://legalzoomcominc.pxf.io/PPLX_PRO"},JPMC:{imageSrc:"https://r2cdn.perplexity.ai/chase.svg",perkURL:"https://www.chase.com/personal/mortgage/mortgage-offer.perplexity.html?SourceCode=OPER01&jp_aid=hf/corp/int/OPER01/chasecom",supportURL:"https://www.chase.com/digital/customer-service",perkName:"jpmc",prettyUrlSuffix:"jpmc",shouldRenderModalCtas:!1,partnerHomePageUrl:"https://www.chase.com/"},HEADSPACE:{imageSrc:"https://r2cdn.perplexity.ai/headspace.svg",perkURL:"https://www.headspace.com/",supportURL:"https://help.headspace.com/",perkName:"headspace",partnerHomePageUrl:"https://www.headspace.com/"},GOODRX:{imageSrc:"https://r2cdn.perplexity.ai/goodrx.svg",perkURL:"https://www.goodrx.com/gold",supportURL:"https://support.goodrx.com/",perkName:"goodrx",partnerHomePageUrl:"https://www.goodrx.com/"},FUNCTION:{imageSrc:"https://r2cdn.perplexity.ai/function-health.svg",perkURL:" https://www.functionhealth.com/a/perplexity",supportURL:"https://www.functionhealth.com/faq",perkName:"function",partnerHomePageUrl:"https://www.functionhealth.com/"},EZRA:{imageSrc:"https://r2cdn.perplexity.ai/ezra.svg",perkURL:"https://ezra.com/perplexity",supportURL:"https://www.ezra.com/faq",perkName:"ezra",partnerHomePageUrl:"https://ezra.com/"},CURSOR:{imageSrc:"https://r2cdn.perplexity.ai/cursor.svg",perkURL:"https://www.cursor.com/",supportURL:"https://docs.cursor.com/welcome",perkName:"cursor",partnerHomePageUrl:"https://www.cursor.com/"},AVIS_BUDGET:{imageSrc:"https://r2cdn.perplexity.ai/avis_budget_logo.svg",perkURL:"https://mobility.carrental.com/en/perplexity/home.html",supportURL:"https://www.avis.com/en/customer-service",perkName:"avis_budget",partnerHomePageUrl:"https://www.avisbudgetgroup.com/",shouldRenderModalCtas:!1},VISA:{imageSrc:"",perkURL:"https://www.visa.com/",supportURL:"https://www.visa.com/en_us/support.html",perkName:"visa",partnerHomePageUrl:"https://www.visa.com/"},PERPLEXITY_TRAVEL:{imageSrc:"https://r2cdn.perplexity.ai/perplexity_dark_square.svg",perkURL:`https://www.perplexity.ai/search?q=${encodeURIComponent("hotels near me")}`,supportURL:"https://www.perplexity.ai/help-center/",perkName:"perplexity_travel",partnerHomePageUrl:"https://www.perplexity.ai/travel/"},PERPLEXITY_MERCH:{imageSrc:"https://r2cdn.perplexity.ai/perplexity_supply_square.svg",perkURL:"https://perplexity.supply/",supportURL:"https://help.perplexity.supply/en/",perkName:"perplexity_merch",partnerHomePageUrl:"https://perplexity.supply/"},VIATOR:{imageSrc:"https://r2cdn.perplexity.ai/viator.svg",perkURL:"https://www.viator.com/?pid=P00232854&mcid=42383&medium=link",supportURL:"https://www.viator.com/help/",perkName:"viator",partnerHomePageUrl:"https://www.viator.com/"},CALIBER:{imageSrc:"https://r2cdn.perplexity.ai/caliber_strong.svg",perkURL:"https://get.caliberstrong.com/partner/perplexity",supportURL:"https://caliberstrong.com/contact-us/",perkName:"caliber",partnerHomePageUrl:"https://www.caliberstrong.com/"},EIGHT_SLEEP:{imageSrc:"https://r2cdn.perplexity.ai/eight_sleep.svg",perkURL:"https://www.eightsleep.com/perplexity",supportURL:"https://www.eightsleep.com/support/",perkName:"eight_sleep",partnerHomePageUrl:"https://www.eightsleep.com/"},FIREFLIES:{imageSrc:"https://r2cdn.perplexity.ai/fireflies.svg",perkURL:"https://www.fireflies.ai/",supportURL:"https://guide.fireflies.ai/",perkName:"fireflies",partnerHomePageUrl:"https://www.fireflies.ai/"},FARMERS:{imageSrc:"https://r2cdn.perplexity.ai/farmers_logo.svg",perkURL:"https://farmersgroupquote.com/?MDRefCode=farmers-FYZ&tracking_codes=farmers-FYZ",supportURL:"https://www.farmers.com/contact-us/",perkName:"farmers",partnerHomePageUrl:"https://www.farmers.com/"},SAMSUNG:{imageSrc:"https://r2cdn.perplexity.ai/logos/samsung.svg",perkURL:"https://www.samsung.com/us/watches/galaxy-watch8-classic/buy/?cid=genai-ecomm-perplexity-wea-09172025",supportURL:"https://www.samsung.com/us/support/",perkName:"samsung",partnerHomePageUrl:"https://www.samsung.com/"},AVIS:{imageSrc:"https://r2cdn.perplexity.ai/logos/avis_logo.svg",perkURL:"https://www.avis.com/en/bridge/partner/perplexity/free-upgrade-pay-now",supportURL:"https://www.avis.com/en/customer-service",perkName:"avis",partnerHomePageUrl:"https://www.avis.com/"},BUDGET:{imageSrc:"https://r2cdn.perplexity.ai/logos/budget_logo.svg",perkURL:"https://www.budget.com/en/bridge/partner/perplexity/free-upgrade-pay-now",supportURL:"https://www.budget.com/en/customer-care",perkName:"budget",partnerHomePageUrl:"https://www.budget.com/"}},a=e({activate:{defaultMessage:"Activate",id:"VvkGJ6FDOd"},visitPartnerPage:{defaultMessage:"Visit Partner Page",id:"/rGJMQCbeu"},getStarted:{defaultMessage:"Get Started",id:"nxDKjr6Sy5"},startNow:{defaultMessage:"Start Now",id:"DMJgNDYMEL"}}),F={perplexity_merch:{...e({title:{defaultMessage:"Perplexity Merch",id:"TGZ6+Xrisd"},perkHeadline:{defaultMessage:"Get $25 off on Perplexity merchandise",id:"7Na02WVz8m"},about:{defaultMessage:"Quality goods made for curious minds. Designed in-house with a focus on minimalist aesthetics and meticulous attention to detail, Perplexity Supply creates everyday essentials that invite exploration, inspire learning, and spark discovery.",id:"WIoySs/6QN"}}),finePrintMarkdown:`**Disclaimer:**
    This discount is not applicable to Perplexity Pro Gift Subscriptions, and Perplexity reserves the right to exclude current and future products from this offer at our sole discretion, without prior notice.`,customCtaButtonText:a.getStarted,perkDescriptionMarkdown:`**Offer Details**

* $25 off on purchases of $100 or above on Perplexity merchandise
* Save on apparel, posters, coffee and more available on the Perplexity Supply store
* This discount is not applicable on Perplexity Pro Gift Subscription
* Valid through May 31, 2026

**How to use**

1. Offer available only to members with an active Perplexity Pro subscription
2. Valid for a one-time redemption per member
3. Use the below unique code during checkout at Perplexity Supply store
4. Click Perplexity Supply to head to our Supply store and claim this benefit`},viator:{...e({title:{defaultMessage:"Viator",id:"JMtYwMEqtn"},perkHeadline:{defaultMessage:"Get 12% off on Viator travel experiences",id:"nLSydPivUI"},about:{defaultMessage:"Viator, a Tripadvisor company, makes it easy to plan tours, activities, and excursions around the world. With 300,000+ experiences to choose from, there's always something new to discover and book — from simple tours to extreme adventures (and all the niche, interesting stuff in between). With ultimate flexibility, award-winning customer support, and millions of traveler reviews, you can truly do more with Viator.",id:"cZINkKeuGn"}}),customCtaButtonText:a.activate,perkDescriptionMarkdown:`**Offer Details**

* 12% off over 300,000 travel experiences with Viator worldwide
* Access tours, activities, and excursions in more than 200 countries
* Valid through May 31, 2026

**How to use**

1. Offer available only to members with an active Perplexity Pro subscription
2. Click Activate to be directed to Viator through your unique member link
3. The 12% discount will be automatically applied at checkout when you book through this link
4. You must be logged into your Viator account to complete your booking
5. This discount can be redeemed multiple times during your subscription period`},caliber:{...e({title:{defaultMessage:"Caliber",id:"FIfg1UP3s9"},perkHeadline:{defaultMessage:"Get 25% off Caliber fitness coaching",id:"+p9huanmLt"},about:{defaultMessage:"Caliber is a science-based strength training program offering personalized workouts, integrated tracking, nutrition guidance, and expert coaching—so you can train smarter, improve faster, and achieve lasting results.",id:"zfyqzEY4+t"}}),customCtaButtonText:a.activate,perkDescriptionMarkdown:`**Offer Details**

* Enjoy 25% off Caliber Plus or Caliber Premium Coaching
* Take the guesswork out of training with a proven, science-based approach
* Offer valid through May 31, 2026

**How to use**

* Available exclusively to active Perplexity Pro subscribers
* One-time redemption per member
* Choose your plan –– your 25% discount will be automatically applied at checkout
* Click Activate to get started and follow the steps to claim your offer`},eight_sleep:{...e({title:{defaultMessage:"Eight Sleep",id:"QuwVjJQnu/"},perkHeadline:{defaultMessage:"Get up to $400 off on Eight Sleep Pod",id:"0buPbCnuq3"},about:{defaultMessage:`Eight Sleep is the first company to bring sleep fitness to the world by combining technology, physiology, and data to unlock deeper sleep and better health. Its products are trusted by high performers, professional athletes, and health-conscious consumers across the globe. Recognized as one of Fast Company's Most Innovative Companies in 2019, 2022, and 2023, and twice named to TIME's "Best Inventions of the Year." Eight Sleep continues to redefine the future of sleep.`,id:"vXLLheXP9U"}}),perkDescriptionMarkdown:`**Offer Details**

- Exclusive launch savings: Up to $400 off the Eight Sleep Pod – $250 off Pod 5 Core and $400 off Pod 5 Ultra+ (valid through June 30, 2025)
- Standard benefit: Up to $350 off the Eight Sleep Pod – $200 off Pod 5 Core and $350 off Pod 5 Ultra+
- Experience personalized temperature control, zero-gravity elevation, and surround-sound that automatically adjusts throughout the night for optimal sleep
- Standard benefit valid through May 31, 2026

**How to use**

1. Offer available only to members with an active Perplexity Pro subscription
2. Valid for a one-time redemption per member
3. Apply your unique code at checkout on Eight Sleep
4. To claim your benefit, click Visit Partner Page`},oura:{...e({title:{defaultMessage:"Oura",id:"OVr6HrSrGk"},perkHeadline:{defaultMessage:"Get $50 off on select styles of Oura Ring 4 and complimentary 1 month Oura Membership",id:"dTvwOBQU8i"},about:{defaultMessage:"ŌURA is the company behind Oura Ring, a revolutionary smart ring designed to deliver personalized insights and daily guidance. The mission of ŌURA is to empower individuals to realize their inner potential. The company believes that health is a daily practice, and with the right insights and guidance, people can take control of their health to live a more balanced life.",id:"xpXz5NhHcx"},nonProHeadline:{defaultMessage:"Get a unique benefit on Oura Ring and Oura Membership",id:"F3P+3AemBY"}}),requiresPro:!0,customCtaButtonText:a.activate,perkDescriptionMarkdown:`**Offer Details**

1. $50 off the purchase of any Oura Ring
2. Includes one complimentary month of Oura Membership ($5.99/month value)
3. Valid through May 31, 2026

**How to use**

1. Available to active Perplexity Pro subscribers (monthly or annual)
2. Offer valid for a single redemption per member
3. To claim the offer, click on Activate.`,finePrintMarkdown:`**Disclaimer:**

*Offer valid limited time only and only on Oura Ring 4 in Silver, Black, Stealth, Brushed Silver, Gold, and Rose Gold finishes. While supplies last. Excludes all other products, styles, and finishes. Oura reserves the right to discontinue or modify this offer at any time. Offer not valid on gift cards, e-gift cards, taxes or shipping; other restrictions and limitations may apply. In the event of a return, refund shall not exceed amount paid. Offer may not be combined with other offers or discounts except as provided herein. Not transferable. Available in the United States only. Available online only at [ouraring.com](https://ouraring.com). Oura Terms and Conditions and Oura Privacy Policy apply. More details available at [Oura Terms and Conditions](https://ouraring.com/terms-and-conditions) and [Oura Privacy Policy](https://ouraring.com/privacy-policy).`},thumbtack:{...e({title:{defaultMessage:"Thumbtack",id:"GKI7EiijOa"},perkHeadline:{defaultMessage:"Get up to $275 off services on Thumbtack",id:"nBR424MKYU"},about:{defaultMessage:"Thumbtack is a technology company helping millions nationwide connect with local service professionals in more than 500 categories. From small repairs to major renovations, homeowners get access to Thumbtack's network of 300,000 local service businesses. With 12+ million 5-star projects, Thumbtack empowers homeowners to accomplish more.",id:"0J40Yet8wS"}}),freePerkDescriptionMarkdown:`**Offer Details**

1. $50 off your first service booked through Thumbtack
2. $25 off each of your next nine services
3. Total potential savings of up to $275
4. Valid on all services booked through Thumbtack
5. Offer available through May 31, 2026

**How to use**

1. Available only to members with an active Perplexity Pro subscription
2. To book your service on Thumbtack click on Activate
3. When your service is finished, pay your pro directly then submit your proof of payment using a rebate form.
4. Once approved, your rebate will be issued within 7 days of your request submission
5. Thumbtack will send the eligible rebate amount to your PayPal, Venmo, bank account, or another method of your choice through Hyperwallet`,perkDescriptionMarkdown:`**Offer Details**

1. $50 off your first service booked through Thumbtack
2. $25 off each of your next nine services
3. Total potential savings of up to $275
4. Valid on all services booked through Thumbtack
5. Offer available through May 31, 2026

**How to use**

1. Available only to members with an active Perplexity Pro subscription
2. To book your service on Thumbtack click on Activate
3. When your service is finished, pay your pro directly then submit your proof of payment using this [rebate form](https://form.feathery.app/to/cEBp7E#Credit%20Request).
4. Once approved, your rebate will be issued within 7 days of your request submission
5. Thumbtack will send the eligible rebate amount to your PayPal, Venmo, bank account, or another method of your choice through Hyperwallet`},turbotax:{...e({title:{defaultMessage:"TurboTax",id:"3BsXPvN5qr"},perkHeadline:{defaultMessage:"Get 25% off on TurboTax tax filing",id:"FSQv23X4vd"},about:{defaultMessage:"TurboTax is the leading online tax preparation platform, making filing easy, accurate, and secure, with personalized guidance and maximum refund guarantees.",id:"S2H4p+hItp"}}),perkDescriptionMarkdown:`**Offer Details**

1. 25% off on 2024 personal federal tax return filed with TurboTax
2. Includes TurboTax Online, TurboTax Live Assisted, or TurboTax Live Full Service
3. Valid through July 31, 2025
4. Additional terms apply*

**How to use**

1. Offer available only to members with an active Perplexity Pro subscription
2. Valid for a one-time redemption per member
3. Access TurboTax through your exclusive Perplexity Pro member redemption link below
4. To get started click, Activate`,finePrintMarkdown:`**Disclaimer**

**TurboTax Perplexity Offer:** Perplexity Pro subscribers are eligible to receive 25% off one 2024 personal federal tax return filed with TurboTax Online Do It Yourself, TurboTax Live Assisted, or TurboTax Live Full Service. Offer does not apply to state returns or other additional services. Excludes returns filed with any other TurboTax products, TurboTax Desktop, TurboTax Verified Pros and TurboTax Canada products. Must be redeemed by logging in or signing up for TurboTax through a TurboTax webpage on which this offer is presented. Limited to one offer per Perplexity Pro account. Cannot be combined with any other TurboTax offers. Intuit reserves the right to modify or terminate this offer at any time for any reason in its sole discretion. Must file personal taxes by July 31, 2025, 11:59 PM ET.`},legalzoom:{...e({title:{defaultMessage:"LegalZoom",id:"iDv70GOEGm"},perkHeadline:{defaultMessage:"Get 25% off LegalZoom services",id:"89ycIhZzbF"},about:{defaultMessage:"LegalZoom is a leading online legal service provider, offering individuals and small businesses efficient, step-by-step solutions for various legal needs. From business formation and compliance to estate plans and general legal support, the platform provides intuitive online tools and access to attorney guidance. LegalZoom has empowered over 9 million users to confidently manage their legal matters.",id:"xph0sw72rH"}}),customCtaButtonText:a.visitPartnerPage,perkDescriptionMarkdown:`**Offer Details**

1. 25% ongoing discount on LegalZoom's products and services
2. Offer is applicable on business formation, estate plans, intellectual property protection, legal document preparation and more
3. Valid through May 31, 2026

**How to use**

1. Benefit available only to members with an active Perplexity Pro subscription
2. Apply the below code at the time of checkout on LegalZoom
3. Click on Visit Partner Page to get started`},jpmc:{...e({title:{defaultMessage:"Chase Home Lending",id:"1uEMUB+AXP"},perkHeadline:{defaultMessage:"A $1,000 credit is yours at closing when you buy or refinance a home with Chase.",id:"v4pNifgq63"},about:{defaultMessage:"At Chase, the dedicated team of Home Lending Advisors plus the variety of resources and solutions can help make more-informed financial decisions, when buying or refinancing a home.",id:"kIp+KkwEq8"}}),customCtaButtonText:a.startNow,perkDescriptionMarkdown:`**Offer Details**

1. Perplexity Pro subscribers can get a $1,000 credit at closing on a new home purchase or refinance.
2. Plus, you may be able to combine your $1,000 credit with other Chase offers and discounts to save even more, if you qualify.
3. This offer isn't available at Chase branches.

**How to use**

1. To be eligible for this offer, you must have an active Perplexity Pro subscription at the time of your mortgage application.
2. The closing cost credit will be applied automatically at closing, you are responsible for the remaining closing costs.
3. Select "Start now" to begin your application through the site Chase customized for you.`,finePrintMarkdown:`**Disclaimer:**

The closing cost rebate will be applied automatically at closing. The customer is responsible for the remaining closing costs. This offer may not be combined with any other promotional offer or rebate except the Chase Closing Guarantee. This offer is available only to subscribers of our participating Corporate Partner(s), is not transferable, and is not available if the customer applies through a Chase branch. Customers will receive an email with a link to apply, and can only apply through that email. Other online applications will not be eligible for the closing cost rebate. The value of this offer may be considered miscellaneous income and may be reportable for tax purposes to you and the IRS. Consult your personal tax advisor for questions about the impact to personal income tax returns. This offer is subject to change at any time without prior notice.

**Important Notice to Servicemembers and Their Dependents:** A refinance may not be advantageous to you if you are currently eligible for benefits provided by the Servicemembers Civil Relief Act (SCRA). If you are an SCRA-eligible customer and have questions about the SCRA or about refinancing, please discuss with your Home Lending Advisor.

The amount you save on a refinanced mortgage may vary by loan. If a refinanced mortgage has a longer term than remains on your current loan, you will incur additional interest charges for the extended term.

All home lending products are subject to credit and property approval. Rates, program terms and conditions are subject to change without notice. Not all products are available in all states or for all amounts. Other restrictions and limitations apply.

Home lending products provided by JPMorgan Chase Bank, N.A. Member FDIC

![Chase EHO](https://r2cdn.perplexity.ai/EHO_Logo.png)
NMLS #399798
`},headspace:{...e({title:{defaultMessage:"Headspace",id:"F1IZgQNuOL"},perkHeadline:{defaultMessage:"Unlock 6 free months of Headspace",id:"Q3S0nXKocG"},about:{defaultMessage:"Headspace is a leading mental health app, bringing together meditation, mindfulness, therapy and coaching - all in one place. Guided by a team of mental health experts and Emmy award-winning storytellers, they deliver a science-backed care that helps millions around the world build resilience and feel better.",id:"GMDcq5LkF4"}}),shouldUseBulletedSteps:!0,customCtaButtonText:a.activate,perkDescriptionMarkdown:`**Offer Details**

* Enjoy 6 months of complimentary Headspace subscription for eligible users
* Access thousands of expert-led meditations, sleepcasts, focus playlists, and resilience-building resources
* Offer valid through May 2026

**How to use**

* Offer available only to new Headspace members with an active Perplexity Pro subscription
* Only one redemption per member
* Click on Activate to get started`},goodrx:{...e({title:{defaultMessage:"GoodRx",id:"/HPzmdFRKI"},perkHeadline:{defaultMessage:"4 free months of GoodRx Gold prescription savings",id:"1CW59QWr5z"},about:{defaultMessage:"GoodRx is a leading source for prescription drug savings, helping millions of people find affordable solutions for their healthcare needs. GoodRx Gold is a premium membership program delivering enhanced discounts on prescription medications.",id:"OIID/X2bxl"}}),perkDescriptionMarkdown:`**Offer Details**

1. Enjoy a 4-month free trial of GoodRx Gold membership; thereinafter, plans start at just $9.99/mo.
2. Access over 1,000 popular prescriptions for under $10 at leading pharmacies nationwide, including CVS, Albertsons, and Costco. Save up to $3,961 / yr in savings when you fill 2+ prescriptions a month.
3. Access GoodRx Care visits with licensed healthcare professionals, starting at just $19, and receive free home delivery for eligible prescription medications.

**How to use**

1. Available only to members with an active Perplexity Pro subscription
2. Apply the unique code below to claim your free trial
3. Code is valid for a one-time redemption per member
4. Click Visit Partner page to get started`},function:{...e({title:{defaultMessage:"Function Health",id:"G2wZKKop/s"},perkHeadline:{defaultMessage:"Unlock $50 toward your new Function Membership",id:"Nhqv2PUwET"},nonProHeadline:{defaultMessage:"Unlock credit toward your new Function Membership. Upgrade to Pro to view the offer.",id:"Kky81V1X7E"},about:{defaultMessage:"Function Health exists to empower individuals to live 100 healthy years. Through a single annual membership, Function’s members gain access to over 160+ advanced lab tests and full-body MRIs (at an additional cost)––offering a bigger picture of their health as it evolves.",id:"uay4mTmZn0"}}),requiresPro:!0,perkDescriptionMarkdown:`**Offer Details**

* $50 credit toward the first year of your Function Health membership
* Includes prepaid access to 160+ lab tests and access to full-body MRIs (additional cost applies)
* No insurance required
* Valid through May 2026

**How to use**

1. Benefit available only to members with an active Perplexity Pro subscription
2. One-time redemption per member
3. Click on Activate to get started and claim your credit`},ezra:{...e({title:{defaultMessage:"Ezra",id:"r/aVMbHi9p"},perkHeadline:{defaultMessage:"Get up to $700 off on Ezra cancer screening",id:"ZpphXQGIBt"},about:{defaultMessage:"Ezra AI, Inc. (“Ezra”) is a subsidiary of Function Health, Inc. Ezra is a leading provider of advanced medical imaging services, facilitating access to full-body MRI scans designed for early detection of potential health concerns. The cutting-edge scanning technology helps identify health issues before symptoms appear, allowing for proactive and preventive healthcare.",id:"b5lf2GLe7w"}}),perkDescriptionMarkdown:`**Offer Details**

- $500 off Full Body MRI, the first 22-minute scan powered by FDA-cleared-AI that screens for cancer and other conditions in up to 12 organs.
- $650 off Full Body MRI Plus, an advanced 47-minute MRI scan that includes spine imaging, and screens for 500+ health conditions––including various types of cancer.
- $700 off Full Body MRI Plus with CT, which adds a 5-minute Low Dose Chest CT Scan for lung screening to the Full Body Plus scan.
- All results reviewed by a clinician and accompanied by a detailed, easy-to-understand report.
- Offer valid through May 2026

**How to use**

- Offer available only to Perplexity members with an active Perplexity Pro subscription
- Only one redemption per member
- Click on Activate to access your unique redemption link
`},cursor:{...e({title:{defaultMessage:"Cursor",id:"BvS8fkHVs1"},perkHeadline:{defaultMessage:"Get 3 months of Cursor Pro for free",id:"5Z+N2IixO1"},about:{defaultMessage:"Cursor is the leading AI code editor that is used every day by engineers worldwide. The Pro plan offers unlimited completions, priority access to leading models, and advanced features that streamline and enhance your coding experience.",id:"G6MLaIHN71"}}),perkDescriptionMarkdown:`**Offer Details**

1. 3 months of [Cursor Pro](https://www.cursor.com/pricing) at no cost
2. Get 500 fast premium model requests per month
3. Access unlimited completions and slow premium model requests

**How to use**

1. Available only to members with an active Perplexity Pro subscription
2. One-time redemption per member
3. Click Activate to get started`},avis_budget:{...e({title:{defaultMessage:"Avis Budget",id:"8qDm2UWMdt"},perkHeadline:{defaultMessage:"Get up to 35% off base rates and a free car class upgrade with Avis and Budget",id:"xAEXw99vIJ"},about:{defaultMessage:"Avis and Budget are leading car rental providers offering a wide selection of vehicles for business and leisure travelers, with convenient locations across the U.S. and internationally.",id:"hHRdpfP2/L"}}),shouldUseBulletedSteps:!0,perkDescriptionMarkdown:`**Offer Details**

* Up to 35% off with Avis and up to 30% off with Budget car rentals on Pay Later rates
* Free one-time car class upgrade*
* Valid through May 2026

**How to use**

* Offer available only to members with an active Perplexity Pro subscription
* Access your discount using your unique redemption link
* Apply your free upgrade during the booking process
* To get started, click Activate`,finePrintMarkdown:`**Disclaimer**

* Standard taxes, fees, and surcharges still apply.
* Valid at participating locations throughout the U.S.
* Avis and Budget Terms and Conditions apply (see referenced landing page).
* Subject to availability`},visa:{...e({title:{defaultMessage:"Visa",id:"E1LAGJEtpj"},perkHeadline:{defaultMessage:"[placeholder]",id:"F5ahssnkpz"},about:{defaultMessage:"[placeholder]",id:"G5xfPIEzpd"}}),perkDescriptionMarkdown:`**Offer Details**

1. [placeholder]

**How to use**

1. [placeholder]`},perplexity_travel:{...e({title:{defaultMessage:"Perplexity Travel",id:"gEQomMf8ut"},perkHeadline:{defaultMessage:"Save 10% on your direct hotel booking on Perplexity, powered by Selfbook",id:"qmpPNVmnZv"},about:{defaultMessage:"Perplexity Travel is an interactive travel research and discovery experience that enables individuals to make faster decisions and enjoy frictionless bookings. The experience is powered by Selfbook's booking infrastructure, allowing you to complete reservations without leaving the Perplexity interface. All listings feature authentic reviews from real travelers through Tripadvisor, helping you make informed choices with confidence. Transforms how you plan trips-from initial inspiration to final booking –– all on Perplexity.",id:"1GCavDTLe/"}}),customCtaButtonText:a.getStarted,perkDescriptionMarkdown:`**Offer Details**

* Enjoy 10% off on all hotel reservations made through Perplexity Pro
* Receive discounts of up to $200 on your hotel bookings made on Perplexity
* Experience a streamlined process to discover and book hotels with just a few clicks
* This offer is valid through May 31, 2026

**How to use**

1. This offer is available only to members with an active Perplexity Pro subscription
2. You must be logged into your Perplexity Pro account to complete your booking
3. The 10% discount will be automatically applied at checkout when you book hotels directly on Perplexity via Selfbook
4. This discount can be redeemed multiple times during your subscription period
5. You can find hotels around the world directly in search—and book in just a few clicks`},fireflies:{...e({title:{defaultMessage:"Fireflies",id:"Fs1bBeDD3m"},perkHeadline:{defaultMessage:"Get 3 free months of Fireflies.ai Business",id:"UdI0pSOpnm"},about:{defaultMessage:"Fireflies is an AI-powered meeting assistant used by over 500,000 organizations. Fireflies helps you record, transcribe, and summarize every meeting, then instantly search across all your conversations. Ideal for individuals seeking to transform their meetings into actionable outcomes and boost productivity.",id:"f6qaTpWKjO"}}),customCtaButtonText:a.activate,perkDescriptionMarkdown:`**Offer Details**

* Enjoy a complimentary 3-month trial of the Fireflies.ai Business Annual Plan
* Access automatic transcription, AI-powered summaries, and action items with 60+ integrations across conferencing, CRMs, project management, collaboration, storage, and more
* Use AskFred (AI Assistant for your meetings) to search, ask questions, and get instant answers from your meetings
* Offer is valid through June 2026

**How to use**

1. Offer available only to new Fireflies users with an active Perplexity Pro subscription.
2. Valid for a one time redemption per member.
3. To claim your free trial, click on Activate.`},farmers:{...e({title:{defaultMessage:"Farmers Insurance",id:"Z5BwlKVaVb"},perkHeadline:{defaultMessage:"Perplexity users with Perplexity Pro and Max subscriptions now have access to the Farmers GroupSelect® insurance program.",id:"7Q8TmziRPX"},about:{defaultMessage:"Farmers Insurance® is a leading provider of auto, home, and other insurance products, offering comprehensive coverage options and personalized service so consumers can insure what matters most to them.",id:"+f7r6WMP8r"}}),customCtaButtonText:a.visitPartnerPage,perkDescriptionMarkdown:`**Perk Details**

* Get special rates and discounts on auto, home and renters insurance from Farmers Insurance® and Perplexity through the Farmers GroupSelect program
* Eligibles from other groups have saved an average of $509* annually on their auto insurance by switching to Farmers GroupSelect through this program
* Perplexity Pro and Max subscribers can have access to this perk through atleast May 2026

**How to Participate**

1. The perk is available exclusively to Perplexity users with an active Perplexity Pro or Max subscription
2. Only active Perplexity subscribers may apply for policies using the below link, which is not transferable to other individuals
3. To get started, click Visit Partner Page to access your Perplexity Member special rates`,finePrintMarkdown:`**Disclaimer**

*Based on the average nationwide annual savings of new Farmers GroupSelect customers surveyed from 2/1/23 to 9/19/24 who switched their auto insurance policies to Farmers GroupSelect ® branded auto insurance policies responded to the survey, and realized savings. Potential savings vary by customer and may vary by state and product.

Program information provided by the following specific insurers seeking to obtain insurance business underwritten by Farmers Property and Casualty Insurance Company and certain of its affiliates: Economy Fire & Casualty Company, Economy Preferred Insurance Company, Farmers Casualty Insurance Company, Farmers Direct Property and Casualty Insurance Company, Farmers Group Property and Casualty Insurance Company, or Farmers Lloyds Insurance Company of Texas, all with administrative home offices in Warwick, RI. List of licenses at www.farmers.com/companies/state/. Coverage, rates, discounts, and policy features vary by state and product and are available in most states to those who qualify. 7938879.1
`},samsung:{...e({title:{defaultMessage:"Samsung",id:"DmPUdFjSmM"},perkHeadline:{defaultMessage:"Get an exclusive $50 off Galaxy Watch8 Series or Watch Ultra",id:"BaMySAcit+"},about:{defaultMessage:"Galaxy Watch8 Series and Watch Ultra are Samsung's latest innovations in wearable technology, combining sleek design with advanced health and fitness tracking — including sleep, heart and metabolic health monitoring — all powered by Galaxy AI. Samsung constantly reinvents the future and explores the unknown to discover technologies that help people around the world live happier, healthier lives.",id:"9YlTBwQSJ/"}}),customCtaButtonText:a.visitPartnerPage,perkDescriptionMarkdown:`**Offer Details**

* $50 off Galaxy Watch8, Watch8 Classic, or Watch Ultra
* This offer is valid through May 31, 2026

**How to Redeem**

* Offer is available to active Perplexity Pro and Max subscribers (monthly or annual plan)
* Offer is valid for a single redemption per member
* Click ‘Visit Partner Page’ below, choose a Galaxy Watch, and enter your exclusive code at checkout to unlock the offer."`},avis:{...e({title:{defaultMessage:"Avis",id:"uDwDTflk2X"},perkHeadline:{defaultMessage:"Get up to 35% off base rates and a free car class upgrade with Avis",id:"9hHH9vF1tr"},about:{defaultMessage:"Avis is a leading car rental provider offering a wide selection of vehicles for business and leisure travelers, with convenient locations across the U.S. and internationally.",id:"NJx4xFGaqK"}}),shouldUseBulletedSteps:!0,customCtaButtonText:a.activate,perkDescriptionMarkdown:`**Offer Details**

* Up to 35% off with Avis car rentals on Pay Later rates
* Free one-time car class upgrade*
* Valid through May 2026

**How to use**

* Offer available only to members with an active Perplexity Pro subscription
* Access your discount using your unique redemption link
* Apply your free upgrade during the booking process
* To get started, click Activate`,finePrintMarkdown:`**Disclaimer**

* Standard taxes, fees, and surcharges still apply.
* Valid at participating locations throughout the U.S.
* Avis and Budget Terms and Conditions apply (see referenced landing page).
* *Subject to availability`},budget:{...e({title:{defaultMessage:"Budget",id:"7xc9wFKcon"},perkHeadline:{defaultMessage:"Get up to 30% off base rates and a free car class upgrade with Budget",id:"JadkZzqcm/"},about:{defaultMessage:"Budget is a leading car rental provider offering a wide selection of vehicles for business and leisure travelers, with convenient locations across the U.S. and internationally.",id:"RRw9cocM7R"}}),shouldUseBulletedSteps:!0,customCtaButtonText:a.activate,perkDescriptionMarkdown:`**Offer Details**

* Up to 30% off with Budget car rentals on Pay Later rates
* Free one-time car class upgrade*
* Valid through May 2026

**How to use**

* Offer available only to members with an active Perplexity Pro subscription
* Access your discount using your unique redemption link
* Apply your free upgrade during the booking process
* To get started, click Activate`,finePrintMarkdown:`**Disclaimer**

* Standard taxes, fees, and surcharges still apply.
* Valid at participating locations throughout the U.S.
* Budget Terms and Conditions apply (see referenced landing page).
* *Subject to availability`}},B=t=>T[t]||t.toLowerCase(),_=t=>{try{return t.toUpperCase()}catch{throw new Error("Invalid Perk Type")}};export{D as a,_ as b,G as c,I as d,E as g,F as m,B as p,x as u};
//# sourceMappingURL=https://pplx-static-sourcemaps.perplexity.ai/_spa/assets/utils-CTgFCWAN.js.map
