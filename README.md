jsThreads
=========

Cooperative multithreading in Javascript using generators


MOTIVATION
----------

I want to avoid callback hell.  Promises do a good job, but force you to manage
namespace by including parameters to your then() functions.  Threads have the
benefit of (local) namespace pollution.

BENEFITS
--------

All the thrill of multi-threaded programming, with none of the race conditions,
deadlocking, or corrupted state you have from real threading.





BASIC FEATURES
--------------
<dl>


<dt>Create a New Thread</dt>
<dd>

	Thread.run(function(){
		//DO WORK
		yield (null);		//MUST HAVE "yield" IN FUNCTION
	});
</dd>


<dt>Synchronous Calling Style</dt>
<dd>

	Thread.run(function(){

		var a = yield (callServerForData());

		//DO WORK

		var b = yield (anotherCallToServer(a));

		//MORE WORK

		var c = yield (yetAnotherCall(b));

	});
</dd>

<dt>Wait for Thread to Complete</dt>
<dd>
	var t=Thread.run(function(){...});

	yield (Thread.join(t));
</dd>
<dt>Sleep</dt>
<dd>
	yield (Thread.sleep(1000));  //JUST ONE SECOND
</dd>

<dt>Cooperate</dt>
<dd>
	yield (Thread.yield());		//LET OTHER THREADS RUN
</dd>


<dt>Stop Thread Early</dt>
<dd>

	var t=Thread.run(function(){...});
	Thread.kill(t);
</dd>

</dl>





DRAWBACKS:
==========

Here are some of complicatoins to lok out for



MUST BE A GENERATOR

A common mistake is to not include a "yield" in the function.  This will make
it appear as if nothing happens

BAD:
	Thread.run(function(){
		$("#message").html("Hi there");
	});

GOOD:
	Thread.run(function(){
		$("#message").html("Hi there");
		yield (null)
	});




ACCIDENTALLY CALLING GENERATORS DIRECTLY

With so many generators in your code, you may find yourself calling them like
normal functions.  This is bad.  These 'normal' functions return generator objects,
and do not fully execute on first call.   If you find your function is not
executing, this is probably the cause.

BAD:
	doSomeSetup();  //YOU CAN'T TELL, BUT THIS IS A GENERATOR.  IT WILL SEEM TO DO NOTHING

GOOD:
	yield (doSomeSetup());  //NOW IT WILL WORK



HARD TO DEBUG

Because Thread calls all generators directly, it can be impossible to see the
stack trace you expect.

Avoid this problem by keeping your threaded code from making deep threaded calls.
If you need deep logic, it is better implemented with regular functions, called by
the threaded code.


SCREWS WITH DEBUGGER

When your debugger is on, and you have your code paused, AND there are pending
responses, all bets are off.  The pending request will trigger the javascript
engine to run despite the debugger, and mess with your program state.

This happens with any javascript program, but just be aware your program can be
achieve "impossible" states when you are debugging.



CAN NOT USE JS FUNCTORS

You must pass a generator to Thread.run().  Javascript's functor style can prevent
elegant threaded code:

BAD:
----
	Thread.run(function(){
		$.each(array, function(item){
			yield (callBackToServer())  //YIELD IS IN NESTED ANONYMOUS FUNCTION
		});
	});

GOOD:
-----
	Thread.run(function(){
		for(var i=0;i<array.length;i++){
			yield (callBackToServer())
		};
	});

BETTER? (it depends):
---------------------
	$.each(array, function(item){
		Thread.run(function(){
			yield (callBackToServer())  //YIELD IS IN NESTED ANONYMOUS FUNCTION
		});
	});




