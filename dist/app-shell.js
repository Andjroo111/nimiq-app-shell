var d0=Object.defineProperty;var u0=(l)=>l;function c0(l,h){this[l]=u0.bind(null,h)}var QK=(l,h)=>{for(var Q in h)d0(l,Q,{get:h[Q],enumerable:!0,configurable:!0,set:c0.bind(h,Q)})};var Rl=(l,h)=>()=>(l&&(h=l(l=0)),h);var i0=((l)=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(l,{get:(h,Q)=>(typeof require<"u"?require:h)[Q]}):l)(function(l){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+l+'" is not supported')});var ZK={};QK(ZK,{requestDeviceIdentifier:()=>s0,init:()=>p0,getHostLanguage:()=>n0});function p0(l){return window.nimiq?Promise.resolve(window.nimiq):new Promise((h,Q)=>{let K=l?.timeout??1e4,Z=setTimeout(()=>{clearInterval(k),Q(Error("Nimiq provider was not injected. Are you running inside a Nimiq app?"))},K),k=setInterval(()=>{window.nimiq&&(clearTimeout(Z),clearInterval(k),h(window.nimiq))},50)})}function n0(){return typeof window>"u"?void 0:window.nimiqPay?.language}function s0(l){return typeof window>"u"||!window.nimiqPay?.requestDeviceIdentifier?Promise.reject(Error("requestDeviceIdentifier is unavailable. Are you running inside Nimiq Pay?")):window.nimiqPay.requestDeviceIdentifier(l)}var zK=()=>{};class f{static byteLength(l){let[h,Q]=f._getLengths(l);return f._byteLength(h,Q)}static decode(l){f._initRevLookup();let[h,Q]=f._getLengths(l),K=new Uint8Array(f._byteLength(h,Q)),Z=0,k=Q>0?h-4:h,M=0;for(;M<k;M+=4){let W=f._revLookup[l.charCodeAt(M)]<<18|f._revLookup[l.charCodeAt(M+1)]<<12|f._revLookup[l.charCodeAt(M+2)]<<6|f._revLookup[l.charCodeAt(M+3)];K[Z++]=W>>16&255,K[Z++]=W>>8&255,K[Z++]=W&255}if(Q===2){let W=f._revLookup[l.charCodeAt(M)]<<2|f._revLookup[l.charCodeAt(M+1)]>>4;K[Z++]=W&255}if(Q===1){let W=f._revLookup[l.charCodeAt(M)]<<10|f._revLookup[l.charCodeAt(M+1)]<<4|f._revLookup[l.charCodeAt(M+2)]>>2;K[Z++]=W>>8&255,K[Z]=W&255}return K}static encode(l){let h=l.length,Q=h%3,K=[],Z=16383;for(let k=0,M=h-Q;k<M;k+=16383)K.push(f._encodeChunk(l,k,k+16383>M?M:k+16383));if(Q===1){let k=l[h-1];K.push(f._lookup[k>>2]+f._lookup[k<<4&63]+"==")}else if(Q===2){let k=(l[h-2]<<8)+l[h-1];K.push(f._lookup[k>>10]+f._lookup[k>>4&63]+f._lookup[k<<2&63]+"=")}return K.join("")}static encodeUrl(l){return f.encode(l).replace(/\//g,"_").replace(/\+/g,"-").replace(/=/g,".")}static decodeUrl(l){return f.decode(l.replace(/_/g,"/").replace(/-/g,"+").replace(/\./g,"="))}static _initRevLookup(){if(f._revLookup.length!==0)return;f._revLookup=[];for(let l=0,h=f._lookup.length;l<h;l++)f._revLookup[f._lookup.charCodeAt(l)]=l;f._revLookup[45]=62,f._revLookup[95]=63}static _getLengths(l){let h=l.length;if(h%4>0)throw Error("Invalid string. Length must be a multiple of 4");let Q=l.indexOf("=");if(Q===-1)Q=h;let K=Q===h?0:4-Q%4;return[Q,K]}static _byteLength(l,h){return(l+h)*3/4-h}static _tripletToBase64(l){return f._lookup[l>>18&63]+f._lookup[l>>12&63]+f._lookup[l>>6&63]+f._lookup[l&63]}static _encodeChunk(l,h,Q){let K=[];for(let Z=h;Z<Q;Z+=3){let k=(l[Z]<<16&16711680)+(l[Z+1]<<8&65280)+(l[Z+2]&255);K.push(f._tripletToBase64(k))}return K.join("")}}class q{static stringify(l){return JSON.stringify(l,q._jsonifyType)}static parse(l){return JSON.parse(l,q._parseType)}static _parseType(l,h){if(h&&h.hasOwnProperty&&h.hasOwnProperty(q.TYPE_SYMBOL)&&h.hasOwnProperty(q.VALUE_SYMBOL))switch(h[q.TYPE_SYMBOL]){case Qh.UINT8_ARRAY:return f.decode(h[q.VALUE_SYMBOL])}return h}static _jsonifyType(l,h){if(h instanceof Uint8Array)return q._typedObject(Qh.UINT8_ARRAY,f.encode(h));return h}static _typedObject(l,h){let Q={};return Q[q.TYPE_SYMBOL]=l,Q[q.VALUE_SYMBOL]=h,Q}}class vh{static generateRandomId(){let l=new Uint32Array(1);return crypto.getRandomValues(l),l[0]}}class $l{constructor(l=!0){if(this._store=l?window.sessionStorage:null,this._validIds=new Map,l)this._restoreIds()}static _decodeIds(l){let h=q.parse(l),Q=new Map;for(let K of Object.keys(h)){let Z=parseInt(K,10);Q.set(isNaN(Z)?K:Z,h[K])}return Q}has(l){return this._validIds.has(l)}getCommand(l){let h=this._validIds.get(l);return h?h[0]:null}getState(l){let h=this._validIds.get(l);return h?h[1]:null}add(l,h,Q=null){this._validIds.set(l,[h,Q]),this._storeIds()}remove(l){this._validIds.delete(l),this._storeIds()}clear(){if(this._validIds.clear(),this._store)this._store.removeItem($l.KEY)}_encodeIds(){let l=Object.create(null);for(let[h,Q]of this._validIds)l[h]=Q;return q.stringify(l)}_restoreIds(){let l=this._store.getItem($l.KEY);if(l)this._validIds=$l._decodeIds(l)}_storeIds(){if(this._store)this._store.setItem($l.KEY,this._encodeIds())}}class zl{static receiveRedirectCommand(l){let h=new URL(l.href);if(!document.referrer)return null;let Q=new URL(document.referrer),K=new URLSearchParams(h.search),Z=new URLSearchParams(h.hash.substring(1));if(!Z.has("id"))return null;let k=parseInt(Z.get("id"),10);if(Z.delete("id"),K.set(zl.URL_SEARCHPARAM_NAME,k.toString()),!Z.has("command"))return null;let M=Z.get("command");if(Z.delete("command"),!Z.has("returnURL"))return null;let W=Z.get("returnURL");Z.delete("returnURL");let G=t.HTTP_GET;if(Z.has("responseMethod")){if(G=Z.get("responseMethod"),Z.delete("responseMethod"),!Object.values(t).includes(G))throw Error("Invalid ResponseMethod")}if(!(G===t.POST_MESSAGE&&(window.opener||window.parent))&&new URL(W).origin!==Q.origin)return null;let P=[];if(Z.has("args"))try{P=q.parse(Z.get("args"))}catch(X){}return P=Array.isArray(P)?P:[],Z.delete("args"),h.search=K.toString(),this._setUrlFragment(h,Z),history.replaceState(history.state,"",h.href),{origin:Q.origin,data:{id:k,command:M,args:P},returnURL:W,responseMethod:G,source:G===t.POST_MESSAGE?window.opener||window.parent:null}}static receiveRedirectResponse(l){let h=new URL(l.href);if(!document.referrer)return null;let Q=new URL(document.referrer),K=new URLSearchParams(h.search),Z=new URLSearchParams(h.hash.substring(1));if(!Z.has("id"))return null;let k=parseInt(Z.get("id"),10);if(Z.delete("id"),K.set(zl.URL_SEARCHPARAM_NAME,k.toString()),!Z.has("status"))return null;let M=Z.get("status")===Xl.OK?Xl.OK:Xl.ERROR;if(Z.delete("status"),!Z.has("result"))return null;let W=q.parse(Z.get("result"));return Z.delete("result"),h.search=K.toString(),this._setUrlFragment(h,Z),history.replaceState(history.state,"",h.href),{origin:Q.origin,data:{id:k,status:M,result:W}}}static prepareRedirectReply(l,h,Q){let K=new URL(l.returnURL),Z=new URLSearchParams(K.hash.substring(1));return Z.set("id",l.id.toString()),Z.set("status",h),Z.set("result",q.stringify(Q)),K.hash=Z.toString(),K.href}static prepareRedirectInvocation(l,h,Q,K,Z,k){let M=new URL(l),W=new URLSearchParams(M.hash.substring(1));if(W.set("id",h.toString()),W.set("returnURL",Q),W.set("command",K),W.set("responseMethod",k),Array.isArray(Z))W.set("args",q.stringify(Z));return M.hash=W.toString(),M.href}static _setUrlFragment(l,h){if(h.toString().endsWith("="))l.hash=h.toString().slice(0,-1);else l.hash=h.toString()}}class Bh{constructor(l,h=!1){this._allowedOrigin=l,this._waitingRequests=new $l(h),this._responseHandlers=new Map,this._preserveRequests=!1}onResponse(l,h,Q){this._responseHandlers.set(l,{resolve:h,reject:Q})}_receive(l){if(!l.data||!l.data.status||!l.data.id||this._allowedOrigin!=="*"&&l.origin!==this._allowedOrigin)return!1;let h=l.data,Q=this._getCallback(h.id),K=this._waitingRequests.getState(h.id);if(Q){if(!this._preserveRequests)this._waitingRequests.remove(h.id),this._responseHandlers.delete(h.id);if(console.debug("RpcClient RECEIVE",h),h.status===Xl.OK)Q.resolve(h.result,h.id,K);else if(h.status===Xl.ERROR){let Z=Error(h.result.message);if(h.result.stack)Z.stack=h.result.stack;if(h.result.name)Z.name=h.result.name;Q.reject(Z,h.id,K)}return!0}else return console.warn("Unknown RPC response:",h),!1}_getCallback(l){if(this._responseHandlers.has(l))return this._responseHandlers.get(l);else{let h=this._waitingRequests.getCommand(l);if(h)return this._responseHandlers.get(h)}return}}var Qh,t,Xl,Kh,Zh;var XK=Rl(()=>{f._lookup="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";f._revLookup=[];(function(l){l[l.UINT8_ARRAY=0]="UINT8_ARRAY"})(Qh||(Qh={}));q.TYPE_SYMBOL="__";q.VALUE_SYMBOL="v";(function(l){l.HTTP_POST="http-post",l.HTTP_GET="http-get",l.POST_MESSAGE="post-message"})(t||(t={}));(function(l){l.OK="ok",l.ERROR="error"})(Xl||(Xl={}));$l.KEY="rpcRequests";zl.URL_SEARCHPARAM_NAME="rpcId";Kh=class Kh extends Bh{constructor(l,h){super(h);this._serverCloseCheckInterval=-1,this._target=l,this._connectionState=0,this._receiveListener=this._receive.bind(this)}async init(){if(this._connectionState===2)return;if(await this._connect(),window.addEventListener("message",this._receiveListener),this._serverCloseCheckInterval!==-1)return;this._serverCloseCheckInterval=window.setInterval(()=>this._checkIfServerClosed(),300)}async call(l,...h){return this._call({command:l,args:h,id:vh.generateRandomId()})}close(){this._connectionState=0,window.removeEventListener("message",this._receiveListener),window.clearInterval(this._serverCloseCheckInterval),this._serverCloseCheckInterval=-1;for(let[l,{reject:h}]of this._responseHandlers){let Q=this._waitingRequests.getState(l);h("Connection was closed",typeof l==="number"?l:void 0,Q)}if(this._waitingRequests.clear(),this._responseHandlers.clear(),this._target&&this._target.closed)this._target=null}_receive(l){if(l.source!==this._target)return!1;return super._receive(l)}async _call(l){if(!this._target||this._target.closed)throw Error("Connection was closed.");if(this._connectionState!==2)throw Error("Client is not connected, call init first");return new Promise((h,Q)=>{this._responseHandlers.set(l.id,{resolve:h,reject:Q}),this._waitingRequests.add(l.id,l.command),console.debug("RpcClient REQUEST",l.command,l.args),this._target.postMessage(l,this._allowedOrigin)})}_connect(){if(this._connectionState===2)return;return this._connectionState=1,new Promise((l,h)=>{let Q=(Z)=>{let{source:k,origin:M,data:W}=Z;if(k!==this._target||W.status!==Xl.OK||W.result!=="pong"||W.id!==1||this._allowedOrigin!=="*"&&M!==this._allowedOrigin)return;if(W.result.stack){let G=Error(W.result.message);if(G.stack=W.result.stack,W.result.name)G.name=W.result.name;console.error(G)}window.removeEventListener("message",Q),this._connectionState=2,console.log("RpcClient: Connection established"),l(!0)};window.addEventListener("message",Q);let K=()=>{if(this._connectionState===2)return;if(this._connectionState===0||this._checkIfServerClosed()){window.removeEventListener("message",Q),h(Error("Connection was closed"));return}try{this._target.postMessage({command:"ping",id:1},this._allowedOrigin)}catch(Z){console.error(`postMessage failed: ${Z}`)}window.setTimeout(K,100)};window.setTimeout(K,100)})}_checkIfServerClosed(){if(this._target&&!this._target.closed)return!1;return this.close(),!0}};Zh=class Zh extends Bh{constructor(l,h,Q=!0){super(h,!0);this._target=l,this._preserveRequests=Q}async init(){let l=zl.receiveRedirectResponse(window.location);if(l){this._receive(l);return}if(this._rejectOnBack())return;let h=new URLSearchParams(window.location.search);if(h.has(zl.URL_SEARCHPARAM_NAME)){let Q=window.sessionStorage.getItem(`response-${h.get(zl.URL_SEARCHPARAM_NAME)}`);if(Q){this._receive(q.parse(Q),!1);return}}}close(){}call(l,h,Q,...K){if(!Q||typeof Q==="boolean"){if(typeof Q==="boolean")console.warn("RedirectRpcClient.call(string, string, boolean, any[]) is deprecated. Use RedirectRpcClient.call(string, string, CallOptions, any[]) with an appropriate CallOptions object instead.");this._call(l,h,{responseMethod:t.HTTP_GET,handleHistoryBack:!!Q},...K)}else if(typeof Q==="object"){if(Q.responseMethod===t.POST_MESSAGE)if(!window.opener&&!window.parent)throw Error("Window has no opener or parent, responseMethod: ResponseMethod.POST_MESSAGE would fail.");else console.warn("Response will skip at least one rpc call, which will result in an unknown response.");this._call(l,h,Q,...K)}}callAndSaveLocalState(l,h,Q,K=!1,...Z){console.warn("RedirectRpcClient.callAndSaveLocalState() is deprecated. Use RedirectRpcClient.call() with an apropriate CallOptions object instead."),this._call(l,Q,{responseMethod:t.HTTP_GET,state:h?h:void 0,handleHistoryBack:K},...Z)}_receive(l,h=!0){let Q=super._receive(l);if(Q&&h)window.sessionStorage.setItem(`response-${l.data.id}`,q.stringify(l));return Q}_call(l,h,Q,...K){let Z=vh.generateRandomId(),k=Q.responseMethod||t.HTTP_GET,M=zl.prepareRedirectInvocation(this._target,Z,l,h,K,k);if(this._waitingRequests.add(Z,h,Q.state||null),Q.handleHistoryBack)history.replaceState(Object.assign({},history.state,{rpcBackRejectionId:Z}),"");console.debug("RpcClient REQUEST",h,K),window.location.href=M}_rejectOnBack(){if(!history.state||!history.state.rpcBackRejectionId)return!1;let l=history.state.rpcBackRejectionId;history.replaceState(Object.assign({},history.state,{rpcBackRejectionId:null}),"");let h=this._getCallback(l),Q=this._waitingRequests.getState(l);if(h){if(!this._preserveRequests)this._waitingRequests.remove(l),this._responseHandlers.delete(l);console.debug("RpcClient BACK");let K=Error("Request aborted");return h.reject(K,l,Q),!0}return!1}}});class x{static getBrowserInfo(){return{browser:x.detectBrowser(),version:x.detectVersion(),isMobile:x.isMobile()}}static isMobile(){return/i?Phone|iP(ad|od)|Android|BlackBerry|Opera Mini|WPDesktop|Mobi(le)?|Silk/i.test(navigator.userAgent)}static detectBrowser(){if(x._detectedBrowser)return x._detectedBrowser;let l=navigator.userAgent;if(/Edge\//i.test(l))x._detectedBrowser=x.Browser.EDGE;else if(/(Opera|OPR)\//i.test(l))x._detectedBrowser=x.Browser.OPERA;else if(/Firefox\//i.test(l))x._detectedBrowser=x.Browser.FIREFOX;else if(/Chrome\//i.test(l))x._detectedBrowser=navigator.plugins.length===0&&navigator.mimeTypes.length===0&&!x.isMobile()?x.Browser.BRAVE:x.Browser.CHROME;else if(/^((?!chrome|android).)*safari/i.test(l))x._detectedBrowser=x.Browser.SAFARI;else x._detectedBrowser=x.Browser.UNKNOWN;return x._detectedBrowser}static detectVersion(){if(typeof x._detectedVersion<"u")return x._detectedVersion;let l;switch(x.detectBrowser()){case x.Browser.EDGE:l=/Edge\/(\S+)/i;break;case x.Browser.OPERA:l=/(Opera|OPR)\/(\S+)/i;break;case x.Browser.FIREFOX:l=/Firefox\/(\S+)/i;break;case x.Browser.CHROME:l=/Chrome\/(\S+)/i;break;case x.Browser.SAFARI:l=/(iP(hone|ad|od).*?OS |Version\/)(\S+)/i;break;case x.Browser.BRAVE:default:return x._detectedVersion=null,null}let h=navigator.userAgent.match(l);if(!h)return x._detectedVersion=null,null;let Q=h[h.length-1].replace(/_/g,"."),K=Q.split("."),Z=[];for(let Y=0;Y<4;++Y)Z.push(parseInt(K[Y],10)||0);let[k,M,W,G]=Z;return x._detectedVersion={versionString:Q,major:k,minor:M,build:W,patch:G},x._detectedVersion}static isChrome(){return x.detectBrowser()===x.Browser.CHROME}static isFirefox(){return x.detectBrowser()===x.Browser.FIREFOX}static isOpera(){return x.detectBrowser()===x.Browser.OPERA}static isEdge(){return x.detectBrowser()===x.Browser.EDGE}static isSafari(){return x.detectBrowser()===x.Browser.SAFARI}static isBrave(){return x.detectBrowser()===x.Browser.BRAVE}static isIOS(){return/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream}static isBadIOS(){let l=x.getBrowserInfo();return l.browser===x.Browser.SAFARI&&l.isMobile&&l.version&&(l.version.major<11||l.version.major===11&&l.version.minor===2)}static isPrivateMode(){return new Promise((l)=>{let h=()=>l(!0),Q=()=>l(!1),K=()=>/Constructor/.test(window.HTMLElement)||window.safari&&window.safari.pushNotification&&window.safari.pushNotification.toString()==="[object SafariRemoteNotification]";if(window.webkitRequestFileSystem){window.webkitRequestFileSystem(0,0,Q,h);return}if(document.documentElement&&"MozAppearance"in document.documentElement.style){let Z=indexedDB.open(null);Z.onerror=h,Z.onsuccess=Q;return}if(K())try{window.openDatabase(null,null,null,null)}catch(Z){h();return}if(!window.indexedDB&&(window.PointerEvent||window.MSPointerEvent)){h();return}Q()})}static _detectedBrowser;static _detectedVersion}var bh;var GK=Rl(()=>{(function(l){(function(h){h.CHROME="chrome",h.FIREFOX="firefox",h.OPERA="opera",h.EDGE="edge",h.SAFARI="safari",h.BRAVE="brave",h.UNKNOWN="unknown"})(l.Browser||(l.Browser={}))})(x||(x={}));bh=x});var YK=Rl(()=>{GK()});var kK={};QK(kK,{default:()=>d});function k1(l,h){if(!h){let Q=document.cookie.match(/(^| )lang=([^;]+)/);h=Q&&Q[2]||navigator.language.split("-")[0]}return(Y1[h]||gh)[l]||gh[l]}class Gl{static getAllowedOrigin(l){return new URL(l).origin}constructor(l){this._type=l}async request(l,h,Q){throw Error("Not implemented")}}class d{static get PaymentMethod(){return console.warn("PaymentMethod has been renamed to PaymentType. Access via HubApi.PaymentMethod will soon get disabled. Use HubApi.PaymentType instead."),zh}static get DEFAULT_ENDPOINT(){let l=location.hostname.match(/(?:[^.]+\.[^.]+|localhost)$/),h=l?l[0]:location.hostname;switch(h){case"nimiq.com":case"nimiq-testnet.com":return`https://hub.${h}`;case"bs-local.com":return`${window.location.protocol}//bs-local.com:8080`;default:return"http://localhost:8080"}}constructor(l=d.DEFAULT_ENDPOINT,h){this._endpoint=l,this._defaultBehavior=h||new Yl(`left=${window.innerWidth/2-400},top=75,width=800,height=850,location=yes,dependent=yes`),this._checkoutDefaultBehavior=h||new Yl(`left=${window.innerWidth/2-400},top=50,width=800,height=895,location=yes,dependent=yes`),this._iframeBehavior=new vl,this._redirectClient=new Zh("",Gl.getAllowedOrigin(this._endpoint))}checkRedirectResponse(){return this._redirectClient.init()}on(l,h,Q){this._redirectClient.onResponse(l,(K,Z,k)=>h(K,k),(K,Z,k)=>{if(!Q)return;Q(K,k)})}createCashlink(l,h=this._defaultBehavior){return this._request(h,R.CREATE_CASHLINK,[l])}manageCashlink(l,h=this._defaultBehavior){return this._request(h,R.MANAGE_CASHLINK,[l])}checkout(l,h=this._checkoutDefaultBehavior){return this._request(h,R.CHECKOUT,[l])}chooseAddress(l,h=this._defaultBehavior){return this._request(h,R.CHOOSE_ADDRESS,[l])}signTransaction(l,h=this._defaultBehavior){return this._request(h,R.SIGN_TRANSACTION,[l])}signStaking(l,h=this._defaultBehavior){return this._request(h,R.SIGN_STAKING,[l])}signMessage(l,h=this._defaultBehavior){return this._request(h,R.SIGN_MESSAGE,[l])}signBtcTransaction(l,h=this._defaultBehavior){return this._request(h,R.SIGN_BTC_TRANSACTION,[l])}signPolygonTransaction(l,h=this._defaultBehavior){return this._request(h,R.SIGN_POLYGON_TRANSACTION,[l])}setupSwap(l,h=this._defaultBehavior){return this._request(h,R.SETUP_SWAP,[l])}refundSwap(l,h=this._defaultBehavior){return this._request(h,R.REFUND_SWAP,[l])}signMultisigTransaction(l,h=this._defaultBehavior){return this._request(h,R.SIGN_MULTISIG_TRANSACTION,[l])}connectAccount(l,h=this._defaultBehavior){return this._request(h,R.CONNECT_ACCOUNT,[l])}onboard(l,h=this._defaultBehavior){return this._request(h,R.ONBOARD,[l])}signup(l,h=this._defaultBehavior){return this._request(h,R.SIGNUP,[l])}login(l,h=this._defaultBehavior){return this._request(h,R.LOGIN,[l])}logout(l,h=this._defaultBehavior){return this._request(h,R.LOGOUT,[l])}export(l,h=this._defaultBehavior){return this._request(h,R.EXPORT,[l])}changePassword(l,h=this._defaultBehavior){return this._request(h,R.CHANGE_PASSWORD,[l])}addAddress(l,h=this._defaultBehavior){return this._request(h,R.ADD_ADDRESS,[l])}rename(l,h=this._defaultBehavior){return this._request(h,R.RENAME,[l])}addVestingContract(l,h=this._defaultBehavior){return this._request(h,R.ADD_VESTING_CONTRACT,[l])}migrate(l=this._defaultBehavior){return this._request(l,R.MIGRATE,[{appName:"Account list"}])}activateBitcoin(l,h=this._defaultBehavior){return this._request(h,R.ACTIVATE_BITCOIN,[l])}activatePolygon(l,h=this._defaultBehavior){return this._request(h,R.ACTIVATE_POLYGON,[l])}list(l=this._iframeBehavior){return this._request(l,R.LIST,[])}cashlinks(l=this._iframeBehavior){return this._request(l,R.LIST_CASHLINKS,[])}addBtcAddresses(l,h=this._iframeBehavior){return this._request(h,R.ADD_BTC_ADDRESSES,[l])}_request(l,h,Q){return l.request(this._endpoint,h,Q)}}var o0,gh,t0,e0,l1,h1,Q1,K1,Z1,z1,X1,G1,Y1,_l,ph,Yl,vl,R,mh,zh,dh,uh,ch,ih;var MK=Rl(()=>{XK();YK();o0={"popup-overlay":`Ein Popup hat sich geöffnet,
klicke hier, um zurück zum Popup zu kommen.`},gh={"popup-overlay":`A popup has been opened,
click anywhere to bring it back to the front.`},t0={"popup-overlay":`Se ha abierto una ventana emergente.
Haga click en cualquier lugar para traer la ventana al primer plano.`},e0={"popup-overlay":`Nag-bukas ang isang pop-up.
Maaring pindutin kahit saan para ibalik ito sa harap.`},l1={"popup-overlay":`Une popup a été ouverte,
cliquez n'importe où pour la ramener au premier plan.`},h1={"popup-overlay":`Er is een pop-up geopend,
klik op het scherm om het weer naar voren te brengen.`},Q1={"popup-overlay":`Pojawiło się wyskakujące okno.
Aby je zobaczyć, kliknij w dowolnym miejscu.`},K1={"popup-overlay":`Um popup foi aberto,
clique em qualquer lado para o trazer para a frente.`},Z1={"popup-overlay":`Открыто всплывающее окно.
Нажмите где-нибудь, чтобы вернуть его на передний план.`},z1={"popup-overlay":`Bir popup penceresi açıldı,
öne çekmek için herhangi bir yere tıkla. `},X1={"popup-overlay":`Відкрито випадаюче вікно.
клацніть будь-де щоб перейти до ньго.`},G1={"popup-overlay":`弹出窗口已打开，
单击任意位置即可回到上一页`},Y1={de:o0,en:gh,es:t0,fil:e0,fr:l1,nl:h1,pl:Q1,pt:K1,ru:Z1,tr:z1,uk:X1,zh:G1};(function(l){l[l.REDIRECT=0]="REDIRECT",l[l.POPUP=1]="POPUP",l[l.IFRAME=2]="IFRAME"})(_l||(_l={}));ph=class ph extends Gl{static withLocalState(l){return new ph(void 0,l)}constructor(l,h){super(_l.REDIRECT);let Q=window.location;if(this._returnUrl=l||`${Q.origin}${Q.pathname}`,this._localState=h||{},typeof this._localState.__command<"u")throw Error("Invalid localState: Property '__command' is reserved")}async request(l,h,Q){let K=Gl.getAllowedOrigin(l),Z=new Zh(l,K);await Z.init();let k=Object.assign({},this._localState,{__command:h});Z.callAndSaveLocalState(this._returnUrl,k,h,!0,...await Promise.all(Q))}};Yl=class Yl extends Gl{constructor(l=Yl.DEFAULT_FEATURES,h){super(_l.POPUP);this.shouldRetryRequest=!1,this._popupFeatures=l,this._options={...Yl.DEFAULT_OPTIONS,...h}}async request(l,h,Q){let K=Gl.getAllowedOrigin(l),Z=this.appendOverlay();do{this.shouldRetryRequest=!1;try{return this.popup=this.createPopup(l),this.client=new Kh(this.popup,K),await this.client.init(),await this.client.call(h,...await Promise.all(Q))}catch(k){if(!this.shouldRetryRequest)throw k}finally{if(!this.shouldRetryRequest){if(this.removeOverlay(Z),this.client)this.client.close();if(this.popup)this.popup.close()}}}while(this.shouldRetryRequest);if(this.popup)this.popup.close();if(this.client)this.client.close();if(Z)this.removeOverlay(Z);throw Error("Unexpected error occurred")}createPopup(l){let h=window.open(l,"NimiqAccounts",this._popupFeatures);if(!h)throw Error("Failed to open popup");return h}appendOverlay(){if(!this._options.overlay)return null;let l=document.createElement.bind(document),h=(Y,P)=>Y.appendChild(P),Q=l("div");Q.id="nimiq-hub-overlay";let K=Q.style;K.position="fixed",K.top="0",K.right="0",K.bottom="0",K.left="0",K.background="rgba(31, 35, 72, 0.8)",K.display="flex",K.flexDirection="column",K.alignItems="center",K.justifyContent="space-between",K.cursor="pointer",K.color="white",K.textAlign="center",K.opacity="0",K.transition="opacity 0.6s ease",K.zIndex="99999",Q.addEventListener("click",()=>{if(bh.isIOS()){if(this.shouldRetryRequest=!0,this.popup)this.popup.close();if(this.client)this.client.close()}else if(this.popup)this.popup.focus()}),h(Q,l("div"));let Z=l("div");Z.textContent=k1("popup-overlay");let k=Z.style;k.padding="20px",k.fontFamily='Muli, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',k.fontSize="24px",k.fontWeight="600",k.lineHeight="40px",k.whiteSpace="pre-line",h(Q,Z);let M=l("img");M.src='data:image/svg+xml,<svg width="135" height="32" viewBox="0 0 135 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M35.6 14.5l-7.5-13A3 3 0 0025.5 0h-15a3 3 0 00-2.6 1.5l-7.5 13a3 3 0 000 3l7.5 13a3 3 0 002.6 1.5h15a3 3 0 002.6-1.5l7.5-13a3 3 0 000-3z" fill="url(%23hub-overlay-nimiq-logo)"/><path d="M62.25 6.5h3.26v19H63L52.75 12.25V25.5H49.5v-19H52l10.25 13.25V6.5zM72 25.5v-19h3.5v19H72zM97.75 6.5h2.75v19h-3V13.75L92.37 25.5h-2.25L85 13.75V25.5h-3v-19h2.75l6.5 14.88 6.5-14.88zM107 25.5v-19h3.5v19H107zM133.88 21.17a7.91 7.91 0 01-4.01 3.8c.16.38.94 1.44 1.52 2.05.59.6 1.2 1.23 1.98 1.86L131 30.75a15.91 15.91 0 01-4.45-5.02l-.8.02c-1.94 0-3.55-.4-4.95-1.18a7.79 7.79 0 01-3.2-3.4 11.68 11.68 0 01-1.1-5.17c0-2.03.37-3.69 1.12-5.17a7.9 7.9 0 013.2-3.4 9.8 9.8 0 014.93-1.18c1.9 0 3.55.4 4.94 1.18a7.79 7.79 0 013.2 3.4 11.23 11.23 0 011.1 5.17c0 2.03-.44 3.83-1.11 5.17zm-12.37.01a5.21 5.21 0 004.24 1.82 5.2 5.2 0 004.23-1.82c1.01-1.21 1.52-2.92 1.52-5.18 0-2.24-.5-4-1.52-5.2a5.23 5.23 0 00-4.23-1.8c-1.82 0-3.23.6-4.24 1.79-1 1.2-1.51 2.95-1.51 5.21s.5 3.97 1.51 5.18z" fill="white"/><defs><radialGradient id="hub-overlay-nimiq-logo" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-35.9969 0 0 -32 36 32)"><stop stop-color="%23EC991C"/><stop offset="1" stop-color="%23E9B213"/></radialGradient></defs></svg>',M.style.marginBottom="56px",h(Q,M);let W=l("div"),G=W.style;return W.innerHTML="&times;",G.position="absolute",G.top="8px",G.right="8px",G.fontSize="24px",G.lineHeight="32px",G.fontWeight="600",G.width="32px",G.height="32px",G.opacity="0.8",W.addEventListener("click",(Y)=>{if(this.popup)this.popup.close();Y.stopPropagation()}),h(Q,W),setTimeout(()=>Q.style.opacity="1",100),h(document.body,Q)}removeOverlay(l){if(!l)return;l.style.opacity="0",setTimeout(()=>document.body.removeChild(l),400)}};Yl.DEFAULT_FEATURES="";Yl.DEFAULT_OPTIONS={overlay:!0};vl=class vl extends Gl{constructor(){super(_l.IFRAME);this._iframe=null,this._client=null}async request(l,h,Q){if(this._iframe&&this._iframe.src!==`${l}${vl.IFRAME_PATH_SUFFIX}`)throw Error("Hub iframe is already opened with another endpoint");let K=Gl.getAllowedOrigin(l);if(!this._iframe)this._iframe=await this.createIFrame(l);if(!this._iframe.contentWindow)throw Error(`IFrame contentWindow is ${typeof this._iframe.contentWindow}`);if(!this._client)this._client=new Kh(this._iframe.contentWindow,K),await this._client.init();return await this._client.call(h,...await Promise.all(Q))}async createIFrame(l){return new Promise((h,Q)=>{let K=document.createElement("iframe");K.name="NimiqAccountsIFrame",K.style.display="none",document.body.appendChild(K),K.src=`${l}${vl.IFRAME_PATH_SUFFIX}`,K.onload=()=>h(K),K.onerror=Q})}};vl.IFRAME_PATH_SUFFIX="/iframe.html";(function(l){l.LIST="list",l.LIST_CASHLINKS="list-cashlinks",l.MIGRATE="migrate",l.CHECKOUT="checkout",l.SIGN_MESSAGE="sign-message",l.SIGN_TRANSACTION="sign-transaction",l.SIGN_MULTISIG_TRANSACTION="sign-multisig-transaction",l.SIGN_STAKING="sign-staking",l.ONBOARD="onboard",l.SIGNUP="signup",l.LOGIN="login",l.EXPORT="export",l.CHANGE_PASSWORD="change-password",l.LOGOUT="logout",l.ADD_ADDRESS="add-address",l.RENAME="rename",l.ADD_VESTING_CONTRACT="add-vesting-contract",l.CHOOSE_ADDRESS="choose-address",l.CREATE_CASHLINK="create-cashlink",l.MANAGE_CASHLINK="manage-cashlink",l.SIGN_BTC_TRANSACTION="sign-btc-transaction",l.ADD_BTC_ADDRESSES="add-btc-addresses",l.SIGN_POLYGON_TRANSACTION="sign-polygon-transaction",l.ACTIVATE_BITCOIN="activate-bitcoin",l.ACTIVATE_POLYGON="activate-polygon",l.SETUP_SWAP="setup-swap",l.REFUND_SWAP="refund-swap",l.CONNECT_ACCOUNT="connect-account"})(R||(R={}));(function(l){l[l.LEGACY=1]="LEGACY",l[l.BIP39=2]="BIP39",l[l.LEDGER=3]="LEDGER"})(mh||(mh={}));(function(l){l[l.DIRECT=0]="DIRECT",l[l.OASIS=1]="OASIS"})(zh||(zh={}));(function(l){l.NIM="nim",l.BTC="btc",l.ETH="eth"})(dh||(dh={}));(function(l){l.NOT_FOUND="NOT_FOUND",l.PAID="PAID",l.UNDERPAID="UNDERPAID",l.OVERPAID="OVERPAID"})(uh||(uh={}));(function(l){l[l.UNKNOWN=-1]="UNKNOWN",l[l.UNCHARGED=0]="UNCHARGED",l[l.CHARGING=1]="CHARGING",l[l.UNCLAIMED=2]="UNCLAIMED",l[l.CLAIMING=3]="CLAIMING",l[l.CLAIMED=4]="CLAIMED"})(ch||(ch={}));(function(l){l[l.UNSPECIFIED=0]="UNSPECIFIED",l[l.STANDARD=1]="STANDARD",l[l.CHRISTMAS=2]="CHRISTMAS",l[l.LUNAR_NEW_YEAR=3]="LUNAR_NEW_YEAR",l[l.EASTER=4]="EASTER",l[l.GENERIC=5]="GENERIC",l[l.BIRTHDAY=6]="BIRTHDAY"})(ih||(ih={}));d.BehaviorType=_l;d.RequestType=R;d.RedirectRequestBehavior=ph;d.PopupRequestBehavior=Yl;d.AccountType=mh;d.CashlinkState=ch;d.CashlinkTheme=ih;d.Currency=dh;d.PaymentType=zh;d.PaymentState=uh;d.MSG_PREFIX=`\x16Nimiq Signed Message:
`});function wh(){return typeof window<"u"&&!!window.nimiqPay}function yh(){return typeof window<"u"&&!!window.nimiq}function lh(){return wh()||yh()?"miniapp":"hub"}function KK(l){if(l==null)return;let h=typeof l==="string"?new TextEncoder().encode(l):l;if(h.length===0)return;let Q="";for(let K of h)Q+=K.toString(16).padStart(2,"0");return Q}function Rh(l){if(l==null)return;let h=typeof l==="string"?new TextEncoder().encode(l):l;return h.length===0?void 0:h}function qh(l){let h="";for(let Q of l)h+=Q.toString(16).padStart(2,"0");return h}function a0(l){return typeof l==="object"&&l!==null&&"error"in l&&typeof l.error==="object"}function hh(l){if(a0(l))throw Error(`Nimiq Pay: ${l.error.message??l.error.type??"request failed"}`);return l}async function r0(){if(typeof window<"u"&&window.nimiq)return window.nimiq;return await(await Promise.resolve().then(() => (zK(),ZK))).init()}class ql{mode="miniapp";provider;getProviderFn;onChange=null;current=null;constructor(l={}){this.provider=l.provider??null,this.getProviderFn=l.getProvider??r0}async resolveProvider(){if(!this.provider)this.provider=await this.getProviderFn();return this.provider}setAccountChange(l){this.onChange=l}async connect(){let l=await this.resolveProvider();if(l.connect)await l.connect();let Q=hh(await l.listAccounts())[0];if(!Q)return this.current=null,this.onChange?.(null),null;return this.current={address:Q,label:""},this.onChange?.(this.current),this.current}async signAndSend(l){let h=await this.resolveProvider(),Q=l.feeLuna??0,K=KK(l.data),Z;if(K!==void 0)Z=hh(await h.sendBasicTransactionWithData({recipient:l.recipient,value:l.valueLuna,data:K,fee:Q,validityStartHeight:l.validityStartHeight}));else Z=hh(await h.sendBasicTransaction({recipient:l.recipient,value:l.valueLuna,fee:Q,validityStartHeight:l.validityStartHeight}));return{txHash:Z,serializedTx:Z}}pay(l){return this.signAndSend(l)}async signMessage(l){let h=await this.resolveProvider();if(!this.current)throw Error("Nimiq Pay: connect a wallet before signing");let Q=hh(await h.sign(l));return{address:this.current.address,message:l,publicKeyHex:Q.publicKey,signatureHex:Q.signature}}disconnect(){this.current=null,this.onChange?.(null)}}var M1="https://hub.nimiq.com";class Bl{mode="hub";appName;endpoint;client;getClientFn;getBlockHeight;onChange=null;current=null;constructor(l={}){this.appName=l.appName??"Nimiq App",this.endpoint=l.hubEndpoint??M1,this.client=l.client??null,this.getBlockHeight=l.getBlockHeight,this.getClientFn=l.getClient??(async()=>{return new(await Promise.resolve().then(() => (MK(),kK))).default(this.endpoint)})}async resolveClient(){if(!this.client)this.client=await this.getClientFn();return this.client}setAccountChange(l){this.onChange=l}restore(l){this.current={address:l.address,label:l.label??""}}async connect(){let h=await(await this.resolveClient()).chooseAddress({appName:this.appName});if(!h)return null;return this.current={address:h.address,label:h.label??""},this.onChange?.(this.current),this.current}async signAndSend(l){let h=await this.resolveClient();if(!this.current)throw Error("Hub: connect a wallet before sending");let Q=l.validityStartHeight??0;if(l.validityStartHeight==null&&this.getBlockHeight)Q=await this.getBlockHeight();let K=await h.signTransaction({appName:this.appName,sender:this.current.address,recipient:l.recipient,recipientType:0,value:l.valueLuna,fee:l.feeLuna??0,flags:0,extraData:Rh(l.data),validityStartHeight:Q});return{txHash:K.hash,serializedTx:K.serializedTx}}async pay(l){let h=await this.resolveClient();if(!this.current)throw Error("Hub: connect a wallet before paying");let Q=await h.checkout({appName:this.appName,sender:this.current.address,forceSender:!0,recipient:l.recipient,value:l.valueLuna,fee:l.feeLuna??0,extraData:Rh(l.data)});return{txHash:Q.hash,serializedTx:Q.serializedTx}}async signMessage(l){let h=await this.resolveClient();if(!this.current)throw Error("Hub: connect a wallet before signing");let Q=await h.signMessage({appName:this.appName,signer:this.current.address,message:l});return{address:this.current.address,message:l,publicKeyHex:qh(Q.signerPublicKey),signatureHex:qh(Q.signature)}}disconnect(){this.current=null,this.onChange?.(null)}}var sh="nq-shell:hub-account";function V1(){try{let l=localStorage.getItem(sh);if(!l)return null;let h=JSON.parse(l);if(typeof h.address!=="string"||!h.address)return null;return{address:h.address,label:typeof h.label==="string"?h.label:""}}catch{return null}}function nh(l){try{if(l)localStorage.setItem(sh,JSON.stringify({address:l.address,label:l.label}));else localStorage.removeItem(sh)}catch{}}function W1(l={},h={}){let Q=l.mode&&l.mode!=="auto"?l.mode:lh(),K=Q==="miniapp"?new ql(h.miniApp):new Bl({appName:l.appName??"Nimiq App",hubEndpoint:l.hubEndpoint,...h.hub}),Z=Q==="hub"&&l.persist!==!1,k=new Set,M=Z?V1():null;if(M)K.restore?.(M);return K.setAccountChange((G)=>{if(M=G,Z)nh(G);for(let Y of k)Y(G)}),{mode:Q,get account(){return M},set account(G){M=G},async connect(){let G=await K.connect();if(G){if(M=G,Z)nh(G)}return G},signAndSend(G){return K.signAndSend(G)},pay(G){return K.pay(G)},signMessage(G){return K.signMessage(G)},onAccountChange(G){return k.add(G),()=>k.delete(G)},disconnect(){if(K.disconnect(),M=null,Z)nh(null)}}}var j1="https://rpc.nimiqwatch.com";function $1(l){let h=l.result;if(!h)return null;if("data"in h&&h.data)return h.data;return h}function ah(l={}){let h=l.rpc??"https://rpc.nimiqwatch.com",Q=l.fetchImpl??((...K)=>fetch(...K));return async function(Z){let k=Z.replace(/\s+/g,"").toUpperCase().replace(/(.{4})(?=.)/g,"$1 "),M=await Q(h,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method:"getAccountByAddress",params:[k]})});if(!M.ok)throw Error(`nim balance: ${h} answered ${M.status}`);let W=await M.json();if(W.error)throw Error(`nim balance: ${W.error.message??"rpc error"}`);let G=$1(W);if(!G)throw Error("nim balance: no result in rpc response");if(typeof G.balance!=="number")return 0;return G.balance}}var A1=1e5,I1=5;var J1=/^(-?)(\d*)\.?(\d*)(e(-?\d+))?$/;function P1(l){let h=typeof l==="string"?l.trim():l.toString(),Q=h.match(J1);if(!Q)throw Error(`${h} is not a valid number`);let[,K="",Z="",k="",,M=""]=Q,W={sign:K,digits:`${Z}${k}`,sep:Z.length};if(!W.digits)throw Error(`${h} is not a valid number`);let G=Number.parseInt(M,10);if(G)VK(W,G);return W}function VK(l,h){if(l.sep+=h,l.sep>l.digits.length)l.digits=l.digits.padEnd(l.sep,"0");else if(l.sep<0)l.digits=l.digits.padStart(l.digits.length-l.sep,"0"),l.sep=0}function N1(l,h){if(l.digits.length-l.sep<=h)return;let Q=l.sep+h,K=l.digits.substring(0,Q).padEnd(l.sep,"0");if(Number.parseInt(l.digits.charAt(Q),10)<5){l.digits=K;return}let Z=`0${K}`.split("");for(let k=Q;k>=0;--k){let M=Number.parseInt(Z[k]??"0",10)+1;if(M<10){Z[k]=M.toString();break}Z[k]="0"}l.digits=Z.join(""),l.sep+=1}function C1(l,{maxDecimals:h,minDecimals:Q,grouping:K}){let Z=Math.min(Q,h);N1(l,h);let k=l.digits.slice(0,l.sep).replace(/^0+/,""),M=l.digits.slice(l.sep).replace(/0+$/,"");if(Z>M.length)M=M.padEnd(Z,"0");if(K&&k.length>4)k=k.replace(/(\d)(?=(\d{3})+$)/g,`$1${" "}`);let W=`${k||"0"}${M?`.${M}`:""}`;return/[1-9]/.test(W)?`${l.sign}${W}`:W}function Xh(l,h,Q={}){if(!Number.isInteger(h)||h<0)throw Error("fmtUnits: unitDecimals must be a non-negative integer");let{maxDecimals:K=h,minDecimals:Z=2,grouping:k=!0,signed:M=!1}=Q;if(!Number.isInteger(K)||K<0||!Number.isInteger(Z)||Z<0)throw Error("fmtUnits: minDecimals/maxDecimals must be non-negative integers");let W=P1(l);VK(W,-h);let G=C1(W,{maxDecimals:K,minDecimals:Z,grouping:k});return M&&!G.startsWith("-")&&/[1-9]/.test(G)?`+${G}`:G}function Gh(l,h={}){return Xh(l,5,h)}function Al(l,h,Q){if(!Number.isFinite(l))throw Error(`fmtFiat: ${l} is not a finite number`);let K={style:"currency",currency:h},Z=(W)=>{try{return new Intl.NumberFormat(Q,{...W,currencyDisplay:"narrowSymbol"}).format(l)}catch{return new Intl.NumberFormat(Q,W).format(l)}};if(l===0)return Z(K);let k=new Intl.NumberFormat(Q,K).resolvedOptions().maximumFractionDigits??2,M=k;while(Math.abs((l-Number(l.toFixed(M)))/l)>0.1&&M<20)M+=1;if(M===k)return Z(K);return Z({...K,minimumFractionDigits:M,maximumFractionDigits:M})}function El(l){return Number(l)/1e5}function Yh(l){if(!Number.isFinite(l))throw Error(`nimToLuna: ${l} is not a finite number`);return Math.round(l*1e5)}function _1(l){if(typeof l!=="string")throw Error("parseNim: expected a string");let Q=l.trim().replace(/[\u202F\u00A0\s]/g,"").replace(/,(?=\d{3}(\D|$))/g,"").match(/^([+-]?)(\d+)(?:\.(\d+))?$/);if(!Q)throw Error(`parseNim: "${l}" is not a valid NIM amount`);let[,K,Z,k=""]=Q;if(k.length>5)throw Error(`parseNim: "${l}" has more than 5 decimals (sub-luna)`);let M=Number.parseInt(Z+k.padEnd(5,"0"),10);if(!Number.isSafeInteger(M))throw Error(`parseNim: "${l}" is out of safe integer range`);return K==="-"?-M:M}function E1(){if(typeof window>"u"||!window.location)return null;try{let l=new URLSearchParams(window.location.search).get("lang");return l&&l.trim()?l.trim():null}catch{return null}}function F1(){if(typeof window>"u")return null;let l=window.nimiqPay?.language;return l&&l.trim()?l.trim():null}function U1(l){if(typeof localStorage>"u")return null;try{let h=localStorage.getItem(l);return h&&h.trim()?h.trim():null}catch{return null}}function H1(){if(typeof navigator>"u")return null;let l=navigator.language;if(!l)return null;let h=l.split("-")[0];return h&&h.trim()?h.trim():null}function WK(l,h){if(!h)return l;return l.replace(/\{(\w+)\}/g,(Q,K)=>(K in h)?String(h[K]):Q)}function L1(l){let h=l.locales,Q=l.fallback??"en",K=l.storageKey??"nimiq-app-lang",Z=new Set,k=Object.keys(h),M=(z)=>!!z&&(z in h);function W(z){if(M(z))return h[z];if(M(Q))return h[Q];return{}}function G(){if(l.initial&&l.initial.trim())return l.initial.trim();let z=[E1(),F1(),U1(K),H1()];for(let j of z)if(M(j))return j;return Q}let Y=G();function P(z){if(typeof document<"u"&&document.documentElement)document.documentElement.lang=z}function X(z){if(typeof localStorage>"u")return;try{localStorage.setItem(K,z)}catch{}}return P(Y),X(Y),{t(z,j){let $=W(Y)[z];if($==null&&M(Q))$=h[Q][z];if($==null)return WK(z,j);return WK($,j)},setLanguage(z){let j=z.trim();if(!j||j===Y){P(Y),X(Y);return}Y=j,X(j),P(j);for(let I of Z)I(j)},getLanguage(){return Y},availableLanguages(){return[...k]},onChange(z){return Z.add(z),()=>Z.delete(z)}}}var jK={"shell.connectWallet":"Connect wallet","shell.connecting":"Connecting","shell.disconnect":"Disconnect","shell.switchAccount":"Switch account","shell.saveContact":"Save this recipient as?","shell.profile":"Profile","shell.account":"Account","shell.address":"Address","shell.copyAddress":"Copy address","shell.copied":"Copied","shell.balance":"Balance","shell.language":"Language","shell.notConnected":"Not connected","shell.back":"Back","shell.close":"Close","shell.receiveSub":"Share your address with the sender.","shell.addressSheet":"{ticker} Address","shell.scanToSend":"Scan the code to send {ticker} to this address","shell.showQr":"Show QR code","shell.requestLink":"Create request link","shell.requestTitle":"Request {ticker}","shell.anyAmount":"Leave empty for any amount","shell.copyLink":"Copy link","shell.sendAmount":"Send Amount","shell.sendTransaction":"Send Transaction","shell.enterAddress":"Enter address","shell.publicMessage":"Add a public message...","shell.contacts":"Contacts","shell.addressUnavailable":"Address unavailable?","shell.send":"Send","shell.cancel":"Cancel","shell.retry":"Retry","shell.receive":"Receive","shell.amountsIn":"Show amounts in","shell.openInPay":"Open in Nimiq Pay","shell.network":"Network","shell.networkOnly":"Send {ticker} on {network} only. Coins sent on another network are lost.","shell.createCashlink":"Create a Cashlink","shell.newToNimiq":"New to Nimiq? Create a wallet","shell.recipient":"Recipient","shell.available":"Available","shell.sending":"Sending","shell.sent":"Sent","shell.sendFailed":"Something went wrong","shell.amount":"Amount","shell.reportBug":"Report a bug","shell.fbType":"Type","shell.fbBug":"Bug","shell.fbIdea":"Idea","shell.fbQuestion":"Question","shell.fbSummary":"Summary","shell.fbDetails":"What happened?","shell.fbIncludeDiag":"Include page and browser info","shell.fbSend":"Send","shell.fbSending":"Sending","shell.fbThanks":"Thanks, that is on its way.","shell.fbFailed":"That did not send.","shell.fbFailEmail":"send it by email instead","shell.fbErrType":"Pick a type.","shell.fbErrTitle":"Give it a summary of at least 5 characters.","shell.fbErrDetails":"Add a little more detail, at least 10 characters."};var $K={"shell.connectWallet":"Wallet verbinden","shell.connecting":"Verbinden","shell.disconnect":"Trennen","shell.switchAccount":"Konto wechseln","shell.saveContact":"Diesen Empfänger speichern als?","shell.profile":"Profil","shell.account":"Konto","shell.address":"Adresse","shell.copyAddress":"Adresse kopieren","shell.copied":"Kopiert","shell.balance":"Guthaben","shell.language":"Sprache","shell.notConnected":"Nicht verbunden","shell.back":"Zurück","shell.close":"Schließen","shell.receiveSub":"Teile deine Adresse mit dem Absender.","shell.addressSheet":"{ticker} Adresse","shell.scanToSend":"Scanne den Code, um {ticker} an diese Adresse zu senden","shell.showQr":"QR-Code anzeigen","shell.requestLink":"Zahlungslink erstellen","shell.requestTitle":"{ticker} anfordern","shell.anyAmount":"Leer lassen für einen beliebigen Betrag","shell.copyLink":"Link kopieren","shell.sendAmount":"Betrag senden","shell.sendTransaction":"Transaktion senden","shell.enterAddress":"Adresse eingeben","shell.publicMessage":"Öffentliche Nachricht hinzufügen...","shell.contacts":"Kontakte","shell.addressUnavailable":"Adresse nicht verfügbar?","shell.send":"Senden","shell.cancel":"Abbrechen","shell.retry":"Erneut versuchen","shell.receive":"Empfangen","shell.amountsIn":"Beträge anzeigen in","shell.openInPay":"In Nimiq Pay öffnen","shell.network":"Netzwerk","shell.networkOnly":"Sende {ticker} nur über {network}. Über ein anderes Netzwerk gesendete Coins sind verloren.","shell.createCashlink":"Cashlink erstellen","shell.newToNimiq":"Neu bei Nimiq? Wallet erstellen","shell.recipient":"Empfänger","shell.available":"Verfügbar","shell.sending":"Wird gesendet","shell.sent":"Gesendet","shell.sendFailed":"Etwas ist schiefgelaufen","shell.amount":"Betrag","shell.reportBug":"Fehler melden","shell.fbType":"Art","shell.fbBug":"Fehler","shell.fbIdea":"Idee","shell.fbQuestion":"Frage","shell.fbSummary":"Kurzfassung","shell.fbDetails":"Was ist passiert?","shell.fbIncludeDiag":"Seiten- und Browserdaten mitsenden","shell.fbSend":"Senden","shell.fbSending":"Wird gesendet","shell.fbThanks":"Danke, es ist unterwegs.","shell.fbFailed":"Das konnte nicht gesendet werden.","shell.fbFailEmail":"stattdessen per E-Mail senden","shell.fbErrType":"Bitte eine Art wählen.","shell.fbErrTitle":"Bitte eine Kurzfassung mit mindestens 5 Zeichen.","shell.fbErrDetails":"Bitte etwas mehr Details, mindestens 10 Zeichen."};var AK={"shell.connectWallet":"Conectar cartera","shell.connecting":"Conectando","shell.disconnect":"Desconectar","shell.switchAccount":"Cambiar de cuenta","shell.saveContact":"¿Guardar este destinatario como?","shell.profile":"Perfil","shell.account":"Cuenta","shell.address":"Dirección","shell.copyAddress":"Copiar dirección","shell.copied":"Copiado","shell.balance":"Saldo","shell.language":"Idioma","shell.notConnected":"No conectado","shell.back":"Atrás","shell.close":"Cerrar","shell.receiveSub":"Comparte tu dirección con quien te envía.","shell.addressSheet":"Dirección {ticker}","shell.scanToSend":"Escanea el código para enviar {ticker} a esta dirección","shell.showQr":"Mostrar código QR","shell.requestLink":"Crear enlace de pago","shell.requestTitle":"Solicitar {ticker}","shell.anyAmount":"Déjalo vacío para cualquier importe","shell.copyLink":"Copiar enlace","shell.sendAmount":"Enviar importe","shell.sendTransaction":"Enviar transacción","shell.enterAddress":"Introduce la dirección","shell.publicMessage":"Añade un mensaje público...","shell.contacts":"Contactos","shell.addressUnavailable":"¿No tienes la dirección?","shell.send":"Enviar","shell.cancel":"Cancelar","shell.retry":"Reintentar","shell.receive":"Recibir","shell.amountsIn":"Mostrar importes en","shell.openInPay":"Abrir en Nimiq Pay","shell.network":"Red","shell.networkOnly":"Envía {ticker} solo por {network}. Las monedas enviadas por otra red se pierden.","shell.createCashlink":"Crear un Cashlink","shell.newToNimiq":"¿Nuevo en Nimiq? Crea una cartera","shell.recipient":"Destinatario","shell.available":"Disponible","shell.sending":"Enviando","shell.sent":"Enviado","shell.sendFailed":"Algo salió mal","shell.amount":"Cantidad","shell.reportBug":"Reportar un error","shell.fbType":"Tipo","shell.fbBug":"Error","shell.fbIdea":"Idea","shell.fbQuestion":"Pregunta","shell.fbSummary":"Resumen","shell.fbDetails":"¿Qué pasó?","shell.fbIncludeDiag":"Incluir datos de la página y del navegador","shell.fbSend":"Enviar","shell.fbSending":"Enviando","shell.fbThanks":"Gracias, ya va en camino.","shell.fbFailed":"No se pudo enviar.","shell.fbFailEmail":"envíalo por correo","shell.fbErrType":"Elige un tipo.","shell.fbErrTitle":"Escribe un resumen de al menos 5 caracteres.","shell.fbErrDetails":"Añade un poco más de detalle, al menos 10 caracteres."};var IK={"shell.connectWallet":"Connecter le portefeuille","shell.connecting":"Connexion","shell.disconnect":"Déconnecter","shell.switchAccount":"Changer de compte","shell.saveContact":"Enregistrer ce destinataire sous ?","shell.profile":"Profil","shell.account":"Compte","shell.address":"Adresse","shell.copyAddress":"Copier l'adresse","shell.copied":"Copié","shell.balance":"Solde","shell.language":"Langue","shell.notConnected":"Non connecté","shell.back":"Retour","shell.close":"Fermer","shell.receiveSub":"Partagez votre adresse avec l'expéditeur.","shell.addressSheet":"Adresse {ticker}","shell.scanToSend":"Scannez le code pour envoyer des {ticker} à cette adresse","shell.showQr":"Afficher le code QR","shell.requestLink":"Créer un lien de paiement","shell.requestTitle":"Demander des {ticker}","shell.anyAmount":"Laissez vide pour un montant libre","shell.copyLink":"Copier le lien","shell.sendAmount":"Montant à envoyer","shell.sendTransaction":"Envoyer une transaction","shell.enterAddress":"Saisissez l'adresse","shell.publicMessage":"Ajoutez un message public...","shell.contacts":"Contacts","shell.addressUnavailable":"Adresse indisponible ?","shell.send":"Envoyer","shell.cancel":"Annuler","shell.retry":"Réessayer","shell.receive":"Recevoir","shell.amountsIn":"Afficher les montants en","shell.openInPay":"Ouvrir dans Nimiq Pay","shell.network":"Réseau","shell.networkOnly":"Envoyez des {ticker} uniquement via {network}. Les fonds envoyés via un autre réseau sont perdus.","shell.createCashlink":"Créer un Cashlink","shell.newToNimiq":"Nouveau sur Nimiq ? Créez un portefeuille","shell.recipient":"Destinataire","shell.available":"Disponible","shell.sending":"Envoi en cours","shell.sent":"Envoyé","shell.sendFailed":"Une erreur est survenue","shell.amount":"Montant","shell.reportBug":"Signaler un bug","shell.fbType":"Type","shell.fbBug":"Bug","shell.fbIdea":"Idée","shell.fbQuestion":"Question","shell.fbSummary":"Résumé","shell.fbDetails":"Que s'est-il passé ?","shell.fbIncludeDiag":"Inclure les infos de page et de navigateur","shell.fbSend":"Envoyer","shell.fbSending":"Envoi en cours","shell.fbThanks":"Merci, c'est parti.","shell.fbFailed":"L'envoi a échoué.","shell.fbFailEmail":"envoyer par e-mail","shell.fbErrType":"Choisissez un type.","shell.fbErrTitle":"Donnez un résumé d'au moins 5 caractères.","shell.fbErrDetails":"Ajoutez un peu plus de détails, au moins 10 caractères."};var JK={"shell.connectWallet":"Conectar carteira","shell.connecting":"Conectando","shell.disconnect":"Desconectar","shell.switchAccount":"Trocar de conta","shell.saveContact":"Salvar este destinatário como?","shell.profile":"Perfil","shell.account":"Conta","shell.address":"Endereço","shell.copyAddress":"Copiar endereço","shell.copied":"Copiado","shell.balance":"Saldo","shell.language":"Idioma","shell.notConnected":"Não conectado","shell.back":"Voltar","shell.close":"Fechar","shell.receiveSub":"Compartilhe seu endereço com o remetente.","shell.addressSheet":"Endereço {ticker}","shell.scanToSend":"Escaneie o código para enviar {ticker} para este endereço","shell.showQr":"Mostrar código QR","shell.requestLink":"Criar link de pagamento","shell.requestTitle":"Solicitar {ticker}","shell.anyAmount":"Deixe vazio para qualquer valor","shell.copyLink":"Copiar link","shell.sendAmount":"Enviar valor","shell.sendTransaction":"Enviar transação","shell.enterAddress":"Digite o endereço","shell.publicMessage":"Adicione uma mensagem pública...","shell.contacts":"Contatos","shell.addressUnavailable":"Endereço indisponível?","shell.send":"Enviar","shell.cancel":"Cancelar","shell.retry":"Tentar novamente","shell.receive":"Receber","shell.amountsIn":"Mostrar valores em","shell.openInPay":"Abrir no Nimiq Pay","shell.network":"Rede","shell.networkOnly":"Envie {ticker} apenas via {network}. Moedas enviadas por outra rede são perdidas.","shell.createCashlink":"Criar um Cashlink","shell.newToNimiq":"Novo na Nimiq? Crie uma carteira","shell.recipient":"Destinatário","shell.available":"Disponível","shell.sending":"Enviando","shell.sent":"Enviado","shell.sendFailed":"Algo deu errado","shell.amount":"Valor","shell.reportBug":"Relatar um erro","shell.fbType":"Tipo","shell.fbBug":"Erro","shell.fbIdea":"Ideia","shell.fbQuestion":"Pergunta","shell.fbSummary":"Resumo","shell.fbDetails":"O que aconteceu?","shell.fbIncludeDiag":"Incluir dados da página e do navegador","shell.fbSend":"Enviar","shell.fbSending":"Enviando","shell.fbThanks":"Obrigado, já foi enviado.","shell.fbFailed":"Não foi possível enviar.","shell.fbFailEmail":"envie por e-mail","shell.fbErrType":"Escolha um tipo.","shell.fbErrTitle":"Escreva um resumo com pelo menos 5 caracteres.","shell.fbErrDetails":"Acrescente mais detalhes, pelo menos 10 caracteres."};var PK={"shell.connectWallet":"वॉलेट कनेक्ट करें","shell.connecting":"कनेक्ट हो रहा है","shell.disconnect":"डिस्कनेक्ट करें","shell.switchAccount":"खाता बदलें","shell.saveContact":"इस प्राप्तकर्ता को किस नाम से सहेजें?","shell.profile":"प्रोफ़ाइल","shell.account":"खाता","shell.address":"पता","shell.copyAddress":"पता कॉपी करें","shell.copied":"कॉपी हो गया","shell.balance":"बैलेंस","shell.language":"भाषा","shell.notConnected":"कनेक्ट नहीं है","shell.back":"वापस","shell.close":"बंद करें","shell.receiveSub":"भेजने वाले के साथ अपना पता साझा करें।","shell.addressSheet":"{ticker} पता","shell.scanToSend":"इस पते पर {ticker} भेजने के लिए कोड स्कैन करें","shell.showQr":"QR कोड दिखाएं","shell.requestLink":"भुगतान लिंक बनाएं","shell.requestTitle":"{ticker} का अनुरोध","shell.anyAmount":"किसी भी राशि के लिए खाली छोड़ें","shell.copyLink":"लिंक कॉपी करें","shell.sendAmount":"राशि भेजें","shell.sendTransaction":"लेनदेन भेजें","shell.enterAddress":"पता दर्ज करें","shell.publicMessage":"सार्वजनिक संदेश जोड़ें...","shell.contacts":"संपर्क","shell.addressUnavailable":"पता उपलब्ध नहीं?","shell.send":"भेजें","shell.cancel":"रद्द करें","shell.retry":"फिर कोशिश करें","shell.receive":"प्राप्त करें","shell.amountsIn":"राशि इसमें दिखाएँ","shell.openInPay":"Nimiq Pay में खोलें","shell.network":"नेटवर्क","shell.networkOnly":"{ticker} केवल {network} पर भेजें। दूसरे नेटवर्क पर भेजी गई राशि खो जाती है।","shell.createCashlink":"Cashlink बनाएँ","shell.newToNimiq":"Nimiq पर नए हैं? वॉलेट बनाएँ","shell.recipient":"प्राप्तकर्ता","shell.available":"उपलब्ध","shell.sending":"भेजा जा रहा है","shell.sent":"भेज दिया","shell.sendFailed":"कुछ गड़बड़ हो गई","shell.amount":"राशि","shell.reportBug":"समस्या बताएँ","shell.fbType":"प्रकार","shell.fbBug":"बग","shell.fbIdea":"सुझाव","shell.fbQuestion":"सवाल","shell.fbSummary":"सारांश","shell.fbDetails":"क्या हुआ?","shell.fbIncludeDiag":"पेज और ब्राउज़र की जानकारी शामिल करें","shell.fbSend":"भेजें","shell.fbSending":"भेजा जा रहा है","shell.fbThanks":"धन्यवाद, यह भेजा जा रहा है।","shell.fbFailed":"यह भेजा नहीं जा सका।","shell.fbFailEmail":"इसके बजाय ईमेल से भेजें","shell.fbErrType":"एक प्रकार चुनें।","shell.fbErrTitle":"सारांश कम से कम 5 अक्षरों का दें।","shell.fbErrDetails":"थोड़ा और विवरण दें, कम से कम 10 अक्षर।"};var NK={"shell.connectWallet":"连接钱包","shell.connecting":"连接中","shell.disconnect":"断开连接","shell.switchAccount":"切换账户","shell.saveContact":"将此收款人保存为？","shell.profile":"个人资料","shell.account":"账户","shell.address":"地址","shell.copyAddress":"复制地址","shell.copied":"已复制","shell.balance":"余额","shell.language":"语言","shell.notConnected":"未连接","shell.back":"返回","shell.close":"关闭","shell.receiveSub":"将您的地址分享给付款方。","shell.addressSheet":"{ticker} 地址","shell.scanToSend":"扫描二维码向此地址发送 {ticker}","shell.showQr":"显示二维码","shell.requestLink":"创建收款链接","shell.requestTitle":"请求 {ticker}","shell.anyAmount":"留空表示任意金额","shell.copyLink":"复制链接","shell.sendAmount":"发送金额","shell.sendTransaction":"发送交易","shell.enterAddress":"输入地址","shell.publicMessage":"添加公开留言...","shell.contacts":"联系人","shell.addressUnavailable":"没有地址？","shell.send":"发送","shell.cancel":"取消","shell.retry":"重试","shell.receive":"接收","shell.amountsIn":"金额显示为","shell.openInPay":"在 Nimiq Pay 中打开","shell.network":"网络","shell.networkOnly":"仅通过 {network} 发送 {ticker}。经其他网络发送的资产将会丢失。","shell.createCashlink":"创建 Cashlink","shell.newToNimiq":"初次使用 Nimiq？创建钱包","shell.recipient":"收款人","shell.available":"可用","shell.sending":"发送中","shell.sent":"已发送","shell.sendFailed":"出了点问题","shell.amount":"金额","shell.reportBug":"报告问题","shell.fbType":"类型","shell.fbBug":"缺陷","shell.fbIdea":"建议","shell.fbQuestion":"问题","shell.fbSummary":"摘要","shell.fbDetails":"发生了什么？","shell.fbIncludeDiag":"包含页面和浏览器信息","shell.fbSend":"发送","shell.fbSending":"发送中","shell.fbThanks":"谢谢，已经在路上了。","shell.fbFailed":"发送失败。","shell.fbFailEmail":"改用电子邮件发送","shell.fbErrType":"请选择类型。","shell.fbErrTitle":"摘要至少需要 5 个字符。","shell.fbErrDetails":"请再补充一些细节，至少 10 个字符。"};var CK={"shell.connectWallet":"Cüzdanı bağla","shell.connecting":"Bağlanıyor","shell.disconnect":"Bağlantıyı kes","shell.switchAccount":"Hesap değiştir","shell.saveContact":"Bu alıcıyı hangi adla kaydedelim?","shell.profile":"Profil","shell.account":"Hesap","shell.address":"Adres","shell.copyAddress":"Adresi kopyala","shell.copied":"Kopyalandı","shell.balance":"Bakiye","shell.language":"Dil","shell.notConnected":"Bağlı değil","shell.back":"Geri","shell.close":"Kapat","shell.receiveSub":"Adresinizi gönderene iletin.","shell.addressSheet":"{ticker} Adresi","shell.scanToSend":"Bu adrese {ticker} göndermek için kodu okutun","shell.showQr":"QR kodunu göster","shell.requestLink":"Ödeme bağlantısı oluştur","shell.requestTitle":"{ticker} iste","shell.anyAmount":"Herhangi bir tutar için boş bırakın","shell.copyLink":"Bağlantıyı kopyala","shell.sendAmount":"Gönderilecek tutar","shell.sendTransaction":"İşlem gönder","shell.enterAddress":"Adresi girin","shell.publicMessage":"Herkese açık mesaj ekleyin...","shell.contacts":"Kişiler","shell.addressUnavailable":"Adres yok mu?","shell.send":"Gönder","shell.cancel":"İptal et","shell.retry":"Tekrar dene","shell.receive":"Al","shell.amountsIn":"Miktarları göster","shell.openInPay":"Nimiq Pay'de aç","shell.network":"Ağ","shell.networkOnly":"{ticker} yalnızca {network} üzerinden gönderin. Başka bir ağdan gönderilenler kaybolur.","shell.createCashlink":"Cashlink oluştur","shell.newToNimiq":"Nimiq'te yeni misiniz? Cüzdan oluşturun","shell.recipient":"Alıcı","shell.available":"Kullanılabilir","shell.sending":"Gönderiliyor","shell.sent":"Gönderildi","shell.sendFailed":"Bir şeyler ters gitti","shell.amount":"Miktar","shell.reportBug":"Hata bildir","shell.fbType":"Tür","shell.fbBug":"Hata","shell.fbIdea":"Fikir","shell.fbQuestion":"Soru","shell.fbSummary":"Özet","shell.fbDetails":"Ne oldu?","shell.fbIncludeDiag":"Sayfa ve tarayıcı bilgilerini ekle","shell.fbSend":"Gönder","shell.fbSending":"Gönderiliyor","shell.fbThanks":"Teşekkürler, yola çıktı.","shell.fbFailed":"Gönderilemedi.","shell.fbFailEmail":"bunun yerine e-posta ile gönder","shell.fbErrType":"Bir tür seçin.","shell.fbErrTitle":"En az 5 karakterlik bir özet yazın.","shell.fbErrDetails":"Biraz daha ayrıntı ekleyin, en az 10 karakter."};var _K={"shell.connectWallet":"지갑 연결","shell.connecting":"연결 중","shell.disconnect":"연결 해제","shell.switchAccount":"계정 전환","shell.saveContact":"이 수신자를 어떤 이름으로 저장할까요?","shell.profile":"프로필","shell.account":"계정","shell.address":"주소","shell.copyAddress":"주소 복사","shell.copied":"복사됨","shell.balance":"잔액","shell.language":"언어","shell.notConnected":"연결되지 않음","shell.back":"뒤로","shell.close":"닫기","shell.receiveSub":"보내는 사람에게 주소를 공유하세요.","shell.addressSheet":"{ticker} 주소","shell.scanToSend":"이 주소로 {ticker}을 보내려면 코드를 스캔하세요","shell.showQr":"QR 코드 보기","shell.requestLink":"결제 링크 만들기","shell.requestTitle":"{ticker} 요청","shell.anyAmount":"금액을 비워두면 자유 금액","shell.copyLink":"링크 복사","shell.sendAmount":"보낼 금액","shell.sendTransaction":"거래 보내기","shell.enterAddress":"주소 입력","shell.publicMessage":"공개 메시지 추가...","shell.contacts":"연락처","shell.addressUnavailable":"주소가 없나요?","shell.send":"보내기","shell.cancel":"취소","shell.retry":"다시 시도","shell.receive":"받기","shell.amountsIn":"금액 표시 통화","shell.openInPay":"Nimiq Pay에서 열기","shell.network":"네트워크","shell.networkOnly":"{ticker}는 {network}에서만 보내세요. 다른 네트워크로 보낸 자산은 사라집니다.","shell.createCashlink":"Cashlink 만들기","shell.newToNimiq":"Nimiq이 처음이신가요? 지갑을 만드세요","shell.recipient":"받는 사람","shell.available":"사용 가능","shell.sending":"보내는 중","shell.sent":"전송됨","shell.sendFailed":"문제가 발생했습니다","shell.amount":"금액","shell.reportBug":"버그 신고","shell.fbType":"유형","shell.fbBug":"버그","shell.fbIdea":"아이디어","shell.fbQuestion":"질문","shell.fbSummary":"요약","shell.fbDetails":"무슨 일이 있었나요?","shell.fbIncludeDiag":"페이지 및 브라우저 정보 포함","shell.fbSend":"보내기","shell.fbSending":"보내는 중","shell.fbThanks":"감사합니다. 전달 중입니다.","shell.fbFailed":"전송하지 못했습니다.","shell.fbFailEmail":"대신 이메일로 보내기","shell.fbErrType":"유형을 선택하세요.","shell.fbErrTitle":"요약을 5자 이상 입력하세요.","shell.fbErrDetails":"조금 더 자세히, 10자 이상 적어 주세요."};var EK={"shell.connectWallet":"Kết nối ví","shell.connecting":"Đang kết nối","shell.disconnect":"Ngắt kết nối","shell.switchAccount":"Đổi tài khoản","shell.saveContact":"Lưu người nhận này với tên?","shell.profile":"Hồ sơ","shell.account":"Tài khoản","shell.address":"Địa chỉ","shell.copyAddress":"Sao chép địa chỉ","shell.copied":"Đã sao chép","shell.balance":"Số dư","shell.language":"Ngôn ngữ","shell.notConnected":"Chưa kết nối","shell.back":"Quay lại","shell.close":"Đóng","shell.receiveSub":"Chia sẻ địa chỉ của bạn với người gửi.","shell.addressSheet":"Địa chỉ {ticker}","shell.scanToSend":"Quét mã để gửi {ticker} đến địa chỉ này","shell.showQr":"Hiện mã QR","shell.requestLink":"Tạo liên kết thanh toán","shell.requestTitle":"Yêu cầu {ticker}","shell.anyAmount":"Để trống cho số tiền tùy ý","shell.copyLink":"Sao chép liên kết","shell.sendAmount":"Số tiền gửi","shell.sendTransaction":"Gửi giao dịch","shell.enterAddress":"Nhập địa chỉ","shell.publicMessage":"Thêm tin nhắn công khai...","shell.contacts":"Danh bạ","shell.addressUnavailable":"Không có địa chỉ?","shell.send":"Gửi","shell.cancel":"Huỷ","shell.retry":"Thử lại","shell.receive":"Nhận","shell.amountsIn":"Hiển thị số tiền theo","shell.openInPay":"Mở trong Nimiq Pay","shell.network":"Mạng","shell.networkOnly":"Chỉ gửi {ticker} qua {network}. Tiền gửi qua mạng khác sẽ mất.","shell.createCashlink":"Tạo Cashlink","shell.newToNimiq":"Mới dùng Nimiq? Tạo ví","shell.recipient":"Người nhận","shell.available":"Khả dụng","shell.sending":"Đang gửi","shell.sent":"Đã gửi","shell.sendFailed":"Đã xảy ra lỗi","shell.amount":"Số tiền","shell.reportBug":"Báo lỗi","shell.fbType":"Loại","shell.fbBug":"Lỗi","shell.fbIdea":"Ý tưởng","shell.fbQuestion":"Câu hỏi","shell.fbSummary":"Tóm tắt","shell.fbDetails":"Chuyện gì đã xảy ra?","shell.fbIncludeDiag":"Kèm thông tin trang và trình duyệt","shell.fbSend":"Gửi","shell.fbSending":"Đang gửi","shell.fbThanks":"Cảm ơn bạn, phản hồi đang được gửi đi.","shell.fbFailed":"Không gửi được.","shell.fbFailEmail":"gửi bằng email thay thế","shell.fbErrType":"Hãy chọn một loại.","shell.fbErrTitle":"Tóm tắt cần ít nhất 5 ký tự.","shell.fbErrDetails":"Hãy mô tả thêm, ít nhất 10 ký tự."};var FK={"shell.connectWallet":"Haɗa walat","shell.connecting":"Ana haɗawa","shell.disconnect":"Cire haɗin","shell.switchAccount":"Sauya asusu","shell.saveContact":"A ajiye wannan mai karɓa da wane suna?","shell.profile":"Bayanan martaba","shell.account":"Asusu","shell.address":"Adireshi","shell.copyAddress":"Kwafi adireshi","shell.copied":"An kwafa","shell.balance":"Ma’auni","shell.language":"Harshe","shell.notConnected":"Ba a haɗa ba","shell.back":"Koma","shell.close":"Rufe","shell.receiveSub":"Ka raba adireshinka da mai aikawa.","shell.addressSheet":"Adireshin {ticker}","shell.scanToSend":"Duba lambar don aika {ticker} zuwa wannan adireshin","shell.showQr":"Nuna lambar QR","shell.requestLink":"Ƙirƙiri hanyar biya","shell.requestTitle":"Nemi {ticker}","shell.anyAmount":"Bar shi babu don kowane adadi","shell.copyLink":"Kwafi hanyar","shell.sendAmount":"Aika adadi","shell.sendTransaction":"Aika ma'amala","shell.enterAddress":"Shigar da adireshi","shell.publicMessage":"Ƙara saƙo na jama'a...","shell.contacts":"Lambobin sadarwa","shell.addressUnavailable":"Babu adireshi?","shell.send":"Aika","shell.cancel":"Soke","shell.retry":"Sake gwadawa","shell.receive":"Karɓa","shell.amountsIn":"Nuna kuɗi da","shell.openInPay":"Buɗe cikin Nimiq Pay","shell.network":"Hanyar sadarwa","shell.networkOnly":"Aika {ticker} ta {network} kaɗai. Kuɗin da aka aika ta wata hanya yana ɓacewa.","shell.createCashlink":"Ƙirƙiri Cashlink","shell.newToNimiq":"Sabo ne ga Nimiq? Ƙirƙiri walat","shell.recipient":"Mai karɓa","shell.available":"Akwai","shell.sending":"Ana aikawa","shell.sent":"An aika","shell.sendFailed":"Wani abu ya ɓaci","shell.amount":"Adadi","shell.reportBug":"Bayar da rahoton matsala","shell.fbType":"Nau’i","shell.fbBug":"Matsala","shell.fbIdea":"Shawara","shell.fbQuestion":"Tambaya","shell.fbSummary":"Taƙaitawa","shell.fbDetails":"Me ya faru?","shell.fbIncludeDiag":"Haɗa bayanan shafi da burauza","shell.fbSend":"Aika","shell.fbSending":"Ana aikawa","shell.fbThanks":"Na gode, ana kan aika shi.","shell.fbFailed":"Bai aika ba.","shell.fbFailEmail":"a aika ta imel maimakon haka","shell.fbErrType":"Zaɓi nau’i.","shell.fbErrTitle":"Rubuta taƙaitawa na aƙalla haruffa 5.","shell.fbErrDetails":"Ƙara bayani kaɗan, aƙalla haruffa 10."};var UK={"shell.connectWallet":"Ikonekta ang wallet","shell.connecting":"Kumokonekta","shell.disconnect":"Idiskonekta","shell.switchAccount":"Magpalit ng account","shell.saveContact":"I-save ang tatanggap na ito bilang?","shell.profile":"Profile","shell.account":"Account","shell.address":"Adres","shell.copyAddress":"Kopyahin ang address","shell.copied":"Nakopya","shell.balance":"Balanse","shell.language":"Wika","shell.notConnected":"Hindi nakakonekta","shell.back":"Bumalik","shell.close":"Isara","shell.receiveSub":"Ibahagi ang iyong adres sa magpapadala.","shell.addressSheet":"{ticker} Adres","shell.scanToSend":"I-scan ang code para magpadala ng {ticker} sa adres na ito","shell.showQr":"Ipakita ang QR code","shell.requestLink":"Gumawa ng link ng bayad","shell.requestTitle":"Humiling ng {ticker}","shell.anyAmount":"Iwanang blangko para sa anumang halaga","shell.copyLink":"Kopyahin ang link","shell.sendAmount":"Halagang ipapadala","shell.sendTransaction":"Magpadala ng transaksyon","shell.enterAddress":"Ilagay ang adres","shell.publicMessage":"Magdagdag ng pampublikong mensahe...","shell.contacts":"Mga kontak","shell.addressUnavailable":"Walang adres?","shell.send":"Ipadala","shell.cancel":"Ikansela","shell.retry":"Subukang muli","shell.receive":"Tumanggap","shell.amountsIn":"Ipakita ang halaga sa","shell.openInPay":"Buksan sa Nimiq Pay","shell.network":"Network","shell.networkOnly":"Magpadala ng {ticker} sa {network} lamang. Nawawala ang ipinadala sa ibang network.","shell.createCashlink":"Lumikha ng isang Cashlink","shell.newToNimiq":"Bago sa Nimiq? Gumawa ng wallet","shell.recipient":"Tatanggap","shell.available":"Magagamit","shell.sending":"Ipinapadala","shell.sent":"Naipadala","shell.sendFailed":"May nangyaring mali","shell.amount":"Halaga","shell.reportBug":"Mag-ulat ng bug","shell.fbType":"Uri","shell.fbBug":"Bug","shell.fbIdea":"Ideya","shell.fbQuestion":"Tanong","shell.fbSummary":"Buod","shell.fbDetails":"Ano ang nangyari?","shell.fbIncludeDiag":"Isama ang impormasyon ng page at browser","shell.fbSend":"Ipadala","shell.fbSending":"Ipinapadala","shell.fbThanks":"Salamat, papunta na ito.","shell.fbFailed":"Hindi ito naipadala.","shell.fbFailEmail":"ipadala na lang sa email","shell.fbErrType":"Pumili ng uri.","shell.fbErrTitle":"Maglagay ng buod na hindi bababa sa 5 karakter.","shell.fbErrDetails":"Magdagdag ng kaunting detalye, hindi bababa sa 10 karakter."};var HK={"shell.connectWallet":"Hubungkan dompet","shell.connecting":"Menghubungkan","shell.disconnect":"Putuskan","shell.switchAccount":"Ganti akun","shell.saveContact":"Simpan penerima ini sebagai?","shell.profile":"Profil","shell.account":"Akun","shell.address":"Alamat","shell.copyAddress":"Salin alamat","shell.copied":"Tersalin","shell.balance":"Saldo","shell.language":"Bahasa","shell.notConnected":"Tidak terhubung","shell.back":"Kembali","shell.close":"Tutup","shell.receiveSub":"Bagikan alamat Anda kepada pengirim.","shell.addressSheet":"Alamat {ticker}","shell.scanToSend":"Pindai kode untuk mengirim {ticker} ke alamat ini","shell.showQr":"Tampilkan kode QR","shell.requestLink":"Buat tautan pembayaran","shell.requestTitle":"Minta {ticker}","shell.anyAmount":"Biarkan kosong untuk jumlah bebas","shell.copyLink":"Salin tautan","shell.sendAmount":"Kirim jumlah","shell.sendTransaction":"Kirim transaksi","shell.enterAddress":"Masukkan alamat","shell.publicMessage":"Tambahkan pesan publik...","shell.contacts":"Kontak","shell.addressUnavailable":"Alamat tidak tersedia?","shell.send":"Kirim","shell.cancel":"Batal","shell.retry":"Coba lagi","shell.receive":"Terima","shell.amountsIn":"Tampilkan jumlah dalam","shell.openInPay":"Buka di Nimiq Pay","shell.network":"Jaringan","shell.networkOnly":"Kirim {ticker} hanya melalui {network}. Dana yang dikirim lewat jaringan lain akan hilang.","shell.createCashlink":"Buat Cashlink","shell.newToNimiq":"Baru di Nimiq? Buat dompet","shell.recipient":"Penerima","shell.available":"Tersedia","shell.sending":"Mengirim","shell.sent":"Terkirim","shell.sendFailed":"Terjadi kesalahan","shell.amount":"Jumlah","shell.reportBug":"Laporkan bug","shell.fbType":"Jenis","shell.fbBug":"Bug","shell.fbIdea":"Ide","shell.fbQuestion":"Pertanyaan","shell.fbSummary":"Ringkasan","shell.fbDetails":"Apa yang terjadi?","shell.fbIncludeDiag":"Sertakan info halaman dan peramban","shell.fbSend":"Kirim","shell.fbSending":"Mengirim","shell.fbThanks":"Terima kasih, sedang dikirim.","shell.fbFailed":"Gagal terkirim.","shell.fbFailEmail":"kirim lewat email saja","shell.fbErrType":"Pilih jenis.","shell.fbErrTitle":"Beri ringkasan minimal 5 karakter.","shell.fbErrDetails":"Tambahkan sedikit detail, minimal 10 karakter."};var x1={en:jK,de:$K,es:AK,fr:IK,pt:JK,hi:PK,zh:NK,tr:CK,ko:_K,vi:EK,ha:FK,tl:UK,id:HK};var rh=[{id:"en",name:"English",flag:"us"},{id:"es",name:"Spanish",flag:"mx"},{id:"de",name:"German",flag:"de"},{id:"fr",name:"French",flag:"fr"},{id:"pt",name:"Portuguese",flag:"br"}],bl=[{id:"en",name:"English",flag:"us"},{id:"es",name:"Spanish",flag:"mx"},{id:"de",name:"German",flag:"de"},{id:"hi",name:"Hindi",flag:"in"},{id:"zh",name:"Mandarin Chinese",flag:"cn"},{id:"fr",name:"French",flag:"fr"},{id:"tr",name:"Turkish",flag:"tr"},{id:"ha",name:"Hausa",flag:"ng"},{id:"ko",name:"Korean",flag:"kr"},{id:"pt",name:"Portuguese",flag:"br"},{id:"vi",name:"Vietnamese",flag:"vn"},{id:"tl",name:"Filipino",flag:"ph"},{id:"id",name:"Indonesian",flag:"id"}];function D1(...l){let h={};for(let Q of l)for(let[K,Z]of Object.entries(Q))h[K]={...h[K]??{},...Z};return h}var LK={ae:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-ae" viewBox="0 0 640 480">
  <path fill="#00732f" d="M0 0h640v160H0z"/>
  <path fill="#fff" d="M0 160h640v160H0z"/>
  <path fill="#000001" d="M0 320h640v160H0z"/>
  <path fill="red" d="M0 0h220v480H0z"/>
</svg>`,ar:`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" id="flag-icons-ar" viewBox="0 0 640 480">
  <path fill="#74acdf" d="M0 0h640v480H0z"/>
  <path fill="#fff" d="M0 160h640v160H0z"/>
  <g id="ar-c" transform="translate(-64)scale(.96)">
    <path id="ar-a" fill="#f6b40e" stroke="#85340a" stroke-width="1.1" d="m396.8 251.3 28.5 62s.5 1.2 1.3.9c.8-.4.3-1.6.3-1.6l-23.7-64m-.7 24.2c-.4 9.4 5.4 14.6 4.7 23s3.8 13.2 5 16.5c1 3.3-1.2 5.2-.3 5.7 1 .5 3-2.1 2.4-6.8s-4.2-6-3.4-16.3-4.2-12.7-3-22"/>
    <use xlink:href="#ar-a" width="100%" height="100%" transform="rotate(22.5 400 250)"/>
    <use xlink:href="#ar-a" width="100%" height="100%" transform="rotate(45 400 250)"/>
    <use xlink:href="#ar-a" width="100%" height="100%" transform="rotate(67.5 400 250)"/>
    <path id="ar-b" fill="#85340a" d="M404.3 274.4c.5 9 5.6 13 4.6 21.3 2.2-6.5-3.1-11.6-2.8-21.2m-7.7-23.8 19.5 42.6-16.3-43.9"/>
    <use xlink:href="#ar-b" width="100%" height="100%" transform="rotate(22.5 400 250)"/>
    <use xlink:href="#ar-b" width="100%" height="100%" transform="rotate(45 400 250)"/>
    <use xlink:href="#ar-b" width="100%" height="100%" transform="rotate(67.5 400 250)"/>
  </g>
  <use xlink:href="#ar-c" width="100%" height="100%" transform="rotate(90 320 240)"/>
  <use xlink:href="#ar-c" width="100%" height="100%" transform="rotate(180 320 240)"/>
  <use xlink:href="#ar-c" width="100%" height="100%" transform="rotate(-90 320 240)"/>
  <circle cx="320" cy="240" r="26.7" fill="#f6b40e" stroke="#85340a" stroke-width="1.4"/>
  <path id="ar-h" fill="#843511" stroke-width="1" d="M329 234.3c-1.7 0-3.5.8-4.5 2.4 2 1.9 6.6 2 9.7-.2a7 7 0 0 0-5.1-2.2zm0 .4c1.8 0 3.5.8 3.7 1.6-2 2.3-5.3 2-7.4.4q1.6-2 3.8-2z"/>
  <use xlink:href="#ar-d" width="100%" height="100%" transform="matrix(-1 0 0 1 640.2 0)"/>
  <use xlink:href="#ar-e" width="100%" height="100%" transform="matrix(-1 0 0 1 640.2 0)"/>
  <use xlink:href="#ar-f" width="100%" height="100%" transform="translate(18.1)"/>
  <use xlink:href="#ar-g" width="100%" height="100%" transform="matrix(-1 0 0 1 640.2 0)"/>
  <path fill="#85340a" d="M316 243.7a1.8 1.8 0 1 0 1.8 2.9 4 4 0 0 0 2.2.6h.2q1 0 2.3-.6.5.7 1.5.7a1.8 1.8 0 0 0 .3-3.6q.8.3.8 1.2a1.2 1.2 0 0 1-2.4 0 3 3 0 0 1-2.6 1.7 3 3 0 0 1-2.5-1.7q-.1 1.1-1.3 1.2-1-.1-1.2-1.2c-.2-1.1.3-1 .8-1.2zm2 5.4c-2.1 0-3 2-4.8 3.1 1-.4 1.8-1.2 3.3-2s2.6.2 3.5.2 2-1 3.5-.2l3.3 2c-1.9-1.2-2.7-3-4.8-3q-.7 0-2 .6z"/>
  <path fill="#85340a" d="M317.2 251.6q-1.1 0-3.4.6c3.7-.8 4.5.5 6.2.5 1.6 0 2.5-1.3 6.1-.5-4-1.2-4.9-.4-6.1-.4-.8 0-1.4-.3-2.8-.2"/>
  <path fill="#85340a" d="M314 252.2h-.8c4.3.5 2.3 3 6.8 3s2.5-2.5 6.8-3c-4.5-.4-3.1 2.3-6.8 2.3-3.5 0-2.4-2.3-6-2.3"/>
  <path fill="#85340a" d="M323.7 258.9a3.7 3.7 0 0 0-7.4 0 3.8 3.8 0 0 1 7.4 0"/>
  <path id="ar-e" fill="#85340a" stroke-width="1" d="M303.4 234.3c4.7-4.1 10.7-4.8 14-1.7a8 8 0 0 1 1.5 3.4q.6 3.6-2.1 7.5l.8.4q2.4-4.7 1.6-9.4l-.6-2.3c-4.5-3.7-10.7-4-15.2 2z"/>
  <path id="ar-d" fill="#85340a" stroke-width="1" d="M310.8 233c2.7 0 3.3.6 4.5 1.7 1.2 1 1.9.8 2 1 .3.2 0 .8-.3.6q-.7-.2-2.5-1.6c-1.8-1.4-2.5-1-3.7-1-3.7 0-5.7 3-6.1 2.8-.5-.2 2-3.5 6.1-3.5"/>
  <use xlink:href="#ar-h" width="100%" height="100%" transform="translate(-18.4)"/>
  <circle id="ar-f" cx="310.9" cy="236.3" r="1.8" fill="#85340a" stroke-width="1"/>
  <path id="ar-g" fill="#85340a" stroke-width="1" d="M305.9 237.5c3.5 2.7 7 2.5 9 1.3 2-1.3 2-1.7 1.6-1.7s-.8.4-2.4 1.3c-1.7.8-4.1.8-8.2-.9"/>
</svg>`,au:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#0052b4" d="M0 0h512v512H0z"/><g fill="#fff"><path d="M128 307.482l13.697 28.642 30.933-7.15-13.852 28.568 24.874 19.726-30.97 6.98.085 31.749L128 396.134l-24.767 19.863.086-31.749-30.971-6.98 24.875-19.726-13.853-28.568 30.933 7.15zM387.844 343.989l6.534 13.661 14.753-3.409-6.607 13.624 11.865 9.41-14.772 3.329.041 15.143-11.814-9.474-11.812 9.474.041-15.143-14.772-3.329 11.865-9.41-6.609-13.624 14.755 3.409zM327.066 199.066l6.533 13.662 14.754-3.411-6.606 13.626 11.864 9.409-14.773 3.329.04 15.143-11.812-9.474-11.813 9.474.041-15.143-14.772-3.329 11.864-9.409-6.607-13.626 14.753 3.411zM387.844 116.253l6.534 13.661 14.753-3.41-6.606 13.626 11.864 9.408-14.772 3.331.041 15.142-11.814-9.474-11.812 9.474.041-15.142-14.772-3.331 11.864-9.408-6.608-13.626 14.755 3.41zM440.934 178.363l6.534 13.661 14.753-3.41-6.607 13.626 11.864 9.409-14.772 3.329.041 15.143-11.813-9.475-11.812 9.475.04-15.143-14.773-3.329 11.864-9.409-6.607-13.626 14.755 3.41zM402.973 250.824l5.139 15.817h16.63l-13.455 9.774 5.139 15.816-13.453-9.775-13.455 9.775 5.139-15.816-13.453-9.774h16.629zM256 0v48.896l-40.147 40.147H256v77.914h-52.536L256 219.492V256h-23.719l-65.324-65.336V256H89.043v-77.724L11.331 256H0v-48.896l40.147-40.147H0V89.043h52.536L0 36.508V0h23.719l65.324 65.336V0h77.914v77.724L244.669 0z"/></g><path fill="#d80027" d="M0 152.001h103.999L104.001 256h48V152.001H256v-48H151.999L152.001 0h-48v104.001H0z"/><path fill="#0052b4" d="M166.957 166.957L256 256v-25.18l-63.863-63.863z"/><path fill="#fff" d="M166.957 166.957L256 256v-25.18l-63.863-63.863z"/><g fill="#d80027"><path d="M166.957 166.957L256 256v-25.18l-63.863-63.863zM63.862 166.959L0 230.821V256l89.041-89.041z"/></g><path fill="#0052b4" d="M89.043 89.043L0 0v25.18l63.863 63.863z"/><path fill="#fff" d="M89.043 89.043L0 0v25.18l63.863 63.863z"/><g fill="#d80027"><path d="M89.043 89.043L0 0v25.18l63.863 63.863zM192.138 89.041L256 25.179V0l-89.041 89.041z"/></g></svg>',br:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-br" viewBox="0 0 512 512">
  <g stroke-width="1pt">
    <path fill="#229e45" fill-rule="evenodd" d="M0 0h512v512H0z"/>
    <path fill="#f8e509" fill-rule="evenodd" d="m261.4 405.4 229.8-149.2L260 106.6l-230.7 150z"/>
    <path fill="#2b49a3" fill-rule="evenodd" d="M361.5 256a97.2 97.2 0 1 1-194.3-.2 97.2 97.2 0 0 1 194.3.2"/>
    <path fill="#ffffef" fill-rule="evenodd" d="m232.3 314.2-3-1.8-3.1 1.6.7-3.5-2.4-2.5 3.4-.4 1.6-3.2 1.5 3.3 3.4.6-2.6 2.4m65.7 20-3-1.8-3.2 1.6.7-3.5-2.4-2.5 3.5-.4 1.6-3.2 1.4 3.3 3.4.6-2.5 2.4m-27.6-22.9-2.6-1.5-2.7 1.3.6-3-2-2.2 2.9-.3 1.4-2.7 1.2 2.8 3 .5-2.2 2m66.2-6.4-2.6-1.5-2.6 1.3.6-2.9-2-2.1 2.9-.4 1.3-2.6 1.3 2.7 2.9.5-2.2 2m-66.6-16.7-3-1.8-3.1 1.6.7-3.5-2.4-2.5 3.4-.4 1.6-3.1 1.5 3.2 3.4.6-2.6 2.4M188 245l-3-1.8-3 1.6.6-3.5-2.4-2.5 3.5-.4 1.6-3.2 1.4 3.3 3.4.6-2.5 2.4m10.1 43.5-3-1.7-3.1 1.5.7-3.4-2.4-2.6 3.4-.4 1.6-3 1.5 3.1 3.4.7-2.6 2.3m100.6-51.3-2.6-1.5-2.8 1.3.6-3-2-2.3 3-.3 1.4-2.8 1.3 2.9 3 .5-2.3 2.1m-5 29.2L290 255l-2.1 1 .4-2.4-1.6-1.7 2.4-.3 1.1-2.2 1 2.3 2.4.4-1.8 1.6m-108.4 38.5-2-1.2-2.1 1 .4-2.3-1.6-1.7 2.4-.2 1-2 1 2 2.3.5-1.7 1.6m152.6 11.5-1.7-.8-1.7.7.4-1.7-1.3-1.3 1.9-.2.9-1.5.7 1.6 1.9.3-1.4 1.2"/>
    <path fill="#ffffef" fill-rule="evenodd" d="m183.5 292.3-2-1.2-2.1 1 .5-2.3-1.7-1.7 2.3-.2 1.1-2 1 2 2.3.5-1.7 1.6"/>
    <path fill="#ffffef" fill-rule="evenodd" d="m183.5 292.3-2-1.2-2.1 1 .5-2.3-1.7-1.7 2.3-.2 1.1-2 1 2 2.3.5-1.7 1.6m32.2 2.3-2-1.2-2 1 .4-2.3-1.6-1.7 2.3-.2 1-2.1 1 2.1 2.3.5-1.7 1.6m-3.7 13-2-1.2-2 1 .4-2.3-1.6-1.7 2.3-.3 1-2 1 2 2.3.5-1.7 1.6m66.7-17-2-1.2-2.1 1 .4-2.3-1.6-1.7 2.3-.2 1.1-2.1 1 2.1 2.2.4-1.7 1.6m-19.1 2.4-2-1.2-2.1 1 .5-2.3-1.6-1.7 2.3-.2 1-2.1 1 2.1 2.3.4-1.7 1.6m-52.5-4.4-1.2-.7-1.3.6.2-1.5-1-1 1.5-.2.7-1.3.5 1.4 1.5.2-1 1M333.2 310l-2-1.1-2.1 1 .5-2.3-1.6-1.7 2.3-.3 1-2 1 2 2.3.5-1.7 1.6m-16 4.4-1.6-1-1.7 1 .4-2-1.4-1.4 2-.2.8-1.7.8 1.7 2 .4-1.5 1.3m8 1.8-1.6-1-1.6.9.3-1.8-1.2-1.3 1.8-.2.8-1.6.7 1.6 1.8.3-1.3 1.3m22.2-17.4-1.5-.9-1.6.8.4-1.7-1.2-1.3 1.7-.2.8-1.5.7 1.6 1.7.3-1.3 1.2M317 322.9l-2-1.1-2 1 .5-2.2-1.6-1.5 2.2-.3 1.1-1.9 1 2 2.1.4-1.6 1.4m.4 10.9-1.8-1-1.8.9.4-2.2-1.4-1.5 2-.3 1-1.9.8 2 2 .4-1.5 1.4M302.3 312l-1.5-.9-1.6.8.4-1.8-1.2-1.2 1.7-.2.8-1.6.7 1.6 1.7.3-1.3 1.2m-13.5 1.8-1.5-.9-1.6.8.4-1.8-1.2-1.2 1.7-.2.8-1.6.7 1.6 1.7.3-1.2 1.2M265 291.4l-1.5-.9-1.6.8.4-1.7-1.2-1.3 1.7-.2.8-1.5.7 1.6 1.7.3-1.3 1.1m2.9 43.5-1.3-.7-1.3.7.3-1.5-1-1 1.4-.3.7-1.3.6 1.4 1.5.2-1.1 1m-35.2-66-3-1.7-3.1 1.5.7-3.4-2.4-2.6 3.4-.4 1.6-3.1 1.5 3.2 3.4.6-2.6 2.4"/>
    <path fill="#fff" fill-rule="evenodd" d="M355.1 291a95 95 0 0 0 4.4-15.1c-51.6-45.4-109.2-68.7-182-63.9a95 95 0 0 0-6.4 15.9 233 233 0 0 1 184 63z"/>
    <path fill="#309e3a" d="m331.9 265.4 1.8 1a3 3 0 0 0-.2 1.8q.2.7 1 1.2t1.6.6q.6 0 1-.6.2-.3.1-.7l-.3-.8-1.2-1.3a6 6 0 0 1-1.4-2.3 3 3 0 0 1 1.6-3.3 3 3 0 0 1 1.7-.2 5 5 0 0 1 2 .9 6 6 0 0 1 2 2.4 3 3 0 0 1-.5 2.6l-1.8-1.1q.3-.8.2-1.4-.2-.5-1-1t-1.4-.5l-.6.3-.1.7q0 .6 1.2 1.7l1.5 2a3 3 0 0 1-.2 3.2 3 3 0 0 1-1.4 1.1 3 3 0 0 1-1.9.2 6 6 0 0 1-2.1-1 5 5 0 0 1-2-2.5q-.5-1.3.4-3m-8.8-5.7 2 1a3 3 0 0 0-.2 1.6q.2.8 1 1.3t1.6.4q.6 0 1-.6l.1-.6q0-.4-.4-.8l-1.2-1.3a6 6 0 0 1-1.5-2.2 3 3 0 0 1 .3-2.4 3 3 0 0 1 1.2-1 3 3 0 0 1 1.7-.2q.9 0 2 .8 1.6 1 2 2.3a3 3 0 0 1-.3 2.6l-1.9-1.1q.4-.8.2-1.3t-1-1a2 2 0 0 0-1.5-.5l-.6.4v.7q0 .5 1.2 1.7t1.6 1.8a3 3 0 0 1-.1 3.3 3 3 0 0 1-3.2 1.4 6 6 0 0 1-2.2-.9 5 5 0 0 1-2.1-2.4 4 4 0 0 1 .3-3m-10.8-3 5.6-9 6.7 4-1 1.6-4.8-3-1.3 2 4.6 2.8-1 1.6-4.5-2.8-1.5 2.5 5 3-.9 1.6zm-15.8-12.9.9-1.6 4 2.2-1.9 3.7a7 7 0 0 1-4.8-.6 6 6 0 0 1-2.2-2 5 5 0 0 1-.8-2.6q0-1.5.8-2.8a6 6 0 0 1 2-2.3q1.1-.9 2.7-.9 1.1 0 2.5.7a5 5 0 0 1 2.3 2.2q.6 1.2.3 2.7l-2.1-.6a2 2 0 0 0-.2-1.5 3 3 0 0 0-1.2-1.1 3 3 0 0 0-2.4-.3q-1 .5-2 2a5 5 0 0 0-.5 3q.3 1.2 1.6 1.8l1.3.4h1.3l.6-1.2zm-68.8-17 1.6-10.6 3.2.5.8 7.5 3-7 3.1.5-1.5 10.6-2-.3 1.2-8.3-3.3 8-2-.3-.9-8.7-1.2 8.4zm-10.7-1.3 1-10.6 7.8.7-.1 1.8-5.8-.5-.2 2.3 5.3.5-.1 1.8-5.3-.5-.3 3 5.9.5-.2 1.8z"/>
    <g stroke-opacity=".5">
      <path fill="#309e3a" d="M181.4 218.8q0-1.6.5-2.7l1-1.4 1.5-1a6 6 0 0 1 2.3-.3 5 5 0 0 1 3.7 1.6q1.4 1.5 1.3 4 0 2.7-1.5 4a5 5 0 0 1-3.8 1.4 5 5 0 0 1-3.7-1.5 5 5 0 0 1-1.3-4z"/>
      <path fill="#f7ffff" d="M183.6 218.8q0 1.8.8 2.8t2 1a3 3 0 0 0 2.2-.9q.8-.9.9-2.7 0-2-.8-2.8a3 3 0 0 0-2-1q-1.5 0-2.2.9-.9.9-1 2.7z"/>
    </g>
    <g stroke-opacity=".5">
      <path fill="#309e3a" d="m194 224.4.1-10.7h4.5q1.8 0 2.5.4 1 .4 1.2 1 .4.8.5 1.7 0 1.2-.7 2-.7.7-2.2 1 .8.3 1.2.8l1.2 1.8 1.3 2H201l-1.5-2.3-1.2-1.6-.6-.4-1-.2h-.5v4.5z"/>
      <path fill="#fff" d="M196.2 218.2h3.6l.5-.5q.3-.3.3-.8t-.3-.9l-.8-.4h-3.2z"/>
    </g>
    <g stroke-opacity=".5">
      <path fill="#309e3a" d="m206.2 214.2 3.9.2 2 .3a4 4 0 0 1 1.5 1 5 5 0 0 1 1 1.9q.3 1 .2 2.5a5 5 0 0 1-1.7 4.1q-.6.5-1.5.8h-2l-4-.1z"/>
      <path fill="#fff" d="m208.2 216.1-.3 7 1.6.2h1.3l.9-.5q.4-.3.6-1l.3-2-.1-1.8q-.2-.7-.6-1l-1-.6-1.7-.2z"/>
    </g>
    <g stroke-opacity=".5">
      <path fill="#309e3a" d="m258.5 233.3 2.5-10.4 3.3.8q2 .5 2.5.8.8.4 1.2 1.3t.1 2.2a3 3 0 0 1-1.9 2.3l-1.1.3-2.2-.4-1.4-.3-1 3.9z"/>
      <path fill="#fff" d="m262.6 225.2-.7 3 1.2.2q1.2.3 1.7.2a1.4 1.4 0 0 0 1.2-1l-.1-1.1-.8-.7-1.5-.4z"/>
    </g>
    <g stroke-opacity=".5">
      <path fill="#309e3a" d="m268.4 236.3 3.5-10.1 4.3 1.5 2.2 1q.6.6.9 1.5c.3.9 0 1.1-.2 1.7q-.3 1.2-1.3 1.6a3 3 0 0 1-2.3.3l.8 1.2.6 2 .5 2.4-2.4-.8-.7-2.7-.6-1.9-.4-.6-1-.5-.4-.1-1.5 4.2z"/>
      <path fill="#fff" d="m272.4 231.2 1.5.5 1.9.5q.4 0 .7-.2l.5-.7v-1l-.6-.6-1.5-.5-1.6-.6z"/>
    </g>
    <g stroke-opacity=".5">
      <path fill="#309e3a" d="M280.9 235.9a7 7 0 0 1 1.3-2.5q.5-.7 1.3-1.1l1.6-.5q1 0 2.3.3a5 5 0 0 1 3.2 2.5q1 1.9.1 4.3a6 6 0 0 1-2.5 3.5 5 5 0 0 1-4 .2 5 5 0 0 1-3.2-2.5 6 6 0 0 1-.1-4.2"/>
      <path fill="#fff" d="M283 236.5q-.5 1.6 0 2.8t1.8 1.6q1.2.3 2.2-.3t1.7-2.4q.4-1.7 0-2.9a3 3 0 0 0-1.8-1.5 3 3 0 0 0-2.3.3q-1 .6-1.6 2.4"/>
    </g>
    <g stroke-opacity=".5">
      <path fill="#309e3a" d="m301.7 250.8 4.9-9.5 4 2q1.5.9 2 1.4.6.7.7 1.5.2 1-.4 1.7-.4 1-1.5 1.5-1 .3-2.3-.1.4.6.6 1.3l.3 2.1.2 2.5-2.3-1.2-.3-2.8-.3-2-.4-.6-.9-.6-.4-.2-2 4z"/>
      <path fill="#fff" d="m306.4 246.3 1.4.7 1.8.8q.4 0 .7-.2a2 2 0 0 0 .8-1.5l-.6-.7-1.3-.8-1.5-.7z"/>
    </g>
    <g stroke-opacity=".5">
      <path fill="#309e3a" d="M341.2 270.3q.8-1.4 2-2l1.6-.7h1.6q1.1.1 2.2 1a5 5 0 0 1 2.3 3.3 6 6 0 0 1-1.1 4.1 6 6 0 0 1-3.5 2.6 5 5 0 0 1-3.9-.9 5 5 0 0 1-2.3-3.3 6 6 0 0 1 1-4.1z"/>
      <path fill="#fff" d="M343 271.4q-1 1.6-.8 2.8a3 3 0 0 0 1.3 2 3 3 0 0 0 2.2.4q1.2-.3 2.3-1.9t.8-2.7q0-1.1-1.2-2c-1.2-.9-1.5-.6-2.3-.4q-1.2.3-2.2 1.8z"/>
    </g>
    <path fill="#309e3a" d="m246.4 229 1.7-7.6 5.6 1.3-.3 1.3-4-1-.4 1.7 3.7.9-.3 1.3-3.7-1-.5 2.1 4.2 1-.3 1.3z"/>
  </g>
</svg>`,ca:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#fff" d="M0 .006h512v511.989H0z"/><g fill="#d80027"><path d="M0 0h170.663v512H0zM341.337 0H512v512H341.337zM294.957 284.058l38.956-19.479-19.478-9.739v-19.478l-38.957 19.478 19.479-38.956h-19.479L256 186.666l-19.478 29.218h-19.479l19.479 38.956-38.957-19.478v19.478l-19.478 9.739 38.956 19.479-9.739 19.478h38.957v29.217h19.478v-29.217h38.957z"/></g></svg>',ch:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#d80027" d="M0 0h512v512H0z"/><path fill="#fff" d="M395.13 209.624h-92.753V116.87h-92.754v92.754H116.87v92.753h92.753v92.753h92.754v-92.753h92.753z"/></svg>',cl:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-cl" viewBox="0 0 640 480">
  <defs>
    <clipPath id="cl-a">
      <path fill-opacity=".7" d="M0 0h682.7v512H0z"/>
    </clipPath>
  </defs>
  <g fill-rule="evenodd" clip-path="url(#cl-a)" transform="scale(.9375)">
    <path fill="#fff" d="M256 0h512v256H256z"/>
    <path fill="#0039a6" d="M0 0h256v256H0z"/>
    <path fill="#fff" d="M167.8 191.7 128.2 162l-39.5 30 14.7-48.8L64 113.1l48.7-.5L127.8 64l15.5 48.5 48.7.1-39.2 30.4z"/>
    <path fill="#d52b1e" d="M0 256h768v256H0z"/>
  </g>
</svg>`,cn:`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" id="flag-icons-cn" viewBox="0 0 512 512">
  <defs>
    <path id="cn-a" fill="#ff0" d="M1-.3-.7.8 0-1 .6.8-1-.3z"/>
  </defs>
  <path fill="#ee1c25" d="M0 0h512v512H0z"/>
  <use xlink:href="#cn-a" width="30" height="20" transform="translate(128 128)scale(76.8)"/>
  <use xlink:href="#cn-a" width="30" height="20" transform="rotate(-121 142.6 -47)scale(25.5827)"/>
  <use xlink:href="#cn-a" width="30" height="20" transform="rotate(-98.1 198 -82)scale(25.6)"/>
  <use xlink:href="#cn-a" width="30" height="20" transform="rotate(-74 272.4 -114)scale(25.6137)"/>
  <use xlink:href="#cn-a" width="30" height="20" transform="matrix(16 -19.968 19.968 16 256 230.4)"/>
</svg>`,cr:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-cr" viewBox="0 0 640 480">
  <g fill-rule="evenodd" stroke-width="1pt">
    <path fill="#0000b4" d="M0 0h640v480H0z"/>
    <path fill="#fff" d="M0 75.4h640v322.3H0z"/>
    <path fill="#d90000" d="M0 157.7h640v157.7H0z"/>
  </g>
</svg>`,cz:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-cz" viewBox="0 0 512 512">
  <path fill="#fff" d="M0 0h512v256H0z"/>
  <path fill="#d7141a" d="M0 256h512v256H0z"/>
  <path fill="#11457e" d="M300 256 0 56v400z"/>
</svg>`,de:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-de" viewBox="0 0 512 512">
  <path fill="#fc0" d="M0 341.3h512V512H0z"/>
  <path fill="#000001" d="M0 0h512v170.7H0z"/>
  <path fill="red" d="M0 170.7h512v170.6H0z"/>
</svg>`,dk:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-dk" viewBox="0 0 512 512">
  <path fill="#c8102e" d="M0 0h512.1v512H0z"/>
  <path fill="#fff" d="M144 0h73.1v512H144z"/>
  <path fill="#fff" d="M0 219.4h512.1v73.2H0z"/>
</svg>`,eu:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#0052b4" d="M0 0h512v512H0z"/><path fill="#ffda44" d="M256 105.7l8 24.6h25.9l-21 15.2 8 24.6L256 155l-21 15.2 8-24.6-20.9-15.2h26zM149.7 149.8l23 11.7 18.4-18.3-4 25.5 23 11.8-25.6 4-4 25.6-11.8-23-25.5 4 18.3-18.3zM105.7 256l24.6-8v-25.9l15.2 21 24.6-8L155 256l15.2 21-24.6-8-15.2 20.9v-26zM149.7 362.3l11.8-23-18.3-18.4 25.5 4 11.8-23 4 25.6 25.6 4-23 11.8 4 25.5-18.3-18.3zM256 406.3l-8-24.6h-25.9l21-15.2-8-24.6L256 357l21-15.2-8 24.6 20.9 15.2h-26zM362.3 362.3l-23-11.8-18.4 18.3 4-25.5-23-11.8 25.6-4 4-25.6 11.8 23 25.5-4-18.3 18.3zM406.3 256l-24.6 8v25.9l-15.2-21-24.6 8L357 256l-15.2-21 24.6 8 15.2-20.9v26zM362.3 149.8l-11.8 23 18.3 18.3-25.5-4-11.8 23-4-25.6-25.6-4 23-11.8-4-25.5 18.3 18.3z"/></svg>',fr:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-fr" viewBox="0 0 512 512">
  <path fill="#fff" d="M0 0h512v512H0z"/>
  <path fill="#000091" d="M0 0h170.7v512H0z"/>
  <path fill="#e1000f" d="M341.3 0H512v512H341.3z"/>
</svg>`,gb:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#fff" d="M0 0h512v512H0z"/><path fill="#d80027" d="M0 304h208v208h96V304h208v-96H304V0h-96v208H0z"/><g fill="#0052b4"><path d="M406.92 333.913L512 438.993v-105.08zM333.913 333.913L512 512v-50.36L384.273 333.913zM464.564 512L333.913 381.336V512z"/></g><path fill="#fff" d="M333.913 333.913L512 512v-50.36L384.273 333.913z"/><path fill="#d80027" d="M333.913 333.913L512 512v-50.36L384.273 333.913z"/><g fill="#0052b4"><path d="M80.302 333.913L0 414.215v-80.302zM178.084 356.559v155.438H22.658z"/></g><path fill="#d80027" d="M127.724 333.916L0 461.641V512l178.084-178.084z"/><g fill="#0052b4"><path d="M105.08 178.087L0 73.007v105.08zM178.087 178.087L0 0v50.36l127.727 127.727zM47.436 0l130.651 130.663V0z"/></g><path fill="#fff" d="M178.087 178.087L0 0v50.36l127.727 127.727z"/><path fill="#d80027" d="M178.087 178.087L0 0v50.36l127.727 127.727z"/><g fill="#0052b4"><path d="M431.698 178.087L512 97.785v80.302zM333.916 155.441V.003h155.426z"/></g><path fill="#d80027" d="M384.276 178.084L512 50.359V0L333.916 178.084z"/></svg>',gm:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-gm" viewBox="0 0 640 480">
  <defs>
    <clipPath id="gm-a">
      <path fill-opacity=".7" d="M0-48h640v480H0z"/>
    </clipPath>
  </defs>
  <g fill-rule="evenodd" stroke-width="1pt" clip-path="url(#gm-a)" transform="translate(0 48)">
    <path fill="red" d="M0-128h640V85.3H0z"/>
    <path fill="#fff" d="M0 85.3h640V121H0z"/>
    <path fill="#009" d="M0 120.9h640V263H0z"/>
    <path fill="#fff" d="M0 263.1h640v35.6H0z"/>
    <path fill="#090" d="M0 298.7h640V512H0z"/>
  </g>
</svg>`,gt:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 384"><image href="data:image/png;base64,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" width="512" height="384" preserveAspectRatio="none"/></svg>',hk:`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" id="flag-icons-hk" viewBox="0 0 640 480">
  <path fill="#EC1B2E" d="M0 0h640v480H0"/>
  <path id="hk-a" fill="#fff" d="M346.3 103.1C267 98 230.6 201.9 305.6 240.3c-26-22.4-20.6-55.3-10.1-72.4l1.9 1.1c-13.8 23.5-11.2 52.7 11.1 71-12.7-12.3-9.5-39 12.1-48.9s23.6-39.3 16.4-49.1q-14.7-25.6 9.3-38.9M307.9 164l-4.7 7.4-1.8-8.6-8.6-2.3 7.8-4.3-.6-8.9 6.5 6.1 8.3-3.3-3.7 8.1 5.6 6.8z"/>
  <use xlink:href="#hk-a" transform="rotate(72 312.5 243.5)"/>
  <use xlink:href="#hk-a" transform="rotate(144 312.5 243.5)"/>
  <use xlink:href="#hk-a" transform="rotate(216 312.5 243.5)"/>
  <use xlink:href="#hk-a" transform="rotate(288 312.5 243.5)"/>
</svg>`,hu:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-hu" viewBox="0 0 512 512">
  <g fill-rule="evenodd">
    <path fill="#fff" d="M512 512H0V0h512z"/>
    <path fill="#388d00" d="M512 512H0V341.3h512z"/>
    <path fill="#d43516" d="M512 170.8H0V.1h512z"/>
  </g>
</svg>`,id:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-id" viewBox="0 0 512 512">
  <path fill="#e70011" d="M0 0h512v256H0Z"/>
  <path fill="#fff" d="M0 256h512v256H0Z"/>
</svg>`,il:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-il" viewBox="0 0 512 512">
  <defs>
    <clipPath id="il-a">
      <path fill-opacity=".7" d="M0 0h512v512H0z"/>
    </clipPath>
  </defs>
  <g fill-rule="evenodd" clip-path="url(#il-a)">
    <path fill="#fff" d="M619.4 512H-112V0h731.4z"/>
    <path fill="#0038b8" d="M619.4 115.2H-112V48h731.4zm0 350.5H-112v-67.2h731.4zm-483-275 110.1 191.6L359 191.6z"/>
    <path fill="#fff" d="m225.8 317.8 20.9 35.5 21.4-35.3z"/>
    <path fill="#0038b8" d="M136 320.6 246.2 129l112.4 190.8z"/>
    <path fill="#fff" d="m225.8 191.6 20.9-35.5 21.4 35.4zM182 271.1l-21.7 36 41-.1-19.3-36zm-21.3-66.5 41.2.3-19.8 36.3zm151.2 67 20.9 35.5-41.7-.5zm20.5-67-41.2.3 19.8 36.3zm-114.3 0L189.7 256l28.8 50.3 52.8 1.2 32-51.5-29.6-52z"/>
  </g>
</svg>`,in:`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" id="flag-icons-in" viewBox="0 0 512 512">
  <path fill="#f93" d="M0 0h512v170.7H0z"/>
  <path fill="#fff" d="M0 170.7h512v170.6H0z"/>
  <path fill="#128807" d="M0 341.3h512V512H0z"/>
  <g transform="translate(256 256)scale(3.41333)">
    <circle r="20" fill="#008"/>
    <circle r="17.5" fill="#fff"/>
    <circle r="3.5" fill="#008"/>
    <g id="in-d">
      <g id="in-c">
        <g id="in-b">
          <g id="in-a" fill="#008">
            <circle r=".9" transform="rotate(7.5 -8.8 133.5)"/>
            <path d="M0 17.5.6 7 0 2l-.6 5z"/>
          </g>
          <use xlink:href="#in-a" width="100%" height="100%" transform="rotate(15)"/>
        </g>
        <use xlink:href="#in-b" width="100%" height="100%" transform="rotate(30)"/>
      </g>
      <use xlink:href="#in-c" width="100%" height="100%" transform="rotate(60)"/>
    </g>
    <use xlink:href="#in-d" width="100%" height="100%" transform="rotate(120)"/>
    <use xlink:href="#in-d" width="100%" height="100%" transform="rotate(-120)"/>
  </g>
</svg>`,jp:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#fff" d="M0 0h512v512H0z"/><circle cx="256" cy="256" r="128" fill="#d80027"/></svg>',kr:`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" id="flag-icons-kr" viewBox="0 0 512 512">
  <path fill="#fff" fill-rule="evenodd" d="M0 0h512v512H0Z"/>
  <g fill-rule="evenodd" transform="rotate(-56.3 367.2 -111.2)scale(9.375)">
    <g id="kr-b">
      <path id="kr-a" fill="#000001" d="M-6-26H6v2H-6Zm0 3H6v2H-6Zm0 3H6v2H-6Z"/>
      <use xlink:href="#kr-a" width="100%" height="100%" y="44"/>
    </g>
    <path stroke="#fff" d="M0 17v10"/>
    <path fill="#cd2e3a" d="M0-12a12 12 0 0 1 0 24Z"/>
    <path fill="#0047a0" d="M0-12a12 12 0 0 0 0 24A6 6 0 0 0 0 0Z"/>
    <circle cy="-6" r="6" fill="#cd2e3a"/>
  </g>
  <g fill-rule="evenodd" transform="rotate(-123.7 196.5 59.5)scale(9.375)">
    <use xlink:href="#kr-b" width="100%" height="100%"/>
    <path stroke="#fff" d="M0-23.5v3M0 17v3.5m0 3v3"/>
  </g>
</svg>`,mx:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><image href="data:image/png;base64,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hh5RxmSKJN0a1VKHocyg6uj69N09z+i0ykqkpbriGrPJ5tFEDNYGtW0B9j8Ce2FXJeXZJ4VV6hzX9YzvGx5ty2SSnT1Hc7n0K6//jcFgv3bxrfZUGItM7g1TT4zwg9eYSYPBZFvafqH94wM7eC4bTMdIisrkYk1V63VqU8b3hmxtUAYyrPAUaECszuucd6+yU9bYcIvXO+fipYMmo3NgqE2jVja0KEkSRElUG9zaVIIbH8JZpyjkBoZblM0QmqYMRR5JxpQd02QiIomispWmLd+GFaqC/p/qDXq7x11X6p1369ofJVPhFcu+pRz56sanotEAZa17/bLvbqaI8wcqTgYrvI3ZbGrr5p9WlDdyHOd21nxl7Q+2bH7KZHJiha1A50B/3mQ88uyB3T8xVAZ///GjVeonF602fHa66NvfoF3/+7lc7XMg+F0Zf4KKon+5eTtOEDUvPP/cHfftnOg2ff/+/4t68gCMQP/PYAQCBQ0CAkggIIAEAgJIICCABAICSCAggAQCAkggIIAEAgJIICCABAICSCAggAQCAkggIIAEAgJIICCABAICSCAggAQCAkggIIAEAgJIICCABAICSCAggAQCAkggIIAEAgJIICCABAICSCAggAQCAkggIIAEAgJIICCABAICSCAggAQCAkggIIAEAgJIICCABAICSCAggAQCAkggIIAEAgJIICCABAICSCAggAQCAkggIIAEAgJIICCABAICSCAggAQCAkggIIAEAgJIICCABAICSCAggAQCAkggIIAEAgJIICCABAICSCAggAQCAkggIIAEAgJIICCABAICSCAggOTfAAAA//8uf3IQAAAABklEQVQDAMHiJGkXc96ZAAAAAElFTkSuQmCC" width="512" height="512" preserveAspectRatio="none"/></svg>',my:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-my" viewBox="0 0 512 512">
  <path fill="#C00" d="M0 0h512v36.6H0z"/>
  <path fill="#fff" d="M0 36.6h512V73H0z"/>
  <path fill="#C00" d="M0 73.1h512v36.6H0z"/>
  <path fill="#fff" d="M0 109.7h512v36.6H0z"/>
  <path fill="#C00" d="M0 146.3h512v36.6H0z"/>
  <path fill="#fff" d="M0 182.9h512v36.5H0z"/>
  <path fill="#C00" d="M0 219.4h512V256H0z"/>
  <path fill="#fff" d="M0 256h512v36.6H0z"/>
  <path fill="#C00" d="M0 292.6h512V329H0z"/>
  <path fill="#fff" d="M0 329.1h512v36.6H0z"/>
  <path fill="#C00" d="M0 365.7h512v36.6H0z"/>
  <path fill="#fff" d="M0 402.3h512v36.6H0z"/>
  <path fill="#C00" d="M0 438.9h512v36.5H0z"/>
  <path fill="#fff" d="M0 475.4h512V512H0z"/>
  <path fill="#006" d="M0 0h256v292.6H0z"/>
  <path fill="#FC0" d="m166 93 4.8 32.5 18.4-27.2-10 31.3 28.5-16.6-22.5 24 32.8-2.6-30.7 11.9L218 158l-32.8-2.5 22.5 24-28.4-16.7 9.8 31.5-18.4-27.3-4.8 32.5-4.7-32.5-18.4 27.2 9.9-31.4-28.4 16.7 22.4-24-32.8 2.5 30.7-11.8-30.6-11.9 32.8 2.6-22.5-24 28.4 16.6-10-31.4 18.5 27.3 4.8-32.6Zm-26.7 1.3a57 57 0 0 0-73 24.9 57 57 0 0 0 45.5 83.8 57 57 0 0 0 27.5-4.7 64 64 0 1 1 0-104"/>
</svg>`,ng:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-ng" viewBox="0 0 512 512">
  <g fill-rule="evenodd" stroke-width="1pt">
    <path fill="#fff" d="M0 0h512v512H0z"/>
    <path fill="#008753" d="M341.3 0H512v512H341.3zM0 0h170.7v512H0z"/>
  </g>
</svg>`,no:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-no" viewBox="0 0 512 512">
  <path fill="#ed2939" d="M0 0h512v512H0z"/>
  <path fill="#fff" d="M128 0h128v512H128z"/>
  <path fill="#fff" d="M0 192h512v128H0z"/>
  <path fill="#002664" d="M160 0h64v512h-64z"/>
  <path fill="#002664" d="M0 224h512v64H0z"/>
</svg>`,nz:`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" id="flag-icons-nz" viewBox="0 0 640 480">
  <defs>
    <g id="nz-b">
      <g id="nz-a">
        <path d="M0-.3v.5l1-.5z"/>
        <path d="M.2.3 0-.1l1-.2z"/>
      </g>
      <use xlink:href="#nz-a" transform="scale(-1 1)"/>
      <use xlink:href="#nz-a" transform="rotate(72 0 0)"/>
      <use xlink:href="#nz-a" transform="rotate(-72 0 0)"/>
      <use xlink:href="#nz-a" transform="scale(-1 1)rotate(72)"/>
    </g>
  </defs>
  <path fill="#00247d" fill-rule="evenodd" d="M0 0h640v480H0z"/>
  <g transform="translate(-111 36.1)scale(.66825)">
    <use xlink:href="#nz-b" width="100%" height="100%" fill="#fff" transform="translate(900 120)scale(45.4)"/>
    <use xlink:href="#nz-b" width="100%" height="100%" fill="#cc142b" transform="matrix(30 0 0 30 900 120)"/>
  </g>
  <g transform="rotate(82 525.2 114.6)scale(.66825)">
    <use xlink:href="#nz-b" width="100%" height="100%" fill="#fff" transform="rotate(-82 519 -457.7)scale(40.4)"/>
    <use xlink:href="#nz-b" width="100%" height="100%" fill="#cc142b" transform="rotate(-82 519 -457.7)scale(25)"/>
  </g>
  <g transform="rotate(82 525.2 114.6)scale(.66825)">
    <use xlink:href="#nz-b" width="100%" height="100%" fill="#fff" transform="rotate(-82 668.6 -327.7)scale(45.4)"/>
    <use xlink:href="#nz-b" width="100%" height="100%" fill="#cc142b" transform="rotate(-82 668.6 -327.7)scale(30)"/>
  </g>
  <g transform="translate(-111 36.1)scale(.66825)">
    <use xlink:href="#nz-b" width="100%" height="100%" fill="#fff" transform="translate(900 480)scale(50.4)"/>
    <use xlink:href="#nz-b" width="100%" height="100%" fill="#cc142b" transform="matrix(35 0 0 35 900 480)"/>
  </g>
  <path fill="#012169" d="M0 0h320v240H0z"/>
  <path fill="#fff" d="m37.5 0 122 90.5L281 0h39v31l-120 89.5 120 89V240h-40l-120-89.5L40.5 240H0v-30l119.5-89L0 32V0z"/>
  <path fill="#c8102e" d="M212 140.5 320 220v20l-135.5-99.5zm-92 10 3 17.5-96 72H0zM320 0v1.5l-124.5 94 1-22L295 0zM0 0l119.5 88h-30L0 21z"/>
  <path fill="#fff" d="M120.5 0v240h80V0zM0 80v80h320V80z"/>
  <path fill="#c8102e" d="M0 96.5v48h320v-48zM136.5 0v240h48V0z"/>
</svg>`,ph:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-ph" viewBox="0 0 512 512">
  <path fill="#0038a8" d="M0 0h512v256H0z"/>
  <path fill="#ce1126" d="M0 256h512v256H0z"/>
  <path fill="#fff" d="M443.4 256 0 512V0"/>
  <path fill="#fcd116" d="m25.2 44.4 15.4 13.3 17.9-9.8-8 18.7 15 14L45 78.9l-8.6 18.4-4.7-19.8-20.2-2.6L29 64.4zM372.1 229l.4 20.3 19.3 6.7-19.3 6.7-.4 20.3-12.3-16.2-19.5 6L352 256l-11.7-16.7 19.5 5.9zM36.5 414.7l8.6 18.4 20.3-1.7-14.8 14 7.9 18.7-17.9-9.8-15.4 13.3 3.9-20-17.5-10.5 20.2-2.6zM158.9 148l-6.6 6.6 3.2 50.3-3.3.3-6-45.9-5.5 5.4 8.2 41a51 51 0 0 0-18.4 7.7l-23.3-34.8h-7.7l28.2 36.8-2.5 2.1-33.3-38h-9.4v9.5l38 33.3-2.2 2.5-36.8-28.2v7.7l34.8 23.3a51 51 0 0 0-7.6 18.4l-41-8.2-5.5 5.5 46 6-.4 3.4-50.3-3.3-6.7 6.6 6.7 6.6 50.3-3.2.3 3.3-45.9 6 5.4 5.5 41-8.2a51 51 0 0 0 7.7 18.4l-34.8 23.3v7.7l36.8-28.2 2.1 2.5-38 33.3v9.4H92l33.3-38 2.5 2.2-28.2 36.8h7.7l23.3-34.8a51 51 0 0 0 18.4 7.6l-8.2 41 5.5 5.5 6-46 3.3.4-3.2 50.3 6.6 6.7 6.6-6.7-3.2-50.3 3.3-.3 6 45.9 5.5-5.4-8.2-41a51 51 0 0 0 18.4-7.7l23.3 34.8h7.7L190 296.6l2.5-2.1 33.3 38h9.4V323l-38-33.3 2.2-2.5 36.8 28.2v-7.7l-34.8-23.3A51 51 0 0 0 209 266l41 8.2 5.5-5.5-46-6 .4-3.3 50.3 3.2 6.7-6.6-6.7-6.6-50.3 3.3q0-1.8-.3-3.4l45.9-6-5.4-5.5-41 8.2a51 51 0 0 0-7.7-18.4l34.8-23.3v-7.7l-36.8 28.2-2.1-2.5 38-33.3v-9.4h-9.5l-33.3 38-2.5-2.2 28.2-36.8h-7.7l-23.3 34.8a51 51 0 0 0-18.4-7.6l8.2-41-5.5-5.5-6 46-3.3-.4 3.2-50.3z"/>
</svg>`,pk:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-pk" viewBox="0 0 512 512">
  <defs>
    <clipPath id="pk-a">
      <path fill-opacity=".7" d="M0 0h512v512H0z"/>
    </clipPath>
  </defs>
  <g fill-rule="evenodd" stroke-width="1pt" clip-path="url(#pk-a)">
    <path fill="#0c590b" d="M-95 0h768v512H-95z"/>
    <path fill="#fff" d="M-95 0H97.5v512H-95z"/>
    <g fill="#fff">
      <path d="m403.7 225.4-31.2-6.6-16.4 27.3-3.4-31.6-31-7.2 29-13-2.7-31.7 21.4 23.6 29.3-12.4-15.9 27.6 21 24z"/>
      <path d="M415.4 306a121 121 0 0 1-161.3 59.4 122 122 0 0 1-59.5-162.1A119 119 0 0 1 266 139a156 156 0 0 0-11.8 10.9A112.3 112.3 0 0 0 415.5 306z"/>
    </g>
  </g>
</svg>`,pl:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-pl" viewBox="0 0 512 512">
  <g fill-rule="evenodd">
    <path fill="#fff" d="M512 512H0V0h512z"/>
    <path fill="#dc143c" d="M512 512H0V256h512z"/>
  </g>
</svg>`,ru:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-ru" viewBox="0 0 512 512">
  <path fill="#fff" d="M0 0h512v170.7H0z"/>
  <path fill="#0039a6" d="M0 170.7h512v170.6H0z"/>
  <path fill="#d52b1e" d="M0 341.3h512V512H0z"/>
</svg>`,se:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-se" viewBox="0 0 512 512">
  <path fill="#005293" d="M0 0h512v512H0z"/>
  <path fill="#fecb00" d="M134 0v204.8H0v102.4h134V512h102.4V307.2H512V204.8H236.4V0z"/>
</svg>`,sg:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-sg" viewBox="0 0 640 480">
  <defs>
    <clipPath id="sg-a">
      <path fill-opacity=".7" d="M0 0h640v480H0z"/>
    </clipPath>
  </defs>
  <g fill-rule="evenodd" clip-path="url(#sg-a)">
    <path fill="#fff" d="M-20 0h720v480H-20z"/>
    <path fill="#df0000" d="M-20 0h720v240H-20z"/>
    <path fill="#fff" d="M146 40.2a84.4 84.4 0 0 0 .8 165.2 86 86 0 0 1-106.6-59 86 86 0 0 1 59-106c16-4.6 30.8-4.7 46.9-.2z"/>
    <path fill="#fff" d="m133 110 4.9 15-13-9.2-12.8 9.4 4.7-15.2-12.8-9.3 15.9-.2 5-15 5 15h15.8zm17.5 52 5 15.1-13-9.2-12.9 9.3 4.8-15.1-12.8-9.4 15.9-.1 4.9-15.1 5 15h16zm58.5-.4 4.9 15.2-13-9.3-12.8 9.3 4.7-15.1-12.8-9.3 15.9-.2 5-15 5 15h15.8zm17.4-51.6 4.9 15.1-13-9.2-12.8 9.3 4.8-15.1-12.9-9.4 16-.1 4.8-15.1 5 15h16zm-46.3-34.3 5 15.2-13-9.3-12.9 9.4 4.8-15.2-12.8-9.4 15.8-.1 5-15.1 5 15h16z"/>
  </g>
</svg>`,th:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-th" viewBox="0 0 512 512">
  <g fill-rule="evenodd">
    <path fill="#f4f5f8" d="M0 0h512v512H0z"/>
    <path fill="#2d2a4a" d="M0 173.4h512V344H0z"/>
    <path fill="#a51931" d="M0 0h512v88H0zm0 426.7h512V512H0z"/>
  </g>
</svg>`,tr:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-tr" viewBox="0 0 512 512">
  <g fill-rule="evenodd">
    <path fill="#e30a17" d="M0 0h512v512H0z"/>
    <path fill="#fff" d="M348.8 264c0 70.6-58.3 127.9-130.1 127.9s-130.1-57.3-130.1-128 58.2-127.8 130-127.8S348.9 193.3 348.9 264z"/>
    <path fill="#e30a17" d="M355.3 264c0 56.5-46.6 102.3-104.1 102.3s-104-45.8-104-102.3 46.5-102.3 104-102.3 104 45.8 104 102.3z"/>
    <path fill="#fff" d="m374.1 204.2-1 47.3-44.2 12 43.5 15.5-1 43.3 28.3-33.8 42.9 14.8-24.8-36.3 30.2-36.1-46.4 12.8z"/>
  </g>
</svg>`,tw:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-tw" viewBox="0 0 640 480">
  <clipPath id="tw-a">
    <path d="M0 0h640v480H0z"/>
  </clipPath>
  <g clip-path="url(#tw-a)">
    <path fill="red" d="M0 0h720v480H0z"/>
    <path fill="#000095" d="M0 0h360v240H0z"/>
    <g fill="#fff">
      <path d="m154 126.9-2.5 9.6 9.4 2.6-1.8-7.1zm46.9 5.1-1.8 7.1 9.4-2.6-2.5-9.6zm-41.8-24-5.1 5.1 1.9 6.9z"/>
      <path d="m155.9 120-1.9 6.9 5.1 5.1z"/>
      <path d="m154 113.1-6.9 6.9 6.9 6.9 1.9-6.9zm14 27.8 5.1 5.1 6.9-1.9zm18.9 5.1 9.6 2.5 2.6-9.4-7.1 1.8z"/>
      <path d="m192 140.9 7.1-1.8 1.8-7.1zm-31.1-1.8 2.6 9.4 9.6-2.5-5.1-5.1zm19.1 5 6.9 1.9 5.1-5.1z"/>
      <path d="m173.1 146 6.9 6.9 6.9-6.9-6.9-1.9zm-12.2-45.1-9.4 2.6 2.5 9.6 5.1-5.1zm-1.8 31.1 1.8 7.1 7.1 1.8zm45-12 1.9-6.9-5.1-5.1z"/>
      <path d="m168 99.1-7.1 1.8-1.8 7.1zm32.9 8.9-1.8-7.1-7.1-1.8zm5.1 18.9 6.9-6.9-6.9-6.9-1.9 6.9z"/>
      <path d="m200.9 108-8.9-8.9-12-3.2-12 3.2-8.9 8.9-3.2 12 3.2 12 8.9 8.9 12 3.2 12-3.2 8.9-8.9 3.2-12z"/>
      <path d="m200.9 132 5.1-5.1-1.9-6.9zm5.1-18.9 2.5-9.6-9.4-2.6 1.8 7.1zm-6.9-12.2-2.6-9.4-9.6 2.5 5.1 5.1zm-26-6.9-9.6-2.5-2.6 9.4 7.1-1.8zm6.9 1.9-6.9-1.9-5.1 5.1z"/>
      <path d="m186.9 94-6.9-6.9-6.9 6.9 6.9 1.9z"/>
      <path d="m192 99.1-5.1-5.1-6.9 1.9zM173.1 146l-9.6 2.5 4.5 16.6 12-12.2zm-5.1 19.1 12 44.9 12-44.9-12-12.2zm-7.1-26-9.4-2.6-4.4 16.4 16.4-4.4z"/>
      <path d="m147.1 152.9-12 45.1 32.9-32.9-4.5-16.6zm-12-20.9L102 165.1l45.1-12.2 4.4-16.4z"/>
      <path d="m154 126.9-6.9-6.9-12 12 16.4 4.5zm0-13.8-2.5-9.6-16.4 4.5 12 12z"/>
      <path d="M135.1 108 90 120l45.1 12 12-12zm90 24-16.6 4.5 4.4 16.4 45.1 12.2z"/>
      <path d="m199.1 139.1-2.6 9.4 16.4 4.4-4.4-16.4zm-12.2 6.9-6.9 6.9 12 12.2 4.5-16.6zm19.1-19.1 2.5 9.6 16.6-4.5-12.2-12z"/>
      <path d="m192 165.1 33.1 32.9-12.2-45.1-16.4-4.4zm7.1-64.2 9.4 2.6 4.4-16.4-16.4 4.4z"/>
      <path d="M225.1 108 258 75.1l-45.1 12-4.4 16.4zm-12.2-20.9L225.1 42 192 75.1l4.5 16.4zm12.2 44.9 44.9-12-44.9-12-12.2 12z"/>
      <path d="m206 113.1 6.9 6.9 12.2-12-16.6-4.5zm-38-38L135.1 42l12 45.1 16.4 4.4z"/>
      <path d="m160.9 100.9 2.6-9.4-16.4-4.4 4.4 16.4z"/>
      <path d="m147.1 87.1-45.1-12 33.1 32.9 16.4-4.5zm39.8 6.9 9.6-2.5-4.5-16.4-12 12z"/>
      <path d="M192 75.1 180 30l-12 45.1 12 12z"/>
      <path d="m173.1 94 6.9-6.9-12-12-4.5 16.4z"/>
    </g>
    <circle cx="180" cy="120" r="51.1" fill="#000095"/>
    <circle cx="180" cy="120" r="45.1" fill="#fff"/>
  </g>
</svg>`,ua:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-ua" viewBox="0 0 512 512">
  <g fill-rule="evenodd" stroke-width="1pt">
    <path fill="gold" d="M0 0h512v512H0z"/>
    <path fill="#0057b8" d="M0 0h512v256H0z"/>
  </g>
</svg>`,us:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-us" viewBox="0 0 640 480">
  <path fill="#bd3d44" d="M0 0h640v480H0"/>
  <path stroke="#fff" stroke-width="37" d="M0 55.3h640M0 129h640M0 203h640M0 277h640M0 351h640M0 425h640"/>
  <path fill="#192f5d" d="M0 0h364.8v258.5H0"/>
  <marker id="us-a" markerHeight="30" markerWidth="30">
    <path fill="#fff" d="m14 0 9 27L0 10h28L5 27z"/>
  </marker>
  <path fill="none" marker-mid="url(#us-a)" d="m0 0 16 11h61 61 61 61 60L47 37h61 61 60 61L16 63h61 61 61 61 60L47 89h61 61 60 61L16 115h61 61 61 61 60L47 141h61 61 60 61L16 166h61 61 61 61 60L47 192h61 61 60 61L16 218h61 61 61 61 60z"/>
</svg>`,vn:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-vn" viewBox="0 0 512 512">
  <defs>
    <clipPath id="vn-a">
      <path fill-opacity=".7" d="M177.2 0h708.6v708.7H177.2z"/>
    </clipPath>
  </defs>
  <g fill-rule="evenodd" clip-path="url(#vn-a)" transform="translate(-128)scale(.72249)">
    <path fill="#da251d" d="M0 0h1063v708.7H0z"/>
    <path fill="#ff0" d="m661 527.5-124-92.6-123.3 93.5 45.9-152-123.2-93.8 152.4-1.3L536 129.8 584.3 281l152.4.2-122.5 94.7z"/>
  </g>
</svg>`,za:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-za" viewBox="0 0 512 512">
  <defs>
    <clipPath id="za-a">
      <path fill-opacity=".7" d="M70.1 0h499.6v499.6H70.1z"/>
    </clipPath>
  </defs>
  <g clip-path="url(#za-a)" transform="translate(-71.9)scale(1.0248)">
    <g fill-rule="evenodd" stroke-width="1pt">
      <path fill="#000001" d="M0 397.9v-296l220.4 147.9z"/>
      <path fill="#000c8a" d="m150.4 499.7 247.4-166.5h351.6v166.5z"/>
      <path fill="#e1392d" d="M134.5 0h615v166.6H397.7S137.8-1.6 134.5 0"/>
      <path fill="#ffb915" d="M0 62.5v39.3l220.4 148L0 397.8v39.4l277.6-187.4z"/>
      <path fill="#007847" d="M0 62.5V0h92.6l294 199h362.8v101.7H386.6l-294 198.9H0v-62.4l277.6-187.4z"/>
      <path fill="#fff" d="M92.6 0h57.8l247.4 166.6h351.6V199H386.6zm0 499.7h57.8l247.4-166.5h351.6v-32.4H386.6z"/>
    </g>
  </g>
</svg>`},xK={ae:1.3333,ar:1.3333,cl:1.3333,cr:1.3333,gm:1.3333,gt:1.3333,hk:1.3333,nz:1.3333,sg:1.3333,tw:1.3333,us:1.3333};function oh(l){let h=LK[l.toLowerCase()];return h?"data:image/svg+xml,"+encodeURIComponent(h):""}var th={us:{aspect:1.3333333333333333},cn:{scale:1.2,dx:2.2,dy:2.8},kr:{scale:0.72}};var DK="M19.964 8.156 15.758.844A1.69 1.69 0 0014.299 0H5.887c-.6 0-1.156.32-1.456.844L.225 8.156c-.3.523-.3 1.165 0 1.688l4.206 7.312c.3.523.856.844 1.456.844h8.412c.6 0 1.156-.32 1.456-.844l4.206-7.312a1.69 1.69 0 00.003-1.688",O1=0;function T1(l,h){let Q=l?.aspect??(h?xK[h.toLowerCase()]??1:1),K=l?.scale??1,Z=l?.dx??0,k=l?.dy??0,M=1.08,W=Math.max(20,18*Q)*1.08*K,G=W/Q;return{x:10+Z-W/2,y:9+k-G/2,w:W,h:G}}function S1(l,h={}){let Q=h.size??24,K=h.fit??th[l.toLowerCase()],{x:Z,y:k,w:M,h:W}=T1(K,l),G=Math.max(0.4,22/Q),Y=`nq-flag-${O1+=1}`;return`<svg class="nq-flag-hex" viewBox="0 0 20 18" width="${Q}" height="${(Q*0.9).toFixed(2)}" aria-hidden="true" style="display:block;overflow:visible"><defs><clipPath id="${Y}"><path d="${DK}"/></clipPath></defs><g clip-path="url(#${Y})"><image href="${oh(l)}" x="${Z}" y="${k}" width="${M}" height="${W}" preserveAspectRatio="xMidYMid slice"/></g><path d="${DK}" fill="none" stroke="rgba(31,35,72,0.4)" stroke-width="${G.toFixed(2)}" stroke-linejoin="round"/></svg>`}function s(l,h={}){let Q=document.createElement("div");return Q.innerHTML=S1(l,h),Q.firstElementChild}function f1(l,h,Q,K={}){let Z=K.pad??2,k=K.bandDepth??14;if(l.length===0)return{line:"",fill:"",band:""};let M=Math.max(...l),W=Math.min(...l),G=M-W,Y=Q-Z*2,P=(J)=>l.length===1?h/2:J/(l.length-1)*h,X=(J)=>G===0?Z+Y/2:Z+Y-(J-W)/G*Y,z=l.map((J,_)=>[P(_),X(J)]),I=`M${z.map(([J,_])=>`${J.toFixed(1)},${_.toFixed(1)}`).join("L")}`,$=`${I}L${h.toFixed(1)},${Q}L0,${Q}Z`,C=z.slice().reverse().map(([J,_])=>`${J.toFixed(1)},${(_+k).toFixed(1)}`),L=`${I}L${C.join("L")}Z`;return{line:I,fill:$,band:L}}function kh(l,h,Q,K){let Z=l*Math.PI*2-Math.PI/2;return[Q+h*Math.cos(Z),K+h*Math.sin(Z)]}function w1(l,h,Q,K){let Z=l.reduce((W,G)=>W+(G>0?G:0),0);if(Z<=0)return[];let k=[],M=0;return l.forEach((W,G)=>{if(W<=0)return;let Y=W/Z,[P,X]=kh(M,h,Q,K),[z,j]=kh(M+Y,h,Q,K),I=Y>=1?kh(0.9999,h,Q,K):[z,j],$=Y>0.5?1:0;k.push({path:`M${P.toFixed(2)},${X.toFixed(2)}A${h},${h} 0 ${$} 1 ${I[0].toFixed(2)},${I[1].toFixed(2)}`,fraction:Y,index:G}),M+=Y}),k}var eh="data:image/svg+xml,"+encodeURIComponent('<svg width="64" height="64" viewBox="0 -4 64 64" xmlns="http://www.w3.org/2000/svg"><path opacity=".1" d="M62.3 25.4L49.2 2.6A5.3 5.3 0 0 0 44.6 0H18.4c-1.9 0-3.6 1-4.6 2.6L.7 25.4c-1 1.6-1 3.6 0 5.2l13.1 22.8c1 1.6 2.7 2.6 4.6 2.6h26.2c1.9 0 3.6-1 4.6-2.6l13-22.8c1-1.6 1-3.6.1-5.2z" fill="#1F2348"/></svg>');function y1(l){let h=(l??"").trim(),Q=h.split(/\s+/);if(Q.length>=5)return`${Q.slice(0,3).join(" ")} … ${Q.slice(-1)}`;if(h.length>16)return`${h.slice(0,8)}…${h.slice(-5)}`;return h}function R1(){if(typeof document>"u")return;if(document.getElementById("nimiq-shell-profile-style"))return;let l=document.createElement("style");l.id="nimiq-shell-profile-style",l.textContent=`
.nq-profile { display:flex; align-items:center; flex-wrap:wrap; gap:12px; font-family:'Mulish',system-ui,sans-serif; }
.nq-profile__icon { flex-shrink:0; border-radius:50%; overflow:hidden; background:var(--nq-profile-icon-bg, #fff); }
.nq-profile__icon img { display:block; width:100%; height:100%; }
.nq-profile__body { flex:1 1 auto; min-width:0; display:flex; flex-direction:column; gap:2px; }
.nq-profile__label { font-weight:700; font-size:15px; color:var(--nq-profile-fg, #1f2348); line-height:1.2; }
.nq-profile__addr { font-size:12px; color:var(--nq-profile-muted, #5f6370); font-family:ui-monospace,monospace; overflow-wrap:anywhere; }
.nq-profile__bal { font-size:13px; color:var(--nq-profile-fg, #1f2348); font-weight:600; }
/* Actions drop to their own full-width row so the address keeps the identity row to
   itself (in a ~280px dropdown, inline Copy + Disconnect otherwise crush it to a
   one-char-per-line column). */
.nq-profile__actions { display:flex; gap:8px; flex-basis:100%; margin-top:2px; justify-content:flex-end; }
.nq-profile__btn { font:inherit; font-size:13px; font-weight:600; padding:6px 12px; border-radius:500px;
  border:1px solid var(--nq-profile-btn-border, #e5e7ef); background:var(--nq-profile-btn-bg, #fff); color:var(--nq-profile-fg, #1f2348); cursor:pointer; }
.nq-profile__btn:hover { background:var(--nq-profile-btn-hover, #f4f5f9); }
`,document.head.appendChild(l)}async function q1(l){if(!l)return eh;try{let Q=await import("@nimiq/iqons"),K=Q.default??Q;if(K&&typeof K.toDataUrl==="function")return await K.toDataUrl(l)}catch{}return eh}function lQ(l,h){let{wallet:Q,i18n:K}=h,Z=h.identiconSize??48,k=h.showDisconnect!==!1,M=h.showCopy!==!1;if(h.injectStyles!==!1)R1();let W=document.createElement("div");W.className="nq-profile",l.appendChild(W);let G=0;async function Y(){let z=++G,j=Q.account;W.textContent="";let I=document.createElement("span");I.className="nq-profile__icon",I.style.width=`${Z}px`,I.style.height=`${Z}px`;let $=null;if(j&&h.identicon)I.appendChild(h.identicon(j.address,Z));else $=document.createElement("img"),$.src=eh,$.alt="identicon",I.appendChild($);W.appendChild(I);let C=document.createElement("div");C.className="nq-profile__body";let L=document.createElement("span");if(L.className="nq-profile__label",L.textContent=j?j.label||K.t("shell.account"):K.t("shell.notConnected"),C.appendChild(L),j){let J=document.createElement("span");if(J.className="nq-profile__addr",J.textContent=y1(j.address),J.title=j.address,C.appendChild(J),h.getBalance){let _=document.createElement("span");_.className="nq-profile__bal",_.textContent="…",C.appendChild(_),Promise.resolve(h.getBalance(j.address)).then((N)=>{if(z===G)_.textContent=N}).catch(()=>{if(z===G)_.textContent=""})}}if(W.appendChild(C),j&&(M||k)){let J=document.createElement("div");if(J.className="nq-profile__actions",M){let _=document.createElement("button");_.type="button",_.className="nq-profile__btn",_.textContent=K.t("shell.copyAddress"),_.addEventListener("click",async()=>{try{await navigator.clipboard?.writeText(j.address);let N=_.textContent;_.textContent=K.t("shell.copied"),setTimeout(()=>{_.textContent=N},1200)}catch{}}),J.appendChild(_)}if(k){let _=document.createElement("button");_.type="button",_.className="nq-profile__btn",_.textContent=K.t("shell.disconnect"),_.addEventListener("click",()=>Q.disconnect()),J.appendChild(_)}W.appendChild(J)}if($){let J=await q1(j?.address??null);if(z===G)$.src=J}}Y();let P=Q.onAccountChange(()=>void Y()),X=K.onChange(()=>void Y());return{el:W,refresh(){Y()},destroy(){P(),X(),W.remove()}}}var OK="nimiq-shell-lang-switcher-style";function v1(){if(typeof document>"u")return;if(document.getElementById(OK))return;let l=document.createElement("style");l.id=OK,l.textContent=`
.nq-langsw { list-style:none; margin:0; padding:0; display:flex; flex-wrap:wrap; justify-content:center; gap:calc(var(--nq-flag-w,40px)*0.3); }
.nq-langsw li { display:block; }
.nq-langsw__btn { position:relative; display:block; padding:0; border:none; background:none; cursor:pointer; line-height:0; }
.nq-langsw__btn:hover { z-index:2; }
.nq-langsw__art { display:block; transition: transform .18s cubic-bezier(.25,0,0,1); }
.nq-langsw__btn:hover .nq-langsw__art { transform:scale(1.18); }
.nq-langsw__btn.is-active .nq-langsw__art { outline:2px solid #0582ca; outline-offset:2px; border-radius:4px; }
.nq-langsw__btn:focus-visible { outline:2px solid #0582ca; outline-offset:3px; border-radius:6px; }
.nq-langsw__tip { position:absolute; left:50%; bottom:calc(100% + 12px); transform:translateX(-50%) translateY(3px);
  padding:8px 12px; border-radius:4px; background:#1f2348; color:#fff; font-size:13px; font-weight:600; line-height:1;
  white-space:nowrap; pointer-events:none; opacity:0; z-index:30; box-shadow:0 9px 18px rgba(0,0,0,.11);
  transition:opacity 80ms ease, transform 80ms ease; }
.nq-langsw__tip::after { content:''; position:absolute; left:50%; top:100%; transform:translateX(-50%);
  border:6px solid transparent; border-top-color:#1f2348; border-bottom-width:0; }
.nq-langsw__btn:hover .nq-langsw__tip, .nq-langsw__btn:focus-visible .nq-langsw__tip { opacity:1; transform:translateX(-50%) translateY(0); }
`,document.head.appendChild(l)}function B1(l,h){let{i18n:Q}=h,K=h.languages??rh,Z=h.size??40;if(h.injectStyles!==!1)v1();let k=document.createElement("ul");k.className="nq-langsw",k.setAttribute("role","listbox"),k.setAttribute("aria-label",Q.t("shell.language")),k.style.setProperty("--nq-flag-w",`${Z}px`);let M=new Map;for(let Y of K){let P=document.createElement("li"),X=document.createElement("button");X.type="button",X.className="nq-langsw__btn",X.setAttribute("role","option"),X.setAttribute("aria-label",Y.name);let z=document.createElement("span");z.className="nq-langsw__art",z.appendChild(s(Y.flag,{size:Z}));let j=document.createElement("span");j.className="nq-langsw__tip",j.setAttribute("aria-hidden","true"),j.textContent=Y.name,X.appendChild(z),X.appendChild(j),X.addEventListener("click",()=>Q.setLanguage(Y.id)),P.appendChild(X),k.appendChild(P),M.set(Y.id,X)}function W(Y){for(let[P,X]of M){let z=P===Y;X.classList.toggle("is-active",z),X.setAttribute("aria-selected",String(z))}}W(Q.getLanguage());let G=Q.onChange((Y)=>W(Y));return l.appendChild(k),{el:k,destroy(){G(),k.remove()}}}var TK="nimiq-shell-langpill-style";function b1(){if(typeof document>"u"||document.getElementById(TK))return;let l=document.createElement("style");l.id=TK,l.textContent=`
.nq-langpill { position: relative; }
.nq-langpill__btn { display:inline-flex; align-items:center; gap:7px; height:40px; padding:0 12px;
  border:1px solid color-mix(in srgb, currentColor 20%, transparent); border-radius:999px;
  background:transparent; color:inherit; cursor:pointer; font:inherit;
  transition:border-color .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)), background-color .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-langpill__btn:hover { border-color: color-mix(in srgb, currentColor 40%, transparent); background: color-mix(in srgb, currentColor 6%, transparent); }
.nq-langpill__btn:focus-visible { outline:2px solid var(--nq-langpill-accent, #0582ca); outline-offset:3px; }
.nq-langpill__caret { width:10px; height:6px; color:currentColor; opacity:.6; }
.nq-langpill__menu { position:absolute; top:calc(100% + 10px); right:0; z-index:40; width:224px;
  max-height:min(64vh,392px); overflow-y:auto; overscroll-behavior:contain; scrollbar-width:thin;
  margin:0; padding:6px; list-style:none; background:var(--nq-langpill-menu-bg, #fff); border-radius:10px;
  border:var(--nq-langpill-menu-border, none);
  box-shadow:var(--nq-langpill-menu-shadow, 0 12px 36px rgba(13,11,36,.28)); }
.nq-langpill__menu li { display:block; }
.nq-langpill__option { display:flex; align-items:center; gap:10px; width:100%; padding:8px 10px;
  border:none; border-radius:7px; background:none; font:inherit; font-size:14px; font-weight:600;
  color:var(--nq-langpill-menu-fg, #1f2348); text-align:left; cursor:pointer;
  transition:background-color .12s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-langpill__option:hover { background:var(--nq-langpill-menu-hover, rgba(31,35,72,.06)); }
.nq-langpill__option.is-active { color:var(--nq-langpill-accent, #0582ca); }
.nq-langpill__name { white-space:nowrap; }
@media (max-width:560px){
  .nq-langpill { position:static; }
  .nq-langpill__menu { left:clamp(16px,4vw,28px); right:clamp(16px,4vw,28px); width:auto; }
}
`,document.head.appendChild(l)}var g1='<svg class="nq-langpill__caret" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';function m1(l,h){let{i18n:Q}=h,K=h.languages??bl,Z=h.size??24;if(h.injectStyles!==!1)b1();let k=document.createElement("div");k.className="nq-langpill";let M=document.createElement("button");M.type="button",M.className="nq-langpill__btn",M.setAttribute("aria-haspopup","listbox"),M.setAttribute("aria-expanded","false"),M.setAttribute("aria-label",Q.t("shell.language"));let W=document.createElement("ul");W.className="nq-langpill__menu",W.setAttribute("role","listbox"),W.setAttribute("aria-label",Q.t("shell.language")),W.hidden=!0;let G=new Map;for(let C of K){let L=document.createElement("li"),J=document.createElement("button");J.type="button",J.className="nq-langpill__option",J.setAttribute("role","option"),J.appendChild(s(C.flag,{size:Z}));let _=document.createElement("span");_.className="nq-langpill__name",_.textContent=C.name,J.appendChild(_),J.addEventListener("click",()=>{Q.setLanguage(C.id),z()}),L.appendChild(J),W.appendChild(L),G.set(C.id,J)}k.appendChild(M),k.appendChild(W),l.appendChild(k);function Y(){let C=Q.getLanguage(),L=K.find((J)=>J.id===C)??K[0];if(M.textContent="",L)M.appendChild(s(L.flag,{size:Z}));M.insertAdjacentHTML("beforeend",g1)}function P(C){for(let[L,J]of G){let _=L===C;J.classList.toggle("is-active",_),J.setAttribute("aria-selected",String(_))}}function X(){W.hidden=!1,M.setAttribute("aria-expanded","true"),document.addEventListener("click",j,!0),document.addEventListener("keydown",I)}function z(){if(W.hidden)return;W.hidden=!0,M.setAttribute("aria-expanded","false"),document.removeEventListener("click",j,!0),document.removeEventListener("keydown",I)}function j(C){if(!k.contains(C.target))z()}function I(C){if(C.key==="Escape")z(),M.focus()}M.addEventListener("click",()=>W.hidden?X():z()),Y(),P(Q.getLanguage());let $=Q.onChange((C)=>{Y(),P(C)});return{el:k,destroy(){$(),z(),k.remove()}}}var SK="nimiq-shell-walletpill-style";function d1(){if(typeof document>"u"||document.getElementById(SK))return;let l=document.createElement("style");l.id=SK,l.textContent=`
.nq-wallet { position:relative; font-family:'Mulish',system-ui,sans-serif; }
.nq-connect { display:inline-flex; align-items:center; gap:8px; height:40px; padding:0 16px;
  border:1px solid color-mix(in srgb, currentColor 22%, transparent); border-radius:999px;
  background:transparent; color:inherit; font:inherit; font-size:14px; font-weight:700; line-height:1; cursor:pointer;
  transition:border-color .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)), background-color .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)), transform .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-connect:hover { border-color: color-mix(in srgb, currentColor 45%, transparent); background: color-mix(in srgb, currentColor 6%, transparent); transform:translateY(-1px); }
.nq-connect:active { transform:translateY(0); }
.nq-connect:disabled { opacity:.7; cursor:default; transform:none; }
.nq-connect:focus-visible { outline:2px solid var(--nq-walletpill-accent, #0582ca); outline-offset:3px; }
.nq-connect__icon { width:18px; height:18px; flex-shrink:0; opacity:.85; }
.nq-wallet__btn { display:inline-flex; align-items:center; gap:8px; height:40px; padding:4px 12px 4px 5px;
  border:1px solid color-mix(in srgb, currentColor 22%, transparent); border-radius:999px;
  background:transparent; color:inherit; font:inherit; font-size:13px; font-weight:700; cursor:pointer;
  transition:border-color .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)), background-color .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-wallet__btn:hover { border-color: color-mix(in srgb, currentColor 40%, transparent); background: color-mix(in srgb, currentColor 6%, transparent); }
.nq-wallet__btn:focus-visible { outline:2px solid var(--nq-walletpill-accent, #0582ca); outline-offset:3px; }
.nq-wallet__icon { width:28px; height:28px; flex-shrink:0; border-radius:50%; overflow:hidden; display:inline-flex; background: color-mix(in srgb, currentColor 12%, transparent); }
.nq-wallet__icon img, .nq-wallet__icon > * { width:100%; height:100%; display:block; }
.nq-wallet__label { white-space:nowrap; font-family:ui-monospace,'Fira Mono',monospace; letter-spacing:.02em; }
.nq-wallet__caret { width:10px; height:6px; flex-shrink:0; color:currentColor; opacity:.6; }
.nq-wallet__menu { position:absolute; top:calc(100% + 10px); right:0; z-index:40; min-width:280px; max-width:92vw;
  padding:16px; background:var(--nq-walletpill-menu-bg, #fff); border:var(--nq-walletpill-menu-border, none);
  border-radius:12px; box-shadow:var(--nq-walletpill-menu-shadow, 0 12px 36px rgba(13,11,36,.28)); }
@media (max-width:560px){
  .nq-wallet { position:static; }
  .nq-wallet__menu { left:clamp(16px,4vw,28px); right:clamp(16px,4vw,28px); min-width:0; max-width:none; }
}
`,document.head.appendChild(l)}var u1="data:image/svg+xml,"+encodeURIComponent('<svg width="64" height="64" viewBox="0 -4 64 64" xmlns="http://www.w3.org/2000/svg"><path opacity=".25" d="M62.3 25.4L49.2 2.6A5.3 5.3 0 0 0 44.6 0H18.4c-1.9 0-3.6 1-4.6 2.6L.7 25.4c-1 1.6-1 3.6 0 5.2l13.1 22.8c1 1.6 2.7 2.6 4.6 2.6h26.2c1.9 0 3.6-1 4.6-2.6l13-22.8c1-1.6 1-3.6.1-5.2z" fill="currentColor"/></svg>'),hQ='<svg class="nq-connect__icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="2" y="5" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 9h16" stroke="currentColor" stroke-width="1.5"/><circle cx="6" cy="13" r="1" fill="currentColor"/></svg>',c1='<svg class="nq-wallet__caret" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';function i1(l,h){if(l.label)return l.label;let Q=l.address?.trim()??"";if(!Q)return h;return`${Q.slice(0,7)}…${Q.slice(-4)}`}function p1(l,h){let{wallet:Q,i18n:K}=h;if(h.injectStyles!==!1)d1();let Z=document.createElement("div");Z.className="nq-wallet",l.appendChild(Z);let k=null,M=!1;function W(){k?.destroy(),k=null,document.removeEventListener("click",G,!0),document.removeEventListener("keydown",Y)}function G(C){if(!Z.contains(C.target))P()}function Y(C){if(C.key==="Escape")P()}function P(){if(!M)return;M=!1,j()}function X(){let C=document.createElement("button");C.className="nq-connect",C.type="button",C.innerHTML=hQ+`<span>${K.t("shell.connectWallet")}</span>`,C.addEventListener("click",async()=>{C.disabled=!0,C.innerHTML=hQ+`<span>${K.t("shell.connecting")}</span>`;try{await Q.connect()}catch{C.disabled=!1,C.innerHTML=hQ+`<span>${K.t("shell.retry")}</span>`}}),Z.appendChild(C)}function z(){let C=Q.account,L=document.createElement("button");L.className="nq-wallet__btn",L.type="button",L.setAttribute("aria-haspopup","dialog"),L.setAttribute("aria-expanded",String(M));let J=document.createElement("span");if(J.className="nq-wallet__icon",h.identicon)J.appendChild(h.identicon(C.address,28));else{let N=document.createElement("img");N.src=u1,N.alt="",J.appendChild(N)}L.appendChild(J);let _=document.createElement("span");if(_.className="nq-wallet__label",_.textContent=i1(C,K.t("shell.account")),L.appendChild(_),L.insertAdjacentHTML("beforeend",c1),L.addEventListener("click",()=>{M=!M,j()}),Z.appendChild(L),M){let N=document.createElement("div");N.className="nq-wallet__menu",Z.appendChild(N),k=lQ(N,{wallet:Q,i18n:K,identiconSize:40,identicon:h.identicon,showCopy:!0,showDisconnect:!0}),document.addEventListener("click",G,!0),document.addEventListener("keydown",Y)}}function j(){if(W(),Z.textContent="",Q.account)z();else X()}j();let I=Q.onAccountChange(()=>{M=!1,j()}),$=K.onChange(()=>{if(!Q.account)j()});return{el:Z,destroy(){I(),$(),W(),Z.remove()}}}var n1="https://wallet.nimiq.com";function fK(l,h={}){let Q=l.replace(/\s+/g,"").toUpperCase(),K=h.basePath??n1,Z=BigInt(h.amountLuna??0),k=h.message?.trim()??"",M=[Q];if(Z>0n||k)M.push(Z>0n?El(Z).toString():"");if(k)M.push(encodeURIComponent(k));let W=K.endsWith("/")?"":"/";return`${K}${W}#_request/${M.join("/")}_`}var Mh=[],QQ=[],wK=!1;function gl(l,h,Q){if(l.push(h),l.length>Q)l.shift()}function s1(l){try{return typeof l==="string"?l:JSON.stringify(l)}catch{return String(l)}}function yK(l){return l?`
`+String(l).split(`
`).slice(0,4).join(`
`):""}function RK(l){try{let h=new URL(l,location.href);return h.pathname+h.search}catch{return String(l).slice(0,120)}}function qK(l){let h=l.search(/[?#]/);return h===-1?l:l.slice(0,h)}function KQ(l){if(wK||typeof window>"u")return;wK=!0,window.addEventListener("error",(Q)=>{let K=Q.filename?`
  at ${Q.filename}:${Q.lineno}:${Q.colno}`:"";gl(Mh,(Q.message||"Error")+K+yK(Q.error?.stack),20)}),window.addEventListener("unhandledrejection",(Q)=>{let K=Q.reason??{};gl(Mh,`Unhandled rejection: ${K.message??String(Q.reason)}${yK(K.stack)}`,20)});let h=console.error.bind(console);if(console.error=(...Q)=>{try{gl(Mh,Q.map(s1).join(" "),20)}catch{}h(...Q)},typeof window.fetch==="function"){let Q=window.fetch,K=Q.bind(window),Z=async(k,M)=>{let W=typeof k==="string"?k:k instanceof URL?k.href:k.url,G=M?.method??(k instanceof Request?k.method:"GET"),Y=Boolean(l)&&W.startsWith(l);try{let P=await K(k,M);if(P.status>=400&&!Y)gl(QQ,`${G} ${RK(W)} → ${P.status}`,12);return P}catch(P){if(!Y)gl(QQ,`${G} ${RK(W)} → network error`,12);throw P}};window.fetch=Object.assign(Z,Q)}}function ZQ(l=!1){return{url:typeof location<"u"?qK(location.href):"",title:typeof document<"u"?document.title:"",referrer:typeof document<"u"?qK(document.referrer):"",userAgent:typeof navigator<"u"?navigator.userAgent:"",viewport:typeof window<"u"?{w:window.innerWidth,h:window.innerHeight,dpr:window.devicePixelRatio||1}:{w:0,h:0,dpr:1},consoleErrors:Mh.slice(-12),networkFailures:QQ.slice(-10),hasScreenshot:l}}var Fl=(l,h)=>`color-mix(in srgb, ${l} ${h}%, black)`,zQ=(l,h)=>`color-mix(in srgb, ${l} ${h}%, transparent)`,Vh=(l,h)=>`radial-gradient(100% 100% at 100% 100%, ${l}, ${h})`;function vK(l){let h={},Q=(k,M)=>{if(M)h[k]=M};if(Q("--nq-cc-font",l.font),l.surface)Q("--nq-cc-menu-bg",l.surface),Q("--nq-cc-card-bg",l.surface);if(l.text)Q("--nq-cc-menu-fg",l.text),Q("--nq-cc-menu-muted",zQ(l.text,60)),Q("--nq-cc-menu-hover",zQ(l.text,6)),Q("--nq-cc-menu-line",zQ(l.text,8));let K=l.face??l.surface,Z=l.faceText??l.text;if(Q("--nq-cc-face-bg",K),Q("--nq-cc-face-bg-hover",K),Q("--nq-cc-face-fg",Z),l.primary)Q("--nq-cc-connect-bg",l.primary),Q("--nq-cc-connect-image",Vh(Fl(l.primary,92),l.primary)),Q("--nq-cc-connect-image-hover",Vh(Fl(l.primary,Math.round(62.56)),Fl(l.primary,68)));if(l.accent)Q("--nq-cc-accent",l.accent),Q("--nq-cc-send-bg",l.accent),Q("--nq-cc-send-image",Vh(Fl(l.accent,92),l.accent)),Q("--nq-cc-send-image-hover",Vh(Fl(l.accent,Math.round(62.56)),Fl(l.accent,68)));if(Q("--nq-cc-connect-fg",l.primaryText),Q("--nq-cc-send-fg",l.accentText),Q("--nq-cc-danger",l.danger),Q("--nq-cc-success",l.success),l.warning)Q("--nq-cc-warning",l.warning),Q("--nq-cc-warn-bg",`color-mix(in srgb, ${l.warning} 12%, white)`),Q("--nq-cc-warn-line",`color-mix(in srgb, ${l.warning} 22%, white)`);return h}function Ul(l,h){let Q=vK(h);for(let K of Object.keys(Q))l.style.setProperty(K,Q[K])}var a1=["nimiq.cards","nimiq.casino","nimiq.cool","nimiq.gift","nimiq.gives","nimiq.kids","nimiq.life","nimiq.money","nimiq.multisend","nimiq.name","nimiq.ninja","nimiq.party","nimiq.sale","nimiq.software","nimiq.stream","nimiq.talk","nimiq.tax","nimiq.tips","nimiq.vote","nimiq.work","swellet"],r1={"swellet.app":"swellet","swellet.io":"swellet"};function GQ(l){let h=l.trim().toLowerCase().replace(/^www\./,"").replace(/\.$/,"");if(!h||h==="localhost"||h.endsWith(".local"))return null;if(/^\d+\.\d+\.\d+\.\d+$/.test(h)||!h.includes("."))return null;let Q=/^([a-z0-9-]+)\.(?:fly\.dev|pages\.dev|workers\.dev|vercel\.app|netlify\.app)$/.exec(h),K=r1[h]??(Q?Q[1].replace(/-/g,"."):h);return a1.includes(K)?K:null}var o1="https://bot.nimiq.tech";function ml(l){return l.replace(/NQ\d{2}[\s]?(?:[0-9A-HJ-NP-VXY]{4}[\s]?){8}/gi,"[address redacted]").replace(/(^|[^0-9a-f])([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?![0-9a-f])/gi,"$1[id redacted]")}function XQ(l){if(typeof l==="string")return ml(l);if(Array.isArray(l))return l.map(XQ);if(l&&typeof l==="object"){let h={};for(let[Q,K]of Object.entries(l))h[Q]=XQ(K);return h}return l}async function gK(l,h){let Q=(l.service??o1).replace(/\/$/,""),K=XQ({...h.pageContext??{},...h.context??{}}),Z=ml([`[${h.type}] ${h.title.trim()}`,"",h.description.trim(),...t1(h)].join(`
`)),k=async(M,W)=>{let G=await globalThis.fetch(`${Q}${M}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(W)}),Y={};try{Y=await G.json()}catch{}return{res:G,json:Y}};try{let M=await k("/api/draft",{repo:l.repo,text:Z,context:K});if(!M.res.ok)return{ok:!1,status:M.res.status,error:BK(M.json)};let W=M.json.draft,G=M.json.reportId;if(!W||!G)return{ok:!1,status:M.res.status,error:"The issue service sent back nothing to file."};let Y=[...new Set([...W.labels??[],...l.labels??[]])],P={reportId:G,repo:l.repo,title:ml(W.title),body:ml(W.body)},X=await k("/api/file",{...P,labels:Y});if(!X.res.ok&&Y.length&&String(X.json.error??"")==="github_failed")X=await k("/api/file",{...P,labels:[]});let z=X.json.url;if(!X.res.ok&&!z)return{ok:!1,status:X.res.status,error:BK(X.json)};return{ok:!0,status:X.res.status,issueNumber:X.json.number,issueUrl:z}}catch(M){return{ok:!1,status:0,error:M instanceof Error?M.message:String(M)}}}function t1(l){let h=l.context??{},Q=Object.entries(h).map(([K,Z])=>`${K}: ${Z}`).join(" · ");return Q?["","---",Q]:[]}function BK(l){let h=String(l.error??"");return{rate_limited:"Too many reports just now. Give it a minute.",unknown_repo:"The issue service doesn't know this app.",empty_report:"Please describe the problem first.",github_not_configured:"The issue service isn't connected to GitHub yet.",github_failed:"GitHub rejected the issue. Try again shortly.",already_filed:"That report was already filed."}[h]??"Something went wrong."}function mK(l){let h=["bug","idea","question"];if(!l.type||!h.includes(l.type))return"shell.fbErrType";if((l.title??"").trim().length<5)return"shell.fbErrTitle";if((l.description??"").trim().length<10)return"shell.fbErrDetails";return null}async function dK(l,h){let Q={...h.context??{},type:h.type,title:h.title.trim(),description:h.description.trim()};if(h.diagnostic)Q.diagnostic=h.diagnostic;let K;try{K=await globalThis.fetch(l,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Q)})}catch(k){return{ok:!1,status:0,error:k instanceof Error?k.message:String(k)}}let Z={};try{Z=await K.json()}catch{}if(K.ok)return{ok:!0,status:K.status,issueNumber:Z.issueNumber};return{ok:!1,status:K.status,error:Z.error??`Server returned ${K.status}.`,fallbackMailto:Z.fallbackMailto}}function uK(){let l=[];try{if(typeof location<"u")l.push(`page: ${location.pathname}${location.hash}`);if(typeof navigator<"u")l.push(`ua: ${navigator.userAgent}`),l.push(`lang: ${navigator.language}`);if(typeof window<"u")l.push(`viewport: ${window.innerWidth}×${window.innerHeight}`)}catch{}return l.join(`
`)}var bK="nimiq-shell-report-bug-style",YQ='<svg viewBox="2.55 4.45 18.9 17.5" aria-hidden="true"><path fill="currentColor" d="M11.65 9.412A5.4 5.6 0 0 0 11.65 20.588Z"/><path fill="currentColor" d="M12.35 9.412A5.4 5.6 0 0 1 12.35 20.588Z"/><path fill="currentColor" d="M9.1 9.746A2.9 3.346 0 0 1 14.9 9.746A5.85 6.05 0 0 0 9.1 9.746Z"/><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7.8 12.2 5.6 10.8 5 8.9M7 15H3.4M7.8 17.8 5.6 19.2 5 21.1M16.2 12.2 18.4 10.8 19 8.9M17 15h3.6M16.2 17.8 18.4 19.2 19 21.1"/><path d="M10.8 7.6 9.5 5.9 8 5.3M13.2 7.6 14.5 5.9 16 5.3"/></g></svg>';function e1(l){if(l.getElementById(bK))return;let h=l.createElement("style");h.id=bK,h.textContent=`
.nq-fb-scrim { position:fixed; inset:0; z-index:10000; display:flex; align-items:center;
  justify-content:center; padding:16px;
  background:color-mix(in srgb, var(--nq-cc-scrim, #1f2348) 50%, transparent);
  font-family:var(--nq-cc-font, 'Mulish','Muli',system-ui,sans-serif); }
.nq-fb-card { width:100%; max-width:400px; max-height:calc(100dvh - 32px); overflow:auto; padding:20px;
  border-radius:10px; background:var(--nq-cc-menu-bg, #fff); color:var(--nq-cc-menu-fg, #1f2348);
  box-shadow:var(--nq-cc-menu-shadow, 0 4px 28px rgba(0,0,0,.16)); }
.nq-fb-head { display:flex; align-items:center; gap:8px; margin:0 0 14px; }
.nq-fb-head svg { display:block; width:22px; height:22px; flex:none; }
.nq-fb-title { margin:0; font-size:17px; font-weight:700; }
.nq-fb-field { display:block; margin-bottom:12px; }
.nq-fb-label { display:block; margin-bottom:5px; font-size:12px; font-weight:600;
  color:var(--nq-cc-menu-muted, rgba(31,35,72,.5)); }
.nq-fb-input { width:100%; padding:9px 10px; border:1px solid var(--nq-cc-menu-line, rgba(31,35,72,.14));
  border-radius:6px; background:var(--nq-cc-card-bg, #fff); color:var(--nq-cc-menu-fg, #1f2348);
  font-family:inherit; font-size:15px; font-weight:600; }
.nq-fb-input:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:-1px; }
textarea.nq-fb-input { min-height:104px; resize:vertical; font-weight:400; line-height:1.35; }
.nq-fb-diag { display:flex; align-items:center; gap:8px; margin-bottom:12px; font-size:13px;
  font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.6)); cursor:pointer; }
.nq-fb-error { display:none; margin:0 0 12px; font-size:13px; font-weight:600;
  color:var(--nq-cc-danger, #d94432); }
.nq-fb-error a { color:inherit; }
.nq-fb-actions { display:flex; align-items:center; justify-content:flex-end; gap:8px; }
.nq-fb-cancel { padding:10px 12px; border:none; border-radius:6px; background:none; cursor:pointer;
  font-family:inherit; font-size:13px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.5));
  transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-fb-cancel:hover { background:var(--nq-cc-menu-hover, rgba(31,35,72,.06)); }
.nq-fb-send { padding:10px 18px; border:none; border-radius:500px;
  background:var(--nq-cc-send-bg, #0582ca); color:var(--nq-cc-send-fg, #fff);
  cursor:pointer; font-family:inherit; font-size:14px; font-weight:700;
  transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-fb-send:hover { background:color-mix(in srgb, var(--nq-cc-send-bg, #0582ca) 88%, black); }
.nq-fb-send[disabled] { opacity:.6; cursor:default; }
.nq-fb-cancel:focus-visible, .nq-fb-send:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:2px; }
.nq-fb-toast { position:fixed; left:50%; bottom:24px; transform:translateX(-50%); z-index:10001;
  padding:11px 16px; border-radius:6px;
  background:var(--nq-cc-connect-bg, #1f2348); color:var(--nq-cc-connect-fg, #fff);
  font-family:var(--nq-cc-font, 'Mulish','Muli',system-ui,sans-serif); font-size:14px; font-weight:600;
  box-shadow:0 4px 14px rgba(31,35,72,.25); }
`,l.head.appendChild(h)}function u(l){return l.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function lZ(l,h,Q){let K=l.createElement("div");if(K.className="nq-fb-toast",K.setAttribute("role","status"),K.textContent=h,Q)Ul(K,Q);l.body.appendChild(K),setTimeout(()=>K.remove(),3000)}function kQ(l,h,Q){if(l.getElementById("nq-fb-scrim"))return;e1(l);let K=($)=>h.t($),Z=Q.diagnostics!==!1,k=l.createElement("div");if(k.id="nq-fb-scrim",k.className="nq-fb-scrim",Q.theme)Ul(k,Q.theme);k.innerHTML=`
    <div class="nq-fb-card" role="dialog" aria-modal="true" aria-labelledby="nq-fb-title">
      <div class="nq-fb-head">${YQ}<h2 class="nq-fb-title" id="nq-fb-title">${u(K("shell.reportBug"))}</h2></div>
      <label class="nq-fb-field">
        <span class="nq-fb-label">${u(K("shell.fbType"))}</span>
        <select class="nq-fb-input" id="nq-fb-type">
          <option value="bug">${u(K("shell.fbBug"))}</option>
          <option value="idea">${u(K("shell.fbIdea"))}</option>
          <option value="question">${u(K("shell.fbQuestion"))}</option>
        </select>
      </label>
      <label class="nq-fb-field">
        <span class="nq-fb-label">${u(K("shell.fbSummary"))}</span>
        <input class="nq-fb-input" type="text" id="nq-fb-summary" maxlength="120" autocomplete="off" />
      </label>
      <label class="nq-fb-field">
        <span class="nq-fb-label">${u(K("shell.fbDetails"))}</span>
        <textarea class="nq-fb-input" id="nq-fb-details" maxlength="4000"></textarea>
      </label>
      ${Z?`<label class="nq-fb-diag">
        <input type="checkbox" id="nq-fb-diag" checked />${u(K("shell.fbIncludeDiag"))}
      </label>`:""}
      <p class="nq-fb-error" id="nq-fb-error" role="alert"></p>
      <div class="nq-fb-actions">
        <button type="button" class="nq-fb-cancel" id="nq-fb-cancel">${u(K("shell.cancel"))}</button>
        <button type="button" class="nq-fb-send" id="nq-fb-send">${u(K("shell.fbSend"))}</button>
      </div>
    </div>`,l.body.appendChild(k);let M=($)=>k.querySelector(`#${$}`),W=M("nq-fb-type"),G=M("nq-fb-summary"),Y=M("nq-fb-details"),P=Z?M("nq-fb-diag"):null,X=M("nq-fb-error"),z=M("nq-fb-send"),j=($)=>{if($.key==="Escape")I()};function I(){k.remove(),l.removeEventListener("keydown",j)}M("nq-fb-cancel").addEventListener("click",I),k.addEventListener("pointerdown",($)=>{if($.target===k)I()}),l.addEventListener("keydown",j),G.focus();for(let $ of[W,G,Y])$.addEventListener("input",()=>{X.style.display="none"});z.addEventListener("click",async()=>{let $={type:W.value||"",title:G.value,description:Y.value,context:Q.context};if(P?.checked)if(Q.bot)$.pageContext=ZQ();else $.diagnostic=uK();let C=mK($);if(C){X.textContent=K(C),X.style.display="block";return}z.disabled=!0,z.textContent=K("shell.fbSending"),X.style.display="none";let L=Q.bot?await gK(Q.bot,$):await dK(Q.endpoint,$);if(z.disabled=!1,z.textContent=K("shell.fbSend"),L.ok){I(),lZ(l,K("shell.fbThanks"),Q.theme),Q.onSubmitted?.(L);return}let J=L.error??K("shell.fbFailed");X.innerHTML=L.fallbackMailto?`${u(J)} <a href="${u(L.fallbackMailto)}">${u(K("shell.fbFailEmail"))}</a>`:u(J),X.style.display="block"})}function hZ(l){let h=l.name?.trim(),Q=l.network.trim();if(!h)return Q;if(h.toLowerCase()===Q.toLowerCase())return h;return`${h} · ${Q}`}var cK="nimiq-shell-asset-list-style";function QZ(){if(typeof document>"u"||document.getElementById(cK))return;let l=document.createElement("style");l.id=cK,l.textContent=`
.nq-al { display:flex; flex-direction:column; gap:1px; }
.nq-al-row { display:flex; align-items:center; gap:9px; width:100%; padding:6px 8px;
  border:none; border-radius:6px; background:none; font-family:inherit; text-align:left;
  color:var(--nq-cc-menu-fg, #1f2348); }
button.nq-al-row { cursor:pointer;
  transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
button.nq-al-row:hover { background:var(--nq-cc-menu-hover, rgba(31,35,72,.06)); }
button.nq-al-row:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:-2px; }
.nq-al-art { display:block; width:26px; height:26px; flex:none; }
.nq-al-art:empty { display:none; }
.nq-al-art > * { display:block; width:100%; height:100%; }
.nq-al-id { display:flex; flex-direction:column; gap:1px; min-width:0; }
.nq-al-tick { font-size:13px; font-weight:700; letter-spacing:.02em; }
.nq-al-name { font-size:11px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.5));
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.nq-al-name:empty { display:none; }
/* amounts are the column people compare down, so they get tabular figures.
   Proportional digits make a stack of balances jitter at the decimal point */
.nq-al-amt { margin-left:auto; display:flex; flex-direction:column; align-items:flex-end; gap:1px;
  flex:none; font-variant-numeric:tabular-nums; }
.nq-al-units { font-size:13px; font-weight:700; }
.nq-al-fiat { font-size:11px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.5)); }
.nq-al-fiat:empty { display:none; }
/* pending: a dim dash, never a spinner. Chains resolve at different speeds,
   and three spinners in a 272px card reads as "broken", not "loading" */
.nq-al-units.nq-al-pending { color:var(--nq-cc-menu-muted, rgba(31,35,72,.35)); font-weight:600; }
`,document.head.appendChild(l)}function ll(l,h,Q){let K=document.createElement(l);if(h)K.className=h;if(Q)Q.appendChild(K);return K}function MQ(l,h){if(h.injectStyles!==!1)QZ();let Q=h.cacheMs??30000,K=()=>typeof h.assets==="function"?h.assets():h.assets,Z=ll("div","nq-al");l.appendChild(Z);let k=new Map,M="",W=!1;function G(z){let j=z.map(($)=>`${$.ticker}${$.address?"+":"-"}`).join(" ");if(j===M)return;M=j,Z.textContent="";let I=new Map;for(let $ of z){let C=typeof h.onSelect==="function"&&!!$.address,L=ll(C?"button":"div","nq-al-row",Z);if(C)L.type="button",L.addEventListener("click",()=>h.onSelect($));let J=ll("span","nq-al-art",L);if($.icon)J.appendChild($.icon(26));let _=ll("span","nq-al-id",L),N=ll("span","nq-al-tick",_);N.textContent=$.ticker;let F=ll("span","nq-al-name",_);F.textContent=hZ($);let D=ll("span","nq-al-amt",L),w=ll("span","nq-al-units nq-al-pending",D);w.textContent="—";let S=ll("span","nq-al-fiat",D),O=k.get($.ticker),U={units:O?.units??null,fiat:O?.fiat??null,fetchedAt:O?.fetchedAt??0,unitsEl:w,fiatEl:S};if(I.set($.ticker,U),U.units!==null)Y($,U)}k.clear();for(let[$,C]of I)k.set($,C)}function Y(z,j){if(j.units===null)return;if(j.unitsEl.classList.remove("nq-al-pending"),j.unitsEl.textContent=Xh(j.units,z.decimals,{maxDecimals:z.maxDecimals??z.decimals}),j.fiat===null){j.fiatEl.textContent="";return}let I=h.fiatTicker?.()??"USD";try{j.fiatEl.textContent=Al(j.fiat,I)}catch{j.fiatEl.textContent=""}}async function P(z,j,I){let $=k.get(z.ticker);if(!$)return;if(!j&&$.units!==null&&I-$.fetchedAt<Q){Y(z,$);return}try{let C=await z.balance();if(W)return;if(C!==null&&C!==void 0)$.units=typeof C==="bigint"?C:BigInt(Math.round(C)),$.fetchedAt=I}catch{}if(W)return;if(Y(z,$),h.rate&&$.units!==null){try{let C=await h.rate(z.ticker);if(W)return;$.fiat=C===null?null:Number($.units)/10**z.decimals*C}catch{$.fiat=null}if(!W)Y(z,$)}}async function X(z=!1){if(W)return;let j=K();G(j);let I=Date.now();await Promise.all(j.map(($)=>P($,z,I)))}if(G(K()),h.autoRefresh!==!1)X();return{el:Z,refresh:X,total(){let z=null;for(let j of k.values()){if(j.fiat===null)continue;z=(z??0)+j.fiat}return z},units:(z)=>k.get(z)?.units??null,clear(){for(let z of k.values())z.units=null,z.fiat=null,z.fetchedAt=0,z.unitsEl.classList.add("nq-al-pending"),z.unitsEl.textContent="—",z.fiatEl.textContent=""},destroy(){W=!0,Z.remove()}}}var iK=null;class VQ{}VQ.render=function(l,h){iK(l,h)};self.QrCreator=VQ;(function(l){function h(W,G,Y,P){var X={},z=l(Y,G);z.u(W),z.J(),P=P||0;var j=z.h(),I=z.h()+2*P;return X.text=W,X.level=G,X.version=Y,X.O=I,X.a=function($,C){return $-=P,C-=P,0>$||$>=j||0>C||C>=j?!1:z.a($,C)},X}function Q(W,G,Y,P,X,z,j,I,$,C){function L(J,_,N,F,D,w,S){J?(W.lineTo(_+w,N+S),W.arcTo(_,N,F,D,z)):W.lineTo(_,N)}j?W.moveTo(G+z,Y):W.moveTo(G,Y),L(I,P,Y,P,X,-z,0),L($,P,X,G,X,0,-z),L(C,G,X,G,Y,z,0),L(j,G,Y,P,Y,0,z)}function K(W,G,Y,P,X,z,j,I,$,C){function L(J,_,N,F){W.moveTo(J+N,_),W.lineTo(J,_),W.lineTo(J,_+F),W.arcTo(J,_,J+N,_,z)}j&&L(G,Y,z,z),I&&L(P,Y,-z,z),$&&L(P,X,-z,-z),C&&L(G,X,z,-z)}function Z(W,G){var Y=G.fill;if(typeof Y==="string")W.fillStyle=Y;else{var{type:P,colorStops:X}=Y;if(Y=Y.position.map((j)=>Math.round(j*G.size)),P==="linear-gradient")var z=W.createLinearGradient.apply(W,Y);else if(P==="radial-gradient")z=W.createRadialGradient.apply(W,Y);else throw Error("Unsupported fill");X.forEach(([j,I])=>{z.addColorStop(j,I)}),W.fillStyle=z}}function k(W,G){l:{var{text:Y,v:P,N:X,K:z,P:j}=G;X=Math.max(1,X||1);for(z=Math.min(40,z||40);X<=z;X+=1)try{var I=h(Y,P,X,j);break l}catch(dl){}I=void 0}if(!I)return null;Y=W.getContext("2d"),G.background&&(Y.fillStyle=G.background,Y.fillRect(G.left,G.top,G.size,G.size)),P=I.O,z=G.size/P,Y.beginPath();for(j=0;j<P;j+=1)for(X=0;X<P;X+=1){var $=Y,C=G.left+X*z,L=G.top+j*z,J=j,_=X,N=I.a,F=C+z,D=L+z,w=J-1,S=J+1,O=_-1,U=_+1,m=Math.floor(Math.min(0.5,Math.max(0,G.R))*z),a=N(J,_),r=N(w,O),c=N(w,_);w=N(w,U);var hl=N(J,U);U=N(S,U),_=N(S,_),S=N(S,O),J=N(J,O),C=Math.round(C),L=Math.round(L),F=Math.round(F),D=Math.round(D),a?Q($,C,L,F,D,m,!c&&!J,!c&&!hl,!_&&!hl,!_&&!J):K($,C,L,F,D,m,c&&J&&r,c&&hl&&w,_&&hl&&U,_&&J&&S)}return Z(Y,G),Y.fill(),W}var M={minVersion:1,maxVersion:40,ecLevel:"L",left:0,top:0,size:200,fill:"#000",background:null,text:"no text",radius:0.5,quiet:0};iK=function(W,G){var Y={};if(Object.assign(Y,M,W),Y.N=Y.minVersion,Y.K=Y.maxVersion,Y.v=Y.ecLevel,Y.left=Y.left,Y.top=Y.top,Y.size=Y.size,Y.fill=Y.fill,Y.background=Y.background,Y.text=Y.text,Y.R=Y.radius,Y.P=Y.quiet,G instanceof HTMLCanvasElement){if(G.width!==Y.size||G.height!==Y.size)G.width=Y.size,G.height=Y.size;G.getContext("2d").clearRect(0,0,G.width,G.height),k(G,Y)}else W=document.createElement("canvas"),W.width=Y.size,W.height=Y.size,Y=k(W,Y),G.appendChild(Y)}})(function(){function l(G){var Y=Q.s(G);return{S:function(){return 4},b:function(){return Y.length},write:function(P){for(var X=0;X<Y.length;X+=1)P.put(Y[X],8)}}}function h(){var G=[],Y=0,P={B:function(){return G},c:function(X){return(G[Math.floor(X/8)]>>>7-X%8&1)==1},put:function(X,z){for(var j=0;j<z;j+=1)P.m((X>>>z-j-1&1)==1)},f:function(){return Y},m:function(X){var z=Math.floor(Y/8);G.length<=z&&G.push(0),X&&(G[z]|=128>>>Y%8),Y+=1}};return P}function Q(G,Y){function P(J,_){for(var N=-1;7>=N;N+=1)if(!(-1>=J+N||I<=J+N))for(var F=-1;7>=F;F+=1)-1>=_+F||I<=_+F||(j[J+N][_+F]=0<=N&&6>=N&&(F==0||F==6)||0<=F&&6>=F&&(N==0||N==6)||2<=N&&4>=N&&2<=F&&4>=F?!0:!1)}function X(J,_){for(var N=I=4*G+17,F=Array(N),D=0;D<N;D+=1){F[D]=Array(N);for(var w=0;w<N;w+=1)F[D][w]=null}j=F,P(0,0),P(I-7,0),P(0,I-7),N=k.G(G);for(F=0;F<N.length;F+=1)for(D=0;D<N.length;D+=1){w=N[F];var S=N[D];if(j[w][S]==null)for(var O=-2;2>=O;O+=1)for(var U=-2;2>=U;U+=1)j[w+O][S+U]=O==-2||O==2||U==-2||U==2||O==0&&U==0}for(N=8;N<I-8;N+=1)j[N][6]==null&&(j[N][6]=N%2==0);for(N=8;N<I-8;N+=1)j[6][N]==null&&(j[6][N]=N%2==0);N=k.w(z<<3|_);for(F=0;15>F;F+=1)D=!J&&(N>>F&1)==1,j[6>F?F:8>F?F+1:I-15+F][8]=D,j[8][8>F?I-F-1:9>F?15-F:14-F]=D;if(j[I-8][8]=!J,7<=G){N=k.A(G);for(F=0;18>F;F+=1)D=!J&&(N>>F&1)==1,j[Math.floor(F/3)][F%3+I-8-3]=D;for(F=0;18>F;F+=1)D=!J&&(N>>F&1)==1,j[F%3+I-8-3][Math.floor(F/3)]=D}if($==null){J=W.I(G,z),N=h();for(F=0;F<C.length;F+=1)D=C[F],N.put(4,4),N.put(D.b(),k.f(4,G)),D.write(N);for(F=D=0;F<J.length;F+=1)D+=J[F].j;if(N.f()>8*D)throw Error("code length overflow. ("+N.f()+">"+8*D+")");for(N.f()+4<=8*D&&N.put(0,4);N.f()%8!=0;)N.m(!1);for(;!(N.f()>=8*D);){if(N.put(236,8),N.f()>=8*D)break;N.put(17,8)}var m=0;D=F=0,w=Array(J.length),S=Array(J.length);for(O=0;O<J.length;O+=1){var a=J[O].j,r=J[O].o-a;F=Math.max(F,a),D=Math.max(D,r),w[O]=Array(a);for(U=0;U<w[O].length;U+=1)w[O][U]=255&N.B()[U+m];m+=a,U=k.C(r),a=K(w[O],U.b()-1).l(U),S[O]=Array(U.b()-1);for(U=0;U<S[O].length;U+=1)r=U+a.b()-S[O].length,S[O][U]=0<=r?a.c(r):0}for(U=N=0;U<J.length;U+=1)N+=J[U].o;N=Array(N);for(U=m=0;U<F;U+=1)for(O=0;O<J.length;O+=1)U<w[O].length&&(N[m]=w[O][U],m+=1);for(U=0;U<D;U+=1)for(O=0;O<J.length;O+=1)U<S[O].length&&(N[m]=S[O][U],m+=1);$=N}J=$,N=-1,F=I-1,D=7,w=0,_=k.F(_);for(S=I-1;0<S;S-=2)for(S==6&&--S;;){for(O=0;2>O;O+=1)j[F][S-O]==null&&(U=!1,w<J.length&&(U=(J[w]>>>D&1)==1),_(F,S-O)&&(U=!U),j[F][S-O]=U,--D,D==-1&&(w+=1,D=7));if(F+=N,0>F||I<=F){F-=N,N=-N;break}}}var z=Z[Y],j=null,I=0,$=null,C=[],L={u:function(J){J=l(J),C.push(J),$=null},a:function(J,_){if(0>J||I<=J||0>_||I<=_)throw Error(J+","+_);return j[J][_]},h:function(){return I},J:function(){for(var J=0,_=0,N=0;8>N;N+=1){X(!0,N);var F=k.D(L);if(N==0||J>F)J=F,_=N}X(!1,_)}};return L}function K(G,Y){if(typeof G.length>"u")throw Error(G.length+"/"+Y);var P=function(){for(var z=0;z<G.length&&G[z]==0;)z+=1;for(var j=Array(G.length-z+Y),I=0;I<G.length-z;I+=1)j[I]=G[I+z];return j}(),X={c:function(z){return P[z]},b:function(){return P.length},multiply:function(z){for(var j=Array(X.b()+z.b()-1),I=0;I<X.b();I+=1)for(var $=0;$<z.b();$+=1)j[I+$]^=M.i(M.g(X.c(I))+M.g(z.c($)));return K(j,0)},l:function(z){if(0>X.b()-z.b())return X;for(var j=M.g(X.c(0))-M.g(z.c(0)),I=Array(X.b()),$=0;$<X.b();$+=1)I[$]=X.c($);for($=0;$<z.b();$+=1)I[$]^=M.i(M.g(z.c($))+j);return K(I,0).l(z)}};return X}Q.s=function(G){for(var Y=[],P=0;P<G.length;P++){var X=G.charCodeAt(P);128>X?Y.push(X):2048>X?Y.push(192|X>>6,128|X&63):55296>X||57344<=X?Y.push(224|X>>12,128|X>>6&63,128|X&63):(P++,X=65536+((X&1023)<<10|G.charCodeAt(P)&1023),Y.push(240|X>>18,128|X>>12&63,128|X>>6&63,128|X&63))}return Y};var Z={L:1,M:0,Q:3,H:2},k=function(){function G(X){for(var z=0;X!=0;)z+=1,X>>>=1;return z}var Y=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],P={w:function(X){for(var z=X<<10;0<=G(z)-G(1335);)z^=1335<<G(z)-G(1335);return(X<<10|z)^21522},A:function(X){for(var z=X<<12;0<=G(z)-G(7973);)z^=7973<<G(z)-G(7973);return X<<12|z},G:function(X){return Y[X-1]},F:function(X){switch(X){case 0:return function(z,j){return(z+j)%2==0};case 1:return function(z){return z%2==0};case 2:return function(z,j){return j%3==0};case 3:return function(z,j){return(z+j)%3==0};case 4:return function(z,j){return(Math.floor(z/2)+Math.floor(j/3))%2==0};case 5:return function(z,j){return z*j%2+z*j%3==0};case 6:return function(z,j){return(z*j%2+z*j%3)%2==0};case 7:return function(z,j){return(z*j%3+(z+j)%2)%2==0};default:throw Error("bad maskPattern:"+X)}},C:function(X){for(var z=K([1],0),j=0;j<X;j+=1)z=z.multiply(K([1,M.i(j)],0));return z},f:function(X,z){if(X!=4||1>z||40<z)throw Error("mode: "+X+"; type: "+z);return 10>z?8:16},D:function(X){for(var z=X.h(),j=0,I=0;I<z;I+=1)for(var $=0;$<z;$+=1){for(var C=0,L=X.a(I,$),J=-1;1>=J;J+=1)if(!(0>I+J||z<=I+J))for(var _=-1;1>=_;_+=1)0>$+_||z<=$+_||(J!=0||_!=0)&&L==X.a(I+J,$+_)&&(C+=1);5<C&&(j+=3+C-5)}for(I=0;I<z-1;I+=1)for($=0;$<z-1;$+=1)if(C=0,X.a(I,$)&&(C+=1),X.a(I+1,$)&&(C+=1),X.a(I,$+1)&&(C+=1),X.a(I+1,$+1)&&(C+=1),C==0||C==4)j+=3;for(I=0;I<z;I+=1)for($=0;$<z-6;$+=1)X.a(I,$)&&!X.a(I,$+1)&&X.a(I,$+2)&&X.a(I,$+3)&&X.a(I,$+4)&&!X.a(I,$+5)&&X.a(I,$+6)&&(j+=40);for($=0;$<z;$+=1)for(I=0;I<z-6;I+=1)X.a(I,$)&&!X.a(I+1,$)&&X.a(I+2,$)&&X.a(I+3,$)&&X.a(I+4,$)&&!X.a(I+5,$)&&X.a(I+6,$)&&(j+=40);for($=C=0;$<z;$+=1)for(I=0;I<z;I+=1)X.a(I,$)&&(C+=1);return j+=Math.abs(100*C/z/z-50)/5*10}};return P}(),M=function(){for(var G=Array(256),Y=Array(256),P=0;8>P;P+=1)G[P]=1<<P;for(P=8;256>P;P+=1)G[P]=G[P-4]^G[P-5]^G[P-6]^G[P-8];for(P=0;255>P;P+=1)Y[G[P]]=P;return{g:function(X){if(1>X)throw Error("glog("+X+")");return Y[X]},i:function(X){for(;0>X;)X+=255;for(;256<=X;)X-=255;return G[X]}}}(),W=function(){function G(X,z){switch(z){case Z.L:return Y[4*(X-1)];case Z.M:return Y[4*(X-1)+1];case Z.Q:return Y[4*(X-1)+2];case Z.H:return Y[4*(X-1)+3]}}var Y=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]],P={I:function(X,z){var j=G(X,z);if(typeof j>"u")throw Error("bad rs block @ typeNumber:"+X+"/errorCorrectLevel:"+z);X=j.length/3,z=[];for(var I=0;I<X;I+=1)for(var $=j[3*I],C=j[3*I+1],L=j[3*I+2],J=0;J<$;J+=1){var _=L,N={};N.o=C,N.j=_,z.push(N)}return z}};return P}();return Q}());var pK=QrCreator;var KZ="#260133",ZZ="#1F2348";function nK(l,h,Q){if(!l||typeof getComputedStyle!=="function")return Q;return getComputedStyle(l).getPropertyValue(h).trim()||Q}function sK(l,h,Q){let K=document.createElement("canvas");K.className="nq-cc-qr-canvas";let Z=Math.min(3,Math.max(1,Math.round(globalThis.devicePixelRatio||1)));return pK.render({text:l,radius:0.5,ecLevel:"M",fill:{type:"radial-gradient",position:[1,1,0,1,1,Math.SQRT2],colorStops:[[0,nK(Q??null,"--nq-cc-qr-from",KZ)],[1,nK(Q??null,"--nq-cc-qr-to",ZZ)]]},background:null,size:h*Z},K),K.style.width=`${h}px`,K.style.height=`${h}px`,K}function Wh(l){return l.replace(/^\s*(?:nimiq:)?/i,"").replace(/[^0-9A-Za-z]/g,"").toUpperCase().slice(0,36)}function jh(l){let Q=Wh(l).match(/.{1,4}/g)??[],K=[];for(let Z=0;Z<Q.length;Z+=3)K.push(Q.slice(Z,Z+3).join(" "));return K.join(`
`)}function zZ(l,h){if(h<=0)return 0;let Q=0;for(let K=0;K<l.length;K+=1)if(/[0-9A-Z]/.test(l[K])){if(Q+=1,Q===h)return K+1}return l.length}function XZ(l,h){return Wh(l.slice(0,h)).length}function aK(l){let h=l.selectionStart??l.value.length,Q=XZ(l.value,h),K=jh(l.value);if(K!==l.value)l.value=K;let Z=zZ(K,Q);l.setSelectionRange(Z,Z)}var GZ=/^NQ[0-9]{2}[0-9A-HJ-NP-VXY]{32}$/;function K0(l,h,Q,K=8){let Z=K-l;if(Z<=0)return 0;let k=Q-K-h,M=Math.min(Z,Math.max(0,k));return M>0?-Math.round(M):0}function Z0(l){let h=l.replace(/\s+/g,"");if(!h)return{cells:[],columns:1};if(GZ.test(h.toUpperCase()))return{cells:h.match(/.{4}/g)??[h],columns:3};let Q=h.length,K=Math.floor(Q/3),Z=Q%3,k=[],M=0;for(let W=0;W<3;W+=1){let G=K+(W<Z?1:0);if(G===0)continue;k.push(h.slice(M,M+G)),M+=G}return{cells:k,columns:1}}function YZ(l){return typeof TextEncoder==="function"?new TextEncoder().encode(l).length:encodeURIComponent(l).replace(/%[0-9A-F]{2}/g,"x").length}var rK="nimiq-shell-corner-control-style",oK="nq-shell:fiat",z0="nq-shell:label:";function kZ(l){try{return localStorage.getItem(z0+l.replace(/\s+/g,""))}catch{return null}}function MZ(l,h){try{localStorage.setItem(z0+l.replace(/\s+/g,""),h)}catch{}}var VZ={en:"English",es:"Español",de:"Deutsch",fr:"Français",pt:"Português",hi:"हिन्दी",zh:"中文",tr:"Türkçe",ko:"한국어",vi:"Tiếng Việt",ha:"Hausa",tl:"Filipino",id:"Bahasa Indonesia"},tK={AED:"ae",ARS:"ar",AUD:"au",BRL:"br",CAD:"ca",CHF:"ch",CLP:"cl",CNY:"cn",CRC:"cr",CZK:"cz",DKK:"dk",EUR:"eu",GBP:"gb",GMD:"gm",GTQ:"gt",HKD:"hk",HUF:"hu",IDR:"id",ILS:"il",INR:"in",JPY:"jp",KRW:"kr",MXN:"mx",MYR:"my",NGN:"ng",NOK:"no",NZD:"nz",PHP:"ph",PKR:"pk",PLN:"pl",RUB:"ru",SEK:"se",SGD:"sg",THB:"th",TRY:"tr",TWD:"tw",UAH:"ua",USD:"us",VND:"vn",ZAR:"za"};function WZ(){if(typeof document>"u"||document.getElementById(rK))return;let l=document.createElement("style");l.id=rK,l.textContent=`
.nq-cc { position:relative; display:inline-block;
  font-family:var(--nq-cc-font, 'Mulish','Muli',system-ui,sans-serif); }
.nq-cc-caret { width:10px; height:6px; flex:none; color:currentColor; opacity:.6;
  transition:transform .18s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-face[aria-expanded="true"] .nq-cc-caret,
.nq-cc-face-flag[aria-expanded="true"] .nq-cc-caret { transform:rotate(180deg); }

/* face (hub mode): the fleet outline pill, both states, + the caret */
.nq-cc-face { display:inline-flex; align-items:center; gap:8px; height:40px; padding:0 14px;
  border:1px solid color-mix(in srgb, currentColor 22%, transparent); border-radius:999px;
  background:transparent; color:inherit; font:inherit; font-size:14px; font-weight:700; line-height:1; cursor:pointer;
  transition:border-color .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)), background-color .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-face:hover { border-color: color-mix(in srgb, currentColor 45%, transparent); background: color-mix(in srgb, currentColor 6%, transparent); }
.nq-cc-face:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:3px; }
/* 8px left: the identicon needs air off the pill edge (Andjroo, phone review) */
.nq-cc[data-connected] .nq-cc-face { padding:4px 12px 4px 8px; font-size:13px; }
.nq-cc-face-icon { width:28px; height:28px; flex:none; border-radius:50%; overflow:hidden; display:inline-flex; }
.nq-cc-face-icon > * { width:100%; height:100%; display:block; }
.nq-cc-face-label { white-space:nowrap; }
.nq-cc[data-connected] .nq-cc-face-label { font-family:ui-monospace,'Fira Mono',monospace; letter-spacing:.02em; }

/* face (mini-app mode): flag only, the wallet is ambient */
.nq-cc-face-flag { display:none; align-items:center; gap:7px; height:38px; padding:0 10px;
  border:none; border-radius:8px; background:none; cursor:pointer; color:inherit;
  transition:background .2s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-face-flag:hover { background: color-mix(in srgb, currentColor 8%, transparent); }
.nq-cc-face-flag:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:2px; }
.nq-cc[data-mode="miniapp"] .nq-cc-face { display:none; }
.nq-cc[data-mode="miniapp"] .nq-cc-face-flag { display:inline-flex; }

/* face (language-only): a SURFACE pill holding the flag.
   Chrome-less is a mini-app statement: inside Nimiq Pay the host wallet is the
   context, so the control recedes. A wallet-less page (the kid app, the portal
   chooser) is not that: the language control is the header's only affordance and
   has to read as a control, exactly like the langpill it replaced and like the
   pill sitting on every wallet page. Both share data-mode="miniapp" for the
   MENU gating; only the face differs, so it keys off data-face.

   It reads as a control through ELEVATION, not an outline (Andjroo, 2026-08-03:
   "remove the gray line ... around the actual white of the pill"). It used to
   carry "border:1px solid currentColor 22%", which this same file already argues
   against thirty lines down: "inputs: inset box-shadow border, never border
   (rule 1)". Nimiq separates with a hairline, whitespace, or a separate surface,
   and a raised white pill is the third.

   The surface and the FOREGROUND ship together. This pill is color:inherit
   and its caret is drawn in currentColor, so on a dark header the old
   borderless-transparent pill inherited a light caret. Painting it white without
   also pinning the text colour would hide the caret on exactly those pages. Both
   are themeable, so a host that wants a dark pill sets the pair. */
.nq-cc[data-face="lang"] .nq-cc-face-flag { height:40px; padding:0 12px;
  border:none; border-radius:999px;
  background:var(--nq-cc-face-bg, #fff);
  color:var(--nq-cc-face-fg, #1f2348);
  box-shadow:var(--nq-cc-face-shadow,
    0 2px 2.5px rgba(31,35,72,.02), 0 7px 8.5px rgba(31,35,72,.04), 0 18px 38px rgba(31,35,72,.07));
  transition:box-shadow .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)), background-color .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc[data-face="lang"] .nq-cc-face-flag:hover { background:var(--nq-cc-face-bg-hover, #fff);
  box-shadow:var(--nq-cc-face-shadow-hover,
    0 3px 3.5px rgba(31,35,72,.03), 0 9px 12px rgba(31,35,72,.06), 0 22px 46px rgba(31,35,72,.10)); }
.nq-cc[data-face="lang"] .nq-cc-face-flag:focus-visible { outline-offset:3px; }

/* menu */
/* stays a compact card hanging off the corner on EVERY viewport (Andjroo,
   mobile review 7/23: full-width phone sheet rejected, "it should just come
   out of the corner"); max-width only guards sub-300px screens */
/* The menu SCROLLS now. At the wallet's type scale the receive sheet is ~550px
   tall instead of 379px, and a dropdown hanging off a header has nowhere to put
   that on a short window: it used to run off the bottom with nothing to reach
   it with. dvh first, vh as the fallback, because on mobile Safari vh is the
   LARGE viewport and overshoots the visible area by the toolbar's height. */
.nq-cc-menu { position:absolute; top:calc(100% + 8px); right:var(--nq-cc-menu-shift, 0px); z-index:60; width:272px;
  max-width:calc(100vw - 24px); padding:6px;
  max-height:calc(100vh - 96px); max-height:calc(100dvh - 96px);
  overflow-y:auto; overscroll-behavior:contain;
  background:var(--nq-cc-menu-bg, #fff); border:var(--nq-cc-menu-border, none); border-radius:10px;
  box-shadow:var(--nq-cc-menu-shadow, 0 4px 28px rgba(0,0,0,.16));
  color:var(--nq-cc-menu-fg, #1f2348); text-align:left; }
.nq-cc-menu[hidden] { display:none; }
.nq-cc-divider { height:1px; margin:6px 4px; background:var(--nq-cc-menu-line, rgba(31,35,72,.08)); }
.nq-cc-section { padding:6px 4px; position:relative; }

/* signed out: navy Connect (bottom-right radial) + the quiet onboard line */
.nq-cc-connect { position:relative; width:100%; height:36px; border:none; border-radius:500px;
  display:flex; align-items:center; justify-content:center; font-family:inherit; font-size:14px;
  font-weight:700; color:var(--nq-cc-connect-fg, #fff); cursor:pointer;
  background-color:var(--nq-cc-connect-bg, #1f2348);
  background-image:var(--nq-cc-connect-image,
    radial-gradient(100% 100% at 100% 100%, #260133, #1f2348)); }
.nq-cc-connect:hover { background-image:var(--nq-cc-connect-image-hover,
  radial-gradient(100% 100% at 100% 100%, #180021, #151833)); }
.nq-cc-connect:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:2px; }
.nq-cc-connect:disabled { opacity:.7; cursor:default; }
.nq-cc-onboard { width:100%; margin-top:2px; padding:10px 4px; border:none; background:none; cursor:pointer;
  font-family:inherit; font-size:13px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.6));
  border-radius:6px; transition:color .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-onboard:hover { color:var(--nq-cc-accent, #0582ca); }
.nq-cc-onboard:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:2px; }

/* state gates: the driver stamps data-connected / data-mode / data-testnet */
.nq-cc[data-connected] .nq-cc-when-out { display:none; }
.nq-cc:not([data-connected]) .nq-cc-when-connected { display:none; }
.nq-cc[data-mode="miniapp"] .nq-cc-when-hub { display:none; }

/* mini wallet block */
.nq-cc-wallet { padding:10px 8px 8px; }
.nq-cc-account { display:flex; align-items:center; gap:10px; }
.nq-cc-identicon { display:block; flex:none; width:40px; height:40px; }
.nq-cc-identicon > * { width:100%; height:100%; display:block; }
.nq-cc-name { font-size:14px; font-weight:600; min-width:0; overflow:hidden; text-overflow:ellipsis;
  white-space:nowrap; border:none; background:none; font-family:inherit; color:inherit; text-align:left;
  padding:9px 6px; margin:-6px 0 -6px -6px; border-radius:6px;
  transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
button.nq-cc-name { cursor:pointer; }
button.nq-cc-name:hover { background:var(--nq-cc-menu-hover, rgba(31,35,72,.06)); }
button.nq-cc-name:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:-2px; }
.nq-cc-name-input { width:100%; min-width:0; border:none; border-radius:6px; padding:2px 4px;
  font-family:inherit; font-size:14px; font-weight:600;
  color:var(--nq-cc-input-fg, var(--nq-cc-menu-fg, #1f2348));
  background:var(--nq-cc-input-bg, var(--nq-cc-card-bg, #fff));
  box-shadow:inset 0 0 0 2px color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 10%, transparent); }
.nq-cc-name-input:focus { outline:none;
  box-shadow:inset 0 0 0 2px var(--nq-cc-accent, #0582ca); }
.nq-cc-balance { margin-left:auto; display:flex; flex-direction:column; align-items:flex-end; gap:1px; flex:none; }
.nq-cc-balance[hidden] { display:none; }
.nq-cc-balance-nim { font-size:13px; font-weight:700; color:var(--nq-cc-menu-fg, #1f2348); }
.nq-cc-balance-fiat { font-size:12px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.5)); }

/* action bar = the wallet's MobileActionBar verbatim: Receive quiet LEFT ↓,
   Send light-blue RIGHT ↑, bare scan glyph at .4 opacity */
.nq-cc-actions { display:flex; align-items:center; gap:6px; margin-top:8px; position:relative; }
.nq-cc-receive { flex:1; display:inline-flex; align-items:center; justify-content:center; gap:7px; height:32px;
  border:none; border-radius:500px; background:var(--nq-cc-menu-hover, rgba(31,35,72,.07)); font-family:inherit;
  font-size:13px; font-weight:700; color:var(--nq-cc-menu-fg, #1f2348); cursor:pointer;
  transition:background .2s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-receive:hover, .nq-cc-receive:focus-visible {
  background:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 12%, transparent); }
.nq-cc-receive:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:2px; }
.nq-cc-send { flex:1; display:inline-flex; align-items:center; justify-content:center; gap:7px; height:32px;
  border:none; border-radius:500px; cursor:pointer; font-family:inherit; font-size:13px; font-weight:700;
  color:var(--nq-cc-send-fg, #fff); background-color:var(--nq-cc-send-bg, #0582ca);
  background-image:var(--nq-cc-send-image,
    radial-gradient(100% 100% at 100% 100%, #265dd7, #0582ca)); }
.nq-cc-send:hover { background-image:var(--nq-cc-send-image-hover,
  radial-gradient(100% 100% at 100% 100%, #1f4fbc, #0473b3)); }
.nq-cc-send:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:3px; }
.nq-cc-arrow-up { transform:rotate(-90deg); width:11px; height:8px; }
.nq-cc-arrow-down { transform:rotate(90deg); width:11px; height:8px; }
.nq-cc-scan { flex:none; padding:4px; border:none; background:none; cursor:pointer; color:var(--nq-cc-menu-fg, #1f2348);
  opacity:.4; border-radius:6px; transition:opacity .2s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-scan:hover, .nq-cc-scan:focus-visible { opacity:.7; }
.nq-cc-scan:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:1px; }
.nq-cc-scan-glyph { display:block; width:24px; height:24px; }

/* receive view: the address lives BEHIND Receive, like the wallet */
.nq-cc-view-receive { display:none; }
.nq-cc.nq-cc-show-receive .nq-cc-view-main { display:none; }
.nq-cc.nq-cc-show-receive .nq-cc-view-receive { display:block; }

/* send view: the mini-wallet send: recipient + amount here, the user's own
   wallet only appears for the approval (Hub checkout / Nimiq Pay confirm) */
/* TWO sheets, because the wallet has two and the split is what makes each of
   ours a mini version of one of theirs rather than a mash of both.
   "Send Transaction" takes the recipient. "Send Amount" takes the amount, and
   by then the recipient is SETTLED, which is what lets it show both parties as
   faces the way the wallet's Set Amount does.
   This was written off as a width constraint for four versions. It is not
   width: it is steps, and the QR and request sheets already proved the menu
   stacks sub-views fine. */
.nq-cc-view-sendto { display:none; }
.nq-cc.nq-cc-show-sendto .nq-cc-view-main { display:none; }
.nq-cc.nq-cc-show-sendto .nq-cc-view-sendto { display:block; }
.nq-cc-view-send { display:none; }
.nq-cc.nq-cc-show-send .nq-cc-view-main { display:none; }
.nq-cc.nq-cc-show-send .nq-cc-view-sendto { display:none; }
.nq-cc.nq-cc-show-send .nq-cc-view-send { display:block; }
.nq-cc-sendto-body { display:flex; flex-direction:column; align-items:center;
  padding:16px 8px 10px; }
/* The wallet's contacts BAND: the book on the left, a hairline, then the saved
   recipients as faces. Text chips were the wrong shape entirely, and the shape
   is the thing being recognised: a row of faces reads as people, a row of grey
   pills reads as filter tags. */
.nq-cc-contacts-band { display:flex; align-items:flex-start; justify-content:center;
  gap:12px; width:100%; margin-top:14px; }
.nq-cc-contacts-band[hidden] { display:none; }
.nq-cc-book { display:flex; flex-direction:column; align-items:center; gap:6px;
  flex:none; color:var(--nq-cc-menu-muted, rgba(31,35,72,.45)); }
.nq-cc-book-glyph { display:block; width:38px; height:46px; }
.nq-cc-book-label { font-size:11px; font-weight:600; }
/* A fixed height, not align-self:stretch: the rule runs past the name bars on
   the wallet's sheet, and stretch would end it at whichever column happens to
   be tallest. */
.nq-cc-contacts-rule { flex:none; width:1px; height:74px; margin-top:2px;
  background:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 12%, transparent); }
.nq-cc-contacts { display:flex; flex-wrap:nowrap; justify-content:flex-start; gap:10px; }
.nq-cc-contacts[hidden] { display:none; }
/* A face and a name, which is what a saved recipient IS. */
.nq-cc-contact { display:flex; flex-direction:column; align-items:center; gap:5px;
  width:54px; padding:0; border:none; background:none; font-family:inherit; cursor:pointer; }
.nq-cc-contact-icon { display:block; width:40px; height:40px; }
.nq-cc-contact-icon > * { display:block; width:100%; height:100%; }
.nq-cc-contact-name { max-width:100%; font-size:10px; font-weight:600; text-align:center;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  color:var(--nq-cc-menu-muted, rgba(31,35,72,.6)); }
.nq-cc-contact:hover .nq-cc-contact-name { color:var(--nq-cc-accent, #0582ca); }
.nq-cc-contact:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:2px;
  border-radius:6px; }
/* A short GREY uppercase section label, which is the one uppercase nimiq-ui
   allows (rule 17) and exactly what the wallet ships here. */
.nq-cc-eyebrow { margin:46px 0 0; font-size:11px; font-weight:700; text-transform:uppercase;
  letter-spacing:.08em; text-align:center; color:var(--nq-cc-menu-muted, rgba(31,35,72,.45)); }
/* The wallet's escape hatch: what to do when you have no address to send to. */
.nq-cc-sendto-foot { position:relative; display:flex; flex-direction:column;
  align-items:center; gap:8px; width:100%; margin-top:40px; padding-inline:42px;
  box-sizing:border-box; }
.nq-cc-sendto-foot[hidden] { display:none; }
.nq-cc-unavailable { margin:0; font-size:12px; font-weight:600;
  color:var(--nq-cc-menu-muted, rgba(31,35,72,.5)); }
.nq-cc-sendto-foot .nq-cc-scan-open { position:absolute; right:0; bottom:2px;
  display:inline-flex; align-items:center; justify-content:center;
  width:38px; height:38px; padding:0; border:none; border-radius:8px; background:none;
  color:var(--nq-cc-menu-muted, rgba(31,35,72,.6)); cursor:pointer; }
.nq-cc-sendto-foot .nq-cc-scan-open:hover { background:var(--nq-cc-menu-hover, rgba(31,35,72,.06)); }
.nq-cc-sendto-foot .nq-cc-scan-open:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca);
  outline-offset:-2px; }
.nq-cc-sendto-foot .nq-cc-scan-glyph { display:block; width:22px; height:22px; }
/* Both parties, faces first, with the wallet's hairline dash between them.
   Sender on the left, recipient on the right, which is the direction the money
   goes and the same order the wallet uses. */
.nq-cc-parties { display:grid; grid-template-columns:1fr 24px 1fr; align-items:start;
  gap:4px; width:100%; margin-bottom:6px; }
.nq-cc-party { display:flex; flex-direction:column; align-items:center; gap:6px; min-width:0; }
.nq-cc-party-icon { display:block; width:56px; height:56px; }
.nq-cc-party-icon > * { display:block; width:100%; height:100%; }
.nq-cc-party-name { max-width:100%; font-size:11px; font-weight:600; text-align:center;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  color:var(--nq-cc-menu-muted, rgba(31,35,72,.6)); }
.nq-cc-party-name.nq-cc-mono { font-family:'Fira Mono',ui-monospace,monospace; font-size:10px; }
.nq-cc-party-dash { align-self:center; height:1px; margin-top:-14px;
  background:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 18%, transparent); }

/* The QR gets its own sheet, the way the wallet's "NIM Address" does. It sits
   UNDER receive rather than beside it: receive is what the corner opens, and
   the code is one tap further in, for the moment somebody is actually pointing
   a camera at it. It hides the receive view as well as the main one. */
.nq-cc-view-qr { display:none; }
.nq-cc.nq-cc-show-qr .nq-cc-view-main { display:none; }
.nq-cc.nq-cc-show-qr .nq-cc-view-receive { display:none; }
.nq-cc.nq-cc-show-qr .nq-cc-view-qr { display:block; }

/* The request-link sheet, one level under receive like the QR sheet. */
.nq-cc-view-request { display:none; }
.nq-cc.nq-cc-show-request .nq-cc-view-main { display:none; }
.nq-cc.nq-cc-show-request .nq-cc-view-receive { display:none; }
.nq-cc.nq-cc-show-request .nq-cc-view-request { display:block; }
.nq-cc-request-body { display:flex; flex-direction:column; gap:10px; padding:16px 8px 8px; }
/* The link itself, shown rather than merely copied: people paste these into a
   chat and a link you cannot see before you send it is a link you have to
   trust. Wraps, because an address is 36 characters and this is 272px. */
.nq-cc-request-link { margin:2px 0 0; padding:9px 10px; border-radius:6px;
  background:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 4%, transparent);
  font-family:'Fira Mono',ui-monospace,monospace; font-size:11px; line-height:1.45;
  overflow-wrap:anywhere; color:var(--nq-cc-menu-muted, rgba(31,35,72,.6)); }
.nq-cc-request-hint { margin:0; font-size:12px; font-weight:600;
  color:var(--nq-cc-menu-muted, rgba(31,35,72,.45)); }
.nq-cc-qr-body { display:flex; flex-direction:column; align-items:center; padding:12px 8px 8px; }
/* One line, middle elided, which is the wallet's own treatment on this sheet.
   Repeating the 3x3 grid here would say the two sheets are the same thing at
   two sizes; the grid is the sheet you came from. */
.nq-cc-qr-line { margin:22px 0 0; font-family:'Fira Mono',ui-monospace,monospace; font-size:13px;
  letter-spacing:.02em; text-align:center; white-space:nowrap;
  color:var(--nq-cc-menu-muted, rgba(31,35,72,.5)); }
.nq-cc-qr-scan { margin:51px 4px 2px; text-align:center; font-size:13px; font-weight:600;
  line-height:1.35; color:var(--nq-cc-accent, #0582ca); }
/* The identicon hero. 120px, not the wallet's ~150: the same share of a 272px
   card that theirs is of a 390px one. */
.nq-cc-receive-hero { display:block; width:100px; height:100px; margin:34px 0 0; }
.nq-cc-receive-hero > * { display:block; width:100%; height:100%; }
.nq-cc-receive-hero[hidden] { display:none; }
/* The pill CENTRES and the glyph rides the right corner, which is the wallet's
   arrangement. space-between pushed the pill to the left edge and spread the
   footer to 80.7% of the card against the wallet's 58.6%. */
.nq-cc-receive-foot { position:relative; display:flex; align-items:center;
  justify-content:center; width:100%; margin-top:30px;
  padding-inline:42px; box-sizing:border-box; }
.nq-cc-receive-foot .nq-cc-qr-open { position:absolute; right:0; top:50%;
  transform:translateY(-50%); }
/* The glyph's width is reserved on BOTH sides, so the pill's centre is the
   card's centre and the two can never collide at 272px. */
.nq-cc-receive-foot .nq-cc-request-open { max-width:100%; padding:0 12px;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.nq-cc-receive-foot[hidden] { display:none; }
.nq-cc-qr-open { display:inline-flex; align-items:center; justify-content:center;
  width:38px; height:38px; padding:0; border:none; border-radius:8px; background:none;
  color:var(--nq-cc-menu-muted, rgba(31,35,72,.6)); cursor:pointer;
  transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-qr-open:hover { background:var(--nq-cc-menu-hover, rgba(31,35,72,.06)); }
.nq-cc-qr-open:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:-2px; }
.nq-cc-qr-glyph { display:block; width:22px; height:22px; }
/* The wallet's secondary pill: a grey capsule, never a coloured one. The one
   coloured button in this menu is Send, and a second would make neither read
   as the primary. */
.nq-cc-request-open { min-height:38px; padding:0 16px; border:none; border-radius:500px;
  font-family:inherit; font-size:14px; font-weight:700; cursor:pointer;
  color:var(--nq-cc-menu-fg, #1f2348);
  background:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 6%, transparent);
  transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-request-open:hover {
  background:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 11%, transparent); }
.nq-cc-request-open:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:2px; }
.nq-cc-send-body { display:flex; flex-direction:column; gap:10px; padding:16px 8px 8px; }
/* display is DECLARED, not inherited from the host. A page with a global
   label{display:flex} (the playground had exactly that, for its own control
   rows) turns this into a flex container, and then text-align does nothing
   because flex packs its children to the start instead. The component cannot
   assume anything about a bare element selector on the page it is dropped
   into. */
.nq-cc-field-label { display:block; font-size:13px; font-weight:600;
  color:var(--nq-cc-menu-muted, rgba(31,35,72,.5)); }
/* The identicon sits LEFT and the label centres on the card, independently.
   Same three-column grid as the view header above it, and for the same reason:
   the label lines up with the title and the block grid, all three centred on
   the menu, while the face keeps the left edge an avatar belongs on. Centring
   the PAIR instead put the label off-centre by half an identicon, which is the
   version Andrew rejected.

   The third column is the identicon's width again, so the label's centre is
   the card's centre rather than whatever is left beside the face. The slot
   holds its width whether or not a face is in it, so nothing shifts at the
   moment the address becomes valid. Amount stays left over its full-width
   input, which has nothing to centre against. */
.nq-cc-field-head { display:grid; grid-template-columns:36px 1fr 36px;
  align-items:center; min-height:36px; }
.nq-cc-field-head .nq-cc-field-label { grid-column:2; text-align:center; }
.nq-cc-recipient-icon { display:block; width:36px; height:36px; flex:none; }
.nq-cc-recipient-icon > * { display:block; width:100%; height:100%; }

/* Recipient: nine four-char blocks in a 3x3 grid, the wallet's send-modal field
   scaled to this menu. One textarea holding a 14-character line per row
   ("XXXX XXXX XXXX"), so the blocks sit at fixed FRACTIONS of the line in any
   monospace font. Everything below is in ch for that reason: a px or rem
   geometry drifts the moment Fira Mono is missing and the fallback's advance
   differs, which is the documented cause of address grids looking wonky.

   Inset box-shadow for the border, never border (rule 1). */
.nq-cc-addr-field { position:relative; border-radius:8px; padding:7px 0;
  width:100%; max-width:204px; margin-inline:auto; box-sizing:border-box;
  background:var(--nq-cc-input-bg, var(--nq-cc-card-bg, #fff));
  box-shadow:inset 0 0 0 2px color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 12%, transparent);
  transition:box-shadow .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-addr-field:focus-within { box-shadow:inset 0 0 0 2px var(--nq-cc-accent, #0582ca); }
/* A formatted line is 14 characters plus two block gaps. The gap is
   WORD-SPACING rather than a bigger font or letter-spacing, because the
   reference is tight four-character blocks separated by air: widening the
   letters would space the characters inside a block too, and the four
   characters of a block read as one unit. */
.nq-cc-addr-input { display:block; margin:0 auto; padding:0; border:none;
  --nq-cc-addr-gap:4.9ch;
  width:calc(14ch + 2 * var(--nq-cc-addr-gap));
  word-spacing:var(--nq-cc-addr-gap);
  outline:none; resize:none; overflow:hidden; background:transparent;
  font-family:'Fira Mono',ui-monospace,monospace; font-size:14px; line-height:28px;
  /* LEFT, not centred. A full address fills the field exactly, so this only
     moves a partial one and the placeholder, and those are the two states that
     were wrong: the wallet's "NQ" sits at the start of the first cell and ours
     floated in the middle of the box. */
  text-transform:uppercase; text-align:left;
  color:var(--nq-cc-input-fg, var(--nq-cc-menu-fg, #1f2348)); }
.nq-cc-addr-input::placeholder { opacity:.32; }
/* The separators, drawn on ONE element behind the text so the textarea keeps a
   single caret and a single selection.

   The column rules sit in the two gaps between blocks, at characters 4.5 and
   9.5 of the 14-character line, which is 2.5ch either side of centre. This
   element must carry the same font as the textarea, or its ch unit is Mulish's
   and the rules land in the middle of the text.
   NOTE: this block is a JS template literal, so it must never contain a
   backtick. Writing ch in code quotes here is what broke the build once. */
.nq-cc-addr-rules { position:absolute; inset:7px 0; pointer-events:none;
  font-family:'Fira Mono',ui-monospace,monospace; font-size:14px;
  --nq-cc-addr-rule:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 10%, transparent);
  --nq-cc-addr-gap:4.9ch;
  /* Block 1 ends at char 4 and block 2 starts at char 5 plus the gap, so the
     gap centre is 2.5ch + half a gap either side of the line's centre. Derived
     rather than eyeballed, so changing the gap moves the rules with it. */
  --nq-cc-addr-rule-x:calc(2.5ch + var(--nq-cc-addr-gap) / 2);
  /* Six ticks, two columns by three rows, each one line tall and centred in
     its row. A full-height rule turns the field into a table with nine cells;
     the wallet's ticks read as separators inside one field, which is what it
     is. */
  --nq-cc-addr-tick:1px 16px;
  background:
    linear-gradient(var(--nq-cc-addr-rule), var(--nq-cc-addr-rule)) calc(50% - var(--nq-cc-addr-rule-x)) 16.667%/var(--nq-cc-addr-tick) no-repeat,
    linear-gradient(var(--nq-cc-addr-rule), var(--nq-cc-addr-rule)) calc(50% + var(--nq-cc-addr-rule-x)) 16.667%/var(--nq-cc-addr-tick) no-repeat,
    linear-gradient(var(--nq-cc-addr-rule), var(--nq-cc-addr-rule)) calc(50% - var(--nq-cc-addr-rule-x)) 50%/var(--nq-cc-addr-tick) no-repeat,
    linear-gradient(var(--nq-cc-addr-rule), var(--nq-cc-addr-rule)) calc(50% + var(--nq-cc-addr-rule-x)) 50%/var(--nq-cc-addr-tick) no-repeat,
    linear-gradient(var(--nq-cc-addr-rule), var(--nq-cc-addr-rule)) calc(50% - var(--nq-cc-addr-rule-x)) 83.333%/var(--nq-cc-addr-tick) no-repeat,
    linear-gradient(var(--nq-cc-addr-rule), var(--nq-cc-addr-rule)) calc(50% + var(--nq-cc-addr-rule-x)) 83.333%/var(--nq-cc-addr-tick) no-repeat,
    linear-gradient(var(--nq-cc-addr-rule), var(--nq-cc-addr-rule)) 50% 33.333%/calc(100% - 12px) 1px no-repeat,
    linear-gradient(var(--nq-cc-addr-rule), var(--nq-cc-addr-rule)) 50% 66.667%/calc(100% - 12px) 1px no-repeat; }
/* inputs: inset box-shadow border, never border (rule 1) */
.nq-cc-input { width:100%; border:none; border-radius:8px; padding:11px 12px; font-family:inherit; font-size:18px;
  font-size:14px; font-weight:600;
  color:var(--nq-cc-input-fg, var(--nq-cc-menu-fg, #1f2348));
  background:var(--nq-cc-input-bg, var(--nq-cc-card-bg, #fff));
  box-shadow:inset 0 0 0 2px color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 12%, transparent); }
.nq-cc-input:focus { outline:none; box-shadow:inset 0 0 0 2px var(--nq-cc-accent, #0582ca); }
.nq-cc-input::placeholder { font-weight:600;
  color:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 30%, transparent); }
/* The amount is a small centred box with the ticker BESIDE it, which is the
   wallet's arrangement (its box is 30.4% of the sheet). A full-bleed input
   with the ticker inside it is what a settings form looks like. */
.nq-cc-amount-row { display:flex; align-items:center; justify-content:center; gap:8px; }
.nq-cc-amount-row .nq-cc-input { width:auto; max-width:112px; padding:9px 10px;
  text-align:center; }
.nq-cc-amount-suffix { flex:none; font-size:16px; font-weight:700; pointer-events:none;
  color:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 45%, transparent); }
/* Centred, because the field it labels is centred. */
.nq-cc-send-body .nq-cc-field-label, .nq-cc-request-body .nq-cc-field-label { text-align:center; }
.nq-cc-send-fiat, .nq-cc-request-hint { text-align:center; }
/* Underlined-by-nothing and bordered by nothing, which is how the wallet draws
   it: a plain centred line of text that happens to be typeable. A bordered box
   here would read as a second required field next to the amount. */
.nq-cc-message { width:100%; margin-top:4px; padding:6px 4px; border:none; background:none;
  font-family:inherit; font-size:13px; text-align:center; outline:none;
  color:var(--nq-cc-menu-fg, #1f2348); }
.nq-cc-message::placeholder { color:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 40%, transparent); }
.nq-cc-message:focus { box-shadow:inset 0 -1px 0 0 var(--nq-cc-accent, #0582ca); }
.nq-cc-send-hint { font-size:12px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.5)); }
.nq-cc-send-hint:empty { display:none; }
/* Right-aligned, under the NIM suffix rather than under the digits: it belongs
   to the field's unit, and the field is the one thing on this view the user is
   typing into. */
.nq-cc-send-fiat { margin:0; font-size:13px; font-weight:600;
  color:var(--nq-cc-menu-muted, rgba(31,35,72,.5)); }
.nq-cc-send-confirm, .nq-cc-request-copy { width:100%; height:52px; border:none; border-radius:500px; margin-top:4px;
  font-family:inherit; font-size:16px; font-weight:700; cursor:pointer;
  color:var(--nq-cc-send-fg, #fff); background-color:var(--nq-cc-send-bg, #0582ca);
  background-image:var(--nq-cc-send-image,
    radial-gradient(100% 100% at 100% 100%, #265dd7, #0582ca)); }
.nq-cc-send-confirm:hover:not(:disabled), .nq-cc-request-copy:hover { background-image:var(--nq-cc-send-image-hover,
  radial-gradient(100% 100% at 100% 100%, #1f4fbc, #0473b3)); }
.nq-cc-send-confirm:focus-visible, .nq-cc-request-copy:focus-visible {
  outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:3px; }
.nq-cc-send-confirm:disabled { opacity:.4; cursor:default; }
.nq-cc-send-error { font-size:12px; font-weight:600; text-align:center;
  color:var(--nq-cc-danger, #d94432); }
.nq-cc-send-error:empty { display:none; }
.nq-cc-send-done { display:none; flex-direction:column; align-items:center; gap:6px;
  padding:16px 0 10px; color:var(--nq-cc-success, #13b59d); font-size:14px; font-weight:700; }
.nq-cc-view-send.nq-cc-sent .nq-cc-send-body { display:none; }
.nq-cc-view-send.nq-cc-sent .nq-cc-send-done { display:flex; }
/* Sub-view header: back chevron left, the view's name CENTRED in the card.
   Three columns and not a flex row, so the title is centred on the menu rather
   than on whatever is left over beside the button. The third column is the
   chevron's width again, holding the symmetry. */
.nq-cc-view-head { display:grid; grid-template-columns:34px 1fr 34px; align-items:center;
  padding:2px 2px 0; }
/* PROPORTIONS, not absolute sizes. v0.23.0 matched the wallet's own px and
   made this worse: 24px address type is 6.2% of a 390px sheet and 8.8% of a
   272px card, so copying the number made our content RELATIVELY bigger than
   the wallet's, and the card read as cramped rather than small.
   Every size below is the wallet's share of its own sheet, measured off the
   real screenshots and applied to 272px. Scale is 272/390 = 0.697. */
.nq-cc-view-title { grid-column:2; min-width:0; text-align:center; font-size:19px; font-weight:700;
  line-height:1.2; text-wrap:balance; color:var(--nq-cc-menu-fg, #1f2348); }
.nq-cc-view-sub { margin:2px 12px 0; text-align:center; font-size:12px; font-weight:600;
  line-height:1.35; color:var(--nq-cc-menu-muted, rgba(31,35,72,.5)); }
.nq-cc-back, .nq-cc-shut { grid-column:1; display:inline-flex; align-items:center; justify-content:center;
  width:34px; height:34px; padding:0; border:none; border-radius:50%; background:none;
  font-family:inherit; color:var(--nq-cc-menu-muted, rgba(31,35,72,.6)); cursor:pointer;
  transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-back:hover { background:var(--nq-cc-menu-hover, rgba(31,35,72,.06)); }
.nq-cc-back:focus-visible, .nq-cc-shut:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:-2px; }
/* The X is a FILLED DISC, which is what the wallet ships and what a bare
   stroke glyph on a white card was not: the disc is what makes it read as a
   button at all. 26px inside the 34px hit area, so the target stays a finger's
   worth while the mark stays small. The back chevron is deliberately NOT a
   disc, in the wallet either: one dismisses, one steps, and giving both the
   same weight says they are the same control. */
.nq-cc-shut { width:34px; height:34px; }
.nq-cc-shut-disc { display:inline-flex; align-items:center; justify-content:center;
  width:26px; height:26px; border-radius:50%;
  background:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 10%, transparent);
  color:var(--nq-cc-card-bg, #fff);
  transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-shut:hover .nq-cc-shut-disc {
  background:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 18%, transparent); }
.nq-cc-chevron { display:block; width:8px; height:13px; }
/* The X shares every pixel of the chevron button but its column, so it shares
   the rule too rather than restating it and drifting from it. */
.nq-cc-shut { grid-column:3; }
.nq-cc-cross { display:block; width:11px; height:11px; }
.nq-cc-receive-body { display:flex; flex-direction:column; align-items:center; padding:0 8px 8px; }
.nq-cc-qr { display:block; padding:10px; border-radius:8px;
  background:var(--nq-cc-qr-plate, #fff); }
.nq-cc-qr:empty { display:none; padding:0; }
.nq-cc-qr > * { display:block; width:164px; height:164px; }
.nq-cc-receive-hint { font-size:13px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.45)); margin:10px 0 2px; }

/* tap-to-copy address: upstream Copyable verbatim: light-blue tooltip, tinted
   field, and the blue HOLDS after copy until focus leaves */
.nq-cc-copy-wrap { position:relative; display:block; margin-top:28px; width:100%;
  text-align:center; }
.nq-cc-address { display:grid; grid-template-columns:repeat(var(--nq-cc-addr-cols, 3), 1fr); gap:10px 0; justify-items:center;
  width:100%; max-width:var(--nq-cc-addr-plate, 169px); margin-inline:auto; padding:14px 6px; border:none; border-radius:6px; cursor:pointer;
  background:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 4%, transparent);
  font-family:'Fira Mono',ui-monospace,monospace; font-size:16px; line-height:1.11;
  color:var(--nq-cc-menu-muted, rgba(31,35,72,.7));
  transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)), color .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-address:hover, .nq-cc-address:focus,
.nq-cc-copy-wrap.nq-cc-copied .nq-cc-address, .nq-cc-copy-wrap.nq-cc-copied-hold .nq-cc-address {
  background:color-mix(in srgb, var(--nq-cc-accent, #0582ca) 8%, transparent);
  color:var(--nq-cc-accent, #0582ca); }
.nq-cc-address:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:2px; }
/* The wrong-chain guard. Orange because it is a WARNING: red would read as an
   error that already happened, and grey would read as fine print, which is
   exactly what this must not be.
   Colours are the nq registry status-alert warning triplet verbatim
   (colors-orange on colors-orange-400 with a colors-orange-500 ring), not an
   approximation of it. NOTE: this block is a JS template literal, so it must
   never contain a backtick. */
.nq-cc-net-warn { margin:8px 0 0; padding:8px 10px; border-radius:6px;
  background:var(--nq-cc-warn-bg, oklch(0.951 0.0221 74.1));
  outline:1.5px solid var(--nq-cc-warn-line, oklch(0.9396 0.0436 71.7)); outline-offset:-1.5px;
  color:var(--nq-cc-warning, oklch(0.7387 0.179 56.67));
  font-size:11.5px; font-weight:700; line-height:1.4; text-align:center; }
.nq-cc-net-warn[hidden] { display:none; }

/* Saved recipients: a wrapping row of quiet pills under the address field.
   Pills because every actionable thing in this menu is a pill, and quiet
   because they are a shortcut, not the primary way to fill the field.

   QUIET IS NOT SMALL. These shipped 47x23, and a 23px-tall control that fills
   in who gets paid is the one mis-tap in this menu that costs money. The pill
   now clears 36px on its shortest side, which is the floor nq lint enforces and
   the size the Connect button already was. The text stays 11.5px and the fill
   stays a wash: what grew is the target, not the voice. */
/* The v0.20 chip rules are GONE, not overridden. They were still supplying a
   grey pill background and 4px/12px of padding under the new face-and-name
   contact, which is where the "Mu..." came from: the padding left ~24px for a
   name in a 46px column. Two rules for one class is how that hides. */
.nq-cc-copy-tooltip { position:absolute; left:50%; bottom:calc(100% + 10px);
  transform:translateX(-50%) translateY(4px); padding:8px 12px; border-radius:4px;
  background-image:var(--nq-cc-send-image,
    radial-gradient(100% 100% at 100% 100%, #265dd7, #0582ca));
  color:var(--nq-cc-send-fg, #fff); font-size:13px;
  font-weight:600; line-height:1.1; white-space:nowrap; pointer-events:none; opacity:0; z-index:30;
  box-shadow:0 2px 2.5px rgba(31,35,72,.02), 0 7px 8.5px rgba(31,35,72,.04), 0 18px 38px rgba(31,35,72,.07);
  transition:opacity .3s var(--nimiq-ease, cubic-bezier(.25,0,0,1)), transform .3s var(--nimiq-ease, cubic-bezier(.25,0,0,1));
  transition-delay:.2s; }
.nq-cc-copy-tooltip::after { content:''; position:absolute; left:50%; top:calc(100% - 1px); width:14px; height:7px;
  margin-left:-7px; transform:scaleY(-1);
  background-image:var(--nq-cc-send-image,
    radial-gradient(100% 100% at 100% 100%, #265dd7, #0582ca));
  -webkit-mask-image:url('data:image/svg+xml,<svg viewBox="0 0 18 16" xmlns="http://www.w3.org/2000/svg"><path d="M9 7.12c-.47 0-.93.2-1.23.64L3.2 14.29A4 4 0 0 1 0 16h18a4 4 0 0 1-3.2-1.7l-4.57-6.54c-.3-.43-.76-.64-1.23-.64z" fill="white"/></svg>');
  mask-image:url('data:image/svg+xml,<svg viewBox="0 0 18 16" xmlns="http://www.w3.org/2000/svg"><path d="M9 7.12c-.47 0-.93.2-1.23.64L3.2 14.29A4 4 0 0 1 0 16h18a4 4 0 0 1-3.2-1.7l-4.57-6.54c-.3-.43-.76-.64-1.23-.64z" fill="white"/></svg>');
  -webkit-mask-size:100% 100%; mask-size:100% 100%; }
.nq-cc-copy-wrap.nq-cc-copied .nq-cc-copy-tooltip { opacity:1; transform:translateX(-50%) translateY(0); }

/* rows + accordion value rows */
.nq-cc-row { display:flex; align-items:center; gap:8px; position:relative; width:100%; padding:7px 10px;
  border:none; border-radius:6px; background:none; font-family:inherit; text-align:left; cursor:pointer;
  transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-row:hover { background:var(--nq-cc-menu-hover, rgba(31,35,72,.06)); }
.nq-cc-row:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:-2px; }
.nq-cc-label { font-size:13px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.6)); white-space:nowrap; }
.nq-cc-strong { font-size:14px; font-weight:600; color:var(--nq-cc-menu-fg, #1f2348); }
.nq-cc-cashlink-slot { display:block; width:24px; height:24px; flex:none; color:var(--nq-cc-menu-fg, #1f2348); }
.nq-cc-cashlink-slot svg { display:block; width:100%; height:100%; }
.nq-cc-hexlogo { display:block; width:20px; height:18px; flex:none; }
.nq-cc-acc { display:flex; align-items:center; justify-content:space-between; gap:8px; width:100%;
  padding:7px 10px; border:none; border-radius:6px; background:none; font-family:inherit; text-align:left;
  cursor:pointer; transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-acc:hover { background:var(--nq-cc-menu-hover, rgba(31,35,72,.06)); }
.nq-cc-acc:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:-2px; }
.nq-cc-acc-value { display:inline-flex; align-items:center; gap:7px; margin-left:auto; }
.nq-cc-acc[aria-expanded="true"] .nq-cc-caret { transform:rotate(180deg); }
.nq-cc-acc-body { display:none; }
.nq-cc-acc-body.nq-cc-open { display:block; }

/* flag-hex card grids on the faint well; ALWAYS-VISIBLE slim gutter slider.
   TRAP: standard scrollbar-width/scrollbar-color make Chrome 121+ ignore
   ::-webkit-scrollbar, they live in the Firefox-only @supports block. */
.nq-cc-grid-wrap { position:relative; margin-top:6px; }
/* Scroll affordance. The grid has a styled scrollbar, but macOS and iOS hide
   overlay scrollbars until you actually scroll, so a list of 40 currencies
   looks like a list of 12. A fade on the bottom edge says "there is more"
   without adding chrome; it is removed once you reach the end, so a fully
   visible grid never wears one. */
.nq-cc-grid-wrap::after { content:''; position:absolute; left:0; right:0; bottom:0; height:34px;
  pointer-events:none; opacity:1; transition:opacity .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1));
  /* plain transparent, not rgba(255,255,255,0): gradients interpolate in
     PREMULTIPLIED alpha, so the old white-with-zero-alpha stop was a workaround
     for a browser bug that is gone, and it made the fade travel through white
     on any surface that is not. */
  background:linear-gradient(to bottom, transparent, var(--nq-cc-menu-bg, #fff));
  border-radius:0 0 6px 6px; }
/* A chevron sitting IN the fade. The fade alone was not read as an affordance
   (Andrew, twice), and on iOS there is nothing else to read: WebKit ignores
   ::-webkit-scrollbar there, so an overlay scrollbar never appears until a
   finger is already moving. A downward chevron is the one mark people already
   associate with "more below". It rides the same on/off state as the fade. */
.nq-cc-grid-more { position:absolute; left:50%; bottom:5px; transform:translateX(-50%);
  display:flex; align-items:center; justify-content:center; width:22px; height:22px;
  border-radius:50%; background:var(--nq-cc-menu-bg, #fff); pointer-events:none;
  box-shadow:0 1px 4px color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 18%, transparent); opacity:1;
  transition:opacity .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-grid-more svg { width:11px; height:11px; color:var(--nq-cc-menu-fg, #1f2348); opacity:.75; }
.nq-cc-grid-wrap[data-at-end]::after, .nq-cc-grid-wrap[data-no-scroll]::after,
.nq-cc-grid-wrap[data-at-end] .nq-cc-grid-more,
.nq-cc-grid-wrap[data-no-scroll] .nq-cc-grid-more { opacity:0; }
/* A real track on pointer devices. iOS ignores this entirely, which is why the
   chevron above is the primary signal rather than the fallback. */
.nq-cc-grid { scrollbar-width:thin;
  scrollbar-color:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 28%, transparent) transparent; }
.nq-cc-grid { display:grid; gap:4px; padding:4px; padding-right:8px; max-height:196px; overflow-y:auto;
  background:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 4%, transparent); border-radius:6px; }
.nq-cc-grid.nq-cc-cols-2 { grid-template-columns:1fr 1fr; }
.nq-cc-grid.nq-cc-cols-3 { grid-template-columns:repeat(3, 1fr); }
.nq-cc-grid::-webkit-scrollbar { width:11px; }
.nq-cc-grid::-webkit-scrollbar-track { background:transparent; margin:4px 0; }
.nq-cc-grid::-webkit-scrollbar-thumb { border-radius:500px;
  background:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 28%, transparent);
  border:3px solid transparent; background-clip:padding-box; }
.nq-cc-grid::-webkit-scrollbar-thumb:hover {
  background-color:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 45%, transparent); }
@supports (-moz-appearance: none) {
  .nq-cc-grid { scrollbar-width:thin;
    scrollbar-color:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 28%, transparent) transparent; }
}
.nq-cc-card { display:flex; align-items:center; justify-content:flex-start; gap:7px; height:42px; padding:0 8px;
  border:none; border-radius:6px; background:none; cursor:pointer; font-family:inherit;
  color:var(--nq-cc-menu-muted, rgba(31,35,72,.6)); min-width:0;
  transition:background .3s var(--nimiq-ease, cubic-bezier(.25,0,0,1)), color .3s var(--nimiq-ease, cubic-bezier(.25,0,0,1)), box-shadow .3s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-card:hover { background:var(--nq-cc-menu-hover, rgba(31,35,72,.06)); color:var(--nq-cc-menu-fg, #1f2348); }
.nq-cc-card:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:-2px; }
.nq-cc-card.nq-cc-current { background:var(--nq-cc-card-bg, #fff); color:var(--nq-cc-menu-fg, #1f2348);
  box-shadow:0 .3px 2px rgba(0,0,0,.025), 0 1.5px 3px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.07); }
.nq-cc-card-art { display:block; width:26px; height:24px; flex:none; }
.nq-cc-card-art:empty { display:none; }
.nq-cc-card-name { font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.nq-cc-card-ticker { font-size:12px; font-weight:700; letter-spacing:.06em; }

/* footer: quiet Disconnect; network row ONLY on testnet */
.nq-cc-footer { display:flex; align-items:center; justify-content:space-between; padding:6px 10px 8px;
  font-size:12px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.45)); }
.nq-cc-net-group { display:none; align-items:center; gap:8px; }
.nq-cc[data-testnet] .nq-cc-net-group { display:inline-flex; }
.nq-cc:not([data-testnet]) .nq-cc-footer { justify-content:center; padding-top:2px; padding-bottom:6px; }
.nq-cc-disconnect { padding:10px 8px; margin:-8px; border:none; background:none; cursor:pointer;
  font-family:inherit; font-size:12px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.45));
  transition:color .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-disconnect:hover { color:var(--nq-cc-danger, #d94432); }
.nq-cc-disconnect:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:2px; border-radius:3px; }
.nq-cc-badge { font-size:12px; line-height:1; font-weight:700; letter-spacing:.09em; text-transform:uppercase;
  color:var(--nq-cc-warning, #fc8702);
  background:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 7%, transparent);
  padding:5px 8px; border-radius:4px; }
/* no footer at all when there is nothing to show */
.nq-cc:not([data-testnet]):not([data-connected]) .nq-cc-footer,
.nq-cc:not([data-testnet]):not([data-connected]) .nq-cc-footer-divider,
.nq-cc[data-mode="miniapp"]:not([data-testnet]) .nq-cc-footer,
.nq-cc[data-mode="miniapp"]:not([data-testnet]) .nq-cc-footer-divider { display:none; }

`,document.head.appendChild(l)}var jZ='<svg class="nq-cc-cross" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1l-8 8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',$Z='<svg class="nq-cc-chevron" viewBox="0 0 6 10" aria-hidden="true"><path d="M5 1L1 5l4 4" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"/></svg>',$h='<svg class="nq-cc-caret" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',WQ='<svg viewBox="0 -4 64 64" aria-hidden="true"><path opacity=".25" d="M62.3 25.4L49.2 2.6A5.3 5.3 0 0 0 44.6 0H18.4c-1.9 0-3.6 1-4.6 2.6L.7 25.4c-1 1.6-1 3.6 0 5.2l13.1 22.8c1 1.6 2.7 2.6 4.6 2.6h26.2c1.9 0 3.6-1 4.6-2.6l13-22.8c1-1.6 1-3.6.1-5.2z" fill="currentColor"/></svg>',AZ='<svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" style="flex:none;opacity:.85"><rect x="2" y="5" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 9h16" stroke="currentColor" stroke-width="1.5"/><circle cx="6" cy="13" r="1" fill="currentColor"/></svg>',eK='<svg width="16" height="12" viewBox="0 0 16 12" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="%CLS%"><path d="M10,1l5,5l-5,5" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="14" y1="6" x2="1" y2="6" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',IZ='<svg class="nq-cc-book-glyph" viewBox="0 0 10 12" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M8.75 1.776c0 .117.083.22.201.244a1 1 0 01.798.98v8a1 1 0 01-.999 1H1.501A1.5 1.5 0 010 10.499V1.5A1.5 1.5 0 011.501 0h6.25a1 1 0 011 1zM7.501 9.583a2.505 2.505 0 00-2.505-2.334A2.51 2.51 0 002.5 9.473a.25.25 0 00.25.276h4.592a.157.157 0 00.157-.166zM3.49 5.248a1.506 1.506 0 110 .003zM1.499 1.002a.5.5 0 000 1.001h6.125a.124.124 0 00.125-.125v-.754a.125.125 0 00-.123-.122h-6.13z" clip-rule="evenodd"/></svg>',JZ='<svg class="nq-cc-qr-glyph" viewBox="0 0 13 13" aria-hidden="true"><g fill="none"><path fill="currentColor" d="M5.796 1.902a.304.304 0 00-.304-.305H1.938a.305.305 0 00-.304.305v3.553c0 .168.136.305.304.305h3.553a.305.305 0 00.305-.305zm-.609 3.249H2.243V2.206h2.944z"/><path stroke="currentColor" stroke-width=".091" d="M5.796 1.902a.304.304 0 00-.304-.305H1.938a.305.305 0 00-.304.305v3.553c0 .168.136.305.304.305h3.553a.305.305 0 00.305-.305zm0 0h-.049m-.56 3.249H2.243V2.206h2.944z"/><path fill="currentColor" stroke="currentColor" stroke-width=".091" d="M3.067 4.632h1.296a.305.305 0 00.305-.305V3.03a.305.305 0 00-.305-.304H3.067a.305.305 0 00-.305.304v1.297c0 .168.137.305.305.305Zm.304-1.297h.688v.688H3.37zM7.509 5.76h3.553a.304.304 0 00.304-.305V1.902a.304.304 0 00-.304-.305H7.509a.305.305 0 00-.305.305v3.553c0 .168.136.305.305.305Zm.304-3.554h2.944v2.945H7.813z"/><path fill="currentColor" stroke="currentColor" stroke-width=".091" d="M9.933 2.726H8.636a.304.304 0 00-.304.304v1.297c0 .168.136.305.304.305h1.297a.305.305 0 00.305-.305V3.03a.305.305 0 00-.305-.304Zm-.305 1.297h-.687v-.688h.687z"/><path fill="currentColor" d="M5.796 7.472a.304.304 0 00-.304-.304H1.938a.304.304 0 00-.304.304v3.553c0 .169.136.305.304.305h3.553a.305.305 0 00.305-.305zm-.609 3.249H2.243V7.777h2.944z"/><path stroke="currentColor" stroke-width=".091" d="M5.796 7.472a.304.304 0 00-.304-.304H1.938a.304.304 0 00-.304.304v3.553c0 .169.136.305.304.305h3.553a.305.305 0 00.305-.305zm0 0h-.049m-.56 3.249H2.243V7.777h2.944z"/><path fill="currentColor" stroke="currentColor" stroke-width=".091" d="M3.067 10.202h1.296a.305.305 0 00.305-.305V8.6a.304.304 0 00-.305-.304H3.067a.304.304 0 00-.305.304v1.297c0 .168.137.305.305.305Zm.304-1.297h.688v.688H3.37zm7.995 2.12V7.472a.304.304 0 00-.304-.304H7.509a.304.304 0 00-.305.304v3.553c0 .169.136.305.305.305h3.553a.305.305 0 00.304-.305Zm-.609-.304H7.813V7.777h2.944z"/><path fill="currentColor" stroke="currentColor" stroke-width=".091" d="M8.637 10.202h1.297a.304.304 0 00.304-.305V8.6a.304.304 0 00-.304-.304H8.637a.304.304 0 00-.304.304v1.297c0 .168.136.305.304.305Zm.305-1.297h.687v.688h-.687zM.353 3.323a.305.305 0 00.305-.304V.658h2.36a.305.305 0 000-.61H.353A.305.305 0 00.05.354V3.02c0 .168.136.304.304.304ZM12.647.049H9.982a.304.304 0 100 .609h2.36v2.361a.305.305 0 10.61 0V.353a.304.304 0 00-.305-.304Zm-.001 9.556a.304.304 0 00-.304.304v2.36h-2.36a.304.304 0 100 .61h2.664a.304.304 0 00.305-.305V9.91a.304.304 0 00-.305-.304ZM3.018 12.27H.658V9.91a.304.304 0 10-.61 0v2.664c0 .169.137.305.305.305h2.665a.305.305 0 100-.61Z"/></g></svg>',l0='<svg class="nq-cc-scan-glyph" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g fill="currentColor"><path d="M1.21 7.06c.67 0 1.21-.54 1.21-1.21l-.04-3.12a.3.3 0 0 1 .3-.3H5.7a1.21 1.21 0 1 0 0-2.43H2.37A2.4 2.4 0 0 0 0 2.42v3.43c0 .67.54 1.21 1.21 1.21zM5.69 37.58H2.73a.3.3 0 0 1-.3-.3v-3.13a1.21 1.21 0 1 0-2.43 0v3.43A2.4 2.4 0 0 0 2.37 40H5.7a1.21 1.21 0 0 0 0-2.42zM38.79 32.94c-.67 0-1.21.54-1.21 1.21l.04 3.12a.3.3 0 0 1-.3.3H34.3a1.21 1.21 0 1 0 0 2.43h3.32A2.4 2.4 0 0 0 40 37.58v-3.43c0-.67-.54-1.21-1.21-1.21zM37.63 0H34.3a1.21 1.21 0 1 0 0 2.42h2.96c.17 0 .3.14.3.3v3.13a1.21 1.21 0 0 0 2.43 0V2.42A2.4 2.4 0 0 0 37.63 0z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M13.94 15.15H6.67c-.67 0-1.22-.54-1.22-1.21V6.67c0-.67.55-1.21 1.22-1.21h7.27c.67 0 1.21.54 1.21 1.2v7.28c0 .67-.54 1.21-1.21 1.21zM8.18 7.88a.3.3 0 0 0-.3.3v4.24c0 .17.13.3.3.3h4.24a.3.3 0 0 0 .3-.3V8.18a.3.3 0 0 0-.3-.3H8.18zM6.67 24.85h7.27c.67 0 1.21.54 1.21 1.21v7.27c0 .67-.54 1.22-1.21 1.22H6.67c-.67 0-1.22-.55-1.22-1.22v-7.27c0-.67.55-1.21 1.22-1.21zm5.75 7.27a.3.3 0 0 0 .3-.3v-4.24a.3.3 0 0 0-.3-.3H8.18a.3.3 0 0 0-.3.3v4.24c0 .17.13.3.3.3h4.24zM26.06 5.45h7.27c.67 0 1.21.55 1.21 1.22v7.27c0 .67-.54 1.21-1.2 1.21h-7.28c-.67 0-1.21-.54-1.21-1.21V6.67c0-.67.54-1.22 1.21-1.22zm5.76 7.28a.3.3 0 0 0 .3-.3V8.17a.3.3 0 0 0-.3-.3h-4.24a.3.3 0 0 0-.3.3v4.24c0 .17.13.3.3.3h4.24z"/><path d="M17.58 10.6h1.2a.9.9 0 1 0 0-1.81.3.3 0 0 1-.3-.3V6.66a.9.9 0 1 0-1.81 0V9.7c0 .5.4.9.9.9zM21.21 7.58c.17 0 .3.13.3.3v6.66a.9.9 0 1 0 1.82 0V6.67c0-.5-.4-.91-.9-.91H21.2a.9.9 0 1 0 0 1.82zM12.42 18.18c0 .5.41.91.91.91h4.25c.5 0 .9-.4.9-.9v-4.86a.9.9 0 1 0-1.81 0v3.64a.3.3 0 0 1-.3.3h-3.04c-.5 0-.9.4-.9.91z"/><path d="M9.09 17.27c-.5 0-.9.4-.9.91v3.03a.3.3 0 0 1-.31.3H6.67a.9.9 0 1 0 0 1.82h15.75c.5 0 .91-.4.91-.9v-3.64a.9.9 0 0 0-1.82 0v2.42a.3.3 0 0 1-.3.3h-10.9a.3.3 0 0 1-.31-.3v-3.03c0-.5-.4-.9-.91-.9zM22.12 26.06c0-.5-.4-.9-.9-.9h-3.64c-.5 0-.91.4-.91.9v4.85a.9.9 0 1 0 1.81 0v-3.64c0-.16.14-.3.3-.3h2.43c.5 0 .91-.4.91-.9zM33.33 32.42h-10.3a.3.3 0 0 1-.3-.3V29.7a.9.9 0 1 0-1.82 0v3.63c0 .5.4.91.9.91h11.52a.9.9 0 0 0 0-1.82z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M29.1 30h-3.65a.9.9 0 0 1-.9-.91v-3.64c0-.5.4-.9.9-.9h3.64c.5 0 .91.4.91.9v3.64c0 .5-.4.91-.9.91zm-2.43-3.64a.3.3 0 0 0-.3.3v1.22c0 .17.13.3.3.3h1.2a.3.3 0 0 0 .31-.3v-1.21a.3.3 0 0 0-.3-.3h-1.21z"/><path d="M32.73 20.9c-.5 0-.91.42-.91.92v7.88a.9.9 0 0 0 1.82 0v-7.88c0-.5-.41-.91-.91-.91zM33.64 17.58c0-.5-.41-.91-.91-.91h-6.67c-.5 0-.9.4-.9.9v3.64a.9.9 0 0 0 1.8 0V18.8c0-.17.15-.3.31-.3h5.46c.5 0 .9-.41.9-.91z"/></g></svg>',PZ='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 17" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.28" stroke-linecap="round" stroke-linejoin="round"><path d="M16.603 6.779l-2.987-5.306a1.37 1.37 0 00-1.189-.702H5.57c-.489 0-.941.267-1.186.703L1.396 6.779"/><path d="M1.396 9.752l2.988 5.304a1.36 1.36 0 001.186.703h6.858a1.36 1.36 0 001.186-.703l2.988-5.304"/><path d="M3.24 5.773L1.396 6.779L1.3 4.681M14.758 10.757L16.602 9.752L16.697 11.85"/></g></svg>',NZ=0;function CZ(){let l=`nq-cc-hex-${NZ+=1}`;return`<svg class="nq-cc-hexlogo" viewBox="0 0 20 18" aria-hidden="true"><g fill="none"><path fill="url(#${l})" d="M19.964 8.156 15.758.844A1.69 1.69 0 0014.299 0H5.887c-.6 0-1.156.32-1.456.844L.225 8.156c-.3.523-.3 1.165 0 1.688l4.206 7.312c.3.523.856.844 1.456.844h8.412c.6 0 1.156-.32 1.456-.844l4.206-7.312a1.69 1.69 0 00.003-1.688"/><defs><radialGradient id="${l}" cx="0" cy="0" r="1" gradientTransform="matrix(20.1956 0 0 20.2552 15.188 17.766)" gradientUnits="userSpaceOnUse"><stop stop-color="#ec991c"/><stop offset="1" stop-color="#e9b213"/></radialGradient></defs></g></svg>`}function h0(l,h){let Q=l.address?kZ(l.address):null;if(Q)return Q;if(l.label)return l.label;let K=l.address?.trim()??"";if(!K)return h;return`${K.slice(0,7)}…${K.slice(-4)}`}function A(l,h,Q){let K=document.createElement(l);if(h)K.className=h;if(Q)Q.appendChild(K);return K}function Q0(l,h){let Q=document.createElement("div");Q.className="nq-cc-grid-more",Q.setAttribute("aria-hidden","true"),Q.innerHTML='<svg viewBox="0 0 12 8" fill="none" aria-hidden="true"><path d="M1 1.5 6 6.5l5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',l.appendChild(Q);let K=()=>{let Z=h.scrollHeight-h.clientHeight>2;l.toggleAttribute("data-no-scroll",!Z),l.toggleAttribute("data-at-end",Z&&h.scrollTop+h.clientHeight>=h.scrollHeight-2)};if(h.addEventListener("scroll",K,{passive:!0}),typeof ResizeObserver<"u")new ResizeObserver(K).observe(h);K()}function _Z(){if(typeof window>"u"||!window.location)return;let l=GQ(window.location.hostname);return l?{bot:{repo:l}}:void 0}function X0(l,h){let{wallet:Q,i18n:K}=h,Z=h.languages??bl,k=h.receive!==!1,M=!!h.assets,W=h.getBalanceLuna??(M||h.balance===!1||h.network==="test"?void 0:ah(h.balance&&h.balance.rpc?{rpc:h.balance.rpc}:{})),G=!!W||M,Y=!!h.fiat&&h.fiat.currencies.length>0;if(h.injectStyles!==!1)WZ();let P=h.fiat?.default??"USD";try{let V=localStorage.getItem(oK);if(V&&h.fiat?.currencies.includes(V))P=V}catch{}if(h.fiat&&!h.fiat.currencies.includes(P))P=h.fiat.currencies[0];let X=A("div","nq-cc");if(X.dataset.mode=!Q||Q.mode==="miniapp"?"miniapp":"hub",!Q)X.dataset.face="lang";if(h.network==="test")X.dataset.testnet="";if(h.theme)Ul(X,h.theme);l.appendChild(X);let z=(V)=>Z.find((E)=>E.id===V)??Z[0],j=(V)=>VZ[V.id]??V.name,I=A("button","nq-cc-face",X);I.type="button",I.setAttribute("aria-haspopup","menu"),I.setAttribute("aria-expanded","false");let $=A("button","nq-cc-face-flag",X);$.type="button",$.setAttribute("aria-haspopup","menu"),$.setAttribute("aria-expanded","false");function C(){I.textContent="";let V=Q?.account??null;if(V){X.dataset.connected="";let E=A("span","nq-cc-face-icon",I);if(h.identicon)E.appendChild(h.identicon(V.address,28));else E.innerHTML=WQ;let H=A("span","nq-cc-face-label",I);H.textContent=h0(V,K.t("shell.account"))}else{delete X.dataset.connected,I.insertAdjacentHTML("beforeend",AZ);let E=A("span","nq-cc-face-label",I);E.textContent=K.t("shell.connectWallet")}I.insertAdjacentHTML("beforeend",$h)}function L(){$.textContent="";let V=z(K.getLanguage());$.setAttribute("aria-label",K.t("shell.language")),$.appendChild(s(V.flag,{size:24})),$.insertAdjacentHTML("beforeend",$h)}let J=A("div","nq-cc-menu",X);J.hidden=!0;let _=A("div","nq-cc-view-receive",J),N=A("div","nq-cc-view-qr",J),F=A("div","nq-cc-view-request",J),D=A("div","nq-cc-view-sendto",J),w=A("div","nq-cc-view-send",J),S=A("div","nq-cc-view-main",J),O=[];function U(V,E){O.push([V,E]),V.textContent=K.t(E)}let m=()=>{};function a(){for(let[V,E]of O)V.textContent=K.t(E);m()}let r=A("div","nq-cc-section nq-cc-when-out nq-cc-when-hub",S),c=A("button","nq-cc-connect",r);if(c.type="button",U(c,"shell.connectWallet"),c.addEventListener("click",async()=>{if(!Q)return;c.disabled=!0,c.textContent=K.t("shell.connecting");try{await Q.connect(),B(!1),c.textContent=K.t("shell.connectWallet")}catch{c.textContent=K.t("shell.retry")}finally{c.disabled=!1}}),h.onboard){let V=A("button","nq-cc-onboard",r);V.type="button",U(V,"shell.newToNimiq"),V.addEventListener("click",()=>h.onboard())}A("div","nq-cc-divider nq-cc-when-out nq-cc-when-hub",S);let hl=A("div","nq-cc-section nq-cc-wallet nq-cc-when-connected nq-cc-when-hub",S),dl=A("div","nq-cc-account",hl),Ah=A("span","nq-cc-identicon",dl),ul=A("button","nq-cc-name",dl);ul.type="button",ul.addEventListener("click",()=>G0(ul));let kl=A("div","nq-cc-balance",dl);kl.hidden=!0;let jQ=A("span","nq-cc-balance-nim",kl),Il=A("span","nq-cc-balance-fiat",kl),e=null;if(M)e=MQ(hl,{assets:h.assets,fiatTicker:()=>P,rate:Y?(V)=>h.fiat.rate(P,V):void 0,autoRefresh:!1,onSelect:k?(V)=>nQ(V):void 0});function G0(V){if(V.querySelector("input"))return;let E=V.textContent??"";V.textContent="";let H=document.createElement("input");H.className="nq-cc-name-input",H.value=E,H.maxLength=24,V.appendChild(H),H.focus(),H.select();let T=()=>{let y=H.value.trim()||E;if(V.textContent=y,y!==E){if(Q?.account)MZ(Q.account.address,y);if(C(),h.onRename)h.onRename(y)}};H.addEventListener("blur",T),H.addEventListener("keydown",(y)=>{if(y.key==="Enter")H.blur();if(y.key==="Escape")H.value=E,H.blur()})}{let V=A("div","nq-cc-actions",hl);if(k){let E=A("button","nq-cc-receive",V);E.type="button",E.insertAdjacentHTML("beforeend",eK.replace("%CLS%","nq-cc-arrow-down"));let H=A("span",void 0,E);U(H,"shell.receive"),E.addEventListener("click",()=>nQ())}{let E=A("button","nq-cc-send",V);E.type="button",E.insertAdjacentHTML("beforeend",eK.replace("%CLS%","nq-cc-arrow-up"));let H=A("span",void 0,E);U(H,"shell.send"),E.addEventListener("click",()=>{if(h.send)B(!1),h.send();else v0()})}if(h.scan){let E=A("button","nq-cc-scan",V);E.type="button",E.setAttribute("aria-label","Scan QR code"),E.insertAdjacentHTML("beforeend",l0),E.addEventListener("click",()=>{B(!1),h.scan()})}}A("div","nq-cc-divider nq-cc-when-connected nq-cc-when-hub",S);let $Q=A("div","nq-cc-section",S),Ml=A("button","nq-cc-acc",$Q);Ml.type="button",Ml.setAttribute("aria-expanded","false");let Y0=A("span","nq-cc-label",Ml);U(Y0,"shell.language");let AQ=A("span","nq-cc-acc-value",Ml),IQ=A("span",void 0,AQ),k0=A("span","nq-cc-strong",AQ);Ml.insertAdjacentHTML("beforeend",$h);let Ih=A("div","nq-cc-acc-body",$Q),JQ=A("div","nq-cc-grid-wrap",Ih),cl=A("div","nq-cc-grid nq-cc-cols-2",JQ);Q0(JQ,cl),cl.setAttribute("role","listbox"),cl.setAttribute("aria-label",K.t("shell.language"));let PQ=new Map;for(let V of Z){let E=A("button","nq-cc-card",cl);E.type="button",E.setAttribute("role","option"),A("span","nq-cc-card-art",E).appendChild(s(V.flag,{size:26}));let T=A("span","nq-cc-card-name",E);T.textContent=j(V),E.addEventListener("click",()=>{K.setLanguage(V.id),window.setTimeout(()=>Sh(Ml,Ih),260)}),PQ.set(V.id,E)}function NQ(){let V=z(K.getLanguage());IQ.textContent="",IQ.appendChild(s(V.flag,{size:24})),k0.textContent=j(V);for(let[E,H]of PQ){let T=E===V.id;H.classList.toggle("nq-cc-current",T),H.setAttribute("aria-selected",String(T))}}let il=null,Jh=null,CQ=new Map;if(Y){let V=G?" nq-cc-when-connected":"";A("div",`nq-cc-divider${V}`,S);let E=A("div",`nq-cc-section${V}`,S),H=A("button","nq-cc-acc",E);H.type="button",H.setAttribute("aria-expanded","false");let T=A("span","nq-cc-label",H);U(T,"shell.amountsIn");let y=A("span","nq-cc-acc-value",H);il=A("span",void 0,y),Jh=A("span","nq-cc-strong",y),H.insertAdjacentHTML("beforeend",$h);let v=A("div","nq-cc-acc-body",E),g=A("div","nq-cc-grid-wrap",v),p=A("div","nq-cc-grid nq-cc-cols-3",g);Q0(g,p),p.setAttribute("role","listbox"),p.setAttribute("aria-label",K.t("shell.amountsIn"));for(let n of h.fiat.currencies){let Cl=A("button","nq-cc-card",p);Cl.type="button",Cl.setAttribute("role","option");let g0=A("span","nq-cc-card-art",Cl),hK=tK[n];if(hK)g0.appendChild(s(hK,{size:26}));let m0=A("span","nq-cc-card-ticker",Cl);m0.textContent=n,Cl.addEventListener("click",()=>{if(n===P){window.setTimeout(()=>Sh(H,v),260);return}P=n;try{localStorage.setItem(oK,n)}catch{}if(_Q(),G)yl(!0);Sl=null,h.fiat.onChange?.(n),window.setTimeout(()=>Sh(H,v),260)}),CQ.set(n,Cl)}sQ(H,v)}function _Q(){if(!il||!Jh)return;il.textContent="";let V=tK[P];if(V)il.appendChild(s(V,{size:24}));Jh.textContent=P;for(let[E,H]of CQ){let T=E===P;H.classList.toggle("nq-cc-current",T),H.setAttribute("aria-selected",String(T))}}if(h.openInPay){A("div","nq-cc-divider nq-cc-when-hub",S);let V=A("button","nq-cc-row nq-cc-when-hub",S);V.type="button",V.insertAdjacentHTML("beforeend",CZ());let E=A("span","nq-cc-strong",V);U(E,"shell.openInPay"),V.addEventListener("click",()=>{B(!1);let H=h.openInPay;window.location.href=typeof H==="function"?H():H})}let Vl=h.reportBug===!1?void 0:h.reportBug??_Z();if(typeof Vl==="object"&&Vl.bot)KQ(Vl.bot.service??"https://bot.nimiq.tech");let EQ=!!Q&&h.switchAccount!==!1;if(EQ||Vl)A("div",`nq-cc-divider${Vl?"":" nq-cc-when-connected nq-cc-when-hub"}`,S);if(EQ){let V=A("button","nq-cc-row nq-cc-when-connected nq-cc-when-hub",S);V.type="button",A("span","nq-cc-cashlink-slot",V).insertAdjacentHTML("beforeend",PZ);let H=A("span","nq-cc-strong",V);U(H,"shell.switchAccount"),V.addEventListener("click",async()=>{B(!1);try{await Q.connect()}catch{}})}if(Vl){let V=A("button","nq-cc-row nq-cc-report",S);V.type="button",A("span","nq-cc-cashlink-slot",V).insertAdjacentHTML("beforeend",YQ);let H=A("span","nq-cc-strong",V);U(H,"shell.reportBug"),V.addEventListener("click",()=>{B(!1);let T=Vl;if(typeof T==="function")T();else kQ(document,K,h.theme?{...T,theme:T.theme??h.theme}:T)})}A("div","nq-cc-divider nq-cc-footer-divider",S);let FQ=A("div","nq-cc-footer",S),Ph=A("button","nq-cc-disconnect nq-cc-when-connected nq-cc-when-hub",FQ);Ph.type="button",U(Ph,"shell.disconnect"),Ph.addEventListener("click",()=>{Q?.disconnect(),B(!1)});let UQ=A("span","nq-cc-net-group",FQ),M0=A("span",void 0,UQ);U(M0,"shell.network");let V0=A("span","nq-cc-badge",UQ);V0.textContent="Testnet";function Hl(V,E,H){let T=A("div","nq-cc-view-head",V),y=A("button","nq-cc-back",T);y.type="button",y.setAttribute("aria-label",K.t("shell.back")),y.insertAdjacentHTML("beforeend",$Z);let v=A("span","nq-cc-view-title",T);U(v,E),y.addEventListener("click",H),HQ.push(y);let g=A("button","nq-cc-shut",T);return g.type="button",g.setAttribute("aria-label",K.t("shell.close")),A("span","nq-cc-shut-disc",g).insertAdjacentHTML("beforeend",jZ),g.addEventListener("click",()=>B(!1)),LQ.push(g),v}let HQ=[],LQ=[],xQ=[],DQ=[],W0=Hl(_,"shell.receive",()=>X.classList.remove("nq-cc-show-receive")),j0=A("p","nq-cc-view-sub",_);U(j0,"shell.receiveSub");let Ll=A("div","nq-cc-receive-body",_),pl=A("div","nq-cc-receive-hero",Ll);pl.hidden=!0;let Nh=A("div","nq-cc-qr",Ll),xl=A("span","nq-cc-copy-wrap",Ll),Ql=A("button","nq-cc-address",xl);Ql.type="button",Ql.title=K.t("shell.copyAddress");let OQ=A("span","nq-cc-copy-tooltip",xl);OQ.setAttribute("aria-hidden","true"),U(OQ,"shell.copied");let nl=A("div","nq-cc-receive-foot",Ll);nl.hidden=!0;let sl=A("button","nq-cc-request-open",nl);sl.type="button",U(sl,"shell.requestLink"),sl.addEventListener("click",()=>F0());let Dl=A("button","nq-cc-qr-open",nl);Dl.type="button",Dl.setAttribute("aria-label",K.t("shell.showQr")),Dl.insertAdjacentHTML("beforeend",JZ),Dl.addEventListener("click",()=>X.classList.add("nq-cc-show-qr")),DQ.push(Dl);let Ch=A("p","nq-cc-net-warn",Ll);Ch.hidden=!0;let $0=Hl(N,"shell.addressSheet",()=>X.classList.remove("nq-cc-show-qr")),_h=A("div","nq-cc-qr-body",N),A0=A("div","nq-cc-qr",_h),I0=A("p","nq-cc-qr-line",_h),J0=A("p","nq-cc-qr-scan",_h);function P0(V){let E=V.toUpperCase().match(/.{1,4}/g)??[V];if(E.length<=4)return E.join(" ");return`${E.slice(0,2).join(" ")} ••• ${E.slice(-2).join(" ")}`}let N0=Hl(F,"shell.requestTitle",()=>X.classList.remove("nq-cc-show-request")),Ol=A("div","nq-cc-request-body",F),C0=A("label","nq-cc-field-label",Ol);U(C0,"shell.amount");let TQ=A("div","nq-cc-amount-row",Ol),Jl=A("input","nq-cc-input",TQ);Jl.placeholder="0",Jl.inputMode="decimal",Jl.autocomplete="off";let _0=A("span","nq-cc-amount-suffix",TQ);_0.textContent="NIM";let E0=A("p","nq-cc-request-hint",Ol);U(E0,"shell.anyAmount");let SQ=A("p","nq-cc-request-link",Ol),al=A("span","nq-cc-copy-wrap",Ol),Eh=A("button","nq-cc-request-copy",al);Eh.type="button",U(Eh,"shell.copyLink");let fQ=A("span","nq-cc-copy-tooltip",al);fQ.setAttribute("aria-hidden","true"),U(fQ,"shell.copied");function wQ(){let V=rl??Q?.account?.address;if(!V)return;let E=Number(Jl.value.replace(",",".")),H=Number.isFinite(E)&&E>0?Yh(E):0n;SQ.textContent=fK(V,{amountLuna:H,basePath:h.requestLinkBase})}Jl.addEventListener("input",wQ);function F0(){if(!Q?.account)return;Jl.value="",wQ(),N0.textContent=K.t("shell.requestTitle",{ticker:"NIM"}),X.classList.add("nq-cc-show-request")}let yQ;Eh.addEventListener("click",()=>{let V=SQ.textContent;if(!V)return;try{navigator.clipboard.writeText(V)}catch{}al.classList.add("nq-cc-copied"),clearTimeout(yQ),yQ=setTimeout(()=>al.classList.remove("nq-cc-copied"),1200)});let rl=null,RQ;Ql.addEventListener("click",()=>{let V=rl??Q?.account?.address;if(!V)return;try{navigator.clipboard.writeText(V)}catch{}xl.classList.add("nq-cc-copied","nq-cc-copied-hold"),clearTimeout(RQ),RQ=setTimeout(()=>xl.classList.remove("nq-cc-copied"),800)}),Ql.addEventListener("blur",()=>xl.classList.remove("nq-cc-copied-hold")),Hl(D,"shell.sendTransaction",()=>Th());let Tl=A("div","nq-cc-sendto-body",D),Fh=A("div","nq-cc-field-head",Tl),Uh=A("span","nq-cc-recipient-icon",Fh),U0=A("label","nq-cc-eyebrow",Fh);U(U0,"shell.enterAddress");let qQ=A("div","nq-cc-addr-field",Tl);A("span","nq-cc-addr-rules",qQ);let b=A("textarea","nq-cc-addr-input",qQ);b.rows=3,b.placeholder="NQ",b.autocomplete="off",b.spellcheck=!1,b.setAttribute("aria-label",K.t("shell.recipient")),b.addEventListener("input",()=>aK(b)),b.addEventListener("keydown",(V)=>{if(V.key==="Enter")V.preventDefault()});let Pl=A("div","nq-cc-contacts-band",Tl);Pl.hidden=!0;let vQ=A("div","nq-cc-book",Pl);vQ.insertAdjacentHTML("beforeend",IZ);let H0=A("span","nq-cc-book-label",vQ);U(H0,"shell.contacts"),A("div","nq-cc-contacts-rule",Pl);let ol=A("div","nq-cc-contacts",Pl);ol.hidden=!0,Tl.insertBefore(Pl,Fh);let tl=A("div","nq-cc-sendto-foot",Tl);if(tl.hidden=!h.createCashlink&&!h.scan,h.createCashlink){let V=A("p","nq-cc-unavailable",tl);U(V,"shell.addressUnavailable");let E=A("button","nq-cc-request-open",tl);E.type="button",U(E,"shell.createCashlink"),E.addEventListener("click",()=>{B(!1),h.createCashlink()})}if(h.scan){let V=A("button","nq-cc-scan-open",tl);V.type="button",V.setAttribute("aria-label","Scan QR code"),V.insertAdjacentHTML("beforeend",l0),V.addEventListener("click",()=>{B(!1),h.scan()})}async function L0(V){let E=h.contacts?.add;if(!E)return;let H=V.replace(/\s+/g,"").toUpperCase();try{if((await h.contacts.list()??[]).some((v)=>v.address.replace(/\s+/g,"").toUpperCase()===H))return;let y=window.prompt(K.t("shell.saveContact"))?.trim();if(!y)return;await E({label:y,address:V,asset:"NIM"})}catch{}}async function x0(){if(!h.contacts)return;let V=[];try{V=await h.contacts.list()??[]}catch{V=[]}let E=V.filter((T)=>(T.asset??"NIM")==="NIM");ol.textContent="";let H=E.slice(0,3);ol.hidden=H.length===0,Pl.hidden=H.length===0;for(let T of H){let y=A("button","nq-cc-contact",ol);y.type="button",y.title=T.address;let v=A("span","nq-cc-contact-icon",y);if(h.identicon)v.appendChild(h.identicon(T.address,40));else v.insertAdjacentHTML("beforeend",WQ);let g=A("span","nq-cc-contact-name",y);g.textContent=T.label,y.addEventListener("click",()=>{b.value=jh(T.address),fl(),b.focus(),b.setSelectionRange(0,0),pQ()})}}Hl(w,"shell.sendAmount",()=>{X.classList.remove("nq-cc-show-send"),X.classList.add("nq-cc-show-sendto")});let Kl=A("div","nq-cc-send-body",w),Hh=A("div","nq-cc-parties",Kl),BQ=A("div","nq-cc-party",Hh),bQ=A("span","nq-cc-party-icon",BQ),D0=A("span","nq-cc-party-name",BQ);A("span","nq-cc-party-dash",Hh);let gQ=A("div","nq-cc-party",Hh),mQ=A("span","nq-cc-party-icon",gQ),O0=A("span","nq-cc-party-name nq-cc-mono",gQ),T0=A("label","nq-cc-field-label",Kl);U(T0,"shell.amount");let dQ=A("div","nq-cc-amount-row",Kl),Wl=A("input","nq-cc-input",dQ);Wl.placeholder="0",Wl.inputMode="decimal",Wl.autocomplete="off";let S0=A("span","nq-cc-amount-suffix",dQ);S0.textContent="NIM";let Lh=A("p","nq-cc-send-fiat",Kl),o=A("input","nq-cc-message",Kl);o.type="text",o.autocomplete="off",o.placeholder=K.t("shell.publicMessage"),xQ.push(o),o.addEventListener("input",()=>{while(YZ(o.value)>64)o.value=[...o.value].slice(0,-1).join("")});let f0=A("p","nq-cc-send-hint",Kl),xh=A("p","nq-cc-send-error",Kl),jl=A("button","nq-cc-send-confirm",Kl);jl.type="button",U(jl,"shell.send");let uQ=A("div","nq-cc-send-done",w);uQ.insertAdjacentHTML("beforeend",'<svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M7.5 12.5l3 3 6-6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>');let w0=A("span",void 0,uQ);U(w0,"shell.sent");let cQ=/^NQ\d{2}[0-9A-HJ-NP-VXY]{32}$/,iQ="";function y0(V){if(!h.identicon||iQ===(V??""))return;if(iQ=V??"",Uh.textContent="",Uh.style.visibility=V?"":"hidden",V)Uh.appendChild(h.identicon(V,36))}let Nl=()=>Wh(b.value),Dh=()=>{let V=Number(Wl.value.replace(",","."));return Number.isFinite(V)?V:0},Sl=null;function Oh(V){if(!Y||Sl===null){Lh.hidden=!0;return}Lh.hidden=!1,Lh.textContent=Al(V*Sl,P)}async function R0(){if(!Y){Oh(0);return}try{Sl=await h.fiat.rate(P)}catch{Sl=null}Oh(Dh())}function fl(){let V=cQ.test(Nl());y0(V?Nl():null);let E=Dh();Oh(E);let H=E>0&&(i===null||E<=El(i));jl.disabled=!(V&&H)}b.addEventListener("input",fl),Wl.addEventListener("input",fl);function q0(){let V=Q?.account;if(!V)return;D0.textContent=V.label||jh(V.address).slice(0,9);let E=Nl().match(/.{1,4}/g)??[];if(O0.textContent=E.slice(0,3).join(" "),!h.identicon)return;bQ.textContent="",bQ.appendChild(h.identicon(V.address,56)),mQ.textContent="",mQ.appendChild(h.identicon(Nl(),56))}function pQ(){if(!cQ.test(Nl()))return;if(X.classList.contains("nq-cc-show-send"))return;q0(),X.classList.remove("nq-cc-show-sendto"),X.classList.add("nq-cc-show-send"),Wl.focus()}b.addEventListener("input",pQ);function v0(){if(!Q?.account)return;xh.textContent="",w.classList.remove("nq-cc-sent"),f0.textContent=i!==null?`${K.t("shell.available")}: ${Gh(i)} NIM`:"",fl(),R0(),X.classList.add("nq-cc-show-sendto"),x0()}function Th(){X.classList.remove("nq-cc-show-send"),X.classList.remove("nq-cc-show-sendto")}jl.addEventListener("click",async()=>{if(!Q)return;let E=Nl().replace(/(.{4})(?=.)/g,"$1 ");jl.disabled=!0,xh.textContent="",jl.textContent=K.t("shell.sending");try{let H=o.value.trim();if(await Q.pay({recipient:E,valueLuna:Yh(Dh()),...H?{data:H}:{}}))w.classList.add("nq-cc-sent"),L0(E),b.value="",Wl.value="",el=0,window.setTimeout(()=>{Th(),yl(!0)},1800);else Th()}catch(H){if(!/cancel|denied|rejected|closed|dismiss/i.test(String(H)))xh.textContent=K.t("shell.sendFailed")}finally{jl.textContent=K.t("shell.send"),o.value="",fl()}});let wl="",Zl=null;m=()=>{let V=Zl?Zl.ticker:"NIM";W0.textContent=`${K.t("shell.receive")} ${V}`,$0.textContent=K.t("shell.addressSheet",{ticker:V}),J0.textContent=K.t("shell.scanToSend",{ticker:V}),Ch.hidden=!Zl,Ch.textContent=Zl?K.t("shell.networkOnly",{ticker:Zl.ticker,network:Zl.network}):""};function nQ(V){let E=Q?.account??null;if(!E)return;if(V&&!V.address)return;let H=V?.address??E.address;if(!H)return;X.classList.add("nq-cc-show-receive");let T=H.replace(/\s+/g,"");rl=T,Ql.textContent="";let y=Z0(T);Ql.style.setProperty("--nq-cc-addr-cols",String(y.columns));for(let p of y.cells){let n=A("span",void 0,Ql);n.textContent=p}Zl=V??null,m();let v=!!h.identicon;if(pl.hidden=!v,nl.hidden=!v,sl.hidden=!!V,Nh.hidden=v,v)pl.textContent="",pl.appendChild(h.identicon(H,100));I0.textContent=P0(T);let g=V?V.uri?.(T)??T:`nimiq:${T}`;if(wl!==g){let p=v?A0:Nh,n=v?200:164;try{p.textContent="",p.appendChild(h.qr?h.qr(g,n):sK(g,n,p)),wl=g}catch{p.textContent="",wl=""}}}function sQ(V,E){V.addEventListener("click",()=>{let H=E.classList.toggle("nq-cc-open");V.setAttribute("aria-expanded",String(H))})}function Sh(V,E){E.classList.remove("nq-cc-open"),V.setAttribute("aria-expanded","false")}sQ(Ml,Ih);let el=0,i=null;async function yl(V=!1){let E=Q?.account??null;if(!G||!E)return;if(e){await e.refresh(V);let T=e.total();kl.hidden=T===null,jQ.textContent=T===null?"":Al(T,P),Il.hidden=!0;let y=e.units("NIM");if(y!==null)i=Number(y);if(!W)return}let H=Date.now();if(!V&&H-el<30000&&i!==null){aQ();return}try{i=await W(E.address),el=H}catch{}if(aQ(),Y&&!e&&i!==null)try{let T=await h.fiat.rate(P);if(T!==null&&Q?.account)Il.textContent=Al(El(i)*T,P),Il.hidden=!1;else Il.hidden=!0}catch{Il.hidden=!0}}function aQ(){if(e)return;if(i===null){kl.hidden=!0;return}if(kl.hidden=!1,jQ.textContent=`${Gh(i)} NIM`,!Y)Il.hidden=!0}function rQ(){let V=Q?.account??null;if(!V)return;if(Ah.textContent="",h.identicon)Ah.appendChild(h.identicon(V.address,40));else Ah.innerHTML=WQ;ul.textContent=h0(V,K.t("shell.account")),wl="",yl()}function fh(){J.style.setProperty("--nq-cc-menu-shift","0px");let V=J.getBoundingClientRect(),E=K0(V.left,V.right,window.innerWidth);if(E)J.style.setProperty("--nq-cc-menu-shift",`${E}px`)}function B(V){if(J.hidden=!V,I.setAttribute("aria-expanded",String(V)),$.setAttribute("aria-expanded",String(V)),V)fh(),window.addEventListener("resize",fh),document.addEventListener("click",oQ,!0),document.addEventListener("keydown",tQ),yl();else X.classList.remove("nq-cc-show-receive"),X.classList.remove("nq-cc-show-qr"),X.classList.remove("nq-cc-show-request"),X.classList.remove("nq-cc-show-sendto"),X.classList.remove("nq-cc-show-send"),window.removeEventListener("resize",fh),document.removeEventListener("click",oQ,!0),document.removeEventListener("keydown",tQ)}function oQ(V){if(!X.contains(V.target))B(!1)}function tQ(V){if(V.key==="Escape")B(!1)}let eQ=()=>B(J.hidden);if(I.addEventListener("click",eQ),$.addEventListener("click",eQ),C(),L(),NQ(),_Q(),Y)h.fiat.onChange?.(P);if(Q?.account)rQ();let lK=Q?.account?.address??null,B0=Q?Q.onAccountChange(()=>{let V=Q.account?.address??null;if(V!==lK)lK=V,i=null,el=0,e?.clear(),X.classList.remove("nq-cc-show-receive"),Zl=null,rl=null,wl="",Ql.textContent="",Nh.textContent="";if(C(),Q.account)rQ(),yl(!0);else kl.hidden=!0}):()=>{},b0=K.onChange(()=>{a();for(let V of HQ)V.setAttribute("aria-label",K.t("shell.back"));for(let V of LQ)V.setAttribute("aria-label",K.t("shell.close"));for(let V of DQ)V.setAttribute("aria-label",K.t("shell.showQr"));for(let V of xQ)V.placeholder=K.t("shell.publicMessage");NQ(),L(),C()});return{el:X,get fiatTicker(){return Y?P:null},open:()=>B(!0),close:()=>B(!1),destroy(){B0(),b0(),B(!1),e?.destroy(),X.remove()}}}var EZ=X0;export{mK as validateFeedbackInput,vK as themeVars,gK as submitToBot,dK as submitFeedback,x1 as shellLocales,ml as scrubAddresses,_1 as parseNim,ZQ as pageContext,kQ as openReportBugSheet,Yh as nimToLuna,p1 as mountWalletPill,lQ as mountProfileWidget,X0 as mountMiniWallet,B1 as mountLanguageSwitcher,m1 as mountLanguagePill,EZ as mountCornerControl,MQ as mountAssetList,D1 as mergeLocales,K0 as menuShift,El as lunaToNim,wh as isMiniAppHost,KQ as installReportCapture,yh as hasNimiqProvider,Xh as fmtUnits,Gh as fmtNim,Al as fmtFiat,oh as flagDataUrl,kh as donutPoint,w1 as donutArcs,lh as detectModeSync,GQ as defaultReportBugRepo,W1 as createWallet,ah as createNimBalanceReader,L1 as createI18n,uK as collectDiagnostics,s as buildFlagHex,f1 as areaPaths,Ul as applyTheme,Z0 as addressGrid,rh as SHELL_LANGUAGES,I1 as NIM_DECIMALS,ql as MiniAppBackend,A1 as LUNA_PER_NIM,Bl as HubBackend,LK as FLAG_SVG,th as FLAG_FIT,bl as FEATURED_LANGUAGES,j1 as DEFAULT_NIM_RPC};
