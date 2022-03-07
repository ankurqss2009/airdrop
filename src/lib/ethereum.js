import detectEthereumProvider from '@metamask/detect-provider';
import Web3 from 'web3';
import Airdrop from '../contracts/Airdrop.json';
import {} from 'dotenv';

const networks = {
  '56': 'Binance Smart Chain Mainnet',
  '97': 'Binance Smart Chain Testnet',
  '5777': 'Local development blockchain' ,
    '3':'ropsten'
}

const  isValidNetwork = async ()=>{
    const provider = await detectEthereumProvider();
    const targetNetwork = networks[process.env.REACT_APP_NEXT_PUBLIC_NETWORK_ID];
    const message = `Wrong network, please switch to  ----- ${targetNetwork}`
    if(provider) {
        const networkId = await provider.request({ method: 'net_version' })
        if(networkId === process.env.REACT_APP_NEXT_PUBLIC_NETWORK_ID) {
            return {valid:true};
        }
        else{
            return {valid:false,message:message}
        }
    }
    else {
        return {valid:false,message:message}
    }
}
const getBlockchain = (onboard) =>
  new Promise( async (resolve, reject) => {
     // console.log("----process.env----",process.env);
    const provider = await detectEthereumProvider();
    if(provider) {
      const networkId = await provider.request({ method: 'net_version' })
       // console.log("networkId",networkId)
      /*f(networkId !== process.env.REACT_APP_NEXT_PUBLIC_NETWORK_ID) {
        const targetNetwork = networks[process.env.REACT_APP_NEXT_PUBLIC_NETWORK_ID];
        alert(`Wrong network, please switch to  ----- ${targetNetwork}`);
        return;
      }*/
      console.log("onboard",onboard);
      //const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const web3 = new Web3(provider);
      try{
          const airdrop = new web3.eth.Contract(
            Airdrop.abi,
            Airdrop.networks[networkId].address,
          );
          resolve({airdrop, accounts:[]});
          return;
      }
      catch (e){
          reject('error:',e)
      }
    }
    reject('Install Metamask');
  });

const disconnect = async ()=>{
    const res= await window.ethereum.request({
        method: "eth_requestAccounts",
        params: [{eth_accounts: {}}]
    })
    console.log("res",res);
    return {success:false}
}
export { getBlockchain,disconnect, isValidNetwork}
