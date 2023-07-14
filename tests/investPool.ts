import { expect } from "chai";
import { utils } from "ethers";
import { ethers, upgrades } from "hardhat";
import { InvestPool, LPtoken, RoleContract, Usd } from "../typechain-types";
import { mine } from "@nomicfoundation/hardhat-network-helpers";

describe("Invest Pool init example", function () {
    let owner, signer, manager, user1, user2, user3, user4, user5, user6, user7, user8, user9, user0;
    let investPool: InvestPool, roleContract: RoleContract, usd: Usd, lpToken: LPtoken;

    let price = 110; // 1.1$

    const airDropUSD = async (user, amount) => {
        let _amount = utils.parseEther(amount.toString())
        await usd.mint(user.address, _amount)
        expect(await usd.balanceOf(user.address)).to.equal(_amount)
    }

    const givaAllAprroves = async (user, amount) => {
        await usd.connect(user).approve(investPool.address, amount)
        expect(await usd.allowance(user.address, investPool.address)).to.equal(amount)
    }

    before(async () => {
        [owner, signer, manager, user1, user2, user3, user4, user5, user6, user7, user8, user9, user0] = await ethers.getSigners();
        let users = [user1, user2, user3, user4, user5, user6, user7, user8, user9, user0]
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

        {
            await lpToken.mint(investPool.address, utils.parseEther("2700"))
        }

        for (let i = 0; i < users.length; i++) {
            await airDropUSD(users[i], 1000000)
            await givaAllAprroves(users[i], utils.parseEther("100000000000000000000"))
        }

        await roleContract.giveRole(user0.address, 0, 1)
        await roleContract.giveRole(user1.address, 1, 1)
        await roleContract.giveRole(user2.address, 2, 1)
        await roleContract.giveRole(user3.address, 3, 1)
    });

    /// Start tests here

    describe('buy', () => {
        describe('reverts', () => {
            it('IA, minAmountForRole', async () => {
                const tx = investPool.connect(user2).buy(utils.parseEther("0"))
                await expect(tx).to.be.revertedWith('IA')
            })

            it('IA, maxAmountForRole', async () => {
                const tx = investPool.buy(utils.parseEther("1000"))
                await expect(tx).to.be.revertedWith('IA')
            })

            it('TE, startTime', async () => {
                const tx = investPool.connect(user0).buy(utils.parseEther("0"))
                await expect(tx).to.be.revertedWith('TE')
            })

            it('TE, deadLine', async () => {
                const tx = investPool.connect(user1).buy(utils.parseEther("1"))
                await expect(tx).to.be.revertedWith('TE')
            })

            it('RR, maxAmountToSellForRole', async () => {
                await mine(10)
                const tx = investPool.connect(user2).buy(utils.parseEther("800"))
                await expect(tx).to.be.revertedWith('RR')
            })

            it('LT, maxAmountToSell', async () => {
                const tx = investPool.connect(user2).buy(utils.parseEther("690"))
                await expect(tx).to.be.revertedWith('LT')
            })
        })

        describe('actions', () => {
            it('buy', async () => {
                const value = utils.parseEther('11')
                const balanceBefore = await usd.balanceOf(user3.address)
                const tx = investPool.connect(user3).buy(value)
                await expect(tx).emit(investPool, 'Purchase')

                const balanceAfter = await usd.balanceOf(user3.address)

                expect(balanceAfter.add(value)).to.eq(balanceBefore)
                expect(await lpToken.balanceOf(user3.address)).to.eq('9950000000000000000')
                expect(await investPool.alreadySold()).to.not.eq(0)
                expect(await investPool.totalPaymentTokenSpended()).to.not.eq(0)
                expect(await investPool.alreadyBought(user3.address)).to.not.eq(0)
                expect((await investPool.roleSettings(3)).soldAmountForThisRole).to.not.eq(0)

            })
        })
    })


})