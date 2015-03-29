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
}