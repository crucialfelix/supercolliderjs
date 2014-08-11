var tab = [$\\,$\\,$t].as(String),
    nl = [$\\,$\\,$n].as(String),
    toJSON = IdentityDictionary.new,
    errorToJSON = IdentityDictionary.new;

Library.put(\supercolliderjs, \interpret,
  { arg guid, escapedCode, executingPath, returnResultAsString=true, reportError=true, getBacktrace=false;

    var code = escapedCode.replace("__NL__", Char.nl),
        compiled,
        result,
        error,
        saveExecutingPath = thisProcess.nowExecutingPath;

    thisProcess.nowExecutingPath = executingPath;
    // this is really used only by SC IDE
    // thisProcess.interpreter.cmdLine = code;

    compiled = code.compile;

    if(compiled.isNil, {
      // will have to parse the message from STDOUT
      Library.at(\supercolliderjs, \return)
        .value(guid, "SyntaxError", nil);
    }, {
      {
        result = compiled.value();
      }.try({ arg err;
        err.path = executingPath ? guid;
        error = errorToJSON.at(\getData).value(err, getBacktrace, compiled);

        // classic mode
        if(reportError.asBoolean, {
          err.reportError;
        });
      });
      if(error.notNil, {
        Library.at(\supercolliderjs, \return)
          .value(guid, "Error", error);
      }, {
        Library.at(\supercolliderjs, \return)
          .value(guid, "Result", if(returnResultAsString.isNil, { result }, { result.asString }));
      });
    });

    thisProcess.nowExecutingPath = saveExecutingPath;
  });

Library.put(\supercolliderjs, \return,
  { arg guid, type, object;
    // posts a message to STDOUT
    var json = toJSON.at(\stringify).value(object);
    "SUPERCOLLIDERJS:%:%:%".format(guid, type, json).postln;
  });


/******************    errors    *****************************************/

