// HERE IS THE DETAILED EXAMPLE SHOWING HOW TO ENCAPSULATE A CALLBACK-BASED
// FUNCTION TO MAKE A 'SYNCHRONOUS' FUNCTION
var getJSON = function*(url) {
    //ASK FOR A CALLBACK THAT CAN RESUME THE CURRENT THREAD
    var callback = yield (Thread.Resume);

    //THIS CURRENT THREAD WILL RESUME WHEN callback IS CALLED
    var req = $.getJSON(url, callback);

    //SUSPEND UNTIL RESUME CALLBACK IS EXECUTED
    var json = yield (Thread.suspend(req));

    //RETURN
    yield (json);
};//method

