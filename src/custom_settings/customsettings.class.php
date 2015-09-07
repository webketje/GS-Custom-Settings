<?php 
if (!class_exists('customSettings')) {

	class customSettings {
	
		private static $defaultJSON = '{"site": []}';
		public static $version = '0.5.1';
		
		//////////////////////////////////////////////////////////////////////////
		//                                                                      //
		//                   Component API; not implemented                     //
		//                                                                      //
		//////////////////////////////////////////////////////////////////////////
		
		// Experimental, not used at the moment
		public static function componentLoader() {
		global $comps;
	  if (file_exists(GSDATAOTHERPATH.'components.xml')) {
	    $data = getXML(GSDATAOTHERPATH.'components.xml');
	    $data = (array)$data;
	  } else {
	    $data = array();
	  }
	  $comps = $data['item'];
		$componentPath = GSPLUGINPATH . 'custom_settings/components/';
		$componentDir = array_diff(scandir($componentPath), array('.','..','.htaccess'));
		foreach ($componentDir as $component) {
			if (strpos($component, '.xml')) {
				$componentData = getXML($componentPath . $component);
				array_push($comps, $componentData->item);
			}
		}
		global $fin;
			$fin = new stdClass();
			foreach($comps as $comp=>$val) {
				$prop = (string)$val->title;
				$fin->$prop = (string)$val->value;
			}
			var_dump($fin->Sidebar2);
			return $fin;
		}
		
		
		//////////////////////////////////////////////////////////////////////////
		//                                                                      //
		//                    Settings retrieval from files                     //
		//                                                                      //
		//////////////////////////////////////////////////////////////////////////
		
		/** Retrieves settings created in the site
		 *  Launched before other retrieves, so creates a subfolder if none is present
		 */
		public static function retrieveSiteSettings() 
		{
			$path = GSDATAOTHERPATH . 'custom_settings/data.json';
			$result = array();
			if (!file_exists($path))
				self::createDataSubfolder();
			$content = json_decode(file_get_contents($path), TRUE);
			foreach ($content['site'] as $tab) {
				$result[$tab['tab']['lookup']] = $tab;
			}
			return $result;
		}
		
		/** Utility for mapping setting arrays to indexes, used in self::versionUpdate
		 *  @param {array} $settings - An array of settings
		 */
		public static function mapToKeys($settings)
		{
			$result = array();
			foreach ($settings as $value) 
				$result[$value['lookup']] = $value;
			return $result;
		}
		public static function adminPath() { return GSADMININCPATH; }
		/** Updates settings.json files from both plugins and themes
		 *  ORI stands for origin, DAT for data
		 *  @param {array} &$datFile - data file in /data/other/custom_settings
		 *  @param {array} &$oriFile - data file that accompanies plugins/themes
		 */
		public static function versionUpdate(Array &$datFile, Array &$oriFile)
		{
			$vDat = &$datFile['tab']['version'];
			$vOri = &$oriFile['tab']['version'];
			// convert both versions to float numbers for easy comparison
			$v1 = (float)substr($vDat, 0, strpos($vDat,'.')) . str_replace('.','',substr($vDat, strpos($vDat,'.')));
			$v2 = (float)substr($vOri, 0, strpos($vOri,'.')) . str_replace('.','',substr($vOri, strpos($vOri,'.')));
			// only update settings if no version in the data folder file is present or 
			// if the version is older than the one included with the theme or plugin
			if (isset($vOri) && (!isset($vDat) || $v2 > $v1)) {
				$vDat = $vOri;
				if (function_exists('delete_cache')) 
					delete_cache();
				// map both plugin/ theme and data file to lookup-based key arrays
				$oriS = self::mapToKeys($oriFile['settings']);
				$datS = self::mapToKeys($datFile['settings']);
				$merged = array();
				foreach ($oriS as $ori) {
					// if the setting already existed and is not a section title (those are always overwritten)
					if (array_key_exists($ori['lookup'], $datS) && $datS[$ori['lookup']]['type'] !== 'section-title') {
						// if the type of setting has changed, overwrite the old setting completely
						if ($ori['type'] !== $datS[$ori['lookup']]['type'])
							array_push($merged, $ori);
						// else if the type is identical, overwrite all properties except the value
						// needs to be more specific (eg for option settings)
						else {
							$oldVal = $datS[$ori['lookup']]['value'];
							$mixS = $ori;
							$mixS['value'] = $oldVal;
							array_push($merged, $mixS);
						}
					// if the setting didn't exist, just create a new one
					} else {
						array_push($merged, $ori);
					}
				}			
			$datFile['settings'] = $merged;
			}
		}
		/** Retrieves settings from all plugins using this plugin
		 *  if they are activated.
		 */
		public static function retrievePluginSettings()
		{
			global $live_plugins, $LANG;
			$settings = array();
			foreach ($live_plugins as $plugin => $activated) {
				$pluginName = str_replace('.php', '', $plugin);
				$pluginData = GSDATAOTHERPATH . 'custom_settings/plugin_data_' . $pluginName . '.json';
				$pluginDefs = GSPLUGINPATH . $pluginName . '/settings.json';
				if ($activated != 'false' && file_exists($pluginDefs)) {
					$defContents = file_get_contents($pluginDefs);
					if (!file_exists($pluginData)) {
						file_put_contents($pluginData, $defContents);	
						$contents = json_decode($defContents, TRUE);
					} else {
						$contents = json_decode(file_get_contents($pluginData), TRUE);
					}
					$defContents = json_decode($defContents, TRUE);
					self::versionUpdate($contents, $defContents);
					if (file_exists(GSPLUGINPATH . $pluginName . '/lang/' . $LANG . '.json')) {
						// map setting indexes to a lookup dictionary for easy value assignment
						// also used to check whether an entry still exists in the data file
						$dictionary = array();
						for ($i = 0; $i < count($contents['settings']); $i++)
							$dictionary[$contents['settings'][$i]['lookup']] = $i;
							
						$pluginLang = json_decode(file_get_contents(GSPLUGINPATH . $pluginName . '/lang/' . $LANG . '.json'), TRUE);
						foreach ($pluginLang['strings'] as $string => $translation) {
							$prop = substr($string, strrpos($string, '_') + 1);
							$setting = substr($string, 0, strlen($string) - (strlen($prop) + 1));
							if (isset($dictionary[$setting])) 
								$contents['settings'][$dictionary[$setting]][$prop] = $translation;
						}
					}
					$settings[$pluginName] = $contents;
					$settings[$pluginName]['tab']['type'] = 'plugin';
				}					
			}
			return $settings;
		}
		
		/** Retrieves theme settings from data/other/custom_settings/theme_data_<name>.json if active theme has any.
		 *  If first initiation, copies the data from themedir/settings.json to data folder.
		 */
		public static function retrieveThemeSettings() 
		{
			global $TEMPLATE, $LANG;
			$themeDir = GSTHEMESPATH . $TEMPLATE . '/';
			$themeDataPath = GSDATAOTHERPATH . 'custom_settings/theme_data_' . strtolower($TEMPLATE) . '.json';
			$themeDefs = $themeDir . 'settings.json';
			if (file_exists($themeDataPath)) {
				if (file_exists($themeDefs)) 
					$defContents = file_get_contents($themeDefs);
				if (!file_exists($themeDataPath)) {
					file_put_contents($themeDataPath, $defContents);
					$contents = json_decode($defContents, TRUE);
				} else
					$contents = json_decode(file_get_contents($themeDataPath), TRUE);
				$defContents = json_decode($defContents, TRUE);
				self::versionUpdate($contents, $defContents);
				// output expected by JS files
				$file = array('theme_settings'=>array(
					'settings' => $contents['settings'],
					'tab' => array('lookup'=> 'theme_settings', 'type' => 'theme')));
				
				if (isset($contents['tab'])) {
					$tabOptions = array('version','enableReset','enableAccessAll','enableCodeDisplay');
					foreach ($tabOptions as $opt) {
						if (isset($contents['tab'][$opt]))
							$file['theme_settings']['tab'][$opt] = $contents['tab'][$opt];
					}
				}
				// map setting indexes to a lookup dictionary for easy value assignment
				// also used to check whether an entry still exists in the data file
				$dictionary = array();
				for ($i = 0; $i < count($file['theme_settings']['settings']); $i++)
					$dictionary[@$file['theme_settings']['settings'][$i]['lookup']] = $i;
					
				// handle lang
				if (file_exists($themeDir . 'lang/' . $LANG . '.json')) {
					$jsonLangFile = json_decode(file_get_contents($themeDir . 'lang/' . $LANG . '.json'), TRUE);
					foreach ($jsonLangFile['strings'] as $string => $translation) {
						$prop = substr($string, strrpos($string, '_') + 1);
						$setting = substr($string, 0, strlen($string) - (strlen($prop) + 1));
						if (isset($dictionary[$setting])) 
							$file['theme_settings']['settings'][$dictionary[$setting]][$prop] = $translation;
					}
				}
			} else {
				if (file_exists(GSTHEMESPATH . $TEMPLATE . '/settings.json')) {
					$defContents = file_get_contents(GSTHEMESPATH . $TEMPLATE . '/settings.json'); // default theme settings
					$defContentsPHP = json_decode($defContents, TRUE);
					file_put_contents($themeDataPath, $defContents);
					$file = array('theme_settings'=>array(
						'settings' => $defContentsPHP['settings'],
						'tab' => array('lookup'=> 'theme_settings', 'type' => 'theme')));
				} else 
					$file = array();
			}
			return $file;
		}
		
		/** Retrieves all settings from files
		 *  Combination of previous retrieval functions
		 */
		public static function retrieveAllSettings() 
		{
			$customSettings = self::retrieveSiteSettings();
			$pluginSettings = self::retrievePluginSettings();
			$themeSettings = self::retrieveThemeSettings();
			$result = array('data'=> array_merge($customSettings, $themeSettings, $pluginSettings));
			return $result;
		}
		
		/** Maps settings to an array dictionary containing indexes
		 *  Used in all display/ return functions and globalized as $custom_settings_dictionary
		 */
		public static function mapAllSettings() 
		{
			global $custom_settings;
			$result = array();
			// A little bit confusing, so: first iterate over $custom_settings and assign tab lookup
			// to the result, nothing special here.
			foreach ($custom_settings['data'] as $tab) {
				$result[$tab['tab']['lookup']] = array();
				// For each setting in the $custom_settings tab, assign the setting's lookup as key
				// and the setting's index as value
				for ($i = 0; $i < count($tab['settings']); $i++) {
					if (isset($tab['settings'][$i]['lookup']))
					$result[$tab['tab']['lookup']][$tab['settings'][$i]['lookup']] = $i;
				}
			}
			return $result;
		}
		
		public static function saveAllSettings($data) 
		{
			global $TEMPLATE, $custom_settings;
			require_once(GSPLUGINPATH . 'custom_settings/filehandler.class.php');
			// map paths; plugin path tildes are replaced with the plugin's lookup
			$paths = array(
				'theme' => GSDATAOTHERPATH . 'custom_settings/theme_data_' . strtolower($TEMPLATE) . '.json',
				'plugin' => GSDATAOTHERPATH . 'custom_settings/plugin_data_~~~.json',
				'site' => GSDATAOTHERPATH . 'custom_settings/data.json');
			// settings saved to data.json (site) require an extra 'site' top property
			$siteData = array('site'=>array());
			// execute plugin hook
			exec_action('custom-settings-save');
			// iterate over collection of settings as outputted by JS.
			// Each needs to save to its own file, except site tabs, therefore if a tab is of the type 'site',
			// push it to the $siteData array and save all at the end
			foreach($data['data'] as $tab) {
			  $type = $tab['tab']['type'];
			  $path = $paths[$type];
				unset($tab['tab']['type']);
				if ($type === 'site')	array_push($siteData['site'], $tab);
				if ($type === 'plugin')	$path = str_replace('~~~', $tab['tab']['lookup'], $path);
				if ($type !== 'site')	file_put_contents($path, fileUtils::indentJSON($tab));
			}
			file_put_contents($paths['site'], fileUtils::indentJSON($siteData));
		}
		
		//////////////////////////////////////////////////////////////////////////
		//                                                                      //
		//                          Settings PHP API                            //
		//                                                                      //
		//////////////////////////////////////////////////////////////////////////
		
		/** Outputs a setting's value
		 *  @param {string} $tab
		 *  @param {string} $setting
		 */
		public static function getSetting($tab, $setting, $echo=TRUE) 
		{
			global $custom_settings, $custom_settings_dictionary, $i18n_active, $language;
			$tab = $tab === 'theme' ? 'theme_settings' : $tab;
			
			if (isset($custom_settings['data'][$tab]) && isset($custom_settings['data'][$tab]['settings'][@$custom_settings_dictionary[$tab][$setting]])) {
				$settingInArray = $custom_settings['data'][$tab]['settings'][@$custom_settings_dictionary[$tab][$setting]];
				$value = $settingInArray['value']; 
				$returnValue = '';
				if ($value === TRUE)	
					$returnValue = 'on';
				elseif ($value === FALSE)	
					$returnValue = 'off';
				elseif (isset($settingInArray['options']) && is_array($settingInArray['options']) && count($settingInArray['options'])) 
					$returnValue = $settingInArray['options'][$value];
				elseif ($settingInArray['type'] === 'image' && $value)
					$returnValue = '<img src="' . str_replace(' ', '%20', $value) . '" alt="' . $settingInArray['label'] . '">';
				else 
					$returnValue = $value;
				
				if ($echo === TRUE) 
					echo $returnValue;
				else
					return $returnValue;
			}
		}
		
		/** Return a setting completely, or a setting's property
		 *  @param {string} $tab
		 *  @param {string} $setting
		 *  @param {string|boolean} [$prop=NULL] - if FALSE, returns the entire setting, else must be one of the setting's properties
		 */
		public static function returnSetting($tab, $setting, $prop=NULL) 
		{
			global $custom_settings, $custom_settings_dictionary;
			$tab = $tab === 'theme' ? 'theme_settings' : $tab;
			if (isset($custom_settings_dictionary[$tab][$setting]))
				$settingInArray = $custom_settings['data'][$tab]['settings'][$custom_settings_dictionary[$tab][$setting]];
					
			if (isset($custom_settings['data'][$tab]) && isset($settingInArray)) {
				if (isset($prop)) {
					if ($prop === FALSE) 
						return $settingInArray;
					if (isset($settingInArray[$prop])) 
						return $settingInArray[$prop];
					return;
				}
				return $settingInArray['value'];
			}
			return;
		}		
		
		/** Returns a group of settings starting with the lookup $group, eg. 'social_'
		 *  @param {string} $tab
		 *  @param {string} $setting
		 *  @param {string|boolean} [$prop=NULL] - if FALSE, returns the entire setting, else must be one of the setting's properties
		 */
		public static function returnSettingGroup($tab, $group, $prop=NULL)
		{
			global $custom_settings, $custom_settings_dictionary;
			$tab = $tab === 'theme' ? 'theme_settings' : $tab;
			$tabToSearch = @$custom_settings['data'][$tab]['settings'];
			$result = array();
			if ($prop === NULL)
				$prop = 'value';
			foreach ($tabToSearch as $setting) {
				if (strpos(@$setting['lookup'], $group) !== FALSE) {
					if ($prop === FALSE) {
						$result[str_replace($group . '_', '', @$setting['lookup'])] = $setting;
					} else if (isset($setting[$prop]))
						$result[str_replace($group . '_', '', @$setting['lookup'])] = $setting[$prop];
				}
			}
			return $result;
		}
		
		/** Output an i18n-enabled (through I18N-plugin) setting completely, or a setting's property
		 *  @param {string} $tab
		 *  @param {string} $setting
		 *  @param {string|boolean} [$prop=NULL] - if FALSE, returns the entire setting, else must be one of the setting's properties
		 */
		public static function getI18nSetting($tab, $setting, $echo=TRUE) 
		{
			global $i18n_active, $language;
			if ($i18n_active && isset($language)) {
				$langs = return_i18n_available_languages();
				$index = array_search($language, $langs);
				$settingVals = self::returnSetting($tab, $setting, 'values');
				if ($echo === TRUE) 
					echo $settingVals ? $settingVals[$index] : '';
				else
					return $settingVals ? $settingVals[$index] : $settingVals;
			}
			return;
		}
		
		/** Remove a setting
		 *  @param {string} $tab
		 *  @param {string} $setting
		 */
		public static function removeSetting($tab, $setting) 
		{
			global $custom_settings, $custom_settings_dictionary;
			if (isset($custom_settings_dictionary[$tab][$setting]))
				$settingInArray = $custom_settings['data'][$tab]['settings'][$custom_settings_dictionary[$tab][$setting]];
				
			if (isset($custom_settings['data'][$tab]) && isset($settingInArray)) {
				unset($settingInArray);
				// make sure to update the settings dictionary if a setting has been removed
				$custom_settings_dictionary = self::mapAllSettings();
			}
		}
		
		// not production ready
		/** Set a setting's value, or multiple properties to a new value
		 *  @param {string} $tab
		 *  @param {string} $setting
		 *  @param {string|array} $newValue - if string, sets the setting's value, if array, sets the properties in the array on the setting
		 */
		public static function setSetting($tab, $setting, $newValue) {
			global $custom_settings, $custom_settings_dictionary;
			if (isset($custom_settings['data'][$tab])) {
				if (isset($custom_settings['data'][$tab]['settings'][$custom_settings_dictionary[$tab][$setting]])) {
					if (strlen($newValue)) {
						$custom_settings['data'][$tab]['settings'][$custom_settings_dictionary[$tab][$setting]]['value'] = $newValue;
					}	elseif (is_array($newValue)) {
						foreach ($newValue as $prop=>$val)
							$custom_settings['data'][$tab]['settings'][$custom_settings_dictionary[$tab][$setting]][$prop] = $val;
					}
				} else {
					array_push($custom_settings['data'][$tab]['settings'], $newValue);
					// make sure to update the settings dictionary if a setting has been added
					$custom_settings_dictionary = self::mapAllSettings();
				}
			}
		}
		
		//////////////////////////////////////////////////////////////////////////
		//                                                                      //
		//                          GetSimple Hooks                             //
		//                                                                      //
		//////////////////////////////////////////////////////////////////////////
		
		/** Displays a custom Knockout sidebar. With Knockout, the standard sidebar-hook for GS is useless
		 *  Hook: site-sidebar
		 */
		public static function getCustomSidebar() {
			$path = GSPLUGINPATH . 'custom_settings/tmpl/sidebar.html';
			echo file_get_contents($path);
		}
		
		/** Sets per-user editing permission
		 *  Hook: settings-user
		 */
		public static function setUserPermission() 
		{
			global $datau, $xml;
			// $datau holds the current user data as retrieved from the file
			// $xml holds the future user data that is going to be saved to the file
			if ($datau->KO_EDIT)
				$xml->addChild('KO_EDIT',$datau->KO_EDIT);
		}
		
		/** Gets per-user editing permission
		 *  Used in init function
		 */
		public static function getUserPermission() 
		{
			global $USR;
			$userdata = getXML(GSUSERSPATH . $USR . '.xml');
			if (!isset($userdata->KO_EDIT)) 
				return 'true';
			return $userdata->KO_EDIT;
		}
		
		/** Sets per-user editing permission with Multi-User plugin (v1.8.2 onwards)
		 *  Hook: common (requires another hook because MU overwrites the settings-user hook)
		 */
		public static function mu_setUserPermission() {
			global $live_plugins;
			if (isset($live_plugins['user-managment.php']) && $live_plugins['user-managment.php'] !== 'false') {
				// set Multi User setting
				$pluginLang = self::getLangFile();
				add_mu_permission('KO_EDIT', $pluginLang['title']);		
			}
		}
		
		/** Gets per-user editing permission with Multi-User plugin (v1.8.2 onwards)
		 *  Hook: common (requires another hook because MU overwrites the settings-user hook)
		 */
		public static function mu_getUserPermission() {
			global $USR;
			return check_user_permission($USR, 'KO_EDIT') === false ? 'false' : 'true';
		}
		
		/** Used in contentFilter preg_replace_callback function
		 *  No need to require filehandler.class.php, called in parent execution context
		 *  @param {string} $matches - Match as returned by preg_replace_callback
		 */
		private static function contentReplaceCallback($matches) {
			$jsonPath = fileUtils::splitPathArray($matches[1]);
			$jsonPath[0] = $jsonPath[0] === 'theme' ? 'theme_settings' : $jsonPath[0];
			$result = self::getSetting($jsonPath[0], $jsonPath[1], false);
			return $result;
		}
		
		/** Filters (% setting: tab/setting %) text from Pages content 
		 *  Hook: content
		 */
		public static function contentFilter($content) {
			require_once(GSPLUGINPATH . 'custom_settings/filehandler.class.php');
			$regex = '#\(%\s*setting[:=]\s*(.*?[\/]*.*?)\s*%\)#';
			$new_content = preg_replace_callback($regex, array('self', 'contentReplaceCallback'), $content);
			return $new_content;
		}
		/** Loads plugin content in plugin custom tab
		 *  Hook: plugin init function in register_plugin
		 */
		public static function init() 
		{
			global $custom_settings, $i18n_initialized;
			exec_action('custom-settings-load');
			require_once(GSPLUGINPATH . 'custom_settings/filehandler.class.php');
			require_once(GSPLUGINPATH . 'custom_settings/gs.utils.php');
			global $LANG, $TEMPLATE, $SITEURL, $mu_active;
			$tmpl = GSPLUGINPATH . 'custom_settings/tmpl/';
		  echo file_get_contents(GSPLUGINPATH . 'custom_settings/tmpl/nav.html'); ?>
		  <script>
		    window.hooks = [];
		    function addHook(fn) {
		      window.hooks.push(fn);
		    }
		  </script>
		  <div id="custom-rendering-top"><?php exec_action('custom-settings-render-top'); ?></div>
		  <?php echo file_get_contents(GSPLUGINPATH . 'custom_settings/tmpl/main.html'); ?>
		  <br>
		  <input type="hidden" id="i18n-plugin-langs" value="<?php echo function_exists('return_i18n_available_languages') ? str_replace('"', '\'', json_encode(return_i18n_available_languages())) : 'FALSE'; ?>">
		  <div id="custom-rendering-bottom"><?php exec_action('custom-settings-render-bottom'); ?></div>
			<input type="button" class="submit" data-bind="click: fn.saveData" value="<?php i18n('BTN_SAVESETTINGS'); ?>" id="custom-settings-save-btn"/>
			<span id="custom-buttons">
				<!-- ko if: $root.data.activeItem() && data.items()[data.activeItem()] && data.items()[data.activeItem()].enableReset -->
				<input type="button" class="submit" data-bind="click: data.items()[data.activeItem()].settings.resetToDefault, i18n: {value: 'label_reset'} "/>
				<!-- /ko --></span>
		  <input type="hidden" id="chosen-lang"  value="<?php echo $LANG; ?>">
		  <input type="hidden" id="path-lang"  value="<?php echo GSPLUGINPATH . 'custom_settings/lang/' . $LANG . '.json'; ?>">
		  <input type="hidden" id="path-handler"    value="<?php echo $SITEURL; ?>plugins/custom_settings/customsettings.handler.php">
		  <input type="hidden" id="site-template"    value="<?php echo strtolower($TEMPLATE); ?>">
		  <input type="hidden" id="edit-permission"    value="<?php echo $mu_active ? self::mu_getUserPermission() : self::getUserPermission(); ?>">
		  <input type="hidden" id="plugin-version"  value="<?php echo self::$version; ?>">
		  <input type="hidden" id="path-data"  value="<?php echo GSDATAOTHERPATH; ?>custom_settings/data.json">
		  <input type="hidden" id="request-token" value="<?php echo fileUtils::requestToken('kosstt'); ?>">
		  <script type="text/template" id="setting-item-edit-tmpl"><?php echo file_get_contents($tmpl . 'setting-item-edit.html'); ?></script>
		  <script type="text/template" id="setting-item-manage-tmpl"><?php echo file_get_contents($tmpl . 'setting-item-manage.html'); ?></script>
		  <script type="text/javascript">
		    window.i18nJSON = <?php echo file_get_contents(GSPLUGINPATH . 'custom_settings/lang/' . (file_exists(GSPLUGINPATH . 'custom_settings/lang/' . $LANG . '.json') ? $LANG : 'en_US') . '.json'); ?>;
		  </script>
		  <?php
		}
		
		//////////////////////////////////////////////////////////////////////////
		//                                                                      //
		//                               Other                                  //
		//                                                                      //
		//////////////////////////////////////////////////////////////////////////
		
		/** Check for latest plugin version and prompt for download
		 *  Returns plugin info from GS Extend API
		 */
		public static function loadPluginInfo() 
		{
			$pluginInfoJSON = file_get_contents('http://get-simple.info/api/extend/?id=913');
			$pluginInfo = json_decode($pluginInfoJSON, TRUE);
			if ($pluginInfo['status'] === 'successful')
				return $pluginInfoJSON;
		}
		
		/** Loads JS & CSS resources for the plugin
		 *  Used at start of main plugin file
		 */
		public static function LoadJsLibs() 
		{
			global $SITEURL;
			require_once(GSPLUGINPATH . 'custom_settings/gs.utils.php');
			// set standard KO libraries (JS scripts and CSS styles, as well as fonts)
			// with possibility to add plugin-specific ones in the plugin folder
			
			GSutils::registerLib('custom_settings', array(
				'knockout'        => array($SITEURL . 'plugins/custom_settings/js/knockout.js',         '3.2.0',FALSE),
				'fileSaver'       => array($SITEURL . 'plugins/custom_settings/js/FileSaver.js',        '1',FALSE),
				'kopunches'       => array($SITEURL . 'plugins/custom_settings/js/knockout.punches.min.js', '0.5.1',FALSE),
				'koBase'          => array($SITEURL . 'plugins/custom_settings/js/koBase.js',           '1.0',  TRUE),
				'koStyle'         => array($SITEURL . 'plugins/custom_settings/css/ko-style.css',       '1.0',  'screen'),
				'fontawesome'     => array($SITEURL . 'plugins/custom_settings/css/font-awesome.min.css', '4.3',  'screen'),
				'koList'          => array($SITEURL . 'plugins/custom_settings/js/ko-list-component.js',           '1.0',  TRUE),
				'main'            => array($SITEURL . 'plugins/custom_settings/js/main.js','1.0',  TRUE)
			));
		}		
		
		/**
		 *  Creates a data folder in /data/other with necessary .htaccess and main data file
		 */
		public static function createDataSubfolder() 
		{
			$path = GSDATAOTHERPATH . 'custom_settings/';
			$file = 'data.json';
			if (!file_exists($path)) mkdir($path);
			if (!file_exists($path . '.htaccess'))
				file_put_contents($path . '.htaccess','Deny from all');
			if (!file_exists($path . $file)) {
				$contents = self::$defaultJSON;
				file_put_contents($path . $file, $contents);
			}
		}
		/** Simply outputs all lang strings to the page; 
		 *  called via AJAX through customsettings.handler.php
		 */
		public static function getLangFile() 
		{
			global $LANG;
			$path = GSPLUGINPATH . 'custom_settings/lang/' . $LANG . '.json';
			if (!file_exists(GSPLUGINPATH . 'custom_settings/lang/' . $LANG . '.json'))
			  $path = GSPLUGINPATH . 'custom_settings/lang/en_US.json';
			$f = json_decode(file_get_contents($path), TRUE);
			$f['strings']['BTN_SAVESETTINGS'] = i18n_r('BTN_SAVESETTINGS');
			return $f['strings'];
		}
	}
}
?>