
+ SynthDesc {
	asJSON {
		var sourceCode;
		{
			sourceCode = def.asCompileString;
		}.protect;

		^(
			name: name,
			controlNames: controlNames,
			controls: controls.collect(_.asJSON),
			inputs: inputs.collect(_.asJSON),
			output: outputs.collect(_.asJSON),
			hasGate: hasGate,
			hasArrayArgs: hasArrayArgs,
			hasVariants: hasVariants,
			canFreeSynth: canFreeSynth,
			sourceCode: sourceCode
		)
	}
}

+ ControlName {
	asJSON {
		^(
			name: name,
			index: index,
			rate: rate,
			defaultValue: defaultValue,
			argNum: argNum,
			lag: lag
		)
	}
}

+ IODesc {
	asJSON {
		^(
			rate: rate,
			numberOfChannels: numberOfChannels,
			startingChannel: startingChannel,
			type: type
		)
	}
}
