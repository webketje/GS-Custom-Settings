var GLOBAL = GLOBAL || {
	ADMINLANG: $('#chosen-lang').val().split('_')[0],
	ADMINDIR: (function() {
		var l = location.href.slice(0, location.href.lastIndexOf('/')); 
		return l.slice(l.lastIndexOf('/')+1);
	}()),
	PLUGINVER: $('#plugin-version').val(),
	I18NLANGS: (function() {
		var test = $('#i18n-plugin-langs').val().replace(/\'/g, '"');
	  try {
			test = JSON.parse(test);
		} catch (e) {
			return false;
		}
		return test;
	}())
};
function Utils() {
	this.capitalize = function(string) {
		var u = ko.unwrap(string);
		return u.length ? u.slice(0,1).toUpperCase() + u.slice(1) : '';
	};
}
function ViewModel(data) {
	var self = this, 
			initialData = '';
	this.pluginVersion = GLOBAL['PLUGINVER'];
	this.utils = new Utils();
	this.notify = new Notifier();
	this.allLangs = GLOBAL['I18NLANGS'];
	this.i18n = data.i18n;
	getJSONData(null, 'loadPluginInfo', function(data) {
		self.pluginInfo = $.parseJSON(data);
		var i = self.pluginVersion.indexOf('.'),
				i2 = self.pluginInfo.version.indexOf('.');
		var vLocal = parseFloat(self.pluginVersion.slice(0,i) + '.' + self.pluginVersion.slice(i + 1).replace(/\./g,'')),
				vRemote = parseFloat(self.pluginInfo.version.slice(0,i2) + '.' + self.pluginInfo.version.slice(i2 + 1).replace(/\./g,''));
		self.notif.version[0] = self.i18n.about_new_version + ' <a href="http://get-simple.info/extend/export/10656/913/gs-custom-settings.zip">' 
			+ self.i18n.about_download + ' v.' + self.pluginInfo.version + '</a>';
		var dlLink = document.getElementById('plugin-info-dg').getElementsByTagName('a')[0];
		if (vRemote > vLocal) {
			notify('version');
			dlLink.href = self.pluginInfo.file;
			dlLink.textContent = self.i18n.about_download + ' v.' + self.pluginInfo.version;
			dlLink.parentNode.className = '';
		}
	});
	this.settings = false;
	this.mode = new Switch(['edit','manage']);
	this.settingTemplate = ko.computed(function() { return 'setting-item-' + self.mode.template(); });
	this.editPermission = $('#edit-permission').val().toUpperCase() === 'FALSE' ? false : true;
	this.devExportOpts = [
		{label: ' ', lookup: 'none'},
		{label: this.i18n['label_theme'], lookup: 'theme'},
		{label: this.i18n['label_plugin'], lookup: 'plugin'}
	];
	this.notif = {
		jsonImport: { 
			invalidJson:    ['error_jsonimport_invalidjson',   'error'],
			invalidExt:     ['error_jsonimport_invalidext',    'error'],
			invalidBrowser: ['error_jsonimport_invalidbrowser','error'],
			pluginMissing:  ['error_jsonimport_thememissing',  'error'],
			themeMissing:   ['error_jsonimport_pluginmissing', 'error']
		},
		duplicate: {
			settingLookups: ['error_conflict_settings','error'],
			tabLookups:     ['error_conflict_tabs',    'error']
		},
		version: ['', 'notify', false, 'long'],
		actions: {
			clipBoardCopy:    ['info_clipboardcopy', 'updated', false, 'short'],
			tabRemove:        ['warn_tab_remove', 'notify', {ok: function() {singleSelectList.prototype.remove.apply(self.data);}}],
			settingsRemove:   ['This action will irrevocably delete all selected settings. Are you sure you wish to proceed?', 'notify', {ok: function() {List.prototype.remove.apply(self.data.items()[self.data.activeItem()].settings)}}],
			settingTypeChange:['This action will unset the setting\'s value. Are you sure you wish to proceed?', 'notify', {ok: ''}],
			settingTabSwitch: ['This action will move all selected settings to another tab. Be sure to avoid naming conflicts.', 'notify', {ok: ''}],
			saveSucceeded:    ['SETTINGS_UPDATED', 'updated'],
			saveError:        ['error_save', 'error']
		}
	};
	// shorthand for notifier
	function notify(arg1, arg2) {
		var args = self.notif[arg1];
		if (arg2) args = args[arg2];
		self.notify.apply(self, args);
	}
	function findTab(prop, value) {
		var tabs = self.data.items();
		return ko.utils.arrayFirst(tabs, function(tab) {
			return ko.unwrap(tab[prop]) === value;
		}) || false;
	};
	this.fn = {};
	this.fn.map = function(data) {
		var dataArray = [], obj;
		if (!data.hasOwnProperty('length')) {
		for (var item in data) {
			var obj = data[item];
			obj.tab.label = obj.tab && obj.tab.type === 'theme' ? self.i18n['label_themesettings'] : obj.tab.label;
			dataArray.push(obj);
		}
		}
		initialData = dataArray;
		var result = new singleSelectList({
			data: dataArray,
			model: Tab,
			filter: function(item) { return item.type === 'site'; },
			defaults: {tab: {label: self.i18n['def_tab_label'], lookup: 'new_tab'}},
			defaultActive: 0,
			minLimit: 0,
			custom: { 
				types: [
					{value: 'text',           label: self.i18n['input_text']},
					{value: 'textarea',       label: self.i18n['input_textarea']},
					{value: 'checkbox',       label: self.i18n['input_checkbox']},
					{value: 'radio',          label: self.i18n['input_radio']},
					{value: 'select',         label: self.i18n['input_select']},
					{value: 'image',          label: self.i18n['input_image']},
					{value: 'fancy-checkbox', label: self.i18n['input_fancy_checkbox']},
					{value: 'fancy-radio',    label: self.i18n['input_fancy_radio']},
					{value: 'switch',         label: self.i18n['input_switch']},
					{value: 'color',          label: self.i18n['input_color']},
					{value: 'section-title',  label: self.i18n['input_section_title']}
				], 
				accessLevels: [
					{value: 'normal',         label: self.i18n['access_normal']},
					{value: 'locked',         label: self.i18n['access_locked']},
					{value: 'hidden',         label: self.i18n['access_hidden']}
				]}
		});
		return result;
	};
	this.fn.saveData = function() {
		var data = ko.toJSON(self.fn.unmapData());
		// problem with this is that timeout and page reload are needed for PHP changes to take effect
		if (self.data.tabConflict()) {
			notify('duplicate','tabLookups');
			return;
		}
		if (self.data.settingConflict()) {
			notify('duplicate','settingLookups');
			return;
		}
		setJSONData(paths.data, 'saveData', data, function(data, status, error) {
			if (data === null) {
				notify('actions','saveError');
			} else {
				notify('actions','saveSucceeded');
			}
		});
	};
	// Nested unmapping functions in execution order
	this.fn.unmapSettings = function(settings) {
		var ignore = {
			// id & phpFetch included as no longer used, but still in v.0.1
			'all': ['isHidden','isLocked','isOpen','hasValue','displayInManageMode','lookupOutput', 'names', 'cachedType','activeValue', 'activeLang',
							'isOptionInput','faIcon','changeInputType','toggle','parentList','display','icon', 'selected', 'descrHTML'],
			'text': ['options'],
			'textarea': ['options'],
			'checkbox': ['options','i18n','values'],
			// V. 0.2. added switch ignore options
			'switch': ['options','i18n','values'],
			'radio': ['i18n','values'],
			'color': ['options','i18n','values'],
			'select': ['i18n','values'],
			'image': ['options','i18n','values'],
			'section-title': ['options','value','access','descr','i18n','values'],
			'fancy-checkbox': ['options','i18n','values']
		};
		
		function getCleanSetting(setting) {
			var cleanSetting = {},
					ignoredItems = ignore.all.concat(ignore[setting.type()]);
			
			for (var prop in setting) {
				unwrappedProp = ko.utils.unwrapObservable(setting[prop]);
				if (!inArray(prop, ignoredItems)) {
					if ((setting.hasValue() && typeof unwrappedProp !== 'function') || setting.type() === 'section-title') {
						if ((prop === 'options' && unwrappedProp.length) || (prop === 'values' && setting['i18n']() === true)) {
							cleanSetting[prop] = ko.utils.arrayMap(unwrappedProp, function(setting) { return setting && setting.val ? setting.val : false});
						} else if ((prop === 'i18n' && unwrappedProp === true) || !/values|i18n/.test(prop)){
							cleanSetting[prop] = unwrappedProp;
						}
					}
				}
			}	
			return cleanSetting;
		}
		var settingList = settings, 
				settingsData = [];
				
		for (var i = 0; i < settingList.length; i++) {
			settingsData.push(getCleanSetting(settingList[i]));
		}
		return settingsData;
	};
	this.fn.unmapTabs = function(tabs) {
		var ignore = ['settings','selected'], //settings have their own unmapping function, added afterwards
				tabs = tabs && tabs.length ? tabs : self.data.items();

		return ko.utils.arrayMap(tabs, function(tab) {
			var unwrappedProp, mappedTab = {};
			
			for (var prop in tab) {
				if (!inArray(prop, ignore)) {
					unwrappedProp = ko.utils.unwrapObservable(tab[prop]);
					mappedTab[prop] = unwrappedProp;
				}
			}
			mappedTab.settings = self.fn.unmapSettings(tab.settings.items());
			return mappedTab;
		});
	};
	this.fn.unmapData = function(unmappedTabs) {
		var tabs = self.fn.unmapTabs(unmappedTabs) || self.fn.unmapTabs(),
				result = {}, tabOpts = ['version','enableReset','enableAccessAll'];
		ko.utils.arrayForEach(tabs, function(tab) {
			result[tab.lookup] = {tab: {lookup: tab.lookup, label: tab.label, type: tab.type}, settings: tab.settings };
			for (var opt = 0; opt < tabOpts.length; opt++) {
				if (typeof tab[tabOpts[opt]] !== 'undefined') result[tab.lookup].tab[tabOpts[opt]] = tab[tabOpts[opt]];
			}
		});
		return result;
	};
	this.returnSetting = function(tab, setting) {
		if (self.data.items().length) {
			var t = ko.utils.arrayFirst(self.data.items(), function(item) { return item.lookup() === tab });
			if (t && t.settings.items().length) {
				var s = ko.utils.arrayFirst(t.settings.items(), function(item) { return item.lookup() === setting });
				if (s)
					return s;
			}
		}
	};
	// Export settings for backup and cross-site reuse
	// Essentially for webmasters
	this.fn.exportData = function(value) {
		if (value !== 'none') {
		var tabs = self.data.items(),
				selTab = ko.utils.arrayFirst(tabs, function(tab) {
					return tab.lookup() === value;
				}) || 'site_settings', 
				tabType = selTab === 'site_settings' ? 'site' : (selTab.type === 'site' ? 'tab' : selTab.type),
				lookup = value !== 'site_settings' ? selTab.lookup() : null;
				fileName = tabType + 'data' + (value !== 'site_settings' ? '_' + selTab.lookup() : '') + '.json',
				data = value !== 'site_settings' ? self.fn.unmapData([selTab]) : self.fn.unmapData();
				console.log(data);
		switch (tabType) {
			case 'site':
				fileName = 'data.json';
				var temp = {site: []};
				for (var tab in data) {
					var tempTab = data[tab];
					delete tempTab.tab.type;
					temp.site.push(tempTab);
				}
				data = temp;
			break;
			case 'theme':
				fileName = 'theme_data_' + document.getElementById('site-template').value + '.json';
				delete data[lookup].tab.type;
				data = {tab: data[lookup].tab, settings: data[lookup].settings};
			break;
			case 'plugin':
				fileName = 'plugin_data_' + lookup + '.json';
				delete data[lookup].tab.type;
				data = {tab: data[lookup].tab, settings: data[lookup].settings};
			break;
			case 'tab': 
				fileName = lookup + '_data.json';
				delete data[lookup].tab.type;
				data = {tab: data[lookup].tab, settings: data[lookup].settings};
		}
		// FileSaver.js function; should work on all browsers.
		saveTextAs(ko.toJSON(data, null, '\t'), fileName);
		}
	};
	// Export settings for plugin or theme developers
	// Used in onewaySelect binding; exports the current settings, not those saved in the corresponding file! 
	this.fn.devExport = function(value, ctx, e) {
		if (value === 'none')
			return;
		var ctx = ko.contextFor(e.target).$parent.data,
			tab = ctx.items()[ctx.activeItem()], result = {};
			
		if (value === 'plugin') {
			result.tab = {lookup: tab.lookup,	label: tab.label};
		}
		
		result.settings = self.fn.unmapTabs([tab])[0]['settings'];
		result = ko.toJSON(result, null, '\t');
		saveTextAs(result, 'settings.json');
	};
	// Data import currently using JS FileAPI. Needs testing and alternative for IE9-
	this.fn.importData = function(data, e) {
		var value = (e.target || e.srcElement).value,
				file = (e.target || e.srcElement).files[0], fRead, result,
				allTabs = self.data.items(), 
				tabObj = {},
				sType = (function settingsType() {
					if (value.match('theme_data')) {
						return 'theme';
					} else if (value.match('plugin_data')) {
						return 'plugin';
					} else if (value.match(/\bdata.json/)) {
						return 'site';
					} else if (value.match('_data.json')) {
						return 'tab';
					}
				}());
		function addNewTab(tab) {
			var l = allTabs.length,
					newTab = new self.data.itemModel({ 
						tab: { lookup: tab.tab.lookup, label: tab.tab.label},
						settings: tab.settings
					});
			// make sure we append the tab before plugins/ theme settings
			while (l--)
				if (allTabs[l].type !== 'site') break;
				self.data.items.splice(l || 0, 0, newTab);
		}
		function replaceExistingTab(oldTab, newTab) {
			var oldSettings = oldTab.settings.items(),
					newSettings = newTab.settings,
					newSettingsDictionary = ko.utils.arrayMap(newSettings, function(setting) { return setting.lookup; }),
					modifiableProps = ['value','type','descr','access','label','options'];
			
			// first loop over all current settings
			for (var i = 0; i < oldSettings.length; i++) {
				var currentIndex = newSettingsDictionary.indexOf(oldSettings[i].lookup());
				// set selected to false for all tab settings to avoid errors
				oldSettings[i].selected(false);
				// if the new setting's lookup is already present in current settings,
				if (currentIndex > -1) { 
					var currentNewItem = ko.utils.arrayFirst(newSettings, function(x) {
						return x.lookup === oldSettings[i].lookup();
					});
					// don't overwrite the whole setting, replace on a per property basis
					for (var prop in oldSettings[i]) {
						if (inArray(prop, modifiableProps) && ko.unwrap(oldSettings[i][prop]) !== newSettings[currentIndex][prop]) {
							// all replacable properties are observables, ok to call as function
							if (prop === 'options' && currentNewItem[prop]) {
								var temp = [];
								ko.utils.arrayForEach(currentNewItem[prop], function(option, i) {
									temp.push({val: option, index: i});
								});
								currentNewItem[prop] = temp;
							}
							oldSettings[i][prop](currentNewItem[prop]);
						}
					}
					// remove replaced item's lookup from dictionary to keep only 'new' settings
					newSettingsDictionary.splice(currentIndex, 1);
				}
			}
			// if there are still new settings that didn't exist yet, add them
			if (newSettingsDictionary.length) {
				for (var i = 0; i < newSettingsDictionary.length; i++) {
					var newSetting = ko.utils.arrayFirst(newSettings, function(x) {
						return x.lookup === newSettingsDictionary[i];
					});
					oldTab.settings.items.push(new oldTab.settings.itemModel(newSetting));
				}
			}
			// make sure Knockout views are updated
			oldTab.settings.items.valueHasMutated();
		}
		// Check for the various File API support + additional select check
		if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
		  notify('jsonImport','invalidBrowser');
			return;
		}
		if (file) {
			if (!value.match('.json')) {
				notify('jsonImport','invalidExt');
				return;
			}
			fRead = new FileReader();
	    fRead.readAsText(file);
	    var waitForLoad = setInterval(function() {
	      if (fRead.result.length) {
	        try {
						var result = JSON.parse(fRead.result);
					} catch (e) {
						notify('jsonImport', 'invalidJson');
						return;
					}
					switch (sType) {
						case 'theme':
							var themeTab = findTab('isTheme', true);
							// only allow importing settings from the current theme
							if (themeTab && result.theme === document.getElementById('site-template').value)
								replaceExistingTab(themeTab, result);
							else 
								notify('jsonImport', 'themeMissing');
						break;
						case 'tab':
							var singleTab = findTab('lookup', result.tab.lookup);
							if (singleTab)
								replaceExistingTab(singleTab, result);
							else
								addNewTab(result);
						break;
						case 'site':
							for (var i = 0; i < result.site.length; i++) {
								var singleTab = findTab('lookup', result.site[i].tab.lookup);
								if (singleTab) {
									replaceExistingTab(singleTab, result.site[i]);
								} else
									addNewTab(result.site[i]);
							}
						break;
						case 'plugin':
							var pluginTab = findTab('lookup', result.tab.lookup);
							// only allow importing settings from an activated plugin
							if (pluginTab && pluginTab.type === 'plugin')
								replaceExistingTab(pluginTab, result);
							else 
								notify('jsonImport', 'pluginMissing');						
						break;
					}
					clearInterval(waitForLoad);
	      }
	    }, 100);
		}
	};
	this.data = this.fn.map(data.rawData.data);
	if (this.data.items().length) {
		this.data.activeItem(0);
	}
	if (location.href.match('#')) {
		var anchor = location.href.slice(location.href.indexOf('#') + 1), tab = 0;
		ko.utils.arrayForEach(this.data.items(), function(item, index) { 
			if (item.lookup() === anchor)
				tab = index;
		});
		this.data.activeItem(tab);
	}
	this.data.remove = function() {
		if (self.data.items()[self.data.activeItem()].settings.items().length) 
			notify('actions','tabRemove');
		else 
			singleSelectList.prototype.remove.apply(self.data);
	};
	this.data.activeItemValid = ko.computed(function() {
		return self.data.activeItem() > -1 && self.data.items().length && self.data.items()[self.data.activeItem()];
	});
	this.data.activeTabProp = ko.observable('label');
	this.data.toggleActiveTabProp = function() {
		self.data.activeTabProp(self.data.activeTabProp() === 'label' ? 'lookup' : 'label');
	};
	// rate limit required to prevent errors coming from tab removal
	this.tabExportList = ko.computed(function() {
		var tabs = self.data.items(),
				extra = [{label: ' ', lookup: 'none'}, {lookup: 'site_settings', label: self.i18n['label_sitesettings']}];
		return extra.concat(ko.utils.arrayMap(tabs, function(tab) {
			return {lookup: tab.lookup(), label: tab.label()};
		}));
	}).extend({rateLimit: 500});
	// checks whether there is a naming conflict in tabs data
	this.data.tabConflict = function() { 
		var tabs = self.data.items(), flag = false;
		ko.utils.arrayForEach(tabs, function(tab, index) {
			ko.utils.arrayForEach(tabs, function(tab2, index2) { 
				if (tab.lookup() === tab2.lookup() && index2 !== index) flag = true;
			});
		});
		return flag;
	};
	// checks whether there is a naming conflict in settings data
	this.data.settingConflict = function() { 
		var flag = false, count=0, lookups = ko.utils.arrayMap(self.data.items(), function(item) {
			if (item.lookup)
				return { settings: item.settings.items(), lookup: item.lookup() };
		});
		ko.utils.arrayForEach(lookups, function(tab, index) {
			ko.utils.arrayForEach(tab.settings, function(setting, sindex) { 
				ko.utils.arrayForEach(tab.settings, function(setting2, sindex2) { 
					if (setting.lookup() === setting2.lookup() && sindex2 !== sindex) flag = true;
				});
			});
		});
		return flag;
	};
	this.delegatedEvents = function() {
		ko.utils.registerEventHandler(document.body, 'keydown', function(e, elem) {
			if (e.ctrlKey && e.keyCode === 70) {
				e.preventDefault();
			  document.getElementById('setting-search').getElementsByTagName('input')[0].focus();
			}
			if (e.ctrlKey && e.keyCode === 67 && document.activeElement.className.match('ko-code')) {
			  if (document.activeElement.selectionStart == 0 && document.activeElement.selectionEnd == document.activeElement.value.length) {
			    notify('actions','clipBoardCopy');
			  }
			}
			return true;
		});
	};
	this.delegatedEvents();
	this.search = ko.observable('');
	this.searchActive = ko.computed(function() { return self.search().length > 3;	});
	this.searchFilter = ko.computed(function() { 
		if (self.data.items().length && self.data.items()[self.data.activeItem()] && self.data.items()[self.data.activeItem()].settings.items().length) {
		var currentTab = self.data.items()[self.data.activeItem()].settings.items(),
				search = new RegExp(self.search().toLowerCase());
		return ko.utils.arrayFilter(currentTab, function(item) {
			return search.test(ko.unwrap(item.lookup).toLowerCase()) || search.test(item.label().toLowerCase());
		});
		} else {
			// return an array as expected for the list view
			return [];
		}
	}).extend({rateLimit: 100});
	// this.imageBrowser = new ImageBrowser(this);
}

