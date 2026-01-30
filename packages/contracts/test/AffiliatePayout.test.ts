import { expect } from "chai";
import { ethers } from "hardhat";

describe("AffiliatePayout", function () {
  it("pays USDC to referrer and prevents double pay", async function () {
    const [owner, relayer, referrer, child] = await ethers.getSigners();

    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const usdc = await ERC20Mock.deploy("USDC Mock", "USDC");
    await usdc.waitForDeployment();

    // Deploy affiliate contract
    const Affiliate = await ethers.getContractFactory("AffiliatePayout");
    const affiliate = await Affiliate.deploy(relayer.address);
    await affiliate.waitForDeployment();

    // Mint and fund contract with USDC directly
    const mintAmount = ethers.parseUnits("10000", 18);
    const affiliateAddr = await affiliate.getAddress();
    await usdc.connect(owner).mint(affiliateAddr, mintAmount);

    const usdcAddr = await usdc.getAddress();
    const childAddr = await child.getAddress();
    const referrerAddr = await referrer.getAddress();

    // initial balances
    const before = await usdc.balanceOf(referrerAddr);

    // relayer triggers payout
    const payAmount = ethers.parseUnits("100", 18);
    await affiliate.connect(relayer).payAffiliateUSDC(childAddr, referrerAddr, payAmount, usdcAddr);

    const after = await usdc.balanceOf(referrerAddr);
    expect(after - before).to.equal(payAmount);

    // duplicate payout should revert
    await expect(
      affiliate.connect(relayer).payAffiliateUSDC(childAddr, referrerAddr, payAmount, usdcAddr)
    ).to.be.revertedWith("referral already paid");
  });
});
