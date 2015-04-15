<?php if (isset($_REQUEST) && isset($_REQUEST['id']) && isset($_REQUEST['requestToken'])) {
	
		require_once('../../admin/inc/common.php');
		require_once('filehandler.class.php');
		require_once('customsettings.class.php');
		require_once('../../admin/inc/plugin_functions.php');
		
		global $USR, $i18n, $custom_settings, $custom_settings_dictionary;
		
		$token = $_REQUEST['requestToken'];
		$id = $_REQUEST['id'];
		$getToken = fileUtils::requestToken('kosstt');
		if ($token === $getToken) {
			if (isset($_REQUEST['action']) && isset($_REQUEST['path'])) {
				$path = urldecode($_REQUEST['path']);
				$data = isset($_REQUEST['data']) ? $_REQUEST['data'] : NULL;
				switch($_REQUEST['action']) {
					case 'loadImageBrowser':
						echo json_encode(GSutils::getImageUploads());
						break;
					case 'getI18NFile':
						echo json_encode($i18n);
						break;
					case 'getDataFile':
						exec_action('custom-settings-load');
						echo json_encode($custom_settings);
						break;
					case 'saveData':
						customSettings::saveAllSettings($data);
						exec_action('custom-settings-save');
						break;
					default: 
						echo 'The data could not be loaded from the server';
				}
			}
		}
	} else
		die('You are not allowed to access this page directly');