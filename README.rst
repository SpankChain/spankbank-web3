Overview
========

Using ``spankbank`` in Your App
===============================

1. Add the package::

    $ yarn add git+ssh://git@github.com:SpankChain/spankbank-web3.git#f1b39c8998

   Where ``f1b39c8998`` is the commit to pin (note: in the future this will be
   replaced with a tag).

2. Use the ``SpankBank`` and ``Token``::

    import { SpankBank, Token } from 'lib/spankbank'

    let spankbank = new SpankBank('0xaad6cdac26aed0894d55bfaf2d3252c6084f5fc4')
    spankbank
      .getSpankPoints('0x8ec75ef3adf6c953775d0738e0e7bd60e647e5ef', 1)
      .then(spankPoints => {
        console.log('You have', spankPoints, 'spankPoints in period 1!')
      })

    let spankToken = new Token('0x374f46dc892ecdc9db8bc704175f0485e5185851')
    spankToken
      .approve('0xaad6cdac26aed0894d55bfaf2d3252c6084f5fc4', 69)
      .then(txHash => {
        console.log('Approval transaction:', txHash)
      })


Developing
==========

To develop, run::

    $ yarn
    $ npm start

And be sure to re-build before pushing::

    $ npm run build


API Overview
============

See: ``spankbank.ts`` (which will eventually be documented here)
