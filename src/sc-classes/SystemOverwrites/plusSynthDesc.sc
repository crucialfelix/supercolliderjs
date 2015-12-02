
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
		var spec = Spec.specs.at(name);
		^(
			name: name,
			index: index,
			rate: rate,
			defaultValue: defaultValue,
			argNum: argNum,
			lag: lag,
			spec: if(spec.isNil, nil, { spec.asJSON })
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

+ Spec {
	asJSON {
		^(
			// rate: this.rate,
			class: this.class.name
		)
	}
}

+ ControlSpec {
	asJSON {
		^(
			// rate: this.rate,
			class: this.class.name,
			minval: this.minval,
			maxval: this.maxval,
			warp: this.warp.asSpecifier,
			step: this.step,
			default: this.default,
			units: this.units
		)
	}
}
