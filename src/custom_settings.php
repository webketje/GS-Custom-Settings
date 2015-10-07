<?php
/*
Plugin Name: GS Custom Settings
Description: A plugin for custom site, theme and plugin settings.
Version: 0.6.1
Author: Kevin Van Lierde
Author URI: http://webketje.com/
*/

// include customSettings class
require_once(GSPLUGINPATH . 'custom_settings/customsettings.class.php');

// initiate customSettings
customSettings::upgrade();
customSettings::createDataSubfolder();
$custom_settings = customSettings::retrieveAllSettings();
$custom_settings_dictionary = customSettings::mapAllSettings();
$custom_settings_lang = customSettings::getLangFile();
customSettings::loadJsLibs();

// register plugin
register_plugin(
	'custom_settings',
	$custom_settings_lang['title'],
	customSettings::$version,
	'Kevin Van Lierde',
	'http://webketje.com', 
	$custom_settings_lang['descr'],
	'site',
  'custom_settings_init'
);

// provide a way for other themes/ plugins to check 
// whether GS Custom Settings is active and what version
define('GS_CUSTOM_SETTINGS', customSettings::$version);

// GS hooks
add_action('nav-tab', 'createNavTab', array('site', 'custom_settings', $custom_settings_lang['tab_name']));

// import vars & globalize others
global $live_plugins, $mu_active, $i18n_active;

// give priority to MultiUser plugin if available
// if MultiUser is used, the settings-user hook doesn't work, so use common (as used by same author's plugin GS Blog)
if (isset($live_plugins['user-managment.php']) && $live_plugins['user-managment.php'] !== 'false') {
	add_action('common','mu_custom_settings_user_permissions');
	$mu_active = true;
} else {
	add_action('settings-user','custom_settings_user_permissions');
	$mu_active = false;
}
if (isset($live_plugins['i18n_base.php']) && $live_plugins['i18n_base.php'] !== 'false')
	$i18n_active = true;
else
	$i18n_active = false;
	
// front-end filter (WYSIWYG)
add_filter('content', 'custom_settings_filter');

// Show Tab function
function custom_settings_init() { customSettings::init(); }

// Plugin hooks
function custom_settings_filter($content) { return customSettings::contentFilter($content); }
function custom_settings_user_permissions() { customSettings::setUserPermission(); }
function mu_custom_settings_user_permissions() { customSettings::mu_setUserPermission(); }

// beneath used in both GS Custom Settings render hooks
function custom_settings_render($plugin, $output_func) {
	if (is_callable($output_func)) {
		echo '<div data-bind="visible: data()[state.tabSelection()] && ko.unwrap(data()[state.tabSelection()].tab.data.lookup) === \'' . $plugin . '\' ">';
		$output_func();
		echo '</div>';
	}
}
// API functions
function return_setting($tab, $setting, $prop=NULL) { 
	return customSettings::returnSetting($tab, $setting, $prop); 
}
function get_setting($tab, $setting, $echo=TRUE)    { 
	if ($echo == TRUE) customSettings::getSetting($tab, $setting, $echo); 
	else return customSettings::getSetting($tab, $setting, $echo); 
}
function get_i18n_setting($tab, $setting, $echo=TRUE) { 
	if ($echo == TRUE) customSettings::getI18nSetting($tab, $setting, $echo); 
	else return customSettings::getI18nSetting($tab, $setting, $echo); 
}
function return_setting_group($tab, $group, $prop=NULL) { 
	return customSettings::returnSettingGroup($tab, $group, $prop); 
}
function get_tab_link($tab=NULL, $linkText='settings') {
	global $custom_settings, $SITEURL;
	$id = $tab ? '#' . $tab : '';
	echo '<a href="' . $SITEURL . 'admin/load.php?id=custom_settings' . $id . '">' . $linkText . '</a>';
}
// use with caution
function remove_setting($tab, $setting)             { customSettings::removeSetting($tab, $setting); }
function set_setting($tab, $setting, $newValue)     { customSettings::setSetting($tab, $setting, $newValue); }
?>
