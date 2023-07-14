
import util from "./main";
import { utils } from 'ethers'
import { ethers, upgrades } from "hardhat";
import { Usd, RoleContract, InvestPool, LPtoken } from "../typechain-types";

async function main() {
    let investPool: InvestPool, roleContract: RoleContract, usd: Usd, lpToken: LPtoken;

    let price = 110; // 1.1$
    const [owner, signer, manager, user1, user2, user3, user4, user5, user6, user7, user8, user9, user0] = await ethers.getSigners();

    let fundrisingWallet = ethers.Wallet.createRandom()
    const USD = await ethers.getContractFactory("usd");
    usd = await USD.deploy() as Usd
    await usd.deployed();

    const LPToken = await ethers.getContractFactory("contracts/LPtoken.sol:LPtoken");
    lpToken = await LPToken.deploy("testing", "tst", manager.address) as Usd

    const Roles = await ethers.getContractFactory("RoleContract");
    roleContract = await upgrades.deployProxy(Roles, [signer.address, manager.address, [
        {
            roleNumber: 0,
            isExist: true,
            maxAmount: utils.parseEther("100"),
            minAmount: 0,
        },
        {
            roleNumber: 1,
            isExist: true,
            maxAmount: utils.parseEther("500"),
            minAmount: 0,
        },
        {
            roleNumber: 2,
            isExist: true,
            maxAmount: utils.parseEther("1000"),
            minAmount: utils.parseEther("500"),
        },
        {
            roleNumber: 3,
            isExist: true,
            maxAmount: utils.parseEther("1000"),
            minAmount: utils.parseEther("0"),
        }
    ]]) as RoleContract

    const InvestPool = await ethers.getContractFactory("contracts/investPool.sol:InvestPool");
    investPool = await InvestPool.deploy({
        _LPtoken: lpToken.address,
        _rolesContract: roleContract.address,
        _paymentToken: usd.address,
        _fundrisingWallet: fundrisingWallet.address,
        _baseFee: 5,
        _price: price,
        _maxAmountToSell: utils.parseEther("600"),
        _manager: manager.address,
        _roleSettings: [
            {
                roleNumber: 0,
                startTime: Math.floor(Date.now() / 1000) + 1000000000000,
                deadline: Math.floor(Date.now() / 1000) + 3000,
                roleFee: 20,
                maxAmountToSellForRole: utils.parseEther("100")
            },
            {
                roleNumber: 1,
                startTime: Math.floor(Date.now() / 1000),
                deadline: Math.floor(Date.now() / 1000),
                roleFee: 10,
                maxAmountToSellForRole: utils.parseEther("600")
            },
            {
                roleNumber: 2,
                startTime: Math.floor(Date.now() / 1000) + 50,
                deadline: Math.floor(Date.now() / 1000) + 3000000,
                roleFee: 0,
                maxAmountToSellForRole: utils.parseEther("700")
            },
            {
                roleNumber: 3,
                startTime: Math.floor(Date.now() / 1000) - 3000000,
                deadline: Math.floor(Date.now() / 1000) + 3000000,
                roleFee: 0,
                maxAmountToSellForRole: utils.parseEther("700")
            },
        ]
    }) as InvestPool
    await investPool.deployed();

    util.saveJson('deploy', 'localhost', {
        InvestPool: investPool.address,
        RoleContract: roleContract.address,
        LPToken: lpToken.address,
        USD: usd.address
    }, '../tests/testdata.json')
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});