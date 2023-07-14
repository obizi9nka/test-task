require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-etherscan");
require('hardhat-contract-sizer');
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import 'solidity-coverage';
import '@openzeppelin/hardhat-upgrades';


const config: HardhatUserConfig = {
    defaultNetwork: "localhost",
    solidity: {
        compilers: [
            {
                version: "0.8.10",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        ],
    },
    networks: {
        localhost: {
            url: "http://127.0.0.1:8545",
            allowUnlimitedContractSize: true,
        },
        hardhat: {
            allowUnlimitedContractSize: true
        },
        sepolia: {
            url: "https://eth-sepolia.g.alchemy.com/v2/px9Yo4patFYo1EmUr78ORAe5iHUbvas5",
            accounts: []
        }
    },
    paths: {
        tests: './tests'
    }

}

export default config;