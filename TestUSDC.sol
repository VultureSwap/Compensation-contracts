//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice The TestUSDC contract is a simple ERC20 token which is used within the unit tests.
contract TestUSDC is ERC20 {
    uint256 constant internal INITIAL_MINT = 1e6 * 1e6;
    constructor() ERC20("USDC", "USDC") {
        _mint(msg.sender, INITIAL_MINT);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}