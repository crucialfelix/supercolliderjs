
jest.dontMock('../index');
jest.dontMock('../SCSynth');
jest.dontMock('../Group');

var dryads = require('../index');


describe('SCSynth', function() {

  it('should load SCSynth', function() {
    expect(dryads.SCSynth).toBeTruthy();
  });

  it('should set default options of SCSynth', function() {
    let s = new dryads.SCSynth();
    expect(s.properties).toEqual({options: {debug: false}});
  });

  // it('should pass context.scsynth to child Group', function() {
  //   // mock import {boot} from '../server/server';
  //
  //   let g = new dryads.Group();
  //   let s = new dryads.SCSynth({}, [g]);
  //   // because scsynth was set during prepare
  //   // it was not available during initial construction of contexts
  //   // how to just call this ?
  //   // s.prepareForAdd()
  //   // dryadic(s).play()
  // });
});

// describe('Group', function() {
//   it('should pass .group to child', function() {
//     let g = new dryads.Group();
//     let h = new dryads.Group([g]);
//
//     // prepareForAdd invokes a lot of things to get that nodeID
//     // h.tree();
//   });
// });

// should test that:
// - all prepares are functions
// - all add and remove return commands that are registered in a layer
// - make a validator
