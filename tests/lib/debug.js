function GOOD(message) {
    $("body").append("<h2>Success: " + message + "</h2>");
}
function ERROR(message) {
    $("body").append("<h2>Failure: " + message + "</h2>");
}


if (!window.Log){
	Log = {};
	Log.error = function(mess, cause){
		console.error(mess);
		throw new Exception(mess, cause);
	};
	Log.alert = function(mess){
    Log.note("************************************************************\n" + mess + top);
	};
	Log.warning = console.warn;
	Log.note = function(v){console.log(v);};
}//endif

