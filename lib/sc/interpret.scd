var tab = [$\\,$\\,$t].as(String),
    nl = [$\\,$\\,$n].as(String),
    toJSON = IdentityDictionary.new;

Library.put(\supercolliderjs, \interpret,
  { arg guid, escapedCode, executingPath, returnResultAsString;

    var code = escapedCode.replace("__NL__", Char.nl),
        compiled,
        result,
        error,
        saveExecutingPath = thisProcess.nowExecutingPath;

    thisProcess.nowExecutingPath = executingPath;

    compiled = code.compile;
    if(compiled.isNil, {
      // "syntax error".postln;
      // will have to parse the message from STDOUT
      Library.at(\supercolliderjs, \return)
        .value(guid, "SyntaxError", executingPath);
    }, {
      {
        result = compiled.value();
      }.try({ arg err;
        err.path = executingPath ? guid;
        error = Library.at(\supercolliderjs, \errorToJSON, err.class).value(err);
        if(error.isNil, {
          // unknown error type
          error = Library.at(\supercolliderjs, \errorToJSON, Error).value(err);
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

Library.put(\supercolliderjs, \errorToJSON, Error,
  { arg err;
    (
      class: "Error",
      what: err.what,
      path: err.path
    )
  });


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
