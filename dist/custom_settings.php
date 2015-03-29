<?php
/*
Plugin Name: GS Custom Settings
Description: A plugin for custom site, theme and plugin settings.
Version: 0.2 (Beta)
Author: Kevin Van Lierde
Author URI: http://webketje.github.io/
*/

// include customSettings class
require_once(GSPLUGINPATH . 'custom_settings/customsettings.class.php');

customSettings::upgradeFromAlpha();
customSettings::createDataSubfolder();
$custom_settings = customSettings::retrieveAllSettings();
$custom_settings_dictionary = customSettings::mapAllSettings();
$custom_settings_lang = customSettings::getLangFile();
customSettings::loadJsLibs();

// register plugin
register_plugin(
	'custom_settings',
	$custom_settings_lang['title'],
	'0.2',
	'Kevin Van Lierde',
	'http://webketje.github.io', 
	$custom_settings_lang['descr'],
	'site',
  'custom_settings_init'
);

// GS hooks
add_action('nav-tab', 'createNavTab', array('site', 'custom_settings', $custom_settings_lang['tab_name']));
add_action('site-sidebar', 'custom_settings_sidebar');
add_action('settings-user','custom_settings_user_permissions');

// front-end filter (WYSIWYG)
add_filter('content', 'custom_settings_filter');

// Show Tab function
function custom_settings_init() { customSettings::init(); }

// hooks
function custom_settings_sidebar() { customSettings::getCustomSidebar();}
function custom_settings_filter($content) { return customSettings::contentFilter($content); }
function custom_settings_user_permissions() { customSettings::setUserPermission(); }
function custom_settings_plugin_init() {}
// API functions
function return_setting($tab, $setting, $prop=NULL) { return customSettings::returnSetting($tab, $setting, $prop); }
function get_setting($tab, $setting)                { customSettings::getSetting($tab, $setting); }
function get_tab_link($tab=NULL, $linkText='settings') {
	global $custom_settings, $SITEURL;
	$id = $tab ? '#' . $tab : '';
	echo '<a href="' . $SITEURL . 'admin/load.php?id=custom_settings' . $id . '">' . $linkText . '</a>';
}
// use only in combination with custom version checking
function remove_setting($tab, $setting)             { customSettings::removeSetting($tab, $setting); }
// use only in combination with custom version checking
function set_setting($tab, $setting, $newValue)     { customSettings::setSetting($tab, $setting, $newValue); }

exec_action('custom-settings-init');
?>
