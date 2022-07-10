(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[405],{8312:function(e,t,n){(window.__NEXT_P=window.__NEXT_P||[]).push(["/",function(){return n(1278)}])},1278:function(e,t,n){"use strict";n.r(t),n.d(t,{default:function(){return P}});var r=n(5893),i=n(7568),o=n(4051),u=n.n(o),s=n(7294),a=function(e){return(e+1)%1e6};function c(){return(0,s.useReducer)(a,0)[1]}var f="undefined"!==typeof window,l=f?window:null,v=function(e){return!!e.addEventListener},d=function(e){return!!e.on},h=function(e,t,n,r){void 0===n&&(n=l),(0,s.useEffect)((function(){if(t&&n)return v(n)?function(e){for(var t=[],n=1;n<arguments.length;n++)t[n-1]=arguments[n];e&&e.addEventListener&&e.addEventListener.apply(e,t)}(n,e,t,r):d(n)&&n.on(e,t,r),function(){v(n)?function(e){for(var t=[],n=1;n<arguments.length;n++)t[n-1]=arguments[n];e&&e.removeEventListener&&e.removeEventListener.apply(e,t)}(n,e,t,r):d(n)&&n.off(e,t,r)}}),[e,t,n,JSON.stringify(r)])},p=n(6486),y=function(e,t,n){var r=arguments.length>3&&void 0!==arguments[3]&&arguments[3],i=(0,s.useState)(n),o=i[0],u=c(),a=(0,s.useRef)(o),f=(0,s.useRef)(!0);return(0,s.useEffect)((function(){f.current?f.current=!1:(a.current=n(),u());var i=(0,p.flatten)([t]),o=function(e){a.current=r?n(e):e,u()},s=!0,c=!1,l=void 0;try{for(var v,d=i[Symbol.iterator]();!(s=(v=d.next()).done);s=!0){var h=v.value;e.on(h,o)}}catch(y){c=!0,l=y}finally{try{s||null==d.return||d.return()}finally{if(c)throw l}}return function(){var t=!0,n=!1,r=void 0;try{for(var u,s=i[Symbol.iterator]();!(t=(u=s.next()).done);t=!0){var a=u.value;e.off(a,o)}}catch(y){n=!0,r=y}finally{try{t||null==s.return||s.return()}finally{if(n)throw r}}}}),[e]),a.current},m=(0,s.createContext)(null),g=m.Provider,b=function(){var e,t=null===(e=(0,s.useContext)(m))||void 0===e?void 0:e.game;if(!t)throw new Error("Missing GameProvider");return t},x=function(){var e=b();return y(e.events,"set_game_state",(function(){return e.state}))},w=function(){var e=b(),t=y(e.options.events,"set_option",(function(){return e.options}),!0);return[t.tentative(),function(e,n){t.set(e,n)}]},L=function(e){var t,o=e.children,a=(0,s.useRef)(null),f=c(),l=(0,s.useRef)(null),v=function(){var e=(0,i.Z)(u().mark((function e(){var t,r,i;return u().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return(t=l.current)&&(l.current=null,f(),t.dispose()),e.next=4,Promise.all([n.e(737),n.e(502),n.e(983)]).then(n.bind(n,3983));case 4:if(r=e.sent.default,console.log("Loaded Game class"),a.current){e.next=8;break}throw new Error("Missing game DOM container");case 8:return i=new r(a.current),e.next=11,i.setup();case 11:l.current=i,f();case 13:case"end":return e.stop()}}),e)})));return function(){return e.apply(this,arguments)}}();(0,s.useEffect)((function(){v()}),[]),h("reinitialized",f,null===(t=l.current)||void 0===t?void 0:t.events),(0,s.useEffect)((function(){}),[]),(0,s.useEffect)((function(){return function(){var e=l.current;e&&(console.log("Unmount game"),e.disposed||e.dispose())}}),[]);var d=l.current;return(0,r.jsxs)(g,{value:{game:d},children:[(0,r.jsx)("canvas",{ref:a,id:"game"}),d?o:null]})},_=n(6042),E=n(828),j=n(1903),k=n(9788),O=function(){var e=b(),t=y(e.ui.events,"update_stats",(function(){return(0,_.Z)({},e.ui.debugStats)}));return(0,r.jsx)("div",{id:"info",children:Object.entries(t).map((function(e){var t=(0,E.Z)(e,2),n=t[0],i=t[1];return(0,r.jsxs)("p",{children:[n,": ",i]},n)}))})},C=function(){return(0,E.Z)(w(),1)[0].show_ui?(0,r.jsx)(O,{}):null},R=function(){var e=b(),t=(0,E.Z)(w(),2),n=t[0],o=t[1];return x()===k.D.PAUSED?(0,r.jsxs)("div",{id:"menu",children:[(0,r.jsx)("p",{children:"Paused"}),(0,r.jsx)("div",{id:"options",children:j.J.map((function(e){var t,i=null==e.min?"checkbox":"range",u=null!==(t=n[e.key])&&void 0!==t?t:e.default;return(0,r.jsx)("div",{children:"checkbox"===i?(0,r.jsxs)("label",{children:[(0,r.jsx)("input",{type:"checkbox",checked:u,onChange:function(t){return o(e.key,t.target.checked)}}),e.label]}):(0,r.jsxs)("label",{children:[e.label,(0,r.jsx)("input",{type:"range",min:e.min,max:e.max,value:u,onChange:function(t){return o(e.key,t.target.valueAsNumber)}}),u]})},e.key)}))}),(0,r.jsx)("button",{id:"resume",type:"button",onClick:function(){return e.setState(k.D.PLAYING)},children:"Resume"}),(0,r.jsx)("button",{id:"clearMapCache",type:"button",onClick:(0,i.Z)(u().mark((function t(){var n;return u().wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=3,null===(n=e.chunkLoader)||void 0===n?void 0:n.clearMapCache();case 3:return t.next=5,e.setup();case 5:case"end":return t.stop()}}),t)}))),children:"Clear map cache"})]}):null},S=function(){var e=x();return e===k.D.LOADING?(0,r.jsx)("div",{id:"text-overlay",children:(0,r.jsx)("p",{className:"loader",children:"Initializing world"})}):e===k.D.ERROR?(0,r.jsx)("div",{id:"text-overlay",children:(0,r.jsx)("p",{className:"error",children:"!!! ERROR !!!"})}):null},Z=function(){return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(C,{}),(0,r.jsx)(R,{}),(0,r.jsx)(S,{})]})};function P(){return(0,r.jsx)(L,{children:(0,r.jsx)(Z,{})})}},9788:function(e,t,n){"use strict";var r;n.d(t,{D:function(){return r}}),function(e){e[e.LOADING=0]="LOADING",e[e.PLAYING=1]="PLAYING",e[e.PAUSED=2]="PAUSED",e[e.ERROR=3]="ERROR"}(r||(r={}))},1903:function(e,t,n){"use strict";n.d(t,{E:function(){return l},J:function(){return f}});var r=n(1438),i=n(2951),o=n(4924),u=n(6042),s=n(2222),a=n(6486),c=n(5293),f=[{label:"Render Distance",key:"renderDist",min:1,max:5,default:2},{label:"Antialiasing",key:"antialias",default:!1},{label:"Fog",key:"fog",default:!0},{label:"Shadows",key:"shadows",default:!0},{label:"Debug",key:"debug",default:!1},{label:"Show UI",key:"show_ui",default:!0,updateImmediate:!0},{label:"Sensitivity",key:"mouseSensitivity",min:1,max:100,default:8}],l=function(){function e(){(0,r.Z)(this,e),(0,o.Z)(this,"events",new c.EventEmitter),(0,o.Z)(this,"vals",(0,a.fromPairs)(f.map((function(e){return[e.key,e.default]})))),(0,o.Z)(this,"changed",{});var t=this.load();for(var n in this.vals){var i=t[n];("undefined"===typeof i?"undefined":(0,s.Z)(i))===(0,s.Z)(this.vals[n])&&(this.vals[n]=i)}}return(0,i.Z)(e,[{key:"tentative",value:function(){return(0,u.Z)({},this.vals,this.changed)}},{key:"load",value:function(){try{var e=JSON.parse(localStorage.getItem("options"));if(e&&"object"===typeof e)return e}catch(t){}return{}}},{key:"save",value:function(){try{localStorage.setItem("options",JSON.stringify(this.tentative()))}catch(e){}}},{key:"set",value:function(e,t){var n=f.find((function(t){return t.key===e}));n?(n.updateImmediate?this.vals[e]=t:this.vals[e]===t?delete this.changed[e]:this.changed[e]=t,this.save(),this.events.emit("set_option",e,t)):console.error("Invalid option:",e)}},{key:"get",value:function(e){return e in this.vals||console.error("Invalid option:",e),this.vals[e]}},{key:"checkChanged",value:function(){if(!(0,a.isEmpty)(this.changed)){Object.assign(this.vals,this.changed);var e=this.changed;return this.changed={},e}return{}}}]),e}()},5293:function(e){!function(){"use strict";var t={699:function(e){var t,n="object"===typeof Reflect?Reflect:null,r=n&&"function"===typeof n.apply?n.apply:function(e,t,n){return Function.prototype.apply.call(e,t,n)};t=n&&"function"===typeof n.ownKeys?n.ownKeys:Object.getOwnPropertySymbols?function(e){return Object.getOwnPropertyNames(e).concat(Object.getOwnPropertySymbols(e))}:function(e){return Object.getOwnPropertyNames(e)};var i=Number.isNaN||function(e){return e!==e};function o(){o.init.call(this)}e.exports=o,e.exports.once=function(e,t){return new Promise((function(n,r){function i(n){e.removeListener(t,o),r(n)}function o(){"function"===typeof e.removeListener&&e.removeListener("error",i),n([].slice.call(arguments))}p(e,t,o,{once:!0}),"error"!==t&&function(e,t,n){"function"===typeof e.on&&p(e,"error",t,n)}(e,i,{once:!0})}))},o.EventEmitter=o,o.prototype._events=void 0,o.prototype._eventsCount=0,o.prototype._maxListeners=void 0;var u=10;function s(e){if("function"!==typeof e)throw new TypeError('The "listener" argument must be of type Function. Received type '+typeof e)}function a(e){return void 0===e._maxListeners?o.defaultMaxListeners:e._maxListeners}function c(e,t,n,r){var i,o,u;if(s(n),void 0===(o=e._events)?(o=e._events=Object.create(null),e._eventsCount=0):(void 0!==o.newListener&&(e.emit("newListener",t,n.listener?n.listener:n),o=e._events),u=o[t]),void 0===u)u=o[t]=n,++e._eventsCount;else if("function"===typeof u?u=o[t]=r?[n,u]:[u,n]:r?u.unshift(n):u.push(n),(i=a(e))>0&&u.length>i&&!u.warned){u.warned=!0;var c=new Error("Possible EventEmitter memory leak detected. "+u.length+" "+String(t)+" listeners added. Use emitter.setMaxListeners() to increase limit");c.name="MaxListenersExceededWarning",c.emitter=e,c.type=t,c.count=u.length,function(e){console&&console.warn&&console.warn(e)}(c)}return e}function f(){if(!this.fired)return this.target.removeListener(this.type,this.wrapFn),this.fired=!0,0===arguments.length?this.listener.call(this.target):this.listener.apply(this.target,arguments)}function l(e,t,n){var r={fired:!1,wrapFn:void 0,target:e,type:t,listener:n},i=f.bind(r);return i.listener=n,r.wrapFn=i,i}function v(e,t,n){var r=e._events;if(void 0===r)return[];var i=r[t];return void 0===i?[]:"function"===typeof i?n?[i.listener||i]:[i]:n?function(e){for(var t=new Array(e.length),n=0;n<t.length;++n)t[n]=e[n].listener||e[n];return t}(i):h(i,i.length)}function d(e){var t=this._events;if(void 0!==t){var n=t[e];if("function"===typeof n)return 1;if(void 0!==n)return n.length}return 0}function h(e,t){for(var n=new Array(t),r=0;r<t;++r)n[r]=e[r];return n}function p(e,t,n,r){if("function"===typeof e.on)r.once?e.once(t,n):e.on(t,n);else{if("function"!==typeof e.addEventListener)throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type '+typeof e);e.addEventListener(t,(function i(o){r.once&&e.removeEventListener(t,i),n(o)}))}}Object.defineProperty(o,"defaultMaxListeners",{enumerable:!0,get:function(){return u},set:function(e){if("number"!==typeof e||e<0||i(e))throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received '+e+".");u=e}}),o.init=function(){void 0!==this._events&&this._events!==Object.getPrototypeOf(this)._events||(this._events=Object.create(null),this._eventsCount=0),this._maxListeners=this._maxListeners||void 0},o.prototype.setMaxListeners=function(e){if("number"!==typeof e||e<0||i(e))throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received '+e+".");return this._maxListeners=e,this},o.prototype.getMaxListeners=function(){return a(this)},o.prototype.emit=function(e){for(var t=[],n=1;n<arguments.length;n++)t.push(arguments[n]);var i="error"===e,o=this._events;if(void 0!==o)i=i&&void 0===o.error;else if(!i)return!1;if(i){var u;if(t.length>0&&(u=t[0]),u instanceof Error)throw u;var s=new Error("Unhandled error."+(u?" ("+u.message+")":""));throw s.context=u,s}var a=o[e];if(void 0===a)return!1;if("function"===typeof a)r(a,this,t);else{var c=a.length,f=h(a,c);for(n=0;n<c;++n)r(f[n],this,t)}return!0},o.prototype.addListener=function(e,t){return c(this,e,t,!1)},o.prototype.on=o.prototype.addListener,o.prototype.prependListener=function(e,t){return c(this,e,t,!0)},o.prototype.once=function(e,t){return s(t),this.on(e,l(this,e,t)),this},o.prototype.prependOnceListener=function(e,t){return s(t),this.prependListener(e,l(this,e,t)),this},o.prototype.removeListener=function(e,t){var n,r,i,o,u;if(s(t),void 0===(r=this._events))return this;if(void 0===(n=r[e]))return this;if(n===t||n.listener===t)0===--this._eventsCount?this._events=Object.create(null):(delete r[e],r.removeListener&&this.emit("removeListener",e,n.listener||t));else if("function"!==typeof n){for(i=-1,o=n.length-1;o>=0;o--)if(n[o]===t||n[o].listener===t){u=n[o].listener,i=o;break}if(i<0)return this;0===i?n.shift():function(e,t){for(;t+1<e.length;t++)e[t]=e[t+1];e.pop()}(n,i),1===n.length&&(r[e]=n[0]),void 0!==r.removeListener&&this.emit("removeListener",e,u||t)}return this},o.prototype.off=o.prototype.removeListener,o.prototype.removeAllListeners=function(e){var t,n,r;if(void 0===(n=this._events))return this;if(void 0===n.removeListener)return 0===arguments.length?(this._events=Object.create(null),this._eventsCount=0):void 0!==n[e]&&(0===--this._eventsCount?this._events=Object.create(null):delete n[e]),this;if(0===arguments.length){var i,o=Object.keys(n);for(r=0;r<o.length;++r)"removeListener"!==(i=o[r])&&this.removeAllListeners(i);return this.removeAllListeners("removeListener"),this._events=Object.create(null),this._eventsCount=0,this}if("function"===typeof(t=n[e]))this.removeListener(e,t);else if(void 0!==t)for(r=t.length-1;r>=0;r--)this.removeListener(e,t[r]);return this},o.prototype.listeners=function(e){return v(this,e,!0)},o.prototype.rawListeners=function(e){return v(this,e,!1)},o.listenerCount=function(e,t){return"function"===typeof e.listenerCount?e.listenerCount(t):d.call(e,t)},o.prototype.listenerCount=d,o.prototype.eventNames=function(){return this._eventsCount>0?t(this._events):[]}}},n={};function r(e){var i=n[e];if(void 0!==i)return i.exports;var o=n[e]={exports:{}},u=!0;try{t[e](o,o.exports,r),u=!1}finally{u&&delete n[e]}return o.exports}r.ab="//";var i=r(699);e.exports=i}()},943:function(e,t,n){"use strict";function r(e,t){(null==t||t>e.length)&&(t=e.length);for(var n=0,r=new Array(t);n<t;n++)r[n]=e[n];return r}n.d(t,{Z:function(){return r}})},7568:function(e,t,n){"use strict";function r(e,t,n,r,i,o,u){try{var s=e[o](u),a=s.value}catch(c){return void n(c)}s.done?t(a):Promise.resolve(a).then(r,i)}function i(e){return function(){var t=this,n=arguments;return new Promise((function(i,o){var u=e.apply(t,n);function s(e){r(u,i,o,s,a,"next",e)}function a(e){r(u,i,o,s,a,"throw",e)}s(void 0)}))}}n.d(t,{Z:function(){return i}})},1438:function(e,t,n){"use strict";function r(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}n.d(t,{Z:function(){return r}})},2951:function(e,t,n){"use strict";function r(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}function i(e,t,n){return t&&r(e.prototype,t),n&&r(e,n),e}n.d(t,{Z:function(){return i}})},3375:function(e,t,n){"use strict";function r(e){if("undefined"!==typeof Symbol&&null!=e[Symbol.iterator]||null!=e["@@iterator"])return Array.from(e)}n.d(t,{Z:function(){return r}})},828:function(e,t,n){"use strict";n.d(t,{Z:function(){return o}});var r=n(3375);var i=n(1566);function o(e,t){return function(e){if(Array.isArray(e))return e}(e)||(0,r.Z)(e,t)||(0,i.Z)(e,t)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}},2222:function(e,t,n){"use strict";function r(e){return e&&e.constructor===Symbol?"symbol":typeof e}n.d(t,{Z:function(){return r}})},1566:function(e,t,n){"use strict";n.d(t,{Z:function(){return i}});var r=n(943);function i(e,t){if(e){if("string"===typeof e)return(0,r.Z)(e,t);var n=Object.prototype.toString.call(e).slice(8,-1);return"Object"===n&&e.constructor&&(n=e.constructor.name),"Map"===n||"Set"===n?Array.from(n):"Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?(0,r.Z)(e,t):void 0}}}},function(e){e.O(0,[662,774,888,179],(function(){return t=8312,e(e.s=t);var t}));var t=e.O();_N_E=t}]);