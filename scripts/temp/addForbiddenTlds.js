// Add forbidden TLDs to the Forbidden contract
// npx hardhat run scripts/temp/addForbiddenTlds.js --network localhost

const maxFee = 2500000000; // 2500000000 - set the correct fee for eip-1559 style transactions (otherwise make txs legacy type)

let forbAddress;
switch (network.config.chainId) {
  case 100: // gnosis chain
    forbAddress = "0xf51f7a532a2aadfe8e2320bf5ba8275503bb3789";
    break;
  case 10: // optimism
    forbAddress = "0xc6c17896fa051083324f2ad0ed4555dc46d96e7f";
    break;
  case 137: // polygon
    forbAddress = "0xc6c17896fa051083324f2ad0ed4555dc46d96e7f";
    break;
  case 42161: // arbitrum
    forbAddress = "0xf51f7a532a2aadfe8e2320bf5ba8275503bb3789";
    break;
  
  case 77: // gnosis chain testnet (sokol)
    forbAddress = "0xea2f99fe93e5d07f61334c5eb9c54c5d5c957a6a";
    break;
  case 69: // optimism testnet
    forbAddress = "0xc6c17896fa051083324f2ad0ed4555dc46d96e7f";
    break;
  case 80001: // mumbai
    forbAddress = "0xf81dfed588af7be10ba095fb9e31ce3333b8618c";
    break;
  case 421611: // arbitrum testnet
    forbAddress = "0xf6a44f61030115b5da382b198b711130d98390d9";
    break;
}

console.log("Forbidden address: " + forbAddress);

const tlds = [
  ".eth", ".x", ".crypto", ".coin", ".wallet", ".bitcoin", ".888", ".nft", ".dao", ".zil", ".blockchain",
  ".gnosis", ".xdai", ".bright", ".wagmi", ".optimism", ".spartan", ".web3", ".polygon", ".ape", ".poly", 
  ".degen", ".arbitrum", ".arbi"
];

async function main() {
  const [signer] = await ethers.getSigners();

  console.log("Adding forbidden TLDs with the account:", signer.address);
  console.log("Account balance:", (await signer.getBalance()).toString());

  const forbInterface = new ethers.utils.Interface([
    "function isTldForbidden(string memory _name) public view returns (bool)",
    "function ownerAddForbiddenTld(string memory _name) external"
  ]);

  const forbContract = new ethers.Contract(forbAddress, forbInterface, signer);

  for (let tld of tlds) {
    console.log(tld);

    const alreadyAdded = await forbContract.isTldForbidden(tld);
    console.log(tld + " already added? " + alreadyAdded);

    if (!alreadyAdded) {
      const tx = await forbContract.ownerAddForbiddenTld(tld, {
        //type: 2, // eip-1559
        //maxFeePerGas: maxFee,
        //maxPriorityFeePerGas: maxFee
      });

      const receipt = await tx.wait();

      if (receipt.status === 1) {
        console.log(tld + " successfully added to forbidden list!");
      } else {
        console.log("ERROR! " + tld + " was not added to forbidden list...");
        console.log(receipt);
      }

      //break;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });