var P1=Object.defineProperty;var I1=(Q)=>Q;function M1(Q,Z){this[Q]=I1.bind(null,Z)}var K0=(Q,Z)=>{for(var z in Z)P1(Q,z,{get:Z[z],enumerable:!0,configurable:!0,set:M1.bind(Z,z)})};var _Q=(Q,Z)=>()=>(Q&&(Z=Q(Q=0)),Z);var F1=((Q)=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(Q,{get:(Z,z)=>(typeof require<"u"?require:Z)[z]}):Q)(function(Q){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+Q+'" is not supported')});var V0={};K0(V0,{requestDeviceIdentifier:()=>E1,init:()=>N1,getHostLanguage:()=>C1});function N1(Q){return window.nimiq?Promise.resolve(window.nimiq):new Promise((Z,z)=>{let X=Q?.timeout??1e4,K=setTimeout(()=>{clearInterval(Y),z(Error("Nimiq provider was not injected. Are you running inside a Nimiq app?"))},X),Y=setInterval(()=>{window.nimiq&&(clearTimeout(K),clearInterval(Y),Z(window.nimiq))},50)})}function C1(){return typeof window>"u"?void 0:window.nimiqPay?.language}function E1(Q){return typeof window>"u"||!window.nimiqPay?.requestDeviceIdentifier?Promise.reject(Error("requestDeviceIdentifier is unavailable. Are you running inside Nimiq Pay?")):window.nimiqPay.requestDeviceIdentifier(Q)}var W0=()=>{};class L{static byteLength(Q){let[Z,z]=L._getLengths(Q);return L._byteLength(Z,z)}static decode(Q){L._initRevLookup();let[Z,z]=L._getLengths(Q),X=new Uint8Array(L._byteLength(Z,z)),K=0,Y=z>0?Z-4:Z,V=0;for(;V<Y;V+=4){let W=L._revLookup[Q.charCodeAt(V)]<<18|L._revLookup[Q.charCodeAt(V+1)]<<12|L._revLookup[Q.charCodeAt(V+2)]<<6|L._revLookup[Q.charCodeAt(V+3)];X[K++]=W>>16&255,X[K++]=W>>8&255,X[K++]=W&255}if(z===2){let W=L._revLookup[Q.charCodeAt(V)]<<2|L._revLookup[Q.charCodeAt(V+1)]>>4;X[K++]=W&255}if(z===1){let W=L._revLookup[Q.charCodeAt(V)]<<10|L._revLookup[Q.charCodeAt(V+1)]<<4|L._revLookup[Q.charCodeAt(V+2)]>>2;X[K++]=W>>8&255,X[K]=W&255}return X}static encode(Q){let Z=Q.length,z=Z%3,X=[],K=16383;for(let Y=0,V=Z-z;Y<V;Y+=16383)X.push(L._encodeChunk(Q,Y,Y+16383>V?V:Y+16383));if(z===1){let Y=Q[Z-1];X.push(L._lookup[Y>>2]+L._lookup[Y<<4&63]+"==")}else if(z===2){let Y=(Q[Z-2]<<8)+Q[Z-1];X.push(L._lookup[Y>>10]+L._lookup[Y>>4&63]+L._lookup[Y<<2&63]+"=")}return X.join("")}static encodeUrl(Q){return L.encode(Q).replace(/\//g,"_").replace(/\+/g,"-").replace(/=/g,".")}static decodeUrl(Q){return L.decode(Q.replace(/_/g,"/").replace(/-/g,"+").replace(/\./g,"="))}static _initRevLookup(){if(L._revLookup.length!==0)return;L._revLookup=[];for(let Q=0,Z=L._lookup.length;Q<Z;Q++)L._revLookup[L._lookup.charCodeAt(Q)]=Q;L._revLookup[45]=62,L._revLookup[95]=63}static _getLengths(Q){let Z=Q.length;if(Z%4>0)throw Error("Invalid string. Length must be a multiple of 4");let z=Q.indexOf("=");if(z===-1)z=Z;let X=z===Z?0:4-z%4;return[z,X]}static _byteLength(Q,Z){return(Q+Z)*3/4-Z}static _tripletToBase64(Q){return L._lookup[Q>>18&63]+L._lookup[Q>>12&63]+L._lookup[Q>>6&63]+L._lookup[Q&63]}static _encodeChunk(Q,Z,z){let X=[];for(let K=Z;K<z;K+=3){let Y=(Q[K]<<16&16711680)+(Q[K+1]<<8&65280)+(Q[K+2]&255);X.push(L._tripletToBase64(Y))}return X.join("")}}class h{static stringify(Q){return JSON.stringify(Q,h._jsonifyType)}static parse(Q){return JSON.parse(Q,h._parseType)}static _parseType(Q,Z){if(Z&&Z.hasOwnProperty&&Z.hasOwnProperty(h.TYPE_SYMBOL)&&Z.hasOwnProperty(h.VALUE_SYMBOL))switch(Z[h.TYPE_SYMBOL]){case qQ.UINT8_ARRAY:return L.decode(Z[h.VALUE_SYMBOL])}return Z}static _jsonifyType(Q,Z){if(Z instanceof Uint8Array)return h._typedObject(qQ.UINT8_ARRAY,L.encode(Z));return Z}static _typedObject(Q,Z){let z={};return z[h.TYPE_SYMBOL]=Q,z[h.VALUE_SYMBOL]=Z,z}}class YZ{static generateRandomId(){let Q=new Uint32Array(1);return crypto.getRandomValues(Q),Q[0]}}class QQ{constructor(Q=!0){if(this._store=Q?window.sessionStorage:null,this._validIds=new Map,Q)this._restoreIds()}static _decodeIds(Q){let Z=h.parse(Q),z=new Map;for(let X of Object.keys(Z)){let K=parseInt(X,10);z.set(isNaN(K)?X:K,Z[X])}return z}has(Q){return this._validIds.has(Q)}getCommand(Q){let Z=this._validIds.get(Q);return Z?Z[0]:null}getState(Q){let Z=this._validIds.get(Q);return Z?Z[1]:null}add(Q,Z,z=null){this._validIds.set(Q,[Z,z]),this._storeIds()}remove(Q){this._validIds.delete(Q),this._storeIds()}clear(){if(this._validIds.clear(),this._store)this._store.removeItem(QQ.KEY)}_encodeIds(){let Q=Object.create(null);for(let[Z,z]of this._validIds)Q[Z]=z;return h.stringify(Q)}_restoreIds(){let Q=this._store.getItem(QQ.KEY);if(Q)this._validIds=QQ._decodeIds(Q)}_storeIds(){if(this._store)this._store.setItem(QQ.KEY,this._encodeIds())}}class i{static receiveRedirectCommand(Q){let Z=new URL(Q.href);if(!document.referrer)return null;let z=new URL(document.referrer),X=new URLSearchParams(Z.search),K=new URLSearchParams(Z.hash.substring(1));if(!K.has("id"))return null;let Y=parseInt(K.get("id"),10);if(K.delete("id"),X.set(i.URL_SEARCHPARAM_NAME,Y.toString()),!K.has("command"))return null;let V=K.get("command");if(K.delete("command"),!K.has("returnURL"))return null;let W=K.get("returnURL");K.delete("returnURL");let $=m.HTTP_GET;if(K.has("responseMethod")){if($=K.get("responseMethod"),K.delete("responseMethod"),!Object.values(m).includes($))throw Error("Invalid ResponseMethod")}if(!($===m.POST_MESSAGE&&(window.opener||window.parent))&&new URL(W).origin!==z.origin)return null;let N=[];if(K.has("args"))try{N=h.parse(K.get("args"))}catch(A){}return N=Array.isArray(N)?N:[],K.delete("args"),Z.search=X.toString(),this._setUrlFragment(Z,K),history.replaceState(history.state,"",Z.href),{origin:z.origin,data:{id:Y,command:V,args:N},returnURL:W,responseMethod:$,source:$===m.POST_MESSAGE?window.opener||window.parent:null}}static receiveRedirectResponse(Q){let Z=new URL(Q.href);if(!document.referrer)return null;let z=new URL(document.referrer),X=new URLSearchParams(Z.search),K=new URLSearchParams(Z.hash.substring(1));if(!K.has("id"))return null;let Y=parseInt(K.get("id"),10);if(K.delete("id"),X.set(i.URL_SEARCHPARAM_NAME,Y.toString()),!K.has("status"))return null;let V=K.get("status")===n.OK?n.OK:n.ERROR;if(K.delete("status"),!K.has("result"))return null;let W=h.parse(K.get("result"));return K.delete("result"),Z.search=X.toString(),this._setUrlFragment(Z,K),history.replaceState(history.state,"",Z.href),{origin:z.origin,data:{id:Y,status:V,result:W}}}static prepareRedirectReply(Q,Z,z){let X=new URL(Q.returnURL),K=new URLSearchParams(X.hash.substring(1));return K.set("id",Q.id.toString()),K.set("status",Z),K.set("result",h.stringify(z)),X.hash=K.toString(),X.href}static prepareRedirectInvocation(Q,Z,z,X,K,Y){let V=new URL(Q),W=new URLSearchParams(V.hash.substring(1));if(W.set("id",Z.toString()),W.set("returnURL",z),W.set("command",X),W.set("responseMethod",Y),Array.isArray(K))W.set("args",h.stringify(K));return V.hash=W.toString(),V.href}static _setUrlFragment(Q,Z){if(Z.toString().endsWith("="))Q.hash=Z.toString().slice(0,-1);else Q.hash=Z.toString()}}class VZ{constructor(Q,Z=!1){this._allowedOrigin=Q,this._waitingRequests=new QQ(Z),this._responseHandlers=new Map,this._preserveRequests=!1}onResponse(Q,Z,z){this._responseHandlers.set(Q,{resolve:Z,reject:z})}_receive(Q){if(!Q.data||!Q.data.status||!Q.data.id||this._allowedOrigin!=="*"&&Q.origin!==this._allowedOrigin)return!1;let Z=Q.data,z=this._getCallback(Z.id),X=this._waitingRequests.getState(Z.id);if(z){if(!this._preserveRequests)this._waitingRequests.remove(Z.id),this._responseHandlers.delete(Z.id);if(console.debug("RpcClient RECEIVE",Z),Z.status===n.OK)z.resolve(Z.result,Z.id,X);else if(Z.status===n.ERROR){let K=Error(Z.result.message);if(Z.result.stack)K.stack=Z.result.stack;if(Z.result.name)K.name=Z.result.name;z.reject(K,Z.id,X)}return!0}else return console.warn("Unknown RPC response:",Z),!1}_getCallback(Q){if(this._responseHandlers.has(Q))return this._responseHandlers.get(Q);else{let Z=this._waitingRequests.getCommand(Q);if(Z)return this._responseHandlers.get(Z)}return}}var qQ,m,n,bQ,wQ;var G0=_Q(()=>{L._lookup="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";L._revLookup=[];(function(Q){Q[Q.UINT8_ARRAY=0]="UINT8_ARRAY"})(qQ||(qQ={}));h.TYPE_SYMBOL="__";h.VALUE_SYMBOL="v";(function(Q){Q.HTTP_POST="http-post",Q.HTTP_GET="http-get",Q.POST_MESSAGE="post-message"})(m||(m={}));(function(Q){Q.OK="ok",Q.ERROR="error"})(n||(n={}));QQ.KEY="rpcRequests";i.URL_SEARCHPARAM_NAME="rpcId";bQ=class bQ extends VZ{constructor(Q,Z){super(Z);this._serverCloseCheckInterval=-1,this._target=Q,this._connectionState=0,this._receiveListener=this._receive.bind(this)}async init(){if(this._connectionState===2)return;if(await this._connect(),window.addEventListener("message",this._receiveListener),this._serverCloseCheckInterval!==-1)return;this._serverCloseCheckInterval=window.setInterval(()=>this._checkIfServerClosed(),300)}async call(Q,...Z){return this._call({command:Q,args:Z,id:YZ.generateRandomId()})}close(){this._connectionState=0,window.removeEventListener("message",this._receiveListener),window.clearInterval(this._serverCloseCheckInterval),this._serverCloseCheckInterval=-1;for(let[Q,{reject:Z}]of this._responseHandlers){let z=this._waitingRequests.getState(Q);Z("Connection was closed",typeof Q==="number"?Q:void 0,z)}if(this._waitingRequests.clear(),this._responseHandlers.clear(),this._target&&this._target.closed)this._target=null}_receive(Q){if(Q.source!==this._target)return!1;return super._receive(Q)}async _call(Q){if(!this._target||this._target.closed)throw Error("Connection was closed.");if(this._connectionState!==2)throw Error("Client is not connected, call init first");return new Promise((Z,z)=>{this._responseHandlers.set(Q.id,{resolve:Z,reject:z}),this._waitingRequests.add(Q.id,Q.command),console.debug("RpcClient REQUEST",Q.command,Q.args),this._target.postMessage(Q,this._allowedOrigin)})}_connect(){if(this._connectionState===2)return;return this._connectionState=1,new Promise((Q,Z)=>{let z=(K)=>{let{source:Y,origin:V,data:W}=K;if(Y!==this._target||W.status!==n.OK||W.result!=="pong"||W.id!==1||this._allowedOrigin!=="*"&&V!==this._allowedOrigin)return;if(W.result.stack){let $=Error(W.result.message);if($.stack=W.result.stack,W.result.name)$.name=W.result.name;console.error($)}window.removeEventListener("message",z),this._connectionState=2,console.log("RpcClient: Connection established"),Q(!0)};window.addEventListener("message",z);let X=()=>{if(this._connectionState===2)return;if(this._connectionState===0||this._checkIfServerClosed()){window.removeEventListener("message",z),Z(Error("Connection was closed"));return}try{this._target.postMessage({command:"ping",id:1},this._allowedOrigin)}catch(K){console.error(`postMessage failed: ${K}`)}window.setTimeout(X,100)};window.setTimeout(X,100)})}_checkIfServerClosed(){if(this._target&&!this._target.closed)return!1;return this.close(),!0}};wQ=class wQ extends VZ{constructor(Q,Z,z=!0){super(Z,!0);this._target=Q,this._preserveRequests=z}async init(){let Q=i.receiveRedirectResponse(window.location);if(Q){this._receive(Q);return}if(this._rejectOnBack())return;let Z=new URLSearchParams(window.location.search);if(Z.has(i.URL_SEARCHPARAM_NAME)){let z=window.sessionStorage.getItem(`response-${Z.get(i.URL_SEARCHPARAM_NAME)}`);if(z){this._receive(h.parse(z),!1);return}}}close(){}call(Q,Z,z,...X){if(!z||typeof z==="boolean"){if(typeof z==="boolean")console.warn("RedirectRpcClient.call(string, string, boolean, any[]) is deprecated. Use RedirectRpcClient.call(string, string, CallOptions, any[]) with an appropriate CallOptions object instead.");this._call(Q,Z,{responseMethod:m.HTTP_GET,handleHistoryBack:!!z},...X)}else if(typeof z==="object"){if(z.responseMethod===m.POST_MESSAGE)if(!window.opener&&!window.parent)throw Error("Window has no opener or parent, responseMethod: ResponseMethod.POST_MESSAGE would fail.");else console.warn("Response will skip at least one rpc call, which will result in an unknown response.");this._call(Q,Z,z,...X)}}callAndSaveLocalState(Q,Z,z,X=!1,...K){console.warn("RedirectRpcClient.callAndSaveLocalState() is deprecated. Use RedirectRpcClient.call() with an apropriate CallOptions object instead."),this._call(Q,z,{responseMethod:m.HTTP_GET,state:Z?Z:void 0,handleHistoryBack:X},...K)}_receive(Q,Z=!0){let z=super._receive(Q);if(z&&Z)window.sessionStorage.setItem(`response-${Q.data.id}`,h.stringify(Q));return z}_call(Q,Z,z,...X){let K=YZ.generateRandomId(),Y=z.responseMethod||m.HTTP_GET,V=i.prepareRedirectInvocation(this._target,K,Q,Z,X,Y);if(this._waitingRequests.add(K,Z,z.state||null),z.handleHistoryBack)history.replaceState(Object.assign({},history.state,{rpcBackRejectionId:K}),"");console.debug("RpcClient REQUEST",Z,X),window.location.href=V}_rejectOnBack(){if(!history.state||!history.state.rpcBackRejectionId)return!1;let Q=history.state.rpcBackRejectionId;history.replaceState(Object.assign({},history.state,{rpcBackRejectionId:null}),"");let Z=this._getCallback(Q),z=this._waitingRequests.getState(Q);if(Z){if(!this._preserveRequests)this._waitingRequests.remove(Q),this._responseHandlers.delete(Q);console.debug("RpcClient BACK");let X=Error("Request aborted");return Z.reject(X,Q,z),!0}return!1}}});class E{static getBrowserInfo(){return{browser:E.detectBrowser(),version:E.detectVersion(),isMobile:E.isMobile()}}static isMobile(){return/i?Phone|iP(ad|od)|Android|BlackBerry|Opera Mini|WPDesktop|Mobi(le)?|Silk/i.test(navigator.userAgent)}static detectBrowser(){if(E._detectedBrowser)return E._detectedBrowser;let Q=navigator.userAgent;if(/Edge\//i.test(Q))E._detectedBrowser=E.Browser.EDGE;else if(/(Opera|OPR)\//i.test(Q))E._detectedBrowser=E.Browser.OPERA;else if(/Firefox\//i.test(Q))E._detectedBrowser=E.Browser.FIREFOX;else if(/Chrome\//i.test(Q))E._detectedBrowser=navigator.plugins.length===0&&navigator.mimeTypes.length===0&&!E.isMobile()?E.Browser.BRAVE:E.Browser.CHROME;else if(/^((?!chrome|android).)*safari/i.test(Q))E._detectedBrowser=E.Browser.SAFARI;else E._detectedBrowser=E.Browser.UNKNOWN;return E._detectedBrowser}static detectVersion(){if(typeof E._detectedVersion<"u")return E._detectedVersion;let Q;switch(E.detectBrowser()){case E.Browser.EDGE:Q=/Edge\/(\S+)/i;break;case E.Browser.OPERA:Q=/(Opera|OPR)\/(\S+)/i;break;case E.Browser.FIREFOX:Q=/Firefox\/(\S+)/i;break;case E.Browser.CHROME:Q=/Chrome\/(\S+)/i;break;case E.Browser.SAFARI:Q=/(iP(hone|ad|od).*?OS |Version\/)(\S+)/i;break;case E.Browser.BRAVE:default:return E._detectedVersion=null,null}let Z=navigator.userAgent.match(Q);if(!Z)return E._detectedVersion=null,null;let z=Z[Z.length-1].replace(/_/g,"."),X=z.split("."),K=[];for(let J=0;J<4;++J)K.push(parseInt(X[J],10)||0);let[Y,V,W,$]=K;return E._detectedVersion={versionString:z,major:Y,minor:V,build:W,patch:$},E._detectedVersion}static isChrome(){return E.detectBrowser()===E.Browser.CHROME}static isFirefox(){return E.detectBrowser()===E.Browser.FIREFOX}static isOpera(){return E.detectBrowser()===E.Browser.OPERA}static isEdge(){return E.detectBrowser()===E.Browser.EDGE}static isSafari(){return E.detectBrowser()===E.Browser.SAFARI}static isBrave(){return E.detectBrowser()===E.Browser.BRAVE}static isIOS(){return/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream}static isBadIOS(){let Q=E.getBrowserInfo();return Q.browser===E.Browser.SAFARI&&Q.isMobile&&Q.version&&(Q.version.major<11||Q.version.major===11&&Q.version.minor===2)}static isPrivateMode(){return new Promise((Q)=>{let Z=()=>Q(!0),z=()=>Q(!1),X=()=>/Constructor/.test(window.HTMLElement)||window.safari&&window.safari.pushNotification&&window.safari.pushNotification.toString()==="[object SafariRemoteNotification]";if(window.webkitRequestFileSystem){window.webkitRequestFileSystem(0,0,z,Z);return}if(document.documentElement&&"MozAppearance"in document.documentElement.style){let K=indexedDB.open(null);K.onerror=Z,K.onsuccess=z;return}if(X())try{window.openDatabase(null,null,null,null)}catch(K){Z();return}if(!window.indexedDB&&(window.PointerEvent||window.MSPointerEvent)){Z();return}z()})}static _detectedBrowser;static _detectedVersion}var WZ;var $0=_Q(()=>{(function(Q){(function(Z){Z.CHROME="chrome",Z.FIREFOX="firefox",Z.OPERA="opera",Z.EDGE="edge",Z.SAFARI="safari",Z.BRAVE="brave",Z.UNKNOWN="unknown"})(Q.Browser||(Q.Browser={}))})(E||(E={}));WZ=E});var j0=_Q(()=>{$0()});var J0={};K0(J0,{default:()=>b});function w1(Q,Z){if(!Z){let z=document.cookie.match(/(^| )lang=([^;]+)/);Z=z&&z[2]||navigator.language.split("-")[0]}return(b1[Z]||GZ)[Q]||GZ[Q]}class r{static getAllowedOrigin(Q){return new URL(Q).origin}constructor(Q){this._type=Q}async request(Q,Z,z){throw Error("Not implemented")}}class b{static get PaymentMethod(){return console.warn("PaymentMethod has been renamed to PaymentType. Access via HubApi.PaymentMethod will soon get disabled. Use HubApi.PaymentType instead."),RQ}static get DEFAULT_ENDPOINT(){let Q=location.hostname.match(/(?:[^.]+\.[^.]+|localhost)$/),Z=Q?Q[0]:location.hostname;switch(Z){case"nimiq.com":case"nimiq-testnet.com":return`https://hub.${Z}`;case"bs-local.com":return`${window.location.protocol}//bs-local.com:8080`;default:return"http://localhost:8080"}}constructor(Q=b.DEFAULT_ENDPOINT,Z){this._endpoint=Q,this._defaultBehavior=Z||new o(`left=${window.innerWidth/2-400},top=75,width=800,height=850,location=yes,dependent=yes`),this._checkoutDefaultBehavior=Z||new o(`left=${window.innerWidth/2-400},top=50,width=800,height=895,location=yes,dependent=yes`),this._iframeBehavior=new IQ,this._redirectClient=new wQ("",r.getAllowedOrigin(this._endpoint))}checkRedirectResponse(){return this._redirectClient.init()}on(Q,Z,z){this._redirectClient.onResponse(Q,(X,K,Y)=>Z(X,Y),(X,K,Y)=>{if(!z)return;z(X,Y)})}createCashlink(Q,Z=this._defaultBehavior){return this._request(Z,k.CREATE_CASHLINK,[Q])}manageCashlink(Q,Z=this._defaultBehavior){return this._request(Z,k.MANAGE_CASHLINK,[Q])}checkout(Q,Z=this._checkoutDefaultBehavior){return this._request(Z,k.CHECKOUT,[Q])}chooseAddress(Q,Z=this._defaultBehavior){return this._request(Z,k.CHOOSE_ADDRESS,[Q])}signTransaction(Q,Z=this._defaultBehavior){return this._request(Z,k.SIGN_TRANSACTION,[Q])}signStaking(Q,Z=this._defaultBehavior){return this._request(Z,k.SIGN_STAKING,[Q])}signMessage(Q,Z=this._defaultBehavior){return this._request(Z,k.SIGN_MESSAGE,[Q])}signBtcTransaction(Q,Z=this._defaultBehavior){return this._request(Z,k.SIGN_BTC_TRANSACTION,[Q])}signPolygonTransaction(Q,Z=this._defaultBehavior){return this._request(Z,k.SIGN_POLYGON_TRANSACTION,[Q])}setupSwap(Q,Z=this._defaultBehavior){return this._request(Z,k.SETUP_SWAP,[Q])}refundSwap(Q,Z=this._defaultBehavior){return this._request(Z,k.REFUND_SWAP,[Q])}signMultisigTransaction(Q,Z=this._defaultBehavior){return this._request(Z,k.SIGN_MULTISIG_TRANSACTION,[Q])}connectAccount(Q,Z=this._defaultBehavior){return this._request(Z,k.CONNECT_ACCOUNT,[Q])}onboard(Q,Z=this._defaultBehavior){return this._request(Z,k.ONBOARD,[Q])}signup(Q,Z=this._defaultBehavior){return this._request(Z,k.SIGNUP,[Q])}login(Q,Z=this._defaultBehavior){return this._request(Z,k.LOGIN,[Q])}logout(Q,Z=this._defaultBehavior){return this._request(Z,k.LOGOUT,[Q])}export(Q,Z=this._defaultBehavior){return this._request(Z,k.EXPORT,[Q])}changePassword(Q,Z=this._defaultBehavior){return this._request(Z,k.CHANGE_PASSWORD,[Q])}addAddress(Q,Z=this._defaultBehavior){return this._request(Z,k.ADD_ADDRESS,[Q])}rename(Q,Z=this._defaultBehavior){return this._request(Z,k.RENAME,[Q])}addVestingContract(Q,Z=this._defaultBehavior){return this._request(Z,k.ADD_VESTING_CONTRACT,[Q])}migrate(Q=this._defaultBehavior){return this._request(Q,k.MIGRATE,[{appName:"Account list"}])}activateBitcoin(Q,Z=this._defaultBehavior){return this._request(Z,k.ACTIVATE_BITCOIN,[Q])}activatePolygon(Q,Z=this._defaultBehavior){return this._request(Z,k.ACTIVATE_POLYGON,[Q])}list(Q=this._iframeBehavior){return this._request(Q,k.LIST,[])}cashlinks(Q=this._iframeBehavior){return this._request(Q,k.LIST_CASHLINKS,[])}addBtcAddresses(Q,Z=this._iframeBehavior){return this._request(Z,k.ADD_BTC_ADDRESSES,[Q])}_request(Q,Z,z){return Q.request(this._endpoint,Z,z)}}var U1,GZ,H1,O1,L1,D1,k1,f1,T1,h1,S1,q1,b1,WQ,IZ,o,IQ,k,$Z,RQ,jZ,JZ,_Z,PZ;var _0=_Q(()=>{G0();j0();U1={"popup-overlay":`Ein Popup hat sich geöffnet,
klicke hier, um zurück zum Popup zu kommen.`},GZ={"popup-overlay":`A popup has been opened,
click anywhere to bring it back to the front.`},H1={"popup-overlay":`Se ha abierto una ventana emergente.
Haga click en cualquier lugar para traer la ventana al primer plano.`},O1={"popup-overlay":`Nag-bukas ang isang pop-up.
Maaring pindutin kahit saan para ibalik ito sa harap.`},L1={"popup-overlay":`Une popup a été ouverte,
cliquez n'importe où pour la ramener au premier plan.`},D1={"popup-overlay":`Er is een pop-up geopend,
klik op het scherm om het weer naar voren te brengen.`},k1={"popup-overlay":`Pojawiło się wyskakujące okno.
Aby je zobaczyć, kliknij w dowolnym miejscu.`},f1={"popup-overlay":`Um popup foi aberto,
clique em qualquer lado para o trazer para a frente.`},T1={"popup-overlay":`Открыто всплывающее окно.
Нажмите где-нибудь, чтобы вернуть его на передний план.`},h1={"popup-overlay":`Bir popup penceresi açıldı,
öne çekmek için herhangi bir yere tıkla. `},S1={"popup-overlay":`Відкрито випадаюче вікно.
клацніть будь-де щоб перейти до ньго.`},q1={"popup-overlay":`弹出窗口已打开，
单击任意位置即可回到上一页`},b1={de:U1,en:GZ,es:H1,fil:O1,fr:L1,nl:D1,pl:k1,pt:f1,ru:T1,tr:h1,uk:S1,zh:q1};(function(Q){Q[Q.REDIRECT=0]="REDIRECT",Q[Q.POPUP=1]="POPUP",Q[Q.IFRAME=2]="IFRAME"})(WQ||(WQ={}));IZ=class IZ extends r{static withLocalState(Q){return new IZ(void 0,Q)}constructor(Q,Z){super(WQ.REDIRECT);let z=window.location;if(this._returnUrl=Q||`${z.origin}${z.pathname}`,this._localState=Z||{},typeof this._localState.__command<"u")throw Error("Invalid localState: Property '__command' is reserved")}async request(Q,Z,z){let X=r.getAllowedOrigin(Q),K=new wQ(Q,X);await K.init();let Y=Object.assign({},this._localState,{__command:Z});K.callAndSaveLocalState(this._returnUrl,Y,Z,!0,...await Promise.all(z))}};o=class o extends r{constructor(Q=o.DEFAULT_FEATURES,Z){super(WQ.POPUP);this.shouldRetryRequest=!1,this._popupFeatures=Q,this._options={...o.DEFAULT_OPTIONS,...Z}}async request(Q,Z,z){let X=r.getAllowedOrigin(Q),K=this.appendOverlay();do{this.shouldRetryRequest=!1;try{return this.popup=this.createPopup(Q),this.client=new bQ(this.popup,X),await this.client.init(),await this.client.call(Z,...await Promise.all(z))}catch(Y){if(!this.shouldRetryRequest)throw Y}finally{if(!this.shouldRetryRequest){if(this.removeOverlay(K),this.client)this.client.close();if(this.popup)this.popup.close()}}}while(this.shouldRetryRequest);if(this.popup)this.popup.close();if(this.client)this.client.close();if(K)this.removeOverlay(K);throw Error("Unexpected error occurred")}createPopup(Q){let Z=window.open(Q,"NimiqAccounts",this._popupFeatures);if(!Z)throw Error("Failed to open popup");return Z}appendOverlay(){if(!this._options.overlay)return null;let Q=document.createElement.bind(document),Z=(J,N)=>J.appendChild(N),z=Q("div");z.id="nimiq-hub-overlay";let X=z.style;X.position="fixed",X.top="0",X.right="0",X.bottom="0",X.left="0",X.background="rgba(31, 35, 72, 0.8)",X.display="flex",X.flexDirection="column",X.alignItems="center",X.justifyContent="space-between",X.cursor="pointer",X.color="white",X.textAlign="center",X.opacity="0",X.transition="opacity 0.6s ease",X.zIndex="99999",z.addEventListener("click",()=>{if(WZ.isIOS()){if(this.shouldRetryRequest=!0,this.popup)this.popup.close();if(this.client)this.client.close()}else if(this.popup)this.popup.focus()}),Z(z,Q("div"));let K=Q("div");K.textContent=w1("popup-overlay");let Y=K.style;Y.padding="20px",Y.fontFamily='Muli, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',Y.fontSize="24px",Y.fontWeight="600",Y.lineHeight="40px",Y.whiteSpace="pre-line",Z(z,K);let V=Q("img");V.src='data:image/svg+xml,<svg width="135" height="32" viewBox="0 0 135 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M35.6 14.5l-7.5-13A3 3 0 0025.5 0h-15a3 3 0 00-2.6 1.5l-7.5 13a3 3 0 000 3l7.5 13a3 3 0 002.6 1.5h15a3 3 0 002.6-1.5l7.5-13a3 3 0 000-3z" fill="url(%23hub-overlay-nimiq-logo)"/><path d="M62.25 6.5h3.26v19H63L52.75 12.25V25.5H49.5v-19H52l10.25 13.25V6.5zM72 25.5v-19h3.5v19H72zM97.75 6.5h2.75v19h-3V13.75L92.37 25.5h-2.25L85 13.75V25.5h-3v-19h2.75l6.5 14.88 6.5-14.88zM107 25.5v-19h3.5v19H107zM133.88 21.17a7.91 7.91 0 01-4.01 3.8c.16.38.94 1.44 1.52 2.05.59.6 1.2 1.23 1.98 1.86L131 30.75a15.91 15.91 0 01-4.45-5.02l-.8.02c-1.94 0-3.55-.4-4.95-1.18a7.79 7.79 0 01-3.2-3.4 11.68 11.68 0 01-1.1-5.17c0-2.03.37-3.69 1.12-5.17a7.9 7.9 0 013.2-3.4 9.8 9.8 0 014.93-1.18c1.9 0 3.55.4 4.94 1.18a7.79 7.79 0 013.2 3.4 11.23 11.23 0 011.1 5.17c0 2.03-.44 3.83-1.11 5.17zm-12.37.01a5.21 5.21 0 004.24 1.82 5.2 5.2 0 004.23-1.82c1.01-1.21 1.52-2.92 1.52-5.18 0-2.24-.5-4-1.52-5.2a5.23 5.23 0 00-4.23-1.8c-1.82 0-3.23.6-4.24 1.79-1 1.2-1.51 2.95-1.51 5.21s.5 3.97 1.51 5.18z" fill="white"/><defs><radialGradient id="hub-overlay-nimiq-logo" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-35.9969 0 0 -32 36 32)"><stop stop-color="%23EC991C"/><stop offset="1" stop-color="%23E9B213"/></radialGradient></defs></svg>',V.style.marginBottom="56px",Z(z,V);let W=Q("div"),$=W.style;return W.innerHTML="&times;",$.position="absolute",$.top="8px",$.right="8px",$.fontSize="24px",$.lineHeight="32px",$.fontWeight="600",$.width="32px",$.height="32px",$.opacity="0.8",W.addEventListener("click",(J)=>{if(this.popup)this.popup.close();J.stopPropagation()}),Z(z,W),setTimeout(()=>z.style.opacity="1",100),Z(document.body,z)}removeOverlay(Q){if(!Q)return;Q.style.opacity="0",setTimeout(()=>document.body.removeChild(Q),400)}};o.DEFAULT_FEATURES="";o.DEFAULT_OPTIONS={overlay:!0};IQ=class IQ extends r{constructor(){super(WQ.IFRAME);this._iframe=null,this._client=null}async request(Q,Z,z){if(this._iframe&&this._iframe.src!==`${Q}${IQ.IFRAME_PATH_SUFFIX}`)throw Error("Hub iframe is already opened with another endpoint");let X=r.getAllowedOrigin(Q);if(!this._iframe)this._iframe=await this.createIFrame(Q);if(!this._iframe.contentWindow)throw Error(`IFrame contentWindow is ${typeof this._iframe.contentWindow}`);if(!this._client)this._client=new bQ(this._iframe.contentWindow,X),await this._client.init();return await this._client.call(Z,...await Promise.all(z))}async createIFrame(Q){return new Promise((Z,z)=>{let X=document.createElement("iframe");X.name="NimiqAccountsIFrame",X.style.display="none",document.body.appendChild(X),X.src=`${Q}${IQ.IFRAME_PATH_SUFFIX}`,X.onload=()=>Z(X),X.onerror=z})}};IQ.IFRAME_PATH_SUFFIX="/iframe.html";(function(Q){Q.LIST="list",Q.LIST_CASHLINKS="list-cashlinks",Q.MIGRATE="migrate",Q.CHECKOUT="checkout",Q.SIGN_MESSAGE="sign-message",Q.SIGN_TRANSACTION="sign-transaction",Q.SIGN_MULTISIG_TRANSACTION="sign-multisig-transaction",Q.SIGN_STAKING="sign-staking",Q.ONBOARD="onboard",Q.SIGNUP="signup",Q.LOGIN="login",Q.EXPORT="export",Q.CHANGE_PASSWORD="change-password",Q.LOGOUT="logout",Q.ADD_ADDRESS="add-address",Q.RENAME="rename",Q.ADD_VESTING_CONTRACT="add-vesting-contract",Q.CHOOSE_ADDRESS="choose-address",Q.CREATE_CASHLINK="create-cashlink",Q.MANAGE_CASHLINK="manage-cashlink",Q.SIGN_BTC_TRANSACTION="sign-btc-transaction",Q.ADD_BTC_ADDRESSES="add-btc-addresses",Q.SIGN_POLYGON_TRANSACTION="sign-polygon-transaction",Q.ACTIVATE_BITCOIN="activate-bitcoin",Q.ACTIVATE_POLYGON="activate-polygon",Q.SETUP_SWAP="setup-swap",Q.REFUND_SWAP="refund-swap",Q.CONNECT_ACCOUNT="connect-account"})(k||(k={}));(function(Q){Q[Q.LEGACY=1]="LEGACY",Q[Q.BIP39=2]="BIP39",Q[Q.LEDGER=3]="LEDGER"})($Z||($Z={}));(function(Q){Q[Q.DIRECT=0]="DIRECT",Q[Q.OASIS=1]="OASIS"})(RQ||(RQ={}));(function(Q){Q.NIM="nim",Q.BTC="btc",Q.ETH="eth"})(jZ||(jZ={}));(function(Q){Q.NOT_FOUND="NOT_FOUND",Q.PAID="PAID",Q.UNDERPAID="UNDERPAID",Q.OVERPAID="OVERPAID"})(JZ||(JZ={}));(function(Q){Q[Q.UNKNOWN=-1]="UNKNOWN",Q[Q.UNCHARGED=0]="UNCHARGED",Q[Q.CHARGING=1]="CHARGING",Q[Q.UNCLAIMED=2]="UNCLAIMED",Q[Q.CLAIMING=3]="CLAIMING",Q[Q.CLAIMED=4]="CLAIMED"})(_Z||(_Z={}));(function(Q){Q[Q.UNSPECIFIED=0]="UNSPECIFIED",Q[Q.STANDARD=1]="STANDARD",Q[Q.CHRISTMAS=2]="CHRISTMAS",Q[Q.LUNAR_NEW_YEAR=3]="LUNAR_NEW_YEAR",Q[Q.EASTER=4]="EASTER",Q[Q.GENERIC=5]="GENERIC",Q[Q.BIRTHDAY=6]="BIRTHDAY"})(PZ||(PZ={}));b.BehaviorType=WQ;b.RequestType=k;b.RedirectRequestBehavior=IZ;b.PopupRequestBehavior=o;b.AccountType=$Z;b.CashlinkState=_Z;b.CashlinkTheme=PZ;b.Currency=jZ;b.PaymentType=RQ;b.PaymentState=JZ;b.MSG_PREFIX=`\x16Nimiq Signed Message:
`});function ZZ(){return typeof window<"u"&&!!window.nimiqPay}function zZ(){return typeof window<"u"&&!!window.nimiq}function hQ(){return ZZ()||zZ()?"miniapp":"hub"}function Y0(Q){if(Q==null)return;let Z=typeof Q==="string"?new TextEncoder().encode(Q):Q;if(Z.length===0)return;let z="";for(let X of Z)z+=X.toString(16).padStart(2,"0");return z}function XZ(Q){if(Q==null)return;let Z=typeof Q==="string"?new TextEncoder().encode(Q):Q;return Z.length===0?void 0:Z}function KZ(Q){let Z="";for(let z of Q)Z+=z.toString(16).padStart(2,"0");return Z}function A1(Q){return typeof Q==="object"&&Q!==null&&"error"in Q&&typeof Q.error==="object"}function SQ(Q){if(A1(Q))throw Error(`Nimiq Pay: ${Q.error.message??Q.error.type??"request failed"}`);return Q}async function x1(){if(typeof window<"u"&&window.nimiq)return window.nimiq;return await(await Promise.resolve().then(() => (W0(),V0))).init()}class PQ{mode="miniapp";provider;getProviderFn;onChange=null;current=null;constructor(Q={}){this.provider=Q.provider??null,this.getProviderFn=Q.getProvider??x1}async resolveProvider(){if(!this.provider)this.provider=await this.getProviderFn();return this.provider}setAccountChange(Q){this.onChange=Q}async connect(){let Q=await this.resolveProvider();if(Q.connect)await Q.connect();let z=SQ(await Q.listAccounts())[0];if(!z)return this.current=null,this.onChange?.(null),null;return this.current={address:z,label:""},this.onChange?.(this.current),this.current}async signAndSend(Q){let Z=await this.resolveProvider(),z=Q.feeLuna??0,X=Y0(Q.data),K;if(X!==void 0)K=SQ(await Z.sendBasicTransactionWithData({recipient:Q.recipient,value:Q.valueLuna,data:X,fee:z,validityStartHeight:Q.validityStartHeight}));else K=SQ(await Z.sendBasicTransaction({recipient:Q.recipient,value:Q.valueLuna,fee:z,validityStartHeight:Q.validityStartHeight}));return{txHash:K,serializedTx:K}}pay(Q){return this.signAndSend(Q)}async signMessage(Q){let Z=await this.resolveProvider();if(!this.current)throw Error("Nimiq Pay: connect a wallet before signing");let z=SQ(await Z.sign(Q));return{address:this.current.address,message:Q,publicKeyHex:z.publicKey,signatureHex:z.signature}}disconnect(){this.current=null,this.onChange?.(null)}}var R1="https://hub.nimiq.com";class MQ{mode="hub";appName;endpoint;client;getClientFn;getBlockHeight;onChange=null;current=null;constructor(Q={}){this.appName=Q.appName??"Nimiq App",this.endpoint=Q.hubEndpoint??R1,this.client=Q.client??null,this.getBlockHeight=Q.getBlockHeight,this.getClientFn=Q.getClient??(async()=>{return new(await Promise.resolve().then(() => (_0(),J0))).default(this.endpoint)})}async resolveClient(){if(!this.client)this.client=await this.getClientFn();return this.client}setAccountChange(Q){this.onChange=Q}async connect(){let Z=await(await this.resolveClient()).chooseAddress({appName:this.appName});if(!Z)return null;return this.current={address:Z.address,label:Z.label??""},this.onChange?.(this.current),this.current}async signAndSend(Q){let Z=await this.resolveClient();if(!this.current)throw Error("Hub: connect a wallet before sending");let z=Q.validityStartHeight??0;if(Q.validityStartHeight==null&&this.getBlockHeight)z=await this.getBlockHeight();let X=await Z.signTransaction({appName:this.appName,sender:this.current.address,recipient:Q.recipient,recipientType:0,value:Q.valueLuna,fee:Q.feeLuna??0,flags:0,extraData:XZ(Q.data),validityStartHeight:z});return{txHash:X.hash,serializedTx:X.serializedTx}}async pay(Q){let Z=await this.resolveClient();if(!this.current)throw Error("Hub: connect a wallet before paying");let z=await Z.checkout({appName:this.appName,sender:this.current.address,forceSender:!0,recipient:Q.recipient,value:Q.valueLuna,fee:Q.feeLuna??0,extraData:XZ(Q.data)});return{txHash:z.hash,serializedTx:z.serializedTx}}async signMessage(Q){let Z=await this.resolveClient();if(!this.current)throw Error("Hub: connect a wallet before signing");let z=await Z.signMessage({appName:this.appName,signer:this.current.address,message:Q});return{address:this.current.address,message:Q,publicKeyHex:KZ(z.signerPublicKey),signatureHex:KZ(z.signature)}}disconnect(){this.current=null,this.onChange?.(null)}}var FZ="nq-shell:hub-account";function v1(){try{let Q=localStorage.getItem(FZ);if(!Q)return null;let Z=JSON.parse(Q);if(typeof Z.address!=="string"||!Z.address)return null;return{address:Z.address,label:typeof Z.label==="string"?Z.label:""}}catch{return null}}function MZ(Q){try{if(Q)localStorage.setItem(FZ,JSON.stringify({address:Q.address,label:Q.label}));else localStorage.removeItem(FZ)}catch{}}function B1(Q={},Z={}){let z=Q.mode&&Q.mode!=="auto"?Q.mode:hQ(),X=z==="miniapp"?new PQ(Z.miniApp):new MQ({appName:Q.appName??"Nimiq App",hubEndpoint:Q.hubEndpoint,...Z.hub}),K=z==="hub"&&Q.persist!==!1,Y=new Set,V=K?v1():null;return X.setAccountChange(($)=>{if(V=$,K)MZ($);for(let J of Y)J($)}),{mode:z,get account(){return V},set account($){V=$},async connect(){let $=await X.connect();if($){if(V=$,K)MZ($)}return $},signAndSend($){return X.signAndSend($)},pay($){return X.pay($)},signMessage($){return X.signMessage($)},onAccountChange($){return Y.add($),()=>Y.delete($)},disconnect(){if(X.disconnect(),V=null,K)MZ(null)}}}var y1=1e5,g1=5;var m1=/^(-?)(\d*)\.?(\d*)(e(-?\d+))?$/;function d1(Q){let Z=typeof Q==="string"?Q.trim():Q.toString(),z=Z.match(m1);if(!z)throw Error(`${Z} is not a valid number`);let[,X="",K="",Y="",,V=""]=z,W={sign:X,digits:`${K}${Y}`,sep:K.length};if(!W.digits)throw Error(`${Z} is not a valid number`);let $=Number.parseInt(V,10);if($)P0(W,$);return W}function P0(Q,Z){if(Q.sep+=Z,Q.sep>Q.digits.length)Q.digits=Q.digits.padEnd(Q.sep,"0");else if(Q.sep<0)Q.digits=Q.digits.padStart(Q.digits.length-Q.sep,"0"),Q.sep=0}function l1(Q,Z){if(Q.digits.length-Q.sep<=Z)return;let z=Q.sep+Z,X=Q.digits.substring(0,z).padEnd(Q.sep,"0");if(Number.parseInt(Q.digits.charAt(z),10)<5){Q.digits=X;return}let K=`0${X}`.split("");for(let Y=z;Y>=0;--Y){let V=Number.parseInt(K[Y]??"0",10)+1;if(V<10){K[Y]=V.toString();break}K[Y]="0"}Q.digits=K.join(""),Q.sep+=1}function u1(Q,{maxDecimals:Z,minDecimals:z,grouping:X}){let K=Math.min(z,Z);l1(Q,Z);let Y=Q.digits.slice(0,Q.sep).replace(/^0+/,""),V=Q.digits.slice(Q.sep).replace(/0+$/,"");if(K>V.length)V=V.padEnd(K,"0");if(X&&Y.length>4)Y=Y.replace(/(\d)(?=(\d{3})+$)/g,`$1${" "}`);let W=`${Y||"0"}${V?`.${V}`:""}`;return/[1-9]/.test(W)?`${Q.sign}${W}`:W}function vQ(Q,Z,z={}){if(!Number.isInteger(Z)||Z<0)throw Error("fmtUnits: unitDecimals must be a non-negative integer");let{maxDecimals:X=Z,minDecimals:K=2,grouping:Y=!0,signed:V=!1}=z;if(!Number.isInteger(X)||X<0||!Number.isInteger(K)||K<0)throw Error("fmtUnits: minDecimals/maxDecimals must be non-negative integers");let W=d1(Q);P0(W,-Z);let $=u1(W,{maxDecimals:X,minDecimals:K,grouping:Y});return V&&!$.startsWith("-")&&/[1-9]/.test($)?`+${$}`:$}function BQ(Q,Z={}){return vQ(Q,5,Z)}function GQ(Q,Z,z){if(!Number.isFinite(Q))throw Error(`fmtFiat: ${Q} is not a finite number`);let X={style:"currency",currency:Z},K=(W)=>{try{return new Intl.NumberFormat(z,{...W,currencyDisplay:"narrowSymbol"}).format(Q)}catch{return new Intl.NumberFormat(z,W).format(Q)}};if(Q===0)return K(X);let Y=new Intl.NumberFormat(z,X).resolvedOptions().maximumFractionDigits??2,V=Y;while(Math.abs((Q-Number(Q.toFixed(V)))/Q)>0.1&&V<20)V+=1;if(V===Y)return K(X);return K({...X,minimumFractionDigits:V,maximumFractionDigits:V})}function yQ(Q){return Number(Q)/1e5}function NZ(Q){if(!Number.isFinite(Q))throw Error(`nimToLuna: ${Q} is not a finite number`);return Math.round(Q*1e5)}function c1(Q){if(typeof Q!=="string")throw Error("parseNim: expected a string");let z=Q.trim().replace(/[\u202F\u00A0\s]/g,"").replace(/,(?=\d{3}(\D|$))/g,"").match(/^([+-]?)(\d+)(?:\.(\d+))?$/);if(!z)throw Error(`parseNim: "${Q}" is not a valid NIM amount`);let[,X,K,Y=""]=z;if(Y.length>5)throw Error(`parseNim: "${Q}" has more than 5 decimals (sub-luna)`);let V=Number.parseInt(K+Y.padEnd(5,"0"),10);if(!Number.isSafeInteger(V))throw Error(`parseNim: "${Q}" is out of safe integer range`);return X==="-"?-V:V}function p1(){if(typeof window>"u"||!window.location)return null;try{let Q=new URLSearchParams(window.location.search).get("lang");return Q&&Q.trim()?Q.trim():null}catch{return null}}function i1(){if(typeof window>"u")return null;let Q=window.nimiqPay?.language;return Q&&Q.trim()?Q.trim():null}function n1(Q){if(typeof localStorage>"u")return null;try{let Z=localStorage.getItem(Q);return Z&&Z.trim()?Z.trim():null}catch{return null}}function r1(){if(typeof navigator>"u")return null;let Q=navigator.language;if(!Q)return null;let Z=Q.split("-")[0];return Z&&Z.trim()?Z.trim():null}function I0(Q,Z){if(!Z)return Q;return Q.replace(/\{(\w+)\}/g,(z,X)=>(X in Z)?String(Z[X]):z)}function o1(Q){let Z=Q.locales,z=Q.fallback??"en",X=Q.storageKey??"nimiq-app-lang",K=new Set,Y=Object.keys(Z),V=(_)=>!!_&&(_ in Z);function W(_){if(V(_))return Z[_];if(V(z))return Z[z];return{}}function $(){if(Q.initial&&Q.initial.trim())return Q.initial.trim();let _=[p1(),i1(),n1(X),r1()];for(let P of _)if(V(P))return P;return z}let J=$();function N(_){if(typeof document<"u"&&document.documentElement)document.documentElement.lang=_}function A(_){if(typeof localStorage>"u")return;try{localStorage.setItem(X,_)}catch{}}return N(J),A(J),{t(_,P){let M=W(J)[_];if(M==null&&V(z))M=Z[z][_];if(M==null)return I0(_,P);return I0(M,P)},setLanguage(_){let P=_.trim();if(!P||P===J){N(J),A(J);return}J=P,A(P),N(P);for(let H of K)H(P)},getLanguage(){return J},availableLanguages(){return[...Y]},onChange(_){return K.add(_),()=>K.delete(_)}}}var M0={"shell.connectWallet":"Connect wallet","shell.connecting":"Connecting","shell.disconnect":"Disconnect","shell.switchAccount":"Switch account","shell.saveContact":"Save this recipient as?","shell.profile":"Profile","shell.account":"Account","shell.address":"Address","shell.copyAddress":"Copy address","shell.copied":"Copied","shell.balance":"Balance","shell.language":"Language","shell.notConnected":"Not connected","shell.send":"Send","shell.cancel":"Cancel","shell.retry":"Retry","shell.receive":"Receive","shell.amountsIn":"Show amounts in","shell.openInPay":"Open in Nimiq Pay","shell.network":"Network","shell.tapToCopy":"Tap the address to copy","shell.networkOnly":"Send {ticker} on {network} only. Coins sent on another network are lost.","shell.createCashlink":"Create a Cashlink","shell.newToNimiq":"New to Nimiq? Create a wallet","shell.recipient":"Recipient","shell.available":"Available","shell.sending":"Sending","shell.sent":"Sent","shell.sendFailed":"Something went wrong","shell.amount":"Amount","shell.reportBug":"Report a bug","shell.fbType":"Type","shell.fbBug":"Bug","shell.fbIdea":"Idea","shell.fbQuestion":"Question","shell.fbSummary":"Summary","shell.fbDetails":"What happened?","shell.fbIncludeDiag":"Include page and browser info","shell.fbSend":"Send","shell.fbSending":"Sending","shell.fbThanks":"Thanks, that is on its way.","shell.fbFailed":"That did not send.","shell.fbFailEmail":"send it by email instead","shell.fbErrType":"Pick a type.","shell.fbErrTitle":"Give it a summary of at least 5 characters.","shell.fbErrDetails":"Add a little more detail, at least 10 characters."};var F0={"shell.connectWallet":"Wallet verbinden","shell.connecting":"Verbinden","shell.disconnect":"Trennen","shell.switchAccount":"Konto wechseln","shell.saveContact":"Diesen Empfänger speichern als?","shell.profile":"Profil","shell.account":"Konto","shell.address":"Adresse","shell.copyAddress":"Adresse kopieren","shell.copied":"Kopiert","shell.balance":"Guthaben","shell.language":"Sprache","shell.notConnected":"Nicht verbunden","shell.send":"Senden","shell.cancel":"Abbrechen","shell.retry":"Erneut versuchen","shell.receive":"Empfangen","shell.amountsIn":"Beträge anzeigen in","shell.openInPay":"In Nimiq Pay öffnen","shell.network":"Netzwerk","shell.tapToCopy":"Adresse antippen zum Kopieren","shell.networkOnly":"Sende {ticker} nur über {network}. Über ein anderes Netzwerk gesendete Coins sind verloren.","shell.createCashlink":"Cashlink erstellen","shell.newToNimiq":"Neu bei Nimiq? Wallet erstellen","shell.recipient":"Empfänger","shell.available":"Verfügbar","shell.sending":"Wird gesendet","shell.sent":"Gesendet","shell.sendFailed":"Etwas ist schiefgelaufen","shell.amount":"Betrag","shell.reportBug":"Fehler melden","shell.fbType":"Art","shell.fbBug":"Fehler","shell.fbIdea":"Idee","shell.fbQuestion":"Frage","shell.fbSummary":"Kurzfassung","shell.fbDetails":"Was ist passiert?","shell.fbIncludeDiag":"Seiten- und Browserdaten mitsenden","shell.fbSend":"Senden","shell.fbSending":"Wird gesendet","shell.fbThanks":"Danke, es ist unterwegs.","shell.fbFailed":"Das konnte nicht gesendet werden.","shell.fbFailEmail":"stattdessen per E-Mail senden","shell.fbErrType":"Bitte eine Art wählen.","shell.fbErrTitle":"Bitte eine Kurzfassung mit mindestens 5 Zeichen.","shell.fbErrDetails":"Bitte etwas mehr Details, mindestens 10 Zeichen."};var N0={"shell.connectWallet":"Conectar cartera","shell.connecting":"Conectando","shell.disconnect":"Desconectar","shell.switchAccount":"Cambiar de cuenta","shell.saveContact":"¿Guardar este destinatario como?","shell.profile":"Perfil","shell.account":"Cuenta","shell.address":"Dirección","shell.copyAddress":"Copiar dirección","shell.copied":"Copiado","shell.balance":"Saldo","shell.language":"Idioma","shell.notConnected":"No conectado","shell.send":"Enviar","shell.cancel":"Cancelar","shell.retry":"Reintentar","shell.receive":"Recibir","shell.amountsIn":"Mostrar importes en","shell.openInPay":"Abrir en Nimiq Pay","shell.network":"Red","shell.tapToCopy":"Toca la dirección para copiarla","shell.networkOnly":"Envía {ticker} solo por {network}. Las monedas enviadas por otra red se pierden.","shell.createCashlink":"Crear un Cashlink","shell.newToNimiq":"¿Nuevo en Nimiq? Crea una cartera","shell.recipient":"Destinatario","shell.available":"Disponible","shell.sending":"Enviando","shell.sent":"Enviado","shell.sendFailed":"Algo salió mal","shell.amount":"Cantidad","shell.reportBug":"Reportar un error","shell.fbType":"Tipo","shell.fbBug":"Error","shell.fbIdea":"Idea","shell.fbQuestion":"Pregunta","shell.fbSummary":"Resumen","shell.fbDetails":"¿Qué pasó?","shell.fbIncludeDiag":"Incluir datos de la página y del navegador","shell.fbSend":"Enviar","shell.fbSending":"Enviando","shell.fbThanks":"Gracias, ya va en camino.","shell.fbFailed":"No se pudo enviar.","shell.fbFailEmail":"envíalo por correo","shell.fbErrType":"Elige un tipo.","shell.fbErrTitle":"Escribe un resumen de al menos 5 caracteres.","shell.fbErrDetails":"Añade un poco más de detalle, al menos 10 caracteres."};var C0={"shell.connectWallet":"Connecter le portefeuille","shell.connecting":"Connexion","shell.disconnect":"Déconnecter","shell.switchAccount":"Changer de compte","shell.saveContact":"Enregistrer ce destinataire sous ?","shell.profile":"Profil","shell.account":"Compte","shell.address":"Adresse","shell.copyAddress":"Copier l'adresse","shell.copied":"Copié","shell.balance":"Solde","shell.language":"Langue","shell.notConnected":"Non connecté","shell.send":"Envoyer","shell.cancel":"Annuler","shell.retry":"Réessayer","shell.receive":"Recevoir","shell.amountsIn":"Afficher les montants en","shell.openInPay":"Ouvrir dans Nimiq Pay","shell.network":"Réseau","shell.tapToCopy":"Touchez l'adresse pour la copier","shell.networkOnly":"Envoyez des {ticker} uniquement via {network}. Les fonds envoyés via un autre réseau sont perdus.","shell.createCashlink":"Créer un Cashlink","shell.newToNimiq":"Nouveau sur Nimiq ? Créez un portefeuille","shell.recipient":"Destinataire","shell.available":"Disponible","shell.sending":"Envoi en cours","shell.sent":"Envoyé","shell.sendFailed":"Une erreur est survenue","shell.amount":"Montant","shell.reportBug":"Signaler un bug","shell.fbType":"Type","shell.fbBug":"Bug","shell.fbIdea":"Idée","shell.fbQuestion":"Question","shell.fbSummary":"Résumé","shell.fbDetails":"Que s'est-il passé ?","shell.fbIncludeDiag":"Inclure les infos de page et de navigateur","shell.fbSend":"Envoyer","shell.fbSending":"Envoi en cours","shell.fbThanks":"Merci, c'est parti.","shell.fbFailed":"L'envoi a échoué.","shell.fbFailEmail":"envoyer par e-mail","shell.fbErrType":"Choisissez un type.","shell.fbErrTitle":"Donnez un résumé d'au moins 5 caractères.","shell.fbErrDetails":"Ajoutez un peu plus de détails, au moins 10 caractères."};var E0={"shell.connectWallet":"Conectar carteira","shell.connecting":"Conectando","shell.disconnect":"Desconectar","shell.switchAccount":"Trocar de conta","shell.saveContact":"Salvar este destinatário como?","shell.profile":"Perfil","shell.account":"Conta","shell.address":"Endereço","shell.copyAddress":"Copiar endereço","shell.copied":"Copiado","shell.balance":"Saldo","shell.language":"Idioma","shell.notConnected":"Não conectado","shell.send":"Enviar","shell.cancel":"Cancelar","shell.retry":"Tentar novamente","shell.receive":"Receber","shell.amountsIn":"Mostrar valores em","shell.openInPay":"Abrir no Nimiq Pay","shell.network":"Rede","shell.tapToCopy":"Toque no endereço para copiar","shell.networkOnly":"Envie {ticker} apenas via {network}. Moedas enviadas por outra rede são perdidas.","shell.createCashlink":"Criar um Cashlink","shell.newToNimiq":"Novo na Nimiq? Crie uma carteira","shell.recipient":"Destinatário","shell.available":"Disponível","shell.sending":"Enviando","shell.sent":"Enviado","shell.sendFailed":"Algo deu errado","shell.amount":"Valor","shell.reportBug":"Relatar um erro","shell.fbType":"Tipo","shell.fbBug":"Erro","shell.fbIdea":"Ideia","shell.fbQuestion":"Pergunta","shell.fbSummary":"Resumo","shell.fbDetails":"O que aconteceu?","shell.fbIncludeDiag":"Incluir dados da página e do navegador","shell.fbSend":"Enviar","shell.fbSending":"Enviando","shell.fbThanks":"Obrigado, já foi enviado.","shell.fbFailed":"Não foi possível enviar.","shell.fbFailEmail":"envie por e-mail","shell.fbErrType":"Escolha um tipo.","shell.fbErrTitle":"Escreva um resumo com pelo menos 5 caracteres.","shell.fbErrDetails":"Acrescente mais detalhes, pelo menos 10 caracteres."};var s1={en:M0,de:F0,es:N0,fr:C0,pt:E0};var CZ=[{id:"en",name:"English",flag:"us"},{id:"es",name:"Spanish",flag:"mx"},{id:"de",name:"German",flag:"de"},{id:"fr",name:"French",flag:"fr"},{id:"pt",name:"Portuguese",flag:"br"}],FQ=[{id:"en",name:"English",flag:"us"},{id:"es",name:"Spanish",flag:"mx"},{id:"de",name:"German",flag:"de"},{id:"hi",name:"Hindi",flag:"in"},{id:"zh",name:"Mandarin Chinese",flag:"cn"},{id:"fr",name:"French",flag:"fr"},{id:"tr",name:"Turkish",flag:"tr"},{id:"ha",name:"Hausa",flag:"ng"},{id:"ko",name:"Korean",flag:"kr"},{id:"pt",name:"Portuguese",flag:"br"},{id:"vi",name:"Vietnamese",flag:"vn"}];function a1(...Q){let Z={};for(let z of Q)for(let[X,K]of Object.entries(z))Z[X]={...Z[X]??{},...K};return Z}var A0={ae:`<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-ae" viewBox="0 0 640 480">
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
</svg>`},x0={ae:1.3333,ar:1.3333,cl:1.3333,cr:1.3333,gm:1.3333,gt:1.3333,hk:1.3333,nz:1.3333,sg:1.3333,tw:1.3333,us:1.3333};function EZ(Q){let Z=A0[Q.toLowerCase()];return Z?"data:image/svg+xml,"+encodeURIComponent(Z):""}var AZ={us:{aspect:1.3333333333333333},cn:{scale:1.2,dx:2.2,dy:2.8},kr:{scale:0.72}};var U0="M19.964 8.156 15.758.844A1.69 1.69 0 0014.299 0H5.887c-.6 0-1.156.32-1.456.844L.225 8.156c-.3.523-.3 1.165 0 1.688l4.206 7.312c.3.523.856.844 1.456.844h8.412c.6 0 1.156-.32 1.456-.844l4.206-7.312a1.69 1.69 0 00.003-1.688",t1=0;function e1(Q,Z){let z=Q?.aspect??(Z?x0[Z.toLowerCase()]??1:1),X=Q?.scale??1,K=Q?.dx??0,Y=Q?.dy??0,V=1.08,W=Math.max(20,18*z)*1.08*X,$=W/z;return{x:10+K-W/2,y:9+Y-$/2,w:W,h:$}}function Q4(Q,Z={}){let z=Z.size??24,X=Z.fit??AZ[Q.toLowerCase()],{x:K,y:Y,w:V,h:W}=e1(X,Q),$=Math.max(0.4,22/z),J=`nq-flag-${t1+=1}`;return`<svg class="nq-flag-hex" viewBox="0 0 20 18" width="${z}" height="${(z*0.9).toFixed(2)}" aria-hidden="true" style="display:block;overflow:visible"><defs><clipPath id="${J}"><path d="${U0}"/></clipPath></defs><g clip-path="url(#${J})"><image href="${EZ(Q)}" x="${K}" y="${Y}" width="${V}" height="${W}" preserveAspectRatio="xMidYMid slice"/></g><path d="${U0}" fill="none" stroke="rgba(31,35,72,0.4)" stroke-width="${$.toFixed(2)}" stroke-linejoin="round"/></svg>`}function B(Q,Z={}){let z=document.createElement("div");return z.innerHTML=Q4(Q,Z),z.firstElementChild}function Z4(Q,Z,z,X={}){let K=X.pad??2,Y=X.bandDepth??14;if(Q.length===0)return{line:"",fill:"",band:""};let V=Math.max(...Q),W=Math.min(...Q),$=V-W,J=z-K*2,N=(x)=>Q.length===1?Z/2:x/(Q.length-1)*Z,A=(x)=>$===0?K+J/2:K+J-(x-W)/$*J,_=Q.map((x,U)=>[N(U),A(x)]),H=`M${_.map(([x,U])=>`${x.toFixed(1)},${U.toFixed(1)}`).join("L")}`,M=`${H}L${Z.toFixed(1)},${z}L0,${z}Z`,C=_.slice().reverse().map(([x,U])=>`${x.toFixed(1)},${(U+Y).toFixed(1)}`),O=`${H}L${C.join("L")}Z`;return{line:H,fill:M,band:O}}function gQ(Q,Z,z,X){let K=Q*Math.PI*2-Math.PI/2;return[z+Z*Math.cos(K),X+Z*Math.sin(K)]}function z4(Q,Z,z,X){let K=Q.reduce((W,$)=>W+($>0?$:0),0);if(K<=0)return[];let Y=[],V=0;return Q.forEach((W,$)=>{if(W<=0)return;let J=W/K,[N,A]=gQ(V,Z,z,X),[_,P]=gQ(V+J,Z,z,X),H=J>=1?gQ(0.9999,Z,z,X):[_,P],M=J>0.5?1:0;Y.push({path:`M${N.toFixed(2)},${A.toFixed(2)}A${Z},${Z} 0 ${M} 1 ${H[0].toFixed(2)},${H[1].toFixed(2)}`,fraction:J,index:$}),V+=J}),Y}var xZ="data:image/svg+xml,"+encodeURIComponent('<svg width="64" height="64" viewBox="0 -4 64 64" xmlns="http://www.w3.org/2000/svg"><path opacity=".1" d="M62.3 25.4L49.2 2.6A5.3 5.3 0 0 0 44.6 0H18.4c-1.9 0-3.6 1-4.6 2.6L.7 25.4c-1 1.6-1 3.6 0 5.2l13.1 22.8c1 1.6 2.7 2.6 4.6 2.6h26.2c1.9 0 3.6-1 4.6-2.6l13-22.8c1-1.6 1-3.6.1-5.2z" fill="#1F2348"/></svg>');function X4(Q){let Z=(Q??"").trim(),z=Z.split(/\s+/);if(z.length>=5)return`${z.slice(0,3).join(" ")} … ${z.slice(-1)}`;if(Z.length>16)return`${Z.slice(0,8)}…${Z.slice(-5)}`;return Z}function K4(){if(typeof document>"u")return;if(document.getElementById("nimiq-shell-profile-style"))return;let Q=document.createElement("style");Q.id="nimiq-shell-profile-style",Q.textContent=`
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
`,document.head.appendChild(Q)}async function Y4(Q){if(!Q)return xZ;try{let z=await import("@nimiq/iqons"),X=z.default??z;if(X&&typeof X.toDataUrl==="function")return await X.toDataUrl(Q)}catch{}return xZ}function UZ(Q,Z){let{wallet:z,i18n:X}=Z,K=Z.identiconSize??48,Y=Z.showDisconnect!==!1,V=Z.showCopy!==!1;if(Z.injectStyles!==!1)K4();let W=document.createElement("div");W.className="nq-profile",Q.appendChild(W);let $=0;async function J(){let _=++$,P=z.account;W.textContent="";let H=document.createElement("span");H.className="nq-profile__icon",H.style.width=`${K}px`,H.style.height=`${K}px`;let M=null;if(P&&Z.identicon)H.appendChild(Z.identicon(P.address,K));else M=document.createElement("img"),M.src=xZ,M.alt="identicon",H.appendChild(M);W.appendChild(H);let C=document.createElement("div");C.className="nq-profile__body";let O=document.createElement("span");if(O.className="nq-profile__label",O.textContent=P?P.label||X.t("shell.account"):X.t("shell.notConnected"),C.appendChild(O),P){let x=document.createElement("span");if(x.className="nq-profile__addr",x.textContent=X4(P.address),x.title=P.address,C.appendChild(x),Z.getBalance){let U=document.createElement("span");U.className="nq-profile__bal",U.textContent="…",C.appendChild(U),Promise.resolve(Z.getBalance(P.address)).then((f)=>{if(_===$)U.textContent=f}).catch(()=>{if(_===$)U.textContent=""})}}if(W.appendChild(C),P&&(V||Y)){let x=document.createElement("div");if(x.className="nq-profile__actions",V){let U=document.createElement("button");U.type="button",U.className="nq-profile__btn",U.textContent=X.t("shell.copyAddress"),U.addEventListener("click",async()=>{try{await navigator.clipboard?.writeText(P.address);let f=U.textContent;U.textContent=X.t("shell.copied"),setTimeout(()=>{U.textContent=f},1200)}catch{}}),x.appendChild(U)}if(Y){let U=document.createElement("button");U.type="button",U.className="nq-profile__btn",U.textContent=X.t("shell.disconnect"),U.addEventListener("click",()=>z.disconnect()),x.appendChild(U)}W.appendChild(x)}if(M){let x=await Y4(P?.address??null);if(_===$)M.src=x}}J();let N=z.onAccountChange(()=>void J()),A=X.onChange(()=>void J());return{el:W,refresh(){J()},destroy(){N(),A(),W.remove()}}}var H0="nimiq-shell-lang-switcher-style";function V4(){if(typeof document>"u")return;if(document.getElementById(H0))return;let Q=document.createElement("style");Q.id=H0,Q.textContent=`
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
`,document.head.appendChild(Q)}function W4(Q,Z){let{i18n:z}=Z,X=Z.languages??CZ,K=Z.size??40;if(Z.injectStyles!==!1)V4();let Y=document.createElement("ul");Y.className="nq-langsw",Y.setAttribute("role","listbox"),Y.setAttribute("aria-label",z.t("shell.language")),Y.style.setProperty("--nq-flag-w",`${K}px`);let V=new Map;for(let J of X){let N=document.createElement("li"),A=document.createElement("button");A.type="button",A.className="nq-langsw__btn",A.setAttribute("role","option"),A.setAttribute("aria-label",J.name);let _=document.createElement("span");_.className="nq-langsw__art",_.appendChild(B(J.flag,{size:K}));let P=document.createElement("span");P.className="nq-langsw__tip",P.setAttribute("aria-hidden","true"),P.textContent=J.name,A.appendChild(_),A.appendChild(P),A.addEventListener("click",()=>z.setLanguage(J.id)),N.appendChild(A),Y.appendChild(N),V.set(J.id,A)}function W(J){for(let[N,A]of V){let _=N===J;A.classList.toggle("is-active",_),A.setAttribute("aria-selected",String(_))}}W(z.getLanguage());let $=z.onChange((J)=>W(J));return Q.appendChild(Y),{el:Y,destroy(){$(),Y.remove()}}}var O0="nimiq-shell-langpill-style";function G4(){if(typeof document>"u"||document.getElementById(O0))return;let Q=document.createElement("style");Q.id=O0,Q.textContent=`
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
`,document.head.appendChild(Q)}var $4='<svg class="nq-langpill__caret" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';function j4(Q,Z){let{i18n:z}=Z,X=Z.languages??FQ,K=Z.size??24;if(Z.injectStyles!==!1)G4();let Y=document.createElement("div");Y.className="nq-langpill";let V=document.createElement("button");V.type="button",V.className="nq-langpill__btn",V.setAttribute("aria-haspopup","listbox"),V.setAttribute("aria-expanded","false"),V.setAttribute("aria-label",z.t("shell.language"));let W=document.createElement("ul");W.className="nq-langpill__menu",W.setAttribute("role","listbox"),W.setAttribute("aria-label",z.t("shell.language")),W.hidden=!0;let $=new Map;for(let C of X){let O=document.createElement("li"),x=document.createElement("button");x.type="button",x.className="nq-langpill__option",x.setAttribute("role","option"),x.appendChild(B(C.flag,{size:K}));let U=document.createElement("span");U.className="nq-langpill__name",U.textContent=C.name,x.appendChild(U),x.addEventListener("click",()=>{z.setLanguage(C.id),_()}),O.appendChild(x),W.appendChild(O),$.set(C.id,x)}Y.appendChild(V),Y.appendChild(W),Q.appendChild(Y);function J(){let C=z.getLanguage(),O=X.find((x)=>x.id===C)??X[0];if(V.textContent="",O)V.appendChild(B(O.flag,{size:K}));V.insertAdjacentHTML("beforeend",$4)}function N(C){for(let[O,x]of $){let U=O===C;x.classList.toggle("is-active",U),x.setAttribute("aria-selected",String(U))}}function A(){W.hidden=!1,V.setAttribute("aria-expanded","true"),document.addEventListener("click",P,!0),document.addEventListener("keydown",H)}function _(){if(W.hidden)return;W.hidden=!0,V.setAttribute("aria-expanded","false"),document.removeEventListener("click",P,!0),document.removeEventListener("keydown",H)}function P(C){if(!Y.contains(C.target))_()}function H(C){if(C.key==="Escape")_(),V.focus()}V.addEventListener("click",()=>W.hidden?A():_()),J(),N(z.getLanguage());let M=z.onChange((C)=>{J(),N(C)});return{el:Y,destroy(){M(),_(),Y.remove()}}}var L0="nimiq-shell-walletpill-style";function J4(){if(typeof document>"u"||document.getElementById(L0))return;let Q=document.createElement("style");Q.id=L0,Q.textContent=`
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
`,document.head.appendChild(Q)}var _4="data:image/svg+xml,"+encodeURIComponent('<svg width="64" height="64" viewBox="0 -4 64 64" xmlns="http://www.w3.org/2000/svg"><path opacity=".25" d="M62.3 25.4L49.2 2.6A5.3 5.3 0 0 0 44.6 0H18.4c-1.9 0-3.6 1-4.6 2.6L.7 25.4c-1 1.6-1 3.6 0 5.2l13.1 22.8c1 1.6 2.7 2.6 4.6 2.6h26.2c1.9 0 3.6-1 4.6-2.6l13-22.8c1-1.6 1-3.6.1-5.2z" fill="currentColor"/></svg>'),HZ='<svg class="nq-connect__icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="2" y="5" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 9h16" stroke="currentColor" stroke-width="1.5"/><circle cx="6" cy="13" r="1" fill="currentColor"/></svg>',P4='<svg class="nq-wallet__caret" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';function I4(Q,Z){if(Q.label)return Q.label;let z=Q.address?.trim()??"";if(!z)return Z;return`${z.slice(0,7)}…${z.slice(-4)}`}function M4(Q,Z){let{wallet:z,i18n:X}=Z;if(Z.injectStyles!==!1)J4();let K=document.createElement("div");K.className="nq-wallet",Q.appendChild(K);let Y=null,V=!1;function W(){Y?.destroy(),Y=null,document.removeEventListener("click",$,!0),document.removeEventListener("keydown",J)}function $(C){if(!K.contains(C.target))N()}function J(C){if(C.key==="Escape")N()}function N(){if(!V)return;V=!1,P()}function A(){let C=document.createElement("button");C.className="nq-connect",C.type="button",C.innerHTML=HZ+`<span>${X.t("shell.connectWallet")}</span>`,C.addEventListener("click",async()=>{C.disabled=!0,C.innerHTML=HZ+`<span>${X.t("shell.connecting")}</span>`;try{await z.connect()}catch{C.disabled=!1,C.innerHTML=HZ+`<span>${X.t("shell.retry")}</span>`}}),K.appendChild(C)}function _(){let C=z.account,O=document.createElement("button");O.className="nq-wallet__btn",O.type="button",O.setAttribute("aria-haspopup","dialog"),O.setAttribute("aria-expanded",String(V));let x=document.createElement("span");if(x.className="nq-wallet__icon",Z.identicon)x.appendChild(Z.identicon(C.address,28));else{let f=document.createElement("img");f.src=_4,f.alt="",x.appendChild(f)}O.appendChild(x);let U=document.createElement("span");if(U.className="nq-wallet__label",U.textContent=I4(C,X.t("shell.account")),O.appendChild(U),O.insertAdjacentHTML("beforeend",P4),O.addEventListener("click",()=>{V=!V,P()}),K.appendChild(O),V){let f=document.createElement("div");f.className="nq-wallet__menu",K.appendChild(f),Y=UZ(f,{wallet:z,i18n:X,identiconSize:40,identicon:Z.identicon,showCopy:!0,showDisconnect:!0}),document.addEventListener("click",$,!0),document.addEventListener("keydown",J)}}function P(){if(W(),K.textContent="",z.account)_();else A()}P();let H=z.onAccountChange(()=>{V=!1,P()}),M=X.onChange(()=>{if(!z.account)P()});return{el:K,destroy(){H(),M(),W(),K.remove()}}}var mQ=[],OZ=[],D0=!1;function NQ(Q,Z,z){if(Q.push(Z),Q.length>z)Q.shift()}function F4(Q){try{return typeof Q==="string"?Q:JSON.stringify(Q)}catch{return String(Q)}}function k0(Q){return Q?`
`+String(Q).split(`
`).slice(0,4).join(`
`):""}function f0(Q){try{let Z=new URL(Q,location.href);return Z.pathname+Z.search}catch{return String(Q).slice(0,120)}}function T0(Q){let Z=Q.search(/[?#]/);return Z===-1?Q:Q.slice(0,Z)}function LZ(Q){if(D0||typeof window>"u")return;D0=!0,window.addEventListener("error",(z)=>{let X=z.filename?`
  at ${z.filename}:${z.lineno}:${z.colno}`:"";NQ(mQ,(z.message||"Error")+X+k0(z.error?.stack),20)}),window.addEventListener("unhandledrejection",(z)=>{let X=z.reason??{};NQ(mQ,`Unhandled rejection: ${X.message??String(z.reason)}${k0(X.stack)}`,20)});let Z=console.error.bind(console);if(console.error=(...z)=>{try{NQ(mQ,z.map(F4).join(" "),20)}catch{}Z(...z)},typeof window.fetch==="function"){let z=window.fetch,X=z.bind(window),K=async(Y,V)=>{let W=typeof Y==="string"?Y:Y instanceof URL?Y.href:Y.url,$=V?.method??(Y instanceof Request?Y.method:"GET"),J=Boolean(Q)&&W.startsWith(Q);try{let N=await X(Y,V);if(N.status>=400&&!J)NQ(OZ,`${$} ${f0(W)} → ${N.status}`,12);return N}catch(N){if(!J)NQ(OZ,`${$} ${f0(W)} → network error`,12);throw N}};window.fetch=Object.assign(K,z)}}function DZ(Q=!1){return{url:typeof location<"u"?T0(location.href):"",title:typeof document<"u"?document.title:"",referrer:typeof document<"u"?T0(document.referrer):"",userAgent:typeof navigator<"u"?navigator.userAgent:"",viewport:typeof window<"u"?{w:window.innerWidth,h:window.innerHeight,dpr:window.devicePixelRatio||1}:{w:0,h:0,dpr:1},consoleErrors:mQ.slice(-12),networkFailures:OZ.slice(-10),hasScreenshot:Q}}var N4="https://bot.nimiq.tech";function CQ(Q){return Q.replace(/NQ\d{2}[\s]?(?:[0-9A-HJ-NP-VXY]{4}[\s]?){8}/gi,"[address redacted]").replace(/(^|[^0-9a-f])([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?![0-9a-f])/gi,"$1[id redacted]")}function kZ(Q){if(typeof Q==="string")return CQ(Q);if(Array.isArray(Q))return Q.map(kZ);if(Q&&typeof Q==="object"){let Z={};for(let[z,X]of Object.entries(Q))Z[z]=kZ(X);return Z}return Q}async function q0(Q,Z){let z=(Q.service??N4).replace(/\/$/,""),X=kZ({...Z.pageContext??{},...Z.context??{}}),K=CQ([`[${Z.type}] ${Z.title.trim()}`,"",Z.description.trim(),...C4(Z)].join(`
`)),Y=async(V,W)=>{let $=await globalThis.fetch(`${z}${V}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(W)}),J={};try{J=await $.json()}catch{}return{res:$,json:J}};try{let V=await Y("/api/draft",{repo:Q.repo,text:K,context:X});if(!V.res.ok)return{ok:!1,status:V.res.status,error:h0(V.json)};let W=V.json.draft,$=V.json.reportId;if(!W||!$)return{ok:!1,status:V.res.status,error:"The issue service sent back nothing to file."};let J=[...new Set([...W.labels??[],...Q.labels??[]])],N={reportId:$,repo:Q.repo,title:CQ(W.title),body:CQ(W.body)},A=await Y("/api/file",{...N,labels:J});if(!A.res.ok&&J.length&&String(A.json.error??"")==="github_failed")A=await Y("/api/file",{...N,labels:[]});let _=A.json.url;if(!A.res.ok&&!_)return{ok:!1,status:A.res.status,error:h0(A.json)};return{ok:!0,status:A.res.status,issueNumber:A.json.number,issueUrl:_}}catch(V){return{ok:!1,status:0,error:V instanceof Error?V.message:String(V)}}}function C4(Q){let Z=Q.context??{},z=Object.entries(Z).map(([X,K])=>`${X}: ${K}`).join(" · ");return z?["","---",z]:[]}function h0(Q){let Z=String(Q.error??"");return{rate_limited:"Too many reports just now. Give it a minute.",unknown_repo:"The issue service doesn't know this app.",empty_report:"Please describe the problem first.",github_not_configured:"The issue service isn't connected to GitHub yet.",github_failed:"GitHub rejected the issue. Try again shortly.",already_filed:"That report was already filed."}[Z]??"Something went wrong."}function b0(Q){let Z=["bug","idea","question"];if(!Q.type||!Z.includes(Q.type))return"shell.fbErrType";if((Q.title??"").trim().length<5)return"shell.fbErrTitle";if((Q.description??"").trim().length<10)return"shell.fbErrDetails";return null}async function w0(Q,Z){let z={...Z.context??{},type:Z.type,title:Z.title.trim(),description:Z.description.trim()};if(Z.diagnostic)z.diagnostic=Z.diagnostic;let X;try{X=await globalThis.fetch(Q,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(z)})}catch(Y){return{ok:!1,status:0,error:Y instanceof Error?Y.message:String(Y)}}let K={};try{K=await X.json()}catch{}if(X.ok)return{ok:!0,status:X.status,issueNumber:K.issueNumber};return{ok:!1,status:X.status,error:K.error??`Server returned ${X.status}.`,fallbackMailto:K.fallbackMailto}}function R0(){let Q=[];try{if(typeof location<"u")Q.push(`page: ${location.pathname}${location.hash}`);if(typeof navigator<"u")Q.push(`ua: ${navigator.userAgent}`),Q.push(`lang: ${navigator.language}`);if(typeof window<"u")Q.push(`viewport: ${window.innerWidth}×${window.innerHeight}`)}catch{}return Q.join(`
`)}var S0="nimiq-shell-report-bug-style",fZ='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20a6 6 0 0 0 6-6v-3a6 6 0 0 0-12 0v3a6 6 0 0 0 6 6Z"/><path d="M10 6.5 8.5 4M14 6.5 15.5 4"/><path d="M12 8v12"/><path d="M6 11H3M6 15H3M6.5 18.5 4 20M18 11h3M18 15h3M17.5 18.5 20 20"/></svg>';function E4(Q){if(Q.getElementById(S0))return;let Z=Q.createElement("style");Z.id=S0,Z.textContent=`
.nq-fb-scrim { position:fixed; inset:0; z-index:10000; display:flex; align-items:center;
  justify-content:center; padding:16px; background:rgba(31,35,72,.5);
  font-family:'Mulish','Muli',system-ui,sans-serif; }
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
.nq-fb-error { display:none; margin:0 0 12px; font-size:13px; font-weight:600; color:#d94432; }
.nq-fb-error a { color:inherit; }
.nq-fb-actions { display:flex; align-items:center; justify-content:flex-end; gap:8px; }
.nq-fb-cancel { padding:10px 12px; border:none; border-radius:6px; background:none; cursor:pointer;
  font-family:inherit; font-size:13px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.5));
  transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-fb-cancel:hover { background:var(--nq-cc-menu-hover, rgba(31,35,72,.06)); }
.nq-fb-send { padding:10px 18px; border:none; border-radius:500px; background:#0582ca; color:#fff;
  cursor:pointer; font-family:inherit; font-size:14px; font-weight:700;
  transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-fb-send:hover { background:#0d6dab; }
.nq-fb-send[disabled] { opacity:.6; cursor:default; }
.nq-fb-cancel:focus-visible, .nq-fb-send:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:2px; }
.nq-fb-toast { position:fixed; left:50%; bottom:24px; transform:translateX(-50%); z-index:10001;
  padding:11px 16px; border-radius:6px; background:#1f2348; color:#fff;
  font-family:'Mulish','Muli',system-ui,sans-serif; font-size:14px; font-weight:600;
  box-shadow:0 4px 14px rgba(31,35,72,.25); }
`,Q.head.appendChild(Z)}function w(Q){return Q.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function A4(Q,Z){let z=Q.createElement("div");z.className="nq-fb-toast",z.setAttribute("role","status"),z.textContent=Z,Q.body.appendChild(z),setTimeout(()=>z.remove(),3000)}function TZ(Q,Z,z){if(Q.getElementById("nq-fb-scrim"))return;E4(Q);let X=(M)=>Z.t(M),K=z.diagnostics!==!1,Y=Q.createElement("div");Y.id="nq-fb-scrim",Y.className="nq-fb-scrim",Y.innerHTML=`
    <div class="nq-fb-card" role="dialog" aria-modal="true" aria-labelledby="nq-fb-title">
      <div class="nq-fb-head">${fZ}<h2 class="nq-fb-title" id="nq-fb-title">${w(X("shell.reportBug"))}</h2></div>
      <label class="nq-fb-field">
        <span class="nq-fb-label">${w(X("shell.fbType"))}</span>
        <select class="nq-fb-input" id="nq-fb-type">
          <option value="bug">${w(X("shell.fbBug"))}</option>
          <option value="idea">${w(X("shell.fbIdea"))}</option>
          <option value="question">${w(X("shell.fbQuestion"))}</option>
        </select>
      </label>
      <label class="nq-fb-field">
        <span class="nq-fb-label">${w(X("shell.fbSummary"))}</span>
        <input class="nq-fb-input" type="text" id="nq-fb-summary" maxlength="120" autocomplete="off" />
      </label>
      <label class="nq-fb-field">
        <span class="nq-fb-label">${w(X("shell.fbDetails"))}</span>
        <textarea class="nq-fb-input" id="nq-fb-details" maxlength="4000"></textarea>
      </label>
      ${K?`<label class="nq-fb-diag">
        <input type="checkbox" id="nq-fb-diag" checked />${w(X("shell.fbIncludeDiag"))}
      </label>`:""}
      <p class="nq-fb-error" id="nq-fb-error" role="alert"></p>
      <div class="nq-fb-actions">
        <button type="button" class="nq-fb-cancel" id="nq-fb-cancel">${w(X("shell.cancel"))}</button>
        <button type="button" class="nq-fb-send" id="nq-fb-send">${w(X("shell.fbSend"))}</button>
      </div>
    </div>`,Q.body.appendChild(Y);let V=(M)=>Y.querySelector(`#${M}`),W=V("nq-fb-type"),$=V("nq-fb-summary"),J=V("nq-fb-details"),N=K?V("nq-fb-diag"):null,A=V("nq-fb-error"),_=V("nq-fb-send"),P=(M)=>{if(M.key==="Escape")H()};function H(){Y.remove(),Q.removeEventListener("keydown",P)}V("nq-fb-cancel").addEventListener("click",H),Y.addEventListener("pointerdown",(M)=>{if(M.target===Y)H()}),Q.addEventListener("keydown",P),$.focus();for(let M of[W,$,J])M.addEventListener("input",()=>{A.style.display="none"});_.addEventListener("click",async()=>{let M={type:W.value||"",title:$.value,description:J.value,context:z.context};if(N?.checked)if(z.bot)M.pageContext=DZ();else M.diagnostic=R0();let C=b0(M);if(C){A.textContent=X(C),A.style.display="block";return}_.disabled=!0,_.textContent=X("shell.fbSending"),A.style.display="none";let O=z.bot?await q0(z.bot,M):await w0(z.endpoint,M);if(_.disabled=!1,_.textContent=X("shell.fbSend"),O.ok){H(),A4(Q,X("shell.fbThanks")),z.onSubmitted?.(O);return}let x=O.error??X("shell.fbFailed");A.innerHTML=O.fallbackMailto?`${w(x)} <a href="${w(O.fallbackMailto)}">${w(X("shell.fbFailEmail"))}</a>`:w(x),A.style.display="block"})}function x4(Q){let Z=Q.name?.trim(),z=Q.network.trim();if(!Z)return z;if(Z.toLowerCase()===z.toLowerCase())return Z;return`${Z} · ${z}`}var v0="nimiq-shell-asset-list-style";function U4(){if(typeof document>"u"||document.getElementById(v0))return;let Q=document.createElement("style");Q.id=v0,Q.textContent=`
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
`,document.head.appendChild(Q)}function l(Q,Z,z){let X=document.createElement(Q);if(Z)X.className=Z;if(z)z.appendChild(X);return X}function hZ(Q,Z){if(Z.injectStyles!==!1)U4();let z=Z.cacheMs??30000,X=()=>typeof Z.assets==="function"?Z.assets():Z.assets,K=l("div","nq-al");Q.appendChild(K);let Y=new Map,V="",W=!1;function $(_){let P=_.map((M)=>`${M.ticker}${M.address?"+":"-"}`).join(" ");if(P===V)return;V=P,K.textContent="";let H=new Map;for(let M of _){let C=typeof Z.onSelect==="function"&&!!M.address,O=l(C?"button":"div","nq-al-row",K);if(C)O.type="button",O.addEventListener("click",()=>Z.onSelect(M));let x=l("span","nq-al-art",O);if(M.icon)x.appendChild(M.icon(26));let U=l("span","nq-al-id",O),f=l("span","nq-al-tick",U);f.textContent=M.ticker;let EQ=l("span","nq-al-name",U);EQ.textContent=x4(M);let T=l("span","nq-al-amt",O),ZQ=l("span","nq-al-units nq-al-pending",T);ZQ.textContent="—";let lQ=l("span","nq-al-fiat",T),zQ=Y.get(M.ticker),R={units:zQ?.units??null,fiat:zQ?.fiat??null,fetchedAt:zQ?.fetchedAt??0,unitsEl:ZQ,fiatEl:lQ};if(H.set(M.ticker,R),R.units!==null)J(M,R)}Y.clear();for(let[M,C]of H)Y.set(M,C)}function J(_,P){if(P.units===null)return;if(P.unitsEl.classList.remove("nq-al-pending"),P.unitsEl.textContent=vQ(P.units,_.decimals,{maxDecimals:_.maxDecimals??_.decimals}),P.fiat===null){P.fiatEl.textContent="";return}let H=Z.fiatTicker?.()??"USD";try{P.fiatEl.textContent=GQ(P.fiat,H)}catch{P.fiatEl.textContent=""}}async function N(_,P,H){let M=Y.get(_.ticker);if(!M)return;if(!P&&M.units!==null&&H-M.fetchedAt<z){J(_,M);return}try{let C=await _.balance();if(W)return;if(C!==null&&C!==void 0)M.units=typeof C==="bigint"?C:BigInt(Math.round(C)),M.fetchedAt=H}catch{}if(W)return;if(J(_,M),Z.rate&&M.units!==null){try{let C=await Z.rate(_.ticker);if(W)return;M.fiat=C===null?null:Number(M.units)/10**_.decimals*C}catch{M.fiat=null}if(!W)J(_,M)}}async function A(_=!1){if(W)return;let P=X();$(P);let H=Date.now();await Promise.all(P.map((M)=>N(M,_,H)))}if($(X()),Z.autoRefresh!==!1)A();return{el:K,refresh:A,total(){let _=null;for(let P of Y.values()){if(P.fiat===null)continue;_=(_??0)+P.fiat}return _},units:(_)=>Y.get(_)?.units??null,clear(){for(let _ of Y.values())_.units=null,_.fiat=null,_.fetchedAt=0,_.unitsEl.classList.add("nq-al-pending"),_.unitsEl.textContent="—",_.fiatEl.textContent=""},destroy(){W=!0,K.remove()}}}var H4=/^NQ[0-9]{2}[0-9A-HJ-NP-VXY]{32}$/;function c0(Q){let Z=Q.replace(/\s+/g,"");if(!Z)return{cells:[],columns:1};if(H4.test(Z.toUpperCase()))return{cells:Z.match(/.{4}/g)??[Z],columns:3};let z=Z.length,X=Math.floor(z/3),K=z%3,Y=[],V=0;for(let W=0;W<3;W+=1){let $=X+(W<K?1:0);if($===0)continue;Y.push(Z.slice(V,V+$)),V+=$}return{cells:Y,columns:1}}var B0="nimiq-shell-corner-control-style",y0="nq-shell:fiat",p0="nq-shell:label:";function O4(Q){try{return localStorage.getItem(p0+Q.replace(/\s+/g,""))}catch{return null}}function L4(Q,Z){try{localStorage.setItem(p0+Q.replace(/\s+/g,""),Z)}catch{}}var D4={en:"English",es:"Español",de:"Deutsch",fr:"Français",pt:"Português",hi:"हिन्दी",zh:"中文",tr:"Türkçe",ko:"한국어",vi:"Tiếng Việt",ha:"Hausa"},g0={AED:"ae",ARS:"ar",AUD:"au",BRL:"br",CAD:"ca",CHF:"ch",CLP:"cl",CNY:"cn",CRC:"cr",CZK:"cz",DKK:"dk",EUR:"eu",GBP:"gb",GMD:"gm",GTQ:"gt",HKD:"hk",HUF:"hu",IDR:"id",ILS:"il",INR:"in",JPY:"jp",KRW:"kr",MXN:"mx",MYR:"my",NGN:"ng",NOK:"no",NZD:"nz",PHP:"ph",PKR:"pk",PLN:"pl",RUB:"ru",SEK:"se",SGD:"sg",THB:"th",TRY:"tr",TWD:"tw",UAH:"ua",USD:"us",VND:"vn",ZAR:"za"};function k4(){if(typeof document>"u"||document.getElementById(B0))return;let Q=document.createElement("style");Q.id=B0,Q.textContent=`
.nq-cc { position:relative; display:inline-block; font-family:'Mulish','Muli',system-ui,sans-serif; }
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
.nq-cc-menu { position:absolute; top:calc(100% + 8px); right:0; z-index:60; width:272px;
  max-width:calc(100vw - 24px); padding:6px;
  background:var(--nq-cc-menu-bg, #fff); border:var(--nq-cc-menu-border, none); border-radius:10px;
  box-shadow:var(--nq-cc-menu-shadow, 0 4px 28px rgba(0,0,0,.16));
  color:var(--nq-cc-menu-fg, #1f2348); text-align:left; }
.nq-cc-menu[hidden] { display:none; }
.nq-cc-divider { height:1px; margin:6px 4px; background:var(--nq-cc-menu-line, rgba(31,35,72,.08)); }
.nq-cc-section { padding:6px 4px; position:relative; }

/* signed out: navy Connect (bottom-right radial) + the quiet onboard line */
.nq-cc-connect { position:relative; width:100%; height:36px; border:none; border-radius:500px;
  display:flex; align-items:center; justify-content:center; font-family:inherit; font-size:14px;
  font-weight:700; color:#fff; cursor:pointer; background-color:#1f2348;
  background-image:radial-gradient(100% 100% at 100% 100%, #260133, #1f2348); }
.nq-cc-connect:hover { background-image:radial-gradient(100% 100% at 100% 100%, #180021, #151833); }
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
  font-family:inherit; font-size:14px; font-weight:600; color:#1f2348; background:#fff;
  box-shadow:inset 0 0 0 2px rgba(31,35,72,.1); }
.nq-cc-name-input:focus { outline:none; box-shadow:inset 0 0 0 2px #0582ca; }
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
.nq-cc-receive:hover, .nq-cc-receive:focus-visible { background:rgba(31,35,72,.12); }
.nq-cc-receive:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:2px; }
.nq-cc-send { flex:1; display:inline-flex; align-items:center; justify-content:center; gap:7px; height:32px;
  border:none; border-radius:500px; cursor:pointer; font-family:inherit; font-size:13px; font-weight:700;
  color:#fff; background-color:#0582ca; background-image:radial-gradient(100% 100% at 100% 100%, #265dd7, #0582ca); }
.nq-cc-send:hover { background-image:radial-gradient(100% 100% at 100% 100%, #1f4fbc, #0473b3); }
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
.nq-cc-view-send { display:none; }
.nq-cc.nq-cc-show-send .nq-cc-view-main { display:none; }
.nq-cc.nq-cc-show-send .nq-cc-view-send { display:block; }
.nq-cc-send-body { display:flex; flex-direction:column; gap:8px; padding:10px 8px 8px; }
.nq-cc-field-label { font-size:12px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.5)); }
/* inputs: inset box-shadow border, never border (rule 1) */
.nq-cc-input { width:100%; border:none; border-radius:8px; padding:9px 10px; font-family:inherit;
  font-size:14px; font-weight:600; color:#1f2348; background:#fff;
  box-shadow:inset 0 0 0 2px rgba(31,35,72,.12); }
.nq-cc-input:focus { outline:none; box-shadow:inset 0 0 0 2px #0582ca; }
.nq-cc-input::placeholder { color:rgba(31,35,72,.3); font-weight:600; }
.nq-cc-input-addr { font-family:'Fira Mono',ui-monospace,monospace; font-size:12px;
  letter-spacing:.02em; text-transform:uppercase; }
.nq-cc-amount-row { position:relative; }
.nq-cc-amount-row .nq-cc-input { padding-right:44px; }
.nq-cc-amount-suffix { position:absolute; right:11px; top:50%; transform:translateY(-50%);
  font-size:13px; font-weight:700; color:rgba(31,35,72,.45); pointer-events:none; }
.nq-cc-send-hint { font-size:12px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.5)); }
.nq-cc-send-hint:empty { display:none; }
.nq-cc-send-confirm { width:100%; height:36px; border:none; border-radius:500px; margin-top:2px;
  font-family:inherit; font-size:14px; font-weight:700; color:#fff; cursor:pointer;
  background-color:#0582ca; background-image:radial-gradient(100% 100% at 100% 100%, #265dd7, #0582ca); }
.nq-cc-send-confirm:hover:not(:disabled) { background-image:radial-gradient(100% 100% at 100% 100%, #1f4fbc, #0473b3); }
.nq-cc-send-confirm:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:3px; }
.nq-cc-send-confirm:disabled { opacity:.4; cursor:default; }
.nq-cc-send-error { font-size:12px; font-weight:600; color:#d94432; text-align:center; }
.nq-cc-send-error:empty { display:none; }
.nq-cc-send-done { display:none; flex-direction:column; align-items:center; gap:6px;
  padding:16px 0 10px; color:#13b59d; font-size:14px; font-weight:700; }
.nq-cc-view-send.nq-cc-sent .nq-cc-send-body { display:none; }
.nq-cc-view-send.nq-cc-sent .nq-cc-send-done { display:flex; }
.nq-cc-back { display:flex; align-items:center; gap:6px; width:100%; padding:7px 10px; border:none;
  border-radius:6px; background:none; font-family:inherit; font-size:15px;
  color:var(--nq-cc-menu-muted, rgba(31,35,72,.6)); text-align:left; cursor:pointer;
  transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-back:hover { background:var(--nq-cc-menu-hover, rgba(31,35,72,.06)); }
.nq-cc-back:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:-2px; }
.nq-cc-receive-body { display:flex; flex-direction:column; align-items:center; padding:10px 8px 8px; }
.nq-cc-qr { display:block; width:164px; height:164px; }
.nq-cc-qr:empty { display:none; }
.nq-cc-qr > * { display:block; width:100%; height:100%; }
.nq-cc-receive-hint { font-size:12px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.45)); margin:8px 0 2px; }

/* tap-to-copy address: upstream Copyable verbatim: light-blue tooltip, tinted
   field, and the blue HOLDS after copy until focus leaves */
.nq-cc-copy-wrap { position:relative; display:block; margin-top:10px; width:100%; }
.nq-cc-address { display:grid; grid-template-columns:repeat(var(--nq-cc-addr-cols, 3), 1fr); gap:3px 0; justify-items:center;
  width:100%; padding:8px 6px; border:none; border-radius:6px; background:rgba(31,35,72,.04); cursor:pointer;
  font-family:'Fira Mono',ui-monospace,monospace; font-size:12px; color:var(--nq-cc-menu-muted, rgba(31,35,72,.7));
  transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)), color .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-address:hover, .nq-cc-address:focus,
.nq-cc-copy-wrap.nq-cc-copied .nq-cc-address, .nq-cc-copy-wrap.nq-cc-copied-hold .nq-cc-address {
  background:rgba(5,130,202,.08); color:#0582ca; }
.nq-cc-address:focus-visible { outline:2px solid #0582ca; outline-offset:2px; }
/* The wrong-chain guard. Orange because it is a WARNING: red would read as an
   error that already happened, and grey would read as fine print, which is
   exactly what this must not be.
   Colours are the nq registry status-alert warning triplet verbatim
   (colors-orange on colors-orange-400 with a colors-orange-500 ring), not an
   approximation of it. NOTE: this block is a JS template literal, so it must
   never contain a backtick. */
.nq-cc-net-warn { margin:8px 0 0; padding:8px 10px; border-radius:6px;
  background:oklch(0.951 0.0221 74.1);
  outline:1.5px solid oklch(0.9396 0.0436 71.7); outline-offset:-1.5px;
  color:oklch(0.7387 0.179 56.67);
  font-size:11.5px; font-weight:700; line-height:1.4; text-align:center; }
.nq-cc-net-warn[hidden] { display:none; }

/* Saved recipients: a wrapping row of quiet pills under the address field.
   Pills because every actionable thing in this menu is a pill, and quiet
   because they are a shortcut, not the primary way to fill the field. */
.nq-cc-contacts { display:flex; flex-wrap:wrap; gap:5px; margin:6px 0 2px; }
.nq-cc-contacts[hidden] { display:none; }
.nq-cc-contact { max-width:100%; padding:4px 10px; border:none; border-radius:999px;
  background:rgba(31,35,72,.06); color:var(--nq-cc-menu-fg, #1f2348);
  font-family:inherit; font-size:11.5px; font-weight:700; line-height:1.3; cursor:pointer;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-contact:hover { background:rgba(5,130,202,.12); color:#0582ca; }
.nq-cc-contact:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:2px; }
.nq-cc-copy-tooltip { position:absolute; left:50%; bottom:calc(100% + 10px);
  transform:translateX(-50%) translateY(4px); padding:8px 12px; border-radius:4px;
  background-image:radial-gradient(100% 100% at 100% 100%, #265dd7, #0582ca); color:#fff; font-size:13px;
  font-weight:600; line-height:1.1; white-space:nowrap; pointer-events:none; opacity:0; z-index:30;
  box-shadow:0 2px 2.5px rgba(31,35,72,.02), 0 7px 8.5px rgba(31,35,72,.04), 0 18px 38px rgba(31,35,72,.07);
  transition:opacity .3s var(--nimiq-ease, cubic-bezier(.25,0,0,1)), transform .3s var(--nimiq-ease, cubic-bezier(.25,0,0,1));
  transition-delay:.2s; }
.nq-cc-copy-tooltip::after { content:''; position:absolute; left:50%; top:calc(100% - 1px); width:14px; height:7px;
  margin-left:-7px; transform:scaleY(-1);
  background-image:radial-gradient(100% 100% at 100% 100%, #265dd7, #0582ca);
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
.nq-cc-grid-wrap::after { content:''; position:absolute; left:0; right:0; bottom:0; height:28px;
  pointer-events:none; opacity:1; transition:opacity .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1));
  background:linear-gradient(to bottom, rgba(255,255,255,0), var(--nq-cc-menu-bg, #fff));
  border-radius:0 0 6px 6px; }
.nq-cc-grid-wrap[data-at-end]::after, .nq-cc-grid-wrap[data-no-scroll]::after { opacity:0; }
.nq-cc-grid { display:grid; gap:4px; padding:4px; padding-right:8px; max-height:196px; overflow-y:auto;
  background:rgba(31,35,72,.04); border-radius:6px; }
.nq-cc-grid.nq-cc-cols-2 { grid-template-columns:1fr 1fr; }
.nq-cc-grid.nq-cc-cols-3 { grid-template-columns:repeat(3, 1fr); }
.nq-cc-grid::-webkit-scrollbar { width:11px; }
.nq-cc-grid::-webkit-scrollbar-track { background:transparent; margin:4px 0; }
.nq-cc-grid::-webkit-scrollbar-thumb { background:rgba(31,35,72,.28); border-radius:500px;
  border:3px solid transparent; background-clip:padding-box; }
.nq-cc-grid::-webkit-scrollbar-thumb:hover { background-color:rgba(31,35,72,.45); }
@supports (-moz-appearance: none) {
  .nq-cc-grid { scrollbar-width:thin; scrollbar-color:rgba(31,35,72,.28) transparent; }
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
.nq-cc-disconnect:hover { color:#d94432; }
.nq-cc-disconnect:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:2px; border-radius:3px; }
.nq-cc-badge { font-size:12px; line-height:1; font-weight:700; letter-spacing:.09em; text-transform:uppercase;
  color:#fc8702; background:rgba(31,35,72,.07); padding:5px 8px; border-radius:4px; }
/* no footer at all when there is nothing to show */
.nq-cc:not([data-testnet]):not([data-connected]) .nq-cc-footer,
.nq-cc:not([data-testnet]):not([data-connected]) .nq-cc-footer-divider,
.nq-cc[data-mode="miniapp"]:not([data-testnet]) .nq-cc-footer,
.nq-cc[data-mode="miniapp"]:not([data-testnet]) .nq-cc-footer-divider { display:none; }

`,document.head.appendChild(Q)}var dQ='<svg class="nq-cc-caret" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',m0='<svg viewBox="0 -4 64 64" aria-hidden="true"><path opacity=".25" d="M62.3 25.4L49.2 2.6A5.3 5.3 0 0 0 44.6 0H18.4c-1.9 0-3.6 1-4.6 2.6L.7 25.4c-1 1.6-1 3.6 0 5.2l13.1 22.8c1 1.6 2.7 2.6 4.6 2.6h26.2c1.9 0 3.6-1 4.6-2.6l13-22.8c1-1.6 1-3.6.1-5.2z" fill="currentColor"/></svg>',f4='<svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" style="flex:none;opacity:.85"><rect x="2" y="5" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 9h16" stroke="currentColor" stroke-width="1.5"/><circle cx="6" cy="13" r="1" fill="currentColor"/></svg>',d0='<svg width="16" height="12" viewBox="0 0 16 12" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="%CLS%"><path d="M10,1l5,5l-5,5" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="14" y1="6" x2="1" y2="6" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',T4='<svg class="nq-cc-scan-glyph" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g fill="currentColor"><path d="M1.21 7.06c.67 0 1.21-.54 1.21-1.21l-.04-3.12a.3.3 0 0 1 .3-.3H5.7a1.21 1.21 0 1 0 0-2.43H2.37A2.4 2.4 0 0 0 0 2.42v3.43c0 .67.54 1.21 1.21 1.21zM5.69 37.58H2.73a.3.3 0 0 1-.3-.3v-3.13a1.21 1.21 0 1 0-2.43 0v3.43A2.4 2.4 0 0 0 2.37 40H5.7a1.21 1.21 0 0 0 0-2.42zM38.79 32.94c-.67 0-1.21.54-1.21 1.21l.04 3.12a.3.3 0 0 1-.3.3H34.3a1.21 1.21 0 1 0 0 2.43h3.32A2.4 2.4 0 0 0 40 37.58v-3.43c0-.67-.54-1.21-1.21-1.21zM37.63 0H34.3a1.21 1.21 0 1 0 0 2.42h2.96c.17 0 .3.14.3.3v3.13a1.21 1.21 0 0 0 2.43 0V2.42A2.4 2.4 0 0 0 37.63 0z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M13.94 15.15H6.67c-.67 0-1.22-.54-1.22-1.21V6.67c0-.67.55-1.21 1.22-1.21h7.27c.67 0 1.21.54 1.21 1.2v7.28c0 .67-.54 1.21-1.21 1.21zM8.18 7.88a.3.3 0 0 0-.3.3v4.24c0 .17.13.3.3.3h4.24a.3.3 0 0 0 .3-.3V8.18a.3.3 0 0 0-.3-.3H8.18zM6.67 24.85h7.27c.67 0 1.21.54 1.21 1.21v7.27c0 .67-.54 1.22-1.21 1.22H6.67c-.67 0-1.22-.55-1.22-1.22v-7.27c0-.67.55-1.21 1.22-1.21zm5.75 7.27a.3.3 0 0 0 .3-.3v-4.24a.3.3 0 0 0-.3-.3H8.18a.3.3 0 0 0-.3.3v4.24c0 .17.13.3.3.3h4.24zM26.06 5.45h7.27c.67 0 1.21.55 1.21 1.22v7.27c0 .67-.54 1.21-1.2 1.21h-7.28c-.67 0-1.21-.54-1.21-1.21V6.67c0-.67.54-1.22 1.21-1.22zm5.76 7.28a.3.3 0 0 0 .3-.3V8.17a.3.3 0 0 0-.3-.3h-4.24a.3.3 0 0 0-.3.3v4.24c0 .17.13.3.3.3h4.24z"/><path d="M17.58 10.6h1.2a.9.9 0 1 0 0-1.81.3.3 0 0 1-.3-.3V6.66a.9.9 0 1 0-1.81 0V9.7c0 .5.4.9.9.9zM21.21 7.58c.17 0 .3.13.3.3v6.66a.9.9 0 1 0 1.82 0V6.67c0-.5-.4-.91-.9-.91H21.2a.9.9 0 1 0 0 1.82zM12.42 18.18c0 .5.41.91.91.91h4.25c.5 0 .9-.4.9-.9v-4.86a.9.9 0 1 0-1.81 0v3.64a.3.3 0 0 1-.3.3h-3.04c-.5 0-.9.4-.9.91z"/><path d="M9.09 17.27c-.5 0-.9.4-.9.91v3.03a.3.3 0 0 1-.31.3H6.67a.9.9 0 1 0 0 1.82h15.75c.5 0 .91-.4.91-.9v-3.64a.9.9 0 0 0-1.82 0v2.42a.3.3 0 0 1-.3.3h-10.9a.3.3 0 0 1-.31-.3v-3.03c0-.5-.4-.9-.91-.9zM22.12 26.06c0-.5-.4-.9-.9-.9h-3.64c-.5 0-.91.4-.91.9v4.85a.9.9 0 1 0 1.81 0v-3.64c0-.16.14-.3.3-.3h2.43c.5 0 .91-.4.91-.9zM33.33 32.42h-10.3a.3.3 0 0 1-.3-.3V29.7a.9.9 0 1 0-1.82 0v3.63c0 .5.4.91.9.91h11.52a.9.9 0 0 0 0-1.82z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M29.1 30h-3.65a.9.9 0 0 1-.9-.91v-3.64c0-.5.4-.9.9-.9h3.64c.5 0 .91.4.91.9v3.64c0 .5-.4.91-.9.91zm-2.43-3.64a.3.3 0 0 0-.3.3v1.22c0 .17.13.3.3.3h1.2a.3.3 0 0 0 .31-.3v-1.21a.3.3 0 0 0-.3-.3h-1.21z"/><path d="M32.73 20.9c-.5 0-.91.42-.91.92v7.88a.9.9 0 0 0 1.82 0v-7.88c0-.5-.41-.91-.91-.91zM33.64 17.58c0-.5-.41-.91-.91-.91h-6.67c-.5 0-.9.4-.9.9v3.64a.9.9 0 0 0 1.8 0V18.8c0-.17.15-.3.31-.3h5.46c.5 0 .9-.41.9-.91z"/></g></svg>',h4='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2.5px" stroke-linejoin="round"><path d="M40.25,23.25v-.5a6.5,6.5,0,0,0-6.5-6.5h-3.5a6.5,6.5,0,0,0-6.5,6.5v6.5a6.5,6.5,0,0,0,6.5,6.5h2"/><path d="M23.75,40.75v.5a6.5,6.5,0,0,0,6.5,6.5h3.5a6.5,6.5,0,0,0,6.5-6.5v-6.5a6.5,6.5,0,0,0-6.5-6.5h-2"/><line x1="32" y1="11.25" x2="32" y2="15.25"/><line x1="32" y1="48.75" x2="32" y2="52.75"/></g></svg>',S4=0;function q4(){let Q=`nq-cc-hex-${S4+=1}`;return`<svg class="nq-cc-hexlogo" viewBox="0 0 20 18" aria-hidden="true"><g fill="none"><path fill="url(#${Q})" d="M19.964 8.156 15.758.844A1.69 1.69 0 0014.299 0H5.887c-.6 0-1.156.32-1.456.844L.225 8.156c-.3.523-.3 1.165 0 1.688l4.206 7.312c.3.523.856.844 1.456.844h8.412c.6 0 1.156-.32 1.456-.844l4.206-7.312a1.69 1.69 0 00.003-1.688"/><defs><radialGradient id="${Q}" cx="0" cy="0" r="1" gradientTransform="matrix(20.1956 0 0 20.2552 15.188 17.766)" gradientUnits="userSpaceOnUse"><stop stop-color="#ec991c"/><stop offset="1" stop-color="#e9b213"/></radialGradient></defs></g></svg>`}function l0(Q,Z){let z=Q.address?O4(Q.address):null;if(z)return z;if(Q.label)return Q.label;let X=Q.address?.trim()??"";if(!X)return Z;return`${X.slice(0,7)}…${X.slice(-4)}`}function j(Q,Z,z){let X=document.createElement(Q);if(Z)X.className=Z;if(z)z.appendChild(X);return X}function u0(Q,Z){let z=()=>{let X=Z.scrollHeight-Z.clientHeight>2;Q.toggleAttribute("data-no-scroll",!X),Q.toggleAttribute("data-at-end",X&&Z.scrollTop+Z.clientHeight>=Z.scrollHeight-2)};if(Z.addEventListener("scroll",z,{passive:!0}),typeof ResizeObserver<"u")new ResizeObserver(z).observe(Z);z()}function i0(Q,Z){let{wallet:z,i18n:X}=Z,K=Z.languages??FQ,Y=Z.receive!==!1,V=!!Z.assets,W=typeof Z.getBalanceLuna==="function"||V,$=!!Z.fiat&&Z.fiat.currencies.length>0;if(Z.injectStyles!==!1)k4();let J=Z.fiat?.default??"USD";try{let G=localStorage.getItem(y0);if(G&&Z.fiat?.currencies.includes(G))J=G}catch{}if(Z.fiat&&!Z.fiat.currencies.includes(J))J=Z.fiat.currencies[0];let N=j("div","nq-cc");if(N.dataset.mode=!z||z.mode==="miniapp"?"miniapp":"hub",!z)N.dataset.face="lang";if(Z.network==="test")N.dataset.testnet="";Q.appendChild(N);let A=(G)=>K.find((I)=>I.id===G)??K[0],_=(G)=>D4[G.id]??G.name,P=j("button","nq-cc-face",N);P.type="button",P.setAttribute("aria-haspopup","menu"),P.setAttribute("aria-expanded","false");let H=j("button","nq-cc-face-flag",N);H.type="button",H.setAttribute("aria-haspopup","menu"),H.setAttribute("aria-expanded","false");function M(){P.textContent="";let G=z?.account??null;if(G){N.dataset.connected="";let I=j("span","nq-cc-face-icon",P);if(Z.identicon)I.appendChild(Z.identicon(G.address,28));else I.innerHTML=m0;let F=j("span","nq-cc-face-label",P);F.textContent=l0(G,X.t("shell.account"))}else{delete N.dataset.connected,P.insertAdjacentHTML("beforeend",f4);let I=j("span","nq-cc-face-label",P);I.textContent=X.t("shell.connectWallet")}P.insertAdjacentHTML("beforeend",dQ)}function C(){H.textContent="";let G=A(X.getLanguage());H.setAttribute("aria-label",X.t("shell.language")),H.appendChild(B(G.flag,{size:24})),H.insertAdjacentHTML("beforeend",dQ)}let O=j("div","nq-cc-menu",N);O.hidden=!0;let x=j("div","nq-cc-view-receive",O),U=j("div","nq-cc-view-send",O),f=j("div","nq-cc-view-main",O),EQ=[];function T(G,I){EQ.push([G,I]),G.textContent=X.t(I)}let ZQ=()=>{};function lQ(){for(let[G,I]of EQ)G.textContent=X.t(I);ZQ()}let zQ=j("div","nq-cc-section nq-cc-when-out nq-cc-when-hub",f),R=j("button","nq-cc-connect",zQ);if(R.type="button",T(R,"shell.connectWallet"),R.addEventListener("click",async()=>{if(!z)return;R.disabled=!0,R.textContent=X.t("shell.connecting");try{await z.connect(),q(!1),R.textContent=X.t("shell.connectWallet")}catch{R.textContent=X.t("shell.retry")}finally{R.disabled=!1}}),Z.onboard){let G=j("button","nq-cc-onboard",zQ);G.type="button",T(G,"shell.newToNimiq"),G.addEventListener("click",()=>Z.onboard())}j("div","nq-cc-divider nq-cc-when-out nq-cc-when-hub",f);let uQ=j("div","nq-cc-section nq-cc-wallet nq-cc-when-connected nq-cc-when-hub",f),cQ=j("div","nq-cc-account",uQ),pQ=j("span","nq-cc-identicon",cQ),AQ=j("button","nq-cc-name",cQ);AQ.type="button",AQ.addEventListener("click",()=>n0(AQ));let s=j("div","nq-cc-balance",cQ);s.hidden=!0;let SZ=j("span","nq-cc-balance-nim",s),XQ=j("span","nq-cc-balance-fiat",s),d=null;if(V)d=hZ(uQ,{assets:Z.assets,fiatTicker:()=>J,rate:$?(G)=>Z.fiat.rate(J,G):void 0,autoRefresh:!1,onSelect:Y?(G)=>oZ(G):void 0});function n0(G){if(G.querySelector("input"))return;let I=G.textContent??"";G.textContent="";let F=document.createElement("input");F.className="nq-cc-name-input",F.value=I,F.maxLength=24,G.appendChild(F),F.focus(),F.select();let D=()=>{let S=F.value.trim()||I;if(G.textContent=S,S!==I){if(z?.account)L4(z.account.address,S);if(M(),Z.onRename)Z.onRename(S)}};F.addEventListener("blur",D),F.addEventListener("keydown",(S)=>{if(S.key==="Enter")F.blur();if(S.key==="Escape")F.value=I,F.blur()})}{let G=j("div","nq-cc-actions",uQ);if(Y){let I=j("button","nq-cc-receive",G);I.type="button",I.insertAdjacentHTML("beforeend",d0.replace("%CLS%","nq-cc-arrow-down"));let F=j("span",void 0,I);T(F,"shell.receive"),I.addEventListener("click",()=>oZ())}{let I=j("button","nq-cc-send",G);I.type="button",I.insertAdjacentHTML("beforeend",d0.replace("%CLS%","nq-cc-arrow-up"));let F=j("span",void 0,I);T(F,"shell.send"),I.addEventListener("click",()=>{if(Z.send)q(!1),Z.send();else G1()})}if(Z.scan){let I=j("button","nq-cc-scan",G);I.type="button",I.setAttribute("aria-label","Scan QR code"),I.insertAdjacentHTML("beforeend",T4),I.addEventListener("click",()=>{q(!1),Z.scan()})}}if(j("div","nq-cc-divider nq-cc-when-connected nq-cc-when-hub",f),Z.createCashlink){let G=j("button","nq-cc-row nq-cc-when-connected nq-cc-when-hub",f);G.type="button";let I=j("span","nq-cc-cashlink-slot",G);I.innerHTML=h4;let F=j("span","nq-cc-strong",G);T(F,"shell.createCashlink"),G.addEventListener("click",()=>{q(!1),Z.createCashlink()}),j("div","nq-cc-divider nq-cc-when-connected nq-cc-when-hub",f)}let qZ=j("div","nq-cc-section",f),a=j("button","nq-cc-acc",qZ);a.type="button",a.setAttribute("aria-expanded","false");let r0=j("span","nq-cc-label",a);T(r0,"shell.language");let bZ=j("span","nq-cc-acc-value",a),wZ=j("span",void 0,bZ),o0=j("span","nq-cc-strong",bZ);a.insertAdjacentHTML("beforeend",dQ);let iQ=j("div","nq-cc-acc-body",qZ),RZ=j("div","nq-cc-grid-wrap",iQ),xQ=j("div","nq-cc-grid nq-cc-cols-2",RZ);u0(RZ,xQ),xQ.setAttribute("role","listbox"),xQ.setAttribute("aria-label",X.t("shell.language"));let vZ=new Map;for(let G of K){let I=j("button","nq-cc-card",xQ);I.type="button",I.setAttribute("role","option"),j("span","nq-cc-card-art",I).appendChild(B(G.flag,{size:26}));let D=j("span","nq-cc-card-name",I);D.textContent=_(G),I.addEventListener("click",()=>{X.setLanguage(G.id),window.setTimeout(()=>QZ(a,iQ),260)}),vZ.set(G.id,I)}function BZ(){let G=A(X.getLanguage());wZ.textContent="",wZ.appendChild(B(G.flag,{size:24})),o0.textContent=_(G);for(let[I,F]of vZ){let D=I===G.id;F.classList.toggle("nq-cc-current",D),F.setAttribute("aria-selected",String(D))}}let UQ=null,nQ=null,yZ=new Map;if($){let G=W?" nq-cc-when-connected":"";j("div",`nq-cc-divider${G}`,f);let I=j("div",`nq-cc-section${G}`,f),F=j("button","nq-cc-acc",I);F.type="button",F.setAttribute("aria-expanded","false");let D=j("span","nq-cc-label",F);T(D,"shell.amountsIn");let S=j("span","nq-cc-acc-value",F);UQ=j("span",void 0,S),nQ=j("span","nq-cc-strong",S),F.insertAdjacentHTML("beforeend",dQ);let g=j("div","nq-cc-acc-body",I),TQ=j("div","nq-cc-grid-wrap",g),YQ=j("div","nq-cc-grid nq-cc-cols-3",TQ);u0(TQ,YQ),YQ.setAttribute("role","listbox"),YQ.setAttribute("aria-label",X.t("shell.amountsIn"));for(let e of Z.fiat.currencies){let VQ=j("button","nq-cc-card",YQ);VQ.type="button",VQ.setAttribute("role","option");let J1=j("span","nq-cc-card-art",VQ),X0=g0[e];if(X0)J1.appendChild(B(X0,{size:26}));let _1=j("span","nq-cc-card-ticker",VQ);_1.textContent=e,VQ.addEventListener("click",()=>{if(e===J){window.setTimeout(()=>QZ(F,g),260);return}J=e;try{localStorage.setItem(y0,e)}catch{}if(gZ(),W)JQ(!0);Z.fiat.onChange?.(e),window.setTimeout(()=>QZ(F,g),260)}),yZ.set(e,VQ)}sZ(F,g)}function gZ(){if(!UQ||!nQ)return;UQ.textContent="";let G=g0[J];if(G)UQ.appendChild(B(G,{size:24}));nQ.textContent=J;for(let[I,F]of yZ){let D=I===J;F.classList.toggle("nq-cc-current",D),F.setAttribute("aria-selected",String(D))}}if(Z.openInPay){j("div","nq-cc-divider nq-cc-when-hub",f);let G=j("button","nq-cc-row nq-cc-when-hub",f);G.type="button",G.insertAdjacentHTML("beforeend",q4());let I=j("span","nq-cc-strong",G);T(I,"shell.openInPay"),G.addEventListener("click",()=>{q(!1);let F=Z.openInPay;window.location.href=typeof F==="function"?F():F})}if(Z.reportBug){if(typeof Z.reportBug==="object"&&Z.reportBug.bot)LZ(Z.reportBug.bot.service??"https://bot.nimiq.tech");j("div","nq-cc-divider",f);let G=j("button","nq-cc-row nq-cc-report",f);G.type="button",j("span","nq-cc-cashlink-slot",G).insertAdjacentHTML("beforeend",fZ);let F=j("span","nq-cc-strong",G);T(F,"shell.reportBug"),G.addEventListener("click",()=>{q(!1);let D=Z.reportBug;if(typeof D==="function")D();else TZ(document,X,D)})}if(z&&Z.switchAccount!==!1){let G=j("button","nq-cc-row nq-cc-when-connected nq-cc-when-hub",f);G.type="button";let I=j("span","nq-cc-strong",G);T(I,"shell.switchAccount"),G.addEventListener("click",async()=>{q(!1);try{await z.connect()}catch{}})}j("div","nq-cc-divider nq-cc-footer-divider",f);let mZ=j("div","nq-cc-footer",f),rQ=j("button","nq-cc-disconnect nq-cc-when-connected nq-cc-when-hub",mZ);rQ.type="button",T(rQ,"shell.disconnect"),rQ.addEventListener("click",()=>{z?.disconnect(),q(!1)});let dZ=j("span","nq-cc-net-group",mZ),s0=j("span",void 0,dZ);T(s0,"shell.network");let a0=j("span","nq-cc-badge",dZ);a0.textContent="Testnet";let HQ=j("button","nq-cc-back",x);HQ.type="button",HQ.appendChild(document.createTextNode("‹ "));let lZ=j("span","nq-cc-strong",HQ);T(lZ,"shell.receive"),HQ.addEventListener("click",()=>N.classList.remove("nq-cc-show-receive")),j("div","nq-cc-divider",x);let OQ=j("div","nq-cc-receive-body",x),oQ=j("div","nq-cc-qr",OQ),$Q=j("span","nq-cc-copy-wrap",OQ),u=j("button","nq-cc-address",$Q);u.type="button",u.title=X.t("shell.copyAddress");let uZ=j("span","nq-cc-copy-tooltip",$Q);uZ.setAttribute("aria-hidden","true"),T(uZ,"shell.copied");let t0=j("p","nq-cc-receive-hint",OQ);T(t0,"shell.tapToCopy");let sQ=j("p","nq-cc-net-warn",OQ);sQ.hidden=!0;let aQ=null,cZ;u.addEventListener("click",()=>{let G=aQ??z?.account?.address;if(!G)return;try{navigator.clipboard.writeText(G)}catch{}$Q.classList.add("nq-cc-copied","nq-cc-copied-hold"),clearTimeout(cZ),cZ=setTimeout(()=>$Q.classList.remove("nq-cc-copied"),800)}),u.addEventListener("blur",()=>$Q.classList.remove("nq-cc-copied-hold"));let LQ=j("button","nq-cc-back",U);LQ.type="button",LQ.appendChild(document.createTextNode("‹ "));let e0=j("span","nq-cc-strong",LQ);T(e0,"shell.send"),LQ.addEventListener("click",()=>eQ()),j("div","nq-cc-divider",U);let c=j("div","nq-cc-send-body",U),Q1=j("label","nq-cc-field-label",c);T(Q1,"shell.recipient");let y=j("input","nq-cc-input nq-cc-input-addr",c);y.placeholder="NQ00 0000 0000 0000 0000 0000 0000 0000 0000",y.autocomplete="off",y.spellcheck=!1;let DQ=j("div","nq-cc-contacts",c);DQ.hidden=!0;async function Z1(G){let I=Z.contacts?.add;if(!I)return;let F=G.replace(/\s+/g,"").toUpperCase();try{if((await Z.contacts.list()??[]).some((g)=>g.address.replace(/\s+/g,"").toUpperCase()===F))return;let S=window.prompt(X.t("shell.saveContact"))?.trim();if(!S)return;await I({label:S,address:G,asset:"NIM"})}catch{}}async function z1(){if(!Z.contacts)return;let G=[];try{G=await Z.contacts.list()??[]}catch{G=[]}let I=G.filter((F)=>(F.asset??"NIM")==="NIM");DQ.textContent="",DQ.hidden=I.length===0;for(let F of I){let D=j("button","nq-cc-contact",DQ);D.type="button",D.textContent=F.label,D.title=F.address,D.addEventListener("click",()=>{y.value=F.address,jQ(),y.focus(),y.setSelectionRange(0,0),y.scrollLeft=0})}}let X1=j("label","nq-cc-field-label",c);T(X1,"shell.amount");let pZ=j("div","nq-cc-amount-row",c),KQ=j("input","nq-cc-input",pZ);KQ.placeholder="0",KQ.inputMode="decimal",KQ.autocomplete="off";let K1=j("span","nq-cc-amount-suffix",pZ);K1.textContent="NIM";let Y1=j("p","nq-cc-send-hint",c),tQ=j("p","nq-cc-send-error",c),t=j("button","nq-cc-send-confirm",c);t.type="button",T(t,"shell.send");let iZ=j("div","nq-cc-send-done",U);iZ.insertAdjacentHTML("beforeend",'<svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M7.5 12.5l3 3 6-6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>');let V1=j("span",void 0,iZ);T(V1,"shell.sent");let W1=/^NQ\d{2}[0-9A-HJ-NP-VXY]{32}$/,nZ=()=>y.value.toUpperCase().replace(/[\s-]+/g,""),rZ=()=>{let G=Number(KQ.value.replace(",","."));return Number.isFinite(G)?G:0};function jQ(){let G=W1.test(nZ()),I=rZ(),F=I>0&&(v===null||I<=yQ(v));t.disabled=!(G&&F)}y.addEventListener("input",jQ),KQ.addEventListener("input",jQ);function G1(){if(!z?.account)return;tQ.textContent="",U.classList.remove("nq-cc-sent"),Y1.textContent=v!==null?`${X.t("shell.available")}: ${BQ(v)} NIM`:"",jQ(),N.classList.add("nq-cc-show-send"),y.focus(),z1()}function eQ(){N.classList.remove("nq-cc-show-send")}t.addEventListener("click",async()=>{if(!z)return;let I=nZ().replace(/(.{4})(?=.)/g,"$1 ");t.disabled=!0,tQ.textContent="",t.textContent=X.t("shell.sending");try{if(await z.pay({recipient:I,valueLuna:NZ(rZ())}))U.classList.add("nq-cc-sent"),Z1(I),y.value="",KQ.value="",fQ=0,window.setTimeout(()=>{eQ(),JQ(!0)},1800);else eQ()}catch(F){if(!/cancel|denied|rejected|closed|dismiss/i.test(String(F)))tQ.textContent=X.t("shell.sendFailed")}finally{t.textContent=X.t("shell.send"),jQ()}});let kQ="",p=null;ZQ=()=>{lZ.textContent=p?`${X.t("shell.receive")} ${p.ticker}`:X.t("shell.receive"),sQ.hidden=!p,sQ.textContent=p?X.t("shell.networkOnly",{ticker:p.ticker,network:p.network}):""};function oZ(G){let I=z?.account??null;if(!I)return;if(G&&!G.address)return;let F=G?.address??I.address;if(!F)return;N.classList.add("nq-cc-show-receive");let D=F.replace(/\s+/g,"");aQ=D,u.textContent="";let S=c0(D);u.style.setProperty("--nq-cc-addr-cols",String(S.columns));for(let TQ of S.cells){let YQ=j("span",void 0,u);YQ.textContent=TQ}p=G??null,ZQ();let g=G?G.uri?.(D)??D:`nimiq:${D}`;if(Z.qr&&kQ!==g)oQ.textContent="",oQ.appendChild(Z.qr(g,164)),kQ=g}function sZ(G,I){G.addEventListener("click",()=>{let F=I.classList.toggle("nq-cc-open");G.setAttribute("aria-expanded",String(F))})}function QZ(G,I){I.classList.remove("nq-cc-open"),G.setAttribute("aria-expanded","false")}sZ(a,iQ);let fQ=0,v=null;async function JQ(G=!1){let I=z?.account??null;if(!W||!I)return;if(d){await d.refresh(G);let D=d.total();s.hidden=D===null,SZ.textContent=D===null?"":GQ(D,J),XQ.hidden=!0;let S=d.units("NIM");if(S!==null)v=Number(S);if(!Z.getBalanceLuna)return}let F=Date.now();if(!G&&F-fQ<30000&&v!==null){aZ();return}try{v=await Z.getBalanceLuna(I.address),fQ=F}catch{}if(aZ(),$&&!d&&v!==null)try{let D=await Z.fiat.rate(J);if(D!==null&&z?.account)XQ.textContent=GQ(yQ(v)*D,J),XQ.hidden=!1;else XQ.hidden=!0}catch{XQ.hidden=!0}}function aZ(){if(d)return;if(v===null){s.hidden=!0;return}if(s.hidden=!1,SZ.textContent=`${BQ(v)} NIM`,!$)XQ.hidden=!0}function tZ(){let G=z?.account??null;if(!G)return;if(pQ.textContent="",Z.identicon)pQ.appendChild(Z.identicon(G.address,40));else pQ.innerHTML=m0;AQ.textContent=l0(G,X.t("shell.account")),kQ="",JQ()}function q(G){if(O.hidden=!G,P.setAttribute("aria-expanded",String(G)),H.setAttribute("aria-expanded",String(G)),G)document.addEventListener("click",eZ,!0),document.addEventListener("keydown",Q0),JQ();else N.classList.remove("nq-cc-show-receive"),N.classList.remove("nq-cc-show-send"),document.removeEventListener("click",eZ,!0),document.removeEventListener("keydown",Q0)}function eZ(G){if(!N.contains(G.target))q(!1)}function Q0(G){if(G.key==="Escape")q(!1)}let Z0=()=>q(O.hidden);if(P.addEventListener("click",Z0),H.addEventListener("click",Z0),M(),C(),BZ(),gZ(),$)Z.fiat.onChange?.(J);if(z?.account)tZ();let z0=z?.account?.address??null,$1=z?z.onAccountChange(()=>{let G=z.account?.address??null;if(G!==z0)z0=G,v=null,fQ=0,d?.clear(),N.classList.remove("nq-cc-show-receive"),p=null,aQ=null,kQ="",u.textContent="",oQ.textContent="";if(M(),z.account)tZ(),JQ(!0);else s.hidden=!0}):()=>{},j1=X.onChange(()=>{lQ(),BZ(),C(),M()});return{el:N,get fiatTicker(){return $?J:null},open:()=>q(!0),close:()=>q(!1),destroy(){$1(),j1(),q(!1),d?.destroy(),N.remove()}}}var b4=i0;export{b0 as validateFeedbackInput,q0 as submitToBot,w0 as submitFeedback,s1 as shellLocales,CQ as scrubAddresses,c1 as parseNim,DZ as pageContext,TZ as openReportBugSheet,NZ as nimToLuna,M4 as mountWalletPill,UZ as mountProfileWidget,i0 as mountMiniWallet,W4 as mountLanguageSwitcher,j4 as mountLanguagePill,b4 as mountCornerControl,hZ as mountAssetList,a1 as mergeLocales,yQ as lunaToNim,ZZ as isMiniAppHost,LZ as installReportCapture,zZ as hasNimiqProvider,vQ as fmtUnits,BQ as fmtNim,GQ as fmtFiat,EZ as flagDataUrl,gQ as donutPoint,z4 as donutArcs,hQ as detectModeSync,B1 as createWallet,o1 as createI18n,R0 as collectDiagnostics,B as buildFlagHex,Z4 as areaPaths,c0 as addressGrid,CZ as SHELL_LANGUAGES,g1 as NIM_DECIMALS,PQ as MiniAppBackend,y1 as LUNA_PER_NIM,MQ as HubBackend,A0 as FLAG_SVG,AZ as FLAG_FIT,FQ as FEATURED_LANGUAGES};
