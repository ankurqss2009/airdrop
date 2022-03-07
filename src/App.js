import React, { useState, useEffect } from 'react';
import "react-bootstrap";

import Onboard from "@web3-onboard/core";
import { initWeb3Onboard } from './Service'

import { useConnectWallet, useSetChain, useWallets } from '@web3-onboard/react';


import './App.css';

import {getBlockchain,disconnect, isValidNetwork} from './lib/ethereum.js';
import {getTokenByAddress} from './lib/util';
import {} from 'dotenv';


/*
const onboard = Onboard({
    wallets: [injected,walletConnect,walletLink,ledger],
    chains: [
        {
            id: "0x3",
            token: "ETH",
            label: "Ethereum Mainnet",
            rpcUrl: MAINNET_RPC_URL
        }
    ],
    appMetadata: {
        name: 'Claim Token',
        icon: '/Logo.png',
        logo: '/Logo.png',
        description: 'Use this for claim token',
        recommendedInjectedWallets: [
            { name: 'Coinbase', url: 'https://wallet.coinbase.com/' },
            { name: 'MetaMask', url: 'https://metamask.io' }
        ]
    }
});
*/

/*
const connect = async (address,setClaimMessage) => {
    if(address){
        return
    }
    const {valid,message} = await isValidNetwork();
    if(!valid){
        setClaimMessage({
            type: 'danger',
            payload: message
        });
        return;
    }
    const wallets = await initWeb3Onboard.connectWallet();
    console.log("walets",wallets);
    return wallets;
};
*/
const networks = {
    '56': 'Binance Smart Chain Mainnet',
    '97': 'Binance Smart Chain Testnet',
    '5777': 'Local development blockchain' ,
    '3':'ropsten'
}


