/* IE8 trim function polyfill */
if(typeof String.prototype.trim !== 'function') {
  String.prototype.trim = function() {
    return this.replace(/^\s+|\s+$/g, ''); 
  }
}
// IE8 indexOf polyfill 
// https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function(searchElement, fromIndex) {
    var k;
    if (this == null) {
      throw new TypeError('"this" is null or not defined');
    }
    var O = Object(this);
    var len = O.length >>> 0;
    if (len === 0)
      return -1;
    var n = +fromIndex || 0;
    if (Math.abs(n) === Infinity)
      n = 0;
    if (n >= len)
      return -1;
    k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
    while (k < len) {
      if (k in O && O[k] === searchElement)
        return k;
      k++;
    }
    return -1;
  };
}
/* PHP-ify utility */
function makePHPSafe(val) {
	return val ? val.replace(/[\s\W]+(?!\w)/g, '').replace(/[\s\W]+(?=\w)/g, '_').toLowerCase().trim() : '';
}
/** COMPONENT VM : Array data with computed string displayed in textarea
 *  @param {object} params
 *  @param {array} params|data - An observableArray to pass and modify
 *  @param {string|object} params|i18n - i18n lookup string or object
 *  @param {string] params|valueUpdate - when to trigger an observable update (KO built-in strings)
 *  @param {object} params|events - Events to trigger on the textarea
 *  @param {string} params attr - Custom KO attr to add in attr binding
 */
 
ko_arrayToText = {};
ko_arrayToText.name = 'array-to-text';
ko_arrayToText.template = '<textarea data-bind="value: view, i18n: i18n, attr: attr"></textarea>';

ko_arrayToText.viewModel = function (params) {
	var self = this;
  this.data = params.data;
  this.attr = params.attr || '';
  this.i18n = params.i18n || '';
  this.view = ko.computed({
    read: function() {
      var str = '', arr = ko.utils.unwrapObservable(this.data);
      ko.utils.arrayForEach(arr, function(item) {
        str += ('val' in item ? item.val : item)+ '\n';
      });
      return str;
    },
    write: function(value) {
      value = value.trim().replace(/\n\s*/g,'\n');
      var newVal = value.split('\n'), arr = [];
      ko.utils.arrayForEach(newVal, function(item, index) { 
        if (item) {
          if (item.val) 
            arr.push({val: item.val.trim(), index: index});
          else 
            arr.push({val: item.trim(), index: index});
        }
      });
      if (ko.isObservable(self.data)) 
        this.data(arr);
      else
        this.data = arr;
    }, 
    owner: this
  });
}

/** COMPONENT VM : Lookup string for quick copying to clipboard, with pre-and suffix
 *  @param {object} params
 *  @param {function} params|data - (observable) An item lookup/ combination (eg tab and setting)
 *  @param {string} params|tooltip - i18n lookup string
 *  @param {string} params|css - Classes to add to the input
 *  @param {string} params|pre/suffix - Pre and suffix to add to the displayed string
 */
 
ko_codeInputField = {};
ko_codeInputField.name = 'code-input';
ko_codeInputField.template = '<input type="text" style="width: 95%;" data-bind="i18n: {title: tooltip}, ' + 
		'value: display, attr: { \'class\': css },' + 
		'event: { mouseup: function() { $element.select();},' +
			'focus: function() { $element.select();},' +
			'keyup: function(e) { if ($element.value !== display()) $element.value = display(); return;}}">';

ko_codeInputField.viewModel = function(params) {
	this.code = params.data;
	this.tooltip = params.tooltip || '';
	this.css = (params.css || '') + ' ko-code';
	this.prefix = params.prefix || '';
	this.suffix = params.suffix || '';
	this.display = ko.computed(function() {
		return this.prefix + ko.utils.unwrapObservable(this.code) + this.suffix;
	}, this);
}
// register components
ko.components.register(ko_arrayToText.name,     { viewModel: ko_arrayToText.viewModel,    template: ko_arrayToText.template});
ko.components.register(ko_codeInputField.name,  { viewModel: ko_codeInputField.viewModel, template: ko_codeInputField.template});