/** MODEL: Tab (constructor)
 *  @param {object} opts
 *  @param {string} opts|label - A label for the tab
 *  @param {string} [opts|icon] - (Optional) An icon for the tab
 */
function Tab(opts) {
	var self = this, cachedLookup = ko.observable(opts.tab.lookup !== makePHPSafe(window.i18nJSON.strings['def_tab_label']) ? opts.tab.lookup : false);
	this.label = ko.observable(opts.tab.label);
	var tabOpts = ['version','enableReset','enableAccessAll'];
	for (var j = 0; j < tabOpts.length; j++) {
		if (typeof opts.tab[tabOpts[j]] !== 'undefined')
			this[tabOpts[j]] = opts.tab[tabOpts[j]];
	}
	this.lookup = opts.tab.lookup === 'theme_settings' ? ko.observable('theme_settings') : ko.computed({
		read: function() { return cachedLookup() ? cachedLookup() : makePHPSafe(self.label()); },
		write: function(value) { cachedLookup(makePHPSafe(value)); }
	});
	this.type = opts.tab && opts.tab.type ? opts.tab.type : 'site';
	this.settings = new List({ data: opts && opts.settings || [], model: Setting, keys: true});
	// TODO: find a better way to set default label & lookup
	var setDefs = setInterval(function() {
		if (window.customSettings && window.customSettings.i18n) {
		  self.settings.defaults = {
		    label: window.customSettings.i18n['def_setting_label'] ,
		    lookup: window.customSettings.i18n['def_setting_lookup'],
		    langs: window.customSettings.allLangs,
		    value: '' }
		  clearInterval(setDefs);
		 }
  }, 100);
	this.settings.resetToDefault = function() {
		var settings = self.settings.items();
		if (settings.length && self.enableReset) {
			for (var i = 0; i < settings.length; i++) {
				if (settings[i].hasOwnProperty('value') && settings[i].hasOwnProperty('default')) // make sure to exclude section titles
					settings[i].value(settings[i]['default']);
			}
		}
	};
	this.settings.activeItemCount = ko.computed(function() { return self.settings.activeItems().length; });
	this.settings.disable_open = ko.computed(function() { return self.settings.activeItemCount() < 1; });
	this.settings.allAreOpened = ko.computed(function() { 
		var allAreOpened = true,
				items = self.settings.items(), 
				activeItems = ko.utils.arrayFilter(items, function(item, i) {
					return self.settings.activeItems().indexOf(i) > -1;
				});
		ko.utils.arrayForEach(activeItems, function(item, i) {
			if (!item.isOpen.state()) allAreOpened = false;
		});
		return allAreOpened;
	});
	this.settings.openCloseAll = function() {
		var	items = self.settings.items(), 
				activeItems = ko.utils.arrayFilter(items, function(item, i) {
					return self.settings.activeItems().indexOf(i) > -1;
				});
		if (self.settings.allAreOpened() === false) {
			ko.utils.arrayForEach(activeItems, function(item) {
				if (!item.isOpen.state())
					item.isOpen.state(true);
			});
		} else {
			ko.utils.arrayForEach(activeItems, function(item) {
				if (item.isOpen.state())
					item.isOpen.state(false);
			});
		}
	};
}
/**
 *  MODEL: Setting (constructor)
 *  @param {object} opts 
 *  @param {string} opts|label - (required) The label used for display of the setting and from which the PHP lookup is generated
 *  @param {string} opts|descr - (optional) A description for the setting (backend)
 *  @param {object} [opts|data=new Input]  - (optional) Data for the setting (empty if new)
 */
