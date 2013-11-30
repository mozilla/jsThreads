/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */




var NUM_IMAGES=5;


// PUT FLICKR IMAGES INTO A ROW OF A TABLE
function displayImages(data, tag) {
	var html="<tr><td>"+tag+"</td>"+$.map(data.items, function(item, i){
		if (i>NUM_IMAGES) return "";

		var img = (item.media.m).replace("_m.jpg", "_s.jpg");
		return '<td><a href="' + item.link + '">'+
				'<img src="' + img + '"/>'+
				'</a></td>';
	})+"</tr>";
	$('#images').append(html);
}
