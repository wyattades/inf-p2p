!function(e){var t={};function r(n){if(t[n])return t[n].exports;var i=t[n]={i:n,l:!1,exports:{}};return e[n].call(i.exports,i,i.exports,r),i.l=!0,i.exports}r.m=e,r.c=t,r.d=function(e,t,n){r.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:n})},r.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},r.t=function(e,t){if(1&t&&(e=r(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var n=Object.create(null);if(r.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var i in e)r.d(n,i,function(t){return e[t]}.bind(null,i));return n},r.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return r.d(t,"a",t),t},r.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},r.p="/inf-p2p/",r(r.s=0)}([function(e,t,r){"use strict";r(1);var n=i(r(3));function i(e){if(e&&e.__esModule)return e;var t={};if(null!=e)for(var r in e)if(Object.prototype.hasOwnProperty.call(e,r)){var n=Object.defineProperty&&Object.getOwnPropertyDescriptor?Object.getOwnPropertyDescriptor(e,r):{};n.get||n.set?Object.defineProperty(t,r,n):t[r]=e[r]}return t.default=e,t}i(r(6)),n.init(),DEV&&function(){var e=document.createElement("script");e.onload=function(){var e=new Stats;document.body.appendChild(e.dom),requestAnimationFrame(function t(){e.update(),requestAnimationFrame(t)})},e.src="//rawgit.com/mrdoob/stats.js/master/build/stats.min.js",document.head.appendChild(e)}()},function(e,t,r){},,function(e,t,r){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.init=void 0;var n=function(e){return e&&e.__esModule?e:{default:e}}(r(4)),i=document.getElementById("canvas"),a=i.getContext("2d");a.webkitImageSmoothingEnabled=!1,a.mozImageSmoothingEnabled=!1,a.imageSmoothingEnabled=!1,t.init=function(){var e={x:456.92,z:200.23},t=new n.default(e,2);document.getElementById("clear-cache").onclick=function(){return t.clearCache()};var r={l:!1,u:!1,r:!1,d:!1};document.addEventListener("keydown",function(e){switch(e.key){case"ArrowLeft":r.l=!0;break;case"ArrowRight":r.r=!0;break;case"ArrowUp":r.u=!0;break;case"ArrowDown":r.d=!0}}),document.addEventListener("keyup",function(e){switch(e.key){case"ArrowLeft":r.l=!1;break;case"ArrowRight":r.r=!1;break;case"ArrowUp":r.u=!1;break;case"ArrowDown":r.d=!1}}),setInterval(function(){r.l&&!r.r?e.x-=5:r.r&&!r.l&&(e.x+=5),r.u&&!r.d?e.z-=5:r.d&&!r.u&&(e.z+=5);var n=Math.floor(e.x/64),o=Math.floor(e.z/64);n===t.playerChunk.x&&o===t.playerChunk.z||t.updatePlayerChunk(n,o),function(e,t){a.clearRect(0,0,i.width,i.height);var r=!0,n=!1,o=void 0;try{for(var u,c=e[Symbol.iterator]();!(r=(u=c.next()).done);r=!0){var s=u.value;s.terrain?a.fillStyle="green":a.fillStyle="pink",a.strokeStyle="black",a.fillRect(64*s.x,64*s.z,64,64),a.strokeRect(64*s.x,64*s.z,64,64),s.terrain&&(a.fillStyle="black",a.fillText(s.terrain[0],64*s.x+10,64*s.z+20))}}catch(e){n=!0,o=e}finally{try{r||null==c.return||c.return()}finally{if(n)throw o}}a.fillStyle="rgb(255,0,0)",a.fillRect(t.x,t.z,5,5)}(Object.values(t.chunks),e)},16)}},function(e,t,r){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default=void 0;var n=function(e){return e&&e.__esModule?e:{default:e}}(r(5));function i(e,t){return function(e){if(Array.isArray(e))return e}(e)||function(e,t){var r=[],n=!0,i=!1,a=void 0;try{for(var o,u=e[Symbol.iterator]();!(n=(o=u.next()).done)&&(r.push(o.value),!t||r.length!==t);n=!0);}catch(e){i=!0,a=e}finally{try{n||null==u.return||u.return()}finally{if(i)throw a}}return r}(e,t)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance")}()}function a(e,t){for(var r=0;r<t.length;r++){var n=t[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,n.key,n)}}function o(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}var u=[[1,0],[0,1],[-1,0],[0,-1]],c=64,s=function(){function e(t){var r=this,i=arguments.length>1&&void 0!==arguments[1]?arguments[1]:1;o(this,e),this.renderDist=Math.max(1,i),this.player=t,this.chunks={},this.chunkCount=0,this.loadedCount=0,this.playerChunk=null,this.worker=new n.default,this.worker.onmessage=function(e){var t=e.data;switch(t.cmd){case"terrain":r.receiveLoadChunk(t.x,t.z,t.terrain)}};for(var a=Math.floor(t.x/c),u=Math.floor(t.z/c),s=0;s<2*i+1;s++)for(var l=0;l<2*i+1;l++){var h=this.requestLoadChunk(a+s-i,u+l-i);s===i&&l===i&&(this.playerChunk=h)}}return function(e,t,r){t&&a(e.prototype,t)}(e,[{key:"requestLoadChunk",value:function(e,t){var r=new function e(t,r){o(this,e),this.x=t,this.z=r,this.terrain=null}(e,t);return this.chunks["".concat(e,",").concat(t)]=r,this.chunkCount++,this.worker.postMessage({cmd:"loadChunk",x:r.x,z:r.z}),r}},{key:"receiveLoadChunk",value:function(e,t,r){var n=this.chunks["".concat(e,",").concat(t)];n&&(n.terrain=r,this.loadedCount++)}},{key:"updatePlayerChunk",value:function(e,t){var r=e-this.playerChunk.x,n=t-this.playerChunk.z;if(r)for(var a=-this.renderDist;a<=this.renderDist;a++){var o=this.playerChunk.x+(r>0?this.renderDist:-this.renderDist)+r,c=this.playerChunk.z+a;"".concat(o,",").concat(c)in this.chunks||this.requestLoadChunk(o,c)}if(n)for(var s=-this.renderDist;s<=this.renderDist;s++){var l=this.playerChunk.x+s,h=this.playerChunk.z+(n>0?this.renderDist:-this.renderDist)+n;"".concat(l,",").concat(h)in this.chunks||this.requestLoadChunk(l,h)}if(r&&n){var d=this.playerChunk.x+(r>0?this.renderDist:-this.renderDist)+r,f=this.playerChunk.z+(n>0?this.renderDist:-this.renderDist)+n;"".concat(d,",").concat(f)in this.chunks||this.requestLoadChunk(d,f)}this.playerChunk=this.chunks["".concat(e,",").concat(t)],this.playerChunk||(this.requestLoadChunk(e,t),console.log("Invalid playerChunk",e,t));for(var y=e-2*this.renderDist,p=t-2*this.renderDist,k=0;k<u.length;k++)for(var v=i(u[k],2),b=v[0],m=v[1],w=0;w<4*this.renderDist;w++,y+=b,p+=m){var C="".concat(y,",").concat(p);C in this.chunks&&delete this.chunks[C]}}},{key:"clearCache",value:function(){this.worker.postMessage({cmd:"clearCache"})}}]),e}();t.default=s},function(e,t,r){e.exports=function(){return new Worker(r.p+"752dd569272df7b66942.worker.js")}},function(e,t,r){"use strict"}]);