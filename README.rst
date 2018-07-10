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
      .then(async txHash => {
        console.log('Approval transaction:', txHash)
        let receipt = await spankbank.waitForTransactionReceipt(txHash)
        console.log('Receipt:', receipt)
      })


Developing
==========

To develop, run::

    $ yarn
    $ npm start

And be sure to re-build before pushing::

    $ npm run build


Testing
=======

To setup the test environment:

1. Ensure that ``ganache`` (testrpc) is running::

    $ npm install -g ganache-cli
    $ ganache-cli --gas 1

2. Run the tests::

    $ npm run test

Note: the tests use (essentially)::

    $ cd node_modules/spankbank/
    $ yarn
    $ truffle deploy --reset

Before each test to deploy the smart contract.

API Overview
============

See: ``spankbank.ts`` (which will eventually be documented here)
