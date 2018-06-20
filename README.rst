Overview
========

- JS interface that uses web3 to speak to the SpankBank smart contract
- It will be in-browser only (ie, not node)
- Initial target (~Thursday) will be calling the smart contract functions
- Shortly after will be exposing the API @euforic is building
- It is not clear whether or not the API will be open sourced
- The concrete deliverable will be an unstyled ``example.html`` page, with
  buttons for “stake”, “checkIn”, etc
- This will be done out of a separate ``spankbank-web3`` repo
- For now, focus on the happy path, deal with edge cases later
- Use webpack to build ``spankbank.ts`` along with the contract's ABI into
  a single file.
    - Assumption: this will stay as a standalone repo and steps similar to the
      ones below will be used to copy or import (via, ex, NPM) into other
      projects.

Immediate deliverables will be:

- Implementation of that proposal, including ``example.html`` (Thursday?)

Using ``spankbank`` in Your App
===============================

(for the moment: *eventual* usage; see "webpack" assumption above)

1. Build the library (note: eventually I imagine this could be put on NPM or
   similar, but I think this is the most expedient way to do things right
   now)::

    $ npm run build
    ...
    $ cp -r dist/ ../your-application/lib/spankbank

2. If your application is using TypeScript, add ``lib/spankbank/@types`` to
   ``typeRoots`` in ``tsconfig.json``

3. Use the ``SpankBank``::

    import { SpankBank } from 'lib/spankbank'

    let spankbank = new SpankBank('0xaad6cdac26aed0894d55bfaf2d3252c6084f5fc4')

    spankbank
      .getSpankPoints('0x8ec75ef3adf6c953775d0738e0e7bd60e647e5ef', 1)
      .then(spankPoints => {
        console.log('You have', spankPoints, 'spankPoints in period 1!')
      })

Developing
==========

To develop, run::

    $ yarn
    $ npm start

API Overview
============

See: ``spankbank.ts`` (which will eventually be documented here)
