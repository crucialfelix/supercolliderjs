{{> header }}

> A dryad (/ˈdraɪ.æd/; Greek: Δρυάδες, sing.: Δρυάς) is a tree nymph, or female tree spirit, in Greek mythology

Dryadic is a framework for writing components that encapsulate all the complexities of loading, state management, dependencies and execution order.

https://github.com/crucialfelix/dryadic

Just as SuperCollider synths have a call graph or UGens, Dryadic has a call graph of higher level components. In Dryadic this is referred to as a tree.

Dryadic is declarative: you specify the resources you want and how they are connected. The framework does the rest.
Because it is declarative, you can update your tree while performing and the resources (servers, sounds, synth defs, settings) update live.

## Examples

More extensive examples will come with dryadic 1.0

{{#example}}examples/dryads-synth-event-list.js{{/example}}

{{> footer }}