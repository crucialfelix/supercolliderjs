declare module "dryadic" {
  interface Properties {
    [key: string]: any;
  }

  export class Dryad<P = Properties> {
    properties: P;
    children: Dryad[];
    constructor(properties?: P, children?: Dryad[]);
    defaultProperties(): P;
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
