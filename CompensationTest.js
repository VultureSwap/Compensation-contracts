const { expect } = require("chai");
const { ethers } = require("hardhat");

const ONE_USDC = 1000000;
describe("VultureSwapCompensation", function () {

  let owner;
  let usdc;
  let compensation;
  beforeEach("Should deploy contracts contracts", async function () {
    [owner, wallet1, wallet2] = await ethers.getSigners();
    const Usdc = await ethers.getContractFactory("TestUSDC", owner);
    usdc = await Usdc.deploy();

    await usdc.deployed();

    const Compensation = await ethers.getContractFactory("VultureSwapCompensation", owner);
    compensation = await Compensation.deploy(usdc.address);

    await compensation.deployed();
    expect(await compensation.usersLength()).to.equal(0);
  });

  describe("With owner registered", function () {
    beforeEach("Should register owner", async function () {
      await expect(compensation.connect(owner).registerUsers([owner.address], [ONE_USDC]))
        .to.emit(compensation, "Registered").withArgs(owner.address, ONE_USDC);

      expect(await compensation.totalCompensation()).to.equal(1 * ONE_USDC);
      expect(await compensation.usersLength()).to.equal(1);
      expect(await compensation.cursor()).to.equal(0);
      expect(await compensation.users(0)).to.equal(owner.address);
      expect(await compensation.claimed(owner.address)).to.equal(false);
      expect(await compensation.userCompensation(owner.address)).to.equal(ONE_USDC);
    });

    it("Should fail distribution if contract has insufficient USDC", async function () {
      await expect(compensation.connect(owner).distribute(100))
        .to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    describe("With usdc transfer", function () {
      beforeEach("Should transfer usdc", async function () {
        await usdc.connect(owner).transfer(compensation.address, 900000 * ONE_USDC);
      });

      it("Should allow distribution if contract has sufficient USDC", async function () {
        await expect(compensation.connect(owner).distribute(100))
          .to.emit(compensation, "Claimed").withArgs(owner.address, ONE_USDC);

        expect(await compensation.usersLength()).to.equal(1);
        expect(await compensation.users(0)).to.equal(owner.address);
        expect(await compensation.claimed(owner.address)).to.equal(true);
        expect(await compensation.cursor()).to.equal(1);
        expect(await compensation.userCompensation(owner.address)).to.equal(ONE_USDC);

        // Ensure that claim can only occur once
        await expect(compensation.connect(owner).distribute(100))
          .to.not.emit(compensation, "Claimed");
      });

      describe("With two extra wallets", function () {
        beforeEach("Should allow registration of two extra wallets", async function () {
          await expect(compensation.connect(owner).registerUsers([wallet1.address, wallet2.address], [5 * ONE_USDC, 3 * ONE_USDC]))
            .to.emit(compensation, "Registered").withArgs(wallet2.address, 3 * ONE_USDC);

          expect(await compensation.usersLength()).to.equal(3);
          expect(await compensation.totalCompensation()).to.equal(9 * ONE_USDC);
          expect(await compensation.users(0)).to.equal(owner.address);
          expect(await compensation.users(1)).to.equal(wallet1.address);
          expect(await compensation.users(2)).to.equal(wallet2.address);
          expect(await compensation.claimed(owner.address)).to.equal(false);
          expect(await compensation.claimed(wallet1.address)).to.equal(false);
          expect(await compensation.claimed(wallet2.address)).to.equal(false);
          expect(await compensation.cursor()).to.equal(0);
          expect(await compensation.userCompensation(owner.address)).to.equal(ONE_USDC);
          expect(await compensation.userCompensation(wallet1.address)).to.equal(5 * ONE_USDC);
          expect(await compensation.userCompensation(wallet2.address)).to.equal(3 * ONE_USDC);
        });

        it("Should allow distribution to everyone", async function () {
          const bal0 = await usdc.balanceOf(owner.address);
          const bal1 = await usdc.balanceOf(wallet1.address);
          const bal2 = await usdc.balanceOf(wallet2.address);
          const balComp = await usdc.balanceOf(compensation.address);
          // Ensure that claim can only occur once
          await expect(compensation.connect(owner).distribute(100))
            .to.emit(compensation, "Claimed").withArgs(wallet2.address, 3 * ONE_USDC);

          expect((await usdc.balanceOf(owner.address)).sub(bal0)).to.equal(ONE_USDC);
          expect((await usdc.balanceOf(wallet1.address)).sub(bal1)).to.equal(5 * ONE_USDC);
          expect((await usdc.balanceOf(wallet2.address)).sub(bal2)).to.equal(3 * ONE_USDC);
          expect(balComp.sub(await usdc.balanceOf(compensation.address))).to.equal(9 * ONE_USDC);


          // Ensure that claim can only occur once
          await expect(compensation.connect(owner).distribute(100))
            .to.not.emit(compensation, "Claimed");
        });

        it("Should allow distribution to everyone in multiple stages", async function () {
          const bal0 = await usdc.balanceOf(owner.address);
          const bal1 = await usdc.balanceOf(wallet1.address);
          const bal2 = await usdc.balanceOf(wallet2.address);
          const balComp = await usdc.balanceOf(compensation.address);
          // Ensure that claim can only occur once
          await expect(compensation.connect(owner).distribute(1))
            .to.emit(compensation, "Claimed").withArgs(owner.address, 1 * ONE_USDC);
          await expect(compensation.connect(owner).distribute(1))
            .to.emit(compensation, "Claimed").withArgs(wallet1.address, 5 * ONE_USDC);
          await expect(compensation.connect(owner).distribute(1))
            .to.emit(compensation, "Claimed").withArgs(wallet2.address, 3 * ONE_USDC);

          expect((await usdc.balanceOf(owner.address)).sub(bal0)).to.equal(ONE_USDC);
          expect((await usdc.balanceOf(wallet1.address)).sub(bal1)).to.equal(5 * ONE_USDC);
          expect((await usdc.balanceOf(wallet2.address)).sub(bal2)).to.equal(3 * ONE_USDC);
          expect(balComp.sub(await usdc.balanceOf(compensation.address))).to.equal(9 * ONE_USDC);


          // Ensure that claim can only occur once
          await expect(compensation.connect(owner).distribute(100))
            .to.not.emit(compensation, "Claimed");
        });

        it("Should allow distribution to everyone in multiple stages 2", async function () {
          const bal0 = await usdc.balanceOf(owner.address);
          const bal1 = await usdc.balanceOf(wallet1.address);
          const bal2 = await usdc.balanceOf(wallet2.address);
          const balComp = await usdc.balanceOf(compensation.address);
          // Ensure that claim can only occur once
          await expect(compensation.connect(owner).distribute(2))
            .to.emit(compensation, "Claimed").withArgs(owner.address, 1 * ONE_USDC);
          await expect(compensation.connect(owner).distribute(1))
            .to.emit(compensation, "Claimed").withArgs(wallet2.address, 3 * ONE_USDC);

          expect((await usdc.balanceOf(owner.address)).sub(bal0)).to.equal(ONE_USDC);
          expect((await usdc.balanceOf(wallet1.address)).sub(bal1)).to.equal(5 * ONE_USDC);
          expect((await usdc.balanceOf(wallet2.address)).sub(bal2)).to.equal(3 * ONE_USDC);
          expect(balComp.sub(await usdc.balanceOf(compensation.address))).to.equal(9 * ONE_USDC);


          // Ensure that claim can only occur once
          await expect(compensation.connect(owner).distribute(100))
            .to.not.emit(compensation, "Claimed");
        });
      });
    });
  });

});
