jsThreads
=========

Cooperative "multithreading" in Javascript using generators


Motivation
----------

I want to avoid callback hell.  Promises do a good job, but force you to manage
namespace by including parameters to your then() functions.  Threads have the
benefit of (local) namespace pollution.

Benefits
--------

**Multiple threads of control**

All the thrill of multi-threaded programming, with none of the race conditions,
deadlocking, or corrupted state you have from real threading.

**Procedural Style**

Functions can be written in familiar procedural style, instead of callback style.

**Threads are Objects**

Thread objects allow you to monitor peer thread state and interrupt peer threads.


Features
--------

**Create a New Thread**

    Thread.run(function*(){
        //DO WORK
	});


**Synchronous Calling Style**

	Thread.run(function*(){
		var a = yield (requestDataFromServer());
		//DO WORK
		var b = yield (anotherRequestToServer(a));
		//MORE WORK
		var c = yield (yetAnotherRequest(b));
	});

**Wait for Thread to Complete**

	var t=Thread.run(function*(){...});	//MAKE THREAD
	yield (Thread.join(t));				//WAIT TO FINISH

The ```join()``` function will return a structure (```{"threadResponse":value}```)
with the last value handled by the joinee thread.  This value is either the last
yielded value or a thrown exception.

Joining a thread will demand all child threads are joined too.

**Sleep**

	yield (Thread.sleep(1000));  //JUST ONE SECOND

```sleep()``` can be interrupted with the ```kill()``` from another thread.

**Cooperate**

When performing long running operations on the main thread, it is a good idea to
occasionally yield control to the other tasks and threads waiting to run.

	yield (Thread.yield());            //LET OTHER THREADS RUN

A call to ```yield()``` may, or may not suspend, depending on the amount of time
that has passed since the last ```suspend()```

The ```Thread.yield()``` call is a little slow:  The call defers to the
trampoline, which calls Thread.yield(), which returns a generator, which is then
called by the trampoline, which returns the Thread.YIELD constant, which reminds
the trampoline to check if it's time to yield to another task.  It is more
direct to simply provide the constant:

    yield (Thread.YIELD);              //LET OTHER THREADS RUN

Admittedly, this breaks the standard ```yield (functionCall())``` form.

**Stop Thread Early**

	var t=Thread.run(function*(){...});  //MAKE THREAD
	t.kill();                           //KILL IT (Interrupt)

Use this to ```abort()``` server requests or stop sleeping prematurely.  The
killed thread will then receive a ``Thread.Interrupt``` exception.
This exception can be caught just like any other.  It is important your code
properly recognizes and handles this exception to shutdown cleanly.

Killing a thread will also kill all children, which can include ajax requests
and other scheduled processing.

**Adding Children**

    myThread.addChild({"kill":function(){...}})

Child threads are added automatically to the ```Thread.currentThread``` when
a thread is made.  You are not limited to Threads: Any object that
has  a ```kill``` or ```abort``` function can be added.



**Suspend/Resume Threads**

You will inevitably require your threads interact with other callback-style
Javascript libraries.  To do this without busy waiting you need to *suspend*
and *resume* your threads. [JSONP.js](./examples/JSONP.js) is an example of
how to achieve this:

    var getJSON = function*(url) {
        //ASK FOR A CALLBACK THAT CAN RESUME THE CURRENT THREAD
        var callback = yield (Thread.Resume);

        //THIS CURRENT THREAD WILL RESUME WHEN callback IS CALLED
        var req = $.getJSON(url, callback);

        //SUSPEND UNTIL RESUME CALLBACK IS EXECUTED
        var json = yield (Thread.suspend(req));

        //RETURN
        yield (json);
    };//function

The idea is to ask the jsThreads system for a resume function:  When called,
this function will resume the current thread.  In this case, the resume function
is used as a callback and fed into a familiar JQuery call.  Your final step is
to suspend the thread and trust the resume function is eventually called.  When
the thread does resume, the first argument of the resume function (the callback)
will be accessible as a yielded value.

**AJAX**

The AJAX callback style (with its success() and error() callbacks) is pervasive.
Use the ```Thread.call()``` function to specifically provide these callbacks,
yield the success() argument, and throw an exception if error() is called.
[Ajax.js](.examples/Ajax.js) is a example of how to use it:

    var ajax = function*(param) {
        yield Thread.call($.ajax, param);
    };//function


Drawbacks
---------

Here are some of complications to look out for

####Only Works in Firefox (and Chrome with experimental javascript on)####

Generators have been around for a while, but other browsers (and js engines) have only
started to implement them.  To use generators in Chrome enable
[experimental javascript](chrome://flags/#enable-javascript-harmony).

####Must be a Generator####

A common mistake is to forget the star (*) in the function definition.  This will make
it appear as if nothing happens

  - **BAD:**

        Thread.run(function(){
            $("#message").html("Hi there");
        });


  - **GOOD:**

        Thread.run(function*(){
            $("#message").html("Hi there");
        });

####Accidentally Calling Generators Directly####

With so many generators in your code, you may find yourself calling them like
normal functions.  This is bad.  These 'normal' functions return generator objects,
and do not fully execute on first call.   If you find your function is not
executing, this is probably the cause.

 - **BAD:**

        doSomeSetup();  //YOU CAN'T TELL, BUT THIS IS A GENERATOR.  IT WILL SEEM TO DO NOTHING


 - **GOOD:**

        yield (doSomeSetup());  //NOW IT WILL WORK

####Hard to Debug####

Because ```Thread``` calls all generators directly, it can be impossible to see the
stack trace you expect.

Avoid this problem by keeping your threaded code from making deep threaded calls.
If you need deep logic, it is better implemented with regular functions, called by
the threaded code.

####Impossible States with Debugger####

When your debugger is on, AND you have your code paused, AND there are pending
responses, all bets are off.  The pending response will trigger the javascript
engine to run despite the debugger, and mess with your program state.

This happens with any javascript program, but just be aware your program can be
achieve *impossible* states when you are debugging.

####Can not us JS Functors####

You must pass a generator to ```Thread.run()```.  Javascript's functor style can prevent
elegant threaded code:

  - **BAD:**

        Thread.run(function*(){
            $.each(array, function(item){
                yield (callBackToServer())  //YIELD IS IN NESTED ANONYMOUS FUNCTION
            });
        });

  - **GOOD:**

        Thread.run(function*(){
            for(var i=0;i<array.length;i++){
                yield (callBackToServer())	//YIELD IS PART OF PASSED FUNCTION
            };
        });

  - **BETTER?** (it depends)

        $.each(array, function(item){
            Thread.run(function*(){
                yield (callBackToServer()) //YIELD IS PART OF PASSED FUNCTION
            });
        });




