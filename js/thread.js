////////////////////////////////////////////////////////////////////////////////
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
////////////////////////////////////////////////////////////////////////////////
// Author: Kyle Lahnakoski  (kyle@lahnakoski.com)
////////////////////////////////////////////////////////////////////////////////



//INSPIRED FROM  https://github.com/airportyh/trampoline.js/blob/master/6_add_exception.html

var Thread;

build=function(){
	var DEBUG=false;
	var FIRST_BLOCK_TIME = 500;	//TIME UNTIL YIELD
	var NEXT_BLOCK_TIME = 150;	//THE MAXMIMUM TIME (ms) A PIECE OF CODE SHOULD HOG THE MAIN THREAD
	var YIELD = {"name":"yield"};  //BE COOPERATIVE, WILL PAUSE EVERY MAX_TIME_BLOCK MILLISECONDS

	//Suspend CLASS
	var Suspend = function(request){
		this.name="suspend";
		this.request=request;
	};
	Suspend.name="suspend";

	var dummy={"close":function(){}};//DUMMY GENERATOR

	Thread = function(gen){
		if (typeof(gen) == "function"){
            try{
                gen = gen();	//MAYBE THE FUNCTION WILL CREATE A GENERATOR
                if (String(gen) !== '[object Generator]'){
                    Log.error("You can not pass a function.  Pass a generator! (have function use the yield keyword instead)");
                }//endif
            }catch(e){
                Log.error("Expecting a Generator!", e);
            }//endif
        }//endif
		this.parentThread = Thread.currentThread;

		this.keepRunning = true;
		this.gen = null;    //CURRENT GENERATOR
		this.stack = [gen];
		this.nextYield = new Date().getTime() + FIRST_BLOCK_TIME;
		this.children = [];
	};

	//YOU SHOULD NOT NEED THESE UNLESS YOU ARE CONVERTING ASYNCH CALLS TO SYNCH CALLS
	//EVEN THEN, MAYBE YOU CAN USE Thread.call
	Thread.Resume = {"name":"resume"};
	Thread.Interrupted = new Exception("Interrupted");

	Thread.run = function(name, gen){
		if (typeof(name) != "string"){
			gen = name;
			name = undefined;
		}//endif

		var output = new Thread(gen);
		output.name = name;
		output.start();
		return output;
	};//method


	//FEELING LUCKY?  MAYBE THIS GENERATOR WILL NOT DELAY AND RETURN A VALID VALUE BEFORE IT BLOCKS
	//YOU CAN HAVE IT BLOCK THE MAIN TREAD FOR time MILLISECONDS
	Thread.runSynchronously = function(gen, time){
		if (String(gen) !== '[object Generator]'){
			Log.error("You can not pass a function.  Pass a generator! (have function use the yield keyword instead)");
		}//endif

		var thread = new Thread(gen);
		if (time !== undefined){
			thread.nextYield = new Date().getTime() + time;
		}//endif
		var result = thread.start();
		if (result === Suspend)
			Log.error("Suspend was called while trying to synchronously run generator");
		return result.threadResponse;
	};//method


	Thread.getStackTrace = function(depth){
		var trace;
		try{
			this.undef();  //deliberate error
		} catch(e){
			trace = e.stack.replace(/(?:\n@:0)?\s+$/m, '').replace(/^[\(@]/gm, '{anonymous}()@').split('\n');
		}//try
		return trace.slice(depth + 1);
	};//method


	var mainThread = {"name":"main thread", "children":[]};
	Thread.currentThread = mainThread
	Thread.isRunning = [];

	//REPLACE THESE WHEN YOU WANT SIGNALS ABOUT WORKING THREADS
	Thread.showWorking=function(){};
	Thread.hideWorking=function(){};


	Thread.prototype.start = function(){
		Thread.isRunning.push(this);
		this.parentThread = Thread.currentThread;
		this.parentThread.children.push(this);
		Thread.showWorking();
		return this.resume(this.stack.pop());
	};


	function Thread_prototype_resume(retval){
		Thread.showWorking();
		while(this.keepRunning){
			if (String(retval) === '[object Generator]'){
				this.stack.push(retval);
				retval = undefined
			} else if (retval === YIELD){
				if (this.nextYield < new Date().getTime()){
					var self_ = this;
//				this.stack.push(this.gen);
//				this.stack.push({"close":function(){}}); //DUMMY VALUE
					setTimeout(function(){
						self_.nextYield = new Date().getTime() + NEXT_BLOCK_TIME;
						self_.currentRequest = undefined;
						self_.resume();
					}, 1);
					return Suspend;
				}//endif
			} else if (retval instanceof Suspend){
				this.currentRequest = retval.request;
				if (!this.keepRunning) this.kill(new Exception("thread aborted"));
				this.stack.pop();//THE suspend() CALL MUST BE REMOVED FROM STACK
				if (this.stack.length==0)
					Log.error("Should not happen");
				return Suspend;
			} else if (retval === Thread.Resume){
				var self = this;
				retval = function(retval){
					self.nextYield = new Date().getTime() + NEXT_BLOCK_TIME;
					self.currentRequest = undefined;
					self.resume(retval);
				};
			} else{ //RETURNING A VALUE/OBJECT/FUNCTION TO CALLER
                var g = this.stack.pop();
                if (g.close!==undefined)
                    g.close(); //ONLY HAPPENS WHEN EXCEPTION IN THREAD IS NOT CAUGHT

				if (this.stack.length == 0){
					return this.shutdown(retval);
				}//endif
			}//endif

			try{

				this.gen = this.stack[this.stack.length-1];
				if (this.gen.history === undefined) this.gen.history = [];

				Thread.currentThread = this;

				if (retval instanceof Exception){
                    result = this.gen.throw(retval);  //THROW METHOD OF THE GENERATOR IS CALLED, WHICH IS SENT TO CALLER AS thrown EXCEPTION
				} else{
					result = this.gen.next(retval)
				}//endif
                retval=result.value;

				Thread.currentThread = mainThread;
			} catch(e){
				Thread.currentThread = mainThread;

				if (e instanceof Exception){
					retval = e;
				} else{
					retval = new Exception("Error", e);
				}//endif
			}//try
		}//while
		//CAN GET HERE WHEN THREAD IS KILLED AND Thread.Resume CALLS BACK
		this.kill(retval);
	}

	Thread.prototype.resume = Thread_prototype_resume;

	//THIS IS A MESS, CALLED FROM DIFFERENT LOCATIONS, AND MUST DISCOVER
	//CONTEXT TO RUN CORRECT CODE
	Thread.prototype.kill = function(retval){
		//HOPEFULLY cr WILl BE UNDEFINED, OR NOT, (NOT CHANGING)
		var cr = this.currentRequest;
		this.currentRequest = undefined;

		if (cr !== undefined){
			//SOMETIMES this.currentRequest===undefined AT THIS POINT (LOOKS LIKE REAL MUTITHREADING?!)
			try{
				if (cr.kill){
					cr.kill();
				}else if (cr.abort){
					cr.abort();
				}//endif
			} catch(e){
				Log.error("kill?", cr)
			}//try
		}//endif


		if (this.stack.length>0){
			this.stack.push(dummy); //TOP OF STACK IS THE RUNNING GENERATOR, THIS kill() CAME FROM BEYOND
			this.resume(Thread.Interrupted);
			if (this.stack.length>0)
				Log.error("Why does this Happen?");
			return;
		}//endif
		this.threadResponse = retval;				//REMEMBER FOR THREAD THAT JOINS WITH THIS
		this.keepRunning = false;


		this.parentThread.children.remove(this);
		Thread.isRunning.remove(this);

		if (Thread.isRunning.length == 0){
			Thread.hideWorking();
		}//endif

		for(var i = this.stack.length; i--;){
			try{
				this.stack[i].close();
			} catch(e){

			}//try
		}//for
		this.stack = [];
	};

	//ASSUME THERE IS NO MORE STUFF FOR THREAD TO DO
	Thread.prototype.shutdown = function(retval){
		this.threadResponse = retval;				//REMEMBER FOR THREAD THAT JOINS WITH THIS
		this.keepRunning = false;

		this.parentThread.children.remove(this);
		Thread.isRunning.remove(this);

		if (Thread.isRunning.length == 0){
			Thread.hideWorking();
		}//endif

		if (retval instanceof Exception){
			Log.alert("Uncaught Error in thread: "+(this.name!==undefined ? this.name : "")+"\n  " + retval.toString());
		}//endif

		return {"threadResponse":retval};
	};






	//PUT AT THE BEGINNING OF A GENERATOR TO ENSURE IT WILL ONLY BE CALLED USING yield()
	Thread.assertThreaded = function(){
		//GET CALLER AND DETERMINE IF RUNNING IN THREADED MODE
		if (arguments.callee.caller.caller.name != "Thread_prototype_resume")
			Log.error("must call from a thread as \"yield (GUI.refresh());\" ");
	};//method


	//DO NOT RESUME FOR A WHILE
	Thread.sleep = function*(millis){
		var to=setTimeout((yield(Thread.Resume)), millis);
		yield (Thread.suspend({"kill":function(){clearTimeout(to);}}))
	};

	//LET THE MAIN EVENT LOOP GET SOME ACTION
	Thread.yield = function*(){
		yield (YIELD);
	};

	Thread.suspend = function*(request){
		if (request !== undefined && request.kill === undefined && request.abort === undefined){
			Log.error("Expecting an object with kill() or abort() function");
		}//endif
		yield (new Suspend(request));
	};


	//RETURNS THREAD EXCEPTION
	Thread.prototype.join = function(timeout){
		return Thread.join(this, timeout);
	};

	//WAIT FOR OTHER THREAD TO FINISH
	Thread.join = function*(otherThread, timeout){
        if (timeout===undefined){
            if (DEBUG)
                while(otherThread.keepRunning){
          			yield(Thread.sleep(1000));
          			if (otherThread.keepRunning)
          				Log.note("Waiting for thread");
          		}//while

            if (otherThread.keepRunning){
                //WE WILL SIMPLY MAKE THE JOINING THREAD LOOK LIKE THE otherThread's CALLER
                //(WILL ALSO PACKAGE ANY EXCEPTIONS THAT ARE THROWN FROM otherThread)
                var gen = Thread_join_resume(yield(Thread.Resume));
                gen.next();  //THE FIRST CALL TO next()
                otherThread.stack.unshift(gen);
                yield (Thread.suspend());
            } else{
                yield ({"threadResponse":otherThread.threadResponse});
            }//endif
        }else{
            //WE SHOULD USE A REAL SIGNAL, BUT I AM LAZY SO WE BUSY-WAIT
            for(var t=0;t<10;t++){
                if (otherThread.keepRunning){
                    yield(Thread.sleep(timeout/10));
                }//endif
            }//for
        }//endif
	};


	//THIS GENERATOR EXPECTS send TO BE CALLED TWICE ONLY
	//FIRST WITH NO PARAMETERS, AS REQUIRED BY ALL GENERATORS
	//THE SEND RUN FROM THE JOINING THREAD TO RETURN THE VALUE
	function* Thread_join_resume(resumeFunction){
		var result;
		try{
			result = yield(undefined);
		}catch(e){
			result = e
		}//try
		resumeFunction({"threadResponse":result});  //PACK TO HIDE EXCEPTION
	}//method

	//CALL THE funcTION WITH THE GIVEN PARAMETERS
	//WILL ADD success AND error FUNCTIONS TO param TO CAPTURE RESPONSE
	Thread.call = function*(func, param){
		param.success = yield(Thread.Resume);
		param.error = function(){
			throw new Exception("callback to func was error:\n\t"+window.JSON.stringify(arguments), undefined);
		};
		var instance=func(param);
		yield (new Suspend(instance));
	};//method


};




if (window.Exception===undefined){

	window.Exception=function(description, cause){
		this.message=description;
		this.cause=cause;
	};

	Array.prototype.remove=function(obj, start){
		while(true){
			var i=this.indexOf(obj, start);
			if (i==-1) return this;
			this.splice(i, 1);
		}//while
	};

}

if (window.Log===undefined){
	window.Log={
		"error":console.error,
		"warning":console.warn,
		"note":console.note
	};
}//endif



build();












