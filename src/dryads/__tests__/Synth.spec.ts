/* @flow */
import Synth from '../Synth';
import { Dryad } from 'dryadic';
import { expectPlayGraphToEqual } from '../utils/test-utils';

describe('Synth', function() {
  describe('simple', function() {
    let s = new Synth({
      def: 'saw',
      args: {
        freq: 440
      }
    });

    it('should compile', function() {
      expect(s);
    });

    it('should make playgraph', function() {
      let h = [
        'SCServer',
        { options: { debug: false } },
        [['Synth', { def: 'saw', args: { freq: 440 } }, []]]
      ];
      expectPlayGraphToEqual(s, h);
    });

    // it('should return command add', function() {
    //   let p = makePlayer(s);
    //   // Synth is first child
    //   let cmd = getCommand(p, 'add', [0]);
    //   // Didn't call prepare so context.nodeID is undefined
    //   let m = ['/s_new', 'saw', undefined, 1, 0, 'freq', 440];
    //   expect(cmd.commands.scserver.msg).toEqual(m);
    // });
  });

  describe('Synth', function() {
    describe('with properties', function() {
      class FakeDef extends Dryad {
        value() {
          return 'fake-saw';
        }
      }

      class FakeSlider extends Dryad {
        value() {
          return 440;
        }
      }

      let s = new Synth({
        def: new FakeDef(),
        args: {
          freq: new FakeSlider()
        }
      });

      it('should compile', function() {
        expect(s);
      });

      it('should make playgraph', function() {
        let h = [
          'SCServer',
          {
            options: {
              debug: false
            }
          },
          [
            [
              'Properties',
              {},
              [
                ['FakeDef', {}, []],
                ['FakeSlider', {}, []],
                [
                  'PropertiesOwner',
                  {},
                  [
                    [
                      'Synth',
                      {
                        args: {
                          freq: function() {}
                        },
                        def: function() {}
                      },
                      []
                    ]
                  ]
                ]
              ]
            ]
          ]
        ];

        // Ignore the property accessor functions when comparing
        expectPlayGraphToEqual(s, h, g => {
          // console.log(JSON.stringify(g, null, 2));
          let propOwner = g[2][0][2][2];
          // console.log('propOwner', propOwner);
          let synth = propOwner[2][0];
          // console.log('synth', synth);
          synth[1].args.freq = undefined;
          synth[1].def = undefined;
        });
      });

      // it('should return command add', function() {
      //   /**
      //    * The required parent is SCServer which needs to be mocked
      //    * otherwise it would try to boot.
      //    */
      //   let p = makePlayer(s);
      //   // have to call prepare for add or the context isn't loaded
      //   // with the propertyValues.
      //   // unless you do that again for .add
      //   let synthCmd = getCommand(p, 'add', [0, 2, 0]);
      //
      //   // Didn't call prepare so context.nodeID is undefined
      //   let m = ['/s_new', 'fake-saw', undefined, 1, 0, 'freq', 440];
      //   console.log('synthCmd', JSON.stringify(synthCmd, null, 2));
      //   //       {"commands":{},"context":{"id":"0.0.props.2","log":{"_buffer":[]}},"properties":{"indices":{"def":0,"args":{"freq":1}}},"id":"0.0.props.2","children":[{"commands":{"scserver":{}},"context":{"id":"0.0.props.2.0","log":{"_buffer":[]}},"properties":{"args":{}},"id":"0.0.props.2.0","children":[]}]}
      //   expect(synthCmd.commands.scserver.msg).toEqual(m);
      // });
    });
  });
});
