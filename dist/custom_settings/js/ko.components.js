
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
ko_arrayToText.template = '<textarea data-bind="event: event, value: view, valueUpdate: valueUpdate, i18n: i18n, attr: attr"></textarea>';

ko_arrayToText.viewModel = function (params) {
	var self = this;
  this.data = params.data;
  this.attr = params.attr || '';
  this.i18n = params.i18n || '';
  this.valueUpdate = params && params.update ? params.update : '';
  this.events = params && params.events ? params.events : '{}';
  this.view = ko.pureComputed({
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
      console.log(this.data());
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
			'keyup: function(e) { $element.value = display(); return;}}">';

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
