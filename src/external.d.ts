declare module "dryadic" {
  interface Properties {
    [key: string]: any;
  }
  export class Dryad {
    constructor(properties?: Properties, children?: Dryad[]);
  }
  export class DryadPlayer {
    tree: any;
    play: () => DryadPlayer;
    _collectCommands(commandName: string): any;
    updateContext(context: any, update: any): any;
    callCommand(id: string, command: any);
    h: (hgraph: any) => Dryad;
  }
  export function dryadic(rootDryad?: Dryad, moreLayers?: any, rootContext?: any): DryadPlayer;
}
