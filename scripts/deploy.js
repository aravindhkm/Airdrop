const hre = require("hardhat");

async function main() {

  let tokenContract = "0xE89DF4CC85646bb145579230A4E8faFD37c23841";
  let airDropContract  = "";

  // const MyToken = await hre.ethers.getContractFactory("MyToken");
  // const token = await MyToken.deploy();
  // await token.deployed();
  // tokenContract = token.address;
  // console.log("tokenContract deployed to:", tokenContract); 
  //  await hre.run("verify:verify", {
  //   address: tokenContract,
  //   constructorArguments: [],
  // });

  const AirDrop = await hre.ethers.getContractFactory("AirDrop");
  const airdrop = await AirDrop.deploy(tokenContract);
  await airdrop.deployed();
  airDropContract = airdrop.address;
  console.log("airDropContract deployed to:", airDropContract); 
   await hre.run("verify:verify", {
    address: airDropContract,
    constructorArguments: [tokenContract],
  });

}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