var Setting = function(opts) {
	var self = this;
	this.lookup = ko.observable(opts && opts.lookup ? opts.lookup : '');
	this.value = ko.observable(opts && opts.value !== 'undefined' ? (/radio|select/.test(opts.type) ? parseInt(opts.value) : opts.value) :'');
	this.values = ko.observableArray([{val: self.value}]);
	this.activeLang = ko.observable(0);
	if (opts.i18n) {
		ko.utils.arrayForEach(opts.values || [], function(item, i) {
			if (i !== 0)
				self.values.push({val: ko.observable(item)});
		});
		var langs = GLOBAL['I18NLANGS'] || [];
		if (self.values().length < langs.length) {
			for (var i = self.values().length; i < langs.length; i++) {
				self.values.push({val: ko.observable(self.value())});
			}
		} else if (self.values().length > langs.length) {
			for (var i = langs.length; i < self.values().length; i++) {
				self.values.pop();
			}
		}
	}
	this.type = ko.observable(opts && opts.type ? opts.type : 'text');
	this.descr = ko.observable(opts && opts.descr ? opts.descr : '');
	this.access = ko.observable(opts && opts.access ? opts.access : 'normal');
	this.names = {
		label:  ko.computed(function() { return self.lookup() + '-label'}),
		lookup: ko.computed(function() { return self.lookup() + '-lookup'}),
		access: ko.computed(function() { return self.lookup() + '-access'}),
		type:   ko.computed(function() { return self.lookup() + '-type'}),
		tab:    ko.computed(function() { return self.lookup() + '-tab'}),
		descr:  ko.computed(function() { return self.lookup() + '-descr'}),
		options:ko.computed(function() { return self.lookup() + '-options'}),
		value:  ko.computed(function() { return self.lookup() + '-value'})
	}
	this.label = opts ? ko.observable(opts.label) : this.label;
	this.options = ko.observableArray(opts && opts.options ? ko.utils.arrayMap(opts.options, function(option, i) {
		return {val: option, index: i};
	}) : []);
	this.cachedType = '';
	// misc for diff types of input 
	this.icon = ko.computed(function() {
		return this.type() === 'fancy-checkbox' ? ['check-square-o','square-o'] :
			(this.type() === 'fancy-radio' ? ['dot-circle-o','circle-o'] : 
				(this.type() === 'switch' ? ['toggle-on','toggle-off'] : '')
			)
	}, this);
	this.display =  ko.computed(function() {
		var prefix = 'fa fa-lg fa-';
		return self.value() !== false ? prefix + self.icon()[0] : prefix + self.icon()[1];
	});
	this.toggle = function() { this.value(!this.value())};
	// state helpers
	this.i18n = ko.observable(opts && opts.i18n || false).extend({rateLimit: 100});
	this.i18n.subscribe(function(newVal) {
		for (var i = self.values().length; i < customSettings.allLangs.length; i++) {
			self.values.push({val: ko.observable(self.value())});
		}
	});
	this.isOpen = new Switch(['plus-square','minus-square']);
	this.isHidden = ko.computed(function() { return self.access() === 'hidden';	});
	this.isLocked = ko.computed(function() { return self.access() === 'locked';	});
	this.hasValue = ko.computed(function() { return typeof self.value() !== 'undefined'; });
	this.isOptionInput = ko.computed(function() { return /select|radio/.test(self.type()); });
	for (var opt in opts) {
		if (!this[opt]) this[opt] = opts[opt];
	}
}
Setting.prototype.castValue = function() {
	var val = this.value();
	if (/false/.test(val)) 
		return false;
	else if (/true/.test(val))
		return true;
	else if (!isNaN(val))
		return parseInt(val);
	else
		return val;
};
// setting type caching should prevent the setting's value from being reset,
// when the type is changed, but the values are of the same type (booleans, options or text)
Setting.prototype.cacheType = function() { this.cachedType = this.type();};
Setting.prototype.changeInputType = function(data, e) {
		var self = this, target = e ? (e.target ? e.target : e.srcElement) : false;
		switch (this.type()) {
			case 'section-title': 
				break;
			case 'text':
			case 'textarea':
			case 'image':
				if (target && !/text/.test(this.cachedType))
					this.value('');
				break;
			case 'checkbox':
				if (typeof this.castValue() !== 'boolean')
					this.value(false);
				break;
			case 'select':
			case 'radio':
			case 'fancy-radio':
				if (target && !/select|radio/.test(this.cachedType))
					this.value(0);
				break;
			case 'fancy-checkbox':
				if (typeof this.castValue() !== 'boolean')
					this.value(false);
				break;
			case 'switch': 
				if (typeof this.castValue() !== 'boolean')
					this.value(false);
				break;
		}
		this.cacheType();
		return data;
}

