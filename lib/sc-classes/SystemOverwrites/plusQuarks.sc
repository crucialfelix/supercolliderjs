
+ Quarks {

	/**
	  * because supercollider-js passes in a dynamically generated config file
	  * store to that must happen to the original config file
	  * and to the current (dynamically generated) one
	  */
	*clear {
		this.installed.do({ |quark|
			LanguageConfig.removeIncludePath(quark.localPath);
		});
		LanguageConfig.store(this.configPath);
		LanguageConfig.store(LanguageConfig.currentPath);
		cache = Dictionary.new;
	}
	*link { |path|
		path = path.withoutTrailingSlash;
		if(LanguageConfig.includePaths.includesEqual(path).not, {
			path.debug("Adding path");
			LanguageConfig.addIncludePath(path);
			LanguageConfig.store(this.configPath);
			LanguageConfig.store(LanguageConfig.currentPath);
			^true
		});
		^false
	}
	*unlink { |path|
		path = path.withoutTrailingSlash;
		if(LanguageConfig.includePaths.includesEqual(path), {
			path.debug("Removing path");
			LanguageConfig.removeIncludePath(path);
			LanguageConfig.store(this.configPath);
			LanguageConfig.store(LanguageConfig.currentPath);
			^true
		});
		^false
	}

	*configPath {
		// sclang_config was saved in Library during initInterpreter
		^Library.at('supercolliderjs', 'sclang_conf') ?? {
			Error("Library.at('supercolliderjs', 'sclang_conf') should have been set").throw;
		}
	}

}
