<?php class GSutils {
	 /** register JS/CSS dependencies from KO->lib with standard GS functions queue_ and register_
	  *  @param {string} $plugin - Plugin base filename to compare to.
	  *  @param {array} $libs - Array of library enum arrays
	  */
	public static function registerLib($plugin, $libs) 
	{
		// only register if the plugin id = this plugin, so as not to change CSS of other pages
		if (isset($_REQUEST) && isset($_REQUEST['id']) && $_REQUEST['id'] === $plugin) {
			foreach ($libs as $key=>$lib) {
				if (strrpos($lib[0],'.js')) {
					register_script($key, $lib[0], $lib[1], $lib[2]);
				} else {
					register_style($key, $lib[0], $lib[1], $lib[2]);
				}
			}
			foreach ($libs as $key=>$lib) {
				if (strrpos($lib[0],'.js')) {
					queue_script($key, GSBACK);
				} else {
					queue_style($key, GSBACK);
				}
			}
		}
	}
	/** checks whether a given plugin is enabled in GS.
	 * @param {string} $name - Name of the plugin FILE!!
	 */
	public static function pluginIsActive($name) {
		global $live_plugins;
		$plugin = $live_plugins[strtolower($name . '.php')];
		if (isset($plugin) && $plugin === 'true')
			return true;
		return false;
	}
	/** Query data/uploads folder for image files
	 *  
	 */
	public static function getImageUploads($dir=GSDATAUPLOADPATH) {
		global $SITEURL;
		$files = array_diff(scandir($dir), array('.', '..'));
		$imgRegex = '#jpeg|jpg|gif|png|webp|bmp#';
		$path = $dir . '/';
		$result = array();
		$match = '';
	
		foreach ($files as $file) {
			$current = $path . $file;
			if (is_dir($current)) {		  
			  array_push($result, array('folder'=> $file, 'images' => self::getImageUploads($current)));
			} elseif (is_file($current) && preg_match($imgRegex, strtolower(substr($current, -4)), $match)) {
				$imgProps = getimagesize($current);
				$imgReturn = array(
					'name' => $file,
					'path' => str_replace(GSDATAUPLOADPATH, $SITEURL . 'data/uploads', $current),
					'size' => $imgProps[0] . ' x ' . $imgProps[1],
					'ext' => $match[0]
				);
			  array_push($result, $imgReturn);
			}
		}
		return $result;
	}
}