function ImageBrowser(context) {
	var self = this,
			elem = document.getElementById('image-browser'),
			context = context,
			loaded = false;
	this.active = ko.observable(false);
	this.origin = '';
	this.uploads = ko.observableArray([]);
	this.selected = ko.observable('');
	this.toggle = function(data, e) {
		var target = e.target || e.srcElement;
		if (!self.loaded) {
			getJSONData(null, 'loadImageBrowser', function(data, status, error) {
				if (data !== null) {
					var temp = $.parseJSON(data);
					temp.children.sort(function(left, right) { return left.folder && right.folder ? 0 : (left.folder ? -1 : 1) })
					self.uploads(temp);
					self.origin = context.data.items()[context.data.activeItem()].settings.items()[ko.contextFor(e.target || e.srcElement).$index()];
					loaded = true;
				}
			});
		}
		self.origin = context.data.items()[context.data.activeItem()].settings.items()[ko.contextFor(e.target || e.srcElement).$index()];
		self.selected('');
		self.active(true);
	}
	this.folderPath = ko.observableArray(['uploads']);
	this.selFolder = ko.computed(function() {
		var u = self.uploads(), result = u, count = 1,
				fp = self.folderPath(), fpL = fp.length;
		function iter(obj, i) {
		console.log(fpL, i);
			if (i < fpL) {
				if (obj.children && obj.children.length) {
					for (var x = 0; x < obj.children.length; x++) {
						if (obj.children[x].folder === fp[i] && typeof (obj.children[x].folder)!== undefined) { 
			console.log(obj.children[x].folder === fp[i] ? ko.toJSON(obj.children[x]) + ' -' + i + fp[i] : '');
							return iter(obj.children[x], i++); }
					}
				}
			} else { console.log(obj);
				return obj; }
		}
		console.log(iter(u, 1));
		return u.folder ? iter(u, count) : {children: []};
	});
	this.cancel = function() { self.selected(''); self.active(false); }
	this.set = function() { self.origin.value(self.selected()); self.active(false); };
	ko.utils.registerEventHandler(document.getElementById('image-browser'), 'click', function(e) { 
		var target = e.target || e.srcElement;
		if (target.parentNode.className.match('image-browser'))
			target = target.parentNode;
		if (target.className && target.className.match('image-browser-image')) {
			target = target.getElementsByTagName('img')[0];
			if (target.getAttribute('src'))
				self.selected(target.getAttribute('src'));
		}
	});
}
function initcustomSettings() {
	var ajaxData = {};
	getJSONData(null, 'getI18NFile', function(data, status, error) {
		if (data === null)  {
		//	vm.notify('ERROR','error');
		} else {
		ajaxData.i18n = parseJSON(data);
		getLangFile();
		}
	});
	function getLangFile() {
		var parsed = window.i18nJSON;	
			if (!ajaxData.i18n)
				ajaxData.i18n = {};
			for (var str in parsed.strings) {
				ajaxData.i18n[str] = parsed.strings[str];
			}
			ajaxData.i18n.translation_meta = parsed.meta;
		getData();
	}
	function getData() {
	getJSONData(paths.data, 'getDataFile', function(data, status, error) {	
		if (data === null) {
		//vm.notify('ERROR','error');
		} else {
			var parsed = parseJSON(data);
			ajaxData.rawData = parsed;
			window.customSettings = window.GSCS = new ViewModel(ajaxData);
			ko.applyBindings(customSettings, document.body);
			if (window.hooks && window.hooks.length) {
				for (var i = 0; i < window.hooks.length; i++) {
					if (typeof window.hooks[i] === 'function')
						window.hooks[i]();
				}
			}
		}
	});
	}
}
ko.punches.enableAll();
initcustomSettings();