import { expect } from "chai";
import { ethers } from "hardhat";

describe("AffiliateRegistry", function () {
  it("registers referral and prevents duplicates/self-referral", async function () {
    const [owner, relayer, referrer, child, other] = await ethers.getSigners();

    const Registry = await ethers.getContractFactory("AffiliateRegistry");
    const registry = await Registry.deploy(relayer.address);
    await registry.waitForDeployment();

    // relayer registers referral
    await registry.connect(relayer).registerReferral(child.address, referrer.address);
    expect(await registry.getReferrer(child.address)).to.equal(referrer.address);

    // duplicate should revert
    await expect(registry.connect(relayer).registerReferral(child.address, other.address)).to.be.revertedWith("child already registered");

    // self-referral should revert
    await expect(registry.connect(relayer).registerReferral(other.address, other.address)).to.be.revertedWith("self-referral not allowed");
  });
});
