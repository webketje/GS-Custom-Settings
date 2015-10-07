/**
 * Edit mode Tab-list module
 * @module modules/tabs-edit
 */

define(['lib/knockout', 'models/tab', 'modules/globals'], function(ko, Tab, globals) {
	
	// define component parameters & css-class
	var tabActiveClass = 'current'
		, cName   = 'tablist-edit'
		, cTmpl   = 'sidebar-edit'
		// the buffer ensures that view performance is fast enough 
		// by temporarily storing an index reference to the selected tab before it is removed
		, buffer  = ko.observable()
		, i18n    = globals.i18n
		, notify  = globals.notifier;

	/** @constructor
	 *  @alias module/tabs-edit
	 *  @prop {array} items - A filtered + mapped array of tabs omitting tab settings and non site-type tabs
	 *  @prop {array} originalItems - The original list of tabs/settings to which changes are made immediately
	 */
	ko.extenders.enablePausing = function(target) {
		var suspend = false;
			
    target.notifySubscribers = function() {
       if (!suspend)
          ko.subscribable.fn.notifySubscribers.apply(this, arguments);
    };
    target.pauseWhile = function(fn) { suspend = true; fn(target); suspend = false; };
    return target;
	};
	ko.extenders.update = function(target, otherObservable) {
		target.subscribe(function(newIndex) {
			setTimeout(function() {
				otherObservable(target());
			}, 10);
		});
	};
	function TabList(params) {
		var self = this, 
				minLimit = this.minLimit = 0, 
				maxLimit = this.maxLimit = 100;
		this.defaults = { tab: {	
				lookup: i18n('def_tab_label').toLowerCase().replace(/\s+/g, '_')
			, label: i18n('def_tab_label')
			, type: 'site'
			}
		};
		this.mode = params.state.mode;
		this.originalItems = params.tabs;
		this.sourceSelection = params.state.tabSelection;
		this.sourceSelection.extend({enablePausing: true});
		this.selection = ko.observable(this.sourceSelection()).extend({update: params.state.tabSelection });
		this.activeProp = ko.observable('label');
		this.items = ko.pureComputed(function() {
			var result, siteTabs = ko.utils.arrayFilter(params.tabs(), function(item, i) {	
				return i !== buffer() && item.tab.data.type === 'site';
			});
			result = ko.utils.arrayMap(siteTabs, function(item) {			
				return item.tab
			});
			return result;
		}).extend({enablePausing: true});
		
		// The disable object contains computed properties which determine
		// whether a sidebar toolbar button should be disabled
    this.disable = {
      del:  ko.pureComputed(function() { return !self.items().length; }),
      add:  ko.pureComputed(function() { return !self.maxLimit === self.items().length; }),
      up:   ko.pureComputed(function() { var selection = self.selection(); return !self.items().length || selection < 1 || selection === false; }),
      down: ko.pureComputed(function() { var items = self.items(); return !items.length || self.selection() === items.length-1; })
    };
	}
	
	/** @method Tablist.select 
	 *  @descr Selects a tab in the sidebar
	 */
	TabList.prototype.select = function(data, e) {
		var target = e.target || e.srcElement;
	  // if the user doesn't click on the tab name, focus it anyway
	  // do this before updating the selection so that the tab view is updated already
	  if (target.nodeName !== 'INPUT')
	    target.parentNode.getElementsByTagName('input')[0].focus();

	  this.selection(ko.contextFor(target).$index());
	  // required to make sure the URL hash is updated
	  // because Knockout by default prevents default on click bindings
	  return true;
	}
	
	/* ------  tab action methods (in order)  ------ */
	
	/** @method Tablist.inserBefore
	 *  @descr Inserts a new tab before the selected tab.
	 */
	TabList.prototype.insertBefore = function() {
		var selection = this.selection();
	  this.originalItems.splice(this.selection(),0, {tab: new Tab(this.defaults), settings: ko.observableArray()});
		if (this.selection() === -1) 
			this.selection(0);
	}
	
	/** @method Tablist.remove
	 *  @descr Removes the selected tab.
	 *  @invokes Tablist.removeInner
	 */
	TabList.prototype.remove = function(data, e) { 
		var selection = this.selection()
			,	originalItems = this.originalItems()
			, root = ko.contextFor(e.target).$root
			, self = this;
		
		// we can only remove a tab if the selection is populated
	  if (selection > -1) {
	    // we only need to warn the user if the tab contains any settings
	    if (originalItems[selection].settings().length)
				notify(i18n('warn_tab_remove'), 'notify', function() { self.removeInner.call(self) });
			else
				this.removeInner();
	  }	  
	}
	/** @method Tablist.remove
	 *  @descr Removes the selected tab.
	 *  @invokes Tablist.removeInner
	 */
	TabList.prototype.removeInner = function() {
		var selection = this.selection()
			,	originalItems = this.originalItems;
	    // because the tab list has a dependency on the buffer, it will update the list already
	    buffer(selection);
	    // If the selection is > 0, there is at least 1 tab before it,
	    // set the selection to the previous tab. If there are only next tabs,
	    // removing the tab will cause the selection to automatically adjust because of the splice.
	    if (selection > 0)
	      this.selection(selection-1);
	    // To avoid lag in the UI, we pause notifications while the original array gets modified
	    this.items.pauseWhile(function() {
	      originalItems.splice(selection,1);
	      buffer(-1);
	    });
	    
	    // if this was the last item, remove the selection altogether
	    if (this.items().length === 0)
	      this.selection(-1);
	}
	
	/** @method Tablist.moveUp
	 *  @descr Moves the selected tab up by one
	 */
	TabList.prototype.moveUp = function() {
	  var selection = this.selection()
	    , temp = this.originalItems();
	    
	  if (!this.disable.up()) { 
	    temp.splice(selection, 0, temp.splice(selection-1, 1)[0]);
	    this.originalItems(temp);
		  this.selection(selection - 1);
	  }
	}
	
	/** @method Tablist.moveDown
	 *  @descr Moves the selected tab down by one
	 */
	TabList.prototype.moveDown = function() {
	  var selection = this.selection()
	    , tempArray = this.originalItems();
	  if (!this.disable.down()) {
	    this.selection(selection+1);
	    tempArray.splice(selection, 0, tempArray.splice(selection+1,1)[0])
	    this.originalItems(tempArray);
	  }
	}
	
	/** @method Tablist.toggleProp
	 *  @descr Toggles whether tab lookups vs. labels are visible in the sidebar
	 */
	TabList.prototype.toggleProp = function(target) {
		this.activeProp(this.activeProp() === 'label' ? 'lookup' : 'label');
	};
	
	/* ------  tab helper methods  ------ */
	
	/** @method Tablist.tabClass
	 *  @descr Helper function for tab item class
	 */
	TabList.prototype.tabClass = function(tabIndex) {
		return tabIndex() === this.selection() ? tabActiveClass : '';
	};
	
	/** @method Tablist.tabHash
	 *  @descr Helper function for tab item anchor
	 */
	TabList.prototype.tabHash = function(tab) {
		return '#' + tab.data.lookup();
	};
	
	/* ------  component disposal  ------ */
	
	/** @method Tablist.dispose
	 *  @descr Changes the selection if there is no active tab.
	 *  Invoked automatically on component disposal by KnockoutJS
	 */
	TabList.prototype.dispose = function() {		
		if (!this.items().length && this.originalItems().length)
			this.selection(0);
	};
	
	/* ------  component registration ------ */
	
	ko.components.register(cName, {
		viewModel: TabList,
		template: {require: 'text!templates/' + cTmpl + '.html' }
	});
});