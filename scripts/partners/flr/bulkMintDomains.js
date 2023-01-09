// npx hardhat run scripts/partners/flr/bulkMintDomains.js --network flare

const minterAddress = "0x63f8691b048e68E1C3d6E135aDc81291A9bb1987";
const tldAddress = "0xBDACF94dDCAB51c39c2dD50BffEe60Bb8021949a";
const recipient = "0xb29050965a5ac70ab487aa47546cdcbc97dae45d";

const domains = [
  'punk', 'punkdomains', 'domains', 'domain', 'tempe', 'songbird', 'flrdomains', 'flaredomains', 'sgbdomains', 
  'songbirddomains', 'sgb', 'tekr', 'clavi', 'satrap', 'merkle', 'satraps', 'johnson', 'hugo', 'hugophilion', 'af', 'aflabs', 
  'aforacle', 'cicy', 'dominic', 'bukher', 'timbukher', 'gabe', 'evolve', 'evolveftso', 'xtoadz', 'stoadz', 'kingsman', 'pirate', 
  'aftso', 'alex', 'ftsoit', 'flareoracle', 'oracleswap', 'community', 'ashw', 'alphaoracle', 'witterftso', 'benry', 'flrfinance', 
  'bifrost', 'flaredienst', 'evi1m3', 'j0sko', 'josh', 'luka', 'max', 'maxluck', 'tom', 'vanessa', 'ants', 'flintstone', 'tim', 
  'neil', 'ftsoau', 'flaremetrics', 'flarebuilders', 'builders', 'an', 'chayy', 'daniel', 'eninspace', 'giorgionetg', 'jonnern', 
  'sanorfaker', 'sini', 'baqba', 'bless', 'chard', 'intheknow', 'minho', 'nita', 'wyatt', 'flareman', 'feelz', 'anthony', 'toaddict', 
  'pogue', 'hekimi', 'profesor', 'jst', 'fatcat', 'stedas', 'francis', 'annieways', 'annie', 'ace', 'agi', 'cooties', 'cootiemart', 
  'prestige', 'vigne', 'xrpbags', 'leftychris', 'ripples', 'flarepedia', 'spark', 'nebu', 'khan', 'ludnl', 'majb', 'mauii', 
  'bitcoinislife', 'sicairos', 'phygitaldigital', 'jeen', 'delx', 'rob', 'ash', 'alts', 'dbeastcoglobal', 'flarespace', 'cybrs', 
  'neto', 'solidifi', 'mcp', 'towo', 'towolabs'
];

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Calling methods with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const minterInterface = new ethers.utils.Interface([
    "function ownerFreeMint(string memory, address) external returns(uint256 tokenId)"
  ]);

  const tldInterface = new ethers.utils.Interface([
    "function getDomainHolder(string calldata) external view returns(address)"
  ]);

  const minterContract = new ethers.Contract(minterAddress, minterInterface, deployer);
  const tldContract = new ethers.Contract(tldAddress, tldInterface, deployer);

  for (let domain of domains) {
    console.log("Checking if domain", domain, "already exists...");

    const domainOwner = await tldContract.getDomainHolder(domain);

    if (domainOwner == ethers.constants.AddressZero) {
      console.log("Minting domain", domain, "...");
      await minterContract.ownerFreeMint(domain, recipient);
      console.log(domain + ".flr minted!");
    } else {
      console.log("Already minted before... Onto the next one!");
    }

    
  }

  console.log("Minting completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });