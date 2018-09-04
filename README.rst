``spankbank-web3``: A JavaScript/TypeScript + Web3 Interface to the SpankBank
=============================================================================

For a demo, see: https://spankchain.github.io/spankbank-web3/

For the actual SpankBank, see: https://bank.spankchain.com


Using ``spankbank`` in Your App
===============================

1. Add the package::

    $ yarn add @spankdev/spankbank-web3

   Where ``f1b39c8998`` is the commit to pin (note: in the future this will be
   replaced with a tag).

2. Use the ``SpankBank`` and ``Token``::

    import { SpankBank, Token } from '@spankdev/spankbank-web3'

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


Using with the Ledger Nano
==========================

To use with the Ledger Nano, use the provided ``LedgerWeb3Wrapper``::

    let ledgerWrapper = new LedgerWeb3Wrapper({
      // These parameters are optional. If they are not provided, Metamask
      // will be queried for the networkId, and the corresponding Infura
      // RPC endpoint will be used.
      networkId: 1,
      rpcUrl: 'https://mainnet.infura.io/metamask',
    }}

    // Wait for the ledger to load.
    // This may throw a MetamaskError with ``metamaskError == 'LEDGER_LOCKED'``
    // if the ledger is unplugged, locked, or the Ethereum app hasn't been
    // started. Unfortuantely there doesn't seem to be a better way to
    // distinguish between these cases.
    // Additionally, it will take 7 seconds to fail with ``LEDGER_LOCKED``.
    // See comments above ``transport.exchangeTimeout`` in ``spankbank.ts``.
    ledgerWrapper.then(
      () => console.log('Ledger ready!'),
      err => {
        if (err.metamaskError == 'LEDGER_NOT_SUPPORTED') {
          // The error message will describe the issue
          console.log(err.message)
        } else if (err.metamaskError == 'LEDGER_LOCKED') {
          console.log('The ledger is unplugged, locked, or the Ethereum app is not running')
        } else {
          console.log('Error connecting to ledger:', err)
      }
    )

    let sb = new SpankBank('0xaad6cdac26aed0894d55bfaf2d3252c6084f5fc4', ledgerWrapper)

Note: HTTPS must be used even when developing locally. The simplest way to
do that is with ``ngrok`` (https://ngrok.com/)::

    $ ngrok http --host-header=rewrite 6933
    ...
    Forwarding                    https://db0a61c0.ngrok.io -> localhost:6933

Logging
=======

By default, logs will be sent to ``console``. This can be changed by calling
``setSpankBankLogger`` with any ``console``-compatible logger::

   import { setSpankBankLogger } from '@spankdev/spankbank-web3'

   setSpankBankLogger({
      info: (...args) => { myLog.info(args.join(' ')) },
      ...
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
