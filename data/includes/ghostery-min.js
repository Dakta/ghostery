/*!
 * Ghostery for Safari
 * http://www.ghostery.com/
 *
 * Copyright 2014 EVIDON, Inc. All rights reserved.
 * See https://www.ghostery.com/eula for license.
 */
(function(){function e(){for(var e="";32>e.length;)e+=Math.random().toString(36).replace(/[^A-Za-z]/g,"");return e}function t(e){return T.createElement(e)}function n(){return t("br")}function o(e){for(var t=1;arguments.length>t;t++)e.appendChild(arguments[t])}function r(e,n){var o=t("script"),r=I.top.document.documentElement;e?o.src=e:o.textContent=n,r.insertBefore(o,r.firstChild)}function i(){var e=t("style"),n=" !important;",r="padding:0;margin:0;font:13px Arial,Helvetica;text-transform:none;font-size: 100%;vertical-align:baseline;line-height:normal;color:#fff;position:static;";e.innerHTML="@-webkit-keyframes pop"+x+" {"+"50% {"+"-webkit-transform:scale(1.2);"+"}"+"100% {"+"-webkit-transform:scale(1);"+"}"+"}"+"@keyframes pop"+x+" {"+"50% {"+"-webkit-transform:scale(1.2);"+"transform:scale(1.2);"+"}"+"100% {"+"-webkit-transform:scale(1);"+"transform:scale(1);"+"}"+"}"+"#"+x+"{"+r+"border:solid 2px #fff"+n+"box-sizing:content-box"+n+"color:#fff"+n+"display:block"+n+"height:auto"+n+"margin:0"+n+"opacity:0.9"+n+"padding:7px 10px"+n+"position:fixed"+n+"visibility:visible"+n+"width:auto"+n+"z-index:2147483647"+n+"-webkit-border-radius:5px"+n+"-webkit-box-shadow:0px 0px 20px #000"+n+"-webkit-box-sizing:content-box"+n+"}"+"."+x+"-blocked{"+r+"color:#AAA"+n+"display:inline"+n+"text-decoration:line-through"+n+"}"+"#"+x+" br{display:block"+n+r+"}"+"#"+x+" span{background:transparent"+n+r+"}"+"#"+x+" div{"+r+"border:0"+n+"margin:0"+n+"padding:0"+n+"width:auto"+n+"letter-spacing:normal"+n+"font:13px Arial,Helvetica"+n+"text-align:left"+n+"text-shadow:none"+n+"text-transform:none"+n+"word-spacing:normal"+n+"}"+"#"+x+" a{"+r+"font-weight:normal"+n+"background:none"+n+"text-decoration:underline"+n+"color:#fff"+n+"}"+"a#"+x+"-gear{"+r+"text-decoration:none"+n+"position:absolute"+n+"display:none"+n+"font-size:20px"+n+"width:20px"+n+"height:20px"+n+"line-height:20px"+n+"text-align:center"+n+"background-color:rgba(255,255,255,.8)"+n+"background-image:url("+safari.extension.baseURI+"data/images/gear.png)"+n+"background-size:16px 16px"+n+"background-position:center center"+n+"background-repeat:no-repeat"+n+"text-decoration:none"+n+"}"+"a#"+x+"-gear:hover{"+"-webkit-animation-name:pop"+x+n+"animation-name:pop"+x+n+"-webkit-animation-duration:0.3s"+n+"animation-duration:0.3s"+n+"}"+"#"+x+":hover #"+x+"-gear{"+"text-decoration:none"+n+"display:inline-block"+n+"}"+"@media print{#"+x+"{display:none"+n+"}}",o(T.getElementsByTagName("head")[0],e)}function a(e){var t=T.getElementById(x);t&&t.parentNode.removeChild(t),clearTimeout(w),e&&(v=!0)}function s(e,n){var r=t("a");return r.style.color="#fff",r.style.textDecoration="underline",r.style.border="none",r.href=e||"#",e&&(r.target="_blank"),o(r,T.createTextNode(n)),r}function l(e,n){var r=t("span");return n&&(r.className=n),o(r,T.createTextNode(e)),r}function p(e,n){var r=t("div");return r.id=x,r.style.setProperty(n&&"left"==n.pos_x?"left":"right","20px","important"),r.style.setProperty(n&&"bottom"==n.pos_y?"bottom":"top","15px","important"),r.style.setProperty("background","showBugs"==e?"#330033":"#777","important"),T.getElementsByTagName("body")[0]?o(T.body,r):o(T.getElementsByTagName("html")[0],r),"showBugs"==e&&(r.style.cursor="pointer",r.addEventListener("click",function(e){a(!0),e.preventDefault()}),r.addEventListener("mouseenter",function(e){clearTimeout(w),w=!1,e.preventDefault()}),r.addEventListener("mouseleave",function(e){w=setTimeout(a,1e3*n.timeout),e.preventDefault()})),r}function d(e,r,i){"showBugs"!=e&&a();var d,c,f=t("div");if(f.style.setProperty("background","showBugs"==e?"#330033":"#777","important"),"showBugs"==e){o(f,y(i));for(var u=0;r.length>u;u++)o(f,l(r[u].name,r[u].blocked?x+"-blocked":""),n())}else{if("showUpdateAlert"!=e){var m=s("https://purplebox.ghostery.com/releases/releases-safari",B.notification_upgrade);m.addEventListener("click",function(e){e.preventDefault(),S("openTab",{url:e.target.href})}),o(f,m)}("showWalkthroughAlert"==e||"showUpdateAlert"==e)&&("showUpdateAlert"==e?(o(f,l(B.notification_update)),c=s("",B.notification_update_link)):(o(f,n(),n(),l(B.notification_reminder1),n(),l(B.notification_reminder2)),c=s("",B.notification_reminder_link)),c.addEventListener("click",function(t){S("showUpdateAlert"==e?"showNewTrackers":"openWalkthrough"),t.preventDefault()}),o(f,n(),n(),c)),c=s(!1,B.dismiss),c.addEventListener("click",function(e){a(),e.preventDefault()}),o(f,n(),n(),c)}d=T.getElementById(x),d||(d=p(e,i)),"showBugs"==e&&(d.title=L.alert_bubble_tooltip),d.innerHTML="",o(d,f),clearTimeout(w),i&&i.timeout&&w&&(w=setTimeout(a,1e3*i.timeout))}function c(){var e=T.getElementById(_),n="important";e?"none"==e.style.display&&S("panelLoaded"):(e=t("iframe"),e.style.setProperty("position","fixed",n),e.style.setProperty("z-index","2147483647",n),e.style.setProperty("top","15px",n),e.style.setProperty("left","20px",n),e.style.setProperty("border","1px solid #bcbec0",n),e.style.setProperty("-webkit-border-radius","10px",n),e.style.setProperty("-webkit-box-shadow","0px 0px 20px #000",n),e.style.setProperty("display","none",n),e.id=_,e.style.setProperty("height","0px",n),e.style.setProperty("width","347px",n),e.scrolling="no",e.seamless="seamless",e.src=A.baseURI+"panel.html",T.getElementsByTagName("body")[0]?o(T.body,e):o(T.getElementsByTagName("html")[0],e)),"none"==e.style.display?(e.style.setProperty("display","block",n),e.style.setProperty("visibility","visible",n),T.addEventListener("click",f,!1),T.addEventListener("keyup",f,!1)):u()}function f(e){(1==e.which||27==e.which)&&u()}function u(){var e=T.getElementById(_);e&&(T.removeEventListener("click",f,!1),T.removeEventListener("keyup",f,!1),e.style.setProperty("height","0px","important"),e.style.setProperty("display","none","important"))}function m(e){var t,n,o=e.target,r=!0;t=e.url,t&&0!==t.indexOf(A.baseURI)&&0!==t.indexOf("data:")&&("prerender"===T.visibilityState&&(r=!1,n=U),D.tab.canLoad(e,{tab_window_id:z,node_name:o.nodeName,src:t,frame_host:T.location.hostname,from_frame:C,visible:r,preload_url:n})||e.preventDefault())}function y(e){var n=t("a");return n.appendChild(document.createTextNode(" ")),n.href="#",n.id=x+"-gear",n.title=L.alert_bubble_gear_tooltip,n.style.setProperty(e&&"left"==e.pos_x?"left":"right","0","important"),n.style.setProperty(e&&"bottom"==e.pos_y?"bottom":"top","0","important"),n.style.setProperty("border-"+(e&&"bottom"==e.pos_y?"top":"bottom")+"-"+(e&&"left"==e.pos_x?"right":"left")+"-radius","3px","important"),n.style.setProperty("border-"+(e&&"bottom"==e.pos_y?"bottom":"top")+"-"+(e&&"left"==e.pos_x?"left":"right")+"-radius","3px","important"),n.addEventListener("click",function(e){S("showPurpleBoxOptions"),e.preventDefault()}),n}function h(e,t,n){e.addEventListener("load",function(){var o=e.contentDocument;o.documentElement.innerHTML=n,t.button?(e.style.width="30px",e.style.height="19px",e.style.border="0px"):(e.style.width="100%",e.style.border="1px solid #ccc",e.style.height="80px"),t.frameColor&&(e.style.background=t.frameColor),o.getElementById("action-once").addEventListener("click",function(e){S("processC2P",{action:"once",app_ids:t.allow}),e.preventDefault()},!0),t.button||o.getElementById("action-always").addEventListener("click",function(e){S("processC2P",{action:"always",app_ids:t.allow}),e.preventDefault()},!0)},!1)}function g(e,n,r){n.forEach(function(e,n){for(var i=T.querySelectorAll(e.ele),a=0,s=i.length;s>a;a++){var l=i[a];if(e.attach&&"parentNode"==e.attach){if(l.parentNode&&"BODY"!=l.parentNode.nodeName&&"HEAD"!=l.parentNode.nodeName){var p=t("div");l.parentNode.replaceChild(p,l),l=p}}else l.textContent="";l.style.display="block";var d=t("iframe");h(d,e,r[n]),o(l,d)}})}function b(e){var t,n=e.message,o=e.name;if(!(n&&n.tabWindowId&&n.tabWindowId!=z||("c2p"==o&&(k[n.app_id]=[n.app_id,n.data,n.html],"complete"==T.readyState&&g.apply(this,k[n.app_id])),C)))if("reload"==o)T.location.reload();else if("closePanel"==o)u();else if("resizePanel"==o)t=T.getElementById(_),t.style.setProperty("-webkit-transition-duration",n.animate?"0.25s":"","important"),t.style.setProperty("-webkit-transition-property",n.animate?"height, opacity":"","important"),t.style.setProperty("height",n.height+"px","important");else if("show"==o||"showUpgradeAlert"==o||"showWalkthroughAlert"==o||"showUpdateAlert"==o)E||(E=!0,i()),"show"==o?(L=n.translations,N||v||d("showBugs",n.bugs,n.alert_cfg)):(B=n.translations,d(o),N=!0);else if("showPanel"==o)c();else if("surrogates"==o){var a="";n.surrogates.forEach(function(e){P.hasOwnProperty(e.sid)||(a+=e.code,P[e.sid]=!0)}),a&&r(null,a)}else"popoverMessage"==o&&S(n.name,n.message)}var v=!1,x=e(),w=9999,k={},E=!1,_=e(),P={},L={},B={},N=!1,T=document,A=safari.extension,D=safari.self,I=window,C=I.top!=I,U=I.top.location.href,z=+new Date+T.location.href,S=function(e,t){D.tab.dispatchMessage(e,t)};0!==T.location.href.indexOf(A.baseURI)&&(T.addEventListener("beforeload",m,!0),D.addEventListener("message",b,!1),I.addEventListener("load",function(){for(var e in k)g.apply(this,k[e])},!1),C||(I.addEventListener("pageshow",function(){"prerender"===T.visibilityState?T.addEventListener("visibilitychange",function(){"visible"===T.visibilityState&&(S("pageLoaded"),T.removeEventListener("visibilitychange"))},!1):S("pageLoaded")},!1),I.addEventListener("pagehide",function(){u(),a()},!1),S("pageInjected",{host:T.location.hostname,preload_url:"prerender"===T.visibilityState?U:!1})))})();