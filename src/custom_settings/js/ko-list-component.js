var List = (function() {
	function List(params) {
	  var self = this;
	  this.options = {
	    maxLimit: params.maxLimit > -1 ? params.maxLimit : 64,
	    minLimit: params.minLimit > -1 ? params.minLimit : 1,
	    maxSelect: params.maxSelect || false,
	    keysActive: params.keys || false
	  };
	  this.defaults = params.defaults || false;
	  this.itemModel = function(props) { 
	    params.model.call(this, props || self.defaults);
	    this.selected = ko.observable(false);
	  }
	  this.itemModel.prototype = Object.create ? Object.create(params.model.prototype) : params.model.prototype;
	  this.itemModel.constructor = this.itemModel;
	  this.items = ko.observableArray([]);
	  if (params.data) {
	    ko.utils.arrayForEach(params.data, function(item) {
	      self.items.push(new self.itemModel(item));
	    });
	  }
	  if (params.custom) {
	    for (var customProp in params.custom)
	      this[customProp] = params.custom[customProp];
	  }
	  this.activeItems = ko.computed(function() {
	    var result = [];
	    ko.utils.arrayForEach(self.items(), function(item, index) {
	      if (item.selected && item.selected()) result.push(index);
	    });
		  return result.sort();
	  });
	  if (params.defaultActive > -1) {
			this.items()[params.defaultActive].selected(true);
		}
	  this.itemModel.prototype.toggleSelect = function(data, e) { 
	    var items = self.items(), 
	      activeItems = self.activeItems(),
	      cacheValue = this.selected(), max, min;
	    
	    if (!self.options.maxSelect) {
	    if (self.activeItems().length > 1 && !e.shiftKey) {
	      if (e.ctrlKey) {
	        this.selected(!this.selected()); 
	      } else {
	        ko.utils.arrayForEach(activeItems, function(item, i) { items[activeItems[i]].selected(false); });
	          this.selected(true); 
	      }
	    } else {
	      if (e.shiftKey && self.activeItems().length === 1) {
	        self.items()[ko.contextFor(e.target || e.srcElement).$index()].selected(true);
	        activeItems = self.activeItems();
	        max = activeItems[0] > activeItems[1] ? activeItems[0] : activeItems[1];
	        min = max === activeItems[0] ? activeItems[1] : activeItems[0];
	        ko.utils.arrayForEach(items, function(index, i) { if (i > min && i < max) {self.items()[i].selected(true);}});
	      } else {
	        this.selected(!this.selected());
	        if (!e.ctrlKey) {
	          for (var i = self.activeItems().length; i--;) {
	            if (self.items()[self.activeItems()[i]].lookup() !== this.lookup())
	            self.items()[self.activeItems()[i]].selected(false);
	          }
	        }
	      } 
	    }
	    } else {
	      self.items()[ko.contextFor(e.target || e.srcElement).$index()].selected(true);
	      self.items()[activeItems[0]].selected(false);
	    }
	    return true;
	  }
	    this.search = ko.observable('');
	    this.filter = { 'itemProp': ko.observable(''), 'is': ko.observable('') } ;
	    this.filteredView = ko.computed(function() {
	      var regex = new RegExp(self.filter.is()),
	        result = ko.utils.arrayFilter(self.items(), function(item) {
	        if (self.filter.itemProp().length && regex.test(item[self.filter.itemProp()]) ) {
	          return item;                
	        } else if (!self.filter.is().length) 
	          return item;
	      });
	      return result;
	    });
	    this.filterActive = ko.computed(function() { return self.filteredView().length !== self.items().length; });
	    this.ifNoFilter = function(fn) { return !self.filterActive() ? true : false; }
	    // TODO: buttons should be disabled when view is filtered
	    this.disable_del = ko.computed(function() { return !self.activeItems().length || self.options.minLimit >= self.items().length; });
	    this.disable_add = ko.computed(function() { return !self.ifNoFilter() && self.options.maxLimit === self.items().length; });
	    this.disable_up = ko.computed(function() { return self.activeItems()[0] > 0 ? false : true; });
	    this.disable_down = ko.computed(function() { return self.activeItems()[0] < self.items().length-1 ? false : true; });
	    this.disable_toggle = ko.computed(function() { return self.items().length < 1; });
	    this.allAreSelected = ko.computed(function() { return self.activeItems().length === self.items().length; });
	    
	}
	List.prototype.remove = function() { 
	  var activeItems = this.activeItems(), 
	      items = this.items;
	  
	  if (activeItems.length) {
	    this.items()[0].selected(true);
	    for ( var i = activeItems.length; i--;)  {
	      if (this.items()[activeItems[i]].selected() && activeItems[i] !== 0) 
	        this.items()[activeItems[i]].selected(false); 
	      this.items.splice(activeItems[i],1);
	    }
	  }
	}
	List.prototype.toggleAll = function() {
		var items = this.items();
		if (this.allAreSelected()) {
			ko.utils.arrayForEach(items, function(item) {
				if (item.selected()) 
					item.selected(false);
			});
		} else {
			ko.utils.arrayForEach(items, function(item) {
				if (!item.selected()) 
					item.selected(true);
			});
		}
	}
	List.prototype.insertBefore = function() {
	  var insertAt, activeItems = this.activeItems();
	    
		for (var i = activeItems.length || 1; i--; ) {
		  insertAt = activeItems[i] + 1 || 0;
	    this.items.splice(insertAt, 0, new this.itemModel(this.defaults || null));
	  }
	}
	List.prototype.clone = function() {
		var newItem, startAt,
	    activeItems = this.activeItems(),
	    selIsInterrupted = false;
			  
	  for (var i = activeItems.length; i--; ) {
		  newItem = ko.toJS(this.items()[activeItems[i]]);
		  console.log(newItem);
	   this.items.splice(activeItems[i] + 1, 0, new this.itemModel(newItem));
		}
	}
	List.prototype.moveUp = function() {
	  var moved, startAt,
	    activeItems = this.activeItems(),
	    minIndex = 0, i = 0,
	    minActiveIndex = Math.min.apply(null, activeItems),
	    selIsInterrupted = false;
	  
	  function moveUpperItem(self) {
			moved = self.items.splice(startAt, 1)[0];
			self.items.splice(insertAt, 0, moved);
	  }
	  
	  while (activeItems[i++]) {
	    if (activeItems[i]+1 !== activeItems[i+1])
	      selIsInterrupted = true;
	  }
	  
	  // only do if the selected item with the lowest index is > 0.
	  if (minActiveIndex !== minIndex) {
	    if (!selIsInterrupted) {
				startAt = minActiveIndex - 1;
	      insertAt = Math.max.apply(null, activeItems);
	      moveUpperItem(this);
			} else {
				for (var i = 0; i < activeItems.length; i++ ) {
					startAt = activeItems[i] - 1;
					insertAt = activeItems[i];
					moveUpperItem(this);
				}
			}
	  }
	}
	List.prototype.moveDown = function() {
	  var moved, startAt, i = 0,
	    activeItems = this.activeItems(),
	    maxIndex = this.items().length - 1,
	    maxActiveIndex = Math.max.apply(null, activeItems),
	    selIsInterrupted = false, groups = [];
	    
		function moveLowerItem(self) {
			moved = self.items.splice(startAt, 1)[0];
			self.items.splice(insertAt, 0, moved);
		}
		
	  while (activeItems[i] > -1) {
	    if (activeItems[i]+1 !== activeItems[i+1])
	      selIsInterrupted = true;
	    i++;
	  }
	  
	  // only do if the selected item with the highest index is < last index in list.
	  if (maxActiveIndex !== maxIndex) {
	    if (!selIsInterrupted) {
				startAt = maxActiveIndex + 1;
	      insertAt = Math.min.apply(null, activeItems);
	      moveLowerItem(this);
			} else {
				for (var i = activeItems.length; i--; ) { // important to have a 'negative' for loop, else the position might be shifted
					startAt = activeItems[i] + 1;
					insertAt = activeItems[i];
					moveLowerItem(this);
				}
			}
	  }
	}
	List.prototype.keyHandler = function(data, e) {
		var key = e.keyCode, activeItems = this.activeItems();
		if (this.options.keysActive && e.ctrlKey) {
			switch (key) {
				case 46: // delete
					this.remove();
					break;
				case 38: // UP arrow
						this.moveUp();
					break;
				case 40: // DOWN arrow
						this.moveDown();
					break;
				case 13: // Enter
						this.insertBefore();
					break;
			}
		}
	}
	return List;
}());
var singleSelectList = (function() {
function singleSelectList(params) {
    var self = this;
    this.items = ko.observableArray([]);
    this.message = ko.observable('');
    this.defaults = params.defaults;
    this.activeItem = ko.observable(params && params.defaultActive ? params.defaultActive : false);
    this.itemModel = function(props) { 
	    params.model.call(this, props);
	    this.selected = ko.observable(false);
	  }
	  if (params.data) {
	    ko.utils.arrayForEach(params.data, function(item) {
	      self.items.push(new self.itemModel(item));
	    });
	  }
	  if (params.custom) {
	    for (var customProp in params.custom)
	      this[customProp] = params.custom[customProp];
	  }
	  this.filterActive = ko.observable(false);
	  this.filterToggle = function() { 
	    self.filterActive(!self.filterActive());
	    if (self.filterActive() === true) {
	      if (self.filter().length === 0)
	        self.activeItem(false);
	      else if (self.activeItem() > self.filter().length-1)
	        self.activeItem(self.filter().length-1);
	    } else if (self.filterActive() === false && self.activeItem() === false)
	      self.activeItem(0);
	    
	  };
	  this.filter = ko.computed(function() {
	    return ko.utils.arrayFilter(self.items(), params.filter);
	  });
	  this.minLimit = params && params.minLimit ? params.minLimit : 0;
    this.disable_del = ko.computed(function() { return !self.filter().length });
    this.disable_add = ko.computed(function() { return !self.maxLimit === self.filter().length; });
    this.disable_up = ko.computed(function() { return !self.filter().length || self.activeItem() < 1 || self.activeItem() === false; });
    this.disable_down = ko.computed(function() { return !self.filter().length || self.activeItem() === self.filter().length-1 });
}
singleSelectList.prototype.remove = function() { 
	var activeItem = this.activeItem();
  if (activeItem > -1 && this.items().length > this.minLimit) {
    if (this.items()[activeItem-1]) 
      this.activeItem(this.activeItem()-1);
    this.items.splice(activeItem,1);
  }
  if (this.filter().length === 0 && this.filterActive() === true)
    this.activeItem(false);
};
singleSelectList.prototype.insertBefore = function() {
  this.items.splice(this.activeItem(),0,new this.itemModel(this.defaults));
	if (this.activeItem() === false) 
		this.activeItem(0);
};
singleSelectList.prototype.moveUp = function() {
    var moved, activeItem = this.activeItem();
    if (!this.disable_up()) { 
	    this.activeItem(activeItem-1);
      this.items.splice(activeItem,0,this.items.splice(activeItem-1,1)[0]); 
    }
};
singleSelectList.prototype.moveDown = function() {
  var moved, activeItem = this.activeItem();
  if (!this.disable_down()) {
    this.items.splice(activeItem,0,this.items.splice(activeItem+1,1)[0]);
    this.activeItem(activeItem+1);
  }
};
singleSelectList.prototype.setActive = function(data, e) {
	var target = e.target || e.srcElement;
  ko.contextFor(target).$parent.data.activeItem(ko.contextFor(target).$index());
  if (target.nodeName === 'LI')
    target.getElementsByTagName('input')[0].focus();
  else if (target.nodeName === 'A' && target.parentNode.getElementsByTagName('input')[0])
    target.parentNode.getElementsByTagName('input')[0].focus();
  return true;
}
return singleSelectList;
}());