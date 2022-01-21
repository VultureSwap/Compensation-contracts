//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice The VultureSwapCompensation contract is an airdrop contract that will airdrop a compensation to users affected by the VultureSwap exploit.
/// @dev It is supposed to be funded with the remaining amount of USDC from the VultureSwap presale.
/// @dev It will distribute these funds amongst affected users based on a compensationary scheme that has been distributed to the community beforehand.
/// @dev The compensationary scheme which contains the number of USDC each user must be compensated is supposed to be generated automatically.
/// @dev It will be based upon the number of Vulture tokens each user had at the time right before the exploit, directly or indirectly.
/// @dev Directly means that the VULTR tokens are within the user wallet, indirectly means they are either still in the presale, MasterChef or LP tokens.
contract VultureSwapCompensation is Ownable {
    using SafeERC20 for IERC20;

    /// @dev Set to true as soon as an address claims to prevent double claims.
    mapping(address => bool) public claimed;
    /// @dev Contains the compensation allocated to users.
    mapping(address => uint256) public userCompensation;
    /// @dev An ordered list of users that will receive compensation, used for an on-chain mechanism batch payout mechanism.
    address[] public users;
    /// @dev The total compensation that all registered users either will or have received.
    uint256 public totalCompensation;
    /// @dev How far in the users list the compensation has already been granted.
    uint256 public cursor;

    /// @dev The USDC token, used as the token for compensation.
    IERC20 public immutable usdc;

    /// @dev Mimic ERC-20 properties to let the the explorer display some basic information about the airdrop.
    string public constant name = "VultureSwap Exploit Compensation";
    string public constant symbol = "VULTURESWAP";
    uint256 constant decimals = 0;

    event Registered(address user, uint256 amount);
    event Claimed(address user, uint256 amount);
    event AdminWithdrawal(IERC20 token, uint256 amount);

    constructor(IERC20 _usdc) {
        usdc = _usdc;
    }

    /// @notice The contract employs a cursor to indicate the index of the next user that is eligible for compensation.
    /// @dev All though unsafe against reentrancy, this contract will not be used with such tokens and claimInternal will furthermore revert.
    function distribute(uint256 numUsers) external onlyOwner {
        if (cursor + numUsers > users.length) {
            numUsers = users.length - cursor;
        }

        for (uint256 i = cursor; i < cursor + numUsers; i++) {
            claimInternal(users[i]);
        }

        cursor += numUsers;
    }

    /// @notice Returns the length of registered users.
    function usersLength() external view returns (uint256) {
        return users.length;
    }

    /// @notice Allows the owner of the contract to withdraw the deposited USDC or other tokens within this contract. Used in case of emergency.
    function registerUsers(
        address[] calldata usersToRegister,
        uint256[] calldata compensationAmounts
    ) external onlyOwner {
        require(
            usersToRegister.length == compensationAmounts.length,
            "Amounts differ"
        );
        for (uint256 i = 0; i < usersToRegister.length; i++) {
            registerInternal(usersToRegister[i], compensationAmounts[i]);
        }
    }

    /// @notice Allows the owner of the contract to withdraw the deposited USDC or other tokens within this contract. Used in case of emergency.
    function withdraw(IERC20 token) external onlyOwner {
        uint256 amount = token.balanceOf(address(this));
        require(token.transfer(msg.sender, amount), "Failed to withdraw token");
    }

    /// @dev sends the compensatory USDC to the user. Sets claimed to true to prevent claiming twice.
    function claimInternal(address _address) internal {
        require(!claimed[_address], "Already claimed");
        claimed[_address] = true;

        uint256 amount = userCompensation[_address];

        usdc.safeTransfer(_address, amount);

        emit Claimed(_address, amount);
    }

    /// @dev Registers a user for compensation.
    function registerInternal(address _address, uint256 amount) internal {
        require(amount > 0, "Zero amount");
        require(userCompensation[_address] == 0, "Already registered");
        userCompensation[_address] = amount;
        users.push(_address);
        totalCompensation += amount;

        emit Registered(_address, amount);
    }
}