function App() {
    //react web3
    const [{ wallet }, connect, disconnect] = useConnectWallet()
    const [{ chains, connectedChain, settingChain }, setChain] = useSetChain()
    const connectedWallets = useWallets()

    const [web3Onboard, setWeb3Onboard] = useState(null)
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Loading...');
    const [claimMessage, setClaimMessage] = useState({
        payload: undefined,
        type: undefined
    });
    const [airdrop, setAirdrop] = useState(undefined);
    const [accounts, setAccounts] = useState(undefined);

    useEffect(() => {
        setWeb3Onboard(initWeb3Onboard)
        console.log("---wallet---",wallet)
    }, [])

    useEffect(() => {
        const init = async () => {
            try {
                console.log("connectedWallets.length",connectedWallets.length)
                const { airdrop, accounts=[] } = await getBlockchain(initWeb3Onboard);
                setAirdrop(airdrop);
                setAccounts(accounts[0]);
                setLoading(false);
            } catch(e) {
                setLoadingMessage(e);
            }
            if(window.ethereum) {
                window.ethereum.on('accountsChanged', function (accounts) {
                    console.log(`Selected account changed to ${accounts[0]}`);
                    return setAccounts(accounts[0]);
                });

                window.ethereum.on('chainChanged', () => {
                    window.location.reload();
                })
                window.ethereum.on('accountsChanged', () => {
                    window.location.reload();
                })
            }
        };
        init();
    }, []);
    useEffect(() => {
        if (!connectedWallets.length) return

        const connectedWalletsLabelArray = connectedWallets.map(
            ({ label }) => label
        )
        window.localStorage.setItem(
            'connectedWallets',
            JSON.stringify(connectedWalletsLabelArray)
        )
    }, [connectedWallets])
    useEffect(() => {
        const previouslyConnectedWallets = JSON.parse(
            window.localStorage.getItem('connectedWallets')
        )
        if (previouslyConnectedWallets?.length) {
            async function setWalletFromLocalStorage() {
                let res= await connect({ autoSelect: previouslyConnectedWallets[0] })
                console.log("----res--",res);
            }
            setWalletFromLocalStorage()
        }
    }, [web3Onboard, connect])

    const claimTokens = async e => {
        console.log("---connectedChain---",connectedChain);
        if(loading){
            return
        }

        const {id = '',name} = connectedChain;
        if(id.toString() !== process.env.REACT_APP_Onboard_ChainId.toString()){
            setClaimMessage({
                type: 'danger',
                payload: `Wrong network, please switch to - ${networks[process.env.REACT_APP_NEXT_PUBLIC_NETWORK_ID]}`
            });
            return;
            //await setChain({ chainId: '0x3' })
        }

        /*const {valid,message} = await isValidNetwork()
        setClaimMessage({});
        if(!valid){
            //alert(message)
            setClaimMessage({
                type: 'danger',
                payload: message
            });
            return;
        }*/


        const address = wallet?.accounts[0]?.address ||  null;
        if(!address){
            setClaimMessage({
                type: 'danger',
                payload: `Please connect your wallet`
            });
            return
        }
        setClaimMessage({
            type: 'primary',
            payload: 'Checking your address in whitelist...'
        });
        try {
            const response = await  getTokenByAddress(address)
            if(!response.data.signature){
                setClaimMessage({
                    type: 'danger',
                    payload: `${process.env.REACT_APP_WRONG_ADDRESS}`
                });
                return;
            }
            setLoading(true)
            setClaimMessage({
                type: 'primary',
                payload: `
                  Claiming token from Airdrop contract...
                  Address: ${response.data.address}
                  Total Amount: ${response.data.totalAllocation.toString()} ${process.env.REACT_APP_TOKEN_SYMBOL} 
                `
            });
            //const symbol = process.env.TOKEN_SYMBOL;
            const receipt = await airdrop
                .methods
                .claimTokens(
                    response.data.address,
                    response.data.totalAllocation.toString(),
                    response.data.signature
                )
                .send({from: address});
               const txHashUrl = `${process.env.REACT_APP_CLAIM_TX_LINK}/${receipt.transactionHash}`

                setClaimMessage({
                    type: 'primary',
                    payload: `Airdrop success!
                  Tokens successfully in tx <a target="_blank" href=${txHashUrl}>${receipt.transactionHash}</a> 
                  Address: ${response.data.address}
                  Total Amount: ${response.data.totalAllocation.toString()}
                `
                });
            setLoading(false)
        } catch(e) {
            setLoading(false)
            if(e.message === 'Request failed with status code 401') {
                setClaimMessage({
                    type: 'danger',
                    payload: `Airdrop failed
                    Reason: Address not registered`
                });
                return;
            }
            else if(e.code === 4001){
                setClaimMessage({
                    type: 'danger',
                    payload: e.message
                });
            }
            else{
                setClaimMessage({
                    type: 'danger',
                    payload: `Airdrop failed
                    Reason" Airdrop already sent to ${address}`
                });
            }
        }
    };

    const handleConnect = async ()=>{
        const {valid,message} = await isValidNetwork();
        if(!valid){
            setClaimMessage({
                type: 'danger',
                payload: message
            });
            return;
        }

        setClaimMessage({});
        let wallets = await  connect();
        if(wallets && wallets[0]?.accounts){
            setAccounts(wallets[0]?.accounts[0]?.address);
        }
    }
    const handleDisconnect = async ()=>{
        /*const [primaryWallet] = initWeb3Onboard.state.get().wallets
        let res = await initWeb3Onboard.disconnectWallet()
        console.log("----res----",res)
        setAccounts(null);*/
        await disconnect(wallet)
        const connectedWalletsList = connectedWallets.map(
            ({ label }) => label
        )
        window.localStorage.setItem(
            'connectedWallets',null
        )
        localStorage.clear();

    }
    console.log("----wallet---",wallet);

    return (
        <div className="App">
            <div className="header">
                <div className="logo">
                    <img src="/Logo.png" alt="logo" className="inner_logo" />
                </div>
                <div className="right_btn">
                    <img src="/secound_logo.png" alt="" className="inner_logo" />
                    {!wallet && <button
                        className="connect_btn"
                        onClick={() => {
                            handleConnect(accounts);
                        }}
                    >
                        <span>{accounts || "Connect Wallet"}</span>
                    </button>}
                    {wallet && <button className="connect_btn" onClick={()=>{handleDisconnect()}}>Disconnect</button>}

                </div>
            </div>
            <section className="btn_section">
                <div className="container">
                    <div className="row">
                        <div>
                            {typeof claimMessage.payload !== "undefined" ? (
                                <div
                                    className={`alert alert-${claimMessage.type}`}
                                    role="alert"
                                >
                  <span
                      style={{ whiteSpace: "pre" }}
                      dangerouslySetInnerHTML={{ __html: claimMessage.payload }}
                  ></span>
                                </div>
                            ) : (
                                ""
                            )}
                        </div>
                        <div className="col-12">
                            <div className="btn_inner_part">
                                <div className="max_btn">
                                    <img src="/red_logo.png" alt="" className="inner_img" />
                                    <button className="inner_btn">EthereumMax</button>
                                </div>
                                <div className="claim_back">
                                    <div className="claim_btn">
                                        <img src="/white_logo.png" alt="" className="inner_img" />
                                        <button className="inner_btn" onClick={claimTokens}>
                                            {loading ? "Processing.." : "Claim Tokens!"}
                                        </button>
                                        {/*   {!accounts &&<button className="inner_btn" onClick={()=>{handleConnect(accounts)}}>Connect</button>}
                     */}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default App;
