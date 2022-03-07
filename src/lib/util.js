import Papa from 'papaparse';
import Web3 from 'web3';

const getTokenByAddress = async(address, testing)=>{
    let json = new Promise((resolve, reject) => {
        Papa.parse("Token-List.csv", {
            download: true,
            header: true,
            complete (results, file) {
                resolve(results)
            },
            error (err, file) {
                reject(err)
            }
        })
    })
    let results = await json
    const rows = results.data // array of objects
    console.log("rows.length",rows.length)
    let obj = null;
    try{
        obj = rows.find((row,index)=>{
          return row.address.toLowerCase() === address.toLowerCase();
        })
    }catch (e){
        console.log("error",e)
    }
    //console.log("process.env.REACT_APP_PRIVATE_KEY",process.env.REACT_APP_PRIVATE_KEY);
    //console.log("process.env.REACT_APP_WRONG_ADDRESS",process.env.REACT_APP_WRONG_ADDRESS);

    let token = null;
    if(obj){
        token = obj.token; //keys[0] !== address? keys[0]: keys[1]
    }

    if(obj) {
        console.log("recipient------",address)
        const message = Web3.utils.soliditySha3(
            {t: 'address', v: address},
            {t: 'uint256', v: token}
        ).toString('hex');
        const web3 = new Web3('');
        const { signature } = web3.eth.accounts.sign(
            message,
            process.env.REACT_APP_PRIVATE_KEY
        );
        console.log("test data",{data:{address,totalAllocation:token,signature}})
        return {data:{address,totalAllocation:token,signature}};
    }
    else{
        return {data:{}};
    }
}

export  {
    getTokenByAddress
};