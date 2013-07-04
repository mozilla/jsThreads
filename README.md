jsThreads
=========

Cooperative "multithreading" in Javascript using generators


MOTIVATION
----------

I want to avoid callback hell.  Promises do a good job, but force you to manage
namespace by including parameters to your then() functions.  Threads have the
benefit of (local) namespace pollution.

BENEFITS
--------

**Multiple threads of control**

All the thrill of multi-threaded programming, with none of the race conditions,
deadlocking, or corrupted state you have from real threading.

**Procedural Style**

Functions can be written in familiar procedural style, instead of callback style.

**Threads are Objects**

Thread objects allow you to monitor peer thread state and interrupt peer threads.


BASIC FEATURES
--------------

**Create a New Thread**

    Thread.run(function(){
		//DO WORK
		yield (null);		//MUST HAVE "yield" IN FUNCTION
	});


**Synchronous Calling Style**

	Thread.run(function(){

		var a = yield (callServerForData());

		//DO WORK

		var b = yield (anotherCallToServer(a));

		//MORE WORK

		var c = yield (yetAnotherCall(b));

	});

**Wait for Thread to Complete**

	var t=Thread.run(function(){...});	//MAKE THREAD

	yield (Thread.join(t));				//WAIT TO FINISH
    
The ```join()``` method will return a structure (```{"threadResponse":value}```)
with the last value handled by the joinee thread.  This value is either the last
yielded value or a thrown exception.

**Sleep**

	yield (Thread.sleep(1000));  //JUST ONE SECOND
    
```sleep()``` can be interrupted with the ```kill()``` from another thread.

**Cooperate**

	yield (Thread.yield());            //LET OTHER THREADS RUN

A call to ```yield()``` may, or may not suspend, depending on the amount of time
that has passed since the last ```suspend()```


**Stop Thread Early**

	var t=Thread.run(function(){...});  //MAKE THREAD
	t.kill();                           //KILL IT (Interrupt)

Use this to ```abort()``` server requests or stop sleeping prematurely.  The
killed thread will then receive a ``Thread.Interrupt``` exception.
This exception can be caught just like any other.  It is important your code 
properly recognizes and handles this exception to shutdown cleanly.


DRAWBACKS
---------

Here are some of complications to look out for


**ONLY WORKS IN FIREFOX**

Generators have been around for a while, but other browsers (and js engines) do
not seem to implement them.  I hear Chrome has generators coming soon.


**MUST BE A GENERATOR**

A common mistake is to forget a "yield" in the function.  This will make
it appear as if nothing happens

  - **BAD:**

        Thread.run(function(){
            $("#message").html("Hi there");
        });

  
  - **GOOD:**
   
        Thread.run(function(){
            $("#message").html("Hi there");
            yield (null)
        });

**ACCIDENTALLY CALLING GENERATORS DIRECTLY**

With so many generators in your code, you may find yourself calling them like
normal functions.  This is bad.  These 'normal' functions return generator objects,
and do not fully execute on first call.   If you find your function is not
executing, this is probably the cause.

 - **BAD:**

        doSomeSetup();  //YOU CAN'T TELL, BUT THIS IS A GENERATOR.  IT WILL SEEM TO DO NOTHING


 - **GOOD:**

        yield (doSomeSetup());  //NOW IT WILL WORK



**HARD TO DEBUG**

Because ```Thread``` calls all generators directly, it can be impossible to see the
stack trace you expect.

Avoid this problem by keeping your threaded code from making deep threaded calls.
If you need deep logic, it is better implemented with regular functions, called by
the threaded code.



**IMPOSSIBLE STATES WITH DEBUGGER**

When your debugger is on, and you have your code paused, AND there are pending
responses, all bets are off.  The pending response will trigger the javascript
engine to run despite the debugger, and mess with your program state.

This happens with any javascript program, but just be aware your program can be
achieve "impossible" states when you are debugging.



**CAN NOT USE JS FUNCTORS**

You must pass a generator to ```Thread.run()```.  Javascript's functor style can prevent
elegant threaded code:

  - **BAD:**

        Thread.run(function(){
            $.each(array, function(item){
                yield (callBackToServer())  //YIELD IS IN NESTED ANONYMOUS FUNCTION
            });
        });

  - **GOOD:**

        Thread.run(function(){
            for(var i=0;i<array.length;i++){
                yield (callBackToServer())	//YIELD IS PART OF PASSED FUNCTION
            };
        });

  - **BETTER? (it depends**)

        $.each(array, function(item){
            Thread.run(function(){
                yield (callBackToServer()) //YIELD IS PART OF PASSED FUNCTION
            });
        });




    