
/**
  These overide the normal error reporting methods
  by posting a JSON dump of the error call stack.

  That dump is parsed from stdout by sclang which converts
  it into a structured error response.

  This requires the Library functions that interpreter.scd would have loaded,
  so that file should have been run.
**/

+ Object {
  reportError {
    error(this.asString);
    this.dumpBackTrace;
  }
}


+ Exception {
  reportError {
    var error = Library.at(\supercolliderjs, \errorToJSON).at(\getData).value(this, true, nil);
    if(error.notNil, {
      Library.at(\supercolliderjs, \return).value("0", "Error", error);
    });
  }
}

+ MethodError {
  reportError {
    ^super.reportError
  }
}

+ PrimitiveFailedError {
  reportError {
    ^super.reportError
  }
}

+ SubclassResponsibilityError {
  reportError {
    ^super.reportError
  }
}

+ ShouldNotImplementError {
  reportError {
    ^super.reportError
  }
}

+ DoesNotUnderstandError {
  reportError {
    ^super.reportError
  }
}

+ OutOfContextReturnError {
  reportError {
    ^super.reportError
  }
}

+ ImmutableError {
  reportError {
    ^super.reportError
  }
}

+ DeprecatedError {
  reportError {
    ^super.reportError
  }
}
