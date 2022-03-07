import { init } from '@web3-onboard/react'
import injectedModule from '@web3-onboard/injected-wallets'
import ledgerModule from '@web3-onboard/ledger'
import walletConnectModule from '@web3-onboard/walletconnect'
import walletLinkModule from '@web3-onboard/walletlink'


const injected = injectedModule()
const walletLink = walletLinkModule()
const walletConnect = walletConnectModule()


const ledger = ledgerModule()
console.log("process.env.REACT_APP_INFURA",process.env.REACT_APP_INFURA);
const MAINNET_RPC_URL = process.env.REACT_APP_INFURA;


export const initWeb3Onboard = init({
    wallets: [
        injected,
        ledger,
        walletLink,
        walletConnect,
      ],
    chains: [
        {
            id: '0x3',
            token: 'tROP',
            label: 'Ethereum Ropsten Testnet',
            rpcUrl: MAINNET_RPC_URL
        }

    ],
    appMetadata: {
        name: 'Blocknative Web3-Onboard',
        icon: '/Logo.png',
        logo: '/Logo.png',
        description: 'Demo app for Web3-Onboard',
        recommendedInjectedWallets: [
            { name: 'Coinbase', url: 'https://wallet.coinbase.com/' },
            { name: 'MetaMask', url: 'https://metamask.io' }
        ]
    }
})

