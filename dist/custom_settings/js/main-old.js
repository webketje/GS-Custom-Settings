NO_EDITING = $('#flag-no-editing').val();
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
	// TODO: un-hardcode this
	this.label = ko.observable(opts && opts.label ? opts.label : 'New Tab');
	this.lookup = ko.computed(function() { return makePHPSafe(self.label()); });
	this.id = opts && opts.id ? opts.id : 0;
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
	this.lookup = ko.observable(opts && opts.lookup ? opts.lookup : 'new_setting');
	this.value = ko.observable(opts && opts.value ? (/radio|select/.test(opts.type) ? parseInt(opts.value) : opts.value) :'');
	this.tab = ko.observable(opts ? opts.tab : VM.data.tabs.activeItem().lookup());
	this.type = ko.observable(opts && opts.type ? opts.type : 'text');
	this.descr = ko.observable(opts ? opts.descr : '');
	this.access = ko.observable(opts && opts.access ? opts.access : 'normal');
	// TODO: un-hardcode this
	this.label = ko.observable(opts ? opts.label : 'New Setting');
	this.parentList = opts && opts.parentList ? opts.parentList : [];
	this.options = ko.observableArray(opts.options || []);
	// misc for diff types of input 
	this.display = '';
	this.icon = '';
	// state helpers
	this.isOpen = new Switch(['plus-square','minus-square']);
	this.isHidden = ko.computed(function() { return self.access() === 'hidden';	});
	this.isLocked = ko.computed(function() { return self.access() === 'locked';	});
	this.hasValue = ko.computed(function() { return typeof self.value() !== 'undefined'; });
	this.isOptionInput = ko.computed(function() { return /select|radio/.test(self.type()); });
	this.changeInputType();
	if (opts.plugin)
		this.plugin = opts.plugin;
}
Setting.prototype.changeInputType = function(data, e) { 
		// TODO: Locked value input doesn't work when repeatedly switching
		var self = this, target = e ? (e.target ? e.target : e.srcElement) : false;
		switch (this.type()) {
			case 'text':
			case 'textarea':
				if (target && typeof target.value === ('boolean'||'number'))
					this.value('');
				break;
			case 'checkbox':
				if (target && target.value.trim().toLowerCase() == ('true'||'false')) {
					if (target.value.trim().toLowerCase() == 'true') this.value(true);
					if (target.value.trim().toLowerCase() == 'false') this.value(false);
				} else if (target && typeof target.value === ('string'||'number')) {
					this.value(false);
				}
				break;
			case 'select':
			case 'radio':
			case 'fancy radio':
				if (target && isNaN(target.value))
					this.value(0);
				this.icon = ['dot-circle-o','circle-o'];
				this.display = function(index) {
					var prefix = 'fa fa-lg fa-';
					return self.value() === index ? prefix + self.icon[0] : prefix + self.icon[1];
				};
				break;
			case 'fancy checkbox':
				this.icon = ['check-square-o','square-o'];
				this.display = ko.computed(function() {
					var prefix = 'fa fa-lg fa-';
					return self.value() ? prefix + self.icon[0] : prefix + self.icon[1];
				});
				this.toggle = function() { this.value(!this.value())};
				if (target && target.value.trim().toLowerCase() == ('true'||'false')) {
					if (target.value.trim().toLowerCase() == 'true') this.value(true);
					if (target.value.trim().toLowerCase() == 'false') this.value(false);
				} else if (target && typeof target.value === ('string'||'number')) {
					this.value(false);
				}
				break;
			case 'switch': 
				this.icon = ['toggle-on','toggle-off'];
				this.display = ko.computed(function() {
					var prefix = 'fa fa-lg fa-';
					return self.value() ? prefix + self.icon[0] : prefix + self.icon[1];
				});
				this.toggle = function() { this.value(!this.value())};
				if (target && target.value.trim().toLowerCase() == ('true'||'false')) {
					if (target.value.trim().toLowerCase() == 'true') this.value(true);
					if (target.value.trim().toLowerCase() == 'false') this.value(false);
				} else if (target && typeof target.value === ('string'||'number')) {
					this.value(false);
				}
				break;
		}
		return data;
}
function List(name, gui, model, items) {
	var self = this;
	this.items = ko.observableArray(items || []);
	this.itemModel = model || ko.observable(' ');
	this.activeItem = ko.observable('all');
	this.defaults = false;
	this.name = name;
	this.gui = {};
	for (var prop in gui) {
		this.gui[prop] = {title: gui[prop].title, icon: 'fa fa-' + gui[prop].icon, action: self[gui[prop].action] };
	};
	if (this.name === 'tabs')
		this.abTabList = ko.computed(function() {
			return self.items().sort(function(left, right) { return left.id == right.id ? 0 : (left.id < right.id ? -1 : 1)})
		}).extend({notify: 'always'});
}
List.prototype.removeSelf = function(data, e) {
	var target = e.target || e.srcElement,
			ctx = ko.contextFor(target), 
			index = ctx.$index(), list = ctx.$parents[1].items; 
	if (list().length > 1) 
		list.splice(index,1); 
};
List.prototype.insertAfter = function(data,e) { 
		var target = e.target || e.srcElement,
				ctx = ko.contextFor(target), 
				index = ctx.$index(), list = ctx.$parents[1].items, 
				opts = ctx.$parents[1].defaults;
		if (ctx.$parents[1].name === 'tabs')
			opts.id = ctx.$parents[1].count();
		var newItem = new ctx.$parents[1].itemModel(opts);
		newItem.parentList = list;
		list.splice(index+1,0, newItem);
};
List.prototype.moveUp = function(data,e) {
	var target = e.target || e.srcElement, item,
			ctx = ko.contextFor(target), 
			index = ctx.$index(), list = ctx.$parents[1].items;
	if (index > 0) {
		item = list.splice(index,1)[0];
		list.splice(index-1,0,item); }
}
List.prototype.moveDown = function(data,e) {
	var target = e.target || e.srcElement, item,
			ctx = ko.contextFor(target), 
			index = ctx.$index(), list = ctx.$parents[1].items;
	if (index < list().length) {
		item = list.splice(index,1)[0];
		list.splice(index+1,0,item); }
}
List.prototype.select = function(data,e) {	
  var target = e.target || e.srcElement,
			ctx = ko.contextFor(target);
	if (ctx.$parents[1].activeItem() === 'all' || (ctx.$parents[1].activeItem().lookup && ctx.$parents[1].activeItem().lookup() !== ctx.$parent.lookup()))
		ctx.$parents[1].activeItem(ctx.$parent);
}
var GUI = {
	tabCtrl: {
		'tab_open': { icon: 'filter',     action: 'select'},
		'tab_add':  { icon: 'plus',       action: 'insertAfter'},
		'tab_del':  { icon: 'close',      action: 'removeSelf'},
		'tab_up':   { icon: 'arrow-up',   action: 'moveUp'},
		'tab_down': { icon: 'arrow-down', action: 'moveDown'}
	},
	propCtrl: {
		// prop_open is handled with a switch outside of the GUI
		'prop_add': { icon: 'plus',       action: 'insertAfter'},
		'prop_del': { icon: 'close',      action: 'removeSelf'},
		'prop_up':  { icon: 'arrow-up',   action: 'moveUp'},
		'prop_down':{ icon: 'arrow-down', action: 'moveDown'}
	},
	accessLevels: ['normal','locked','hidden']
},
defaults = {
	setting: {type: 'text', label: 'New Setting'},
	tab: {label: 'New Tab', lookup: 'new_tab'}
};
var unmaps = {
	settings: function(list) {
		var ignore = {
			// id & phpFetch included as no longer used, but still in v.0.1
			'all': ['isHidden','isLocked','id','isOpen','hasValue','displayInManageMode','lookupOutput',
							'isOptionInput','faIcon','phpFetch','changeInputType','toggle','parentList','display','icon'],
			'text': ['options'],
			'textarea': ['options'],
			'checkbox': ['options'],
			// V. 0.2. added switch ignore options
			'switch': ['options'],
			'radio': [],
			'select': [],
			'fancy checkbox': ['options']
		};
		
		function getCleanSetting(setting, isPluginSetting) {
			var cleanSetting = {},
					ignoredItems = ignore.all.concat(ignore[setting.type()]);
			if (isPluginSetting === true) {
				ignoredItems.push('readonly');
				ignoredItems.push('plugin');
			}
			for (var prop in setting) {
				unwrappedProp = ko.utils.unwrapObservable(setting[prop]);
				if (!inArray(prop, ignoredItems)) {
					if ((setting.hasValue() && typeof unwrappedProp !== 'function')) {
						if (prop === 'options') {
							cleanSetting[prop] = ko.utils.arrayMap(unwrappedProp, function(setting) { return setting.val});
						} else 
							cleanSetting[prop] = unwrappedProp;
					}
				}
			}	
			return cleanSetting;
		}
		var settingList = list(), 
				pluginsData = {}, settingsData = [],
				pluginName;
				
		for (var i = 0; i < settingList.length; i++) {
			pluginName = settingList[i].plugin;
			if (pluginName) {
				if (!pluginsData[pluginName])
					pluginsData[pluginName] = [];
				pluginsData[pluginName].push(getCleanSetting(settingList[i], true));
			} else {
				settingsData.push(getCleanSetting(settingList[i]));
			}
		}
		console.log(pluginsData);
		return { pluginsData: pluginsData, data: settingsData };
	},
	tabs: function(list) {
		var ignore = ['faIcon','icon','parentList'];
		return ko.utils.arrayMap(list(), function(item) {
			var unwrappedProp, newObj = {};
			// TODO: implement icons for tabs (temporarily not saved)
			for (var prop in item) {
				if (!inArray(prop, ignore)) {
					unwrappedProp = ko.utils.unwrapObservable(item[prop]);
					newObj[prop] = unwrappedProp;
				}
			}
			return newObj;
		});
	}
}
var unmapping = {
	tabs: function(data) {
		
	},
	settings: function(data) {
	
	}
}
var mapping = {
	tabs: function(data) {
		
	},
	settings: function(data) {
	
	}
}
var maps = {
	'tabs': function(data) {
		var arr = data.length ? [] : false, count = 0;
		if (arr) {
			ko.utils.arrayForEach(data, function(item) {
				var itemSettings = {
					label: item.label,
					icon: item.icon || false,
					id: item.id || count++
				};
				arr.push(new Tab(itemSettings)); 
			}); 
		} else {
			arr = [new Tab('',1)];
		}
		var result = new List('tabs', GUI.tabCtrl, Tab, arr), its = result.items();
		result.defaults = defaults.tab;
		result.count = ko.computed(function() {
			var max = 0;
			ko.utils.arrayForEach(result.items(), function(item) {
				if (result.id && result.id() > max)
					max = result.id();
			});
			return max+1;
		});
		if (result.items().length) {
			for (var i = result.items().length; i--;) {
				result.items()[i].parentList = result.items;
			};
			result.activeItem(result.items()[0]);
		}
		return result;
	},
	'settings': function(data) {
		var arr = data.length ? [] : false;
		if (arr) {
			ko.utils.arrayForEach(data, function(item) {
				var itemSettings = {
					tab: item.tab,
					lookup: item.lookup,
					label: item.label,
					descr: item.descr,
					type: item.type, 
					value: item.value, 
					access: item.access,
					plugin: item.plugin || false
				};
				if (item.options) {
					itemSettings.options = ko.utils.arrayMap(item.options, function(opt, index) { return {val: opt, index: index}});
				}
				arr.push(new Setting(itemSettings));
			}); 
		} else {
			arr = [new Setting('',0)];
		}
		var result = new List('settings', GUI.propCtrl, Setting, arr);
		result.defaults = defaults.setting;
		result.types = ['text','textarea','checkbox','fancy checkbox','switch', 'radio','fancy radio','select'];
		result.accessLevels = GUI.accessLevels;
		for (var i = result.items().length; i--;) {
			result.items()[i].parentList = result.items;
		};
		return result;
	}
};
function cb(vm, data, map) {
	console.log(data);
	var meta = data.meta, 
			data = data.data;
	console.log(data);
	vm.NO_EDITING = NO_EDITING;
	vm.FEEDBACK = ko.observable(true);
	defaults.setting.label = vm.i18n['def_setting_label'];
	defaults.tab.label = vm.i18n['def_tab_label'];
	vm.data.tabs = maps.tabs(data.tabs);
	vm.notif = {
		lookup_change:  function(data) { if (vm.FEEDBACK()) vm.notify('warn_change_label','notify'); },
		type_change:    function(data) { if (vm.FEEDBACK() && data.hasValue()) vm.notify('warn_change_type','notify'); },
		tab_conflict:   function(data) { if (vm.FEEDBACK() && vm.data.tabs.conflict()) vm.notify('warn_tab_conflict','error'); },
		prop_conflict:  function(data) { if (vm.FEEDBACK() && vm.data.settings.conflict()) vm.notify('warn_prop_conflict','error'); },
		tab_remove: function(data,e) { 
			var lko = ko.contextFor(e).$parent.lookup();
			if (!vm.FEEDBACK() && vm.data.settings.items.pluck('tab').indexOf(lko) > -1) vm.notify('info_tab_remove','notify')
		}
	};
	vm.data.settings = maps.settings(data.settings); 
	// checks whether there is a naming conflict in tabs data
	vm.data.tabs.conflict = function() { 
		var flag = false, count=0, lookups = ko.utils.arrayMap(vm.data.tabs.items(), function(item) {
			if (item.lookup)
				return item.lookup;
		});
		ko.utils.arrayForEach(lookups, function(item, index) {
			count = index;
			ko.utils.arrayForEach(lookups, function(lookup, index2) { 
				if (lookup() === item() && index2 !== count) flag = true;
			});
		});
		return flag;
	} 
	// checks whether there is a naming conflict in settings data
	vm.data.settings.conflict = function() { 
		var flag = false, count=0, lookups = ko.utils.arrayMap(vm.data.settings.items(), function(item) {
			if (item.lookup)
				return item.lookup;
		});
		ko.utils.arrayForEach(lookups, function(item, index) {
			count = index;
			ko.utils.arrayForEach(lookups, function(lookup, index2) { 
				if (lookup() === item() && index2 !== count) flag = true;
			});
		});
		return flag;
	} 
	vm.settings = {};
	vm.settings.perms = ko.observableArray(meta && meta.perms ? meta.perms : []);
	//unused atm
	vm.formatData = function() {
		var meta = vm.settings ? JSON.stringify(ko.mapping.toJSON(vm.settings)) : false,
				tabs = ko.mapping.toJSON(unmaps.tabs(vm.data.tabs.items)),
				settings = ko.mapping.toJSON(unmaps.settings(vm.data.settings.items)),
				str = '{"data":\n\t{"tabs": ' + tabs + ',\n\t"settings": ' + settings + '}\n}';
		return str;
	}
	vm.saveData = function() {
		var meta = vm.settings ? JSON.stringify(ko.mapping.toJSON(vm.settings)) : false,
				tabs = ko.toJSON(unmaps.tabs(vm.data.tabs.items), null, '\t'),
				settings = ko.toJSON(unmaps.settings(vm.data.settings.items).data, null, '\t'),
				pluginsettings = ko.toJSON(unmaps.settings(vm.data.settings.items).pluginsData, null, '\t');;
		var str = '{"data":\n\t{"tabs": ' + tabs + ',\n\t"settings": ' + settings + ',\n\t"pluginSettings": ' + pluginsettings + '}\n}';
		setJSONData(paths.data, 'saveData', str, function(data, status, error) {
			if (data === null) 
				vm.notify('ERROR','error');
			else {
				vm.notify('SETTINGS_UPDATED','updated');
				/* setTimeout(function() {
					location.reload();
				}, 000);
				} */}
		});
		/* $.ajax({ url: paths.handler , type: 'POST', data: {path: paths.data,
		requestToken: paths.requestToken,  action: 'savePluginData', id: location.href.match(/id=[\w]///g)[0].slice(3)}})
	.done(function(data, status, jqXHR) { console.log(data);}); */
	};
	// TODO: Update this switch to be a pureComputed and toggle the correct state
	vm.settingView = new Switch(['prop_view_all','prop_close_all'], function(state) {
		if (state === false) {
			ko.utils.arrayForEach(vm.data.settings.items(), function(setting) {	setting.isOpen.state(false); });
		} else {
			ko.utils.arrayForEach(vm.data.settings.items(), function(setting) {	setting.isOpen.state(true); });
		}
	});
}
//ko.punches.enableAll();
var VM = new ViewModel();
VM.mode = new Switch(['edit','manage']);
initVM(VM, maps, cb);
