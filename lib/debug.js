
function GOOD(message){
	$("body").append("<h2>Success: "+message+"</h2>");
}
function ERROR(message){
	$("body").append("<h2>Failure: "+message+"</h2>");
}



D={};
D.error=console.error;
D.warning=console.warn;


