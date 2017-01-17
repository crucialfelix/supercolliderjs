
SuperColliderJS {

	classvar tab, nl, jsonEncoders, errorEncoders, <>sclangConf;

	*interpret { arg guid,
		escapedCode,
		executingPath,
		returnResultAsString=true,
		reportError=true,
		getBacktrace=false;

		var code = escapedCode.replace("__NL__", Char.nl.as(String)),
			compiled,
			result,
			error,
			saveExecutingPath = thisProcess.nowExecutingPath;

		code = code.replace("__SLASH__", ($\\).as(String));

		thisProcess.nowExecutingPath = executingPath;

		// capture compile errors, stdout
		"\nSUPERCOLLIDERJS:%:CAPTURE:START\n".format(guid).postln;
		compiled = code.compile;

		if(compiled.isNil, {
			"\nSUPERCOLLIDERJS:%:CAPTURE:END".format(guid).postln;
			this.return(guid, "SyntaxError", nil);
		}, {
			{
				result = compiled.value();
			}.try({ arg err;
				err.path = executingPath ? guid;
				error = this.encodeError(err, getBacktrace, compiled);

				// classic mode
				if(reportError.asBoolean, {
					err.reportError;
				});
			});
			"\nSUPERCOLLIDERJS:%:CAPTURE:END".format(guid).postln;
			if(error.notNil, {
				this.return(guid, "Error", error);
			}, {
				this.return(guid, "Result", if(returnResultAsString ? true, { result.asString }, { result }));
			});
		});

		thisProcess.nowExecutingPath = saveExecutingPath;
		"SUPERCOLLIDERJS.interpreted".postln;
		^""
	}

	*return { arg guid, type, object;
		// post object as JSON to STDOUT
		var json = this.stringify(object);
		"\nSUPERCOLLIDERJS:%:START:%".format(guid, type).postln;
		// sclang screws up when posting long lines in a single chunk
		json.clump(2048).do { arg chunk;
			"SUPERCOLLIDERJS:%:CHUNK:%".format(guid, chunk).postln;
		};
		"SUPERCOLLIDERJS:%:END:%".format(guid, type).postln;
	}

	*executeFile { arg guid, path;
		var compiled, result, error, saveExecutingPath;

		saveExecutingPath = thisProcess.nowExecutingPath;
		thisProcess.nowExecutingPath = path;

		// capture compile errors, stdout
		"\nSUPERCOLLIDERJS:%:CAPTURE:START\n".format(guid).postln;
		compiled = thisProcess.interpreter.compileFile(path);

		if(compiled.isNil, {
			"\nSUPERCOLLIDERJS:%:CAPTURE:END".format(guid).postln;
			this.return(guid, "SyntaxError", nil);
		}, {
			{
				result = compiled.value();
			}.try({ arg err;
				err.path = path;
				error = this.encodeError(err, true, compiled);
			});
			"\nSUPERCOLLIDERJS:%:CAPTURE:END".format(guid).postln;
			if(error.notNil, {
				this.return(guid, "Error", error);
			}, {
				this.return(guid, "Result", result);
			});
		});

		thisProcess.nowExecutingPath = saveExecutingPath;
		"SUPERCOLLIDERJS.interpreted".postln;
	}
	/****************** JSON encoding *****************************************/

	*encodeError { arg err, getBacktrace=false, compiledFunc;
		var data = ();
		err.class.superclassesDo({ arg class;
			var handler = errorEncoders.at(class.name);
			if(handler.notNil, {
				data.putAll(handler.value(err));
			});
		});
		if(getBacktrace, {
			data['backtrace'] = this.getBacktrace(err, compiledFunc);
		});
		^data
	}
	*encodeObject { arg obj, deep=false;
		var dd, asString, class = obj.class;
		if(class.class === Class or: {class === Main}, {
			deep = false;
		});
		if(class === String or: (class === Symbol), {
			asString = obj.asCompileString;
		}, {
			{
				asString = obj.asString;
			}.try({
				asString = "(asString error)";
			});
		});
		dd = (
			class: obj.class,
			asString: asString
		);
		if(class === Function, {
			dd.sourceCode = obj.def.sourceCode
		});
		if(deep, {
			dd.vars = (obj.class.instVarNames ? []).collect({ arg v, i;
				(
					name: v,
					value: this.encodeObject(obj.instVarAt(i), false)
				)
			});
		});
		^dd
	}

	*frameContext { arg frame;
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
					this.frameContext(frame.context);
				})
			})
		});
	}
	*getBacktrace { arg err, compiledFunc;
		var out, currentFrame, def, ownerClass, methodName, callerAddress,
			startAtDef, stopAtDef, addingFrame = false;
		out = [];

		currentFrame = err.protectedBacktrace ?? { err.getBackTrace };

		// 'caller' points to another DebugFrame for the caller to this function.
		callerAddress = { arg caller;
			caller !? { caller.address.asString }
		};
		// the source code to interpret compiled to a function
		if(compiledFunc.notNil, {
			stopAtDef = compiledFunc.def;
		/*}, {
			// out of band thrown Error
			startAtDef = Object.findMethod('throw');*/
		});

		while({
			currentFrame.notNil and: {
				currentFrame.functionDef !== stopAtDef
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
					caller: callerAddress.value(currentFrame.caller),
					// maybe indicate if its an inner function
					context: this.frameContext(currentFrame.context)
				);
			});

			vv[\args] = def.argNames.collect({ |name, i|
				(
					name: name,
					value: this.encodeObject(currentFrame.args[i], true)
				)
			});
			vv[\vars] = def.varNames.collect({ |name, i|
				(
					name: name,
					value: this.encodeObject(currentFrame.vars[i], true)
				)
			});

			out = out.add(vv);
			currentFrame = currentFrame.caller;
		});

		^out
	}

	*isInitialized {
		^errorEncoders.notNil
	}

	*initClass {
		tab = [$\\,$\\,$t].as(String);
		nl = [$\\,$\\,$n].as(String);

		errorEncoders = (
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
					receiver: this.encodeObject(err.receiver)
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
					args: err.args.collect({ arg a; this.encodeObject(a) })
				)
			},
			OutOfContextReturnError: { arg err;
				(
					method: (
						name: err.method.name,
						class: err.method.ownerClass
					),
					result: this.encodeObject(err.result)
				)
			},
			ImmutableError: { arg err;
				(
					value: this.encodeObject(err.value)
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

		jsonEncoders = (
			Object: { arg data;
				this.stringify((
					class: data.class,
					string: data.asString,
					compileString: data.asCompileString
				))
				// could also use data.storeArgs and get the arg names from *new
			},
			String: { arg obj;
				obj.asCompileString.reject(_.isControl).replace(Char.nl.as(String), nl).replace(Char.tab.as(String), tab);
			},
			Symbol: { arg obj;
				this.stringify(obj.asString);
			},
			Class: { arg obj;
				this.stringify(obj.name.asString);
			},
			Dictionary: { arg obj;
				var out = List.new;
				obj.keysValuesDo({ arg key, value;
					out.add(key.asString.asCompileString ++ ":" + this.stringify(value));
				});
				("{" ++ (out.join(",")) ++ "}");
			},
			Nil: { arg obj;
				"null"
			},
			True: { arg obj;
				"true"
			},
			False: { arg obj;
				"false"
			},
			Number: { arg obj;
				if(obj.isNaN, {
					"\"NaN\""
				}, {
					if(obj === inf, {
						"\"Infinity\""
					}, {
						if(obj === (-inf), {
							"\"-Infinity\""
						}, {
							// as full precision please
							obj.asString
						});
					});
				});
			},
			SequenceableCollection: { arg obj;
				"[" ++ obj.collect({ arg sub;
					this.stringify(sub)
				}).join(",") ++ "]";
			}
		);
	}

	*stringify { arg object;
		^this.encoderFor(object.class).value(object);
	}
	*encoderFor { arg class;
		^jsonEncoders.at(class.name) ?? {
			this.encoderFor(class.superclass)
		};
	}
}
