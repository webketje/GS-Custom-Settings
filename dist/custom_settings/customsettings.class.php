<?php 
// TODO: update create_data_subfolder function & test
// TODO: update retrievePluginSettings to look like Theme Settings
if (!class_exists('customSettings')) {

	class customSettings {
		private static $htDeny = 'Deny from all';
		private static $htAllow = 'Allow from all';
		private static $defaultJSON = '{"site": []}';
		
		public static function LoadJsLibs() 
		{
			global $SITEURL;
			require_once(GSPLUGINPATH . 'custom_settings/gs.utils.php');
			
			// set standard KO libraries (JS scripts and CSS styles, as well as fonts)
			// with possibility to add plugin-specific ones in the plugin folder
			
			GSutils::registerLib('custom_settings', array(
				'knockout'        => array($SITEURL . 'plugins/custom_settings/js/knockout.js',         '3.2.0',FALSE),
				'fileSaver'        => array($SITEURL . 'plugins/custom_settings/js/FileSaver.js',        '1',FALSE),
				'koBase'          => array($SITEURL . 'plugins/custom_settings/js/koBase.js',           '1.0',  TRUE),
				'koStyle'         => array($SITEURL . 'plugins/custom_settings/css/ko-style.css',       '1.0',  'screen'),
				'fontawesome'     => array($SITEURL . 'plugins/custom_settings/css/font-awesome.min.css', '4.3',  'screen'),
				'koList'          => array($SITEURL . 'plugins/custom_settings/js/ko-list-component.js',           '1.0',  TRUE),
				'main'            => array($SITEURL . 'plugins/custom_settings/js/main.js','1.0',  TRUE)
			));
		}		
		
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
		
		public static function getLangFile() 
		{
			global $LANG;
			$f = json_decode(file_get_contents(GSPLUGINPATH . 'custom_settings/lang/' . $LANG . '.json'), TRUE);
			return $f['strings'];
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
					if (!file_exists($pluginData)) 
						file_put_contents($pluginData, file_get_contents($pluginDefs));
					
					$contents = json_decode(file_get_contents($pluginData), TRUE);
					$contents['tab']['plugin'] = true;
					
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
			if (file_exists($themeDataPath)) {
				$json = json_decode(file_get_contents($themeDataPath), TRUE);
				// output expected by JS files
				$file = array('theme_settings'=>array(
					'settings' => $json['settings'],
					'tab' => array('lookup'=> 'theme_settings', 'theme' => true)));
					
				// map setting indexes to a lookup dictionary for easy value assignment
				// also used to check whether an entry still exists in the data file
				$dictionary = array();
				for ($i = 0; $i < count($file['theme_settings']['settings']); $i++)
					$dictionary[$file['theme_settings']['settings'][$i]['lookup']] = $i;
					
				// handle lang with JSON file first
				if (file_exists($themeDir . 'lang/' . $LANG . '.json')) {
					$jsonLangFile = json_decode(file_get_contents($themeDir . 'lang/' . $LANG . '.json'), TRUE);
					foreach ($jsonLangFile['strings'] as $string => $translation) {
						$prop = substr($string, strrpos($string, '_') + 1);
						$setting = substr($string, 0, strlen($string) - (strlen($prop) + 1));
						if (isset($dictionary[$setting])) 
							$file['theme_settings']['settings'][$dictionary[$setting]][$prop] = $translation;
					}
				// handle lang with PHP file if no JSON file
				}/*  elseif (file_exists($themeDir . 'lang/' . $LANG . '.php')) {
					include $themeDir . 'lang/' . $LANG . '.php';
					if (isset($i18n) && is_array($i18n)) {
						foreach ($i18n as $string => $translation) {
							$prop = substr($string, strrpos($string, '_') + 1);
							$setting = substr($string, 0, strlen($string) - (strlen($prop) + 1));
							if (isset($dictionary[$setting])) 
								$file['theme_settings']['settings'][$dictionary[$setting]][$prop] = $translation;
						}
					}
				}
				 */
			} else {
				if (file_exists(GSTHEMESPATH . $TEMPLATE . '/settings.json')) {
					$defContents = file_get_contents(GSTHEMESPATH . $TEMPLATE . '/settings.json'); // default theme settings
					$defContentsPHP = json_decode($defContents, TRUE);
					file_put_contents($themeDataPath, $defContents);
					$file = array('theme_settings'=>array(
						'settings' => $defContentsPHP['settings'],
						'tab' => array('lookup'=> 'theme_settings', 'theme' => true)));
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
		 *  Used in all display/ return functions
		 */
		public static function mapAllSettings() 
		{
			global $custom_settings;
			$root = $custom_settings['data'];
			$result = array();
			foreach ($root as $tab) {
				$result[$tab['tab']['lookup']] = array();
				for ($i = 0; $i < count($tab['settings']); $i++) {
					if (isset($tab['settings'][$i]['lookup']))
					$result[$tab['tab']['lookup']][$tab['settings'][$i]['lookup']] = $i;
				}
			}
			return $result;
		}
		/** Maps settings to an array as outputted by JS after hitting Save Updates
		 *  Required for passing to customSettings::saveAllSettings after 'custom-settings-save' hook has been executed
		 *  @param {array} $settings - Settings data as passed from customSettings::retrieveAllSettings
		 */
		public static function mapSettingsByKind($settings) {
			$result = array('theme'=> array(), 'site' => array(), 'plugins' => array());
			foreach ($settings['data'] as $tab) {
				if (isset($tab['tab']['plugin'])) 
					$result['plugins'][$tab['tab']['lookup']] = $tab;
				elseif (isset($tab['tab']['theme']))
					$result['theme'] = $tab;
				elseif (isset($tab['tab']['site']))
					$result['site'][$tab['tab']['lookup']] = $tab;
			}	
			return $result;
		} 
		public static function saveAllSettings($settings) 
		{
			global $TEMPLATE, $custom_settings_dictionary;
			require_once(GSPLUGINPATH . 'custom_settings/filehandler.class.php');
			$data = is_array($settings) ? $settings : json_decode($settings, TRUE);
			$siteDataPath = GSDATAOTHERPATH . 'custom_settings/data.json';
			$themeDataPath = GSDATAOTHERPATH . 'custom_settings/theme_data_' . strtolower($TEMPLATE) . '.json';
			
			if (isset($data['site'])) {
				$output = array('site'=>array());
				foreach ($data['site'] as $tab) {
					array_push($output['site'], $tab);
				}
				file_put_contents($siteDataPath, fileUtils::indentJSON(json_encode($output))); 
			}
			if (isset($data['theme'])) 
				file_put_contents($themeDataPath, fileUtils::indentJSON(json_encode($data['theme']))); 
			if (isset($data['plugins'])) {
				foreach ($data['plugins'] as $plugin) {
					$pluginDataPath = GSDATAOTHERPATH . 'custom_settings/plugin_data_' . strtolower($plugin['tab']['lookup']) . '.json';
					file_put_contents($pluginDataPath, fileUtils::indentJSON(json_encode($plugin)));
				}
			}
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
		public static function getSetting($tab, $setting) 
		{
			global $custom_settings, $custom_settings_dictionary;
			if (isset($custom_settings['data'][$tab]) && isset($custom_settings['data'][$tab]['settings'][$custom_settings_dictionary[$tab][$setting]])) {
				$settingInArray = $custom_settings['data'][$tab]['settings'][$custom_settings_dictionary[$tab][$setting]];
				$value = $settingInArray['value']; 
				if ($value === TRUE)	
					echo 'on';
				elseif ($value === FALSE)	
					echo 'off';
				elseif (isset($settingInArray['options']) && is_array($settingInArray['options']) && count($settingInArray['options'])) 
					echo $settingInArray['options'][$value];
				else 
					echo $value;
			}
		}
		
		/** Return a setting completely, or a setting's property
		 *  @param {string} $tab
		 *  @param {string} $setting
		 *  @param {string} $prop - if NULL, returns the entire setting, else must be one of the setting's properties
		 */
		public static function returnSetting($tab, $setting, $prop=NULL) 
		{
			global $custom_settings, $custom_settings_dictionary;
			if (isset($custom_settings_dictionary[$tab][$setting]))
				$settingInArray = $custom_settings['data'][$tab]['settings'][$custom_settings_dictionary[$tab][$setting]];
					
			if (isset($custom_settings['data'][$tab]) && isset($settingInArray)) {
				if (isset($prop) && $settingInArray[$prop]) 
					return $settingInArray[$prop];
				else
					return $settingInArray;
			}
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
					$settingInArray = $custom_settings['data'][$tab]['settings'][$custom_settings_dictionary[$tab][$setting]];
					if (is_string($newValue)) {
						$custom_settings['data'][$tab]['settings'][$custom_settings_dictionary[$tab][$setting]]['value'] = $newValue;
					}
					elseif (is_array($newValue)) {
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
		/** Filters (% setting: tab/setting %) text from Pages content 
		 *  Hook: content
		 */
		public static function contentFilter($content) {
			require_once(GSPLUGINPATH . 'custom_settings/filehandler.class.php');
			$regex = '#\(%\s*setting[:=]\s*(\w*[\/]*\w*)\s*%\)#';
			$new_content = html_entity_decode($content);
			preg_match_all($regex, $new_content, $matches, PREG_OFFSET_CAPTURE);
			if (!function_exists('func')) {
				function func($matches) {
					$jsonPath = fileUtils::splitPathArray($matches[1]);
					$result = return_setting($jsonPath[0], $jsonPath[1], 'value');
					return $result;
				};
			}
			$new_content = preg_replace_callback($regex, 'func', $new_content);
			return $new_content;
		}
		
		/** Loads plugin content in plugin custom tab
		 *  Hook: plugin init function in register_plugin
		 */
		public static function init() 
		{
		  self::createDataSubfolder();
			require_once(GSPLUGINPATH . 'custom_settings/filehandler.class.php');
			require_once(GSPLUGINPATH . 'custom_settings/gs.utils.php');
			global $LANG, $TEMPLATE, $SITEURL;
			$tmpl = GSPLUGINPATH . 'custom_settings/tmpl/';
		  echo file_get_contents(GSPLUGINPATH . 'custom_settings/tmpl/nav.html');
		  echo file_get_contents(GSPLUGINPATH . 'custom_settings/tmpl/main.html');
		  ?>
		  <br>
			<input type="button" class="submit" data-bind="click: fn.saveData" value="<?php i18n('BTN_SAVESETTINGS'); ?>"/>
		  <input type="hidden" id="path-lang"  value="<?php echo GSPLUGINPATH . 'custom_settings/lang/' . $LANG . '.json'; ?>">
		  <input type="hidden" id="path-handler"    value="<?php echo $SITEURL; ?>plugins/custom_settings/customsettings.handler.php">
		  <input type="hidden" id="site-template"    value="<?php echo strtolower($TEMPLATE); ?>">
		  <input type="hidden" id="edit-permission"    value="<?php echo self::getUserPermission(); ?>">
		  <input type="hidden" id="path-data"  value="<?php echo GSDATAOTHERPATH; ?>custom_settings/data.json">
		  <input type="hidden" id="request-token" value="<?php echo fileUtils::requestToken('kosstt'); ?>">
		  <script type="text/template" id="setting-list-tmpl"><?php echo file_get_contents($tmpl . 'setting-list.html'); ?></script>
		  <script type="text/template" id="setting-item-edit-tmpl"><?php echo file_get_contents($tmpl . 'setting-item-edit.html'); ?></script>
		  <script type="text/template" id="setting-item-manage-tmpl"><?php echo file_get_contents($tmpl . 'setting-item-manage.html'); ?></script>
		  <?php
		}
	/**
	 *  Creates a data folder in /data/other with necessary .htaccess and main data file
	 */
	private static function createDataSubfolder() 
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
	}
}
?>