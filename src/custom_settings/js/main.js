/** TODO:
 *  - OK: (only tab name of plugins/ site + messages) Unhardcode I18n
 *  - If value of options input is null, output should be saved as option 0
 *  - Provide window popup fallback for settings export
 *  - Test whether tabs can be translatable 
 *  - Finalize notifier
 *  - Set no-select class only in edit mode
 */
/**
 *  TESTED:
 *  Export: (IE8+?)
 *    - All site settings: working
 *    - Site tab for use as plugin/ theme: working
 *    - Theme settings: working
 *    - Plugin settings: working
 *  Import: (IE10+)
 *    - All site settings: broken
 *    - Site tab: working (may be fragile, manual trigger of ko.valueHasMutated() )
 *    - Theme settings: working, but does not use ko.valueHasMutated() [must be updated if possible to edit]
 *    - Plugin settings: working, but does not use ko.valueHasMutated() [must be updated if possible to edit]
 */
function ViewModel(data) {
	var self = this, 
			initialData = '';
	this.notify = new Notifier();
	this.i18n = data.i18n;
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
			obj.tab.label = obj.tab && obj.tab.theme ? self.i18n['label_themesettings'] : obj.tab.label;
			dataArray.push(obj);
		}
		}
		initialData = dataArray;
		var result = new singleSelectList({
			data: dataArray,
			model: Tab,
			filter: function(item) { return !item.isTheme && !item.isPlugin; },
			defaults: {tab: {label: self.i18n['def_tab_label']}},
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
					{value: 'section-title',  label: 'Section Title'}
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
	/* 	var temp = self.fn.unmapTabs(self.data.items());
		temp = ko.utils.arrayMap(temp, function(item) {
			return {tab: {lookup: item.lookup,  label: item.label}, settings: item.settings};
		}); 
		initialData = temp;
		console.log(initialData);*/
		setJSONData(paths.data, 'saveData', data, function(data, status, error) {
			if (data === null) 
				notify('actions','saveError');
			else
				notify('actions','saveSucceeded');
		});
	};
	// used in oneWaySelect binding for tab switching a setting
	this.fn.moveSettingsToOtherTab = function(value, data, e) {
		var allTabs = self.data.items(),
				activeTabData = allTabs[self.data.activeItem()].settings,
				activeTabItems = activeTabData.items,
				activeTabActiveItems = activeTabData.activeItems(),
				newTab = ko.utils.arrayFirst(allTabs, function(tab) { 
					return tab.lookup() === value; 
				});
		if (activeTabActiveItems.length) {
			var len = newTab.settings.items().length;
			for (var i = activeTabActiveItems.length; i--;) {
				var move = activeTabItems.splice(i, 1)[0];
				move.selected(false);
				newTab.settings.items.splice(len, 0, move);
			};
		}
};
	// Nested unmapping functions in execution order
	this.fn.unmapSettings = function(settings) {
		var ignore = {
			// id & phpFetch included as no longer used, but still in v.0.1
			'all': ['isHidden','isLocked','isOpen','hasValue','displayInManageMode','lookupOutput', 'names', 'cachedType',
							'isOptionInput','faIcon','changeInputType','toggle','parentList','display','icon', 'selected', 'descrHTML'],
			'text': ['options'],
			'textarea': ['options'],
			'checkbox': ['options'],
			// V. 0.2. added switch ignore options
			'switch': ['options'],
			'radio': [],
			'select': [],
			'image': ['options'],
			'section-title': ['options','value','access','descr'],
			'fancy-checkbox': ['options']
		};
		
		function getCleanSetting(setting, isPluginSetting) {
			var cleanSetting = {},
					ignoredItems = ignore.all.concat(ignore[setting.type()]);
					
			for (var prop in setting) {
				unwrappedProp = ko.utils.unwrapObservable(setting[prop]);
				if (!inArray(prop, ignoredItems)) {
					if ((setting.hasValue() && typeof unwrappedProp !== 'function') || setting.type() === 'section-title') {
						if (prop === 'options' && unwrappedProp.length) {
							cleanSetting[prop] = ko.utils.arrayMap(unwrappedProp, function(setting) { return setting && setting.val ? setting.val : false});
						} else
							cleanSetting[prop] = unwrappedProp;
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
		var ignore = ['settings'], //settings have their own unmapping function, added afterwards
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
				result = {site: {}};
				
		ko.utils.arrayForEach(tabs, function(tab) {
			if (tab.isPlugin === true) {
				if (!result.plugins) result.plugins = {};
				result.plugins[tab.lookup] = {};
				result.plugins[tab.lookup].tab = {lookup: tab.lookup,	label: tab.label};
				result.plugins[tab.lookup].settings = tab.settings;
			} else if (tab.isTheme === true) {
				if (!result.theme) result.theme = {};
				result.theme.settings = tab.settings;
			} else {
				result.site[tab.lookup] = {};
				result.site[tab.lookup].tab = {lookup: tab.lookup,	label: tab.label};
				result.site[tab.lookup].settings = tab.settings;
			}				
		});
		return result;
	};
	// Export settings for backup and cross-site reuse
	// Essentially for webmasters
	this.fn.exportData = function(value) {
		if (value !== 'none') {
		var tabs = self.data.items(),
				selTab = ko.utils.arrayFirst(tabs, function(tab) {
					return tab.lookup() === value;
				}) || 'site_settings', 
				tabType = selTab.isTheme ? 'theme' : (selTab.isPlugin ? 'plugin' : (selTab === 'site_settings' ? 'site' : 'tab')),
				lookup = value !== 'site_settings' ? selTab.lookup() : null;
				fileName = tabType + 'data' + (value !== 'site_settings' ? '_' + selTab.lookup() : '') + '.json',
				data = value !== 'site_settings' ? self.fn.unmapData([selTab]) : self.fn.unmapData();
				
		switch (tabType) {
			case 'site':
				fileName = 'data.json';
				var temp = {site: []};
				for (var tabLookup in data) {
					for (var tab in data[tabLookup]) {
						temp.site.push(data[tabLookup][tab]);
					}
				}
				data = temp;
			break;
			case 'theme':
				fileName = 'theme_data_' + document.getElementById('site-template').value + '.json';
				data = {theme: document.getElementById('site-template').value, settings: data['theme']['settings']};
			break;
			case 'plugin':
				fileName = 'plugin_data_' + lookup + '.json';
				data = data['plugins'][lookup];
			break;
			case 'tab': 
				fileName = lookup + '_data.json';
				data = data['site'][lookup];
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
				if (allTabs[l].isTheme || allTabs[l].isPlugin) break;
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
							if (pluginTab && pluginTab.isPlugin)
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
		ko.utils.registerEventHandler(document.body, 'keyup', function(e, elem) {
			if (e.ctrlKey && e.keyCode === 67 && document.activeElement.className.match('ko-code')) {
			  if (document.activeElement.selectionStart == 0 && document.activeElement.selectionEnd == document.activeElement.value.length) {
			    notify('actions','clipBoardCopy');
			  }
			}
			return true;
		});
		/*ko.utils.registerEventHandler(window, 'beforeunload', function(e, elem) {
			var currentData = self.fn.unmapTabs(self.data.items()), msg;
			console.log(initialData);
			if (initialData.length !== currentData.length) {
			console.log(ko.utils.arrayMap(initialData, function(item) { return item.lookup}));
			console.log(ko.utils.arrayMap(currentData, function(item) { return item.lookup}));
				return self.i18n['warn_unsaved'];
			}
			for (var i = 0; i < currentData.length; i++) {
				if (currentData[i].lookup !== initialData[i].tab.lookup) {
					return self.i18n['warn_unsaved'];
				}
				if (currentData[i].settings.length !== initialData[i].settings.length) {
			console.log('settinglength differs');
					return self.i18n['warn_unsaved'];
				}
				for (var j = 0; currentData[i].settings.length; j++) {
					for (var prop in currentData[i].settings[j]) {
						if (typeof currentData[i].settings[j][prop] !== 'function') {
						if (!initialData[i].settings[j][prop] || currentData[i].settings[j][prop] !== initialData[i].settings[j][prop]) {
			console.log('settingprop differs: ' + currentData[i].settings[j][prop] + ' - vs. initial: ' + initialData[i].settings[j][prop]);
							return self.i18n['warn_unsaved'];
						}
						}
					}
				}
			}
		});*/
	};
	this.delegatedEvents();
	this.search = ko.observable('');
	this.searchActive = ko.computed(function() { return self.search().length > 3;	});
	this.searchFilter = ko.computed(function() { 
		if (self.data.items().length && self.data.items()[self.data.activeItem()].settings.items().length) {
		var currentTab = self.data.items()[self.data.activeItem()].settings.items(),
				search = new RegExp(self.search());
		return ko.utils.arrayFilter(currentTab, function(item) {
			return search.test(item.lookup()) || search.test(item.label());
		});
		} else {
			return [];
		}
	}).extend({rateLimit: 100});
	this.imageBrowser = new ImageBrowser(this);
}
/**
 *  APP Data Structure: Tabs > Settings > Inputs
 */
/** MODEL: Tab (constructor)
 *  @param {object} opts
 *  @param {string} opts|label - A label for the tab
 *  @param {string} [opts|icon] - (Optional) An icon for the tab
 */
function Tab(opts) {
	var self = this;
	this.label = ko.observable(opts.tab.label);
	this.lookup = opts.tab.lookup === 'theme_settings' ? ko.observable('theme_settings') : ko.computed(function() { return makePHPSafe(self.label()); });
	this.isPlugin = opts && opts.tab.plugin ? true : false;
	this.isTheme = opts && opts.tab.theme ? true : false;
	this.settings = new List({ data: opts && opts.settings || [], model: Setting, keys: true});
	// TODO: find a better way to set default label & lookup
	var setDefs = setInterval(function() {
		if (window.VM && window.VM.i18n) {
		  self.settings.defaults = {
		    label: window.VM ? window.VM.i18n['def_setting_label'] : '',
		    lookup: window.VM ? window.VM.i18n['def_setting_lookup']: '',
		    value: '' }
		  clearInterval(setDefs);
		 }
  }, 100);
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
function Setting(opts) {
	var self = this;
	this.lookup = ko.observable(opts && opts.lookup ? opts.lookup : '');
	this.value = ko.observable(opts && opts.value !== 'undefined' ? (/radio|select/.test(opts.type) ? parseInt(opts.value) : opts.value) :'');
	this.type = ko.observable(opts && opts.type ? opts.type : 'text');
	this.descr = ko.observable(opts && opts.descr ? opts.descr : '');
	this.descrHTML = ko.computed(function() {
		var newVal = self.descr().split(' ') || '',
				str = '';
		if (newVal.length) {
			for (var i = 0; i < newVal.length; i++) 
				str += /https*:\/\//.test(newVal[i]) ? '<a href="' + newVal[i] + '" target="_blank">' + newVal[i] + '</a> ' : newVal[i] + ' ';
		}
		return str;
	});
	this.access = ko.observable(opts && opts.access ? opts.access : 'normal');
	this.names = {
		label: ko.computed(function() { return self.lookup() + '-label'}),
		lookup: ko.computed(function() { return self.lookup() + '-lookup'}),
		access: ko.computed(function() { return self.lookup() + '-access'}),
		type: ko.computed(function() { return self.lookup() + '-type'}),
		tab: ko.computed(function() { return self.lookup() + '-tab'}),
		descr: ko.computed(function() { return self.lookup() + '-descr'}),
		options: ko.computed(function() { return self.lookup() + '-options'}),
		value: ko.computed(function() { return self.lookup() + '-value'})
	}
	// TODO: un-hardcode this
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
	this.isOpen = new Switch(['plus-square','minus-square']);
	this.isHidden = ko.computed(function() { return self.access() === 'hidden';	});
	this.isLocked = ko.computed(function() { return self.access() === 'locked';	});
	this.hasValue = ko.computed(function() { return typeof self.value() !== 'undefined'; });
	this.isOptionInput = ko.computed(function() { return /select|radio/.test(self.type()); });
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
		// TODO: Locked value input doesn't work when repeatedly switching
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
		console.log(loaded);
		console.log(data);
		if (!self.loaded) {
			getJSONData(null, 'loadImageBrowser', function(data, status, error) {
				if (data !== null) {
					var temp = $.parseJSON(data);
					self.uploads(temp.sort(function(left, right) { return left.folder && right.folder ? 0 : (left.folder ? -1 : 1) }));
					self.origin = context.data.items()[context.data.activeItem()].settings.items()[ko.contextFor(e.target || e.srcElement).$index()];
					loaded = true;
				}
			});
		}
			self.origin = context.data.items()[context.data.activeItem()].settings.items()[ko.contextFor(e.target || e.srcElement).$index()];
		self.selected('');
		self.active(true);
	}
	this['select'] = function(data, e) { self.selected(data.path); };
	this['export'] = function() { self.origin.value(self.selected()); self.active(false); };
}
function initVM() {
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
		getData();
	}
	function getData() {
	getJSONData(paths.data, 'getDataFile', function(data, status, error) {	
		if (data === null) {
		//vm.notify('ERROR','error');
		} else {
			var parsed = parseJSON(data);
			ajaxData.rawData = parsed;
			window.VM = new ViewModel(ajaxData);
			ko.applyBindings(VM, document.body);
		}
	});
	}
}
initVM();