import { expect } from "chai";
import { ethers } from "hardhat";
import { SGEID } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SGEID", function () {
  let sgeid: SGEID;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const SGEID = await ethers.getContractFactory("SGEID");
    sgeid = await SGEID.deploy("SGE-ID", "SGEID");
    await sgeid.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await sgeid.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      expect(await sgeid.name()).to.equal("SGE-ID");
      expect(await sgeid.symbol()).to.equal("SGEID");
    });

    it("Should start with 0 total supply", async function () {
      expect(await sgeid.totalSupply()).to.equal(0);
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint", async function () {
      await sgeid.connect(owner).mintTo(user1.address);
      expect(await sgeid.ownerOf(1)).to.equal(user1.address);
      expect(await sgeid.balanceOf(user1.address)).to.equal(1);
    });

    it("Should increment token IDs starting from 1", async function () {
      await sgeid.connect(owner).mintTo(user1.address);
      await sgeid.connect(owner).mintTo(user2.address);
      
      expect(await sgeid.ownerOf(1)).to.equal(user1.address);
      expect(await sgeid.ownerOf(2)).to.equal(user2.address);
      expect(await sgeid.totalSupply()).to.equal(2);
    });

    it("Should emit Minted event", async function () {
      await expect(sgeid.connect(owner).mintTo(user1.address))
        .to.emit(sgeid, "Minted")
        .withArgs(user1.address, 1);
    });

    it("Should prevent non-owner from minting", async function () {
      await expect(
        sgeid.connect(user1).mintTo(user2.address)
      ).to.be.revertedWithCustomError(sgeid, "OwnableUnauthorizedAccount");
    });

    it("Should prevent minting to zero address", async function () {
      await expect(
        sgeid.connect(owner).mintTo(ethers.ZeroAddress)
      ).to.be.revertedWith("Cannot mint to zero address");
    });

    it("Should return the correct token ID", async function () {
      const tx = await sgeid.connect(owner).mintTo(user1.address);
      // We can check via events or state
      expect(await sgeid.totalSupply()).to.equal(1);
    });
  });

  describe("Base URI", function () {
    beforeEach(async function () {
      await sgeid.connect(owner).mintTo(user1.address);
    });

    it("Should allow owner to set base URI", async function () {
      await sgeid.connect(owner).setBaseURI("https://api.sge.io/metadata/");
      const uri = await sgeid.tokenURI(1);
      expect(uri).to.equal("https://api.sge.io/metadata/1");
    });

    it("Should prevent non-owner from setting base URI", async function () {
      await expect(
        sgeid.connect(user1).setBaseURI("https://evil.com/")
      ).to.be.revertedWithCustomError(sgeid, "OwnableUnauthorizedAccount");
    });

    it("Should return empty string for tokenURI when baseURI not set", async function () {
      const uri = await sgeid.tokenURI(1);
      expect(uri).to.equal(""); // Empty when no base URI is set
    });
  });

  describe("Ownership", function () {
    it("Should allow owner to transfer ownership", async function () {
      await sgeid.connect(owner).transferOwnership(user1.address);
      expect(await sgeid.owner()).to.equal(user1.address);
    });

    it("Should allow owner to renounce ownership", async function () {
      await sgeid.connect(owner).renounceOwnership();
      expect(await sgeid.owner()).to.equal(ethers.ZeroAddress);
    });

    it("New owner should be able to mint", async function () {
      await sgeid.connect(owner).transferOwnership(user1.address);
      await sgeid.connect(user1).mintTo(user2.address);
      expect(await sgeid.ownerOf(1)).to.equal(user2.address);
    });
  });

  describe("Token Transfers", function () {
    beforeEach(async function () {
      await sgeid.connect(owner).mintTo(user1.address);
    });

    it("Should allow token holder to transfer", async function () {
      await sgeid.connect(user1).transferFrom(user1.address, user2.address, 1);
      expect(await sgeid.ownerOf(1)).to.equal(user2.address);
    });

    it("Should allow approved address to transfer", async function () {
      await sgeid.connect(user1).approve(user2.address, 1);
      await sgeid.connect(user2).transferFrom(user1.address, user2.address, 1);
      expect(await sgeid.ownerOf(1)).to.equal(user2.address);
    });

    it("Should support safeTransferFrom", async function () {
      await sgeid.connect(user1)["safeTransferFrom(address,address,uint256)"](
        user1.address,
        user2.address,
        1
      );
      expect(await sgeid.ownerOf(1)).to.equal(user2.address);
    });
  });

  describe("Total Supply", function () {
    it("Should track total minted correctly", async function () {
      expect(await sgeid.totalSupply()).to.equal(0);
      
      await sgeid.connect(owner).mintTo(user1.address);
      expect(await sgeid.totalSupply()).to.equal(1);
      
      await sgeid.connect(owner).mintTo(user2.address);
      expect(await sgeid.totalSupply()).to.equal(2);
      
      await sgeid.connect(owner).mintTo(owner.address);
      expect(await sgeid.totalSupply()).to.equal(3);
    });
  });
});
