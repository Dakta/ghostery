/*!
 * Ghostery for Safari
 * http://www.ghostery.com/
 *
 * Copyright 2014 EVIDON, Inc. All rights reserved.
 * See https://www.ghostery.com/eula for license.
 */

(function () {

	var ALERT_DISMISSED = false,
		ALERT_ID = id(),
		// Needs to evaluate to true initially, setting to random number
		ALERT_TIMER = 9999,
		C2P_DATA = {},
		CSS_INJECTED = false,
		PANEL_ID = id(),
		SIDS = {},
		// all_frames is false in the manifest
		//IS_FRAME = (win.top != win),
		ALERT_TRANSLATIONS = {},
		NOTIFICATION_TRANSLATIONS = {},
		UPGRADE_ALERT_SHOWN = false,
		doc = document,
		// TODO Can't find variable: safari
		se = safari.extension,
		ss = safari.self,
		win = window,

		IS_FRAME = (win.top != win),
		top_url = win.top.location.href,

		TAB_WINDOW_ID = +new Date() + doc.location.href,
		sendMessage = function (name, msg) {
			ss.tab.dispatchMessage(name, msg);
		};

	function id() {
		var s = '';
		while (s.length < 32) {
			s += Math.random().toString(36).replace(/[^A-Za-z]/g, '');
		}
		return s;
	}

	function createEl(type) {
		return doc.createElement(type);
	}

	function br() {
		return createEl('br');
	}

	// arguments: parentElement, *childElements
	function appendChild(parent) {
		for (var i = 1; i < arguments.length; i++) {
			parent.appendChild(arguments[i]);
		}
	}

	function injectScript(src_url, source) {
		var script = createEl('script'),
			parent = win.top.document.documentElement;

		if (src_url) {
			script.src = src_url;
		} else {
			script.textContent = source;
		}

		parent.insertBefore(script, parent.firstChild);
	}

	function injectCSS() {
		var style = createEl('style'),
			imp = ' !important;',
			reset = 'padding:0;margin:0;font:13px Arial,Helvetica;text-transform:none;font-size: 100%;vertical-align:baseline;line-height:normal;color:#fff;position:static;';

		style.innerHTML =
			'@-webkit-keyframes pop' + ALERT_ID + ' {' +
				'50% {' +
					'-webkit-transform:scale(1.2);' +
				'}' +
				'100% {' +
					'-webkit-transform:scale(1);' +
				'}' +
			'}' +
			'@keyframes pop' + ALERT_ID + ' {' +
				'50% {' +
					'-webkit-transform:scale(1.2);' +
					'transform:scale(1.2);' +
				'}' +
				'100% {' +
					'-webkit-transform:scale(1);' +
					'transform:scale(1);' +
				'}' +
			'}' +

			'#' + ALERT_ID + '{' +
				reset +
				'border:solid 2px #fff' + imp +
				// TODO SVN blame this one
				'box-sizing:content-box' + imp +
				'color:#fff' + imp +
				'display:block' + imp +
				'height:auto' + imp +
				'margin:0' + imp +
				'opacity:0.9' + imp +
				'padding:7px 10px' + imp +
				'position:fixed' + imp +
				'visibility:visible' + imp +
				'width:auto' + imp +
				'z-index:2147483647' + imp +
				// TODO should we switch to non-prefixed ones?
				'-webkit-border-radius:5px' + imp +
				'-webkit-box-shadow:0px 0px 20px #000' + imp +
				// TODO SVN blame this one
				'-webkit-box-sizing:content-box' + imp +
			'}' +

			'.' + ALERT_ID + '-blocked{' +
				reset +
				'color:#AAA' + imp +
				'display:inline' + imp +
				'text-decoration:line-through' + imp +
			'}' +

			'#' + ALERT_ID + ' br{display:block' + imp + reset + '}' +

			'#' + ALERT_ID + ' span{background:transparent' + imp + reset + '}' +

			'#' + ALERT_ID + ' div{' +
				reset +
				'border:0' + imp +
				'margin:0' + imp +
				'padding:0' + imp +
				'width:auto' + imp +
				'letter-spacing:normal' + imp +
				'font:13px Arial,Helvetica' + imp +
				'text-align:left' + imp +
				'text-shadow:none' + imp +
				'text-transform:none' + imp +
				'word-spacing:normal' + imp +
			'}' +

			'#' + ALERT_ID + ' a{' +
				reset +
				'font-weight:normal' + imp +
				'background:none' + imp +
				'text-decoration:underline' + imp +
				'color:#fff' + imp +
			'}' +

			'a#' + ALERT_ID + '-gear{' +
				reset +
				'text-decoration:none' + imp +
				'position:absolute' + imp +
				'display:none' + imp +
				'font-size:20px' + imp +
				'width:20px' + imp +
				'height:20px' + imp +
				'line-height:20px' + imp +
				'text-align:center' + imp +
				'background-color:rgba(255,255,255,.8)' + imp +
				'background-image:url(' + safari.extension.baseURI + 'data/images/gear.png)' + imp +
				'background-size:16px 16px' + imp +
				'background-position:center center' + imp +
				'background-repeat:no-repeat' + imp +
				'text-decoration:none' + imp +
			'}' +

			'a#' + ALERT_ID + '-gear:hover{' +
				'-webkit-animation-name:pop' + ALERT_ID + imp +
				'animation-name:pop' + ALERT_ID + imp +
				'-webkit-animation-duration:0.3s' + imp +
				'animation-duration:0.3s' + imp +
			'}' +

			'#' + ALERT_ID + ':hover #' + ALERT_ID + '-gear{' +
				'text-decoration:none' + imp +
				'display:inline-block' + imp +
			'}' +

			'@media print{#' + ALERT_ID + '{display:none' + imp + '}}';

		appendChild(doc.getElementsByTagName('head')[0], style);
	}

	function removeAlert(permanent) {
		var el = doc.getElementById(ALERT_ID);
		if (el) {
			el.parentNode.removeChild(el);
		}
		clearTimeout(ALERT_TIMER);

		if (permanent) {
			ALERT_DISMISSED = true;
		}
	}

	function createAlertLink(href, text) {
		var link = createEl('a');
		link.style.color = '#fff';
		link.style.textDecoration = 'underline';
		link.style.border = 'none';
		link.href = href || '#';
		if (href) {
			link.target = '_blank';
		}
		appendChild(link, doc.createTextNode(text));
		return link;
	}

	function span(text, class_name) {
		var s = createEl('span');
		if (class_name) {
			s.className = class_name;
		}
		appendChild(s, doc.createTextNode(text));
		return s;
	}

	function createAlert(type, alert_cfg) {
		var alert_div = createEl('div');

		alert_div.id = ALERT_ID;

		alert_div.style.setProperty(
			(alert_cfg && alert_cfg.pos_x == 'left' ? 'left' : 'right'),
			'20px',
			'important');
		alert_div.style.setProperty(
			(alert_cfg && alert_cfg.pos_y == 'bottom' ? 'bottom' : 'top'),
			'15px',
			'important');
		alert_div.style.setProperty(
			'background',
			(type == 'showBugs' ? '#330033' : '#777'),
			'important');

		if (doc.getElementsByTagName('body')[0]) {
			appendChild(doc.body, alert_div);
		} else {
			appendChild(doc.getElementsByTagName('html')[0], alert_div);
		}

		if (type == 'showBugs') {
			alert_div.style.cursor = 'pointer';
			alert_div.addEventListener('click', function (e) {
				removeAlert(true);
				e.preventDefault();
			});
			alert_div.addEventListener('mouseenter', function (e) {
				clearTimeout(ALERT_TIMER);
				// timer should not be set until mouseleave
				ALERT_TIMER = false;
				e.preventDefault();
			});
			alert_div.addEventListener('mouseleave', function (e) {
				ALERT_TIMER = setTimeout(removeAlert, alert_cfg.timeout * 1000);
				e.preventDefault();
			});
		}

		return alert_div;
	}

	function showAlert(type, bugs, alert_cfg) {
		// only tear down the frame for upgrade notifications/walkthrough reminders
		if (type != 'showBugs') {
			removeAlert();
		}

		var alert_div,
			alert_contents = createEl('div'),
			link;

		alert_contents.style.setProperty(
			'background',
			(type == 'showBugs' ? '#330033' : '#777'),
			'important');

		if (type == 'showBugs') {
			appendChild(alert_contents, createGear(alert_cfg));

			for (var i = 0; i < bugs.length; i++) {
				appendChild(alert_contents, span(
					bugs[i].name,
					(bugs[i].blocked ? ALERT_ID + '-blocked' : '')
				), br());
			}

		} else {
			if (type != 'showUpdateAlert') {
				// Have background page open link to prevent referral url leak
				var blog_link = createAlertLink(
					'https://purplebox.ghostery.com/releases/releases-safari',
					NOTIFICATION_TRANSLATIONS.notification_upgrade
				);

				blog_link.addEventListener("click", function (e) {
					e.preventDefault();
					sendMessage("openTab", { url: e.target.href });
				});
				appendChild(alert_contents, blog_link);
			}

			if (type == 'showWalkthroughAlert' || type == 'showUpdateAlert') {
				if (type == 'showUpdateAlert') {
					appendChild(alert_contents, span(NOTIFICATION_TRANSLATIONS.notification_update));
					link = createAlertLink('', NOTIFICATION_TRANSLATIONS.notification_update_link);

				} else {
					appendChild(alert_contents,
						br(),
						br(),
						span(NOTIFICATION_TRANSLATIONS.notification_reminder1),
						br(),
						span(NOTIFICATION_TRANSLATIONS.notification_reminder2)
					);
					link = createAlertLink('', NOTIFICATION_TRANSLATIONS.notification_reminder_link);
				}

				link.addEventListener('click', function (e) {
					sendMessage(type == 'showUpdateAlert' ? 'showNewTrackers' : 'openWalkthrough');
					e.preventDefault();
				});
				appendChild(alert_contents, br(), br(), link);
			}

			link = createAlertLink(false, NOTIFICATION_TRANSLATIONS.dismiss);
			link.addEventListener('click', function (e) {
				removeAlert();
				e.preventDefault();
			});
			appendChild(alert_contents, br(), br(), link);
		}

		alert_div = doc.getElementById(ALERT_ID);

		if (!alert_div) {
			alert_div = createAlert(type, alert_cfg);
		}

		if (type == 'showBugs') {
			alert_div.title = ALERT_TRANSLATIONS.alert_bubble_tooltip;
		}

		alert_div.innerHTML = '';
		appendChild(alert_div, alert_contents);

		// restart the close alert bubble timer
		clearTimeout(ALERT_TIMER);
		if (alert_cfg && alert_cfg.timeout && ALERT_TIMER) {
			ALERT_TIMER = setTimeout(removeAlert, alert_cfg.timeout * 1000);
		}
	}

	// TODO make opacity fades work (need to set display = 'none' on animation completion)
	function showPanel() {
		var panel = doc.getElementById(PANEL_ID),
			imp = 'important';

		if (!panel) {
			panel = createEl('iframe');

			panel.style.setProperty('position', 'fixed', imp);
			panel.style.setProperty('z-index', '2147483647', imp);
			panel.style.setProperty('top', '15px', imp);
			panel.style.setProperty('left', '20px', imp);
			panel.style.setProperty('border', '1px solid #bcbec0', imp);
			panel.style.setProperty('-webkit-border-radius', '10px', imp);
			panel.style.setProperty('-webkit-box-shadow', '0px 0px 20px #000', imp);
			panel.style.setProperty('display', 'none', imp);

			panel.id = PANEL_ID;
			panel.style.setProperty('height', '0px', imp);
			panel.style.setProperty('width', '347px', imp);
			panel.scrolling = 'no';
			panel.seamless = 'seamless';
			panel.src = se.baseURI + 'panel.html';

			if (doc.getElementsByTagName('body')[0]) {
				appendChild(doc.body, panel);
			} else {
				appendChild(doc.getElementsByTagName('html')[0], panel);
			}

		} else if (panel.style.display == 'none') {
			// panel.html sends a panelLoaded message on load
			sendMessage('panelLoaded');
		}

		if (panel.style.display == 'none') {
			panel.style.setProperty('display', 'block', imp);
			panel.style.setProperty('visibility', 'visible', imp);
			doc.addEventListener('click', closePanelListener, false);
			doc.addEventListener('keyup', closePanelListener, false);
		} else {
			closePanel();
		}
	}

	function closePanelListener(e) {
		if (e.which == 1 || e.which == 27) { // left-click or Esc
			closePanel();
		}
	}

	function closePanel() {
		var panel = doc.getElementById(PANEL_ID);
		if (panel) {
			doc.removeEventListener('click', closePanelListener, false);
			doc.removeEventListener('keyup', closePanelListener, false);
			panel.style.setProperty('height', '0px', 'important');
			panel.style.setProperty('display', 'none', 'important');
		}
	}

	function testElement(e) {
		var el = e.target,
			src,
			visible = true,
			preload_url;

		src = e.url;

		// ignore extension resources like panel.html
		// ignore data URIs (they never match and only slow down the matcher)
		if (!src || src.indexOf(se.baseURI) === 0 || src.indexOf('data:') === 0) {
			return;
		}

		// When prerendering, send along that the page is not visible and the
		// url to use instead of the incorrect tab.url. top_url may be undefined
		// for some iframes, so the background page will use the top_url sent
		// from the top level document
		if (doc.visibilityState === "prerender") {
			visible = false;
			preload_url = top_url;
		}

		if (!ss.tab.canLoad(e, {
			tab_window_id: TAB_WINDOW_ID,
			node_name: el.nodeName,
			src: src,
			frame_host: doc.location.hostname,
			from_frame: IS_FRAME,
			visible: visible,
			preload_url: preload_url
		})) {
			e.preventDefault();
		}
	}

	function createGear(alert_cfg) {
		var gear = createEl('a');

		gear.appendChild(document.createTextNode('\u0020'));
		gear.href = '#';
		gear.id = ALERT_ID + '-gear';
		gear.title = ALERT_TRANSLATIONS.alert_bubble_gear_tooltip;

		gear.style.setProperty(
			(alert_cfg && alert_cfg.pos_x == 'left' ? 'left' : 'right'),
			'0',
			'important');
		gear.style.setProperty(
			(alert_cfg && alert_cfg.pos_y == 'bottom' ? 'bottom' : 'top'),
			'0',
			'important');
		gear.style.setProperty(
			'border-' +
				(alert_cfg && alert_cfg.pos_y == 'bottom' ? 'top' : 'bottom') +
				'-' +
				(alert_cfg && alert_cfg.pos_x == 'left' ? 'right' : 'left') +
				'-radius',
			'3px',
			'important');
		gear.style.setProperty(
			'border-' +
				(alert_cfg && alert_cfg.pos_y == 'bottom' ? 'bottom' : 'top') +
				'-' +
				(alert_cfg && alert_cfg.pos_x == 'left' ? 'left' : 'right') +
				'-radius',
			'3px',
			'important');

		gear.addEventListener('click', function (e) {
			sendMessage('showPurpleBoxOptions');
			e.preventDefault();
		});

		return gear;
	}

	function buildC2P(c2pFrame, c2pAppDef, html) {
		c2pFrame.addEventListener('load', function () {

			var idoc = c2pFrame.contentDocument;

			idoc.documentElement.innerHTML = html;

			if (c2pAppDef.button) {
				c2pFrame.style.width = '30px';
				c2pFrame.style.height = '19px';
				c2pFrame.style.border = '0px';
			} else {
				c2pFrame.style.width = '100%';
				c2pFrame.style.border = '1px solid #ccc';
				c2pFrame.style.height = '80px';
			}

			if (c2pAppDef.frameColor) {
				c2pFrame.style.background = c2pAppDef.frameColor;
			}

			idoc.getElementById('action-once').addEventListener('click', function (e) {
				sendMessage('processC2P', {
					action: 'once',
					app_ids: c2pAppDef.allow
				});

				e.preventDefault();
			}, true);

			if (!c2pAppDef.button) {
				idoc.getElementById('action-always').addEventListener('click', function (e) {
					sendMessage('processC2P', {
						action: 'always',
						app_ids: c2pAppDef.allow
					});

					e.preventDefault();
				}, true);
			}

		}, false);
	}

	function applyC2P(app_id, c2p_app, html) {
		c2p_app.forEach(function (c2pAppDef, idx) {

			var els = doc.querySelectorAll(c2pAppDef.ele);
			for (var i = 0, num_els = els.length; i < num_els; i++) {
				var el = els[i];

				if (c2pAppDef.attach && c2pAppDef.attach == 'parentNode') {
					if (el.parentNode && el.parentNode.nodeName != 'BODY' && el.parentNode.nodeName != 'HEAD') {
						var div = createEl('div');
						el.parentNode.replaceChild(div, el);
						el = div;
					}
				} else {
					el.textContent = '';
				}

				el.style.display = 'block';

				var c2pFrame = createEl('iframe');

				buildC2P(c2pFrame, c2pAppDef, html[idx]);

				appendChild(el, c2pFrame);
			}
		});
	}

	function messageListener(msgEvent) {
		var msg = msgEvent.message,
			name = msgEvent.name,
			panel;

		if (msg && msg.tabWindowId && msg.tabWindowId != TAB_WINDOW_ID) {
			return;
		}

		if (name == 'c2p') {
			// queue Click-to-Play data so that we process multiple Twitter buttons at once, for example
			C2P_DATA[msg.app_id] = [ msg.app_id, msg.data, msg.html ];

			if (doc.readyState == 'complete') {
				applyC2P.apply(this, C2P_DATA[msg.app_id]);
			}
		}

		// the rest are not for child frames
		if (IS_FRAME) {
			return;
		}

		if (name == 'reload') {
			doc.location.reload();

		} else if (name == 'closePanel') {
			closePanel();

		} else if (name == 'resizePanel') {
			panel = doc.getElementById(PANEL_ID);
			panel.style.setProperty('-webkit-transition-duration', (msg.animate ? '0.25s' : ''), 'important');
			panel.style.setProperty('-webkit-transition-property', (msg.animate ? 'height, opacity' : ''), 'important');
			panel.style.setProperty('height', msg.height + 'px', 'important');

		} else if (name == 'show' || name == 'showUpgradeAlert' || name == 'showWalkthroughAlert' || name == 'showUpdateAlert') {
			if (!CSS_INJECTED) {
				CSS_INJECTED = true;
				injectCSS();
			}

			if (name == 'show') {
				ALERT_TRANSLATIONS = msg.translations;
				if (!UPGRADE_ALERT_SHOWN && !ALERT_DISMISSED) {
					showAlert('showBugs', msg.bugs, msg.alert_cfg);
				}
			} else {
				NOTIFICATION_TRANSLATIONS = msg.translations;
				showAlert(name);
				UPGRADE_ALERT_SHOWN = true;
			}

		} else if (name == 'showPanel') {
			showPanel();

		} else if (name == 'surrogates') {
			var code = '';

			// don't surrogate the same sid multiple times
			msg.surrogates.forEach(function (s) {
				if (!SIDS.hasOwnProperty(s.sid)) {
					code += s.code;
					SIDS[s.sid] = true;
				}
			});

			if (code) {
				injectScript(null, code);
			}

		} else if (name == 'popoverMessage') {
			sendMessage(msg.name, msg.message);
		}
	}

	// hack to work around panel.html getting injected scripts
	if (doc.location.href.indexOf(se.baseURI) !== 0) {

		doc.addEventListener('beforeload', testElement, true);

		ss.addEventListener('message', messageListener, false);

		win.addEventListener('load', function () {
			for (var app_id in C2P_DATA) {
				applyC2P.apply(this, C2P_DATA[app_id]);
			}
			// TODO clear C2P_DATA to free memory
		}, false);

		if (!IS_FRAME) {
			win.addEventListener('pageshow', function () {
				// pageshow is fired when the page is loaded, even if it's
				// not visible. Wait when prerendering or alert will pop up
				// while still looking at previous page
				if (doc.visibilityState === "prerender") {
					doc.addEventListener("visibilitychange", function () {
						if (doc.visibilityState === "visible") {
							sendMessage('pageLoaded');
							doc.removeEventListener("visibilitychange");
						}
					}, false);
				} else {
					sendMessage('pageLoaded');
				}
			}, false);

			win.addEventListener('pagehide', function () {
				closePanel();
				removeAlert();
			}, false);

			// When safari prerenders the top hit in the address bar while
			// typing, tab.url on the background page refers to the visible
			// page, so send the url of the site being prerendered for the
			// background page to use.
			sendMessage('pageInjected', {
				host: doc.location.hostname,
				preload_url: (doc.visibilityState === "prerender" ? top_url : false)
			});
		}
	}

}());
