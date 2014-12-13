/*!
 * Ghostery for Safari
 * http://www.ghostery.com/
 *
 * Copyright 2014 EVIDON, Inc. All rights reserved.
 * See https://www.ghostery.com/eula for license.
 */

/* global SafariExtensionToolbarItem */

require([
	'jquery',
	'underscore',
	'lib/bugdb',
	'lib/click2play',
	'lib/compatibility',
	'lib/tagdb',
	'lib/conf',
	'lib/dispatcher',
	'lib/metrics',
	'lib/foundbugs',
	'lib/ghostrank',
	'lib/i18n',
	'lib/matcher',
	'lib/surrogatedb',
	'lib/tabinfo',
	'lib/utils',
	'tpl/click2play'
], function ($, _, bugDb, c2pDb, compDb, tagDb, conf, dispatcher, metrics, foundBugs, ghostrank, i18n, matcher, surrogatedb, tabInfo, utils, c2p_tpl) {

	var prefs = utils.prefs,
		log = utils.log,
		upgrade_alert_shown = false,
		popoverSupport = safari.extension.popovers || false,
		popover,
		// GHOST-1268 Safari prerendering workaround.
		// Assumes only one page will ever get prerendered at a time,
		// and that the pageInjected message will be received before canLoad
		// for any resource belonging to a frame (that doesn't have access to
		// the top-level URL).
		saved_preload_url;

	// are we running for the first time/upgrading?
	// TODO move into init()?
	var JUST_INSTALLED = !prefs('previousVersion'),
		JUST_UPGRADED = prefs('previousVersion') != utils.VERSION && !JUST_INSTALLED;
	prefs('previousVersion', utils.VERSION);

	if (JUST_UPGRADED) {
		metrics.recordUpgrade();
	} else if (JUST_INSTALLED) {
		setTimeout(function () {
			metrics.recordInstall();
		}, 300000);
	} else {
		metrics.recordInstall();
	}

	//TODO Log latency once the safari API can do so

	// tab_id is a url in safari
	function clearTabData(tab_id) {
		foundBugs.clear(tab_id);
		tabInfo.clear(tab_id);
	}

	// TODO GHOST-758 speed up: this is used by canLoad
	function whitelisted(url) {
		var sites = conf.site_whitelist,
			num_sites = sites.length;

		for (var i = 0; i < num_sites; i++) {
			// TODO match from the beginning of the string to avoid false matches (somewhere in the querystring for instance)
			if (url.indexOf(sites[i]) >= 0) {
				return sites[i];
			}
		}

		return false;
	}

	function checkLibraryVersion(callback) {
		var VERSION_CHECK_URL = "https://cdn.ghostery.com/update/version";

		// TODO this does not handle no response/404/bad JSON
		$.getJSON(VERSION_CHECK_URL, function (r) {
			bugDb.update(r.bugsVersion, callback);
			c2pDb.update(r.click2playVersion);
			compDb.update(r.compatibilityVersion);
			tagDb.update(r.tagsVersion);
		});
	}

	function autoUpdateBugDb() {
		// check and fetch (if needed) a new tracker library every 12 hours
		if (conf.enable_autoupdate) {
			if (!prefs('bugs_last_updated') ||
				(new Date()) > (new Date(+prefs('bugs_last_updated') + (1000 * 60 * 60 * 12)))) {
				checkLibraryVersion();
			}
		}
	}

	function saveOptions(message, tab) {
		$.each(conf.toJSON(), function (setting) {
			if (typeof message[setting] != 'undefined') {
				conf[setting] = message[setting];
			}
		});

		// calling window.close() in options.html itself prevents optionsSave
		// from going out on Windows
		if (name == 'optionsSave') {
			tab.close();
		}
	}

	function openTab(url, isExtPage) {
		var tab, currentTabIndex,
			activeWindow = safari.application.activeBrowserWindow;

		if (isExtPage) {
			url = getURL(url);
		}

		if (activeWindow) {
			currentTabIndex = activeWindow.tabs.indexOf(activeWindow.activeTab);
			tab = activeWindow.openTab();
			// insert tab before current one because closing goes to the right
			activeWindow.insertTab(tab, currentTabIndex);
		} else {
			tab = safari.application.openBrowserWindow().activeTab;
		}
		tab.url = url;
	}

	function getURL(url) {
		return safari.extension.baseURI + url;
	}

	function sendMessage(tab, name, message) {
		tab.page.dispatchMessage(name, message);
	}

	function injectedScriptMessageListener(name, message, tab_id, tab_url) {
		if (name == 'openWalkthrough') {
			openTab('walkthrough.html', true);

		} else if (name == 'showNewTrackers') {
			openTab('options.html#new_trackers', true);

		} else if (name == 'openOptions') {
			openTab('options.html', true);

		} else if (name == 'openAbout') {
			openTab('options.html#about', true);

		} else if (name == 'openBackup') {
			openTab('backup.html', true);

		} else if (name == 'openTab') {
			openTab(message.url);

		} else if (name == 'optionsLoaded') {
			var buttons = safari.extension.toolbarItems;

			sendMessage(tab_id, 'optionsData', {
				db: bugDb.db,
				tagDb: tagDb.db,
				bugs_last_updated: prefs('bugs_last_updated'),
				button_present: !!buttons.length &&
					(buttons[0].identifier == 'ghosterybutton' ||
						// identifier on older Safaris is crazy
						buttons[0].identifier == utils.processUrl(safari.extension.baseURI).host + " ghosterybutton"),
				conf: conf.toJSON(),
				new_app_ids: prefs('newAppIds'),
				VERSION: utils.VERSION
			});

		} else if (name == 'showPurpleBoxOptions') {
			openTab('options.html#alert-bubble-options', true);

		} else if (name == 'recordPageInfo') {
			ghostrank.recordPage(message.domain, message.latency, message.spots);

		} else if (name == 'optionsSave' || name == 'walkthroughSave') {
			saveOptions(message, tab_id);

		} else if (name == 'walkthroughAborted' || name == 'walkthroughFinished') {
			if (JUST_INSTALLED) {
				metrics.recordInstall();
			}
			prefs(name, true);

			if (name == 'walkthroughAborted') {
				tab_id.close();
			}

		} else if (name == 'record_install') {
			metrics.recordInstall();

		} else if (name == 'optionsUpdateBugList') {
			checkLibraryVersion(function (result) {
				sendMessage(tab_id, 'optionsBugListUpdated', {
					db: bugDb.db,
					tagDb: tagDb.db,
					bugs_last_updated: prefs('bugs_last_updated'),
					conf: conf.toJSON(),
					new_app_ids: prefs('newAppIds'),
					success: result.success,
					is_new_update: result.updated
				});
			});

		// content scripts from top-level pages message us as soon as they execute
		} else if (name == 'pageInjected') {
			// Top Sites can have injected scripts, apparently
			// but keep going if this is a page that's being prerendered
			if (!tab_id.page && !message.preload_url) {
				return;
			}

			// Save top level document url from prerendering page for use with
			// frames that can't see the top level url in canLoad.
			if (message.preload_url) {
				saved_preload_url = message.preload_url;

				// beforeNavigate doesn't fire for prerendering
				// TODO non-blocking, unlike beforeNavigate, is that a problem?
				beforePrerender({
					old_url: tab_url,
					new_url: message.preload_url
				});
			}

			// Use received preload url if prerendering the page
			tab_url = message.preload_url || tab_url;

			// note that we are injected by initializing foundBugs for this URL
			foundBugs.update(tab_url);

			// validate event does not fire enough on older Safaris; activate the button
			if (safari.extension.toolbarItems[0]) {
				safari.extension.toolbarItems[0].disabled = !isValidPage(tab_url);
			}

			c2pDb.reset(tab_url);

			// no Click-to-Play for pages being prerendered from Top Sites
			if (tab_id.page && !conf.paused_blocking && !whitelisted(tab_url)) {
				insertSurrogates(message, tab_id);
			}

		// top-level content scripts also message us on "pageshow"
		} else if (name == 'pageLoaded') {
			// Top Sites can have injected scripts, apparently
			if (!tab_id.page) {
				return;
			}

			var alert_messages = [
				'dismiss',
				'notification_reminder1',
				'notification_reminder2',
				'notification_reminder_link',
				'notification_update',
				'notification_update_link',
				'notification_upgrade'
			];

			if (JUST_UPGRADED && !upgrade_alert_shown) {
				var msg = 'showUpgradeAlert';

				// Ghostrank is off and we've already dismissed or finished the walkthrough
				if (!conf.ghostrank && (prefs('walkthroughAborted') || prefs('walkthroughFinished'))) {
					msg = 'showWalkthroughAlert';
				}

				sendMessage(tab_id, msg, {
					// https://github.com/documentcloud/underscore/issues/220 -- crazy that an object-preserving map doesn't yet exist
					translations: _.object(_.map(alert_messages, function (key) { return [key, i18n.t(key)]; }))
				});

				upgrade_alert_shown = true;

			} else if (bugDb.db.JUST_UPDATED_WITH_NEW_TRACKERS) {
				if (conf.notify_library_updates) {
					sendMessage(tab_id, 'showUpdateAlert', {
						translations: _.object(_.map(alert_messages, function (key) { return [key, i18n.t(key)]; }))
					});
				}

				bugDb.db.JUST_UPDATED_WITH_NEW_TRACKERS = false;

			} else if (conf.show_alert) {
				showAlert(tab_id);
			}

		} else if (name == 'panelClose') {
			if (popoverSupport) {
				safari.extension.popovers[0].hide();
			} else {
				sendMessage(tab_id, 'closePanel');
			}

		} else if (name == 'panelLoaded' || name == 'popoverLoaded') {
			var data = {
				trackers: foundBugs.getApps(tab_url),
				tabId: tab_url,
				conf: conf.toJSON(),
				page: {
					url: tab_url,
					host: utils.processUrl(tab_url).host
				},
				whitelisted: whitelisted(tab_url),
				pauseBlocking: conf.paused_blocking,
				needsReload: (tabInfo.get(tab_url) ? tabInfo.get(tab_url).needsReload : { changes: {} }),
				showTutorial: !prefs('panelTutorialShown'),
				validProtocol: (tab_url.indexOf('http') === 0),
				language: conf.language
			};

			if (popoverSupport) {
				sendMessage(tab_id, 'popoverMessage', {
					name: 'popoverData',
					message: data
				});
			} else {
				sendMessage(tab_id, 'panelData', data);
			}

		} else if (name == 'panelResize') {
			sendMessage(tab_id, 'resizePanel', {
				animate: message.animate,
				height: message.height
			});

		} else if (name == 'panelSelectedAppsUpdate') {
			if (message.app_selected) {
				conf.selected_app_ids[message.app_id] = 1;
			} else {
				delete conf.selected_app_ids[message.app_id];
			}

		} else if (name == 'panelSiteWhitelistToggle') {
			var whitelisted_url = whitelisted(tab_url),
				hostname = utils.processUrl(tab_url).host;

			if (whitelisted_url) {
				conf.site_whitelist.splice(conf.site_whitelist.indexOf(whitelisted_url), 1);
			} else if (hostname) {
				conf.site_whitelist.push(hostname);
			}

		} else if (name == 'panelSiteSpecificUnblockUpdate') {
			var app_id = +message.app_id,
				host = utils.processUrl(tab_url).host;

			if (message.siteSpecificUnblocked) {
				conf.addSiteSpecificUnblock(host, app_id);
			} else {
				conf.removeSiteSpecificUnblock(host, app_id);
			}

		} else if (name == 'processC2P') {
			if (message.action == 'always') {
				message.app_ids.forEach(function (aid) {
					if (conf.selected_app_ids.hasOwnProperty(aid)) {
						delete conf.selected_app_ids[aid];
					}
				});
				sendMessage(tab_id, 'reload');

			} else if (message.action == 'once') {
				c2pDb.allowOnce(message.app_ids, tab_url);
				sendMessage(tab_id, 'reload');
			}

		} else if (name == 'panelPauseToggle') {
			conf.paused_blocking = !conf.paused_blocking;

		} else if (name == 'panelShowTutorialSeen') {
			prefs('panelTutorialShown', true);

		} else if (name == 'needsReload') {
			if (tabInfo.get(tab_url)) {
				tabInfo.get(tab_url).needsReload = message.needsReload;
			}

		} else if (name == 'reloadTab') {
			sendMessage(tab_id, 'reload');
		} else if (name == 'backupLoaded') {
			sendMessage(tab_id, 'backupData', {
				language: conf.language,
			});

		} else if (name == 'generateBackup') {
			sendMessage(tab_id, 'generatedBackup', {
				conf: conf.toJSON(),
				prefs: {
					panelTutorialShown: prefs('panelTutorialShown'),
					walkthroughFinished: prefs('walkthroughFinished'),
					walkthroughAborted: prefs('walkthroughAborted')
				}
			});

		} else if (name == 'restoreBackup') {
			saveOptions(message.conf);

			for (var p in message.prefs) {
				prefs(p, message.prefs[p]);
			}
		}
	}

	// TODO do we need these, or should we instead pull in the modules in conf.js? does that create a circ. dependency?
	function initDispatcher() {
		dispatcher.on('conf.save.selected_app_ids', function (v) {
			var num_selected = _.size(v),
				db = bugDb.db;
			db.noneSelected = (num_selected === 0);
			db.allSelected = (!!num_selected && _.every(db.apps, function (app, app_id) {
				return v.hasOwnProperty(app_id);
			}));
		});
		dispatcher.on('conf.save.language', function (v) {
			i18n.init(v);
		});
	}

	function insertSurrogates(message, tab_id) {
		// check for page-level surrogates
		// TODO handle not surrogating the same script multiple times w/ a
		// TODO tabInfo object, once we have one
		var surrogates = surrogatedb.getForSite(message.host);
		if (surrogates.length) {
			log('SURROGATE [SITE] for %s found: %o', message.host, surrogates);
			sendMessage(tab_id, 'surrogates', {
				surrogates: surrogates
			});
		}
	}

	// beforeNavigate is broken in 6.1/7.0 when prerendering the top hit
	// in the address bar. Replacement function called when prerendering starts
	function beforePrerender(data) {
		var current_url = data.old_url,
			nav_url = data.new_url;

		log("❤ ❤ ❤ Preload navigating to %s ❤ ❤ ❤", nav_url);

		ghostrank.onNavigate(nav_url);

		// handle reload prerendering (when you get bored while browsing reddit
		// and instinctively go to the address bar and type reddit)
		if (current_url == nav_url) {
			clearTabData(current_url);
		}

		tabInfo.create(nav_url);
	}

	// TODO Safari >= 5.1
	// TODO cancel matching top-level docs and replace them with Ghostery click-to-play pages
	//
	// TODO doesn't always get triggered when navigating back/forward in history?
	//
	// TODO misses pages on browser start
	//
	// TODO what about when we open the same URL we already have open in another tab?
	//
	// TODO what about navigation via pushState?
	//
	// TODO beforeNavigate is blocking (e.preventDefault() will cancel the navigation): optimize
	// TODO NOTE: has to be SUPER FAST because it holds up page loading
	//
	// beforeNavigate doesn't fire for prerendered pages
	function beforeNavigate(e) {
		var tab = e.target,
			current_url = e.target.url,
			nav_url = e.url,
			anchor_navigation = (
				current_url &&
				nav_url &&
				current_url != nav_url &&
				current_url.replace(/#.*$/, '') == nav_url.replace(/#.*$/, '')
			);

		if (anchor_navigation) {
			return;
		}

		log("❤ ❤ ❤ Navigating to %s ❤ ❤ ❤", nav_url);

		updateBadge(tab);

		if (!nav_url) {
			return;
		}

		ghostrank.onNavigate(nav_url);

		// handle reloads
		if (current_url == nav_url) {
			clearTabData(current_url);
		}

		// TODO what are the limitations of tabInfo given Safari's navigation API limitations?
		tabInfo.create(nav_url);
	}

	// TODO NOTE: has to be SUPER FAST because it holds up page loading
	function canLoad(msgEvent) {
		var message = msgEvent.message,
			tab = msgEvent.target,
			block,
			bug_id = false,
			app_id,
			src = message.src,
			tab_url = tab.url,
			tab_host,
			type = message.node_name,
			// is this from a page being prerendered?
			visible = message.visible,
			preload_url = message.preload_url;

		// If page is prerendering, use either the sent url or the saved url
		// Saved url is for iframes that don't have access to top.location.url
		if (!visible) {
			tab_url = (preload_url ? preload_url : saved_preload_url);
		}

		bug_id = matcher.isBug(src, tab_url);

		if (bug_id === false) {
			return;
		}

		// TODO this should be in tabInfo ...
		tab_host = (message.from_frame ? utils.processUrl(tab_url).host : message.frame_host);

		app_id = bugDb.db.bugs[bug_id].aid;

		// note: order matters for performance
		block = !conf.paused_blocking &&

			conf.selected_app_ids.hasOwnProperty(app_id) &&

			// site-specific unblocking
			(!conf.site_specific_unblocks.hasOwnProperty(tab_host) ||
				conf.site_specific_unblocks[tab_host].indexOf(+app_id) == -1) &&

			// TODO inline, or move to tabInfo
			!whitelisted(tab_url) &&

			// TODO inline?
			!c2pDb.allowedOnce(tab_url, app_id);

		// tell the injected script what to do
		msgEvent.message = !block;

		// do all this other junk asynchronously (processBug() in Chrome)
		setTimeout(function () {
			processBug({
				bug_id: bug_id,
				app_id: app_id,
				type: type,
				url: src,
				block: block,
				tab: tab,
				tab_host: tab_host,
				tab_url: tab_url,
				visible: visible,
				from_frame: message.from_frame
			});

			if (conf.ghostrank && !(safari.application.privateBrowsing && safari.application.privateBrowsing.enabled)) {
				ghostrank.record(tab_url, src, bug_id, block);
			}

			// no Click-to-Play for pages being prerendered from Top Sites
			if (block && conf.enable_click2play && tab.page) {
				sendC2PData(tab, message.tab_window_id, app_id);
			}

		}, 0);
	}

	function processBug(deets) {
		var bug_id = deets.bug_id,
			app_id = deets.app_id,
			type = deets.type,
			url = deets.url,
			block = deets.block,
			tab = deets.tab,
			tab_url = deets.tab_url,
			tab_host = deets.tab_host,
			visible = deets.visible,
			from_frame = deets.from_frame,
			num_apps_old,
			surrogates = [];

		log((block ? 'Blocked' : 'Found') + " [%s] %s (url=%s)", type, url, tab_url);
		log('');

		if (visible && conf.show_alert) {
			num_apps_old = foundBugs.getAppsCount(tab_url);
		}


		foundBugs.update(tab_url, bug_id, url, block, type);

		if (visible) {
			updateBadge(tab);
		}

		// TODO handle not surrogating the same script multiple times w/ a
		// TODO tabInfo object, once we have one
		if (block && type == 'SCRIPT' &&

			// we only inject at top-level, so don't bother looking up non-top-level scripts
			!from_frame &&

			// no surrogates for pages being prerendered from Top Sites
			tab.page) {

			surrogates = surrogatedb.getForTracker(
					url,
					app_id,
					bug_id,
					tab_host
					);

			if (surrogates.length) {
				log('SURROGATE [TRACKER] for %s found: %o', url, surrogates);
				// TODO this injects into the visible page too when
				// TODO prerendering, use TAB_WINDOW_ID like Click-to-Play?
				sendMessage(tab, 'surrogates', {
					surrogates: surrogates
				});
			}
		}

		// Don't show alert if prerendering
		if (visible && conf.show_alert) {
			if (!JUST_UPGRADED || upgrade_alert_shown) {
				if (foundBugs.getAppsCount(tab_url) > num_apps_old ||
					c2pDb.allowedOnce(tab_url, app_id)) {

					showAlert(tab);
				}
			}
		}

	}

	function sendC2PData(tab_id, tab_window_id, app_id) {
		var c2pApp = c2pDb.db.apps[app_id];

		if (!c2pApp) {
			return;
		}

		// click-to-play for social buttons might be disabled
		if (!conf.enable_click2play_social) {
			c2pApp = _.reject(c2pApp, function (c2pAppDef) {
				return !!c2pAppDef.button;
			});
		}

		if (!c2pApp.length) {
			return;
		}

		var app_name = bugDb.db.apps[app_id].name,
			c2pHtml = [];

		// generate the templates for each c2p definition (could be multiple for an app ID)
		// TODO move click2play into own file, with maybe the template function embedded in the file?
		c2pApp.forEach(function (c2pAppDef) {
			var tplData = {
				button: !!c2pAppDef.button,
				ghostery_blocked_src: getURL("data/images/click2play/ghosty_blocked.png"),
				allow_always_src: getURL("data/images/click2play/allow_unblock.png")
			};

			if (c2pAppDef.button) {
				tplData.allow_once_title = i18n.t('click2play_allow_once_button_tooltip', app_name);
				tplData.allow_once_src = getURL('data/images/click2play/' + c2pAppDef.button);
			} else {
				tplData.allow_once_title = i18n.t('click2play_allow_once_tooltip');
				tplData.allow_once_src = getURL('data/images/click2play/allow_once.png');

				tplData.ghostery_blocked_title = i18n.t('click2play_blocked', app_name);

				if (c2pAppDef.type) {
					tplData.click2play_text = i18n.t('click2play_' + c2pAppDef.type + '_form', app_name);
				}
			}

			c2pHtml.push(c2p_tpl(tplData));
		});

		sendMessage(tab_id, 'c2p', {
			app_id: app_id,
			data: c2pApp,
			html: c2pHtml,
			tabWindowId: tab_window_id
		});
	}

	// TODO Safari >= 5.1
	function close(e) {
		var url = e.target.url;

		if (url) {
			clearTabData(url);
		}
	}

	function command(e) {
		var tab = safari.application.activeBrowserWindow.activeTab;

		if (e.command == 'showPanel') {
			if (tab.url) {
				sendMessage(tab, 'showPanel');
			}

		} else if (e.command == 'showOptions') {
			openOrActivateTab(tab.browserWindow, getURL('options.html'));

		} else if (e.command == 'showPopover') {
			var toolbars = safari.extension.toolbarItems;
			for (var i = 0; i < toolbars.length; i++) {
				if (toolbars[i].browserWindow == tab.browserWindow) {
					toolbars[i].showPopover();
					break;
				}
			}
		}
	}

	function validate(e) {
		var tab,
			target = e.target;

		if (popoverSupport && target instanceof SafariExtensionToolbarItem) {
			if (target.identifier == 'ghosterybutton' && target.popover === null) {
				target.popover = popover;
				target.command = null;
			}
		}

		if (e.command != 'ghosterybutton' && e.command != 'showPanel' || !e.target.browserWindow) {
			return;
		}

		tab = e.target.browserWindow.activeTab;

		updateBadge(tab);

		e.target.disabled = !isValidPage(tab.url);
	}

	function contextMenu(e) {
		if (conf.show_contextual_menu_items && isValidPage(e.target.url)) {
			e.contextMenu.appendContextMenuItem(
				'cmShowPanel',
				i18n.t('rightclick_show_findings'),
				(popoverSupport ? 'showPopover' : 'showPanel')
			);
			e.contextMenu.appendContextMenuItem(
				'cmShowOptions',
				i18n.t('rightclick_show_options'),
				'showOptions'
			);
		}
	}
	function change(e) {
		if (e.key == 'open_options_checkbox') {
			openOrActivateTab(safari.application.activeBrowserWindow || safari.application.openBrowserWindow(), getURL('options.html'));
		}
	}

	// disable the button and the right-click menu for tabs we can't work with,
	// and tabs where we weren't injected (Ghostery Safari install with already
	// open pages)
	function isValidPage(url) {
		return !!(
			url &&
			url.indexOf(safari.extension.baseURI) !== 0 &&
			url != 'https://extensions.apple.com/' &&
			foundBugs.getBugs(url) !== false
		);
	}

	function showAlert(tab) {
		var apps;

		// the message has to be from the active tab of the active window
		if (tab != safari.application.activeBrowserWindow.activeTab) {
			return;
		}

		apps = foundBugs.getApps(tab.url, true);
		if (apps && apps.length) {
			sendMessage(tab, 'show', {
				bugs: apps,
				alert_cfg: {
					pos_x: (conf.alert_bubble_pos.slice(1, 2) == 'r' ? 'right' : 'left'),
					pos_y: (conf.alert_bubble_pos.slice(0, 1) == 't' ? 'top' : 'bottom'),
					timeout: conf.alert_bubble_timeout
				},
				translations: {
					alert_bubble_tooltip: i18n.t('alert_bubble_tooltip'),
					alert_bubble_gear_tooltip: i18n.t('alert_bubble_gear_tooltip')
				}
			});
		}
	}

	function updateBadge(tab) {
		var i,
			activeTab,
			buttons = safari.extension.toolbarItems,
			show_badge = conf.show_badge;

		// only update the badge if this tab is the active one in its window
		if (tab && tab.browserWindow.activeTab != tab) {
			return;
		}

		// loop through all buttons (one button per window)
		for (i = 0; i < buttons.length; i++) {
			// TODO null is not an object?
			activeTab = buttons[i].browserWindow.activeTab;

			// if tab was provided, update just that tab
			if (!tab || tab == activeTab) {
				if (show_badge) {
					buttons[i].badge = (activeTab.url ? foundBugs.getAppsCount(activeTab.url) : 0);
				} else {
					buttons[i].badge = 0;
				}

				if (tab) {
					return;
				}
			}
		}
	}

	function openOrActivateTab(browserWindow, url) {
		var i,
			num_tabs,
			tabs = browserWindow.tabs;

		for (i = 0, num_tabs = tabs.length; i < num_tabs; i++) {
			if (tabs[i].url && tabs[i].url == url) {
				tabs[i].activate();
				return;
			}
		}

		// no already-open tab with this url found, open a new tab
		browserWindow.openTab().url = url;
	}

	function pruneUrlData() {
		var urls = [];

		safari.application.browserWindows.forEach(function (window) {
			window.tabs.forEach(function (tab) {
				if (tab.url) {
					// strip anchors
					urls.push(tab.url.replace(/#.*$/, ''));
				}
			});
		});

		[foundBugs, tabInfo].forEach(function (urlData) {
			_.keys(_.omit(urlData.getAll(), urls)).forEach(function (url) {
				clearTabData(url);
			});
		});
	}

	function init() {
		// initialize trackers and surrogates
		bugDb.init(JUST_UPGRADED);
		c2pDb.init(JUST_UPGRADED);
		compDb.init(JUST_UPGRADED);
		tagDb.init(JUST_UPGRADED);

		i18n.init(conf.language);

		safari.application.addEventListener('beforeNavigate', function (e) {
			beforeNavigate(e);
		}, true);

		safari.application.addEventListener('message', function (msgEvent) {
			var name = msgEvent.name,
				message = msgEvent.message,
				tab = msgEvent.target,
				tab_url = tab.url;

			// cannot be in the function below, must set msgEvent.message directly
			if (name == 'canLoad') {
				canLoad(msgEvent);
				return;
			}

			// sending tab object as tab_id to minimize merge conflicts
			injectedScriptMessageListener(name, message, tab, tab_url);
		}, false);

		safari.application.addEventListener('close', function (e) {
			close(e);
		}, true);

		safari.application.addEventListener('command', function (e) {
			command(e);
		}, false);

		safari.application.addEventListener('contextmenu', function (e) {
			contextMenu(e);
		}, false);

		safari.application.addEventListener('validate', function (e) {
			validate(e);
		}, false);

		safari.extension.settings.addEventListener('change', function (e) {
			change(e);
		}, false);

		// messaging with Ghostery UI pages
		initDispatcher();

		setInterval(function () {
			autoUpdateBugDb();
		}, 300000); // run every five minutes

		// TODO do we need this? safari only
		setInterval(pruneUrlData, 800000); // run every eight minutes

		if (!!(!conf.ghostrank && !prefs('walkthroughAborted') && !prefs('walkthroughFinished'))) {
			setTimeout(function () {
				openTab('walkthrough.html', true);
			}, 1000);
		}

		if (popoverSupport) {
			popover = safari.extension.createPopover('ghostery-panel', getURL("popover.html"), 350, 421);
		}

	}
 
	init();
});
