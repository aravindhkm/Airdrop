const hre = require("hardhat");

async function main() {

  let tokenContract = "0x87449466a3aE8c8dcbaAAE4414DC323E65bFC589";
  let airDropContract  = "";

  // const MyToken = await hre.ethers.getContractFactory("MyToken");
  // const token = await MyToken.deploy();
  // await token.deployed();
  // tokenContract = token.address;
  // console.log("tokenContract deployed to:", tokenContract); 
   await hre.run("verify:verify", {
    address: tokenContract,
    constructorArguments: [],
  });

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
