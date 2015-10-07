<?php 
	/** The sole purpose of this file is to concatenate common setting template parts
	 *  so as to alleviate the work required to be done by KnockoutJS in the browser
	 *  Use it simply by activating the local server and navigating to this directory
	 */
	function concatTemplates() {
		$outputDir = '../GetSimpleCMS-3.3.5/plugins/custom_settings/tmpl/'; // set this to the custom_settings plugin dir in your local install
		$placeholder = '-------------------';                     // placeholder used in HTML template files
		$modes = array(                                           // HTML file list; section-title excluded because no build is required,
			'edit' => array(                                        // others excluded because they share the same template
				'base',
				'text',
				'textarea',
				'switch',
				'checkbox',
				'radio',
				'select'
			),
			'manage' => array(
				'text',
				'textarea',
				'switch',
				'checkbox',
				'icon-checkbox',
				'radio',
				'icon-radio',
				'select',
				'color',
				'image',
				'date'
			)
		);
		$finals = array('edit' => array(), 'manage' => array());
		$final = '';
		foreach($modes as $mode => $files) {
			$sourceDir = getcwd() . '/src/' . $mode . '/';
			$buildDir  = getcwd() . '/build/' . $mode . '/';
			$common = file_get_contents($sourceDir . 'common.html');  // setting template base (contains placeholder)
			foreach($files as $file) {
				$fileExt = $sourceDir . $file . '.html';
				$fileC = file_get_contents($fileExt);
				$newC = str_replace($placeholder, $fileC, $common);
				$sContent = preg_replace('~\s+~', ' ',  $newC);
				$final .= '<script type="text/template" id="' . $file . '-' . $mode . '">' . $sContent . '</script>';
				file_put_contents($buildDir . $file . '.html', $newC);
			}
			// for section-title template, simply copy the file to the build dir
			file_put_contents($buildDir . 'section-title.html', file_get_contents($sourceDir . 'section-title.html'));
			$final .= '<script type="text/template" id="section-title-' . $mode . '">' . preg_replace('~\s+~', ' ', file_get_contents($sourceDir . 'section-title.html')) . '</script>';
		}
		file_put_contents($outputDir . 'setting-templates.html', $final);
	}
	concatTemplates();
?>