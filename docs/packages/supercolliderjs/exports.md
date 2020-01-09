# supercolliderjs exports

<div class="Module"><span class="token keyword">module</span> index</div>




server

  http://localhost:3000/#/packages/server/Server
  http://localhost:3000/#/packages/server-plus/ServerPlus

  boot


dryads
  dryads index

lang
  lang index

map
  http://localhost:3000/#/packages/server/mapping

msg
  http://localhost:3000/#/packages/server/osc_msg

  server: {
    ...server,
    boot,
    server: ServerPlus,
  },
  dryads,
  lang,
  map,
  msg,
  // why is this exported separately?
  SCLangError,
  // @deprecated
  resolveOptions,

