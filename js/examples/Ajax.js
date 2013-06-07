/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


// IF THE CALLBACK-BASED FUNCTION USES success AND error, THEN JUST call() IT:
var ajax=function(param){
	yield Thread.call($.ajax, param);
};//method





