<?php 
if (!class_exists('customSettings')) {

	class customSettings {
	
		private static $defaultJSON = '{"site": []}';
		
		
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
		
		/** Theme CSS Filter (% setting: tab/setting %) text from Pages content 
		 *  Not used yet
		 */
		public static function styleSheetFilter($data) {
			require_once(GSPLUGINPATH . 'custom_settings/filehandler.class.php');
			$path = GSTHEMESPATH . $TEMPLATE . '/dynamic.css';
			$content = file_get_contents($path);
			$regex = '#\(%\s*(\w*[\/]*\w*)\s*%\)#';
			$new_content = preg_replace_callback($regex, array('self', 'contentReplaceCallback'), $content);
			return $new_content;
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
			global $custom_settings, $custom_settings_dictionary;
			$tab = $tab === 'theme' ? 'theme_settings' : $tab;
			if (isset($custom_settings['data'][$tab]) && isset($custom_settings['data'][$tab]['settings'][$custom_settings_dictionary[$tab][$setting]])) {
				$settingInArray = $custom_settings['data'][$tab]['settings'][$custom_settings_dictionary[$tab][$setting]];
				$value = $settingInArray['value']; 
				$returnValue = '';
				if ($value === TRUE)	
					$returnValue = 'on';
				elseif ($value === FALSE)	
					$returnValue = 'off';
				elseif (isset($settingInArray['options']) && is_array($settingInArray['options']) && count($settingInArray['options'])) 
					$returnValue = $settingInArray['options'][$value];
				elseif ($settingInArray['type'] === 'image')
					$returnValue = '<img src="' . $value . '" alt="' . $settingInArray['label'] . '">';
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
		 *  @param {string} $prop - if NULL, returns the entire setting, else must be one of the setting's properties
		 */
		public static function returnSetting($tab, $setting, $prop=NULL) 
		{
			global $custom_settings, $custom_settings_dictionary;
			$tab = $tab === 'theme' ? 'theme_settings' : $tab;
			if (isset($custom_settings_dictionary[$tab][$setting]))
				$settingInArray = $custom_settings['data'][$tab]['settings'][$custom_settings_dictionary[$tab][$setting]];
					
			if (isset($custom_settings['data'][$tab]) && isset($settingInArray)) {
				if (isset($prop)) {
					if (isset($settingInArray[$prop])) 
						return $settingInArray[$prop];
					return;
				}
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
			$regex = '#\(%\s*setting[:=]\s*(\w*[\/]*\w*)\s*%\)#';
			$new_content = html_entity_decode($content);
			// is below line required?
			preg_match_all($regex, $new_content, $matches, PREG_OFFSET_CAPTURE);
			$new_content = preg_replace_callback($regex, array('self', 'contentReplaceCallback'), $new_content);
			return $new_content;
		}
		
		/** Loads plugin content in plugin custom tab
		 *  Hook: plugin init function in register_plugin
		 */
		public static function init() 
		{
			require_once(GSPLUGINPATH . 'custom_settings/filehandler.class.php');
			require_once(GSPLUGINPATH . 'custom_settings/gs.utils.php');
			global $LANG, $TEMPLATE, $SITEURL, $mu_active;
			$tmpl = GSPLUGINPATH . 'custom_settings/tmpl/';
		  echo file_get_contents(GSPLUGINPATH . 'custom_settings/tmpl/nav.html');
		  echo file_get_contents(GSPLUGINPATH . 'custom_settings/tmpl/main.html');
		  ?>
		  <br>
			<input type="button" class="submit" data-bind="click: fn.saveData" value="<?php i18n('BTN_SAVESETTINGS'); ?>"/>
		  <input type="hidden" id="path-lang"  value="<?php echo GSPLUGINPATH . 'custom_settings/lang/' . $LANG . '.json'; ?>">
		  <input type="hidden" id="path-handler"    value="<?php echo $SITEURL; ?>plugins/custom_settings/customsettings.handler.php">
		  <input type="hidden" id="site-template"    value="<?php echo strtolower($TEMPLATE); ?>">
		  <input type="hidden" id="edit-permission"    value="<?php echo $mu_active ? self::mu_getUserPermission() : self::getUserPermission(); ?>">
		  <input type="hidden" id="path-data"  value="<?php echo GSDATAOTHERPATH; ?>custom_settings/data.json">
		  <input type="hidden" id="request-token" value="<?php echo fileUtils::requestToken('kosstt'); ?>">
		  <script type="text/template" id="setting-list-tmpl"><?php echo file_get_contents($tmpl . 'setting-list.html'); ?></script>
		  <script type="text/template" id="setting-item-edit-tmpl"><?php echo file_get_contents($tmpl . 'setting-item-edit.html'); ?></script>
		  <script type="text/template" id="setting-item-manage-tmpl"><?php echo file_get_contents($tmpl . 'setting-item-manage.html'); ?></script>
		  <script type="text/javascript">
		    window.i18nJSON = <?php echo file_get_contents(GSPLUGINPATH . 'custom_settings/lang/' . $LANG . '.json'); ?>;
		  </script>
		  <?php
		}
		
		//////////////////////////////////////////////////////////////////////////
		//                                                                      //
		//                               Other                                  //
		//                                                                      //
		//////////////////////////////////////////////////////////////////////////
		
		/** Automatic Upgrade from v0.1
		 *  
		 */
		public static function upgradeFromAlpha() 
		{
			require_once(GSPLUGINPATH . 'custom_settings/filehandler.class.php');
			$oldDataDir = GSDATAOTHERPATH . 'ko_data/';
			$oldKODir = GSPLUGINPATH . 'ko_base/';
			$oldPluginDir = GSPLUGINPATH . 'ko_site_settings/';
			$oldPluginFile = GSPLUGINPATH . 'ko_site_settings.php';
			
			if (is_dir($oldKODir))
				self::deleteDir($oldKODir);
			if (is_dir($oldPluginDir)) 
				self::deleteDir($oldPluginDir);
			if (file_exists($oldPluginFile)) 
				unlink($oldPluginFile);
			if (file_exists($oldDataDir . 'ko_site_settings/data.json')) {
				$newData = array('site' => array());
				$oldData = json_decode(file_get_contents($oldDataDir . 'ko_site_settings/data.json'), TRUE);
				if (isset($oldData['data']['settings']) && count($oldData['data']['settings'])) {
					foreach ($oldData['data']['tabs'] as $tab) {
						array_push($newData['site'], 
							array(
								'tab' => array(
									'lookup' => $tab['lookup'], 
									'label' => $tab['label']
								),
								'settings' => array()));
							foreach ($oldData['data']['settings'] as $setting) {
							  if ($tab['lookup'] === $setting['tab']) {
									unset($setting['id']);
									unset($setting['tab']);
									array_push($newData['site'][count($newData['site'])-1]['settings'],  $setting);
							  }
							}
						}
						file_put_contents(GSDATAOTHERPATH . 'custom_settings/data.json', fileUtils::indentJSON(json_encode($newData)));
					} 
				}
			self::deleteDir($oldDataDir);
		}
		/** Remove a directory with all nested files
		 *  Thanks to http://stackoverflow.com/questions/3349753/delete-directory-with-files-in-it#answer-3349792
		 */
		public static function deleteDir($dirPath) {
			if (is_dir($dirPath)) {
	    if (substr($dirPath, strlen($dirPath) - 1, 1) != '/') {
	      $dirPath .= '/';
	    }
	    $files = array_diff(scandir($dirPath), array('.', '..'));
	    foreach ($files as $file) {
	      if (is_dir($dirPath . $file)) {
	        self::deleteDir($dirPath . $file);
	      } else {
	        unlink($dirPath . $file);
	      }
	    }
	    rmdir($dirPath);
	    }
		}
		/** Debugging
		 *  @param {string} [$testName] - (Optional) Testname
		 *  @param {array} $func - array('namespace', 'method') or 'functionName'
		 *  @param {array} $params - Array with parameters for the function
		 *  @param {string} $expect - Expected output
		 */
		public static function itShould($testName='', $func, $params, $expect) 
		{
			$output = '<table><tr><td><strong>' . $testName . '</strong></td></tr>';
			$output .= '<tr><td>Function: customSettings::' . (is_array($func) ? $func[1] : $func) . '(' . implode(',', $params) . ')</td></tr>';
			$output .= '<tr><td>Expects: <strong>' . $expect . '</strong></td><td><strong style="color: ' . (call_user_func_array($func, $params) === $expect ? 'green;">Succeeded' : 'red;">Failed');
			$output .= '</strong></td></tr></table>';
			echo $output;
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
				'fileSaver'        => array($SITEURL . 'plugins/custom_settings/js/FileSaver.js',        '1',FALSE),
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
	}
}
?>