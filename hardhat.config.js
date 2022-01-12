require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require('dotenv').config();

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: 'hardhat',

  networks: {
    localhost: {
      url: 'http://127.0.0.1:8545/',
      chainId: 31337,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      gas: "auto", // gas limit
      gasPrice: 2000000000, // 2 gwei
    },
    ropsten: {
      url: 'https://eth-ropsten.alchemyapi.io/v2/' + process.env.ALCHEMY_API_KEY_ROPSTEN,
      chainId: 3,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      gas: "auto", // gas limit
      gasPrice: 2000000000, // 2 gwei
    },
    polygonMumbai: {
      url: 'https://polygon-mumbai.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY_MUMBAI,
      chainId: 80001,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      gas: "auto", // gas limit
      gasPrice: 2000000000, // 2 gwei
    }
  },

  etherscan: {
    apiKey: {
      polygonMumbai: process.env.POLYGONSCAN_API_KEY,
      ropsten: process.env.ETHERSCAN_API_KEY
    }
  },

  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 80
      }
    }
  }
  
};