// build a custom Knockout handler to bind translated strings to the UI.
// only requires init, as these will not change before the page is reloaded.
ko.bindingHandlers.i18n = {
	update: function(element, valueAccessor, allBindingsAccessor, data, context) {
		var val = ko.utils.unwrapObservable(valueAccessor()), 
				ctx = context.$root;
		if ( typeof val !== 'string') {
			for (var key in val) {
				val[key] = ctx.i18n[val[key]];
			}		
			ko.bindingHandlers.attr.update(element, function() { return val;});
		} else {
			if (/INPUT|TEXTAREA/i.test(element.nodeName))
				ko.bindingHandlers.attr.update(element, function() { return {value: ctx.i18n[val]};});
			else {
				var intv = setInterval(function() {
					if (ctx.i18n[val]) {
					ko.bindingHandlers.text.update(element, function() { 
						 return ctx.i18n[val];});
					clearInterval(intv);  }
				}, 50);
			}
		}
	}
}
// One-way select custom binding. On select, returns to the predefined value and executes parameter action
ko.bindingHandlers.onewaySelect = {
	init: function(element, valueAccessor, allBindings, ctx) {
		var bindingOptions = valueAccessor(),
				currentVal = ko.utils.unwrapObservable(bindingOptions.value),
				action = bindingOptions.action, 
		    fn = element.addEventListener ? 'addEventListener' : 'attachEvent';
		element[fn]('change', function(e) {
			var setVal = element.value;
			element.value = currentVal;
			if (action && typeof action === 'function')
				action(setVal, ctx, e);
		}, false);
		
		element.value = currentVal;
	},
	update: function(element, valueAccessor, allBindings, ctx) {
		var bindingOptions = valueAccessor(),
			val = ko.utils.unwrapObservable(bindingOptions.optionsValue),
			text = ko.utils.unwrapObservable(bindingOptions.optionsText),
			options = ko.utils.unwrapObservable(bindingOptions.options), 
			currentVal = ko.utils.unwrapObservable(bindingOptions.value);
			
		function inOptions(node) {
		  return ko.utils.arrayFirst(options, function(option) {
		    if (node)
	        return ko.unwrap(option[val]) === node.value;
	    }) || false; 
		}		
		function inNodes(option) {
			return ko.utils.arrayFirst(element.childNodes, function(node) {
				return node.value === ko.unwrap(option[val]);
			}) || false;
		}
		
	  for (var i = 0; i < element.childNodes.length; i++) {
	    if (!inOptions(element.childNodes[i]))
        element.removeChild(element.childNodes[i]);
		};
		ko.utils.arrayForEach(options, function(item) {
			var option;
			if (!inNodes(item)) {
				option = document.createElement('option');
				option.appendChild(document.createTextNode(ko.unwrap(item[text])));
				option.value = ko.unwrap(item[val]);
				element.appendChild(option);
			}
		});
		element.value = currentVal;
	}
};
/** Find the numeric highest value in an array or by array item property
 *  @param {array} arr - The array to search in
 *  @param {object key} prop - The property to treat as value
 */
function arrayMax(arr, prop) {
	var max = 0, arr = arr;
	if (prop)
		arr = ko.utils.arrayMap(arr, function(item) {	return item[prop]; });
	// TODO: Test whether Math.max.apply(null, arr) would work better
	ko.utils.arrayForEach(arr, function(item) {	if (parseInt(item) > max) max = parseInt(item);	});
	return max;
}
/** Find whether a string value is a direct element of an array
 *  @param {string} val - The value to look up
 *  @param {array} arr - The array to search in
 */
function inArray(val, arr) {
	for (var i = 0; i < arr.length; i++) {
		if (arr[i] && arr[i] === val) 
			return true;
	}
	return false;
}
/** Knockout Dual switch VM
 *  @param {array} [switchArr=[false, true]] - An array with exactly two items. Equates first item to false, second to true.
 *  @param {boolean} [def=false] - The initial state, defaults to false (first item).
 *  @param {string} [dep] - A dependency to pass in and append to the value of display
 */
function Switch(switchArr, callback, deps, name, def) {
	var self = this, idCount = 1;
	this.state = ko.observable(def || false);
 	this.opts = switchArr || [false, true];
  this.label = self.opts[1];
  if (callback && typeof callback === 'function') {
    this.callback = callback;
  }
  this.name = name || 'switch-' + idCount;
	this.toggle = function() { self.state(!self.state()); if (self.callback) self.callback(self.state()); };
	this.display = ko.computed(function() { return self.state() ? self.opts[1] : self.opts[0]; });
	this.template = ko.computed(function() { return (self.state() ? self.opts[0] : self.opts[1])  + '-tmpl'; });
  this.deps = deps || null;
    if (deps && deps.length) {
      this.pull = {};
      for (var i = 0; i < deps.length; i++) {
        this.pull[deps[i]] = deps[i];
      }
      ko.utils.arrayForEach(this.deps, function(i) {
        self.pull[i] = ko.computed(function() {
          var b = i;
          return self.name + '-' +  self.display() + '-' + b;
        });
      });
    }
    idCount++;
}
/** Knockout GS Notification service; returns private update function, binds automatically to parent context
 *  @param {string} str - The i18n lookup to get the language string from
 *  @param {string} type - The type of message to display (updated, notify, error)
 *  @param {object} vm - If the viewmodel is not immediate parent, can be bound with this parameter
 */
function Notifier() {
	var sel,
	    fadeTime = 400,
	    displayTime = 8, 
	    appendTo = '.bodycontent', 
	    icons = { 
	      updated: 'check', 
	      notify: 'info',
	      error: 'close'
	    };
	    
	function update(str, type, prompt, duration) {
		var dispTime = prompt ? displayTime * 4 : displayTime, t;
		if (duration) {
			dispTime = (duration === 'short' ? 2 : (duration === 'long' ? 32 : 10));
		}
		if (t) {
			clearTimeout(t);
		}
		clean();
		sel.append('<i class="fa fa-' + icons[type] + '" style="margin-right: 10px;"></i>');
		if (typeof str === 'string') {
	    sel.append(this.i18n[str] ? this.i18n[str] : str);
	  } else {
	    for (var i = 0; i < str.length; i++) {
	      sel.append(this.i18n[str[i]]);
	    }
	  }
	  sel.append(' <a href="#ok">' + this.i18n['OK'] + '</a>');
	  sel.find('a').on('click', function() { sel.fadeOut(fadeTime); clean(); });
	  if (prompt) {
	    sel.append('  <a href="#cancel">' + this.i18n['CANCEL'] + '</a>');
	    $(sel).children('a').eq(0).on('click', function() { if (prompt.ok) prompt.ok(); sel.fadeOut(fadeTime); });
	    $(sel).children('a').eq(1).on('click', function() { if (prompt.cancel) prompt.cancel(); sel.fadeOut(fadeTime); });
	  }
		sel.addClass(type);
		sel.fadeIn(fadeTime);
		if (!prompt) {
			t = setTimeout(function() {
				sel.fadeOut(fadeTime);
			}, dispTime*1000);
		}
	}
	function clean() {
		sel.removeClass();
		sel.html('');
	}
	function init() {
		if ($(appendTo).length)
			$(appendTo).before('<div id="notification-manager"></div>');
		sel = $('#notification-manager');
		sel.hide();
	}
	
	init();
	return update;
}
/** AJAX data getting
 *  @param {string} from - URL to request data from
 *  @param {string} action - Name of the PHP function to call from plugins/KO_base/common_functions.php
 *  @param {function} callback - A function to execute after the data has been sent/ loaded
 */
function getJSONData(from, action, callback) {
	var url = from;
	$.ajax({ url: paths.handler, type: 'GET', data: {
		action: action, 
		path: url, 
		requestToken: paths.requestToken, 
		id: location.href.match(/id=[\w]*/g)[0].slice(3)}
	})
	.done(function(data, status, jqXHR) {
		if (isDebug === true)  {
			console.log(status + ' from path: ' + from );
		  console.log(data);
		}
		if (callback && typeof callback === 'function') { 
			callback(data, status);
		}
  })
	.fail(function(jqXHR, status, error) {
		if (isDebug === true) {
			console.error('.fail: ' + status + ', in function: ' + action + '\nError: ' + error);
			console.log(jqXHR);
		}
		if (callback && typeof callback === 'function') { 
			callback(null, status, error);
		}
  });
}
/** AJAX data saving
 *  @param {string} from - URL to save data to
 *  @param {string} action - Name of the PHP function to call from plugins/KO_base/common_functions.php
 *  @param {object} data - The data to be saved
 *  @param {function} callback - A function to execute after the data has been sent/ loaded
 */
function setJSONData(from, action, data, callback) {
	var url = from;
	$.ajax({ url: paths.handler, type: 'POST', data: {
		action: action, 
		path: url, 
		data: data, 
		requestToken: paths.requestToken, 
		id: location.href.match(/id=[\w]*/g)[0].slice(3)}
	})
	.done(function(data, status, jqXHR) {
		if (isDebug === true) 
			console.log('.done: ' + status + (action === 'saveData' ? 'saved to: ' + url : ''));
			console.log(data);
		if (callback && typeof callback === 'function') { 
			callback(data, status);
		}
  })
	.fail(function(jqXHR, status, error) {
		if (isDebug === true) 
			console.error('.fail: ' + status + ', in function: ' + action + '\nError: ' + error);
		if (callback && typeof callback === 'function') { 
			callback(null, status, error);
		}
  });
}
// utility function for parsing JSON
function parseJSON(data) {
	if (data.indexOf('{') > 0) {
		data = data.slice(data.indexOf('{'));
	}
	return JSON.parse(data);
}
var paths = {
	lang: $('#path-lang').val(), // ./plugins/<plugin>/lang/<langfile>.json
	data: $('#path-data').val(), // ./plugins/<plugin>/js/data.json
	handler: $('#path-handler').val(),      // ./plugins/KO_base/ko.handler.php
	self: $('#path-self').val(),
	requestToken: $('#request-token').val()
};

/** Array pluck - returns an array with one extracted property from objects for easy comparison
 *  @param {string} prop - The property to keep from the array
 *  @param {boolean} [live=false] - Whether the resulting array should be observable or not
 */
ko.observableArray.fn.pluck = function(prop, live) {
	var allItems = this(), result;
	if (prop) {
		result = ko.utils.arrayMap(allItems, function(item) {
			return ko.utils.unwrapObservable(item[prop]);
		});	
    return live ? ko.observableArray(result) : result;
  }
}
/** Array filter - returns an array with only matching key value pairs
 *  @param {string} prop - The property to keep from the array
 *  @param {boolean} [live=false] - Whether the resulting array should be observable or not
 */
ko.observableArray.fn.filter = function(prop, value, live) {
	var allItems = this(), result;
	if (prop) {
		result = ko.utils.arrayFilter(allItems, function(item) { 
			return ko.utils.unwrapObservable(item[prop]) === value;
		});
	}
	return live ? ko.observableArray(result) : result;
}
/** Array forEach - executes the given function on each array item
 *  @param {string} prop - The property to keep from the array
 *  @param {boolean} [live=false] - Whether the resulting array should be observable or not
 */
ko.observableArray.fn.each = function(callback) {
	var allItems = this(), result;
	for (var i = 0; i < allItems.length; i++) {
		(callback(allItems[i], i));
	}
}
/** Array find - returns an array containing only one property
 *  @param {string} obj - An object containing key-value pairs OR a single value to be validated
 *  @param {boolean} [live=false] - Whether the resulting array should be observable or not
 */
ko.observableArray.fn.where = function(obj, live) {
	var allItems = this(), result = [], flag;
	if (obj) {
		if (typeof obj === 'object') {
			ko.utils.arrayForEach(allItems, function(item) {
				flag = true;
				for (var prop in obj) {
					if (obj[prop] && ko.utils.unwrapObservable(item[prop]) !== obj[prop])
						flag = false;
				}
				if (flag === true) result.push(item);
			});
		}
		else {
			ko.utils.arrayForEach(allItems, function(item) {
				if (ko.utils.unwrapObservable(item) === obj)
					result.push(obj);
			});
		}
		return result;
	}
}
var isDebug = true;