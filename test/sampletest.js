const { expect } = require("chai");
const { ethers } = require("hardhat");
const {expectEvent,time,expectRevert,} = require("@openzeppelin/test-helpers");
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const tokens = require('./tokens.json');

const token = artifacts.require("MyToken");
const airDrop = artifacts.require("AirDrop");

async function deploy(name, ...params) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then(f => f.deployed());
}

function hashToken(account,amount) {
  return Buffer.from(ethers.utils.solidityKeccak256(['address','uint256'], [account,amount]).slice(2), 'hex')
}

async function sign(airDropAddress,user1,amount,nonce,deadline) {
    const domain = {
        name: 'AirDrop',
        version: '1',
        chainId: 31337,
        verifyingContract: airDropAddress,
    };

    // The named list of all type definitions
    const types = {
        Permit: [
            { name: 'user', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' }
        ]
    };

    // The data to sign
    const value = {
        user: user1,
        value: amount,
        nonce: nonce,
        deadline: deadline
    };
    let privateKey = "b01bec163fad02aad4df5339ebf11a42f32316cbd15db6c9d9c595b1ae5702ae";
    let wallet = new ethers.Wallet(privateKey);
    let signature = await wallet._signTypedData(domain, types, value);

    return signature;
}


contract("Token Gas Reduce", (accounts) => {
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  before(async function () {
      this.accounts = await ethers.getSigners();
      owner = accounts[0];
      tokenInstance = await token.new();
      airDropInstance = await airDrop.new(tokenInstance.address);
      merkleTree = new MerkleTree(Object.entries(tokens).map(token => hashToken(...token)), keccak256, { sortPairs: true });
  });

  describe("Token Set", () => {
      it("admin token transfer", async function () {
        let user1 = accounts[1];
        let amount = "100000000000000000000";
        let singerHash = await airDropInstance.SIGNER_ROLE();
        await tokenInstance.transfer(airDropInstance.address,amount, {from: owner});
        await airDropInstance.setRoot(merkleTree.getHexRoot(), {from: owner});
        await airDropInstance.grantRole(singerHash,"0x17Ca0928871b2dB9dd3B2f8b27148a436C24Baa8", {from: owner});
      });  

      it("claimWithPermit", async function () {
        let user1 = accounts[1];
        let amount = "10000000000";
        let deadline = "1349889989898";
        let nonce = await airDropInstance.nonces(user1);  
        signature = await sign(airDropInstance.address,user1,amount,"0",deadline);
        let vrs = ethers.utils.splitSignature(signature);

        await airDropInstance.claimWithPermit(amount,"1349889989898",vrs.v,vrs.r,vrs.s, {from:user1});
      });  

      it("claimWithRoot", async function () {
        let user1 = accounts[1];
        let amount = "10000000000000000000";

        console.log("user1",user1)
        
        const proof = merkleTree.getHexProof(hashToken(user1, amount));

        await airDropInstance.claimWithRoot(amount,proof, {from:user1});
      }); 
  })

  // describe("RewardPool Test", () => {

  //     it("create Pool", async function () {
  //       let user1 = accounts[1];
  //       let amount = "10000000000";

  //       // await rewardPool.createRewardDistributor(
  //       //   busdInstance.address,
  //       //   20,
  //       //   86400,
  //       //   "100000000000000000000", {from: owner}
  //       // );

  //       // await rewardPool.createRewardDistributor(
  //       //   goldInstance.address,
  //       //   20,
  //       //   86400,
  //       //   "300000000000000000000", {from: owner}
  //       // );

  //       await rewardPool.createRewardDistributor(
  //         daiInstance.address,
  //         20,
  //         86400,
  //         "500000000000000000000", {from: owner}
  //       );
  //     }); 

  //     it("token Transfer", async function () {
  //       await goldInstance.transfer(accounts[2],"100000000000000000000", {from: owner});
  //       await goldInstance.transfer(accounts[3],"100000000000000000000", {from: owner});
  //       // await goldInstance.transfer(accounts[4],"300000000000000000000", {from: owner});
  //       // await goldInstance.transfer(accounts[5],"400000000000000000000", {from: owner});
  //       await goldInstance.transfer(accounts[6],"600000000000000000000", {from: owner});
  //       await goldInstance.transfer(accounts[7],"600000000000000000000", {from: owner});
  //     });  

  //     it("buyback", async function () {
  //       let user1 = accounts[1];
  //       let amount = "10000000000";

  //       console.log(
  //         "getNumberOfTokenHolders",
  //         Number(await rewardPool.getNumberOfTokenHolders(daiInstance.address))
  //       );

  //       let pool = await rewardPool.getRewardsDistributor(daiInstance.address);
  //       let distributorInstance = await distributor.at(pool);

  //       await web3.eth.sendTransaction({from: owner, to: rewardPool.address, value: 10e18 });

  //       console.log("before dai balance to distributorInstance", Number(await daiInstance.balanceOf(distributorInstance.address)));

  //       await rewardPool.generateBuyBack("10000000000000000000", {from: owner});

  //       console.log("after dai balance to distributorInstance ", String(await daiInstance.balanceOf(distributorInstance.address)));
  //     }); 


  //     it("token Transfer", async function () {

  //         let userBalance1 = await rewardPool.rewardOf(daiInstance.address,accounts[6]);
  //         let userBalance2 = await rewardPool.rewardOf(daiInstance.address,accounts[7]);

  //         console.log(
  //           "Account 2 dai reward", 
  //           Number(await rewardPool.rewardOf(daiInstance.address,accounts[2]) / 1e18)
  //         );
  //         console.log(
  //           "Account 3 dai reward", 
  //           Number(await rewardPool.rewardOf(daiInstance.address,accounts[3]) / 1e18)
  //         )


  //         console.log("Account 6 dai reward", Number(userBalance1/1e18));
  //         console.log("Account 7 dai reward", Number(userBalance2/1e18));


  //         console.log(
  //           "totalHolderSupply",
  //           Number(await rewardPool.totalHolderSupply(daiInstance.address)/ 1e18)
  //         )
  //     }); 


  //     it("change minimum token for reward", async function () {

  //       await rewardPool.setMinimumTokenBalanceForRewards(daiInstance.address,"100000000000000000000", {from: owner});

  //       await goldInstance.transfer(accounts[2],"1", {from: owner});
  //       await goldInstance.transfer(accounts[3],"1", {from: owner});

  //       let userBalance1 = await rewardPool.rewardOf(daiInstance.address,accounts[6]);
  //       let userBalance2 = await rewardPool.rewardOf(daiInstance.address,accounts[7]);

  //       console.log(
  //         "Account 2 dai reward", 
  //         Number(await rewardPool.rewardOf(daiInstance.address,accounts[2]) / 1e18),
  //         Number(await rewardPool.withdrawableRewardOf(daiInstance.address,accounts[2]) / 1e18)
  //       );
  //       console.log(
  //         "Account 3 dai reward", 
  //         Number(await rewardPool.rewardOf(daiInstance.address,accounts[3]) / 1e18),
  //         Number(await rewardPool.withdrawableRewardOf(daiInstance.address,accounts[3]) / 1e18)
  //       )


  //       console.log("Account 6 dai reward", Number(userBalance1/1e18));
  //       console.log("Account 7 dai reward", Number(userBalance2/1e18));


  //       console.log(
  //         "totalHolderSupply",
  //         Number(await rewardPool.totalHolderSupply(daiInstance.address)/ 1e18)
  //       )
  //   }); 
      
  //     // it("auto distribute", async function () {
  //     //   let user1 = accounts[2];
  //     //   let amount = "10000000000";
  //     //   let pool = await rewardPool.rewardInfo(busdInstance.address);
  //     //   let dividendInstance = await distributor.at(pool[0]);


  //     //   console.log("getNumberOfTokenHolders2", Number(await rewardPool.getNumberOfTokenHolders(busdInstance.address)));

  //     //   console.log("before busd balance to contract", String(await busdInstance.balanceOf(dividendInstance.address)));

  //     //   await rewardPool.autoDistribute(busdInstance.address, {from: owner,gas: 10000000});
  //     //   await rewardPool.autoDistribute(busdInstance.address, {from: owner,gas: 10000000});
  //     //   await rewardPool.autoDistribute(busdInstance.address, {from: owner,gas: 10000000});
  //     //   await rewardPool.autoDistribute(busdInstance.address, {from: owner,gas: 10000000});

  //     //  // let result = await rewardPool.accumulativeDividendOf2(user1);

  //     //   console.log("after busd balance to contract", String(await busdInstance.balanceOf(dividendInstance.address)));

  //     // // console.log("result", String(result));
  //     // });

  //     // it("claim", async function () {
  //     //   let user1 = accounts[2];
  //     //   let amount = "10000000000";
  //     //   let pool = await rewardPool.rewardInfo(busdInstance.address);
  //     //   let dividendInstance = await distributor.at(pool[0]);


  //     //   console.log("getNumberOfTokenHolders2", Number(await rewardPool.getNumberOfTokenHolders()));

  //     //   console.log("before busd balance to user", Number(await busdInstance.balanceOf(user1)));

  //     //   await rewardPool.multipleRewardClaimByUser( {from: user1});
  //     //   await rewardPool.multipleRewardClaimByUser( {from: user1});

  //     //  // let result = await rewardPool.accumulativeDividendOf2(user1);

  //     //   console.log("after busd balance to user", String(await busdInstance.balanceOf(user1)));

  //     // // console.log("result", String(result));
  //     // });  
  // })

})