errorToJSON = (
  getData: { arg err, getBacktrace=false, compiledFunc;
    var data = ();
    err.class.superclassesDo({ arg class;
      var handler = errorToJSON.at(class.name);
      if(handler.notNil, {
        data.putAll(handler.value(err));
      });
    });
    if(getBacktrace, {
      data['backtrace'] = errorToJSON.at(\getBacktrace).value(err, compiledFunc);
    });
    data
  },
  obj: { arg obj;
    (
      class: obj.class,
      asString: obj.asString
    )
  },
  frameContext: { arg frame;
  	// 'context' points to another DebugFrame for the frame lexically enclosing this one.
    // This searches up the context chain for the enclosing method
    // where the function was defined.
    var def;
    if(frame.isNil, {
      nil
    }, {
      def = frame.functionDef;
      if(def.class === Method, {
        if(def.ownerClass === Interpreter, {
          nil
        }, {
          (
            class: def.ownerClass,
            method: def.name,
            file: def.filenameSymbol,
            charPos: def.charPos,
            source: def.sourceCode
          )
        });
      }, {
        if(frame.context.isNil, {
          nil
        }, {
          errorToJSON.at('frameContext').value(frame.context);
        })
      })
    });
  },
  getBacktrace: { arg err, compiledFunc;
		var out, currentFrame, def, ownerClass, methodName, callerAddress;
		out = [];
		currentFrame = err.protectedBacktrace;

  	// 'caller' points to another DebugFrame for the caller to this function.
    callerAddress = { arg caller;
      caller !? { caller.address.asString }
    };

		while({
      currentFrame.notNil and: {
        // end when we reach the compiled func
        // after that is internal to intrepret.scd
        (currentFrame.functionDef !== compiledFunc.def)
      }
    }, {
      var vv;
			def = currentFrame.functionDef;

			if(def.isKindOf(Method), {
				ownerClass = def.ownerClass;
				methodName = def.name;
        vv = (
          type: "Method",
          class: ownerClass,
          method: methodName,
          file: def.filenameSymbol,
          charPos: def.charPos,
          source: def.sourceCode,
          address: currentFrame.address.asString,
          caller: callerAddress.(currentFrame.caller)
        );
			}, {
         vv = (
          type: "Function",
          address: currentFrame.address.asString,
          source: def.sourceCode,
          caller: callerAddress.(currentFrame.caller),
          // maybe indicate if its an inner function
          context: errorToJSON.at('frameContext').value(currentFrame.context)
        );
			});

      vv[\args] = def.argNames.collect({ |name, i|
        (
            name: name,
            value: errorToJSON.at(\obj).value(currentFrame.args[i]);
        )
      });
      vv[\vars] = def.varNames.collect({ |name, i|
        (
            name: name,
            value: errorToJSON.at(\obj).value(currentFrame.vars[i]);
        )
      });

      out = out.add(vv);
			currentFrame = currentFrame.caller;
		});

    out;
  },
  // error classes
  Exception: { arg err;
    (
        class: err.class,
        what: err.what,
        path: err.path,
        errorString: err.errorString
    )
  },
  MethodError: { arg err;
    (
      receiver: errorToJSON.at(\obj).value(err.receiver)
    )
  },
  PrimitiveFailedError: { arg err;
    (
      failedPrimitiveName: err.failedPrimitiveName
    )
  },
  SubclassResponsibilityError: { arg err;
    (
      method: (
        name: err.method.name,
        class: err.class
      )
    )
  },
  ShouldNotImplementError: { arg err;
    (
      method: (
        name: err.method.name,
        class: err.class
      )
    )
  },
  DoesNotUnderstandError: { arg err;
    (
      selector: err.selector,
      args: err.args.collect({ arg a; errorToJSON.at(\obj).value(a)})
    )
  },
  OutOfContextReturnError: { arg err;
    (
      method: (
        name: err.method.name,
        class: err.method.ownerClass
      ),
      result: errorToJSON.at(\obj).value(err.result)
    )
  },
  ImmutableError: { arg err;
    (
      value: errorToJSON.at(\obj).value(err.value)
    )
  },
  DeprecatedError: { arg err;
    (
      method: (
        name: err.method.name,
        class: err.method.ownerClass
      ),
      alternateMethod: (
        name: err.alternateMethod.name,
        class: err.alternateMethod.ownerClass
      )
    )
  }
);


/********************   a portable JSON stringify ************************/

toJSON.putPairs([

  \stringify, { arg object;
    toJSON.at(\encoderFor).value(object.class).value(object);
  },
  \encoderFor, { arg class;
    toJSON.at(class) ?? {
      toJSON.at(\encoderFor).value(class.superclass)
    };
  },

  Object, { arg data;
    data.asCompileString
  },
  String, { arg obj;
    obj.asCompileString.reject(_.isControl).replace(Char.nl, nl).replace(Char.tab, tab);
  },
  Symbol, { arg obj;
    toJSON.at(\stringify).value(obj.asString);
  },
  Class, { arg obj;
    toJSON.at(\stringify).value(obj.name.asString);
  },
  Dictionary, { arg obj;
    var out = List.new;
    obj.keysValuesDo({ arg key, value;
        out.add(key.asString.asCompileString ++ ":" + toJSON.at(\stringify).value(value));
    });
    ("{" ++ (out.join(",")) ++ "}");
  },
  Nil, { arg obj;
    "null";
  },
  True, { arg obj;
    "true";
  },
  False, { arg obj;
    "false";
  },
  Number, { arg obj;
    if(obj.isNaN, {
        "NaN"
    }, {
      if(obj === inf, {
          "Infinity"
      }, {
        if(obj === (-inf), {
            "-Infinity"
        }, {
          obj.asString;
        });
      });
    });
  },
  SequenceableCollection, { arg obj;
    "[" ++ obj.collect({ arg sub;
              toJSON.at(\stringify).value(sub)
            }).join(",")
        ++ "]";
  }
]);

"SUPERCOLLIDERJS-interpreter-loaded".postln;
