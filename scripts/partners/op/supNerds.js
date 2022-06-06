// npx hardhat run scripts/partners/op/supNerds.js --network optimisticKovan

const assetReceiver = "0xAA048141c025CE260F1BC615B557480D672934EF";

async function main() {
  const [signer] = await ethers.getSigners();

  console.log("Sending TX with the account:", signer.address);
  console.log("Account balance:", (await signer.getBalance()).toString());
  
  await signer.sendTransaction({
    to: assetReceiver,
    value: ethers.utils.parseEther("0.133742069"),
    //data: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("sup nerds!")),
    gasLimit: ethers.BigNumber.from("42000"),
    gasPrice: ethers.utils.parseUnits("1", "gwei")
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });