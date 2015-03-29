<?php 
if (!class_exists('fileUtils')) {

	class fileUtils {
	
		/**
		 *  Request encoded user PWD token combined with a prefix for extra security when handling AJAX calls
		 */
		public static function requestToken($prefix) {
		  global $USR;
		  $userdata = (array)getXML(GSUSERSPATH . $USR . '.xml');
		  return ($prefix ? $prefix : '') . $userdata['PWD'];
		}
		/**
		 *  @param {string|array} $array - A delimiter-separated string or an array
		 *  @param {string} $delimiter='/' - The delimiter to split the string on
		 *  return array of child path strings
		 */
		public static function splitPathArray($array, $delimiter='/') 
		{
			if (is_string($array)) 
				return explode($delimiter, $array);
			elseif (is_array($array)) 
				return $array;
		}
		/**
		 *  @param {string} $path - Path to retrieve a file from
		 *  @param {array} $subpath - Path from file root to JSON property/ index
		 *  @param {boolean} $debug - If true, echos output to page for debug purposes
		 *  return JSON file/ property in JSON file
		 */
	  public static function getJSON($path, $subpath=NULL, $echo=FALSE) 
	  {
	    if (file_exists($path)) {
	    $contents = file_get_contents($path);
	    $output = json_decode($contents, TRUE);
	    $subpath = self::splitPathArray($subpath); 
	      // get JSON subpath
	      if ($subpath && is_array($subpath)) {
		      $i = 0;
		      while (isset($subpath[$i])) {
		        // return false if property/index doesn't exist
		        if (!isset($output[$subpath[$i]])) {
		          $output = FALSE;
		          break;
		        }
		        $output = $output[$subpath[$i]]; 
		        $i++;
		      }
	      }
	      // return/output
		    if ($echo === FALSE)
		      return $output;
		    elseif ($echo === TRUE)
		      echo $output;
	    } 
	  }
		/**
		 *  (If last 'path' item is -1, the item will be pushed into an array)
		 *  @param $data - Any type of data to set (array, assoc array, string, number, boolean)
		 *  @param {string} $path - Path to retrieve a file from
		 *  @param {array} $subpath - Path from JSON file root to JSON property/ index
		 *  @param {boolean} $debug - If true, prints the contents normally outputted to the JSON file
		 *  return saved JSON output
		 */
	  public static function setJSON($data, $path, $subpath=NULL, $debug=FALSE) 
	  {
	    if (file_exists($path)) {
	      $contents = file_get_contents($path);
	      $output = json_decode($contents, TRUE);
	    } else {
		    $output = array();
		  }
	    $subpath = self::splitPathArray($subpath); 
	    if ($subpath && is_array($subpath)) {
		    $i = 0;
		    $currentPath = &$output;
		    // this was kind of complicated to figure out =/
				while(isset($subpath[$i])) {
					if ($subpath[$i] !== -1) {
						if (!isset($currentPath[$subpath[$i]]))
							$currentPath[$subpath[$i]] = array();
						$currentPath = &$currentPath[$subpath[$i]];
					} elseif (is_array($currentPath)) {
						$currentPath = &$currentPath[count($currentPath)]; }
					$i++;
				}
				$currentPath = $data;
		  }
		  $output = self::indentJSON(json_encode($output));
		  if ($debug)
	      print_r($output);
	    else 
	      file_put_contents($path, $output);
	  }
		// TODO: log change: Added indentJSON function
		/**
		* Indents a flat JSON string to make it more human-readable.
		* Credits to http://www.daveperrett.com/articles/2008/03/11/format-json-with-php/, Dimitri Gryanko (comments)
		* @param string $json The original JSON string to process.
		* @return string Indented version of the original JSON string.
		*/
		public static function indentJSON($json)
		{
		$result = '';
		$pos = 0;
		$strLen = strlen($json);
		$indentStr = "\t";
		$newLine = "\n";
		
		for ($i = 0; $i < $strLen; $i++) {
			// Grab the next character in the string.
			$char = $json[$i];
			// Are we inside a quoted string?
			if ($char == '"') {
				// search for the end of the string (keeping in mind of the escape sequences)
				if (!preg_match('`"(\\\\\\\\|\\\\"|.)*?"`s', $json, $m, null, $i))
					return $json;
				// add extracted string to the result and move ahead
				$result .= $m[0];
				$i += strLen($m[0]) - 1;
				continue;
			}
			else if ($char == '}' || $char == ']') {
				$result .= $newLine;
				$pos --;
				$result .= str_repeat($indentStr, $pos);
			}
			// Add the character to the result string.
			$result .= $char;
			// If the last character was the beginning of an element,
			// output a new line and indent the next line.
			if ($char == ',' || $char == '{' || $char == '[') {
				$result .= $newLine;
				if ($char == '{' || $char == '[') {
					$pos ++;
				}
				$result .= str_repeat($indentStr, $pos);
			}
		}
		return $result;
		}
	}
}
?>