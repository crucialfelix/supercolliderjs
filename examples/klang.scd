SynthDef("klang", {
    var nPartials = 12, nChans = 5;
    var n = nPartials * nChans;
    Splay.ar(Klang.ar(`[ { { rrand(200.0, 2000.0) } ! nPartials } ! nChans, nil, nil ], 1, 0))
          * EnvGen.kr(Env.sine(4), 1, 0.02, doneAction: Done.freeSelf);
});