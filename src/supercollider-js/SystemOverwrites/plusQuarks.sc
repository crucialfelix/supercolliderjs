
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
		this.clearCache;
	}
	*link { |path|
		path = path.withoutTrailingSlash;
		if(LanguageConfig.includePaths.includesEqual(path).not, {
			path.debug("Adding path");
			LanguageConfig.addIncludePath(path);
			this.prSaveConfig();
			^true
		});
		^false
	}
	*unlink { |path|
		path = path.withoutTrailingSlash;
		if(LanguageConfig.includePaths.includesEqual(path), {
			path.debug("Removing path");
			LanguageConfig.removeIncludePath(path);
			this.prSaveConfig();
			^true
		});
		^false
	}

	*configPath {
		// The permanent original sclang_config path is saved to here
		// on startup.
		^SuperColliderJS.sclangConf
	}

	*prSaveConfig {
		var scjs = LanguageConfig.includePaths.detect({ arg p;
			p.contains("supercolliderjs/lib/supercollider-js");
		});

		if (scjs.notNil, {
			LanguageConfig.removeIncludePath(scjs);
		});

		// save to the permanent config file
		LanguageConfig.store(this.configPath);

		// save to the temp runtime config file
		if (scjs.notNil, {
			LanguageConfig.addIncludePath(scjs);
		});
		LanguageConfig.store(LanguageConfig.currentPath);
	}
}
