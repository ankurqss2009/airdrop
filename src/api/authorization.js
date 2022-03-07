import Web3 from 'web3';
import fs from "fs";
import parse from "csv-parse";

export default async (req, res) => {
    const allocations = [];
    const airdrop = fs
        .createReadStream( './Token-List.csv')
        .pipe(parse({
        }));
    for await (const allocation of airdrop) {
        //console.log("----allocation----",allocation)
        if(allocation[0] && allocation[1]) {
            allocations.push({
                address: allocation[0],
                totalAllocation: allocation[1],
            });
        }
    }
    const address = req.body.address.trim().toLowerCase()

    console.log("----address-----",address);
    //console.log("req.body.address",req.body.address)
    const recipient = allocations.find((o,index)=>{
        //console.log("o",o)
        return o.address.trim().toLowerCase() === address
    })
    //console.log("before recipient------",recipient)

    if(recipient) {
      console.log("recipient------",recipient)
    const message = Web3.utils.soliditySha3(
      {t: 'address', v: address},
      {t: 'uint256', v: recipient.totalAllocation}
    ).toString('hex');
    const web3 = new Web3('');
    const { signature } = web3.eth.accounts.sign(
      message, 
      process.env.PRIVATE_KEY
    );
    res
      .status(200)
      .json({ 
        address: address,
        totalAllocation: recipient.totalAllocation,
        signature
      });
    return;
  }
  //3. otherwise, return error
  res
    .status(401)
    .json({ address: req.body.address });
}
