var tab = [$\\,$\\,$t].as(String),
    nl = [$\\,$\\,$n].as(String),
    toJSON = IdentityDictionary.new,
    errorToJSON = IdentityDictionary.new;

Library.put(\supercolliderjs, \interpret,
  { arg guid, escapedCode, executingPath, returnResultAsString, reportError;

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
        .value(guid, "SyntaxError", executingPath);
    }, {
      {
        result = compiled.value();
      }.try({ arg err;
        err.path = executingPath ? guid;
        error = errorToJSON.at(\getData).value(err);

        // classic mode
        if(reportError.notNil, {
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

      thisProcess.nowExecutingPath = saveExecutingPath;
    });
  });

Library.put(\supercolliderjs, \return,
  { arg guid, type, object;
    // posts a message to STDOUT
    var json = toJSON.at(\stringify).value(object);
    "SUPERCOLLIDERJS:%:%:%".format(guid, type, json).postln;
  });


/******************    errors    *****************************************/

errorToJSON = (
  getData: { arg err;
    var data = ();
    err.class.superclassesDo({ arg class;
      var handler = errorToJSON.at(class.name);
      if(handler.notNil, {
        data.putAll(handler.value(err));
      });
    });
    data
  },
  Exception: { arg err;
    (
        class: err.class.asString,
        what: err.what,
        path: err.path,
        errorString: err.errorString
    )
  },
  MethodError: { arg err;
    (
      receiver: (
        class: err.receiver.class.name,
        asString: err.receiver.asString
      )
    )
  },
  PrimitiveFailedError: { arg err;
    (
      failedPrimitiveName: err.failedPrimitiveName
    )
  },
  SubclassResponsibilityError: { arg err;
    (
      method: err.method.name,
      class: err.class.name
    )
  },
  ShouldNotImplementError: { arg err;
    (
      method: err.method.name,
      class: err.class.name
    )
  },
  DoesNotUnderstandError: { arg err;
    (
      selector: err.selector,
      args: err.args.collect({ arg a; (class: a.class, asString: a.asString)})
    )
  },
  OutOfContextReturnError: { arg err;
    (
      method: (
        name: err.method.name,
        ownerClass: err.method.ownerClass.name
      ),
      result: (
        class: err.result.class.name,
        asString: err.result.asString
      )
    )
  },
  ImmutableError: { arg err;
    (
      value: (
        class: err.value.class.name,
        asString: err.value.asString
      )
    )
  },
  DeprecatedError: { arg err;
    (
      method: (
        name: err.method.name,
        ownerClass: err.method.ownerClass.name
      ),
      class: err.class.name, // not used ?
      alternateMethod: (
        name: err.alternateMethod.name,
        ownerClass: err.alternateMethod.ownerClass.name
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
